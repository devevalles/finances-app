<script lang="ts">
  import { getTransactions, openModal, showToast, replaceAllTransactions, mergeTransactions } from '../lib/state.svelte';
  import { formatCurrency, calculateMonthStats } from '../lib/utils';
  import TransactionRow from '../components/TransactionRow.svelte';

  let { onNavigateToMovements }: { onNavigateToMovements: () => void } = $props();

  let pdfFileInput: HTMLInputElement;
  let importFileInput: HTMLInputElement;

  const allTransactions = $derived(getTransactions());

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  const currentMonthTransactions = $derived(
    allTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
  );

  const stats = $derived(calculateMonthStats(currentMonthTransactions, allTransactions));

  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthTransactions = $derived(
    allTransactions.filter(t => {
      const date = new Date(t.date);
      return date.getMonth() === previousMonthDate.getMonth() && date.getFullYear() === previousMonthDate.getFullYear();
    })
  );
  const previousMonthStats = $derived(calculateMonthStats(previousMonthTransactions, allTransactions));

  const monthName = $derived(() => {
    const formatted = now.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
    return formatted[0].toUpperCase() + formatted.slice(1);
  });

  const comparisonText = $derived(() => {
    if (previousMonthStats.expense <= 0 || stats.expense <= 0) return '';
    const percentDiff = Math.round((stats.expense - previousMonthStats.expense) / previousMonthStats.expense * 100);
    const previousMonthName = previousMonthDate.toLocaleDateString('ca-ES', { month: 'long' });
    return ` · ${percentDiff > 0 ? '↑' : '↓'} ${Math.abs(percentDiff)}% despesa vs ${previousMonthName}`;
  });

  const recentTransactions = $derived(currentMonthTransactions.slice(0, 6));

  function handlePdfFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';
    openModal({ kind: 'pdf-import', file });
  }

  function handleImportFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    (event.target as HTMLInputElement).value = '';

    const reader = new FileReader();
    reader.onload = (readEvent) => {
      try {
        const data = JSON.parse(readEvent.target!.result as string);
        if (!Array.isArray(data)) throw new Error();
        openModal({ kind: 'action-sheet', transactionId: '', importData: data });
      } catch {
        showToast('Error: fitxer no vàlid');
      }
    };
    reader.readAsText(file);
  }

  function exportJson() {
    const json = JSON.stringify(allTransactions, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateString = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `finances-${dateString}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Dades exportades ✓');
  }

  function exportCsv() {
    const header = ['Data', 'Tipus', 'Categoria', 'Import', 'Mètode', 'Concepte'];
    const rows = allTransactions.map(t => {
      const date = new Date(t.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const type = t.type === 'expense' ? 'Despesa' : 'Ingrés';
      const category = ({ food: 'Alimentació', restaurants: 'Restaurants', transport: 'Transport', entertainment: 'Entreteniment', clothing: 'Roba', home: 'Llar', subscriptions: 'Subscripcions', education: 'Educació', other: 'Altres', salary: 'Salari', freelance: 'Freelance', bizum_in: 'Bizum', transfer_in: 'Transferència', gift: 'Regal', income_other: 'Altres ingressos' } as Record<string, string>)[t.categoryId] ?? t.categoryId;
      const sign = t.type === 'expense' ? '-' : '+';
      const amount = sign + t.amount.toFixed(2).replace('.', ',');
      const method = ({ card: 'Targeta', cash: 'Efectiu', transfer: 'Transferència', bizum: 'Bizum', bank: 'Banc' } as Record<string, string>)[t.paymentMethod] ?? t.paymentMethod;
      const note = (t.note ?? '').replace(/"/g, '""');
      return [date, type, category, amount, method, `"${note}"`];
    });
    const csv = [header, ...rows].map(row => row.join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateString = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `finances-${dateString}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV exportat ✓');
  }

  function showBackupMenu() {
    openModal({
      kind: 'action-sheet',
      transactionId: '',
      menuItems: [
        { label: '⚙️ Configuració (targetes i bancs)', action: () => openModal({ kind: 'settings' }) },
        { label: '📤 Exportar dades (còpia de seguretat)', action: exportJson },
        { label: '📊 Exportar a CSV (per a Excel / Sheets)', action: exportCsv },
        { label: '📥 Importar dades (restaurar)', action: () => importFileInput.click() },
      ],
    });
  }
</script>

<div class="page-header">
  <span class="page-title">Finances</span>
  <div class="page-actions">
    <button class="icon-button gray" onclick={showBackupMenu} title="Exportar / Importar">···</button>
  </div>
</div>

<div class="scrollable-content">
  <div class="hero-card {stats.net >= 0 ? 'positive' : 'negative'}">
    <div class="hero-month">{monthName()}</div>
    <div class="hero-amount">{stats.net < 0 ? '-' : ''}{formatCurrency(Math.abs(stats.net))}</div>
    <div class="hero-subtitle">Saldo del mes{comparisonText()}</div>
    <div class="hero-row">
      <div class="hero-stat">
        <div class="hero-stat-label">📈 Ingressos</div>
        <div class="hero-stat-amount">{formatCurrency(stats.income)}</div>
      </div>
      <div class="hero-divider"></div>
      <div class="hero-stat">
        <div class="hero-stat-label">📉 Despeses</div>
        <div class="hero-stat-amount">{formatCurrency(stats.expense)}</div>
      </div>
    </div>
  </div>

  <div class="quick-actions-row">
    <button class="quick-action-card pdf" onclick={() => pdfFileInput.click()}>
      <div class="quick-action-icon">📄</div>
      <span class="quick-action-label">Importar PDF</span>
    </button>
    <button class="quick-action-card add" onclick={() => openModal({ kind: 'add', transactionType: 'expense' })}>
      <div class="quick-action-icon">＋</div>
      <span class="quick-action-label">Afegir</span>
    </button>
  </div>

  {#if currentMonthTransactions.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">👛</div>
      <div class="empty-state-title">Sense moviments</div>
      <div class="empty-state-message">Afegeix una despesa, un ingrés o importa el teu extracte</div>
      <button class="empty-state-button" onclick={() => openModal({ kind: 'add', transactionType: 'expense' })}>
        Afegir despesa
      </button>
    </div>
  {:else}
    <div class="section">
      <div class="section-header">
        <span class="section-title">Recents</span>
        <span class="section-link" onclick={onNavigateToMovements} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onNavigateToMovements()}>Veure tots</span>
      </div>
      <div class="card">
        {#each recentTransactions as transaction, index}
          <TransactionRow
            {transaction}
            showSeparator={index < recentTransactions.length - 1}
            onTap={(id) => openModal({ kind: 'action-sheet', transactionId: id })}
          />
        {/each}
      </div>
    </div>
  {/if}

  <div style="height: 24px"></div>
</div>

<input bind:this={pdfFileInput}    type="file" accept=".pdf"  style="display: none" onchange={handlePdfFileSelected} />
<input bind:this={importFileInput} type="file" accept=".json" style="display: none" onchange={handleImportFileSelected} />
