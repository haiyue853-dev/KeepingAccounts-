import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  Modal, ScrollView, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { Transaction } from '../models/Transaction';
import { COLORS, SHADOWS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { CategoryIcon } from '../components/AppIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const ITEM_MARGIN = 2;
const COLUMNS = 7;
const DAY_ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - ITEM_MARGIN * (COLUMNS - 1)) / COLUMNS;
const DAY_ITEM_HEIGHT = DAY_ITEM_WIDTH * 1.3;

interface DayData {
  date: string;
  day: number;
  income: number;
  expense: number;
  hasData: boolean;
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
const MONTH_ITEM_HEIGHT = 42;

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [selectedDaySummary, setSelectedDaySummary] = useState({ income: 0, expense: 0 });
  const [selectedDayTransactions, setSelectedDayTransactions] = useState<Transaction[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const monthListRef = useRef<ScrollView>(null);

  const monthPickerItems = React.useMemo(() => {
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
    if (!showMonthPicker || selectedMonthIndex < 0) return;
    const timer = setTimeout(() => {
      monthListRef.current?.scrollTo({
        y: Math.max(selectedMonthIndex * MONTH_ITEM_HEIGHT - MONTH_ITEM_HEIGHT * 2, 0),
        animated: false,
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [showMonthPicker, selectedMonthIndex]);

  useEffect(() => {
    const init = async () => {
      const books = await AccountBookRepo.getAll();
      if (books.length) {
        setBookId(books[0].id);
      }
    };
    init();
  }, []);

  const loadCalendarData = useCallback(async () => {
    if (!bookId) return;

    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    const nextMonthDays = 42 - (startWeekday + daysInMonth);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    const dailySummaries = await TransactionRepo.getDailySummary(bookId, startDate, endDate);

    const summaryMap = new Map<string, { income: number; expense: number }>();
    for (const item of dailySummaries) {
      summaryMap.set(item.date, { income: item.income, expense: item.expense });
    }

    const days: DayData[] = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      days.push({
        date: '',
        day,
        income: 0,
        expense: 0,
        hasData: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const summary = summaryMap.get(dateStr) || { income: 0, expense: 0 };
      days.push({
        date: dateStr,
        day: d,
        income: summary.income,
        expense: summary.expense,
        hasData: summary.income > 0 || summary.expense > 0,
      });
    }

    for (let d = 1; d <= nextMonthDays; d++) {
      days.push({
        date: '',
        day: d,
        income: 0,
        expense: 0,
        hasData: false,
      });
    }

    setCalendarData(days);

    if (!selectedDate || !selectedDate.startsWith(`${year}-${String(month).padStart(2, '0')}`)) {
      const today = new Date();
      if (today.getFullYear() === year && today.getMonth() + 1 === month) {
        const todayStr = `${year}-${String(month).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        setSelectedDate(todayStr);
      } else {
        let targetDay = 1;
        if (selectedDate) {
          const selectedDay = parseInt(selectedDate.split('-')[2], 10);
          if (!isNaN(selectedDay) && selectedDay <= daysInMonth) {
            targetDay = selectedDay;
          }
        }
        setSelectedDate(`${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`);
      }
    }
  }, [year, month, bookId, selectedDate]);

  const loadSelectedDayTransactions = useCallback(async () => {
    if (!bookId || !selectedDate) return;

    const txs = await TransactionRepo.getAll({
      book_id: bookId,
      start_date: selectedDate,
      end_date: selectedDate,
    });

    const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    setSelectedDaySummary({ income, expense });
    setSelectedDayTransactions(txs);
  }, [bookId, selectedDate]);

  useFocusEffect(useCallback(() => {
    loadCalendarData();
  }, [bookId, year, month]));

  useEffect(() => {
    loadSelectedDayTransactions();
  }, [selectedDate, loadSelectedDayTransactions]);

  const goToday = () => {
    const today = new Date();
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  };

  const getWeekday = (dateStr: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const weekday = d.getDay();
    return WEEKDAYS[weekday === 0 ? 6 : weekday - 1];
  };

  const renderCalendarGrid = () => {
    const rows: DayData[][] = [];
    for (let i = 0; i < calendarData.length; i += 7) {
      rows.push(calendarData.slice(i, i + 7));
    }

    const elements = rows.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.calendarRow}>
        {row.map((item, colIndex) => {
          const isSelected = selectedDate === item.date;
          const isToday = item.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          return (
            <TouchableOpacity
              key={colIndex}
              style={[
                styles.dayItem,
                isSelected && styles.dayItemSelected,
                !item.date && styles.dayItemEmpty,
              ]}
              onPress={() => item.date && setSelectedDate(item.date)}
              activeOpacity={0.7}
            >
              <View style={styles.dayContent}>
                <View style={styles.dayTop}>
                  <Text style={[styles.dayNumber, !item.date && styles.dayNumberEmpty]}>{item.day}</Text>
                </View>
                {item.hasData && (
                  <View style={styles.dayBottom}>
                    {item.income > 0 && (
                      <Text style={styles.dayIncome}>+{formatAmount(item.income)}</Text>
                    )}
                    {item.expense > 0 && (
                      <Text style={styles.dayExpense}>-{formatAmount(item.expense)}</Text>
                    )}
                  </View>
                )}
              </View>
              {isToday && item.date && (
                <View style={styles.todayDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    ));

    return <>{elements}</>;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.primary} />

      <View style={[styles.header, { paddingTop: insets.top || 24 }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.monthPickerBtn}
          onPress={() => setShowMonthPicker(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.headerTitle}>{year}年{month}月</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={goToday} activeOpacity={0.7}>
          <Text style={styles.todayBtn}>今天</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekdayText}>{day}</Text>
        ))}
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarGrid}>
          {renderCalendarGrid()}
        </View>

        {selectedDate && (
          <View style={styles.detailSection}>
            <View style={styles.detailHeader}>
              <View style={styles.dayLeft}>
                <Text style={styles.detailDate}>{selectedDate}</Text>
                <Text style={styles.detailWeekday}>{getWeekday(selectedDate)}</Text>
              </View>
              <View style={styles.detailSummary}>
                {selectedDaySummary.expense > 0 && (
                  <Text style={styles.detailExpense}>支 ¥{formatAmount(selectedDaySummary.expense)}</Text>
                )}
                {selectedDaySummary.income > 0 && (
                  <Text style={styles.detailIncome}>收 ¥{formatAmount(selectedDaySummary.income)}</Text>
                )}
              </View>
            </View>

            {selectedDayTransactions.length > 0 ? (
              selectedDayTransactions.map((item, index) => (
                <View
                  key={String(item.id)}
                  style={[
                    styles.transactionItem,
                    index === 0 && styles.txItemFirst,
                    index === selectedDayTransactions.length - 1 && styles.txItemLast,
                  ]}
                >
                  <View style={styles.txIconBg}>
                    <CategoryIcon categoryName={item.category_name || ''} iconKey={item.category_icon} size={17} color="#555" />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txName}>{item.category_name || '未分类'}</Text>
                    {item.note ? <Text style={styles.txNote}>{item.note}</Text> : null}
                  </View>
                  <Text style={[styles.txAmount, item.type === 'income' ? styles.income : styles.expense]}>
                    {item.type === 'income' ? '+' : '-'}{formatAmount(item.amount)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={44} color={COLORS.textLight} />
                <Text style={styles.emptyText}>当天没有记录</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={styles.monthOverlay} activeOpacity={1} onPress={() => setShowMonthPicker(false)}>
          <View style={styles.monthDropdown} onStartShouldSetResponder={() => true}>
            <Text style={styles.monthDropdownTitle}>选择月份</Text>
            <ScrollView ref={monthListRef} style={styles.monthList} showsVerticalScrollIndicator={false}>
              {monthPickerItems.map((item) => (
                <TouchableOpacity
                  key={`${item.y}-${item.m}`}
                  style={[styles.monthItem, item.y === year && item.m === month && styles.monthItemActive]}
                  onPress={() => {
                    setYear(item.y);
                    setMonth(item.m);
                    setShowMonthPicker(false);
                  }}
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
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  monthPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  todayBtn: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  weekdayRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  calendarGrid: { backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingVertical: 8 },
  calendarRow: { flexDirection: 'row', marginBottom: 4 },
  dayItem: {
    width: DAY_ITEM_WIDTH,
    height: DAY_ITEM_HEIGHT,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    marginHorizontal: ITEM_MARGIN,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  dayItemSelected: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  dayItemEmpty: { opacity: 0.3 },
  dayContent: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
  },
  dayTop: {
    alignItems: 'center',
  },
  dayNumber: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  dayNumberEmpty: { color: COLORS.textLight },
  dayBottom: {
    alignItems: 'center',
    gap: 0,
    flexWrap: 'wrap',
    maxWidth: '100%',
    paddingHorizontal: 2,
  },
  dayIncome: { fontSize: 8, color: COLORS.income, maxWidth: '100%', textAlign: 'center' },
  dayExpense: { fontSize: 8, color: COLORS.expense, maxWidth: '100%', textAlign: 'center' },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  detailSection: { backgroundColor: COLORS.background, marginTop: 8, paddingBottom: 16 },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: COLORS.background,
  },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailDate: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  detailWeekday: { fontSize: 12, color: COLORS.textLight },
  detailSummary: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIncome: { fontSize: 11, color: COLORS.textLight },
  detailExpense: { fontSize: 11, color: COLORS.textLight },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF3D0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  txNote: { fontSize: 11, color: COLORS.textLight },
  txAmount: { fontSize: 14, fontWeight: '600' },
  income: { color: COLORS.income },
  expense: { color: COLORS.expense },
  empty: { alignItems: 'center', paddingVertical: 70, gap: 8 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
  monthOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    paddingTop: 92,
    paddingHorizontal: 16,
  },
  monthDropdown: { backgroundColor: '#fff', borderRadius: 16, width: '100%', maxHeight: 400, padding: 16 },
  monthDropdownTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, textAlign: 'center', marginBottom: 12 },
  monthList: { maxHeight: 360 },
  monthItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 8 },
  monthItemActive: { backgroundColor: COLORS.primaryLight },
  monthItemText: { fontSize: 15, color: COLORS.text },
  monthItemTextActive: { color: COLORS.primary, fontWeight: '600' },
});