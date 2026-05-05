export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // ISO date string
  amount: number;
  categoryId: string;
  paymentMethod: string;
  note: string;
  linkedIncomeIds: string[];
  linkedExpenseId: string | null;
}

export interface Account {
  id: string;
  type: 'card' | 'bank';
  name: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface MonthStats {
  income: number;
  expense: number;
  net: number;
}
