import React from 'react';
import { JLPTQuestion } from '@/types/jlpt';

interface ExamQuestionPaletteProps {
  questions: JLPTQuestion[];
  answers: Record<string, string>;
  flags: Record<string, boolean>;
  currentIndex: number;
  answeredCount: number;
  onSelectIndex: (index: number) => void;
}

export function ExamQuestionPalette({
  questions,
  answers,
  flags,
  currentIndex,
  answeredCount,
  onSelectIndex,
}: ExamQuestionPaletteProps) {
  return (
    <div className="exam-palette">
      <div className="exam-palette__header">
        <h3 className="exam-palette__title">Grille de Repérage</h3>
        <span className="exam-palette__count">
          {answeredCount} / {questions.length} répondus
        </span>
      </div>

      <div className="exam-palette__grid">
        {questions.map((q, idx) => {
          const isAns = Boolean(answers[q.id]);
          const isCur = idx === currentIndex;
          const isFlg = Boolean(flags[q.id]);

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`exam-palette__cell ${isAns ? 'exam-palette__cell--answered' : ''} ${
                isCur ? 'exam-palette__cell--current' : ''
              }`}
            >
              {idx + 1}
              {isFlg && <span className="exam-palette__flag-dot" />}
            </button>
          );
        })}
      </div>

      <div className="exam-palette__legend">
        <div className="exam-palette__legend-row">
          <span className="exam-palette__legend-swatch exam-palette__legend-swatch--answered" />
          <span>Répondu</span>
        </div>
        <div className="exam-palette__legend-row">
          <span className="exam-palette__legend-swatch exam-palette__legend-swatch--flagged" />
          <span>Marqué pour révision</span>
        </div>
      </div>
    </div>
  );
}

