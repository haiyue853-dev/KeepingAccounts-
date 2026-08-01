import { TransactionType } from './Category';

export interface Transaction {
  id: number;
  book_id: number;
  category_id: number;
  amount: number;
  type: TransactionType;
  note: string;
  date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
  adjustment_total?: number;
  adjustment_type?: TransactionAdjustmentType;
  adjustment_note?: string;
  net_amount?: number;
  // joined fields
  category_name?: string;
  category_icon?: string;
}

export interface TransactionCreate {
  book_id: number;
  category_id: number;
  amount: number;
  type: TransactionType;
  note?: string;
  date: string;
}

export interface TransactionFilter {
  book_id?: number;
  type?: TransactionType;
  start_date?: string;
  end_date?: string;
  category_id?: number;
}

export type TransactionAdjustmentType = 'reimbursement' | 'cashback' | 'refund' | 'other';

export interface TransactionAdjustment {
  id: number;
  transaction_id: number;
  type: TransactionAdjustmentType;
  amount: number;
  date: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionAdjustmentCreate {
  transaction_id: number;
  type: TransactionAdjustmentType;
  amount: number;
  date: string;
  note?: string;
}
