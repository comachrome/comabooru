<script lang="ts">
  import { onMount } from 'svelte';
  import { createServices, setAppServices } from './lib/services/context';
  import Header from './lib/components/common/Header.svelte';
  import GalleryGrid from './lib/components/gallery/GalleryGrid.svelte';
  import OnboardingModal from './lib/components/auth/OnboardingModal.svelte';
  import LightboxModal from './lib/components/gallery/LightboxModal.svelte';
  import SettingsModal from './lib/components/common/SettingsModal.svelte';
  import BoardModal from './lib/components/board/BoardModal.svelte';
  import './lib/styles/global.css';

  const services = createServices();
  setAppServices(services);

  let { auth, board, gallery } = services;

  let isSettingsOpen = $state(false);
  let isBoardModalOpen = $state(false);
  let isInitialized = $state(false);

  function syncUrl(boardId: string | null, query: string, replace = false) {
    if (typeof window === 'undefined') return;
    const parts: string[] = [];
    if (boardId) parts.push(`b=${encodeURIComponent(boardId)}`);
    if (query && query.trim()) parts.push(`q=${encodeURIComponent(query.trim())}`);

    const queryString = parts.join('&');
    const targetUrl = queryString ? `?${queryString}` : window.location.pathname;

    if (window.location.search !== (queryString ? `?${queryString}` : '')) {
      if (replace) {
        window.history.replaceState({}, '', targetUrl);
      } else {
        window.history.pushState({}, '', targetUrl);
      }
    }
  }

  function handlePopState() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlBoard = params.get('b') || params.get('board');
    const urlQuery = params.get('q') || '';

    if (urlBoard && urlBoard !== board.activeBoardId) {
      board.selectBoard(urlBoard);
    }

    if (urlQuery !== gallery.searchQuery) {
      gallery.search(urlQuery);
    }
  }

  onMount(() => {
    board.init();
    auth.init();

    const params = new URLSearchParams(window.location.search);
    const urlBoard = params.get('b') || params.get('board');
    const urlQuery = params.get('q');

    const boardsList = board.boards;
    if (urlBoard && boardsList.some(b => b.id === urlBoard)) {
      board.selectBoard(urlBoard);
    }

    const activeId = board.activeBoardId;
    const initialQuery = urlQuery !== null ? urlQuery : '';

    if (auth.credentials?.userId && auth.credentials?.apiKey) {
      gallery.search(initialQuery);
    }

    syncUrl(activeId, initialQuery, true);
    isInitialized = true;

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });

  $effect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      syncUrl(board.activeBoardId, gallery.searchQuery);
    }
  });
</script>

<div class="app-layout">
  {#if !auth.isAuthenticated}
    <OnboardingModal />
  {:else}
    <Header bind:isSettingsOpen bind:isBoardModalOpen />
    <main class="main-content">
      <div class="main-content-inner">
        <GalleryGrid />
      </div>
    </main>
    <LightboxModal />
    <!-- Modals rendered at root level to escape sticky header stacking context -->
    <SettingsModal bind:isOpen={isSettingsOpen} />
    <BoardModal bind:isOpen={isBoardModalOpen} />
  {/if}
</div>

<style>
  .app-layout {
    height: 100vh; /* fallback for browsers without dvh support */
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-app);
    color: var(--text-primary);
    overflow: hidden;
  }

  .main-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .main-content-inner {
    width: 100%;
    max-width: 1600px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  @media (max-width: 768px) {
    .main-content-inner {
      padding: 0.5rem;
    }
  }
</style>
