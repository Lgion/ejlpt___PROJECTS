import React from 'react';
import Link from 'next/link';
import {
  shouldShowAdaptiveFurigana,
  type ReaderFuriganaMode,
  type TargetJLPTLevel,
  type TextToken,
} from '@/lib/textAnalyzer';
import { FileText, Sparkles, Bookmark, ExternalLink } from 'lucide-react';

interface ReaderPassagePanelProps {
  tokens: TextToken[];
  isAnalyzing: boolean;
  selectedToken: TextToken | null;
  targetLevel: TargetJLPTLevel;
  masteredKeys: Set<string>;
  furiganaMode: ReaderFuriganaMode;
  onSelectToken: (tok: TextToken) => void;
  onBookmarkToken: (
    kanjiOrWord: string,
    reading: string,
    meaning: string,
    level: string,
    type: 'KANJI' | 'VOCAB' | 'GRAMMAR'
  ) => void;
}

export function getLevelPillClass(level?: string, large = false): string {
  const normalized = (level || 'N0').toLowerCase();
  const valid = ['n5', 'n4', 'n3', 'n2', 'n1', 'n0'].includes(normalized) ? normalized : 'n0';
  return `jlpt-level-pill ${large ? 'jlpt-level-pill--lg' : ''} jlpt-level-pill--${valid}`;
}

export function ReaderPassagePanel({
  tokens,
  isAnalyzing,
  selectedToken,
  targetLevel,
  masteredKeys,
  furiganaMode,
  onSelectToken,
  onBookmarkToken,
}: ReaderPassagePanelProps) {
  return (
    <div className="reader-page__workspace">
      <section className="reader-passage">
        <div className="reader-passage__head">
          <h2 className="reader-passage__title">
            <FileText className="reader-passage__title-icon" />
            Lecteur Interactif (cliquez sur un mot pour l&apos;inspecter)
          </h2>
          {isAnalyzing && <span className="reader-passage__loading">Analyse...</span>}
        </div>

        <div className="reader-passage__body">
          {tokens.map((tok, idx) => {
            if (tok.kind === 'newline') return <br key={`nl-${idx}`} />;
            if (tok.kind === 'text') return <span key={`txt-${idx}`}>{tok.text}</span>;

            const showFuri =
              Boolean(tok.reading) &&
              shouldShowAdaptiveFurigana(
                tok.jlpt,
                targetLevel,
                masteredKeys,
                tok.text,
                furiganaMode
              );

            const isSelected = selectedToken?.text === tok.text;

            return (
              <button
                key={`tok-${idx}`}
                type="button"
                onClick={() => onSelectToken(tok)}
                className={`reader-passage__token ${
                  isSelected ? 'reader-passage__token--selected' : ''
                }`}
              >
                {showFuri && tok.reading ? (
                  <ruby>
                    {tok.text}
                    <rt className="reader-passage__rt">{tok.reading}</rt>
                  </ruby>
                ) : (
                  <span>{tok.text}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <aside className="reader-inspector">
        <h2 className="reader-inspector__title">
          <Sparkles className="reader-inspector__title-icon" />
          Inspecteur lexical
        </h2>

        {selectedToken ? (
          <div className="reader-inspector__card">
            <div className="reader-inspector__head">
              <span className="reader-inspector__term">{selectedToken.text}</span>
              <span className={getLevelPillClass(selectedToken.jlpt, true)}>
                {selectedToken.jlpt || 'N0'}
              </span>
            </div>

            {selectedToken.reading && (
              <div className="reader-inspector__reading">{selectedToken.reading}</div>
            )}

            <div className="reader-inspector__meaning">
              {selectedToken.meaning || 'Sens indisponible hors-ligne.'}
            </div>

            <div className="reader-inspector__actions">
              <button
                type="button"
                onClick={() =>
                  onBookmarkToken(
                    selectedToken.text,
                    selectedToken.reading || '',
                    selectedToken.meaning || selectedToken.text,
                    selectedToken.jlpt || 'N0',
                    selectedToken.kind === 'kanji' ? 'KANJI' : 'VOCAB'
                  )
                }
                className="reader-inspector__save-btn"
              >
                <Bookmark className="reader-inspector__btn-icon" />
                Ajouter au carnet
              </button>
              <Link
                href={`/kanji?q=${encodeURIComponent(selectedToken.text.charAt(0))}`}
                className="reader-inspector__kanji-link"
              >
                <ExternalLink className="reader-inspector__btn-icon" />
                Kanji
              </Link>
            </div>
          </div>
        ) : (
          <p className="reader-inspector__empty">
            Sélectionnez n&apos;importe quel mot composé ou kanji dans le lecteur pour voir sa
            lecture, son niveau JLPT et l&apos;ajouter à vos favoris.
          </p>
        )}
      </aside>
    </div>
  );
}

