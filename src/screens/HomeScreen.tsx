import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { formatBRL, currentMonthName } from '../utils/helpers';
import { useAppTheme } from '../hooks/useAppTheme';
import { EmptyState, TxCard, FAB } from '../components/Shared';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSession } from '../context/SessionContext';
import { requestSync } from '../services/sync/syncCoordinator';
import { SyncReason } from '../types/sync';
import {
  filterTransactionsByMonth,
  getCurrentYearMonth,
  getMonthSummary,
} from '../utils/financeAggregates';

export function HomeScreen() {
  const { C, s } = useAppTheme();
  const navigation = useNavigation<any>();
  const { transactions, openTxModal } = useApp();
  const { user } = useAuth();
  const { touch } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const { year, month } = getCurrentYearMonth();

  // Reset timer when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      touch();
    }, [touch])
  );

  const { income, expense, balance } = useMemo(
    () => getMonthSummary(transactions, year, month),
    [transactions, year, month]
  );

  const recent = useMemo(() => {
    const monthTx = filterTransactionsByMonth(transactions, year, month);
    return [...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [transactions, year, month]);

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
      <SyncStatusBar />
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
        <Text style={{ fontSize: 12, color: C.textMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>
          ASCEN
        </Text>
        <Text style={[s.pageTitle, { marginBottom: 20 }]}>Início</Text>

        <View style={s.balanceCard}>
          <View style={s.balanceGlow} />
          <Text style={s.balanceLabel}>Saldo · {currentMonthName()}</Text>
          <Text style={s.balanceValue}>{formatBRL(balance)}</Text>
          <View style={s.balanceRow}>
            <View style={s.balanceSub}>
              <View style={[s.dot, { backgroundColor: '#4ADE80' }]} />
              <View>
                <Text style={s.balanceSubLabel}>Entradas</Text>
                <Text style={s.balanceSubValue}>{formatBRL(income)}</Text>
              </View>
            </View>
            <View style={s.balanceDivider} />
            <View style={s.balanceSub}>
              <View style={[s.dot, { backgroundColor: '#FCA5A5' }]} />
              <View>
                <Text style={s.balanceSubLabel}>Saídas</Text>
                <Text style={s.balanceSubValue}>{formatBRL(expense)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => openTxModal('expense')}
            activeOpacity={0.85}
            style={[s.quickBtn, { backgroundColor: C.danger, flex: 1 }]}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>+ Saída</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openTxModal('income')}
            activeOpacity={0.85}
            style={[s.quickBtn, { backgroundColor: C.success, flex: 1 }]}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>+ Entrada</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.text }}>Recentes</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Lançamentos')}>
            <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Nenhum lançamento este mês"
            subtitle="Use os botões acima para registrar"
          />
        ) : (
          <View style={{ gap: 8 }}>
            {recent.map(tx => (
              <TxCard key={tx.id} tx={tx} />
            ))}
          </View>
        )}
      </ScrollView>
      <FAB />
    </SafeAreaView>
  );
}
