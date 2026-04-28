import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, s } from '../styles/theme';
import { formatBRL, formatDate } from '../utils/helpers';
import { Card, ProgressBar, EmptyState } from '../components/Shared';
import { Goal } from '../types';

const INITIAL_GOALS: Goal[] = [
  {
    id: '1',
    name: 'Viagem para Portugal',
    icon: '✈️',
    color: '#4F6EF7',
    target: 15000,
    current: 6800,
    deadline: '2026-12-01',
  },
  {
    id: '2',
    name: 'Reforma da cozinha',
    icon: '🏠',
    color: '#F97316',
    target: 8000,
    current: 2300,
    deadline: '2026-09-01',
  },
  {
    id: '3',
    name: 'Presente de aniversário netos',
    icon: '🎁',
    color: '#22C55E',
    target: 2000,
    current: 1750,
  },
];

const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '💍', '🎓', '💻', '📱', '🏖️', '🐾', '🎁', '⛵'];
const GOAL_COLORS = [C.primary, '#F97316', '#22C55E', '#EC4899', '#8B5CF6', '#06B6D4', '#F59E0B'];

export function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [depositTarget, setDepositTarget] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newIcon, setNewIcon] = useState('🎯');
  const [newColor, setNewColor] = useState(C.primary);

  const handleDeposit = () => {
    if (!depositTarget) return;
    const amt = parseFloat(depositAmount.replace(',', '.'));
    if (!amt || amt <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    const newCurrent = depositTarget.current + amt;
    const completed = newCurrent >= depositTarget.target;
    setGoals(prev =>
      prev.map(g =>
        g.id === depositTarget.id
          ? { ...g, current: Math.min(newCurrent, g.target), completed }
          : g
      )
    );
    const name = depositTarget.name;
    setDepositTarget(null);
    setDepositAmount('');
    if (completed) setTimeout(() => Alert.alert('🎉 Parabéns!', `Você atingiu a meta "${name}"!`), 300);
  };

  const handleAddGoal = () => {
    const targetNum = parseFloat(newTarget.replace(',', '.'));
    if (!newName.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome da meta.');
      return;
    }
    if (!targetNum || targetNum <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    setGoals(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
        target: targetNum,
        current: 0,
      },
    ]);
    setAddVisible(false);
    setNewName('');
    setNewTarget('');
    setNewIcon('🎯');
    setNewColor(C.primary);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Minhas Metas</Text>
        <Text style={s.pageSubtitle}>Objetivos de poupança</Text>

        <View style={{ marginTop: 20, gap: 14 }}>
          {goals.map(goal => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            const remaining = goal.target - goal.current;
            return (
              <Card key={goal.id}>
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
                {!goal.completed && (
                  <TouchableOpacity
                    onPress={() => {
                      setDepositTarget(goal);
                      setDepositAmount('');
                    }}
                    activeOpacity={0.8}
                    style={[s.depositBtn, { backgroundColor: goal.color }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ Depositar</Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })}
        </View>

        <TouchableOpacity onPress={() => setAddVisible(true)} activeOpacity={0.8} style={s.addGoalBtn}>
          <Text style={{ fontSize: 22 }}>＋</Text>
          <Text style={{ color: C.primary, fontWeight: '700', fontSize: 16 }}>Nova Meta</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!depositTarget} animationType="fade" transparent onRequestClose={() => setDepositTarget(null)}>
        <Pressable style={s.overlay} onPress={() => setDepositTarget(null)}>
          <Pressable style={s.bottomSheet} onPress={e => e.stopPropagation()}>
            <Text style={s.modalTitle}>Depositar em {depositTarget?.name}</Text>
            <Text style={[s.txMeta, { marginTop: 4 }]}>Guardado: {formatBRL(depositTarget?.current ?? 0)}</Text>
            <TextInput
              style={[s.amountInput, { marginTop: 16 }]}
              value={depositAmount}
              onChangeText={setDepositAmount}
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
                onPress={handleDeposit}
                style={[s.modalBtn, { backgroundColor: C.primary, flex: 1 }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setAddVisible(false)}>
              <Text style={{ color: C.textMid, fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Nova Meta</Text>
            <TouchableOpacity onPress={handleAddGoal} style={[s.modalSaveBtn, { backgroundColor: C.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Criar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={s.formGroup}>
              <Text style={s.formLabel}>NOME DA META</Text>
              <TextInput
                style={s.textInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Ex: Viagem de férias"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>VALOR OBJETIVO (R$)</Text>
              <TextInput
                style={s.amountInput}
                value={newTarget}
                onChangeText={setNewTarget}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>ÍCONE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    onPress={() => setNewIcon(ic)}
                    style={[s.iconBtn, newIcon === ic && { borderColor: C.primary, backgroundColor: C.primaryLight }]}
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
                    onPress={() => setNewColor(col)}
                    style={[s.colorDot, { backgroundColor: col }, newColor === col && { borderWidth: 3, borderColor: C.text }]}
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
