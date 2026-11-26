'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, Play, Undo2, Eye, CheckCircle2 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface KanjiCanvasProps {
  expectedKanji?: string;
  expectedStrokeCount?: number | null;
  initialShowGuide?: boolean;
  onRecognized?: (kanji: string) => void;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 6]);

  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();

  ctx.setLineDash([]);
}

function renderStrokes(ctx: CanvasRenderingContext2D, width: number, height: number, strokes: Point[][]) {
  drawGrid(ctx, width, height);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i += 1) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }
}

export const KanjiCanvasComponent: React.FC<KanjiCanvasProps> = ({
  expectedKanji = '語',
  expectedStrokeCount,
  initialShowGuide = true,
  onRecognized,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const currentStrokeRef = useRef<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [showGuide, setShowGuide] = useState(initialShowGuide);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderStrokes(ctx, canvas.width, canvas.height, strokesRef.current);
  }, []);

  useEffect(() => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    queueMicrotask(() => {
      setStrokeCount(0);
      setFeedback(null);
      setShowGuide(initialShowGuide);
    });
    redraw();
  }, [expectedKanji, initialShowGuide, redraw]);

  const getRelativePoint = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ): Point => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getRelativePoint(e, canvas);
    setIsDrawing(true);
    currentStrokeRef.current = [pt];

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getRelativePoint(e, canvas);
    currentStrokeRef.current.push(pt);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current.length > 0) {
      strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
      currentStrokeRef.current = [];
      setStrokeCount(strokesRef.current.length);
    }
  };

  const undoLastStroke = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current = strokesRef.current.slice(0, -1);
    setStrokeCount(strokesRef.current.length);
    setFeedback(null);
    redraw();
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setStrokeCount(0);
    setFeedback(null);
    redraw();
  };

  const verifyDrawing = () => {
    const strokes = strokesRef.current;
    if (strokes.length === 0) {
      setFeedback({ ok: false, text: 'Veuillez tracer le kanji sur la grille avant de valider.' });
      return;
    }

    const allPoints = strokes.flat();
    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);

    if (spanX < 25 && spanY < 25) {
      setFeedback({
        ok: false,
        text: 'Le tracé est trop petit : occupez davantage la grille pour valider la forme.',
      });
      return;
    }

    if (expectedStrokeCount && expectedStrokeCount > 0) {
      const diff = Math.abs(strokes.length - expectedStrokeCount);
      if (diff === 0) {
        setFeedback({
          ok: true,
          text: `Parfait ! ${strokes.length}/${expectedStrokeCount} traits exacts pour « ${expectedKanji} ».`,
        });
        onRecognized?.(expectedKanji);
        return;
      }
      if (diff <= 2) {
        setFeedback({
          ok: true,
          text: `Tracé enregistré (${strokes.length} traits tracés vs ${expectedStrokeCount} attendus pour « ${expectedKanji} »).`,
        });
        onRecognized?.(expectedKanji);
        return;
      }
      setFeedback({
        ok: false,
        text: `Nombre de traits éloigné : ${strokes.length} tracés pour ${expectedStrokeCount} attendus (« ${expectedKanji} »).`,
      });
      return;
    }

    setFeedback({
      ok: true,
      text: `Tracé enregistré (${strokes.length} traits) pour « ${expectedKanji} ».`,
    });
    onRecognized?.(expectedKanji);
  };

  return (
    <div className="kanji-canvas">
      <div className="kanji-canvas__head">
        <span className="kanji-canvas__title">
          <span className="kanji-canvas__dot" />
          Canvas d&apos;écriture
        </span>
        <div className="kanji-canvas__badges">
          <button
            type="button"
            onClick={() => setShowGuide((g) => !g)}
            className={`kanji-canvas__guide-btn ${
              showGuide ? 'kanji-canvas__guide-btn--active' : ''
            }`}
          >
            <Eye className="kanji-canvas__guide-icon" />
            Guide
          </button>
          <span className="kanji-canvas__strokes-pill">
            Traits: {strokeCount}
            {expectedStrokeCount ? ` / ${expectedStrokeCount}` : ''}
          </span>
        </div>
      </div>

      <div className="kanji-canvas__stage">
        <canvas
          ref={canvasRef}
          width={280}
          height={280}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="kanji-canvas__surface"
        />
        {expectedKanji && showGuide && (
          <div className="kanji-canvas__ghost">{expectedKanji}</div>
        )}
      </div>

      {feedback && (
        <div
          aria-live="polite"
          className={`kanji-canvas__feedback ${
            feedback.ok ? 'kanji-canvas__feedback--ok' : 'kanji-canvas__feedback--warn'
          }`}
        >
          <CheckCircle2 className="kanji-canvas__feedback-icon" />
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="kanji-canvas__actions">
        <button
          type="button"
          onClick={undoLastStroke}
          disabled={strokeCount === 0}
          className="kanji-canvas__undo-btn"
        >
          <Undo2 className="kanji-canvas__btn-icon" />
          Annuler
        </button>
        <button type="button" onClick={clearCanvas} className="kanji-canvas__clear-btn">
          <Eraser className="kanji-canvas__btn-icon" />
          Effacer
        </button>
        <button type="button" onClick={verifyDrawing} className="kanji-canvas__validate-btn">
          <Play className="kanji-canvas__btn-icon kanji-canvas__btn-icon--fill" />
          Valider
        </button>
      </div>
    </div>
  );
};
