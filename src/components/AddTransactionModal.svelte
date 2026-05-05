<script lang="ts">
  import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, EXPENSE_PAYMENT_METHODS, INCOME_PAYMENT_METHODS } from '../lib/categories';
  import { getTransactions, getAccounts, addTransaction, updateTransaction, showToast, closeModal, addAccount } from '../lib/state.svelte';
  import { generateId, getMostUsedExpenseMethod, todayAsISODate } from '../lib/utils';
  import type { Transaction } from '../lib/types';

  let { initialType = 'expense', editingId = null }: {
    initialType?: 'expense' | 'income';
    editingId?: string | null;
  } = $props();

  // Read existing transaction once at mount time — modal is always freshly mounted
  const existingTransaction = editingId ? getTransactions().find(t => t.id === editingId) ?? null : null;

  let transactionType: 'expense' | 'income' = $state(
    existingTransaction?.type ?? initialType
  );
  let selectedCategoryId = $state(
    existingTransaction?.categoryId ?? (initialType === 'expense' ? 'food' : 'salary')
  );
  let selectedMethodId = $state(
    existingTransaction?.paymentMethod
      ?? (initialType === 'expense' ? getMostUsedExpenseMethod(getTransactions(), getAccounts()) : 'transfer')
  );
  let amountText = $state(existingTransaction?.amount.toString() ?? '');
  let noteText   = $state(existingTransaction?.note ?? '');
  let dateValue  = $state(
    existingTransaction
      ? new Date(existingTransaction.date).toISOString().split('T')[0]
      : todayAsISODate()
  );

  const isEditing = $derived(editingId !== null);
  const modalTitle = $derived(
    isEditing
      ? (transactionType === 'expense' ? 'Editar despesa' : 'Editar ingrés')
      : (transactionType === 'expense' ? 'Nova despesa' : 'Nou ingrés')
  );
  const categories = $derived(transactionType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES);
  const paymentMethods = $derived(transactionType === 'expense' ? EXPENSE_PAYMENT_METHODS : INCOME_PAYMENT_METHODS);
  const categoryColumns = $derived(transactionType === 'expense' ? 5 : 3);

  // When type changes, reset category and method to sensible defaults
  function setTransactionType(newType: 'expense' | 'income') {
    transactionType = newType;
    selectedCategoryId = newType === 'expense' ? 'food' : 'salary';
    selectedMethodId = newType === 'expense'
      ? getMostUsedExpenseMethod(getTransactions(), getAccounts())
      : 'transfer';
  }

  function getTopLevelMethodType(methodId: string): string {
    if (['cash', 'bizum', 'transfer'].includes(methodId)) return methodId;
    const account = getAccounts().find(account => account.id === methodId);
    return account?.type ?? methodId;
  }

  function handleMethodSelect(methodId: string) {
    if (!['card', 'bank'].includes(methodId)) {
      selectedMethodId = methodId;
      return;
    }
    const accountsOfType = getAccounts().filter(account => account.type === methodId);
    if (accountsOfType.length === 0) { selectedMethodId = methodId; return; }
    if (accountsOfType.length === 1) { selectedMethodId = accountsOfType[0].id; return; }
    // Multiple accounts: show picker (for now just pick first; account picker can be added)
    selectedMethodId = accountsOfType[0].id;
  }

  function getMethodDisplayLabel(methodId: string): string {
    const accounts = getAccounts();
    const builtIn: Record<string, string> = { card: 'Targeta', cash: 'Efectiu', transfer: 'Transferència', bizum: 'Bizum', bank: 'Banc' };
    if (builtIn[methodId]) return builtIn[methodId];
    return accounts.find(a => a.id === methodId)?.name ?? methodId;
  }

  function isMethodActive(method: { id: string; hasAccounts?: boolean }): boolean {
    if (transactionType === 'income') return selectedMethodId === method.id;
    const topType = getTopLevelMethodType(selectedMethodId);
    return topType === method.id || selectedMethodId === method.id;
  }

  function save() {
    const amount = parseFloat(amountText);
    if (!amountText || isNaN(amount) || amount <= 0) {
      showToast('Introdueix un import vàlid');
      return;
    }
    if (!noteText.trim()) {
      showToast('El concepte és obligatori');
      return;
    }
    const isoDate = dateValue
      ? new Date(dateValue + 'T12:00:00').toISOString()
      : new Date().toISOString();

    if (isEditing && editingId) {
      const existing = getTransactions().find(t => t.id === editingId);
      if (existing) {
        updateTransaction({ ...existing, type: transactionType, amount, categoryId: selectedCategoryId, paymentMethod: selectedMethodId, note: noteText.trim(), date: isoDate });
        showToast('Moviment actualitzat ✓');
      }
    } else {
      const newTransaction: Transaction = {
        id: generateId(),
        type: transactionType,
        amount,
        categoryId: selectedCategoryId,
        paymentMethod: selectedMethodId,
        note: noteText.trim(),
        date: isoDate,
        linkedIncomeIds: [],
        linkedExpenseId: null,
      };
      addTransaction(newTransaction);
      showToast(transactionType === 'expense' ? 'Despesa desada ✓' : 'Ingrés desat ✓');
    }
    closeModal();
  }
</script>

<div class="overlay open" onclick={closeModal} onkeydown={(e) => e.key === "Escape" && closeModal()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="modal-nav">
      <button class="modal-cancel" onclick={closeModal}>Cancel·la</button>
      <span class="modal-title">{modalTitle}</span>
      <button class="modal-save" onclick={save}>Desa</button>
    </div>

    <div style="padding: 0 16px 4px">
      <div class="type-toggle" style="margin: 0">
        <button
          class="type-toggle-button {transactionType === 'expense' ? 'active-expense' : ''}"
          onclick={() => setTransactionType('expense')}
        >💸 Despesa</button>
        <button
          class="type-toggle-button {transactionType === 'income' ? 'active-income' : ''}"
          onclick={() => setTransactionType('income')}
        >💰 Ingrés</button>
      </div>
    </div>

    <div class="amount-concept-card">
      <div style="display: flex; align-items: center; gap: 4px; padding: 14px 14px 8px">
        <span style="font-size: 32px; font-weight: 700; color: var(--color-label)">€</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="amount-input"
          type="number"
          placeholder="0,00"
          min="0"
          step="0.01"
          inputmode="decimal"
          autofocus
          bind:value={amountText}
        />
      </div>
      <div style="height: .5px; background: var(--color-gray5); margin: 0 14px"></div>
      <input
        class="concept-input"
        type="text"
        placeholder="Concepte..."
        maxlength="100"
        bind:value={noteText}
      />
    </div>

    <div class="form-label-sm">CATEGORIA</div>
    <div class="category-form-grid" style="grid-template-columns: repeat({categoryColumns}, 1fr)">
      {#each categories as category}
        <button
          class="category-grid-button {selectedCategoryId === category.id ? 'selected' : ''}"
          style="--category-color: {category.color}"
          onclick={() => { selectedCategoryId = category.id; }}
        >
          <div class="category-grid-icon" style="background: {selectedCategoryId === category.id ? category.color : category.color + '22'}">{category.icon}</div>
          <div class="category-grid-label" style="{selectedCategoryId === category.id ? 'color:' + category.color + '; font-weight: 600' : ''}">{category.label}</div>
        </button>
      {/each}
    </div>

    <div class="form-label-sm">{transactionType === 'expense' ? 'MÈTODE DE PAGAMENT' : 'COM EL REPS'}</div>
    <div class="method-row">
      {#each paymentMethods as method}
        {@const isActive = isMethodActive(method)}
        <button
          class="method-pill {isActive ? (transactionType === 'income' ? 'active-income' : 'active') : ''}"
          onclick={() => handleMethodSelect(method.id)}
        >
          {method.icon}
          {isActive && transactionType === 'expense'
            ? getMethodDisplayLabel(selectedMethodId)
            : method.label}
          {#if (method as { hasAccounts?: boolean }).hasAccounts && getAccounts().filter(a => a.type === method.id).length > 1} ›{/if}
        </button>
      {/each}
    </div>

    <div class="date-row">
      <span style="font-size: 16px">📅</span>
      <span style="flex: 1; font-size: 15px; color: var(--color-label)">Data</span>
      <input class="date-input" type="date" bind:value={dateValue} />
    </div>

    <div style="padding: 8px 16px 16px">
      <button
        class="save-button {transactionType}"
        onclick={save}
      >
        {transactionType === 'expense' ? 'Desa despesa' : 'Desa ingrés'}
      </button>
    </div>
  </div>
</div>
