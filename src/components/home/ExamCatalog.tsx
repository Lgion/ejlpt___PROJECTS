'use client';

import React, { useState } from 'react';
import { GraduationCap, Play, Clock, SlidersHorizontal, BookOpenCheck } from 'lucide-react';
import type { ExamPresetMode, ExamSessionConfig, JLPTExam } from '@/types/jlpt';
import { ExamLaunchModal } from '@/components/exam/ExamLaunchModal';

interface ExamCatalogProps {
  exams: JLPTExam[];
  selectedMode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  onModeChange: (mode: 'FULL_MOCK' | 'SECTION_PRACTICE') => void;
  onStartExam: (
    exam: JLPTExam,
    mode: 'FULL_MOCK' | 'SECTION_PRACTICE',
    section?: 'moji_go' | 'bunpou_dokkai' | 'choukai',
    sessionConfig?: ExamSessionConfig
  ) => void;
}

function createQuickSectionConfig(
  section: 'moji_go' | 'bunpou_dokkai' | 'choukai'
): ExamSessionConfig {
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
  exams,
  selectedMode,
  onModeChange,
  onStartExam,
}: ExamCatalogProps) {
  const [configuringExam, setConfiguringExam] = useState<JLPTExam | null>(null);
  const [launchPreset, setLaunchPreset] = useState<ExamPresetMode>('OFFICIAL_STRICT');
  const [modalSeq, setModalSeq] = useState(0);

  const openConfigModal = (exam: JLPTExam, initialPreset: ExamPresetMode) => {
    setLaunchPreset(initialPreset);
    setModalSeq((n) => n + 1);
    setConfiguringExam(exam);
  };

  const handleLaunchConfigured = (exam: JLPTExam, config: ExamSessionConfig) => {
    const isFull =
      config.presetMode === 'OFFICIAL_STRICT' ||
      (config.presetMode === 'CUSTOM_CONDITIONS' && (config.selectedStages?.length ?? 3) >= 3);
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

    setConfiguringExam(null);
    onStartExam(exam, isFull ? 'FULL_MOCK' : 'SECTION_PRACTICE', mappedSection, config);
  };

  return (
    <div className="exam-catalog">
      <div className="exam-catalog__header">
        <div>
          <h2 className="exam-catalog__title">
            <GraduationCap className="exam-catalog__title-icon" />
            Choisissez votre Epreuve &amp; Niveau
          </h2>
          <p className="exam-catalog__subtitle">
            Sélectionnez le mode d&apos;examen qui correspond à vos objectifs de révision
          </p>
        </div>

        <div className="exam-catalog__mode-tabs">
          <button
            type="button"
            onClick={() => onModeChange('FULL_MOCK')}
            className={`exam-catalog__mode-btn ${
              selectedMode === 'FULL_MOCK' ? 'exam-catalog__mode-btn--active' : ''
            }`}
          >
            Examen Blanc Complet
          </button>
          <button
            type="button"
            onClick={() => onModeChange('SECTION_PRACTICE')}
            className={`exam-catalog__mode-btn ${
              selectedMode === 'SECTION_PRACTICE' ? 'exam-catalog__mode-btn--active' : ''
            }`}
          >
            Entraînement Modulaire
          </button>
        </div>
      </div>

      <div className="exam-catalog__grid">
        {exams.map((exam) => {
          const isOfficialBooklet = Boolean(exam.stages && exam.stages.length > 0);

          return (
            <div key={exam.id} className="exam-card">
              <div className="exam-card__body">
                <div className="exam-card__top">
                  <span className="exam-card__level">{exam.level}</span>
                  <div className="flex items-center gap-2">
                    {isOfficialBooklet && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                        <BookOpenCheck className="w-3 h-3" />
                        Cahier Officiel · {exam.questions.length} Q
                      </span>
                    )}
                    <div className="exam-card__duration">
                      <Clock className="exam-card__clock-icon" />
                      <span>{exam.totalTimeMinutes} min</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="exam-card__title">{exam.title}</h3>
                  <p className="exam-card__description">{exam.description}</p>
                </div>

                <div className="exam-card__sections">
                  {exam.sections.map((sec) => (
                    <span key={sec.type} className="exam-card__section-pill">
                      {sec.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="exam-card__actions">
                {selectedMode === 'FULL_MOCK' ? (
                  <button
                    type="button"
                    onClick={() =>
                      isOfficialBooklet
                        ? openConfigModal(exam, 'OFFICIAL_STRICT')
                        : onStartExam(exam, 'FULL_MOCK')
                    }
                    className="exam-card__start-btn"
                  >
                    <Play className="exam-card__play-icon" />
                    {isOfficialBooklet
                      ? `Configurer & Simuler (${exam.level} · 3 Modes)`
                      : `Lancer la Simulation (${exam.level})`}
                  </button>
                ) : (
                  <>
                    {isOfficialBooklet && (
                      <button
                        type="button"
                        onClick={() => openConfigModal(exam, 'MODULAR_SELECTION')}
                        className="exam-card__start-btn mb-1"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Choisir des épreuves sur mesure (問題)
                      </button>
                    )}
                    <div className="exam-card__module-grid">
                      <button
                        type="button"
                        onClick={() =>
                          onStartExam(
                            exam,
                            'SECTION_PRACTICE',
                            'moji_go',
                            isOfficialBooklet ? createQuickSectionConfig('moji_go') : undefined
                          )
                        }
                        className="exam-card__module-btn"
                        title="Vocabulaire (文字・語彙)"
                      >
                        Vocab
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onStartExam(
                            exam,
                            'SECTION_PRACTICE',
                            'bunpou_dokkai',
                            isOfficialBooklet
                              ? createQuickSectionConfig('bunpou_dokkai')
                              : undefined
                          )
                        }
                        className="exam-card__module-btn"
                        title="Grammaire / Lecture (文法・読解)"
                      >
                        Gramm.
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onStartExam(
                            exam,
                            'SECTION_PRACTICE',
                            'choukai',
                            isOfficialBooklet ? createQuickSectionConfig('choukai') : undefined
                          )
                        }
                        className="exam-card__module-btn"
                        title="Écoute (聴解)"
                      >
                        Écoute
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ExamLaunchModal
        key={`${configuringExam?.id ?? 'closed'}-${launchPreset}-${modalSeq}`}
        exam={configuringExam}
        isOpen={Boolean(configuringExam)}
        initialPresetMode={launchPreset}
        onClose={() => setConfiguringExam(null)}
        onLaunch={handleLaunchConfigured}
      />
    </div>
  );
}
