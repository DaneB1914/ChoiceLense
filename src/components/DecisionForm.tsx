import React, { useState, useEffect, useRef } from 'react';
import { DecisionInput } from '../types/decision';
import { PRESET_DECISIONS, DecisionPreset } from '../data/presets';
import {
  Sparkles,
  Plus,
  Trash2,
  Lightbulb,
  ArrowRight,
  ShieldAlert,
  Clock,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface DecisionFormProps {
  onSubmit: (input: DecisionInput) => void;
  isLoading: boolean;
  onSelectPreset: (preset: DecisionPreset) => void;
  initialDraft?: DecisionInput | null;
}

const COMMON_PRIORITIES = [
  'Long-term Wealth & Financial Upside',
  'Work-Life Balance & Health',
  'Learning Speed & Autonomy',
  'Career Prestige & Network',
  'Downside Protection & Stability',
  'Flexibility & Reversibility',
  'Family & Community Proximity',
  'Mission & Alignment with Values',
];

export const DecisionForm: React.FC<DecisionFormProps> = ({
  onSubmit,
  isLoading,
  onSelectPreset,
  initialDraft,
}) => {
  const [title, setTitle] = useState(initialDraft?.title || '');
  const [context, setContext] = useState(initialDraft?.context || '');
  const [options, setOptions] = useState<string[]>(
    initialDraft?.options && initialDraft.options.length >= 2
      ? [...initialDraft.options]
      : ['', '']
  );
  const [priorities, setPriorities] = useState<string[]>(
    initialDraft?.priorities || [
      'Long-term Wealth & Financial Upside',
      'Work-Life Balance & Health',
    ]
  );
  const [customPriority, setCustomPriority] = useState('');
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'moderate' | 'high'>(
    initialDraft?.riskTolerance || 'moderate'
  );
  const [timeHorizon, setTimeHorizon] = useState<'immediate' | '1-2 years' | '5+ years'>(
    initialDraft?.timeHorizon || '1-2 years'
  );

  // Alternative suggestions state & cancellation
  const [suggestingAlts, setSuggestingAlts] = useState(false);
  const [altsError, setAltsError] = useState<string | null>(null);
  const [suggestedAlts, setSuggestedAlts] = useState<
    Array<{ title: string; explanation: string; pros: string; risk: string }>
  >([]);
  const altsAbortControllerRef = useRef<AbortController | null>(null);

  // Sync draft when initialDraft changes (e.g. Back to Form vs New Analysis)
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title || '');
      setContext(initialDraft.context || '');
      setOptions(
        initialDraft.options && initialDraft.options.length >= 2
          ? [...initialDraft.options]
          : ['', '']
      );
      setPriorities(initialDraft.priorities || []);
      setRiskTolerance(initialDraft.riskTolerance || 'moderate');
      setTimeHorizon(initialDraft.timeHorizon || '1-2 years');
    } else if (initialDraft === null) {
      // Explicit reset
      setTitle('');
      setContext('');
      setOptions(['', '']);
      setPriorities([
        'Long-term Wealth & Financial Upside',
        'Work-Life Balance & Health',
      ]);
      setRiskTolerance('moderate');
      setTimeHorizon('1-2 years');
    }
    // Invalidate any ongoing alternatives
    altsAbortControllerRef.current?.abort();
    setSuggestingAlts(false);
    setSuggestedAlts([]);
    setAltsError(null);
  }, [initialDraft]);

  const cancelPendingAlts = () => {
    if (altsAbortControllerRef.current) {
      altsAbortControllerRef.current.abort();
      altsAbortControllerRef.current = null;
    }
    setSuggestingAlts(false);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    cancelPendingAlts();
    setAltsError(null);
  };

  const handleContextChange = (val: string) => {
    setContext(val);
    cancelPendingAlts();
    setAltsError(null);
  };

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
      cancelPendingAlts();
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
      cancelPendingAlts();
    }
  };

  const handleOptionChange = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    setOptions(updated);
    cancelPendingAlts();
    setAltsError(null);
  };

  const togglePriority = (p: string) => {
    if (priorities.includes(p)) {
      setPriorities(priorities.filter((item) => item !== p));
    } else {
      setPriorities([...priorities, p]);
    }
  };

  const handleAddCustomPriority = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPriority.trim() && !priorities.includes(customPriority.trim())) {
      setPriorities([...priorities, customPriority.trim()]);
      setCustomPriority('');
    }
  };

  const handleLoadPreset = (preset: DecisionPreset) => {
    cancelPendingAlts();
    setSuggestedAlts([]);
    setAltsError(null);
    setTitle(preset.input.title);
    setContext(preset.input.context);
    setOptions(preset.input.options);
    setPriorities(preset.input.priorities);
    setRiskTolerance(preset.input.riskTolerance);
    setTimeHorizon(preset.input.timeHorizon);
    onSelectPreset(preset);
  };

  const handleSuggestAlternatives = async () => {
    if (!title.trim() || suggestingAlts) return;

    cancelPendingAlts();
    const controller = new AbortController();
    altsAbortControllerRef.current = controller;

    let isTimedOut = false;
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, 85000);

    setSuggestingAlts(true);
    setAltsError(null);

    try {
      const res = await fetch('/api/suggest-alternatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          context: context.trim(),
          options: options.map((o) => o.trim()).filter((o) => o.length > 0),
        }),
        signal: controller.signal,
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
          // ignore parsing error on HTML
        }
        throw new Error(serverErrorMsg || `Failed to generate alternatives (${res.status}). Please try again.`);
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

      if (data && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
        setSuggestedAlts(data.alternatives);
      } else {
        throw new Error('No suggestions returned. Please try rephrasing your options.');
      }
    } catch (err: any) {
      if (isTimedOut) {
        setAltsError('The request timed out while generating alternatives. Please try again.');
        return;
      }
      if (err.name === 'AbortError') return;
      console.error('Error suggesting alternatives:', err);
      setAltsError(err.message || 'Unable to generate alternatives. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      if (altsAbortControllerRef.current === controller) {
        setSuggestingAlts(false);
      }
    }
  };

  const handleAdoptAlternative = (altTitle: string) => {
    const trimmed = altTitle.trim();
    if (options.length < 5) {
      setOptions([...options, trimmed]);
    } else {
      const updated = [...options];
      updated[updated.length - 1] = trimmed;
      setOptions(updated);
    }
  };

  // Duplicate option validation (case-insensitive, trimmed)
  const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
  const lowerOptions = cleanOptions.map((o) => o.toLowerCase());
  const hasDuplicates = new Set(lowerOptions).size !== cleanOptions.length;
  const hasMinOptions = cleanOptions.length >= 2;
  const isTitleValid = title.trim().length >= 3;
  const canSubmit = isTitleValid && hasMinOptions && !hasDuplicates && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      title: title.trim(),
      context: context.trim(),
      options: cleanOptions,
      priorities,
      riskTolerance,
      timeHorizon,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Hero Intro */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Make high-stakes decisions with clarity.
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto">
          Frame your choice, stress-test your assumptions across 5 strategic lenses, and detect
          hidden blind spots before committing.
        </p>

        {/* Quick Presets Strip */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1">Sample dilemmas:</span>
          {PRESET_DECISIONS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleLoadPreset(preset)}
              className="text-xs px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors shadow-2xs font-medium"
            >
              {preset.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-7">
        {/* Step 1: Decision Question */}
        <div className="space-y-2">
          <label htmlFor="decision-title" className="block text-sm font-semibold text-slate-900">
            What decision do you need to make? <span className="text-rose-500">*</span>
          </label>
          <input
            id="decision-title"
            type="text"
            required
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g. Accept early-stage startup offer vs stay Staff Engineer at large tech"
            className="w-full px-4 py-2.5 text-base rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Step 2: Context & Constraints */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="decision-context" className="block text-sm font-semibold text-slate-900">
              Context, constraints & key details <span className="text-xs text-slate-500 font-normal">(Optional but recommended)</span>
            </label>
            <span className="text-xs text-slate-500">Helps AI assess realistic trade-offs</span>
          </div>
          <textarea
            id="decision-context"
            rows={3}
            value={context}
            onChange={(e) => handleContextChange(e.target.value)}
            placeholder="Include relevant numbers, timeline, financial buffer, current hesitations, or family considerations..."
            className="w-full px-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all placeholder:text-slate-400 resize-y"
          />
        </div>

        {/* Step 3: Options to Compare */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-slate-900">
              Options to evaluate <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSuggestAlternatives}
                disabled={suggestingAlts || !title.trim()}
                className="text-xs text-indigo-700 hover:text-indigo-800 font-medium flex items-center gap-1 disabled:opacity-50 transition-colors"
                title="AI suggests creative 3rd options and hybrid compromises"
              >
                {suggestingAlts ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Brainstorming...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Suggest Hybrid & 3rd Options</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + idx)} description (e.g. ${idx === 0 ? 'Accept the new offer' : 'Stay in current position'})`}
                  className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                    title="Remove option"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Duplicate options validation warning */}
          {hasDuplicates && (
            <div className="text-xs text-rose-600 font-medium flex items-center gap-1.5 pt-1 bg-rose-50/70 p-2.5 rounded-lg border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Duplicate options detected. Each option must be distinct (case-insensitive).</span>
            </div>
          )}

          {options.length < 5 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1.5 py-1 px-2 rounded hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another option (Max 5)</span>
            </button>
          )}

          {/* Alternatives Error Message */}
          {altsError && (
            <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{altsError}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSuggestAlternatives}
                  className="font-semibold text-rose-700 hover:text-rose-900 underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAltsError(null)}
                  className="text-rose-500 hover:text-rose-700 ml-1"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Suggested Alternatives Card */}
          {suggestedAlts.length > 0 && (
            <div className="mt-3 p-4 bg-indigo-50/70 border border-indigo-100 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                  <Lightbulb className="w-4 h-4 text-indigo-600" />
                  <span>AI Creative Alternatives & Hybrid Paths:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuggestedAlts([])}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {suggestedAlts.map((alt, i) => (
                  <div key={i} className="bg-white p-3 rounded-md border border-indigo-100 flex flex-col justify-between text-xs space-y-2 shadow-2xs">
                    <div>
                      <div className="font-semibold text-slate-900">{alt.title}</div>
                      <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">{alt.explanation}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdoptAlternative(alt.title)}
                      className="w-full py-1 px-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors text-center"
                    >
                      + Add to Options
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Core Priorities & Personal Values */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-900">
            What values matter most for this decision?
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_PRIORITIES.map((p) => {
              const isSelected = priorities.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  <span>{p}</span>
                </button>
              );
            })}
          </div>

          {/* Add custom priority */}
          <div className="flex items-center gap-2 max-w-sm pt-1">
            <input
              type="text"
              value={customPriority}
              onChange={(e) => setCustomPriority(e.target.value)}
              placeholder="Add custom value / priority..."
              className="flex-1 px-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customPriority.trim()) {
                    setPriorities([...priorities, customPriority.trim()]);
                    setCustomPriority('');
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomPriority}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Step 5: Risk Tolerance & Time Horizon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span>Risk Tolerance</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'moderate', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskTolerance(level)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all capitalize ${
                    riskTolerance === level
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Evaluation Horizon</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['immediate', '1-2 years', '5+ years'] as const).map((horizon) => (
                <button
                  key={horizon}
                  type="button"
                  onClick={() => setTimeHorizon(horizon)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    timeHorizon === horizon
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {horizon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500 hidden sm:block">
            {hasDuplicates
              ? 'Please resolve duplicate options'
              : canSubmit
              ? 'Ready to analyze across 5 strategic lenses'
              : 'Fill in title and at least 2 distinct options'}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || isLoading}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Multi-Lens Analysis...</span>
              </>
            ) : (
              <>
                <span>Analyze with ChoiceLens</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
