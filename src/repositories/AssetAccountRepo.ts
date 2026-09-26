import { getDatabase } from '../db/database';
import type { AssetAccount, AssetAccountInput } from '../models/AssetAccount';
import { MAX_ASSET_CENTS, toAssetCents } from '../utils/assetAmount';
import { ASSET_PROVIDERS } from '../utils/assetProviders';
import { SettingsRepo } from './SettingsRepo';
import { TransactionRepo } from './TransactionRepo';

const MIGRATION_KEY = 'asset_accounts_migrated_v1';

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
    return db.getAllAsync<AssetAccount>('SELECT id, name, provider, balance_cents FROM asset_accounts ORDER BY id');
  }

  static async create(input: AssetAccountInput): Promise<void> {
    const valid = this.validate(input);
    const db = await this.ready();
    await db.runAsync('INSERT INTO asset_accounts (name, provider, balance_cents) VALUES (?, ?, ?)',
      [valid.name, valid.provider, valid.balance_cents]);
  }

  static async update(id: number, input: AssetAccountInput): Promise<void> {
    const valid = this.validate(input);
    const db = await this.ready();
    await db.runAsync(
      "UPDATE asset_accounts SET name = ?, provider = ?, balance_cents = ?, updated_at = datetime('now','localtime') WHERE id = ?",
      [valid.name, valid.provider, valid.balance_cents, id]
    );
  }

  static async remove(id: number): Promise<void> {
    const db = await this.ready();
    await db.runAsync('DELETE FROM asset_accounts WHERE id = ?', [id]);
  }
}
