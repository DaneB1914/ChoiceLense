import React from 'react';
import { PRESET_DECISIONS, DecisionPreset } from '../data/presets';
import { Sparkles, X, ArrowRight, Briefcase, DollarSign, Cpu, Heart } from 'lucide-react';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: DecisionPreset) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  const getCategoryIcon = (cat: DecisionPreset['category']) => {
    switch (cat) {
      case 'Career':
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'Finance & Living':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'Tech & Business':
        return <Cpu className="w-4 h-4 text-sky-600" />;
      case 'Personal':
        return <Heart className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Curated Real-World Scenarios</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Select any real-world dilemma to populate the decision studio and run an instant strategic analysis.
          </p>

          <div className="grid grid-cols-1 gap-3.5">
            {PRESET_DECISIONS.map((preset) => (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(preset.category)}
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {preset.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {preset.title}
                  </h4>
                  <p className="text-xs text-slate-600">{preset.tagline}</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 shrink-0">
                  <span>Load Dilemma</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
