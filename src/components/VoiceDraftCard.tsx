import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { AssetAccount } from '../models/AssetAccount';
import type { Category } from '../models/Category';
import type { Transaction } from '../models/Transaction';
import { getOriginalCandidates, isAdjustment, VOICE_TYPE_LABELS, VoiceDraft } from '../services/VoiceBookkeepingService';
import type { VoiceEntryType } from '../services/deepseek/DeepSeekTransactionParser';
import { formatAmount } from '../utils/formatters';
import { COLORS } from '../utils/constants';
import AssetAccountPicker from './AssetAccountPicker';

interface Props {
  item: VoiceDraft;
  index: number;
  categories: Category[];
  accounts: AssetAccount[];
  expenses: Transaction[];
  trackingStart?: string;
  pendingAdjustmentTotal: number;
  disabled: boolean;
  onChange: (patch: Partial<VoiceDraft>) => void;
  onRemove: () => void;
}

export default function VoiceDraftCard({ item, index, categories, accounts, expenses, trackingStart, pendingAdjustmentTotal, disabled, onChange, onRemove }: Props) {
  const [search, setSearch] = useState<string | undefined>();
  const [limit, setLimit] = useState(5);
  const adjustment = isAdjustment(item.type);
  const blocked = item.status !== 'completed' || item.type === 'unsupported';
  const original = expenses.find(tx => tx.id === item.originalTransactionId);
  const candidates = adjustment ? getOriginalCandidates(item, expenses, search) : [];
  const remaining = original ? Math.max(0, Math.round((original.amount - (original.adjustment_total ?? 0) - pendingAdjustmentTotal) * 100) / 100) : null;
  const needsAccount = !!trackingStart && item.date >= trackingStart;
  const types: VoiceEntryType[] = ['expense', 'income', 'refund', 'cashback', 'reimbursement'];

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>第 {index + 1} 笔 · {VOICE_TYPE_LABELS[item.type]}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`移除第${index + 1}笔`} disabled={disabled} onPress={onRemove}>
          <Text style={styles.link}>移除</Text>
        </TouchableOpacity>
      </View>
      {blocked ? <Text accessibilityRole="alert" style={styles.warning}>{item.issue || (item.status === 'pending' ? '这笔款项尚未到账，请到账后再记。' : '请补充明确的信息后重新解析。')} 修改上方描述后可重新解析，或移除此笔。</Text> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {types.map(type => <TouchableOpacity key={type} accessibilityRole="button" accessibilityState={{ selected: item.type === type }} disabled={disabled}
              style={[styles.chip, item.type === type && styles.selected]}
              onPress={() => onChange({ type, categoryId: null, categoryName: '', originalTransactionId: null, fullRefund: false })}>
              <Text style={styles.chipText}>{VOICE_TYPE_LABELS[type]}</Text>
            </TouchableOpacity>)}
          </ScrollView>
          <View style={styles.fields}>
            <View style={styles.amountField}>
              <Text style={styles.label}>{adjustment ? '到账金额（元）' : '金额（元）'}</Text>
              <TextInput accessibilityLabel={`第${index + 1}笔金额`} keyboardType="decimal-pad" editable={!disabled}
                value={item.fullRefund ? (remaining === null ? '' : remaining.toFixed(2)) : item.amountText}
                placeholder={item.fullRefund ? '选择原消费后计算' : '0.00'} placeholderTextColor={COLORS.textLight} style={styles.input}
                onChangeText={amountText => onChange({ amountText, fullRefund: false })} />
            </View>
            <View style={styles.dateField}>
              <Text style={styles.label}>{adjustment ? '到账日期' : '发生日期'}</Text>
              <TextInput accessibilityLabel={`第${index + 1}笔日期`} value={item.date} editable={!disabled} style={styles.input}
                placeholder="YYYY-MM-DD" maxLength={10} onChangeText={date => onChange({ date })} />
            </View>
          </View>
          {item.type === 'refund' && <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: !!item.fullRefund }} disabled={disabled}
            onPress={() => onChange({ fullRefund: !item.fullRefund, amountText: item.fullRefund && remaining !== null ? remaining.toFixed(2) : item.amountText })}>
            <Text style={styles.link}>{item.fullRefund ? '☑' : '☐'} 退回剩余未返还金额</Text>
          </TouchableOpacity>}
          {!adjustment && <>
            <Text style={styles.label}>分类{!item.categoryId ? ' · 请选择' : ''}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.filter(category => category.type === item.type).map(category => (
                <TouchableOpacity key={category.id} accessibilityRole="button" accessibilityState={{ selected: category.id === item.categoryId }} disabled={disabled}
                  style={[styles.chip, item.categoryId === category.id && styles.selected]}
                  onPress={() => onChange({ categoryId: category.id, categoryName: category.name })}>
                  <Text style={styles.chipText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>}
          <Text style={styles.label}>备注</Text>
          <TextInput accessibilityLabel={`第${index + 1}笔备注`} value={item.note} editable={!disabled} style={styles.input} onChangeText={note => onChange({ note })} />
          {adjustment && <View style={styles.originalArea}>
            <Text style={styles.label}>关联原消费{item.originalDate ? ` · 提及 ${item.originalDate}` : ''}</Text>
            {original ? <>
              <Text style={styles.originalText}>{original.date} · {original.note || original.category_name} · ¥{formatAmount(original.amount)}</Text>
              <Text style={styles.label}>已返还 ¥{formatAmount(original.adjustment_total ?? 0)} · 剩余 ¥{formatAmount(remaining ?? 0)}</Text>
              <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => onChange({ originalTransactionId: null })}><Text style={styles.link}>重新选择原消费</Text></TouchableOpacity>
            </> : <>
              <TextInput accessibilityLabel={`第${index + 1}笔查找原消费`} value={search ?? ''} editable={!disabled} style={styles.input}
                placeholder="搜索日期、金额或备注" placeholderTextColor={COLORS.textLight} onChangeText={value => { setSearch(value); setLimit(5); }} />
              {search === undefined && <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => setSearch('')}><Text style={styles.link}>查看此日期之前的全部消费</Text></TouchableOpacity>}
              {candidates.slice(0, limit).map(tx => <TouchableOpacity key={tx.id} accessibilityRole="button" disabled={disabled} style={styles.candidate}
                onPress={() => onChange({ originalTransactionId: tx.id,
                  assetAccountId: !item.accountName && !item.assetAccountId && accounts.some(a => a.id === tx.asset_account_id) ? tx.asset_account_id! : item.assetAccountId })}>
                <Text style={styles.originalText}>{tx.date} · {tx.note || tx.category_name} · ¥{formatAmount(tx.amount)}</Text>
                <Text style={styles.link}>选择此笔</Text>
              </TouchableOpacity>)}
              {!candidates.length && <Text style={styles.warning}>未找到原消费，请更换搜索条件；尚未记录的消费需先补录。</Text>}
              {candidates.length > limit && <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => setLimit(limit + 10)}><Text style={styles.link}>显示更多（共 {candidates.length} 笔）</Text></TouchableOpacity>}
            </>}
          </View>}
          <View pointerEvents={disabled ? 'none' : 'auto'}>
            <AssetAccountPicker accounts={accounts} selectedId={item.assetAccountId} onSelect={assetAccountId => onChange({ assetAccountId })}
              label={adjustment || item.type === 'income' ? '到账账户' : '付款账户'} />
          </View>
          {!needsAccount && !!item.assetAccountId && <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={() => onChange({ assetAccountId: null })}><Text style={styles.link}>不关联资产账户</Text></TouchableOpacity>}
          {!item.assetAccountId && <Text style={styles.label}>{item.accountName ? `请确认「${item.accountName}」对应的账户。` : needsAccount ? '请选择账户，以便更新资产余额。' : '账户可选；启用资产自动计算后按实际收支更新余额。'}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLORS.divider, paddingVertical: 16, gap: 10 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.text, fontWeight: '600', fontSize: 15 },
  label: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  chips: { gap: 7, paddingVertical: 3 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: COLORS.controlSurface },
  selected: { backgroundColor: COLORS.primaryLight, borderWidth: 1, borderColor: COLORS.primaryDark },
  chipText: { fontSize: 12, color: COLORS.text },
  fields: { flexDirection: 'row', gap: 12 },
  amountField: { flex: 1 },
  dateField: { flex: 1 },
  input: { minHeight: 42, color: COLORS.text, fontSize: 14, backgroundColor: COLORS.background, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, marginTop: 4 },
  link: { color: COLORS.primary, fontSize: 12, paddingVertical: 8 },
  warning: { color: COLORS.danger, fontSize: 12, lineHeight: 19 },
  originalArea: { padding: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, gap: 5 },
  originalText: { color: COLORS.text, fontSize: 13, lineHeight: 20 },
  candidate: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider, paddingTop: 8 },
});
