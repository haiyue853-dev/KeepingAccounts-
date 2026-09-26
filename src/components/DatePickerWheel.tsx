import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

interface Props {
  visible: boolean;
  date: string;
  onConfirm: (date: string) => void;
  onCancel: () => void;
  monthOnly?: boolean;
}

function parse(d: string) {
  const p = d.split('-').map(Number);
  return { y: p[0] || new Date().getFullYear(), m: p[1] || new Date().getMonth() + 1, d: p[2] || new Date().getDate() };
}
function fmt(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function todayStr() {
  const d = new Date();
  return fmt(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function dim(y: number, m: number) { return new Date(y, m, 0).getDate(); }

// 实时生成年份列表：当前年 - 10 到当前年（最新在底部）
function getYears() {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);
}

function NumPicker({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  const upDisabled = value <= min;
  const downDisabled = value >= max;
  return (
    <View style={st.npCol}>
      <Text style={st.npLabel}>{label}</Text>
      <TouchableOpacity
        onPress={() => !upDisabled && onChange(value > min ? value - 1 : max)}
        style={[st.arrowBtn, upDisabled && st.arrowBtnDisabled]}
        disabled={upDisabled}
      >
        <Ionicons name="chevron-up" size={24} color={upDisabled ? COLORS.textLight : COLORS.text} />
      </TouchableOpacity>
      <View style={st.npValue}>
        <Text style={st.npValueText}>{value}</Text>
      </View>
      <TouchableOpacity
        onPress={() => !downDisabled && onChange(value < max ? value + 1 : min)}
        style={[st.arrowBtn, downDisabled && st.arrowBtnDisabled]}
        disabled={downDisabled}
      >
        <Ionicons name="chevron-down" size={24} color={downDisabled ? COLORS.textLight : COLORS.text} />
      </TouchableOpacity>
    </View>
  );
}

export default function DatePickerWheel({ visible, date, onConfirm, onCancel, monthOnly }: Props) {
  const p = parse(date);
  const [year, setYear] = useState(p.y);
  const [month, setMonth] = useState(p.m);
  const [day, setDay] = useState(p.d);

  // 每次打开时，基于实时日期重新计算
  useEffect(() => {
    if (visible) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      const np = parse(date);
      let ny = np.y;
      let nm = np.m;
      let nd = np.d;

      // 防止初始 date 是未来日期：如果未来则回退到今天
      if (ny > currentYear || (ny === currentYear && nm > currentMonth) ||
        (ny === currentYear && nm === currentMonth && nd > currentDay)) {
        ny = currentYear;
        nm = currentMonth;
        nd = currentDay;
      }
      setYear(ny);
      setMonth(nm);
      setDay(nd);
    }
  }, [visible, date]);

  // 月份变化时修正日期
  const maxDay = dim(year, month);
  const safeDay = Math.min(day, maxDay);
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [year, month]);

  // 实时计算当前日期，用于范围限制
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  // 年份范围：min=currentYear-10, max=currentYear
  const yearMin = currentYear - 10;
  const yearMax = currentYear;

  // 月份范围：根据年份动态决定
  const monthMin = 1;
  const monthMax = year === currentYear ? currentMonth : 12;

  // 日期范围：根据年月动态决定
  const dayMin = 1;
  const dayMax = (() => {
    const monthLastDay = dim(year, month);
    if (year === currentYear && month === currentMonth) {
      return Math.min(currentDay, monthLastDay);
    }
    return monthLastDay;
  })();

  // 限制 state 不能超过 max
  useEffect(() => {
    if (year > yearMax) setYear(yearMax);
  }, [year, yearMax]);
  useEffect(() => {
    if (month > monthMax) setMonth(monthMax);
  }, [month, monthMax]);
  useEffect(() => {
    if (day > dayMax) setDay(dayMax);
  }, [day, dayMax]);

  const handleConfirm = () => {
    onConfirm(fmt(year, month, monthOnly ? 1 : safeDay));
  };

  const goToday = () => {
    const t = parse(todayStr());
    setYear(t.y);
    setMonth(t.m);
    setDay(t.d);
  };

  const isToday = fmt(year, month, safeDay) === todayStr();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={st.overlay}>
        <TouchableOpacity style={st.bg} activeOpacity={1} onPress={onCancel} />
        <View style={st.sheet}>
          {/* 顶栏 */}
          <View style={st.top}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={st.cancelTxt}>取消</Text>
            </TouchableOpacity>
            <View style={st.titleRow}>
              <Text style={st.title}>选择日期</Text>
              {!isToday && (
                <TouchableOpacity onPress={goToday} style={st.chip}>
                  <Text style={st.chipTxt}>今天</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={st.okTxt}>确定</Text>
            </TouchableOpacity>
          </View>

          {/* 选择器 - 范围都基于实时日期 */}
          <View style={st.pickerRow}>
            <NumPicker label="年" value={year} min={yearMin} max={yearMax} onChange={setYear} />
            <NumPicker label="月" value={month} min={monthMin} max={monthMax} onChange={setMonth} />
            {!monthOnly && <NumPicker label="日" value={safeDay} min={dayMin} max={dayMax} onChange={setDay} />}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 34 },
  top: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider,
  },
  cancelTxt: { fontSize: 15, color: COLORS.textSecondary },
  okTxt: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  chip: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  chipTxt: { fontSize: 12, fontWeight: '600', color: '#fff' },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 20,
  },
  npCol: { alignItems: 'center', width: 80 },
  npLabel: { fontSize: 13, color: COLORS.textLight, marginBottom: 8 },
  arrowBtn: { padding: 8 },
  arrowBtnDisabled: { opacity: 0.3 },
  npValue: {
    width: 64,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginVertical: 4,
  },
  npValueText: { fontSize: 20, fontWeight: '600', color: COLORS.text },
});
