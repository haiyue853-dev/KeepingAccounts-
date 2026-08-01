import { getDatabase } from '../db/database';
import {
  TransactionAdjustment,
  TransactionAdjustmentCreate,
} from '../models/Transaction';

export class TransactionAdjustmentRepo {
  static async create(data: TransactionAdjustmentCreate): Promise<number> {
    const db = await getDatabase();
    const result = await db.runAsync(
      `INSERT INTO cashback_records (transaction_id, type, amount, date, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
      [data.transaction_id, data.type, data.amount, data.date, data.note ?? '']
    );
    return result.lastInsertRowId;
  }

  static async getByTransactionId(transactionId: number): Promise<TransactionAdjustment[]> {
    const db = await getDatabase();
    return db.getAllAsync<TransactionAdjustment>(
      `SELECT *
       FROM cashback_records
       WHERE transaction_id = ?
       ORDER BY date DESC, created_at DESC, id DESC`,
      [transactionId]
    );
  }

  static async upsertForTransaction(data: TransactionAdjustmentCreate): Promise<number> {
    const existing = await this.getByTransactionId(data.transaction_id);
    const current = existing[0];

    if (!current) {
      return this.create(data);
    }

    const db = await getDatabase();
    await db.runAsync(
      `UPDATE cashback_records
       SET type = ?, amount = ?, date = ?, note = ?, updated_at = datetime('now','localtime')
       WHERE id = ?`,
      [data.type, data.amount, data.date, data.note ?? '', current.id]
    );
    await db.runAsync(
      'DELETE FROM cashback_records WHERE transaction_id = ? AND id <> ?',
      [data.transaction_id, current.id]
    );
    return current.id;
  }

  static async getTotalByTransactionId(transactionId: number): Promise<number> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM cashback_records
       WHERE transaction_id = ?`,
      [transactionId]
    );
    return result?.total ?? 0;
  }

  static async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM cashback_records WHERE id = ?', [id]);
  }
}
