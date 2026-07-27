import type { BooruEngine } from '../types';
import type { BooruAdapter } from './BooruAdapter';
import { GelbooruAdapter } from './GelbooruAdapter';
import { DanbooruAdapter } from './DanbooruAdapter';

const adapters: Record<BooruEngine, BooruAdapter> = {
  gelbooru: new GelbooruAdapter(),
  danbooru: new DanbooruAdapter()
};

/**
 * Detects whether URL points to Danbooru or Gelbooru
 */
export function detectBooruEngine(url: string): BooruEngine {
  if (!url) return 'gelbooru';
  
  // Iterate through all instantiated adapters to find a match
  for (const adapter of Object.values(adapters)) {
    if (adapter.isSupportedUrl(url)) {
      return adapter.engine;
    }
  }

  // Default fallback
  return 'gelbooru';
}

/**
 * Resolves the appropriate BooruAdapter instance based on engine type or URL string.
 */
export function getBooruAdapter(engineOrUrl?: BooruEngine | string): BooruAdapter {
  if (!engineOrUrl) {
    return adapters.gelbooru;
  }

  if (engineOrUrl === 'gelbooru' || engineOrUrl === 'danbooru') {
    return adapters[engineOrUrl];
  }

  // If a URL was passed instead of engine name
  const detected = detectBooruEngine(engineOrUrl);
  return adapters[detected];
}
