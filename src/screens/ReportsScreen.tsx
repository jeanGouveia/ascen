import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatBRL, currentMonthName } from '../utils/helpers';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card, SectionTitle, ProgressBar, EmptyState } from '../components/Shared';
import { DueBillsCard } from '../components/DueBillsCard';
import { AnnualPlanMonthDetail, AnnualPlanYearGrid } from '../components/AnnualPlanTable';
import { useApp } from '../context/AppContext';
import { useRecurring } from '../context/RecurringContext';
import {
  filterTransactionsByMonth,
  getCurrentYearMonth,
  getMonthSummary,
  getRunningBalances,
  getYearMonthlyBuckets,
} from '../utils/financeAggregates';
import { buildAnnualPlanSheet } from '../utils/annualPlanSheet';

type ReportTab = 'month' | 'year' | 'plan';

export function ReportsScreen() {
  const { C, s, R } = useAppTheme();
  const { transactions } = useApp();
  const { rules } = useRecurring();
  const { year, month } = getCurrentYearMonth();
  const [tab, setTab] = useState<ReportTab>('month');

  const monthSummary = useMemo(() => getMonthSummary(transactions, year, month), [transactions, year, month]);
  const monthTx = useMemo(
    () => filterTransactionsByMonth(transactions, year, month),
    [transactions, year, month]
  );

  const yearBuckets = useMemo(() => getYearMonthlyBuckets(transactions, year), [transactions, year]);
  const runningBalances = useMemo(() => getRunningBalances(yearBuckets), [yearBuckets]);
  const maxYearBalance = Math.max(...runningBalances.map(Math.abs), 1);

  const planRows = useMemo(
    () => buildAnnualPlanSheet({ transactions, recurringRules: rules, year }),
    [transactions, rules, year]
  );

  const cats = useMemo(() => {
    const catMap: Record<string, { amount: number; color: string; icon: string }> = {};
    monthTx
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!catMap[t.category]) {
          catMap[t.category] = { amount: 0, color: t.categoryColor, icon: t.categoryIcon };
        }
        catMap[t.category].amount += t.amount;
      });
    return Object.entries(catMap).sort((a, b) => b[1].amount - a[1].amount);
  }, [monthTx]);

  const { income: totalIncome, expense: totalExpense, balance } = monthSummary;
  const budgetPct = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const overBudget = budgetPct > 90;

  const tabBtn = (id: ReportTab, label: string) => {
    const active = tab === id;
    return (
      <TouchableOpacity
        onPress={() => setTab(id)}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: R.md as number,
          backgroundColor: active ? C.primary : C.card,
          borderWidth: 1,
          borderColor: active ? C.primary : C.border,
        }}
      >
        <Text style={{ textAlign: 'center', fontWeight: '700', fontSize: 12, color: active ? '#fff' : C.textMuted }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const kpiCards = (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
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

      <Card style={{ marginBottom: 16, alignItems: 'center', paddingVertical: 20 }}>
        <SectionTitle>{`Saldo · ${currentMonthName()}`}</SectionTitle>
        <Text
          style={{
            fontSize: 32,
            fontWeight: '800',
            marginTop: 6,
            color: balance >= 0 ? C.success : C.danger,
          }}
        >
          {formatBRL(balance)}
        </Text>
      </Card>
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={[s.pageTitle, { marginBottom: 4 }]}>Relatórios</Text>
        <Text style={s.pageSubtitle}>Ano {year}</Text>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 12 }}>
          {tabBtn('plan', 'Planilha')}
          {tabBtn('month', 'Mês')}
          {tabBtn('year', 'Gráficos')}
        </View>

        {tab === 'plan' && (
          <Card>
            <AnnualPlanYearGrid rows={planRows} />
          </Card>
        )}

        {tab === 'month' && (
          <>
            <DueBillsCard />

            {overBudget && (
              <View style={[s.alertBanner, { marginBottom: 16 }]}>
                <Text style={{ fontSize: 22 }}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>Atenção ao orçamento</Text>
                  <Text style={s.alertText}>Gastos em {budgetPct.toFixed(0)}% da renda em {currentMonthName()}.</Text>
                </View>
              </View>
            )}

            {kpiCards}

            <Card style={{ marginBottom: 16 }}>
              <AnnualPlanMonthDetail rows={planRows} year={year} />
            </Card>
          </>
        )}

        {tab === 'year' && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <SectionTitle>{`Fluxo mensal (${year})`}</SectionTitle>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140, marginTop: 16 }}>
                {yearBuckets.map(b => {
                  const h = Math.max(
                    (Math.abs(b.balance) / Math.max(...yearBuckets.map(x => Math.abs(x.balance)), 1)) * 110,
                    4
                  );
                  const isCurrent = b.month === month;
                  return (
                    <View key={b.month} style={{ flex: 1, alignItems: 'center' }}>
                      <View
                        style={{
                          width: '100%',
                          height: h,
                          backgroundColor: b.balance >= 0 ? C.success : C.danger,
                          opacity: isCurrent ? 1 : 0.45,
                          borderRadius: R.sm,
                          marginBottom: 4,
                        }}
                      />
                      <Text style={{ fontSize: 9, color: isCurrent ? C.primary : C.textMuted }}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Card style={{ marginBottom: 16 }}>
              <SectionTitle>Saldo acumulado</SectionTitle>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 120, marginTop: 16 }}>
                {runningBalances.map((val, i) => {
                  const h = Math.max((Math.abs(val) / maxYearBalance) * 100, 4);
                  return (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                      <View
                        style={{
                          width: '100%',
                          height: h,
                          backgroundColor: val >= 0 ? C.primary : C.danger,
                          borderRadius: R.sm,
                        }}
                      />
                    </View>
                  );
                })}
              </View>
              <Text style={{ marginTop: 12, textAlign: 'center', fontWeight: '700', color: C.text }}>
                Acumulado em dez: {formatBRL(runningBalances[11] ?? 0)}
              </Text>
            </Card>

            {totalIncome > 0 && (
              <Card style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                  <SectionTitle>{`Uso do orçamento · ${currentMonthName()}`}</SectionTitle>
                  <Text style={{ fontWeight: '700', color: overBudget ? C.danger : C.success }}>
                    {budgetPct.toFixed(0)}%
                  </Text>
                </View>
                <ProgressBar
                  value={budgetPct}
                  color={overBudget ? C.danger : budgetPct > 70 ? C.warning : C.success}
                />
              </Card>
            )}

            <Card>
              <SectionTitle>{`Gastos por categoria · ${currentMonthName()}`}</SectionTitle>
              {cats.length === 0 ? (
                <EmptyState icon="📊" title="Sem dados" subtitle="Adicione saídas neste mês" />
              ) : (
                <View style={{ marginTop: 16, gap: 14 }}>
                  {cats.map(([name, { amount, color, icon }]) => {
                    const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                    return (
                      <View key={name}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontSize: 15, color: C.text }}>
                            {icon} {name}
                          </Text>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>
                            {formatBRL(amount)}
                          </Text>
                        </View>
                        <ProgressBar value={pct} color={color} />
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
