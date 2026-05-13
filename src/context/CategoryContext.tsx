import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { Category } from '../types';
import { CATEGORIES } from '../constants/finance';

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

// Categorias padrão com IDs estáveis (prefixo "default_")
const DEFAULT_CATEGORIES: Category[] = CATEGORIES.map((c, i) => ({
  id: `default_${i}`,
  name: c.name,
  icon: c.icon,
  color: c.color,
  type: c.type,
  isDefault: true,
}));

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Combina padrão + custom (custom primeiro para aparecer destacado)
  const categories: Category[] = [...DEFAULT_CATEGORIES, ...customCategories];

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCustomCategories([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCustomCategories(
        (data || []).map(row => ({
          id: row.id,
          name: row.name,
          icon: row.icon,
          color: row.color,
          type: row.type,
          isDefault: false,
        }))
      );
    } catch (err: any) {
      console.error('Erro ao buscar categorias:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(async (data: Omit<Category, 'id' | 'isDefault'>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('categories').insert([{
        user_id: user.id,
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
      }]);
      if (error) throw error;
      await fetchCategories();
    } catch (err: any) {
      Alert.alert('Erro ao salvar', err.message);
    }
  }, [user, fetchCategories]);

  const updateCategory = useCallback(async (id: string, data: Partial<Omit<Category, 'id' | 'isDefault'>>) => {
    // Não permite editar categorias padrão no banco (mas UI permite edição local temporária - aqui bloqueamos)
    if (id.startsWith('default_')) {
      Alert.alert('Categoria padrão', 'Categorias padrão não podem ser editadas.');
      return;
    }
    try {
      const { error } = await supabase.from('categories').update({
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
      }).eq('id', id);
      if (error) throw error;
      await fetchCategories();
    } catch (err: any) {
      Alert.alert('Erro ao atualizar', err.message);
    }
  }, [fetchCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    if (id.startsWith('default_')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCustomCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      Alert.alert('Erro ao excluir', err.message);
    }
  }, []);

  const getCategoryByName = useCallback((name: string) => {
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  }, [categories]);

  return (
    <CategoryContext.Provider value={{ categories, loading, addCategory, updateCategory, deleteCategory, getCategoryByName }}>
      {children}
    </CategoryContext.Provider>
  );
};
