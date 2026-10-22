import React from 'react';
import { Recommendation, ActionStep } from '../types/decision';
import {
  Award,
  CheckCircle2,
  Circle,
  HelpCircle,
  ArrowRightLeft,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface OverviewLensProps {
  recommendation: Recommendation;
  decisionTitle: string;
  onOpenAdvisor: () => void;
  onUpdateActionPlan: (plan: ActionStep[]) => void;
}

export const OverviewLens: React.FC<OverviewLensProps> = ({
  recommendation,
  decisionTitle,
  onOpenAdvisor,
  onUpdateActionPlan,
}) => {
  const actionPlan = recommendation.actionPlan || [];

  const toggleStep = (stepNumber: number) => {
    const updated = actionPlan.map((s) =>
      s.stepNumber === stepNumber ? { ...s, completed: !s.completed } : s
    );
    onUpdateActionPlan(updated);
  };

  const completedCount = actionPlan.filter((s) => s.completed).length;

  const getDecisionClassDescription = (cls?: string) => {
    if (!cls) return 'Standard decision framework.';
    if (cls.includes('Type 2') || cls.toLowerCase().includes('reversible')) {
      return 'Low friction to reverse if initial metrics don’t align (two-way door).';
    }
    if (cls.includes('Type 1') || cls.toLowerCase().includes('irreversible')) {
      return 'High commitment cost; requires upfront mitigation (one-way door).';
    }
    // Neutral fallback for legacy 'Conditional Pivot' or unknown labels
    return 'Staged or conditional path; calibrate progression against empirical triggers.';
  };

  return (
    <div className="space-y-6">
      {/* Primary Verdict Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Strategic Verdict
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              {recommendation.primaryVerdict}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Confidence indicator */}
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Model Confidence</div>
              <div className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                {recommendation.confidenceScore}%
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm font-mono">
              <Award className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Decision Class Notice */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">Decision Classification:</span>
          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 rounded font-medium">
            {recommendation.decisionClass}
          </span>
          <span className="text-slate-400">·</span>
          <span>{getDecisionClassDescription(recommendation.decisionClass)}</span>
        </div>

        {/* Executive Rationale */}
        <div className="text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-lg border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
            Strategic Rationale
          </h3>
          <p>{recommendation.rationale}</p>
        </div>
      </div>

      {/* Two Column Grid: When to reconsider & Reversibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
            <ArrowRightLeft className="w-4 h-4 text-amber-600" />
            <span>When Should You Choose The Alternative Instead?</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {recommendation.whenToPickAlternative}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Reversal & Pivot Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {recommendation.reversalPlan}
          </p>
        </div>
      </div>

      {/* Concrete Action Plan Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Immediate Action Plan</h3>
            <p className="text-xs text-slate-500">
              Clear milestone checklist to break analysis paralysis and validate assumptions.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 tabular-nums">
            {completedCount} / {actionPlan.length} completed
          </div>
        </div>

        <div className="space-y-3">
          {actionPlan.map((step) => (
            <div
              key={step.stepNumber}
              onClick={() => toggleStep(step.stepNumber)}
              className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                step.completed
                  ? 'bg-emerald-50/50 border-emerald-200 text-slate-500'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
              >
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      step.completed ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}
                  >
                    Step {step.stepNumber}: {step.task}
                  </span>
                  <span className="text-xs font-mono text-slate-400 shrink-0">
                    {step.timeframe}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
          <span>Click any action item to mark complete. Changes persist across views and exports.</span>
          <button
            type="button"
            onClick={onOpenAdvisor}
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            Have doubts? Chat with AI Advisor →
          </button>
        </div>
      </div>
    </div>
  );
};
