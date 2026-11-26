import React from 'react';
import { SlangRecord } from '@/lib/db';
import { Bookmark, Clock, TrendingUp } from 'lucide-react';

interface SlangCardProps {
  item: SlangRecord;
  readings: string[];
  meanings: string[];
  notes: string[];
  examples: string[];
  onBookmark: (term: string, reading: string, meaning: string, level: string) => void;
}

export function SlangCard({
  item,
  readings,
  meanings,
  notes,
  examples,
  onBookmark,
}: SlangCardProps) {
  return (
    <article className="slang-card">
      <div className="slang-card__head">
        <div>
          <div className="slang-card__title-row">
            <h2 className="slang-card__term">{item.term}</h2>
            <span className="slang-card__badge slang-card__badge--slang">Slang</span>
            {item.era && (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                <Clock className="w-3 h-3 text-sky-400" />
                {item.era}
              </span>
            )}
            {typeof item.annualFrequency === 'number' && (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-emerald-800/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"
                title={`Fréquence estimée (actualisée ${item.lastFrequencyRefresh || '2026-01-01'})`}
              >
                <TrendingUp className="w-3 h-3" />
                Usage {item.annualFrequency}/100
              </span>
            )}
          </div>
          {readings.length > 0 && (
            <div className="slang-card__readings">{readings.join(', ')}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            onBookmark(item.term, readings.join(', '), meanings.join('; '), 'Slang')
          }
          aria-label={`Sauvegarder ${item.term}`}
          className="slang-card__bookmark-btn"
        >
          <Bookmark className="slang-card__bookmark-icon" />
        </button>
      </div>

      <div className="slang-card__meaning">{meanings.join(' • ')}</div>

      {notes.length > 0 && <div className="slang-card__note">{notes.join(' ')}</div>}

      {examples.length > 0 && <div className="slang-card__example">{examples[0]}</div>}
    </article>
  );
}
