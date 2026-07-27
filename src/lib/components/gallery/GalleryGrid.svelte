<script lang="ts">
  import { onDestroy } from 'svelte';
  import { getGalleryService, getAuthService, getBoardService } from '../../services/context';
  import MediaCard from './MediaCard.svelte';
  import SkeletonCard from './SkeletonCard.svelte';
  import { Loader2, ArrowDown, RefreshCw } from 'lucide-svelte';
  import type { BooruPost } from '../../api/types';

  let gallery = getGalleryService();
  let auth = getAuthService();
  let board = getBoardService();

  let observer: IntersectionObserver | null = null;
  let sentinelNode = $state<HTMLElement | null>(null);
  let containerWidth = $state(1200);
  let scrollTop = $state(0);
  let viewportHeight = $state(800);
  let scrollContainer: HTMLElement | null = null;

  function handleScroll() {
    if (scrollContainer) {
      scrollTop = scrollContainer.scrollTop;
      viewportHeight = scrollContainer.clientHeight;
    } else if (typeof window !== 'undefined') {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      viewportHeight = window.innerHeight;
    }
  }

  function setupObserver(node: HTMLElement) {
    if (typeof window === 'undefined') return;
    sentinelNode = node;
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !gallery.isLoading && !gallery.isLoadingMore && gallery.hasMore && !gallery.loadMoreError) {
        gallery.loadMore();
      }
    }, { rootMargin: '600px' });
    observer.observe(node);
  }

  $effect(() => {
    // If loadMore finished, there are no errors, and sentinel is still within rootMargin viewport
    // (e.g. because blacklist filtered out all posts on that page, or content height is shorter than screen)
    if (sentinelNode && !gallery.isLoading && !gallery.isLoadingMore && gallery.hasMore && !gallery.loadMoreError) {
      const rect = sentinelNode.getBoundingClientRect();
      if (rect.top <= (window.innerHeight || 800) + 600) {
        gallery.loadMore();
      }
    }
  });

  function updateWidth(node: HTMLElement) {
    if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) {
        containerWidth = entries[0].contentRect.width;
      }
    });
    ro.observe(node);

    scrollContainer = node.closest('.main-content') as HTMLElement;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      viewportHeight = scrollContainer.clientHeight;
    } else {
      window.addEventListener('scroll', handleScroll, { passive: true });
      viewportHeight = window.innerHeight;
    }

    return {
      destroy() {
        ro.disconnect();
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', handleScroll);
        } else if (typeof window !== 'undefined') {
          window.removeEventListener('scroll', handleScroll);
        }
      }
    };
  }

  const isMobile = $derived(containerWidth <= 600);
  const gap = $derived(isMobile ? (board.getEffectiveSettings().gridDensity === 'compact' ? 6 : 8) : (board.getEffectiveSettings().gridDensity === 'compact' ? 8 : 16));
  const targetColWidth = $derived((containerWidth > 0 && board.getEffectiveSettings().gridDensity === 'compact') ? 150 : 220);
  const numCols = $derived(isMobile
    ? (board.getEffectiveSettings().gridDensity === 'compact' ? (containerWidth < 380 ? 2 : 3) : (containerWidth < 300 ? 1 : 2))
    : Math.max(1, Math.floor((containerWidth + gap) / (targetColWidth + gap))));

  const colWidth = $derived(Math.max(100, (containerWidth - gap * (numCols - 1)) / numCols));

  interface LayoutItem {
    post: BooruPost;
    top: number;
    left: number;
    width: number;
    height: number;
    col: number;
  }

  function computeMasonryLayout(postsList: BooruPost[], currentColWidth: number, colsCount: number, gapSize: number, _containerWidth?: number) {
    if (!postsList || postsList.length === 0 || currentColWidth <= 0) {
      return { items: [] as LayoutItem[], totalHeight: 0 };
    }

    const columnHeights: number[] = Array.from({ length: colsCount }, () => 0);
    const items: LayoutItem[] = [];

    for (let i = 0; i < postsList.length; i++) {
      const post = postsList[i];

      let shortestCol = 0;
      let minH = columnHeights[0];
      for (let c = 1; c < colsCount; c++) {
        if (columnHeights[c] < minH) {
          minH = columnHeights[c];
          shortestCol = c;
        }
      }

      const ratio = (post.width && post.height && post.width > 0) ? (post.height / post.width) : 1.33;
      const height = Math.round(currentColWidth * ratio);
      const top = columnHeights[shortestCol];
      const left = shortestCol * (currentColWidth + gapSize);

      items.push({
        post,
        top,
        left,
        width: currentColWidth,
        height,
        col: shortestCol
      });

      columnHeights[shortestCol] += height + gapSize;
    }

    const totalHeight = Math.max(...columnHeights, 400);
    return { items, totalHeight };
  }

  const layout = $derived(computeMasonryLayout(gallery.filteredPosts, colWidth, numCols, gap, containerWidth));

  // Virtual Window Filtering with 600px buffer
  const buffer = 600;
  const visibleItems = $derived(layout.items.filter(item => {
    const itemBottom = item.top + item.height;
    return itemBottom >= (scrollTop - buffer) && item.top <= (scrollTop + viewportHeight + buffer);
  }));

  onDestroy(() => {
    if (observer) observer.disconnect();
  });
</script>

<div class="gallery-section" use:updateWidth>
  {#if gallery.isLoading}
    <div class="skeleton-grid" style="display: grid; grid-template-columns: repeat({numCols}, 1fr); gap: {gap}px;">
      {#each Array(12) as _, idx (idx)}
        <SkeletonCard aspectRatio={idx % 3 === 0 ? '4 / 3' : (idx % 2 === 0 ? '3 / 4' : '1 / 1')} />
      {/each}
    </div>
  {:else if gallery.error}
    <div class="error-state glass-panel">
      <h3 class="kaomoji">(・_・;)</h3>
      <h3>Ошибка загрузки</h3>
      <p>{gallery.error}</p>
      <div class="error-actions">
        <button class="retry-btn" onclick={() => gallery.refresh()}>Повторить запрос</button>
        {#if gallery.error.includes('401') || gallery.error.toLowerCase().includes('unauthorized') || gallery.error.toLowerCase().includes('auth')}
          <button class="reauth-btn" onclick={() => auth.logout()}>Сбросить ключи и войти</button>
        {/if}
      </div>
    </div>
  {:else if gallery.filteredPosts.length === 0}
    <div class="empty-state">
      <h3 class="kaomoji">( ╥ω╥ )</h3>
      <h3>Посты не найдены</h3>
      {#if gallery.posts.length > 0}
        <p>Все загруженные посты ({gallery.posts.length}) были отфильтрованы вашим блэклистом или настройками рейтинга.</p>
      {:else}
        <p>Попробуйте изменить поисковые теги или проверить настройки подключения.</p>
      {/if}
    </div>
  {:else}
    <div class="virtual-masonry-container" style="position: relative; width: 100%; height: {layout.totalHeight}px;">
      {#each visibleItems as item (item.post.id)}
        <div
          class="virtual-card-wrapper"
          style="position: absolute; left: {item.left}px; top: {item.top}px; width: {item.width}px; height: {item.height}px;"
        >
          <MediaCard post={item.post} />
        </div>
      {/each}
    </div>

    <div class="infinite-controls">
      {#if gallery.isLoadingMore}
        <div class="loading-more">
          <Loader2 class="spin" size={24} />
          <span>Загрузка следующих постов...</span>
        </div>
      {:else if gallery.loadMoreError}
        <div class="load-more-error">
          <p>{gallery.loadMoreError}</p>
          <button class="retry-more-btn" onclick={() => gallery.loadMore()}>
            <RefreshCw size={14} />
            <span>Повторить загрузку</span>
          </button>
        </div>
      {:else if gallery.hasMore}
        <button class="load-more-btn" onclick={() => gallery.loadMore()}>
          <ArrowDown size={16} />
          <span>Загрузить ещё</span>
        </button>
      {:else}
        <p class="end-hint">Вы просмотрели все доступные посты.</p>
      {/if}
    </div>

    <div class="sentinel" use:setupObserver></div>
  {/if}
</div>

<style>
  .gallery-section {
    width: 100%;
    min-height: 400px;
  }

  .virtual-card-wrapper {
    will-change: transform;
    contain: layout paint style;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 5rem 1rem;
    color: var(--text-muted);
    text-align: center;
  }

  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem 1.5rem;
    max-width: 480px;
    margin: 3rem auto;
    text-align: center;
  }

  .kaomoji {
    font-size: 3rem;
    font-family: var(--font-mono);
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    font-weight: 400;
  }

  .infinite-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
  }

  .loading-more {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .load-more-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-error);
    font-size: 0.88rem;
    text-align: center;
  }

  .retry-more-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius-sm);
    background: var(--bg-surface-elevated);
    border: 1px solid var(--border-glass);
    color: var(--text-primary);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .retry-more-btn:hover {
    background: var(--bg-surface);
    border-color: var(--border-focus);
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.5rem;
    border-radius: var(--radius-sm);
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    font-weight: 600;
    font-size: 0.9rem;
    transition: all var(--transition-fast);
  }

  .load-more-btn:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .end-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .sentinel {
    height: 20px;
    width: 100%;
  }

  :global(.spin) {
    animation: spin 1s linear infinite;
    color: var(--text-primary);
  }

  .retry-btn {
    padding: 0.6rem 1.25rem;
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }

  .error-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
  }

  .reauth-btn {
    padding: 0.6rem 1.25rem;
    background: var(--bg-surface-elevated);
    border: 1px solid var(--border-glass);
    color: var(--text-primary);
    font-weight: 600;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    transition: all var(--transition-fast);
  }

  .reauth-btn:hover {
    background: var(--bg-app);
    border-color: rgba(255, 255, 255, 0.2);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
