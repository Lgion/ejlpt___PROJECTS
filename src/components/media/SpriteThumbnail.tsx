'use client';

import React, { useEffect, useState } from 'react';
import type { SpriteImageRef } from '@/lib/db';
import { computeSpriteCssStyle } from '@/lib/frequencyScale';

interface SpriteManifest {
  version: number;
  cellSize: number;
  cols: number;
  rows: number;
  sheets: Record<
    string,
    {
      url: string;
      cols: number;
      rows: number;
      count: number;
    }
  >;
  items: Record<string, SpriteImageRef[]>;
}

let cachedManifest: SpriteManifest | null = null;
let manifestPromise: Promise<SpriteManifest | null> | null = null;

async function fetchSpriteManifest(): Promise<SpriteManifest | null> {
  if (cachedManifest) return cachedManifest;
  if (manifestPromise) return manifestPromise;

  manifestPromise = fetch('/sprites/manifest.json')
    .then((res) => (res.ok ? (res.json() as Promise<SpriteManifest>) : null))
    .then((data) => {
      if (data && data.sheets && data.items) {
        cachedManifest = data;
      }
      return cachedManifest;
    })
    .catch(() => null)
    .finally(() => {
      manifestPromise = null;
    });

  return manifestPromise;
}

export interface SpriteThumbnailProps {
  itemKey: string;
  fallbackLabel: string;
  images?: SpriteImageRef[];
  size?: number;
  className?: string;
}

export function SpriteThumbnail({
  itemKey,
  fallbackLabel,
  images,
  size = 56,
  className = '',
}: SpriteThumbnailProps) {
  const [manifest, setManifest] = useState<SpriteManifest | null>(cachedManifest);

  useEffect(() => {
    if (manifest) return;
    let active = true;
    void fetchSpriteManifest().then((m) => {
      if (active && m) setManifest(m);
    });
    return () => {
      active = false;
    };
  }, [manifest]);

  const refList = images && images.length > 0 ? images : manifest?.items[itemKey];
  const primaryRef = refList?.[0];
  const sheetInfo = primaryRef && manifest?.sheets?.[primaryRef.sheet];

  if (primaryRef && sheetInfo) {
    const style = computeSpriteCssStyle({
      sheetUrl: sheetInfo.url,
      index: primaryRef.index,
      cols: sheetInfo.cols || manifest.cols || 16,
      rows: sheetInfo.rows || manifest.rows || 16,
      displaySize: size,
    });

    return (
      <div
        role="img"
        aria-label={`Illustration sprite pour ${fallbackLabel}`}
        style={style}
        className={`rounded-xl border border-slate-700/70 shadow-inner shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      aria-label={`Vignette ${fallbackLabel}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-flex items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/90 text-slate-300 font-serif text-lg shrink-0 select-none ${className}`}
    >
      {Array.from(fallbackLabel).slice(0, 2).join('')}
    </div>
  );
}
