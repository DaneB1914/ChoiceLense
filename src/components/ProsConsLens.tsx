import React, { useState } from 'react';
import { OptionProCon, ProItem, ConItem } from '../types/decision';
import {
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  Plus,
  Sparkles,
  Filter,
  CheckCircle,
} from 'lucide-react';

interface ProsConsLensProps {
  prosAndCons: OptionProCon[];
  onUpdateProsCons: (updated: OptionProCon[]) => void;
}

export const ProsConsLens: React.FC<ProsConsLensProps> = ({
  prosAndCons,
  onUpdateProsCons,
}) => {
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Custom addition modal/state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'pro' | 'con'>('pro');
  const [newTitle, setNewTitle] = useState('');
  const [newImpact, setNewImpact] = useState<'High' | 'Medium' | 'Low'>('High');
  const [newCategory, setNewCategory] = useState('General');
  const [newExplanation, setNewExplanation] = useState('');
  const [newMitigation, setNewMitigation] = useState('');

  const currentOption =
    prosAndCons[selectedOptionIndex] ||
    prosAndCons[0] || {
      id: 'default',
      optionTitle: 'Option',
      summary: '',
      pros: [],
      cons: [],
      netScore: 0,
    };

  // Extract all categories across current option
  const allCategories = Array.from(
    new Set([
      'All',
      ...currentOption.pros.map((p) => p.category),
      ...currentOption.cons.map((c) => c.category),
    ])
  ).filter(Boolean);

  const filteredPros = currentOption.pros.filter(
    (p) => categoryFilter === 'All' || p.category === categoryFilter
  );
  const filteredCons = currentOption.cons.filter(
    (c) => categoryFilter === 'All' || c.category === categoryFilter
  );

  const handleAddProOrCon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const updated = [...prosAndCons];
    const target = { ...updated[selectedOptionIndex] };

    if (addType === 'pro') {
      const newPro: ProItem = {
        id: `custom-pro-${Date.now()}`,
        title: newTitle.trim(),
        impact: newImpact,
        probability: 'High',
        category: newCategory.trim() || 'General',
        score: newImpact === 'High' ? 5 : newImpact === 'Medium' ? 3 : 2,
        explanation: newExplanation.trim() || 'User added consideration.',
      };
      target.pros = [...target.pros, newPro];
      target.netScore += newPro.score;
    } else {
      const newCon: ConItem = {
        id: `custom-con-${Date.now()}`,
        title: newTitle.trim(),
        impact: newImpact,
        probability: 'High',
        category: newCategory.trim() || 'General',
        score: newImpact === 'High' ? -5 : newImpact === 'Medium' ? -3 : -2,
        mitigation: newMitigation.trim() || 'Monitor closely and set boundaries.',
        explanation: newExplanation.trim() || 'User added downside consideration.',
      };
      target.cons = [...target.cons, newCon];
      target.netScore += newCon.score;
    }

    updated[selectedOptionIndex] = target;
    onUpdateProsCons(updated);
    setShowAddModal(false);
    setNewTitle('');
    setNewExplanation('');
    setNewMitigation('');
  };

  return (
    <div className="space-y-6">
      {/* Option Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {prosAndCons.map((opt, idx) => (
            <button
              key={opt.id || idx}
              type="button"
              onClick={() => {
                setSelectedOptionIndex(idx);
                setCategoryFilter('All');
              }}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedOptionIndex === idx
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{opt.optionTitle}</span>
              <span
                className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                  opt.netScore >= 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {opt.netScore >= 0 ? `+${opt.netScore}` : opt.netScore}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* Category filter */}
          {allCategories.length > 2 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Factor</span>
          </button>
        </div>
      </div>

      {/* Option Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">{currentOption.optionTitle}</h3>
          <p className="text-xs text-slate-600 mt-0.5">{currentOption.summary}</p>
        </div>

        <div className="flex items-center gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-center">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Pros</div>
            <div className="text-base font-mono font-bold text-emerald-600 tabular-nums">
              +{currentOption.pros.reduce((acc, p) => acc + p.score, 0)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Cons</div>
            <div className="text-base font-mono font-bold text-rose-600 tabular-nums">
              {currentOption.cons.reduce((acc, c) => acc + c.score, 0)}
            </div>
          </div>
          <div className="text-center pl-3 border-l border-slate-100">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Net Balance</div>
            <div
              className={`text-base font-mono font-bold tabular-nums ${
                currentOption.netScore >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {currentOption.netScore > 0 ? `+${currentOption.netScore}` : currentOption.netScore}
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side Pros and Cons grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Pros Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ThumbsUp className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Pros & Upsides ({filteredPros.length})
              </h4>
            </div>
            <span className="text-xs font-mono text-emerald-600 font-semibold">
              +{filteredPros.reduce((sum, p) => sum + p.score, 0)} pts
            </span>
          </div>

          <div className="space-y-3">
            {filteredPros.map((pro) => (
              <div
                key={pro.id}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900 text-sm">{pro.title}</div>
                  <span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                    +{pro.score}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{pro.explanation}</p>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                  <span>{pro.category}</span>
                  <span className="font-medium text-slate-600">
                    Impact: <span className="font-semibold">{pro.impact}</span> · Prob: {pro.probability}
                  </span>
                </div>
              </div>
            ))}

            {filteredPros.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                No pros found matching category: {categoryFilter}
              </div>
            )}
          </div>
        </div>

        {/* Cons Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center">
                <ThumbsDown className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Cons & Risks ({filteredCons.length})
              </h4>
            </div>
            <span className="text-xs font-mono text-rose-600 font-semibold">
              {filteredCons.reduce((sum, c) => sum + c.score, 0)} pts
            </span>
          </div>

          <div className="space-y-3">
            {filteredCons.map((con) => (
              <div
                key={con.id}
                className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-900 text-sm">{con.title}</div>
                  <span className="font-mono text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded shrink-0">
                    {con.score}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{con.explanation}</p>

                {/* Practical Mitigation */}
                {con.mitigation && (
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-[11px] text-slate-700 space-y-0.5">
                    <span className="font-semibold text-indigo-700 block">
                      Practical Mitigation:
                    </span>
                    <span>{con.mitigation}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                  <span>{con.category}</span>
                  <span className="font-medium text-slate-600">
                    Impact: <span className="font-semibold">{con.impact}</span> · Prob: {con.probability}
                  </span>
                </div>
              </div>
            ))}

            {filteredCons.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                No cons found matching category: {categoryFilter}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Custom Factor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Add Factor to {currentOption.optionTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddProOrCon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Type of Factor
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddType('pro')}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      addType === 'pro'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    + Advantage (Pro)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddType('con')}
                    className={`py-2 text-xs font-semibold rounded-lg border ${
                      addType === 'con'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    - Downside (Con)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Factor Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Higher equity ceiling or Relocation costs"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Impact Level
                  </label>
                  <select
                    value={newImpact}
                    onChange={(e) => setNewImpact(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-white"
                  >
                    <option value="High">High Impact</option>
                    <option value="Medium">Medium Impact</option>
                    <option value="Low">Low Impact</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Financial, Lifestyle, Career..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Explanation / Context
                </label>
                <textarea
                  rows={2}
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="Why does this matter in the real world?"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              {addType === 'con' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proposed Mitigation
                  </label>
                  <textarea
                    rows={2}
                    value={newMitigation}
                    onChange={(e) => setNewMitigation(e.target.value)}
                    placeholder="How would you hedge or guard against this downside?"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Save Factor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
