export type FuriganaMode = 'ALWAYS' | 'AUTO' | 'TARGET_LEVEL' | 'HOVER' | 'OFF';

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  furiganaMode: FuriganaMode;
  audioVolume: number;
  autoPlayAudio: boolean;
  handwritingGuide: boolean;
  timerSpeedMultiplier: number;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: 'dark',
  furiganaMode: 'ALWAYS',
  audioVolume: 0.8,
  autoPlayAudio: false,
  handwritingGuide: true,
  timerSpeedMultiplier: 1.0,
};

const PREFS_KEY = 'ejlpt_user_preferences';

export function getStoredPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error reading localStorage preferences', err);
    return DEFAULT_PREFS;
  }
}

export function saveStoredPreferences(prefs: Partial<UserPreferences>): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const current = getStoredPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error writing to localStorage', err);
    return DEFAULT_PREFS;
  }
}
