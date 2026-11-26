'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb, type SRSCardRecord } from '@/lib/db';
import {
  computeDexterityScore,
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
import { YomikataZPlayer } from '@/components/practice/YomikataZPlayer';
import { DragDropSortQuiz } from '@/components/practice/DragDropSortQuiz';
import { WritingGradedQuiz } from '@/components/practice/WritingGradedQuiz';
import { PostQuizSmartGoalCard } from '@/components/practice/PostQuizSmartGoalCard';
import { buildPostQuizSmartGoal } from '@/lib/smartGoals';
import type { ExerciseDrillMode } from '@/lib/exerciseCollections';
import { Zap, RotateCcw, Sparkles, PenLine, Eye, Puzzle, Trophy } from 'lucide-react';

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
    label: 'Synonymes & Ressemblances',
    description: 'Trouvez le kanji proche par le sens ou la forme graphique.',
  },
  {
    id: 'intruder_set',
    label: 'Intrus, Antonymes & Homophones',
    description: 'Démasquez l’intrus ou l’opposé parmi synonymes, antonymes, homophones et paronymes.',
  },
  {
    id: 'jukugo_compound',
    label: 'Mots Composés (Jukugo)',
    description: 'Associez les jukugo issus de kanji de niveau ciblé à leur lecture/sens.',
  },
  {
    id: 'jukugo_builder',
    label: 'Constructeur Jukugo (2–4+ kanjis)',
    description: 'À partir d’un kanji racine, retrouvez le mot composé exact de 2, 3 ou 4+ caractères.',
  },
  {
    id: 'speed_reading',
    label: 'Lecture Rapide en Contexte',
    description: 'Identifiez à toute vitesse la lecture et le sens exact dans une phrase JLPT.',
  },
  {
    id: 'translation_fr_ja',
    label: 'Traduction Rapide FR ↔ JA',
    description: 'Alternez traduction français → japonais et japonais → français sous chrono.',
  },
  {
    id: 'grammar_relations_connectors',
    label: 'Connexions 【接続】 & Registres',
    description: 'Maîtrisez les schémas de connexion grammaticale, équivalents familiers et opposés.',
  },
  {
    id: 'srs_review',
    label: 'Révision SRS (Cartes dues)',
    description: 'QCM dynamique généré prioritairement depuis vos cartes SM-2 échues.',
  },
];

type PracticeWorkspace = 'quiz' | 'yomikata' | 'drills' | 'interactive';

function resolveInitialWorkspace(tab: string | null): PracticeWorkspace {
  if (tab === 'yomikata') return 'yomikata';
  if (tab === 'drills') return 'drills';
  if (tab === 'interactive') return 'interactive';
  return 'quiz';
}

function PracticeContent() {
  const searchParams = useSearchParams();
  const initialModeParam = searchParams.get('mode') as DynamicQuizMode | null;
  const initialWorkspace = resolveInitialWorkspace(searchParams.get('tab'));
  const initialDrillParam = (searchParams.get('drill') || undefined) as
    | ExerciseDrillMode
    | undefined;

  const [activeWorkspace, setActiveWorkspace] = useState<PracticeWorkspace>(initialWorkspace);
  const [interactiveSubTab, setInteractiveSubTab] = useState<'dnd' | 'writing'>('dnd');
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
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [totalTimeRemainingSec, setTotalTimeRemainingSec] = useState<number>(0);
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

  const liveDexterity = useMemo(
    () =>
      computeDexterityScore({
        correctCount: score,
        totalCount: questions.length,
        totalTimeRemainingSec: timedMode ? totalTimeRemainingSec : 0,
        secondsPerQuestion,
        maxStreak,
      }),
    [score, questions.length, timedMode, totalTimeRemainingSec, secondsPerQuestion, maxStreak]
  );

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
        setStreak(0);
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
      setStreak(0);
      setMaxStreak(0);
      setTotalTimeRemainingSec(0);
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
      setStreak((prev) => {
        const nextStreak = prev + 1;
        setMaxStreak((ms) => Math.max(ms, nextStreak));
        return nextStreak;
      });
      if (timedMode) {
        setTotalTimeRemainingSec((prev) => prev + timeLeft);
      }
      const existing = await localDb.srsCards.get(currentQuestion.srsCardId);
      if (existing) {
        await gradeSRSCard(currentQuestion.srsCardId, 3);
      }
    } else {
      setStreak(0);
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
              10 modes de quiz dynamiques multimédias, Yomikata Z (QCM/Clavier/Oral), ateliers
              phrases &amp; registres, drag-and-drop et écriture kanji notée.
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
            <span>Quiz Dynamiques &amp; SRS (10 modes)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspace('yomikata')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeWorkspace === 'yomikata'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Yomikata Z</span>
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
            <span>Ateliers Phrases (8 modes)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkspace('interactive')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeWorkspace === 'interactive'
                ? 'bg-amber-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Puzzle className="w-4 h-4" />
            <span>Drag-Drop, Tri &amp; Écriture</span>
          </button>
        </div>

        {activeWorkspace === 'yomikata' ? (
          <YomikataZPlayer />
        ) : activeWorkspace === 'drills' ? (
          <DrillsHub initialMode={initialDrillParam} />
        ) : activeWorkspace === 'interactive' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInteractiveSubTab('dnd')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  interactiveSubTab === 'dnd'
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Drag-and-Drop / Tri 1段-5段 / 自動・他動
              </button>
              <button
                type="button"
                onClick={() => setInteractiveSubTab('writing')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  interactiveSubTab === 'writing'
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                Écriture Kanji Notée (Canvas)
              </button>
            </div>
            {interactiveSubTab === 'dnd' ? <DragDropSortQuiz /> : <WritingGradedQuiz />}
          </div>
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
                streak={streak}
                dexterityPoints={liveDexterity.totalPoints}
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
                    ({liveDexterity.accuracyPct}%). Les erreurs ont été ajoutées automatiquement à
                    votre file de révision SM-2.
                  </p>
                </div>

                <div className="dexterity-card">
                  <div className="dexterity-card__head">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Score de dextérité : {liveDexterity.rankLabelFr}</span>
                  </div>
                  <div className="dexterity-card__stats">
                    <div>
                      <span>Total</span>
                      <strong>{liveDexterity.totalPoints} pts</strong>
                    </div>
                    <div>
                      <span>Série max</span>
                      <strong>×{maxStreak} (+{liveDexterity.streakBonus})</strong>
                    </div>
                    <div>
                      <span>Bonus vitesse</span>
                      <strong>+{liveDexterity.speedBonus}</strong>
                    </div>
                  </div>
                </div>

                <PostQuizSmartGoalCard
                  goal={buildPostQuizSmartGoal({
                    contextLabel: QUIZ_MODES.find((m) => m.id === mode)?.label || mode,
                    level,
                    accuracyPct: liveDexterity.accuracyPct,
                    missedCount: Math.max(0, questions.length - score),
                    dueCount: srsStats.dueCount,
                  })}
                />

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
