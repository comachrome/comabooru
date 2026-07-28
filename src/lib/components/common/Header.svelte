<script lang="ts">
  import SearchBar from '../search/SearchBar.svelte';
  import FloatingBoardManager from '../board/FloatingBoardManager.svelte';
  import { getGalleryService, getBoardService, getSettingsService } from '../../services/context';
  import { Settings, Moon, Sun, RefreshCw, Menu, X, Search, LayoutGrid, Film } from 'lucide-svelte';

  interface Props {
    isSettingsOpen?: boolean;
    isBoardModalOpen?: boolean;
    viewMode?: 'grid' | 'feed';
  }

  let {
    isSettingsOpen = $bindable(false),
    isBoardModalOpen = $bindable(false),
    viewMode = $bindable<'grid' | 'feed'>('grid')
  }: Props = $props();

  let gallery = getGalleryService();
  let board = getBoardService();
  let settingsService = getSettingsService();

  let isMobileMenuOpen = $state(false);
  let isMobileSearchOpen = $state(false);

  function toggleQuickTheme() {
    const currentTheme = board.getEffectiveSettings().theme;
    if (currentTheme === 'dark') settingsService.setTheme('light');
    else settingsService.setTheme('dark');
  }

  function toggleViewMode() {
    viewMode = viewMode === 'grid' ? 'feed' : 'grid';
  }

  function resetToHome() {
    gallery.search('');
    isMobileMenuOpen = false;
    isMobileSearchOpen = false;
  }

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
    if (isMobileMenuOpen) isMobileSearchOpen = false;
  }

  function toggleMobileSearch() {
    isMobileSearchOpen = !isMobileSearchOpen;
    if (isMobileSearchOpen) isMobileMenuOpen = false;
  }
</script>

<header class="app-header glass-panel">
  <div class="header-inner">
    <button class="brand" onclick={resetToHome} title="На главную">
      <div class="logo-text">
        <span class="name">coma<span class="highlight">booru</span></span>
      </div>
    </button>

    <!-- Desktop Search -->
    <div class="search-flex desktop-only">
      <SearchBar />
    </div>

    <!-- Desktop Actions -->
    <div class="header-actions desktop-only">
      <FloatingBoardManager bind:isBoardModalOpen />

      <button
        class="action-btn"
        class:active={viewMode === 'feed'}
        onclick={toggleViewMode}
        title={viewMode === 'grid' ? 'Режим ленты (TikTok)' : 'Режим сетки'}
      >
        {#if viewMode === 'grid'}
          <Film size={17} />
        {:else}
          <LayoutGrid size={17} />
        {/if}
      </button>

      <button class="action-btn" onclick={() => gallery.refresh()} title="Обновить">
        <RefreshCw size={17} />
      </button>

      <button class="action-btn" onclick={toggleQuickTheme} title="Переключить тему">
        {#if board.getEffectiveSettings().theme === 'dark'}
          <Moon size={17} />
        {:else}
          <Sun size={17} />
        {/if}
      </button>

      <button class="action-btn" onclick={() => { if (!isSettingsOpen) isSettingsOpen = true; }} title="Настройки">
        <Settings size={17} />
      </button>
    </div>

    <!-- Mobile Controls: Search Button + Burger Menu Button -->
    <div class="mobile-nav-controls mobile-only">
      <button
        class="action-btn"
        class:active={viewMode === 'feed'}
        onclick={toggleViewMode}
        title={viewMode === 'grid' ? 'Режим ленты' : 'Режим сетки'}
      >
        {#if viewMode === 'grid'}
          <Film size={18} />
        {:else}
          <LayoutGrid size={18} />
        {/if}
      </button>

      <button
        class="action-btn"
        class:active={isMobileSearchOpen}
        onclick={toggleMobileSearch}
        title="Поиск"
      >
        <Search size={18} />
      </button>

      <button
        class="action-btn"
        class:active={isMobileMenuOpen}
        onclick={toggleMobileMenu}
        title="Меню"
      >
        {#if isMobileMenuOpen}
          <X size={20} />
        {:else}
          <Menu size={20} />
        {/if}
      </button>
    </div>
  </div>

  <!-- Mobile Collapsible Search Drawer -->
  {#if isMobileSearchOpen}
    <div class="mobile-search-bar animate-fade-in mobile-only">
      <SearchBar />
    </div>
  {/if}

  <!-- Mobile Dropdown Menu Drawer -->
  {#if isMobileMenuOpen}
    <div class="mobile-menu-drawer animate-fade-in mobile-only">
      <div class="mobile-drawer-section">
        <span class="drawer-label">Выбор доски</span>
        <FloatingBoardManager
          bind:isBoardModalOpen
          variant="drawer"
          onSelect={() => isMobileMenuOpen = false}
        />
      </div>

      <div class="mobile-drawer-actions">
        <button class="drawer-action-btn" onclick={() => { toggleViewMode(); isMobileMenuOpen = false; }}>
          {#if viewMode === 'grid'}
            <Film size={16} />
            <span>Режим ленты (TikTok)</span>
          {:else}
            <LayoutGrid size={16} />
            <span>Режим сетки</span>
          {/if}
        </button>

        <button class="drawer-action-btn" onclick={() => { gallery.refresh(); isMobileMenuOpen = false; }}>
          <RefreshCw size={16} />
          <span>Обновить посты</span>
        </button>

        <button class="drawer-action-btn" onclick={() => { toggleQuickTheme(); }}>
          {#if board.getEffectiveSettings().theme === 'dark'}
            <Moon size={16} />
            <span>Светлая тема</span>
          {:else}
            <Sun size={16} />
            <span>Тёмная тема</span>
          {/if}
        </button>

        <button class="drawer-action-btn" onclick={() => { if (!isSettingsOpen) isSettingsOpen = true; isMobileMenuOpen = false; }}>
          <Settings size={16} />
          <span>Настройки</span>
        </button>
      </div>
    </div>
  {/if}
</header>

<style>
  .app-header {
    position: relative;
    z-index: 50;
    flex-shrink: 0;
    width: 100%;
    height: var(--header-height);
    border-radius: 0;
    border-top: none;
    border-left: none;
    border-right: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 1.5rem;
    background: var(--bg-surface);
  }

  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    gap: 1rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .brand:hover .name {
    color: var(--color-accent-primary);
  }

  .logo-text .name {
    font-size: 1.2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-primary);
  }

  .logo-text .highlight {
    color: var(--text-muted);
    font-weight: 400;
  }

  .search-flex {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 0 1rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .action-btn {
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    background: var(--bg-surface-elevated);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .action-btn:hover, .action-btn.active {
    border-color: rgba(255, 255, 255, 0.2);
    color: var(--text-primary);
    background: var(--bg-app);
  }

  .desktop-only {
    display: flex;
  }

  .mobile-only {
    display: none;
  }

  @media (max-width: 768px) {
    .desktop-only {
      display: none !important;
    }

    .mobile-only {
      display: flex !important;
    }

    .app-header {
      padding: 0 0.85rem;
    }

    .mobile-nav-controls {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .mobile-search-bar {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-glass);
      box-shadow: var(--shadow-lg);
      padding: 0.65rem 0.85rem;
      z-index: 99;
    }

    .mobile-menu-drawer {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-glass);
      box-shadow: var(--shadow-lg);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      z-index: 99;
    }

    .mobile-drawer-section {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .drawer-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .mobile-drawer-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .drawer-action-btn {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-surface-elevated);
      color: var(--text-primary);
      font-size: 0.9rem;
      font-weight: 500;
      width: 100%;
      border: 1px solid transparent;
      transition: all var(--transition-fast);
    }

    .drawer-action-btn:hover {
      background: var(--bg-app);
      border-color: rgba(255, 255, 255, 0.15);
    }
  }
</style>
