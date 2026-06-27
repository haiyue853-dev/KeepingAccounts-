import { getDatabase } from '../db/database';
import { Transaction, TransactionCreate, TransactionFilter } from '../models/Transaction';

export class TransactionRepo {
  static async getAll(filter: TransactionFilter = {}): Promise<Transaction[]> {
    const db = await getDatabase();
    let sql = `
      SELECT t.*, c.name as category_name, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter.book_id) {
      sql += ' AND t.book_id = ?';
      params.push(filter.book_id);
    }
    if (filter.type) {
      sql += ' AND t.type = ?';
      params.push(filter.type);
    }
    if (filter.start_date) {
      sql += ' AND t.date >= ?';
      params.push(filter.start_date);
    }
    if (filter.end_date) {
      sql += ' AND t.date <= ?';
      params.push(filter.end_date);
    }
    if (filter.category_id) {
      sql += ' AND t.category_id = ?';
      params.push(filter.category_id);
    }

    sql += ' ORDER BY t.date DESC, t.created_at DESC';
    return db.getAllAsync<Transaction>(sql, params);
  }

  static async getById(id: number): Promise<Transaction | null> {
    const db = await getDatabase();
    return db.getFirstAsync<Transaction>(
      `SELECT t.*, c.name as category_name, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = ?`,
      [id]
    );
  }

  static async create(data: TransactionCreate): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
      'INSERT INTO transactions (book_id, category_id, amount, type, note, date) VALUES (?, ?, ?, ?, ?, ?)',
      [data.book_id, data.category_id, data.amount, data.type, data.note ?? '', data.date]
    );
    return result.lastInsertRowId;
  }

  static async update(id: number, data: Partial<TransactionCreate>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ["updated_at = datetime('now','localtime')"];
    const values: any[] = [];
    if (data.book_id !== undefined) { fields.push('book_id = ?'); values.push(data.book_id); }
    if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
    if (data.amount !== undefined) { fields.push('amount = ?'); values.push(data.amount); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.note !== undefined) { fields.push('note = ?'); values.push(data.note); }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
    values.push(id);
    await db.runAsync(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }

  static async getMonthlySummary(bookId: number, year: number, month: number): Promise<{ income: number; expense: number }> {
    const db = await getDatabase();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const result = await db.getFirstAsync<{ income: number; expense: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE book_id = ? AND date >= ? AND date <= ?`,
      [bookId, startDate, endDate]
    );
    return result ?? { income: 0, expense: 0 };
  }

  static async getCategorySummary(bookId: number, year: number, month: number): Promise<{ category_id: number; category_name: string; category_icon: string; type: string; total: number }[]> {
    const db = await getDatabase();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return db.getAllAsync(
      `SELECT t.category_id as category_id, c.name as category_name, c.icon as category_icon, t.type, SUM(t.amount) as total,
              COUNT(*) as count, MIN(t.date) as first_date, MAX(t.date) as last_date
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.book_id = ? AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id, t.type
       ORDER BY total DESC`,
      [bookId, startDate, endDate]
    );
  }

  /**
   * 获取指定日期范围内每天的收支汇总（用于周视图折线图）
   */
  static async getDailySummary(bookId: number, startDate: string, endDate: string): Promise<{ date: string; income: number; expense: number }[]> {
    const db = await getDatabase();
    return db.getAllAsync(
      `SELECT date,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE book_id = ? AND date >= ? AND date <= ?
       GROUP BY date
       ORDER BY date`,
      [bookId, startDate, endDate]
    );
  }

  /**
   * 获取指定日期范围内的收支总额
   */
  static async getRangeSummary(bookId: number, startDate: string, endDate: string): Promise<{ income: number; expense: number }> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ income: number; expense: number }>(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE book_id = ? AND date >= ? AND date <= ?`,
      [bookId, startDate, endDate]
    );
    return result ?? { income: 0, expense: 0 };
  }

  /**
   * 获取指定日期范围内的分类统计
   */
  static async getCategorySummaryByRange(bookId: number, startDate: string, endDate: string): Promise<{ category_id: number; category_name: string; category_icon: string; type: string; total: number }[]> {
    const db = await getDatabase();
    return db.getAllAsync(
      `SELECT t.category_id as category_id, c.name as category_name, c.icon as category_icon, t.type, SUM(t.amount) as total,
              COUNT(*) as count, MIN(t.date) as first_date, MAX(t.date) as last_date
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.book_id = ? AND t.date >= ? AND t.date <= ?
       GROUP BY t.category_id, t.type
       ORDER BY total DESC`,
      [bookId, startDate, endDate]
    );
  }

  /**
   * 获取最常用的备注（去重，按使用次数降序）
   * @param categoryId 分类ID，如果传入则只获取该分类下的备注
   * @param limit 返回数量限制
   */
  static async getFrequentNotes(limit: number = 8, categoryId?: number): Promise<string[]> {
    const db = await getDatabase();
    let sql = `
      SELECT note, COUNT(*) as cnt
      FROM transactions
      WHERE note IS NOT NULL AND note != ''
    `;
    const params: any[] = [];

    if (categoryId) {
      sql += ' AND category_id = ?';
      params.push(categoryId);
    }

    sql += `
      GROUP BY note
      ORDER BY cnt DESC
      LIMIT ?
    `;
    params.push(limit);

    const rows = await db.getAllAsync<{ note: string; cnt: number }>(sql, params);
    return rows.map((r) => r.note);
  }
}
