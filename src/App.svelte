<script lang="ts">
  import {
    getActiveModal,
    closeModal,
    openModal,
    getToastMessage,
    isToastVisible,
    getTransactions,
    replaceAllTransactions,
    mergeTransactions,
    showToast,
    deleteTransaction,
    unlinkIncomeFromExpense,
    unlinkAllFromExpense,
  } from "./lib/state.svelte";

  import Home from "./routes/Home.svelte";
  import Movements from "./routes/Movements.svelte";
  import Summary from "./routes/Summary.svelte";

  import LockScreen from "./components/LockScreen.svelte";
  import ActionSheet from "./components/ActionSheet.svelte";
  import AddTransactionModal from "./components/AddTransactionModal.svelte";
  import CompensationModal from "./components/CompensationModal.svelte";
  import LinkIncomeModal from "./components/LinkIncomeModal.svelte";
  import PdfImportModal from "./components/PdfImportModal.svelte";
  import CategoryDetailModal from "./components/CategoryDetailModal.svelte";
  import SettingsModal from "./components/SettingsModal.svelte";

  import type { Transaction } from "./lib/types";

  type TabName = "home" | "movements" | "summary";

  const TAB_DEFINITIONS = [
    { name: "home" as TabName, icon: "🏠", label: "Inici" },
    { name: "movements" as TabName, icon: "↕️", label: "Moviments" },
    { name: "summary" as TabName, icon: "📊", label: "Resum" },
  ];

  let activeTab: TabName = $state("home");
  let isLocked = $state(true);
  let swipeStartX = 0;
  let swipeStartY = 0;

  const activeModal = $derived(getActiveModal());
  const toastMessage = $derived(getToastMessage());
  const toastVisible = $derived(isToastVisible());

  // ── Swipe between tabs ────────────────────────────────────────
  function handleTouchStart(event: TouchEvent) {
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
  }

  function handleTouchEnd(event: TouchEvent) {
    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;
    if (Math.abs(deltaX) < 60 || Math.abs(deltaY) > Math.abs(deltaX) * 0.8)
      return;
    if (activeModal.kind !== "none") return;

    const currentIndex = TAB_DEFINITIONS.findIndex(
      (tab) => tab.name === activeTab,
    );
    if (deltaX < 0 && currentIndex < TAB_DEFINITIONS.length - 1)
      activeTab = TAB_DEFINITIONS[currentIndex + 1].name;
    if (deltaX > 0 && currentIndex > 0)
      activeTab = TAB_DEFINITIONS[currentIndex - 1].name;
  }

  // ── Transaction action sheet items ────────────────────────────
  function buildTransactionActionItems(transactionId: string) {
    const transaction = getTransactions().find((t) => t.id === transactionId);
    if (!transaction) return [];

    const isExpense = transaction.type === "expense";
    const isLinkedIncome =
      transaction.type === "income" && !!transaction.linkedExpenseId;
    const isUnlinkedIncome =
      transaction.type === "income" && !transaction.linkedExpenseId;
    const hasCompensations =
      isExpense && (transaction.linkedIncomeIds?.length ?? 0) > 0;

    const items: Array<{
      label: string;
      destructive?: boolean;
      action: () => void;
    }> = [
      {
        label: "✏️ Editar",
        action: () =>
          openModal({
            kind: "add",
            transactionType: transaction.type,
            editingId: transactionId,
          }),
      },
    ];
    if (isExpense)
      items.push({
        label: "💬 Compensar amb ingressos",
        action: () =>
          openModal({ kind: "compensation", expenseId: transactionId }),
      });
    if (hasCompensations)
      items.push({
        label: "🔓 Eliminar compensacions",
        action: () => {
          unlinkAllFromExpense(transactionId);
          showToast("Compensacions eliminades");
        },
      });
    if (isUnlinkedIncome)
      items.push({
        label: "🔗 Vincular a una despesa",
        action: () =>
          openModal({ kind: "link-income", incomeId: transactionId }),
      });
    if (isLinkedIncome)
      items.push({
        label: "🔓 Desvincular de despesa",
        action: () => {
          unlinkIncomeFromExpense(transactionId);
          showToast("Vinculació eliminada");
        },
      });
    items.push({
      label: "🗑️ Eliminar",
      destructive: true,
      action: () => {
        deleteTransaction(transactionId);
        showToast("Moviment eliminat");
      },
    });

    return items;
  }

  // ── Import backup action sheet items ─────────────────────────
  function buildImportActionItems(importData: Transaction[]) {
    return [
      {
        label: `Substituir tot (${importData.length} moviments)`,
        action: () => {
          replaceAllTransactions(importData);
          showToast(`${importData.length} moviments restaurats ✓`);
        },
      },
      {
        label: "Combinar (mantenir existents + afegir nous)",
        action: () => {
          const added = mergeTransactions(importData);
          showToast(`${added} moviments nous afegits ✓`);
        },
      },
    ];
  }

  // ── PDF import ────────────────────────────────────────────────
  let pdfImportModalRef: ReturnType<typeof PdfImportModal> | undefined =
    $state();

  $effect(() => {
    const modal = activeModal;
    if (
      modal.kind === "pdf-import" &&
      "file" in modal &&
      modal.file &&
      pdfImportModalRef
    ) {
      (
        pdfImportModalRef as unknown as { loadPdfFile: (f: File) => void }
      ).loadPdfFile(modal.file as File);
    }
  });
</script>

<div
  id="app"
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
  role="application"
>
  {#if isLocked}
    <LockScreen
      onUnlock={() => {
        isLocked = false;
      }}
    />
  {/if}

  <!-- ── Home screen ── -->
  <div class="screen {activeTab === 'home' ? 'active' : ''}">
    <Home
      onNavigateToMovements={() => {
        activeTab = "movements";
      }}
    />
    <div class="tab-bar">
      {#each TAB_DEFINITIONS as tab}
        <div
          class="tab-item {activeTab === tab.name ? 'active' : ''}"
          onclick={() => {
            activeTab = tab.name;
          }}
          role="tab"
          tabindex="0"
          onkeydown={(e) => e.key === "Enter" && (activeTab = tab.name)}
        >
          <div class="tab-item-inner">
            <div class="tab-icon">{tab.icon}</div>
            <div class="tab-label">{tab.label}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- ── Movements screen ── -->
  <div class="screen {activeTab === 'movements' ? 'active' : ''}">
    <Movements />
    <div class="tab-bar">
      {#each TAB_DEFINITIONS as tab}
        <div
          class="tab-item {activeTab === tab.name ? 'active' : ''}"
          onclick={() => {
            activeTab = tab.name;
          }}
          role="tab"
          tabindex="0"
          onkeydown={(e) => e.key === "Enter" && (activeTab = tab.name)}
        >
          <div class="tab-item-inner">
            <div class="tab-icon">{tab.icon}</div>
            <div class="tab-label">{tab.label}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- ── Summary screen ── -->
  <div class="screen {activeTab === 'summary' ? 'active' : ''}">
    <Summary />
    <div class="tab-bar">
      {#each TAB_DEFINITIONS as tab}
        <div
          class="tab-item {activeTab === tab.name ? 'active' : ''}"
          onclick={() => {
            activeTab = tab.name;
          }}
          role="tab"
          tabindex="0"
          onkeydown={(e) => e.key === "Enter" && (activeTab = tab.name)}
        >
          <div class="tab-item-inner">
            <div class="tab-icon">{tab.icon}</div>
            <div class="tab-label">{tab.label}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- ── Modals ── -->
  {#if activeModal.kind === "add"}
    <AddTransactionModal
      initialType={activeModal.transactionType}
      editingId={activeModal.editingId ?? null}
    />
  {/if}

  {#if activeModal.kind === "compensation"}
    <CompensationModal expenseId={activeModal.expenseId} />
  {/if}

  {#if activeModal.kind === "link-income"}
    <LinkIncomeModal incomeId={activeModal.incomeId} />
  {/if}

  {#if activeModal.kind === "pdf-import"}
    <PdfImportModal bind:this={pdfImportModalRef} />
  {/if}

  {#if activeModal.kind === "category-detail"}
    <CategoryDetailModal
      categoryId={activeModal.categoryId}
      transactionType={activeModal.transactionType}
      monthOffset={activeModal.monthOffset}
    />
  {/if}

  {#if activeModal.kind === "settings"}
    <SettingsModal />
  {/if}

  {#if activeModal.kind === "action-sheet"}
    {#if "menuItems" in activeModal && activeModal.menuItems}
      <ActionSheet items={activeModal.menuItems} onClose={closeModal} />
    {:else if "importData" in activeModal && activeModal.importData}
      <ActionSheet
        items={buildImportActionItems(activeModal.importData as Transaction[])}
        onClose={closeModal}
      />
    {:else if activeModal.transactionId}
      <ActionSheet
        items={buildTransactionActionItems(activeModal.transactionId)}
        onClose={closeModal}
      />
    {/if}
  {/if}

  <div class="toast {toastVisible ? 'visible' : ''}">{toastMessage}</div>
</div>
