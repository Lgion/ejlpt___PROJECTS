'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { ReaderControls } from '@/components/reader/ReaderControls';
import { ReaderStatsBar } from '@/components/reader/ReaderStatsBar';
import { ReaderPassagePanel } from '@/components/reader/ReaderPassagePanel';
import { ScriptExtractedLists } from '@/components/reader/ScriptExtractedLists';
import { BookText } from 'lucide-react';

const SAMPLE_SCRIPTS: Array<{
  id: string;
  title: string;
  level: TargetJLPTLevel;
  text: string;
}> = [
  {
    id: 'n5-daily',
    title: 'N5 — Matinée à Tokyo',
    level: 'N5',
    text: '毎日朝七時に起きます。新しい日本語の本を読んでから、駅へ行きます。友達と図書館で勉強します。夜は家族と美味しいご飯を食べます。',
  },
  {
    id: 'n3-manga',
    title: 'N3 — Dialogue Manga / Quotidien',
    level: 'N3',
    text: '昨日の試験は思ったより難しかったけれど、最後まで諦めずに頑張った。来月の面接に向けて、毎日少しずつ準備を続けるつもりだ。自信を持って挑戦しよう！',
  },
  {
    id: 'n2-news',
    title: 'N2 — Société & Environnement',
    level: 'N2',
    text: '近年、都市部における働き方改革が進む一方で、地方の活性化や環境問題への取り組みも重要な課題となっている。次世代のために持続可能な社会を築く必要がある。',
  },
];

export default function ReaderPage() {
  const { isSignedIn } = useUser();
  const [inputText, setInputText] = useState(SAMPLE_SCRIPTS[1].text);
  const [targetLevel, setTargetLevel] = useState<TargetJLPTLevel>('N4');
  const [furiganaMode, setFuriganaMode] = useState<ReaderFuriganaMode>('ADAPTIVE');
  const [analysis, setAnalysis] = useState<TextAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TextToken | null>(null);
  const [activeListTab, setActiveListTab] = useState<'vocab' | 'kanji' | 'grammar'>('vocab');
  const [toast, setToast] = useState<string | null>(null);

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

  return (
    <div className="reader-page">
      <header className="reader-page__header">
        <div>
          <div className="reader-page__badge">
            <BookText className="reader-page__badge-icon" />
            <span>Script 2 List &amp; Lecteur Gradué (Furigana Évolutifs)</span>
          </div>
          <h1 className="reader-page__title">Analyseur de Texte &amp; Lecteur Adaptatif</h1>
          <p className="reader-page__subtitle">
            Collez un texte japonais ou un script pour extraire instantanément kanji, jukugo et
            grammaire par niveau JLPT.
          </p>
        </div>

        <div className="reader-page__samples">
          {SAMPLE_SCRIPTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => {
                setInputText(sample.text);
                setTargetLevel(sample.level);
                setSelectedToken(null);
              }}
              className="reader-page__sample-btn"
            >
              {sample.title}
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div aria-live="polite" className="reader-page__toast">
          {toast}
        </div>
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
    </div>
  );
}
