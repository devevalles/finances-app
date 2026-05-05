<script lang="ts">
  import { getTransactions, openModal } from '../lib/state.svelte';
  import { formatCurrency, formatMonthName, calculateMonthStats, calculateNetAmount } from '../lib/utils';
  import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getCategoryById } from '../lib/categories';

  type SummarySubTab = 'summary' | 'trends';
  type CategoryFilterType = 'expense' | 'income';

  let activeSubTab: SummarySubTab = $state('summary');
  let categoryFilterType: CategoryFilterType = $state('expense');
  let monthOffset = $state(0);
  let trendPeriodMonths = $state(6);

  const TREND_PERIOD_LABELS: Record<number, string> = {
    3:  'ÚLTIMS 3 MESOS',
    6:  'ÚLTIMS 6 MESOS',
    12: 'ÚLTIM ANY',
  };
  const TREND_SUMMARY_LABELS: Record<number, string> = {
    3:  'Resum 3 mesos',
    6:  'Resum 6 mesos',
    12: 'Resum 1 any',
  };

  const allTransactions = $derived(getTransactions());

  const targetDate = $derived(new Date(new Date().getFullYear(), new Date().getMonth() - monthOffset, 1));
  const targetMonthLabel = $derived(formatMonthName(targetDate));

  const currentMonthTransactions = $derived(
    allTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === targetDate.getMonth() && date.getFullYear() === targetDate.getFullYear();
    })
  );
  const monthStats = $derived(calculateMonthStats(currentMonthTransactions, allTransactions));

  const categoryBreakdown = $derived(() => {
    const amountByCategory: Record<string, number> = {};
    for (const transaction of currentMonthTransactions) {
      if (transaction.type !== categoryFilterType) continue;
      if (categoryFilterType === 'income' && transaction.linkedExpenseId) continue;
      const amount = categoryFilterType === 'expense'
        ? calculateNetAmount(transaction, allTransactions)
        : transaction.amount;
      amountByCategory[transaction.categoryId] = (amountByCategory[transaction.categoryId] ?? 0) + amount;
    }

    const categories = categoryFilterType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    const totalAmount = categoryFilterType === 'expense' ? monthStats.expense : monthStats.income;

    return categories
      .map(category => ({ category, amount: amountByCategory[category.id] ?? 0 }))
      .filter(entry => entry.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map(entry => ({
        ...entry,
        percentage: totalAmount > 0 ? Math.round(entry.amount / totalAmount * 100) : 0,
        barWidth: totalAmount > 0 ? (entry.amount / totalAmount) * 100 : 0,
      }));
  });

  const trendMonthData = $derived(() => {
    const now = new Date();
    return Array.from({ length: trendPeriodMonths }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (trendPeriodMonths - 1 - index), 1);
      const monthTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear();
      });
      const stats = calculateMonthStats(monthTransactions, allTransactions);
      const shortLabel = date.toLocaleDateString('ca-ES', { month: 'short' }).slice(0, 3).toUpperCase();
      return { label: shortLabel, income: stats.income, expense: stats.expense, net: stats.net };
    });
  });

  const trendMaxValue = $derived(Math.max(...trendMonthData().flatMap(month => [month.income, month.expense]), 1));
  const CHART_HEIGHT = 130;
  const chartBarWidth = $derived(trendPeriodMonths <= 3 ? 20 : trendPeriodMonths <= 6 ? 13 : 8);

  const trendTotals = $derived(() => {
    const data = trendMonthData();
    const totalIncome  = data.reduce((sum, month) => sum + month.income,  0);
    const totalExpense = data.reduce((sum, month) => sum + month.expense, 0);
    return { income: totalIncome, expense: totalExpense, net: totalIncome - totalExpense };
  });

  const hasNoTrendData = $derived(trendMonthData().every(month => month.income === 0 && month.expense === 0));
</script>

<div class="page-header">
  <span class="page-title">Resum</span>
</div>

<div class="segment-control">
  <button class="segment-button {activeSubTab === 'summary' ? 'active' : ''}" onclick={() => { activeSubTab = 'summary'; }}>Resum</button>
  <button class="segment-button {activeSubTab === 'trends' ? 'active' : ''}"  onclick={() => { activeSubTab = 'trends'; }}>Tendències</button>
</div>

<div class="scrollable-content">
  {#if activeSubTab === 'summary'}
    <div class="month-navigation">
      <button class="nav-arrow" onclick={() => { monthOffset++; }}>‹</button>
      <span class="month-navigation-label">{targetMonthLabel}</span>
      <button class="nav-arrow {monthOffset === 0 ? 'disabled' : ''}" onclick={() => { if (monthOffset > 0) monthOffset--; }}>›</button>
    </div>

    <div class="total-card">
      <div class="total-label">Saldo del mes</div>
      <div class="total-amount" style="color: {monthStats.net >= 0 ? 'var(--color-green)' : 'var(--color-red)'}">
        {monthStats.net < 0 ? '-' : ''}{formatCurrency(Math.abs(monthStats.net))}
      </div>
      <div class="summary-split-row">
        <div class="summary-split-item" style="background: #F0FAF2">
          <div class="summary-split-label">📈 Ingressos</div>
          <div class="summary-split-value" style="color: var(--color-green)">{formatCurrency(monthStats.income)}</div>
        </div>
        <div class="summary-split-item" style="background: #FFF0F0">
          <div class="summary-split-label">📉 Despeses</div>
          <div class="summary-split-value" style="color: var(--color-red)">{formatCurrency(monthStats.expense)}</div>
        </div>
      </div>
      {#if monthStats.income + monthStats.expense > 0}
        <div class="split-bar">
          <div class="split-bar-income"  style="flex: {monthStats.income  || 0.001}"></div>
          <div class="split-bar-expense" style="flex: {monthStats.expense || 0.001}"></div>
        </div>
      {/if}
    </div>

    <div class="segment-control" style="margin-bottom: 8px">
      <button class="segment-button {categoryFilterType === 'expense' ? 'active' : ''}" onclick={() => { categoryFilterType = 'expense'; }}>Despeses</button>
      <button class="segment-button {categoryFilterType === 'income'  ? 'active' : ''}" onclick={() => { categoryFilterType = 'income'; }}>Ingressos</button>
    </div>

    {#if categoryBreakdown().length === 0}
      <div class="empty-state" style="padding-top: 20px">
        <div class="empty-state-icon">📈</div>
        <div class="empty-state-title">Sense dades</div>
        <div class="empty-state-message">
          Sense {categoryFilterType === 'expense' ? 'despeses' : 'ingressos'} a {targetMonthLabel}
        </div>
      </div>
    {:else}
      <div class="section">
        <div class="card">
          {#each categoryBreakdown() as entry, index}
            <div
              class="category-row"
              style="cursor: pointer; {index < categoryBreakdown().length - 1 ? 'border-bottom: .5px solid var(--color-gray5)' : ''}"
              onclick={() => openModal({ kind: 'category-detail', categoryId: entry.category.id, transactionType: categoryFilterType, monthOffset })}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && openModal({ kind: 'category-detail', categoryId: entry.category.id, transactionType: categoryFilterType, monthOffset })}
            >
              <div class="category-icon" style="background: {entry.category.color}22; border-radius: 10px">{entry.category.icon}</div>
              <div class="category-info">
                <div class="category-row-top">
                  <span class="category-name">{entry.category.label}</span>
                  <span class="category-amount">{formatCurrency(entry.amount)}</span>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill" style="width: {entry.barWidth}%; background: {entry.category.color}"></div>
                </div>
                <div class="category-percentage">{entry.percentage}% del total</div>
              </div>
              <div style="color: var(--color-gray3); font-size: 14px; margin-left: 4px">›</div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

  {:else}
    <div class="segment-control" style="margin: 8px 16px 0">
      <button class="segment-button {trendPeriodMonths === 3  ? 'active' : ''}" onclick={() => { trendPeriodMonths = 3;  }}>3 mesos</button>
      <button class="segment-button {trendPeriodMonths === 6  ? 'active' : ''}" onclick={() => { trendPeriodMonths = 6;  }}>6 mesos</button>
      <button class="segment-button {trendPeriodMonths === 12 ? 'active' : ''}" onclick={() => { trendPeriodMonths = 12; }}>1 any</button>
    </div>

    <div class="chart-wrapper" style="margin-top: 8px">
      <div class="chart-title">
        {TREND_PERIOD_LABELS[trendPeriodMonths] ?? `ÚLTIMS ${trendPeriodMonths} MESOS`} — INGRESSOS VS DESPESES
      </div>

      <div class="chart-area">
        {#if hasNoTrendData}
          <div class="chart-empty" style="flex: 1">Sense dades suficients</div>
        {:else}
          {#each trendMonthData() as month}
            {@const incomeHeight  = Math.max(Math.round(month.income  / trendMaxValue * CHART_HEIGHT), month.income  > 0 ? 3 : 0)}
            {@const expenseHeight = Math.max(Math.round(month.expense / trendMaxValue * CHART_HEIGHT), month.expense > 0 ? 3 : 0)}
            <div class="chart-column">
              <div class="chart-bar-group">
                <div class="chart-bar income"  style="height: {incomeHeight}px;  width: {chartBarWidth}px" title="Ingressos: {formatCurrency(month.income)}"></div>
                <div class="chart-bar expense" style="height: {expenseHeight}px; width: {chartBarWidth}px" title="Despeses: {formatCurrency(month.expense)}"></div>
              </div>
              <div class="chart-month-label">{month.label}</div>
            </div>
          {/each}
        {/if}
      </div>

      <div class="chart-legend">
        <div class="legend-item"><div class="legend-dot" style="background: var(--color-green)"></div>Ingressos</div>
        <div class="legend-item"><div class="legend-dot" style="background: var(--color-red)"></div>Despeses</div>
      </div>
    </div>

    <div class="section" style="margin-top: 12px">
      <div class="section-title" style="margin-bottom: 8px">
        {TREND_SUMMARY_LABELS[trendPeriodMonths] ?? `Resum ${trendPeriodMonths} mesos`}
      </div>
      <div class="card">
        <div class="category-row">
          <div class="category-icon" style="background: #E5F0FF">📈</div>
          <div class="category-info"><div class="category-name">Total ingressos</div></div>
          <div class="category-amount" style="color: var(--color-green)">{formatCurrency(trendTotals().income)}</div>
        </div>
        <div class="row-separator"></div>
        <div class="category-row">
          <div class="category-icon" style="background: #FFF0F0">📉</div>
          <div class="category-info"><div class="category-name">Total despeses</div></div>
          <div class="category-amount" style="color: var(--color-red)">{formatCurrency(trendTotals().expense)}</div>
        </div>
        <div class="row-separator"></div>
        <div class="category-row">
          <div class="category-icon" style="background: #F2F2F7">💰</div>
          <div class="category-info"><div class="category-name">Estalvi net</div></div>
          <div class="category-amount" style="color: {trendTotals().net >= 0 ? 'var(--color-green)' : 'var(--color-red)'}">
            {trendTotals().net >= 0 ? '+' : ''}{formatCurrency(trendTotals().net)}
          </div>
        </div>
      </div>
    </div>
  {/if}

  <div style="height: 24px"></div>
</div>
