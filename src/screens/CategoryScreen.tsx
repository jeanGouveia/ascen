import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card } from '../components/Shared';
import { useCategories } from '../context/CategoryContext';
import { useSessionActions } from '../context/SessionContext';
import { Category } from '../types';

// ─── Paleta de cores disponíveis ───────────────────────────────────────────
const COLOR_OPTIONS = [
  '#F97316', '#EF4444', '#EC4899', '#8B5CF6',
  '#6366F1', '#06B6D4', '#16A34A', '#F59E0B',
  '#D97706', '#4F6EF7', '#6B7897', '#0EA5E9',
  '#10B981', '#F43F5E', '#A855F7', '#84CC16',
];

// ─── Emojis disponíveis ─────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  '🛒','🏠','💊','📺','🚗','👗','📚','💰','🏢','📦',
  '🍔','☕','🎮','✈️','🐾','🎵','💇','🏋️','💡','🔧',
  '🎁','📱','🌿','🍷','🏖️','📷','🎓','💼','🧾','💳',
  '🏥','⛽','🛵','🎭','🧸','🌙','🏡','🧹','🐶','🐱',
];

type TxType = 'expense' | 'income' | 'both';

interface CategoryFormState {
  name: string;
  icon: string;
  color: string;
  type: TxType;
}

const DEFAULT_FORM: CategoryFormState = {
  name: '',
  icon: '📦',
  color: '#4F6EF7',
  type: 'expense',
};

export function CategoryScreen() {
  const { C, R, s } = useAppTheme();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories();
  const { touch, setCriticalFlow } = useSessionActions();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryFormState>(DEFAULT_FORM);
  const [filter, setFilter] = useState<TxType | 'all'>('all');
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);

  console.log('[PERF] CategoryScreen mounted');

  // Reset timer when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('[PERF] CategoryScreen useFocusEffect start');
      touch();
      console.log('[PERF] CategoryScreen useFocusEffect end');
    }, [touch])
  );

  console.log('[PERF] CategoryScreen first render complete');

  // Critical flow: inhibit lock when modal is open
  React.useEffect(() => {
    if (modalVisible) {
      setCriticalFlow(true);
      touch();
    } else {
      setCriticalFlow(false);
    }
  }, [modalVisible, setCriticalFlow, touch]);

  const openCreate = () => {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type as TxType });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Nome obrigatório', 'Informe um nome para a categoria.');
      return;
    }
    if (editingId) {
      await updateCategory(editingId, form);
    } else {
      await addCategory(form);
    }
    setModalVisible(false);
  };

  const handleDelete = (cat: Category) => {
    if (cat.isDefault) {
      Alert.alert('Categoria padrão', 'Categorias padrão não podem ser excluídas.');
      return;
    }
    Alert.alert(
      'Excluir categoria',
      `Deseja excluir "${cat.name}"? Transações existentes não serão afetadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteCategory(cat.id),
        },
      ]
    );
  };

  const filtered = categories.filter(c => filter === 'all' || c.type === filter || c.type === 'both');

  const typeLabel = (t: TxType | 'both') => {
    if (t === 'expense') return { label: 'Despesa', color: C.danger, bg: C.dangerLight };
    if (t === 'income') return { label: 'Receita', color: C.success, bg: C.successLight };
    return { label: 'Ambos', color: C.primary, bg: C.primaryLight };
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
        <View>
          <Text style={s.pageTitle}>Categorias</Text>
          <Text style={s.pageSubtitle}>{categories.length} categorias cadastradas</Text>
        </View>
        <TouchableOpacity
          onPress={openCreate}
          activeOpacity={0.8}
          style={{ backgroundColor: C.primary, borderRadius: R.xl, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ color: '#fff', fontSize: 20, lineHeight: 22 }}>+</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 }}>
        {(['all', 'expense', 'income'] as const).map(f => {
          const active = filter === f;
          const labels = { all: 'Todas', expense: 'Despesas', income: 'Receitas' };
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
              style={[
                s.chip,
                active && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Text style={[s.chipText, active && { color: '#fff' }]}>{labels[f]}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🏷️</Text>
            <Text style={s.emptyTitle}>Nenhuma categoria</Text>
            <Text style={s.emptySubtitle}>Crie sua primeira categoria personalizada para organizar melhor seus lançamentos.</Text>
          </View>
        ) : (
          <Card>
            {filtered.map((cat, i) => {
              const tag = typeLabel(cat.type as TxType | 'both');
              return (
                <View
                  key={cat.id}
                  style={[
                    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
                    i > 0 && { borderTopWidth: 1, borderTopColor: C.divider },
                  ]}
                >
                  {/* Ícone */}
                  <View style={{ width: 46, height: 46, borderRadius: R.lg, backgroundColor: cat.color + '20', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>{cat.name}</Text>
                      {cat.isDefault && (
                        <View style={{ backgroundColor: C.border, borderRadius: R.full, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, color: C.textMuted, fontWeight: '600' }}>padrão</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ backgroundColor: tag.bg, borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
                      <Text style={{ fontSize: 12, color: tag.color, fontWeight: '700' }}>{tag.label}</Text>
                    </View>
                  </View>

                  {/* Ações */}
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {!cat.isDefault && (
                      <TouchableOpacity
                        onPress={() => openEdit(cat)}
                        activeOpacity={0.7}
                        style={{ width: 36, height: 36, borderRadius: R.md, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 16 }}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    {!cat.isDefault && (
                      <TouchableOpacity
                        onPress={() => handleDelete(cat)}
                        activeOpacity={0.7}
                        style={{ width: 36, height: 36, borderRadius: R.md, backgroundColor: C.dangerLight, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* Botão adicionar no final */}
        <TouchableOpacity
          onPress={openCreate}
          activeOpacity={0.7}
          style={[s.addGoalBtn, { marginTop: 16 }]}
        >
          <Text style={{ fontSize: 22 }}>➕</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.primary }}>Nova categoria</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Modal de criar/editar ─── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
            {/* Header do modal */}
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <Text style={{ fontSize: 16, color: C.textMid, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>{editingId ? 'Editar categoria' : 'Nova categoria'}</Text>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.8} style={[s.modalSaveBtn, { backgroundColor: C.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Salvar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {/* Preview */}
              <View style={{ alignItems: 'center', marginBottom: 28 }}>
                <View style={{ width: 80, height: 80, borderRadius: R['2xl'], backgroundColor: form.color + '25', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: form.color }}>
                  <Text style={{ fontSize: 38 }}>{form.icon}</Text>
                </View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginTop: 10 }}>{form.name || 'Nome da categoria'}</Text>
              </View>

              {/* Nome */}
              <View style={s.formGroup}>
                <Text style={s.formLabel}>NOME</Text>
                <TextInput
                  style={s.textInput}
                  placeholder="Ex: Pets, Streaming, Academia..."
                  placeholderTextColor={C.textMuted}
                  value={form.name}
                  onChangeText={(v) => {
                    setForm(p => ({ ...p, name: v }));
                    touch();
                  }}
                  maxLength={30}
                />
              </View>

              {/* Tipo */}
              <View style={s.formGroup}>
                <Text style={s.formLabel}>TIPO</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['expense', 'income', 'both'] as const).map(t => {
                    const active = form.type === t;
                    const tag = typeLabel(t);
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setForm(p => ({ ...p, type: t }))}
                        activeOpacity={0.7}
                        style={[
                          s.chip,
                          { flex: 1, justifyContent: 'center' },
                          active && { backgroundColor: tag.color, borderColor: tag.color },
                        ]}
                      >
                        <Text style={[s.chipText, active && { color: '#fff' }]}>{tag.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Emoji */}
              <View style={s.formGroup}>
                <Text style={s.formLabel}>ÍCONE</Text>
                <TouchableOpacity
                  onPress={() => setEmojiPickerVisible(p => !p)}
                  activeOpacity={0.7}
                  style={[s.textInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                >
                  <Text style={{ fontSize: 28 }}>{form.icon}</Text>
                  <Text style={{ color: C.textMuted, fontWeight: '600' }}>{emojiPickerVisible ? '▲ Fechar' : '▼ Escolher'}</Text>
                </TouchableOpacity>

                {emojiPickerVisible && (
                  <View style={{ marginTop: 10, backgroundColor: C.card, borderRadius: R.xl, padding: 12, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {EMOJI_OPTIONS.map(emoji => (
                        <TouchableOpacity
                          key={emoji}
                          onPress={() => { setForm(p => ({ ...p, icon: emoji })); setEmojiPickerVisible(false); }}
                          activeOpacity={0.7}
                          style={[
                            { width: 48, height: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
                            form.icon === emoji && { backgroundColor: C.primaryLight, borderWidth: 2, borderColor: C.primary },
                          ]}
                        >
                          <Text style={{ fontSize: 26 }}>{emoji}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Cor */}
              <View style={s.formGroup}>
                <Text style={s.formLabel}>COR</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {COLOR_OPTIONS.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setForm(p => ({ ...p, color }))}
                      activeOpacity={0.7}
                      style={[
                        { width: 40, height: 40, borderRadius: 20, backgroundColor: color },
                        form.color === color && { borderWidth: 3, borderColor: C.text, transform: [{ scale: 1.15 }] },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
