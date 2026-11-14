'use client';

import React, { useMemo, useState } from 'react';
import type { UnifiedKanjiRecord } from '@/lib/db';

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
  const tabs = useMemo<NavTabDef[]>(() => {
    const startLen = kanji.startingW?.length ?? 0;
    const endLen = kanji.endingW?.length ?? 0;
    const list: NavTabDef[] = [];

    if (startLen + endLen > 0) {
      list.push({ id: 'compounds', label: 'Composés', count: startLen + endLen });
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
  }, [kanji]);

  const [selectedTab, setSelectedTab] = useState<NavTabId>('compounds');

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
            {kanji.startingW && kanji.startingW.length > 0 && (
              <div className="kanji-nav__compound-group">
                <span className="kanji-nav__group-tag kanji-nav__group-tag--start">
                  {kanji.kanji}…
                </span>
                <div className="kanji-nav__chips">
                  {kanji.startingW.map((w, idx) => (
                    <span key={`${w}-${idx}`} className="kanji-nav__word kanji-nav__word--start">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {kanji.endingW && kanji.endingW.length > 0 && (
              <div className="kanji-nav__compound-group">
                <span className="kanji-nav__group-tag kanji-nav__group-tag--end">
                  …{kanji.kanji}
                </span>
                <div className="kanji-nav__chips">
                  {kanji.endingW.map((w, idx) => (
                    <span key={`${w}-${idx}`} className="kanji-nav__word kanji-nav__word--end">
                      {w}
                    </span>
                  ))}
                </div>
              </div>
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

