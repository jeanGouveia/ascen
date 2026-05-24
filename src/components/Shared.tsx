import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Transaction } from '../types';
import { formatBRL, formatDate } from '../utils/helpers';
import { useApp } from '../context/AppContext';
import { useAppTheme } from '../hooks/useAppTheme';

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { s } = useAppTheme();
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: string }) {
  const { s } = useAppTheme();
  return <Text style={s.sectionTitle}>{children}</Text>;
}

export function ProgressBar({ value, color, height = 8 }: { value: number; color: string; height?: number }) {
  const { s } = useAppTheme();
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <View style={[s.progressTrack, { height }]}>
      <View style={[s.progressFill, { width: `${pct}%` as any, backgroundColor: color, height }]} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { C, s } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: 8 }}>
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle && <Text style={s.emptySubtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.8}
          style={{
            marginTop: 12,
            backgroundColor: C.primary,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function FAB() {
  const { openTxModal } = useApp();
  const { s } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={() => openTxModal()}
      activeOpacity={0.85}
      style={s.fab}
      accessibilityRole="button"
      accessibilityLabel="Adicionar novo lançamento"
    >
      <Text style={{ color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '300' }}>+</Text>
    </TouchableOpacity>
  );
}

export function TxCard({ tx }: { tx: Transaction }) {
  const { C, s } = useAppTheme();
  const { deleteTransaction } = useApp();
  const handleDelete = () => {
    Alert.alert(
      'Excluir lançamento',
      `Excluir "${tx.description}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => deleteTransaction(tx.id) },
      ]
    );
  };
  return (
    <View style={s.txCard}>
      <View style={[s.txIconWrap, { backgroundColor: tx.categoryColor + '22' }]}>
        <Text style={{ fontSize: 20 }}>{tx.categoryIcon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.txDescription} numberOfLines={1}>
          {tx.description}
          {tx.isInstallment ? <Text style={{ color: C.warning, fontSize: 12 }}> [{tx.installmentInfo}]</Text> : null}
        </Text>
        <Text style={s.txMeta}>{tx.category} · {formatDate(tx.date)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[s.txAmount, { color: tx.type === 'income' ? C.success : C.danger }]}>
          {tx.type === 'income' ? '+' : '-'}{formatBRL(tx.amount)}
        </Text>
        <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 14, color: C.textMuted }}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
