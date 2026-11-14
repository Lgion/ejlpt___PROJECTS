import React from 'react';
import { SlangRecord } from '@/lib/db';
import { Bookmark } from 'lucide-react';

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

