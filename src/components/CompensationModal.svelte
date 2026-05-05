<script lang="ts">
  import { getTransactions, linkIncomesToExpense, showToast, closeModal } from '../lib/state.svelte';
  import { getCategoryById } from '../lib/categories';
  import { formatCurrency, calculateNetAmount } from '../lib/utils';

  let { expenseId }: { expenseId: string } = $props();

  const expense = $derived(getTransactions().find(t => t.id === expenseId)!);
  const expenseCategory = $derived(getCategoryById(expense?.categoryId ?? 'other'));

  let selectedIncomeIds = $state<Set<string>>(new Set(expense?.linkedIncomeIds ?? []));

  const availableIncomes = $derived(
    getTransactions().filter(t =>
      t.type === 'income' &&
      (!t.linkedExpenseId || t.linkedExpenseId === expenseId)
    )
  );

  const totalCompensated = $derived(
    [...selectedIncomeIds]
      .map(id => getTransactions().find(t => t.id === id))
      .filter(Boolean)
      .reduce((sum, t) => sum + t!.amount, 0)
  );

  const netAfterCompensation = $derived(
    Math.max(0, (expense?.amount ?? 0) - totalCompensated)
  );

  function toggleIncome(incomeId: string) {
    const updated = new Set(selectedIncomeIds);
    if (updated.has(incomeId)) updated.delete(incomeId);
    else updated.add(incomeId);
    selectedIncomeIds = updated;
  }

  function save() {
    linkIncomesToExpense(expenseId, [...selectedIncomeIds]);
    showToast('Compensació desada ✓');
    closeModal();
  }
</script>

<div class="overlay open" onclick={closeModal} onkeydown={(e) => e.key === "Escape" && closeModal()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="modal-nav">
      <button class="modal-cancel" onclick={closeModal}>Cancel·la</button>
      <span class="modal-title">Compensar despesa</span>
      <button class="modal-save" onclick={save}>Desa</button>
    </div>

    <div class="modal-scroll">
      {#if expense}
        <div class="compensation-expense-card">
          <div class="compensation-expense-label">DESPESA A COMPENSAR</div>
          <div style="display: flex; align-items: center; gap: 12px">
            <div class="category-icon" style="background: {expenseCategory.color}22">{expenseCategory.icon}</div>
            <div style="flex: 1">
              <div style="font-size: 15px; font-weight: 500">{expenseCategory.label}</div>
              {#if expense.note}<div style="font-size: 13px; color: var(--color-gray)">{expense.note}</div>{/if}
            </div>
            <div style="font-size: 17px; font-weight: 600; color: var(--color-red)">
              -{formatCurrency(expense.amount)}
            </div>
          </div>
        </div>

        <div class="compensation-running-total">
          <div class="compensation-running-label">Total compensat</div>
          <div class="compensation-running-value">{formatCurrency(totalCompensated)}</div>
          <div class="compensation-running-net">Cost net: {formatCurrency(netAfterCompensation)}</div>
        </div>

        <div class="form-label-sm">VINCULAR INGRESSOS</div>

        {#if availableIncomes.length === 0}
          <div style="text-align: center; padding: 20px; color: var(--color-gray); font-size: 14px">
            No hi ha ingressos sense vincular
          </div>
        {:else}
          <div class="card" style="margin: 0 16px">
            {#each availableIncomes as income, index}
              {@const incomeCategory = getCategoryById(income.categoryId)}
              {@const isSelected = selectedIncomeIds.has(income.id)}
              {@const formattedDate = new Date(income.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}
              <div
                class="compensation-selectable-item"
                onclick={() => toggleIncome(income.id)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && toggleIncome(income.id)}
              >
                <div class="compensation-checkbox {isSelected ? 'checked' : ''}">
                  {#if isSelected}✓{/if}
                </div>
                <div class="category-icon" style="background: {incomeCategory.color}22">{incomeCategory.icon}</div>
                <div style="flex: 1">
                  <div style="font-size: 15px; font-weight: 500">{incomeCategory.label}</div>
                  {#if income.note}<div style="font-size: 12px; color: var(--color-gray)">{income.note}</div>{/if}
                  <div style="font-size: 12px; color: var(--color-gray)">{formattedDate}</div>
                </div>
                <div style="font-size: 16px; font-weight: 600; color: var(--color-green)">
                  +{formatCurrency(income.amount)}
                </div>
              </div>
              {#if index < availableIncomes.length - 1}
                <div class="row-separator" style="margin-left: 16px"></div>
              {/if}
            {/each}
          </div>
        {/if}
      {/if}
      <div style="height: 16px"></div>
    </div>
  </div>
</div>
