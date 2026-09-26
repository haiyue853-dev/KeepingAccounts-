import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { Transaction } from '../models/Transaction';
import TransactionItem from '../components/TransactionItem';
import { COLORS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';

export default function TransactionListScreen() {
  const navigation = useNavigation<any>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });

  const loadData = useCallback(async () => {
    const books = await AccountBookRepo.getAll();
    if (books.length === 0) return;
    const bookId = books[0].id;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const data = await TransactionRepo.getAll({ book_id: bookId, start_date: startDate, end_date: endDate });
    setTransactions(data);

    const monthly = await TransactionRepo.getMonthlySummary(bookId, year, month);
    setSummary(monthly);
  }, [year, month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const changeMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) { newMonth = 12; newYear--; }
    if (newMonth > 12) { newMonth = 1; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleDelete = (t: Transaction) => {
    Alert.alert('确认删除', `删除这条 ¥${t.amount} 的记录？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await TransactionRepo.delete(t.id);
          loadData();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Month Picker */}
      <View style={styles.monthBar}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowBtn}>
          <Text style={styles.arrow}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{year}年{month}月</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowBtn}>
          <Text style={styles.arrow}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>收入: <Text style={{ color: COLORS.income }}>¥{formatAmount(summary.income)}</Text></Text>
        <Text style={styles.summaryText}>支出: <Text style={{ color: COLORS.expense }}>¥{formatAmount(summary.expense)}</Text></Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={(t) => navigation.navigate('AddTransaction', { transactionId: t.id })}
            onLongPress={handleDelete}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>本月暂无记录</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.headerSurface,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.controlBorder,
  },
  arrowBtn: { paddingHorizontal: 20, paddingVertical: 4 },
  arrow: { fontSize: 16, color: COLORS.text },
  monthText: { fontSize: 16, fontWeight: '600', color: COLORS.text, minWidth: 120, textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  summaryText: { fontSize: 14, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: COLORS.textLight },
});
