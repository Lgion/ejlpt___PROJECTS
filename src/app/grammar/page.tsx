'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUser } from '@clerk/nextjs';
import { toHiragana, isRomaji } from 'wanakana';
import { localDb, GrammarRecord } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';
import { GrammarFilterBar } from '@/components/grammar/GrammarFilterBar';
import { GrammarCard } from '@/components/grammar/GrammarCard';
import { Sparkles, Eye, EyeOff, BookOpen } from 'lucide-react';

function GrammarExplorerInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const { isSignedIn } = useUser();

  const [query, setQuery] = useState(initialQuery);
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'particule' | 'bunpou'>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [showConnections, setShowConnections] = useState(true);
  const [visibleLimit, setVisibleLimit] = useState(40);
  const [toast, setToast] = useState<string | null>(null);

  const grammarList = useLiveQuery(async () => {
    const base =
      selectedLevel !== 'ALL'
        ? localDb.grammar.where('jlpt_level').equals(selectedLevel)
        : localDb.grammar.toCollection();

    const rawQ = query.trim().toLowerCase();
    const kanaQ = isRomaji(rawQ) ? toHiragana(rawQ) : rawQ;

    const filtered = await base
      .filter((item) => {
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
        if (selectedSource !== 'ALL' && item.source !== selectedSource) return false;
        if (!rawQ) return true;
        return (
          item.term.toLowerCase().includes(rawQ) ||
          item.term.includes(kanaQ) ||
          item.reading.toLowerCase().includes(rawQ) ||
          item.reading.includes(kanaQ) ||
          item.meaning.toLowerCase().includes(rawQ) ||
          item.connections.some((c) => c.toLowerCase().includes(rawQ))
        );
      })
      .toArray();

    return filtered;
  }, [query, selectedLevel, selectedCategory, selectedSource]);

  const handleBookmark = async (g: GrammarRecord) => {
    const payload = {
      bookmarkId: `bm_${crypto.randomUUID()}`,
      type: 'GRAMMAR' as const,
      kanjiOrWord: g.term,
      reading: g.reading,
      meaning: g.meaning.slice(0, 180),
      level: g.jlpt_level,
      notes: g.connections.length > 0 ? `接続: ${g.connections.join(' / ')}` : undefined,
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
    setToast(`Point « ${g.term} » sauvegardé dans votre carnet !`);
    setTimeout(() => setToast(null), 2500);
  };

  const items = grammarList || [];
  const displayed = items.slice(0, visibleLimit);

  return (
    <div className="grammar-page">
      <div className="grammar-page__header">
        <div>
          <div className="grammar-page__badge">
            <Sparkles className="grammar-page__badge-icon" />
            <span>4 Sources Unifiées (DOJG • Edewakaru • Nihongo Kyoushi • Nihongo no Sensei)</span>
          </div>
          <h1 className="grammar-page__title">
            Explorateur de Grammaire &amp; Particules (文法)
          </h1>
          <p className="grammar-page__subtitle">
            {items.length.toLocaleString('fr-FR')} règle(s) locale(s) disponibles hors-ligne avec
            règles de connexion et exemples.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowConnections((v) => !v)}
          className={`grammar-page__conn-toggle ${
            showConnections ? 'grammar-page__conn-toggle--active' : ''
          }`}
        >
          {showConnections ? (
            <Eye className="grammar-page__conn-icon" />
          ) : (
            <EyeOff className="grammar-page__conn-icon" />
          )}
          <span>
            {showConnections ? 'Connexions 【接続】 affichées' : 'Connexions 【接続】 masquées'}
          </span>
        </button>
      </div>

      {toast && (
        <div aria-live="polite" className="grammar-page__toast">
          {toast}
        </div>
      )}

      <GrammarFilterBar
        query={query}
        selectedLevel={selectedLevel}
        selectedCategory={selectedCategory}
        selectedSource={selectedSource}
        onQueryChange={(val) => {
          setQuery(val);
          setVisibleLimit(40);
        }}
        onLevelChange={(lvl) => {
          setSelectedLevel(lvl);
          setVisibleLimit(40);
        }}
        onCategoryChange={setSelectedCategory}
        onSourceChange={setSelectedSource}
      />

      {displayed.length === 0 ? (
        <div className="grammar-page__empty">
          <BookOpen className="grammar-page__empty-icon" />
          <span>Aucune règle trouvée ou indexation initiale en cours...</span>
        </div>
      ) : (
        <div className="grammar-page__grid">
          {displayed.map((g, idx) => (
            <GrammarCard
              key={`${g.id ?? g.term}-${idx}`}
              grammar={g}
              showConnections={showConnections}
              onBookmark={(item) => void handleBookmark(item)}
            />
          ))}
        </div>
      )}

      {items.length > visibleLimit && (
        <div className="grammar-page__more-wrap">
          <button
            type="button"
            onClick={() => setVisibleLimit((v) => v + 40)}
            className="grammar-page__more-btn"
          >
            Afficher 40 résultats supplémentaires ({items.length - visibleLimit} restants)
          </button>
        </div>
      )}
    </div>
  );
}

export default function GrammarPage() {
  return (
    <Suspense
      fallback={<div className="grammar-page__suspense">Chargement de la grammaire...</div>}
    >
      <GrammarExplorerInner />
    </Suspense>
  );
}
