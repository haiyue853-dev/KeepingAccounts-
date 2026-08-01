import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Transaction } from '../models/Transaction';
import { COLORS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { getAdjustmentLabel, getAdjustmentTotal, getTransactionNetAmount, hasAdjustment } from '../utils/transactionAmounts';

interface Props {
  transaction: Transaction;
  onPress?: (t: Transaction) => void;
  onLongPress?: (t: Transaction) => void;
}

export default function TransactionItem({ transaction: t, onPress, onLongPress }: Props) {
  const isIncome = t.type === 'income';
  const adjusted = hasAdjustment(t);
  const displayAmount = adjusted ? getTransactionNetAmount(t) : t.amount;
  const adjustmentTotal = getAdjustmentTotal(t);
  const adjustmentNote = t.adjustment_note?.trim();
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(t)}
      onLongPress={() => onLongPress?.(t)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{t.category_icon || '📦'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.categoryName}>{t.category_name || '未知分类'}</Text>
        {t.note ? <Text style={styles.note} numberOfLines={1}>{t.note}</Text> : null}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
          {isIncome ? '+' : '-'}{formatAmount(displayAmount)}
        </Text>
        <Text style={[styles.date, adjusted && styles.adjustmentText]} numberOfLines={1}>
          {adjusted
            ? `原 ¥${formatAmount(t.amount)} · ${getAdjustmentLabel(t)} ¥${formatAmount(adjustmentTotal)}${adjustmentNote ? ` · ${adjustmentNote}` : ''}`
            : t.date}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  categoryName: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  note: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  right: { alignItems: 'flex-end', maxWidth: '48%' },
  amount: { fontSize: 16, fontWeight: '600' },
  date: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  adjustmentText: { color: COLORS.textSecondary, fontWeight: '700' },
});
