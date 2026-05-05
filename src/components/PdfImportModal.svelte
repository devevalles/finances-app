<script lang="ts">
  import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PDF_AUTOCATEGORIZATION_RULES } from '../lib/categories';
  import { getTransactions, addTransaction, showToast, closeModal } from '../lib/state.svelte';
  import { generateId } from '../lib/utils';
  import { formatCurrency } from '../lib/utils';
  import type { Transaction } from '../lib/types';

  interface ParsedImportItem {
    internalId: number;
    concept: string;
    amount: number;
    date: string;
    type: 'expense' | 'income';
    categoryId: string;
    paymentMethod: string;
    isSelected: boolean;
  }

  type ImportState = 'loading' | 'error' | 'review';

  let importState: ImportState = $state('loading');
  let errorMessage = $state('');
  let importItems: ParsedImportItem[] = $state([]);

  const selectedCount = $derived(importItems.filter(item => item.isSelected).length);
  const expenseItems = $derived(importItems.filter(item => item.type === 'expense'));
  const incomeItems  = $derived(importItems.filter(item => item.type === 'income'));
  const totalExpenses = $derived(expenseItems.reduce((sum, item) => sum + item.amount, 0));
  const totalIncomes  = $derived(incomeItems.reduce((sum, item)  => sum + item.amount, 0));

  function autoCategorizePdf(concept: string, isIncome: boolean): string {
    const upperConcept = concept.toUpperCase();
    if (isIncome) {
      if (/NOMIN|SALAR/.test(upperConcept))   return 'salary';
      if (/BIZUM/.test(upperConcept))          return 'bizum_in';
      if (/TRANSFER|INGRES/.test(upperConcept)) return 'transfer_in';
      return 'income_other';
    }
    for (const rule of PDF_AUTOCATEGORIZATION_RULES) {
      if (rule.pattern.test(upperConcept)) return rule.categoryId;
    }
    return 'other';
  }

  function parseRow(rowText: string): Omit<ParsedImportItem, 'internalId' | 'isSelected'> | null {
    const dateMatch = rowText.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) return null;

    const dateString = dateMatch[1];
    const datePosition = rowText.indexOf(dateString);
    const concept = rowText.substring(0, datePosition).trim();

    const skipWords = ['Concepte', 'Concept', 'Titular', 'Període', 'Import', 'Saldo', 'Data'];
    if (!concept || concept.length < 2 || skipWords.some(word => concept.includes(word))) return null;

    const afterDate = rowText.substring(datePosition + dateString.length);
    const amountMatches = [...afterDate.matchAll(/([+-]?\d{1,3}(?:\.\d{3})*,\d{2})€?/g)];
    if (!amountMatches.length) return null;

    const rawAmount = parseFloat(amountMatches[0][1].replace(/\./g, '').replace(',', '.'));
    if (isNaN(rawAmount) || rawAmount === 0) return null;

    const [day, month, year] = dateString.split('/');
    const isoDate = new Date(+year, +month - 1, +day).toISOString();
    const isIncome = rawAmount > 0;

    return {
      concept: concept.trim(),
      amount: Math.abs(rawAmount),
      date: isoDate,
      type: isIncome ? 'income' : 'expense',
      categoryId: autoCategorizePdf(concept, isIncome),
      paymentMethod: isIncome ? 'transfer' : 'card',
    };
  }

  async function extractTransactionsFromPdf(pdfDocument: unknown): Promise<Omit<ParsedImportItem, 'internalId' | 'isSelected'>[]> {
    const parsedTransactions: Omit<ParsedImportItem, 'internalId' | 'isSelected'>[] = [];
    const doc = pdfDocument as { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[] }> }> }> };

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();

      const rowsByYPosition = new Map<number, Array<{ text: string; x: number }>>();
      for (const item of textContent.items) {
        if (!item.str.trim()) continue;
        const yPosition = Math.round(item.transform[5] / 4) * 4;
        if (!rowsByYPosition.has(yPosition)) rowsByYPosition.set(yPosition, []);
        rowsByYPosition.get(yPosition)!.push({ text: item.str, x: item.transform[4] });
      }

      const rows = [...rowsByYPosition.entries()]
        .sort(([a], [b]) => b - a)
        .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').trim());

      for (const row of rows) {
        const parsed = parseRow(row);
        if (parsed) parsedTransactions.push(parsed);
      }
    }

    // Deduplicate by concept+date+amount
    const seen = new Set<string>();
    return parsedTransactions.filter(t => {
      const key = t.concept + t.date + t.amount;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  export async function loadPdfFile(file: File) {
    importState = 'loading';
    try {
      const pdfjs = (window as unknown as { pdfjsLib: { getDocument: (opts: unknown) => { promise: Promise<unknown> }; GlobalWorkerOptions: { workerSrc: string } } }).pdfjsLib;
      if (!pdfjs) throw new Error('PDF.js no disponible. Necessites connexió a internet.');

      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const pdfDocument = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const parsed = await extractTransactionsFromPdf(pdfDocument);

      if (!parsed.length) {
        importState = 'error';
        errorMessage = 'No s\'han trobat moviments al PDF';
        return;
      }

      importItems = parsed.map((item, index) => ({ ...item, internalId: index, isSelected: true }));
      importState = 'review';
    } catch (error: unknown) {
      importState = 'error';
      errorMessage = (error as Error).message ?? 'Error desconegut';
    }
  }

  function toggleItemSelection(internalId: number) {
    importItems = importItems.map(item =>
      item.internalId === internalId ? { ...item, isSelected: !item.isSelected } : item
    );
  }

  function changeCategoryForItem(internalId: number, newCategoryId: string) {
    importItems = importItems.map(item =>
      item.internalId === internalId ? { ...item, categoryId: newCategoryId } : item
    );
  }

  function confirmImport() {
    const selectedItems = importItems.filter(item => item.isSelected);
    if (!selectedItems.length) { showToast('Selecciona almenys un moviment'); return; }

    const existingIds = new Set(getTransactions().map(t => t.id));
    const now = Date.now();

    selectedItems.forEach((item, index) => {
      const newTransaction: Transaction = {
        id: (now + index).toString(36) + index,
        type: item.type,
        amount: item.amount,
        categoryId: item.categoryId,
        paymentMethod: item.paymentMethod,
        note: item.concept,
        date: item.date,
        linkedIncomeIds: [],
        linkedExpenseId: null,
      };
      if (!existingIds.has(newTransaction.id)) addTransaction(newTransaction);
    });

    showToast(`${selectedItems.length} moviment${selectedItems.length !== 1 ? 's' : ''} importat${selectedItems.length !== 1 ? 's' : ''} ✓`);
    closeModal();
  }
</script>

<svelte:head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
</svelte:head>

<div class="overlay open" onclick={closeModal} onkeydown={(e) => e.key === "Escape" && closeModal()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" style="max-height: 90%" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="modal-nav">
      <button class="modal-cancel" onclick={closeModal}>Cancel·la</button>
      <span class="modal-title">Importar PDF</span>
      {#if importState === 'review'}
        <button class="modal-save" onclick={confirmImport}>Importar</button>
      {:else}
        <span style="width: 60px"></span>
      {/if}
    </div>

    {#if importState === 'loading'}
      <div class="import-status">
        <div class="loading-spinner"></div>
        Analitzant extracte bancari...
      </div>
    {:else if importState === 'error'}
      <div class="import-status">❌ Error: {errorMessage}</div>
    {:else}
      <div class="import-badges">
        <div class="import-badge blue">
          <div class="import-badge-value">{importItems.length}</div>
          <div class="import-badge-label">Moviments</div>
        </div>
        <div class="import-badge red">
          <div class="import-badge-value">{formatCurrency(totalExpenses)}</div>
          <div class="import-badge-label">Despeses</div>
        </div>
        <div class="import-badge green">
          <div class="import-badge-value">{formatCurrency(totalIncomes)}</div>
          <div class="import-badge-label">Ingressos</div>
        </div>
      </div>

      <div class="modal-scroll">
        {#each importItems as item, index}
          {@const availableCategories = item.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES}
          <div class="import-item">
            <div
              class="import-item-checkbox {item.isSelected ? item.type : ''}"
              onclick={() => toggleItemSelection(item.internalId)}
              role="checkbox"
              aria-checked={item.isSelected}
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && toggleItemSelection(item.internalId)}
            >
              {#if item.isSelected}✓{/if}
            </div>
            <div class="import-item-info">
              <div class="import-item-concept">{item.concept}</div>
              <div class="import-item-date">
                {new Date(item.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' })}
              </div>
            </div>
            <div class="import-item-right">
              <div class="import-item-amount" style="color: {item.type === 'income' ? 'var(--color-green)' : 'var(--color-red)'}">
                {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
              </div>
              <select
                class="import-category-select"
                value={item.categoryId}
                onchange={(e) => changeCategoryForItem(item.internalId, (e.target as HTMLSelectElement).value)}
              >
                {#each availableCategories as category}
                  <option value={category.id}>{category.icon} {category.label}</option>
                {/each}
              </select>
            </div>
          </div>
          {#if index < importItems.length - 1}
            <div class="row-separator" style="margin-left: 16px"></div>
          {/if}
        {/each}
        <div style="height: 16px"></div>
      </div>

      <div class="import-footer">
        <button class="import-confirm-button" onclick={confirmImport}>
          Importar {selectedCount} moviment{selectedCount !== 1 ? 's' : ''}
        </button>
      </div>
    {/if}
  </div>
</div>
