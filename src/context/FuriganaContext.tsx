'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/db';
import { FuriganaMode, getStoredPreferences, saveStoredPreferences } from '@/lib/storage';

interface FuriganaContextType {
  furiganaMode: FuriganaMode;
  masteredKeys: Set<string>;
  setFuriganaMode: (mode: FuriganaMode) => void;
  cycleFuriganaMode: () => void;
}

const FuriganaContext = createContext<FuriganaContextType>({
  furiganaMode: 'AUTO',
  masteredKeys: new Set(),
  setFuriganaMode: () => {},
  cycleFuriganaMode: () => {},
});

export const FuriganaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [furiganaMode, setFuriganaModeState] = useState<FuriganaMode>('AUTO');

  const srsCards = useLiveQuery(() => localDb.srsCards.toArray(), []);

  const masteredKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const card of srsCards || []) {
      if (card.repetitions >= 3 && card.intervalDays >= 6) {
        keys.add(card.itemKey);
      }
    }
    return keys;
  }, [srsCards]);

  useEffect(() => {
    queueMicrotask(() => {
      const prefs = getStoredPreferences();
      if (prefs.furiganaMode) {
        setFuriganaModeState(prefs.furiganaMode);
      }
    });
  }, []);

  const setFuriganaMode = (mode: FuriganaMode) => {
    setFuriganaModeState(mode);
    saveStoredPreferences({ furiganaMode: mode });
  };

  const cycleFuriganaMode = () => {
    if (furiganaMode === 'ALWAYS') {
      setFuriganaMode('AUTO');
    } else if (furiganaMode === 'AUTO' || furiganaMode === 'TARGET_LEVEL') {
      setFuriganaMode('HOVER');
    } else if (furiganaMode === 'HOVER') {
      setFuriganaMode('OFF');
    } else {
      setFuriganaMode('ALWAYS');
    }
  };

  return (
    <FuriganaContext.Provider
      value={{ furiganaMode, masteredKeys, setFuriganaMode, cycleFuriganaMode }}
    >
      {children}
    </FuriganaContext.Provider>
  );
};

export const useFurigana = () => useContext(FuriganaContext);
