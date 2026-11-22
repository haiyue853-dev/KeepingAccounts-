import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Transaction } from '../models/Transaction';
import { COLORS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import AssetAccountIcon from './AssetAccountIcon';

export default function TransactionAccount({ transaction }: { transaction: Transaction }) {
  const { asset_account_name: name, asset_account_provider: provider, asset_balance_after_cents: balance } = transaction;
  return (
    <View style={styles.row}>
      <AssetAccountIcon provider={provider ?? 'other'} size={16} />
      <Text style={styles.text} numberOfLines={1}>
        {name ? `${name}${balance != null ? `余额 ¥${formatAmount(balance / 100)}` : ''}` : '账户未关联或已删除'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  text: { flexShrink: 1, fontSize: 11, color: COLORS.textLight },
});
