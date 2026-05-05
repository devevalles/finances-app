<script lang="ts">
  let { onUnlock }: { onUnlock: () => void } = $props();

  const CREDENTIAL_STORAGE_KEY = 'fin_fid_v1';
  const isStandaloneMode = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

  let faceIdRingState: 'idle' | 'scanning' | 'success' = $state('idle');
  let hintText = $state('');

  const now = new Date();
  const clockText = now.toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  const rawDateText = now.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateText = rawDateText[0].toUpperCase() + rawDateText.slice(1);

  function unlock() {
    faceIdRingState = 'success';
    setTimeout(onUnlock, 400);
  }

  async function startFaceId() {
    if (!window.PublicKeyCredential || location.protocol !== 'https:') {
      hintText = 'Toca per desbloquejar';
      return;
    }

    try {
      faceIdRingState = 'scanning';
      hintText = '';

      const storedCredentialBase64 = localStorage.getItem(CREDENTIAL_STORAGE_KEY);

      if (!storedCredentialBase64) {
        hintText = 'Configura Face ID per primera vegada…';
        const credential = await navigator.credentials.create({ publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Finances', id: location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'usuari', displayName: 'Usuari' },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
          timeout: 60000,
        }});
        const rawId = new Uint8Array((credential as PublicKeyCredential).rawId);
        localStorage.setItem(CREDENTIAL_STORAGE_KEY, btoa(String.fromCharCode(...rawId)));
      } else {
        const rawId = Uint8Array.from(atob(storedCredentialBase64), char => char.charCodeAt(0));
        await navigator.credentials.get({ publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ id: rawId, type: 'public-key' }],
          userVerification: 'required',
          timeout: 60000,
        }});
      }

      unlock();
    } catch (error: unknown) {
      faceIdRingState = 'idle';
      const domError = error as DOMException;
      hintText = domError.name === 'NotAllowedError'
        ? 'Cancel·lat — toca per tornar a intentar'
        : 'Face ID no disponible — toca per desbloquejar';
    }
  }

  $effect(() => {
    if (!isStandaloneMode) { onUnlock(); return; }
    setTimeout(startFaceId, 400);
  });
</script>

<div
  class="lock-screen"
  onclick={() => { if (faceIdRingState === 'idle') startFaceId(); }}
  role="presentation"
>
  <div class="lock-clock">{clockText}</div>
  <div class="lock-date">{dateText}</div>

  <button class="lock-face-id-button" onclick={(e) => { e.stopPropagation(); startFaceId(); }}>
    <div class="face-id-ring {faceIdRingState === 'scanning' ? 'scanning' : ''} {faceIdRingState === 'success' ? 'success' : ''}">
      {#if faceIdRingState === 'success'}
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#34C759" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="5,14 11,20 23,8"/>
        </svg>
      {:else}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.8" stroke-linecap="round">
          <rect x="4" y="4" width="8" height="6" rx="2"/>
          <rect x="20" y="4" width="8" height="6" rx="2"/>
          <rect x="4" y="22" width="8" height="6" rx="2"/>
          <rect x="20" y="22" width="8" height="6" rx="2"/>
          <circle cx="12" cy="14" r="1.5" fill="rgba(255,255,255,.85)" stroke="none"/>
          <circle cx="20" cy="14" r="1.5" fill="rgba(255,255,255,.85)" stroke="none"/>
          <path d="M11 20 Q16 24 21 20"/>
        </svg>
      {/if}
    </div>
    Face ID
  </button>

  <div class="lock-hint">{hintText}</div>
</div>
