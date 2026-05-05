import type { Transaction, MonthStats, Account } from './types';

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ca-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
}

export function formatMonthName(date: Date): string {
  const formatted = date.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
  return formatted[0].toUpperCase() + formatted.slice(1);
}

export function calculateNetAmount(transaction: Transaction, allTransactions: Transaction[]): number {
  if (transaction.type !== 'expense' || !transaction.linkedIncomeIds?.length) {
    return transaction.amount;
  }
  const linkedOffset = transaction.linkedIncomeIds
    .map(id => allTransactions.find(t => t.id === id))
    .filter(Boolean)
    .reduce((sum, linked) => sum + linked!.amount, 0);
  return Math.max(0, transaction.amount - linkedOffset);
}

export function calculateMonthStats(monthTransactions: Transaction[], allTransactions: Transaction[]): MonthStats {
  const totalIncome = monthTransactions
    .filter(t => t.type === 'income' && !t.linkedExpenseId)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = monthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + calculateNetAmount(t, allTransactions), 0);
  return { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense };
}

export function normalizeTransaction(partial: Partial<Transaction>): Transaction {
  return {
    type: 'expense',
    paymentMethod: 'card',
    linkedIncomeIds: [],
    linkedExpenseId: null,
    id: '',
    date: '',
    amount: 0,
    categoryId: 'other',
    note: '',
    ...partial,
  } as Transaction;
}

export function generateId(): string {
  return 'tx_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getPaymentMethodLabel(methodId: string, accounts: Account[]): string {
  const builtInLabels: Record<string, string> = {
    card: 'Targeta',
    cash: 'Efectiu',
    transfer: 'Transferència',
    bizum: 'Bizum',
    bank: 'Banc',
  };
  return builtInLabels[methodId] ?? accounts.find(account => account.id === methodId)?.name ?? '';
}

export function getMostUsedExpenseMethod(transactions: Transaction[], accounts: Account[]): string {
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  if (!expenseTransactions.length) {
    const defaultCard = accounts.find(account => account.type === 'card');
    return defaultCard ? defaultCard.id : 'cash';
  }
  const usageCounts: Record<string, number> = {};
  expenseTransactions.forEach(t => {
    usageCounts[t.paymentMethod] = (usageCounts[t.paymentMethod] || 0) + 1;
  });
  return Object.entries(usageCounts).sort((a, b) => b[1] - a[1])[0][0];
}

export function todayAsISODate(): string {
  return new Date().toISOString().split('T')[0];
}
