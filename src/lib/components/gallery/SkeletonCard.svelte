<script lang="ts">
  let { aspectRatio = '3 / 4' }: { aspectRatio?: string } = $props();
</script>

<div class="skeleton-card glass-panel animate-pulse" style="aspect-ratio: {aspectRatio};">
  <div class="skeleton-media"></div>
  <div class="skeleton-badge"></div>
  <div class="skeleton-footer"></div>
</div>

<style>
  .skeleton-card {
    position: relative;
    width: 100%;
    border-radius: var(--radius-md);
    background: var(--bg-surface);
    overflow: hidden;
    content-visibility: auto;
    contain-intrinsic-size: 200px 300px;
  }

  .skeleton-media {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      110deg,
      rgba(255, 255, 255, 0.03) 0%,
      rgba(255, 255, 255, 0.08) 50%,
      rgba(255, 255, 255, 0.03) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.8s infinite;
  }

  .skeleton-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    width: 32px;
    height: 18px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.12);
  }

  .skeleton-footer {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    height: 14px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.1);
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 0.4; }
  }

  .animate-pulse {
    animation: pulse 1.6s ease-in-out infinite;
  }
</style>
