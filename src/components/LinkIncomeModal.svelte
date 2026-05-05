<script lang="ts">
  import { getTransactions, linkIncomeToExpense, showToast, closeModal } from '../lib/state.svelte';
  import { getCategoryById } from '../lib/categories';
  import { formatCurrency, calculateNetAmount } from '../lib/utils';

  let { incomeId }: { incomeId: string } = $props();

  const income = $derived(getTransactions().find(t => t.id === incomeId)!);
  const incomeCategory = $derived(getCategoryById(income?.categoryId ?? 'other'));

  const availableExpenses = $derived(
    getTransactions().filter(t => t.type === 'expense')
  );

  function selectExpense(expenseId: string) {
    linkIncomeToExpense(incomeId, expenseId);
    showToast('Ingrés vinculat ✓');
    closeModal();
  }
</script>

<div class="overlay open" onclick={closeModal} onkeydown={(e) => e.key === "Escape" && closeModal()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="modal-nav">
      <button class="modal-cancel" onclick={closeModal}>Cancel·la</button>
      <span class="modal-title">Vincular a despesa</span>
      <span style="width: 60px"></span>
    </div>

    <div class="modal-scroll">
      {#if income}
        <div style="margin: 0 16px 12px; background: var(--color-card); border-radius: 14px; padding: 14px">
          <div style="display: flex; align-items: center; gap: 12px">
            <div class="category-icon" style="background: {incomeCategory.color}22">{incomeCategory.icon}</div>
            <div style="flex: 1">
              <div style="font-size: 15px; font-weight: 500">{incomeCategory.label}</div>
              {#if income.note}<div style="font-size: 13px; color: var(--color-gray)">{income.note}</div>{/if}
            </div>
            <div style="font-size: 16px; font-weight: 600; color: var(--color-green)">
              +{formatCurrency(income.amount)}
            </div>
          </div>
        </div>
      {/if}

      <div class="form-label-sm">SELECCIONA UNA DESPESA</div>

      {#if availableExpenses.length === 0}
        <div id="linkinc-empty" style="text-align: center; padding: 24px; color: var(--color-gray); font-size: 14px">
          No hi ha despeses registrades
        </div>
      {:else}
        <div class="card" style="margin: 0 16px">
          {#each availableExpenses as expense, index}
            {@const expenseCategory = getCategoryById(expense.categoryId)}
            {@const allTransactions = getTransactions()}
            {@const netAmount = calculateNetAmount(expense, allTransactions)}
            {@const formattedDate = new Date(expense.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}
            <div
              class="compensation-selectable-item"
              onclick={() => selectExpense(expense.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && selectExpense(expense.id)}
            >
              <div class="category-icon" style="background: {expenseCategory.color}22">{expenseCategory.icon}</div>
              <div style="flex: 1">
                <div style="font-size: 15px; font-weight: 500">{expenseCategory.label}</div>
                {#if expense.note}<div style="font-size: 12px; color: var(--color-gray)">{expense.note}</div>{/if}
                <div style="font-size: 12px; color: var(--color-gray)">{formattedDate}</div>
              </div>
              <div style="font-size: 16px; font-weight: 600; color: var(--color-red)">
                -{formatCurrency(netAmount)}
              </div>
            </div>
            {#if index < availableExpenses.length - 1}
              <div class="row-separator" style="margin-left: 16px"></div>
            {/if}
          {/each}
        </div>
      {/if}
      <div style="height: 16px"></div>
    </div>
  </div>
</div>
