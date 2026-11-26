'use client';

import React, { useState } from 'react';
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, X } from 'lucide-react';
import type { DynamicQuizQuestion } from '@/lib/quizGenerator';
import { gradeSRSCard, recordErrorToSRS } from '@/lib/srs';
import { localDb } from '@/lib/db';
import { MultimediaFeedbackCard } from '@/components/practice/MultimediaFeedbackCard';

interface ReaderGeneratedQuizPanelProps {
  questions: DynamicQuizQuestion[];
  onClose: () => void;
}

export function ReaderGeneratedQuizPanel({
  questions,
  onClose,
}: ReaderGeneratedQuizPanelProps) {
  const [idx, setIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  if (questions.length === 0) return null;
  const current = questions[idx];

  const handleSelect = async (optId: string) => {
    if (selectedId !== null) return;
    setSelectedId(optId);
    const isRight = optId === current.correctOptionId;
    const correctOpt = current.options.find((o) => o.id === current.correctOptionId);

    if (isRight) {
      setScore((s) => s + 1);
      const existing = await localDb.srsCards.get(current.srsCardId);
      if (existing) await gradeSRSCard(current.srsCardId, 3);
    } else {
      await recordErrorToSRS({
        cardId: current.srsCardId,
        itemType: current.itemType,
        itemKey: current.itemKey,
        level: current.level,
        prompt: current.prompt,
        reading: current.reading,
        answer: correctOpt?.text || current.explanation,
      });
    }
  };

  const handleNext = () => {
    if (idx + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIdx((i) => i + 1);
    setSelectedId(null);
  };

  const handleRestart = () => {
    setIdx(0);
    setSelectedId(null);
    setScore(0);
    setFinished(false);
  };

  return (
    <section className="reader-quiz-panel" aria-label="Quiz généré depuis le texte">
      <div className="reader-quiz-panel__head">
        <div>
          <span className="reader-quiz-panel__kicker">Quiz généré depuis votre texte</span>
          <h3 className="reader-quiz-panel__title">
            {finished
              ? `Terminé : ${score} / ${questions.length}`
              : `Question ${idx + 1} / ${questions.length} • Score : ${score}`}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le quiz"
          className="reader-quiz-panel__close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {finished ? (
        <div className="reader-quiz-panel__done">
          <p className="text-sm text-slate-300">
            Score final : <strong className="text-white">{score} / {questions.length}</strong> (
            {Math.round((score / questions.length) * 100)}%). Les erreurs ont été ajoutées à votre
            file de révision SM-2.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleRestart} className="reader-quiz-panel__btn-primary">
              <RotateCcw className="w-4 h-4" />
              <span>Rejouer ce texte</span>
            </button>
            <button type="button" onClick={onClose} className="reader-quiz-panel__btn-secondary">
              Revenir au lecteur
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-base font-bold text-slate-100">{current.prompt}</div>
            {current.hint && <div className="text-xs text-slate-400 mt-1">{current.hint}</div>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {current.options.map((opt, oIdx) => {
              const answered = selectedId !== null;
              const isCorrect = opt.id === current.correctOptionId;
              const isSelected = selectedId === opt.id;
              let mod = '';
              if (answered) {
                if (isCorrect) mod = 'border-emerald-500 bg-emerald-950/60 text-emerald-200';
                else if (isSelected) mod = 'border-rose-500 bg-rose-950/60 text-rose-200';
                else mod = 'opacity-50';
              }
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={answered}
                  onClick={() => void handleSelect(opt.id)}
                  className={`flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-xs font-bold text-slate-100 transition-colors cursor-pointer ${mod}`}
                >
                  <span>
                    <span className="text-slate-400 mr-2">{oIdx + 1}.</span>
                    {opt.text}
                  </span>
                  {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {answered && isSelected && !isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedId !== null && (
            <div className="space-y-3">
              <MultimediaFeedbackCard
                itemKey={current.itemKey}
                itemType={current.itemType}
                reading={current.reading}
                meta={current.itemMeta}
                compact
              />
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-xs text-slate-300">{current.explanation}</span>
                <button type="button" onClick={handleNext} className="reader-quiz-panel__btn-primary shrink-0">
                  <span>{idx + 1 >= questions.length ? 'Terminer' : 'Suivante'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
