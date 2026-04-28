import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, s } from '../styles/theme';
import { formatBRL, formatDate, currentMonthName } from '../utils/helpers';
import { EmptyState, TxCard, FAB } from '../components/Shared';
import { useApp } from '../context/AppContext';
import { Transaction } from '../types';

export function TransactionsScreen() {
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
