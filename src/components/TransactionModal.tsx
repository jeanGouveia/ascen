import React, { useEffect, useState } from 'react';
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
import { C, s } from '../styles/theme';
import { TxType, TxModalState } from '../types';
import { todayStr } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import { CATEGORIES, PAYMENT_METHODS } from '../constants/finance';

export function TransactionModal({
  state,
  onClose,
}: {
  state: TxModalState;
  onClose: () => void;
}) {
  const { addTransaction } = useApp();
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('📦');
  const [categoryColor, setCategoryColor] = useState(C.textMuted);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [date, setDate] = useState(todayStr());
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState('2');

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
      setInstallments('2');
    }
  }, [state.visible]);

  const filteredCats = CATEGORIES.filter(c => c.type === type || c.type === 'both');

  const handleSave = () => {
    const parsed = parseFloat(amount.replace(',', '.'));
    if (!parsed || parsed <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Campo obrigatório', 'Informe uma descrição.');
      return;
    }
    addTransaction({
      type,
      amount: parsed,
      description: description.trim(),
      category: category || 'Outros',
      categoryIcon,
      categoryColor,
      paymentMethod,
      date,
      isInstallment,
      installmentInfo: isInstallment ? `1/${installments}` : undefined,
    });
    onClose();
  };

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
                }}
                activeOpacity={0.8}
              >
                <Text style={[s.typeBtnText, type === 'income' && { color: '#fff' }]}>⬆ Entrada</Text>
              </TouchableOpacity>
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>VALOR (R$)</Text>
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
                placeholder="Ex: Supermercado, Aposentadoria..."
                placeholderTextColor={C.textMuted}
              />
            </View>

            <View style={s.formGroup}>
              <Text style={s.formLabel}>DATA</Text>
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
                      key={cat.name}
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
                    <Text style={{ color: C.textMuted, fontSize: 13 }}>Cria uma parcela por mês</Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 12 }}>
                    <Text style={{ color: C.textMid, fontSize: 15, flex: 1 }}>Número de parcelas:</Text>
                    <TextInput
                      style={[s.textInput, { width: 72, textAlign: 'center' }]}
                      value={installments}
                      onChangeText={v => setInstallments(v.replace(/[^0-9]/g, ''))}
                      keyboardType="number-pad"
                    />
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
