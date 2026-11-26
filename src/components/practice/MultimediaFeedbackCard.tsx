'use client';

import React, { useState } from 'react';
import { Volume2, Brush, Sparkles } from 'lucide-react';
import { SpriteThumbnail } from '@/components/media/SpriteThumbnail';
import { KanjiStrokeSvg } from '@/components/media/KanjiStrokeSvg';
import type { QuizItemMetadata } from '@/lib/quizGenerator';

export interface MultimediaFeedbackCardProps {
  itemKey: string;
  itemType: 'KANJI' | 'GRAMMAR' | 'JUKUGO';
  reading?: string;
  meta?: QuizItemMetadata;
  compact?: boolean;
}

function buildMetadataBadges(meta?: QuizItemMetadata): Array<{ label: string; toneClass: string }> {
  if (!meta) return [];
  const badges: Array<{ label: string; toneClass: string }> = [];

  if (typeof meta.frequencyScore10 === 'number') {
    badges.push({
      label: `Fréq. ${meta.frequencyScore10}/10`,
      toneClass: 'multimedia-feedback__badge--freq',
    });
  }
  if (meta.jlpt && meta.jlpt !== 'Unknown') {
    badges.push({
      label: meta.jlpt,
      toneClass: 'multimedia-feedback__badge--jlpt',
    });
  }
  if (meta.isVerbe === 'ichidan' || meta.pos === 'verb_ichidan') {
    badges.push({ label: 'Verbe 1段', toneClass: 'multimedia-feedback__badge--verb' });
  } else if (meta.isVerbe === 'godan' || meta.pos === 'verb_godan') {
    badges.push({ label: 'Verbe 5段', toneClass: 'multimedia-feedback__badge--verb' });
  } else if (meta.isVerbe === 'irregulier' || meta.pos === 'verb_irregular') {
    badges.push({ label: 'Verbe Irrégulier', toneClass: 'multimedia-feedback__badge--verb' });
  }

  if (meta.transitivity === 'jidoushi') {
    badges.push({ label: '自動詞 (Intransitif)', toneClass: 'multimedia-feedback__badge--trans' });
  } else if (meta.transitivity === 'tadoushi') {
    badges.push({ label: '他動詞 (Transitif)', toneClass: 'multimedia-feedback__badge--trans' });
  }

  if (meta.isAdj === 'i' || meta.pos === 'adj_i') {
    badges.push({ label: 'Adj -い', toneClass: 'multimedia-feedback__badge--adj' });
  } else if (meta.isAdj === 'na' || meta.pos === 'adj_na') {
    badges.push({ label: 'Adj -な', toneClass: 'multimedia-feedback__badge--adj' });
  }

  if (meta.isKeigo?.[0]) {
    badges.push({ label: 'Keigo 尊敬語', toneClass: 'multimedia-feedback__badge--keigo' });
  }
  if (meta.isKeigo?.[1]) {
    badges.push({ label: 'Keigo 謙譲語', toneClass: 'multimedia-feedback__badge--keigo' });
  }
  if (meta.sotoUchi === 'soto') {
    badges.push({ label: 'Soto (外)', toneClass: 'multimedia-feedback__badge--soto' });
  } else if (meta.sotoUchi === 'uchi') {
    badges.push({ label: 'Uchi (内)', toneClass: 'multimedia-feedback__badge--uchi' });
  }

  if (meta.dualisme === 1) {
    badges.push({ label: 'Nuance +', toneClass: 'multimedia-feedback__badge--pos' });
  } else if (meta.dualisme === -1) {
    badges.push({ label: 'Nuance −', toneClass: 'multimedia-feedback__badge--neg' });
  }

  if (typeof meta.strokes === 'number' && meta.strokes > 0) {
    badges.push({ label: `${meta.strokes} traits`, toneClass: 'multimedia-feedback__badge--neutral' });
  }

  return badges;
}

export function MultimediaFeedbackCard({
  itemKey,
  itemType,
  reading,
  meta,
  compact = false,
}: MultimediaFeedbackCardProps) {
  const [showStrokes, setShowStrokes] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  const badges = buildMetadataBadges(meta);
  const isSingleKanji = itemType === 'KANJI' && Array.from(itemKey).length === 1;
  const audioTarget = meta?.audioText || reading || itemKey;

  const handlePlayAudio = () => {
    setSpeechNotice(null);
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechNotice('Synthèse vocale indisponible dans cet environnement.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(audioTarget);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.92;
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeechNotice('Lecture audio impossible pour cet item.');
    }
  };

  return (
    <div className={`multimedia-feedback ${compact ? 'multimedia-feedback--compact' : ''}`}>
      <div className="multimedia-feedback__row">
        <SpriteThumbnail
          itemKey={itemKey}
          fallbackLabel={itemKey}
          images={meta?.images}
          size={compact ? 48 : 64}
        />

        <div className="multimedia-feedback__main">
          <div className="multimedia-feedback__header">
            <div className="multimedia-feedback__title-group">
              <span className="multimedia-feedback__item-key" lang="ja">
                {itemKey}
              </span>
              {reading && (
                <span className="multimedia-feedback__reading" lang="ja">
                  [{reading}]
                </span>
              )}
            </div>

            <div className="multimedia-feedback__controls">
              <button
                type="button"
                onClick={handlePlayAudio}
                className="multimedia-feedback__btn"
                title="Écouter la prononciation japonaise"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Audio JA</span>
              </button>

              {isSingleKanji && (
                <button
                  type="button"
                  onClick={() => setShowStrokes((v) => !v)}
                  className="multimedia-feedback__btn multimedia-feedback__btn--strokes"
                >
                  <Brush className="w-3.5 h-3.5" />
                  <span>{showStrokes ? 'Masquer traits' : 'Ordre des traits'}</span>
                </button>
              )}
            </div>
          </div>

          {badges.length > 0 ? (
            <div className="multimedia-feedback__badges">
              {badges.map((b) => (
                <span key={b.label} className={`multimedia-feedback__badge ${b.toneClass}`}>
                  {b.label}
                </span>
              ))}
            </div>
          ) : (
            <p className="multimedia-feedback__fallback-meta">
              <Sparkles className="w-3.5 h-3.5 inline mr-1" />
              Fiche multimédia reliée au référentiel lexical hors-ligne.
            </p>
          )}

          {speechNotice && <p className="multimedia-feedback__notice">{speechNotice}</p>}
        </div>
      </div>

      {isSingleKanji && showStrokes && (
        <div className="multimedia-feedback__strokes-panel">
          <KanjiStrokeSvg kanji={itemKey} strokeSvgCode={meta?.strokeSvgCode} size={132} />
        </div>
      )}
    </div>
  );
}
