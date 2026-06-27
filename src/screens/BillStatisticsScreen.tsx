import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { StatisticsService } from '../services/StatisticsService';
import { AccountBookRepo } from '../repositories/AccountBookRepo';

type ViewMode = 'month' | 'year';

interface MonthData {
  month: number;
  income: number;
  expense: number;
  balance: number;
}

export default function BillStatisticsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showYearPicker, setShowYearPicker] = useState(false);
  const isPickerJustClosed = useRef(false);
  const hasBeenFocused = useRef(false);

  // 使用 ref 存储最新的 year 值
  const yearRef = useRef(year);

  // 同步 year 到 ref
  useEffect(() => {
    yearRef.current = year;
  }, [year]);
  const [yearIncome, setYearIncome] = useState(0);
  const [yearExpense, setYearExpense] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);

  const loadData = useCallback(async (targetYear?: number) => {
    const y = targetYear ?? year;

    const books = await AccountBookRepo.getAll();
    if (!books.length) return;
    const bookId = books[0].id;

    let totalIncome = 0;
    let totalExpense = 0;
    const months: MonthData[] = [];

    for (let m = 1; m <= 12; m++) {
      const summary = await StatisticsService.getMonthlySummary(bookId, y, m);
      totalIncome += summary.income;
      totalExpense += summary.expense;
      months.push({
        month: m,
        income: summary.income,
        expense: summary.expense,
        balance: summary.income - summary.expense,
      });
    }

    setYearIncome(totalIncome);
    setYearExpense(totalExpense);
    setMonthlyData(months);
  }, [year]);

  // 使用 navigation.addListener 来监听页面焦点事件
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (isPickerJustClosed.current) {
        isPickerJustClosed.current = false;
        return;
      }

      if (hasBeenFocused.current) {
        loadData();
        return;
      }

      hasBeenFocused.current = true;
      const currentYear = new Date().getFullYear();
      setYear(currentYear);
      loadData(currentYear);
    });

    return () => {
      unsubscribeFocus();
    };
  }, [navigation, loadData]);

  // 关闭弹窗的辅助函数
  const closeYearPicker = useCallback(() => {
    isPickerJustClosed.current = true;
    setShowYearPicker(false);
    // 使用 ref 获取最新的 year 值
    setTimeout(() => {
      loadData(yearRef.current);
    }, 0);
  }, [loadData]);

  const yearBalance = yearIncome - yearExpense;

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={[styles.header, { paddingTop: (insets.top || 24) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <TouchableOpacity style={styles.yearSelector} onPress={() => setShowYearPicker(true)}>
            <Text style={styles.yearText}>{year}年</Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBtn} />
      </View>

      {/* 月账单/年账单切换 */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'month' && styles.tabActive]}
          onPress={() => setViewMode('month')}
        >
          <Text style={[styles.tabText, viewMode === 'month' && styles.tabTextActive]}>月账单</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === 'year' && styles.tabActive]}
          onPress={() => setViewMode('year')}
        >
          <Text style={[styles.tabText, viewMode === 'year' && styles.tabTextActive]}>年账单</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        {/* 年度汇总卡片 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBgIcon}>
            <Text style={styles.summaryBgSymbol}>¥</Text>
          </View>
          <Text style={styles.summaryLabel}>{viewMode === 'month' ? '月结余' : '年结余'}</Text>
          <Text style={[styles.summaryBalance, yearBalance < 0 && styles.summaryNegative]}>
            ¥{formatAmount(Math.abs(yearBalance))}
            {yearBalance < 0 && <Text style={styles.overdraft}> (超支)</Text>}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>年收入</Text>
              <Text style={[styles.summaryItemValue, { color: COLORS.income }]}>
                ¥{formatAmount(yearIncome)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>年支出</Text>
              <Text style={[styles.summaryItemValue, { color: COLORS.expense }]}>
                ¥{formatAmount(yearExpense)}
              </Text>
            </View>
          </View>
        </View>

        {/* 月度账单列表 */}
        {viewMode === 'month' && (
          <View style={styles.billCard}>
            {/* 表头 */}
            <View style={styles.tableHeader}>
              <Text style={[styles.thCell, styles.thMonth]}>月份</Text>
              <Text style={[styles.thCell, styles.thMoney]}>收入</Text>
              <Text style={[styles.thCell, styles.thMoney]}>支出</Text>
              <Text style={[styles.thCell, styles.thMoney]}>结余</Text>
              <View style={styles.thArrow} />
            </View>

            {/* 数据行 */}
            {monthlyData.slice().reverse().map((item) => (
              <TouchableOpacity
                key={item.month}
                style={styles.tableRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MainTabs', {
                  screen: 'Home',
                  params: { year, month: item.month },
                })}
              >
                <Text style={[styles.tdCell, styles.tdMonth]}>{item.month}月</Text>
                <Text style={[styles.tdCell, styles.tdMoney, { color: COLORS.income }]}>
                  {item.income > 0 ? formatAmount(item.income) : '-'}
                </Text>
                <Text style={[styles.tdCell, styles.tdMoney, { color: COLORS.expense }]}>
                  {item.expense > 0 ? formatAmount(item.expense) : '-'}
                </Text>
                <Text style={[styles.tdCell, styles.tdMoney, {
                  color: item.balance >= 0 ? COLORS.income : COLORS.danger,
                }]}>
                  {item.income > 0 || item.expense > 0 ? formatAmount(Math.abs(item.balance)) : '-'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} style={styles.tdArrow} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 年账单视图 — 简化为只显示汇总 */}
        {viewMode === 'year' && (
          <View style={styles.billCard}>
            <View style={styles.yearDetailRow}>
              <Text style={styles.yearDetailLabel}>全年总收入</Text>
              <Text style={[styles.yearDetailValue, { color: COLORS.income }]}>
                ¥{formatAmount(yearIncome)}
              </Text>
            </View>
            <View style={styles.yearDetailDivider} />
            <View style={styles.yearDetailRow}>
              <Text style={styles.yearDetailLabel}>全年总支出</Text>
              <Text style={[styles.yearDetailValue, { color: COLORS.expense }]}>
                ¥{formatAmount(yearExpense)}
              </Text>
            </View>
            <View style={styles.yearDetailDivider} />
            <View style={styles.yearDetailRow}>
              <Text style={styles.yearDetailLabel}>全年结余</Text>
              <Text style={[styles.yearDetailValue, { color: yearBalance >= 0 ? COLORS.income : COLORS.danger }]}>
                ¥{formatAmount(Math.abs(yearBalance))}
              </Text>
            </View>
            <View style={styles.yearDetailDivider} />
            <View style={styles.yearDetailRow}>
              <Text style={styles.yearDetailLabel}>月均支出</Text>
              <Text style={styles.yearDetailValue}>
                ¥{formatAmount(yearExpense / 12)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 年份下拉选择 */}
      <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={closeYearPicker}>
        <TouchableOpacity style={styles.yearOverlay} activeOpacity={1} onPress={closeYearPicker}>
          <View style={styles.yearDropdown} onStartShouldSetResponder={() => true}>
            <Text style={styles.yearDropdownTitle}>选择年份</Text>
            <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearItem, y === year && styles.yearItemActive]}
                  onPress={() => { setYear(y); closeYearPicker(); }}
                >
                  <Text style={[styles.yearItemText, y === year && styles.yearItemTextActive]}>
                    {y}年
                  </Text>
                  {y === year && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // 顶部
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  yearText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // 切换 Tab
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  tabActive: {
    backgroundColor: COLORS.text,
  },
  tabText: { fontSize: 14, color: COLORS.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  // 年度汇总卡片
  summaryCard: {
    backgroundColor: COLORS.primary,
    margin: 16,
    borderRadius: 12,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  summaryBgIcon: {
    position: 'absolute',
    right: -10,
    top: -20,
    opacity: 0.08,
  },
  summaryBgSymbol: { fontSize: 140, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 13, color: COLORS.text, opacity: 0.7, marginBottom: 4 },
  summaryBalance: { fontSize: 30, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  summaryNegative: { color: '#FF3B30' },
  overdraft: { fontSize: 14, color: '#FF3B30', fontWeight: '500' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: { flex: 1 },
  summaryItemLabel: { fontSize: 12, color: COLORS.text, opacity: 0.6, marginBottom: 4 },
  summaryItemValue: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  summaryDivider: { width: 1, height: 30, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 16 },

  // 月度账单表格
  billCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  thCell: { fontSize: 12, color: COLORS.textLight, fontWeight: '600' },
  thMonth: { width: 50 },
  thMoney: { flex: 1, textAlign: 'right' },
  thArrow: { width: 20 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  tdCell: { fontSize: 14, color: COLORS.text },
  tdMonth: { width: 50, fontWeight: '500' },
  tdMoney: { flex: 1, textAlign: 'right', fontSize: 13 },
  tdArrow: { width: 20, textAlign: 'center' },

  // 年账单详情
  yearDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  yearDetailLabel: { fontSize: 15, color: COLORS.text },
  yearDetailValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  yearDetailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
    marginHorizontal: 20,
  },

  // 年份下拉
  yearOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 76,
  },
  yearDropdown: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 240,
    maxHeight: 400,
    padding: 16,
  },
  yearDropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  yearList: {},
  yearItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  yearItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  yearItemText: { fontSize: 16, color: COLORS.text },
  yearItemTextActive: { color: COLORS.primary, fontWeight: '600' },
});
