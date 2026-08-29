'use client';

import React, { useState, useEffect } from 'react';
import { JLPTExam, JLPTQuestion, ExamResult } from '@/types/jlpt';
import { ChoukaiAudioPlayer } from './custom-components/ChoukaiAudioPlayer';
import { EzoeGrammarViewer } from './custom-components/EzoeGrammarViewer';
import { FuriganaText } from './custom-components/FuriganaText';
import { localDb } from '@/lib/db';
import { Clock, Flag, CheckCircle, XCircle, AlertTriangle, ArrowRight, ArrowLeft, RefreshCw, Send, Check, Sparkles, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamRunnerProps {
  exam: JLPTExam;
  mode: 'FULL_MOCK' | 'SECTION_PRACTICE';
  sectionFilter?: 'moji_go' | 'bunpou_dokkai' | 'choukai';
  onExit: () => void;
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  exam,
  mode,
  sectionFilter,
  onExit,
}) => {
  // Filter questions based on mode or sectionFilter
  const questions: JLPTQuestion[] = sectionFilter
    ? exam.questions.filter(q => q.section === sectionFilter)
    : exam.questions;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(
    (sectionFilter ? 30 : exam.totalTimeMinutes) * 60
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Guard if no questions match sectionFilter
  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-100">Section en cours de préparation</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Aucune question n&apos;est actuellement répertoriée pour la section <strong className="text-sky-400">{sectionFilter}</strong> du niveau <strong className="text-sky-400">{exam.level}</strong>.
        </p>
        <button
          onClick={onExit}
          className="mt-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-colors"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex] || questions[0];

  // Timer countdown
  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted]);

  // Keyboard navigation (1, 2, 3, 4 for options)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitted) return;
      if (['1', '2', '3', '4'].includes(e.key) && currentQuestion) {
        handleSelectOption(currentQuestion.id, e.key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, currentQuestion, isSubmitted]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const toggleFlag = (questionId: string) => {
    setFlags(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleAutoSubmit = () => {
    calculateAndFinish();
  };

  const calculateAndFinish = async () => {
    setIsSaving(true);
    let scoreMojiGo = 0;
    let maxMojiGo = 0;
    let scoreBunpouDokkai = 0;
    let maxBunpouDokkai = 0;
    let scoreChoukai = 0;
    let maxChoukai = 0;

    questions.forEach(q => {
      const isCorrect = answers[q.id] === q.correctOptionId;
      const pts = 20;

      if (q.section === 'moji_go') {
        maxMojiGo += pts;
        if (isCorrect) scoreMojiGo += pts;
      } else if (q.section === 'bunpou_dokkai') {
        maxBunpouDokkai += pts;
        if (isCorrect) scoreBunpouDokkai += pts;
      } else if (q.section === 'choukai') {
        maxChoukai += pts;
        if (isCorrect) scoreChoukai += pts;
      }
    });

    if (maxMojiGo === 0 && sectionFilter === 'moji_go') maxMojiGo = 60;
    if (maxBunpouDokkai === 0 && sectionFilter === 'bunpou_dokkai') maxBunpouDokkai = 60;
    if (maxChoukai === 0 && sectionFilter === 'choukai') maxChoukai = 60;

    const totalScore = scoreMojiGo + scoreBunpouDokkai + scoreChoukai;
    const maxTotalScore = (maxMojiGo || 60) + (maxBunpouDokkai || 60) + (maxChoukai || 60);

    const passedMojiGo = maxMojiGo === 0 || (scoreMojiGo / maxMojiGo) >= 0.31;
    const passedBunpouDokkai = maxBunpouDokkai === 0 || (scoreBunpouDokkai / maxBunpouDokkai) >= 0.31;
    const passedChoukai = maxChoukai === 0 || (scoreChoukai / maxChoukai) >= 0.31;

    const overallRatio = maxTotalScore > 0 ? totalScore / maxTotalScore : 0;
    const passedOverall = overallRatio >= 0.50 && passedMojiGo && passedBunpouDokkai && passedChoukai;

    const totalDurationSeconds = (sectionFilter ? 30 : exam.totalTimeMinutes) * 60;
    const timeSpent = totalDurationSeconds - timeRemainingSeconds;

    const res: ExamResult = {
      attemptId: `attempt_${Date.now()}`,
      level: exam.level,
      mode,
      passed: passedOverall,
      scoreTotal: Math.round(totalScore),
      maxScoreTotal: maxTotalScore,
      scoreMojiGo: Math.round(scoreMojiGo),
      maxScoreMojiGo: maxMojiGo || 60,
      scoreBunpouDokkai: Math.round(scoreBunpouDokkai),
      maxScoreBunpouDokkai: maxBunpouDokkai || 60,
      scoreChoukai: Math.round(scoreChoukai),
      maxScoreChoukai: maxChoukai || 60,
      passedMojiGo,
      passedBunpouDokkai,
      passedChoukai,
      timeSpentSeconds: timeSpent,
      answers,
      createdAt: new Date().toISOString(),
    };

    setResult(res);
    setIsSubmitted(true);
    setShowConfirmModal(false);

    if (passedOverall) {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    try {
      await localDb.attempts.add({
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
        isSynced: false,
      });

      if (navigator.onLine) {
        await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...res, title: exam.title, sectionFilter }),
        });
        await localDb.attempts.where('attemptId').equals(res.attemptId).modify({ isSynced: true });
      }
    } catch (err) {
      console.error('LocalDb save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Top Header bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title="Quitter la simulation"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              {exam.level} • {mode === 'FULL_MOCK' ? 'Examen Blanc Complet' : `Entraînement (${sectionFilter || 'Modulaire'})`}
            </span>
            <h2 className="text-lg font-bold text-slate-100">{exam.title}</h2>
          </div>
        </div>

        {/* Timer & Submit controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-slate-200 font-mono text-base font-bold shadow-inner">
            <Clock className={`w-4 h-4 ${timeRemainingSeconds < 300 ? 'text-rose-500 animate-pulse' : 'text-sky-400'}`} />
            <span className={timeRemainingSeconds < 300 ? 'text-rose-400' : ''}>
              {formatTime(timeRemainingSeconds)}
            </span>
          </div>

          {!isSubmitted && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Terminer & Valider</span>
            </button>
          )}
        </div>
      </div>

      {/* RESULT VIEW */}
      {isSubmitted && result ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-3">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-2xl ${
                result.passed
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-emerald-900/50'
                  : 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-rose-900/50'
              }`}
            >
              {result.passed ? <CheckCircle className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
            </div>
            <div>
              <span
                className={`text-sm uppercase tracking-widest font-extrabold px-3 py-1 rounded-full border ${
                  result.passed
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}
              >
                {result.passed ? 'RÉUSSITE (合格 - PASSED)' : 'ÉCHEC (不合格 - FAILED)'}
              </span>
              <h3 className="text-3xl font-extrabold text-slate-100 mt-2">
                Score Total : {result.scoreTotal} / {result.maxScoreTotal} pts
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Temps écoulé : {formatTime(result.timeSpentSeconds)} • Enregistré localement dans Dexie & MongoDB Atlas
              </p>
            </div>
          </div>

          {/* Breakdown by Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400">文字・語彙 (Vocabulaire)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100">{result.scoreMojiGo} / {result.maxScoreMojiGo}</span>
                <span className={`text-xs font-bold ${result.passedMojiGo ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.passedMojiGo ? 'Validé' : 'Éliminé (<19)'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400">文法・読解 (Grammaire/Lecture)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100">{result.scoreBunpouDokkai} / {result.maxScoreBunpouDokkai}</span>
                <span className={`text-xs font-bold ${result.passedBunpouDokkai ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.passedBunpouDokkai ? 'Validé' : 'Éliminé (<19)'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-400">聴解 (Écoute Choukai)</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-100">{result.scoreChoukai} / {result.maxScoreChoukai}</span>
                <span className={`text-xs font-bold ${result.passedChoukai ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.passedChoukai ? 'Validé' : 'Éliminé (<19)'}
                </span>
              </div>
            </div>
          </div>

          {/* Full Corrections list */}
          <div className="flex flex-col gap-4 pt-6 border-t border-slate-800">
            <h4 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              Correction Détaillée & Explications Pédagogiques
            </h4>

            {questions.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correctOptionId;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-xl border flex flex-col gap-3 transition-all ${
                    isCorrect
                      ? 'bg-slate-950/70 border-emerald-900/50'
                      : 'bg-slate-950/70 border-rose-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center">
                        Q{idx + 1}
                      </span>
                      <span className="text-xs font-semibold uppercase text-sky-400 bg-sky-950 px-2 py-0.5 rounded">
                        {q.subCategory}
                      </span>
                    </div>

                    <span
                      className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        isCorrect
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {isCorrect ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  {/* Prompt */}
                  <div className="text-base font-bold text-slate-100 font-serif">
                    <FuriganaText text={q.prompt} reading={q.furiganaPrompt} />
                  </div>

                  {/* Options status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-1">
                    {q.options.map(opt => {
                      const isUserChoice = userAns === opt.id;
                      const isRightAns = q.correctOptionId === opt.id;

                      let style = 'bg-slate-900 border-slate-800 text-slate-400';
                      if (isRightAns) style = 'bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold';
                      else if (isUserChoice && !isRightAns) style = 'bg-rose-950/80 border-rose-600 text-rose-300 font-bold line-through';

                      return (
                        <div key={opt.id} className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${style}`}>
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-center leading-5 font-mono text-[10px]">
                            {opt.id}
                          </span>
                          <FuriganaText text={opt.label} reading={opt.reading} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed">
                    <span className="font-bold text-sky-400">Explication (FR) : </span>
                    {q.explanationFr}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              onClick={onExit}
              className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs shadow-lg shadow-sky-600/30 transition-colors"
            >
              Retourner au Tableau de Bord
            </button>
          </div>
        </div>
      ) : (
        /* QUESTION RUNNER VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Box */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-sky-950 border border-sky-800 text-sky-400 text-xs font-bold">
                  Question {currentIndex + 1} / {questions.length}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Section : {currentQuestion.section.toUpperCase()} ({currentQuestion.subCategory})
                </span>
              </div>

              <button
                onClick={() => toggleFlag(currentQuestion.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  flags[currentQuestion.id]
                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <Flag className="w-3.5 h-3.5 fill-current" />
                {flags[currentQuestion.id] ? 'Marquée' : 'Marquer'}
              </button>
            </div>

            {/* Reading Passage (if Dokkai) */}
            {currentQuestion.readingPassage && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-sm leading-relaxed text-slate-200 whitespace-pre-line font-serif">
                <h4 className="text-xs uppercase tracking-wider font-bold text-sky-400 mb-2">Texte de Lecture (読解)</h4>
                {currentQuestion.readingPassage}
              </div>
            )}

            {/* Choukai Audio player (if Choukai) */}
            {currentQuestion.section === 'choukai' && (
              <ChoukaiAudioPlayer
                audioUrl={currentQuestion.audioUrl}
                audioScript={currentQuestion.audioScript}
                isFullMockMode={mode === 'FULL_MOCK'}
              />
            )}

            {/* Ezoe Grammar breakdown if available */}
            {currentQuestion.ezoeBreakdown && (
              <EzoeGrammarViewer segments={currentQuestion.ezoeBreakdown} />
            )}

            {/* Prompt Statement */}
            <div className="p-6 bg-slate-950 border border-slate-800/80 rounded-xl text-lg sm:text-xl font-bold text-slate-100 font-serif leading-relaxed shadow-inner">
              <FuriganaText text={currentQuestion.prompt} reading={currentQuestion.furiganaPrompt} />
            </div>

            {/* MCQ Options (1, 2, 3, 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuestion.options.map(opt => {
                const isSelected = answers[currentQuestion.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(currentQuestion.id, opt.id)}
                    className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3.5 shadow-md ${
                      isSelected
                        ? 'bg-sky-950/80 border-sky-500 text-sky-200 ring-2 ring-sky-500/40 scale-[1.02]'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                        isSelected ? 'bg-sky-600 text-white shadow-md shadow-sky-600/50' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.id}
                    </span>
                    <span className="text-sm font-semibold flex-1">
                      <FuriganaText text={opt.label} reading={opt.reading} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-xs font-semibold transition-colors border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" /> Question Précédente
              </button>

              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors shadow-lg shadow-sky-600/30"
              >
                Question Suivante <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Question Palette Drawer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 h-fit">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200">Grille de Repérage</h3>
              <span className="text-xs text-slate-400">
                {answeredCount} / {questions.length} répondus
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAns = Boolean(answers[q.id]);
                const isCur = idx === currentIndex;
                const isFlg = Boolean(flags[q.id]);

                let bgStyle = 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700';
                if (isAns) bgStyle = 'bg-sky-950 border-sky-700 text-sky-300 font-bold';
                if (isCur) bgStyle += ' ring-2 ring-sky-400 shadow-md';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative h-10 rounded-lg border text-xs font-mono flex items-center justify-center transition-all ${bgStyle}`}
                  >
                    {idx + 1}
                    {isFlg && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400"></span>}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-sky-950 border border-sky-700"></span>
                <span>Répondu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-400"></span>
                <span>Marqué pour révision</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal before Submit */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Confirmer la Soumission
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Vous avez répondu à <strong className="text-sky-400">{answeredCount}</strong> questions sur{' '}
              <strong className="text-sky-400">{questions.length}</strong>. Souhaitez-vous vraiment finaliser
              l&apos;épreuve et obtenir votre relevé de note officiel JLPT ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Continuer l&apos;examen
              </button>
              <button
                onClick={calculateAndFinish}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-colors flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Valider & Voir Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
