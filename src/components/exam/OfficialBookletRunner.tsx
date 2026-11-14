'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckSquare,
  Clock,
  Moon,
  Send,
  Sun,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { ExamResult, ExamSessionConfig, JLPTExam } from '@/types/jlpt';
import { buildSimulatorStages } from '@/lib/jlptTokens';
import { computeExamResult } from '@/lib/examScoring';
import { localDb } from '@/lib/db';
import { recordErrorToSRS } from '@/lib/srs';
import { enqueueSyncAction } from '@/lib/sync';
import { BookletCoverGate } from './BookletCoverGate';
import { ExamResultsView } from './ExamResultsView';
import { ListeningExamStage } from './ListeningExamStage';
import { OmrAnswerSheet } from './OmrAnswerSheet';
import { PaperBookletRenderer } from './PaperBookletRenderer';

interface OfficialBookletRunnerProps {
  exam: JLPTExam;
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  sectionFilter?: 'moji_go' | 'bunpou_dokkai' | 'choukai';
  config: ExamSessionConfig;
  onExit: () => void;
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getPresetBadgeLabel(config: ExamSessionConfig): string {
  if (config.presetMode === 'OFFICIAL_STRICT') return 'Mode Strict Officiel';
  if (config.presetMode === 'CUSTOM_CONDITIONS') return 'Mode Paramétrable';
  return 'Mode Choix Modulaire';
}

export const OfficialBookletRunner: React.FC<OfficialBookletRunnerProps> = ({
  exam,
  mode,
  sectionFilter,
  config,
  onExit,
}) => {
  const { isSignedIn, user } = useUser();
  const activeStages = useMemo(() => buildSimulatorStages(exam, config), [exam, config]);

  const [stageIdx, setStageIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [isCoverGateOpen, setIsCoverGateOpen] = useState(config.enableBookletCoverGate);
  const [intermissionMessage, setIntermissionMessage] = useState<string | undefined>(undefined);
  const [activeTheme, setActiveTheme] = useState<'paper_booklet' | 'dark_ejlpt'>(config.theme);
  const [examineeName, setExamineeName] = useState(
    user?.fullName || user?.firstName || 'CANDIDAT EJLPT'
  );
  const [examineeNumber, setExamineeNumber] = useState('N3-018-204');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(
    activeStages[0]?.durationSeconds ?? 0
  );
  const [totalElapsedSeconds, setTotalElapsedSeconds] = useState(0);
  const [showMobileOmr, setShowMobileOmr] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [autoStartListening, setAutoStartListening] = useState(
    !config.enableBookletCoverGate &&
      Boolean(activeStages[0]?.isListening) &&
      config.audioControlMode === 'strict_stream'
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);

  const hasSubmittedRef = useRef(false);
  const confirmDialogRef = useRef<HTMLDialogElement | null>(null);

  const currentStage = activeStages[stageIdx];
  const currentQ = currentStage?.questions[currentQuestionIdx];

  const effectiveConfig = useMemo<ExamSessionConfig>(
    () => ({
      ...config,
      theme: activeTheme,
    }),
    [config, activeTheme]
  );

  // Sync native <dialog> for stage submission confirmation
  useEffect(() => {
    const dialog = confirmDialogRef.current;
    if (!dialog) return;
    if (confirmDialogOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.returnValue = '';
      dialog.close();
    }
  }, [confirmDialogOpen]);

  const handleSelectAnswer = useCallback(
    (questionId: string, optionId: string) => {
      if (isSubmitted || isCoverGateOpen) return;
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    },
    [isCoverGateOpen, isSubmitted]
  );

  const handleToggleFlag = useCallback((questionId: string) => {
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const finalizeWholeExam = useCallback(async () => {
    if (hasSubmittedRef.current || isSubmitted) return;
    hasSubmittedRef.current = true;
    setConfirmDialogOpen(false);
    setIsSaving(true);

    const evaluatedQuestions = activeStages.flatMap((s) => s.questions);
    const res = computeExamResult({
      level: exam.level,
      mode,
      questions: evaluatedQuestions,
      answers,
      timeSpentSeconds: totalElapsedSeconds,
      scoringScale: exam.scoringScale ?? 'RAW',
      presetMode: config.presetMode,
    });

    setResult(res);
    setIsSubmitted(true);

    if (res.passed) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    try {
      const attemptDoc = {
        attemptId: res.attemptId,
        level: res.level,
        mode: res.mode,
        sectionFilter,
        title: `${exam.title} (${getPresetBadgeLabel(config)})`,
        scoreTotal: res.scoreTotal,
        maxScoreTotal: res.maxScoreTotal,
        scoreMojiGo: res.scoreMojiGo,
        scoreBunpouDokkai: res.scoreBunpouDokkai,
        scoreChoukai: res.scoreChoukai,
        passed: res.passed,
        userAnswers: answers,
        timeSpentSeconds: res.timeSpentSeconds,
        createdAt: res.createdAt,
        isSynced: 0 as const,
      };
      await localDb.attempts.add(attemptDoc);

      for (const q of evaluatedQuestions) {
        if (answers[q.id] !== q.correctOptionId) {
          const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
          await recordErrorToSRS({
            cardId: `question:${exam.level}:${q.id}`,
            itemType: 'QUESTION',
            itemKey: q.id,
            level: exam.level,
            prompt: q.prompt,
            answer: correctOpt ? correctOpt.label : q.correctOptionId,
          });
        }
      }

      await enqueueSyncAction(
        'SAVE_ATTEMPT',
        { ...res, title: attemptDoc.title, sectionFilter, userAnswers: answers },
        Boolean(isSignedIn)
      );
    } catch (err) {
      console.error('Official simulator save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [
    activeStages,
    answers,
    config,
    exam.level,
    exam.scoringScale,
    exam.title,
    isSignedIn,
    isSubmitted,
    mode,
    sectionFilter,
    totalElapsedSeconds,
  ]);

  const advanceOrSubmitStage = useCallback(
    (wasAutoTimeout: boolean) => {
      setConfirmDialogOpen(false);
      if (stageIdx < activeStages.length - 1) {
        const nextIdx = stageIdx + 1;
        const nextStage = activeStages[nextIdx];
        const prevTitle = currentStage?.stageMeta.titleJp ?? 'Cahier précédent';
        const shouldGate =
          config.enableBookletCoverGate || config.presetMode === 'OFFICIAL_STRICT';

        setStageIdx(nextIdx);
        setCurrentQuestionIdx(0);
        setShowMobileOmr(false);
        setTimeRemainingSeconds(nextStage.durationSeconds);
        setIntermissionMessage(
          wasAutoTimeout
            ? `Temps écoulé (00:00) — ${prevTitle} collecté et verrouillé automatiquement.`
            : `${prevTitle} remis et verrouillé. Vous pouvez ouvrir le cahier suivant.`
        );
        setIsCoverGateOpen(shouldGate);
        setAutoStartListening(
          !shouldGate && nextStage.isListening && config.audioControlMode === 'strict_stream'
        );
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      void finalizeWholeExam();
    },
    [activeStages, config, currentStage, finalizeWholeExam, stageIdx]
  );

  const advanceRef = useRef(advanceOrSubmitStage);
  useEffect(() => {
    advanceRef.current = advanceOrSubmitStage;
  }, [advanceOrSubmitStage]);

  // Countdown + cumulative elapsed stopwatch (pauses while cover gate is closed)
  useEffect(() => {
    if (isSubmitted || isCoverGateOpen || !currentStage) return;
    const isTimed = currentStage.durationSeconds > 0;

    const timer = setInterval(() => {
      setTotalElapsedSeconds((t) => t + 1);
      if (isTimed) {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(() => {
              advanceRef.current(true);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStage, isCoverGateOpen, isSubmitted]);

  // Guarded numeric shortcuts (1..4 / 1..3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted || isCoverGateOpen || confirmDialogOpen || !currentQ) return;
      if (e.isComposing) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (['1', '2', '3', '4'].includes(e.key)) {
        if (currentQ.options.some((opt) => opt.id === e.key)) {
          handleSelectAnswer(currentQ.id, e.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialogOpen, currentQ, handleSelectAnswer, isCoverGateOpen, isSubmitted]);

  if (!currentStage || currentStage.questions.length === 0) {
    return (
      <div className="exam-empty">
        <div className="exam-empty__icon-wrap">
          <BookOpen className="exam-empty__icon" />
        </div>
        <h3 className="exam-empty__title">Aucun module actif</h3>
        <p className="exam-empty__description">
          Aucune question ne correspond à la configuration sélectionnée pour {exam.level}.
        </p>
        <button type="button" onClick={onExit} className="exam-empty__back-btn">
          Retour au catalogue
        </button>
      </div>
    );
  }

  if (isSubmitted && result) {
    const evaluatedQuestions = activeStages.flatMap((s) => s.questions);
    return (
      <div className="exam-runner">
        <ExamResultsView
          result={result}
          questions={evaluatedQuestions}
          answers={answers}
          isSignedIn={Boolean(isSignedIn)}
          formatTime={formatClock}
          onExit={onExit}
        />
      </div>
    );
  }

  const stageQuestions = currentStage.questions;
  const stageAnsweredCount = stageQuestions.filter((q) => Boolean(answers[q.id])).length;
  const isTimed = currentStage.durationSeconds > 0;
  const isUrgent = isTimed && timeRemainingSeconds > 0 && timeRemainingSeconds < 300;
  const isLastStage = stageIdx === activeStages.length - 1;
  const stageSubmitLabel = isLastStage
    ? 'Soumettre la feuille finale'
    : 'Remettre ce cahier et passer à la suite';

  const handleOpenBooklet = () => {
    setIsCoverGateOpen(false);
    setIntermissionMessage(undefined);
    if (currentStage.isListening && config.audioControlMode === 'strict_stream') {
      setAutoStartListening(true);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className={`jlpt-sim-shell ${
        activeTheme === 'paper_booklet' ? 'jlpt-theme-paper' : 'jlpt-theme-dark'
      }`}
    >
      {/* Top Simulator HUD */}
      <header className="jlpt-sim-hud">
        <div className="jlpt-sim-hud__left">
          <button type="button" onClick={onExit} className="jlpt-sim-hud__exit">
            <ArrowLeft className="w-4 h-4" />
            <span>Quitter</span>
          </button>

          <div className="jlpt-sim-hud__badges">
            <span className="jlpt-sim-hud__stage-pill" lang="ja">
              Cahier {stageIdx + 1}/{activeStages.length} · {currentStage.stageMeta.titleJp}
            </span>
            <span className="jlpt-sim-hud__mode-pill">{getPresetBadgeLabel(config)}</span>
          </div>
        </div>

        <div className="jlpt-sim-hud__right">
          <div className={`jlpt-sim-hud__timer ${isUrgent ? 'jlpt-sim-hud__timer--urgent' : ''}`}>
            <Clock className="w-4 h-4" />
            <span>{isTimed ? formatClock(timeRemainingSeconds) : 'Chrono libre'}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              setActiveTheme((prev) => (prev === 'paper_booklet' ? 'dark_ejlpt' : 'paper_booklet'))
            }
            className="jlpt-sim-hud__tool-btn"
            aria-label="Basculer entre thème Papier officiel et thème Sombre"
          >
            {activeTheme === 'paper_booklet' ? (
              <>
                <Moon className="w-3.5 h-3.5" /> Sombre
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5" /> Papier
              </>
            )}
          </button>

          {config.showOmrSheet && !isCoverGateOpen && (
            <button
              type="button"
              onClick={() => setShowMobileOmr((prev) => !prev)}
              className="jlpt-sim-hud__tool-btn jlpt-sim-hud__omr-toggle"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              OMR ({stageAnsweredCount}/{stageQuestions.length})
            </button>
          )}

          {!isCoverGateOpen && (
            <button
              type="button"
              onClick={() => setConfirmDialogOpen(true)}
              className="jlpt-sim-hud__finish-btn"
              disabled={isSaving}
            >
              <Send className="w-3.5 h-3.5 inline mr-1.5" />
              {isLastStage ? 'Terminer & Noter' : 'Remettre le cahier'}
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Cover Gate OR Split Booklet + OMR */}
      {isCoverGateOpen ? (
        <BookletCoverGate
          level={exam.level}
          stage={currentStage.stageMeta}
          totalStages={activeStages.length}
          effectiveMinutes={currentStage.effectiveMinutes}
          isStrictOfficial={config.presetMode === 'OFFICIAL_STRICT'}
          previousStageMessage={intermissionMessage}
          examineeName={examineeName}
          examineeNumber={examineeNumber}
          onUpdateExaminee={(name, num) => {
            setExamineeName(name);
            setExamineeNumber(num);
          }}
          onOpenBooklet={handleOpenBooklet}
          theme={activeTheme}
        />
      ) : (
        <div
          className={`jlpt-sim-workspace ${
            config.showOmrSheet ? 'jlpt-sim-workspace--with-omr' : ''
          }`}
        >
          <div>
            {currentStage.isListening ? (
              <ListeningExamStage
                key={currentStage.stageMeta.id}
                questions={stageQuestions}
                audioTracks={currentStage.audioTracks}
                currentIndex={currentQuestionIdx}
                answers={answers}
                flaggedIds={flaggedIds}
                config={effectiveConfig}
                autoStartSignal={autoStartListening}
                onSelectAnswer={handleSelectAnswer}
                onJumpToQuestion={setCurrentQuestionIdx}
                onToggleFlag={handleToggleFlag}
                onRequestSubmitStage={() => setConfirmDialogOpen(true)}
                stageSubmitLabel={stageSubmitLabel}
              />
            ) : (
              <PaperBookletRenderer
                key={currentStage.stageMeta.id}
                exam={exam}
                questions={stageQuestions}
                currentIndex={currentQuestionIdx}
                answers={answers}
                flaggedIds={flaggedIds}
                config={effectiveConfig}
                onSelectAnswer={handleSelectAnswer}
                onJumpToQuestion={setCurrentQuestionIdx}
                onToggleFlag={handleToggleFlag}
                onRequestSubmitStage={() => setConfirmDialogOpen(true)}
                stageSubmitLabel={stageSubmitLabel}
              />
            )}
          </div>

          {config.showOmrSheet && (
            <aside className={`jlpt-sim-omr-col ${showMobileOmr ? 'is-open-mobile' : ''}`}>
              <OmrAnswerSheet
                level={exam.level}
                stageTitleJp={currentStage.stageMeta.titleJp}
                questions={stageQuestions}
                currentIndex={currentQuestionIdx}
                answers={answers}
                flaggedIds={flaggedIds}
                examineeName={examineeName}
                examineeNumber={examineeNumber}
                onSelectAnswer={handleSelectAnswer}
                onJumpToQuestion={setCurrentQuestionIdx}
                onToggleFlag={handleToggleFlag}
                includeListeningExampleRows={currentStage.isListening}
              />
            </aside>
          )}
        </div>
      )}

      {/* Native top-layer confirmation dialog */}
      <dialog
        ref={confirmDialogRef}
        className="jlpt-confirm-dialog"
        aria-labelledby="stage-confirm-title"
        onCancel={(e) => {
          e.preventDefault();
          setConfirmDialogOpen(false);
        }}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <div className="jlpt-confirm-dialog__body">
          <h3 id="stage-confirm-title" className="jlpt-confirm-dialog__title">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            {isLastStage ? 'Confirmer la remise finale' : 'Remettre ce cahier ?'}
          </h3>
          <p className="jlpt-confirm-dialog__text">
            Vous avez noirci{' '}
            <strong>
              {stageAnsweredCount} / {stageQuestions.length}
            </strong>{' '}
            bulles OMR dans ce cahier (<em>{currentStage.stageMeta.titleFr}</em>).
          </p>
          {!isLastStage && (
            <div className="jlpt-confirm-dialog__warn">
              Attention : comme lors du véritable JLPT, ce cahier sera verrouillé et vous ne
              pourrez plus y revenir après avoir ouvert l’épreuve suivante.
            </div>
          )}
          <div className="jlpt-confirm-dialog__actions">
            <button
              type="button"
              onClick={() => setConfirmDialogOpen(false)}
              className="jlpt-btn-cancel"
            >
              Continuer à relire
            </button>
            <button
              type="button"
              onClick={() => advanceOrSubmitStage(false)}
              disabled={isSaving}
              className="jlpt-btn-launch"
            >
              {isSaving ? 'Calcul...' : stageSubmitLabel}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
};

