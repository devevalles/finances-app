import type { Transaction, Account } from './types';
import { loadTransactions, saveTransactions, loadAccounts, saveAccounts } from './storage';
import { normalizeTransaction, generateId } from './utils';

// ── Global reactive state ─────────────────────────────────────────
// Components read these via getters; all mutations go through the
// exported functions so storage is always kept in sync.

let allTransactions = $state<Transaction[]>(loadTransactions());
let allAccounts = $state<Account[]>(loadAccounts());

export function getTransactions(): Transaction[] { return allTransactions; }
export function getAccounts(): Account[] { return allAccounts; }

// ── Transaction mutations ─────────────────────────────────────────

export function addTransaction(transaction: Transaction): void {
  allTransactions = [transaction, ...allTransactions];
  saveTransactions(allTransactions);
}

export function updateTransaction(updated: Transaction): void {
  allTransactions = allTransactions.map(t => t.id === updated.id ? updated : t);
  saveTransactions(allTransactions);
}

export function deleteTransaction(id: string): void {
  // Unlink any compensation references before removing
  allTransactions = allTransactions
    .map(t => {
      if (t.type === 'income' && t.linkedExpenseId === id) {
        return { ...t, linkedExpenseId: null };
      }
      if (t.type === 'expense' && t.linkedIncomeIds?.includes(id)) {
        return { ...t, linkedIncomeIds: t.linkedIncomeIds.filter(linkedId => linkedId !== id) };
      }
      return t;
    })
    .filter(t => t.id !== id);
  saveTransactions(allTransactions);
}

export function replaceAllTransactions(transactions: Transaction[]): void {
  allTransactions = transactions.map(normalizeTransaction);
  saveTransactions(allTransactions);
}

export function mergeTransactions(incoming: Transaction[]): number {
  const existingIds = new Set(allTransactions.map(t => t.id));
  const newOnly = incoming.filter(t => !existingIds.has(t.id));
  allTransactions = [...allTransactions, ...newOnly].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  saveTransactions(allTransactions);
  return newOnly.length;
}

// ── Compensation mutations ────────────────────────────────────────

export function linkIncomesToExpense(expenseId: string, incomeIds: string[]): void {
  allTransactions = allTransactions.map(t => {
    if (t.id === expenseId) {
      const existing = t.linkedIncomeIds ?? [];
      const merged = [...new Set([...existing, ...incomeIds])];
      return { ...t, linkedIncomeIds: merged };
    }
    if (incomeIds.includes(t.id) && t.type === 'income') {
      return { ...t, linkedExpenseId: expenseId };
    }
    return t;
  });
  saveTransactions(allTransactions);
}

export function unlinkAllFromExpense(expenseId: string): void {
  allTransactions = allTransactions.map(t => {
    if (t.id === expenseId) return { ...t, linkedIncomeIds: [] };
    if (t.type === 'income' && t.linkedExpenseId === expenseId) return { ...t, linkedExpenseId: null };
    return t;
  });
  saveTransactions(allTransactions);
}

export function linkIncomeToExpense(incomeId: string, expenseId: string): void {
  allTransactions = allTransactions.map(t => {
    if (t.id === incomeId) {
      // Remove from previous expense if any
      return { ...t, linkedExpenseId: expenseId };
    }
    if (t.id === expenseId) {
      const linked = t.linkedIncomeIds ?? [];
      if (!linked.includes(incomeId)) return { ...t, linkedIncomeIds: [...linked, incomeId] };
    }
    // Remove incomeId from its previous expense's list
    if (t.type === 'expense' && t.id !== expenseId && t.linkedIncomeIds?.includes(incomeId)) {
      return { ...t, linkedIncomeIds: t.linkedIncomeIds.filter(id => id !== incomeId) };
    }
    return t;
  });
  saveTransactions(allTransactions);
}

export function unlinkIncomeFromExpense(incomeId: string): void {
  allTransactions = allTransactions.map(t => {
    if (t.id === incomeId) return { ...t, linkedExpenseId: null };
    if (t.type === 'expense' && t.linkedIncomeIds?.includes(incomeId)) {
      return { ...t, linkedIncomeIds: t.linkedIncomeIds.filter(id => id !== incomeId) };
    }
    return t;
  });
  saveTransactions(allTransactions);
}

// ── Account mutations ─────────────────────────────────────────────

export function addAccount(type: 'card' | 'bank', name: string): Account {
  const newAccount: Account = { id: 'acc_' + Date.now().toString(36), type, name };
  allAccounts = [...allAccounts, newAccount];
  saveAccounts(allAccounts);
  return newAccount;
}

export function deleteAccount(id: string): void {
  allAccounts = allAccounts.filter(account => account.id !== id);
  saveAccounts(allAccounts);
}

// ── Toast ─────────────────────────────────────────────────────────

let toastMessage = $state('');
let toastVisible = $state(false);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function getToastMessage(): string { return toastMessage; }
export function isToastVisible(): boolean { return toastVisible; }

export function showToast(message: string): void {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage = message;
  toastVisible = true;
  toastTimer = setTimeout(() => { toastVisible = false; }, 2200);
}

// ── Active modal ──────────────────────────────────────────────────

export type ActiveModal =
  | { kind: 'none' }
  | { kind: 'add'; transactionType: 'expense' | 'income'; editingId?: string }
  | { kind: 'compensation'; expenseId: string }
  | { kind: 'link-income'; incomeId: string }
  | { kind: 'pdf-import'; file?: File }
  | { kind: 'category-detail'; categoryId: string; transactionType: 'expense' | 'income'; monthOffset: number }
  | { kind: 'settings' }
  | { kind: 'action-sheet'; transactionId: string; menuItems?: Array<{ label: string; destructive?: boolean; action: () => void }>; importData?: unknown[] };

let activeModal = $state<ActiveModal>({ kind: 'none' });

export function getActiveModal(): ActiveModal { return activeModal; }
export function openModal(modal: ActiveModal): void { activeModal = modal; }
export function closeModal(): void { activeModal = { kind: 'none' }; }
