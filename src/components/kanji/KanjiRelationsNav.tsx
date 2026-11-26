'use client';

import React, { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb, type UnifiedKanjiRecord } from '@/lib/db';

interface KanjiRelationsNavProps {
  kanji: UnifiedKanjiRecord;
  fontClass: string;
  onSelectKanji: (char: string) => void;
}

type NavTabId =
  | 'compounds'
  | 'similar'
  | 'synonyms'
  | 'antonyms'
  | 'homonyms'
  | 'variants';

interface NavTabDef {
  id: NavTabId;
  label: string;
  count: number;
}

export function KanjiRelationsNav({
  kanji,
  fontClass,
  onSelectKanji,
}: KanjiRelationsNavProps) {
  const [compoundsLimit, setCompoundsLimit] = useState(24);
  const [selectedTab, setSelectedTab] = useState<NavTabId>('compounds');

  // Exhaustive query across all 33 425 Jukugo entries in IndexedDB
  const exhaustiveCompounds = useLiveQuery(async () => {
    const ch = kanji.kanji;
    if (!ch) return { starting: [] as string[], ending: [] as string[], containing: [] as string[] };
    try {
      const matches = await localDb.jukugo
        .filter((j) => j.word.includes(ch))
        .toArray();
      matches.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

      const startingSet = new Set<string>(kanji.startingW || []);
      const endingSet = new Set<string>(kanji.endingW || []);
      const containingSet = new Set<string>();

      for (const m of matches) {
        const label = m.reading ? `${m.word} (${m.reading})` : m.word;
        if (m.word.startsWith(ch)) {
          startingSet.add(label);
        } else if (m.word.endsWith(ch)) {
          endingSet.add(label);
        } else {
          containingSet.add(label);
        }
      }

      return {
        starting: Array.from(startingSet),
        ending: Array.from(endingSet),
        containing: Array.from(containingSet),
      };
    } catch {
      return {
        starting: kanji.startingW || [],
        ending: kanji.endingW || [],
        containing: [] as string[],
      };
    }
  }, [kanji.kanji, kanji.startingW, kanji.endingW]);

  const startingWords = exhaustiveCompounds?.starting ?? kanji.startingW ?? [];
  const endingWords = exhaustiveCompounds?.ending ?? kanji.endingW ?? [];
  const containingWords = exhaustiveCompounds?.containing ?? [];
  const totalCompounds = startingWords.length + endingWords.length + containingWords.length;

  const tabs = useMemo<NavTabDef[]>(() => {
    const list: NavTabDef[] = [];

    if (totalCompounds > 0) {
      list.push({ id: 'compounds', label: 'Composés', count: totalCompounds });
    }
    if (kanji.similar && kanji.similar.length > 0) {
      list.push({ id: 'similar', label: 'Proches', count: kanji.similar.length });
    }
    if (kanji.synonyms && kanji.synonyms.length > 0) {
      list.push({ id: 'synonyms', label: 'Synonymes', count: kanji.synonyms.length });
    }
    if (kanji.antonyms && kanji.antonyms.length > 0) {
      list.push({ id: 'antonyms', label: 'Antonymes', count: kanji.antonyms.length });
    }
    if (kanji.homonyms && kanji.homonyms.length > 0) {
      list.push({ id: 'homonyms', label: 'Homonymes', count: kanji.homonyms.length });
    }
    if (kanji.variants && kanji.variants.length > 0) {
      list.push({ id: 'variants', label: 'Variantes', count: kanji.variants.length });
    }
    return list;
  }, [kanji, totalCompounds]);

  if (tabs.length === 0) return null;

  const activeTab: NavTabId = tabs.some((t) => t.id === selectedTab)
    ? selectedTab
    : tabs[0].id;

  const renderCharList = (chars: string[], variantClass: string) => (
    <div className="kanji-nav__chips">
      {chars.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => onSelectKanji(ch)}
          className={`kanji-nav__chip ${fontClass} ${variantClass}`}
        >
          {ch}
        </button>
      ))}
    </div>
  );

  return (
    <div className="kanji-nav">
      <div role="tablist" aria-label="Relations et composés du kanji" className="kanji-nav__tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedTab(tab.id)}
              className={`kanji-nav__tab ${isActive ? 'kanji-nav__tab--active' : ''}`}
            >
              <span>{tab.label}</span>
              <span className="kanji-nav__tab-count">{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="kanji-nav__panel">
        {activeTab === 'compounds' && (
          <div className="kanji-nav__compounds">
            {startingWords.length > 0 && (
              <div className="kanji-nav__compound-group">
                <span className="kanji-nav__group-tag kanji-nav__group-tag--start">
                  {kanji.kanji}… ({startingWords.length})
                </span>
                <div className="kanji-nav__chips">
                  {startingWords.slice(0, compoundsLimit).map((w, idx) => (
                    <span key={`${w}-${idx}`} className="kanji-nav__word kanji-nav__word--start">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {endingWords.length > 0 && (
              <div className="kanji-nav__compound-group">
                <span className="kanji-nav__group-tag kanji-nav__group-tag--end">
                  …{kanji.kanji} ({endingWords.length})
                </span>
                <div className="kanji-nav__chips">
                  {endingWords.slice(0, compoundsLimit).map((w, idx) => (
                    <span key={`${w}-${idx}`} className="kanji-nav__word kanji-nav__word--end">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {containingWords.length > 0 && (
              <div className="kanji-nav__compound-group">
                <span className="kanji-nav__group-tag">
                  …{kanji.kanji}… ({containingWords.length})
                </span>
                <div className="kanji-nav__chips">
                  {containingWords.slice(0, compoundsLimit).map((w, idx) => (
                    <span key={`${w}-${idx}`} className="kanji-nav__word">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(startingWords.length > compoundsLimit ||
              endingWords.length > compoundsLimit ||
              containingWords.length > compoundsLimit) && (
              <button
                type="button"
                onClick={() => setCompoundsLimit((v) => v + 40)}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300 self-start mt-1 cursor-pointer"
              >
                Afficher plus de composés ({totalCompounds} au total)
              </button>
            )}
          </div>
        )}

        {activeTab === 'similar' &&
          kanji.similar &&
          renderCharList(kanji.similar, 'kanji-nav__chip--similar')}

        {activeTab === 'synonyms' &&
          kanji.synonyms &&
          renderCharList(kanji.synonyms, 'kanji-nav__chip--synonym')}

        {activeTab === 'antonyms' &&
          kanji.antonyms &&
          renderCharList(kanji.antonyms, 'kanji-nav__chip--antonym')}

        {activeTab === 'homonyms' &&
          kanji.homonyms &&
          renderCharList(kanji.homonyms, 'kanji-nav__chip--homonym')}

        {activeTab === 'variants' &&
          kanji.variants &&
          renderCharList(kanji.variants, 'kanji-nav__chip--variant')}
      </div>
    </div>
  );
}
