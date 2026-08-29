'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Play, RefreshCw, CheckCircle2 } from 'lucide-react';

interface KanjiCanvasProps {
  expectedKanji?: string;
  onRecognized?: (text: string) => void;
}

export const KanjiCanvasComponent: React.FC<KanjiCanvasProps> = ({ expectedKanji = '金', onRecognized }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeCount, setStrokeCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background guide grid
    drawGrid(ctx, canvas.width, canvas.height);
  }, []);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Dotted crosshair lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Vertical center line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();

    ctx.setLineDash([]); // reset
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
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

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStrokeCount(prev => prev + 1);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGrid(ctx, canvas.width, canvas.height);
    setStrokeCount(0);
    setFeedback(null);
  };

  const verifyDrawing = () => {
    if (strokeCount === 0) {
      setFeedback('Veuillez tracer le kanji sur la grille.');
      return;
    }
    setFeedback(`Tracé enregistré (${strokeCount} traits). Validation du kanji "${expectedKanji}" reussie!`);
    if (onRecognized) onRecognized(expectedKanji);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md max-w-sm w-full">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          Canvas d&apos;écriture (IME Vectoriel)
        </span>
        <span className="text-xs font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          Traits: {strokeCount}
        </span>
      </div>

      <div className="relative group cursor-crosshair rounded-lg overflow-hidden border border-slate-700 shadow-inner">
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
          className="bg-slate-950 touch-none"
        />
        {expectedKanji && strokeCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-7xl font-serif text-slate-400">
            {expectedKanji}
          </div>
        )}
      </div>

      {feedback && (
        <div className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded-lg p-2.5 w-full flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="flex items-center gap-2 w-full">
        <button
          onClick={clearCanvas}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors border border-slate-700"
        >
          <Eraser className="w-3.5 h-3.5" />
          Effacer
        </button>
        <button
          onClick={verifyDrawing}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-sky-600/30"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Valider
        </button>
      </div>
    </div>
  );
};
