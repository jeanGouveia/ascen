import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, s } from '../styles/theme';
import { formatBRL, currentMonthName } from '../utils/helpers';
import { Card, SectionTitle, ProgressBar, EmptyState, TxCard, FAB } from '../components/Shared';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../constants/finance';

export function HomeScreen() {
  const { transactions, openTxModal } = useApp();

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const catMap: Record<string, number> = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  const budgetPct = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const overBudget = budgetPct > 90;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}
        >
          <View>
            <Text style={{ fontSize: 12, color: C.textMuted, letterSpacing: 2, fontWeight: '700' }}>ASCEN</Text>
            <Text style={s.pageTitle}>Olá, bem-vindo! 👋</Text>
          </View>
          <View style={s.avatarCircle}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
        </View>

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
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 15,
                  color: overBudget ? C.danger : C.success,
                }}
              >
                {budgetPct.toFixed(0)}%
              </Text>
            </View>
            <ProgressBar
              value={budgetPct}
              color={overBudget ? C.danger : budgetPct > 70 ? C.warning : C.success}
            />
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
                      <Text style={{ fontSize: 15, color: C.text }}>
                        {catData?.icon} {cat}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{formatBRL(amt)}</Text>
                    </View>
                    <ProgressBar value={pct} color={catData?.color ?? C.primary} />
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        <View style={{ marginBottom: 12 }}>
          <SectionTitle>Últimos lançamentos</SectionTitle>
        </View>
        {recent.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Nenhum lançamento ainda"
            subtitle="Toque em + para registrar sua primeira entrada ou saída"
          />
        ) : (
          <View style={{ gap: 8 }}>{recent.map(tx => <TxCard key={tx.id} tx={tx} />)}</View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => openTxModal('expense')}
            activeOpacity={0.8}
            style={[s.quickBtn, { backgroundColor: C.dangerLight, flex: 1 }]}
          >
            <Text style={{ fontSize: 18 }}>⬇</Text>
            <Text style={{ color: C.danger, fontWeight: '700', fontSize: 15 }}>Nova Saída</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openTxModal('income')}
            activeOpacity={0.8}
            style={[s.quickBtn, { backgroundColor: C.successLight, flex: 1 }]}
          >
            <Text style={{ fontSize: 18 }}>⬆</Text>
            <Text style={{ color: C.success, fontWeight: '700', fontSize: 15 }}>Nova Entrada</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <FAB />
    </SafeAreaView>
  );
}
