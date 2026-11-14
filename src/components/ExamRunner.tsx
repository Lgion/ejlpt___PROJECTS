'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { ExamSessionConfig, JLPTExam, JLPTQuestion, ExamResult } from '@/types/jlpt';
import { createDefaultSessionConfig } from '@/lib/jlptTokens';
import { ChoukaiAudioPlayer } from './custom-components/ChoukaiAudioPlayer';
import { EzoeGrammarViewer } from './custom-components/EzoeGrammarViewer';
import { FuriganaText } from './custom-components/FuriganaText';
import { ExamResultsView } from './exam/ExamResultsView';
import { ExamQuestionPalette } from './exam/ExamQuestionPalette';
import { OfficialBookletRunner } from './exam/OfficialBookletRunner';
import { localDb } from '@/lib/db';
import { computeExamResult } from '@/lib/examScoring';
import { enqueueSyncAction } from '@/lib/sync';
import { recordErrorToSRS } from '@/lib/srs';
import {
  Clock,
  Flag,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Send,
  Check,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamRunnerProps {
  exam: JLPTExam;
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  sectionFilter?: 'moji_go' | 'bunpou_dokkai' | 'choukai';
  sessionConfig?: ExamSessionConfig;
  onExit: () => void;
}

function resolveDefaultConfig(
  sectionFilter?: 'moji_go' | 'bunpou_dokkai' | 'choukai'
): ExamSessionConfig {
  if (!sectionFilter) return createDefaultSessionConfig('OFFICIAL_STRICT');

  const stageId =
    sectionFilter === 'moji_go'
      ? 'stage-vocab'
      : sectionFilter === 'bunpou_dokkai'
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

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  exam,
  mode,
  sectionFilter,
  sessionConfig,
  onExit,
}) => {
  if (exam.stages && exam.stages.length > 0) {
    const resolvedConfig = sessionConfig ?? resolveDefaultConfig(sectionFilter);
    return (
      <OfficialBookletRunner
        exam={exam}
        mode={mode}
        sectionFilter={sectionFilter}
        config={resolvedConfig}
        onExit={onExit}
      />
    );
  }

  return (
    <LegacyExamRunner
      exam={exam}
      mode={mode}
      sectionFilter={sectionFilter}
      onExit={onExit}
    />
  );
};

const LegacyExamRunner: React.FC<Omit<ExamRunnerProps, 'sessionConfig'>> = ({
  exam,
  mode,
  sectionFilter,
  onExit,
}) => {
  const { isSignedIn } = useUser();

  const questions: JLPTQuestion[] = sectionFilter
    ? exam.questions.filter((q) => q.section === sectionFilter)
    : exam.questions;

  const sectionMinutes = sectionFilter
    ? exam.sections.find((s) => s.type === sectionFilter)?.timeMinutes ?? 30
    : exam.totalTimeMinutes;
  const totalDurationSeconds = sectionMinutes * 60;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(totalDurationSeconds);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasSubmittedRef = useRef(false);

  const currentQuestion = questions[currentIndex] || questions[0];

  const handleSelectOption = useCallback(
    (questionId: string, optionId: string) => {
      if (isSubmitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    },
    [isSubmitted]
  );

  const calculateAndFinish = useCallback(async () => {
    if (hasSubmittedRef.current || isSubmitted || questions.length === 0) return;
    hasSubmittedRef.current = true;
    setIsSaving(true);

    const timeSpent = Math.max(0, totalDurationSeconds - timeRemainingSeconds);
    const res = computeExamResult({
      level: exam.level,
      mode,
      questions,
      answers,
      timeSpentSeconds: timeSpent,
      scoringScale: exam.scoringScale ?? 'RAW',
    });

    setResult(res);
    setIsSubmitted(true);
    setShowConfirmModal(false);

    if (res.passed) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    try {
      const attemptDoc = {
        attemptId: res.attemptId,
        level: res.level,
        mode: res.mode,
        sectionFilter,
        title: exam.title,
        scoreTotal: res.scoreTotal,
        maxScoreTotal: res.maxScoreTotal,
        scoreMojiGo: res.scoreMojiGo,
        scoreBunpouDokkai: res.scoreBunpouDokkai,
        scoreChoukai: res.scoreChoukai,
        passed: res.passed,
        userAnswers: answers,
        timeSpentSeconds: timeSpent,
        createdAt: res.createdAt,
        isSynced: 0 as const,
      };
      await localDb.attempts.add(attemptDoc);

      for (const q of questions) {
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
        { ...res, title: exam.title, sectionFilter, userAnswers: answers },
        Boolean(isSignedIn)
      );
    } catch (err) {
      console.error('LocalDb save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [
    answers,
    exam.level,
    exam.scoringScale,
    exam.title,
    isSignedIn,
    isSubmitted,
    mode,
    questions,
    sectionFilter,
    timeRemainingSeconds,
    totalDurationSeconds,
  ]);

  const calculateRef = useRef(calculateAndFinish);
  useEffect(() => {
    calculateRef.current = calculateAndFinish;
  }, [calculateAndFinish]);

  useEffect(() => {
    if (isSubmitted || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            void calculateRef.current();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, questions.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted || showConfirmModal || !currentQuestion) return;
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
        if (currentQuestion.options.some((o) => o.id === e.key)) {
          handleSelectOption(currentQuestion.id, e.key);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQuestion, handleSelectOption, isSubmitted, showConfirmModal]);

  if (!questions || questions.length === 0) {
    return (
      <div className="exam-empty">
        <div className="exam-empty__icon-wrap">
          <BookOpen className="exam-empty__icon" />
        </div>
        <h3 className="exam-empty__title">Section en cours de préparation</h3>
        <p className="exam-empty__description">
          Aucune question n&apos;est actuellement répertoriée pour la section{' '}
          <strong className="exam-empty__highlight">{sectionFilter}</strong> du niveau{' '}
          <strong className="exam-empty__highlight">{exam.level}</strong>.
        </p>
        <button type="button" onClick={onExit} className="exam-empty__back-btn">
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const toggleFlag = (questionId: string) => {
    setFlags((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const isTimeUrgent = timeRemainingSeconds < 300;

  return (
    <div className="exam-runner">
      <div className="exam-runner__topbar">
        <div className="exam-runner__identity">
          <button
            type="button"
            onClick={onExit}
            className="exam-runner__exit-btn"
            title="Quitter la simulation"
          >
            <ArrowLeft className="exam-runner__exit-icon" />
          </button>
          <div>
            <span className="exam-runner__kicker">
              {exam.level} •{' '}
              {mode === 'FULL_MOCK'
                ? 'Examen Blanc Complet'
                : `Entraînement (${sectionFilter || 'Modulaire'})`}
            </span>
            <h2 className="exam-runner__title">{exam.title}</h2>
          </div>
        </div>

        <div className="exam-runner__controls">
          <div className="exam-runner__timer">
            <Clock
              className={`exam-runner__timer-icon ${
                isTimeUrgent ? 'exam-runner__timer-icon--urgent' : ''
              }`}
            />
            <span className={isTimeUrgent ? 'exam-runner__timer-text--urgent' : ''}>
              {formatTime(timeRemainingSeconds)}
            </span>
          </div>

          {!isSubmitted && (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="exam-runner__submit-btn"
            >
              <Send className="exam-runner__submit-icon" />
              <span>Terminer &amp; Valider</span>
            </button>
          )}
        </div>
      </div>

      {isSubmitted && result ? (
        <ExamResultsView
          result={result}
          questions={questions}
          answers={answers}
          isSignedIn={Boolean(isSignedIn)}
          formatTime={formatTime}
          onExit={onExit}
        />
      ) : (
        <div className="exam-runner__layout">
          <div className="exam-runner__question-card">
            <div className="exam-runner__question-header">
              <div className="exam-runner__question-meta">
                <span className="exam-runner__question-pill">
                  Question {currentIndex + 1} / {questions.length}
                </span>
                <span className="exam-runner__question-section">
                  Section : {currentQuestion.section.toUpperCase()} ({currentQuestion.subCategory})
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`exam-runner__flag-btn ${
                  flags[currentQuestion.id] ? 'exam-runner__flag-btn--active' : ''
                }`}
              >
                <Flag className="exam-runner__flag-icon" />
                {flags[currentQuestion.id] ? 'Marquée' : 'Marquer'}
              </button>
            </div>

            {currentQuestion.readingPassage && (
              <div className="exam-runner__reading-box">
                <h4 className="exam-runner__reading-title">Texte de Lecture (読解)</h4>
                {currentQuestion.readingPassage}
              </div>
            )}

            {currentQuestion.section === 'choukai' && (
              <ChoukaiAudioPlayer
                audioUrl={currentQuestion.audioUrl}
                audioScript={currentQuestion.audioScript}
                isFullMockMode={mode === 'FULL_MOCK'}
              />
            )}

            {currentQuestion.ezoeBreakdown && (
              <EzoeGrammarViewer segments={currentQuestion.ezoeBreakdown} />
            )}

            <div className="exam-runner__prompt">
              <FuriganaText text={currentQuestion.prompt} reading={currentQuestion.furiganaPrompt} />
            </div>

            <div className="exam-runner__options">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                    className={`exam-runner__option ${
                      isSelected ? 'exam-runner__option--selected' : ''
                    }`}
                  >
                    <span
                      className={`exam-runner__option-index ${
                        isSelected ? 'exam-runner__option-index--selected' : ''
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span className="exam-runner__option-label">
                      <FuriganaText text={opt.label} reading={opt.reading} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="exam-runner__nav-footer">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="exam-runner__prev-btn"
              >
                <ArrowLeft className="exam-runner__nav-icon" /> Question Précédente
              </button>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="exam-runner__next-btn"
              >
                Question Suivante <ArrowRight className="exam-runner__nav-icon" />
              </button>
            </div>
          </div>

          <ExamQuestionPalette
            questions={questions}
            answers={answers}
            flags={flags}
            currentIndex={currentIndex}
            answeredCount={answeredCount}
            onSelectIndex={setCurrentIndex}
          />
        </div>
      )}

      {showConfirmModal && (
        <div className="exam-confirm">
          <div className="exam-confirm__dialog">
            <h3 className="exam-confirm__title">
              <AlertTriangle className="exam-confirm__title-icon" />
              Confirmer la Soumission
            </h3>
            <p className="exam-confirm__message">
              Vous avez répondu à{' '}
              <strong className="exam-confirm__highlight">{answeredCount}</strong> questions sur{' '}
              <strong className="exam-confirm__highlight">{questions.length}</strong>. Souhaitez-vous
              vraiment finaliser l&apos;épreuve et obtenir votre relevé de note officiel JLPT ?
            </p>

            <div className="exam-confirm__actions">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="exam-confirm__cancel-btn"
              >
                Continuer l&apos;épreuve
              </button>
              <button
                type="button"
                onClick={() => void calculateAndFinish()}
                disabled={isSaving}
                className="exam-confirm__submit-btn"
              >
                {isSaving ? (
                  <RefreshCw className="exam-confirm__btn-icon--spin" />
                ) : (
                  <Check className="exam-confirm__btn-icon" />
                )}
                Oui, Corriger Maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
