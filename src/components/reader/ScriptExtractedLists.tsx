import React from 'react';
import Link from 'next/link';
import { type TextAnalysisResult } from '@/lib/textAnalyzer';
import { getLevelPillClass } from '@/components/reader/ReaderPassagePanel';
import { Bookmark } from 'lucide-react';

interface ScriptExtractedListsProps {
  analysis: TextAnalysisResult;
  activeListTab: 'vocab' | 'kanji' | 'grammar';
  onTabChange: (tab: 'vocab' | 'kanji' | 'grammar') => void;
  onBookmarkEntry: (
    kanjiOrWord: string,
    reading: string,
    meaning: string,
    level: string,
    type: 'KANJI' | 'VOCAB' | 'GRAMMAR'
  ) => void;
}

export function ScriptExtractedLists({
  analysis,
  activeListTab,
  onTabChange,
  onBookmarkEntry,
}: ScriptExtractedListsProps) {
  const tabs = [
    { id: 'vocab', label: `Vocabulaire (${analysis.vocabList.length})` },
    { id: 'kanji', label: `Kanji (${analysis.kanjiList.length})` },
    { id: 'grammar', label: `Grammaire (${analysis.grammarHits.length})` },
  ] as const;

  return (
    <section className="reader-lists">
      <div className="reader-lists__head">
        <h2 className="reader-lists__title">Listes extraites (Script 2 List)</h2>
        <div className="reader-lists__tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`reader-lists__tab ${
                activeListTab === t.id ? 'reader-lists__tab--active' : ''
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeListTab === 'vocab' && (
        <div className="reader-lists__vocab-grid">
          {analysis.vocabList.map((v) => (
            <div key={v.word} className="reader-lists__vocab-card">
              <div className="reader-lists__vocab-main">
                <div className="reader-lists__vocab-head">
                  <span className="reader-lists__vocab-word">{v.word}</span>
                  <span className={getLevelPillClass(v.jlpt)}>{v.jlpt}</span>
                  <span className="reader-lists__vocab-count">×{v.count}</span>
                </div>
                <div className="reader-lists__vocab-reading">{v.reading}</div>
                <div className="reader-lists__vocab-meaning">{v.meaning}</div>
              </div>
              <button
                type="button"
                aria-label={`Sauvegarder ${v.word}`}
                onClick={() => onBookmarkEntry(v.word, v.reading, v.meaning, v.jlpt, 'VOCAB')}
                className="reader-lists__save-icon-btn"
              >
                <Bookmark className="reader-lists__save-icon" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeListTab === 'kanji' && (
        <div className="reader-lists__kanji-grid">
          {analysis.kanjiList.map((k) => (
            <div key={k.kanji} className="reader-lists__kanji-card">
              <div className="reader-lists__kanji-head">
                <Link
                  href={`/kanji?q=${encodeURIComponent(k.kanji)}`}
                  className="reader-lists__kanji-link"
                >
                  {k.kanji}
                </Link>
                <span className={getLevelPillClass(k.jlpt)}>{k.jlpt}</span>
              </div>
              <div className="reader-lists__kanji-reading">{k.reading || '-'}</div>
              <div className="reader-lists__kanji-meaning">{k.meaning}</div>
            </div>
          ))}
        </div>
      )}

      {activeListTab === 'grammar' && (
        <div className="reader-lists__grammar-grid">
          {analysis.grammarHits.length === 0 ? (
            <p className="reader-lists__grammar-empty">
              Aucune locution grammaticale exacte détectée dans ce passage.
            </p>
          ) : (
            analysis.grammarHits.map((g) => (
              <div key={`${g.term}-${g.jlpt_level}`} className="reader-lists__grammar-card">
                <div>
                  <div className="reader-lists__grammar-head">
                    <Link
                      href={`/grammar?q=${encodeURIComponent(g.term)}`}
                      className="reader-lists__grammar-link"
                    >
                      {g.term}
                    </Link>
                    <span className="reader-lists__grammar-level">{g.jlpt_level}</span>
                  </div>
                  <div className="reader-lists__grammar-meaning">{g.meaning}</div>
                </div>
                <button
                  type="button"
                  aria-label={`Sauvegarder ${g.term}`}
                  onClick={() =>
                    onBookmarkEntry(g.term, g.reading, g.meaning, g.jlpt_level, 'GRAMMAR')
                  }
                  className="reader-lists__save-icon-btn"
                >
                  <Bookmark className="reader-lists__save-icon" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

