import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SHADOWS, MASCOTS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { SettingsRepo } from '../repositories/SettingsRepo';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { showThemedAlert } from '../components/AlertProvider';

export default function AssetScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [initialBalance, setInitialBalance] = useState<number | null>(null);
  const [income, setIncome] = useState<number>(0);
  const [expense, setExpense] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);

  const [editing, setEditing] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      setLoadError(false);
      const [init, totals] = await Promise.all([
        SettingsRepo.getInitialBalance(),
        TransactionRepo.getGlobalTotals(),
      ]);
      setInitialBalance(init);
      setIncome(totals.income);
      setExpense(totals.expense);
    } catch (e) {
      console.error('AssetScreen load failed:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const remaining = (initialBalance ?? 0) + income - expense;
  const hasInitial = initialBalance !== null;
  const isEmpty = !hasInitial && income === 0 && expense === 0;

  const startEdit = () => {
    setInputValue(hasInitial ? initialBalance!.toFixed(2) : '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setInputValue('');
  };

  const saveEdit = async () => {
    const trimmed = inputValue.trim();
    if (trimmed === '' || trimmed === '-' || trimmed === '.') {
      showThemedAlert('提示', '请输入有效的金额');
      return;
    }
    const num = parseFloat(trimmed);
    if (!Number.isFinite(num)) {
      showThemedAlert('提示', '请输入有效的金额');
      return;
    }
    try {
      setSaving(true);
      await SettingsRepo.setInitialBalance(num);
      setEditing(false);
      setInputValue('');
      load();
    } catch (e) {
      console.error('保存起始余额失败:', e);
      showThemedAlert('保存失败', '请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryDark}
            colors={[COLORS.primaryDark]}
          />
        }
      >
        <View style={[styles.header, { paddingTop: (insets.top || 24) + 8 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>资产管理</Text>
            <View style={styles.backBtn} />
          </View>

          <View style={styles.balanceBlock}>
            <Image source={MASCOTS.avatar} style={styles.mascot} resizeMode="contain" />
            <Text style={styles.balanceLabel}>剩余金额</Text>
            {loading ? (
              <ActivityIndicator size="large" color={COLORS.text} style={{ marginTop: 16 }} />
            ) : loadError ? (
              <Text style={styles.errorText}>加载失败，下拉重试</Text>
            ) : !hasInitial ? (
              <Text style={styles.placeholderText}>¥ --</Text>
            ) : (
              <Text style={styles.balanceText}>¥{formatAmount(remaining)}</Text>
            )}
            {!loading && !loadError && !hasInitial && (
              <Text style={styles.hintText}>在下方输入你的起始余额</Text>
            )}
          </View>
        </View>

        <View style={styles.formulaCard}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.textSecondary} />
          ) : loadError ? (
            <Text style={styles.cardErrorText}>数据加载失败</Text>
          ) : (
            <View style={styles.formulaRow}>
              <FormulaItem label="起始" value={initialBalance} color={COLORS.text} />
              <FormulaSign op="+" />
              <FormulaItem label="收入" value={income} color={COLORS.income} />
              <FormulaSign op="-" />
              <FormulaItem label="支出" value={expense} color={COLORS.danger} />
              <FormulaSign op="=" />
              <FormulaItem
                label="剩余"
                value={hasInitial ? remaining : null}
                color={COLORS.text}
                highlight
              />
            </View>
          )}
        </View>

        <View style={styles.editCard}>
          <Text style={styles.editLabel}>起始余额</Text>
          {editing ? (
            <View>
              <View style={styles.inputRow}>
                <Text style={styles.currencyMark}>¥</Text>
                <TextInput
                  style={styles.input}
                  value={inputValue}
                  onChangeText={(t) => {
                    let s = t.replace(/[^\d.-]/g, '');
                    const firstMinus = s.indexOf('-');
                    if (firstMinus > 0) s = s.replace(/-/g, '');
                    if (firstMinus === 0) s = '-' + s.substring(1).replace(/-/g, '');
                    const firstDot = s.indexOf('.');
                    if (firstDot >= 0) {
                      s = s.substring(0, firstDot + 1) + s.substring(firstDot + 1).replace(/\./g, '');
                    }
                    setInputValue(s);
                  }}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textLight}
                  editable={!saving}
                  autoFocus
                />
              </View>
              <View style={styles.editBtns}>
                <TouchableOpacity
                  style={[styles.editBtn, styles.editBtnCancel]}
                  activeOpacity={0.8}
                  onPress={cancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.editBtnCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editBtn, styles.editBtnConfirm]}
                  activeOpacity={0.8}
                  onPress={saveEdit}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <Text style={styles.editBtnConfirmText}>保存</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.viewRow}>
              <Text style={styles.viewValue}>
                {hasInitial ? `¥${formatAmount(initialBalance!)}` : '尚未设置'}
              </Text>
              <TouchableOpacity
                style={styles.editLinkBtn}
                activeOpacity={0.7}
                onPress={startEdit}
                disabled={loading}
              >
                <Ionicons
                  name={hasInitial ? 'create-outline' : 'add-circle-outline'}
                  size={16}
                  color={COLORS.primaryDark}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.editLinkText}>
                  {hasInitial ? '修改' : '设置'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isEmpty && !loading && (
          <Text style={styles.emptyHint}>
            你还没有任何交易记录，去记一笔吧～
          </Text>
        )}

        <Text style={styles.disclaimer}>
          起始余额是手动设置的参考值；之后的每一笔收入会增加、支出会减少剩余金额。
        </Text>
      </ScrollView>
    </View>
  );
}

function FormulaItem({
  label,
  value,
  color,
  highlight,
}: {
  label: string;
  value: number | null | undefined;
  color: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.formulaItem, highlight && styles.formulaItemHighlight]}>
      <Text style={[styles.formulaLabel, { color: COLORS.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.formulaValue,
          { color },
          highlight && styles.formulaValueHighlight,
        ]}
        numberOfLines={1}
      >
        {value == null ? '--' : `¥${formatAmount(value)}`}
      </Text>
    </View>
  );
}

function FormulaSign({ op }: { op: string }) {
  return <Text style={styles.formulaSign}>{op}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingBottom: 26,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  balanceBlock: { alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  mascot: { width: 64, height: 64, marginBottom: 4 },
  balanceLabel: { fontSize: 13, color: COLORS.text, fontWeight: '700', marginTop: 2 },
  balanceText: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  placeholderText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.textLight,
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  errorText: { fontSize: 13, color: COLORS.danger, marginTop: 16, fontWeight: '600' },

  formulaCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    ...SHADOWS.card,
  },
  formulaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  formulaItem: {
    alignItems: 'center',
    minWidth: 56,
    paddingHorizontal: 2,
  },
  formulaItemHighlight: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  formulaLabel: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  formulaValue: { fontSize: 13, fontWeight: '800' },
  formulaValueHighlight: { fontSize: 14 },
  formulaSign: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textLight,
    marginHorizontal: 2,
  },

  cardErrorText: { color: COLORS.danger, textAlign: 'center', fontSize: 12 },

  editCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...SHADOWS.card,
  },
  editLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginBottom: 8,
  },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  editLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
  },
  editLinkText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },
  currencyMark: { fontSize: 20, fontWeight: '900', color: COLORS.text, marginRight: 6 },
  input: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text, paddingVertical: 12 },
  editBtns: { flexDirection: 'row', justifyContent: 'flex-end' },
  editBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 10,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnCancel: { backgroundColor: COLORS.background },
  editBtnCancelText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  editBtnConfirm: { backgroundColor: COLORS.primary },
  editBtnConfirmText: { color: COLORS.text, fontSize: 14, fontWeight: '800' },

  emptyHint: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '600',
  },

  disclaimer: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 22,
    paddingHorizontal: 28,
    lineHeight: 16,
  },
});
