'use client';

import React, { useMemo, useState } from 'react';
import { toRomaji } from 'wanakana';
import type { UnifiedKanjiRecord } from '@/lib/db';
import type { RadicalEntry } from '@/components/kanji/KanjiFilterBar';
import { getAllFrequencyEntries, normalizeRadicalGlyph } from '@/lib/kanjiRadicals';
import { computeKanjiFrequencyScore10 } from '@/lib/frequencyScale';
import { useVisualSystem } from '@/context/VisualSystemContext';
import { VisualLegendBar } from '@/components/visual/VisualLegendBar';
import { SpriteThumbnail } from '@/components/media/SpriteThumbnail';
import { KanjiStrokeSvg } from '@/components/media/KanjiStrokeSvg';
import { KanjiModal } from '@/components/kanji/KanjiModal';
import { KanjiSameReadingModal } from '@/components/kanji/KanjiSameReadingModal';
import { KanjiRelationsNav } from '@/components/kanji/KanjiRelationsNav';
import { CascadingKanjiTree } from '@/components/custom-components/CascadingKanjiTree';
import { KanjiCanvasComponent } from '@/components/custom-components/KanjiCanvasComponent';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Network,
  PenTool,
  MoreHorizontal,
} from 'lucide-react';

interface KanjiDetailSidebarProps {
  kanji: UnifiedKanjiRecord;
  radicalInfo?: RadicalEntry;
  componentKeys: string[];
  fontClass: string;
  isAnimatingStrokes: boolean;
  isBookmarked: boolean;
  meanings: string[];
  onPlayAnimation: () => void;
  onToggleBookmark: () => void;
  onSelectKanji: (char: string) => void;
  onFilterByRadical?: (rawRadical: string) => void;
}

type ActiveKanjiModal =
  | null
  | { kind: 'radical' }
  | { kind: 'reading'; mode: 'on' | 'kun'; reading: string }
  | { kind: 'frequencies' }
  | { kind: 'tree' }
  | { kind: 'canvas' }
  | { kind: 'stroke' };

function getJouyouBadge(grade: number | string | undefined): { label: string; title: string } | null {
  const num = typeof grade === 'number' ? grade : Number(grade);
  if (!Number.isFinite(num) || num <= 0) return null;
  if (num <= 6) {
    return { label: `J${num}`, title: `Jōyō Primaire — Année ${num}` };
  }
  if (num === 8) {
    return { label: 'Jōyō', title: 'Jōyō Secondaire' };
  }
  if (num === 9 || num === 10) {
    return { label: 'Jin', title: 'Jinmeiyō (Prénoms)' };
  }
  return null;
}

export function KanjiDetailSidebar({
  kanji,
  radicalInfo,
  componentKeys,
  fontClass,
  isAnimatingStrokes,
  isBookmarked,
  meanings,
  onPlayAnimation,
  onToggleBookmark,
  onSelectKanji,
  onFilterByRadical,
}: KanjiDetailSidebarProps) {
  const [activeModal, setActiveModal] = useState<ActiveKanjiModal>(null);
  const [freqHovered, setFreqHovered] = useState(false);
  const { adaptiveProfile } = useVisualSystem();

  const jouyou = getJouyouBadge(kanji.grade);
  const radicalGlyph = normalizeRadicalGlyph(kanji.radical);
  const hasSkip = Boolean(kanji.skipCode && kanji.skipCode !== '0-0-0');
  const rtkFrame = kanji.rtk_6th || kanji.rtk_5th;

  const extraComponents = useMemo(() => {
    const seen = new Set<string>([radicalGlyph]);
    const list: string[] = [];
    for (const raw of componentKeys) {
      const norm = normalizeRadicalGlyph(raw);
      if (norm && norm !== '?' && !seen.has(norm)) {
        seen.add(norm);
        list.push(raw);
      }
    }
    return list;
  }, [componentKeys, radicalGlyph]);

  const frequencyEntries = useMemo(
    () => getAllFrequencyEntries(kanji.frequencies),
    [kanji.frequencies]
  );
  const topFrequency = frequencyEntries[0] || null;
  const freqScore10 =
    kanji.frequencyScore10 ?? computeKanjiFrequencyScore10(kanji.frequencies);

  const categoryBadgeValue =
    kanji.subCategory && kanji.subCategory !== '-'
      ? kanji.subCategory
      : kanji.category && kanji.category !== '-'
        ? kanji.category
        : null;

  const handleSelectAndClose = (ch: string) => {
    setActiveModal(null);
    onSelectKanji(ch);
  };

  return (
    <section className="kanji-detail">
      <div className="mb-3">
        <VisualLegendBar compact />
      </div>

      <div className="kanji-tile">
        {/* TOP PERIMETER BAR: Numeric data (SKIP, strokes, RTK) + Combined Levels Cell */}
        <div className="kanji-tile__top-bar">
          <div className="kanji-tile__top-nums">
            {hasSkip && (
              <span className="kanji-tile__num-chip" title="Code SKIP">
                {kanji.skipCode}
              </span>
            )}
            <span className="kanji-tile__num-chip" title="Nombre de traits">
              {kanji.strokes || '?'}t
            </span>
            {rtkFrame && (
              <span
                className="kanji-tile__num-chip kanji-tile__num-chip--rtk"
                title="Fiche Heisig Remembering the Kanji"
              >
                RTK #{rtkFrame}
              </span>
            )}
          </div>

          <div
            className="kanji-tile__level-cell"
            title={`${kanji.jlpt}${jouyou ? ` • ${jouyou.title}` : ''}${kanji.wanikani_level ? ` • WaniKani Niveau ${kanji.wanikani_level}` : ''
              }`}
          >
            <span className="kanji-tile__jlpt-badge">{kanji.jlpt}</span>
            {jouyou && <span className="kanji-tile__jouyou-badge">{jouyou.label}</span>}
            {kanji.wanikani_level && (
              <span className="kanji-tile__wk-badge">WK{kanji.wanikani_level}</span>
            )}
          </div>
        </div>

        {/* MAIN ROW: Kanji Stage + Right Rail (Radical & Clés + Interactive On/Kun Pills) */}
        <div className="kanji-tile__main">
          <div className="kanji-tile__stage">
            <div className="kanji-tile__crosshair" />

            <span
              className={`kanji-tile__glyph ${fontClass} ${isAnimatingStrokes ? 'kanji-tile__glyph--animating' : ''
                }`}
            >
              {kanji.kanji}
            </span>

            {/* Bottom-left 4 Action Buttons: Play | Bookmark | KanjiTree Modal | Canvas Modal */}
            <div className="kanji-tile__stage-actions">
              <button
                type="button"
                onClick={() => {
                  onPlayAnimation();
                  setActiveModal({ kind: 'stroke' });
                }}
                title="Animation d'ordre des traits (KanjiVG)"
                aria-label="Aperçu Visuel et Ordre des traits"
                className="kanji-tile__icon-btn kanji-tile__icon-btn--play"
              >
                <Play className="kanji-tile__icon-svg" />
              </button>
              <button
                type="button"
                onClick={onToggleBookmark}
                title={isBookmarked ? 'Retirer des favoris' : 'Sauver dans le carnet'}
                aria-label={isBookmarked ? 'Favori' : 'Sauver'}
                className={`kanji-tile__icon-btn ${isBookmarked ? 'kanji-tile__icon-btn--saved' : ''
                  }`}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="kanji-tile__icon-svg" />
                ) : (
                  <Bookmark className="kanji-tile__icon-svg" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal({ kind: 'tree' })}
                title="Arbre de filiation & décomposition"
                aria-label="Ouvrir l'arbre de filiation"
                className="kanji-tile__icon-btn"
              >
                <Network className="kanji-tile__icon-svg" />
              </button>
              <button
                type="button"
                onClick={() => setActiveModal({ kind: 'canvas' })}
                title="Pratique d'écriture manuscrite"
                aria-label="Ouvrir le canvas d'écriture"
                className="kanji-tile__icon-btn"
              >
                <PenTool className="kanji-tile__icon-svg" />
              </button>
            </div>
          </div>

          <div className="kanji-tile__right-rail">
            {/* Clés / Radical (no stroke count outside!) */}
            <div className="kanji-tile__keys-section">
              <span className="kanji-tile__rail-label">Clés / Radical</span>
              <div className="kanji-tile__keys-row">
                <button
                  type="button"
                  onClick={() => setActiveModal({ kind: 'radical' })}
                  title={`Radical : ${kanji.radical_name_en}${radicalInfo?.reading_j ? ` (${radicalInfo.reading_j})` : ''
                    } — cliquer pour détails`}
                  className="kanji-tile__key-btn kanji-tile__key-btn--radical"
                >
                  {radicalGlyph}
                </button>
                {extraComponents.map((comp) => (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => onSelectKanji(comp)}
                    title={`Composant « ${comp} » — cliquer pour inspecter`}
                    className="kanji-tile__key-btn"
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>

            {/* Bordered & Tinted Reading Pills (no "音:" / "訓:" prefix!) */}
            <div className="kanji-tile__readings-rail">
              {kanji.on_readings.length > 0 && (
                <div className="kanji-tile__reading-group">
                  {kanji.on_readings.map((r, idx) => (
                    <button
                      key={`on-${r}-${idx}`}
                      type="button"
                      onClick={() =>
                        setActiveModal({ kind: 'reading', mode: 'on', reading: r })
                      }
                      title={`Voir tous les kanjis avec la lecture On « ${r} »`}
                      className="kanji-tile__reading-pill kanji-tile__reading-pill--on"
                    >
                      {r}
                      {adaptiveProfile === 'beginner' && (
                        <span className="ml-1 text-[10px] opacity-75">({toRomaji(r)})</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {kanji.kun_readings.length > 0 && (
                <div className="kanji-tile__reading-group">
                  {kanji.kun_readings.map((k, idx) => (
                    <button
                      key={`kun-${k}-${idx}`}
                      type="button"
                      onClick={() =>
                        setActiveModal({ kind: 'reading', mode: 'kun', reading: k })
                      }
                      title={`Voir tous les kanjis avec la lecture Kun « ${k} »`}
                      className="kanji-tile__reading-pill kanji-tile__reading-pill--kun"
                    >
                      {k}
                      {adaptiveProfile === 'beginner' && (
                        <span className="ml-1 text-[10px] opacity-75">
                          ({toRomaji(k.replace('.', ''))})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OUTER SECTION: Meanings, Single Value Badge, Nanori + Outer Top Frequency & 3-Dots Modal */}
      <div className="kanji-detail__summary">
        <div className="kanji-detail__summary-top">
          <div className="kanji-detail__meanings-group">
            {meanings.length > 0 && (
              <div className="kanji-detail__meanings-text">{meanings.join(', ')}</div>
            )}
            <div className="kanji-detail__badges-row">
              <SpriteThumbnail
                itemKey={`kanji:${kanji.kanji}`}
                fallbackLabel={kanji.kanji}
                images={kanji.images}
                size={40}
              />
              <span
                className="kanji-detail__meta-chip"
                title="Fréquence normalisée sur une échelle de 1 (rare) à 10 (très courant)"
              >
                Fréq. {freqScore10}/10
              </span>
              {categoryBadgeValue && (
                <span
                  className="kanji-detail__meta-chip"
                  title={kanji.category && kanji.category !== '-' ? kanji.category : undefined}
                >
                  {categoryBadgeValue}
                </span>
              )}
              {kanji.dualisme !== 0 && (
                <span className="kanji-detail__meta-chip">
                  {kanji.dualisme > 0 ? '+ Positif' : '− Négatif'}
                </span>
              )}
              {kanji.sotoUchi && kanji.sotoUchi !== 'neutral' && (
                <span className="kanji-detail__meta-chip">
                  {kanji.sotoUchi === 'soto' ? '外 Soto' : '内 Uchi'}
                </span>
              )}
              {kanji.isKeigo && (kanji.isKeigo[0] || kanji.isKeigo[1]) && (
                <span className="kanji-detail__meta-chip">
                  {kanji.isKeigo[0] ? '尊敬語' : ''} {kanji.isKeigo[1] ? '謙譲語' : ''}
                </span>
              )}
              {kanji.isVerbe !== 'false' && kanji.isVerbe && (
                <span className="kanji-detail__meta-chip">V:{kanji.isVerbe}</span>
              )}
              {kanji.isAdj !== 'false' && kanji.isAdj && (
                <span className="kanji-detail__meta-chip">Adj-{kanji.isAdj}</span>
              )}
              {kanji.rtk_keyword_6th && (
                <span
                  className="kanji-detail__meta-chip kanji-detail__meta-chip--rtk"
                  title="Mot-clé mnémonique Heisig (Remembering the Kanji)"
                >
                  « {kanji.rtk_keyword_6th} »
                </span>
              )}
              {kanji.nanori && kanji.nanori.length > 0 && adaptiveProfile !== 'beginner' && (
                <span className="kanji-detail__meta-chip kanji-detail__meta-chip--nanori" title="Nanori (Prénoms / Lieux)">
                  名 {kanji.nanori.join(', ')}
                </span>
              )}
            </div>
            {adaptiveProfile === 'advanced' && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                {kanji.compositionsSKIP && kanji.compositionsSKIP.length > 0 && (
                  <span className="rounded-md border border-indigo-700/60 bg-indigo-950/40 px-2 py-0.5 text-indigo-200">
                    SKIP : {kanji.compositionsSKIP.join(' · ')}
                  </span>
                )}
                {kanji.encodage?.unicode && (
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5">
                    {kanji.encodage.unicode} / {kanji.encodage.jis || 'JIS —'}
                  </span>
                )}
                {kanji.classification && (
                  <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-0.5">
                    {kanji.classification}
                  </span>
                )}
              </div>
            )}
            {kanji.senseProbabilities && kanji.senseProbabilities.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
                {kanji.senseProbabilities.slice(0, 4).map((sp, sIdx) => (
                  <span
                    key={sIdx}
                    className="rounded-md border border-slate-700/80 bg-slate-900/70 px-2 py-0.5"
                  >
                    {sp.meaning} · <strong className="text-sky-300">{sp.percent}%</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {topFrequency && (
            <div
              className="kanji-detail__freq-wrap"
              onMouseEnter={() => setFreqHovered(true)}
              onMouseLeave={() => setFreqHovered(false)}
            >
              <span
                className="kanji-detail__freq-top"
                title={`Rang le plus populaire : ${topFrequency.label} #${topFrequency.rank}`}
              >
                {topFrequency.shortLabel} #{topFrequency.rank}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFreqHovered(false);
                  setActiveModal({ kind: 'frequencies' });
                }}
                aria-label="Afficher toutes les fréquences"
                title="Toutes les fréquences multi-corpus"
                className="kanji-detail__freq-more-btn"
              >
                <MoreHorizontal className="kanji-detail__freq-more-icon" />
              </button>

              {freqHovered && (
                <div role="tooltip" className="kanji-detail__freq-popover">
                  <div className="kanji-detail__freq-popover-title">Fréquences ({kanji.kanji})</div>
                  {frequencyEntries.map((f) => (
                    <div
                      key={f.id}
                      className={`kanji-detail__freq-popover-row ${f.isTop ? 'kanji-detail__freq-popover-row--top' : ''
                        }`}
                    >
                      <span>{f.label}</span>
                      <span className="kanji-detail__freq-popover-rank">
                        #{f.rank}
                        {f.detail ? ` (${f.detail})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM HORIZONTAL NAVIGATION MENU (Compounds / Similar / Synonyms / Antonyms / Homonyms / Variants) */}
      <KanjiRelationsNav
        kanji={kanji}
        fontClass={fontClass}
        onSelectKanji={onSelectKanji}
      />

      {/* MODALS */}
      <KanjiModal
        open={activeModal?.kind === 'radical'}
        title={`Radical ${radicalGlyph} — ${kanji.radical_name_en || ''}`}
        subtitle={radicalInfo?.reading_j ? `${radicalInfo.reading_j} (${radicalInfo.reading_r})` : undefined}
        size="sm"
        onClose={() => setActiveModal(null)}
      >
        <div className="kanji-modal__radical-detail">
          <div className="kanji-modal__radical-hero">
            <span className={`kanji-modal__radical-glyph ${fontClass}`}>{radicalGlyph}</span>
            <div className="kanji-modal__radical-info">
              <div className="kanji-modal__radical-meaning">
                {radicalInfo?.meaning || kanji.radical_name_en}
              </div>
              <div className="kanji-modal__radical-tags">
                <span className="kanji-modal__radical-pill">
                  {radicalInfo?.strokes ?? '?'} trait{(radicalInfo?.strokes ?? 0) > 1 ? 's' : ''}
                </span>
                {radicalInfo?.position_j && (
                  <span className="kanji-modal__radical-pill">
                    Position : {radicalInfo.position_j}
                  </span>
                )}
              </div>
            </div>
          </div>

          {onFilterByRadical && kanji.radical && (
            <button
              type="button"
              onClick={() => {
                onFilterByRadical(kanji.radical);
                setActiveModal(null);
              }}
              className="kanji-modal__filter-btn"
            >
              Filtrer les kanjis contenant ce radical
            </button>
          )}
        </div>
      </KanjiModal>

      <KanjiModal
        open={activeModal?.kind === 'reading'}
        title={
          activeModal?.kind === 'reading'
            ? `Kanjis partageant la lecture ${activeModal.mode === 'on' ? 'On' : 'Kun'
            }`
            : ''
        }
        size="md"
        onClose={() => setActiveModal(null)}
      >
        {activeModal?.kind === 'reading' && (
          <KanjiSameReadingModal
            mode={activeModal.mode}
            reading={activeModal.reading}
            currentChar={kanji.kanji}
            fontClass={fontClass}
            onSelectKanji={handleSelectAndClose}
          />
        )}
      </KanjiModal>

      <KanjiModal
        open={activeModal?.kind === 'frequencies'}
        title={`Fréquences multi-corpus — ${kanji.kanji}`}
        subtitle="Classement du plus fréquent (#1) au plus rare"
        size="sm"
        onClose={() => setActiveModal(null)}
      >
        <div className="kanji-modal__freq-list">
          {frequencyEntries.map((f) => (
            <div
              key={f.id}
              className={`kanji-modal__freq-row ${f.isTop ? 'kanji-modal__freq-row--top' : ''
                }`}
            >
              <span>{f.label}</span>
              <span className="kanji-modal__freq-val">
                #{f.rank}
                {f.detail ? ` • ${f.detail}` : ''}
              </span>
            </div>
          ))}
        </div>
      </KanjiModal>

      <KanjiModal
        open={activeModal?.kind === 'tree'}
        title={`Arbre de Filiation & Décomposition — ${kanji.kanji}`}
        subtitle="Graphe dynamique des composants (composition.json)"
        size="lg"
        onClose={() => setActiveModal(null)}
      >
        {activeModal?.kind === 'tree' && (
          <CascadingKanjiTree targetKanji={kanji.kanji} embeddedInModal />
        )}
      </KanjiModal>

      <KanjiModal
        open={activeModal?.kind === 'canvas'}
        title={`Pratique d'Écriture Manuscrite — ${kanji.kanji}`}
        subtitle={`${kanji.strokes || '?'} trait${(kanji.strokes || 0) > 1 ? 's' : ''} attendus`}
        size="sm"
        onClose={() => setActiveModal(null)}
      >
        {activeModal?.kind === 'canvas' && (
          <div className="kanji-modal__canvas-wrap">
            <KanjiCanvasComponent
              expectedKanji={kanji.kanji}
              expectedStrokeCount={kanji.strokes}
            />
          </div>
        )}
      </KanjiModal>

      <KanjiModal
        open={activeModal?.kind === 'stroke'}
        title={`Ordre des traits KanjiVG — ${kanji.kanji}`}
        subtitle="Animation vectorielle des traits (source libre KanjiVG)"
        size="sm"
        onClose={() => setActiveModal(null)}
      >
        {activeModal?.kind === 'stroke' && (
          <div className="flex justify-center py-2">
            <KanjiStrokeSvg kanji={kanji.kanji} strokeSvgCode={kanji.strokeSvgCode} />
          </div>
        )}
      </KanjiModal>
    </section>
  );
}
