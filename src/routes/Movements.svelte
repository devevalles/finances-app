<script lang="ts">
  import { getTransactions, openModal } from '../lib/state.svelte';
  import { formatCurrency, formatMonthName, calculateMonthStats } from '../lib/utils';
  import TransactionRow from '../components/TransactionRow.svelte';
  import type { Transaction } from '../lib/types';

  type FilterType = 'all' | 'expense' | 'income';

  let activeFilter: FilterType = $state('all');
  let searchQuery = $state('');

  let pdfFileInput: HTMLInputElement;

  const allTransactions = $derived(getTransactions());

  const filteredTransactions = $derived(() => {
    let result = activeFilter === 'all' ? allTransactions : allTransactions.filter(t => t.type === activeFilter);
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter(t => {
        const categoryLabels: Record<string, string> = { food: 'Alimentació', restaurants: 'Restaurants', transport: 'Transport', entertainment: 'Entreteniment', clothing: 'Roba', home: 'Llar', subscriptions: 'Subscripcions', education: 'Educació', other: 'Altres', salary: 'Salari', freelance: 'Freelance', bizum_in: 'Bizum', transfer_in: 'Transferència', gift: 'Regal', income_other: 'Altres ingressos' };
        const categoryLabel = (categoryLabels[t.categoryId] ?? '').toLowerCase();
        return (t.note ?? '').toLowerCase().includes(query)
          || categoryLabel.includes(query)
          || t.amount.toFixed(2).includes(query);
      });
    }
    return result;
  });

  interface MonthGroup {
    label: string;
    stats: { income: number; expense: number; net: number };
    dayGroups: Array<{ dateKey: string; dayLabel: string; transactions: Transaction[] }>;
  }

  const monthGroups = $derived((): MonthGroup[] => {
    const transactions = filteredTransactions();
    if (!transactions.length) return [];

    const groupByMonth: Record<string, { label: string; transactions: Transaction[] }> = {};
    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const key = date.getFullYear() + '-' + String(date.getMonth()).padStart(2, '0');
      if (!groupByMonth[key]) {
        groupByMonth[key] = { label: formatMonthName(date), transactions: [] };
      }
      groupByMonth[key].transactions.push(transaction);
    }

    return Object.entries(groupByMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, group]) => {
        const dayMap: Record<string, Transaction[]> = {};
        for (const transaction of group.transactions) {
          const dayKey = transaction.date.substring(0, 10);
          if (!dayMap[dayKey]) dayMap[dayKey] = [];
          dayMap[dayKey].push(transaction);
        }

        const dayGroups = Object.entries(dayMap)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([dateKey, transactions]) => {
            const date = new Date(dateKey + 'T12:00:00');
            const dayLabel = date.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            return { dateKey, dayLabel, transactions };
          });

        return {
          label: group.label,
          stats: calculateMonthStats(group.transactions, allTransactions),
          dayGroups,
        };
      });
  });

  function handlePdfFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';
    openModal({ kind: 'pdf-import', file });
  }
</script>

<div class="page-header">
  <span class="page-title">Moviments</span>
  <div class="page-actions">
    <button class="icon-button indigo" onclick={() => pdfFileInput.click()} title="Importar PDF">📄</button>
    <button class="icon-button" onclick={() => openModal({ kind: 'add', transactionType: 'expense' })}>＋</button>
  </div>
</div>

<div class="filter-row">
  <button class="pill {activeFilter === 'all' ? 'active' : ''}" onclick={() => { activeFilter = 'all'; }}>Tots</button>
  <button class="pill {activeFilter === 'expense' ? 'active' : ''}" onclick={() => { activeFilter = 'expense'; }}>💸 Despeses</button>
  <button class="pill {activeFilter === 'income' ? 'active-green' : ''}" onclick={() => { activeFilter = 'income'; }}>💰 Ingressos</button>
</div>

<div class="search-wrapper">
  <span class="search-icon">🔍</span>
  <input
    class="search-input"
    type="search"
    placeholder="Cerca per categoria, nota o import..."
    autocomplete="off"
    autocorrect="off"
    spellcheck="false"
    bind:value={searchQuery}
  />
  {#if searchQuery}
    <button class="search-clear" onclick={() => { searchQuery = ''; }}>✕</button>
  {/if}
</div>

<div class="scrollable-content">
  {#if filteredTransactions().length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">{searchQuery ? '🔍' : '🧾'}</div>
      <div class="empty-state-title">Sense moviments</div>
      <div class="empty-state-message">
        {searchQuery ? `Cap resultat per "${searchQuery}"` : 'No hi ha dades per a aquest filtre'}
      </div>
    </div>
  {:else}
    {#each monthGroups() as group}
      <div class="month-group">
        <div class="month-header">
          <span class="month-header-title">{group.label}</span>
          <span class="month-header-amount" style="color: {group.stats.net >= 0 ? 'var(--color-green)' : 'var(--color-gray)'}">
            {group.stats.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(group.stats.net))}
          </span>
        </div>

        {#each group.dayGroups as dayGroup}
          <div class="day-separator">{dayGroup.dayLabel}</div>
          <div class="card">
            {#each dayGroup.transactions as transaction, index}
              <TransactionRow
                {transaction}
                showSeparator={index < dayGroup.transactions.length - 1}
                onTap={(id) => openModal({ kind: 'action-sheet', transactionId: id })}
              />
            {/each}
          </div>
        {/each}
      </div>
    {/each}
  {/if}
</div>

<input bind:this={pdfFileInput} type="file" accept=".pdf" style="display: none" onchange={handlePdfFileSelected} />
