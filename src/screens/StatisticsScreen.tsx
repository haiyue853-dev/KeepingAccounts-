import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
  Modal,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle, G } from 'react-native-svg';
import { StatisticsService, CategorySummary, DailySummary, RangeSummary } from '../services/StatisticsService';
import { AccountBookRepo } from '../repositories/AccountBookRepo';
import { COLORS, CHART_COLORS, MASCOTS, SHADOWS } from '../utils/constants';
import { formatAmount } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;
const CIRCLE_SIZE = 138;
const CIRCLE_RADIUS = 46;
const CIRCLE_STROKE = 20;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

type TimeMode = 'week' | 'month' | 'year';
type ViewMode = 'expense' | 'income';

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];

// 年份列表选择器组件（自动滚动到选中年份）
function YearScrollView({ selectedYear, onSelect }: { selectedYear: number; onSelect: (year: number) => void }) {
  const cy = new Date().getFullYear();
  const scrollRef = useRef<ScrollView>(null);
  const years = Array.from({ length: 11 }, (_, i) => cy - 10 + i);
  const selectedIndex = years.indexOf(selectedYear);

  // 初始滚动到选中年份的位置
  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        // 如果是最后一个或接近最后一个，直接滚到底部
        if (selectedIndex >= years.length - 2) {
          scrollRef.current?.scrollToEnd({ animated: false });
        } else {
          scrollRef.current?.scrollTo({
            y: selectedIndex * 48,
            animated: false,
          });
        }
      }, 100);
    }
  }, []);

  return (
    <ScrollView ref={scrollRef} style={styles.yearList} showsVerticalScrollIndicator={false}>
      {years.map((y) => {
        const isCurrent = y === cy;
        const label = isCurrent ? `${y}年 (本年)` : `${y}年`;
        return (
          <TouchableOpacity key={y} style={[styles.yearItem, y === selectedYear && styles.yearItemActive]} onPress={() => onSelect(y)}>
            <Text style={[styles.yearItemText, y === selectedYear && styles.yearItemTextActive]}>{label}</Text>
            {y === selectedYear && <Ionicons name="checkmark" size={18} color={COLORS.primaryDark} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// 周列表选择器组件（自动滚动到选中周）
function WeekScrollView({ maxWeek, selectedWeek, currentWeek, onSelect }: { maxWeek: number; selectedWeek: number; currentWeek: number; onSelect: (week: number) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);
  const selectedIndex = weeks.indexOf(selectedWeek);

  // 初始滚动到选中周的位置
  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        // 如果是最后一个或接近最后一个，直接滚到底部
        if (selectedIndex >= weeks.length - 2) {
          scrollRef.current?.scrollToEnd({ animated: false });
        } else {
          scrollRef.current?.scrollTo({
            y: selectedIndex * 48,
            animated: false,
          });
        }
      }, 100);
    }
  }, []);

  return (
    <View style={{ maxHeight: 250 }}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {weeks.map((w) => {
          const isCurrent = w === currentWeek;
          const label = isCurrent ? `第${w}周 (本周)` : `第${w}周`;
          return (
            <TouchableOpacity key={w} style={[styles.yearItem, w === selectedWeek && styles.yearItemActive]} onPress={() => onSelect(w)}>
              <Text style={[styles.yearItemText, w === selectedWeek && styles.yearItemTextActive]}>{label}</Text>
              {w === selectedWeek && <Ionicons name="checkmark" size={18} color={COLORS.primaryDark} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// 月份列表选择器组件（自动滚动到选中月）
function MonthScrollView({ maxMonth, selectedMonth, currentMonth, onSelect }: { maxMonth: number; selectedMonth: number; currentMonth: number; onSelect: (month: number) => void }) {
  const scrollRef = useRef<ScrollView>(null);
  const months = Array.from({ length: maxMonth }, (_, i) => i + 1);
  const selectedIndex = months.indexOf(selectedMonth);

  // 初始滚动到选中月的位置
  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        // 如果是最后一个或接近最后一个，直接滚到底部
        if (selectedIndex >= months.length - 2) {
          scrollRef.current?.scrollToEnd({ animated: false });
        } else {
          scrollRef.current?.scrollTo({
            y: selectedIndex * 48,
            animated: false,
          });
        }
      }, 100);
    }
  }, []);

  return (
    <View style={{ maxHeight: 250 }}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {months.map((m) => {
          const isCurrent = m === currentMonth;
          const label = isCurrent ? `${m}月 (本月)` : `${m}月`;
          return (
            <TouchableOpacity key={m} style={[styles.yearItem, m === selectedMonth && styles.yearItemActive]} onPress={() => onSelect(m)}>
              <Text style={[styles.yearItemText, m === selectedMonth && styles.yearItemTextActive]}>{label}</Text>
              {m === selectedMonth && <Ionicons name="checkmark" size={18} color={COLORS.primaryDark} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// 年份滚轮选择器组件
function YearWheelPicker({ selectedYear, onSelect }: { selectedYear: number; onSelect: (year: number) => void }) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const scrollRef = useRef<ScrollView>(null);
  const [localSelectedYear, setLocalSelectedYear] = useState(selectedYear);
  // 生成年份列表：从过去20年到当前年份（最新的在底部）
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 20 + i);

  // 计算选中年份的索引
  const selectedIndex = years.indexOf(localSelectedYear);

  // 同步外部 selectedYear 变化
  useEffect(() => {
    setLocalSelectedYear(selectedYear);
  }, [selectedYear]);

  // 初始滚动到选中年份的位置
  useEffect(() => {
    if (scrollRef.current && selectedIndex >= 0) {
      // 延迟一下确保布局完成
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: selectedIndex * 44,
          animated: false,
        });
      }, 100);
    }
  }, []);

  const handleSelect = (y: number) => {
    setLocalSelectedYear(y);
    onSelect(y);
  };

  return (
    <View style={styles.yearWheelContainer}>
      <ScrollView
        ref={scrollRef}
        style={styles.yearWheelScroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={44}
        decelerationRate="fast"
      >
        {/* 顶部留白，让第一项可以滚动到中间 */}
        <View style={{ height: 44 }} />
        {years.map((y) => {
          const isCurrent = y === currentYear;
          const isSelected = y === localSelectedYear;
          const label = isCurrent ? `${y}年 (本年)` : `${y}年`;
          return (
            <TouchableOpacity
              key={y}
              style={[styles.yearWheelItem, isSelected && styles.yearWheelItemActive]}
              onPress={() => handleSelect(y)}
            >
              <Text style={[styles.yearWheelText, isSelected && styles.yearWheelTextActive]}>{label}</Text>
              {isSelected && <Ionicons name="checkmark" size={16} color={COLORS.primaryDark} />}
            </TouchableOpacity>
          );
        })}
        {/* 底部留白 */}
        <View style={{ height: 44 }} />
      </ScrollView>
    </View>
  );
}

function MiniDonut({ data, total }: { data: CategorySummary[]; total: number }) {
  let offset = 0;
  const entries = data.slice(0, 5);

  return (
    <View style={styles.donutWrap}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
        <G rotation="-90" originX={CIRCLE_SIZE / 2} originY={CIRCLE_SIZE / 2}>
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={CIRCLE_RADIUS}
            stroke="#F7EBD6"
            strokeWidth={CIRCLE_STROKE}
            fill="none"
          />
          {entries.map((item, index) => {
            const ratio = total > 0 ? item.total / total : 0;
            const length = CIRCLE_CIRCUMFERENCE * ratio;
            const dashOffset = -offset;
            offset += length;
            return (
              <Circle
                key={`${item.category_name}-${index}`}
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={CIRCLE_STROKE}
                strokeDasharray={`${length} ${CIRCLE_CIRCUMFERENCE - length}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.donutLabel}>总支出</Text>
        <Text style={styles.donutValue}>{formatAmount(total)}</Text>
      </View>
    </View>
  );
}

export default function StatisticsScreen() {
  const insets = useSafeAreaInsets();
  const [timeMode, setTimeMode] = useState<TimeMode>('month');
  const [viewMode, setViewMode] = useState<ViewMode>('expense');
  const [year, setYear] = useState(() => {
    const date = new Date();
    const wk = StatisticsService.dateToWeek(date);
    return wk.year;
  });
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [weekNum, setWeekNum] = useState(() => {
    const date = new Date();
    return StatisticsService.dateToWeek(date).weekNum;
  });
  const [chartData, setChartData] = useState<DailySummary[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: number; income: number; expense: number }[]>([]);
  const [rangeSummary, setRangeSummary] = useState<RangeSummary | null>(null);
  const [categoryData, setCategoryData] = useState<CategorySummary[]>([]);
  const [chartWidth, setChartWidth] = useState(screenWidth - 32);
  const [showPicker, setShowPicker] = useState(false);
  const isPickerJustClosed = useRef(false);
  const hasBeenFocused = useRef(false);

  // 使用 ref 存储最新的状态值
  const yearRef = useRef(year);
  const monthRef = useRef(month);
  const weekNumRef = useRef(weekNum);

  // 同步状态到 ref
  useEffect(() => {
    yearRef.current = year;
    monthRef.current = month;
    weekNumRef.current = weekNum;
  }, [year, month, weekNum]);

  const loadData = useCallback(async (targetYear?: number, targetMonth?: number, targetWeekNum?: number) => {
    const y = targetYear ?? year;
    const m = targetMonth ?? month;
    const w = targetWeekNum ?? weekNum;

    const books = await AccountBookRepo.getAll();
    if (books.length === 0) return;
    const bookId = books[0].id;

    if (timeMode === 'week') {
      const range = StatisticsService.getWeekRange(y, w);
      setChartData(await StatisticsService.getWeekDailyData(bookId, range.startDate, range.endDate));
      setMonthlyTrend([]);
      setRangeSummary(await StatisticsService.getWeekSummary(bookId, range.startDate, range.endDate));
      setCategoryData(await StatisticsService.getWeekCategorySummary(bookId, range.startDate, range.endDate));
    } else if (timeMode === 'month') {
      setChartData(await StatisticsService.getMonthDailyData(bookId, y, m));
      setMonthlyTrend([]);
      const summary = await StatisticsService.getMonthlySummary(bookId, y, m);
      const lastDay = new Date(y, m, 0).getDate();
      setRangeSummary({
        startDate: `${y}-${String(m).padStart(2, '0')}-01`,
        endDate: `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        income: summary.income,
        expense: summary.expense,
        days: lastDay,
        dailyAvg: summary.expense / lastDay,
      });
      setCategoryData(await StatisticsService.getMonthCategorySummary(bookId, y, m));
    } else {
      setChartData([]);
      setMonthlyTrend(await StatisticsService.getYearMonthlyData(bookId, y));
      setRangeSummary(await StatisticsService.getYearSummary(bookId, y));
      setCategoryData(await StatisticsService.getYearCategorySummary(bookId, y));
    }
  }, [timeMode, year, month, weekNum]);

  useEffect(() => {
    loadData();
  }, [timeMode, year, month, weekNum]);

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
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentWeekNum = StatisticsService.dateToWeek(now).weekNum;

      setYear(currentYear);
      setMonth(currentMonth);
      setWeekNum(currentWeekNum);

      loadData(currentYear, currentMonth, currentWeekNum);
    }, [loadData])
  );

  // 关闭弹窗的辅助函数
  const closePicker = useCallback(() => {
    isPickerJustClosed.current = true;
    setShowPicker(false);
    // 使用 ref 获取最新的状态值
    setTimeout(() => {
      loadData(yearRef.current, monthRef.current, weekNumRef.current);
    }, 0);
  }, [loadData]);

  const getTimeLabel = (): string => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curWeek = StatisticsService.dateToWeek(now);
    if (timeMode === 'week') {
      if (year === curWeek.year && weekNum === curWeek.weekNum) return '本周';
      return `第${weekNum}周`;
    }
    if (timeMode === 'month') {
      if (year === curYear && month === curMonth) return '本月';
      return `${year}年${month}月`;
    }
    if (year === curYear) return '本年';
    return `${year}年`;
  };

  const getLineChartData = () => {
    if (timeMode === 'year' && monthlyTrend.length > 0) {
      return {
        labels: monthlyTrend.map((t) => `${t.month}月`),
        datasets: [{
          data: monthlyTrend.map((t) => viewMode === 'expense' ? t.expense : t.income),
          color: () => COLORS.primaryDark,
          strokeWidth: 2,
        }],
      };
    }

    if (chartData.length > 0) {
      const data = chartData.map((d) => viewMode === 'expense' ? d.expense : d.income);
      const labelInterval = chartData.length > 15 ? 5 : (chartData.length > 7 ? 2 : 1);
      return {
        labels: chartData.map((d, i) => {
          if (i % labelInterval === 0) {
            return timeMode === 'week' ? WEEKDAY_NAMES[new Date(d.date).getDay()] : `${new Date(d.date).getDate()}`;
          }
          return '';
        }),
        datasets: [{
          data: data.some((v) => v > 0) ? data : [0],
          color: () => COLORS.primaryDark,
          strokeWidth: 2,
        }],
      };
    }

    return null;
  };

  const goPrev = () => {
    if (timeMode === 'week') {
      if (weekNum > 1) setWeekNum(weekNum - 1);
      else { setYear(year - 1); setWeekNum(StatisticsService.getTotalWeeks(year - 1)); }
    } else if (timeMode === 'month') {
      if (month > 1) setMonth(month - 1);
      else { setMonth(12); setYear(year - 1); }
    } else {
      setYear(year - 1);
    }
  };

  const goNext = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curWeek = StatisticsService.dateToWeek(now);

    if (timeMode === 'week') {
      const totalWeeks = StatisticsService.getTotalWeeks(year);
      const maxWeek = year === curYear ? curWeek.weekNum : totalWeeks;
      if (weekNum < maxWeek) setWeekNum(weekNum + 1);
      else if (year < curYear) { setYear(year + 1); setWeekNum(1); }
    } else if (timeMode === 'month') {
      const maxMonth = year === curYear ? curMonth : 12;
      if (month < maxMonth) setMonth(month + 1);
      else if (year < curYear) { setMonth(1); setYear(year + 1); }
    } else {
      if (year < curYear) setYear(year + 1);
    }
  };

  const onChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const filteredCategories = categoryData.filter((c) => c.type === viewMode);
  const total = viewMode === 'expense' ? rangeSummary?.expense ?? 0 : rangeSummary?.income ?? 0;
  const chart = getLineChartData();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (insets.top || 24) + 8 }]}>
        <View>
          <Text style={styles.headerTitle}>图表</Text>
          <Text style={styles.headerSub}>支出分类占比和趋势</Text>
        </View>
        <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.monthPill}>
          <Text style={styles.monthPillText}>{getTimeLabel()}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>
              {(() => {
                const now = new Date();
                const cy = now.getFullYear();
                const cm = now.getMonth() + 1;
                const cw = StatisticsService.dateToWeek(now);
                const type = viewMode === 'expense' ? '支出' : '收入';
                if (timeMode === 'week' && year === cw.year && weekNum === cw.weekNum) return `本周${type}`;
                if (timeMode === 'month' && year === cy && month === cm) return `本月${type}`;
                if (timeMode === 'year' && year === cy) return `本年${type}`;
                return `总${type}`;
              })()}
            </Text>
            <Text style={styles.summaryAmount}>¥{formatAmount(total)}</Text>
            <Text style={styles.summaryDaily}>日均支出 ¥{formatAmount(rangeSummary?.dailyAvg ?? 0)}</Text>
          </View>
          <Image source={MASCOTS.chart} style={styles.summaryMascot} resizeMode="contain" />
        </View>

        <View style={styles.segmentRow}>
          {(['week', 'month', 'year'] as TimeMode[]).map((mode) => (
            <TouchableOpacity key={mode} style={[styles.segmentBtn, timeMode === mode && styles.segmentActive]} onPress={() => setTimeMode(mode)}>
              <Text style={[styles.segmentText, timeMode === mode && styles.segmentTextActive]}>
                {mode === 'week' ? '周' : mode === 'month' ? '月' : '年'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'expense' && styles.toggleActive]} onPress={() => setViewMode('expense')}>
            <Text style={[styles.toggleText, viewMode === 'expense' && styles.toggleTextActive]}>支出</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'income' && styles.toggleActive]} onPress={() => setViewMode('income')}>
            <Text style={[styles.toggleText, viewMode === 'income' && styles.toggleTextActive]}>收入</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{viewMode === 'expense' ? '支出分类占比' : '收入分类占比'}</Text>
          <View style={styles.donutSection}>
            <MiniDonut data={filteredCategories} total={total} />
            <View style={styles.legendList}>
              {filteredCategories.slice(0, 5).map((cat, index) => (
                <View key={`${cat.category_name}-${index}`} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                  <Text style={styles.legendName} numberOfLines={1}>{cat.category_name}</Text>
                  <Text style={styles.legendPercent}>{cat.percentage.toFixed(1)}%</Text>
                </View>
              ))}
              {filteredCategories.length === 0 ? <Text style={styles.noDataText}>暂无数据</Text> : null}
            </View>
          </View>
        </View>

        <View style={styles.card} onLayout={onChartLayout}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{viewMode === 'expense' ? '支出趋势' : '收入趋势'}</Text>
            <View style={styles.navGroup}>
              <TouchableOpacity onPress={goPrev} style={styles.navBtn}><Ionicons name="chevron-back" size={16} color={COLORS.text} /></TouchableOpacity>
              <TouchableOpacity onPress={goNext} style={styles.navBtn}><Ionicons name="chevron-forward" size={16} color={COLORS.text} /></TouchableOpacity>
            </View>
          </View>
          {chart ? (
            <LineChart
              data={chart}
              width={Math.max(260, chartWidth - 28)}
              height={190}
              yAxisLabel="¥"
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: () => COLORS.textLight,
                propsForDots: {
                  r: '3',
                  strokeWidth: '0',
                  fill: '#FFB52E',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '4',
                  stroke: COLORS.divider,
                },
              }}
              bezier
              style={styles.chart}
              fromZero
            />
          ) : (
            <View style={styles.noDataChart}>
              <Ionicons name="analytics-outline" size={44} color={COLORS.textLight} />
              <Text style={styles.noDataText}>暂无趋势数据</Text>
            </View>
          )}
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={closePicker}>
        <TouchableOpacity style={styles.yearOverlay} activeOpacity={1} onPress={closePicker}>
          <View style={styles.yearDropdown} onStartShouldSetResponder={() => true}>
            <Text style={styles.yearDropdownTitle}>
              {timeMode === 'week' ? '选择周' : timeMode === 'month' ? '选择月份' : '选择年份'}
            </Text>
            <ScrollView style={styles.yearList} showsVerticalScrollIndicator={false}>
              {timeMode === 'week' ? (
                (() => {
                  const now = new Date();
                  const cw = StatisticsService.dateToWeek(now);
                  const totalWeeks = StatisticsService.getTotalWeeks(year);
                  const maxWeek = year === cw.year ? cw.weekNum : totalWeeks;
                  return (
                    <>
                      {/* 年份滚轮选择器 */}
                      <YearWheelPicker selectedYear={year} onSelect={(y) => setYear(y)} />
                      {/* 周列表（自动滚动到选中周） */}
                      <WeekScrollView
                        maxWeek={maxWeek}
                        selectedWeek={weekNum}
                        currentWeek={year === cw.year ? cw.weekNum : -1}
                        onSelect={(w) => { setWeekNum(w); closePicker(); }}
                      />
                    </>
                  );
                })()
              ) : timeMode === 'month' ? (
                (() => {
                  const now = new Date();
                  const cy = now.getFullYear();
                  const cm = now.getMonth() + 1;
                  const maxMonth = year === cy ? cm : 12;
                  return (
                    <>
                      {/* 年份滚轮选择器 */}
                      <YearWheelPicker selectedYear={year} onSelect={(y) => setYear(y)} />
                      {/* 月份列表（自动滚动到选中月） */}
                      <MonthScrollView
                        maxMonth={maxMonth}
                        selectedMonth={month}
                        currentMonth={year === cy ? cm : -1}
                        onSelect={(m) => { setMonth(m); closePicker(); }}
                      />
                    </>
                  );
                })()
              ) : (
                <YearScrollView
                  selectedYear={year}
                  onSelect={(y) => { setYear(y); closePicker(); }}
                />
              )}
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  headerSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  monthPillText: { fontSize: 12, fontWeight: '800', color: COLORS.text },
  scrollContent: { padding: 16, paddingBottom: 24 },
  summaryCard: {
    minHeight: 112,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  summaryAmount: { fontSize: 25, color: COLORS.text, fontWeight: '900', marginTop: 8 },
  summaryDaily: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  summaryMascot: { width: 112, height: 104, marginRight: -8 },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 4,
    marginTop: 12,
  },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 14 },
  segmentActive: { backgroundColor: COLORS.primaryLight },
  segmentText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '700' },
  segmentTextActive: { color: COLORS.text, fontWeight: '900' },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.text, fontWeight: '900' },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    ...SHADOWS.card,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '900', color: COLORS.text, marginBottom: 12 },
  donutSection: { flexDirection: 'row', alignItems: 'center' },
  donutWrap: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutLabel: { fontSize: 10, color: COLORS.textLight, fontWeight: '700' },
  donutValue: { fontSize: 13, color: COLORS.text, fontWeight: '900', marginTop: 3 },
  legendList: { flex: 1, paddingLeft: 10, gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendName: { flex: 1, fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  legendPercent: { width: 48, textAlign: 'right', fontSize: 12, color: COLORS.text, fontWeight: '800' },
  navGroup: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  navBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  chart: { borderRadius: 12, marginLeft: -10 },
  noDataChart: { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noDataText: { fontSize: 13, color: COLORS.textLight, fontWeight: '700' },
  yearOverlay: { flex: 1, backgroundColor: 'rgba(58,46,31,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 88, paddingRight: 18 },
  yearDropdown: { backgroundColor: '#fff', borderRadius: 18, width: 300, maxHeight: 420, padding: 16 },
  yearDropdownTitle: { fontSize: 16, fontWeight: '900', color: COLORS.text, textAlign: 'center', marginBottom: 12 },
  yearList: {},
  yearItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10 },
  yearItemActive: { backgroundColor: COLORS.primaryLight },
  yearItemText: { fontSize: 15, color: COLORS.text },
  yearItemTextActive: { color: COLORS.text, fontWeight: '900' },
  yearWheelContainer: {
    height: 132,  // 显示3个年份，每个44px
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  yearWheelScroll: {
    flex: 1,
  },
  yearWheelItem: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  yearWheelItemActive: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  yearWheelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  yearWheelTextActive: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
});
