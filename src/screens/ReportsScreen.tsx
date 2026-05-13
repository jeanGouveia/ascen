import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatBRL, currentMonthName } from '../utils/helpers';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card, SectionTitle, ProgressBar, EmptyState } from '../components/Shared';
import { useApp } from '../context/AppContext';

export function ReportsScreen() {
  const { C, s, R } = useAppTheme();
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
