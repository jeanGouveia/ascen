import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SessionManager } from '../services/sessionManager';
import { useAuth } from './AuthContext';

interface SessionContextType {
  locked: boolean;
  lastActivity: number;
  lock: () => void;
  unlock: () => void;
  touch: () => void;
  isLocked: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}

interface Props {
  children: React.ReactNode;
}

export function SessionProvider({ children }: Props) {
  const [locked, setLocked] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const managerRef = useRef<SessionManager | null>(null);
  const { user, loading } = useAuth();

  // Inicializa SessionManager
  useEffect(() => {
    const manager = new SessionManager(() => {
      setLocked(true);
    });
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
      setLastActivity(Date.now());
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
        // Atualiza lastActivity quando volta ao foreground
        setLastActivity(managerRef.current.getLastActivity());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const lock = useCallback(() => {
    setLocked(true);
  }, []);

  const unlock = useCallback(() => {
    setLocked(false);
    // Ao desbloquear, registra nova atividade
    if (managerRef.current) {
      managerRef.current.touch();
      setLastActivity(managerRef.current.getLastActivity());
    }
  }, []);

  const touch = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.touch();
      setLastActivity(managerRef.current.getLastActivity());
    }
  }, []);

  const isLocked = locked;

  const value: SessionContextType = {
    locked,
    lastActivity,
    lock,
    unlock,
    touch,
    isLocked,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
