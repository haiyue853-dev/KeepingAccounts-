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
  // 每次渲染都获取最新日期（确保日期选择器永远基于实时）
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const isPickerJustClosed = useRef(false);
  const hasBeenFocused = useRef(false);

  // 月账单当前数据
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);

  // 年账单数据（1-12月）
  const [yearIncome, setYearIncome] = useState(0);
  const [yearExpense, setYearExpense] = useState(0);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);

  // 同步最新的 year/month 到 ref
  const yearRef = useRef(year);
  const monthRef = useRef(month);
  useEffect(() => {
    yearRef.current = year;
  }, [year]);
  useEffect(() => {
    monthRef.current = month;
  }, [month]);

  const loadData = useCallback(async (targetYear?: number, targetMonth?: number) => {
    const y = targetYear ?? year;
    const m = targetMonth ?? month;

    const books = await AccountBookRepo.getAll();
    if (!books.length) return;
    const bookId = books[0].id;

    // 加载指定月份数据
    const monthSummary = await StatisticsService.getMonthlySummary(bookId, y, m);
    setMonthIncome(monthSummary.income);
    setMonthExpense(monthSummary.expense);

    // 加载整年12个月数据
    let totalIncome = 0;
    let totalExpense = 0;
    const months: MonthData[] = [];
    for (let mm = 1; mm <= 12; mm++) {
      const summary = await StatisticsService.getMonthlySummary(bookId, y, mm);
      totalIncome += summary.income;
      totalExpense += summary.expense;
      months.push({
        month: mm,
        income: summary.income,
        expense: summary.expense,
        balance: summary.income - summary.expense,
      });
    }
    setYearIncome(totalIncome);
    setYearExpense(totalExpense);
    setMonthlyData(months);
  }, [year, month]);

  useFocusEffect(
    useCallback(() => {
      if (isPickerJustClosed.current) {
        isPickerJustClosed.current = false;
        return;
      }

      if (hasBeenFocused.current) {
        loadData();
        return;
      }

      hasBeenFocused.current = true;
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      setYear(currentYear);
      setMonth(currentMonth);
      loadData(currentYear, currentMonth);
    }, [loadData])
  );

  // 年份选择器关闭
  const closeYearPicker = useCallback(() => {
    isPickerJustClosed.current = true;
    setShowYearPicker(false);
    setTimeout(() => {
      loadData(yearRef.current, monthRef.current);
    }, 0);
  }, [loadData]);

  // 月份选择器关闭
  const closeMonthPicker = useCallback(() => {
    isPickerJustClosed.current = true;
    setShowMonthPicker(false);
    setTimeout(() => {
      loadData(yearRef.current, monthRef.current);
    }, 0);
  }, [loadData]);

  const monthBalance = monthIncome - monthExpense;
  const yearBalance = yearIncome - yearExpense;

  return (
    <View style={styles.container}>
      {/* 顶部导航 */}
      <View style={[styles.header, { paddingTop: (insets.top || 24) + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerSelectors}>
            <TouchableOpacity style={styles.yearSelector} onPress={() => setShowYearPicker(true)}>
              <Text style={styles.yearText}>{year}年</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.text} />
            </TouchableOpacity>
            {viewMode === 'month' && (
              <TouchableOpacity style={styles.yearSelector} onPress={() => setShowMonthPicker(true)}>
                <Text style={styles.yearText}>{month}月</Text>
                <Ionicons name="chevron-down" size={14} color={COLORS.text} />
              </TouchableOpacity>
            )}
          </View>
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
        {/* 汇总卡片 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBgIcon}>
            <Text style={styles.summaryBgSymbol}>¥</Text>
          </View>
          <Text style={styles.summaryLabel}>
            {viewMode === 'month' ? `${month}月结余` : '年结余'}
          </Text>
          <Text style={[styles.summaryBalance, (viewMode === 'month' ? monthBalance : yearBalance) < 0 && styles.summaryNegative]}>
            ¥{formatAmount(Math.abs(viewMode === 'month' ? monthBalance : yearBalance))}
            {(viewMode === 'month' ? monthBalance : yearBalance) < 0 && <Text style={styles.overdraft}> (超支)</Text>}
          </Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>{viewMode === 'month' ? '月收入' : '年收入'}</Text>
              <Text style={[styles.summaryItemValue, { color: COLORS.income }]}>
                ¥{formatAmount(viewMode === 'month' ? monthIncome : yearIncome)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>{viewMode === 'month' ? '月支出' : '年支出'}</Text>
              <Text style={[styles.summaryItemValue, { color: COLORS.expense }]}>
                ¥{formatAmount(viewMode === 'month' ? monthExpense : yearExpense)}
              </Text>
            </View>
          </View>
        </View>

        {/* 月账单详情 - 显示当月分类/每日数据 */}
        {viewMode === 'month' && (
          <View style={styles.billCard}>
            <View style={styles.monthHeader}>
              <Text style={styles.monthHeaderTitle}>{year}年{month}月</Text>
              <Text style={styles.monthHeaderSub}>
                共 {monthlyData[month - 1] ? (monthlyData[month - 1].income > 0 || monthlyData[month - 1].expense > 0 ? '有记账' : '无记账') : '无记账'}
              </Text>
            </View>

            {monthIncome === 0 && monthExpense === 0 ? (
              <View style={styles.emptyBlock}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.emptyText}>本月暂无账单记录</Text>
              </View>
            ) : (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>日均支出</Text>
                  <Text style={styles.detailValue}>
                    ¥{formatAmount(monthExpense / new Date(year, month, 0).getDate())}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>本月结余</Text>
                  <Text style={[styles.detailValue, { color: monthBalance >= 0 ? COLORS.income : COLORS.danger }]}>
                    ¥{formatAmount(Math.abs(monthBalance))}
                  </Text>
                </View>
                <View style={styles.detailDivider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>支出/收入比</Text>
                  <Text style={styles.detailValue}>
                    {monthIncome > 0 ? (monthExpense / monthIncome * 100).toFixed(1) : 0}%
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.viewDetailBtn}
              onPress={() => navigation.navigate('MainTabs', {
                screen: 'Home',
                params: { year, month },
              })}
            >
              <Text style={styles.viewDetailText}>查看本月明细</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* 年账单视图 - 显示 1-12 月表格 */}
        {viewMode === 'year' && (
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
                onPress={() => {
                  setMonth(item.month);
                  setViewMode('month');
                }}
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

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* 年份下拉选择 - 最新在底部 */}
      <Modal visible={showYearPicker} transparent animationType="fade" onRequestClose={closeYearPicker}>
        <TouchableOpacity style={styles.yearOverlay} activeOpacity={1} onPress={closeYearPicker}>
          <View style={styles.yearDropdown} onStartShouldSetResponder={() => true}>
            <Text style={styles.yearDropdownTitle}>选择年份</Text>
            <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 5 + i).map((y) => {
                const isCurrent = y === now.getFullYear();
                return (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearItem, y === year && styles.yearItemActive]}
                    onPress={() => { setYear(y); closeYearPicker(); }}
                  >
                    <Text style={[styles.yearItemText, y === year && styles.yearItemTextActive]}>
                      {y}年{isCurrent ? ' (今年)' : ''}
                    </Text>
                    {y === year && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 月份下拉选择 - 根据当前年截断到当前月，无未来月份 */}
      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={closeMonthPicker}>
        <TouchableOpacity style={styles.yearOverlay} activeOpacity={1} onPress={closeMonthPicker}>
          <View style={styles.yearDropdown} onStartShouldSetResponder={() => true}>
            <Text style={styles.yearDropdownTitle}>选择月份</Text>
            <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
              {(() => {
                // 实时计算：当前年只显示到当前月，其他年显示 1-12 月
                const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;
                const months = Array.from({ length: maxMonth }, (_, i) => i + 1);
                return months.map((m) => {
                  const isCurrent = m === now.getMonth() + 1 && year === now.getFullYear();
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.yearItem, m === month && styles.yearItemActive]}
                      onPress={() => { setMonth(m); closeMonthPicker(); }}
                    >
                      <Text style={[styles.yearItemText, m === month && styles.yearItemTextActive]}>
                        {m}月{isCurrent ? ' (本月)' : ''}
                      </Text>
                      {m === month && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                });
              })()}
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
    backgroundColor: COLORS.surface,
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: { width: 40, alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerSelectors: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  yearText: { fontSize: 17, fontWeight: '600', color: COLORS.text },

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
    backgroundColor: COLORS.background,
  },
  tabActive: {
    backgroundColor: COLORS.text,
  },
  tabText: { fontSize: 14, color: COLORS.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '600' },

  // 汇总卡片
  summaryCard: {
    backgroundColor: COLORS.surface,
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
  summaryBgSymbol: { fontSize: 140, fontWeight: '600', color: COLORS.text },
  summaryLabel: { fontSize: 13, color: COLORS.text, opacity: 0.7, marginBottom: 4 },
  summaryBalance: { fontSize: 30, fontWeight: '600', color: COLORS.text, marginBottom: 20 },
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

  // 月账单详情卡
  billCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  monthHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  monthHeaderTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  monthHeaderSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  emptyBlock: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textLight },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  detailLabel: { fontSize: 14, color: COLORS.text },
  detailValue: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.divider,
    marginHorizontal: 20,
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  viewDetailText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  // 年账单表格
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
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
