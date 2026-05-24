import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TxType, TxModalState } from '../types';
import { useAppTheme } from '../hooks/useAppTheme';
import { formatBRL, todayStr } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import { PAYMENT_METHODS } from '../constants/finance';
import { useCategories } from '../context/CategoryContext';
import {
  buildInstallmentSchedule,
  splitAmountEvenly,
  type InstallmentScheduleItem,
} from '../utils/installments';

type AmountMode = 'total' | 'per_installment';

export function TransactionModal({
  state,
  onClose,
}: {
  state: TxModalState;
  onClose: () => void;
}) {
  const { C, s } = useAppTheme();
  const { addTransaction, addTransactions } = useApp();
  const { categories } = useCategories();
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('📦');
  const [categoryColor, setCategoryColor] = useState<string>(C.textMuted);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate] = useState(todayStr());
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState('3');
  const [amountMode, setAmountMode] = useState<AmountMode>('total');
  const [perInstallmentAmount, setPerInstallmentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
      setInstallmentCount('3');
      setAmountMode('total');
      setPerInstallmentAmount('');
      setSaving(false);
    }
  }, [state.visible, C.textMuted]);

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both');

  const parsedMainAmount = parseFloat(amount.replace(',', '.')) || 0;
  const countNum = Math.max(2, Math.min(120, parseInt(installmentCount, 10) || 2));

  const computedPerInstallment = useMemo(() => {
    if (amountMode === 'per_installment') return parsedMainAmount;
    if (parsedMainAmount <= 0) return 0;
    return splitAmountEvenly(parsedMainAmount, countNum)[0];
  }, [amountMode, parsedMainAmount, countNum]);

  const previewSchedule: InstallmentScheduleItem[] = useMemo(() => {
    if (!isInstallment || parsedMainAmount <= 0) return [];
    const per =
      amountMode === 'per_installment'
        ? parseFloat(perInstallmentAmount.replace(',', '.')) || parsedMainAmount
        : computedPerInstallment;
    if (per <= 0) return [];
    return buildInstallmentSchedule({
      firstDate: date,
      count: countNum,
      amountMode: 'per_installment',
      inputAmount: per,
    });
  }, [isInstallment, parsedMainAmount, amountMode, perInstallmentAmount, computedPerInstallment, date, countNum]);

  useEffect(() => {
    if (!isInstallment) return;
    if (amountMode === 'total' && computedPerInstallment > 0) {
      setPerInstallmentAmount(computedPerInstallment.toFixed(2).replace('.', ','));
    }
  }, [isInstallment, amountMode, computedPerInstallment, countNum]);

  const handlePerInstallmentChange = (text: string) => {
    setPerInstallmentAmount(text);
    const per = parseFloat(text.replace(',', '.'));
    if (amountMode === 'per_installment' && per > 0) {
      setAmount(String((per * countNum).toFixed(2)).replace('.', ','));
    }
  };

  const handleSave = async () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Campo obrigatório', 'Informe uma descrição.');
      return;
    }

    const base = {
      type,
      description: description.trim(),
      category: category || 'Outros',
      categoryIcon,
      categoryColor,
      paymentMethod,
    };

    setSaving(true);
    try {
      if (isInstallment && type === 'expense') {
        const per =
          parseFloat(perInstallmentAmount.replace(',', '.')) ||
          (amountMode === 'per_installment' ? parsed : computedPerInstallment);
        if (!per || per <= 0) {
          Alert.alert('Valor inválido', 'Informe o valor de cada parcela.');
          return;
        }
        const schedule = buildInstallmentSchedule({
          firstDate: date,
          count: countNum,
          amountMode: 'per_installment',
          inputAmount: per,
        });
        await addTransactions(
          schedule.map(item => ({
            ...base,
            amount: item.amount,
            date: item.date,
            isInstallment: true,
            installmentInfo: item.installmentInfo,
          }))
        );
      } else {
        await addTransaction({
          ...base,
          amount: parsed,
          date,
          isInstallment: false,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const totalPreview =
    previewSchedule.length > 0
      ? previewSchedule.reduce((s, i) => s + i.amount, 0)
      : parsedMainAmount;

  return (
    <Modal
      visible={state.visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={s.modalHeader}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Fechar lançamento"
            >
              <Text style={{ fontSize: 16, color: C.textMid }}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>Novo Lançamento</Text>
            <TouchableOpacity
              onPress={() => void handleSave()}
              disabled={saving}
              style={[s.modalSaveBtn, { backgroundColor: type === 'income' ? C.success : C.danger, opacity: saving ? 0.6 : 1 }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Salvar lançamento"
            >
              <Text style={{ fontSize: 15, color: '#fff', fontWeight: '700' }}>{saving ? '…' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.typeToggle}>
              <TouchableOpacity
                style={[s.typeBtn, type === 'expense' && { backgroundColor: C.danger }]}
                onPress={() => {
                  setType('expense');
                  setCategory('');
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, type === 'expense' && { color: '#fff' }]}>⬇ Saída</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.typeBtn, type === 'income' && { backgroundColor: C.success }]}
                onPress={() => {
                  setType('income');
                  setCategory('');
                  setIsInstallment(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, type === 'income' && { color: '#fff' }]}>⬆ Entrada</Text>
              </TouchableOpacity>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>
                {isInstallment && amountMode === 'total' ? 'VALOR TOTAL (R$)' : 'VALOR (R$)'}
              </Text>
              <TextInput
                style={[s.amountInput, { borderColor: type === 'income' ? C.success : C.danger }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={C.textMuted}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>DESCRIÇÃO</Text>
              <TextInput
                style={s.textInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Ex: Supermercado, TV..."
                placeholderTextColor={C.textMuted}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>{isInstallment ? 'DATA DA 1ª PARCELA' : 'DATA'}</Text>
              <TextInput
                style={s.textInput}
                value={date}
                onChangeText={setDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={C.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>CATEGORIA</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
                style={{ marginHorizontal: -20 }}
              >
                <View style={{ paddingLeft: 20, flexDirection: 'row', gap: 8 }}>
                  {filteredCats.map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => {
                        setCategory(cat.name);
                        setCategoryIcon(cat.icon);
                        setCategoryColor(cat.color);
                      }}
                      activeOpacity={0.7}
                      style={[
                        s.catChip,
                        category === cat.name && { borderColor: cat.color, backgroundColor: cat.color + '22' },
                      ]}
                    >
                      <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                      <Text
                        style={[
                          s.catChipText,
                          category === cat.name && { color: cat.color, fontWeight: '700' },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>FORMA DE PAGAMENTO</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 20 }}
                style={{ marginHorizontal: -20 }}
              >
                <View style={{ paddingLeft: 20, flexDirection: 'row', gap: 8 }}>
                  {PAYMENT_METHODS.map(pm => (
                    <TouchableOpacity
                      key={pm}
                      onPress={() => setPaymentMethod(pm)}
                      activeOpacity={0.7}
                      style={[
                        s.chip,
                        paymentMethod === pm && { backgroundColor: C.primary, borderColor: C.primary },
                      ]}
                    >
                      <Text style={[s.chipText, paymentMethod === pm && { color: '#fff' }]}>{pm}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {type === 'expense' && (
              <View style={[s.card, { padding: 16, marginBottom: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.formLabel, { marginBottom: 2 }]}>💳 COMPRA PARCELADA</Text>
                    <Text style={{ color: C.textMuted, fontSize: 13 }}>
                      Gera {countNum} lançamentos (um por mês)
                    </Text>
                  </View>
                  <Switch
                    value={isInstallment}
                    onValueChange={setIsInstallment}
                    trackColor={{ false: C.border, true: C.primary }}
                    thumbColor="#fff"
                    ios_backgroundColor={C.border}
                  />
                </View>

                {isInstallment && (
                  <View style={{ marginTop: 16, gap: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ color: C.textMid, fontSize: 14, flex: 1 }}>Número de parcelas</Text>
                      <TextInput
                        style={[s.textInput, { width: 72, textAlign: 'center' }]}
                        value={installmentCount}
                        onChangeText={v => setInstallmentCount(v.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                    </View>

                    <View>
                      <Text style={[s.formLabel, { marginBottom: 8 }]}>O VALOR INFORMADO É</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => setAmountMode('total')}
                          style={[
                            s.chip,
                            { flex: 1, justifyContent: 'center' },
                            amountMode === 'total' && { backgroundColor: C.primary, borderColor: C.primary },
                          ]}
                        >
                          <Text style={[s.chipText, amountMode === 'total' && { color: '#fff', textAlign: 'center' }]}>
                            Total da compra
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setAmountMode('per_installment')}
                          style={[
                            s.chip,
                            { flex: 1, justifyContent: 'center' },
                            amountMode === 'per_installment' && {
                              backgroundColor: C.primary,
                              borderColor: C.primary,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              s.chipText,
                              amountMode === 'per_installment' && { color: '#fff', textAlign: 'center' },
                            ]}
                          >
                            Cada parcela
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View>
                      <Text style={s.formLabel}>VALOR DE CADA PARCELA (R$)</Text>
                      <Text style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
                        Ajuste todas de uma vez (ex.: com juros no cartão)
                      </Text>
                      <TextInput
                        style={s.textInput}
                        value={perInstallmentAmount}
                        onChangeText={handlePerInstallmentChange}
                        keyboardType="decimal-pad"
                        placeholder="0,00"
                        placeholderTextColor={C.textMuted}
                      />
                    </View>

                    {previewSchedule.length > 0 && (
                      <View
                        style={{
                          backgroundColor: C.primaryLight,
                          padding: 12,
                          borderRadius: 10,
                        }}
                      >
                        <Text style={{ fontWeight: '700', color: C.primary, marginBottom: 4 }}>
                          {countNum}x de {formatBRL(previewSchedule[0]?.amount ?? 0)}
                        </Text>
                        <Text style={{ fontSize: 13, color: C.textMid }}>
                          Total: {formatBRL(totalPreview)} · de {previewSchedule[0]?.date.split('-').reverse().join('/')} até{' '}
                          {previewSchedule[previewSchedule.length - 1]?.date.split('-').reverse().join('/')}
                        </Text>
                      </View>
                    )}
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
