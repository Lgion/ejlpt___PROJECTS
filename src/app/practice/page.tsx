'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb, type SRSCardRecord } from '@/lib/db';
import {
  generateDynamicQuiz,
  type DynamicQuizMode,
  type DynamicQuizQuestion,
} from '@/lib/quizGenerator';
import { gradeSRSCard, recordErrorToSRS, type SRSQuality } from '@/lib/srs';
import { SrsDashboardStrip } from '@/components/practice/SrsDashboardStrip';
import { SrsFlashcardReviewer } from '@/components/practice/SrsFlashcardReviewer';
import { QuizSetupPanel, type QuizModeOption } from '@/components/practice/QuizSetupPanel';
import { QuizSessionPlayer } from '@/components/practice/QuizSessionPlayer';
import { DrillsHub } from '@/components/practice/drills/DrillsHub';
import type { ExerciseDrillMode } from '@/lib/exerciseCollections';
import { Zap, RotateCcw, Sparkles, PenLine } from 'lucide-react';

const QUIZ_MODES: QuizModeOption[] = [
  {
    id: 'kanji_reading',
    label: 'Lectures Kanji (On/Kun)',
    description: 'Identifiez la lecture japonaise correspondant au sens donné.',
  },
  {
    id: 'grammar_cloze',
    label: 'Grammaire en contexte',
    description: 'Retrouvez le point de grammaire correspondant à son sens et sa formation.',
  },
  {
    id: 'synonyms_intruder',
    label: 'Intrus & Synonymes',
    description: 'Trouvez l’intrus sémantique parmi un groupe de kanji synonymes.',
  },
  {
    id: 'jukugo_compound',
    label: 'Mots Composés (Jukugo)',
    description: 'Associez les jukugo issus de kanji de niveau ciblé à leur lecture/sens.',
  },
  {
    id: 'srs_review',
    label: 'Révision SRS (Cartes dues)',
    description: 'QCM dynamique généré prioritairement depuis vos cartes SM-2 échues.',
  },
];

function PracticeContent() {
  const searchParams = useSearchParams();
  const initialModeParam = searchParams.get('mode') as DynamicQuizMode | null;
  const initialTabParam = searchParams.get('tab') === 'drills' ? 'drills' : 'quiz';
  const initialDrillParam = (searchParams.get('drill') || undefined) as ExerciseDrillMode | undefined;

  const [activeWorkspace, setActiveWorkspace] = useState<'quiz' | 'drills'>(initialTabParam);
  const [mode, setMode] = useState<DynamicQuizMode>(
    initialModeParam && QUIZ_MODES.some((m) => m.id === initialModeParam)
      ? initialModeParam
      : 'kanji_reading'
  );
  const [level, setLevel] = useState<string>('N3');
  const [count, setCount] = useState<number>(10);
  const [timedMode, setTimedMode] = useState<boolean>(false);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState<number>(20);

  const [questions, setQuestions] = useState<DynamicQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [sessionState, setSessionState] = useState<'setup' | 'playing' | 'finished'>('setup');
  const [timeLeft, setTimeLeft] = useState<number>(20);
  const [emptyWarning, setEmptyWarning] = useState<string | null>(null);
  const [gradedCurrentCard, setGradedCurrentCard] = useState<boolean>(false);

  const [flashcardActive, setFlashcardActive] = useState<boolean>(false);
  const [flashcardReveal, setFlashcardReveal] = useState<boolean>(false);
  const [flashcardIndex, setFlashcardIndex] = useState<number>(0);
  const [nowIso, setNowIso] = useState<string>(() => new Date().toISOString());

  useEffect(() => {
    const id = setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const allSrsCards = useLiveQuery(() => localDb.srsCards.toArray(), []);

  const srsStats = useMemo(() => {
    const cards = allSrsCards || [];
    const dueCards = cards
      .filter((c) => c.dueAt <= nowIso)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    const masteredCount = cards.filter((c) => c.repetitions >= 3 && c.intervalDays >= 6).length;
    const totalErrors = cards.reduce((acc, c) => acc + c.errorCount, 0);
    return {
      total: cards.length,
      dueCount: dueCards.length,
      dueCards,
      masteredCount,
      totalErrors,
    };
  }, [allSrsCards, nowIso]);

  const currentQuestion = questions[currentIndex] || null;

  useEffect(() => {
    if (sessionState !== 'playing' || !timedMode || selectedOptionId !== null) {
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionState, timedMode, selectedOptionId]);

  useEffect(() => {
    if (
      sessionState === 'playing' &&
      timedMode &&
      timeLeft === 0 &&
      selectedOptionId === null &&
      currentQuestion
    ) {
      queueMicrotask(() => {
        setSelectedOptionId('__TIMEOUT__');
        const correctOpt = currentQuestion.options.find(
          (o) => o.id === currentQuestion.correctOptionId
        );
        void recordErrorToSRS({
          cardId: currentQuestion.srsCardId,
          itemType: currentQuestion.itemType,
          itemKey: currentQuestion.itemKey,
          level: currentQuestion.level,
          prompt: currentQuestion.prompt,
          reading: currentQuestion.reading,
          answer: correctOpt?.text || currentQuestion.explanation,
        });
      });
    }
  }, [sessionState, timedMode, timeLeft, selectedOptionId, currentQuestion]);

  const handleStartQuiz = async () => {
    setIsGenerating(true);
    setEmptyWarning(null);
    try {
      const generated = await generateDynamicQuiz({ mode, level, count });
      if (generated.length === 0) {
        setEmptyWarning(
          mode === 'srs_review'
            ? 'Aucune carte SRS due ou disponible pour générer une révision. Passez un examen ou un autre quiz pour enregistrer des erreurs !'
            : `Pas assez de données hors-ligne pour le mode "${mode}" au niveau ${level}. Essayez "ALL" ou un autre mode.`
        );
        return;
      }
      setQuestions(generated);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setScore(0);
      setGradedCurrentCard(false);
      setTimeLeft(secondsPerQuestion);
      setSessionState('playing');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = async (optionId: string) => {
    if (selectedOptionId !== null || !currentQuestion) return;
    setSelectedOptionId(optionId);
    const isCorrect = optionId === currentQuestion.correctOptionId;
    const correctOpt = currentQuestion.options.find(
      (o) => o.id === currentQuestion.correctOptionId
    );

    if (isCorrect) {
      setScore((s) => s + 1);
      const existing = await localDb.srsCards.get(currentQuestion.srsCardId);
      if (existing) {
        await gradeSRSCard(currentQuestion.srsCardId, 3);
      }
    } else {
      await recordErrorToSRS({
        cardId: currentQuestion.srsCardId,
        itemType: currentQuestion.itemType,
        itemKey: currentQuestion.itemKey,
        level: currentQuestion.level,
        prompt: currentQuestion.prompt,
        reading: currentQuestion.reading,
        answer: correctOpt?.text || currentQuestion.explanation,
      });
    }
  };

  const handleManualSRSGrade = async (quality: SRSQuality) => {
    if (!currentQuestion) return;
    const correctOpt = currentQuestion.options.find(
      (o) => o.id === currentQuestion.correctOptionId
    );
    const existing = await localDb.srsCards.get(currentQuestion.srsCardId);
    if (!existing) {
      await localDb.srsCards.put({
        cardId: currentQuestion.srsCardId,
        itemType: currentQuestion.itemType,
        itemKey: currentQuestion.itemKey,
        level: currentQuestion.level,
        prompt: currentQuestion.prompt,
        reading: currentQuestion.reading,
        answer: correctOpt?.text || currentQuestion.explanation,
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        lapses: 0,
        errorCount: 0,
        dueAt: new Date().toISOString(),
      });
    }
    await gradeSRSCard(currentQuestion.srsCardId, quality);
    setGradedCurrentCard(true);
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setSessionState('finished');
      setNowIso(new Date().toISOString());
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedOptionId(null);
    setGradedCurrentCard(false);
    setTimeLeft(secondsPerQuestion);
  };

  const activeFlashcard: SRSCardRecord | null =
    srsStats.dueCards[flashcardIndex] || srsStats.dueCards[0] || null;

  const handleGradeFlashcard = async (quality: SRSQuality) => {
    if (!activeFlashcard) return;
    await gradeSRSCard(activeFlashcard.cardId, quality);
    setFlashcardReveal(false);
    setNowIso(new Date().toISOString());
    if (flashcardIndex >= srsStats.dueCards.length - 1) {
      setFlashcardIndex(0);
    }
  };

  return (
    <div className="practice-page">
      <div className="practice-page__container">
        <header className="practice-page__header">
          <div>
            <div className="practice-page__kicker">
              <Sparkles className="practice-page__kicker-icon" />
              Entraînement Dynamique &amp; SRS SM-2
            </div>
            <h1 className="practice-page__title">Pratique ciblée &amp; Révision espacée</h1>
            <p className="practice-page__subtitle">
              Générateur infini 100% hors-ligne à partir de vos 3 042 Kanji, 3 422 règles de
              grammaire et 33 425 Jukugo.
            </p>
          </div>
          <div className="practice-page__nav-links">
            <Link
              href="/bookmarks"
              className="practice-page__nav-link practice-page__nav-link--outline"
            >
              Mes Favoris
            </Link>
            <Link
              href="/history"
              className="practice-page__nav-link practice-page__nav-link--solid"
            >
              Historique
            </Link>
          </div>
        </header>

        <SrsDashboardStrip
          dueCount={srsStats.dueCount}
          total={srsStats.total}
          masteredCount={srsStats.masteredCount}
          flashcardActive={flashcardActive}
          onToggleFlashcards={() => {
            setFlashcardActive((v) => !v);
            setFlashcardReveal(false);
          }}
        />

        <div className="flex flex-wrap gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5">
          <button
            type="button"
            onClick={() => setActiveWorkspace('quiz')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeWorkspace === 'quiz'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Quiz Dynamiques &amp; SRS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspace('drills')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeWorkspace === 'drills'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <PenLine className="w-4 h-4" />
            <span>Ateliers Phrases &amp; Registres (8 modes)</span>
          </button>
        </div>

        {activeWorkspace === 'drills' ? (
          <DrillsHub initialMode={initialDrillParam} />
        ) : (
          <>
            {flashcardActive && activeFlashcard && (
              <SrsFlashcardReviewer
                card={activeFlashcard}
                revealed={flashcardReveal}
                onReveal={() => setFlashcardReveal(true)}
                onGrade={(q) => void handleGradeFlashcard(q)}
              />
            )}

            {sessionState === 'setup' && (
              <QuizSetupPanel
                modes={QUIZ_MODES}
                mode={mode}
                level={level}
                count={count}
                timedMode={timedMode}
                secondsPerQuestion={secondsPerQuestion}
                dueCount={srsStats.dueCount}
                isGenerating={isGenerating}
                emptyWarning={emptyWarning}
                onModeChange={setMode}
                onLevelChange={setLevel}
                onCountChange={setCount}
                onTimedModeChange={setTimedMode}
                onSecondsChange={setSecondsPerQuestion}
                onStart={() => void handleStartQuiz()}
              />
            )}

            {sessionState === 'playing' && currentQuestion && (
              <QuizSessionPlayer
                question={currentQuestion}
                currentIndex={currentIndex}
                totalQuestions={questions.length}
                score={score}
                timedMode={timedMode}
                timeLeft={timeLeft}
                selectedOptionId={selectedOptionId}
                gradedCurrentCard={gradedCurrentCard}
                onSelectOption={(id) => void handleSelectOption(id)}
                onManualGrade={(q) => void handleManualSRSGrade(q)}
                onNext={handleNextQuestion}
              />
            )}

            {sessionState === 'finished' && (
              <section className="quiz-finished">
                <div className="quiz-finished__icon-wrap">
                  <Zap className="quiz-finished__icon" />
                </div>
                <div>
                  <h2 className="quiz-finished__title">Session terminée !</h2>
                  <p className="quiz-finished__summary">
                    Votre score :{' '}
                    <strong className="quiz-finished__score">
                      {score} / {questions.length}
                    </strong>{' '}
                    ({questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%). Les
                    erreurs ont été ajoutées automatiquement à votre file de révision SM-2.
                  </p>
                </div>
                <div className="quiz-finished__actions">
                  <button
                    type="button"
                    onClick={() => void handleStartQuiz()}
                    className="quiz-finished__replay-btn"
                  >
                    <RotateCcw className="quiz-finished__replay-icon" />
                    Rejouer ({level})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionState('setup')}
                    className="quiz-finished__setup-btn"
                  >
                    Changer de mode
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="practice-page__suspense">Chargement du générateur de pratique...</div>
      }
    >
      <PracticeContent />
    </Suspense>
  );
}
