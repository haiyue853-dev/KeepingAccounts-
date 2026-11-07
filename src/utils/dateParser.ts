const WEEKDAY_MAP: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && toDateString(date) === value;
}

function calendarDate(year: number, month: number, day: number): string | null {
  const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isValidDate(value) ? value : null;
}

function chineseNumber(value: string): number {
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (!/[十百千]/.test(value)) return Number([...value].map(char => digits[char] ?? char).join(''));
  let total = 0;
  let current = 0;
  for (const char of value) {
    const unit = ({ 十: 10, 百: 100, 千: 1000 } as Record<string, number>)[char];
    if (unit) { total += (current || 1) * unit; current = 0; }
    else current = digits[char] ?? Number(char);
  }
  return total + current;
}

function addDays(base: Date, days: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function normalizeBase(baseDate?: Date | string): Date {
  if (!baseDate) return new Date();
  if (baseDate instanceof Date) return new Date(baseDate);
  return new Date(`${baseDate}T12:00:00`);
}

function getPreviousWeekday(base: Date, weekday: number, includeCurrent = false): Date {
  const current = base.getDay();
  let diff = current - weekday;
  if (diff < 0) diff += 7;
  if (diff === 0 && !includeCurrent) diff = 7;
  return addDays(base, -diff);
}

export function parseChineseDate(input: string, baseDate?: Date | string): string | null {
  const text = input.replace(/\s+/g, '').replace(/[零〇一二两三四五六七八九十百千]+(?=年|月|日|号|天)/g, value => String(chineseNumber(value)));
  const base = normalizeBase(baseDate);
  const currentYear = base.getFullYear();

  if (/今天|今日/.test(text)) return toDateString(base);
  if (/昨天|昨日/.test(text)) return toDateString(addDays(base, -1));
  if (/大前天/.test(text)) return toDateString(addDays(base, -3));
  if (/前天/.test(text)) return toDateString(addDays(base, -2));
  if (/明天|明日/.test(text)) return toDateString(addDays(base, 1));
  if (/后天/.test(text)) return toDateString(addDays(base, 2));

  const relativeDayMatch = text.match(/(\d+)(天|日)前/);
  if (relativeDayMatch) {
    return toDateString(addDays(base, -Number(relativeDayMatch[1])));
  }

  const weekMatch = text.match(/(上周|上星期|上礼拜|这周|本周|这个星期|这星期|本星期|这个礼拜|这礼拜|本礼拜|周|星期|礼拜)([日天一二三四五六])/);
  if (weekMatch) {
    const weekday = WEEKDAY_MAP[weekMatch[2]];
    const prefix = weekMatch[1];
    if (prefix === '上周' || prefix === '上星期' || prefix === '上礼拜') {
      const startOfThisWeek = addDays(base, -(base.getDay() || 7) + 1);
      return toDateString(addDays(startOfThisWeek, -7 + (weekday === 0 ? 6 : weekday - 1)));
    }
    if (prefix === '这周' || prefix === '本周' || prefix.includes('这个') || prefix.includes('这') || prefix.includes('本')) {
      const startOfThisWeek = addDays(base, -(base.getDay() || 7) + 1);
      return toDateString(addDays(startOfThisWeek, weekday === 0 ? 6 : weekday - 1));
    }
    return toDateString(getPreviousWeekday(base, weekday, true));
  }

  const isoDateMatch = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoDateMatch) return calendarDate(Number(isoDateMatch[1]), Number(isoDateMatch[2]), Number(isoDateMatch[3]));

  const fullDateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})(日|号)?/);
  if (fullDateMatch) {
    return calendarDate(Number(fullDateMatch[1]), Number(fullDateMatch[2]), Number(fullDateMatch[3]));
  }

  const relativeMonthMatch = text.match(/(上上个?月|上个?月|下个?月)(\d{1,2})(日|号)?/);
  if (relativeMonthMatch) {
    const offset = relativeMonthMatch[1].startsWith('上上') ? -2 : relativeMonthMatch[1].startsWith('上') ? -1 : 1;
    const month = new Date(currentYear, base.getMonth() + offset, 1, 12);
    return calendarDate(month.getFullYear(), month.getMonth() + 1, Number(relativeMonthMatch[2]));
  }

  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})(日|号)?/);
  if (monthDayMatch) {
    const year = text.includes('去年') ? currentYear - 1 : text.includes('前年') ? currentYear - 2 : currentYear;
    return calendarDate(year, Number(monthDayMatch[1]), Number(monthDayMatch[2]));
  }

  const thisMonthMatch = text.match(/(这个月|本月|这月)(\d{1,2})(日|号)?/);
  if (thisMonthMatch) {
    return calendarDate(currentYear, base.getMonth() + 1, Number(thisMonthMatch[2]));
  }

  return null;
}

export function resolveTransactionDate(input: string, explicitDate?: string, baseDate?: Date | string): string {
  if (explicitDate && !isValidDate(explicitDate)) throw new Error('请输入有效日期（YYYY-MM-DD）');
  return explicitDate || parseChineseDate(input, baseDate) || toDateString(normalizeBase(baseDate));
}
