'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ConnectionDisplayFormat } from '@/lib/connectionFormatter';

export type AdaptiveProfile = 'beginner' | 'intermediate' | 'advanced';

export interface VisualChannelsState {
  masteryText: boolean;
  frequencyBg: boolean;
  grammarUnderline: boolean;
  jlptPill: boolean;
}

interface VisualSystemContextValue {
  adaptiveProfile: AdaptiveProfile;
  channels: VisualChannelsState;
  connectionFormat: ConnectionDisplayFormat;
  setAdaptiveProfile: (profile: AdaptiveProfile) => void;
  cycleAdaptiveProfile: () => void;
  toggleChannel: (channel: keyof VisualChannelsState) => void;
  setAllChannels: (enabled: boolean) => void;
  setConnectionFormat: (format: ConnectionDisplayFormat) => void;
}

const STORAGE_KEY = 'ejlpt_visual_system_v1';

const DEFAULT_CHANNELS: VisualChannelsState = {
  masteryText: true,
  frequencyBg: true,
  grammarUnderline: true,
  jlptPill: true,
};

const VisualSystemContext = createContext<VisualSystemContextValue>({
  adaptiveProfile: 'intermediate',
  channels: DEFAULT_CHANNELS,
  connectionFormat: 'standard_ja',
  setAdaptiveProfile: () => {},
  cycleAdaptiveProfile: () => {},
  toggleChannel: () => {},
  setAllChannels: () => {},
  setConnectionFormat: () => {},
});

interface StoredVisualState {
  adaptiveProfile?: AdaptiveProfile;
  channels?: Partial<VisualChannelsState>;
  connectionFormat?: ConnectionDisplayFormat;
}

function persistVisualState(next: StoredVisualState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
}

export function VisualSystemProvider({ children }: { children: React.ReactNode }) {
  const [adaptiveProfile, setAdaptiveProfileState] =
    useState<AdaptiveProfile>('intermediate');
  const [channels, setChannels] = useState<VisualChannelsState>(DEFAULT_CHANNELS);
  const [connectionFormat, setConnectionFormatState] =
    useState<ConnectionDisplayFormat>('standard_ja');

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as StoredVisualState;
        if (
          parsed.adaptiveProfile === 'beginner' ||
          parsed.adaptiveProfile === 'intermediate' ||
          parsed.adaptiveProfile === 'advanced'
        ) {
          setAdaptiveProfileState(parsed.adaptiveProfile);
        }
        if (parsed.channels && typeof parsed.channels === 'object') {
          setChannels({
            masteryText: parsed.channels.masteryText ?? true,
            frequencyBg: parsed.channels.frequencyBg ?? true,
            grammarUnderline: parsed.channels.grammarUnderline ?? true,
            jlptPill: parsed.channels.jlptPill ?? true,
          });
        }
        if (parsed.connectionFormat) {
          setConnectionFormatState(parsed.connectionFormat);
        }
      } catch {
        // ignore invalid localStorage
      }
    });
  }, []);

  const setAdaptiveProfile = (profile: AdaptiveProfile) => {
    setAdaptiveProfileState(profile);
    persistVisualState({ adaptiveProfile: profile, channels, connectionFormat });
  };

  const cycleAdaptiveProfile = () => {
    const next: AdaptiveProfile =
      adaptiveProfile === 'beginner'
        ? 'intermediate'
        : adaptiveProfile === 'intermediate'
          ? 'advanced'
          : 'beginner';
    setAdaptiveProfile(next);
  };

  const toggleChannel = (channel: keyof VisualChannelsState) => {
    setChannels((prev) => {
      const next = { ...prev, [channel]: !prev[channel] };
      persistVisualState({ adaptiveProfile, channels: next, connectionFormat });
      return next;
    });
  };

  const setAllChannels = (enabled: boolean) => {
    const next: VisualChannelsState = {
      masteryText: enabled,
      frequencyBg: enabled,
      grammarUnderline: enabled,
      jlptPill: enabled,
    };
    setChannels(next);
    persistVisualState({ adaptiveProfile, channels: next, connectionFormat });
  };

  const setConnectionFormat = (format: ConnectionDisplayFormat) => {
    setConnectionFormatState(format);
    persistVisualState({ adaptiveProfile, channels, connectionFormat: format });
  };

  return (
    <VisualSystemContext.Provider
      value={{
        adaptiveProfile,
        channels,
        connectionFormat,
        setAdaptiveProfile,
        cycleAdaptiveProfile,
        toggleChannel,
        setAllChannels,
        setConnectionFormat,
      }}
    >
      {children}
    </VisualSystemContext.Provider>
  );
}

export const useVisualSystem = () => useContext(VisualSystemContext);
