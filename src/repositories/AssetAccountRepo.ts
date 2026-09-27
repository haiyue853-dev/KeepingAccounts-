import { getDatabase } from '../db/database';
import type { AssetAccount, AssetAccountInput } from '../models/AssetAccount';
import { MAX_ASSET_CENTS, toAssetCents } from '../utils/assetAmount';
import { ASSET_PROVIDERS } from '../utils/assetProviders';
import { SettingsRepo } from './SettingsRepo';
import { TransactionRepo } from './TransactionRepo';
import { getToday } from '../utils/formatters';

const MIGRATION_KEY = 'asset_accounts_migrated_v1';
const START_KEY = 'asset_tracking_start_date';
const BASELINE_TX_KEY = 'asset_tracking_baseline_tx_id';
const BASELINE_ADJUSTMENT_KEY = 'asset_tracking_baseline_adjustment_id';

export interface AssetTrackingStatus {
  startDate: string;
  baselineTransactionId: number;
  baselineAdjustmentId: number;
}

export class AssetAccountRepo {
  private static migration: Promise<void> | null = null;

  private static async ready() {
    const db = await getDatabase();
    if (!this.migration) {
      this.migration = db.withTransactionAsync(async () => {
        const marker = await db.getFirstAsync('SELECT value FROM app_settings WHERE key = ?', [MIGRATION_KEY]);
        if (marker) return;
        const initial = await SettingsRepo.getInitialBalance();
        if (initial !== null) {
          const totals = await TransactionRepo.getGlobalTotals();
          const cents = toAssetCents(initial + totals.income - totals.expense);
          await db.runAsync(
            'INSERT INTO asset_accounts (name, provider, balance_cents) VALUES (?, ?, ?)',
            ['原有资产', 'other', cents]
          );
        }
        await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [MIGRATION_KEY, '1']);
      }).finally(() => { this.migration = null; });
    }
    await this.migration;
    return db;
  }

  private static validate(input: AssetAccountInput): AssetAccountInput {
    const name = input.name.trim();
    if (!name || name.length > 30) throw new Error('账户名称需要 1～30 个字符');
    if (!ASSET_PROVIDERS.some((provider) => provider.id === input.provider)) throw new Error('请选择账户类型');
    if (!Number.isSafeInteger(input.balance_cents) || Math.abs(input.balance_cents) > MAX_ASSET_CENTS) {
      throw new Error('请输入有效的账户余额');
    }
    return { ...input, name };
  }

  static async getAll(): Promise<AssetAccount[]> {
    const db = await this.ready();
    const status = await this.getTrackingStatus();
    if (!status) {
      return db.getAllAsync<AssetAccount>('SELECT id, name, provider, balance_cents FROM asset_accounts ORDER BY id');
    }
    return db.getAllAsync<AssetAccount>(
      `SELECT a.id, a.name, a.provider,
        a.opening_balance_cents + a.adjustment_cents
        + COALESCE((SELECT SUM(CASE WHEN t.type = 'income' THEN ROUND(t.amount * 100) ELSE -ROUND(t.amount * 100) END)
            FROM transactions t WHERE t.asset_account_id = a.id AND t.id > ? AND t.date >= ?), 0)
        + COALESCE((SELECT SUM(ROUND(cr.amount * 100)) FROM cashback_records cr
            JOIN transactions t ON t.id = cr.transaction_id
            WHERE COALESCE(cr.asset_account_id, t.asset_account_id) = a.id AND t.id > ? AND t.date >= ?
              AND cr.id > ? AND cr.date >= ?), 0) AS balance_cents
       FROM asset_accounts a ORDER BY a.id`,
      [status.baselineTransactionId, status.startDate, status.baselineTransactionId,
        status.startDate, status.baselineAdjustmentId, status.startDate]
    );
  }

  static async getTrackingStatus(): Promise<AssetTrackingStatus | null> {
    const db = await this.ready();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings WHERE key IN (?, ?, ?)',
      [START_KEY, BASELINE_TX_KEY, BASELINE_ADJUSTMENT_KEY]
    );
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    if (!values[START_KEY]) return null;
    return {
      startDate: values[START_KEY],
      baselineTransactionId: Number(values[BASELINE_TX_KEY] ?? 0),
      baselineAdjustmentId: Number(values[BASELINE_ADJUSTMENT_KEY] ?? 0),
    };
  }

  static async enableAutoTracking(): Promise<void> {
    const db = await this.ready();
    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync('SELECT value FROM app_settings WHERE key = ?', [START_KEY]);
      if (existing) return;
      const accounts = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM asset_accounts');
      if (!accounts?.count) throw new Error('请先添加至少一个资产账户');
      const tx = await db.getFirstAsync<{ id: number }>('SELECT COALESCE(MAX(id), 0) AS id FROM transactions');
      const adjustment = await db.getFirstAsync<{ id: number }>('SELECT COALESCE(MAX(id), 0) AS id FROM cashback_records');
      await db.runAsync('UPDATE asset_accounts SET opening_balance_cents = balance_cents, adjustment_cents = 0');
      for (const [key, value] of [
        [START_KEY, getToday()], [BASELINE_TX_KEY, String(tx?.id ?? 0)],
        [BASELINE_ADJUSTMENT_KEY, String(adjustment?.id ?? 0)],
      ]) {
        await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
      }
    });
  }

  static async getPeriodTotals(): Promise<{ income_cents: number; expense_cents: number }> {
    const status = await this.getTrackingStatus();
    if (!status) return { income_cents: 0, expense_cents: 0 };
    const db = await this.ready();
    const totals = await db.getFirstAsync<{ income_cents: number; expense_cents: number }>(
      `SELECT COALESCE(SUM(CASE WHEN t.type = 'income' THEN ROUND(t.amount * 100) ELSE 0 END), 0) AS income_cents,
              COALESCE(SUM(CASE WHEN t.type = 'expense' THEN ROUND(t.amount * 100) ELSE 0 END), 0) AS expense_cents
       FROM transactions t JOIN asset_accounts a ON a.id = t.asset_account_id
       WHERE t.id > ? AND t.date >= ?`,
      [status.baselineTransactionId, status.startDate]
    );
    const returned = await db.getFirstAsync<{ cents: number }>(
      `SELECT COALESCE(SUM(ROUND(cr.amount * 100)), 0) AS cents
       FROM cashback_records cr JOIN transactions t ON t.id = cr.transaction_id
       JOIN asset_accounts a ON a.id = COALESCE(cr.asset_account_id, t.asset_account_id)
       WHERE t.id > ? AND t.date >= ? AND cr.id > ? AND cr.date >= ?`,
      [status.baselineTransactionId, status.startDate, status.baselineAdjustmentId, status.startDate]
    );
    return { income_cents: (totals?.income_cents ?? 0) + (returned?.cents ?? 0), expense_cents: totals?.expense_cents ?? 0 };
  }

  static async create(input: AssetAccountInput): Promise<void> {
    const valid = this.validate(input);
    const db = await this.ready();
    await db.runAsync('INSERT INTO asset_accounts (name, provider, balance_cents, opening_balance_cents) VALUES (?, ?, ?, ?)',
      [valid.name, valid.provider, valid.balance_cents, valid.balance_cents]);
  }

  static async update(id: number, input: AssetAccountInput): Promise<void> {
    const valid = this.validate(input);
    const db = await this.ready();
    const status = await this.getTrackingStatus();
    const current = status ? (await this.getAll()).find((account) => account.id === id) : null;
    if (status && !current) throw new Error('账户不存在');
    const adjustment = current ? valid.balance_cents - current.balance_cents : 0;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE asset_accounts SET name = ?, provider = ?, balance_cents = ?, adjustment_cents = adjustment_cents + ?, updated_at = datetime('now','localtime') WHERE id = ?",
        [valid.name, valid.provider, valid.balance_cents, adjustment, id]
      );
      if (status && adjustment !== 0) {
        await db.runAsync(
          'INSERT INTO asset_balance_adjustments (account_id, delta_cents, balance_cents) VALUES (?, ?, ?)',
          [id, adjustment, valid.balance_cents]
        );
      }
    });
  }

  static async remove(id: number): Promise<void> {
    const db = await this.ready();
    await db.runAsync('DELETE FROM asset_accounts WHERE id = ?', [id]);
  }
}
