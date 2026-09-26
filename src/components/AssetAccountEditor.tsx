import React, { useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AssetAccount, AssetAccountInput } from '../models/AssetAccount';
import { COLORS, SHADOWS } from '../utils/constants';
import { ASSET_PROVIDERS, getAssetProvider } from '../utils/assetProviders';
import { appendAssetKey, evaluateAssetAmount } from '../utils/assetAmount';
import { formatAmount } from '../utils/formatters';
import AssetAccountIcon from './AssetAccountIcon';
import AssetAmountKeyboard from './AssetAmountKeyboard';

interface Props {
  account: AssetAccount | null;
  onSave: (input: AssetAccountInput) => Promise<void>;
  onCancel: () => void;
  insetsBottom: number;
  insetsTop: number;
}

export default function AssetAccountEditor({ account, onSave, onCancel, insetsBottom, insetsTop }: Props) {
  const [provider, setProvider] = useState(account?.provider ?? 'wechat');
  const [name, setName] = useState(account?.name ?? '微信');
  const [amount, setAmount] = useState(account ? (account.balance_cents / 100).toFixed(2) : '');
  const [replaceAmount, setReplaceAmount] = useState(!!account);
  const [showProviders, setShowProviders] = useState(!account);
  const [showKeypad, setShowKeypad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saveLock = useRef(false);
  const nameRef = useRef<TextInput>(null);
  const selected = getAssetProvider(provider);
  let preview: string | null = null;
  try { if (amount) preview = formatAmount(evaluateAssetAmount(amount) / 100); } catch { /* Allow unfinished input. */ }

  const openAmount = () => {
    nameRef.current?.blur();
    Keyboard.dismiss();
    setShowKeypad(true);
    setShowProviders(false);
  };
  const onKey = (key: string) => {
    setAmount((previous) => appendAssetKey(previous, key, replaceAmount));
    setReplaceAmount(false);
    setError('');
  };
  const calculate = () => {
    try {
      setAmount((evaluateAssetAmount(amount) / 100).toFixed(2));
      setReplaceAmount(true);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : '金额计算失败'); }
  };
  const save = async () => {
    if (saveLock.current) return;
    try {
      if (!name.trim()) throw new Error('请填写账户名称');
      const balance_cents = evaluateAssetAmount(amount);
      saveLock.current = true;
      setSaving(true);
      setError('');
      Keyboard.dismiss();
      await onSave({ name: name.trim(), provider, balance_cents });
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败，请重试');
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: insetsTop + 10 }]}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="取消编辑账户" disabled={saving} onPress={onCancel} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={23} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{account ? '编辑账户' : '添加账户'}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="完成账户编辑" disabled={saving} onPress={save} style={styles.headerButton}>
          <Text style={styles.headerSave}>{saving ? '保存中' : '完成'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="选择银行或账户类型" disabled={saving}
            onPress={() => { Keyboard.dismiss(); nameRef.current?.blur(); setShowProviders(!showProviders); }} style={styles.providerRow}>
            <AssetAccountIcon provider={provider} size={48} />
            <View style={styles.providerText}>
              <Text style={styles.label}>账户类型 / 开户银行</Text>
              <Text style={styles.providerName}>{selected.name}</Text>
            </View>
            <Ionicons name={showProviders ? 'chevron-up' : 'chevron-down'} size={19} color={COLORS.textSecondary} />
          </TouchableOpacity>
          {showProviders && (
            <View style={styles.providers}>
              {ASSET_PROVIDERS.map((item) => (
                <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={`选择${item.name}`}
                  accessibilityState={{ selected: provider === item.id }} disabled={saving}
                  style={[styles.providerOption, provider === item.id && styles.providerSelected]}
                  onPress={() => {
                    if (name === selected.name || !name.trim()) setName(item.name);
                    setProvider(item.id); setShowProviders(false); setError('');
                  }}>
                  <AssetAccountIcon provider={item.id} size={32} />
                  <Text numberOfLines={1} style={styles.optionName}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.nameArea}>
            <Text style={styles.label}>账户名称</Text>
            <TextInput ref={nameRef} accessibilityLabel="账户名称" value={name} onChangeText={(value) => { setName(value); setError(''); }}
              style={styles.nameInput} placeholder="例如：招商银行·工资卡" placeholderTextColor={COLORS.textLight}
              maxLength={30} editable={!saving} onFocus={() => { setShowKeypad(false); setShowProviders(false); }}
              returnKeyType="done" onSubmitEditing={openAmount} />
            <Text style={styles.caption}>同一家银行可以添加多张卡，用名称区分即可</Text>
          </View>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="编辑当前余额" onPress={openAmount} disabled={saving}
          style={[styles.card, showKeypad && styles.amountActive]}>
          <View style={styles.amountHeading}>
            <Text style={styles.label}>当前余额</Text>
            <Ionicons name="calculator-outline" size={18} color={COLORS.textSecondary} />
          </View>
          <Text style={[styles.amount, !amount && { color: COLORS.textLight }]} numberOfLines={2} adjustsFontSizeToFit>¥ {amount || '0.00'}</Text>
          <Text style={styles.caption}>{preview !== null ? `计入总资产 ¥${preview}` : '支持加减乘除，也可以填写负数余额'}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>填写这个账户现在有多少钱，保存后自动汇总到总资产。</Text>
      </ScrollView>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {showKeypad ? (
        <AssetAmountKeyboard onKey={onKey} onEquals={calculate} onSave={save} saving={saving} insetsBottom={insetsBottom} />
      ) : (
        <TouchableOpacity accessibilityRole="button" onPress={openAmount} style={[styles.returnKeypad, { paddingBottom: 14 + insetsBottom }]}>
          <Ionicons name="calculator-outline" size={18} color={COLORS.text} />
          <Text style={styles.headerSave}> 输入余额</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingBottom: 14 },
  headerButton: { minWidth: 48, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  headerSave: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.divider },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerText: { flex: 1 },
  label: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  providerName: { fontSize: 17, color: COLORS.text, fontWeight: '600', marginTop: 5 },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  providerOption: { width: '31%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, gap: 6, backgroundColor: COLORS.cardBg, borderRadius: 12, borderWidth: 1, borderColor: COLORS.divider },
  providerSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryDark },
  optionName: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  nameArea: { marginTop: 18, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.divider },
  nameInput: { fontSize: 17, fontWeight: '600', color: COLORS.text, paddingVertical: 12, outlineWidth: 0 },
  caption: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 17 },
  amountActive: { borderColor: COLORS.primaryDark },
  amountHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { color: COLORS.text, fontSize: 32, fontWeight: '600', marginVertical: 12 },
  hint: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 19, paddingHorizontal: 4 },
  error: { color: '#B42332', backgroundColor: '#FFF0F0', fontSize: 13, padding: 12, textAlign: 'center' },
  returnKeypad: { backgroundColor: COLORS.primaryLight, paddingTop: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
