'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Square,
  Trash2,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
} from 'lucide-react';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import type { AiTodoSuggestion } from '@/app/api/tools/ai-todo/route';

interface StudyTodoItem {
  id: string;
  title: string;
  category: string;
  estimatedMinutes: number;
  level: string;
  href?: string;
  done: boolean;
  origin: 'manual' | 'ai';
}

const STORAGE_KEY = 'ejlpt_ai_study_todos_v1';

const DEFAULT_TODOS: StudyTodoItem[] = [
  {
    id: 'seed_1',
    title: 'Réviser 15 cartes SRS dues avec feedback multimédia',
    category: 'SRS',
    estimatedMinutes: 10,
    level: 'N4',
    href: '/practice?mode=srs_review',
    done: false,
    origin: 'manual',
  },
  {
    id: 'seed_2',
    title: 'Compléter 1 série Yomikata Z (mode Clavier ou Oral)',
    category: 'Lecture',
    estimatedMinutes: 10,
    level: 'N4',
    href: '/practice?tab=yomikata',
    done: false,
    origin: 'manual',
  },
];

const FOCUS_OPTIONS = ['Kanji', 'Jukugo', 'Grammaire 【接続】', 'Yomikata Z', 'Écoute Choukai', 'Keigo'];

export function AiStudyTodoTool() {
  const [todos, setTodos] = useState<StudyTodoItem[]>(DEFAULT_TODOS);
  const [hydrated, setHydrated] = useState(false);

  const [manualTitle, setManualTitle] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'open' | 'done'>('all');

  // AI Co-writer controls
  const [level, setLevel] = useState('N4');
  const [minutesPerDay, setMinutesPerDay] = useState(30);
  const [selectedFocus, setSelectedFocus] = useState<string[]>(['Kanji', 'Grammaire 【接続】']);
  const [customNote, setCustomNote] = useState('');

  const [aiStatus, setAiStatus] = useState<AiBannerStatus>('idle');
  const [aiEvents, setAiEvents] = useState<AiAttemptEvent[]>([]);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AiTodoSuggestion[]>([]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as StudyTodoItem[];
          if (Array.isArray(parsed)) {
            setTodos(parsed);
          }
        }
      } catch {
        // keep defaults
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {
      // ignore storage quota errors
    }
  }, [todos, hydrated]);

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualTitle.trim();
    if (!clean) return;
    setTodos((prev) => [
      {
        id: `man_${Date.now()}`,
        title: clean,
        category: 'Personnel',
        estimatedMinutes: 15,
        level,
        done: false,
        origin: 'manual',
      },
      ...prev,
    ]);
    setManualTitle('');
  };

  const handleGenerateAiPlan = async () => {
    setAiStatus('loading');
    setAiError(null);
    try {
      const res = await fetch('/api/tools/ai-todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          minutesPerDay,
          focusAreas: selectedFocus,
          customNote,
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        items?: AiTodoSuggestion[];
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
        error?: string;
      };
      setAiEvents(payload.events || []);
      setAiUsedFallback(Boolean(payload.usedFallback));
      if (!res.ok || !payload.ok || !Array.isArray(payload.items)) {
        setAiStatus('error');
        setAiError(payload.error || 'Impossible de générer la todo-list IA.');
        return;
      }
      setAiStatus('success');
      setSuggestions(payload.items);
    } catch {
      setAiStatus('error');
      setAiError('Erreur réseau lors du contact avec le co-rédacteur IA.');
    }
  };

  const addSuggestionToList = (s: AiTodoSuggestion) => {
    setTodos((prev) => [
      {
        id: s.id,
        title: s.title,
        category: s.category,
        estimatedMinutes: s.estimatedMinutes,
        level: s.level,
        href: s.href,
        done: false,
        origin: 'ai',
      },
      ...prev,
    ]);
    setSuggestions((prev) => prev.filter((item) => item.id !== s.id));
  };

  const addAllSuggestions = () => {
    if (suggestions.length === 0) return;
    setTodos((prev) => [
      ...suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        category: s.category,
        estimatedMinutes: s.estimatedMinutes,
        level: s.level,
        href: s.href,
        done: false,
        origin: 'ai' as const,
      })),
      ...prev,
    ]);
    setSuggestions([]);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const visibleTodos = todos.filter((t) => {
    if (filterState === 'open') return !t.done;
    if (filterState === 'done') return t.done;
    return true;
  });

  const doneCount = todos.filter((t) => t.done).length;
  const pct = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0;

  return (
    <section className="tool-panel">
      <div className="tool-panel__header">
        <div>
          <h2 className="tool-panel__title">Todo-List d’Étude Co-Écrite avec l’IA</h2>
          <p className="tool-panel__subtitle">
            Planifiez vos révisions manuellement et demandez à Gemini des tâches ciblées selon votre niveau et votre temps.
          </p>
        </div>
        <span className="tool-panel__badge">
          {doneCount} / {todos.length} terminées ({pct}%)
        </span>
      </div>

      <div className="ai-todo__layout">
        {/* Left: User Checklist */}
        <div className="ai-todo__list-col">
          <form onSubmit={handleAddManual} className="flex gap-2">
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Ajouter une tâche d’étude manuelle…"
              className="tool-panel__input flex-1"
            />
            <button type="submit" className="ai-todo__add-btn">
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex gap-1.5">
              {(['all', 'open', 'done'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilterState(f)}
                  className={`tool-panel__chip ${filterState === f ? 'tool-panel__chip--active' : ''}`}
                >
                  {f === 'all' ? 'Toutes' : f === 'open' ? 'À faire' : 'Faites'}
                </button>
              ))}
            </div>
            <div className="w-28 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="space-y-2">
            {visibleTodos.length === 0 ? (
              <p className="text-xs text-slate-500 p-4 border border-slate-800 rounded-xl bg-slate-950">
                Aucune tâche dans cette vue.
              </p>
            ) : (
              visibleTodos.map((item) => (
                <div
                  key={item.id}
                  className={`ai-todo__item ${item.done ? 'ai-todo__item--done' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTodo(item.id)}
                    aria-label={`Basculer ${item.title}`}
                    className="text-sky-400 shrink-0 cursor-pointer"
                  >
                    {item.done ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold ${item.done ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{item.level}</span>
                      <span>• {item.category}</span>
                      <span>
                        • <Clock className="w-3 h-3 inline" /> {item.estimatedMinutes} min
                      </span>
                      {item.origin === 'ai' && <span className="text-indigo-400">• IA</span>}
                    </div>
                  </div>
                  {item.href && (
                    <Link href={item.href} className="text-xs font-bold text-sky-400 hover:text-sky-300 shrink-0">
                      Ouvrir <ArrowRight className="w-3 h-3 inline" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTodo(item.id)}
                    aria-label={`Supprimer ${item.title}`}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: AI Co-writer */}
        <div className="ai-todo__ai-col">
          <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            Co-rédacteur de programme IA
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="ai-todo-level" className="text-[11px] text-slate-400 block mb-1">
                Niveau cible
              </label>
              <select
                id="ai-todo-level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="tool-panel__select w-full"
              >
                {['N5', 'N4', 'N3', 'N2', 'N1'].map((l) => (
                  <option key={l} value={l}>
                    JLPT {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ai-todo-minutes" className="text-[11px] text-slate-400 block mb-1">
                Budget quotidien
              </label>
              <select
                id="ai-todo-minutes"
                value={minutesPerDay}
                onChange={(e) => setMinutesPerDay(Number(e.target.value))}
                className="tool-panel__select w-full"
              >
                <option value={15}>15 min / jour</option>
                <option value={30}>30 min / jour</option>
                <option value={45}>45 min / jour</option>
                <option value={60}>60 min / jour</option>
              </select>
            </div>
          </div>

          <div className="tool-panel__chips">
            {FOCUS_OPTIONS.map((f) => {
              const active = selectedFocus.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() =>
                    setSelectedFocus((prev) =>
                      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
                    )
                  }
                  className={`tool-panel__chip ${active ? 'tool-panel__chip--active' : ''}`}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Note / point faible (ex: je confonds は et が)…"
            className="tool-panel__input w-full"
          />

          <button
            type="button"
            disabled={aiStatus === 'loading'}
            onClick={() => void handleGenerateAiPlan()}
            className="ai-todo__gen-btn"
          >
            <Sparkles className="w-4 h-4" />
            <span>{aiStatus === 'loading' ? 'Génération en cours…' : 'Co-écrire des tâches avec l’IA'}</span>
          </button>

          <AiStatusBanner
            status={aiStatus}
            events={aiEvents}
            usedFallback={aiUsedFallback}
            errorMessage={aiError}
            onRetry={() => void handleGenerateAiPlan()}
            compact
          />

          {suggestions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">Propositions IA ({suggestions.length})</span>
                <button
                  type="button"
                  onClick={addAllSuggestions}
                  className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
                >
                  + Tout ajouter
                </button>
              </div>
              {suggestions.map((s) => (
                <div key={s.id} className="ai-todo__suggestion">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-100">{s.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {s.category} • {s.estimatedMinutes} min
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addSuggestionToList(s)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    + Ajouter
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
