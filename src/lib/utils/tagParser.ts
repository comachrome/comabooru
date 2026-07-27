import type { TagCategory } from '../api/types';

/**
 * Maps Gelbooru numeric tag types to TagCategory strings.
 * 0: general
 * 1: artist
 * 3: copyright
 * 4: character
 * 5: metadata
 */
export function getTagCategory(typeId?: number | string): TagCategory {
  const num = typeof typeId === 'string' ? parseInt(typeId, 10) : typeId;
  switch (num) {
    case 1:
      return 'artist';
    case 3:
      return 'copyright';
    case 4:
      return 'character';
    case 5:
      return 'meta';
    case 0:
    default:
      return 'general';
  }
}

/**
 * Clean and format tag strings for presentation
 */
export function formatTagName(tag: string): string {
  return tag.replace(/_/g, ' ');
}

/**
 * Builds search query string from tag array, filtering empty tags
 */
export function buildSearchQuery(tags: string[]): string {
  return tags
    .map(t => t.trim())
    .filter(Boolean)
    .join(' ');
}

/**
 * Extracts individual tags from space-delimited string
 */
export function parseTagsString(tagsStr: string): string[] {
  if (!tagsStr) return [];
  return tagsStr
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Check if a post matches any blacklisted tag
 */
export function isPostBlacklisted(postTags: string, blacklist: string[]): boolean {
  if (!blacklist || blacklist.length === 0 || !postTags) return false;

  const tags = parseTagsString(postTags.toLowerCase());
  const lowerBlacklist = blacklist.map(b => b.trim().toLowerCase()).filter(Boolean);

  return lowerBlacklist.some(rawItem => {
    // Strip leading minus signs if user entered '-tag' in blacklist
    const cleanItem = rawItem.replace(/^-+/, '');
    if (!cleanItem) return false;

    // Support rating:tag in blacklist
    if (cleanItem.startsWith('rating:')) {
      const targetRating = cleanItem.replace('rating:', '').trim();
      // Match rating code or name
      const postRating = (tags.find(t => t.startsWith('rating:'))?.replace('rating:', '') || '').toLowerCase();
      if (targetRating === postRating) return true;
      if (targetRating === 'e' && postRating === 'explicit') return true;
      if (targetRating === 'q' && postRating === 'questionable') return true;
      if (targetRating === 's' && postRating === 'sensitive') return true;
      if (targetRating === 'g' && postRating === 'general') return true;
    }

    return tags.includes(cleanItem);
  });
}
