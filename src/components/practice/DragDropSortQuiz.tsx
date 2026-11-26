'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  GripVertical,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { recordErrorToSRS } from '@/lib/srs';
import {
  evaluateBucketSort,
  evaluateSentenceOrder,
  ICHIDAN_GODAN_ITEMS,
  SENTENCE_ORDER_PUZZLES,
  TRANSITIVITY_ITEMS,
  type SortableQuizItem,
} from '@/data/dragDropQuizSeed';

type DndMode = 'sentence_order' | 'ichidan_godan' | 'transitivity';

const BUCKET_DEFS: Record<'ichidan_godan' | 'transitivity', Array<{ id: string; label: string; hint: string }>> = {
  ichidan_godan: [
    { id: 'ichidan', label: '1段 (Ichidan)', hint: 'Radical invariable (-eru / -iru)' },
    { id: 'godan', label: '5段 (Godan)', hint: 'Consonne variable (attention aux pièges -る)' },
    { id: 'irregular', label: 'Irréguliers (不規則)', hint: 'する・来る' },
  ],
  transitivity: [
    { id: 'jidoushi', label: '自動詞 (Intransitif)', hint: 'État / mouvement sans agent (〜が)' },
    { id: 'tadoushi', label: '他動詞 (Transitif)', hint: 'Action volontaire sur un objet (〜を)' },
  ],
};

export function DragDropSortQuiz() {
  const [dndMode, setDndMode] = useState<DndMode>('sentence_order');

  // Sentence Order state
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const currentPuzzle = SENTENCE_ORDER_PUZZLES[puzzleIdx % SENTENCE_ORDER_PUZZLES.length];
  const [placedTokens, setPlacedTokens] = useState<string[]>([]);
  const [orderChecked, setOrderChecked] = useState(false);

  // Bucket Sort state
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [sortChecked, setSortChecked] = useState(false);
  const [draggedToken, setDraggedToken] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const activeItems: SortableQuizItem[] = useMemo(() => {
    return dndMode === 'transitivity' ? TRANSITIVITY_ITEMS : ICHIDAN_GODAN_ITEMS;
  }, [dndMode]);

  const unplacedTokens = useMemo(() => {
    const remaining = [...currentPuzzle.tokens];
    for (const token of placedTokens) {
      const idx = remaining.indexOf(token);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    return remaining;
  }, [currentPuzzle, placedTokens]);

  const unplacedSortItems = useMemo(
    () => activeItems.filter((item) => !placements[item.id]),
    [activeItems, placements]
  );

  const orderResult = useMemo(
    () => evaluateSentenceOrder(placedTokens, currentPuzzle.correctOrder),
    [placedTokens, currentPuzzle]
  );

  const sortResult = useMemo(
    () => evaluateBucketSort(placements, activeItems),
    [placements, activeItems]
  );

  const switchMode = (next: DndMode) => {
    setDndMode(next);
    setPlacedTokens([]);
    setOrderChecked(false);
    setPlacements({});
    setSelectedChipId(null);
    setSortChecked(false);
  };

  const handlePlaceToken = (token: string) => {
    if (orderChecked) return;
    setPlacedTokens((prev) => [...prev, token]);
  };

  const handleRemovePlacedToken = (idx: number) => {
    if (orderChecked) return;
    setPlacedTokens((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveToken = (idx: number, dir: -1 | 1) => {
    if (orderChecked) return;
    const target = idx + dir;
    if (target < 0 || target >= placedTokens.length) return;
    const next = [...placedTokens];
    const tmp = next[idx];
    next[idx] = next[target];
    next[target] = tmp;
    setPlacedTokens(next);
  };

  const handleCheckOrder = () => {
    setOrderChecked(true);
    if (!orderResult.isCorrect) {
      void recordErrorToSRS({
        cardId: `grammar:${currentPuzzle.id}`,
        itemType: 'GRAMMAR',
        itemKey: currentPuzzle.correctOrder.join(' '),
        level: currentPuzzle.level,
        prompt: `Remise en ordre : ${currentPuzzle.translationFr}`,
        answer: currentPuzzle.correctOrder.join(' '),
      });
    }
  };

  const handleAssignItemToBucket = (itemId: string, bucketId: string) => {
    if (sortChecked) return;
    setPlacements((prev) => ({ ...prev, [itemId]: bucketId }));
    setSelectedChipId(null);
  };

  const handleCheckSort = () => {
    setSortChecked(true);
    for (const item of activeItems) {
      if (placements[item.id] !== item.correctBucket) {
        void recordErrorToSRS({
          cardId: `jukugo:${item.text}`,
          itemType: 'JUKUGO',
          itemKey: item.text,
          level: item.level,
          prompt: `Catégorie de « ${item.text} » (${item.meaningFr})`,
          reading: item.reading,
          answer: item.hintFr,
        });
      }
    }
  };

  return (
    <section className="dnd-quiz">
      <div className="dnd-quiz__header">
        <div>
          <h2 className="dnd-quiz__title">Drag-and-Drop, Tri grammatical &amp; 1段 / 5段</h2>
          <p className="dnd-quiz__subtitle">
            Glissez-déposez les tuiles à la souris ou utilisez les clics / flèches accessibles au clavier.
          </p>
        </div>
        <div className="dnd-quiz__tabs">
          <button
            type="button"
            onClick={() => switchMode('sentence_order')}
            className={`dnd-quiz__tab ${dndMode === 'sentence_order' ? 'dnd-quiz__tab--active' : ''}`}
          >
            Remise en ordre ★
          </button>
          <button
            type="button"
            onClick={() => switchMode('ichidan_godan')}
            className={`dnd-quiz__tab ${dndMode === 'ichidan_godan' ? 'dnd-quiz__tab--active' : ''}`}
          >
            Tri 1段 / 5段 / Irr.
          </button>
          <button
            type="button"
            onClick={() => switchMode('transitivity')}
            className={`dnd-quiz__tab ${dndMode === 'transitivity' ? 'dnd-quiz__tab--active' : ''}`}
          >
            Tri 自動詞 / 他動詞
          </button>
        </div>
      </div>

      {dndMode === 'sentence_order' ? (
        <div className="dnd-quiz__body">
          <div className="dnd-quiz__meta-row">
            <span className="dnd-quiz__level-pill">JLPT {currentPuzzle.level}</span>
            <span className="dnd-quiz__translation">« {currentPuzzle.translationFr} »</span>
          </div>

          <div
            className="dnd-quiz__dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedToken) {
                handlePlaceToken(draggedToken);
                setDraggedToken(null);
              }
            }}
          >
            {placedTokens.length === 0 ? (
              <span className="dnd-quiz__placeholder">
                Déposez ici les segments dans le bon ordre (ou cliquez sur les tuiles ci-dessous)…
              </span>
            ) : (
              <div className="dnd-quiz__placed-list">
                {placedTokens.map((tok, idx) => {
                  const isSpotRight = orderChecked && currentPuzzle.correctOrder[idx] === tok;
                  return (
                    <div
                      key={`${tok}-${idx}`}
                      className={`dnd-quiz__placed-chip ${
                        orderChecked
                          ? isSpotRight
                            ? 'dnd-quiz__placed-chip--ok'
                            : 'dnd-quiz__placed-chip--wrong'
                          : ''
                      }`}
                    >
                      <button
                        type="button"
                        disabled={orderChecked || idx === 0}
                        onClick={() => handleMoveToken(idx, -1)}
                        aria-label={`Déplacer ${tok} vers la gauche`}
                        className="dnd-quiz__move-btn"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePlacedToken(idx)}
                        lang="ja"
                        className="dnd-quiz__token-text"
                        title="Cliquer pour retirer"
                      >
                        {tok}
                      </button>
                      <button
                        type="button"
                        disabled={orderChecked || idx === placedTokens.length - 1}
                        onClick={() => handleMoveToken(idx, 1)}
                        aria-label={`Déplacer ${tok} vers la droite`}
                        className="dnd-quiz__move-btn"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dnd-quiz__pool">
            {unplacedTokens.map((tok, idx) => (
              <button
                key={`${tok}-${idx}`}
                type="button"
                draggable={!orderChecked}
                onDragStart={() => setDraggedToken(tok)}
                onClick={() => handlePlaceToken(tok)}
                className="dnd-quiz__pool-chip"
                lang="ja"
              >
                <GripVertical className="w-3.5 h-3.5 opacity-60" />
                <span>{tok}</span>
              </button>
            ))}
          </div>

          <div className="dnd-quiz__actions">
            <button
              type="button"
              disabled={orderChecked || placedTokens.length !== currentPuzzle.correctOrder.length}
              onClick={handleCheckOrder}
              className="dnd-quiz__validate-btn"
            >
              Vérifier l’ordre
            </button>
            <button
              type="button"
              onClick={() => {
                setPlacedTokens([]);
                setOrderChecked(false);
              }}
              className="dnd-quiz__secondary-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPuzzleIdx((i) => i + 1);
                setPlacedTokens([]);
                setOrderChecked(false);
              }}
              className="dnd-quiz__secondary-btn"
            >
              <span>Phrase suivante</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {orderChecked && (
            <div
              aria-live="polite"
              className={`dnd-quiz__feedback ${
                orderResult.isCorrect ? 'dnd-quiz__feedback--ok' : 'dnd-quiz__feedback--wrong'
              }`}
            >
              <div className="font-bold">
                {orderResult.isCorrect
                  ? 'Ordre parfait !'
                  : `Réponse attendue : ${currentPuzzle.correctOrder.join(' ')} (${orderResult.correctPositions}/${orderResult.total} positions exactes)`}
              </div>
              <p className="text-xs mt-1 opacity-90">{currentPuzzle.grammarNote}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="dnd-quiz__body">
          <div className="dnd-quiz__pool">
            {unplacedSortItems.length === 0 ? (
              <span className="dnd-quiz__placeholder">
                Tous les verbes sont classés. Cliquez sur « Valider le tri » ci-dessous !
              </span>
            ) : (
              unplacedSortItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable={!sortChecked}
                  onDragStart={() => setDraggedItemId(item.id)}
                  onClick={() =>
                    setSelectedChipId((cur) => (cur === item.id ? null : item.id))
                  }
                  className={`dnd-quiz__pool-chip ${
                    selectedChipId === item.id ? 'dnd-quiz__pool-chip--selected' : ''
                  }`}
                >
                  <GripVertical className="w-3.5 h-3.5 opacity-60" />
                  <span lang="ja" className="font-bold">
                    {item.text}
                  </span>
                  <span className="text-xs opacity-75">({item.meaningFr})</span>
                </button>
              ))
            )}
          </div>

          <div className="dnd-quiz__buckets-grid">
            {BUCKET_DEFS[dndMode].map((bucket) => {
              const itemsInBucket = activeItems.filter((item) => placements[item.id] === bucket.id);
              return (
                <div
                  key={bucket.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedItemId) {
                      handleAssignItemToBucket(draggedItemId, bucket.id);
                      setDraggedItemId(null);
                    }
                  }}
                  onClick={() => {
                    if (selectedChipId) {
                      handleAssignItemToBucket(selectedChipId, bucket.id);
                    }
                  }}
                  className={`dnd-quiz__bucket ${
                    selectedChipId ? 'dnd-quiz__bucket--ready' : ''
                  }`}
                >
                  <div className="dnd-quiz__bucket-head">
                    <span className="dnd-quiz__bucket-title">{bucket.label}</span>
                    <span className="dnd-quiz__bucket-hint">{bucket.hint}</span>
                  </div>

                  <div className="dnd-quiz__bucket-items">
                    {itemsInBucket.map((item) => {
                      const ok = sortResult.perItem[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`dnd-quiz__bucket-card ${
                            sortChecked
                              ? ok
                                ? 'dnd-quiz__bucket-card--ok'
                                : 'dnd-quiz__bucket-card--wrong'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span lang="ja" className="font-bold">
                              {item.text} <small className="opacity-70">[{item.reading}]</small>
                            </span>
                            {sortChecked ? (
                              ok ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPlacements((prev) => {
                                    const copy = { ...prev };
                                    delete copy[item.id];
                                    return copy;
                                  });
                                }}
                                className="text-[11px] text-slate-400 hover:text-slate-100"
                              >
                                Retirer
                              </button>
                            )}
                          </div>
                          {sortChecked && !ok && (
                            <p className="text-[11px] text-rose-200 mt-1">{item.hintFr}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dnd-quiz__actions">
            <button
              type="button"
              disabled={sortChecked || Object.keys(placements).length < activeItems.length}
              onClick={handleCheckSort}
              className="dnd-quiz__validate-btn"
            >
              Valider le tri ({Object.keys(placements).length}/{activeItems.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setPlacements({});
                setSelectedChipId(null);
                setSortChecked(false);
              }}
              className="dnd-quiz__secondary-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser le tri</span>
            </button>
          </div>

          {sortChecked && (
            <div
              aria-live="polite"
              className={`dnd-quiz__feedback ${
                sortResult.correctCount === sortResult.total
                  ? 'dnd-quiz__feedback--ok'
                  : 'dnd-quiz__feedback--wrong'
              }`}
            >
              Score de catégorisation : {sortResult.correctCount} / {sortResult.total}. Les erreurs
              ont été ajoutées à votre file SRS pour révision.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
