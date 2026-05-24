import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ascen_preferences_v1';

export type FontScale = 'small' | 'medium' | 'large' | 'xlarge';

export interface PreferencesState {
  darkMode: boolean;
  fontScale: FontScale;
  notificationsEnabled: boolean;
  notifyDayOf: boolean;
  notifyOneDayBefore: boolean;
  notifyFiveDaysBefore: boolean;
}

const defaults: PreferencesState = {
  darkMode: false,
  fontScale: 'medium',
  notificationsEnabled: true,
  notifyDayOf: true,
  notifyOneDayBefore: true,
  notifyFiveDaysBefore: true,
};

interface PreferencesContextValue extends PreferencesState {
  loaded: boolean;
  setDarkMode: (v: boolean) => void;
  setFontScale: (v: FontScale) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNotifyDayOf: (v: boolean) => void;
  setNotifyOneDayBefore: (v: boolean) => void;
  setNotifyFiveDaysBefore: (v: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

async function readStored(): Promise<PreferencesState> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PreferencesState>;
    return {
      darkMode: typeof parsed.darkMode === 'boolean' ? parsed.darkMode : defaults.darkMode,
      fontScale: ['small', 'medium', 'large', 'xlarge'].includes(parsed.fontScale as string)
        ? (parsed.fontScale as FontScale)
        : defaults.fontScale,
      notificationsEnabled:
        typeof parsed.notificationsEnabled === 'boolean' ? parsed.notificationsEnabled : defaults.notificationsEnabled,
      notifyDayOf: typeof parsed.notifyDayOf === 'boolean' ? parsed.notifyDayOf : defaults.notifyDayOf,
      notifyOneDayBefore:
        typeof parsed.notifyOneDayBefore === 'boolean' ? parsed.notifyOneDayBefore : defaults.notifyOneDayBefore,
      notifyFiveDaysBefore:
        typeof parsed.notifyFiveDaysBefore === 'boolean' ? parsed.notifyFiveDaysBefore : defaults.notifyFiveDaysBefore,
    };
  } catch {
    return defaults;
  }
}

async function writeStored(state: PreferencesState) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(state));
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [state, setState] = useState<PreferencesState>(defaults);

  useEffect(() => {
    let alive = true;
    readStored().then(next => {
      if (alive) {
        setState(next);
        setLoaded(true);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const setDarkMode = useCallback((darkMode: boolean) => {
    setState(prev => {
      const next = { ...prev, darkMode };
      writeStored(next).catch(() => {});
      return next;
    });
  }, []);

  const setFontScale = useCallback((fontScale: FontScale) => {
    setState(prev => {
      const next = { ...prev, fontScale };
      writeStored(next).catch(() => {});
      return next;
    });
  }, []);

  const setNotificationsEnabled = useCallback((notificationsEnabled: boolean) => {
    setState(prev => {
      const next = { ...prev, notificationsEnabled };
      writeStored(next).catch(() => {});
      return next;
    });
  }, []);

  const setNotifyDayOf = useCallback((notifyDayOf: boolean) => {
    setState(prev => {
      const next = { ...prev, notifyDayOf };
      writeStored(next).catch(() => {});
      return next;
    });
  }, []);

  const setNotifyOneDayBefore = useCallback((notifyOneDayBefore: boolean) => {
    setState(prev => {
      const next = { ...prev, notifyOneDayBefore };
      writeStored(next).catch(() => {});
      return next;
    });
  }, []);

  const setNotifyFiveDaysBefore = useCallback((notifyFiveDaysBefore: boolean) => {
    setState(prev => {
      const next = { ...prev, notifyFiveDaysBefore };
      writeStored(next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      ...state,
      loaded,
      setDarkMode,
      setFontScale,
      setNotificationsEnabled,
      setNotifyDayOf,
      setNotifyOneDayBefore,
      setNotifyFiveDaysBefore,
    }),
    [
      state,
      loaded,
      setDarkMode,
      setFontScale,
      setNotificationsEnabled,
      setNotifyDayOf,
      setNotifyOneDayBefore,
      setNotifyFiveDaysBefore,
    ]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
