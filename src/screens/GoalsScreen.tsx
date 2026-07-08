import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { formatBRL, formatDate, todayStr } from '../utils/helpers';
import { useAppTheme } from '../hooks/useAppTheme';
import { C_light } from '../styles/theme';
import { Card, ProgressBar, EmptyState } from '../components/Shared';
import { DateField } from '../components/DateField';
import { Goal } from '../types';
import { useGoals } from '../context/GoalsContext';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { requestSync } from '../services/sync/syncCoordinator';
import { SyncReason } from '../types/sync';
import { logError } from '../services/sentry';

const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '💍', '🎓', '💻', '📱', '🏖️', '🐾', '🎁', '⛵'];
const GOAL_COLORS = [C_light.primary, '#F97316', '#22C55E', '#EC4899', '#8B5CF6', '#06B6D4', '#F59E0B'];

type GoalForm = {
  name: string;
  target: string;
  icon: string;
  color: string;
  deadline: string;
};

const emptyForm = (): GoalForm => ({
  name: '',
  target: '',
  icon: '🎯',
  color: C_light.primary,
  deadline: '',
});

export function GoalsScreen() {
  const { C, s } = useAppTheme();
  const isMounted = useRef(true);
  const { goals, loading, addGoal, updateGoal, deleteGoal, depositToGoal } = useGoals();
  const { user } = useAuth();
  const { touch, setCriticalFlow, setSubmitting } = useSession();
  const [refreshing, setRefreshing] = useState(false);

  const [depositTarget, setDepositTarget] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  // Critical flow: inhibit lock when form modal is open
  useEffect(() => {
    if (formVisible) {
      setCriticalFlow(true);
      touch();
    } else {
      setCriticalFlow(false);
    }
  }, [formVisible, setCriticalFlow, touch]);

  // Critical flow: inhibit lock when deposit modal is open
  useEffect(() => {
    if (depositTarget) {
      setCriticalFlow(true);
      touch();
    } else {
      setCriticalFlow(false);
    }
  }, [depositTarget, setCriticalFlow, touch]);

  // Submitting flag: inhibit lock when saving
  useEffect(() => {
    if (saving) {
      setSubmitting(true);
    } else {
      setSubmitting(false);
    }
  }, [saving, setSubmitting]);

  // Reset timer when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      touch();
    }, [touch])
  );

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormVisible(true);
  };

  const openEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setForm({
      name: goal.name,
      target: String(goal.target),
      icon: goal.icon,
      color: goal.color,
      deadline: goal.deadline ?? '',
    });
    setFormVisible(true);
  };

  const handleSaveForm = async () => {
    const targetNum = parseFloat(form.target.replace(',', '.'));
    if (!form.name.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome da meta.');
      return;
    }
    if (!targetNum || targetNum <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor objetivo maior que zero.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        target: targetNum,
        current: editingId ? goals.find(g => g.id === editingId)?.current ?? 0 : 0,
        deadline: form.deadline.trim() || undefined,
        completed: editingId ? goals.find(g => g.id === editingId)?.completed : false,
      };
      if (editingId) {
        await updateGoal(editingId, payload);
      } else {
        await addGoal(payload);
      }
      setFormVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (goal: Goal) => {
    Alert.alert('Excluir meta', `Remover "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => void deleteGoal(goal.id),
      },
    ]);
  };

  const handleDeposit = async () => {
    if (!depositTarget) return;
    const amt = parseFloat(depositAmount.replace(',', '.'));
    if (!amt || amt <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    const prev = depositTarget.current;
    await depositToGoal(depositTarget.id, amt);
    const completed = prev + amt >= depositTarget.target;
    const name = depositTarget.name;
    setDepositTarget(null);
    setDepositAmount('');
    if (completed) {
      setTimeout(() => {
        if (isMounted.current) {
          Alert.alert('🎉 Parabéns!', `Você atingiu a meta "${name}"!`);
        }
      }, 300);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await requestSync(user?.id ?? null, SyncReason.MANUAL);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Minhas Metas</Text>
        <Text style={s.pageSubtitle}>Objetivos de poupança</Text>

        {loading ? (
          <Text style={[s.txMeta, { marginTop: 24 }]}>Carregando…</Text>
        ) : goals.length === 0 ? (
          <View style={{ marginTop: 24 }}>
            <EmptyState
              icon="🎯"
              title="Nenhuma meta"
              subtitle="Crie seu primeiro objetivo de poupança"
              actionLabel="+ Criar meta"
              onAction={openCreate}
            />
          </View>
        ) : (
          <View style={{ marginTop: 20, gap: 14 }}>
            {goals.map(goal => {
              const pct = Math.min((goal.current / goal.target) * 100, 100);
              const remaining = goal.target - goal.current;
              return (
                <Card key={goal.id}>
                  <View
                    accessible
                    accessibilityRole="summary"
                    accessibilityLabel={`Meta ${goal.name}, ${pct.toFixed(0)}% concluída, ${formatBRL(goal.current)} de ${formatBRL(goal.target)}`}
                  >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <View style={[s.goalIconWrap, { backgroundColor: goal.color + '22' }]}>
                      <Text style={{ fontSize: 28 }}>{goal.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.goalName}>{goal.name}</Text>
                      {goal.deadline ? <Text style={s.txMeta}>Prazo: {formatDate(goal.deadline)}</Text> : null}
                    </View>
                    {goal.completed ? <Text style={{ fontSize: 24 }}>✅</Text> : null}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={s.txMeta}>{formatBRL(goal.current)} guardado</Text>
                    <Text style={{ fontWeight: '700', color: goal.color, fontSize: 15 }}>{pct.toFixed(0)}%</Text>
                  </View>
                  <ProgressBar value={pct} color={goal.color} height={10} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                    <Text style={s.txMeta}>Meta: {formatBRL(goal.target)}</Text>
                    {!goal.completed ? <Text style={s.txMeta}>Falta: {formatBRL(remaining)}</Text> : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    {!goal.completed && (
                      <TouchableOpacity
                        onPress={() => {
                          setDepositTarget(goal);
                          setDepositAmount('');
                        }}
                        style={[s.depositBtn, { backgroundColor: goal.color, flex: 1 }]}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Depositar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => openEdit(goal)}
                      style={[s.modalBtn, { backgroundColor: C.primaryLight, flex: 1 }]}
                    >
                      <Text style={{ color: C.primary, fontWeight: '700' }}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(goal)}
                      style={[s.modalBtn, { backgroundColor: C.dangerLight, paddingHorizontal: 14 }]}
                    >
                      <Text style={{ color: C.danger, fontWeight: '700' }}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}

        <TouchableOpacity onPress={openCreate} activeOpacity={0.8} style={s.addGoalBtn}>
          <Text style={{ fontSize: 22 }}>＋</Text>
          <Text style={{ color: C.primary, fontWeight: '700', fontSize: 16 }}>Nova Meta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={!!depositTarget}
        animationType="fade"
        transparent
        onRequestClose={() => setDepositTarget(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={s.overlay} onPress={() => setDepositTarget(null)}>
            <Pressable style={s.bottomSheet} onPress={e => e.stopPropagation()}>
              <Text style={s.modalTitle}>Depositar em {depositTarget?.name}</Text>
              <TextInput
                style={[s.amountInput, { marginTop: 16 }]}
                value={depositAmount}
                onChangeText={(text) => {
                  setDepositAmount(text);
                  touch();
                }}
                keyboardType="decimal-pad"
                placeholder="Valor (R$)"
                placeholderTextColor={C.textMuted}
                autoFocus
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setDepositTarget(null)}
                  style={[s.modalBtn, { backgroundColor: C.divider, flex: 1 }]}
                >
                  <Text style={{ color: C.textMid, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void handleDeposit()}
                  style={[s.modalBtn, { backgroundColor: C.primary, flex: 1 }]}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={formVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFormVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setFormVisible(false)}>
              <Text style={{ color: C.textMid, fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editingId ? 'Editar meta' : 'Nova meta'}</Text>
            <TouchableOpacity onPress={() => void handleSaveForm()} style={[s.modalSaveBtn, { backgroundColor: C.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={s.formGroup}>
              <Text style={s.formLabel}>NOME</Text>
              <TextInput
                style={s.textInput}
                value={form.name}
                onChangeText={(name) => {
                  setForm(f => ({ ...f, name }));
                  touch();
                }}
                placeholder="Ex: Viagem"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>VALOR OBJETIVO (R$)</Text>
              <TextInput
                style={s.amountInput}
                value={form.target}
                onChangeText={(target) => {
                  setForm(f => ({ ...f, target }));
                  touch();
                }}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <DateField
              label="PRAZO (opcional)"
              value={form.deadline}
              onChange={deadline => setForm(f => ({ ...f, deadline }))}
              optional
            />
            <View style={s.formGroup}>
              <Text style={s.formLabel}>ÍCONE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    onPress={() => setForm(f => ({ ...f, icon: ic }))}
                    style={[s.iconBtn, form.icon === ic && { borderColor: C.primary, backgroundColor: C.primaryLight }]}
                  >
                    <Text style={{ fontSize: 24 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>COR</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {GOAL_COLORS.map(col => (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setForm(f => ({ ...f, color: col }))}
                    style={[s.colorDot, { backgroundColor: col }, form.color === col && { borderWidth: 3, borderColor: C.text }]}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
