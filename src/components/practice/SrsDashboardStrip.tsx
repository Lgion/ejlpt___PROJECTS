import React from 'react';
import { Brain, Layers, Award } from 'lucide-react';

interface SrsDashboardStripProps {
  dueCount: number;
  total: number;
  masteredCount: number;
  flashcardActive: boolean;
  onToggleFlashcards: () => void;
}

export function SrsDashboardStrip({
  dueCount,
  total,
  masteredCount,
  flashcardActive,
  onToggleFlashcards,
}: SrsDashboardStripProps) {
  return (
    <section
      aria-label="Tableau de bord de révision espacée SM-2"
      className="srs-strip"
    >
      <div className="srs-strip__card">
        <div className="srs-strip__label">
          <Brain className="srs-strip__icon srs-strip__icon--due" />
          Cartes dues maintenant
        </div>
        <div className="srs-strip__value srs-strip__value--due">{dueCount}</div>
      </div>
      <div className="srs-strip__card">
        <div className="srs-strip__label">
          <Layers className="srs-strip__icon srs-strip__icon--total" />
          Total cartes SRS
        </div>
        <div className="srs-strip__value srs-strip__value--total">{total}</div>
      </div>
      <div className="srs-strip__card">
        <div className="srs-strip__label">
          <Award className="srs-strip__icon srs-strip__icon--mastered" />
          Cartes maîtrisées
        </div>
        <div className="srs-strip__value srs-strip__value--mastered">{masteredCount}</div>
      </div>
      <div className="srs-strip__card srs-strip__card--action">
        <div className="srs-strip__label">Mode Flashcard SM-2</div>
        <button
          type="button"
          disabled={dueCount === 0}
          onClick={onToggleFlashcards}
          className="srs-strip__toggle-btn"
        >
          {flashcardActive
            ? 'Fermer Flashcards'
            : dueCount > 0
              ? `Réviser (${dueCount})`
              : 'Aucune carte due'}
        </button>
      </div>
    </section>
  );
}

