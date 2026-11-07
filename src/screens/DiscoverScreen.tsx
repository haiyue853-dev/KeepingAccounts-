import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../utils/constants';
import { DeepSeekConfig } from '../services/deepseek/DeepSeekConfig';
import { DeepSeekTransactionParser } from '../services/deepseek/DeepSeekTransactionParser';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { showThemedAlert } from '../components/AlertProvider';
import { AssetAccountRepo, AssetTrackingStatus } from '../repositories/AssetAccountRepo';
import type { AssetAccount } from '../models/AssetAccount';
import type { Category } from '../models/Category';
import type { Transaction } from '../models/Transaction';
import { isAdjustment, makeVoiceDraft, VoiceBookkeepingService, VoiceDraft } from '../services/VoiceBookkeepingService';
import VoiceDraftCard from '../components/VoiceDraftCard';

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isConfigured, setIsConfigured] = useState(false);
  const [inputText, setInputText] = useState('');
  const [parsedResults, setParsedResults] = useState<(VoiceDraft & { rowId: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [trackingStatus, setTrackingStatus] = useState<AssetTrackingStatus | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [expensesLoaded, setExpensesLoaded] = useState(false);
  const [bookId, setBookId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const parseVersion = useRef(0);
  const savedVersion = useRef<number | null>(null);

  React.useEffect(() => () => { parseVersion.current++; }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      DeepSeekConfig.isConfigured().then(value => { if (active) setIsConfigured(value); }).catch(() => { if (active) setIsConfigured(false); });
      void Promise.all([AssetAccountRepo.getTrackingStatus(), AssetAccountRepo.getAll()]).then(([status, accounts]) => {
        if (!active) return;
        setTrackingStatus(status);
        setAssetAccounts(accounts);
      }).catch((error) => console.warn('加载资产账户失败:', error));
      return () => { active = false; };
    }, [])
  );

  const handleParse = async () => {
    if (saveLock.current) return;
    if (!inputText.trim()) {
      showThemedAlert('提示', '请输入内容');
      return;
    }
    const version = ++parseVersion.current;
    const text = inputText.trim();
    setParsedResults([]);
    setLoading(true);
    setErrorMsg('');
    try {
      const [books, nextCategories, accounts, status] = await Promise.all([
        AccountBookRepo.getAll(), CategoryRepo.getAll(), AssetAccountRepo.getAll(), AssetAccountRepo.getTrackingStatus(),
      ]);
      if (version !== parseVersion.current) return;
      if (!books.length) throw new Error('请先创建账本');
      const parsed = await DeepSeekTransactionParser.parse(text, {
        expenseCategories: nextCategories.filter(category => category.type === 'expense').map(category => category.name),
        incomeCategories: nextCategories.filter(category => category.type === 'income').map(category => category.name),
        accountNames: accounts.map(account => account.name),
      });
      const needsOriginals = parsed.some(item => isAdjustment(item.type));
      const originals = needsOriginals ? await TransactionRepo.getAll({ book_id: books[0].id, type: 'expense' }) : [];
      if (version !== parseVersion.current) return;
      setBookId(books[0].id);
      setCategories(nextCategories);
      setAssetAccounts(accounts);
      setTrackingStatus(status);
      setExpenses(originals);
      setExpensesLoaded(needsOriginals);
      setParsedResults(parsed.map((item, index) => ({ ...makeVoiceDraft(item, nextCategories, accounts), rowId: `${version}-${index}` })));
      if (!parsed.length) setErrorMsg('没有识别到可记账内容，请说明金额、日期和用途。');
    } catch (e: any) {
      if (version === parseVersion.current) {
        setErrorMsg(e.message || '解析失败');
        setParsedResults([]);
      }
    } finally {
      if (version === parseVersion.current) setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (saveLock.current || loading || savedVersion.current === parseVersion.current) return;
    if (parsedResults.length === 0 || !bookId) {
      showThemedAlert('提示', '没有可保存的记录');
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      await VoiceBookkeepingService.save(parsedResults, bookId);
      savedVersion.current = parseVersion.current;
      setParsedResults([]);
      setInputText('');
      setErrorMsg('');
      showThemedAlert('保存成功', `已保存 ${parsedResults.length} 条记录`);
    } catch (e: any) {
      showThemedAlert('保存失败', e.message);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const handleInputChange = (text: string) => {
    if (saveLock.current) return;
    parseVersion.current++;
    setInputText(text);
    setParsedResults([]);
    setErrorMsg('');
    setLoading(false);
  };

  const updateDraft = (rowId: string, patch: Partial<VoiceDraft>) => {
    if (saveLock.current) return;
    setParsedResults(previous => previous.map(row => row.rowId === rowId ? { ...row, ...patch } : row));
    if (patch.type && isAdjustment(patch.type) && !expensesLoaded && bookId) {
      const version = parseVersion.current;
      void TransactionRepo.getAll({ book_id: bookId, type: 'expense' }).then(originals => {
        if (version !== parseVersion.current) return;
        setExpenses(originals);
        setExpensesLoaded(true);
      }).catch(error => {
        if (version === parseVersion.current) setErrorMsg(error instanceof Error ? error.message : '加载原消费失败');
      });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.headerSurface, '#F4F9FF', COLORS.surface]} style={[styles.header, { paddingTop: (insets.top || 24) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>语音记账</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.voiceIcon}><Ionicons name="mic-outline" size={28} color={COLORS.primaryDark} /></View>
          <Text style={styles.heroTitle}>语音记账</Text>
          <Text style={styles.heroSubtitle}>用输入法语音输入或打字，支持收支、退款、返现和报销</Text>
          <View style={styles.waveRow}>
            {[10, 18, 26, 16, 31, 22, 12, 20, 28, 14].map((height, index) => (
              <View key={index} style={[styles.waveBar, { height }]} />
            ))}
          </View>
        </View>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={handleInputChange}
            editable={!saving}
            accessibilityLabel="记账描述"
            placeholder="例如：11月3日收到10月20日买鞋的退款50元，退到微信"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={5}
          />
        </View>

        <TouchableOpacity
          style={[styles.parseBtn, (loading || saving) && styles.parseBtnDisabled]}
          onPress={handleParse}
          disabled={loading || saving}
          activeOpacity={0.86}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.onPrimary} size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={COLORS.onPrimary} />
              <Text style={styles.parseBtnText}>AI 智能解析</Text>
            </>
          )}
        </TouchableOpacity>

        {!isConfigured ? (
          <TouchableOpacity style={styles.configHint} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warning} />
            <Text style={styles.configHintText}>尚未配置 DeepSeek API Key，点击前往设置</Text>
          </TouchableOpacity>
        ) : null}

        {errorMsg ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {parsedResults.length > 0 ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>逐笔确认后保存</Text>
            {parsedResults.map((item, i) => {
              const original = expenses.find(tx => tx.id === item.originalTransactionId);
              const previousTotal = parsedResults.slice(0, i)
                .filter(row => row.originalTransactionId === item.originalTransactionId && isAdjustment(row.type))
                .reduce((sum, row) => row.fullRefund && original
                  ? Math.max(0, original.amount - (original.adjustment_total ?? 0))
                  : sum + (Number.isFinite(Number(row.amountText)) ? Number(row.amountText) : 0), 0);
              return <VoiceDraftCard key={item.rowId} item={item} index={i} categories={categories} accounts={assetAccounts} expenses={expenses}
                trackingStart={trackingStatus?.startDate} disabled={saving} pendingAdjustmentTotal={previousTotal}
                onChange={patch => updateDraft(item.rowId, patch)}
                onRemove={() => { if (!saveLock.current) setParsedResults(previous => previous.filter(row => row.rowId !== item.rowId)); }} />;
            })}
            <TouchableOpacity accessibilityRole="button" style={[styles.saveBtn, saving && styles.parseBtnDisabled]} disabled={saving || loading} onPress={handleSaveAll} activeOpacity={0.86}>
              <Text style={styles.saveBtnText}>{saving ? '保存中…' : `保存以上 ${parsedResults.length} 笔记录`}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.headerSurface,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.controlBorder,
  },
  headerSpacer: { width: 36, height: 36 },
  headerTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 28 },
  hero: {
    minHeight: 156,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -6,
    marginBottom: 0,
  },
  voiceIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, marginBottom: 10 },
  heroTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  heroSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  waveRow: {
    position: 'absolute',
    right: 12,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primaryDark,
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    ...SHADOWS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 118,
    padding: 14,
  },
  textInput: {
    fontSize: 15,
    color: COLORS.text,
    minHeight: 90,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  parseBtn: {
    marginTop: 14,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...SHADOWS.floating,
  },
  parseBtnDisabled: { opacity: 0.65 },
  parseBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.onPrimary },
  configHint: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    gap: 6,
  },
  configHintText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F1',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    gap: 8,
  },
  errorText: { flex: 1, fontSize: 13, color: COLORS.danger },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    ...SHADOWS.card,
  },
  resultTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  resultInfo: { flex: 1 },
  resultItemCat: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  resultItemNote: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },
  resultItemDate: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  resultItemAmount: { fontSize: 14, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
