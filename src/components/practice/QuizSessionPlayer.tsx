import React from 'react';
import { type DynamicQuizQuestion } from '@/lib/quizGenerator';
import { type SRSQuality } from '@/lib/srs';
import { MultimediaFeedbackCard } from '@/components/practice/MultimediaFeedbackCard';
import { Clock, CheckCircle2, XCircle, BookOpen, ArrowRight, Flame } from 'lucide-react';

interface QuizSessionPlayerProps {
  question: DynamicQuizQuestion;
  currentIndex: number;
  totalQuestions: number;
  score: number;
  streak?: number;
  dexterityPoints?: number;
  timedMode: boolean;
  timeLeft: number;
  selectedOptionId: string | null;
  gradedCurrentCard: boolean;
  onSelectOption: (optionId: string) => void;
  onManualGrade: (quality: SRSQuality) => void;
  onNext: () => void;
}

export function QuizSessionPlayer({
  question,
  currentIndex,
  totalQuestions,
  score,
  streak = 0,
  dexterityPoints,
  timedMode,
  timeLeft,
  selectedOptionId,
  gradedCurrentCard,
  onSelectOption,
  onManualGrade,
  onNext,
}: QuizSessionPlayerProps) {
  const hasAnswered = selectedOptionId !== null;

  return (
    <section className="quiz-player">
      <div className="quiz-player__topbar">
        <div className="quiz-player__badges">
          <span className="quiz-player__index-badge">
            Question {currentIndex + 1} / {totalQuestions}
          </span>
          <span className="quiz-player__type-badge">
            {question.itemType} • {question.level}
          </span>
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/70 border border-amber-700/60 px-2.5 py-0.5 text-xs font-bold text-amber-300">
              <Flame className="w-3.5 h-3.5" />
              Série ×{streak}
            </span>
          )}
        </div>
        <div className="quiz-player__stats">
          {timedMode && (
            <span
              className={`quiz-player__timer ${
                timeLeft <= 5 ? 'quiz-player__timer--urgent' : ''
              }`}
            >
              <Clock className="quiz-player__timer-icon" />
              {timeLeft}s
            </span>
          )}
          {typeof dexterityPoints === 'number' && timedMode && (
            <span className="text-xs font-bold text-sky-400">{dexterityPoints} pts</span>
          )}
          <span className="quiz-player__score">Score : {score}</span>
        </div>
      </div>

      <div className="quiz-player__progress-track">
        <div
          className="quiz-player__progress-fill"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      <div className="quiz-player__prompt-box">
        <div className="quiz-player__prompt">{question.prompt}</div>
        {question.reading && <div className="quiz-player__reading">{question.reading}</div>}
        {question.hint && <div className="quiz-player__hint">Indice : {question.hint}</div>}
      </div>

      <div className="quiz-player__options">
        {question.options.map((opt, idx) => {
          const isSelected = selectedOptionId === opt.id;
          const isCorrect = opt.id === question.correctOptionId;

          let optionMod = '';
          if (hasAnswered) {
            if (isCorrect) optionMod = 'quiz-player__option--correct';
            else if (isSelected) optionMod = 'quiz-player__option--wrong';
            else optionMod = 'quiz-player__option--muted';
          }

          return (
            <button
              key={opt.id}
              type="button"
              disabled={hasAnswered}
              onClick={() => onSelectOption(opt.id)}
              className={`quiz-player__option ${optionMod}`}
            >
              <div className="quiz-player__option-content">
                <span className="quiz-player__option-num">{idx + 1}</span>
                <span className="quiz-player__option-text">{opt.text}</span>
              </div>
              {hasAnswered && isCorrect && (
                <CheckCircle2 className="quiz-player__option-icon quiz-player__option-icon--correct" />
              )}
              {hasAnswered && isSelected && !isCorrect && (
                <XCircle className="quiz-player__option-icon quiz-player__option-icon--wrong" />
              )}
            </button>
          );
        })}
      </div>

      {hasAnswered && (
        <div aria-live="polite" className="quiz-player__feedback">
          <MultimediaFeedbackCard
            itemKey={question.itemKey}
            itemType={question.itemType}
            reading={question.reading}
            meta={question.itemMeta}
          />

          <div className="quiz-player__explanation">
            <BookOpen className="quiz-player__explanation-icon" />
            <div>
              <span className="quiz-player__explanation-label">Explication : </span>
              <span>{question.explanation}</span>
            </div>
          </div>

          <div className="quiz-player__feedback-actions">
            <div className="quiz-player__srs-bar">
              <span className="quiz-player__srs-label">Mémorisation SM-2 :</span>
              {gradedCurrentCard ? (
                <span className="quiz-player__srs-done">Intervalle SRS mis à jour</span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onManualGrade(0)}
                    className="quiz-player__srs-btn quiz-player__srs-btn--again"
                  >
                    Encore
                  </button>
                  <button
                    type="button"
                    onClick={() => onManualGrade(2)}
                    className="quiz-player__srs-btn quiz-player__srs-btn--hard"
                  >
                    Difficile
                  </button>
                  <button
                    type="button"
                    onClick={() => onManualGrade(3)}
                    className="quiz-player__srs-btn quiz-player__srs-btn--good"
                  >
                    Bien
                  </button>
                  <button
                    type="button"
                    onClick={() => onManualGrade(5)}
                    className="quiz-player__srs-btn quiz-player__srs-btn--easy"
                  >
                    Facile
                  </button>
                </>
              )}
            </div>

            <button type="button" onClick={onNext} className="quiz-player__next-btn">
              {currentIndex + 1 >= totalQuestions ? 'Terminer' : 'Suivante'}
              <ArrowRight className="quiz-player__next-icon" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
