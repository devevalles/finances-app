// Phase 1: browser localStorage (via Capacitor Preferences when running natively).
// Phase 2: swap these implementations to call the Supabase/API client.
import type { Transaction, Account } from './types';
import { normalizeTransaction } from './utils';

const TRANSACTIONS_STORAGE_KEY = 'fin3';
const ACCOUNTS_STORAGE_KEY = 'fin3_accs';

function readFromLocalStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeToLocalStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage quota exceeded */ }
}

export function loadTransactions(): Transaction[] {
  try {
    const raw = readFromLocalStorage(TRANSACTIONS_STORAGE_KEY);
    return (JSON.parse(raw || '[]') as Partial<Transaction>[]).map(normalizeTransaction);
  } catch { return []; }
}

export function saveTransactions(transactions: Transaction[]): void {
  writeToLocalStorage(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
}

export function loadAccounts(): Account[] {
  try {
    return JSON.parse(readFromLocalStorage(ACCOUNTS_STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function saveAccounts(accounts: Account[]): void {
  writeToLocalStorage(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}
