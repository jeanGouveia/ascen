import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { Category } from '../types';
import { CATEGORIES } from '../constants/finance';
import * as localDb from '../db/localDataDb';
import { scheduleSync } from '../services/sync/syncEngine';
import { logger } from '../utils/logger';
import { logError } from '../services/sentry';
import { syncLog } from '../utils/syncLogger';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  addCategory: (data: Omit<Category, 'id' | 'isDefault'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Omit<Category, 'id' | 'isDefault'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryByName: (name: string) => Category | undefined;
}

const CategoryContext = createContext<CategoryContextType>({} as CategoryContextType);
export const useCategories = () => useContext(CategoryContext);

const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((c, i) => ({
  id: `default_${i}`,
  name: c.name,
  icon: c.icon,
  color: c.color,
  type: c.type,
  isDefault: true,
}));

/** Evita duplicar "Alimentação" etc. quando o sync traz as mesmas categorias padrão do Supabase. */
function mergeCategories(defaults: Category[], fromDb: Category[]): Category[] {
  const byName = new Map<string, Category>();
  for (const c of defaults) {
    byName.set(c.name.trim().toLowerCase(), c);
  }
  for (const c of fromDb) {
    byName.set(c.name.trim().toLowerCase(), { ...c, isDefault: false });
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { localDataReady, onCategoriesChanged } = useUserLocal();
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const categories: Category[] = mergeCategories(DEFAULT_CATEGORIES, customCategories);

  const fetchCategories = useCallback(async () => {
    console.log('[PERF] CategoryContext reload start');
    if (!user || !localDataReady) {
      setCustomCategories([]);
      setLoading(false);
      return;
    }
    try {
      const startSqlite = Date.now();
      const rows = await localDb.listCustomCategories();
      const sqliteTime = Date.now() - startSqlite;
      console.log('[PERF] CategoryContext reload sqlite', `${sqliteTime}ms`);
      const startSetState = Date.now();
      setCustomCategories(rows);
      const setStateTime = Date.now() - startSetState;
      console.log('[PERF] CategoryContext reload setState', `${setStateTime}ms`);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Failed to fetch categories');
      logError(error, { context: 'fetchCategories' });
      logger.error('Erro ao buscar categorias:', error.message);
    } finally {
      setLoading(false);
      console.log('[PERF] CategoryContext reload finished');
    }
  }, [user, localDataReady]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories, onCategoriesChanged]);

  const addCategory = useCallback(
    async (data: Omit<Category, 'id' | 'isDefault'>) => {
      syncLog('[GATE] CategoryContext addCategory CALLED', `userId=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`);
      if (!user || !localDataReady) {
        syncLog('[GATE] CategoryContext addCategory BLOCKED', `reason=${!user ? 'no user' : 'localDataReady=false'}`);
        return;
      }
      try {
        await localDb.insertCategory(data);
        syncLog('[GATE] CategoryContext addCategory calling scheduleSync', `userId=${user.id}`);
        scheduleSync(user.id);
        await fetchCategories();
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Failed to add category');
        logError(error, { context: 'addCategory', data });
        Alert.alert('Erro ao salvar', 'Não foi possível salvar a categoria. Tente novamente.');
      }
    },
    [user, localDataReady, fetchCategories]
  );

  const updateCategory = useCallback(
    async (id: string, data: Partial<Omit<Category, 'id' | 'isDefault'>>) => {
      syncLog('[GATE] CategoryContext updateCategory CALLED', `userId=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`);
      if (id.startsWith('default_')) {
        Alert.alert('Categoria padrão', 'Categorias padrão não podem ser editadas.');
        return;
      }
      if (!localDataReady || !user) {
        syncLog('[GATE] CategoryContext updateCategory BLOCKED', `reason=${!user ? 'no user' : 'localDataReady=false'}`);
        return;
      }
      try {
        await localDb.updateCategory(id, data);
        syncLog('[GATE] CategoryContext updateCategory calling scheduleSync', `userId=${user.id}`);
        scheduleSync(user.id);
        await fetchCategories();
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Failed to update category');
        logError(error, { context: 'updateCategory', id, data });
        Alert.alert('Erro ao atualizar', 'Não foi possível atualizar a categoria. Tente novamente.');
      }
    },
    [localDataReady, fetchCategories, user]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      syncLog('[GATE] CategoryContext deleteCategory CALLED', `userId=${user?.id ?? 'null'}`, `localDataReady=${localDataReady}`);
      if (id.startsWith('default_')) return;
      if (!localDataReady) {
        syncLog('[GATE] CategoryContext deleteCategory BLOCKED', 'reason=localDataReady=false');
        return;
      }
      try {
        await localDb.deleteCategory(id);
        if (user) {
          syncLog('[GATE] CategoryContext deleteCategory calling scheduleSync', `userId=${user.id}`);
          scheduleSync(user.id);
        }
        setCustomCategories(prev => prev.filter(c => c.id !== id));
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Failed to delete category');
        logError(error, { context: 'deleteCategory', id });
        Alert.alert('Erro ao excluir', 'Não foi possível excluir a categoria. Tente novamente.');
      }
    },
    [localDataReady, user]
  );

  const getCategoryByName = useCallback(
    (name: string) => {
      return categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    },
    [categories]
  );

  const value = useMemo(
    () => ({ categories, loading, addCategory, updateCategory, deleteCategory, getCategoryByName }),
    [categories, loading, addCategory, updateCategory, deleteCategory, getCategoryByName]
  );

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
};
