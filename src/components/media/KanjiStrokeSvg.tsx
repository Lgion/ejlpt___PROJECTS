'use client';

import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export interface KanjiStrokeSvgProps {
  kanji: string;
  strokeSvgCode?: string;
  size?: number;
}

export function getKanjiVgCode(kanji: string, explicitCode?: string): string {
  if (explicitCode && /^[0-9a-f]{4,6}$/i.test(explicitCode)) {
    return explicitCode.toLowerCase().padStart(5, '0');
  }
  const cp = kanji.codePointAt(0);
  if (!cp) return '';
  return cp.toString(16).padStart(5, '0');
}

export function KanjiStrokeSvg({
  kanji,
  strokeSvgCode,
  size = 180,
}: KanjiStrokeSvgProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [playTick, setPlayTick] = useState(0);

  const code = getKanjiVgCode(kanji, strokeSvgCode);

  useEffect(() => {
    if (!code) {
      queueMicrotask(() => setStatus('fallback'));
      return;
    }
    let active = true;
    queueMicrotask(() => {
      setStatus('loading');
      setPaths([]);
    });

    const url = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${code}.svg`;
    fetch(url)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('SVG unavailable'))))
      .then((svgText) => {
        if (!active) return;
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const extracted = Array.from(doc.querySelectorAll('path[d]'))
          .map((el) => el.getAttribute('d') || '')
          .filter(Boolean);
        if (extracted.length > 0) {
          setPaths(extracted);
          setStatus('ready');
        } else {
          setStatus('fallback');
        }
      })
      .catch(() => {
        if (active) setStatus('fallback');
      });

    return () => {
      active = false;
    };
  }, [code]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{ width: `${size}px`, height: `${size}px` }}
        className="relative flex items-center justify-center rounded-2xl border border-slate-700 bg-slate-950/90 p-3"
      >
        {/* Crosshair guide */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-20">
          <div className="h-full w-px bg-sky-400" />
          <div className="absolute h-px w-full bg-sky-400" />
        </div>

        {status === 'ready' ? (
          <svg
            key={`${code}-${playTick}`}
            viewBox="0 0 109 109"
            className="h-full w-full"
            aria-label={`Ordre des traits KanjiVG pour ${kanji}`}
          >
            {paths.map((d, idx) => (
              <path
                key={idx}
                d={d}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={100}
                strokeDasharray="100"
                strokeDashoffset="100"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="100"
                  to="0"
                  dur="0.45s"
                  begin={`${idx * 0.38}s`}
                  fill="freeze"
                />
              </path>
            ))}
          </svg>
        ) : (
          <span className="font-serif text-6xl text-slate-200 select-none">{kanji}</span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        {status === 'ready' ? (
          <>
            <span>{paths.length} trait(s) • KanjiVG</span>
            <button
              type="button"
              onClick={() => setPlayTick((t) => t + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rejouer</span>
            </button>
          </>
        ) : status === 'loading' ? (
          <span>Chargement du tracé KanjiVG…</span>
        ) : (
          <span>Tracé hors-ligne indisponible (code {code})</span>
        )}
      </div>
    </div>
  );
}
