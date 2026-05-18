import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { Card, SectionTitle } from './Shared';
import { useRecurring } from '../context/RecurringContext';
import { getUpcomingDueBills } from '../utils/dueBills';
import { formatBRL } from '../utils/helpers';

export function DueBillsCard() {
  const { C, s } = useAppTheme();
  const navigation = useNavigation<any>();
  const { rules } = useRecurring();

  const due = useMemo(() => getUpcomingDueBills(rules, 7), [rules]);

  if (due.length === 0) return null;

  return (
    <Card style={{ marginBottom: 16, borderColor: C.warning, borderWidth: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <SectionTitle>Contas a vencer</SectionTitle>
        <TouchableOpacity onPress={() => navigation.navigate('Recorrentes')}>
          <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Ver todas</Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: 12, gap: 10 }}>
        {due.slice(0, 4).map(({ rule, dueDate, daysUntil }) => (
          <View
            key={rule.id}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: C.text }}>{rule.description}</Text>
              <Text style={s.txMeta}>
                {daysUntil === 0 ? 'Vence hoje' : daysUntil === 1 ? 'Amanhã' : `Em ${daysUntil} dias`} ·{' '}
                {dueDate.split('-').reverse().join('/')}
              </Text>
            </View>
            <Text style={{ fontWeight: '700', color: C.danger }}>{formatBRL(rule.amount)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
