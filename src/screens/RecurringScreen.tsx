/**
 * src/screens/RecurringScreen.tsx
 * 
 * Tela de Contas Recorrentes do Ascen.
 * 
 * O que é uma conta recorrente:
 * - Uma regra que define "todo dia X do mês, lançar R$ Y na categoria Z"
 * - Exemplos: aluguel, plano de saúde, Netflix, academia, salário
 * - Diferente de parcelamento: recorrente não tem fim previsto
 * 
 * Funcionamento:
 * - O usuário cadastra a regra (descrição, valor, dia, categoria, tipo)
 * - Todo mês, ao abrir o app, o sistema verifica quais regras
 *   ainda não geraram lançamento no mês atual e oferece confirmar
 * - O usuário pode marcar individualmente "Pago/Recebido" ou ignorar
 * - A tela lista todas as regras com status do mês corrente
 * 
 * Integração com Supabase:
 * - Tabela `recurring_rules` (SQL ao final do arquivo)
 * - Geração de lançamentos via AppContext.addTransaction
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { createRecurringLocalStyles, RecurringLocalStyles } from '../styles/recurringLocalStyles';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card } from '../components/Shared';
import { DateField } from '../components/DateField';
import { PAYMENT_METHODS } from '../constants/finance';
import { TxType } from '../types';
import { useRecurring, RecurringRule, RecurringInput, RecurringFrequency } from '../context/RecurringContext';
import { useCategories } from '../context/CategoryContext';
import { isRuleActiveInCurrentMonth } from '../utils/recurringDates';

// ─── TIPOS ───────────────────────────────────────────────────

// ─── UTILS ───────────────────────────────────────────────────

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function currentMonthName() {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return months[new Date().getMonth()];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function ordinal(n: number): string {
  return `dia ${n}`;
}

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  monthly: 'Todo mês',
  weekly:  'Toda semana',
  yearly:  'Todo ano',
};

// ─── COMPONENTE: CARD DE REGRA ────────────────────────────────

interface RuleCardProps {
  ls: RecurringLocalStyles;
  rule: RecurringRule;
  confirmedId: string | null;
  onConfirm: (rule: RecurringRule) => void;
  onEdit:    (rule: RecurringRule) => void;
  onToggle:  (rule: RecurringRule) => void;
  onDelete:  (rule: RecurringRule) => void;
}

function RuleCard({ ls, rule, confirmedId, onConfirm, onEdit, onToggle, onDelete }: RuleCardProps) {
  const { C } = useAppTheme();
  const isIncome    = rule.type === 'income';
  const isDue =
    rule.active && !rule.confirmedThisMonth && !rule.skippedThisMonth && isRuleActiveInCurrentMonth(rule);
  const isConfirmed = rule.confirmedThisMonth;

  return (
    <View style={[
      ls.ruleCard,
      !rule.active && { opacity: 0.55 },
      isDue && { borderColor: isIncome ? C.success : C.warning, borderWidth: 1.5 },
      confirmedId === rule.id && { borderColor: C.success, borderWidth: 2 },
    ]}>
      {/* Badge de vencimento */}
      {isDue && (
        <View style={[ls.dueBadge, { backgroundColor: isIncome ? C.successLight : C.warningLight }]}>
          <Text style={[ls.dueBadgeText, { color: isIncome ? C.success : C.warning }]}>
            {isIncome ? '⬆ A receber' : `⚠ Vence ${ordinal(rule.dayOfMonth)}`}
          </Text>
        </View>
      )}
      {isConfirmed && (
        <View style={[ls.dueBadge, { backgroundColor: C.successLight }]}>
          <Text style={[ls.dueBadgeText, { color: C.success }]}>✅ Confirmado este mês</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Ícone */}
        <View style={[ls.ruleIcon, { backgroundColor: rule.categoryColor + '22' }]}>
          <Text style={{ fontSize: 22 }}>{rule.categoryIcon}</Text>
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <Text style={ls.ruleDesc}>{rule.description}</Text>
          <Text style={ls.ruleMeta}>
            {FREQ_LABELS[rule.frequency]} · {ordinal(rule.dayOfMonth)} · {rule.paymentMethod}
          </Text>
        </View>

        {/* Valor */}
        <Text style={[ls.ruleAmount, { color: isIncome ? C.success : C.danger }]}>
          {isIncome ? '+' : '-'}{formatBRL(rule.amount)}
        </Text>
      </View>

      {/* Ações */}
      <View style={ls.ruleActions}>
        {/* Confirmar — só aparece se pendente */}
        {isDue && (
          <TouchableOpacity
            onPress={() => onConfirm(rule)}
            activeOpacity={0.8}
            style={[ls.actionBtn, { backgroundColor: isIncome ? C.success : C.primary, flex: 1 }]}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
              {isIncome ? '✓ Marcar recebido' : '✓ Marcar pago'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Editar */}
        <TouchableOpacity
          onPress={() => onEdit(rule)}
          activeOpacity={0.7}
          style={[ls.actionBtnSec, isDue && { flex: 0 }]}
        >
          <Text style={{ color: C.textMid, fontSize: 13, fontWeight: '600' }}>✏️</Text>
        </TouchableOpacity>

        {/* Ativar/Pausar */}
        <TouchableOpacity
          onPress={() => onToggle(rule)}
          activeOpacity={0.7}
          style={ls.actionBtnSec}
        >
          <Text style={{ color: C.textMid, fontSize: 13, fontWeight: '600' }}>
            {rule.active ? '⏸' : '▶️'}
          </Text>
        </TouchableOpacity>

        {/* Excluir */}
        <TouchableOpacity
          onPress={() => onDelete(rule)}
          activeOpacity={0.7}
          style={ls.actionBtnSec}
        >
          <Text style={{ color: C.danger, fontSize: 13, fontWeight: '600' }}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── FORMULÁRIO DE REGRA ──────────────────────────────────────

interface RuleFormProps {
  visible:  boolean;
  editing:  RecurringRule | null;
  onSave:   (rule: RecurringInput) => void;
  onClose:  () => void;
  ls:       RecurringLocalStyles;
}

function RuleForm({ visible, editing, onSave, onClose, ls }: RuleFormProps) {
  const { C, s } = useAppTheme();
  const [type, setType]           = useState<TxType>('expense');
  const [desc, setDesc]           = useState('');
  const [amount, setAmount]       = useState('');
  const [category, setCategory]   = useState('');
  const [catIcon, setCatIcon]     = useState('📦');
  const [catColor, setCatColor]   = useState<string>(C.textMuted);
  const [payMethod, setPayMethod] = useState('Débito automático');
  const [day, setDay]             = useState('5');
  const [freq, setFreq]           = useState<RecurringFrequency>('monthly');
  const [active, setActive]       = useState(true);
  const [startsOn, setStartsOn]   = useState(todayStr());

  // Preenche ao editar
  useEffect(() => {
    if (visible) {
      if (editing) {
        setType(editing.type);
        setDesc(editing.description);
        setAmount(String(editing.amount));
        setCategory(editing.category);
        setCatIcon(editing.categoryIcon);
        setCatColor(editing.categoryColor);
        setPayMethod(editing.paymentMethod);
        setDay(String(editing.dayOfMonth));
        setFreq(editing.frequency);
        setActive(editing.active);
        setStartsOn(editing.startsOn);
      } else {
        setType('expense'); setDesc(''); setAmount(''); setCategory('');
        setCatIcon('📦'); setCatColor(C.textMuted); setPayMethod('Débito automático');
        setDay('5'); setFreq('monthly'); setActive(true);
        setStartsOn(todayStr());
      }
    }
  }, [visible, editing]);

  const { categories } = useCategories();
  const filteredCats = categories.filter(c => c.type === type || c.type === 'both');

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    const dayNum = parseInt(day);
    if (!desc.trim())                    { Alert.alert('Campo obrigatório', 'Informe uma descrição.'); return; }
    if (!parsed || parsed <= 0)          { Alert.alert('Valor inválido',    'Informe um valor maior que zero.'); return; }
    if (!dayNum || dayNum < 1 || dayNum > 28) { Alert.alert('Dia inválido', 'Informe um dia entre 1 e 28.'); return; }

    onSave({
      type, description: desc.trim(), amount: parsed,
      category: category || 'Outros', categoryIcon: catIcon, categoryColor: catColor,
      paymentMethod: payMethod, dayOfMonth: dayNum, frequency: freq, active, startsOn,
    });
  };

  const FREQS: { key: RecurringFrequency; label: string }[] = [
    { key: 'monthly', label: 'Mensal' },
    { key: 'weekly',  label: 'Semanal' },
    { key: 'yearly',  label: 'Anual' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Header */}
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 16, color: C.textMid }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{editing ? 'Editar' : 'Nova'} Recorrência</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[s.modalSaveBtn, { backgroundColor: type === 'income' ? C.success : C.primary }]}
            >
              <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Tipo */}
            <View style={s.typeToggle}>
              <TouchableOpacity
                style={[s.typeBtn, type === 'expense' && { backgroundColor: C.danger }]}
                onPress={() => { setType('expense'); setCategory(''); }}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, type === 'expense' && { color: '#fff' }]}>⬇ Saída fixa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, type === 'income' && { backgroundColor: C.success }]}
                onPress={() => { setType('income'); setCategory(''); }}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, type === 'income' && { color: '#fff' }]}>⬆ Entrada fixa</Text>
              </TouchableOpacity>
            </View>

            {/* Descrição */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>DESCRIÇÃO</Text>
              <TextInput
                style={s.textInput} value={desc} onChangeText={setDesc}
                placeholder="Ex: Plano de saúde, Netflix, Salário..."
                placeholderTextColor={C.textMuted}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>VÁLIDA A PARTIR DE</Text>
              <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                Só gera lançamentos a partir desta data (não retroage meses anteriores).
              </Text>
              <TextInput
                style={s.textInput}
                value={startsOn}
                onChangeText={setStartsOn}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={C.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* Valor */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>VALOR (R$)</Text>
              <TextInput
                style={[s.amountInput, { borderColor: type === 'income' ? C.success : C.danger }]}
                value={amount} onChangeText={setAmount}
                keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={C.textMuted}
              />
            </View>

            {/* Frequência + Dia */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>FREQUÊNCIA</Text>
                <View style={{ gap: 6 }}>
                  {FREQS.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      onPress={() => setFreq(f.key)}
                      activeOpacity={0.7}
                      style={[
                        ls.freqBtn,
                        freq === f.key && { backgroundColor: C.primary, borderColor: C.primary },
                      ]}
                    >
                      <Text style={[ls.freqTxt, freq === f.key && { color: '#fff' }]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.formLabel}>
                  {freq === 'monthly' ? 'DIA DO MÊS' : freq === 'weekly' ? 'DIA DA SEMANA' : 'DIA DO ANO'}
                </Text>
                <TextInput
                  style={[s.textInput, { fontSize: 22, fontWeight: '700', textAlign: 'center', paddingVertical: 18 }]}
                  value={day} onChangeText={v => setDay(v.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad" placeholder="5"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={{ color: C.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' }}>
                  {freq === 'monthly' ? '1 a 28' : ''}
                </Text>
              </View>
            </View>

            {/* Categoria */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>CATEGORIA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }} style={{ marginHorizontal: -20 }}>
                <View style={{ paddingLeft: 20, flexDirection: 'row', gap: 8 }}>
                  {filteredCats.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => { setCategory(cat.name); setCatIcon(cat.icon); setCatColor(cat.color); }}
                      activeOpacity={0.7}
                      style={[s.catChip, category === cat.name && { borderColor: cat.color, backgroundColor: cat.color + '22' }]}
                    >
                      <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                      <Text style={[s.catChipText, category === cat.name && { color: cat.color, fontWeight: '700' }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Pagamento */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>FORMA DE PAGAMENTO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }} style={{ marginHorizontal: -20 }}>
                <View style={{ paddingLeft: 20, flexDirection: 'row', gap: 8 }}>
                  {PAYMENT_METHODS.map(pm => (
                    <TouchableOpacity
                      key={pm} onPress={() => setPayMethod(pm)} activeOpacity={0.7}
                      style={[s.chip, payMethod === pm && { backgroundColor: C.primary, borderColor: C.primary }]}
                    >
                      <Text style={[s.chipText, payMethod === pm && { color: '#fff' }]}>{pm}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Ativo */}
            <View style={[s.card, { padding: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>Regra ativa</Text>
                  <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                    {active ? 'Gerando lançamentos todo mês' : 'Pausada — não gera lançamentos'}
                  </Text>
                </View>
                <Switch
                  value={active} onValueChange={setActive}
                  trackColor={{ false: C.border, true: C.primary }}
                  thumbColor="#fff" ios_backgroundColor={C.border}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── TELA PRINCIPAL ───────────────────────────────────────────

export function RecurringScreen() {
  const navigation = useNavigation();
  const { C, s } = useAppTheme();
  const ls = useMemo(() => createRecurringLocalStyles(C), [C]);
  const { rules, loading, addRule, updateRule, deleteRule, toggleActive, confirmRule } = useRecurring();
  const [formVisible, setFormVisible]   = useState(false);
  const [editingRule, setEditingRule]   = useState<RecurringRule | null>(null);
  const [filterType, setFilterType]     = useState<'all' | 'income' | 'expense'>('all');
  const [confirmedId, setConfirmedId]   = useState<string | null>(null);

  // Resumo do mês
  const activeRules  = rules.filter(r => r.active);
  const totalExpense = activeRules.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const totalIncome  = activeRules.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const pendingCount = activeRules.filter(
    r => !r.confirmedThisMonth && !r.skippedThisMonth && isRuleActiveInCurrentMonth(r)
  ).length;

  // Lista filtrada
  const filtered = rules.filter(r => filterType === 'all' || r.type === filterType);
  const pending   = filtered.filter(
    r => r.active && !r.confirmedThisMonth && !r.skippedThisMonth && isRuleActiveInCurrentMonth(r)
  );
  const upcoming  = filtered.filter(r => r.active && !isRuleActiveInCurrentMonth(r));
  const confirmed = filtered.filter(r => r.confirmedThisMonth);
  const paused    = filtered.filter(r => !r.active);

  // Confirmar: salva no banco e cria lançamento
  const handleConfirm = useCallback(
    (rule: RecurringRule) => {
      Alert.alert(
        rule.type === 'expense' ? 'Confirmar pagamento?' : 'Confirmar recebimento?',
        `${rule.description} · ${rule.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Confirmar',
            onPress: async () => {
              await confirmRule(rule);
              setConfirmedId(rule.id);
              setTimeout(() => setConfirmedId(null), 2000);
            },
          },
        ]
      );
    },
    [confirmRule]
  );

  const handleEdit = (rule: RecurringRule) => {
    setEditingRule(rule);
    setFormVisible(true);
  };

  const handleToggle = (rule: RecurringRule) => toggleActive(rule.id);

  const handleDelete = (rule: RecurringRule) => {
    Alert.alert(
      'Excluir recorrência',
      `Excluir "${rule.description}"?\n\nAs transações já lançadas não serão afetadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteRule(rule.id) },
      ]
    );
  };

  const handleSave = async (data: RecurringInput) => {
    if (editingRule) {
      await updateRule(editingRule.id, data);
    } else {
      await addRule(data);
    }
    setFormVisible(false);
    setEditingRule(null);
  };

  const FILTERS = [
    { key: 'all'     as const, label: 'Todos',      color: C.primary },
    { key: 'income'  as const, label: '⬆ Entradas', color: C.success },
    { key: 'expense' as const, label: '⬇ Saídas',   color: C.danger  },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* Header com botão voltar */}
      <View style={ls.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 22, color: C.textMid }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.pageTitle}>Contas Recorrentes</Text>
          <Text style={s.pageSubtitle}>Assinaturas e contas fixas</Text>
        </View>
        <TouchableOpacity
          onPress={() => { setEditingRule(null); setFormVisible(true); }}
          activeOpacity={0.8}
          style={ls.addBtn}
        >
          <Text style={{ color: '#fff', fontSize: 22, lineHeight: 26, fontWeight: '300' }}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Resumo do mês */}
        <View style={ls.summaryCard}>
          <View style={ls.summaryGlow} />
          <Text style={ls.summaryMonth}>{currentMonthName()}</Text>

          <View style={{ flexDirection: 'row', gap: 0 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={ls.summaryLabel}>Entradas fixas</Text>
              <Text style={[ls.summaryValue, { color: '#4ADE80' }]}>{formatBRL(totalIncome)}</Text>
            </View>
            <View style={ls.summaryDivider} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={ls.summaryLabel}>Saídas fixas</Text>
              <Text style={[ls.summaryValue, { color: '#FCA5A5' }]}>{formatBRL(totalExpense)}</Text>
            </View>
          </View>

          {pendingCount > 0 && (
            <View style={ls.pendingBadge}>
              <Text style={ls.pendingBadgeText}>
                🔔 {pendingCount} conta{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''} este mês
              </Text>
            </View>
          )}
        </View>

        {/* Filtros */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key} onPress={() => setFilterType(f.key)} activeOpacity={0.7}
              style={[s.chip, filterType === f.key && { backgroundColor: f.color, borderColor: f.color }]}
            >
              <Text style={[s.chipText, filterType === f.key && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Pendentes */}
        {pending.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={ls.groupLabel}>PENDENTES ESTE MÊS</Text>
            <View style={{ gap: 12 }}>
              {pending.map(rule => (
                <RuleCard
                  key={rule.id}
                  ls={ls}
                  rule={rule}
                  confirmedId={confirmedId}
                  onConfirm={handleConfirm} onEdit={handleEdit}
                  onToggle={handleToggle}   onDelete={handleDelete}
                />
              ))}
            </View>
          </View>
        )}

        {upcoming.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={ls.groupLabel}>INÍCIO FUTURO</Text>
            <View style={{ gap: 12 }}>
              {upcoming.map(rule => (
                <RuleCard
                  key={rule.id}
                  ls={ls}
                  rule={rule}
                  confirmedId={confirmedId}
                  onConfirm={handleConfirm}
                  onEdit={handleEdit}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          </View>
        )}

        {/* Confirmadas */}
        {confirmed.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={ls.groupLabel}>CONFIRMADAS</Text>
            <View style={{ gap: 12 }}>
              {confirmed.map(rule => (
                <RuleCard
                  key={rule.id}
                  ls={ls}
                  rule={rule}
                  confirmedId={confirmedId}
                  onConfirm={handleConfirm} onEdit={handleEdit}
                  onToggle={handleToggle}   onDelete={handleDelete}
                />
              ))}
            </View>
          </View>
        )}

        {/* Pausadas */}
        {paused.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={ls.groupLabel}>PAUSADAS</Text>
            <View style={{ gap: 12 }}>
              {paused.map(rule => (
                <RuleCard
                  key={rule.id}
                  ls={ls}
                  rule={rule}
                  confirmedId={confirmedId}
                  onConfirm={handleConfirm} onEdit={handleEdit}
                  onToggle={handleToggle}   onDelete={handleDelete}
                />
              ))}
            </View>
          </View>
        )}

        {/* Estado vazio */}
        {filtered.length === 0 && (
          <View style={s.emptyState}>
            <Text style={{ fontSize: 52, marginBottom: 12 }}>🔄</Text>
            <Text style={s.emptyTitle}>Nenhuma conta recorrente</Text>
            <Text style={s.emptySubtitle}>
              Cadastre assinaturas, contas fixas e receitas mensais para acompanhar tudo em um lugar.
            </Text>
            <TouchableOpacity
              onPress={() => { setEditingRule(null); setFormVisible(true); }}
              activeOpacity={0.8}
              style={[ls.addBtn, { marginTop: 20, paddingHorizontal: 24 }]}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>+ Adicionar primeira conta</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dica */}
        <View style={ls.tipCard}>
          <Text style={{ fontSize: 18, marginBottom: 8 }}>💡</Text>
          <Text style={ls.tipText}>
            <Text style={{ fontWeight: '700' }}>Como funciona:</Text> cadastre suas contas fixas aqui. 
            Todo mês, confirme quando pagar/receber — o lançamento é criado automaticamente em Transações.
          </Text>
        </View>
      </ScrollView>

      {/* Formulário */}
      <RuleForm
        visible={formVisible}
        editing={editingRule}
        ls={ls}
        onSave={handleSave}
        onClose={() => { setFormVisible(false); setEditingRule(null); }}
      />
    </SafeAreaView>
  );
}

/*
─────────────────────────────────────────────────────────────
SQL — TABELA PARA O SUPABASE
Execute no SQL Editor do painel do Supabase.
─────────────────────────────────────────────────────────────

CREATE TABLE recurring_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description     TEXT NOT NULL,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  category        TEXT NOT NULL,
  category_icon   TEXT NOT NULL,
  category_color  TEXT NOT NULL,
  payment_method  TEXT NOT NULL,
  day_of_month    INT  NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  frequency       TEXT NOT NULL DEFAULT 'monthly'
                  CHECK (frequency IN ('monthly', 'weekly', 'yearly')),
  active          BOOLEAN DEFAULT TRUE,
  last_confirmed  DATE,   -- último mês em que foi confirmado (YYYY-MM-01)
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Segurança: cada usuário só vê suas próprias regras
ALTER TABLE recurring_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own rules" ON recurring_rules
  FOR ALL USING (auth.uid() = user_id);

-- Índice para buscar regras ativas do usuário rapidamente
CREATE INDEX idx_recurring_user_active ON recurring_rules(user_id, active);

─────────────────────────────────────────────────────────────
QUANDO INTEGRAR AO SUPABASE, no RecurringScreen:
─────────────────────────────────────────────────────────────

// Buscar regras:
const { data } = await supabase
  .from('recurring_rules')
  .select('*')
  .eq('active', true)
  .order('day_of_month');

// "Pendente este mês" = last_confirmed < início do mês atual
const startOfMonth = new Date();
startOfMonth.setDate(1);
const pendentes = data.filter(r =>
  !r.last_confirmed || new Date(r.last_confirmed) < startOfMonth
);

// Ao confirmar: atualiza last_confirmed + cria transação
await supabase.from('recurring_rules')
  .update({ last_confirmed: startOfMonth.toISOString().split('T')[0] })
  .eq('id', rule.id);

await supabase.from('transactions').insert([{
  user_id: user.id,
  type: rule.type,
  amount: rule.amount,
  description: rule.description,
  category: rule.category,
  category_icon: rule.category_icon,
  category_color: rule.category_color,
  payment_method: rule.payment_method,
  date: new Date().toISOString().split('T')[0],
  is_fixed: true,
}]);
*/
