'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  Newspaper,
  Sparkles,
  Volume2,
  Bookmark,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { localDb } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';
import {
  analyzeJapaneseText,
  type TextToken,
} from '@/lib/textAnalyzer';
import { AnnotatedJapaneseToken } from '@/components/visual/AnnotatedJapaneseToken';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import {
  NEWS_JLPT_LEVELS,
  type DailyNewsArticle,
  type NewsJLPTLevel,
  type RssHeadlineItem,
} from '@/lib/newsRss';

export default function NewsPage() {
  const { isSignedIn } = useUser();
  const [selectedLevel, setSelectedLevel] = useState<NewsJLPTLevel>('N4');
  const [dateKey, setDateKey] = useState<string>('');
  const [articles, setArticles] = useState<DailyNewsArticle[]>([]);
  const [rssHeadlines, setRssHeadlines] = useState<RssHeadlineItem[]>([]);
  const [tokens, setTokens] = useState<TextToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<TextToken | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [aiStatus, setAiStatus] = useState<AiBannerStatus>('idle');
  const [aiEvents, setAiEvents] = useState<AiAttemptEvent[]>([]);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadDaily = async () => {
      try {
        const res = await fetch('/api/news/daily');
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          dateKey?: string;
          articles?: DailyNewsArticle[];
          rssHeadlines?: RssHeadlineItem[];
        };
        if (active && data.ok && Array.isArray(data.articles)) {
          setDateKey(data.dateKey || '');
          setArticles(data.articles);
          setRssHeadlines(data.rssHeadlines || []);
        }
      } catch {
        // ignore
      }
    };
    void loadDaily();
    return () => {
      active = false;
    };
  }, []);

  const currentArticle =
    articles.find((a) => a.level === selectedLevel) || articles[0] || null;

  useEffect(() => {
    let active = true;
    if (!currentArticle?.bodyJa) {
      queueMicrotask(() => setTokens([]));
      return;
    }
    void analyzeJapaneseText(currentArticle.bodyJa, selectedLevel).then((res) => {
      if (active) {
        setTokens(res.tokens);
        setSelectedToken(null);
      }
    });
    return () => {
      active = false;
    };
  }, [currentArticle, selectedLevel]);

  const handleAdaptWithAi = async () => {
    setAiStatus('loading');
    setAiError(null);
    try {
      const res = await fetch('/api/news/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: selectedLevel }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        article?: DailyNewsArticle;
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
        error?: string;
      };
      setAiEvents(data.events || []);
      setAiUsedFallback(Boolean(data.usedFallback));

      if (!res.ok || !data.ok || !data.article) {
        setAiStatus('error');
        setAiError(data.error || 'Adaptation IA indisponible.');
        return;
      }

      setAiStatus('success');
      setArticles((prev) => {
        const without = prev.filter((a) => a.level !== selectedLevel);
        return [...without, data.article!];
      });
      setToast(`Article ${selectedLevel} généré à partir du flux NHK du jour !`);
      setTimeout(() => setToast(null), 3000);
    } catch {
      setAiStatus('error');
      setAiError('Erreur réseau lors de l’adaptation du journal.');
    }
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const handleBookmark = async (word: string, reading: string, meaning: string, lvl: string) => {
    const payload = {
      bookmarkId: `bm_${crypto.randomUUID()}`,
      type: 'VOCAB' as const,
      kanjiOrWord: word,
      reading,
      meaning: meaning || word,
      level: lvl,
      notes: `Todai Japan ${dateKey}`,
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
    setToast(`« ${word} » ajouté à votre carnet !`);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <div className="phase8-page">
      <header className="phase8-header">
        <div>
          <div className="phase8-kicker phase8-kicker--sky">
            <Newspaper className="w-4 h-4" />
            <span>Todai Japan Hybride • Édition {dateKey || 'du jour'}</span>
          </div>
          <h1 className="phase8-title">Presse Quotidienne Graduée N5 → N1</h1>
          <p className="phase8-subtitle">
            1 article par jour et par niveau JLPT : flux RSS NHK réels + adaptation IA cachée en base.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {NEWS_JLPT_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              className={`phase8-tab ${selectedLevel === lvl ? 'phase8-tab--active' : ''}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </header>

      {toast && <div className="phase8-toast">{toast}</div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={aiStatus === 'loading'}
          onClick={() => void handleAdaptWithAi()}
          className="phase8-ai-btn"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {aiStatus === 'loading'
              ? 'Adaptation NHK en cours…'
              : `Adapter l’actualité NHK du jour au niveau ${selectedLevel} (IA)`}
          </span>
        </button>

        {currentArticle && (
          <Link
            href={`/reader?text=${encodeURIComponent(`${currentArticle.titleJa}\n${currentArticle.bodyJa}`)}`}
            className="phase8-outline-btn"
          >
            <BookOpen className="w-4 h-4" />
            <span>Analyser dans Script 2 List</span>
          </Link>
        )}
      </div>

      <AiStatusBanner
        status={aiStatus}
        events={aiEvents}
        usedFallback={aiUsedFallback}
        errorMessage={aiError}
        onRetry={() => void handleAdaptWithAi()}
        compact
      />

      {currentArticle && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <article className="lg:col-span-2 phase8-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="phase8-pill">{currentArticle.level}</span>
                <span className="phase8-pill phase8-pill--muted">{currentArticle.sourceName}</span>
              </div>
              <button
                type="button"
                onClick={() => speak(`${currentArticle.titleJa}。${currentArticle.bodyJa}`)}
                className="phase8-icon-btn"
                title="Écouter l’article en japonais"
              >
                <Volume2 className="w-4 h-4" />
                <span>Écouter</span>
              </button>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white" lang="ja">
              {currentArticle.titleJa}
            </h2>
            <p className="text-xs font-semibold text-sky-300">{currentArticle.titleFr}</p>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-lg leading-loose text-slate-100" lang="ja">
              {tokens.length > 0 ? (
                tokens.map((tok, i) => {
                  if (tok.kind === 'newline') return <br key={i} />;
                  if (tok.kind === 'text') return <span key={i}>{tok.text}</span>;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedToken(tok)}
                      className="mx-0.5 rounded px-0.5 hover:bg-slate-800 cursor-pointer"
                    >
                      <AnnotatedJapaneseToken
                        text={tok.text}
                        reading={tok.reading}
                        showFurigana
                        jlpt={tok.jlpt}
                        masteryTier={tok.masteryTier}
                        frequencyScore10={tok.frequencyScore10}
                        grammaticalTag={tok.grammaticalTag}
                      />
                    </button>
                  );
                })
              ) : (
                <span>{currentArticle.bodyJa}</span>
              )}
            </div>

            {selectedToken && (
              <div className="rounded-xl border border-indigo-700/60 bg-indigo-950/30 p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-base font-black text-white mr-2" lang="ja">
                    {selectedToken.text}
                  </span>
                  {selectedToken.reading && (
                    <span className="text-xs text-sky-400 mr-2" lang="ja">
                      [{selectedToken.reading}]
                    </span>
                  )}
                  <span className="text-xs text-slate-300">
                    {selectedToken.meaning || 'Sens indisponible hors-ligne.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void handleBookmark(
                      selectedToken.text,
                      selectedToken.reading || '',
                      selectedToken.meaning || selectedToken.text,
                      selectedToken.jlpt || selectedLevel
                    )
                  }
                  className="phase8-outline-btn"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Carnet</span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => setShowSummary((v) => !v)}
                className="text-xs font-bold text-sky-400 cursor-pointer"
              >
                {showSummary ? 'Masquer le résumé français' : 'Afficher le résumé français'}
              </button>
              {showSummary && (
                <p className="text-xs text-slate-300 leading-relaxed">{currentArticle.summaryFr}</p>
              )}
            </div>
          </article>

          <aside className="space-y-4">
            <div className="phase8-card space-y-3">
              <h3 className="text-sm font-extrabold text-white">Vocabulaire clé de l’article</h3>
              {currentArticle.vocabHighlights.map((v) => (
                <div
                  key={v.term}
                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3"
                >
                  <div>
                    <div className="text-sm font-black text-white" lang="ja">
                      {v.term} <span className="text-xs text-sky-400 font-normal">[{v.reading}]</span>
                    </div>
                    <div className="text-xs text-slate-300">{v.meaningFr}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleBookmark(v.term, v.reading, v.meaningFr, currentArticle.level)}
                    aria-label={`Sauvegarder ${v.term}`}
                    className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {rssHeadlines.length > 0 && (
              <div className="phase8-card space-y-2.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Derniers titres RSS NHK (Direct)
                </h3>
                {rssHeadlines.map((h, i) => (
                  <a
                    key={i}
                    href={h.link || 'https://www3.nhk.or.jp/news/'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-slate-800 bg-slate-900 hover:border-sky-500 p-2.5 text-xs text-slate-200"
                    lang="ja"
                  >
                    <span className="font-bold">{h.title}</span>
                    <ExternalLink className="w-3 h-3 inline ml-1.5 text-sky-400" />
                  </a>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
