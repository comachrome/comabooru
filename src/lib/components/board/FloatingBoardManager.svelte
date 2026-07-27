<script lang="ts">
  import { getBoardService, getGalleryService } from '../../services/context';
  import { SlidersHorizontal, X, Check } from 'lucide-svelte';

  interface Props {
    isBoardModalOpen?: boolean;
    variant?: 'floating' | 'drawer';
    onSelect?: (() => void) | undefined;
  }

  let {
    isBoardModalOpen = $bindable(false),
    variant = 'floating',
    onSelect = undefined
  }: Props = $props();

  let boardService = getBoardService();
  let gallery = getGalleryService();

  function handleSwitchBoard(boardId: string) {
    if (boardId !== boardService.activeBoardId) {
      boardService.selectBoard(boardId);
      gallery.search('');
    }
    if (onSelect) onSelect();
  }

  function handleDeleteBoard(e: MouseEvent, boardId: string, name: string) {
    e.stopPropagation();
    if (confirm(`Удалить доску "${name}"?`)) {
      const isDeletingActive = boardId === boardService.activeBoardId;
      boardService.deleteBoard(boardId);
      if (isDeletingActive) {
        gallery.search('');
      }
    }
  }

  function cleanDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
</script>

{#if variant === 'drawer'}
  <div class="drawer-board-manager">
    <div class="drawer-board-list">
      {#each boardService.boards as board (board.id)}
        <div
          class="drawer-board-card"
          class:active={board.id === boardService.activeBoardId}
          onclick={() => handleSwitchBoard(board.id)}
          role="button"
          tabindex="0"
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSwitchBoard(board.id)}
        >
          <div class="drawer-board-info">
            <div class="drawer-board-title">
              <span class="drawer-pill-dot"></span>
              <span class="drawer-board-name">{board.name}</span>
            </div>
            <span class="drawer-board-url">{cleanDomain(board.booruUrl)}</span>
          </div>

          <div class="drawer-board-right">
            {#if board.id === boardService.activeBoardId}
              <span class="active-badge"><Check size={13} /> Активно</span>
            {/if}
            {#if boardService.boards.length > 1}
              <button
                class="drawer-delete-btn"
                onclick={(e) => handleDeleteBoard(e, board.id, board.name)}
                title="Удалить доску"
              >
                <X size={14} />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <button
      class="drawer-manage-btn"
      onclick={() => { if (!isBoardModalOpen) isBoardModalOpen = true; if (onSelect) onSelect(); }}
    >
      <SlidersHorizontal size={15} />
      <span>Управление досками (Добавить / Настроить)</span>
    </button>
  </div>
{:else}
  <div class="floating-board-container glass-panel">
    {#if boardService.boards.length > 0}
      <div class="board-pills">
        {#each boardService.boards as board (board.id)}
          <div
            class="board-pill"
            class:active={board.id === boardService.activeBoardId}
            onclick={() => handleSwitchBoard(board.id)}
            title={`Переключиться на ${board.name} (${board.booruUrl})`}
            role="button"
            tabindex="0"
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSwitchBoard(board.id)}
          >
            <span class="pill-dot"></span>
            <span class="pill-name">{board.name}</span>
            {#if boardService.boards.length > 1}
              <button
                class="pill-delete-btn"
                onclick={(e) => handleDeleteBoard(e, board.id, board.name)}
                title="Удалить доску"
              >
                <X size={12} />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <button
      class="floating-settings-btn"
      onclick={() => { if (!isBoardModalOpen) isBoardModalOpen = true; }}
      title="Настройки досок (Добавить / Удалить)"
    >
      <SlidersHorizontal size={17} />
      {#if boardService.boards.length <= 1}
        <span class="btn-label">Доски</span>
      {/if}
    </button>
  </div>
{/if}

<style>
  /* Drawer Mode Styles (Mobile Menu) */
  .drawer-board-manager {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: 100%;
  }

  .drawer-board-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    width: 100%;
  }

  .drawer-board-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 0.85rem;
    border-radius: 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border-glass);
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    cursor: pointer;
    user-select: none;
    outline: none;
  }

  .drawer-board-card:focus-visible {
    border-color: var(--border-focus);
  }

  .drawer-board-card:hover {
    border-color: var(--border-focus);
    background: rgba(255, 255, 255, 0.04);
  }

  .drawer-board-card.active {
    background: rgba(99, 102, 241, 0.12);
    border-color: var(--color-accent-primary);
  }

  .drawer-board-card.active .drawer-pill-dot {
    background-color: var(--color-accent-primary);
    box-shadow: 0 0 8px var(--color-accent-primary);
  }

  .drawer-board-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .drawer-board-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .drawer-pill-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: var(--text-tertiary);
    flex-shrink: 0;
    transition: all 0.2s ease;
  }

  .drawer-board-name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .drawer-board-url {
    font-size: 0.75rem;
    color: var(--text-tertiary);
    padding-left: 0.9rem;
  }

  .drawer-board-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .active-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-accent-primary);
    background: rgba(99, 102, 241, 0.15);
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
  }

  .drawer-delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 6px;
    background: transparent;
    border: none;
    color: var(--text-tertiary);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .drawer-delete-btn:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
  }

  .drawer-manage-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.65rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed var(--border-glass);
    color: var(--text-secondary);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .drawer-manage-btn:hover {
    background: rgba(99, 102, 241, 0.1);
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
  }

  /* Floating Bar Mode Styles (Desktop) */
  .floating-board-container {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.35rem;
    border-radius: 9999px;
    background: var(--bg-surface);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--border-glass);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
    max-width: 100%;
    overflow: hidden;
  }

  .board-pills {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 0 0.15rem;
  }

  .board-pills::-webkit-scrollbar {
    display: none;
  }

  .board-pill {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.75rem;
    border-radius: 9999px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
    outline: none;
  }

  .board-pill:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 1px;
  }

  .board-pill:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }

  .board-pill.active {
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  }

  .pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--text-tertiary);
    transition: all 0.2s ease;
  }

  .board-pill.active .pill-dot {
    background-color: var(--text-inverse);
    box-shadow: 0 0 6px var(--text-inverse);
  }

  .pill-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pill-delete-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: transparent;
    border: none;
    color: inherit;
    opacity: 0.6;
    cursor: pointer;
    padding: 0;
    margin-left: 0.15rem;
    transition: all 0.15s ease;
  }

  .pill-delete-btn:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.2);
  }

  .floating-settings-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.4rem 0.6rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border-glass);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  .floating-settings-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    border-color: var(--border-focus);
  }

  .btn-label {
    font-size: 0.78rem;
    font-weight: 500;
  }
</style>
