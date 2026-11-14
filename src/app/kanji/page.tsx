'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUser } from '@clerk/nextjs';
import { localDb, JLPTLevelNormalized, UnifiedKanjiRecord } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';
import {
  KanjiFilterBar,
  StrokeFilter,
  FrequencySort,
  RadicalEntry,
} from '@/components/kanji/KanjiFilterBar';
import { KanjiResultsStrip } from '@/components/kanji/KanjiResultsStrip';
import { KanjiDetailSidebar } from '@/components/kanji/KanjiDetailSidebar';
import { BookOpen, Type } from 'lucide-react';

type KanjiTypography = 'mincho' | 'gothic' | 'calligraphic';

function matchesStrokeRange(strokes: number | null, range: StrokeFilter): boolean {
  if (range === 'ALL') return true;
  if (strokes === null || strokes === undefined) return false;
  if (range === '1-5') return strokes >= 1 && strokes <= 5;
  if (range === '6-10') return strokes >= 6 && strokes <= 10;
  if (range === '11-15') return strokes >= 11 && strokes <= 15;
  return strokes >= 16;
}

function KanjiStudyContent() {
  const searchParams = useSearchParams();
  const qParam = searchParams.get('q') || '';
  const { isSignedIn } = useUser();

  const [selectedKanjiChar, setSelectedKanjiChar] = useState<string>(
    qParam && [...qParam].length === 1 ? qParam : '語'
  );
  const [searchQuery, setSearchQuery] = useState<string>(qParam);
  const [selectedJlpt, setSelectedJlpt] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRadical, setSelectedRadical] = useState<string>('ALL');
  const [selectedStrokes, setSelectedStrokes] = useState<StrokeFilter>('ALL');
  const [sortBy, setSortBy] = useState<FrequencySort>('default');
  const [typography, setTypography] = useState<KanjiTypography>('mincho');
  const [isAnimatingStrokes, setIsAnimatingStrokes] = useState<boolean>(false);
  const [radicalsMap, setRadicalsMap] = useState<Record<string, RadicalEntry>>({});
  const [compositionMap, setCompositionMap] = useState<
    Record<string, { in?: string[]; out?: string[] }>
  >({});

  useEffect(() => {
    if (!qParam) return;
    queueMicrotask(() => {
      setSearchQuery(qParam);
      if ([...qParam].length === 1) {
        setSelectedKanjiChar(qParam);
      }
    });
  }, [qParam]);

  useEffect(() => {
    let active = true;
    fetch('/data/radicaux_liste.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload?.data) return;
        setRadicalsMap(payload.data as Record<string, RadicalEntry>);
      })
      .catch(() => {
        // Offline / fallback cleanly
      });

    fetch('/data/composition.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload) return;
        setCompositionMap(payload as Record<string, { in?: string[]; out?: string[] }>);
      })
      .catch(() => {
        // Offline / fallback cleanly
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useLiveQuery(async () => {
    const all = await localDb.kanjis.toArray();
    const set = new Set<string>();
    for (const k of all) {
      if (k.category && k.category !== '-') {
        set.add(k.category);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const kanjiList = useLiveQuery(async () => {
    const collection =
      selectedJlpt !== 'ALL'
        ? localDb.kanjis.where('jlpt').equals(selectedJlpt as JLPTLevelNormalized)
        : localDb.kanjis.toCollection();

    const q = searchQuery.trim().toLowerCase();
    const hasFilter =
      Boolean(q) ||
      selectedCategory !== 'ALL' ||
      selectedRadical !== 'ALL' ||
      selectedStrokes !== 'ALL';

    let items: UnifiedKanjiRecord[];
    if (!hasFilter && sortBy === 'default') {
      items = await collection.limit(120).toArray();
      return items;
    }

    items = await collection
      .filter((k) => {
        if (selectedCategory !== 'ALL' && k.category !== selectedCategory) return false;
        if (selectedRadical !== 'ALL' && k.radical !== selectedRadical) return false;
        if (!matchesStrokeRange(k.strokes, selectedStrokes)) return false;
        if (!q) return true;
        return (
          k.kanji.includes(q) ||
          k.on_readings.some((r) => r.toLowerCase().includes(q)) ||
          k.kun_readings.some((r) => r.toLowerCase().includes(q)) ||
          (k.nanori && k.nanori.some((r) => r.toLowerCase().includes(q))) ||
          k.meanings_fr.some((m) => m.toLowerCase().includes(q)) ||
          k.meanings_en.some((m) => m.toLowerCase().includes(q)) ||
          Boolean(k.rtk_keyword_6th && k.rtk_keyword_6th.toLowerCase().includes(q))
        );
      })
      .toArray();

    if (sortBy !== 'default') {
      items.sort((a, b) => {
        const ra = a.frequencies?.[sortBy] ?? Number.MAX_SAFE_INTEGER;
        const rb = b.frequencies?.[sortBy] ?? Number.MAX_SAFE_INTEGER;
        return ra - rb;
      });
    }

    return items.slice(0, 120);
  }, [searchQuery, selectedJlpt, selectedCategory, selectedRadical, selectedStrokes, sortBy]);

  const currentKanji = useLiveQuery(
    () => localDb.kanjis.get(selectedKanjiChar),
    [selectedKanjiChar]
  );

  const existingBookmark = useLiveQuery(
    () => localDb.bookmarks.where('bookmarkId').equals(`kanji-${selectedKanjiChar}`).first(),
    [selectedKanjiChar]
  );

  const radicalOptions = useMemo(() => {
    return Object.entries(radicalsMap).sort((a, b) => {
      const sa = a[1].strokes ?? 99;
      const sb = b[1].strokes ?? 99;
      return sa - sb;
    });
  }, [radicalsMap]);

  const triggerStrokeAnimation = () => {
    setIsAnimatingStrokes(true);
    setTimeout(() => setIsAnimatingStrokes(false), 2500);
  };

  const handleToggleBookmark = async () => {
    if (!currentKanji) return;
    const bookmarkId = `kanji-${currentKanji.kanji}`;
    if (existingBookmark) {
      await localDb.bookmarks.where('bookmarkId').equals(bookmarkId).delete();
      await enqueueSyncAction('DELETE_BOOKMARK', { bookmarkId }, Boolean(isSignedIn));
      return;
    }

    const meaningSummary =
      currentKanji.meanings_fr?.filter((m) => m && m !== '-').slice(0, 3).join(', ') ||
      currentKanji.meanings_en?.slice(0, 3).join(', ') ||
      'Kanji';

    const readingSummary = [
      ...currentKanji.on_readings.slice(0, 3),
      ...currentKanji.kun_readings.slice(0, 3),
    ].join(' / ');

    const payload = {
      bookmarkId,
      type: 'KANJI' as const,
      kanjiOrWord: currentKanji.kanji,
      reading: readingSummary || undefined,
      meaning: meaningSummary,
      level: currentKanji.jlpt,
      notes: currentKanji.rtk_keyword_6th ? `RTK: ${currentKanji.rtk_keyword_6th}` : undefined,
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedJlpt('ALL');
    setSelectedCategory('ALL');
    setSelectedRadical('ALL');
    setSelectedStrokes('ALL');
    setSortBy('default');
  };

  const meanings = currentKanji?.meanings_fr?.filter((m) => m && m !== '-').length
    ? currentKanji.meanings_fr.filter((m) => m && m !== '-')
    : currentKanji?.meanings_en?.filter((m) => m && m !== '-') || [];

  const fontClass = `kanji-font--${typography}`;

  return (
    <div className="kanji-page">
      <div className="kanji-page__header">
        <div className="kanji-page__title-row">
          <h1 className="kanji-page__title">
            <BookOpen className="kanji-page__title-icon" />
            Kanjis (漢字)
          </h1>
          <span className="kanji-page__badge">3 042 Jōyō · RTK · WaniKani</span>
        </div>

        <div
          role="group"
          aria-label="Police d'affichage du Kanji"
          className="kanji-page__font-group"
        >
          <span className="kanji-page__font-label">
            <Type className="kanji-page__font-icon" />
            Police :
          </span>
          {(
            [
              { id: 'mincho', label: 'Mincho' },
              { id: 'gothic', label: 'Gothic' },
              { id: 'calligraphic', label: 'Manuscrite' },
            ] as const
          ).map((fontOpt) => (
            <button
              key={fontOpt.id}
              type="button"
              onClick={() => setTypography(fontOpt.id)}
              className={`kanji-page__font-btn ${typography === fontOpt.id ? 'kanji-page__font-btn--active' : ''
                }`}
            >
              {fontOpt.label}
            </button>
          ))}
        </div>
      </div>

      <KanjiFilterBar
        searchQuery={searchQuery}
        selectedJlpt={selectedJlpt}
        selectedCategory={selectedCategory}
        selectedRadical={selectedRadical}
        selectedStrokes={selectedStrokes}
        sortBy={sortBy}
        categories={categories || []}
        radicalOptions={radicalOptions}
        onSearchChange={setSearchQuery}
        onJlptChange={setSelectedJlpt}
        onCategoryChange={setSelectedCategory}
        onRadicalChange={setSelectedRadical}
        onStrokesChange={setSelectedStrokes}
        onSortChange={setSortBy}
        onReset={handleResetFilters}
      />

      <KanjiResultsStrip
        kanjiList={kanjiList}
        selectedKanjiChar={selectedKanjiChar}
        fontClass={fontClass}
        onSelectKanji={setSelectedKanjiChar}
      />

      {currentKanji ? (
        <div className="kanji-page__layout">
          <KanjiDetailSidebar
            kanji={currentKanji}
            radicalInfo={radicalsMap[currentKanji.radical]}
            componentKeys={compositionMap[currentKanji.kanji]?.in || []}
            fontClass={fontClass}
            isAnimatingStrokes={isAnimatingStrokes}
            isBookmarked={Boolean(existingBookmark)}
            meanings={meanings}
            onPlayAnimation={triggerStrokeAnimation}
            onToggleBookmark={() => void handleToggleBookmark()}
            onSelectKanji={setSelectedKanjiChar}
            onFilterByRadical={setSelectedRadical}
          />
        </div>
      ) : (
        <div className="kanji-page__loading">
          Chargement des données du Kanji &quot;{selectedKanjiChar}&quot;...
        </div>
      )}
    </div>
  );
}

export default function KanjiStudyPage() {
  return (
    <Suspense
      fallback={<div className="kanji-page__suspense">Chargement du centre Kanji...</div>}
    >
      <KanjiStudyContent />
    </Suspense>
  );
}
