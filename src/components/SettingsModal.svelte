<script lang="ts">
  import { getAccounts, addAccount, deleteAccount, showToast, closeModal } from '../lib/state.svelte';

  const cards = $derived(getAccounts().filter(account => account.type === 'card'));
  const banks = $derived(getAccounts().filter(account => account.type === 'bank'));

  function promptAndAddAccount(type: 'card' | 'bank') {
    const typeLabel = type === 'card' ? 'targeta (ex: Visa BBVA)' : 'banc (ex: BBVA)';
    const name = prompt(`Nom de la/del ${typeLabel}:`);
    if (!name || !name.trim()) return;
    addAccount(type, name.trim());
    showToast('Compte afegit ✓');
  }

  function handleDeleteAccount(id: string) {
    deleteAccount(id);
    showToast('Compte eliminat');
  }
</script>

<div class="overlay open" onclick={closeModal} onkeydown={(e) => e.key === "Escape" && closeModal()} role="dialog" aria-modal="true" tabindex="-1">
  <div class="modal" onclick={(e) => e.stopPropagation()} role="presentation">
    <div class="modal-nav">
      <button class="modal-cancel" onclick={closeModal}>Tancar</button>
      <span class="modal-title">Configuració</span>
      <span style="width: 60px"></span>
    </div>

    <div class="modal-scroll">
      <div class="form-section" style="margin-top: 8px">
        <div class="form-label">TARGETES</div>
        <div class="card">
          {#if cards.length === 0}
            <div style="padding: 14px; color: var(--color-gray); font-size: 14px; text-align: center">Sense targetes configurades</div>
          {:else}
            {#each cards as card, index}
              <div class="settings-row">
                <span class="settings-row-icon">💳</span>
                <span class="settings-row-label">{card.name}</span>
                <button class="settings-delete-button" onclick={() => handleDeleteAccount(card.id)}>✕</button>
              </div>
              {#if index < cards.length - 1}
                <div class="row-separator" style="margin-left: 52px"></div>
              {/if}
            {/each}
          {/if}
        </div>
        <button
          onclick={() => promptAndAddAccount('card')}
          style="margin-top: 10px; color: var(--color-blue); background: none; border: none; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 4px 0"
        >＋ Afegir targeta</button>
      </div>

      <div class="form-section">
        <div class="form-label">BANCS</div>
        <div class="card">
          {#if banks.length === 0}
            <div style="padding: 14px; color: var(--color-gray); font-size: 14px; text-align: center">Sense bancs configurats</div>
          {:else}
            {#each banks as bank, index}
              <div class="settings-row">
                <span class="settings-row-icon">🏦</span>
                <span class="settings-row-label">{bank.name}</span>
                <button class="settings-delete-button" onclick={() => handleDeleteAccount(bank.id)}>✕</button>
              </div>
              {#if index < banks.length - 1}
                <div class="row-separator" style="margin-left: 52px"></div>
              {/if}
            {/each}
          {/if}
        </div>
        <button
          onclick={() => promptAndAddAccount('bank')}
          style="margin-top: 10px; color: var(--color-blue); background: none; border: none; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; padding: 4px 0"
        >＋ Afegir banc</button>
      </div>

      <div style="height: 24px"></div>
    </div>
  </div>
</div>
