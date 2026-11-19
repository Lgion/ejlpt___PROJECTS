'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckSquare,
  Clock,
  Dices,
  Headphones,
  Layers,
  ShieldAlert,
  Shuffle,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  ExamMixGranularity,
  ExamPresetMode,
  ExamSessionConfig,
  ExamStageId,
  JLPTExam,
  JLPTScoringDomain,
  ModularSubSectionId,
} from '@/types/jlpt';
import {
  createDefaultSessionConfig,
  getExamModularCatalog,
  MODULAR_SUBSECTION_CATALOG,
} from '@/lib/jlptTokens';
import {
  composeMixedExam,
  describeComposableParts,
  formatAnonymousExamLabel,
} from '@/lib/examComposer';
import { JLPT_180_TOTAL_PASS_BY_LEVEL } from '@/lib/examScoring';
import type { ExamAttemptBadgeSummary } from '@/components/exam/ExamMixerModal';

interface ExamLaunchModalProps {
  exam: JLPTExam | null;
  sourceExams?: JLPTExam[];
  initialSubjectChoice?: string; // exam.id or 'mix'
  attemptSummaries?: Record<string, ExamAttemptBadgeSummary>;
  isOpen: boolean;
  initialPresetMode?: ExamPresetMode;
  onClose: () => void;
  onLaunch: (exam: JLPTExam, config: ExamSessionConfig) => void;
}

const DOMAIN_TITLES: { domain: JLPTScoringDomain; label: string }[] = [
  { domain: 'vocab', label: '文字・語彙 (Vocabulaire)' },
  { domain: 'grammar', label: '文法 (Grammaire)' },
  { domain: 'reading', label: '読解 (Lecture)' },
  { domain: 'listening', label: '聴解 (Compréhension orale)' },
];

export const ExamLaunchModal: React.FC<ExamLaunchModalProps> = ({
  exam,
  sourceExams,
  initialSubjectChoice,
  attemptSummaries = {},
  isOpen,
  initialPresetMode,
  onClose,
  onLaunch,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const availableExams = useMemo(() => {
    const list = sourceExams && sourceExams.length > 0 ? sourceExams : exam ? [exam] : [];
    return [...list].sort((a, b) => (a.examNumber ?? 1) - (b.examNumber ?? 1));
  }, [sourceExams, exam]);

  const [subjectChoice, setSubjectChoice] = useState<string>(() => {
    if (initialSubjectChoice) return initialSubjectChoice;
    if (exam?.isDynamicMix) return 'mix';
    return exam?.id ?? availableExams[0]?.id ?? 'mix';
  });

  const [granularity, setGranularity] = useState<ExamMixGranularity>('by_mondai');
  const [partSources, setPartSources] = useState<Record<string, string>>({});
  const [seed, setSeed] = useState<number>(() => Math.floor(Date.now() % 100000));

  const composableParts = useMemo(
    () => (availableExams.length > 0 ? describeComposableParts(availableExams) : []),
    [availableExams]
  );

  // Determine if the user has customized per-part sources across multiple exams
  const hasCustomPartMix = useMemo(() => {
    if (subjectChoice === 'mix') return true;
    const activeIds = new Set(Object.values(partSources).filter(Boolean));
    if (activeIds.has('random')) return true;
    if (activeIds.size > 1) return true;
    if (activeIds.size === 1 && !activeIds.has(subjectChoice)) return true;
    return false;
  }, [subjectChoice, partSources]);

  const effectiveExam = useMemo<JLPTExam | null>(() => {
    if (availableExams.length === 0) return exam;
    const baseLevel = availableExams[0].level;

    if (subjectChoice === 'mix' || hasCustomPartMix) {
      const normalizedSources: Record<string, string> = {};
      for (const part of composableParts) {
        normalizedSources[part.moduleId] =
          partSources[part.moduleId] ?? (subjectChoice === 'mix' ? 'random' : subjectChoice);
      }
      return composeMixedExam(baseLevel, availableExams, {
        level: baseLevel,
        granularity,
        partSources: normalizedSources,
        seed,
      });
    }

    return availableExams.find((e) => e.id === subjectChoice) ?? availableExams[0];
  }, [
    availableExams,
    exam,
    subjectChoice,
    hasCustomPartMix,
    composableParts,
    partSources,
    granularity,
    seed,
  ]);

  const [presetMode, setPresetMode] = useState<ExamPresetMode>(
    initialPresetMode ?? 'OFFICIAL_STRICT'
  );
  const [timerMultiplier, setTimerMultiplier] = useState<1 | 1.5 | 0>(1);
  const [audioControlMode, setAudioControlMode] = useState<'strict_stream' | 'segmented_free'>(
    'segmented_free'
  );
  const [furiganaPolicy, setFuriganaPolicy] = useState<'official_booklet' | 'global_toggle'>(
    'global_toggle'
  );
  const [showStarOrderingHelper, setShowStarOrderingHelper] = useState(true);
  const [correctionTiming, setCorrectionTiming] = useState<'end_only' | 'immediate_feedback'>(
    'end_only'
  );
  const [theme, setTheme] = useState<'paper_booklet' | 'dark_ejlpt'>('paper_booklet');
  const [showOmrSheet, setShowOmrSheet] = useState(true);
  const [enableBookletCoverGate, setEnableBookletCoverGate] = useState(false);

  const stageOptions = useMemo(() => effectiveExam?.stages ?? [], [effectiveExam?.stages]);
  const modularCatalog = useMemo(
    () => (effectiveExam ? getExamModularCatalog(effectiveExam) : MODULAR_SUBSECTION_CATALOG),
    [effectiveExam]
  );

  const [selectedStages, setSelectedStages] = useState<ExamStageId[]>(() =>
    effectiveExam?.stages?.length
      ? effectiveExam.stages.map((s) => s.id)
      : ['stage-vocab', 'stage-grammar-reading', 'stage-listening']
  );
  const [selectedModules, setSelectedModules] = useState<ModularSubSectionId[]>(() => {
    const initialList = effectiveExam
      ? getExamModularCatalog(effectiveExam)
      : MODULAR_SUBSECTION_CATALOG;
    const firstVocab = initialList.find((m) => m.domain === 'vocab');
    const firstGrammar = initialList.find((m) => m.domain === 'grammar');
    const firstReading = initialList.find((m) => m.domain === 'reading');
    const picks = [firstVocab, firstGrammar, firstReading]
      .filter(Boolean)
      .map((m) => m!.id);
    return picks.length > 0 ? picks : initialList.slice(0, 3).map((m) => m.id);
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && effectiveExam) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.returnValue = '';
      dialog.close();
    }
  }, [isOpen, effectiveExam]);

  const modularSummary = useMemo(() => {
    const picked = modularCatalog.filter((m) => selectedModules.includes(m.id));
    const questionCount = picked.reduce((sum, m) => sum + m.questionCount, 0);
    const baseMinutes = picked.reduce((sum, m) => sum + m.recommendedMinutes, 0);
    const effectiveMinutes =
      timerMultiplier === 0 ? 0 : Math.round(baseMinutes * timerMultiplier);
    return { picked, questionCount, baseMinutes, effectiveMinutes };
  }, [modularCatalog, selectedModules, timerMultiplier]);

  if (!effectiveExam) {
    return <dialog ref={dialogRef} className="jlpt-launch-dialog" onClose={onClose} />;
  }

  const handleSelectWholeSubject = (choice: string) => {
    setSubjectChoice(choice);
    if (choice === 'mix') {
      const nextMap: Record<string, string> = {};
      for (const p of composableParts) nextMap[p.moduleId] = 'random';
      setPartSources(nextMap);
      setSeed((prev) => (prev + 7919) % 999999);
    } else {
      const nextMap: Record<string, string> = {};
      for (const p of composableParts) nextMap[p.moduleId] = choice;
      setPartSources(nextMap);
    }
  };

  const handlePartSourceChange = (moduleId: string, sourceValue: string) => {
    setPartSources((prev) => {
      const base: Record<string, string> = {};
      for (const p of composableParts) {
        base[p.moduleId] =
          prev[p.moduleId] ?? (subjectChoice === 'mix' ? 'random' : subjectChoice);
      }
      base[moduleId] = sourceValue;
      return base;
    });
    setSubjectChoice('mix');
  };

  const handleRerollRandomMix = () => {
    const nextMap: Record<string, string> = {};
    for (const p of composableParts) nextMap[p.moduleId] = 'random';
    setPartSources(nextMap);
    setSubjectChoice('mix');
    setSeed((prev) => (prev + Math.floor(Math.random() * 8999) + 101) % 999999);
  };

  const toggleStage = (id: ExamStageId) => {
    setSelectedStages((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((x) => x !== id)
          : prev
        : [...prev, id]
    );
  };

  const toggleModule = (id: ModularSubSectionId) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectDomainModules = (domain: 'vocab' | 'grammar' | 'reading' | 'listening') => {
    const domainIds = modularCatalog.filter((m) => m.domain === domain).map((m) => m.id);
    const allPresent = domainIds.every((id) => selectedModules.includes(id));
    setSelectedModules((prev) =>
      allPresent
        ? prev.filter((id) => !domainIds.includes(id))
        : Array.from(new Set([...prev, ...domainIds]))
    );
  };

  const handleConfirmLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (presetMode === 'OFFICIAL_STRICT') {
      onLaunch(effectiveExam, createDefaultSessionConfig('OFFICIAL_STRICT', effectiveExam));
      return;
    }

    if (presetMode === 'CUSTOM_CONDITIONS') {
      onLaunch(effectiveExam, {
        presetMode: 'CUSTOM_CONDITIONS',
        timerMultiplier,
        audioControlMode,
        furiganaPolicy,
        showStarOrderingHelper,
        correctionTiming,
        theme,
        showOmrSheet,
        enableBookletCoverGate,
        selectedStages,
      });
      return;
    }

    onLaunch(effectiveExam, {
      presetMode: 'MODULAR_SELECTION',
      timerMultiplier,
      customMinutesOverride: modularSummary.baseMinutes,
      audioControlMode: 'segmented_free',
      furiganaPolicy,
      showStarOrderingHelper,
      correctionTiming,
      theme,
      showOmrSheet,
      enableBookletCoverGate: false,
      selectedModules,
    });
  };

  const isModularEmpty = presetMode === 'MODULAR_SELECTION' && selectedModules.length === 0;

  return (
    <dialog
      ref={dialogRef}
      className="jlpt-launch-dialog"
      aria-labelledby="launch-modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <form onSubmit={handleConfirmLaunch} className="jlpt-launch-dialog__shell">
        <div className="jlpt-launch-dialog__header">
          <div>
            <span className="jlpt-launch-dialog__level-pill">
              {formatAnonymousExamLabel(effectiveExam)}
            </span>
            <h2 id="launch-modal-title" className="jlpt-launch-dialog__title">
              {effectiveExam.title}
            </h2>
            <p className="jlpt-launch-dialog__subtitle">
              Sélectionnez votre cahier (#1, #2 ou Mixte par 問題) et votre mode de simulation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="jlpt-launch-dialog__close"
            aria-label="Fermer la fenêtre de configuration"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unified Subject / Exam Picker (#1, #2, or Dynamic Mix) */}
        {availableExams.length > 1 && (
          <div className="jlpt-mixer-controls">
            <div className="jlpt-mixer-sources-summary">
              <span className="jlpt-mixer-sources-summary__label">Sujet :</span>
              {availableExams.map((src) => {
                const stat = attemptSummaries[src.id];
                const isSelected = subjectChoice === src.id && !hasCustomPartMix;
                return (
                  <button
                    key={src.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectWholeSubject(src.id)}
                    className={`jlpt-mixer-source-chip cursor-pointer transition-all ${
                      isSelected
                        ? 'border-sky-400 bg-sky-500/20 text-white ring-1 ring-sky-400'
                        : 'hover:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" aria-hidden="true" />}
                    <strong>Examen #{src.examNumber ?? 1}</strong> ({src.questions.length} Q)
                    {stat ? (
                      <span
                        className={
                          stat.passed ? 'text-emerald-400 ml-1' : 'text-amber-300 ml-1'
                        }
                      >
                        · {stat.bestScore}/{stat.maxScore}
                      </span>
                    ) : null}
                  </button>
                );
              })}

              <button
                type="button"
                aria-pressed={subjectChoice === 'mix' || hasCustomPartMix}
                onClick={() => handleSelectWholeSubject('mix')}
                className={`jlpt-mixer-source-chip cursor-pointer transition-all ${
                  subjectChoice === 'mix' || hasCustomPartMix
                    ? 'border-indigo-400 bg-indigo-500/25 text-white ring-1 ring-indigo-400'
                    : 'hover:border-slate-600'
                }`}
              >
                <Dices className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                <strong>Examen Mixte (Pioche #1–#{availableExams.length})</strong>
              </button>
            </div>

            {(subjectChoice === 'mix' || hasCustomPartMix) && (
              <div className="jlpt-mixer-toolbar">
                <button
                  type="button"
                  onClick={handleRerollRandomMix}
                  className="jlpt-mixer-btn-reroll"
                >
                  <Dices className="w-4 h-4" aria-hidden="true" />
                  Tirage 100 % aléatoire
                </button>

                <div
                  className="jlpt-pill-row"
                  role="group"
                  aria-label="Granularité du mélange"
                >
                  <button
                    type="button"
                    onClick={() => setGranularity('by_mondai')}
                    className={granularity === 'by_mondai' ? 'is-selected' : ''}
                  >
                    <Layers className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                    Par 問題 entier
                  </button>
                  <button
                    type="button"
                    onClick={() => setGranularity('fine_shuffle')}
                    className={granularity === 'fine_shuffle' ? 'is-selected' : ''}
                  >
                    <Shuffle className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />
                    Panachage fin
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode Selection Cards */}
        <fieldset className="jlpt-launch-dialog__modes">
          <legend className="visually-hidden">Mode d’examen</legend>

          <label
            className={`jlpt-mode-card ${
              presetMode === 'OFFICIAL_STRICT' ? 'jlpt-mode-card--active' : ''
            }`}
          >
            <input
              type="radio"
              name="exam-preset-mode"
              value="OFFICIAL_STRICT"
              checked={presetMode === 'OFFICIAL_STRICT'}
              onChange={() => setPresetMode('OFFICIAL_STRICT')}
              className="visually-hidden"
            />
            <div className="jlpt-mode-card__icon jlpt-mode-card__icon--strict">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="jlpt-mode-card__name">1. Examen Officiel Strict</p>
              <p className="jlpt-mode-card__desc">
                Cahiers scellés, audio continu verrouillé, furigana stricts du livret, OMR &amp;
                score /180.
              </p>
            </div>
          </label>

          <label
            className={`jlpt-mode-card ${
              presetMode === 'CUSTOM_CONDITIONS' ? 'jlpt-mode-card--active' : ''
            }`}
          >
            <input
              type="radio"
              name="exam-preset-mode"
              value="CUSTOM_CONDITIONS"
              checked={presetMode === 'CUSTOM_CONDITIONS'}
              onChange={() => setPresetMode('CUSTOM_CONDITIONS')}
              className="visually-hidden"
            />
            <div className="jlpt-mode-card__icon jlpt-mode-card__icon--custom">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <p className="jlpt-mode-card__name">2. Conditions Paramétrables</p>
              <p className="jlpt-mode-card__desc">
                Personnalisez le chrono (1x / 1.5x / illimité), l’audio, les furigana, l’aide ★ et
                le moment de correction.
              </p>
            </div>
          </label>

          <label
            className={`jlpt-mode-card ${
              presetMode === 'MODULAR_SELECTION' ? 'jlpt-mode-card--active' : ''
            }`}
          >
            <input
              type="radio"
              name="exam-preset-mode"
              value="MODULAR_SELECTION"
              checked={presetMode === 'MODULAR_SELECTION'}
              onChange={() => setPresetMode('MODULAR_SELECTION')}
              className="visually-hidden"
            />
            <div className="jlpt-mode-card__icon jlpt-mode-card__icon--modular">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="jlpt-mode-card__name">3. Choix Modulaire (Épreuves / 問題)</p>
              <p className="jlpt-mode-card__desc">
                Cochez vos 問題 à la carte et piochez la source (#1, #2 ou Aléatoire) pour chaque
                partie.
              </p>
            </div>
          </label>
        </fieldset>

        {/* Detailed Panel per Mode */}
        <div className="jlpt-launch-dialog__body">
          {presetMode === 'OFFICIAL_STRICT' && (
            <div className="flex flex-col gap-4">
              <div className="jlpt-strict-summary">
                <h3>Règles appliquées automatiquement</h3>
                <ul>
                  <li>
                    <strong>{stageOptions.length} épreuves séquentielles irréversibles :</strong>{' '}
                    {stageOptions
                      .map((st) => {
                        const count = effectiveExam.questions.filter(
                          (q) => q.stageId === st.id
                        ).length;
                        const minsLabel =
                          st.id === 'stage-listening'
                            ? `~${st.durationMinutes} min`
                            : `${st.durationMinutes} min`;
                        return `${st.titleJp} ${minsLabel} (${count} Q)`;
                      })
                      .join(' → ')}
                    .
                  </li>
                  <li>
                    <strong>Présentation Cahier Papier (Mincho) :</strong> fond crème `#FAF8F5`,
                    filets noirs, feuille OMR à bulles fidèle (3 ou 4 choix selon la partie).
                  </li>
                  <li>
                    <strong>Aucune aide pendant l’épreuve :</strong> furigana stricts du livret
                    officiel, bande sonore continue sans pause ni retour arrière ni script.
                  </li>
                  <li>
                    <strong>Notation officielle JLPT {effectiveExam.level} (/180) :</strong>{' '}
                    {effectiveExam.level === 'N4' || effectiveExam.level === 'N5'
                      ? `Langue+Lecture /120 (seuil ≥ 38/120), Écoute /60 (seuil ≥ 19/60). Réussite si ≥ ${JLPT_180_TOTAL_PASS_BY_LEVEL[effectiveExam.level]}/180 au total.`
                      : `Langue /60, Lecture /60, Écoute /60. Réussite si ≥ 19/60 par domaine et ≥ ${JLPT_180_TOTAL_PASS_BY_LEVEL[effectiveExam.level]}/180 au total.`}
                  </li>
                </ul>
              </div>

              {/* When Mixte is active in Strict Mode, show the per-part source picker right here */}
              {availableExams.length > 1 && (subjectChoice === 'mix' || hasCustomPartMix) && (
                <div className="jlpt-modular-grid">
                  {DOMAIN_TITLES.map(({ domain, label }) => {
                    const domainParts = composableParts.filter((p) => p.domain === domain);
                    if (domainParts.length === 0) return null;
                    return (
                      <div key={domain} className="jlpt-modular-domain">
                        <h4>{label}</h4>
                        <div className="jlpt-mixer-part-list">
                          {domainParts.map((part) => {
                            const selected =
                              partSources[part.moduleId] ??
                              (subjectChoice === 'mix' ? 'random' : subjectChoice);
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
                                  onChange={(e) =>
                                    handlePartSourceChange(part.moduleId, e.target.value)
                                  }
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
              )}
            </div>
          )}

          {presetMode === 'CUSTOM_CONDITIONS' && (
            <div className="jlpt-custom-grid">
              <div className="jlpt-custom-group">
                <span className="jlpt-custom-group__label">
                  <Clock className="w-4 h-4 inline mr-1" /> Chronomètre
                </span>
                <div className="jlpt-pill-row">
                  {[
                    { val: 1 as const, label: 'Officiel (1x)' },
                    { val: 1.5 as const, label: 'Confort (+50%)' },
                    { val: 0 as const, label: 'Sans limite' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTimerMultiplier(opt.val)}
                      className={timerMultiplier === opt.val ? 'is-selected' : ''}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="jlpt-custom-group">
                <span className="jlpt-custom-group__label">
                  <Headphones className="w-4 h-4 inline mr-1" /> Contrôles Audio (聴解)
                </span>
                <div className="jlpt-pill-row">
                  <button
                    type="button"
                    onClick={() => setAudioControlMode('segmented_free')}
                    className={audioControlMode === 'segmented_free' ? 'is-selected' : ''}
                  >
                    Segmenté par Q (Pause/Vitesse/Script)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudioControlMode('strict_stream')}
                    className={audioControlMode === 'strict_stream' ? 'is-selected' : ''}
                  >
                    Flux continu verrouillé
                  </button>
                </div>
              </div>

              <div className="jlpt-custom-group">
                <span className="jlpt-custom-group__label">Furigana</span>
                <div className="jlpt-pill-row">
                  <button
                    type="button"
                    onClick={() => setFuriganaPolicy('global_toggle')}
                    className={furiganaPolicy === 'global_toggle' ? 'is-selected' : ''}
                  >
                    Réglage Navbar (AUTO/HOVER)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFuriganaPolicy('official_booklet')}
                    className={furiganaPolicy === 'official_booklet' ? 'is-selected' : ''}
                  >
                    Livret officiel strict
                  </button>
                </div>
              </div>

              <div className="jlpt-custom-group">
                <span className="jlpt-custom-group__label">Correction &amp; Outils</span>
                <div className="jlpt-pill-row">
                  <button
                    type="button"
                    onClick={() => setCorrectionTiming('end_only')}
                    className={correctionTiming === 'end_only' ? 'is-selected' : ''}
                  >
                    Fin d’examen
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrectionTiming('immediate_feedback')}
                    className={correctionTiming === 'immediate_feedback' ? 'is-selected' : ''}
                  >
                    Feedback immédiat
                  </button>
                </div>
              </div>

              <div className="jlpt-custom-group">
                <span className="jlpt-custom-group__label">Thème &amp; Interface</span>
                <div className="jlpt-pill-row">
                  <button
                    type="button"
                    onClick={() => setTheme('paper_booklet')}
                    className={theme === 'paper_booklet' ? 'is-selected' : ''}
                  >
                    Cahier Papier (Mincho)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark_ejlpt')}
                    className={theme === 'dark_ejlpt' ? 'is-selected' : ''}
                  >
                    Thème Sombre eJLPT
                  </button>
                </div>
                <div className="jlpt-check-row mt-2">
                  <label>
                    <input
                      type="checkbox"
                      checked={showStarOrderingHelper}
                      onChange={(e) => setShowStarOrderingHelper(e.target.checked)}
                    />
                    Aide d’assemblage ★ (clic 4 segments)
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={showOmrSheet}
                      onChange={(e) => setShowOmrSheet(e.target.checked)}
                    />
                    Afficher la feuille OMR
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={enableBookletCoverGate}
                      onChange={(e) => setEnableBookletCoverGate(e.target.checked)}
                    />
                    Écran de garde 問題用紙
                  </label>
                </div>
              </div>

              <div className="jlpt-custom-group">
                <span className="jlpt-custom-group__label">Épreuves à inclure</span>
                <div className="jlpt-check-row">
                  {stageOptions.map((st) => {
                    const count = effectiveExam.questions.filter(
                      (q) => q.stageId === st.id
                    ).length;
                    return (
                      <label key={st.id}>
                        <input
                          type="checkbox"
                          checked={selectedStages.includes(st.id)}
                          onChange={() => toggleStage(st.id)}
                        />
                        {st.order}. {st.titleJp} ({st.durationMinutes}m · {count} Q)
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {presetMode === 'MODULAR_SELECTION' && (
            <div className="jlpt-modular-panel">
              <div className="jlpt-modular-panel__quickbar">
                <button type="button" onClick={() => selectDomainModules('vocab')}>
                  Tout 文字・語彙 (
                  {modularCatalog
                    .filter((m) => m.domain === 'vocab')
                    .reduce((s, m) => s + m.questionCount, 0)}{' '}
                  Q)
                </button>
                <button type="button" onClick={() => selectDomainModules('grammar')}>
                  Tout 文法 (
                  {modularCatalog
                    .filter((m) => m.domain === 'grammar')
                    .reduce((s, m) => s + m.questionCount, 0)}{' '}
                  Q)
                </button>
                <button type="button" onClick={() => selectDomainModules('reading')}>
                  Tout 読解 (
                  {modularCatalog
                    .filter((m) => m.domain === 'reading')
                    .reduce((s, m) => s + m.questionCount, 0)}{' '}
                  Q)
                </button>
                <button type="button" onClick={() => selectDomainModules('listening')}>
                  Tout 聴解 (
                  {modularCatalog
                    .filter((m) => m.domain === 'listening')
                    .reduce((s, m) => s + m.questionCount, 0)}{' '}
                  Q)
                </button>
              </div>

              <div className="jlpt-modular-grid">
                {DOMAIN_TITLES.map(({ domain, label: domainLabel }) => {
                  const items = modularCatalog.filter((m) => m.domain === domain);
                  return (
                    <div key={domain} className="jlpt-modular-domain">
                      <h4>{domainLabel}</h4>
                      <div className="jlpt-modular-list">
                        {items.map((item) => {
                          const compPart = composableParts.find((p) => p.moduleId === item.id);
                          const selectedSrc =
                            partSources[item.id] ??
                            (subjectChoice === 'mix' ? 'random' : subjectChoice);
                          return (
                            <div
                              key={item.id}
                              className="jlpt-modular-item flex items-center justify-between gap-2"
                            >
                              <label className="flex items-start gap-2 flex-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModules.includes(item.id)}
                                  onChange={() => toggleModule(item.id)}
                                />
                                <div>
                                  <span className="jlpt-modular-item__jp" lang="ja">
                                    {item.titleJp}
                                  </span>
                                  <span className="jlpt-modular-item__fr">
                                    {item.titleFr} · ~{item.recommendedMinutes} min
                                  </span>
                                </div>
                              </label>
                              {availableExams.length > 1 && compPart && (
                                <select
                                  aria-label={`Source pour ${item.titleJp}`}
                                  value={selectedSrc}
                                  onChange={(e) =>
                                    handlePartSourceChange(item.id, e.target.value)
                                  }
                                  className="jlpt-mixer-select"
                                >
                                  <option value="random">Aléatoire</option>
                                  {compPart.availableSources.map((src) => (
                                    <option key={src.examId} value={src.examId}>
                                      #{src.examNumber} ({src.questionCount}Q)
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="jlpt-modular-options-bar">
                <div className="jlpt-pill-row">
                  <span>Chrono :</span>
                  {[
                    { val: 1 as const, label: 'Recommandé' },
                    { val: 1.5 as const, label: '+50%' },
                    { val: 0 as const, label: 'Libre' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTimerMultiplier(opt.val)}
                      className={timerMultiplier === opt.val ? 'is-selected' : ''}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="jlpt-pill-row">
                  <span>Thème :</span>
                  <button
                    type="button"
                    onClick={() => setTheme('paper_booklet')}
                    className={theme === 'paper_booklet' ? 'is-selected' : ''}
                  >
                    Papier
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark_ejlpt')}
                    className={theme === 'dark_ejlpt' ? 'is-selected' : ''}
                  >
                    Sombre
                  </button>
                </div>

                <label className="jlpt-inline-check">
                  <input
                    type="checkbox"
                    checked={correctionTiming === 'immediate_feedback'}
                    onChange={(e) =>
                      setCorrectionTiming(e.target.checked ? 'immediate_feedback' : 'end_only')
                    }
                  />
                  Correction immédiate
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Launch CTA */}
        <div className="jlpt-launch-dialog__footer">
          <div className="jlpt-launch-dialog__estimate">
            {presetMode === 'OFFICIAL_STRICT' ? (
              <span>
                Simulation complète : {effectiveExam.questions.length} questions ·{' '}
                {effectiveExam.totalTimeMinutes} min officielles
              </span>
            ) : presetMode === 'CUSTOM_CONDITIONS' ? (
              <span>
                Épreuves : {selectedStages.length}/{stageOptions.length} · Chrono{' '}
                {timerMultiplier === 0 ? 'illimité' : `×${timerMultiplier}`}
              </span>
            ) : (
              <span>
                <CheckSquare className="w-4 h-4 inline mr-1" />
                {modularSummary.questionCount} questions sélectionnées ·{' '}
                {modularSummary.effectiveMinutes === 0
                  ? 'Temps libre'
                  : `${modularSummary.effectiveMinutes} min`}
              </span>
            )}
          </div>

          <div className="jlpt-launch-dialog__actions">
            <button type="button" onClick={onClose} className="jlpt-btn-cancel">
              Annuler
            </button>
            <button type="submit" disabled={isModularEmpty} className="jlpt-btn-launch">
              Démarrer la session
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
};
