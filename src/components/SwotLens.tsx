import React, { useState } from 'react';
import { SWOTAnalysis } from '../types/decision';
import { Shield, AlertCircle, Sparkles, AlertTriangle } from 'lucide-react';

interface SwotLensProps {
  swots: SWOTAnalysis[];
}

export const SwotLens: React.FC<SwotLensProps> = ({ swots }) => {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  if (!swots || swots.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        No SWOT analysis available for this decision.
      </div>
    );
  }

  const currentSwot = swots[selectedOptionIndex] || swots[0];

  return (
    <div className="space-y-6">
      {/* Option Selector Tabs */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {swots.map((swot, idx) => (
            <button
              key={swot.optionTitle || idx}
              type="button"
              onClick={() => setSelectedOptionIndex(idx)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                selectedOptionIndex === idx
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{swot.optionTitle}</span>
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 hidden sm:block">
          Internal vs External Strategic Diagnostic
        </div>
      </div>

      {/* SWOT Heading Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-base font-bold text-slate-900">
          SWOT Analysis: {currentSwot.optionTitle}
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Evaluate intrinsic capabilities and structural vulnerabilities alongside macro environmental forces.
        </p>
      </div>

      {/* 4 Quadrants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quadrant 1: Strengths */}
        <div className="bg-white rounded-xl border border-emerald-100 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Strengths (Internal)</h4>
                <div className="text-[11px] text-emerald-700">Intrinsic advantages & core assets</div>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-emerald-700">
              {currentSwot.strengths.length}
            </span>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            {currentSwot.strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-2 bg-emerald-50/40 p-2.5 rounded-lg border border-emerald-100/60 leading-relaxed">
                <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quadrant 2: Weaknesses */}
        <div className="bg-white rounded-xl border border-rose-100 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-rose-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-800 flex items-center justify-center">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Weaknesses (Internal)</h4>
                <div className="text-[11px] text-rose-700">Resource deficits & structural friction</div>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-rose-700">
              {currentSwot.weaknesses.length}
            </span>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            {currentSwot.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2 bg-rose-50/40 p-2.5 rounded-lg border border-rose-100/60 leading-relaxed">
                <span className="text-rose-600 font-bold mt-0.5">✗</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quadrant 3: Opportunities */}
        <div className="bg-white rounded-xl border border-sky-100 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-sky-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-800 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Opportunities (External)</h4>
                <div className="text-[11px] text-sky-700">Market tailwinds & emergent leverage</div>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-sky-700">
              {currentSwot.opportunities.length}
            </span>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            {currentSwot.opportunities.map((opp, i) => (
              <li key={i} className="flex items-start gap-2 bg-sky-50/40 p-2.5 rounded-lg border border-sky-100/60 leading-relaxed">
                <span className="text-sky-600 font-bold mt-0.5">✦</span>
                <span>{opp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quadrant 4: Threats */}
        <div className="bg-white rounded-xl border border-amber-100 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Threats (External)</h4>
                <div className="text-[11px] text-amber-700">Exogenous shocks & competitor moves</div>
              </div>
            </div>
            <span className="font-mono text-xs font-semibold text-amber-700">
              {currentSwot.threats.length}
            </span>
          </div>

          <ul className="space-y-2 text-xs text-slate-700">
            {currentSwot.threats.map((t, i) => (
              <li key={i} className="flex items-start gap-2 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/60 leading-relaxed">
                <span className="text-amber-600 font-bold mt-0.5">⚠</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
