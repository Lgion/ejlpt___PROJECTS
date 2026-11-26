'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Volume2,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';
import { JA_SENSEI_LESSONS } from '@/data/jaSenseiLessons';

const STORAGE_KEY = 'ejlpt_lessons_completed_v1';

export default function LessonsPage() {
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [activeId, setActiveId] = useState<string>(JA_SENSEI_LESSONS[0].id);
  const [innerTab, setInnerTab] = useState<'grammar' | 'vocab' | 'reading' | 'quiz'>('grammar');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed)) setCompletedIds(parsed);
        }
      } catch {
        // ignore
      }
    });
  }, []);

  const toggleCompleted = (id: string) => {
    setCompletedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const visibleLessons = useMemo(() => {
    if (levelFilter === 'ALL') return JA_SENSEI_LESSONS;
    return JA_SENSEI_LESSONS.filter((l) => l.level === levelFilter);
  }, [levelFilter]);

  const activeLesson =
    visibleLessons.find((l) => l.id === activeId) ||
    visibleLessons[0] ||
    JA_SENSEI_LESSONS[0];

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="phase8-page">
      <header className="phase8-header">
        <div>
          <div className="phase8-kicker phase8-kicker--amber">
            <GraduationCap className="w-4 h-4" />
            <span>Parcours Progressif JA Sensei • Leçons &amp; Lecture N5 → N1</span>
          </div>
          <h1 className="phase8-title">Curriculum Structuré par Niveaux</h1>
          <p className="phase8-subtitle">
            {completedIds.length} / {JA_SENSEI_LESSONS.length} modules validés — grammaire 【接続】,
            vocabulaire audio, dialogues gradués et quiz de contrôle.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setLevelFilter(lvl)}
              className={`phase8-tab ${levelFilter === lvl ? 'phase8-tab--active' : ''}`}
            >
              {lvl === 'ALL' ? 'Tous' : lvl}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <aside className="phase8-card space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Modules ({visibleLessons.length})
          </div>
          {visibleLessons.map((lesson) => {
            const done = completedIds.includes(lesson.id);
            const selected = activeLesson.id === lesson.id;
            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => {
                  setActiveId(lesson.id);
                  setQuizAnswer(null);
                }}
                className={`w-full text-left rounded-xl border p-3 text-xs transition-colors cursor-pointer ${
                  selected
                    ? 'border-amber-500 bg-amber-950/40 text-white'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="phase8-pill">{lesson.level}</span>
                  {done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="font-bold mt-1.5">{lesson.title}</div>
              </button>
            );
          })}
        </aside>

        <section className="lg:col-span-2 phase8-card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="phase8-pill">{activeLesson.level} • Module {activeLesson.order}</span>
              <h2 className="text-xl font-extrabold text-white mt-2">{activeLesson.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{activeLesson.summaryFr}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleCompleted(activeLesson.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer ${
                completedIds.includes(activeLesson.id)
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-emerald-500'
              }`}
            >
              {completedIds.includes(activeLesson.id) ? '✓ Module terminé' : 'Marquer comme terminé'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['grammar', 'Leçon & 【接続】'],
                ['vocab', 'Vocabulaire & Audio'],
                ['reading', 'Dialogue & Lecture'],
                ['quiz', 'Quiz de validation'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setInnerTab(id)}
                className={`phase8-tab ${innerTab === id ? 'phase8-tab--active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          {innerTab === 'grammar' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                <strong className="text-amber-300">Objectifs :</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {activeLesson.objectivesFr.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>

              {activeLesson.grammarPoints.map((gp) => (
                <div key={gp.pattern} className="rounded-xl border border-indigo-800/50 bg-slate-900 p-4 space-y-1.5">
                  <div className="text-base font-black text-white" lang="ja">
                    {gp.pattern}
                  </div>
                  <div className="text-xs font-mono text-sky-400">【接続】 {gp.connection}</div>
                  <p className="text-xs text-slate-300">{gp.explanationFr}</p>
                </div>
              ))}
            </div>
          )}

          {innerTab === 'vocab' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeLesson.vocab.map((v) => (
                <div
                  key={v.word}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3"
                >
                  <div>
                    <div className="text-base font-black text-white" lang="ja">
                      {v.word} <span className="text-xs text-sky-400 font-normal">[{v.reading}]</span>
                    </div>
                    <div className="text-xs text-slate-300">{v.meaningFr}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speak(v.reading)}
                    aria-label={`Écouter ${v.word}`}
                    className="phase8-icon-btn"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {innerTab === 'reading' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-slate-400">Dialogue modèle</div>
                {activeLesson.dialogue.map((d, i) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-3 flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-amber-300">{d.speaker}</span>
                      <div className="text-sm font-bold text-white" lang="ja">{d.jp}</div>
                      <div className="text-xs text-sky-400" lang="ja">{d.reading}</div>
                      <div className="text-xs text-slate-300 mt-0.5">{d.fr}</div>
                    </div>
                    <button type="button" onClick={() => speak(d.jp)} className="phase8-icon-btn">
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-emerald-800/50 bg-slate-900 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    Texte de lecture gradué ({activeLesson.level})
                  </span>
                  <Link
                    href={`/reader?text=${encodeURIComponent(activeLesson.readingText)}`}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300"
                  >
                    Ouvrir dans Script 2 List <ExternalLink className="w-3 h-3 inline" />
                  </Link>
                </div>
                <p className="text-base text-slate-100 leading-relaxed" lang="ja">
                  {activeLesson.readingText}
                </p>
              </div>
            </div>
          )}

          {innerTab === 'quiz' && activeLesson.checkQuiz[0] && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <div className="text-sm font-bold text-white">{activeLesson.checkQuiz[0].prompt}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeLesson.checkQuiz[0].options.map((opt, idx) => {
                  const answered = quizAnswer !== null;
                  const isRight = idx === activeLesson.checkQuiz[0].correctIndex;
                  const isPicked = quizAnswer === idx;
                  let mod = '';
                  if (answered) {
                    if (isRight) mod = 'border-emerald-500 bg-emerald-950/60 text-emerald-200';
                    else if (isPicked) mod = 'border-rose-500 bg-rose-950/60 text-rose-200';
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={answered}
                      onClick={() => setQuizAnswer(idx)}
                      className={`rounded-xl border border-slate-700 bg-slate-950 p-3 text-left text-xs font-bold text-slate-100 cursor-pointer ${mod}`}
                      lang="ja"
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {quizAnswer !== null && (
                <p className="text-xs text-slate-300">{activeLesson.checkQuiz[0].explanationFr}</p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
