import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AssetAccount } from '../models/AssetAccount';
import { COLORS } from '../utils/constants';
import AssetAccountIcon from './AssetAccountIcon';

interface Props {
  accounts: AssetAccount[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  label?: string;
}

export default function AssetAccountPicker({ accounts, selectedId, onSelect, label = '账户' }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {accounts.map((account) => (
          <TouchableOpacity key={account.id} accessibilityRole="button"
            accessibilityLabel={`选择${account.name}`} accessibilityState={{ selected: account.id === selectedId }}
            onPress={() => onSelect(account.id)} style={[styles.chip, account.id === selectedId && styles.selected]}>
            <AssetAccountIcon provider={account.provider} size={23} />
            <Text numberOfLines={1} style={[styles.name, account.id === selectedId && styles.selectedName]}>{account.name}</Text>
          </TouchableOpacity>
        ))}
        {accounts.length === 0 && <Text style={styles.empty}>请先在资产管理中添加账户</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingLeft: 12 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginRight: 8 },
  list: { alignItems: 'center', gap: 7, paddingRight: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, backgroundColor: COLORS.controlSurface, maxWidth: 150 },
  selected: { backgroundColor: '#CFE3FF' },
  name: { fontSize: 12, color: COLORS.textSecondary },
  selectedName: { color: COLORS.primaryDark, fontWeight: '600' },
  empty: { fontSize: 12, color: COLORS.textSecondary },
});
