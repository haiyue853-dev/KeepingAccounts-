import { getDatabase } from '../db/database';

const KEY_INITIAL_BALANCE = 'initial_balance';

export class SettingsRepo {
  /**
   * 读取全局起始余额
   * @returns 起始余额数值；如未设置则返回 null
   */
  static async getInitialBalance(): Promise<number | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      [KEY_INITIAL_BALANCE]
    );
    if (!row) return null;
    const n = parseFloat(row.value);
    return Number.isFinite(n) ? n : null;
  }

  /**
   * 设置全局起始余额（UPSERT）
   */
  static async setInitialBalance(amount: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now','localtime'))`,
      [KEY_INITIAL_BALANCE, amount.toFixed(2)]
    );
  }

  /**
   * 清除起始余额（恢复"未设置"状态）
   */
  static async clearInitialBalance(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM app_settings WHERE key = ?', [KEY_INITIAL_BALANCE]);
  }
}
