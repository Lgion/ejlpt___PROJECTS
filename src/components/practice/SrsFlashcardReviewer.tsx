import React from 'react';
import { SRSCardRecord } from '@/lib/db';
import { type SRSQuality } from '@/lib/srs';

interface SrsFlashcardReviewerProps {
  card: SRSCardRecord;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (quality: SRSQuality) => void;
}

export function SrsFlashcardReviewer({
  card,
  revealed,
  onReveal,
  onGrade,
}: SrsFlashcardReviewerProps) {
  return (
    <section className="srs-reviewer">
      <div className="srs-reviewer__meta">
        <span>
          Flashcard SM-2 • {card.itemType} ({card.level})
        </span>
        <span>
          Répétitions : {card.repetitions} • Intervalle : {card.intervalDays}j
        </span>
      </div>

      <div className="srs-reviewer__card">
        <div className="srs-reviewer__prompt">{card.prompt}</div>
        {card.reading && <div className="srs-reviewer__reading">{card.reading}</div>}

        {revealed ? (
          <div className="srs-reviewer__answer-box">
            <div className="srs-reviewer__answer-label">Réponse</div>
            <div className="srs-reviewer__answer-text">{card.answer}</div>
          </div>
        ) : (
          <button type="button" onClick={onReveal} className="srs-reviewer__reveal-btn">
            Afficher la réponse
          </button>
        )}
      </div>

      {revealed && (
        <div className="srs-reviewer__grades">
          <button
            type="button"
            onClick={() => onGrade(0)}
            className="srs-reviewer__grade-btn srs-reviewer__grade-btn--again"
          >
            Encore (0)
          </button>
          <button
            type="button"
            onClick={() => onGrade(2)}
            className="srs-reviewer__grade-btn srs-reviewer__grade-btn--hard"
          >
            Difficile (2)
          </button>
          <button
            type="button"
            onClick={() => onGrade(3)}
            className="srs-reviewer__grade-btn srs-reviewer__grade-btn--good"
          >
            Bien (3)
          </button>
          <button
            type="button"
            onClick={() => onGrade(5)}
            className="srs-reviewer__grade-btn srs-reviewer__grade-btn--easy"
          >
            Facile (5)
          </button>
        </div>
      )}
    </section>
  );
}
