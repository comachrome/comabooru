<script lang="ts">
  import { testConnection } from '../../api/booruClient';
  import { getBooruAdapter, detectBooruEngine } from '../../api/adapters/booruFactory';
  import type { BooruEngine } from '../../api/types';
  import { getAuthService, getBoardService } from '../../services/context';
  import { Key, User, Globe, CheckCircle2, AlertCircle, Loader2, Sparkles, X } from 'lucide-svelte';

  const auth = getAuthService();
  const boardService = getBoardService();

  let booruUrl = $state('https://gelbooru.com');
  let userId = $state('');
  let apiKey = $state('');
  let engine = $state<BooruEngine>('gelbooru');

  const adapter = $derived(getBooruAdapter(engine));

  $effect(() => {
    if (booruUrl) {
      engine = detectBooruEngine(booruUrl);
    }
  });

  let isLoading = $state(false);
  let errorMsg = $state<string | null>(null);
  let successMsg = $state<string | null>(null);

  function handleClose() {
    auth.init();
  }

  async function handleSubmit() {
    if (!userId.trim() || !apiKey.trim()) {
      errorMsg = `Пожалуйста, заполните ${adapter.userIdLabel} и API Key.`;
      return;
    }

    isLoading = true;
    errorMsg = null;
    successMsg = null;

    const cleanUrl = booruUrl.trim() || adapter.defaultUrl;
    const creds = {
      engine,
      booruUrl: cleanUrl,
      userId: userId.trim(),
      apiKey: apiKey.trim()
    };

    const res = await testConnection(creds);
    isLoading = false;

    if (res.success) {
      successMsg = `Подключение успешно! Найдено постов: ${res.count ?? 0}. Сохранение...`;
      setTimeout(() => {
        boardService.addBoard({
          name: cleanUrl.includes('danbooru') ? 'Danbooru Main' : cleanUrl.includes('gelbooru') ? 'Gelbooru Main' : 'Booru Board',
          engine,
          booruUrl: cleanUrl,
          userId: userId.trim(),
          apiKey: apiKey.trim()
        });
      }, 600);
    } else {
      errorMsg = res.message || 'Не удалось подключиться к Booru API. Проверьте данные.';
    }
  }
</script>

<div class="onboarding-overlay">
  <div class="onboarding-card animate-fade-in">
    <div class="header">
      <div class="header-top">
        <div class="brand-badge">
          <Sparkles class="icon-sparkle" size={20} />
          <span>comabooru v1.0</span>
        </div>
        {#if auth.credentials?.userId}
          <button class="close-btn" onclick={handleClose} title="Закрыть">
            <X size={18} />
          </button>
        {/if}
      </div>
      <h2>Добро пожаловать в comabooru</h2>
      <p class="subtitle">
        Современный интерфейс для просмотра галерей *booru. Укажите ваши учётные данные для доступа к Booru API.
      </p>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="form">
      <div class="input-group">
        <label for="booru-url">
          <Globe size={16} />
          <span>Booru URL</span>
        </label>
        <div class="preset-row">
          <button
            type="button"
            class="preset-btn"
            class:active={engine === 'gelbooru'}
            onclick={() => {
              booruUrl = 'https://gelbooru.com';
              engine = 'gelbooru';
            }}
          >
            Gelbooru
          </button>
          <button
            type="button"
            class="preset-btn"
            class:active={engine === 'danbooru'}
            onclick={() => {
              booruUrl = 'https://danbooru.donmai.us';
              engine = 'danbooru';
            }}
          >
            Danbooru
          </button>
        </div>
        <input
          id="booru-url"
          type="url"
          bind:value={booruUrl}
          placeholder={adapter.defaultUrl}
          required
        />
      </div>

      <div class="input-group">
        <label for="user-id">
          <User size={16} />
          <span>{adapter.userIdLabel}</span>
        </label>
        <input
          id="user-id"
          type="text"
          bind:value={userId}
          placeholder={engine === 'danbooru' ? 'Например: username' : 'Например: 1234567'}
          required
        />
      </div>

      <div class="input-group">
        <label for="api-key">
          <Key size={16} />
          <span>API Key</span>
        </label>
        <input
          id="api-key"
          type="password"
          bind:value={apiKey}
          placeholder="Ваш API хэш/ключ"
          required
        />
        <span class="hint">
          Можно скопировать в настройках профиля Booru: <strong>My Account → Account Details → API Key</strong>.
        </span>
      </div>

      {#if errorMsg}
        <div class="alert error">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      {/if}

      {#if successMsg}
        <div class="alert success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      {/if}

      <button type="submit" class="submit-btn" disabled={isLoading}>
        {#if isLoading}
          <Loader2 class="spin" size={18} />
          <span>Проверка доступа...</span>
        {:else}
          <span>Подключиться и войти</span>
        {/if}
      </button>
    </form>
  </div>
</div>

<style>
  .onboarding-overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 11, 18, 0.85);
    backdrop-filter: blur(12px);
    padding: 1.5rem;
  }

  .onboarding-card {
    width: 100%;
    max-width: 480px;
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: 2.25rem;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    margin-bottom: 1rem;
  }

  .header-top .close-btn {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4rem;
    color: var(--text-secondary);
    border-radius: var(--radius-full);
    background: var(--bg-app);
    transition: all var(--transition-fast);
  }

  .header-top .close-btn:hover {
    color: var(--text-primary);
    background: var(--bg-surface-elevated);
  }

  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.85rem;
    border-radius: var(--radius-full);
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .brand-badge :global(.icon-sparkle) {
    color: var(--text-primary);
  }

  h2 {
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 0.92rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .input-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .preset-row {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }

  .preset-btn {
    flex: 1;
    padding: 0.45rem 0.75rem;
    font-size: 0.82rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    background: var(--bg-app);
    color: var(--text-secondary);
    border: 1px solid var(--border-glass);
    transition: all var(--transition-fast);
  }

  .preset-btn:hover {
    color: var(--text-primary);
    background: var(--bg-surface-elevated);
  }

  .preset-btn.active {
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    border-color: rgba(255, 255, 255, 0.3);
  }

  input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: var(--bg-app);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: 0.95rem;
    outline: none;
    transition: all var(--transition-fast);
  }

  input:focus {
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.06);
  }

  .hint {
    font-size: 0.78rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-sm);
    font-size: 0.88rem;
    line-height: 1.4;
  }

  .alert.error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--color-error);
  }

  .alert.success {
    background: rgba(16, 185, 129, 0.15);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: var(--color-success);
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.85rem 1.25rem;
    border-radius: var(--radius-md);
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    font-size: 1rem;
    transition: opacity var(--transition-fast), transform var(--transition-fast);
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    background: var(--color-accent-primary-hover);
  }

  .submit-btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 600px) {
    .onboarding-overlay {
      padding: 0.5rem;
    }

    .onboarding-card {
      padding: 1.25rem 1rem;
      max-height: calc(100dvh - 1rem);
      overflow-y: auto;
    }

    h2 {
      font-size: 1.3rem;
    }

    .subtitle {
      font-size: 0.85rem;
    }
  }
</style>
