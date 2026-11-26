'use client';

import React, { useState } from 'react';
import { INCREMENTAL_BUILDER_EXERCISES } from '@/data/sentenceDrillsSeed';
import { CheckCircle2, Layers, RotateCcw, XCircle } from 'lucide-react';

export function IncrementalSentenceBuilder() {
  const [selectedExId, setSelectedExId] = useState(INCREMENTAL_BUILDER_EXERCISES[0].id);
  const [stepIdx, setStepIdx] = useState(0);
  const [pickedChoiceId, setPickedChoiceId] = useState<string | null>(null);
  const [historyTrail, setHistoryTrail] = useState<Array<{ role: string; result: string }>>([]);

  const exercise =
    INCREMENTAL_BUILDER_EXERCISES.find((e) => e.id === selectedExId) ||
    INCREMENTAL_BUILDER_EXERCISES[0];
  const currentStep = exercise.steps[stepIdx] || null;
  const isFinished = stepIdx >= exercise.steps.length;

  const handleSelectExercise = (id: string) => {
    setSelectedExId(id);
    setStepIdx(0);
    setPickedChoiceId(null);
    setHistoryTrail([]);
  };

  const handlePickChoice = (choiceId: string) => {
    if (!currentStep || pickedChoiceId !== null) return;
    setPickedChoiceId(choiceId);
  };

  const handleAdvance = () => {
    if (!currentStep) return;
    setHistoryTrail((prev) => [
      ...prev,
      { role: currentStep.addedRole, result: currentStep.resultSentence },
    ]);
    setStepIdx((i) => i + 1);
    setPickedChoiceId(null);
  };

  const currentDisplaySentence =
    pickedChoiceId && currentStep && currentStep.choices.find((c) => c.id === pickedChoiceId)?.isCorrect
      ? currentStep.resultSentence
      : isFinished
        ? exercise.steps[exercise.steps.length - 1].resultSentence
        : currentStep?.sentenceBefore || '';

  return (
    <div className="rounded-2xl border border-indigo-700/40 bg-slate-900/95 p-5 flex flex-col gap-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Constructeur Progressif en 4 Étapes (Basique → Complexe)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Cible finale : <span className="text-slate-200">{exercise.finalMeaningFr}</span>
          </p>
        </div>

        <select
          aria-label="Choisir un parcours progressif"
          value={exercise.id}
          onChange={(e) => handleSelectExercise(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-slate-200"
        >
          {INCREMENTAL_BUILDER_EXERCISES.map((ex) => (
            <option key={ex.id} value={ex.id}>
              [{ex.level}] {ex.titleFr}
            </option>
          ))}
        </select>
      </div>

      {/* Live Evolving Sentence */}
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Progression : Étape {Math.min(stepIdx + 1, exercise.steps.length)} / {exercise.steps.length}
          </span>
          <button
            type="button"
            onClick={() => handleSelectExercise(exercise.id)}
            className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Recommencer</span>
          </button>
        </div>

        <div className="text-xl md:text-2xl font-serif font-bold text-sky-200 leading-relaxed">
          {currentDisplaySentence}
        </div>

        {historyTrail.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {historyTrail.map((h, idx) => (
              <span
                key={idx}
                className="rounded-md border border-emerald-700/50 bg-emerald-950/40 px-2 py-0.5 text-[10px] text-emerald-300"
              >
                ✓ {h.role}
              </span>
            ))}
          </div>
        )}
      </div>

      {!isFinished && currentStep ? (
        <div className="flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-200">
            <span className="inline-block rounded bg-indigo-950 border border-indigo-700 px-2 py-0.5 text-[10px] text-indigo-300 mr-2">
              {currentStep.addedRole}
            </span>
            {currentStep.instructionFr}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {currentStep.choices.map((ch) => {
              const picked = pickedChoiceId === ch.id;
              const revealed = pickedChoiceId !== null;
              let btnClass =
                'border-slate-700 bg-slate-950 text-slate-200 hover:border-sky-500';
              if (revealed) {
                if (ch.isCorrect) {
                  btnClass = 'border-emerald-500 bg-emerald-950/60 text-emerald-200';
                } else if (picked) {
                  btnClass = 'border-rose-500 bg-rose-950/60 text-rose-200';
                }
              }
              return (
                <button
                  key={ch.id}
                  type="button"
                  disabled={revealed}
                  onClick={() => handlePickChoice(ch.id)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-serif font-semibold text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${btnClass}`}
                >
                  <span>{ch.text}</span>
                  {revealed && ch.isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  {revealed && picked && !ch.isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {pickedChoiceId !== null && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/90 p-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-300">{currentStep.explanationFr}</p>
              <button
                type="button"
                onClick={handleAdvance}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                {stepIdx + 1 >= exercise.steps.length ? 'Terminer' : 'Étape suivante →'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 text-xs text-emerald-200 flex items-center justify-between gap-3">
          <span>
            Phrase complète assemblée avec succès :{' '}
            <strong className="font-serif text-sm">{currentDisplaySentence}</strong>
          </span>
          <button
            type="button"
            onClick={() => handleSelectExercise(exercise.id)}
            className="rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3 py-1.5 font-bold text-white cursor-pointer"
          >
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}
