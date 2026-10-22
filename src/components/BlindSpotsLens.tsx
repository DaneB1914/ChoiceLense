import React from 'react';
import { BlindSpots } from '../types/decision';
import { EyeOff, AlertOctagon, GitCommit, ShieldAlert, HelpCircle } from 'lucide-react';

interface BlindSpotsLensProps {
  blindSpots: BlindSpots;
}

export const BlindSpotsLens: React.FC<BlindSpotsLensProps> = ({ blindSpots }) => {
  return (
    <div className="space-y-6">
      {/* Intro Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 text-rose-700 text-xs font-semibold uppercase tracking-wider mb-1">
          <EyeOff className="w-4 h-4 text-rose-600" />
          <span>Devil's Advocate & Behavioral Guardrails</span>
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Uncovering Blind Spots, Biases & Second-Order Ripples
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Great decisions fail not from lack of ambition, but from predictable psychological distortions and neglected second-order effects.
        </p>
      </div>

      {/* 1. Cognitive Biases Warnings */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-amber-600" />
          <span>Suspected Cognitive Biases</span>
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blindSpots.cognitiveBiases.map((biasItem, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-amber-200/80 bg-amber-50/40 space-y-2.5"
            >
              <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center justify-between">
                <span>{biasItem.bias}</span>
                <span className="text-[10px] font-mono text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                  Mental Trap
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{biasItem.warning}</p>
              <div className="pt-2 border-t border-amber-200/60 text-xs text-amber-950 italic flex items-start gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                <span>"{biasItem.reflectionQuestion}"</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Second-Order Effects Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-indigo-600" />
          <span>Second-Order Ripple Effects (And Then What?)</span>
        </h4>
        <p className="text-xs text-slate-500">
          First-order consequences are immediate and obvious. Second and third-order consequences dictate actual happiness and long-term payoff.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {blindSpots.secondOrderEffects.map((effect, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-2"
            >
              <div>
                <div className="font-mono text-xs font-bold text-indigo-700">
                  {effect.phase}
                </div>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                  {effect.effect}
                </p>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Order #{idx + 1} Consequence
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Pre-Mortem: Failure Prevention Simulation */}
      <div className="bg-white rounded-xl border border-rose-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-800">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h4 className="text-sm font-bold text-slate-900">
            Pre-Mortem: Why Might This Fail in 2 Years?
          </h4>
        </div>

        {/* Worst Case Narrative */}
        <div className="bg-rose-50/50 p-4 rounded-lg border border-rose-100 text-xs text-rose-950 leading-relaxed">
          <span className="font-bold block mb-1 text-rose-900">Hypothetical Failure Scenario:</span>
          <p>{blindSpots.preMortem.worstCaseScenario}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Warning Signs */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 block">
              Early Warning Indicators (Tripwires):
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {blindSpots.preMortem.warningSigns.map((sign, i) => (
                <li key={i} className="flex items-start gap-2 bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-amber-500 font-bold">!</span>
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prevention Tactics */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 block">
              Immediate Prevention & Hedging Tactics:
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {blindSpots.preMortem.preventionTactics.map((tactic, i) => (
                <li key={i} className="flex items-start gap-2 bg-emerald-50/50 p-2 rounded border border-emerald-100 text-emerald-950">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{tactic}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
