import React from 'react';
import { type TargetJLPTLevel, type TextAnalysisResult } from '@/lib/textAnalyzer';
import { BarChart3 } from 'lucide-react';

interface ReaderStatsBarProps {
  stats: TextAnalysisResult['stats'];
  targetLevel: TargetJLPTLevel;
}

const LEVELS: Array<'N5' | 'N4' | 'N3' | 'N2' | 'N1'> = ['N5', 'N4', 'N3', 'N2', 'N1'];

export function ReaderStatsBar({ stats, targetLevel }: ReaderStatsBarProps) {
  return (
    <section aria-label="Statistiques de couverture JLPT" className="reader-stats">
      <div className="reader-stats__card">
        <div className="reader-stats__label">
          <BarChart3 className="reader-stats__icon" />
          Lisibilité estimée ({targetLevel})
        </div>
        <div className="reader-stats__value reader-stats__value--readability">
          {stats.readablePercent}%
        </div>
      </div>
      <div className="reader-stats__card">
        <div className="reader-stats__label">Kanji uniques extraits</div>
        <div className="reader-stats__value reader-stats__value--kanji">
          {stats.uniqueKanjiCount}
        </div>
      </div>
      <div className="reader-stats__card">
        <div className="reader-stats__label">Mots composés (Jukugo)</div>
        <div className="reader-stats__value reader-stats__value--vocab">
          {stats.uniqueVocabCount}
        </div>
      </div>
      <div className="reader-stats__card">
        <div className="reader-stats__label">Répartition JLPT</div>
        <div className="reader-stats__levels">
          {LEVELS.map((lvl) => (
            <span
              key={lvl}
              className={`jlpt-level-pill jlpt-level-pill--${lvl.toLowerCase()}`}
            >
              {lvl}:{stats.coverageByLevel[lvl] || 0}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

