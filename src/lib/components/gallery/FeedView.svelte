<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    getGalleryService,
    getSettingsService,
    getAuthService,
    getBoardService
  } from '../../services/context';
  import { getBooruPostUrl } from '../../api/booruClient';
  import { proxifyMediaUrl } from '../../api/httpUtils';
  import { buildSearchQuery, formatTagName, parseTagsString } from '../../utils/tagParser';
  import {
    ChevronUp,
    ChevronDown,
    Download,
    ExternalLink,
    Star,
    Tag as TagIcon,
    Plus,
    Minus,
    Loader2,
    ShieldAlert,
    Info,
    X,
    Maximize2
  } from 'lucide-svelte';

  interface Props {
    initialIndex?: number;
    onIndexChange?: (index: number) => void;
  }

  let { initialIndex = 0, onIndexChange }: Props = $props();

  let gallery = getGalleryService();
  let settingsService = getSettingsService();
  let auth = getAuthService();
  let board = getBoardService();

  let containerEl = $state<HTMLDivElement | null>(null);
  let currentIndex = $state(0);
  let isTagsPanelOpen = $state(false);

  $effect(() => {
    if (initialIndex > 0) {
      currentIndex = initialIndex;
    }
  });

  let pendingSearchTags = $state<string[]>([]);
  let pendingBlacklistTags = $state<string[]>([]);

  let mediaLoadingStates = $state<Record<number, boolean>>({});

  // Sync initial index if posts are available
  $effect(() => {
    if (gallery.filteredPosts.length > 0 && currentIndex >= gallery.filteredPosts.length) {
      currentIndex = Math.max(0, gallery.filteredPosts.length - 1);
    }
  });

  // Load tags state for currently active post
  $effect(() => {
    const currentPost = gallery.filteredPosts[currentIndex];
    if (currentPost) {
      pendingSearchTags = parseTagsString(gallery.searchQuery).map((t) => t.toLowerCase());
      pendingBlacklistTags = (settingsService.settings.blacklist || []).map((t) =>
        t.toLowerCase()
      );
    }
  });

  // Preload next posts and trigger loadMore when approaching the end (2-3 posts remaining)
  $effect(() => {
    const total = gallery.filteredPosts.length;
    if (total > 0 && currentIndex >= total - 3 && gallery.hasMore && !gallery.isLoadingMore) {
      gallery.loadMore();
    }
  });

  // Notify parent of index change for URL state sync
  $effect(() => {
    if (onIndexChange) {
      onIndexChange(currentIndex);
    }
  });

  function scrollToIndex(index: number, smooth = true) {
    if (!containerEl) return;
    const slides = containerEl.querySelectorAll<HTMLElement>('.feed-slide');
    if (slides[index]) {
      slides[index].scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      currentIndex = index;
    }
  }

  function handleScroll() {
    if (!containerEl) return;
    const scrollTop = containerEl.scrollTop;
    const slideHeight = containerEl.clientHeight;
    if (slideHeight <= 0) return;

    const newIndex = Math.round(scrollTop / slideHeight);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < gallery.filteredPosts.length) {
      currentIndex = newIndex;
    }
  }

  function scrollToPrev() {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  }

  function scrollToNext() {
    if (currentIndex < gallery.filteredPosts.length - 1) {
      scrollToIndex(currentIndex + 1);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Ignore keydown if input element is active
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
      return;
    }

    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's' || e.key === 'PageDown') {
      e.preventDefault();
      scrollToNext();
    } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === 'PageUp') {
      e.preventDefault();
      scrollToPrev();
    } else if (e.key.toLowerCase() === 'd') {
      downloadMedia(gallery.filteredPosts[currentIndex]);
    } else if (e.key.toLowerCase() === 't') {
      isTagsPanelOpen = !isTagsPanelOpen;
    }
  }

  function handleMediaLoaded(postId: number) {
    mediaLoadingStates[postId] = false;
  }

  function downloadMedia(post?: (typeof gallery.filteredPosts)[0]) {
    if (!post) return;
    const link = document.createElement('a');
    link.href = post.file_url;
    link.target = '_blank';
    link.download = `booru_${post.id}.${post.file_url.split('.').pop() || 'jpg'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function searchSingleTag(tag: string) {
    gallery.search(tag.trim().toLowerCase());
  }

  function toggleSearchTag(tag: string) {
    const lower = tag.trim().toLowerCase();
    let currentTags = parseTagsString(gallery.searchQuery).map((t) => t.toLowerCase());
    if (currentTags.includes(lower)) {
      currentTags = currentTags.filter((t) => t !== lower);
    } else {
      currentTags = [...currentTags, lower];
    }
    gallery.search(buildSearchQuery(currentTags));
  }

  function toggleBlacklistTag(tag: string) {
    const lower = tag.trim().toLowerCase();
    const currentBlacklist = settingsService.settings.blacklist || [];
    if (currentBlacklist.includes(lower)) {
      settingsService.removeFromBlacklist(lower);
    } else {
      settingsService.addToBlacklist(lower);
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
    }
    if (initialIndex > 0 && containerEl) {
      setTimeout(() => scrollToIndex(initialIndex, false), 50);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

<div class="feed-view-container">
  {#if gallery.isLoading && gallery.filteredPosts.length === 0}
    <div class="feed-loading-state">
      <Loader2 size={48} class="spin" />
      <p>Загрузка постов...</p>
    </div>
  {:else if gallery.error && gallery.filteredPosts.length === 0}
    <div class="feed-error-state">
      <ShieldAlert size={48} />
      <p>{gallery.error}</p>
      <button class="retry-btn" onclick={() => gallery.refresh()}>Попробовать снова</button>
    </div>
  {:else if gallery.filteredPosts.length === 0}
    <div class="feed-empty-state">
      <Info size={48} />
      <p>Постов не найдено</p>
    </div>
  {:else}
    <!-- Snap scroll feed container -->
    <div
      class="feed-scroll-wrapper"
      bind:this={containerEl}
      onscroll={handleScroll}
    >
      {#each gallery.filteredPosts as post, idx (post.id)}
        {@const isVideo = post.file_url.endsWith('.mp4') || post.file_url.endsWith('.webm')}
        {@const isActive = idx === currentIndex}
        {@const isNear = Math.abs(idx - currentIndex) <= 2}
        {@const tagsList = parseTagsString(post.tags)}

        <section class="feed-slide" id="feed-slide-{idx}">
          <div class="media-viewport">
            {#if isNear}
              {#if isVideo}
                <video
                  src={proxifyMediaUrl(post.file_url)}
                  poster={proxifyMediaUrl(post.preview_url)}
                  controls
                  preload="metadata"
                  autoplay={isActive && settingsService.settings.autoPlayVideo}
                  loop={settingsService.settings.loopVideo}
                  muted={settingsService.settings.muteVideo}
                  onloadeddata={() => handleMediaLoaded(post.id)}
                  oncanplay={() => handleMediaLoaded(post.id)}
                  onerror={() => handleMediaLoaded(post.id)}
                >
                  <track kind="captions" />
                </video>
              {:else if post.file_url || post.sample_url || post.preview_url}
                {#if mediaLoadingStates[post.id] !== false && post.preview_url}
                  <img
                    src={proxifyMediaUrl(post.preview_url)}
                    alt="Preview placeholder"
                    class="preview-blur"
                    referrerpolicy={settingsService.settings.referrerPolicy || 'no-referrer'}
                  />
                {/if}
                <img
                  src={proxifyMediaUrl(post.sample_url || post.file_url)}
                  alt="Post #{post.id}"
                  class="full-media"
                  referrerpolicy={settingsService.settings.referrerPolicy || 'no-referrer'}
                  onload={() => handleMediaLoaded(post.id)}
                  onerror={() => handleMediaLoaded(post.id)}
                />
              {:else}
                <div class="restricted-box">
                  <ShieldAlert size={44} />
                  <h4>Медиа ограничено сервером Booru</h4>
                  <a
                    href={getBooruPostUrl(post, auth.credentials?.booruUrl)}
                    target="_blank"
                    rel="noreferrer"
                    class="source-link-btn"
                  >
                    <ExternalLink size={15} />
                    <span>Открыть пост на Booru</span>
                  </a>
                </div>
              {/if}
            {:else}
              <!-- Empty placeholder for distant slides to preserve layout and saves RAM -->
              <div class="slide-placeholder"></div>
            {/if}

            <!-- Slide Bottom Info Overlay -->
            <div class="slide-info-overlay">
              <div class="post-meta-line">
                <span class="post-id">#{post.id}</span>
                <span class="meta-badge score">
                  <Star size={14} />
                  {post.score}
                </span>
                <span class="meta-badge rating-{post.rating}">
                  {post.rating.toUpperCase()}
                </span>
                <span class="meta-badge dim">
                  {post.width}×{post.height}
                </span>
              </div>

              <!-- Compact Tags Teaser -->
              <div class="tags-teaser">
                {#each tagsList.slice(0, 8) as tag (tag)}
                  <button class="tag-chip-compact" onclick={() => searchSingleTag(tag)}>
                    #{formatTagName(tag)}
                  </button>
                {/each}
                {#if tagsList.length > 8}
                  <button class="more-tags-btn" onclick={() => (isTagsPanelOpen = !isTagsPanelOpen)}>
                    +{tagsList.length - 8} еще
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </section>
      {/each}

      {#if gallery.isLoadingMore}
        <div class="feed-loading-slide">
          <Loader2 size={36} class="spin" />
          <span>Загрузка следующих постов...</span>
        </div>
      {/if}
    </div>

    <!-- Floating Navigation Controls Bar (Right side) -->
    <div class="feed-controls-floating">
      <button
        class="ctrl-btn"
        disabled={currentIndex === 0}
        onclick={scrollToPrev}
        title="Предыдущий пост (Вверх / W)"
      >
        <ChevronUp size={22} />
      </button>

      <span class="counter-badge">
        {currentIndex + 1} / {gallery.filteredPosts.length}
      </span>

      <button
        class="ctrl-btn"
        disabled={currentIndex >= gallery.filteredPosts.length - 1}
        onclick={scrollToNext}
        title="Следующий пост (Вниз / S)"
      >
        <ChevronDown size={22} />
      </button>

      <div class="ctrl-divider"></div>

      <button
        class="ctrl-btn"
        onclick={() => downloadMedia(gallery.filteredPosts[currentIndex])}
        title="Скачать (D)"
      >
        <Download size={20} />
      </button>

      <a
        class="ctrl-btn"
        href={getBooruPostUrl(gallery.filteredPosts[currentIndex], auth.credentials?.booruUrl)}
        target="_blank"
        rel="noreferrer"
        title="Открыть на Booru"
      >
        <ExternalLink size={20} />
      </a>

      <button
        class="ctrl-btn"
        class:active={isTagsPanelOpen}
        onclick={() => (isTagsPanelOpen = !isTagsPanelOpen)}
        title="Теги поста (T)"
      >
        <TagIcon size={20} />
      </button>
    </div>

    <!-- Drawer / Slide-up Tags Panel -->
    {#if isTagsPanelOpen && gallery.filteredPosts[currentIndex]}
      {@const activePost = gallery.filteredPosts[currentIndex]}
      {@const allTags = parseTagsString(activePost.tags)}

      <div class="feed-tags-drawer glass-panel animate-fade-in">
        <div class="drawer-header">
          <div class="header-title">
            <TagIcon size={18} />
            <span>Теги поста #{activePost.id} ({allTags.length})</span>
          </div>
          <button class="close-drawer-btn" onclick={() => (isTagsPanelOpen = false)}>
            <X size={18} />
          </button>
        </div>

        <div class="drawer-tags-list">
          {#each allTags as tag (tag)}
            {@const isSearch = pendingSearchTags.includes(tag.toLowerCase())}
            {@const isBlacklisted = (settingsService.settings.blacklist || []).includes(tag.toLowerCase())}

            <div class="drawer-tag-row">
              <button class="drawer-tag-name" onclick={() => searchSingleTag(tag)}>
                {formatTagName(tag)}
              </button>

              <div class="tag-row-actions">
                <button
                  class="tag-act-btn"
                  class:active={isSearch}
                  onclick={() => toggleSearchTag(tag)}
                  title={isSearch ? 'Удалить из поиска' : 'Добавить в поиск'}
                >
                  <Plus size={14} />
                </button>
                <button
                  class="tag-act-btn exclude"
                  class:active={isBlacklisted}
                  onclick={() => toggleBlacklistTag(tag)}
                  title={isBlacklisted ? 'Удалить из блэклиста' : 'В блэклист'}
                >
                  <Minus size={14} />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .feed-view-container {
    position: relative;
    width: 100%;
    height: calc(100dvh - var(--header-height));
    background: #000;
    overflow: hidden;
  }

  .feed-loading-state,
  .feed-error-state,
  .feed-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 1rem;
    color: var(--text-secondary);
  }

  .retry-btn {
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius-md);
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
  }

  .feed-scroll-wrapper {
    width: 100%;
    height: 100%;
    overflow-y: scroll;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  /* Hide scrollbar for clean TikTok feel */
  .feed-scroll-wrapper::-webkit-scrollbar {
    display: none;
  }
  .feed-scroll-wrapper {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .feed-slide {
    position: relative;
    width: 100%;
    height: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #050505;
    overflow: hidden;
  }

  .media-viewport {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img.preview-blur {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: blur(15px);
    opacity: 0.5;
  }

  .full-media,
  video {
    max-width: 100%;
    max-height: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    z-index: 1;
  }

  .slide-placeholder {
    width: 100%;
    height: 100%;
  }

  .restricted-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--text-secondary);
  }

  .source-link-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius-md);
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
  }

  /* Bottom Overlay Meta & Tags */
  .slide-info-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 80px;
    z-index: 10;
    padding: 1.5rem 1.5rem 1.2rem 1.5rem;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 60%, transparent 100%);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    pointer-events: none;
  }

  .slide-info-overlay * {
    pointer-events: auto;
  }

  .post-meta-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .post-id {
    font-size: 1.1rem;
    font-weight: 700;
    color: #fff;
  }

  .meta-badge {
    padding: 0.25rem 0.55rem;
    border-radius: var(--radius-sm);
    font-size: 0.78rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: #fff;
  }

  .meta-badge.rating-general { background: rgba(16, 185, 129, 0.3); color: #34d399; }
  .meta-badge.rating-sensitive { background: rgba(245, 158, 11, 0.3); color: #fbbf24; }
  .meta-badge.rating-questionable { background: rgba(249, 115, 22, 0.3); color: #fb923c; }
  .meta-badge.rating-explicit { background: rgba(239, 68, 68, 0.3); color: #f87171; }

  .meta-badge.dim {
    color: rgba(255, 255, 255, 0.7);
    font-family: var(--font-mono);
  }

  .tags-teaser {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    max-height: 70px;
    overflow: hidden;
  }

  .tag-chip-compact {
    font-size: 0.8rem;
    color: var(--tag-general);
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast);
  }

  .tag-chip-compact:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .more-tags-btn {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.1);
  }

  .feed-loading-slide {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100px;
    gap: 0.75rem;
    color: var(--text-muted);
  }

  /* Floating Right Action Controls */
  .feed-controls-floating {
    position: absolute;
    right: 1.25rem;
    bottom: 2rem;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    padding: 0.65rem 0.45rem;
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-lg);
  }

  .ctrl-btn {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.05);
    transition: all var(--transition-fast);
  }

  .ctrl-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.25);
    color: #fff;
  }

  .ctrl-btn.active {
    background: var(--color-accent-primary);
    color: var(--text-inverse);
  }

  .ctrl-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .counter-badge {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    font-family: var(--font-mono);
    text-align: center;
    padding: 0.1rem 0;
  }

  .ctrl-divider {
    width: 24px;
    height: 1px;
    background: rgba(255, 255, 255, 0.15);
    margin: 0.2rem 0;
  }

  /* Tags Drawer Panel */
  .feed-tags-drawer {
    position: absolute;
    right: 5rem;
    bottom: 2rem;
    width: 340px;
    max-height: 480px;
    z-index: 30;
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    background: rgba(15, 15, 15, 0.92);
    backdrop-filter: blur(16px);
    border: 1px solid var(--border-glass);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .header-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .close-drawer-btn {
    color: var(--text-muted);
    padding: 0.2rem;
    border-radius: var(--radius-sm);
  }

  .close-drawer-btn:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .drawer-tags-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .drawer-tag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0.5rem;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.03);
  }

  .drawer-tag-row:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .drawer-tag-name {
    font-size: 0.82rem;
    color: var(--tag-general);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .drawer-tag-name:hover {
    text-decoration: underline;
  }

  .tag-row-actions {
    display: flex;
    gap: 0.25rem;
  }

  .tag-act-btn {
    padding: 0.2rem;
    border-radius: 4px;
    color: var(--text-muted);
    display: flex;
  }

  .tag-act-btn:hover {
    color: var(--color-success);
  }

  .tag-act-btn.active {
    color: var(--color-success);
    background: rgba(16, 185, 129, 0.2);
  }

  .tag-act-btn.exclude:hover {
    color: var(--color-error);
  }

  .tag-act-btn.exclude.active {
    color: var(--color-error);
    background: rgba(239, 68, 68, 0.2);
  }

  @media (max-width: 768px) {
    .slide-info-overlay {
      right: 65px;
      padding: 1rem;
    }

    .feed-controls-floating {
      right: 0.75rem;
      bottom: 1rem;
      gap: 0.4rem;
      padding: 0.4rem 0.3rem;
    }

    .ctrl-btn {
      width: 36px;
      height: 36px;
    }

    .feed-tags-drawer {
      right: 0.75rem;
      left: 0.75rem;
      bottom: 4.5rem;
      width: auto;
      max-height: 320px;
    }
  }
</style>
