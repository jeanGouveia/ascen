import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { formatBRL } from '../utils/helpers';
import {
  MONTH_LABELS_FULL,
  type AnnualPlanRow,
  formatPlanCell,
} from '../utils/annualPlanSheet';

const COL_WIDTH = 72;
const LABEL_WIDTH = 148;

type RowsProps = {
  rows: AnnualPlanRow[];
  year: number;
};

function cellColor(
  C: ReturnType<typeof useAppTheme>['C'],
  v: number,
  kind: AnnualPlanRow['kind']
): string {
  if (v === 0) return C.textMuted;
  if (kind === 'closing' || kind === 'opening') return v >= 0 ? C.success : C.danger;
  return v > 0 ? C.success : C.danger;
}

/** Visão do mês (saldo inicial → saldo final) — guia Mês. */
export function AnnualPlanMonthDetail({ rows, year }: RowsProps) {
  const { C, s } = useAppTheme();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const monthRows = useMemo(
    () => rows.map(row => ({ ...row, cell: row.months[selectedMonth] ?? 0 })),
    [rows, selectedMonth]
  );

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 4 }}>
          {MONTH_LABELS_FULL.map((label, i) => {
            const active = selectedMonth === i;
            return (
              <TouchableOpacity
                key={label}
                onPress={() => setSelectedMonth(i)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: active ? C.primary : C.card,
                  borderWidth: 1,
                  borderColor: active ? C.primary : C.border,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#fff' : C.textMuted }}>
                  {label.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <Text style={[s.txMeta, { marginBottom: 8 }]}>
        Detalhamento · {MONTH_LABELS_FULL[selectedMonth]} {year}
      </Text>

      <View style={{ gap: 6 }}>
        {monthRows.map(row => {
          const v = row.cell;
          const isSummary = row.isSummary;
          return (
            <View
              key={row.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10,
                paddingHorizontal: 12,
                marginLeft: row.indent ? 12 : 0,
                backgroundColor: isSummary ? C.primaryLight : C.card,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isSummary ? C.primary : C.border,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontSize: isSummary ? 14 : 13,
                  fontWeight: isSummary ? '800' : '600',
                  color: C.text,
                }}
                numberOfLines={2}
              >
                {row.label}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: cellColor(C, v, row.kind),
                }}
              >
                {v === 0 ? '—' : formatBRL(Math.abs(v))}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Tabela 12 meses — guia Planilha. */
export function AnnualPlanYearGrid({ rows }: Pick<RowsProps, 'rows'>) {
  const { C, s } = useAppTheme();

  return (
    <View>
      <Text style={[s.formLabel, { marginBottom: 8 }]}>PLANILHA ANUAL (12 MESES)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border }}>
            <View style={{ width: LABEL_WIDTH, padding: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.textMuted }}>Descrição</Text>
            </View>
            {MONTH_LABELS_FULL.map(m => (
              <View key={m} style={{ width: COL_WIDTH, padding: 8, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.textMuted }}>{m.slice(0, 3)}</Text>
              </View>
            ))}
          </View>
          {rows.map(row => (
            <View
              key={row.id}
              style={{
                flexDirection: 'row',
                backgroundColor: row.isSummary ? C.primaryLight : 'transparent',
                borderBottomWidth: 1,
                borderColor: C.border,
              }}
            >
              <View style={{ width: LABEL_WIDTH, padding: 8, paddingLeft: row.indent ? 16 : 8 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: row.isSummary ? '800' : '600',
                    color: C.text,
                  }}
                  numberOfLines={2}
                >
                  {row.label}
                </Text>
              </View>
              {row.months.map((val, mi) => (
                <View key={mi} style={{ width: COL_WIDTH, padding: 8, alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: row.isSummary ? '700' : '500',
                      color: cellColor(C, val, row.kind),
                    }}
                  >
                    {formatPlanCell(val, row.kind)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
