import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Explicit favicon handler to prevent 404 console errors
app.get('/favicon.ico', (_req, res) => {
  res.status(204).end();
});

// Initialize Gemini client as per gemini-api skill instructions
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

function isTransientError(error: any): boolean {
  if (!error) return false;
  const status = error.status || error.statusCode || error.code;
  const msg = (error.message || '').toLowerCase();

  // 503 / UNAVAILABLE / high demand
  if (status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand')) {
    return true;
  }
  // 429 / RESOURCE_EXHAUSTED / rate limit
  if (status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('rate limit')) {
    return true;
  }
  // 500 / INTERNAL
  if (status === 500 || msg.includes('internal error')) {
    return true;
  }
  // Network / socket resets / network failures
  if (
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('fetch failed') ||
    msg.includes('socket hang up')
  ) {
    return true;
  }
  return false;
}

function getSanitizedErrorMessage(error: any): { message: string; statusCode: number } {
  const msg = (error?.message || '').toLowerCase();
  const status = error?.status || error?.statusCode;
  const code = (error?.code || '').toString().toLowerCase();

  // Explicitly recognize numeric/string 504 and DEADLINE_EXCEEDED as timeout
  if (
    status === 504 ||
    status === '504' ||
    code === '504' ||
    code.includes('deadline_exceeded') ||
    code.includes('deadline') ||
    msg.includes('504') ||
    msg.includes('deadline_exceeded') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('deadline')
  ) {
    return {
      message: 'The request to the AI model timed out. Please try again.',
      statusCode: 504,
    };
  }
  if (status === 503 || msg.includes('503') || msg.includes('unavailable') || msg.includes('high demand')) {
    return {
      message: 'The AI model is currently experiencing high demand. Please try again in a few moments.',
      statusCode: 503,
    };
  }
  if (status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('rate limit')) {
    return {
      message: 'Rate limit reached for the AI service. Please wait a moment and retry.',
      statusCode: 429,
    };
  }
  if (status === 400 || msg.includes('400') || msg.includes('invalid_argument')) {
    return {
      message: 'Invalid request parameters provided.',
      statusCode: 400,
    };
  }
  if (status === 401 || status === 403 || msg.includes('api_key') || msg.includes('unauthenticated')) {
    return {
      message: 'AI authentication error. Please verify the API key configuration.',
      statusCode: 403,
    };
  }
  if (error?.name === 'AbortError' || msg.includes('aborted') || msg.includes('canceled') || msg.includes('cancelled')) {
    return {
      message: 'The request was canceled.',
      statusCode: 499,
    };
  }
  // Redact unknown internal errors with a fixed safe message so provider internals/request text cannot leak to clients
  return {
    message: 'The decision analysis service is temporarily unavailable. Please try again.',
    statusCode: 500,
  };
}

/**
 * Tracks client connection lifecycle accurately:
 * In Node.js, IncomingMessage 'close' fires upon request upload completion, which is NOT client disconnection.
 * Real client abort is signaled when ServerResponse 'close' occurs while !res.writableEnded, or req emits 'aborted'.
 */
function setupClientAbort(req: express.Request, res: express.Response) {
  const clientController = new AbortController();

  const onResClose = () => {
    if (!res.writableEnded) {
      clientController.abort();
    }
  };

  const onReqAborted = () => {
    if (!res.writableEnded) {
      clientController.abort();
    }
  };

  res.on('close', onResClose);
  req.on('aborted', onReqAborted);

  const cleanup = () => {
    res.removeListener('close', onResClose);
    req.removeListener('aborted', onReqAborted);
  };

  return { clientController, cleanup };
}

interface CallContext {
  clientSignal: AbortSignal;
  overallDeadlineMs?: number;
  perAttemptTimeoutMs?: number;
  maxRetries?: number;
}

async function callWithTimeoutAndRetry<T>(
  fn: (attemptSignal: AbortSignal, attemptTimeoutMs: number) => Promise<T>,
  ctx: CallContext
): Promise<T> {
  const {
    clientSignal,
    overallDeadlineMs = 48000,
    perAttemptTimeoutMs = 22000,
    maxRetries = 1,
  } = ctx;

  const startTime = Date.now();
  let attempt = 0;

  while (true) {
    attempt++;

    // Stop retry/backoff immediately on client disconnect
    if (clientSignal.aborted) {
      const abortErr = new Error('Client disconnected');
      abortErr.name = 'AbortError';
      throw abortErr;
    }

    // Check overall deadline budget
    const elapsed = Date.now() - startTime;
    const remainingOverallMs = overallDeadlineMs - elapsed;
    if (remainingOverallMs <= 1000) {
      const timeoutErr = new Error('Overall server request deadline exceeded');
      (timeoutErr as any).status = 504;
      throw timeoutErr;
    }

    const currentTimeoutMs = Math.min(perAttemptTimeoutMs, remainingOverallMs);
    const attemptController = new AbortController();

    const onClientAbort = () => {
      attemptController.abort();
    };
    clientSignal.addEventListener('abort', onClientAbort, { once: true });

    let timer: NodeJS.Timeout | null = null;
    let timedOut = false;

    const timerPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        attemptController.abort();
        const err = new Error(`Attempt timed out after ${currentTimeoutMs}ms`);
        (err as any).status = 504;
        reject(err);
      }, currentTimeoutMs);
    });

    try {
      // Execute attempt with supported cancellation & timeout APIs
      const executionPromise = fn(attemptController.signal, currentTimeoutMs);
      const result = await Promise.race([executionPromise, timerPromise]);

      if (timer) clearTimeout(timer);
      clientSignal.removeEventListener('abort', onClientAbort);
      return result;
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      clientSignal.removeEventListener('abort', onClientAbort);

      // Explicitly abort and cancel the underlying Gemini HTTP connection
      attemptController.abort();

      if (clientSignal.aborted) {
        const abortErr = new Error('Client disconnected');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      // If provider cancellation cannot be safely guaranteed, do not retry a locally timed-out unresolved call
      if (timedOut) {
        console.warn(`Attempt ${attempt} timed out locally after ${currentTimeoutMs}ms. Not retrying timed-out call to prevent overlapping executions.`);
        throw err;
      }

      // Check if eligible for transient retry
      const transient = isTransientError(err);
      const remainingAfterErr = overallDeadlineMs - (Date.now() - startTime);

      if (attempt <= maxRetries && transient && remainingAfterErr > 6000) {
        const baseDelay = 1500;
        const jitter = Math.floor(Math.random() * 500);
        const delay = Math.min(baseDelay + jitter, remainingAfterErr - 2000);

        console.warn(
          `Transient provider error on attempt ${attempt}. Retrying in ${delay}ms...`,
          err?.message || err
        );

        // Abortable sleep that terminates immediately on client disconnect
        await new Promise<void>((resolve, reject) => {
          const sleepTimer = setTimeout(() => {
            clientSignal.removeEventListener('abort', onSleepAbort);
            resolve();
          }, delay);

          const onSleepAbort = () => {
            clearTimeout(sleepTimer);
            const abortErr = new Error('Client disconnected during backoff');
            abortErr.name = 'AbortError';
            reject(abortErr);
          };

          clientSignal.addEventListener('abort', onSleepAbort, { once: true });
        });

        continue;
      }

      throw err;
    }
  }
}

const DECISION_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    prosAndCons: {
      type: Type.ARRAY,
      description: 'Pros and cons analysis for each option provided',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          optionTitle: { type: Type.STRING },
          summary: { type: Type.STRING },
          pros: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                probability: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                category: { type: Type.STRING },
                score: { type: Type.INTEGER, description: 'Score between 1 and 5' },
                explanation: { type: Type.STRING },
              },
              required: ['id', 'title', 'impact', 'probability', 'category', 'score', 'explanation'],
            },
          },
          cons: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                probability: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                category: { type: Type.STRING },
                score: { type: Type.INTEGER, description: 'Negative score between -1 and -5' },
                mitigation: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ['id', 'title', 'impact', 'probability', 'category', 'score', 'mitigation', 'explanation'],
            },
          },
          netScore: { type: Type.INTEGER },
        },
        required: ['id', 'optionTitle', 'summary', 'pros', 'cons', 'netScore'],
      },
    },
    comparison: {
      type: Type.OBJECT,
      properties: {
        criteria: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              weight: { type: Type.INTEGER, description: 'Weight 1 to 10' },
              description: { type: Type.STRING },
            },
            required: ['id', 'name', 'weight', 'description'],
          },
        },
        matrix: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              criteriaId: { type: Type.STRING },
              criteriaName: { type: Type.STRING },
              optionScores: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    optionTitle: { type: Type.STRING },
                    score: { type: Type.INTEGER, description: 'Score between 1 and 10' },
                    note: { type: Type.STRING, description: 'Brief justification' },
                  },
                  required: ['optionTitle', 'score', 'note'],
                },
              },
            },
            required: ['criteriaId', 'criteriaName', 'optionScores'],
          },
        },
        keyTradeoffs: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['criteria', 'matrix', 'keyTradeoffs'],
    },
    swots: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          optionTitle: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
          opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
          threats: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['optionTitle', 'strengths', 'weaknesses', 'opportunities', 'threats'],
      },
    },
    blindSpots: {
      type: Type.OBJECT,
      properties: {
        cognitiveBiases: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              bias: { type: Type.STRING },
              warning: { type: Type.STRING },
              reflectionQuestion: { type: Type.STRING },
            },
            required: ['bias', 'warning', 'reflectionQuestion'],
          },
        },
        secondOrderEffects: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phase: { type: Type.STRING },
              effect: { type: Type.STRING },
            },
            required: ['phase', 'effect'],
          },
        },
        preMortem: {
          type: Type.OBJECT,
          properties: {
            worstCaseScenario: { type: Type.STRING },
            warningSigns: { type: Type.ARRAY, items: { type: Type.STRING } },
            preventionTactics: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['worstCaseScenario', 'warningSigns', 'preventionTactics'],
        },
      },
      required: ['cognitiveBiases', 'secondOrderEffects', 'preMortem'],
    },
    recommendation: {
      type: Type.OBJECT,
      properties: {
        primaryVerdict: { type: Type.STRING },
        confidenceScore: { type: Type.INTEGER },
        rationale: { type: Type.STRING },
        whenToPickAlternative: { type: Type.STRING },
        actionPlan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.INTEGER },
              task: { type: Type.STRING },
              timeframe: { type: Type.STRING },
            },
            required: ['stepNumber', 'task', 'timeframe'],
          },
        },
        reversalPlan: { type: Type.STRING },
        decisionClass: {
          type: Type.STRING,
          enum: ['Reversible (Type 2)', 'Irreversible (Type 1)'],
        },
      },
      required: [
        'primaryVerdict',
        'confidenceScore',
        'rationale',
        'whenToPickAlternative',
        'actionPlan',
        'reversalPlan',
        'decisionClass',
      ],
    },
  },
  required: ['prosAndCons', 'comparison', 'swots', 'blindSpots', 'recommendation'],
};

// 1. Analyze Decision Endpoint: Finite budget (per-attempt 150s, overall total 160s)
app.post('/api/analyze-decision', async (req, res) => {
  const { clientController, cleanup } = setupClientAbort(req, res);

  try {
    const { title, context, options, priorities, riskTolerance, timeHorizon } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      cleanup();
      return res.status(400).json({ error: 'Please provide a valid decision title (at least 3 characters).' });
    }

    const rawOptions = Array.isArray(options) ? options : [];
    const cleanOptions = rawOptions
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter((o) => o.length > 0);

    const lowerOptions = cleanOptions.map((o) => o.toLowerCase());
    const uniqueOptions = new Set(lowerOptions);

    if (uniqueOptions.size !== cleanOptions.length) {
      cleanup();
      return res.status(400).json({
        error: 'Duplicate options detected. Each evaluated option must be distinct (case-insensitive).',
      });
    }

    if (cleanOptions.length < 2 || cleanOptions.length > 5) {
      cleanup();
      return res.status(400).json({
        error: 'Please provide between 2 and 5 distinct, non-empty options to evaluate.',
      });
    }

    const prompt = `You are ChoiceLens, an elite decision strategist, behavioral economist, and cognitive scientist.
Perform an objective, rigorous, multi-perspective decision analysis for the user.

Decision Title: ${title.trim()}
Background & Context: ${context || 'None provided'}
Options to evaluate:
${cleanOptions.map((opt: string, i: number) => `Option ${i + 1}: ${opt}`).join('\n')}

User Priorities & Values: ${priorities && priorities.length > 0 ? priorities.join(', ') : 'Balanced growth, peace of mind, strategic upside'}
Risk Tolerance: ${riskTolerance || 'moderate'}
Time Horizon: ${timeHorizon || '1-2 years'}

Guidelines for the analysis:
1. Pros and Cons:
   - Provide 3-5 sharp, non-generic pros and 3-5 realistic cons for EACH option.
   - For every con, include a practical mitigation step.
   - Assign impact (High/Med/Low), probability (High/Med/Low), category, and a score (1 to 5 for pros, -1 to -5 for cons).
   - Net score = sum of pros and cons scores.

2. Comparison Table:
   - Define 4-6 crucial decision criteria tailored specifically to this dilemma.
   - For EACH criterion, provide optionScores containing every option with a score (1 to 10) and a concise 1-sentence note.
   - Highlight 2-3 essential tradeoffs that summarize the heart of the choice.

3. SWOT Analysis:
   - Deliver a distinct SWOT (Strengths, Weaknesses, Opportunities, Threats) for EACH option.
   - Strengths/Weaknesses must focus on internal/inherent traits of that option.
   - Opportunities/Threats must focus on external conditions, tailwinds, and risks.

4. Blind Spots & Devil's Advocate:
   - Identify 2-3 psychological biases the user might fall prey to (e.g., Sunk Cost Fallacy, Status Quo Bias, Grass-is-Greener syndrome, Loss Aversion, Present Bias) with a piercing reflection question.
   - Detail second-order and third-order ripple effects across 6 months, 2 years, and 5 years.
   - Conduct a Pre-Mortem: imagine the chosen path turned out to be a disaster in 18 months—what was the root cause and what early warning signs could have tipped them off?

5. Synthesis & Recommendation:
   - Provide a clear, nuanced verdict based on their stated priorities and risk tolerance.
   - Classify the decision strictly as either "Reversible (Type 2)" (low friction to reverse, two-way door) or "Irreversible (Type 1)" (high friction or permanent commitment).
   - Explain explicitly: "When would the alternate option be the right call instead?"
   - Detail a 4-step concrete Action Plan with timeframes to break analysis paralysis and start moving immediately.

Return the response adhering strictly to the JSON schema.`;

    const response = await callWithTimeoutAndRetry(
      async (attemptSignal, attemptTimeoutMs) => {
        return await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            abortSignal: attemptSignal,
            httpOptions: { timeout: attemptTimeoutMs },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            // @ts-ignore
            responseSchema: DECISION_ANALYSIS_SCHEMA,
            systemInstruction: 'You are ChoiceLens, a world-class strategic advisor. Give candid, pragmatic, insightful, deeply structured analysis without filler or fluff.',
          },
        });
      },
      {
        clientSignal: clientController.signal,
        perAttemptTimeoutMs: 150000,
        overallDeadlineMs: 160000,
        maxRetries: 1,
      }
    );

    const text = response.text;
    if (!text) {
      throw new Error('No response text received from Gemini');
    }

    const parsed = JSON.parse(text);

    // Normalize matrix row scores and notes for client consumption
    if (parsed.comparison && Array.isArray(parsed.comparison.matrix)) {
      parsed.comparison.matrix = parsed.comparison.matrix.map((row: any) => {
        const scores: Record<string, number> = {};
        const notes: Record<string, string> = {};

        if (Array.isArray(row.optionScores)) {
          row.optionScores.forEach((item: any) => {
            if (item && item.optionTitle) {
              scores[item.optionTitle] = typeof item.score === 'number' ? item.score : 6;
              notes[item.optionTitle] = item.note || '';
            }
          });
        }

        cleanOptions.forEach((opt: string) => {
          if (scores[opt] === undefined) {
            scores[opt] = 6;
            notes[opt] = 'Consistent baseline alignment with core criteria.';
          }
        });

        return {
          criteriaId: row.criteriaId || `crit-${Date.now()}-${Math.random()}`,
          criteriaName: row.criteriaName || 'Evaluation Factor',
          scores,
          notes,
          optionScores: row.optionScores || [],
        };
      });
    }

    cleanup();
    return res.json({
      id: `decision-${Date.now()}`,
      createdAt: new Date().toISOString(),
      input: { title: title.trim(), context: context || '', options: cleanOptions, priorities, riskTolerance, timeHorizon },
      ...parsed,
    });
  } catch (error: any) {
    cleanup();
    if (res.writableEnded) {
      return;
    }
    if (clientController.signal.aborted) {
      // Client connection genuinely disconnected
      return;
    }
    console.error('Error analyzing decision:', error);
    const { message, statusCode } = getSanitizedErrorMessage(error);
    return res.status(statusCode).json({ error: message });
  }
});

// 2. Suggest Hybrid & Creative Alternatives Endpoint: Finite budget (per-attempt 60s, overall total 70s)
app.post('/api/suggest-alternatives', async (req, res) => {
  const { clientController, cleanup } = setupClientAbort(req, res);

  try {
    const { title, context, options } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      cleanup();
      return res.status(400).json({ error: 'Please provide a decision title first.' });
    }

    const rawOptions = Array.isArray(options) ? options : [];
    const cleanOptions = rawOptions
      .map((o) => (typeof o === 'string' ? o.trim() : ''))
      .filter((o) => o.length > 0);

    const prompt = `The user is stuck in a binary or limited choice:
Decision: "${title.trim()}"
Context: "${context || ''}"
Current options: ${JSON.stringify(cleanOptions)}

Generate 3 creative, high-leverage alternative paths or hybrid compromises that blend the best of both options, test assumptions cheaply, or introduce a staged "third door".
For each alternative, provide:
- title: concise title
- explanation: why this works and how it re-frames the dilemma
- pros: key advantages
- risk: primary tradeoff`;

    const response = await callWithTimeoutAndRetry(
      async (attemptSignal, attemptTimeoutMs) => {
        return await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            abortSignal: attemptSignal,
            httpOptions: { timeout: attemptTimeoutMs },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            // @ts-ignore
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                alternatives: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      pros: { type: Type.STRING },
                      risk: { type: Type.STRING },
                    },
                    required: ['title', 'explanation', 'pros', 'risk'],
                  },
                },
              },
              required: ['alternatives'],
            },
          },
        });
      },
      {
        clientSignal: clientController.signal,
        perAttemptTimeoutMs: 60000,
        overallDeadlineMs: 70000,
        maxRetries: 1,
      }
    );

    const parsed = JSON.parse(response.text || '{"alternatives":[]}');
    cleanup();
    return res.json(parsed);
  } catch (err: any) {
    cleanup();
    if (res.writableEnded) {
      return;
    }
    if (clientController.signal.aborted) {
      return;
    }
    console.error('Error suggesting alternatives:', err);
    const { message, statusCode } = getSanitizedErrorMessage(err);
    return res.status(statusCode).json({ error: message });
  }
});

// 3. Advisor Chat / Follow-up Q&A Endpoint: Finite budget (per-attempt 22s, overall total 48s)
app.post('/api/advisor-chat', async (req, res) => {
  const { clientController, cleanup } = setupClientAbort(req, res);

  try {
    const { decisionContext, message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      cleanup();
      return res.status(400).json({ error: 'Please enter a valid question or comment.' });
    }

    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const systemInstruction = `You are the ChoiceLens Strategic Advisor. You are discussing this specific decision with the user:
Title: ${decisionContext?.title || 'Decision'}
Options: ${JSON.stringify(decisionContext?.options || [])}
Verdict reached: ${decisionContext?.verdict || 'In discussion'}

Help the user stress-test hypotheses, explore negotiation leverage, navigate personal dilemmas, and overcome analysis paralysis.
Keep responses concise, incisive, empathetic, and pragmatic (under 180 words unless a detailed breakdown is requested).`;

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: message.trim() }],
      },
    ];

    const response = await callWithTimeoutAndRetry(
      async (attemptSignal, attemptTimeoutMs) => {
        return await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contents,
          config: {
            abortSignal: attemptSignal,
            httpOptions: { timeout: attemptTimeoutMs },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction,
          },
        });
      },
      {
        clientSignal: clientController.signal,
        perAttemptTimeoutMs: 22000,
        overallDeadlineMs: 48000,
        maxRetries: 1,
      }
    );

    cleanup();
    return res.json({ reply: response.text || '' });
  } catch (err: any) {
    cleanup();
    if (res.writableEnded) {
      return;
    }
    if (clientController.signal.aborted) {
      return;
    }
    console.error('Error in advisor chat:', err);
    const { message, statusCode } = getSanitizedErrorMessage(err);
    return res.status(statusCode).json({ error: message });
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`ChoiceLens server running on http://localhost:${PORT}`);
  });
}

startServer();
