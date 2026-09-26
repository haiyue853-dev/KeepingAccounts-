import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../utils/constants';
import { DeepSeekConfig } from '../services/deepseek/DeepSeekConfig';
import { DeepSeekTransactionParser, ParsedTransaction } from '../services/deepseek/DeepSeekTransactionParser';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { getToday } from '../utils/formatters';
import { resolveTransactionDate } from '../utils/dateParser';
import { showThemedAlert } from '../components/AlertProvider';

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isConfigured, setIsConfigured] = useState(false);
  const [inputText, setInputText] = useState('');
  const [parsedResults, setParsedResults] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      DeepSeekConfig.isConfigured().then(setIsConfigured);
    }, [])
  );

  const handleParse = async () => {
    if (!inputText.trim()) {
      showThemedAlert('提示', '请输入内容');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const parsed = await DeepSeekTransactionParser.parse(inputText.trim());
      setParsedResults(parsed);
    } catch (e: any) {
      setErrorMsg(e.message || '解析失败');
      setParsedResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (parsedResults.length === 0) {
      showThemedAlert('提示', '没有可保存的记录');
      return;
    }
    try {
      const books = await AccountBookRepo.getAll();
      if (books.length === 0) { showThemedAlert('提示', '没有找到账本'); return; }
      const bookId = books[0].id;

      let saved = 0;
      for (const item of parsedResults) {
        if (item.amount <= 0) continue;
        const categories = await CategoryRepo.getAll(item.type);
        let categoryId = categories[0]?.id;
        if (item.categoryName) {
          const matched = categories.find((c) => c.name === item.categoryName);
          if (matched) categoryId = matched.id;
        }
        if (!categoryId) continue;
        await TransactionRepo.create({
          book_id: bookId,
          category_id: categoryId,
          amount: item.amount,
          type: item.type,
          note: item.note,
          date: resolveTransactionDate(inputText, item.date),
        });
        saved++;
      }

      showThemedAlert('保存成功', `已保存 ${saved} 条记录`);
      setParsedResults([]);
      setInputText('');
      setErrorMsg('');
    } catch (e: any) {
      showThemedAlert('保存失败', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (insets.top || 24) + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>语音记账</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <View style={styles.voiceIcon}><Ionicons name="mic-outline" size={28} color={COLORS.primaryDark} /></View>
          <Text style={styles.heroTitle}>语音记账</Text>
          <Text style={styles.heroSubtitle}>说出或输入一笔收支</Text>
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
            onChangeText={setInputText}
            placeholder="例如：买了午饭花了35块"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={5}
          />
        </View>

        <TouchableOpacity
          style={[styles.parseBtn, loading && styles.parseBtnDisabled]}
          onPress={handleParse}
          disabled={loading}
          activeOpacity={0.86}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} size="small" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={COLORS.text} />
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
            <Text style={styles.resultTitle}>解析结果</Text>
            {parsedResults.map((item, i) => (
              <View key={`${item.note}-${i}`} style={styles.resultItem}>
                <View style={styles.resultIcon}>
                  <Ionicons name={item.type === 'income' ? 'arrow-down' : 'arrow-up'} size={16} color="#fff" />
                </View>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultItemCat}>{item.categoryName || '未识别分类'}</Text>
                  <Text style={styles.resultItemNote}>{item.note}</Text>
                  <Text style={styles.resultItemDate}>📅 {resolveTransactionDate(inputText, item.date)}</Text>
                </View>
                <Text style={[styles.resultItemAmount, { color: item.type === 'income' ? COLORS.income : COLORS.expense }]}>
                  {item.type === 'income' ? '+' : '-'}¥{item.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAll} activeOpacity={0.86}>
              <Text style={styles.saveBtnText}>保存全部记录</Text>
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
    backgroundColor: COLORS.background,
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
  },
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
