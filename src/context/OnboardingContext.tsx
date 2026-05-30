import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

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
      .catch(() => {})
      .finally(() => setIsReady(true));
  }, []);

  const startOnboarding = useCallback(() => {
    setShouldShow(true);
  }, []);

  const finishOnboarding = useCallback(() => {
    setShouldShow(false);
    SecureStore.setItemAsync(STORAGE_KEY, 'done').catch(() => {});
  }, []);

  return (
    <OnboardingContext.Provider value={{ shouldShow, isReady, startOnboarding, finishOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
}
