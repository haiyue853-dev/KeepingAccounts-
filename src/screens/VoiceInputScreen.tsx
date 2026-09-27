import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SpeechToTextFactory } from '../services/speech/SpeechToTextFactory';
import VoiceButton from '../components/VoiceButton';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { COLORS } from '../utils/constants';
import { Ionicons } from '@expo/vector-icons';
import { getToday } from '../utils/formatters';
import { resolveTransactionDate } from '../utils/dateParser';
import { AssetAccountRepo, AssetTrackingStatus } from '../repositories/AssetAccountRepo';
import type { AssetAccount } from '../models/AssetAccount';
import AssetAccountPicker from '../components/AssetAccountPicker';

export default function VoiceInputScreen() {
  const navigation = useNavigation<any>();
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [parsedResult, setParsedResult] = useState<{
    amount: number;
    type: 'income' | 'expense';
    categoryName: string;
    note: string;
    date: string;
  } | null>(null);
  const [assetAccounts, setAssetAccounts] = useState<AssetAccount[]>([]);
  const [trackingStatus, setTrackingStatus] = useState<AssetTrackingStatus | null>(null);
  const [selectedAssetAccountId, setSelectedAssetAccountId] = useState<number | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void Promise.all([AssetAccountRepo.getTrackingStatus(), AssetAccountRepo.getAll()]).then(([status, accounts]) => {
      if (!active) return;
      setTrackingStatus(status);
      setAssetAccounts(accounts);
      if (status) setSelectedAssetAccountId((current) => current ?? accounts[0]?.id ?? null);
    }).catch((error) => console.warn('加载资产账户失败:', error));
    return () => { active = false; };
  }, []));

  const handleStart = async () => {
    try {
      const service = SpeechToTextFactory.get();
      await service.initialize();
      await service.startListening();
      setIsListening(true);
      setRecognizedText('');
      setParsedResult(null);
    } catch (e: any) {
      Alert.alert('语音识别错误', e.message);
    }
  };

  const handleStop = async () => {
    try {
      const service = SpeechToTextFactory.get();
      const result = await service.stopListening();
      setIsListening(false);
      setRecognizedText(result.text);
      parseVoiceText(result.text);
    } catch (e: any) {
      setIsListening(false);
      Alert.alert('语音识别错误', e.message);
    }
  };

  /**
   * 简单的文本解析逻辑
   * 从语音识别结果中提取金额、类型、分类
   * 后续可以接入 NLU 服务增强解析
   */
  const parseVoiceText = (text: string) => {
    let amount = 0;
    let type: 'income' | 'expense' = 'expense';
    let categoryName = '';
    let note = text;
    const date = resolveTransactionDate(text);

    // Extract amount
    const amountMatch = text.match(/(\d+(\.\d+)?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }

    // Detect type
    if (text.includes('收入') || text.includes('工资') || text.includes('奖金') || text.includes('收到')) {
      type = 'income';
    }

    // Try to match category keywords
    const expenseKeywords: Record<string, string[]> = {
      '餐饮': ['吃饭', '午饭', '晚饭', '早饭', '餐', '饭', '外卖', '食堂'],
      '交通': ['打车', '地铁', '公交', '加油', '交通', '滴滴'],
      '购物': ['买', '购物', '淘宝', '京东', '超市'],
      '娱乐': ['电影', '游戏', 'KTV', '唱歌', '娱乐'],
      '居住': ['房租', '水电', '物业', '宽带'],
      '医疗': ['看病', '药', '医院', '挂号'],
    };

    const incomeKeywords: Record<string, string[]> = {
      '工资': ['工资', '薪水', '月薪'],
      '奖金': ['奖金', '年终', '绩效'],
      '理财': ['利息', '分红', '收益'],
    };

    const keywords = type === 'expense' ? expenseKeywords : incomeKeywords;
    for (const [cat, words] of Object.entries(keywords)) {
      if (words.some((w) => text.includes(w))) {
        categoryName = cat;
        break;
      }
    }

    setParsedResult({ amount, type, categoryName, note, date });
  };

  const handleSave = async () => {
    if (!parsedResult || parsedResult.amount <= 0) {
      Alert.alert('提示', '无法保存，请检查识别结果');
      return;
    }

    try {
      const books = await AccountBookRepo.getAll();
      if (books.length === 0) return;
      const bookId = books[0].id;

      const categories = await CategoryRepo.getAll(parsedResult.type);
      let categoryId = categories[0]?.id;

      if (parsedResult.categoryName) {
        const matched = categories.find((c) => c.name === parsedResult.categoryName);
        if (matched) categoryId = matched.id;
      }

      if (!categoryId) {
        Alert.alert('提示', '未找到匹配的分类');
        return;
      }

      const status = await AssetAccountRepo.getTrackingStatus();
      const tracked = !!status && parsedResult.date >= status.startDate;
      if (tracked && (!selectedAssetAccountId || !(await AssetAccountRepo.getAll()).some((account) => account.id === selectedAssetAccountId))) {
        Alert.alert('提示', '请先选择资产账户');
        return;
      }

      await TransactionRepo.create({
        book_id: bookId,
        category_id: categoryId,
        amount: parsedResult.amount,
        type: parsedResult.type,
        note: parsedResult.note,
        date: parsedResult.date || getToday(),
        asset_account_id: tracked ? selectedAssetAccountId : null,
      });

      Alert.alert('成功', '记录已保存', [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('保存失败', e.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.voiceSection}>
        <Text style={styles.hint}>
          {isListening ? '正在聆听...' : '点击麦克风按钮，说出你的收支记录'}
        </Text>
        <Text style={styles.example}>例如："午饭花了35块"、"收到工资15000"</Text>
        <VoiceButton isListening={isListening} onStart={handleStart} onStop={handleStop} />
      </View>

      {recognizedText ? (
        <View style={styles.resultSection}>
          <Text style={styles.sectionTitle}>识别结果</Text>
          <TextInput
            style={styles.textInput}
            value={recognizedText}
            onChangeText={setRecognizedText}
            multiline
          />
          <TouchableOpacity
            style={styles.reparseBtn}
            onPress={() => parseVoiceText(recognizedText)}
          >
            <Text style={styles.reparseText}>重新解析</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {parsedResult ? (
        <View style={styles.parsedSection}>
          <Text style={styles.sectionTitle}>解析结果</Text>
          <View style={styles.parsedRow}>
            <Text style={styles.parsedLabel}>类型</Text>
            <Text style={[styles.parsedValue, { color: parsedResult.type === 'income' ? COLORS.income : COLORS.expense }]}>
              {parsedResult.type === 'income' ? '收入' : '支出'}
            </Text>
          </View>
          <View style={styles.parsedRow}>
            <Text style={styles.parsedLabel}>金额</Text>
            <Text style={styles.parsedValue}>¥{parsedResult.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.parsedRow}>
            <Text style={styles.parsedLabel}>分类</Text>
            <Text style={styles.parsedValue}>{parsedResult.categoryName || '未识别'}</Text>
          </View>

          <View style={styles.parsedRow}>
            <Text style={styles.parsedLabel}>日期</Text>
            <Text style={styles.parsedValue}>{parsedResult.date}</Text>
          </View>

          {trackingStatus && parsedResult.date >= trackingStatus.startDate && (
            <AssetAccountPicker accounts={assetAccounts} selectedId={selectedAssetAccountId} onSelect={setSelectedAssetAccountId} />
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>保存记录</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>💡 语音记账说明</Text>
        <Text style={styles.infoText}>• 说出包含金额的收支描述即可自动识别</Text>
        <Text style={styles.infoText}>• 支持自动判断收入/支出类型</Text>
        <Text style={styles.infoText}>• 支持自动匹配分类（餐饮、交通等）</Text>
        <Text style={styles.infoText}>• 识别结果可手动修改后保存</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 12 },
  voiceSection: {
    backgroundColor: COLORS.surface,
    margin: 12,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  hint: { fontSize: 16, color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  example: { fontSize: 13, color: COLORS.textLight, marginBottom: 24, textAlign: 'center' },
  resultSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  reparseBtn: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  reparseText: { fontSize: 14, color: COLORS.primary },
  parsedSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
  },
  parsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  parsedLabel: { fontSize: 14, color: COLORS.textSecondary },
  parsedValue: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  infoSection: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
