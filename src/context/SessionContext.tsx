import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SessionManager } from '../services/sessionManager';
import { useAuth } from './AuthContext';

// ============================================================================
// SESSION ACTIONS CONTEXT
// ============================================================================

interface SessionActionsContextType {
  lock: () => void;
  unlock: () => void;
  touch: () => void;
  setCriticalFlow: (active: boolean) => void;
  setSubmitting: (active: boolean) => void;
}

const SessionActionsContext = createContext<SessionActionsContextType | undefined>(undefined);

export function useSessionActions(): SessionActionsContextType {
  const context = useContext(SessionActionsContext);
  if (!context) {
    throw new Error('useSessionActions must be used within SessionProvider');
  }
  return context;
}

// ============================================================================
// SESSION STATE CONTEXT
// ============================================================================

interface SessionStateContextType {
  locked: boolean;
}

const SessionStateContext = createContext<SessionStateContextType | undefined>(undefined);

export function useSessionState(): SessionStateContextType {
  const context = useContext(SessionStateContext);
  if (!context) {
    throw new Error('useSessionState must be used within SessionProvider');
  }
  return context;
}

// ============================================================================
// LEGACY HOOK (retrocompatibilidade)
// ============================================================================

interface SessionContextType {
  locked: boolean;
  lock: () => void;
  unlock: () => void;
  touch: () => void;
  setCriticalFlow: (active: boolean) => void;
  setSubmitting: (active: boolean) => void;
}

export function useSession(): SessionContextType {
  const actions = useSessionActions();
  const state = useSessionState();
  return {
    ...state,
    ...actions,
  };
}

// ============================================================================
// PROVIDER
// ============================================================================

interface Props {
  children: React.ReactNode;
}

export function SessionProvider({ children }: Props) {
  const [locked, setLocked] = useState(false);
  const managerRef = useRef<SessionManager | null>(null);
  const { user, loading } = useAuth();

  // Inicializa SessionManager com callbacks para lock e unlock
  useEffect(() => {
    const manager = new SessionManager(
      () => {
        setLocked(true);
      },
      () => {
        setLocked(false);
      }
    );
    managerRef.current = manager;

    return () => {
      manager.destroy();
    };
  }, []);

  // Inicia/para monitoramento baseado no estado de autenticação
  useEffect(() => {
    if (!managerRef.current) return;

    if (!loading && user) {
      // Usuário autenticado - inicia monitoramento
      managerRef.current.start();
    } else {
      // Usuário não autenticado ou carregando - para monitoramento e limpa estado
      managerRef.current.stop();
      setLocked(false);
    }
  }, [user, loading]);

  // Integração com AppState (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (!managerRef.current) return;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        managerRef.current.onAppBackground();
      } else if (nextAppState === 'active') {
        managerRef.current.onAppForeground();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const lock = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.touch();
      setLocked(true);
    }
  }, []);

  const unlock = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.unlock();
    }
  }, []);

  const touch = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.touch();
    }
  }, []);

  const setCriticalFlow = useCallback((active: boolean) => {
    if (managerRef.current) {
      managerRef.current.setCriticalFlow(active);
    }
  }, []);

  const setSubmitting = useCallback((active: boolean) => {
    if (managerRef.current) {
      managerRef.current.setSubmitting(active);
    }
  }, []);

  // Actions context value (estável - funções não mudam)
  const actionsValue = useMemo<SessionActionsContextType>(
    () => ({
      lock,
      unlock,
      touch,
      setCriticalFlow,
      setSubmitting,
    }),
    [lock, unlock, touch, setCriticalFlow, setSubmitting]
  );

  // State context value (muda apenas quando locked muda)
  const stateValue = useMemo<SessionStateContextType>(
    () => ({
      locked,
    }),
    [locked]
  );

  return (
    <SessionActionsContext.Provider value={actionsValue}>
      <SessionStateContext.Provider value={stateValue}>
        {children}
      </SessionStateContext.Provider>
    </SessionActionsContext.Provider>
  );
}
