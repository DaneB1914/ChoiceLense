import React, { useState, useRef, useEffect } from 'react';
import { FullDecisionAnalysis, AdvisorMessage } from '../types/decision';
import { Send, Bot, User, Sparkles, X, Loader2, AlertCircle, RotateCcw } from 'lucide-react';

interface AdvisorChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: FullDecisionAnalysis;
}

const QUICK_QUESTIONS = [
  'What if I negotiate 15% better terms?',
  'What is the single biggest unaddressed risk here?',
  'How do I test this assumption with zero financial cost?',
  'What would need to happen in 6 months for me to pivot?',
];

export const AdvisorChatModal: React.FC<AdvisorChatModalProps> = ({
  isOpen,
  onClose,
  analysis,
}) => {
  // Store chat history scoped by decision ID so switching decisions doesn't bleed context,
  // while closing and reopening the modal for the same decision preserves history.
  const [messagesByDecision, setMessagesByDecision] = useState<Record<string, AdvisorMessage[]>>({});
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createWelcomeMessage = (targetAnalysis: FullDecisionAnalysis): AdvisorMessage => ({
    id: `welcome-${targetAnalysis.id}`,
    role: 'assistant',
    content: `I've analyzed your decision "${targetAnalysis.input.title}". We recommended: "${targetAnalysis.recommendation.primaryVerdict}". What specific doubts, "what-if" conditions, or negotiation angles would you like to stress-test?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });

  // When analysis changes, ensure a welcome message exists and abort any in-flight request
  useEffect(() => {
    // Abort pending chat request from prior decision
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);

    setMessagesByDecision((prev) => {
      if (prev[analysis.id] && prev[analysis.id].length > 0) {
        return prev;
      }
      return {
        ...prev,
        [analysis.id]: [createWelcomeMessage(analysis)],
      };
    });
  }, [analysis.id, analysis.input.title, analysis.recommendation.primaryVerdict]);

  const currentMessages = messagesByDecision[analysis.id] || [createWelcomeMessage(analysis)];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentMessages, isOpen, loading]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    // Abort any active request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let isTimedOut = false;
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, 56000);

    const userMsg: AdvisorMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const targetDecisionId = analysis.id;

    setMessagesByDecision((prev) => ({
      ...prev,
      [targetDecisionId]: [...(prev[targetDecisionId] || []), userMsg],
    }));

    if (!textToSend) {
      setInput('');
    }
    setLoading(true);

    try {
      const res = await fetch('/api/advisor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          decisionContext: {
            title: analysis.input.title,
            options: analysis.input.options,
            verdict: analysis.recommendation.primaryVerdict,
            priorities: analysis.input.priorities,
          },
          message: text,
          history: currentMessages.slice(-6),
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limit reached for the AI service. Please wait a moment and retry.');
        }
        if (res.status === 504) {
          throw new Error('The request to the AI model timed out. Please try again.');
        }
        if (res.status === 502 || res.status === 503) {
          throw new Error('The AI model is currently experiencing high demand. Please try again in a few moments.');
        }

        let serverErrorMsg: string | null = null;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errJson = await res.json();
            if (errJson && typeof errJson.error === 'string') {
              serverErrorMsg = errJson.error;
            }
          }
        } catch {
          // ignore
        }
        throw new Error(serverErrorMsg || `Strategic advisor request failed (${res.status}). Please try again.`);
      }

      let data: any = null;
      try {
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Received an unexpected response format from the server. Please try again.');
        }
        data = await res.json();
      } catch (parseErr: any) {
        throw new Error(
          parseErr.message?.includes('unexpected response format')
            ? parseErr.message
            : 'Received an unexpected response format from the server. Please try again.'
        );
      }

      if (!data || typeof data.reply !== 'string' || data.reply.trim().length === 0) {
        throw new Error('No advice response received. Please try again.');
      }

      const botMsg: AdvisorMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessagesByDecision((prev) => ({
        ...prev,
        [targetDecisionId]: [...(prev[targetDecisionId] || []), botMsg],
      }));
    } catch (err: any) {
      if (isTimedOut) {
        const errMsg: AdvisorMessage = {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: 'The advisor request timed out. Please try asking again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          retryableText: text,
        };
        setMessagesByDecision((prev) => ({
          ...prev,
          [targetDecisionId]: [...(prev[targetDecisionId] || []), errMsg],
        }));
        return;
      }

      if (err.name === 'AbortError') {
        // Request was deliberately aborted due to decision change or cancellation
        return;
      }

      console.error('Advisor error:', err);
      const errMsg: AdvisorMessage = {
        id: `bot-err-${Date.now()}`,
        role: 'assistant',
        content: err.message || 'Strategic Advisor is temporarily unavailable. Please retry.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
        retryableText: text,
      };

      setMessagesByDecision((prev) => ({
        ...prev,
        [targetDecisionId]: [...(prev[targetDecisionId] || []), errMsg],
      }));
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full h-[600px] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">ChoiceLens Strategic Advisor</h3>
              <p className="text-xs text-slate-500 truncate max-w-md">
                Testing: <span className="font-medium text-slate-700">{analysis.input.title}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {currentMessages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 text-xs leading-relaxed ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
                    m.isError
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-indigo-100 text-indigo-700'
                  }`}
                >
                  {m.isError ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-lg p-3.5 space-y-1.5 ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : m.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-900'
                    : 'bg-slate-100/90 text-slate-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Inline Retry Affordance if provider failed */}
                {m.isError && m.retryableText && (
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSend(m.retryableText)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-white border border-rose-300 rounded hover:bg-rose-100 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry this question</span>
                    </button>
                  </div>
                )}

                <div
                  className={`text-[10px] font-mono ${
                    m.role === 'user'
                      ? 'text-slate-400 text-right'
                      : m.isError
                      ? 'text-rose-400'
                      : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-md bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 text-xs">
              <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-100 p-3 rounded-lg flex items-center gap-2 text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Stress-testing scenarios with ChoiceLens Advisor...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions prompts */}
        <div className="px-5 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          <Sparkles className="w-3 h-3 text-indigo-500 shrink-0" />
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Try asking:</span>
          {QUICK_QUESTIONS.map((q, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[11px] text-slate-700 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a what-if question or explore compromises..."
              className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
