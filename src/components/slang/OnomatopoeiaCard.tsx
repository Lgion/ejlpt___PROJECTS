import React from 'react';
import { OnomatopoeiaRecord } from '@/lib/db';
import { ArrowLeftRight, Bookmark, Sparkles } from 'lucide-react';

interface OnomatopoeiaCardProps {
  item: OnomatopoeiaRecord;
  shortDefs: string[];
  examples: string[];
  onBookmark: (term: string, reading: string, meaning: string, level: string) => void;
  onSelectTerm?: (term: string) => void;
}

export function OnomatopoeiaCard({
  item,
  shortDefs,
  examples,
  onBookmark,
  onSelectTerm,
}: OnomatopoeiaCardProps) {
  const opposites = item.oppositeTerms || [];

  return (
    <article className="slang-card">
      <div className="slang-card__head">
        <div className="slang-card__title-row">
          <h2 className="slang-card__term">{item.term}</h2>
          <span className="slang-card__badge slang-card__badge--ono">
            <Sparkles className="slang-card__sparkle-icon" />
            Onomatopée
          </span>
          {item.pairTheme && (
            <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              {item.pairTheme}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onBookmark(item.term, item.term, shortDefs.join('; '), 'Mimétique')}
          aria-label={`Sauvegarder ${item.term}`}
          className="slang-card__bookmark-btn"
        >
          <Bookmark className="slang-card__bookmark-icon" />
        </button>
      </div>

      <div className="slang-card__meaning">{shortDefs.join(' / ')}</div>

      {opposites.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1 text-slate-400 font-semibold">
            <ArrowLeftRight className="w-3 h-3 text-amber-400" />
            Paire opposée :
          </span>
          {opposites.map((opp) => (
            <button
              key={opp}
              type="button"
              onClick={() => onSelectTerm?.(opp)}
              className="rounded-md border border-amber-700/50 bg-amber-950/40 px-2 py-0.5 text-amber-200 hover:bg-amber-900/50 transition-colors cursor-pointer"
            >
              {opp}
            </button>
          ))}
        </div>
      )}

      {item.extendedDefinition && (
        <p className="slang-card__extended">{item.extendedDefinition}</p>
      )}

      {examples.length > 0 && (
        <div className="slang-card__examples">
          {examples.slice(0, 2).map((ex, eIdx) => (
            <div key={eIdx} className="slang-card__ono-example">
              {ex}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
