import React from 'react';
import { GrammarRecord } from '@/lib/db';
import { Bookmark } from 'lucide-react';

interface GrammarCardProps {
  grammar: GrammarRecord;
  showConnections: boolean;
  onBookmark: (g: GrammarRecord) => void;
}

export function GrammarCard({ grammar, showConnections, onBookmark }: GrammarCardProps) {
  return (
    <article className="grammar-card">
      <div className="grammar-card__head">
        <div>
          <div className="grammar-card__title-row">
            <h2 className="grammar-card__term">{grammar.term}</h2>
            {grammar.reading && grammar.reading !== grammar.term && (
              <span className="grammar-card__reading">({grammar.reading})</span>
            )}
            <span className="grammar-card__level-badge">{grammar.jlpt_level}</span>
            <span className="grammar-card__source-badge">
              {grammar.category} • {grammar.source}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onBookmark(grammar)}
          aria-label={`Sauvegarder ${grammar.term}`}
          className="grammar-card__bookmark-btn"
        >
          <Bookmark className="grammar-card__bookmark-icon" />
        </button>
      </div>

      {showConnections && grammar.connections && grammar.connections.length > 0 && (
        <div className="grammar-card__connections">
          <span className="grammar-card__conn-label">【接続】 Type de connexion</span>
          <div className="grammar-card__conn-chips">
            {grammar.connections.slice(0, 3).map((conn, cIdx) => (
              <span key={cIdx} className="grammar-card__conn-chip">
                {conn}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grammar-card__meaning">{grammar.meaning}</div>

      {grammar.explanation && (
        <p className="grammar-card__explanation">
          {grammar.explanation.slice(0, 360)}
          {grammar.explanation.length > 360 ? '…' : ''}
        </p>
      )}

      {grammar.examples && grammar.examples.length > 0 && (
        <div className="grammar-card__examples">
          <span className="grammar-card__examples-label">Exemples</span>
          {grammar.examples.slice(0, 3).map((ex, eIdx) => (
            <div key={eIdx} className="grammar-card__example">
              <div className="grammar-card__example-jp">{ex.jp}</div>
              {ex.translation && (
                <div className="grammar-card__example-tr">{ex.translation}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

