import React, { useState, useEffect, useRef } from 'react';
import {
  DecisionInput,
  FullDecisionAnalysis,
  OptionProCon,
  ActionStep,
} from './types/decision';
import { PRESET_DECISIONS, DecisionPreset } from './data/presets';
import { Navbar } from './components/Navbar';
import { DecisionForm } from './components/DecisionForm';
import { OverviewLens } from './components/OverviewLens';
import { ProsConsLens } from './components/ProsConsLens';
import { ComparisonLens } from './components/ComparisonLens';
import { SwotLens } from './components/SwotLens';
import { BlindSpotsLens } from './components/BlindSpotsLens';
import { AdvisorChatModal } from './components/AdvisorChatModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { PresetsModal } from './components/PresetsModal';
import { FrameworkGuide } from './components/FrameworkGuide';
import { formatDecisionAsMarkdown } from './utils/export';
import {
  LayoutDashboard,
  CheckSquare,
  Scale,
  Shield,
  EyeOff,
  MessageSquare,
  ArrowLeft,
  Copy,
  Check,
  AlertCircle,
  RotateCcw,
  Info,
} from 'lucide-react';

const STORAGE_KEY_HISTORY = 'choiceLens_saved_history';
const STORAGE_KEY_CURRENT = 'choiceLens_current_decision';

type LensTab = 'overview' | 'proscons' | 'comparison' | 'swot' | 'blindspots';

export default function App() {
  const [analysis, setAnalysis] = useState<FullDecisionAnalysis | null>(null);
  const [formDraft, setFormDraft] = useState<DecisionInput | null>(null);
  const [activeTab, setActiveTab] = useState<LensTab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<DecisionInput | null>(null);

  // Modals & Drawers
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // In-flight request tracking & race condition prevention
  const currentRequestIdRef = useRef<number>(0);
  const analysisAbortRef = useRef<AbortController | null>(null);

  // History state
  const [savedHistory, setSavedHistory] = useState<FullDecisionAnalysis[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Load last active analysis on initial mount if available
  useEffect(() => {
    try {
      const storedCurrent = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (storedCurrent) {
        setAnalysis(JSON.parse(storedCurrent));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const abortInFlightAnalysis = () => {
    currentRequestIdRef.current += 1;
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSaveToHistory = (item: FullDecisionAnalysis) => {
    setSavedHistory((prev) => {
      const filtered = prev.filter((d) => d.id !== item.id);
      const updated = [item, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated.slice(0, 25)));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedHistory((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
      return updated;
    });
  };

  const handleClearAllHistory = () => {
    if (confirm('Are you sure you want to clear all saved decisions?')) {
      setSavedHistory([]);
      try {
        localStorage.removeItem(STORAGE_KEY_HISTORY);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAnalyze = async (input: DecisionInput) => {
    abortInFlightAnalysis();
    const requestId = ++currentRequestIdRef.current;
    const controller = new AbortController();
    analysisAbortRef.current = controller;

    let isTimedOut = false;
    const timeoutId = setTimeout(() => {
      isTimedOut = true;
      controller.abort();
    }, 175000);

    setIsLoading(true);
    setError(null);
    setLastFailedInput(null);
    setFormDraft(input);

    try {
      const response = await fetch('/api/analyze-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(input),
      });

      if (currentRequestIdRef.current !== requestId) {
        // Obsolete response from an invalidated action
        return;
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit reached for the AI service. Please wait a moment and retry.');
        }
        if (response.status === 504) {
          throw new Error('The request to the AI model timed out. Please try again.');
        }
        if (response.status === 502 || response.status === 503) {
          throw new Error('The AI model is currently experiencing high demand. Please try again in a few moments.');
        }

        let serverErrorMsg: string | null = null;
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errJson = await response.json();
            if (errJson && typeof errJson.error === 'string') {
              serverErrorMsg = errJson.error;
            }
          }
        } catch {
          // ignore parsing error on HTML/empty error bodies
        }
        throw new Error(serverErrorMsg || `Failed to analyze decision (${response.status}). Please try again.`);
      }

      let result: FullDecisionAnalysis;
      try {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Received an unexpected response format from the server. Please try again.');
        }
        result = await response.json();
      } catch (parseErr: any) {
        throw new Error(
          parseErr.message?.includes('unexpected response format')
            ? parseErr.message
            : 'Received an unexpected response format from the server. Please try again.'
        );
      }

      if (currentRequestIdRef.current !== requestId) return;

      // Validate core payload shape to prevent crashes in lenses
      if (
        !result ||
        !result.id ||
        !result.input?.title ||
        !result.recommendation?.primaryVerdict ||
        !Array.isArray(result.prosAndCons) ||
        !result.comparison?.matrix
      ) {
        throw new Error('The analysis response was incomplete or malformed. Please try analyzing again.');
      }

      setAnalysis(result);
      setActiveTab('overview');
      setError(null);
      setLastFailedInput(null);
      handleSaveToHistory(result);

      try {
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(result));
      } catch (e) {
        console.error(e);
      }
    } catch (err: any) {
      if (isTimedOut) {
        setError('The analysis request timed out while generating your strategic evaluation. Please try again.');
        setLastFailedInput(input);
        return;
      }
      if (err.name === 'AbortError' || currentRequestIdRef.current !== requestId) {
        return;
      }
      console.error('Analysis error:', err);
      setError(err.message || 'An unexpected error occurred while analyzing.');
      setLastFailedInput(input);
    } finally {
      clearTimeout(timeoutId);
      if (currentRequestIdRef.current === requestId) {
        setIsLoading(false);
        analysisAbortRef.current = null;
      }
    }
  };

  const handleBackToForm = () => {
    abortInFlightAnalysis();
    if (analysis) {
      setFormDraft(analysis.input);
    }
    setAnalysis(null);
    setError(null);
  };

  const handleNewDecision = () => {
    abortInFlightAnalysis();
    setFormDraft(null);
    setAnalysis(null);
    setError(null);
    setLastFailedInput(null);
    try {
      localStorage.removeItem(STORAGE_KEY_CURRENT);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectHistoryItem = (item: FullDecisionAnalysis) => {
    abortInFlightAnalysis();
    setAnalysis(item);
    setActiveTab('overview');
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(item));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPreset = (preset: DecisionPreset) => {
    setIsPresetsOpen(false);
    handleAnalyze(preset.input);
  };

  // State persistence handlers for lenses
  const handleUpdateActionPlan = (updatedPlan: ActionStep[]) => {
    if (!analysis) return;
    const updatedAnalysis: FullDecisionAnalysis = {
      ...analysis,
      recommendation: {
        ...analysis.recommendation,
        actionPlan: updatedPlan,
      },
    };
    setAnalysis(updatedAnalysis);
    handleSaveToHistory(updatedAnalysis);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updatedAnalysis));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProsCons = (updatedProsCons: OptionProCon[]) => {
    if (!analysis) return;
    const updatedAnalysis: FullDecisionAnalysis = {
      ...analysis,
      prosAndCons: updatedProsCons,
    };
    setAnalysis(updatedAnalysis);
    handleSaveToHistory(updatedAnalysis);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updatedAnalysis));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWeights = (updatedWeights: Record<string, number>) => {
    if (!analysis) return;
    const updatedAnalysis: FullDecisionAnalysis = {
      ...analysis,
      customWeights: updatedWeights,
    };
    setAnalysis(updatedAnalysis);
    handleSaveToHistory(updatedAnalysis);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updatedAnalysis));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportMarkdown = async () => {
    if (!analysis) return;
    const md = formatDecisionAsMarkdown(analysis);
    try {
      await navigator.clipboard.writeText(md);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    } catch {
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ChoiceLens_${analysis.input.title.slice(0, 30).replace(/\s+/g, '_')}.md`;
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        onNewDecision={handleNewDecision}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onSelectPresets={() => setIsPresetsOpen(true)}
        hasActiveAnalysis={!!analysis}
        onExport={handleExportMarkdown}
        historyCount={savedHistory.length}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Beta / Portfolio Demo Notice */}
        <div className="mb-6 p-3.5 sm:p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 leading-relaxed">
              <span className="font-semibold text-amber-950 block sm:inline sm:mr-2">
                Beta · Portfolio Demo
              </span>
              <span className="text-amber-800">
                ChoiceLens is an experimental AI decision-support demo. AI analysis, advisor chat, and alternative suggestions may be temporarily unavailable or fail. Retry later if needed, and review AI-generated outputs before relying on them.
              </span>
            </div>
          </div>
        </div>

        {/* Error notification banner with explicit retry affordance */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <div>
                  <span className="font-semibold block text-rose-900">Analysis Notice</span>
                  <p className="text-rose-800 mt-0.5">{error}</p>
                </div>
                {lastFailedInput && (
                  <button
                    type="button"
                    onClick={() => handleAnalyze(lastFailedInput)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-xs transition-colors shadow-2xs disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Analysis</span>
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-500 hover:text-rose-700 text-sm p-1 rounded hover:bg-rose-100 transition-colors"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {/* Copy confirmation toast */}
        {copyFeedback && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Complete report copied to clipboard as Markdown!</span>
          </div>
        )}

        {/* VIEW 1: Input / Setup View */}
        {!analysis ? (
          <div className="space-y-12">
            <DecisionForm
              onSubmit={handleAnalyze}
              isLoading={isLoading}
              onSelectPreset={(preset) => {
                handleAnalyze(preset.input);
              }}
              initialDraft={formDraft}
            />
            <FrameworkGuide />
          </div>
        ) : (
          /* VIEW 2: Active Multi-Lens Decision Workspace */
          <div className="space-y-12">
            <div className="space-y-6">
              {/* Context & Navigation Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={handleBackToForm}
                        className="hover:text-slate-900 flex items-center gap-1 font-medium text-slate-600 transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Form</span>
                      </button>
                      <span>·</span>
                      <span>Analyzed on {new Date(analysis.createdAt).toLocaleDateString()}</span>
                    </div>

                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {analysis.input.title}
                    </h1>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsAdvisorOpen(true)}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ask Strategic Advisor</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportMarkdown}
                      className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Copy Markdown Report"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Options pills & Parameters */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-800">Options:</span>
                    {analysis.input.options.map((opt, i) => (
                      <span
                        key={opt}
                        className="px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 font-medium text-[11px]"
                      >
                        {String.fromCharCode(65 + i)}: {opt}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
                    <span>Horizon: {analysis.input.timeHorizon}</span>
                    <span>·</span>
                    <span>Risk: {analysis.input.riskTolerance}</span>
                  </div>
                </div>
              </div>

              {/* Segmented Lens Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === 'overview'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Executive Verdict</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('proscons')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === 'proscons'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pros & Cons</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('comparison')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === 'comparison'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 text-blue-600" />
                  <span>Comparison Matrix</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('swot')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === 'swot'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-purple-600" />
                  <span>SWOT Analysis</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('blindspots')}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === 'blindspots'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Blind Spots & Biases</span>
                </button>
              </div>

              {/* Tab Views with state persistence across tabs */}
              {activeTab === 'overview' && (
                <OverviewLens
                  recommendation={analysis.recommendation}
                  decisionTitle={analysis.input.title}
                  onOpenAdvisor={() => setIsAdvisorOpen(true)}
                  onUpdateActionPlan={handleUpdateActionPlan}
                />
              )}

              {activeTab === 'proscons' && (
                <ProsConsLens
                  prosAndCons={analysis.prosAndCons}
                  onUpdateProsCons={handleUpdateProsCons}
                />
              )}

              {activeTab === 'comparison' && (
                <ComparisonLens
                  comparison={analysis.comparison}
                  options={analysis.input.options}
                  customWeights={analysis.customWeights}
                  onUpdateWeights={handleUpdateWeights}
                />
              )}

              {activeTab === 'swot' && <SwotLens swots={analysis.swots} />}

              {activeTab === 'blindspots' && (
                <BlindSpotsLens blindSpots={analysis.blindSpots} />
              )}
            </div>

            {/* Always keep Methodology Guide accessible below active results */}
            <FrameworkGuide />
          </div>
        )}
      </main>

      {/* Advisor Chat Modal */}
      {analysis && (
        <AdvisorChatModal
          isOpen={isAdvisorOpen}
          onClose={() => setIsAdvisorOpen(false)}
          analysis={analysis}
        />
      )}

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedDecisions={savedHistory}
        onSelectDecision={handleSelectHistoryItem}
        onDeleteDecision={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />

      {/* Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* Quiet Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            ChoiceLens Decision Intelligence · Built for clarity, nuance & sound judgment.
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsPresetsOpen(true)}
              className="hover:text-slate-800 transition-colors"
            >
              Sample Dilemmas
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="hover:text-slate-800 transition-colors"
            >
              Saved Records ({savedHistory.length})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
