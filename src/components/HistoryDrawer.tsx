import React from 'react';
import { FullDecisionAnalysis } from '../types/decision';
import { History, Trash2, ArrowUpRight, X, Clock, Award } from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedDecisions: FullDecisionAnalysis[];
  onSelectDecision: (decision: FullDecisionAnalysis) => void;
  onDeleteDecision: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedDecisions,
  onSelectDecision,
  onDeleteDecision,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">Decision History</h3>
            <span className="text-xs font-mono text-slate-400">
              ({savedDecisions.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of decisions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedDecisions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 space-y-2">
              <History className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
              <p>No saved decisions yet.</p>
              <p className="text-[11px] text-slate-400">
                Any decision you analyze will automatically be saved to your local storage.
              </p>
            </div>
          ) : (
            savedDecisions.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectDecision(item);
                  onClose();
                }}
                className="group p-3.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-white hover:bg-slate-50/70 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                    {item.input.title}
                  </h4>
                  <button
                    type="button"
                    onClick={(e) => onDeleteDecision(item.id, e)}
                    className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors shrink-0"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {item.recommendation.primaryVerdict}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {savedDecisions.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              Clear All History
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
