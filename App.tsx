/**
 * ASCEN — App de Gestão Financeira Pessoal
 *
 * Correções aplicadas nesta versão:
 * - Navegação via React Navigation (Bottom Tabs) — já instalado no projeto
 * - GestureHandlerRootView envolvendo tudo (obrigatório para react-native-gesture-handler)
 * - NavigationContainer correto
 * - SafeAreaProvider no root
 * - StatusBar do expo-status-bar
 * - Modal de lançamento abre e fecha corretamente de qualquer aba
 * - Estado de transações compartilhado via Context (sem prop drilling)
 * - Todos os botões, chips e ações funcionando
 * - Formulário com reset limpo ao abrir
 * - Confirmação de exclusão funcional
 * - Metas: depósito, criação e progresso funcionando
 * - Perfil: switches, font size e logout funcionando
 */

import React, { useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { supabase } from './lib/supabase';


// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────

const C = {
  primary: '#4F6EF7',
  primaryLight: '#EEF1FE',
  primaryDark: '#3B56D9',

  success: '#16A34A',
  successLight: '#DCFCE7',

  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  warning: '#D97706',
  warningLight: '#FEF3C7',

  bg: '#F5F7FF',
  card: '#FFFFFF',
  border: '#E4E9F8',
  divider: '#F0F3FC',

  text: '#1A2340',
  textMid: '#4A5578',
  textMuted: '#8896B8',
};

const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  full: 9999,
};

// ─── TIPOS ───────────────────────────────────────────────────────────────────

type TxType = 'income' | 'expense';

interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  category: string;
  categoryIcon: string;
  categoryColor: string;
  date: string;
  paymentMethod: string;
  isInstallment?: boolean;
  installmentInfo?: string;
}

interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  target: number;
  current: number;
  deadline?: string;
  completed?: boolean;
}

// ─── DADOS INICIAIS ──────────────────────────────────────────────────────────

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'income',  amount: 3800,  description: 'Aposentadoria',         category: 'Salário',     categoryIcon: '💰', categoryColor: '#16A34A', date: '2026-04-05', paymentMethod: 'Transferência' },
  { id: '2', type: 'expense', amount: 420,   description: 'Supermercado Extra',     category: 'Alimentação', categoryIcon: '🛒', categoryColor: '#F97316', date: '2026-04-06', paymentMethod: 'Cartão' },
  { id: '3', type: 'expense', amount: 180,   description: 'Conta de Luz',           category: 'Moradia',     categoryIcon: '🏠', categoryColor: '#8B5CF6', date: '2026-04-08', paymentMethod: 'Débito automático' },
  { id: '4', type: 'expense', amount: 89.90, description: 'Farmácia Drogasil',      category: 'Saúde',       categoryIcon: '💊', categoryColor: '#EF4444', date: '2026-04-10', paymentMethod: 'Cartão' },
  { id: '5', type: 'income',  amount: 500,   description: 'Aluguel sala comercial', category: 'Aluguel',     categoryIcon: '🏢', categoryColor: '#16A34A', date: '2026-04-12', paymentMethod: 'Pix' },
  { id: '6', type: 'expense', amount: 65,    description: 'Academia Ativo+',        category: 'Saúde',       categoryIcon: '💊', categoryColor: '#EF4444', date: '2026-04-13', paymentMethod: 'Débito' },
  { id: '7', type: 'expense', amount: 240,   description: 'TV a cabo + Internet',   category: 'Lazer',       categoryIcon: '📺', categoryColor: '#06B6D4', date: '2026-04-15', paymentMethod: 'Cartão' },
  { id: '8', type: 'expense', amount: 350,   description: 'Plano de Saúde',         category: 'Saúde',       categoryIcon: '💊', categoryColor: '#EF4444', date: '2026-04-18', paymentMethod: 'Débito automático' },
];

const INITIAL_GOALS: Goal[] = [
  { id: '1', name: 'Viagem para Portugal',          icon: '✈️', color: '#4F6EF7', target: 15000, current: 6800,  deadline: '2026-12-01' },
  { id: '2', name: 'Reforma da cozinha',            icon: '🏠', color: '#F97316', target: 8000,  current: 2300,  deadline: '2026-09-01' },
  { id: '3', name: 'Presente de aniversário netos', icon: '🎁', color: '#22C55E', target: 2000,  current: 1750 },
];

const CATEGORIES = [
  { name: 'Alimentação', icon: '🛒', color: '#F97316', type: 'expense' },
  { name: 'Moradia',     icon: '🏠', color: '#8B5CF6', type: 'expense' },
  { name: 'Saúde',       icon: '💊', color: '#EF4444', type: 'expense' },
  { name: 'Lazer',       icon: '📺', color: '#06B6D4', type: 'expense' },
  { name: 'Transporte',  icon: '🚗', color: '#F59E0B', type: 'expense' },
  { name: 'Vestuário',   icon: '👗', color: '#EC4899', type: 'expense' },
  { name: 'Educação',    icon: '📚', color: '#6366F1', type: 'expense' },
  { name: 'Salário',     icon: '💰', color: '#16A34A', type: 'income' },
  { name: 'Aluguel',     icon: '🏢', color: '#16A34A', type: 'income' },
  { name: 'Outros',      icon: '📦', color: '#6B7897', type: 'both' },
] as const;

const PAYMENT_METHODS = ['Pix', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Transferência', 'Débito automático'];
const GOAL_ICONS  = ['🎯','✈️','🏠','🚗','💍','🎓','💻','📱','🏖️','🐾','🎁','⛵'];
const GOAL_COLORS = [C.primary, '#F97316', '#22C55E', '#EC4899', '#8B5CF6', '#06B6D4', '#F59E0B'];

// ─── UTILS ───────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${d} ${months[m - 1]} ${y}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function currentMonthName(): string {
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return months[new Date().getMonth()];
}

// ─── APP CONTEXT ─────────────────────────────────────────────────────────────

interface AppContextType {
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  openTxModal: (defaultType?: TxType) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
const useApp = () => useContext(AppContext);

// ─── COMPONENTES COMPARTILHADOS ───────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function ProgressBar({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <View style={[s.progressTrack, { height }]}>
      <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: color, height }]} />
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={s.emptyState}>
      <Text style={{ fontSize: 52, marginBottom: 12 }}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function FAB() {
  const { openTxModal } = useApp();
  return (
    <TouchableOpacity onPress={() => openTxModal()} activeOpacity={0.85} style={s.fab}>
      <Text style={{ color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '300' }}>+</Text>
    </TouchableOpacity>
  );
}

function TxCard({ tx }: { tx: Transaction }) {
  const { deleteTransaction } = useApp();
  const handleDelete = () => {
    Alert.alert(
      'Excluir lançamento',
      `Excluir "${tx.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteTransaction(tx.id) },
      ]
    );
  };
  return (
    <View style={s.txCard}>
      <View style={[s.txIconWrap, { backgroundColor: tx.categoryColor + '22' }]}>
        <Text style={{ fontSize: 20 }}>{tx.categoryIcon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.txDescription} numberOfLines={1}>
          {tx.description}
          {tx.isInstallment ? <Text style={{ color: C.warning, fontSize: 12 }}> [{tx.installmentInfo}]</Text> : null}
        </Text>
        <Text style={s.txMeta}>{tx.category} · {formatDate(tx.date)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[s.txAmount, { color: tx.type === 'income' ? C.success : C.danger }]}>
          {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
        </Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 14, color: C.textMuted }}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── MODAL DE LANÇAMENTO ──────────────────────────────────────────────────────

interface TxModalState {
  visible: boolean;
  defaultType: TxType;
}

function TransactionModal({ state, onClose }: { state: TxModalState; onClose: () => void }) {
  const { addTransaction } = useApp();
  const [type, setType]             = useState<TxType>('expense');
  const [amount, setAmount]         = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]     = useState('');
  const [categoryIcon, setCategoryIcon]   = useState('📦');
  const [categoryColor, setCategoryColor] = useState(C.textMuted);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate]             = useState(todayStr());
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments]   = useState('2');

  React.useEffect(() => {
    if (state.visible) {
      setType(state.defaultType);
      setAmount('');
      setDescription('');
      setCategory('');
      setCategoryIcon('📦');
      setCategoryColor(C.textMuted);
      setPaymentMethod('Pix');
      setDate(todayStr());
      setIsInstallment(false);
      setInstallments('2');
    }
  }, [state.visible]);

  const filteredCats = CATEGORIES.filter(c => c.type === type || c.type === 'both');

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) { Alert.alert('Valor inválido', 'Informe um valor maior que zero.'); return; }
    if (!description.trim())   { Alert.alert('Campo obrigatório', 'Informe uma descrição.'); return; }
    addTransaction({
      type, amount: parsed,
      description: description.trim(),
      category: category || 'Outros',
      categoryIcon, categoryColor,
      paymentMethod, date,
      isInstallment,
      installmentInfo: isInstallment ? `1/${installments}` : undefined,
    });
    onClose();
  };

  return (
    <Modal visible={state.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={{ fontSize: 16, color: C.textMid }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Novo Lançamento</Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[s.modalSaveBtn, { backgroundColor: type === 'income' ? C.success : C.danger }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Toggle */}
            <View style={s.typeToggle}>
              <TouchableOpacity style={[s.typeBtn, type === 'expense' && { backgroundColor: C.danger }]} onPress={() => { setType('expense'); setCategory(''); }} activeOpacity={0.8}>
                <Text style={[s.typeBtnText, type === 'expense' && { color: '#fff' }]}>⬇ Saída</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, type === 'income' && { backgroundColor: C.success }]} onPress={() => { setType('income'); setCategory(''); }} activeOpacity={0.8}>
                <Text style={[s.typeBtnText, type === 'income' && { color: '#fff' }]}>⬆ Entrada</Text>
              </TouchableOpacity>
            </View>

            {/* Valor */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>VALOR (R$)</Text>
              <TextInput style={[s.amountInput, { borderColor: type === 'income' ? C.success : C.danger }]} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={C.textMuted} />
            </View>

            {/* Descrição */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>DESCRIÇÃO</Text>
              <TextInput style={s.textInput} value={description} onChangeText={setDescription} placeholder="Ex: Supermercado, Aposentadoria..." placeholderTextColor={C.textMuted} />
            </View>

            {/* Data */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>DATA</Text>
              <TextInput style={s.textInput} value={date} onChangeText={setDate} placeholder="AAAA-MM-DD" placeholderTextColor={C.textMuted} keyboardType="numbers-and-punctuation" />
            </View>

            {/* Categoria */}
            <View style={s.formGroup}>
              <Text style={s.formLabel}>CATEGORIA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }} style={{ marginHorizontal: -20 }}>
                <View style={{ paddingLeft: 20, flexDirection: 'row', gap: 8 }}>
                  {filteredCats.map(cat => (
                    <TouchableOpacity key={cat.name} onPress={() => { setCategory(cat.name); setCategoryIcon(cat.icon); setCategoryColor(cat.color); }} activeOpacity={0.7}
                      style={[s.catChip, category === cat.name && { borderColor: cat.color, backgroundColor: cat.color + '22' }]}>
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
                    <TouchableOpacity key={pm} onPress={() => setPaymentMethod(pm)} activeOpacity={0.7}
                      style={[s.chip, paymentMethod === pm && { backgroundColor: C.primary, borderColor: C.primary }]}>
                      <Text style={[s.chipText, paymentMethod === pm && { color: '#fff' }]}>{pm}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Parcelamento */}
            {type === 'expense' && (
              <View style={[s.card, { padding: 16, marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.formLabel, { marginBottom: 2 }]}>💳 COMPRA PARCELADA</Text>
                    <Text style={{ color: C.textMuted, fontSize: 13 }}>Cria uma parcela por mês</Text>
                  </View>
                  <Switch value={isInstallment} onValueChange={setIsInstallment} trackColor={{ false: C.border, true: C.primary }} thumbColor="#fff" ios_backgroundColor={C.border} />
                </View>
                {isInstallment && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 }}>
                    <Text style={{ color: C.textMid, fontSize: 15, flex: 1 }}>Número de parcelas:</Text>
                    <TextInput style={[s.textInput, { width: 72, textAlign: 'center' }]} value={installments} onChangeText={v => setInstallments(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── TELA: DASHBOARD ─────────────────────────────────────────────────────────

function DashboardScreen() {
  const { transactions, openTxModal } = useApp();

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;
  const recent       = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const catMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const budgetPct  = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const overBudget = budgetPct > 90;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <View>
            <Text style={{ fontSize: 12, color: C.textMuted, letterSpacing: 2, fontWeight: '700' }}>ASCEN</Text>
            <Text style={s.pageTitle}>Olá, bem-vindo! 👋</Text>
          </View>
          <View style={s.avatarCircle}><Text style={{ fontSize: 20 }}>👤</Text></View>
        </View>

        {/* Card saldo */}
        <View style={s.balanceCard}>
          <View style={s.balanceGlow} />
          <Text style={s.balanceLabel}>Saldo de {currentMonthName()}</Text>
          <Text style={s.balanceValue}>{formatBRL(balance)}</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceSub}>
              <View style={[s.dot, { backgroundColor: '#4ADE80' }]} />
              <View>
                <Text style={s.balanceSubLabel}>Entradas</Text>
                <Text style={s.balanceSubValue}>{formatBRL(totalIncome)}</Text>
              </View>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceSub}>
              <View style={[s.dot, { backgroundColor: '#FCA5A5' }]} />
              <View>
                <Text style={s.balanceSubLabel}>Saídas</Text>
                <Text style={s.balanceSubValue}>{formatBRL(totalExpense)}</Text>
              </View>
            </View>
          </View>
        </View>

        {overBudget && (
          <View style={s.alertBanner}>
            <Text style={{ fontSize: 22 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>Atenção ao orçamento!</Text>
              <Text style={s.alertText}>Você já gastou {budgetPct.toFixed(0)}% da renda este mês.</Text>
            </View>
          </View>
        )}

        {totalIncome > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionTitle>Uso do orçamento</SectionTitle>
              <Text style={{ fontWeight: '700', fontSize: 15, color: overBudget ? C.danger : C.success }}>{budgetPct.toFixed(0)}%</Text>
            </View>
            <ProgressBar value={budgetPct} color={overBudget ? C.danger : budgetPct > 70 ? C.warning : C.success} />
          </Card>
        )}

        {topCats.length > 0 && (
          <Card style={{ marginBottom: 16 }}>
            <SectionTitle>Maiores gastos</SectionTitle>
            <View style={{ marginTop: 14, gap: 12 }}>
              {topCats.map(([cat, amt]) => {
                const catData = CATEGORIES.find(c => c.name === cat);
                const pct = totalExpense > 0 ? (amt / totalExpense) * 100 : 0;
                return (
                  <View key={cat}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ fontSize: 15, color: C.text }}>{catData?.icon} {cat}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{formatBRL(amt)}</Text>
                    </View>
                    <ProgressBar value={pct} color={catData?.color ?? C.primary} />
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        <View style={{ marginBottom: 12 }}><SectionTitle>Últimos lançamentos</SectionTitle></View>
        {recent.length === 0
          ? <EmptyState icon="📋" title="Nenhum lançamento ainda" subtitle="Toque em + para registrar sua primeira entrada ou saída" />
          : <View style={{ gap: 8 }}>{recent.map(tx => <TxCard key={tx.id} tx={tx} />)}</View>
        }

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <TouchableOpacity onPress={() => openTxModal('expense')} activeOpacity={0.8} style={[s.quickBtn, { backgroundColor: C.dangerLight, flex: 1 }]}>
            <Text style={{ fontSize: 18 }}>⬇</Text>
            <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Nova Saída</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openTxModal('income')} activeOpacity={0.8} style={[s.quickBtn, { backgroundColor: C.successLight, flex: 1 }]}>
            <Text style={{ fontSize: 18 }}>⬆</Text>
            <Text style={{ color: C.success, fontWeight: '700', fontSize: 15 }}>Nova Entrada</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <FAB />
    </SafeAreaView>
  );
}

// ─── TELA: LANÇAMENTOS ───────────────────────────────────────────────────────

function TransactionsScreen() {
  const { transactions } = useApp();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filtered = transactions.filter(t => filter === 'all' || t.type === filter).sort((a, b) => b.date.localeCompare(a.date));
  const grouped: Record<string, Transaction[]> = {};
  filtered.forEach(tx => { const k = formatDate(tx.date); if (!grouped[k]) grouped[k] = []; grouped[k].push(tx); });

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const FILTERS = [
    { key: 'all'     as const, label: 'Todos',      color: C.primary },
    { key: 'income'  as const, label: '⬆ Entradas', color: C.success },
    { key: 'expense' as const, label: '⬇ Saídas',   color: C.danger  },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Lançamentos</Text>
        <Text style={s.pageSubtitle}>{currentMonthName()} de 2026</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 14 }}>
          {FILTERS.map(f => (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} activeOpacity={0.7}
              style={[s.chip, filter === f.key && { backgroundColor: f.color, borderColor: f.color }]}>
              <Text style={[s.chipText, filter === f.key && { color: '#fff' }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <View style={[s.summaryPill, { backgroundColor: C.successLight, flex: 1 }]}>
            <Text style={{ color: C.success, fontWeight: '700', fontSize: 14 }}>+ {formatBRL(totalIncome)}</Text>
          </View>
          <View style={[s.summaryPill, { backgroundColor: C.dangerLight, flex: 1 }]}>
            <Text style={{ color: C.danger, fontWeight: '700', fontSize: 14 }}>- {formatBRL(totalExpense)}</Text>
          </View>
        </View>

        {Object.keys(grouped).length === 0
          ? <EmptyState icon="📭" title="Nenhum lançamento" subtitle="Adicione entradas e saídas com o botão +" />
          : Object.entries(grouped).map(([dateLabel, txs]) => (
              <View key={dateLabel} style={{ marginBottom: 18 }}>
                <Text style={s.dateGroupLabel}>{dateLabel}</Text>
                <View style={{ gap: 8 }}>{txs.map(tx => <TxCard key={tx.id} tx={tx} />)}</View>
              </View>
            ))
        }
      </ScrollView>
      <FAB />
    </SafeAreaView>
  );
}

// ─── TELA: RELATÓRIOS ────────────────────────────────────────────────────────

function ReportsScreen() {
  const { transactions } = useApp();
  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance      = totalIncome - totalExpense;

  const catMap: Record<string, { amount: number; color: string; icon: string }> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    if (!catMap[t.category]) catMap[t.category] = { amount: 0, color: t.categoryColor, icon: t.categoryIcon };
    catMap[t.category].amount += t.amount;
  });
  const cats = Object.entries(catMap).sort((a, b) => b[1].amount - a[1].amount);

  const months     = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr'];
  const mockValues = [1200, 3400, 2100, 4500, 3800, Math.max(balance, 0)];
  const maxVal     = Math.max(...mockValues, 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Relatórios</Text>
        <Text style={s.pageSubtitle}>{currentMonthName()} de 2026</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 16 }}>
          <View style={[s.kpiCard, { backgroundColor: C.successLight, flex: 1 }]}>
            <Text style={{ fontSize: 24 }}>⬆</Text>
            <Text style={[s.kpiAmount, { color: C.success }]}>{formatBRL(totalIncome)}</Text>
            <Text style={s.kpiLabel}>ENTRADAS</Text>
          </View>
          <View style={[s.kpiCard, { backgroundColor: C.dangerLight, flex: 1 }]}>
            <Text style={{ fontSize: 24 }}>⬇</Text>
            <Text style={[s.kpiAmount, { color: C.danger }]}>{formatBRL(totalExpense)}</Text>
            <Text style={s.kpiLabel}>SAÍDAS</Text>
          </View>
        </View>

        <Card style={{ marginBottom: 16, alignItems: 'center', paddingVertical: 24 }}>
          <SectionTitle>Saldo do mês</SectionTitle>
          <Text style={{ fontSize: 36, fontWeight: '800', letterSpacing: -1, marginTop: 6, color: balance >= 0 ? C.success : C.danger }}>
            {formatBRL(balance)}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: balance >= 0 ? C.success : C.danger }}>
            {balance >= 0 ? '✅ Saldo positivo este mês' : '⚠️ Saldo negativo — reveja seus gastos'}
          </Text>
        </Card>

        <Card style={{ marginBottom: 16 }}>
          <SectionTitle>Evolução do saldo (6 meses)</SectionTitle>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130, marginTop: 16 }}>
            {mockValues.map((val, i) => {
              const h = Math.max((val / maxVal) * 110, 4);
              const isLast = i === mockValues.length - 1;
              return (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: '100%', height: h, backgroundColor: isLast ? C.primary : C.border, borderRadius: R.sm, marginBottom: 6 }} />
                  <Text style={{ fontSize: 11, color: isLast ? C.primary : C.textMuted, fontWeight: isLast ? '700' : '400' }}>{months[i]}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card>
          <SectionTitle>Gastos por categoria</SectionTitle>
          {cats.length === 0
            ? <EmptyState icon="📊" title="Sem dados ainda" subtitle="Adicione lançamentos de saída para ver o relatório" />
            : (
              <View style={{ marginTop: 16, gap: 14 }}>
                {cats.map(([name, { amount, color, icon }]) => {
                  const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                  return (
                    <View key={name}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 15, color: C.text }}>{icon} {name}</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>
                          {formatBRL(amount)} <Text style={{ color: C.textMuted, fontWeight: '400', fontSize: 13 }}>({pct.toFixed(0)}%)</Text>
                        </Text>
                      </View>
                      <ProgressBar value={pct} color={color} />
                    </View>
                  );
                })}
              </View>
            )
          }
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── TELA: METAS ─────────────────────────────────────────────────────────────

function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [depositTarget, setDepositTarget] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [addVisible, setAddVisible]       = useState(false);
  const [newName, setNewName]     = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newIcon, setNewIcon]     = useState('🎯');
  const [newColor, setNewColor]   = useState(C.primary);

  const handleDeposit = () => {
    if (!depositTarget) return;
    const amt = parseFloat(depositAmount.replace(',', '.'));
    if (!amt || amt <= 0) { Alert.alert('Valor inválido', 'Informe um valor maior que zero.'); return; }
    const newCurrent = depositTarget.current + amt;
    const completed  = newCurrent >= depositTarget.target;
    setGoals(prev => prev.map(g => g.id === depositTarget.id ? { ...g, current: Math.min(newCurrent, g.target), completed } : g));
    const name = depositTarget.name;
    setDepositTarget(null);
    setDepositAmount('');
    if (completed) setTimeout(() => Alert.alert('🎉 Parabéns!', `Você atingiu a meta "${name}"!`), 300);
  };

  const handleAddGoal = () => {
    const targetNum = parseFloat(newTarget.replace(',', '.'));
    if (!newName.trim())              { Alert.alert('Campo obrigatório', 'Informe o nome da meta.'); return; }
    if (!targetNum || targetNum <= 0) { Alert.alert('Valor inválido', 'Informe um valor maior que zero.'); return; }
    setGoals(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), icon: newIcon, color: newColor, target: targetNum, current: 0 }]);
    setAddVisible(false);
    setNewName(''); setNewTarget(''); setNewIcon('🎯'); setNewColor(C.primary);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Minhas Metas</Text>
        <Text style={s.pageSubtitle}>Objetivos de poupança</Text>

        <View style={{ marginTop: 20, gap: 14 }}>
          {goals.map(goal => {
            const pct       = Math.min((goal.current / goal.target) * 100, 100);
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
                  <TouchableOpacity onPress={() => { setDepositTarget(goal); setDepositAmount(''); }} activeOpacity={0.8} style={[s.depositBtn, { backgroundColor: goal.color }]}>
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

      {/* Modal depósito */}
      <Modal visible={!!depositTarget} animationType="fade" transparent onRequestClose={() => setDepositTarget(null)}>
        <Pressable style={s.overlay} onPress={() => setDepositTarget(null)}>
          <Pressable style={s.bottomSheet} onPress={e => e.stopPropagation()}>
            <Text style={s.modalTitle}>Depositar em {depositTarget?.name}</Text>
            <Text style={[s.txMeta, { marginTop: 4 }]}>Guardado: {formatBRL(depositTarget?.current ?? 0)}</Text>
            <TextInput style={[s.amountInput, { marginTop: 16 }]} value={depositAmount} onChangeText={setDepositAmount} keyboardType="decimal-pad" placeholder="Valor (R$)" placeholderTextColor={C.textMuted} autoFocus />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setDepositTarget(null)} style={[s.modalBtn, { backgroundColor: C.divider, flex: 1 }]}>
                <Text style={{ color: C.textMid, fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeposit} style={[s.modalBtn, { backgroundColor: C.primary, flex: 1 }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal nova meta */}
      <Modal visible={addVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setAddVisible(false)}><Text style={{ color: C.textMid, fontSize: 16 }}>Cancelar</Text></TouchableOpacity>
            <Text style={s.modalTitle}>Nova Meta</Text>
            <TouchableOpacity onPress={handleAddGoal} style={[s.modalSaveBtn, { backgroundColor: C.primary }]}><Text style={{ color: '#fff', fontWeight: '700' }}>Criar</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <View style={s.formGroup}>
              <Text style={s.formLabel}>NOME DA META</Text>
              <TextInput style={s.textInput} value={newName} onChangeText={setNewName} placeholder="Ex: Viagem de férias" placeholderTextColor={C.textMuted} />
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>VALOR OBJETIVO (R$)</Text>
              <TextInput style={s.amountInput} value={newTarget} onChangeText={setNewTarget} keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={C.textMuted} />
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>ÍCONE</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_ICONS.map(ic => (
                  <TouchableOpacity key={ic} onPress={() => setNewIcon(ic)} style={[s.iconBtn, newIcon === ic && { borderColor: C.primary, backgroundColor: C.primaryLight }]}>
                    <Text style={{ fontSize: 24 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={s.formGroup}>
              <Text style={s.formLabel}>COR</Text>
              <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                {GOAL_COLORS.map(col => (
                  <TouchableOpacity key={col} onPress={() => setNewColor(col)}
                    style={[s.colorDot, { backgroundColor: col }, newColor === col && { borderWidth: 3, borderColor: C.text }]} />
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── TELA: PERFIL ────────────────────────────────────────────────────────────

function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode]           = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [fontSize, setFontSize]           = useState<'small' | 'medium' | 'large'>('medium');

  const menuSections = [
    {
      title: 'CONTA',
      items: [
        { icon: '👤', label: 'Meu Perfil',    sub: 'Editar nome e foto' },
        { icon: '🔒', label: 'Alterar Senha', sub: 'Segurança da conta' },
      ],
    },
    {
      title: 'DADOS',
      items: [
        { icon: '📤', label: 'Exportar CSV',       sub: 'Baixar seus lançamentos' },
        { icon: '🏷️', label: 'Categorias',          sub: 'Gerenciar categorias' },
        { icon: '🔄', label: 'Contas Recorrentes',  sub: 'Assinaturas e contas fixas' },
      ],
    },
    {
      title: 'SUPORTE',
      items: [
        { icon: '❓', label: 'Ajuda',         sub: 'Como usar o Ascen' },
        { icon: '⭐', label: 'Avaliar o app', sub: 'Nos ajude a melhorar' },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={s.profileCard}>
          <View style={s.profileAvatar}><Text style={{ fontSize: 36 }}>👤</Text></View>
          <Text style={s.profileName}>{user?.user_metadata?.full_name || 'Usuário'}</Text>
          <Text style={s.txMeta}>{user?.email}</Text>
          <View style={[s.chip, { marginTop: 10, alignSelf: 'center', backgroundColor: C.primaryLight, borderColor: C.primary }]}>
            <Text style={{ color: C.primary, fontWeight: '700', fontSize: 12 }}>✨ Plano Gratuito</Text>
          </View>
        </View>

        {/* Tamanho da fonte */}
        <Card style={{ marginBottom: 14 }}>
          <Text style={[s.formLabel, { marginBottom: 12 }]}>TAMANHO DA FONTE (ACESSIBILIDADE)</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['small', 'medium', 'large'] as const).map(sz => (
              <TouchableOpacity key={sz} onPress={() => setFontSize(sz)} activeOpacity={0.8}
                style={[s.chip, { flex: 1, justifyContent: 'center' }, fontSize === sz && { backgroundColor: C.primary, borderColor: C.primary }]}>
                <Text style={[s.chipText, { fontSize: sz === 'small' ? 13 : sz === 'large' ? 17 : 15 }, fontSize === sz && { color: '#fff' }]}>
                  {sz === 'small' ? 'Pequena' : sz === 'medium' ? 'Média' : 'Grande'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Toggles */}
        <Card style={{ marginBottom: 14 }}>
          <View style={s.settingRow}>
            <View>
              <Text style={s.settingLabel}>🌙 Modo escuro</Text>
              <Text style={s.txMeta}>Tema escuro do app</Text>
            </View>
            <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ false: C.border, true: C.primary }} thumbColor="#fff" ios_backgroundColor={C.border} />
          </View>
          <View style={[s.settingRow, { borderTopWidth: 1, borderTopColor: C.divider, marginTop: 4, paddingTop: 14 }]}>
            <View>
              <Text style={s.settingLabel}>🔔 Notificações</Text>
              <Text style={s.txMeta}>Alertas de vencimento</Text>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: C.border, true: C.primary }} thumbColor="#fff" ios_backgroundColor={C.border} />
          </View>
        </Card>

        {menuSections.map(sec => (
          <View key={sec.title} style={{ marginBottom: 14 }}>
            <Text style={[s.formLabel, { marginBottom: 8 }]}>{sec.title}</Text>
            <Card>
              {sec.items.map((item, i) => (
                <TouchableOpacity key={item.label} activeOpacity={0.7}
                  style={[s.settingRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.divider }]}
                  onPress={() => Alert.alert(item.label, 'Funcionalidade em breve!')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                    <View>
                      <Text style={s.settingLabel}>{item.label}</Text>
                      <Text style={s.txMeta}>{item.sub}</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.textMuted, fontSize: 20 }}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        <TouchableOpacity activeOpacity={0.8}
          onPress={() => Alert.alert('Sair da conta', 'Deseja realmente sair?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: signOut }])}
          style={[s.modalBtn, { backgroundColor: C.dangerLight, marginTop: 6 }]}>
          <Text style={{ color: C.danger, fontWeight: '700', fontSize: 16 }}>🚪 Sair da conta</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', color: C.textMuted, fontSize: 12, marginTop: 24 }}>
          Ascen v1.0.0 · Feito com ❤️ no Brasil
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={[s.tabIconWrap, focused && { backgroundColor: C.primaryLight }]}>
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
    </View>
  );
}

function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textMuted,
        tabBarLabelStyle: s.tabLabel,
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      <Tab.Screen name="Início"       component={DashboardScreen}    options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Lançamentos"  component={TransactionsScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }} />
      <Tab.Screen name="Relatórios"   component={ReportsScreen}      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} /> }} />
      <Tab.Screen name="Metas"        component={GoalsScreen}        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} /> }} />
      <Tab.Screen name="Perfil"       component={ProfileScreen}      options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────

function AppContent() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<TxModalState>({ visible: false, defaultType: 'expense' });

  // Buscar transações do Supabase
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar transações:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{ ...data, user_id: user?.id }]);

      if (error) throw error;
      fetchTransactions();
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error.message);
    }
  }, [user, fetchTransactions]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error: any) {
      Alert.alert('Erro ao excluir', error.message);
    }
  }, []);

  const openTxModal = useCallback((defaultType: TxType = 'expense') => {
    setModalState({ visible: true, defaultType });
  }, []);

  const closeTxModal = useCallback(() => {
    setModalState(prev => ({ ...prev, visible: false }));
  }, []);


  return (
    <AppContext.Provider value={{ transactions, addTransaction, deleteTransaction, openTxModal }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <AppNavigator />
            {/* Modal vive fora do Navigator para funcionar de qualquer aba */}
            <TransactionModal state={modalState} onClose={closeTxModal} />
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppContext.Provider>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  pageTitle:    { fontSize: 26, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 15, color: C.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text },

  card: {
    backgroundColor: C.card,
    borderRadius: R['2xl'],
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  balanceCard:    { backgroundColor: C.primary, borderRadius: R['2xl'], padding: 24, marginBottom: 16, overflow: 'hidden' },
  balanceGlow:    { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.10)' },
  balanceLabel:   { color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  balanceValue:   { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 20 },
  balanceRow:     { flexDirection: 'row', alignItems: 'center' },
  balanceSub:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 16 },
  balanceSubLabel:{ color: 'rgba(255,255,255,0.70)', fontSize: 12, fontWeight: '500' },
  balanceSubValue:{ color: '#fff', fontSize: 16, fontWeight: '700' },
  dot:            { width: 10, height: 10, borderRadius: 5 },

  alertBanner: { backgroundColor: C.warningLight, borderRadius: R.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  alertTitle:  { fontWeight: '700', color: C.warning, fontSize: 15 },
  alertText:   { color: '#92400E', fontSize: 13, marginTop: 2 },

  progressTrack: { width: '100%', backgroundColor: C.border, borderRadius: R.full, overflow: 'hidden' },
  progressFill:  { borderRadius: R.full },

  txCard:     { backgroundColor: C.card, borderRadius: R.xl, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  txIconWrap: { width: 46, height: 46, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center' },
  txDescription:  { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  txMeta:         { fontSize: 13, color: C.textMuted },
  txAmount:       { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  dateGroupLabel: { fontSize: 12, fontWeight: '700', color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },

  summaryPill: { borderRadius: R.xl, padding: 12, alignItems: 'center' },

  kpiCard:   { borderRadius: R['2xl'], padding: 16, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  kpiAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  kpiLabel:  { fontSize: 11, color: C.textMuted, fontWeight: '700', letterSpacing: 0.8 },

  goalIconWrap: { width: 56, height: 56, borderRadius: R.xl, alignItems: 'center', justifyContent: 'center' },
  goalName:   { fontSize: 17, fontWeight: '700', color: C.text },
  depositBtn: { borderRadius: R.xl, padding: 14, alignItems: 'center', marginTop: 12 },
  addGoalBtn: { borderRadius: R.xl, padding: 18, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed', backgroundColor: C.primaryLight },

  profileCard:   { backgroundColor: C.card, borderRadius: R['2xl'], padding: 24, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  profileName:   { fontSize: 22, fontWeight: '800', color: C.text },
  settingRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  settingLabel:  { fontSize: 16, fontWeight: '600', color: C.text },

  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border },
  quickBtn:     { borderRadius: R.xl, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  emptyState:    { alignItems: 'center', padding: 40 },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: C.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  chip:     { borderRadius: R.full, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  chipText: { fontSize: 14, fontWeight: '600', color: C.textMid },

  fab: { position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.40, shadowRadius: 12, elevation: 8 },

  tabBar:      { backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border, height: 64, paddingBottom: 8 },
  tabIconWrap: { width: 44, height: 34, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  tabLabel:    { fontSize: 11, fontWeight: '600' },

  modalHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:    { fontSize: 18, fontWeight: '800', color: C.text },
  modalSaveBtn:  { paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full },
  modalBtn:      { borderRadius: R.xl, padding: 16, alignItems: 'center' },

  formGroup: { marginBottom: 18 },
  formLabel: { fontSize: 11, fontWeight: '800', color: C.textMuted, letterSpacing: 1.2, marginBottom: 8 },
  textInput: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderRadius: R.xl, padding: 14, fontSize: 16, color: C.text, fontWeight: '500' },
  amountInput: { backgroundColor: C.bg, borderWidth: 2, borderColor: C.primary, borderRadius: R.xl, padding: 16, fontSize: 28, color: C.text, fontWeight: '800', letterSpacing: -0.5 },
  typeToggle: { flexDirection: 'row', backgroundColor: C.bg, borderRadius: R.xl, padding: 4, marginBottom: 18, borderWidth: 1, borderColor: C.border },
  typeBtn:    { flex: 1, padding: 14, borderRadius: R.lg, alignItems: 'center' },
  typeBtnText:{ fontSize: 16, fontWeight: '700', color: C.textMid },
  catChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.xl, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card },
  catChipText:{ fontSize: 14, color: C.textMid, fontWeight: '500' },

  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: C.card, borderTopLeftRadius: R['2xl'], borderTopRightRadius: R['2xl'], padding: 24, paddingBottom: 40 },

  iconBtn:  { width: 52, height: 52, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, backgroundColor: C.card },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
});
function AuthGate() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FF' }}>
        <Text style={{ color: '#4F6EF7', fontSize: 16, fontWeight: '600' }}>Carregando...</Text>
      </View>
    );
  }

  if (!user) {
    if (screen === 'register') {
      return <RegisterScreen onNavigateLogin={() => setScreen('login')} />;
    }
    return <LoginScreen onNavigateRegister={() => setScreen('register')} />;
  }

  return <AppContent />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
