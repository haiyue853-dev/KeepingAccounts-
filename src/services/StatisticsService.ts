import { TransactionRepo } from '../repositories/TransactionRepo';

export interface MonthlySummary {
  year: number;
  month: number;
  income: number;
  expense: number;
  balance: number;
}

export interface CategorySummary {
  category_id: number;
  category_name: string;
  category_icon: string;
  type: string;
  total: number;
  percentage: number;
  count: number;
  firstDate: string;
  lastDate: string;
}

export interface DailySummary {
  date: string;
  income: number;
  expense: number;
}

interface WeekRange { startDate: string; endDate: string; weekNum: number; year: number }

export interface RangeSummary {
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  days: number;
  dailyAvg: number;
}

export class StatisticsService {
  /**
   * 获取月度收支汇总
   */
  static async getMonthlySummary(bookId: number, year: number, month: number): Promise<MonthlySummary> {
    const result = await TransactionRepo.getMonthlySummary(bookId, year, month);
    return {
      year,
      month,
      income: result.income,
      expense: result.expense,
      balance: result.income - result.expense,
    };
  }

  /**
   * 获取分类统计
   */
  static async getCategorySummary(bookId: number, year: number, month: number): Promise<CategorySummary[]> {
    const raw = await TransactionRepo.getCategorySummary(bookId, year, month);
    const totalByType: Record<string, number> = {};

    for (const item of raw) {
      totalByType[item.type] = (totalByType[item.type] || 0) + item.total;
    }

    return raw.map((item: any) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      category_icon: item.category_icon,
      type: item.type,
      total: item.total,
      percentage: totalByType[item.type] > 0 ? (item.total / totalByType[item.type]) * 100 : 0,
      count: item.count || 0,
      firstDate: item.first_date || '',
      lastDate: item.last_date || '',
    }));
  }

  /**
   * 获取最近 N 个月的趋势数据
   */
  static async getMonthlyTrend(
    bookId: number,
    year: number,
    month: number,
    count: number = 6
  ): Promise<MonthlySummary[]> {
    const results: MonthlySummary[] = [];
    let y = year;
    let m = month;

    for (let i = 0; i < count; i++) {
      const summary = await this.getMonthlySummary(bookId, y, m);
      results.unshift(summary);
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
    }

    return results;
  }

  // ========== 周维度 ==========

  /**
   * 获取某一年某一周的日期范围（ISO 周，周一开始）
   */
  static getWeekRange(year: number, weekNum: number): WeekRange {
    // ISO 周计算：第1周包含该年的第一个星期四
    const jan4 = new Date(year, 0, 4);
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));

    const monday = new Date(firstMonday);
    monday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startDate: fmt(monday), endDate: fmt(sunday), weekNum, year: monday.getFullYear() };
  }

  /**
   * 获取今天所在的 ISO 周
   */
  static getCurrentWeek(): { year: number; weekNum: number } {
    return StatisticsService.dateToWeek(new Date());
  }

  /**
   * 将日期转换为 ISO 周编号
   */
  static dateToWeek(d: Date): { year: number; weekNum: number } {
    const target = new Date(d.getTime());
    const dayNum = (target.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNum + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const firstThursdayDayNum = (firstThursday.getDay() + 6) % 7;
    firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNum + 3);

    const weekNum = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
    return { year: target.getFullYear(), weekNum };
  }

  /**
   * 获取一年中的总周数
   */
  static getTotalWeeks(year: number): number {
    const dec31 = new Date(year, 11, 31);
    const w = StatisticsService.dateToWeek(dec31);
    return w.year > year ? StatisticsService.dateToWeek(new Date(year, 11, 24)).weekNum : w.weekNum;
  }

  /**
   * 获取某一周每天的收支数据
   */
  static async getWeekDailyData(bookId: number, startDate: string, endDate: string): Promise<DailySummary[]> {
    const raw = await TransactionRepo.getDailySummary(bookId, startDate, endDate);

    // 填充没有数据的日期
    const result: DailySummary[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
      const found = raw.find((r) => r.date === dateStr);
      result.push({
        date: dateStr,
        income: found?.income ?? 0,
        expense: found?.expense ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  /**
   * 获取某一周的收支汇总
   */
  static async getWeekSummary(bookId: number, startDate: string, endDate: string): Promise<RangeSummary> {
    const result = await TransactionRepo.getRangeSummary(bookId, startDate, endDate);
    const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    return {
      startDate,
      endDate,
      income: result.income,
      expense: result.expense,
      days,
      dailyAvg: result.expense / days,
    };
  }

  /**
   * 获取某一周的分类统计
   */
  static async getWeekCategorySummary(bookId: number, startDate: string, endDate: string): Promise<CategorySummary[]> {
    const raw = await TransactionRepo.getCategorySummaryByRange(bookId, startDate, endDate);
    const totalByType: Record<string, number> = {};

    for (const item of raw) {
      totalByType[item.type] = (totalByType[item.type] || 0) + item.total;
    }

    return raw.map((item: any) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      category_icon: item.category_icon,
      type: item.type,
      total: item.total,
      percentage: totalByType[item.type] > 0 ? (item.total / totalByType[item.type]) * 100 : 0,
      count: item.count || 0,
      firstDate: item.first_date || '',
      lastDate: item.last_date || '',
    }));
  }

  // ========== 月维度（复用已有方法） ==========

  /**
   * 获取某月每天的收支数据（用于折线图）
   */
  static async getMonthDailyData(bookId: number, year: number, month: number): Promise<DailySummary[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const raw = await TransactionRepo.getDailySummary(bookId, startDate, endDate);

    const result: DailySummary[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const found = raw.find((r) => r.date === dateStr);
      result.push({
        date: dateStr,
        income: found?.income ?? 0,
        expense: found?.expense ?? 0,
      });
    }

    return result;
  }

  /**
   * 获取某月的分类统计（带百分比）
   */
  static async getMonthCategorySummary(bookId: number, year: number, month: number): Promise<CategorySummary[]> {
    return this.getCategorySummary(bookId, year, month);
  }

  // ========== 年维度 ==========

  /**
   * 获取某年每月的收支数据（用于折线图）
   */
  static async getYearMonthlyData(bookId: number, year: number): Promise<{ month: number; income: number; expense: number }[]> {
    const result: { month: number; income: number; expense: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const summary = await TransactionRepo.getMonthlySummary(bookId, year, m);
      result.push({ month: m, income: summary.income, expense: summary.expense });
    }
    return result;
  }

  /**
   * 获取某年的收支汇总
   */
  static async getYearSummary(bookId: number, year: number): Promise<RangeSummary> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const result = await TransactionRepo.getRangeSummary(bookId, startDate, endDate);
    return {
      startDate,
      endDate,
      income: result.income,
      expense: result.expense,
      days: 365,
      dailyAvg: result.expense / 365,
    };
  }

  /**
   * 获取某年的分类统计
   */
  static async getYearCategorySummary(bookId: number, year: number): Promise<CategorySummary[]> {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    const raw = await TransactionRepo.getCategorySummaryByRange(bookId, startDate, endDate);
    const totalByType: Record<string, number> = {};

    for (const item of raw) {
      totalByType[item.type] = (totalByType[item.type] || 0) + item.total;
    }

    return raw.map((item: any) => ({
      category_id: item.category_id,
      category_name: item.category_name,
      category_icon: item.category_icon,
      type: item.type,
      total: item.total,
      percentage: totalByType[item.type] > 0 ? (item.total / totalByType[item.type]) * 100 : 0,
      count: item.count || 0,
      firstDate: item.first_date || '',
      lastDate: item.last_date || '',
    }));
  }
}
