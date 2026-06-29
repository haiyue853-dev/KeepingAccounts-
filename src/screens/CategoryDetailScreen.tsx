import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { COLORS, SHADOWS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { CategoryIcon } from '../components/AppIcon';

interface NoteRankItem {
  note: string;
  total: number;
  count: number;
  percentage: number;
}

export default function CategoryDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();

  const categoryData = route.params?.categoryData as {
    id: number;
    name: string;
    icon: string;
    total: number;
  };
  const dateRange = route.params?.dateRange as { startDate: string; endDate: string };

  const [noteRanks, setNoteRanks] = useState<NoteRankItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNoteRanks = useCallback(async () => {
    try {
      setLoading(true);
      const books = await AccountBookRepo.getAll();
      if (books.length === 0) return;
      const bookId = books[0].id;

      // 获取该分类下所有交易，按备注分组统计
      const transactions = await TransactionRepo.getByCategoryAndDateRange(
        bookId,
        categoryData.id,
        dateRange.startDate,
        dateRange.endDate
      );

      // 按备注分组
      const noteGroups: Record<string, { total: number; count: number }> = {};
      let categoryTotal = 0;

      transactions.forEach((t) => {
        const note = t.note || '无备注';
        if (!noteGroups[note]) {
          noteGroups[note] = { total: 0, count: 0 };
        }
        noteGroups[note].total += t.amount;
        noteGroups[note].count += 1;
        categoryTotal += t.amount;
      });

      // 转换为数组并排序
      const ranks: NoteRankItem[] = Object.entries(noteGroups)
        .map(([note, data]) => ({
          note,
          total: data.total,
          count: data.count,
          percentage: categoryTotal > 0 ? (data.total / categoryTotal) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);

      setNoteRanks(ranks);
    } catch (e) {
      console.error('加载备注排行榜失败:', e);
    } finally {
      setLoading(false);
    }
  }, [categoryData.id, dateRange.startDate, dateRange.endDate]);

  useFocusEffect(
    useCallback(() => {
      loadNoteRanks();
    }, [loadNoteRanks])
  );

  return (
    <View style={styles.container}>
      <View style={styles.categoryInfo}>
        <View style={styles.categoryIconBg}>
          <CategoryIcon categoryName={categoryData.name} iconKey={categoryData.icon} size={24} color={COLORS.text} />
        </View>
        <View>
          <Text style={styles.categoryName}>{categoryData.name}</Text>
          <Text style={styles.categoryTotal}>¥{formatAmount(categoryData.total)}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>备注排行榜</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : noteRanks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>暂无数据</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.rankList}>
              {noteRanks.map((item, index) => (
                <View key={item.note} style={[styles.rankItem, index === noteRanks.length - 1 && styles.rankItemLast]}>
                  <View style={styles.rankIconBg}>
                    <CategoryIcon categoryName={categoryData.name} iconKey={categoryData.icon} size={18} color={COLORS.text} />
                  </View>
                  <View style={styles.rankContent}>
                    <View style={styles.rankContentLeft}>
                      <Text style={styles.noteText} numberOfLines={1}>{item.note}</Text>
                      <Text style={styles.noteCount}>{item.count} 笔</Text>
                    </View>
                    <View style={styles.rankContentRight}>
                      <Text style={styles.amountText}>¥{formatAmount(item.total)}</Text>
                      <Text style={styles.percentageText}>{item.percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    ...SHADOWS.card,
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryTotal: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  rankList: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  rankItemLast: {
    borderBottomWidth: 0,
  },
  rankIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankContentLeft: {
    flex: 1,
    marginRight: 8,
  },
  noteText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  noteCount: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  rankContentRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  percentageText: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
});