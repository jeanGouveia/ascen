import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import {
  ensureUserFamily,
  fetchFamilyJoinCode,
  getLocalFamilyId,
  getLocalFamilyRole,
  getLocalJoinCode,
  joinFamily,
} from '../services/family';
import type { FamilyRole } from '../types/database';

interface FamilyContextType {
  familyId: string | null;
  role: FamilyRole | null;
  joinCode: string | null;
  loading: boolean;
  refreshFamily: () => Promise<void>;
  joinByCode: (code: string) => Promise<string>;
}

const FamilyContext = createContext<FamilyContextType>({} as FamilyContextType);
export const useFamily = () => useContext(FamilyContext);

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { localDataReady } = useUserLocal();
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [role, setRole] = useState<FamilyRole | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshFamily = useCallback(async () => {
    if (!user?.id || !localDataReady) {
      setFamilyId(null);
      setRole(null);
      setJoinCode(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const info = await ensureUserFamily(user.id);
      setFamilyId(info.familyId);
      setRole(info.role);
      setJoinCode(info.joinCode);
    } finally {
      setLoading(false);
    }
  }, [user?.id, localDataReady]);

  useEffect(() => {
    void refreshFamily();
  }, [refreshFamily]);

  const joinByCode = useCallback(
    async (code: string) => {
      if (!user?.id) throw new Error('Sessão inválida.');
      const id = await joinFamily(user.id, code);
      const jc = await fetchFamilyJoinCode(id);
      setFamilyId(id);
      setRole('member');
      setJoinCode(jc);
      return id;
    },
    [user?.id]
  );

  useEffect(() => {
    if (!localDataReady) return;
    void (async () => {
      const [fid, r, jc] = await Promise.all([getLocalFamilyId(), getLocalFamilyRole(), getLocalJoinCode()]);
      if (fid) setFamilyId(fid);
      if (r) setRole(r);
      if (jc) setJoinCode(jc);
    })();
  }, [localDataReady]);

  return (
    <FamilyContext.Provider value={{ familyId, role, joinCode, loading, refreshFamily, joinByCode }}>
      {children}
    </FamilyContext.Provider>
  );
}
