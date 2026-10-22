import React from 'react';
import { Compass, Sparkles, FileDown, PlusCircle } from 'lucide-react';

interface NavbarProps {
  onNewDecision: () => void;
  onOpenHistory: () => void;
  onSelectPresets: () => void;
  hasActiveAnalysis: boolean;
  onExport: () => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewDecision,
  onOpenHistory,
  onSelectPresets,
  hasActiveAnalysis,
  onExport,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200 w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-6 lg:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div
          className="flex items-center gap-2 sm:gap-2.5 shrink-0 cursor-pointer"
          onClick={onNewDecision}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onNewDecision();
          }}
          aria-label="ChoiceLens Home - Start New Decision"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Compass className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            ChoiceLens
          </span>
        </div>

        {/* Zone 2: Clean single-line text links (hidden on mobile, visible on md+) */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={onNewDecision}
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            New Decision
          </button>
          <button
            type="button"
            onClick={onSelectPresets}
            className="hover:text-slate-900 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Examples</span>
            <span className="text-[11px] font-mono text-slate-400">4</span>
          </button>
          <button
            type="button"
            onClick={onOpenHistory}
            className="hover:text-slate-900 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Saved Decisions</span>
            {historyCount > 0 && (
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {historyCount}
              </span>
            )}
          </button>
          <a
            href="#frameworks"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('frameworks') || document.getElementById('framework-guide');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            Methodology
          </a>
        </nav>

        {/* Zone 3: Primary Actions (compact and responsive for mobile viewports down to 320px) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {hasActiveAnalysis ? (
            <button
              type="button"
              onClick={onExport}
              aria-label="Export Markdown Report"
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileDown className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSelectPresets}
              aria-label="Browse Sample Dilemmas"
              className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Try Example</span>
              <span className="sm:hidden">Examples</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewDecision}
            aria-label="New Decision Analysis"
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">New Analysis</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>
    </header>
  );
};
