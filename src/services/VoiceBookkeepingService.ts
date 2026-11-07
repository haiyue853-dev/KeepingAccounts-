import type { AssetAccount } from '../models/AssetAccount';
import type { Category } from '../models/Category';
import type { Transaction } from '../models/Transaction';
import type { ParsedTransaction, VoiceEntryType } from './deepseek/DeepSeekTransactionParser';
import { parseVoiceAmount } from './deepseek/DeepSeekTransactionParser';
import { getDatabase } from '../db/database';
import { AssetAccountRepo } from '../repositories/AssetAccountRepo';
import { CategoryRepo } from '../repositories/CategoryRepo';
import { TransactionRepo } from '../repositories/TransactionRepo';
import { TransactionAdjustmentRepo } from '../repositories/TransactionAdjustmentRepo';
import { getAssetProvider } from '../utils/assetProviders';
import { isValidDate } from '../utils/dateParser';

export interface VoiceDraft extends ParsedTransaction {
  amountText: string;
  categoryId: number | null;
  assetAccountId: number | null;
  originalTransactionId: number | null;
}

export const VOICE_TYPE_LABELS: Record<VoiceEntryType, string> = {
  expense: '支出', income: '收入', refund: '退款', cashback: '返现', reimbursement: '报销', unsupported: '需单独处理',
};

export function isAdjustment(type: VoiceEntryType): type is 'refund' | 'cashback' | 'reimbursement' {
  return type === 'refund' || type === 'cashback' || type === 'reimbursement';
}

export function makeVoiceDraft(item: ParsedTransaction, categories: Category[], accounts: AssetAccount[]): VoiceDraft {
  const matchingCategories = categories.filter(category => category.type === item.type);
  const category = matchingCategories.find(category => category.name === item.categoryName)
    ?? matchingCategories.find(category => category.name === '其他');
  const name = item.accountName?.trim();
  const exact = name ? accounts.filter(account => account.name === name) : [];
  const providerName = name === '微信零钱' ? '微信' : name === '支付宝余额' ? '支付宝' : name;
  const matches = exact.length ? exact : name ? accounts.filter(account => getAssetProvider(account.provider).name === providerName) : [];
  return {
    ...item, categoryId: category?.id ?? null, categoryName: category?.name ?? item.categoryName,
    amountText: item.amount === null ? '' : String(item.amount),
    assetAccountId: matches.length === 1 ? matches[0].id : null,
    originalTransactionId: null,
  };
}

export function getOriginalCandidates(item: ParsedTransaction, transactions: Transaction[], search?: string): Transaction[] {
  return transactions.filter(tx => {
    if (tx.type !== 'expense' || tx.date > item.date) return false;
    if (search !== undefined) {
      const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = `${tx.date} ${tx.note ?? ''} ${tx.category_name ?? ''} ${tx.amount}`.toLowerCase();
      return terms.every(term => haystack.includes(term));
    }
    if (item.originalDate && tx.date !== item.originalDate) return false;
    if (item.originalAmount && Math.round(tx.amount * 100) !== Math.round(item.originalAmount * 100)) return false;
    if (item.originalNote && !`${tx.note ?? ''} ${tx.category_name ?? ''}`.includes(item.originalNote)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export class VoiceBookkeepingService {
  static async save(entries: VoiceDraft[], bookId: number): Promise<void> {
    if (!entries.length) throw new Error('没有可保存的记录');
    // Initialize assets outside the batch transaction to avoid nested transactions.
    const tracking = await AssetAccountRepo.getTrackingStatus();
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      if (!await db.getFirstAsync('SELECT id FROM account_books WHERE id = ?', [bookId])) throw new Error('账本已不存在，请重新解析');
      for (let index = 0; index < entries.length; index++) {
        const item = entries[index];
        try {
          if (item.status !== 'completed' || item.type === 'unsupported') throw new Error(item.issue || '款项未到账或信息不明确，请修改描述后重新解析');
          if (!isValidDate(item.date)) throw new Error('请输入有效日期（YYYY-MM-DD）');
          const tracked = !!tracking && item.date >= tracking.startDate;
          if (tracked && !item.assetAccountId) throw new Error('请选择付款或到账账户');
          if (item.assetAccountId && !await db.getFirstAsync('SELECT id FROM asset_accounts WHERE id = ?', [item.assetAccountId])) throw new Error('所选账户已删除，请重新选择');
          const assetAccountId = item.assetAccountId;
          if (isAdjustment(item.type)) {
            if (!item.originalTransactionId) throw new Error('请选择要关联的原消费');
            const original = await TransactionRepo.getById(item.originalTransactionId);
            if (!original || original.type !== 'expense' || original.book_id !== bookId) throw new Error('原消费不存在或不属于当前账本');
            if (item.date < original.date) throw new Error('到账日期不能早于原消费日期');
            const amount = item.fullRefund
              ? parseVoiceAmount(Math.max(0, Math.round((original.amount - (original.adjustment_total ?? 0)) * 100)) / 100)
              : parseVoiceAmount(item.amountText);
            await TransactionAdjustmentRepo.create({ transaction_id: original.id, type: item.type, amount, date: item.date, note: item.note, asset_account_id: assetAccountId });
          } else {
            if (item.type !== 'expense' && item.type !== 'income') throw new Error('请选择有效收支类型');
            const category = item.categoryId ? await CategoryRepo.getById(item.categoryId) : null;
            if (!category || category.type !== item.type) throw new Error('请选择与收支类型匹配的分类');
            await TransactionRepo.create({ book_id: bookId, category_id: category.id, type: item.type, amount: parseVoiceAmount(item.amountText), date: item.date, note: item.note, asset_account_id: assetAccountId });
          }
        } catch (error) {
          throw new Error(`第 ${index + 1} 笔：${error instanceof Error ? error.message : '保存失败'}`);
        }
      }
    });
  }
}
