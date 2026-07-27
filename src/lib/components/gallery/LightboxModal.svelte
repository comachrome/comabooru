<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getLightboxService, getGalleryService, getSettingsService, getAuthService, getBoardService } from '../../services/context';
  import { getBooruPostUrl } from '../../api/booruClient';
  import { proxifyMediaUrl } from '../../api/httpUtils';
  import { buildSearchQuery, formatTagName, parseTagsString } from '../../utils/tagParser';
  import {
    X, ChevronLeft, ChevronRight, Download, ExternalLink,
    Star, ShieldAlert, Plus, Minus, Maximize2, Tag as TagIcon, Loader2
  } from 'lucide-svelte';

  let lightbox = getLightboxService();
  let gallery = getGalleryService();
  let settingsService = getSettingsService();
  let auth = getAuthService();
  let board = getBoardService();

  let isMediaLoading = $state(true);
  let isExpanded = $state(false);
  let touchStartY = $state(0);

  let pendingSearchTags = $state<string[]>([]);
  let pendingBlacklistTags = $state<string[]>([]);
  let prevOpenState = $state(false);

  $effect(() => {
    if (lightbox.isOpen && !prevOpenState) {
      pendingSearchTags = parseTagsString(gallery.searchQuery).map(t => t.toLowerCase());
      pendingBlacklistTags = (settingsService.settings.blacklist || []).map(t => t.toLowerCase());
      prevOpenState = true;
    } else if (!lightbox.isOpen && prevOpenState) {
      prevOpenState = false;
    }
  });

  $effect(() => {
    if (lightbox.selectedPost?.id) {
      isMediaLoading = Boolean(lightbox.selectedPost.file_url || lightbox.selectedPost.sample_url || lightbox.selectedPost.preview_url);
      isExpanded = false;
    }
  });

  function toggleExpand() {
    isExpanded = !isExpanded;
  }

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (e.changedTouches.length === 1) {
      const deltaY = e.changedTouches[0].clientY - touchStartY;
      if (deltaY < -25 && !isExpanded) {
        isExpanded = true;
      } else if (deltaY > 25 && isExpanded) {
        isExpanded = false;
      }
    }
  }

  function handleMediaLoaded() {
    isMediaLoading = false;
  }

  function handleClose() {
    const currentBlacklist = settingsService.settings.blacklist || [];
    let blacklistChanged = false;

    // Add new pending blacklist tags
    for (const tag of pendingBlacklistTags) {
      if (!currentBlacklist.includes(tag)) {
        settingsService.addToBlacklist(tag);
        blacklistChanged = true;
      }
    }

    // Remove deleted blacklist tags
    for (const tag of currentBlacklist) {
      if (!pendingBlacklistTags.includes(tag)) {
        settingsService.removeFromBlacklist(tag);
        blacklistChanged = true;
      }
    }

    // Check search query change
    const newSearchQuery = buildSearchQuery(pendingSearchTags);
    const oldSearchQuery = buildSearchQuery(parseTagsString(gallery.searchQuery));

    if (newSearchQuery !== oldSearchQuery) {
      gallery.search(newSearchQuery);
    }

    if (prevOpenState) {
      prevOpenState = false;
    }
    lightbox.close();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!lightbox.isOpen) return;

    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
      lightbox.prev();
    } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
      lightbox.next();
    } else if (e.key.toLowerCase() === 's') {
      downloadMedia();
    }
  }

  function downloadMedia() {
    const post = lightbox.selectedPost;
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
    pendingSearchTags = [tag.trim().toLowerCase()];
    handleClose();
  }

  function toggleSearchTag(tag: string) {
    const lower = tag.trim().toLowerCase();
    if (pendingSearchTags.includes(lower)) {
      pendingSearchTags = pendingSearchTags.filter(t => t !== lower);
    } else {
      pendingSearchTags = [...pendingSearchTags, lower];
      pendingBlacklistTags = pendingBlacklistTags.filter(t => t !== lower);
    }
  }

  function toggleBlacklistTag(tag: string) {
    const lower = tag.trim().toLowerCase();
    if (pendingBlacklistTags.includes(lower)) {
      pendingBlacklistTags = pendingBlacklistTags.filter(t => t !== lower);
    } else {
      pendingBlacklistTags = [...pendingBlacklistTags, lower];
      pendingSearchTags = pendingSearchTags.filter(t => t !== lower);
    }
  }

  onMount(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeydown);
    }
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeydown);
    }
  });
</script>

{#if lightbox.isOpen && lightbox.selectedPost}
  {@const post = lightbox.selectedPost}
  {@const isVideo = post.file_url.endsWith('.mp4') || post.file_url.endsWith('.webm')}
  {@const isGif = post.file_url.endsWith('.gif')}
  {@const tagsList = parseTagsString(post.tags)}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="lightbox-overlay"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => e.target === e.currentTarget && handleClose()}
  >
    <button class="close-btn" onclick={handleClose} title="Закрыть (Esc)">
      <X size={24} />
    </button>

    <button class="nav-btn prev" onclick={() => lightbox.prev()} title="Предыдущий (←)">
      <ChevronLeft size={32} />
    </button>

    <button class="nav-btn next" onclick={() => lightbox.next()} title="Следующий (→)">
      <ChevronRight size={32} />
    </button>

    <div class="lightbox-content animate-fade-in">
      <div class="media-container">
        {#if isMediaLoading}
          <div class="media-loader">
            <Loader2 class="spin" size={36} />
          </div>
        {/if}

        {#if isVideo}
          <video
            src={proxifyMediaUrl(post.file_url)}
            controls
            autoplay={settingsService.settings.autoPlayVideo}
            loop={settingsService.settings.loopVideo}
            muted={settingsService.settings.muteVideo}
            onloadeddata={handleMediaLoaded}
            oncanplay={handleMediaLoaded}
            onerror={handleMediaLoaded}
          >
            <track kind="captions" />
          </video>
        {:else if post.file_url || post.sample_url || post.preview_url}
          {#if isMediaLoading && post.preview_url}
            <img
              src={proxifyMediaUrl(post.preview_url)}
              alt="Preview Placeholder"
              class="preview-placeholder"
              referrerpolicy={settingsService.settings.referrerPolicy || 'no-referrer'}
            />
          {/if}
          <img
            src={proxifyMediaUrl(post.sample_url || post.file_url)}
            alt="Post #{post.id}"
            class:hidden={isMediaLoading}
            referrerpolicy={settingsService.settings.referrerPolicy || 'no-referrer'}
            onload={handleMediaLoaded}
            onerror={handleMediaLoaded}
          />
        {:else}
          <div class="lightbox-restricted-notice">
            <ShieldAlert size={44} class="restricted-icon" />
            <h4>Медиа ограничено сервером Danbooru</h4>
            <p>Danbooru скрывает ссылки на изображения данного поста для всех пользователей согласно своей политике контента.</p>
            <a href={getBooruPostUrl(post, auth.credentials?.booruUrl)} target="_blank" rel="noreferrer" class="restricted-source-btn">
              <ExternalLink size={15} />
              <span>Открыть страницу поста на Booru</span>
            </a>
          </div>
        {/if}
      </div>

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="sidebar glass-panel" class:expanded={isExpanded}>
        <!-- Mobile Drag Handle -->
        <div
          class="sheet-drag-handle mobile-only"
          onclick={toggleExpand}
          ontouchstart={handleTouchStart}
          ontouchend={handleTouchEnd}
          role="button"
          tabindex="0"
          title={isExpanded ? "Свернуть панель" : "Раскрыть теги"}
        >
          <span class="handle-pill"></span>
        </div>

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="sidebar-header"
          ontouchstart={handleTouchStart}
          ontouchend={handleTouchEnd}
        >
          <h3>Пост #{post.id}</h3>
          <div class="actions">
            <button class="icon-btn" onclick={downloadMedia} title="Скачать (S)">
              <Download size={18} />
            </button>
            <a class="icon-btn" href={getBooruPostUrl(post, auth.credentials?.booruUrl)} target="_blank" rel="noreferrer" title="Открыть на Booru">
              <ExternalLink size={18} />
            </a>
          </div>
        </div>

        <div class="meta-stats">
          <div class="stat-badge">
            <Star size={16} class="star-icon" />
            <span>{post.score}</span>
          </div>
          <div class="stat-badge rating-{post.rating}">
            {post.rating.toUpperCase()}
          </div>
          <div class="stat-badge dim">
            {post.width} × {post.height}
          </div>
        </div>

        <div class="tags-section">
          <div class="tags-header">
            <TagIcon size={16} />
            <span>Теги ({tagsList.length})</span>
          </div>

          <div class="tags-scroll">
            {#each tagsList as tag (tag)}
              <div class="tag-row">
                <button class="tag-link" onclick={() => searchSingleTag(tag)}>
                  {formatTagName(tag)}
                </button>
                <div class="tag-actions">
                  <button
                    class="tag-act"
                    class:active={pendingSearchTags.includes(tag.toLowerCase())}
                    onclick={() => toggleSearchTag(tag)}
                    title={pendingSearchTags.includes(tag.toLowerCase()) ? "Убрать из поиска" : "Добавить в поиск"}
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    class="tag-act exclude"
                    class:active={pendingBlacklistTags.includes(tag.toLowerCase())}
                    onclick={() => toggleBlacklistTag(tag)}
                    title={pendingBlacklistTags.includes(tag.toLowerCase()) ? "Убрать из блэклиста" : "В блэклист"}
                  >
                    <Minus size={14} />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .lightbox-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.88);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .close-btn {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 1010;
    color: white;
    padding: 0.6rem;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.1);
    transition: background var(--transition-fast);
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1010;
    color: white;
    padding: 0.85rem;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.1);
    transition: background var(--transition-fast);
  }

  .nav-btn:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  .nav-btn.prev { left: 1.25rem; }
  .nav-btn.next { right: 1.25rem; }

  .lightbox-content {
    display: flex;
    width: 92vw;
    height: 88vh;
    max-width: 1400px;
    gap: 1rem;
  }

  .media-container {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .media-loader {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    background: rgba(0, 0, 0, 0.4);
    color: var(--text-primary);
  }

  img.preview-placeholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter: blur(10px);
    opacity: 0.5;
  }

  img, video {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    transition: opacity var(--transition-fast);
  }

  img.hidden {
    opacity: 0;
    position: absolute;
  }

  .lightbox-restricted-notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 2rem;
    text-align: center;
    color: var(--text-primary);
  }

  .lightbox-restricted-notice h4 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }

  .lightbox-restricted-notice p {
    font-size: 0.88rem;
    color: var(--text-muted);
    max-width: 420px;
    margin: 0;
    line-height: 1.4;
  }

  .restricted-source-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    border-radius: var(--radius-md);
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    font-size: 0.88rem;
    margin-top: 0.5rem;
    transition: opacity var(--transition-fast);
  }

  .restricted-source-btn:hover {
    opacity: 0.88;
  }

  .sidebar {
    width: 340px;
    display: flex;
    flex-direction: column;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .sidebar-header h3 {
    font-size: 1.2rem;
    font-weight: 700;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .icon-btn {
    padding: 0.45rem;
    border-radius: var(--radius-sm);
    background: var(--bg-surface-elevated);
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: var(--color-accent-primary);
    color: var(--text-inverse);
  }

  .meta-stats {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.25rem;
  }

  .stat-badge {
    padding: 0.3rem 0.65rem;
    border-radius: var(--radius-sm);
    font-size: 0.8rem;
    font-weight: 600;
    background: var(--bg-surface-elevated);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .stat-badge.rating-general { background: rgba(16, 185, 129, 0.2); color: #10b981; }
  .stat-badge.rating-sensitive { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
  .stat-badge.rating-questionable { background: rgba(249, 115, 22, 0.2); color: #f97316; }
  .stat-badge.rating-explicit { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

  .stat-badge.dim {
    color: var(--text-muted);
    font-family: var(--font-mono);
  }

  .tags-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .tags-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 0.75rem;
  }

  .tags-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-right: 0.25rem;
  }

  .tag-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.03);
  }

  .tag-row:hover {
    background: rgba(255, 255, 255, 0.07);
  }

  .tag-link {
    font-size: 0.85rem;
    color: var(--tag-general);
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .tag-link:hover {
    text-decoration: underline;
  }

  .tag-actions {
    display: flex;
    gap: 0.25rem;
  }

  .tag-act {
    padding: 0.2rem;
    border-radius: 4px;
    color: var(--text-muted);
    display: flex;
    transition: color var(--transition-fast), background-color var(--transition-fast);
  }

  .tag-act:hover {
    color: var(--color-success);
  }

  .tag-act.active {
    color: var(--color-success);
    background: rgba(16, 185, 129, 0.2);
  }

  .tag-act.exclude:hover {
    color: var(--color-error);
  }

  .tag-act.exclude.active {
    color: var(--color-error);
    background: rgba(239, 68, 68, 0.2);
  }

  .mobile-only {
    display: none;
  }

  .sheet-drag-handle {
    width: 100%;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0 0.5rem 0;
    cursor: pointer;
    touch-action: pan-y;
  }

  .handle-pill {
    width: 38px;
    height: 4px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.3);
    transition: background var(--transition-fast);
  }

  .sheet-drag-handle:hover .handle-pill {
    background: rgba(255, 255, 255, 0.6);
  }

  @media (max-width: 900px) {
    .mobile-only {
      display: flex !important;
    }

    .lightbox-overlay {
      padding: 0.5rem;
    }

    .lightbox-content {
      flex-direction: column;
      width: 100%;
      height: 100%;
      max-height: 98vh;
      gap: 0.5rem;
    }

    .media-container {
      flex: 1;
      min-height: 0;
    }

    .sidebar {
      width: 100%;
      height: 240px;
      flex-shrink: 0;
      padding: 0.85rem;
      transition: height 300ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .sidebar.expanded {
      height: 65vh !important;
    }

    .close-btn {
      top: 0.75rem;
      right: 0.75rem;
      padding: 0.45rem;
    }

    .nav-btn {
      padding: 0.5rem;
    }

    .nav-btn.prev { left: 0.5rem; }
    .nav-btn.next { right: 0.5rem; }
  }

  @media (max-width: 520px) {
    .sidebar {
      height: 200px;
      padding: 0.65rem;
    }

    .sidebar.expanded {
      height: 72vh !important;
    }

    .sidebar-header h3 {
      font-size: 1rem;
    }

    .meta-stats {
      margin-bottom: 0.75rem;
      gap: 0.35rem;
    }

    .stat-badge {
      padding: 0.2rem 0.45rem;
      font-size: 0.75rem;
    }

    .tag-link {
      font-size: 0.78rem;
      max-width: 140px;
    }
  }
</style>
