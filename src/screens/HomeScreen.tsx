import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
  RefreshControl, SectionList, StatusBar, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { Transaction } from '../models/Transaction';
import { COLORS, MASCOTS, SHADOWS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { CategoryIcon } from '../components/AppIcon';
import { showThemedConfirm } from '../components/AlertProvider';

interface DayGroup {
  date: string;
  dateLabel: string;
  weekday: string;
  totalExpense: number;
  data: Transaction[];
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const MONTH_ITEM_HEIGHT = 42;

function getWeekday(d: string) { return WEEKDAYS[new Date(d).getDay()]; }

function formatDateLabel(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateStr === today) return '今天';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  if (dateStr === yesterday) return '昨天';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [sections, setSections] = useState<DayGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showAction, setShowAction] = useState(false);
  const [summaryHidden, setSummaryHidden] = useState(false);
  const monthListRef = useRef<ScrollView>(null);
  const monthPickerItems = useMemo(() => {
    const items: { label: string; y: number; m: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    for (let y = currentYear - 10; y <= currentYear; y++) {
      const maxMonth = y === currentYear ? currentMonth : 12;
      for (let m = 1; m <= maxMonth; m++) {
        items.push({ label: `${y}年${m}月`, y, m });
      }
    }
    return items;
  }, []);

  const selectedMonthIndex = monthPickerItems.findIndex((item) => item.y === year && item.m === month);

  useEffect(() => {
    if (!showDatePicker || selectedMonthIndex < 0) return;
    const timer = setTimeout(() => {
      monthListRef.current?.scrollTo({
        y: Math.max(selectedMonthIndex * MONTH_ITEM_HEIGHT - MONTH_ITEM_HEIGHT * 2, 0),
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [showDatePicker, selectedMonthIndex]);

  useFocusEffect(
    useCallback(() => {
      const targetYear = route.params?.year;
      const targetMonth = route.params?.month;
      if (typeof targetYear === 'number' && typeof targetMonth === 'number') {
        // 限制不能设置未来日期
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        if (targetYear < currentYear || (targetYear === currentYear && targetMonth <= currentMonth)) {
          setYear(targetYear);
          setMonth(targetMonth);
        }
      }
    }, [route.params?.year, route.params?.month])
  );

  const loadData = useCallback(async () => {
    const books = await AccountBookRepo.getAll();
    if (!books.length) return;
    const bookId = books[0].id;
    const y = year, m = month;

    setSummary(await TransactionRepo.getMonthlySummary(bookId, y, m));

    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const end = `${y}-${String(m).padStart(2, '0')}-${new Date(y, m, 0).getDate()}`;
    const txs = await TransactionRepo.getAll({ book_id: bookId, start_date: start, end_date: end });

    const map = new Map<string, Transaction[]>();
    for (const t of txs) { (map.get(t.date) || map.set(t.date, []).get(t.date)!).push(t); }

    setSections(
      Array.from(map.keys()).sort().reverse().map((date) => {
        const items = map.get(date)!;
        return {
          date,
          dateLabel: formatDateLabel(date),
          weekday: getWeekday(date),
          totalExpense: items.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
          totalIncome: items.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          data: items,
        };
      })
    );
  }, [year, month]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData, year, month]));
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const handleLongPress = (tx: Transaction) => {
    setSelectedTx(tx);
    setShowAction(true);
  };

  const handleEdit = () => {
    if (!selectedTx) return;
    setShowAction(false);
    navigation.navigate('AddTransaction', { transactionId: selectedTx.id, transactionType: selectedTx.type });
  };

  const handleDelete = () => {
    if (!selectedTx) return;
    showThemedConfirm('确认删除', '确定要删除这条记录吗？', async () => {
      await TransactionRepo.delete(selectedTx.id);
      setShowAction(false);
      setSelectedTx(null);
      loadData();
    }, '删除');
  };

  const renderSummaryAmount = (value: number) => {
    return summaryHidden ? '****' : formatAmount(value);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />

      <LinearGradient
        colors={[COLORS.primary, COLORS.primary, COLORS.background]}
        locations={[0, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.header, { paddingTop: (insets.top || 24) + 0, paddingBottom: 12 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingSub}>今天也要好好记账</Text>
          </View>
          <Image source={MASCOTS.home} style={styles.headerMascot} resizeMode="contain" />
          <TouchableOpacity style={styles.monthPickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.monthText}>{year}年{month}月</Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTitleRow}>
            <Text style={styles.summaryTitle}>本月账单</Text>
            <TouchableOpacity
              style={styles.summaryEyeBtn}
              onPress={() => setSummaryHidden((hidden) => !hidden)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={summaryHidden ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>收入</Text>
              <Text style={styles.summaryVal}>{renderSummaryAmount(summary.income)}</Text>
            </View>
            <View style={styles.summarySep} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>支出</Text>
              <Text style={styles.summaryVal}>{renderSummaryAmount(summary.expense)}</Text>
            </View>
            <View style={styles.summarySep} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>结余</Text>
              <Text style={styles.summaryVal}>{renderSummaryAmount(summary.income - summary.expense)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.funcBar}>
        {[
          { icon: 'paw-outline', label: '账单', screen: 'BillStatistics' },
          { icon: 'wallet-outline', label: '预算', screen: 'Budget' },
          { icon: 'calendar-outline', label: '日历', screen: 'Calendar' },
          { icon: 'stats-chart-outline', label: '统计', screen: 'Statistics' },
        ].map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.funcItem}
            activeOpacity={0.7}
            onPress={() => item.screen ? navigation.navigate(item.screen) : null}
          >
            <View style={styles.funcIconBg}>
              <Ionicons name={item.icon as any} size={18} color={COLORS.text} />
            </View>
            <Text style={styles.funcLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionList
        style={{ flex: 1 }}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <View style={styles.dayLeft}>
              <Text style={styles.dayDate}>{section.dateLabel}</Text>
              <Text style={styles.dayWeek}>{section.weekday}</Text>
            </View>
            <View style={styles.dayRight}>
              {section.totalExpense > 0 && (
                <Text style={styles.dayExpense}>支 ¥{formatAmount(section.totalExpense)}</Text>
              )}
              {section.totalIncome > 0 && (
                <Text style={styles.dayIncome}>收 ¥{formatAmount(section.totalIncome)}</Text>
              )}
            </View>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <TouchableOpacity
            style={[
              styles.txItem,
              index === 0 && styles.txItemFirst,
              index === section.data.length - 1 && styles.txItemLast,
            ]}
            onPress={() => navigation.navigate('AddTransaction', { transactionId: item.id, transactionType: item.type })}
            onLongPress={() => handleLongPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.txIconBg}>
              <CategoryIcon categoryName={item.category_name || ''} iconKey={item.category_icon} size={20} color="#555" />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txName}>{item.category_name || '未分类'}</Text>
              {item.note ? <Text style={styles.txNote}>{item.note}</Text> : null}
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, item.type === 'income' ? styles.income : styles.expense]}>
                {item.type === 'income' ? '+' : '-'}{formatAmount(item.amount)}
              </Text>
              {item.created_at && (
                <Text style={styles.txTime}>
                  {new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={44} color={COLORS.textLight} />
            <Text style={styles.emptyText}>本月还没有记录</Text>
            <Text style={styles.emptyHint}>点击底部 + 号开始记账</Text>
          </View>
        }
      />

      {/* 闀挎寜鎿嶄綔寮圭獥 */}
      <Modal visible={showAction} transparent animationType="fade" onRequestClose={() => setShowAction(false)}>
        <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setShowAction(false)}>
          <View style={styles.actionSheet} onStartShouldSetResponder={() => true}>
            {/* 璁板綍鎽樿 */}
            {selectedTx && (
              <View style={styles.actionSummary}>
                <View style={styles.actionSummaryIcon}>
                  <CategoryIcon categoryName={selectedTx.category_name || ''} iconKey={selectedTx.category_icon} size={22} color={COLORS.text} />
                </View>
                <View style={styles.actionSummaryInfo}>
                  <Text style={styles.actionSummaryName}>{selectedTx.category_name || '未分类'}</Text>
                  {selectedTx.note ? <Text style={styles.actionSummaryNote}>{selectedTx.note}</Text> : null}
                </View>
                <Text style={[styles.actionSummaryAmount, { color: selectedTx.type === 'income' ? COLORS.income : COLORS.expense }]}>
                  {selectedTx.type === 'income' ? '+' : '-'}¥{formatAmount(selectedTx.amount)}
                </Text>
              </View>
            )}

            <View style={styles.actionDivider} />

            {/* 鎿嶄綔鎸夐挳 */}
            <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
              <Ionicons name="create-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.actionBtnText}>编辑</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.actionBtnText}>删除</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity style={[styles.actionBtn, styles.actionCancel]} onPress={() => setShowAction(false)}>
              <Text style={styles.actionCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 月份下拉选择器 */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.monthOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <View style={styles.monthDropdown} onStartShouldSetResponder={() => true}>
            <Text style={styles.monthDropdownTitle}>选择月份</Text>
            <ScrollView ref={monthListRef} style={styles.monthList} showsVerticalScrollIndicator={false}>
              {monthPickerItems.map((item) => (
                <TouchableOpacity
                  key={`${item.y}-${item.m}`}
                  style={[styles.monthItem, item.y === year && item.m === month && styles.monthItemActive]}
                  onPress={() => { setYear(item.y); setMonth(item.m); setShowDatePicker(false); }}
                >
                  <Text style={[styles.monthItemText, item.y === year && item.m === month && styles.monthItemTextActive]}>
                    {item.label}
                  </Text>
                  {item.y === year && item.m === month && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 0,
    paddingTop: undefined as any,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    zIndex: 2,
  },
  greetingSub: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  headerMascot: {
    width: 42,
    height: 42,
    alignSelf: 'center',
  },
  monthPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  monthText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...SHADOWS.card,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  summaryTitle: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  summaryEyeBtn: {
    width: 24,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: COLORS.textLight, marginBottom: 2 },
  summaryVal: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  summarySep: { width: 1, height: 24, backgroundColor: COLORS.divider },

  funcBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  funcItem: { flex: 1, alignItems: 'center' },
  funcIconBg: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF6DA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 7,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  funcLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' },

  listContent: { paddingTop: 8, paddingBottom: 26 },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 6,
    marginTop: 2,
    backgroundColor: COLORS.background,
  },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDate: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  dayWeek: { fontSize: 12, color: COLORS.textLight },
  dayRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayExpense: { fontSize: 11, color: COLORS.textLight },
  dayIncome: { fontSize: 11, color: COLORS.textLight },

  txItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  txItemFirst: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  txItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    marginBottom: 8,
  },
  txIconBg: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF3D0',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  txInfo: { flex: 1 },
  txName: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  txNote: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '600' },
  txTime: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  income: { color: COLORS.income },
  expense: { color: COLORS.expense },

  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  emptyHint: { fontSize: 13, color: COLORS.textLight },

  // 闀挎寜鎿嶄綔寮圭獥
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  actionSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginHorizontal: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  actionSummaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF4D3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionSummaryInfo: { flex: 1 },
  actionSummaryName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  actionSummaryNote: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  actionSummaryAmount: { fontSize: 17, fontWeight: '700' },
  actionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.divider },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionBtnText: { fontSize: 15, color: COLORS.text },
  actionCancel: {
    justifyContent: 'center',
    backgroundColor: '#FFF4D3',
  },
  actionCancelText: { fontSize: 15, color: COLORS.text, fontWeight: '600', textAlign: 'center' },

  // 月份下拉选择器
  monthOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-end',
    paddingTop: 92,
    paddingRight: 16,
  },
  monthDropdown: { backgroundColor: '#fff', borderRadius: 16, width: 260, maxHeight: 400, padding: 16 },
  monthDropdownTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 12 },
  monthList: { maxHeight: 360 },
  monthItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 8 },
  monthItemActive: { backgroundColor: COLORS.primaryLight },
  monthItemText: { fontSize: 15, color: COLORS.text },
  monthItemTextActive: { color: COLORS.primary, fontWeight: '600' },
});
