'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { FuriganaMode, getStoredPreferences, saveStoredPreferences } from '@/lib/storage';

interface FuriganaContextType {
  furiganaMode: FuriganaMode;
  setFuriganaMode: (mode: FuriganaMode) => void;
  cycleFuriganaMode: () => void;
}

const FuriganaContext = createContext<FuriganaContextType>({
  furiganaMode: 'AUTO',
  setFuriganaMode: () => {},
  cycleFuriganaMode: () => {},
});

export const FuriganaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [furiganaMode, setFuriganaModeState] = useState<FuriganaMode>('AUTO');

  useEffect(() => {
    const prefs = getStoredPreferences();
    if (prefs.furiganaMode) {
      setFuriganaModeState(prefs.furiganaMode);
    }
  }, []);

  const setFuriganaMode = (mode: FuriganaMode) => {
    setFuriganaModeState(mode);
    saveStoredPreferences({ furiganaMode: mode });
  };

  const cycleFuriganaMode = () => {
    if (furiganaMode === 'ALWAYS' || furiganaMode === 'AUTO') {
      setFuriganaMode('HOVER');
    } else if (furiganaMode === 'HOVER') {
      setFuriganaMode('OFF');
    } else {
      setFuriganaMode('ALWAYS');
    }
  };

  return (
    <FuriganaContext.Provider value={{ furiganaMode, setFuriganaMode, cycleFuriganaMode }}>
      {children}
    </FuriganaContext.Provider>
  );
};

export const useFurigana = () => useContext(FuriganaContext);
