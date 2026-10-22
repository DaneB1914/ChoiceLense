import React, { useState } from 'react';
import { ComparisonTable } from '../types/decision';
import { Sliders, Award, Scale, HelpCircle } from 'lucide-react';

interface ComparisonLensProps {
  comparison: ComparisonTable;
  options: string[];
  customWeights?: Record<string, number>;
  onUpdateWeights: (updated: Record<string, number>) => void;
}

export const ComparisonLens: React.FC<ComparisonLensProps> = ({
  comparison,
  options,
  customWeights,
  onUpdateWeights,
}) => {
  const currentWeights = React.useMemo(() => {
    const initial: Record<string, number> = {};
    comparison.criteria.forEach((c) => {
      initial[c.id] = c.weight || 5;
    });
    return { ...initial, ...(customWeights || {}) };
  }, [comparison, customWeights]);

  const handleWeightChange = (criteriaId: string, val: number) => {
    onUpdateWeights({
      ...currentWeights,
      [criteriaId]: val,
    });
  };

  // Compute weighted total scores
  const weightedTotals: Record<string, number> = {};
  options.forEach((opt) => {
    let totalScore = 0;
    let totalWeight = 0;
    comparison.matrix.forEach((row) => {
      const w = currentWeights[row.criteriaId] ?? 5;
      const score = row.scores?.[opt] ?? 5;
      totalScore += score * w;
      totalWeight += w;
    });
    weightedTotals[opt] = totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(1)) : 0;
  });

  // Find winner based on weighted totals
  const sortedOptions = [...options].sort(
    (a, b) => (weightedTotals[b] ?? 0) - (weightedTotals[a] ?? 0)
  );
  const leadingOption = sortedOptions[0];

  return (
    <div className="space-y-6">
      {/* Weighted Score Leaderboard Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>Weighted Decision Matrix</span>
            </h3>
            <p className="text-xs text-slate-500">
              Adjust importance weights below to see how changes in your priorities shift the winning choice.
            </p>
          </div>
          <div className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md self-start sm:self-center">
            Leader: <span className="font-bold">{leadingOption}</span> ({weightedTotals[leadingOption]}/10)
          </div>
        </div>

        {/* Real-time score cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {options.map((opt, idx) => {
            const score = weightedTotals[opt] ?? 0;
            const isLeader = opt === leadingOption;
            return (
              <div
                key={opt}
                className={`p-3.5 rounded-lg border transition-all ${
                  isLeader
                    ? 'bg-indigo-50/50 border-indigo-200'
                    : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {opt}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-900 tabular-nums shrink-0">
                    {score} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isLeader ? 'bg-indigo-600' : 'bg-slate-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, score * 10))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* High-Density Criteria Comparison Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Side-by-Side Criteria Scoring</h4>
            <p className="text-xs text-slate-500">Each option scored 1–10 based on research and user context.</p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {comparison.criteria.length} Criteria
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="py-3 px-4 font-semibold text-slate-700 w-1/4">Evaluation Criterion</th>
                <th className="py-3 px-3 font-semibold text-slate-700 w-28 text-center">Weight (1–10)</th>
                {options.map((opt, i) => (
                  <th key={opt} className="py-3 px-4 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400 font-semibold">
                        [{String.fromCharCode(65 + i)}]
                      </span>
                      <span className="truncate max-w-[200px]" title={opt}>
                        {opt}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparison.matrix.map((row) => {
                const currentWeight = currentWeights[row.criteriaId] ?? 5;
                const critMeta = comparison.criteria.find((c) => c.id === row.criteriaId);

                return (
                  <tr key={row.criteriaId} className="hover:bg-slate-50/60 transition-colors">
                    {/* Criterion Name & Description */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-semibold text-slate-900 text-xs">{row.criteriaName}</div>
                      {critMeta?.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {critMeta.description}
                        </div>
                      )}
                    </td>

                    {/* Interactive Weight Slider */}
                    <td className="py-3.5 px-3 align-middle text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-xs font-bold text-indigo-700 tabular-nums">
                          {currentWeight}
                        </span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={currentWeight}
                          onChange={(e) =>
                            handleWeightChange(row.criteriaId, parseInt(e.target.value, 10))
                          }
                          className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          title="Slide to change criterion importance"
                        />
                      </div>
                    </td>

                    {/* Option Scores & Notes */}
                    {options.map((opt) => {
                      const score = row.scores?.[opt] ?? 5;
                      const note = row.notes?.[opt] ?? '';
                      const isHigh = score >= 8;
                      const isLow = score <= 4;

                      return (
                        <td key={opt} className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-bold text-xs px-2 py-0.5 rounded tabular-nums shrink-0 ${
                                isHigh
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isLow
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {score}/10
                            </span>
                          </div>
                          {note && (
                            <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                              {note}
                            </p>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Tradeoffs Callout */}
      {comparison.keyTradeoffs && comparison.keyTradeoffs.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-5 shadow-2xs space-y-2">
          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
            Critical Tradeoff Dynamics
          </h4>
          <ul className="space-y-1.5 text-xs text-amber-950">
            {comparison.keyTradeoffs.map((tradeoff, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">·</span>
                <span className="leading-relaxed">{tradeoff}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
