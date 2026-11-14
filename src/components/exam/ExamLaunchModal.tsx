'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  Clock,
  Headphones,
  Layers,
  ShieldAlert,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type {
  ExamPresetMode,
  ExamSessionConfig,
  ExamStageId,
  JLPTExam,
  ModularSubSectionId,
} from '@/types/jlpt';
import { createDefaultSessionConfig, MODULAR_SUBSECTION_CATALOG } from '@/lib/jlptTokens';

interface ExamLaunchModalProps {
  exam: JLPTExam | null;
  isOpen: boolean;
  initialPresetMode?: ExamPresetMode;
  onClose: () => void;
  onLaunch: (exam: JLPTExam, config: ExamSessionConfig) => void;
}

export const ExamLaunchModal: React.FC<ExamLaunchModalProps> = ({
  exam,
  isOpen,
  initialPresetMode,
  onClose,
  onLaunch,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
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
  const [selectedStages, setSelectedStages] = useState<ExamStageId[]>([
    'stage-vocab',
    'stage-grammar-reading',
    'stage-listening',
  ]);
  const [selectedModules, setSelectedModules] = useState<ModularSubSectionId[]>([
    'vocab_m1',
    'grammar_m1',
    'reading_m4',
  ]);

  // Synchronize native top-layer <dialog> cleanly per Modern Web Guidance
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && exam) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.returnValue = '';
      dialog.close();
    }
  }, [isOpen, exam]);

  const modularSummary = useMemo(() => {
    const picked = MODULAR_SUBSECTION_CATALOG.filter((m) => selectedModules.includes(m.id));
    const questionCount = picked.reduce((sum, m) => sum + m.questionCount, 0);
    const baseMinutes = picked.reduce((sum, m) => sum + m.recommendedMinutes, 0);
    const effectiveMinutes =
      timerMultiplier === 0 ? 0 : Math.round(baseMinutes * timerMultiplier);
    return { picked, questionCount, baseMinutes, effectiveMinutes };
  }, [selectedModules, timerMultiplier]);

  if (!exam) {
    return <dialog ref={dialogRef} className="jlpt-launch-dialog" onClose={onClose} />;
  }

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
    const domainIds = MODULAR_SUBSECTION_CATALOG.filter((m) => m.domain === domain).map(
      (m) => m.id
    );
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
      onLaunch(exam, createDefaultSessionConfig('OFFICIAL_STRICT'));
      return;
    }

    if (presetMode === 'CUSTOM_CONDITIONS') {
      onLaunch(exam, {
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

    onLaunch(exam, {
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
            <span className="jlpt-launch-dialog__level-pill">{exam.level} Officiel 2018</span>
            <h2 id="launch-modal-title" className="jlpt-launch-dialog__title">
              {exam.title}
            </h2>
            <p className="jlpt-launch-dialog__subtitle">
              Choisissez votre mode de simulation avant d’ouvrir le cahier d’examen.
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
                Cahiers scellés (30m → Pause → 70m → Pause → 40m), audio continu verrouillé,
                furigana stricts du livret, OMR &amp; score /180.
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
                Composez votre séance à la carte en cochant n’importe quelle combinaison d’épreuves
                et de 問題.
              </p>
            </div>
          </label>
        </fieldset>

        {/* Detailed Panel per Mode */}
        <div className="jlpt-launch-dialog__body">
          {presetMode === 'OFFICIAL_STRICT' && (
            <div className="jlpt-strict-summary">
              <h3>Règles appliquées automatiquement</h3>
              <ul>
                <li>
                  <strong>3 épreuves séquentielles irréversibles :</strong> 言語知識（文字・語彙）
                  30 min (35 Q) → 言語知識（文法）・読解 70 min (39 Q) → 聴解 ~44 min (28 Q).
                </li>
                <li>
                  <strong>Présentation Cahier Papier (Mincho) :</strong> fond crème `#FAF8F5`,
                  filets noirs, feuille OMR à bulles avec rangées 3 choix sur 問題4–5 d’écoute.
                </li>
                <li>
                  <strong>Aucune aide pendant l’épreuve :</strong> furigana stricts du livret
                  officiel, bande sonore continue sans pause ni retour arrière ni script.
                </li>
                <li>
                  <strong>Notation officielle JLPT N3 (/180) :</strong> Langue /60 (Vocab+Grammaire),
                  Lecture /60, Écoute /60. Réussite si ≥ 19/60 par domaine et ≥ 95/180 au total.
                </li>
              </ul>
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
                  {[
                    { id: 'stage-vocab' as const, label: '1. 文字・語彙 (30m · 35 Q)' },
                    { id: 'stage-grammar-reading' as const, label: '2. 文法・読解 (70m · 39 Q)' },
                    { id: 'stage-listening' as const, label: '3. 聴解 (44m · 28 Q)' },
                  ].map((st) => (
                    <label key={st.id}>
                      <input
                        type="checkbox"
                        checked={selectedStages.includes(st.id)}
                        onChange={() => toggleStage(st.id)}
                      />
                      {st.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {presetMode === 'MODULAR_SELECTION' && (
            <div className="jlpt-modular-panel">
              <div className="jlpt-modular-panel__quickbar">
                <button type="button" onClick={() => selectDomainModules('vocab')}>
                  Tout 文字・語彙 (35 Q)
                </button>
                <button type="button" onClick={() => selectDomainModules('grammar')}>
                  Tout 文法 (23 Q)
                </button>
                <button type="button" onClick={() => selectDomainModules('reading')}>
                  Tout 読解 (16 Q)
                </button>
                <button type="button" onClick={() => selectDomainModules('listening')}>
                  Tout 聴解 (28 Q)
                </button>
              </div>

              <div className="jlpt-modular-grid">
                {(['vocab', 'grammar', 'reading', 'listening'] as const).map((domain) => {
                  const domainLabel =
                    domain === 'vocab'
                      ? '文字・語彙 (Vocabulaire)'
                      : domain === 'grammar'
                      ? '文法 (Grammaire)'
                      : domain === 'reading'
                      ? '読解 (Lecture)'
                      : '聴解 (Compréhension orale)';
                  const items = MODULAR_SUBSECTION_CATALOG.filter((m) => m.domain === domain);
                  return (
                    <div key={domain} className="jlpt-modular-domain">
                      <h4>{domainLabel}</h4>
                      <div className="jlpt-modular-list">
                        {items.map((item) => (
                          <label key={item.id} className="jlpt-modular-item">
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
                        ))}
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
              <span>Simulation complète : 102 questions · 140 min officielles</span>
            ) : presetMode === 'CUSTOM_CONDITIONS' ? (
              <span>
                Épreuves : {selectedStages.length}/3 · Chrono{' '}
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
            <button
              type="submit"
              disabled={isModularEmpty}
              className="jlpt-btn-launch"
            >
              Démarrer la session
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
};
