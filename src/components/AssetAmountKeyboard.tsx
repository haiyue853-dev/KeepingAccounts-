import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../utils/constants';

const ROWS = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['.', '0', '⌫']];

interface Props {
  onKey: (key: string) => void;
  onEquals: () => void;
  onSave: () => void;
  saving: boolean;
  insetsBottom: number;
}

/** Same number layout and yellow action column as the bookkeeping keypad. */
export default function AssetAmountKeyboard({ onKey, onEquals, onSave, saving, insetsBottom }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.operators}>
        {['C', '+', '-', '×', '÷'].map((key) => (
          <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`金额按键 ${key}`}
            style={styles.operator} onPress={() => onKey(key)} disabled={saving}>
            <Text style={[styles.operatorText, key === 'C' && { color: COLORS.danger }]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.numberArea}>
        <View style={styles.grid}>
          {ROWS.map((row, index) => (
            <View key={index} style={styles.row}>
              {row.map((key) => (
                <TouchableOpacity key={key} accessibilityRole="button" accessibilityLabel={`金额按键 ${key}`}
                  style={styles.key} onPress={() => onKey(key)} disabled={saving} activeOpacity={0.65}>
                  <Text style={styles.number}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="计算结果" onPress={onEquals}
            disabled={saving} style={styles.equals}>
            <Text style={styles.number}>=</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="保存账户" onPress={onSave}
            disabled={saving} style={styles.save}>
            {saving ? <ActivityIndicator color={COLORS.onPrimary} /> : <Text style={styles.saveText}>保存</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ height: insetsBottom, backgroundColor: COLORS.surface }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#ECECEC', flexShrink: 0 },
  operators: { flexDirection: 'row' },
  operator: { flex: 1, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  operatorText: { color: COLORS.text, fontSize: 20, fontWeight: '500' },
  numberArea: { flexDirection: 'row' },
  grid: { flex: 3 },
  row: { flexDirection: 'row' },
  key: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.cardBg, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  number: { color: COLORS.text, fontSize: 22, fontWeight: '500' },
  actions: { flex: 1 },
  equals: { flex: 1, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  save: { flex: 1, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border },
  saveText: { fontSize: 17, color: COLORS.onPrimary, fontWeight: '600' },
});
