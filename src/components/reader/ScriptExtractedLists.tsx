import React from 'react';
import Link from 'next/link';
import { type TextAnalysisResult } from '@/lib/textAnalyzer';
import { getLevelPillClass } from '@/components/reader/ReaderPassagePanel';
import { Bookmark, Download } from 'lucide-react';

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

  const handleExportCsv = () => {
    const rows = [
      ['Type', 'Terme', 'Lecture', 'JLPT', 'Sens'],
      ...analysis.vocabList.map((v) => ['Vocab', v.word, v.reading, v.jlpt, v.meaning]),
      ...analysis.kanjiList.map((k) => ['Kanji', k.kanji, k.reading, k.jlpt, k.meaning]),
      ...analysis.grammarHits.map((g) => ['Grammaire', g.term, g.reading, g.jlpt_level, g.meaning]),
    ];
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ejlpt_script2list.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="reader-lists">
      <div className="reader-lists__head">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="reader-lists__title">Listes extraites (Script 2 List)</h2>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-800 px-2.5 py-1 text-xs font-bold text-sky-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
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

