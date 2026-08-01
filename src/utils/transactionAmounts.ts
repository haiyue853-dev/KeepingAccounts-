import { Transaction } from '../models/Transaction';

const ADJUSTMENT_LABELS = {
  reimbursement: '已报销',
  cashback: '已返现',
  refund: '已退款',
  other: '已抵扣',
} as const;

export function getAdjustmentTotal(transaction: Transaction): number {
  return Number(transaction.adjustment_total ?? 0);
}

export function getTransactionNetAmount(transaction: Transaction): number {
  if (transaction.type !== 'expense') {
    return transaction.amount;
  }
  const netAmount = transaction.net_amount ?? transaction.amount - getAdjustmentTotal(transaction);
  return Math.max(netAmount, 0);
}

export function hasAdjustment(transaction: Transaction): boolean {
  return transaction.type === 'expense' && getAdjustmentTotal(transaction) > 0;
}

export function getAdjustmentLabel(transaction: Transaction): string {
  const type = transaction.adjustment_type;
  return type ? ADJUSTMENT_LABELS[type] : '已返现';
}
