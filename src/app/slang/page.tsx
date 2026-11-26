'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useUser } from '@clerk/nextjs';
import { toHiragana, toKatakana } from 'wanakana';
import { localDb } from '@/lib/db';
import { enqueueSyncAction } from '@/lib/sync';
import { SlangFilterBar } from '@/components/slang/SlangFilterBar';
import { SlangCard } from '@/components/slang/SlangCard';
import { OnomatopoeiaCard } from '@/components/slang/OnomatopoeiaCard';
import { MessageSquare } from 'lucide-react';

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function SlangExplorerInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = searchParams.get('tab') === 'ono' ? 'ono' : 'all';
  const { isSignedIn } = useUser();

  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<'all' | 'slang' | 'ono'>(initialTab);
  const [eraFilter, setEraFilter] = useState<string>('ALL');
  const [onlyOppositePairs, setOnlyOppositePairs] = useState<boolean>(false);
  const [limit, setLimit] = useState(40);
  const [toast, setToast] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const rawQ = query.trim().toLowerCase();
    const hiraQ = toHiragana(rawQ);
    const kataQ = toKatakana(rawQ);

    const [slangRows, onoRows] = await Promise.all([
      tab === 'ono'
        ? Promise.resolve([])
        : localDb.slang
            .filter((s) => {
              if (eraFilter !== 'ALL' && s.era !== eraFilter) return false;
              if (!rawQ) return true;
              const readings = asStringArray(s.readings);
              const meanings = asStringArray(s.meaning);
              return (
                s.term.toLowerCase().includes(rawQ) ||
                s.term.includes(hiraQ) ||
                s.term.includes(kataQ) ||
                readings.some(
                  (r) =>
                    r.toLowerCase().includes(rawQ) || r.includes(hiraQ) || r.includes(kataQ)
                ) ||
                meanings.some((m) => m.toLowerCase().includes(rawQ))
              );
            })
            .toArray(),
      tab === 'slang'
        ? Promise.resolve([])
        : localDb.onomatopoeia
            .filter((o) => {
              if (onlyOppositePairs && !(o.oppositeTerms && o.oppositeTerms.length > 0)) {
                return false;
              }
              if (!rawQ) return true;
              const shortDefs = asStringArray(o.shortDefinitions);
              return (
                o.term.toLowerCase().includes(rawQ) ||
                o.term.includes(hiraQ) ||
                o.term.includes(kataQ) ||
                shortDefs.some((d) => d.toLowerCase().includes(rawQ)) ||
                (o.extendedDefinition || '').toLowerCase().includes(rawQ)
              );
            })
            .toArray(),
    ]);

    return { slangRows, onoRows };
  }, [query, tab, eraFilter, onlyOppositePairs]);

  const handleBookmark = async (term: string, reading: string, meaning: string, level: string) => {
    const payload = {
      bookmarkId: `bm_${crypto.randomUUID()}`,
      type: 'VOCAB' as const,
      kanjiOrWord: term,
      reading,
      meaning: meaning.slice(0, 180),
      level,
      createdAt: new Date().toISOString(),
      isSynced: 0 as const,
    };
    await localDb.bookmarks.add(payload);
    await enqueueSyncAction('SAVE_BOOKMARK', payload, Boolean(isSignedIn));
    setToast(`« ${term} » ajouté au carnet d'étude !`);
    setTimeout(() => setToast(null), 2500);
  };

  const slangRows = data?.slangRows || [];
  const onoRows = data?.onoRows || [];
  const totalCount = slangRows.length + onoRows.length;

  return (
    <div className="slang-page">
      <div>
        <div className="slang-page__badge">
          <MessageSquare className="slang-page__badge-icon" />
          <span>Argot Moderne (Living Japanese Slang) &amp; Onomatopées (SuraSura)</span>
        </div>
        <h1 className="slang-page__title">
          Slang Japonais &amp; Onomatopées (俗語・オノマトペ)
        </h1>
        <p className="slang-page__subtitle">
          {totalCount.toLocaleString('fr-FR')} expression(s) disponible(s) hors-ligne.
        </p>
      </div>

      {toast && (
        <div aria-live="polite" className="slang-page__toast">
          {toast}
        </div>
      )}

      <SlangFilterBar
        query={query}
        tab={tab}
        eraFilter={eraFilter}
        onlyOppositePairs={onlyOppositePairs}
        onQueryChange={(val) => {
          setQuery(val);
          setLimit(40);
        }}
        onTabChange={(nextTab) => {
          setTab(nextTab);
          setLimit(40);
        }}
        onEraFilterChange={(era) => {
          setEraFilter(era);
          setLimit(40);
        }}
        onOnlyOppositePairsChange={(only) => {
          setOnlyOppositePairs(only);
          setLimit(40);
        }}
      />

      <div className="slang-page__grid">
        {slangRows.slice(0, limit).map((s, idx) => (
          <SlangCard
            key={`slang-${s.id ?? s.term}-${idx}`}
            item={s}
            readings={asStringArray(s.readings)}
            meanings={asStringArray(s.meaning)}
            notes={asStringArray(s.note)}
            examples={asStringArray(s.example)}
            onBookmark={(term, reading, meaning, level) =>
              void handleBookmark(term, reading, meaning, level)
            }
          />
        ))}

        {onoRows.slice(0, Math.max(0, limit - slangRows.length)).map((o, idx) => (
          <OnomatopoeiaCard
            key={`ono-${o.id ?? o.term}-${idx}`}
            item={o}
            shortDefs={asStringArray(o.shortDefinitions)}
            examples={asStringArray(o.examples)}
            onSelectTerm={(opp) => {
              setTab('ono');
              setQuery(opp);
              setLimit(40);
            }}
            onBookmark={(term, reading, meaning, level) =>
              void handleBookmark(term, reading, meaning, level)
            }
          />
        ))}
      </div>

      {totalCount > limit && (
        <div className="slang-page__more-wrap">
          <button
            type="button"
            onClick={() => setLimit((v) => v + 40)}
            className="slang-page__more-btn"
          >
            Afficher plus ({totalCount - limit} restants)
          </button>
        </div>
      )}
    </div>
  );
}

export default function SlangPage() {
  return (
    <Suspense
      fallback={
        <div className="slang-page__suspense">Chargement Slang &amp; Onomatopées...</div>
      }
    >
      <SlangExplorerInner />
    </Suspense>
  );
}
