import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../utils/constants';

interface Props {
  value: string;
  onChange: (val: string) => void;
  type: 'income' | 'expense';
  onTypeChange: (type: 'income' | 'expense') => void;
}

export default function AmountInput({ value, onChange, type, onTypeChange }: Props) {
  const handleChange = (text: string) => {
    // Allow only numbers and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    onChange(cleaned);
  };

  return (
    <View style={styles.container}>
      <View style={styles.typeSwitch}>
        <TouchableOpacity
          style={[styles.typeButton, type === 'expense' && styles.typeButtonActiveExpense]}
          onPress={() => onTypeChange('expense')}
        >
          <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>支出</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeButton, type === 'income' && styles.typeButtonActiveIncome]}
          onPress={() => onTypeChange('income')}
        >
          <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>收入</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inputRow}>
        <Text style={styles.symbol}>¥</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder="0.00"
          placeholderTextColor={COLORS.textLight}
          keyboardType="decimal-pad"
          autoFocus
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, padding: 16 },
  typeSwitch: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  typeButtonActiveExpense: { backgroundColor: COLORS.expense },
  typeButtonActiveIncome: { backgroundColor: COLORS.income },
  typeText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  typeTextActive: { color: '#fff' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  symbol: { fontSize: 28, color: COLORS.text, fontWeight: '600', marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 36,
    fontWeight: '600',
    color: COLORS.text,
    paddingVertical: 8,
  },
});
