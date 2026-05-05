<script lang="ts">
  let { items, onClose }: {
    items: Array<{ label: string; destructive?: boolean; action: () => void }>;
    onClose: () => void;
  } = $props();

  function handleItemClick(action: () => void) {
    onClose();
    setTimeout(action, 100);
  }
</script>

<div class="action-sheet-overlay open" onclick={onClose} onkeydown={(e) => e.key === "Escape" && onClose()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="action-sheet" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="action-sheet-group">
      {#each items as item}
        <div
          class="action-sheet-item {item.destructive ? 'destructive' : ''}"
          onclick={() => handleItemClick(item.action)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && handleItemClick(item.action)}
        >
          {item.label}
        </div>
      {/each}
    </div>
    <button class="action-sheet-cancel" onclick={onClose}>Cancel·la</button>
  </div>
</div>
