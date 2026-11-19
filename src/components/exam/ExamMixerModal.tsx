'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dices, Layers, Shuffle, Sparkles, X } from 'lucide-react';
import type {
  ExamMixGranularity,
  JLPTExam,
  JLPTLevel,
  JLPTScoringDomain,
} from '@/types/jlpt';
import { composeMixedExam, describeComposableParts } from '@/lib/examComposer';

export interface ExamAttemptBadgeSummary {
  attempts: number;
  bestScore: number;
  maxScore: number;
  passed: boolean;
}

interface ExamMixerModalProps {
  level: JLPTLevel | null;
  sourceExams: JLPTExam[];
  attemptSummaries?: Record<string, ExamAttemptBadgeSummary>;
  isOpen: boolean;
  onClose: () => void;
  onComposedLaunch: (mixedExam: JLPTExam) => void;
}

const DOMAIN_TITLES: { domain: JLPTScoringDomain; label: string }[] = [
  { domain: 'vocab', label: '文字・語彙 (Vocabulaire)' },
  { domain: 'grammar', label: '文法 (Grammaire)' },
  { domain: 'reading', label: '読解 (Lecture)' },
  { domain: 'listening', label: '聴解 (Écoute Choukai)' },
];

export const ExamMixerModal: React.FC<ExamMixerModalProps> = ({
  level,
  sourceExams,
  attemptSummaries = {},
  isOpen,
  onClose,
  onComposedLaunch,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [granularity, setGranularity] = useState<ExamMixGranularity>('by_mondai');
  const [partSources, setPartSources] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState<number>(() => Math.floor(Date.now() % 100000));

  const sortedSources = useMemo(
    () => [...sourceExams].sort((a, b) => (a.examNumber ?? 1) - (b.examNumber ?? 1)),
    [sourceExams]
  );

  const parts = useMemo(() => describeComposableParts(sortedSources), [sortedSources]);

  const previewExam = useMemo(() => {
    if (!level || sortedSources.length === 0) return null;
    return composeMixedExam(level, sortedSources, {
      level,
      granularity,
      partSources,
      seed,
    });
  }, [granularity, level, partSources, seed, sortedSources]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && level) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.returnValue = '';
      dialog.close();
    }
  }, [isOpen, level]);

  if (!level || sortedSources.length === 0 || !previewExam) return null;

  const handleRerollAll = () => {
    setPartSources({});
    setSeed((prev) => (prev + Math.floor(Math.random() * 8999) + 1001) % 999999);
  };

  const handlePartChange = (moduleId: string, sourceVal: string) => {
    setPartSources((prev) => ({
      ...prev,
      [moduleId]: sourceVal,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const freshSeed = (seed + Math.floor(Math.random() * 899) + 1) % 999999;
    const finalExam = composeMixedExam(level, sortedSources, {
      level,
      granularity,
      partSources,
      seed: freshSeed,
    });
    onComposedLaunch(finalExam);
  };

  return (
    <dialog
      ref={dialogRef}
      className="jlpt-launch-dialog jlpt-mixer-dialog"
      aria-labelledby="mixer-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="jlpt-launch-dialog__shell">
        <div className="jlpt-launch-dialog__header">
          <div>
            <span className="jlpt-launch-dialog__level-pill">
              <Sparkles className="w-3 h-3 inline mr-1" />
              {level} · Compositeur Dynamique
            </span>
            <h2 id="mixer-modal-title" className="jlpt-launch-dialog__title">
              Composer un Examen Mixte ({level})
            </h2>
            <p className="jlpt-launch-dialog__subtitle">
              Piochez chaque partie parmi les {sortedSources.length} examens disponibles (#1 à #
              {sortedSources.length}) pour créer un examen inédit à chaque essai.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="jlpt-launch-dialog__close"
            aria-label="Fermer le compositeur d'examen mixte"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="jlpt-mixer-controls">
          <div className="jlpt-mixer-sources-summary">
            <span className="jlpt-mixer-sources-summary__label">Sources disponibles :</span>
            {sortedSources.map((src) => {
              const stat = attemptSummaries[src.id];
              return (
                <span key={src.id} className="jlpt-mixer-source-chip">
                  Examen #{src.examNumber ?? 1}
                  {stat ? (
                    <em className={stat.passed ? 'text-emerald-400' : 'text-amber-300'}>
                      {' '}
                      ({stat.bestScore}/{stat.maxScore})
                    </em>
                  ) : (
                    <em className="text-slate-400"> (inédit)</em>
                  )}
                </span>
              );
            })}
          </div>

          <div className="jlpt-mixer-toolbar">
            <button
              type="button"
              onClick={handleRerollAll}
              className="jlpt-mixer-reroll-btn"
            >
              <Dices className="w-4 h-4" />
              Nouveau tirage aléatoire (#{String(seed).padStart(4, '0').slice(-4)})
            </button>

            <div className="jlpt-pill-row" role="group" aria-label="Granularité du tirage">
              <button
                type="button"
                onClick={() => setGranularity('by_mondai')}
                className={granularity === 'by_mondai' ? 'is-selected' : ''}
              >
                <Layers className="w-3.5 h-3.5 inline mr-1" />
                Par partie (問題)
              </button>
              <button
                type="button"
                onClick={() => setGranularity('fine_shuffle')}
                className={granularity === 'fine_shuffle' ? 'is-selected' : ''}
              >
                <Shuffle className="w-3.5 h-3.5 inline mr-1" />
                Panachage fin (questions/textes)
              </button>
            </div>
          </div>
        </div>

        <div className="jlpt-launch-dialog__body">
          <div className="jlpt-modular-grid">
            {DOMAIN_TITLES.map(({ domain, label }) => {
              const domainParts = parts.filter((p) => p.domain === domain);
              if (domainParts.length === 0) return null;
              return (
                <div key={domain} className="jlpt-modular-domain">
                  <h4>{label}</h4>
                  <div className="jlpt-mixer-part-list">
                    {domainParts.map((part) => {
                      const selected = partSources[part.moduleId] ?? 'random';
                      return (
                        <div key={part.moduleId} className="jlpt-mixer-part-row">
                          <div className="jlpt-mixer-part-row__info">
                            <span className="jlpt-modular-item__jp" lang="ja">
                              {part.titleJp}
                            </span>
                            <span className="jlpt-modular-item__fr">
                              {part.titleFr}
                              {granularity === 'fine_shuffle' &&
                                part.supportsFineShuffle &&
                                selected === 'random' && (
                                  <span className="text-sky-400 ml-1">· panaché</span>
                                )}
                            </span>
                          </div>
                          <select
                            aria-label={`Source pour ${part.titleJp}`}
                            value={selected}
                            onChange={(e) => handlePartChange(part.moduleId, e.target.value)}
                            className="jlpt-mixer-select"
                          >
                            <option value="random">Aléatoire</option>
                            {part.availableSources.map((src) => (
                              <option key={src.examId} value={src.examId}>
                                Examen #{src.examNumber} ({src.questionCount} Q)
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="jlpt-launch-dialog__footer">
          <div className="jlpt-launch-dialog__estimate">
            Examen généré : {previewExam.questions.length} questions · {previewExam.totalTimeMinutes}{' '}
            min officielles (modifiable ensuite)
          </div>
          <div className="jlpt-launch-dialog__actions">
            <button type="button" onClick={onClose} className="jlpt-btn-cancel">
              Annuler
            </button>
            <button type="submit" className="jlpt-btn-launch">
              Configurer &amp; Lancer l’Examen Mixte
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
};
