<script lang="ts">
  import type { BooruPost } from '../../api/types';
  import { getBooruPostUrl } from '../../api/booruClient';
  import { proxifyMediaUrl } from '../../api/httpUtils';
  import { getAuthService, getLightboxService, getBoardService, getSettingsService } from '../../services/context';
  import { Video, Star, Download, ShieldAlert, ExternalLink, Loader2 } from 'lucide-svelte';

  let { post }: { post: BooruPost } = $props();

  let auth = getAuthService();
  let lightbox = getLightboxService();
  let board = getBoardService();
  let settingsService = getSettingsService();

  let isDownloading = $state(false);

  const isVideo = $derived(post.file_url.endsWith('.mp4') || post.file_url.endsWith('.webm'));
  const isGif = $derived(post.file_url.endsWith('.gif'));
  const hasMedia = $derived(Boolean(post.preview_url || post.sample_url || post.file_url));

  const cardStyle = $derived((post.width && post.height)
    ? `aspect-ratio: ${post.width} / ${post.height};`
    : 'aspect-ratio: 3 / 4;');

  function openLightbox() {
    lightbox.open(post);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openLightbox();
    }
  }

  async function handleDownload(e: MouseEvent) {
    e.stopPropagation();
    if (isDownloading) return;
    isDownloading = true;

    const ext = post.file_url.split('.').pop()?.split('?')[0] || 'jpg';
    const suggestedName = `booru_${post.id}.${ext}`;
    
    try {
      if ('showSaveFilePicker' in window && typeof (window as unknown as { showSaveFilePicker: (...args: unknown[]) => unknown }).showSaveFilePicker === 'function') {
        const handle = await (window as unknown as { showSaveFilePicker: (opts: Record<string, unknown>) => Promise<{ createWritable: () => Promise<WritableStream> }> }).showSaveFilePicker({ suggestedName });
        const res = await fetch(post.file_url);
        if (res.body) {
          const writable = await handle.createWritable();
          await res.body.pipeTo(writable);
          return;
        }
      }
      // Fallback
      window.open(post.file_url, '_blank');
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        window.open(post.file_url, '_blank');
      }
    } finally {
      isDownloading = false;
    }
  }
</script>

<div
  class="media-card glass-card animate-fade-in"
  style={cardStyle}
  role="button"
  tabindex="0"
  aria-label={`Media post #${post.id}, rating ${post.rating}`}
  onclick={openLightbox}
  onkeydown={handleKeydown}
>
  <div class="image-wrapper">
    {#if hasMedia}
      <img
        src={proxifyMediaUrl(post.preview_url || post.sample_url || post.file_url)}
        alt="Post #{post.id}"
        loading="lazy"
        referrerpolicy={settingsService.settings.referrerPolicy || 'no-referrer'}
      />
    {:else}
      <div class="restricted-fallback">
        <ShieldAlert size={26} class="restricted-icon" />
        <span class="restricted-text">Доступ ограничен</span>
        <a
          href={getBooruPostUrl(post, auth.credentials?.booruUrl)}
          target="_blank"
          rel="noreferrer"
          class="source-link"
          aria-label="Открыть пост на Booru"
          onclick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={11} />
          <span>На Booru</span>
        </a>
      </div>
    {/if}

    <div class="badges">
      {#if isVideo}
        <span class="badge video">
          <Video size={11} />
          <span>VIDEO</span>
        </span>
      {:else if isGif}
        <span class="badge gif">GIF</span>
      {/if}

      {#if board.getEffectiveSettings().showRatingBadge !== false}
        <span class="badge rating-{post.rating}" title={`Rating: ${post.rating}`}>
          <span class="rating-dot"></span>
          <span>{post.rating.substring(0, 1).toUpperCase()}</span>
        </span>
      {/if}
    </div>

    <div class="card-overlay">
      <div class="overlay-info">
        <div class="score">
          <Star size={13} class="star-icon" />
          <span>{post.score}</span>
        </div>
        <div class="right-actions">
          <span class="dimensions">{post.width}×{post.height}</span>
          {#if board.getEffectiveSettings().showDownloadButton !== false}
            <button
              class="quick-download-btn"
              onclick={handleDownload}
              title="Скачать оригинальный файл"
              aria-label="Скачать файл поста"
              disabled={isDownloading}
            >
              {#if isDownloading}
                <Loader2 size={13} class="spin" />
              {:else}
                <Download size={13} />
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .media-card {
    position: relative;
    overflow: hidden;
    cursor: pointer;
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    width: 100%;
    content-visibility: auto;
    contain-intrinsic-size: 200px 300px;
  }

  .image-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #090a0f;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-smooth);
  }

  .media-card:hover img {
    transform: scale(1.03);
  }

  .badges {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    display: flex;
    gap: 0.3rem;
    z-index: 2;
  }

  .badge {
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm);
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    background: rgba(12, 14, 22, 0.9);
    color: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .badge.video {
    color: #f3f4f6;
  }

  .badge.gif {
    color: #e5e7eb;
  }

  .rating-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  .badge.rating-general .rating-dot { background: #34d399; }
  .badge.rating-sensitive .rating-dot { background: #fbbf24; }
  .badge.rating-questionable .rating-dot { background: #fb923c; }
  .badge.rating-explicit .rating-dot { background: #f87171; }

  .card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(10, 12, 18, 0.85) 0%, transparent 50%);
    opacity: 0;
    transition: opacity var(--transition-fast);
    display: flex;
    align-items: flex-end;
    padding: 0.6rem 0.75rem;
    z-index: 1;
  }

  .media-card:hover .card-overlay {
    opacity: 1;
  }

  .overlay-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    color: white;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .score {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .right-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .quick-download-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border-radius: var(--radius-sm);
    background: rgba(0, 0, 0, 0.6);
    color: white;
    transition: all var(--transition-fast);
  }

  .quick-download-btn:hover {
    background: var(--color-accent-primary);
    color: var(--text-inverse);
    transform: scale(1.05);
  }

  :global(.star-icon) {
    color: #fbbf24;
    fill: #fbbf24;
  }

  .restricted-fallback {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.75rem;
    background: radial-gradient(circle at center, var(--bg-surface-elevated) 0%, var(--bg-surface) 100%);
    color: var(--text-muted);
    text-align: center;
    z-index: 0;
  }

  :global(.restricted-icon) {
    color: #f59e0b;
    opacity: 0.85;
  }

  .restricted-text {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .source-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.55rem;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    font-size: 0.72rem;
    font-weight: 500;
    z-index: 3;
    transition: background var(--transition-fast);
  }

  .source-link:hover {
    background: var(--color-accent-primary);
    color: var(--text-inverse);
  }

  .dimensions {
    color: rgba(255, 255, 255, 0.7);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  @media (max-width: 600px) {
    .badges {
      top: 0.25rem;
      right: 0.25rem;
      gap: 0.2rem;
    }

    .badge {
      padding: 0.1rem 0.3rem;
      font-size: 0.62rem;
    }

    .card-overlay {
      padding: 0.4rem 0.5rem;
    }

    .overlay-info {
      font-size: 0.75rem;
    }

    .dimensions {
      display: none;
    }
  }

  @media (hover: none) {
    .card-overlay {
      opacity: 0.85;
      background: linear-gradient(to top, rgba(10, 12, 18, 0.8) 0%, transparent 60%);
    }
  }
</style>
