import { describe, it, expect } from 'vitest';
import { getTagCategory, formatTagName, buildSearchQuery, parseTagsString, isPostBlacklisted } from '../../src/lib/utils/tagParser';

describe('Tag Parser Utils', () => {
  it('maps numeric tag types to categories', () => {
    expect(getTagCategory(0)).toBe('general');
    expect(getTagCategory(1)).toBe('artist');
    expect(getTagCategory(3)).toBe('copyright');
    expect(getTagCategory(4)).toBe('character');
    expect(getTagCategory(5)).toBe('meta');
    expect(getTagCategory(99)).toBe('general');
  });

  it('formats tag names replacing underscores with spaces', () => {
    expect(formatTagName('cat_ears')).toBe('cat ears');
    expect(formatTagName('hatsune_miku')).toBe('hatsune miku');
  });

  it('builds clean search queries', () => {
    expect(buildSearchQuery(['cat_ears', '  rating:general ', '', 'solo'])).toBe('cat_ears rating:general solo');
  });

  it('parses space-separated tags string', () => {
    expect(parseTagsString('cat_ears blue_eyes   solo')).toEqual(['cat_ears', 'blue_eyes', 'solo']);
  });

  it('correctly identifies blacklisted posts', () => {
    const postTags = 'cat_ears blue_eyes rating:explicit gore';
    
    expect(isPostBlacklisted(postTags, ['gore'])).toBe(true);
    expect(isPostBlacklisted(postTags, ['-gore'])).toBe(true);
    expect(isPostBlacklisted(postTags, ['cat_ears'])).toBe(true);
    expect(isPostBlacklisted(postTags, ['dog_ears', 'scat'])).toBe(false);
    expect(isPostBlacklisted(postTags, ['-dog_ears'])).toBe(false);
  });
});
