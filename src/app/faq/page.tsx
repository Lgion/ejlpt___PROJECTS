'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  MessageCircleQuestion,
  ThumbsUp,
  Search,
  Send,
  Sparkles,
  Trash2,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import {
  FAQ_CATEGORIES,
  type FaqCategory,
  type FaqComment,
  type FaqQuestion,
} from '@/lib/faqModel';

export default function FaqPage() {
  const { user, isSignedIn } = useUser();
  const isAdmin = isAdminEmail(user?.primaryEmailAddress?.emailAddress);

  const [questions, setQuestions] = useState<FaqQuestion[]>([]);
  const [category, setCategory] = useState<string>('ALL');
  const [level, setLevel] = useState<string>('ALL');
  const [sort, setSort] = useState<'votes' | 'recent'>('votes');
  const [search, setSearch] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);

  // Ask form states
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [askCategory, setAskCategory] = useState<FaqCategory>('grammaire');
  const [askLevel, setAskLevel] = useState<FaqQuestion['level']>('N4');
  const [duplicates, setDuplicates] = useState<FaqQuestion[]>([]);
  const [aiStatus, setAiStatus] = useState<AiBannerStatus>('idle');
  const [aiEvents, setAiEvents] = useState<AiAttemptEvent[]>([]);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const loadFaq = useCallback(async () => {
    try {
      const params = new URLSearchParams({ category, level, sort });
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/faq?${params.toString()}`);
      if (!res.ok) return;
      const data = (await res.json()) as { ok?: boolean; items?: FaqQuestion[] };
      if (data.ok && Array.isArray(data.items)) {
        setQuestions(data.items);
      }
    } catch {
      // ignore
    }
  }, [category, level, sort, search]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ category, level, sort });
    if (search.trim()) params.set('q', search.trim());
    fetch(`/api/faq?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ok?: boolean; items?: FaqQuestion[] } | null) => {
        if (active && data?.ok && Array.isArray(data.items)) {
          setQuestions(data.items);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [category, level, sort, search]);

  const submitQuestion = async (forceCreate: boolean) => {
    setAiStatus('loading');
    setAiError(null);
    setDuplicates([]);
    try {
      const res = await fetch('/api/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          category: askCategory,
          level: askLevel,
          forceCreate,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        duplicateFound?: boolean;
        duplicates?: FaqQuestion[];
        question?: FaqQuestion;
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
        error?: string;
      };
      setAiEvents(data.events || []);
      setAiUsedFallback(Boolean(data.usedFallback));

      if (!res.ok || !data.ok) {
        setAiStatus('error');
        setAiError(data.error || 'Publication impossible.');
        return;
      }

      if (data.duplicateFound && Array.isArray(data.duplicates)) {
        setAiStatus('idle');
        setDuplicates(data.duplicates);
        return;
      }

      setAiStatus('success');
      if (data.question) {
        setQuestions((prev) => [data.question!, ...prev]);
      }
      setTitle('');
      setBody('');
      setDuplicates([]);
      setToast('Question publiée publiquement avec réponse IA !');
      setTimeout(() => setToast(null), 3000);
    } catch {
      setAiStatus('error');
      setAiError('Erreur réseau lors de la publication.');
    }
  };

  const handleVote = async (qId: string) => {
    if (!isSignedIn) {
      setToast('Connectez-vous (Clerk) pour voter « utile » sur la FAQ.');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const res = await fetch(`/api/faq/${encodeURIComponent(qId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'vote' }),
    });
    const data = (await res.json()) as { ok?: boolean; voteCount?: number; error?: string };
    if (res.ok && data.ok && typeof data.voteCount === 'number') {
      setQuestions((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, voteCount: data.voteCount! } : q))
      );
    } else if (data.error) {
      setToast(data.error);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleAddComment = async (qId: string) => {
    const draft = (commentDrafts[qId] || '').trim();
    if (!draft) return;
    const res = await fetch(`/api/faq/${encodeURIComponent(qId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'comment', body: draft }),
    });
    const data = (await res.json()) as { ok?: boolean; comment?: FaqComment; error?: string };
    if (res.ok && data.ok && data.comment) {
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === qId ? { ...q, comments: [...(q.comments || []), data.comment!] } : q
        )
      );
      setCommentDrafts((p) => ({ ...p, [qId]: '' }));
    } else if (data.error) {
      setToast(data.error);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleAdminHide = async (qId: string) => {
    const res = await fetch(`/api/faq/${encodeURIComponent(qId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'moderate', status: 'hidden' }),
    });
    if (res.ok) {
      void loadFaq();
    }
  };

  const handleDelete = async (qId: string) => {
    const res = await fetch(`/api/faq/${encodeURIComponent(qId)}`, { method: 'DELETE' });
    if (res.ok) {
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    }
  };

  return (
    <div className="phase8-page">
      <header className="phase8-header">
        <div>
          <div className="phase8-kicker phase8-kicker--indigo">
            <MessageCircleQuestion className="w-4 h-4" />
            <span>FAQ Publique AI-Enhanced • StackOverflow Japonais</span>
          </div>
          <h1 className="phase8-title">Questions &amp; Réponses Publiques</h1>
          <p className="phase8-subtitle">
            Lecture et questions 100 % publiques (anti-doublons IA + modération automatique). Compte
            requis uniquement pour voter « utile » et gérer ses publications.
          </p>
        </div>
      </header>

      {toast && <div className="phase8-toast">{toast}</div>}

      {/* Ask public question box */}
      <section className="phase8-card space-y-3">
        <div className="text-sm font-extrabold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Poser une question publique (réponse IA immédiate)</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitQuestion(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Votre question (ex: Quand utiliser ておく vs てみる ?)"
              className="md:col-span-2 phase8-input"
            />
            <select
              aria-label="Catégorie FAQ"
              value={askCategory}
              onChange={(e) => setAskCategory(e.target.value as FaqCategory)}
              className="phase8-select"
            >
              {FAQ_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Niveau JLPT question"
              value={askLevel}
              onChange={(e) => setAskLevel(e.target.value as FaqQuestion['level'])}
              className="phase8-select"
            >
              {(['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'] as const).map((l) => (
                <option key={l} value={l}>
                  {l === 'ALL' ? 'Tous niveaux' : `JLPT ${l}`}
                </option>
              ))}
            </select>
          </div>

          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Contexte optionnel ou exemple japonais…"
            className="phase8-input w-full"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="submit" disabled={aiStatus === 'loading'} className="phase8-ai-btn">
              <Send className="w-3.5 h-3.5" />
              <span>{aiStatus === 'loading' ? 'Vérification & réponse IA…' : 'Publier et obtenir une réponse IA'}</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Publié en tant que :{' '}
              <strong>{isSignedIn ? user?.firstName || 'Membre' : 'Visiteur anonyme'}</strong>
            </span>
          </div>
        </form>

        <AiStatusBanner
          status={aiStatus}
          events={aiEvents}
          usedFallback={aiUsedFallback}
          errorMessage={aiError}
          onRetry={() => void submitQuestion(false)}
          compact
        />

        {duplicates.length > 0 && (
          <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-3 space-y-2">
            <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Questions similaires déjà résolues (anti-doublon) :
            </div>
            {duplicates.map((d) => (
              <div key={d.id} className="text-xs text-slate-200 bg-slate-900 rounded-lg p-2">
                <strong>{d.title}</strong> — <span className="text-slate-400">{d.level}</span>
              </div>
            ))}
            <button
              type="button"
              onClick={() => void submitQuestion(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white cursor-pointer"
            >
              Publier quand même ma question
            </button>
          </div>
        )}
      </section>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory('ALL')}
            className={`phase8-tab ${category === 'ALL' ? 'phase8-tab--active' : ''}`}
          >
            Toutes
          </button>
          {FAQ_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`phase8-tab ${category === c.id ? 'phase8-tab--active' : ''}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrer FAQ…"
              className="phase8-input pl-8 w-44"
            />
          </div>
          <select
            aria-label="Filtrer par JLPT"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="phase8-select"
          >
            {['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'].map((l) => (
              <option key={l} value={l}>
                {l === 'ALL' ? 'Tous niveaux' : l}
              </option>
            ))}
          </select>
          <select
            aria-label="Tri FAQ"
            value={sort}
            onChange={(e) => setSort(e.target.value as 'votes' | 'recent')}
            className="phase8-select"
          >
            <option value="votes">Plus utiles</option>
            <option value="recent">Plus récentes</option>
          </select>
        </div>
      </div>

      {/* Question feed */}
      <div className="space-y-4">
        {questions.map((q) => {
          const isOwner = Boolean(user?.id && q.authorUserId === user.id);
          return (
            <article key={q.id} className="phase8-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="phase8-pill">{q.level}</span>
                    <span className="phase8-pill phase8-pill--muted">{q.category}</span>
                    <span className="text-[11px] text-slate-500">par {q.authorLabel}</span>
                  </div>
                  <h2 className="text-base font-extrabold text-white">{q.title}</h2>
                  {q.body && q.body !== q.title && (
                    <p className="text-xs text-slate-300">{q.body}</p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleVote(q.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:border-sky-500 text-xs font-bold text-sky-300 cursor-pointer"
                    title="Voter utile (compte requis)"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{q.voteCount}</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => void handleAdminHide(q.id)}
                      aria-label={`Masquer ${q.title}`}
                      className="p-2 rounded-lg border border-slate-700 text-amber-400 hover:bg-slate-800 cursor-pointer"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(isAdmin || isOwner) && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(q.id)}
                      aria-label={`Supprimer ${q.title}`}
                      className="p-2 rounded-lg border border-slate-700 text-rose-400 hover:bg-slate-800 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-indigo-800/50 bg-slate-900 p-3.5 space-y-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-400">
                  Réponse IA structurée
                </div>
                <div className="text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {q.aiAnswer}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {(q.comments || []).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg bg-slate-900/70 border border-slate-800 px-3 py-2 text-xs text-slate-300"
                  >
                    <strong className="text-slate-200">{c.authorLabel} : </strong>
                    <span>{c.body}</span>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentDrafts[q.id] || ''}
                    onChange={(e) =>
                      setCommentDrafts((p) => ({ ...p, [q.id]: e.target.value }))
                    }
                    placeholder="Ajouter un commentaire ou complément public…"
                    className="phase8-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddComment(q.id)}
                    className="phase8-outline-btn"
                  >
                    Commenter
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
