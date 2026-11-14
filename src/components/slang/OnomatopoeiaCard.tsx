import React from 'react';
import { OnomatopoeiaRecord } from '@/lib/db';
import { Bookmark, Sparkles } from 'lucide-react';

interface OnomatopoeiaCardProps {
  item: OnomatopoeiaRecord;
  shortDefs: string[];
  examples: string[];
  onBookmark: (term: string, reading: string, meaning: string, level: string) => void;
}

export function OnomatopoeiaCard({
  item,
  shortDefs,
  examples,
  onBookmark,
}: OnomatopoeiaCardProps) {
  return (
    <article className="slang-card">
      <div className="slang-card__head">
        <div className="slang-card__title-row">
          <h2 className="slang-card__term">{item.term}</h2>
          <span className="slang-card__badge slang-card__badge--ono">
            <Sparkles className="slang-card__sparkle-icon" />
            Onomatopée
          </span>
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

