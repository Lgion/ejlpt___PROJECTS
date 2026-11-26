'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { localDb } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';
import {
  analyzeJapaneseText,
  type ReaderFuriganaMode,
  type TargetJLPTLevel,
  type TextAnalysisResult,
  type TextToken,
} from '@/lib/textAnalyzer';
import type { AiAttemptEvent } from '@/lib/ai/geminiClient';
import { OPEN_SCRIPTS_LIBRARY } from '@/data/openScriptsLibrary';
import { buildQuizFromAnalysis } from '@/lib/readerQuizBuilder';
import { extractPlainTextFromSubtitles, parseSubtitleFile } from '@/lib/subtitleParser';
import { ReaderControls } from '@/components/reader/ReaderControls';
import { ReaderStatsBar } from '@/components/reader/ReaderStatsBar';
import { ReaderPassagePanel } from '@/components/reader/ReaderPassagePanel';
import { ScriptExtractedLists } from '@/components/reader/ScriptExtractedLists';
import { ReaderGeneratedQuizPanel } from '@/components/reader/ReaderGeneratedQuizPanel';
import { InteractiveVideoPlayer } from '@/components/reader/InteractiveVideoPlayer';
import { AiStatusBanner, type AiBannerStatus } from '@/components/ai/AiStatusBanner';
import type { PromptExtractedItem } from '@/app/api/reader/extract/route';
import { BookText, FileUp, Film, Sparkles, Zap, Bookmark } from 'lucide-react';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const idx = raw.indexOf(',');
      resolve(idx >= 0 ? raw.slice(idx + 1) : raw);
    };
    reader.onerror = () => reject(new Error('Impossible de lire ce fichier.'));
    reader.readAsDataURL(file);
  });
}

function ReaderContent() {
  const searchParams = useSearchParams();
  const initialTextParam = searchParams.get('text');
  const initialTabParam = searchParams.get('tab') === 'video' ? 'video' : 'reader';

  const { isSignedIn } = useUser();
  const [workspaceTab, setWorkspaceTab] = useState<'reader' | 'video'>(initialTabParam);
  const [selectedScriptId, setSelectedScriptId] = useState<string>(OPEN_SCRIPTS_LIBRARY[1].id);
  const [inputText, setInputText] = useState<string>(
    initialTextParam?.trim() || OPEN_SCRIPTS_LIBRARY[1].text
  );
  const [targetLevel, setTargetLevel] = useState<TargetJLPTLevel>('N4');
  const [furiganaMode, setFuriganaMode] = useState<ReaderFuriganaMode>('ADAPTIVE');
  const [analysis, setAnalysis] = useState<TextAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TextToken | null>(null);
  const [activeListTab, setActiveListTab] = useState<'vocab' | 'kanji' | 'grammar'>('vocab');
  const [toast, setToast] = useState<string | null>(null);
  const [showGeneratedQuiz, setShowGeneratedQuiz] = useState(false);

  // Import & AI Prompt Extraction states
  const [extractPrompt, setExtractPrompt] = useState(
    'Extrais uniquement les expressions clés, verbes utiles et kanji JLPT N4–N3'
  );
  const [aiStatus, setAiStatus] = useState<AiBannerStatus>('idle');
  const [aiEvents, setAiEvents] = useState<AiAttemptEvent[]>([]);
  const [aiUsedFallback, setAiUsedFallback] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [promptExtractedItems, setPromptExtractedItems] = useState<PromptExtractedItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setIsAnalyzing(true));

    analyzeJapaneseText(inputText, targetLevel)
      .then((res) => {
        if (!cancelled) setAnalysis(res);
      })
      .finally(() => {
        if (!cancelled) setIsAnalyzing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inputText, targetLevel]);

  const masteredKeys = useMemo(() => {
    const set = new Set<string>();
    for (const t of analysis?.tokens || []) {
      if (t.isMastered) set.add(t.text);
    }
    return set;
  }, [analysis]);

  const generatedQuizQuestions = useMemo(
    () => (analysis ? buildQuizFromAnalysis(analysis, 8) : []),
    [analysis]
  );

  const handleBookmarkEntry = async (
    kanjiOrWord: string,
    reading: string,
    meaning: string,
    level: string,
    type: 'KANJI' | 'VOCAB' | 'GRAMMAR'
  ) => {
    const payload = {
      bookmarkId: `bm_${crypto.randomUUID()}`,
      type,
      kanjiOrWord,
      reading,
      meaning: meaning || kanjiOrWord,
      level,
      notes: 'Extrait depuis Script 2 List',
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
    setToast(`« ${kanjiOrWord} » enregistré dans votre carnet !`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    setAiError(null);

    if (lower.endsWith('.pdf')) {
      setAiStatus('loading');
      try {
        const base64Pdf = await fileToBase64(file);
        const res = await fetch('/api/reader/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Pdf, fileName: file.name }),
        });
        const payload = (await res.json()) as {
          ok?: boolean;
          text?: string;
          usedFallback?: boolean;
          events?: AiAttemptEvent[];
          error?: string;
        };
        setAiEvents(payload.events || []);
        setAiUsedFallback(Boolean(payload.usedFallback));
        if (!res.ok || !payload.ok || !payload.text) {
          setAiStatus('error');
          setAiError(payload.error || 'Échec d’extraction PDF.');
          return;
        }
        setAiStatus('success');
        setInputText(payload.text);
        setSelectedToken(null);
        setToast(`PDF « ${file.name} » importé avec succès !`);
      } catch {
        setAiStatus('error');
        setAiError('Impossible de traiter ce document PDF.');
      }
      return;
    }

    const rawText = await file.text();
    if (lower.endsWith('.srt') || lower.endsWith('.vtt')) {
      const cues = parseSubtitleFile(rawText);
      const plain = extractPlainTextFromSubtitles(cues);
      setInputText(plain || rawText);
      setToast(`Sous-titres « ${file.name} » importés (${cues.length} lignes).`);
    } else {
      setInputText(rawText);
      setToast(`Fichier « ${file.name} » chargé dans Script 2 List.`);
    }
    setSelectedToken(null);
  };

  const handlePromptExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiStatus('loading');
    setAiError(null);
    try {
      const res = await fetch('/api/reader/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          prompt: extractPrompt,
          targetLevel,
        }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        items?: PromptExtractedItem[];
        usedFallback?: boolean;
        events?: AiAttemptEvent[];
        error?: string;
      };
      setAiEvents(payload.events || []);
      setAiUsedFallback(Boolean(payload.usedFallback));
      if (!res.ok || !payload.ok || !Array.isArray(payload.items)) {
        setAiStatus('error');
        setAiError(payload.error || 'Extraction IA indisponible.');
        return;
      }
      setAiStatus('success');
      setPromptExtractedItems(payload.items);
    } catch {
      setAiStatus('error');
      setAiError('Erreur réseau lors de l’extraction par prompt.');
    }
  };

  return (
    <div className="reader-page">
      <header className="reader-page__header">
        <div>
          <div className="reader-page__badge">
            <BookText className="reader-page__badge-icon" />
            <span>Script 2 List v2 • Import PDF/SRT/TXT • Vidéo Sous-Titres</span>
          </div>
          <h1 className="reader-page__title">Analyseur de Texte, Scripts &amp; Vidéo</h1>
          <p className="reader-page__subtitle">
            Scripts libres de droits (contes, Aozora, dialogues N5–N1), import PDF/SRT/TXT,
            extraction par prompt IA et quiz instantané sur votre texte.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWorkspaceTab('reader')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              workspaceTab === 'reader'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <BookText className="w-4 h-4" />
            <span>Script 2 List &amp; PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceTab('video')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              workspaceTab === 'video'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Vidéo &amp; Sous-Titres Interactifs</span>
          </button>
        </div>
      </header>

      {toast && (
        <div aria-live="polite" className="reader-page__toast">
          {toast}
        </div>
      )}

      {workspaceTab === 'video' ? (
        <InteractiveVideoPlayer />
      ) : (
        <>
          <section className="reader-v2-toolbar">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="reader-library-select" className="text-xs font-bold text-slate-300">
                Bibliothèque ouverte :
              </label>
              <select
                id="reader-library-select"
                value={selectedScriptId}
                onChange={(e) => {
                  const found = OPEN_SCRIPTS_LIBRARY.find((s) => s.id === e.target.value);
                  setSelectedScriptId(e.target.value);
                  if (found) {
                    setInputText(found.text);
                    setTargetLevel(found.level);
                    setSelectedToken(null);
                  }
                }}
                className="reader-v2-toolbar__select"
              >
                {OPEN_SCRIPTS_LIBRARY.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.level}] {s.title} — {s.genre}
                  </option>
                ))}
              </select>

              <label className="reader-v2-toolbar__import-btn">
                <FileUp className="w-4 h-4" />
                <span>Importer .PDF / .SRT / .VTT / .TXT</span>
                <input
                  type="file"
                  accept=".pdf,.txt,.srt,.vtt,text/plain,application/pdf"
                  onChange={(e) => void handleFileImport(e)}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                disabled={generatedQuizQuestions.length === 0}
                onClick={() => setShowGeneratedQuiz(true)}
                className="reader-v2-toolbar__quiz-btn"
              >
                <Zap className="w-4 h-4" />
                <span>Générer un quiz depuis ce texte ({generatedQuizQuestions.length} q)</span>
              </button>
            </div>

            <form onSubmit={(e) => void handlePromptExtract(e)} className="reader-v2-toolbar__prompt-form">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                type="text"
                value={extractPrompt}
                onChange={(e) => setExtractPrompt(e.target.value)}
                placeholder="Prompt Script 2 List (ex: extrais les verbes familiers N3 et leurs lectures)…"
                className="reader-v2-toolbar__prompt-input"
              />
              <button
                type="submit"
                disabled={aiStatus === 'loading' || !inputText.trim()}
                className="reader-v2-toolbar__prompt-btn"
              >
                Extraction IA
              </button>
            </form>

            <AiStatusBanner
              status={aiStatus}
              events={aiEvents}
              usedFallback={aiUsedFallback}
              errorMessage={aiError}
              compact
            />

            {promptExtractedItems.length > 0 && (
              <div className="reader-v2-extracted">
                <div className="text-xs font-bold text-indigo-300 mb-2">
                  Liste extraite par prompt IA ({promptExtractedItems.length} termes)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {promptExtractedItems.map((item) => (
                    <div key={`${item.term}-${item.reading}`} className="reader-v2-extracted__card">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-white" lang="ja">
                          {item.term}{' '}
                          {item.reading && (
                            <span className="text-xs font-normal text-sky-400">[{item.reading}]</span>
                          )}
                          <span className="ml-1.5 text-[10px] text-indigo-300">{item.jlpt}</span>
                        </div>
                        <div className="text-xs text-slate-300">{item.meaningFr}</div>
                        {item.reasonFr && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.reasonFr}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleBookmarkEntry(
                            item.term,
                            item.reading,
                            item.meaningFr,
                            item.jlpt,
                            'VOCAB'
                          )
                        }
                        aria-label={`Sauvegarder ${item.term}`}
                        className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer shrink-0"
                      >
                        <Bookmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {showGeneratedQuiz && (
            <ReaderGeneratedQuizPanel
              questions={generatedQuizQuestions}
              onClose={() => setShowGeneratedQuiz(false)}
            />
          )}

          <ReaderControls
            targetLevel={targetLevel}
            furiganaMode={furiganaMode}
            inputText={inputText}
            onTargetLevelChange={setTargetLevel}
            onFuriganaModeChange={setFuriganaMode}
            onInputTextChange={setInputText}
          />

          {analysis && <ReaderStatsBar stats={analysis.stats} targetLevel={targetLevel} />}

          <ReaderPassagePanel
            tokens={analysis?.tokens || []}
            isAnalyzing={isAnalyzing}
            selectedToken={selectedToken}
            targetLevel={targetLevel}
            masteredKeys={masteredKeys}
            furiganaMode={furiganaMode}
            onSelectToken={setSelectedToken}
            onBookmarkToken={(w, r, m, l, t) => void handleBookmarkEntry(w, r, m, l, t)}
          />

          {analysis && (
            <ScriptExtractedLists
              analysis={analysis}
              activeListTab={activeListTab}
              onTabChange={setActiveListTab}
              onBookmarkEntry={(w, r, m, l, t) => void handleBookmarkEntry(w, r, m, l, t)}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-xs text-slate-400">Chargement du lecteur…</div>}
    >
      <ReaderContent />
    </Suspense>
  );
}
