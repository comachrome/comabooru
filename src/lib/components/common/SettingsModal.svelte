<script lang="ts">
  import { getSettingsService, getBoardService, getGalleryService } from '../../services/context';
  import {
    X, Plus, Tag, Download, SlidersHorizontal, Globe, RotateCcw
  } from 'lucide-svelte';

  interface Props {
    isOpen?: boolean;
  }

  let { isOpen = $bindable(false) }: Props = $props();

  let settingsService = getSettingsService();
  let boardService = getBoardService();
  let galleryService = getGalleryService();

  let activeTab = $state<'global' | 'board'>('global');
  let newBlacklistTag = $state('');
  let newBoardBlacklistTag = $state('');

  function close() {
    isOpen = false;
  }

  let wasOpen = $state(false);
  let queryOnOpen = '';
  let blacklistOnOpen = '';

  $effect(() => {
    if (isOpen && !wasOpen) {
      wasOpen = true;
      queryOnOpen = galleryService.buildEffectiveQuery(galleryService.searchQuery);
      const settings = boardService.getEffectiveSettings();
      blacklistOnOpen = JSON.stringify(settings.blacklist || []);
    } else if (!isOpen && wasOpen) {
      wasOpen = false;
      const queryOnClose = galleryService.buildEffectiveQuery(galleryService.searchQuery);
      const settings = boardService.getEffectiveSettings();
      const blacklistOnClose = JSON.stringify(settings.blacklist || []);
      
      if (queryOnOpen !== queryOnClose) {
        galleryService.refresh();
      } else if (blacklistOnOpen !== blacklistOnClose) {
        if (galleryService.filteredPosts.length < 15 && galleryService.hasMore) {
          galleryService.loadMore();
        }
      }
    }
  });

  function addGlobalBlacklistTag() {
    if (newBlacklistTag.trim()) {
      settingsService.addToBlacklist(newBlacklistTag.trim());
      newBlacklistTag = '';
    }
  }

  function removeGlobalBlacklistTag(tag: string) {
    settingsService.removeFromBlacklist(tag);
  }

  function addBoardBlacklistTag() {
    const board = boardService.activeBoard;
    if (!board || !newBoardBlacklistTag.trim()) return;
    const clean = newBoardBlacklistTag.trim().toLowerCase();
    const current = board.settings?.blacklist || [];
    if (!current.includes(clean)) {
      boardService.updateBoardSettings(board.id, {
        blacklist: [...current, clean]
      });
    }
    newBoardBlacklistTag = '';
  }

  function removeBoardBlacklistTag(tag: string) {
    const board = boardService.activeBoard;
    if (!board) return;
    const current = board.settings?.blacklist || [];
    boardService.updateBoardSettings(board.id, {
      blacklist: current.filter(t => t !== tag)
    });
  }

  function handleResetBoardSettings() {
    const board = boardService.activeBoard;
    if (!board) return;
    if (confirm(`Сбросить индивидуальные настройки доски "${board.name}" к глобальным?`)) {
      boardService.resetBoardSettings(board.id);
    }
  }

  function handleBoardRatingToggle(rating: 'general' | 'sensitive' | 'questionable' | 'explicit') {
    const board = boardService.activeBoard;
    if (!board) return;

    const currentEffective = boardService.getEffectiveSettings().allowedRatings || { general: true, sensitive: true, questionable: true, explicit: true };
    const currentAllowed = board.settings?.allowedRatings || { ...currentEffective };

    const updated = {
      ...currentAllowed,
      [rating]: !currentAllowed[rating]
    };
    boardService.updateBoardSettings(board.id, { allowedRatings: updated });
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
        <div class="header-title">
          <h3>Настройки</h3>
        </div>
        <button class="close-btn" onclick={close} title="Закрыть">
          <X size={18} />
        </button>
      </div>

      <div class="tab-bar">
        <button
          class="tab-btn"
          class:active={activeTab === 'global'}
          onclick={() => activeTab = 'global'}
        >
          <Globe size={15} />
          <span>Глобальные</span>
        </button>
        {#if boardService.activeBoard}
          <button
            class="tab-btn"
            class:active={activeTab === 'board'}
            onclick={() => activeTab = 'board'}
          >
            <SlidersHorizontal size={15} />
            <span>Доска: {boardService.activeBoard.name}</span>
          </button>
        {/if}
      </div>

      <div class="modal-body">
        {#if activeTab === 'global'}
          <!-- GLOBAL SETTINGS TAB -->

          <!-- Theme Section -->
          <div class="section">
            <h4>Тема оформления</h4>
            <div class="segmented-control">
              <button
                class="segment-btn"
                class:active={settingsService.settings.theme === 'dark'}
                onclick={() => settingsService.setTheme('dark')}
              >
                <span>Тёмная</span>
              </button>
              <button
                class="segment-btn"
                class:active={settingsService.settings.theme === 'light'}
                onclick={() => settingsService.setTheme('light')}
              >
                <span>Светлая</span>
              </button>
            </div>
          </div>

          <!-- Density Section -->
          <div class="section">
            <h4>Сетка по умолчанию</h4>
            <div class="segmented-control">
              <button
                class="segment-btn"
                class:active={settingsService.settings.gridDensity === 'compact'}
                onclick={() => settingsService.updateSettings({ gridDensity: 'compact' })}
              >
                Компактная
              </button>
              <button
                class="segment-btn"
                class:active={settingsService.settings.gridDensity === 'comfortable'}
                onclick={() => settingsService.updateSettings({ gridDensity: 'comfortable' })}
              >
                Комфортная
              </button>
            </div>
          </div>


          <!-- Media Card Options -->
          <div class="section">
            <h4>Отображение карточек</h4>
            <div class="clean-checkboxes">
              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={settingsService.settings.showRatingBadge !== false}
                  onchange={(e) => settingsService.updateSettings({ showRatingBadge: e.currentTarget.checked })}
                />
                <Tag size={14} class="check-icon" />
                <span>Плашка рейтинга (G, S, Q, E)</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={settingsService.settings.showDownloadButton !== false}
                  onchange={(e) => settingsService.updateSettings({ showDownloadButton: e.currentTarget.checked })}
                />
                <Download size={14} class="check-icon" />
                <span>Быстрое скачивание на превью</span>
              </label>
            </div>
          </div>

          <!-- Ratings Filter Section -->
          <div class="section">
            <h4>Фильтр возрастной категории</h4>
            <div class="ratings-grid">
              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={settingsService.settings.allowedRatings?.general !== false}
                  onchange={() => settingsService.toggleRating('general')}
                />
                <span class="badge-dot general">G</span>
                <span>General</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={settingsService.settings.allowedRatings?.sensitive !== false}
                  onchange={() => settingsService.toggleRating('sensitive')}
                />
                <span class="badge-dot sensitive">S</span>
                <span>Sensitive</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={settingsService.settings.allowedRatings?.questionable !== false}
                  onchange={() => settingsService.toggleRating('questionable')}
                />
                <span class="badge-dot questionable">Q</span>
                <span>Questionable</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={settingsService.settings.allowedRatings?.explicit !== false}
                  onchange={() => settingsService.toggleRating('explicit')}
                />
                <span class="badge-dot explicit">E</span>
                <span>Explicit</span>
              </label>
            </div>
          </div>

          <!-- Blacklist Section -->
          <div class="section">
            <h4>Глобальный блэклист</h4>
            <form onsubmit={(e) => { e.preventDefault(); addGlobalBlacklistTag(); }} class="blacklist-input">
              <input
                type="text"
                bind:value={newBlacklistTag}
                placeholder="Исключить тег (напр. gore)"
              />
              <button type="submit" class="add-btn">
                <Plus size={15} />
              </button>
            </form>

            <div class="blacklist-tags">
              {#if settingsService.settings.blacklist.length === 0}
                <p class="empty-hint">Блэклист пуст.</p>
              {:else}
                {#each settingsService.settings.blacklist as bTag (bTag)}
                  <span class="b-chip">
                    <span>{bTag}</span>
                    <button onclick={() => removeGlobalBlacklistTag(bTag)}>
                      <X size={12} />
                    </button>
                  </span>
                {/each}
              {/if}
            </div>
          </div>

        {:else if boardService.activeBoard}
          <!-- PER-BOARD SETTINGS TAB -->
          <div class="per-board-header">
            <div class="board-badge-info">
              <span class="b-name">{boardService.activeBoard.name}</span>
              <span class="b-url">{boardService.activeBoard.booruUrl}</span>
            </div>
            {#if boardService.activeBoard.settings && Object.keys(boardService.activeBoard.settings).length > 0}
              <button class="reset-board-btn" onclick={handleResetBoardSettings} title="Сбросить к дефолтам">
                <RotateCcw size={13} />
                <span>Сбросить настройки доски</span>
              </button>
            {/if}
          </div>

          <!-- Board Grid Density -->
          <div class="section">
            <div class="section-title-row">
              <h4>Сетка доски</h4>
              <span class="status-tag" class:override={boardService.activeBoard.settings?.gridDensity !== undefined}>
                {boardService.activeBoard.settings?.gridDensity !== undefined ? 'Кастомное' : 'Глобальное'}
              </span>
            </div>
            <div class="segmented-control">
              <button
                class="segment-btn"
                class:active={boardService.getEffectiveSettings().gridDensity === 'compact'}
                onclick={() => boardService.activeBoard && boardService.updateBoardSettings(boardService.activeBoard.id, { gridDensity: 'compact' })}
              >
                Компактная
              </button>
              <button
                class="segment-btn"
                class:active={boardService.getEffectiveSettings().gridDensity === 'comfortable'}
                onclick={() => boardService.activeBoard && boardService.updateBoardSettings(boardService.activeBoard.id, { gridDensity: 'comfortable' })}
              >
                Комфортная
              </button>
            </div>
          </div>

          <!-- Board Rating Display -->
          <div class="section">
            <div class="section-title-row">
              <h4>Карточки на этой доске</h4>
              <span class="status-tag" class:override={boardService.activeBoard.settings?.showRatingBadge !== undefined || boardService.activeBoard.settings?.showDownloadButton !== undefined}>
                {boardService.activeBoard.settings?.showRatingBadge !== undefined || boardService.activeBoard.settings?.showDownloadButton !== undefined ? 'Кастомное' : 'Глобальное'}
              </span>
            </div>
            <div class="clean-checkboxes">
              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={boardService.getEffectiveSettings().showRatingBadge !== false}
                  onchange={(e) => boardService.activeBoard && boardService.updateBoardSettings(boardService.activeBoard.id, { showRatingBadge: e.currentTarget.checked })}
                />
                <Tag size={14} class="check-icon" />
                <span>Плашка рейтинга (G, S, Q, E)</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={boardService.getEffectiveSettings().showDownloadButton !== false}
                  onchange={(e) => boardService.activeBoard && boardService.updateBoardSettings(boardService.activeBoard.id, { showDownloadButton: e.currentTarget.checked })}
                />
                <Download size={14} class="check-icon" />
                <span>Быстрое скачивание на превью</span>
              </label>
            </div>
          </div>

          <!-- Board Rating Filter -->
          <div class="section">
            <div class="section-title-row">
              <h4>Категории на этой доске</h4>
              <span class="status-tag" class:override={boardService.activeBoard.settings?.allowedRatings !== undefined}>
                {boardService.activeBoard.settings?.allowedRatings !== undefined ? 'Кастомное' : 'Глобальное'}
              </span>
            </div>
            <div class="ratings-grid">
              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={boardService.getEffectiveSettings().allowedRatings?.general !== false}
                  onchange={() => handleBoardRatingToggle('general')}
                />
                <span class="badge-dot general">G</span>
                <span>General</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={boardService.getEffectiveSettings().allowedRatings?.sensitive !== false}
                  onchange={() => handleBoardRatingToggle('sensitive')}
                />
                <span class="badge-dot sensitive">S</span>
                <span>Sensitive</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={boardService.getEffectiveSettings().allowedRatings?.questionable !== false}
                  onchange={() => handleBoardRatingToggle('questionable')}
                />
                <span class="badge-dot questionable">Q</span>
                <span>Questionable</span>
              </label>

              <label class="clean-check-label">
                <input
                  type="checkbox"
                  checked={boardService.getEffectiveSettings().allowedRatings?.explicit !== false}
                  onchange={() => handleBoardRatingToggle('explicit')}
                />
                <span class="badge-dot explicit">E</span>
                <span>Explicit</span>
              </label>
            </div>
          </div>

          <!-- Board Specific Blacklist -->
          <div class="section">
            <div class="section-title-row">
              <h4>Блэклист этой доски</h4>
              <span class="status-tag override">Дополняет глобальный</span>
            </div>
            <form onsubmit={(e) => { e.preventDefault(); addBoardBlacklistTag(); }} class="blacklist-input">
              <input
                type="text"
                bind:value={newBoardBlacklistTag}
                placeholder="Исключить тег на этой доске"
              />
              <button type="submit" class="add-btn">
                <Plus size={15} />
              </button>
            </form>

            <div class="blacklist-tags">
              {#if !boardService.activeBoard.settings?.blacklist || boardService.activeBoard.settings.blacklist.length === 0}
                <p class="empty-hint">Нет дополнительных тегов блэклиста.</p>
              {:else}
                {#each boardService.activeBoard.settings.blacklist as bTag (bTag)}
                  <span class="b-chip">
                    <span>{bTag}</span>
                    <button onclick={() => removeBoardBlacklistTag(bTag)}>
                      <X size={12} />
                    </button>
                  </span>
                {/each}
              {/if}
            </div>
          </div>

        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(8, 10, 15, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .modal-card {
    width: 100%;
    max-width: 520px;
    height: calc(100vh - 3rem);
    height: calc(100dvh - 3rem);
    max-height: calc(100vh - 3rem);
    max-height: calc(100dvh - 3rem);
    background: var(--bg-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin: auto;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    flex-shrink: 0;
  }

  .modal-header h3 {
    font-size: 1.15rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.02em;
  }

  .tab-bar {
    display: flex;
    gap: 0.35rem;
    margin-bottom: 1rem;
    background: var(--bg-app);
    padding: 0.25rem;
    border-radius: var(--radius-sm);
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.45rem 0.65rem;
    border-radius: calc(var(--radius-sm) - 2px);
    font-size: 0.82rem;
    font-weight: 500;
    color: var(--text-secondary);
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .tab-btn:hover {
    color: var(--text-primary);
  }

  .tab-btn.active {
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }


  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem;
    color: var(--text-muted);
    border-radius: 50%;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .close-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    overflow-y: auto;
    padding-right: 0.3rem;
    flex: 1;
  }

  .section {
    display: flex;
    flex-direction: column;
  }

  .section h4 {
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
  }

  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .section-title-row h4 {
    margin-bottom: 0;
  }

  .status-tag {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: var(--radius-sm);
    background: var(--bg-app);
    color: var(--text-muted);
  }

  .status-tag.override {
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    font-weight: 500;
  }

  /* Segmented Controls (3 in a row / 2 in a row) */
  .segmented-control {
    display: flex;
    background: var(--bg-app);
    padding: 0.2rem;
    border-radius: var(--radius-sm);
    gap: 0.2rem;
  }

  .segment-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.45rem 0.5rem;
    border-radius: calc(var(--radius-sm) - 2px);
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .segment-btn:hover {
    color: var(--text-primary);
  }

  .segment-btn.active {
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* Clean Checkboxes */
  .clean-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .ratings-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .clean-check-label {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.5rem 0.65rem;
    background: var(--bg-app);
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    color: var(--text-primary);
    cursor: pointer;
    user-select: none;
    transition: background var(--transition-fast);
  }

  .clean-check-label:hover {
    background: var(--bg-surface-elevated);
  }

  .clean-check-label input[type="checkbox"] {
    accent-color: var(--color-accent-primary);
    cursor: pointer;
  }

  :global(.check-icon) {
    color: var(--text-muted);
  }

  .badge-dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 4px;
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
  }

  .badge-dot.general { background: #10b981; }
  .badge-dot.sensitive { background: #f59e0b; }
  .badge-dot.questionable { background: #f97316; }
  .badge-dot.explicit { background: #ef4444; }

  .per-board-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    background: var(--bg-app);
    border-radius: var(--radius-sm);
  }

  .board-badge-info {
    display: flex;
    flex-direction: column;
  }

  .board-badge-info .b-name {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .board-badge-info .b-url {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .reset-board-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius-sm);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .reset-board-btn:hover {
    background: rgba(239, 68, 68, 0.2);
  }

  .blacklist-input {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.5rem;
  }

  .blacklist-input input {
    flex: 1;
    padding: 0.45rem 0.7rem;
    background: var(--bg-app);
    border-radius: var(--radius-sm);
    font-size: 0.82rem;
    color: var(--text-primary);
    outline: none;
  }

  .blacklist-input input:focus {
    border-color: rgba(255, 255, 255, 0.2);
  }

  .add-btn {
    padding: 0.45rem 0.75rem;
    background: var(--bg-surface-elevated);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    cursor: pointer;
  }

  .add-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .blacklist-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .b-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.2rem 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
  }

  .empty-hint {
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  @media (max-width: 768px) {
    .modal-overlay {
      padding: 0.5rem;
    }

    .modal-card {
      padding: 1rem;
      max-height: calc(100dvh - 1rem);
    }

    .ratings-grid {
      grid-template-columns: 1fr;
    }

    .segmented-control {
      flex-wrap: wrap;
    }

    .segment-btn {
      font-size: 0.76rem;
      padding: 0.35rem 0.4rem;
    }
  }
</style>
