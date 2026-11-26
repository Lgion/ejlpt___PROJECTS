'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/db';
import { computeJukugoGlobalStats } from '@/lib/smartGoals';
import { Target, Flame, Brain, TrendingUp, ArrowRight, Library } from 'lucide-react';

const JLPT_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

interface SmartGoal {
  id: string;
  title: string;
  metric: string;
  href: string;
  cta: string;
  priority: 'high' | 'medium' | 'normal';
}

export function AnalyticsDashboard() {
  const [selectedLevel, setSelectedLevel] = useState<(typeof JLPT_ORDER)[number]>('N5');
  const [nowIso] = useState<string>(() => new Date().toISOString());

  const kanjis = useLiveQuery(() => localDb.kanjis.toArray(), []);
  const jukugo = useLiveQuery(() => localDb.jukugo.toArray(), []);
  const srsCards = useLiveQuery(() => localDb.srsCards.toArray(), []);
  const attempts = useLiveQuery(() => localDb.attempts.toArray(), []);

  const analytics = useMemo(() => {
    const kanjiRows = kanjis || [];
    const cards = srsCards || [];
    const attemptRows = attempts || [];

    const cardByKey = new Map(cards.map((c) => [c.itemKey, c]));
    const dueCards = cards.filter((c) => c.dueAt <= nowIso);

    const byLevel = JLPT_ORDER.map((lvl) => {
      const levelKanjis = kanjiRows
        .filter((k) => k.jlpt === lvl)
        .sort(
          (a, b) =>
            (a.frequencies?.news ?? Number.MAX_SAFE_INTEGER) -
            (b.frequencies?.news ?? Number.MAX_SAFE_INTEGER)
        );

      let mastered = 0;
      let learning = 0;
      let weak = 0;

      for (const k of levelKanjis) {
        const card = cardByKey.get(k.kanji);
        if (!card) continue;
        if (card.repetitions >= 3 && card.intervalDays >= 6) mastered += 1;
        else if (card.errorCount > 0 && card.dueAt <= nowIso) weak += 1;
        else learning += 1;
      }

      return {
        level: lvl,
        total: levelKanjis.length,
        mastered,
        learning,
        weak,
        sampleTiles: levelKanjis.slice(0, 80).map((k) => {
          const card = cardByKey.get(k.kanji);
          let state: 'unseen' | 'weak' | 'learning' | 'mastered' = 'unseen';
          if (card) {
            if (card.repetitions >= 3 && card.intervalDays >= 6) state = 'mastered';
            else if (card.errorCount > 0 && card.dueAt <= nowIso) state = 'weak';
            else state = 'learning';
          }
          return { kanji: k.kanji, state };
        }),
      };
    });

    const smartGoals: SmartGoal[] = [];

    if (dueCards.length > 0) {
      smartGoals.push({
        id: 'srs-due',
        title: `Réviser ${Math.min(20, dueCards.length)} cartes SRS échues aujourd'hui`,
        metric: `Spécifique : ${dueCards.length} carte(s) en attente • Délai : aujourd'hui`,
        href: '/practice?mode=srs_review',
        cta: 'Lancer révision SRS',
        priority: 'high',
      });
    }

    if (attemptRows.length === 0) {
      smartGoals.push({
        id: 'first-mock',
        title: 'Passer une première simulation diagnostique JLPT N5',
        metric: 'Mesurable : score cible >= 50% (avec >= 31% par section)',
        href: '/',
        cta: 'Ouvrir les examens',
        priority: 'medium',
      });
    } else {
      const latest = attemptRows[attemptRows.length - 1];
      const weakest = [
        { label: 'Moji / Goi', score: latest.scoreMojiGo },
        { label: 'Bunpou / Dokkai', score: latest.scoreBunpouDokkai },
        { label: 'Choukai', score: latest.scoreChoukai },
      ].sort((a, b) => a.score - b.score)[0];

      smartGoals.push({
        id: 'weak-section',
        title: `Renforcer votre section la plus faible (${weakest.label}) au niveau ${latest.level}`,
        metric: `Objectif : +20 pts lors de votre prochaine tentative ${latest.level}`,
        href: weakest.label.includes('Bunpou')
          ? '/practice?mode=grammar_cloze'
          : '/practice?mode=kanji_reading',
        cta: 'S’entraîner sur ce point',
        priority: 'medium',
      });
    }

    smartGoals.push({
      id: 'reading-immersion',
      title: 'Analyser 1 texte court dans Script 2 List & sauvegarder 5 mots',
      metric: 'Atteignable en 10 min • Furigana adaptatifs activés',
      href: '/reader',
      cta: 'Ouvrir le lecteur',
      priority: 'normal',
    });

    return { byLevel, smartGoals, totalAttempts: attemptRows.length, totalCards: cards.length };
  }, [kanjis, srsCards, attempts, nowIso]);

  const jukugoStats = useMemo(
    () => computeJukugoGlobalStats(jukugo || [], srsCards || []),
    [jukugo, srsCards]
  );

  const activeLevelData =
    analytics.byLevel.find((b) => b.level === selectedLevel) || analytics.byLevel[0];

  return (
    <section className="analytics-panel">
      <div className="analytics-panel__header">
        <div>
          <div className="analytics-panel__kicker">
            <Flame className="analytics-panel__kicker-icon" />
            Heatmap Kanji &amp; Objectifs SMART
          </div>
          <h2 className="analytics-panel__title">Progression JLPT N5 → N1</h2>
          <p className="analytics-panel__subtitle">
            Alimenté localement par vos cartes SM-2 ({analytics.totalCards}) et vos simulations (
            {analytics.totalAttempts}).
          </p>
        </div>

        <div className="analytics-panel__levels">
          {JLPT_ORDER.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setSelectedLevel(lvl)}
              className={`analytics-panel__level-btn ${
                selectedLevel === lvl ? 'analytics-panel__level-btn--active' : ''
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      <div className="analytics-panel__coverage-grid">
        {analytics.byLevel.map((b) => {
          const touched = b.mastered + b.learning + b.weak;
          const pct = b.total > 0 ? Math.round((touched / b.total) * 100) : 0;
          return (
            <div
              key={b.level}
              className={`analytics-panel__coverage-card ${
                selectedLevel === b.level ? 'analytics-panel__coverage-card--active' : ''
              }`}
            >
              <div className="analytics-panel__coverage-head">
                <span className="analytics-panel__coverage-level">{b.level}</span>
                <span className="analytics-panel__coverage-ratio">
                  {touched}/{b.total}
                </span>
              </div>
              <div className="analytics-panel__progress-track">
                <div
                  className="analytics-panel__progress-fill"
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <div className="analytics-panel__coverage-meta">
                <span>Maîtrisés: {b.mastered}</span>
                <span>À revoir: {b.weak}</span>
              </div>
            </div>
          );
        })}
      </div>

      {activeLevelData && (
        <div className="analytics-panel__heatmap-section">
          <div className="analytics-panel__heatmap-head">
            <span className="analytics-panel__heatmap-label">
              <Brain className="analytics-panel__heatmap-icon" />
              Top {activeLevelData.sampleTiles.length} Kanji fréquents ({activeLevelData.level})
            </span>
            <div className="analytics-panel__legend">
              <span className="analytics-panel__legend-item">
                <span className="analytics-panel__legend-dot analytics-panel__legend-dot--unseen" />{' '}
                Non étudié
              </span>
              <span className="analytics-panel__legend-item">
                <span className="analytics-panel__legend-dot analytics-panel__legend-dot--weak" />{' '}
                À revoir
              </span>
              <span className="analytics-panel__legend-item">
                <span className="analytics-panel__legend-dot analytics-panel__legend-dot--learning" />{' '}
                En cours
              </span>
              <span className="analytics-panel__legend-item">
                <span className="analytics-panel__legend-dot analytics-panel__legend-dot--mastered" />{' '}
                Maîtrisé
              </span>
            </div>
          </div>

          <div className="analytics-panel__tiles-grid">
            {activeLevelData.sampleTiles.map((tile) => (
              <Link
                key={tile.kanji}
                href={`/kanji?q=${encodeURIComponent(tile.kanji)}`}
                title={`${tile.kanji} (${tile.state})`}
                className={`analytics-panel__tile analytics-panel__tile--${tile.state}`}
              >
                {tile.kanji}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="analytics-panel__goals-section">
        <div className="analytics-panel__goals-kicker">
          <Library className="analytics-panel__goals-icon" />
          Statistiques Jukugo Globales ({jukugoStats.totalJukugo.toLocaleString('fr-FR')} composés)
        </div>
        <div className="analytics-jukugo-grid">
          <div className="analytics-jukugo-card">
            <span className="analytics-jukugo-card__label">Progression SRS Jukugo</span>
            <strong className="analytics-jukugo-card__val">
              {jukugoStats.studiedCount} étudiés • {jukugoStats.masteredCount} maîtrisés
            </strong>
          </div>
          <div className="analytics-jukugo-card">
            <span className="analytics-jukugo-card__label">Longueur (2 / 3 / 4+ kanjis)</span>
            <strong className="analytics-jukugo-card__val">
              {jukugoStats.byLength.len2.toLocaleString('fr-FR')} /{' '}
              {jukugoStats.byLength.len3.toLocaleString('fr-FR')} /{' '}
              {jukugoStats.byLength.len4Plus.toLocaleString('fr-FR')}
            </strong>
          </div>
          <div className="analytics-jukugo-card">
            <span className="analytics-jukugo-card__label">Verbes 自動詞 / 他動詞</span>
            <strong className="analytics-jukugo-card__val">
              {jukugoStats.transitivity.jidoushi.toLocaleString('fr-FR')} 自動 •{' '}
              {jukugoStats.transitivity.tadoushi.toLocaleString('fr-FR')} 他動
            </strong>
          </div>
          <div className="analytics-jukugo-card">
            <span className="analytics-jukugo-card__label">Répartition N5→N1 &amp; N0</span>
            <strong className="analytics-jukugo-card__val">
              N5:{jukugoStats.byLevel.N5} N4:{jukugoStats.byLevel.N4} N3:{jukugoStats.byLevel.N3}{' '}
              N0:{jukugoStats.byLevel.N0}
            </strong>
          </div>
        </div>
      </div>

      <div className="analytics-panel__goals-section">
        <div className="analytics-panel__goals-kicker">
          <Target className="analytics-panel__goals-icon" />
          Objectifs SMART Recommandés
        </div>
        <div className="analytics-panel__goals-grid">
          {analytics.smartGoals.map((g) => (
            <div key={g.id} className="analytics-panel__goal-card">
              <div>
                <div className="analytics-panel__goal-title">
                  <TrendingUp
                    className={`analytics-panel__goal-icon analytics-panel__goal-icon--${g.priority}`}
                  />
                  <span>{g.title}</span>
                </div>
                <p className="analytics-panel__goal-metric">{g.metric}</p>
              </div>
              <Link href={g.href} className="analytics-panel__goal-cta">
                <span>{g.cta}</span>
                <ArrowRight className="analytics-panel__goal-arrow" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
