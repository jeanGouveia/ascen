import React, { createContext, useCallback, useContext, useEffect, useState, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { logError } from '../services/sentry';

const STORAGE_KEY = 'ascen_onboarding_v1';

interface OnboardingContextType {
  shouldShow: boolean;
  isReady: boolean;
  startOnboarding: () => void;
  finishOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({} as OnboardingContextType);
export const useOnboarding = () => useContext(OnboardingContext);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then(val => {
        // Se nunca foi visto, marca para mostrar
        if (!val) setShouldShow(true);
      })
      .catch(e => {
        const error = e instanceof Error ? e : new Error('Failed to read onboarding state');
        logError(error, { context: 'readOnboardingState' });
      })
      .finally(() => setIsReady(true));
  }, []);

  const startOnboarding = useCallback(() => {
    setShouldShow(true);
  }, []);

  const finishOnboarding = useCallback(() => {
    setShouldShow(false);
    SecureStore.setItemAsync(STORAGE_KEY, 'done')
      .catch(e => {
        const error = e instanceof Error ? e : new Error('Failed to save onboarding state');
        logError(error, { context: 'saveOnboardingState' });
      });
  }, []);

  const value = useMemo(
    () => ({ shouldShow, isReady, startOnboarding, finishOnboarding }),
    [shouldShow, isReady, startOnboarding, finishOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
