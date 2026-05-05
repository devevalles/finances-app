<script lang="ts">
  import { getTransactions, openModal, closeModal } from '../lib/state.svelte';
  import { getCategoryById } from '../lib/categories';
  import { formatCurrency, calculateNetAmount } from '../lib/utils';
  import TransactionRow from './TransactionRow.svelte';

  let { categoryId, transactionType, monthOffset }: {
    categoryId: string;
    transactionType: 'expense' | 'income';
    monthOffset: number;
  } = $props();

  let searchQuery = $state('');

  const category = $derived(getCategoryById(categoryId));

  const monthTransactions = $derived(() => {
    const allTransactions = getTransactions();
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    let result = allTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === targetMonth
        && date.getFullYear() === targetYear
        && t.type === transactionType
        && t.categoryId === categoryId;
    });

    if (transactionType === 'income') {
      result = result.filter(t => !t.linkedExpenseId);
    }

    return result;
  });

  const filteredTransactions = $derived(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return monthTransactions();
    return monthTransactions().filter(t =>
      (t.note ?? '').toLowerCase().includes(query) ||
      t.amount.toFixed(2).includes(query)
    );
  });

  const totalAmount = $derived(() => {
    const allTransactions = getTransactions();
    return monthTransactions().reduce((sum, t) =>
      sum + (transactionType === 'expense' ? calculateNetAmount(t, allTransactions) : t.amount), 0
    );
  });
</script>

<div class="overlay open" onclick={closeModal} onkeydown={(e) => e.key === "Escape" && closeModal()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" style="height: 82%; max-height: 88%" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="modal-nav">
      <button class="modal-cancel" onclick={closeModal}>‹ Enrere</button>
      <span class="modal-title">{category.label}</span>
      <span style="width: 60px"></span>
    </div>

    <div style="display: flex; flex-direction: column; align-items: center; padding: 16px 0 12px; gap: 6px; flex-shrink: 0">
      <div class="category-icon" style="width: 52px; height: 52px; border-radius: 14px; font-size: 24px; background: {category.color}22">{category.icon}</div>
      <div style="font-size: 30px; font-weight: 700; color: var(--color-label); letter-spacing: -.5px">{formatCurrency(totalAmount())}</div>
      <div style="font-size: 13px; color: var(--color-gray)">
        {filteredTransactions().length} moviment{filteredTransactions().length !== 1 ? 's' : ''}
      </div>
    </div>

    <div class="search-wrapper" style="flex-shrink: 0">
      <span class="search-icon">🔍</span>
      <input
        class="search-input"
        type="search"
        placeholder="Cerca per nota o import..."
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        bind:value={searchQuery}
      />
      {#if searchQuery}
        <button class="search-clear" onclick={() => { searchQuery = ''; }}>✕</button>
      {/if}
    </div>

    <div class="modal-scroll">
      {#if filteredTransactions().length === 0}
        <div style="text-align: center; padding: 32px; color: var(--color-gray)">
          {searchQuery ? `Cap resultat per "${searchQuery}"` : 'Sense moviments'}
        </div>
      {:else}
        <div class="card" style="margin: 0 16px">
          {#each filteredTransactions() as transaction, index}
            <TransactionRow
              {transaction}
              showSeparator={index < filteredTransactions().length - 1}
              onTap={(id) => openModal({ kind: 'action-sheet', transactionId: id })}
            />
          {/each}
        </div>
      {/if}
      <div style="height: 24px"></div>
    </div>
  </div>
</div>
