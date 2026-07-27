<script lang="ts">
  import { getBoardService, getGalleryService } from '../../services/context';
  import { testConnection } from '../../api/booruClient';
  import { getBooruAdapter, detectBooruEngine } from '../../api/adapters/booruFactory';
  import type { BooruEngine } from '../../api/types';
  import { X, Plus, Trash2, CheckCircle2, AlertCircle, Layers, Server, Key, User, Globe, Check, Loader2 } from 'lucide-svelte';

  interface Props {
    isOpen?: boolean;
  }

  let { isOpen = $bindable(false) }: Props = $props();

  const boardService = getBoardService();
  const gallery = getGalleryService();

  let name = $state('');
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

  let isTesting = $state(false);
  let errorMsg = $state('');
  let successMsg = $state('');

  function close() {
    isOpen = false;
    resetForm();
  }

  function resetForm() {
    name = '';
    booruUrl = 'https://gelbooru.com';
    userId = '';
    apiKey = '';
    engine = 'gelbooru';
    errorMsg = '';
    successMsg = '';
  }

  function handleSelectBoard(boardId: string) {
    boardService.selectBoard(boardId);
    gallery.search('');
    close();
  }

  function handleDeleteBoard(boardId: string, boardName: string) {
    if (confirm(`Вы действительно хотите удалить конфигурацию "${boardName}"?`)) {
      const isDeletingActive = boardId === boardService.activeBoardId;
      boardService.deleteBoard(boardId);
      if (isDeletingActive) {
        gallery.search('');
      }
    }
  }

  async function handleAddBoard() {
    errorMsg = '';
    successMsg = '';

    if (!userId.trim() || !apiKey.trim()) {
      errorMsg = `Пожалуйста, заполните ${adapter.userIdLabel} и API Key`;
      return;
    }

    let cleanUrl = booruUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    // Remove trailing slash
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    isTesting = true;

    try {
      const res = await testConnection({
        engine,
        booruUrl: cleanUrl,
        userId: userId.trim(),
        apiKey: apiKey.trim()
      });

      if (!res.success) {
        errorMsg = res.message || 'Ошибка подключения к DAPI Booru. Проверьте реквизиты.';
        isTesting = false;
        return;
      }

      const newBoard = boardService.addBoard({
        name: name.trim() || (engine === 'danbooru' ? 'Danbooru Board' : 'Gelbooru Board'),
        engine,
        booruUrl: cleanUrl,
        userId: userId.trim(),
        apiKey: apiKey.trim()
      });

      successMsg = `Доска "${newBoard.name}" успешно добавлена!`;
      gallery.search('');
      setTimeout(() => {
        close();
      }, 600);
    } catch (e: unknown) {
      errorMsg = (e as { message?: string })?.message || 'Не удалось выполнить проверку авторизации.';
    } finally {
      isTesting = false;
    }
  }
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && close()}
  >
    <div class="modal-card animate-fade-in">
      <div class="modal-header">
        <div class="title-with-icon">
          <div class="icon-badge">
            <Layers size={18} />
          </div>
          <div>
            <h3>Управление Booru Досками</h3>
            <p class="subtitle">Переключайтесь между конфигурациями или добавляйте новые</p>
          </div>
        </div>
        <button class="close-btn" onclick={close} title="Закрыть">
          <X size={20} />
        </button>
      </div>

      <div class="modal-body">
        <!-- Section 1: Existing Boards List -->
        <div class="section">
          <h4>Сохраненные доски</h4>
          <div class="boards-list">
            {#if boardService.boards.length === 0}
              <div class="empty-boards">Нет сохраненных конфигураций.</div>
            {:else}
              {#each boardService.boards as board (board.id)}
                <div class="board-card" class:active={board.id === boardService.activeBoardId}>
                  <div class="board-info">
                    <div class="board-title-row">
                      <span class="board-name">{board.name}</span>
                      {#if board.id === boardService.activeBoardId}
                        <span class="active-badge">
                          <Check size={12} />
                          Активная
                        </span>
                      {/if}
                    </div>
                    <div class="board-meta">
                      <span><Globe size={12} /> {board.booruUrl}</span>
                      <span><User size={12} /> {getBooruAdapter(board.engine || board.booruUrl).userIdLabel}: {board.userId}</span>
                    </div>
                  </div>

                  <div class="board-actions">
                    {#if board.id !== boardService.activeBoardId}
                      <button
                        class="btn-switch"
                        onclick={() => handleSelectBoard(board.id)}
                      >
                        Выбрать
                      </button>
                    {/if}
                    <button
                      class="btn-delete"
                      onclick={() => handleDeleteBoard(board.id, board.name)}
                      title="Удалить конфигурацию"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Section 2: Add New Board Form -->
        <div class="section add-section">
          <h4><Plus size={16} /> Добавить новую конфигурацию</h4>

          {#if errorMsg}
            <div class="alert alert-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          {/if}

          {#if successMsg}
            <div class="alert alert-success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          {/if}

          <form onsubmit={(e) => { e.preventDefault(); handleAddBoard(); }} class="add-form">
            <div class="form-group">
              <label for="board-name">Название доски</label>
              <div class="input-wrapper">
                <Server class="input-icon" size={16} />
                <input
                  id="board-name"
                  type="text"
                  bind:value={name}
                  disabled={isTesting}
                  placeholder="Например: Gelbooru Main, Danbooru..."
                />
              </div>
            </div>

            <div class="form-group">
              <label for="board-url">URL booru платформы</label>
              <div class="preset-row">
                <button
                  type="button"
                  class="preset-btn"
                  class:active={engine === 'gelbooru'}
                  disabled={isTesting}
                  onclick={() => { booruUrl = 'https://gelbooru.com'; engine = 'gelbooru'; }}
                >
                  Gelbooru
                </button>
                <button
                  type="button"
                  class="preset-btn"
                  class:active={engine === 'danbooru'}
                  disabled={isTesting}
                  onclick={() => { booruUrl = 'https://danbooru.donmai.us'; engine = 'danbooru'; }}
                >
                  Danbooru
                </button>
              </div>
              <div class="input-wrapper">
                <Globe class="input-icon" size={16} />
                <input
                  id="board-url"
                  type="text"
                  bind:value={booruUrl}
                  disabled={isTesting}
                  placeholder={adapter.defaultUrl}
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="board-user-id">{adapter.userIdLabel}</label>
                <div class="input-wrapper">
                  <User class="input-icon" size={16} />
                  <input
                    id="board-user-id"
                    type="text"
                    bind:value={userId}
                    disabled={isTesting}
                    placeholder={engine === 'danbooru' ? 'username' : '123456'}
                    required
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="board-api-key">API Key</label>
                <div class="input-wrapper">
                  <Key class="input-icon" size={16} />
                  <input
                    id="board-api-key"
                    type="password"
                    bind:value={apiKey}
                    disabled={isTesting}
                    placeholder="Пример: 6a7b8c..."
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" class="submit-btn" disabled={isTesting}>
              {#if isTesting}
                <Loader2 class="spin" size={16} />
                <span>Проверка подключения ({engine})...</span>
              {:else}
                <Plus size={16} />
                <span>Проверить и добавить доску</span>
              {/if}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(10, 11, 18, 0.85);
    backdrop-filter: blur(12px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .modal-card {
    width: 100%;
    max-width: 580px;
    max-height: calc(100vh - 3rem); /* fallback */
    max-height: calc(100dvh - 3rem);
    background: var(--bg-surface);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin: auto;
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-glass);
    flex-shrink: 0;
  }

  .title-with-icon {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-badge {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-header h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }

  .subtitle {
    font-size: 0.82rem;
    color: var(--text-muted);
    margin: 0.2rem 0 0 0;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.45rem;
    color: var(--text-secondary);
    border-radius: var(--radius-full);
    background: var(--bg-app);
    border: 1px solid var(--border-glass);
    transition: all var(--transition-fast);
  }

  .close-btn:hover {
    color: var(--text-primary);
    background: var(--bg-surface-elevated);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-y: auto;
    padding-right: 0.4rem;
  }

  .section h4 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .boards-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .empty-boards {
    padding: 1rem;
    text-align: center;
    font-size: 0.85rem;
    color: var(--text-muted);
    background: var(--bg-app);
    border-radius: var(--radius-sm);
  }

  .board-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    background: var(--bg-app);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast), background var(--transition-fast);
  }

  .board-card.active {
    background: var(--bg-surface-elevated);
  }

  .board-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--text-primary);
  }

  .board-title-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .active-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    border-radius: var(--radius-full);
  }

  .board-meta {
    display: flex;
    gap: 0.85rem;
    margin-top: 0.3rem;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .board-meta span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .board-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-switch {
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    transition: opacity var(--transition-fast);
  }

  .btn-switch:hover {
    opacity: 0.85;
  }

  .btn-delete {
    padding: 0.45rem;
    border-radius: var(--radius-sm);
    background: rgba(239, 68, 68, 0.1);
    color: var(--color-error);
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  .btn-delete:hover {
    background: rgba(239, 68, 68, 0.25);
  }

  .add-section {
    padding-top: 1rem;
    border-top: 1px dashed var(--border-glass);
  }

  .add-form {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;

    background: var(--bg-app);
    padding: 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border-glass);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .form-group label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .preset-row {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.2rem;
  }

  .preset-btn {
    flex: 1;
    padding: 0.35rem 0.6rem;
    font-size: 0.78rem;
    font-weight: 600;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
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

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  :global(.input-icon) {
    position: absolute;
    left: 0.75rem;
    color: var(--text-muted);

    pointer-events: none;
  }

  .input-wrapper input {
    width: 100%;
    padding: 0.6rem 0.75rem 0.6rem 2.3rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  .input-wrapper input:focus {
    border-color: var(--color-accent-primary);
    outline: none;
  }

  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-card {
      padding: 1rem;
      max-height: calc(100dvh - 1rem);
    }

    .board-card {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .board-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }

  .alert {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    border-radius: var(--radius-sm);
    font-size: 0.83rem;
    margin-bottom: 0.75rem;
  }

  .alert-error {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--color-error);
  }

  .alert-success {
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.3);
    color: #22c55e;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-radius: var(--radius-md);
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    font-size: 0.9rem;
    margin-top: 0.3rem;
    cursor: pointer;
    border: none;
    transition: transform var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast);
    user-select: none;
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--color-accent-primary-hover, rgba(99, 102, 241, 0.9));
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
  }

  .submit-btn:active:not(:disabled) {
    transform: translateY(0) scale(0.98);
  }

  .submit-btn:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
