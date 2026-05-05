<script lang="ts">
  import type { Transaction } from '../lib/types';
  import { getCategoryById } from '../lib/categories';
  import { formatCurrency, calculateNetAmount } from '../lib/utils';
  import { getTransactions } from '../lib/state.svelte';

  let { transaction, showSeparator = false, onTap }: {
    transaction: Transaction;
    showSeparator?: boolean;
    onTap: (id: string) => void;
  } = $props();

  const allTransactions = $derived(getTransactions());
  const category = $derived(getCategoryById(transaction.categoryId));
  const isIncome = $derived(transaction.type === 'income');
  const isLinkedIncome = $derived(isIncome && !!transaction.linkedExpenseId);
  const isCompensated = $derived(!isIncome && (transaction.linkedIncomeIds?.length ?? 0) > 0);
  const netAmount = $derived(calculateNetAmount(transaction, allTransactions));
  const showOriginalAmount = $derived(isCompensated && netAmount !== transaction.amount);
  const displayAmount = $derived(isIncome ? transaction.amount : netAmount);

  const formattedDate = $derived(
    new Date(transaction.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })
  );
  const methodLabel = $derived(
    ({ card: 'Targeta', cash: 'Efectiu', transfer: 'Transferència', bizum: 'Bizum', bank: 'Banc' } as Record<string, string>)[transaction.paymentMethod] ?? ''
  );
</script>

<div
  class="transaction-row {isLinkedIncome ? 'linked-income' : ''}"
  onclick={() => onTap(transaction.id)}
  oncontextmenu={(event) => { event.preventDefault(); onTap(transaction.id); }}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && onTap(transaction.id)}
>
  <div class="category-icon" style="background: {category.color}22">{category.icon}</div>

  <div class="transaction-info">
    <div class="transaction-category">
      {category.label}
      {#if isCompensated}<span class="tag-compensated">Compensat</span>{/if}
      {#if isLinkedIncome}<span class="tag-linked">🔗 Vinculat</span>{/if}
    </div>
    {#if transaction.note}
      <div class="transaction-note">{transaction.note}</div>
    {/if}
    <div class="transaction-meta">{formattedDate}{methodLabel ? ' · ' + methodLabel : ''}</div>
  </div>

  <div style="text-align: right">
    <div class="transaction-amount {isIncome ? 'income' : 'expense'}">
      {isIncome ? '+ ' : ''}{formatCurrency(displayAmount)}
    </div>
    {#if showOriginalAmount}
      <div class="transaction-original-amount">{formatCurrency(transaction.amount)}</div>
    {/if}
  </div>
</div>

{#if showSeparator}
  <div class="row-separator"></div>
{/if}
