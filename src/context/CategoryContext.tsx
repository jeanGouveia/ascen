import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import { useUserLocal } from './UserLocalDataContext';
import { Category } from '../types';
import { CATEGORIES } from '../constants/finance';
import * as localDb from '../db/localDataDb';
import { scheduleSync } from '../services/sync/syncEngine';
import { logger } from '../utils/logger';

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
  const { localDataReady, dataRevision } = useUserLocal();
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const categories: Category[] = mergeCategories(DEFAULT_CATEGORIES, customCategories);

  const fetchCategories = useCallback(async () => {
    if (!user || !localDataReady) {
      setCustomCategories([]);
      setLoading(false);
      return;
    }
    try {
      const rows = await localDb.listCustomCategories();
      setCustomCategories(rows);
    } catch (err: unknown) {
      logger.error('Erro ao buscar categorias:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  }, [user, localDataReady]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories, dataRevision]);

  const addCategory = useCallback(
    async (data: Omit<Category, 'id' | 'isDefault'>) => {
      if (!user || !localDataReady) return;
      try {
        await localDb.insertCategory(data);
        scheduleSync(user.id);
        await fetchCategories();
      } catch (err: unknown) {
        Alert.alert('Erro ao salvar', err instanceof Error ? err.message : 'Erro desconhecido');
      }
    },
    [user, localDataReady, fetchCategories]
  );

  const updateCategory = useCallback(
    async (id: string, data: Partial<Omit<Category, 'id' | 'isDefault'>>) => {
      if (id.startsWith('default_')) {
        Alert.alert('Categoria padrão', 'Categorias padrão não podem ser editadas.');
        return;
      }
      if (!localDataReady || !user) return;
      try {
        await localDb.updateCategory(id, data);
        scheduleSync(user.id);
        await fetchCategories();
      } catch (err: unknown) {
        Alert.alert('Erro ao atualizar', err instanceof Error ? err.message : 'Erro desconhecido');
      }
    },
    [localDataReady, fetchCategories]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      if (id.startsWith('default_')) return;
      if (!localDataReady) return;
      try {
        await localDb.deleteCategory(id);
        if (user) scheduleSync(user.id);
        setCustomCategories(prev => prev.filter(c => c.id !== id));
      } catch (err: unknown) {
        Alert.alert('Erro ao excluir', err instanceof Error ? err.message : 'Erro desconhecido');
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

  return (
    <CategoryContext.Provider
      value={{ categories, loading, addCategory, updateCategory, deleteCategory, getCategoryByName }}
    >
      {children}
    </CategoryContext.Provider>
  );
};
