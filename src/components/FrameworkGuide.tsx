import React from 'react';
import { BookOpen, Scale, ShieldCheck, EyeOff, CheckSquare } from 'lucide-react';

export const FrameworkGuide: React.FC = () => {
  return (
    <section id="frameworks" className="mt-16 pt-12 border-t border-slate-200 space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
          Decision Architecture
        </span>
        <h2 className="text-2xl font-bold text-slate-900">
          The 5 Lenses of High-Quality Decisions
        </h2>
        <p className="text-xs text-slate-600">
          ChoiceLens blends behavioral economics, cognitive science, and strategic management to protect you from common cognitive biases.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-mono font-bold text-xs">
            01
          </div>
          <h3 className="text-sm font-bold text-slate-900">Franklin's Weighted Algebra</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Simple lists treat all points equally. ChoiceLens assigns explicit impact and probability weights to every pro and con, forcing realistic trade-off arithmetic.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-mono font-bold text-xs">
            02
          </div>
          <h3 className="text-sm font-bold text-slate-900">Multi-Criteria Decision Matrix</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Evaluates options across customized criteria rather than subjective gut feeling. Adjust criteria importance sliders to see how your core values shift the winning path.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-mono font-bold text-xs">
            03
          </div>
          <h3 className="text-sm font-bold text-slate-900">SWOT Diagnostic</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Separates internal factors (what you control) from external market and life factors (tailwinds and risks), preventing false assumptions about control.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-mono font-bold text-xs">
            04
          </div>
          <h3 className="text-sm font-bold text-slate-900">Klein's Cognitive Pre-Mortem</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Assumes failure has already occurred in the future. Working backward from hypothetical disaster reveals blind spots and unlocks immediate hedging strategies.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2.5 md:col-span-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-mono font-bold text-xs">
            05
          </div>
          <h3 className="text-sm font-bold text-slate-900">Bezos Type 1 vs Type 2 Decisions</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Type 1 decisions are irreversible one-way doors (must be made slowly and deliberately). Type 2 decisions are two-way doors that can be easily undone—requiring high execution speed and early data collection. ChoiceLens classifies your decision upfront so you don’t over-agonize over reversible choices.
          </p>
        </div>
      </div>
    </section>
  );
};
