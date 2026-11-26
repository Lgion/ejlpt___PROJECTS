'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { localDb, seedLocalDatabase, type JLPTLevelNormalized, type UnifiedKanjiRecord } from '@/lib/db';
import { gradeSRSCard, recordErrorToSRS } from '@/lib/srs';
import { KanjiCanvasComponent } from '@/components/custom-components/KanjiCanvasComponent';
import { MultimediaFeedbackCard } from '@/components/practice/MultimediaFeedbackCard';

interface WritingTarget {
  kanji: string;
  jlpt: string;
  strokes: number | null;
  meaningFr: string;
  reading: string;
  radical: string;
  record?: UnifiedKanjiRecord;
}

const FALLBACK_WRITING_TARGETS: WritingTarget[] = [
  { kanji: '日', jlpt: 'N5', strokes: 4, meaningFr: 'soleil, jour', reading: 'ニチ • ひ', radical: '日' },
  { kanji: '月', jlpt: 'N5', strokes: 4, meaningFr: 'lune, mois', reading: 'ゲツ • つき', radical: '月' },
  { kanji: '木', jlpt: 'N5', strokes: 4, meaningFr: 'arbre, bois', reading: 'モク • き', radical: '木' },
  { kanji: '水', jlpt: 'N5', strokes: 4, meaningFr: 'eau', reading: 'スイ • みず', radical: '水' },
  { kanji: '火', jlpt: 'N5', strokes: 4, meaningFr: 'feu', reading: 'カ • ひ', radical: '火' },
  { kanji: '語', jlpt: 'N5', strokes: 14, meaningFr: 'mot, langue', reading: 'ゴ • かた.る', radical: '言' },
  { kanji: '飲', jlpt: 'N5', strokes: 12, meaningFr: 'boire', reading: 'イン • の.む', radical: '食' },
  { kanji: '駅', jlpt: 'N4', strokes: 14, meaningFr: 'gare', reading: 'エキ', radical: '馬' },
];

export function WritingGradedQuiz() {
  const [level, setLevel] = useState<string>('N5');
  const [examMode, setExamMode] = useState<boolean>(true);
  const [targets, setTargets] = useState<WritingTarget[]>(FALLBACK_WRITING_TARGETS);
  const [index, setIndex] = useState(0);
  const [validatedScore, setValidatedScore] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [resolvedCurrent, setResolvedCurrent] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const loadTargets = async () => {
      await seedLocalDatabase();
      const rows =
        level !== 'ALL'
          ? await localDb.kanjis.where('jlpt').equals(level as JLPTLevelNormalized).limit(30).toArray()
          : await localDb.kanjis.filter((k) => k.jlpt !== 'N0').limit(30).toArray();

      const valid = rows.filter((k) => (k.meanings_fr.length > 0 || k.meanings_en.length > 0) && k.strokes);
      if (active && valid.length >= 4) {
        setTargets(
          valid.slice(0, 12).map((k) => ({
            kanji: k.kanji,
            jlpt: k.jlpt,
            strokes: k.strokes,
            meaningFr: k.meanings_fr.slice(0, 2).join(', ') || k.meanings_en.slice(0, 2).join(', '),
            reading: [...k.on_readings.slice(0, 2), ...k.kun_readings.slice(0, 2)].join(' • '),
            radical: k.radical,
            record: k,
          }))
        );
        setIndex(0);
        setResolvedCurrent(false);
      }
    };
    void loadTargets();
    return () => {
      active = false;
    };
  }, [level]);

  const currentTarget = targets[index % targets.length] || FALLBACK_WRITING_TARGETS[0];

  const handleRecognized = async () => {
    if (resolvedCurrent) return;
    setResolvedCurrent(true);
    setValidatedScore((s) => s + 1);
    setAttemptedCount((a) => a + 1);
    const cardId = `kanji:${currentTarget.kanji}`;
    const existing = await localDb.srsCards.get(cardId);
    if (existing) {
      await gradeSRSCard(cardId, 3);
    }
  };

  const handleSkipOrFail = async () => {
    if (!resolvedCurrent) {
      setResolvedCurrent(true);
      setAttemptedCount((a) => a + 1);
      await recordErrorToSRS({
        cardId: `kanji:${currentTarget.kanji}`,
        itemType: 'KANJI',
        itemKey: currentTarget.kanji,
        level: currentTarget.jlpt,
        prompt: `Écrire le kanji pour « ${currentTarget.meaningFr} »`,
        reading: currentTarget.reading,
        answer: `${currentTarget.kanji} (${currentTarget.strokes ?? '?'} traits)`,
      });
    }
  };

  const handleNext = () => {
    setResolvedCurrent(false);
    setIndex((i) => i + 1);
  };

  return (
    <section className="writing-quiz">
      <div className="writing-quiz__header">
        <div>
          <h2 className="writing-quiz__title">Écriture Kanji Notée (Canvas &amp; Traits)</h2>
          <p className="writing-quiz__subtitle">
            Tracez le kanji demandé de mémoire (Mode Examen) puis vérifiez le nombre de traits et l’ordre KanjiVG.
          </p>
        </div>

        <div className="writing-quiz__controls">
          <select
            aria-label="Niveau JLPT écriture"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="writing-quiz__select"
          >
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
            <option value="ALL">Tous niveaux</option>
          </select>

          <button
            type="button"
            onClick={() => setExamMode((v) => !v)}
            className="writing-quiz__toggle-btn"
          >
            {examMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{examMode ? 'Mode Examen (modèle masqué)' : 'Guide affiché'}</span>
          </button>

          <span className="writing-quiz__score-pill">
            Validés : {validatedScore} / {attemptedCount}
          </span>
        </div>
      </div>

      <div className="writing-quiz__grid">
        <div className="writing-quiz__prompt-panel">
          <div className="writing-quiz__level-badge">
            {currentTarget.jlpt} • {currentTarget.strokes ?? '?'} traits • Radical {currentTarget.radical}
          </div>
          <div className="writing-quiz__meaning">« {currentTarget.meaningFr} »</div>
          <div className="writing-quiz__reading" lang="ja">
            Lectures : {currentTarget.reading || '—'}
          </div>

          <div className="writing-quiz__buttons">
            <button
              type="button"
              disabled={resolvedCurrent}
              onClick={() => void handleSkipOrFail()}
              className="writing-quiz__reveal-btn"
            >
              Révéler la solution (+ SRS)
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="writing-quiz__next-btn"
            >
              <span>Kanji suivant</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setValidatedScore(0);
                setAttemptedCount(0);
                setResolvedCurrent(false);
              }}
              className="writing-quiz__reset-btn"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {resolvedCurrent && (
            <div className="mt-4">
              <MultimediaFeedbackCard
                itemKey={currentTarget.kanji}
                itemType="KANJI"
                reading={currentTarget.reading}
                meta={{
                  kanji: currentTarget.kanji,
                  strokes: currentTarget.strokes,
                  strokeSvgCode: currentTarget.record?.strokeSvgCode,
                  frequencyScore10: currentTarget.record?.frequencyScore10,
                  images: currentTarget.record?.images,
                  jlpt: currentTarget.jlpt,
                }}
              />
            </div>
          )}
        </div>

        <div className="writing-quiz__canvas-wrap">
          <KanjiCanvasComponent
            expectedKanji={currentTarget.kanji}
            expectedStrokeCount={currentTarget.strokes}
            initialShowGuide={!examMode || resolvedCurrent}
            onRecognized={() => void handleRecognized()}
          />
        </div>
      </div>
    </section>
  );
}
