import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { formatBRL, formatDate, currentMonthName } from '../utils/helpers';
import { Card, EmptyState, TxCard, FAB } from '../components/Shared';
import { useApp } from '../context/AppContext';
import { useRecurring } from '../context/RecurringContext';
import { useAuth } from '../context/AuthContext';
import { requestSync } from '../services/sync/syncCoordinator';
import { SyncReason } from '../types/sync';
import { isRuleActiveInCurrentMonth } from '../utils/recurringDates';
import { Transaction } from '../types';

export function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const { C, s } = useAppTheme();
  const { transactions } = useApp();
  const { rules } = useRecurring();
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const recurringThisMonth = rules.filter(r => r.active && isRuleActiveInCurrentMonth(r));
  const recurringPending = recurringThisMonth.filter(r => !r.confirmedThisMonth);
  const recurringConfirmed = recurringThisMonth.filter(r => r.confirmedThisMonth);

  const FILTERS = [
    { key: 'all'     as const, label: 'Todos',      color: C.primary },
    { key: 'income'  as const, label: '⬆ Entradas', color: C.success },
    { key: 'expense' as const, label: '⬇ Saídas',   color: C.danger  },
  ];

  const today = new Date().toISOString().slice(0, 10);
  const filtered = transactions
    .filter(t => {
      if (t.isFixed && !t.isPaid && t.notes?.startsWith('recurring_rule:')) return false;
      return filter === 'all' || t.type === filter;
    })
    .sort((a, b) => {
      // Futuro/hoje no topo (mais próximo primeiro), depois passado (mais recente primeiro)
      const aFuture = a.date >= today;
      const bFuture = b.date >= today;
      if (aFuture && bFuture) return a.date.localeCompare(b.date);   // futuros: ascendente (amanhã antes de 2027)
      if (!aFuture && !bFuture) return b.date.localeCompare(a.date); // passados: descendente (ontem antes de 2023)
      return aFuture ? -1 : 1; // futuro/hoje sempre antes do passado
    });
  const grouped: Record<string, Transaction[]> = {};
  filtered.forEach(tx => { const k = formatDate(tx.date); if (!grouped[k]) grouped[k] = []; grouped[k].push(tx); });

  const totalIncome  = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

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
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Lançamentos</Text>
        <Text style={s.pageSubtitle}>{currentMonthName()} de 2026</Text>

        <Text style={[s.formLabel, { marginTop: 16, marginBottom: 8 }]}>RECORRÊNCIAS</Text>
        <Card style={{ marginBottom: 14 }}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={s.settingRow}
            onPress={() => navigation.navigate('Recorrentes')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22 }}>🔄</Text>
              <View>
                <Text style={s.settingLabel}>Contas recorrentes</Text>
                <Text style={s.txMeta}>Assinaturas, contas fixas e recebimentos fixos</Text>
              </View>
            </View>
            <Text style={{ color: C.textMuted, fontSize: 20 }}>›</Text>
          </TouchableOpacity>

          {recurringPending.length > 0 && (
            <View
              style={{ borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 10, marginTop: 4, gap: 6 }}
            >
              {recurringPending.map(rule => (
                <View
                  key={rule.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{rule.categoryIcon}</Text>
                    <Text style={s.txMeta}>{rule.description}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.txMeta, { color: rule.type === 'expense' ? C.danger : C.success }]}>
                      {rule.type === 'expense' ? '- ' : '+ '}
                      {formatBRL(rule.amount)}
                    </Text>
                    <View
                      style={{
                        backgroundColor: C.dangerLight,
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: C.danger, fontSize: 10, fontWeight: '700' }}>PENDENTE</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {recurringConfirmed.length > 0 && (
            <View
              style={{ borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 10, marginTop: 4, gap: 6 }}
            >
              {recurringConfirmed.map(rule => (
                <View
                  key={rule.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 16 }}>{rule.categoryIcon}</Text>
                    <Text style={s.txMeta}>{rule.description}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.txMeta, { color: rule.type === 'expense' ? C.danger : C.success }]}>
                      {rule.type === 'expense' ? '- ' : '+ '}
                      {formatBRL(rule.amount)}
                    </Text>
                    <View
                      style={{
                        backgroundColor: C.successLight,
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: C.success, fontSize: 10, fontWeight: '700' }}>
                        {rule.type === 'expense' ? '✓ PAGO' : '✓ RECEBIDO'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {recurringThisMonth.length === 0 && (
            <View
              style={{ borderTopWidth: 1, borderTopColor: C.divider, paddingTop: 10, marginTop: 4, paddingHorizontal: 4 }}
            >
              <Text style={[s.txMeta, { color: C.textMuted }]}>Nenhuma recorrência ativa este mês</Text>
            </View>
          )}
        </Card>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
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