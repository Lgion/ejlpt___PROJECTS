'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  Check,
  Clock,
  GraduationCap,
  Loader2,
  Play,
} from 'lucide-react';
import type {
  ExamCatalogEntry,
  ExamPresetMode,
  ExamSessionConfig,
  JLPTExam,
  JLPTLevel,
} from '@/types/jlpt';
import { loadExamsByLevel } from '@/data/examCatalog';
import { getExamModularCatalog } from '@/lib/jlptTokens';
import { ExamLaunchModal } from '@/components/exam/ExamLaunchModal';
import type { ExamAttemptBadgeSummary } from '@/components/exam/ExamMixerModal';

interface ExamCatalogProps {
  catalog: ExamCatalogEntry[];
  attemptSummaries?: Record<string, ExamAttemptBadgeSummary>;
  selectedMode?: 'FULL_MOCK' | 'SECTION_PRACTICE';
  onModeChange?: (mode: 'FULL_MOCK' | 'SECTION_PRACTICE') => void;
  onStartExam: (
    exam: JLPTExam,
    mode: 'FULL_MOCK' | 'SECTION_PRACTICE',
    section?: 'moji_go' | 'bunpou_dokkai' | 'choukai',
    sessionConfig?: ExamSessionConfig
  ) => void;
}

const ORDERED_LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

function createQuickSectionConfig(
  exam: JLPTExam,
  section: 'moji_go' | 'bunpou_dokkai' | 'choukai'
): ExamSessionConfig {
  const hasCombinedStage = Boolean(
    exam.stages?.some((s) => s.id === 'stage-combined-written')
  );

  if (hasCombinedStage && section !== 'choukai') {
    const catalog = getExamModularCatalog(exam);
    const targetDomains =
      section === 'moji_go' ? new Set(['vocab']) : new Set(['grammar', 'reading']);
    return {
      presetMode: 'MODULAR_SELECTION',
      timerMultiplier: 1,
      audioControlMode: 'segmented_free',
      furiganaPolicy: 'official_booklet',
      showStarOrderingHelper: true,
      correctionTiming: 'end_only',
      theme: 'paper_booklet',
      showOmrSheet: true,
      enableBookletCoverGate: true,
      selectedModules: catalog.filter((m) => targetDomains.has(m.domain)).map((m) => m.id),
    };
  }

  const stageId =
    section === 'moji_go'
      ? 'stage-vocab'
      : section === 'bunpou_dokkai'
      ? 'stage-grammar-reading'
      : 'stage-listening';

  return {
    presetMode: 'CUSTOM_CONDITIONS',
    timerMultiplier: 1,
    audioControlMode: 'segmented_free',
    furiganaPolicy: 'official_booklet',
    showStarOrderingHelper: true,
    correctionTiming: 'end_only',
    theme: 'paper_booklet',
    showOmrSheet: true,
    enableBookletCoverGate: true,
    selectedStages: [stageId],
  };
}

export function ExamCatalog({
  catalog,
  attemptSummaries = {},
  onStartExam,
}: ExamCatalogProps) {
  const [configuringExams, setConfiguringExams] = useState<JLPTExam[] | null>(null);
  const [configuringSubjectChoice, setConfiguringSubjectChoice] = useState<string>('');
  const [launchPreset, setLaunchPreset] = useState<ExamPresetMode>('OFFICIAL_STRICT');
  const [modalSeq, setModalSeq] = useState(0);

  const [loadingActionKey, setLoadingActionKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const levelGroups = useMemo(() => {
    return ORDERED_LEVELS.map((level) => {
      const entries = catalog
        .filter((e) => e.level === level)
        .sort((a, b) => a.examNumber - b.examNumber);
      return { level, entries };
    }).filter((g) => g.entries.length > 0);
  }, [catalog]);

  const handleOpenLevelModal = async (
    level: JLPTLevel,
    entries: ExamCatalogEntry[],
    initialPreset: ExamPresetMode = 'OFFICIAL_STRICT'
  ) => {
    setLoadError(null);
    setLoadingActionKey(`${level}:${initialPreset}`);
    try {
      const loadedExams = await loadExamsByLevel(level);
      if (loadedExams.length === 0) {
        setLoadError(`Impossible de charger les cahiers du niveau ${level}.`);
        return;
      }
      setConfiguringExams(loadedExams);
      setConfiguringSubjectChoice(entries[0].id);
      setLaunchPreset(initialPreset);
      setModalSeq((n) => n + 1);
    } catch (err) {
      console.error(err);
      setLoadError('Erreur lors du chargement des cahiers d’examen.');
    } finally {
      setLoadingActionKey(null);
    }
  };

  const handleQuickSection = async (
    level: JLPTLevel,
    section: 'moji_go' | 'bunpou_dokkai' | 'choukai'
  ) => {
    setLoadError(null);
    setLoadingActionKey(`${level}:${section}`);
    try {
      const loadedExams = await loadExamsByLevel(level);
      if (loadedExams.length === 0) {
        setLoadError('Impossible de charger ce module.');
        return;
      }
      const targetExam = loadedExams[0];
      const isOfficialBooklet = Boolean(targetExam.stages && targetExam.stages.length > 0);
      onStartExam(
        targetExam,
        'SECTION_PRACTICE',
        section,
        isOfficialBooklet ? createQuickSectionConfig(targetExam, section) : undefined
      );
    } catch (err) {
      console.error(err);
      setLoadError('Erreur lors du chargement du module.');
    } finally {
      setLoadingActionKey(null);
    }
  };

  const handleLaunchConfigured = (exam: JLPTExam, config: ExamSessionConfig) => {
    const totalExamStages = exam.stages?.length ?? 3;
    const isFull =
      config.presetMode === 'OFFICIAL_STRICT' ||
      (config.presetMode === 'CUSTOM_CONDITIONS' &&
        (config.selectedStages?.length ?? totalExamStages) >= totalExamStages);
    const singleStage =
      config.presetMode === 'CUSTOM_CONDITIONS' && config.selectedStages?.length === 1
        ? config.selectedStages[0]
        : undefined;
    const mappedSection =
      singleStage === 'stage-vocab'
        ? 'moji_go'
        : singleStage === 'stage-grammar-reading'
        ? 'bunpou_dokkai'
        : singleStage === 'stage-listening'
        ? 'choukai'
        : undefined;

    setConfiguringExams(null);
    onStartExam(exam, isFull ? 'FULL_MOCK' : 'SECTION_PRACTICE', mappedSection, config);
  };

  const primaryConfiguringExam = useMemo(() => {
    if (!configuringExams || configuringExams.length === 0) return null;
    return (
      configuringExams.find((e) => e.id === configuringSubjectChoice) ?? configuringExams[0]
    );
  }, [configuringExams, configuringSubjectChoice]);

  return (
    <div className="exam-catalog">
      <div className="exam-catalog__header">
        <div>
          <h2 className="exam-catalog__title">
            <GraduationCap className="exam-catalog__title-icon" aria-hidden="true" />
            Choisissez votre Epreuve &amp; Niveau
          </h2>
          <p className="exam-catalog__subtitle">
            Lancez une simulation configurée (choix du sujet #1, #2 ou Mixte et des 3 modes) ou un
            entraînement rapide par section
          </p>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-2.5 text-xs font-medium text-rose-200"
        >
          {loadError}
        </div>
      )}

      <div className="exam-catalog__grid">
        {levelGroups.map(({ level, entries }) => {
          const primaryEntry = entries[0];
          const isOfficialBooklet = primaryEntry.stageCount > 0;
          const isLoadingStrict = loadingActionKey === `${level}:OFFICIAL_STRICT`;

          // Aggregate best attempt across all exams of this level if any
          const levelStats = entries
            .map((e) => attemptSummaries[e.id])
            .filter((s): s is ExamAttemptBadgeSummary => Boolean(s));
          const totalLevelAttempts = levelStats.reduce((sum, s) => sum + s.attempts, 0);
          const bestLevelScore =
            levelStats.length > 0 ? Math.max(...levelStats.map((s) => s.bestScore)) : 0;
          const anyLevelPassed = levelStats.some((s) => s.passed);

          return (
            <div key={level} className="exam-card">
              <div className="exam-card__body">
                <div className="exam-card__top">
                  <span className="exam-card__level">{level}</span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isOfficialBooklet && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        <BookOpenCheck className="w-3 h-3" aria-hidden="true" />
                        Cahier Officiel · {primaryEntry.questionCount} Q
                      </span>
                    )}
                    <div className="exam-card__duration">
                      <Clock className="exam-card__clock-icon" aria-hidden="true" />
                      <span>{primaryEntry.totalTimeMinutes} min</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="exam-card__title">JLPT {level}</h3>
                    {totalLevelAttempts > 0 && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          anyLevelPassed
                            ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                            : 'border-amber-500/40 bg-amber-950/50 text-amber-300'
                        }`}
                      >
                        {anyLevelPassed && <Check className="w-3 h-3" aria-hidden="true" />}
                        {bestLevelScore}/180 · {totalLevelAttempts}×
                      </span>
                    )}
                  </div>
                  <p className="exam-card__description">{primaryEntry.description}</p>
                </div>

                <div className="exam-card__sections">
                  {primaryEntry.sections.map((sec) => (
                    <span key={sec.type} className="exam-card__section-pill">
                      {sec.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="exam-card__actions">
                <button
                  type="button"
                  disabled={loadingActionKey !== null}
                  aria-busy={isLoadingStrict}
                  onClick={() =>
                    void handleOpenLevelModal(level, entries, 'OFFICIAL_STRICT')
                  }
                  className="exam-card__start-btn disabled:opacity-60"
                >
                  {isLoadingStrict ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Play className="exam-card__play-icon" aria-hidden="true" />
                  )}
                  {isOfficialBooklet
                    ? `Configurer & Simuler (${level} · 3 Modes)`
                    : `Lancer la Simulation (${level})`}
                </button>

                <div className="exam-card__module-grid">
                  <button
                    type="button"
                    disabled={loadingActionKey !== null}
                    onClick={() => void handleQuickSection(level, 'moji_go')}
                    className="exam-card__module-btn disabled:opacity-60"
                    title="Vocabulaire (文字・語彙)"
                  >
                    Vocab
                  </button>
                  <button
                    type="button"
                    disabled={loadingActionKey !== null}
                    onClick={() => void handleQuickSection(level, 'bunpou_dokkai')}
                    className="exam-card__module-btn disabled:opacity-60"
                    title="Grammaire / Lecture (文法・読解)"
                  >
                    Gramm.
                  </button>
                  <button
                    type="button"
                    disabled={loadingActionKey !== null}
                    onClick={() => void handleQuickSection(level, 'choukai')}
                    className="exam-card__module-btn disabled:opacity-60"
                    title="Écoute (聴解)"
                  >
                    Écoute
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ExamLaunchModal
        key={`${primaryConfiguringExam?.level ?? 'closed'}-${configuringSubjectChoice}-${launchPreset}-${modalSeq}`}
        exam={primaryConfiguringExam}
        sourceExams={configuringExams ?? undefined}
        initialSubjectChoice={configuringSubjectChoice}
        attemptSummaries={attemptSummaries}
        isOpen={Boolean(configuringExams && configuringExams.length > 0)}
        initialPresetMode={launchPreset}
        onClose={() => setConfiguringExams(null)}
        onLaunch={handleLaunchConfigured}
      />
    </div>
  );
}
