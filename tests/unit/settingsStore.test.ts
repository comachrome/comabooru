import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsService } from '../../src/lib/services/SettingsService.svelte';
import { AuthService } from '../../src/lib/services/AuthService.svelte';
import { BoardService } from '../../src/lib/services/BoardService.svelte';
import { DEFAULT_SETTINGS } from '../../src/lib/utils/storage';
import type { BooruBoard } from '../../src/lib/api/types';

describe('Settings Service', () => {
  let settingsService: SettingsService;

  beforeEach(() => {
    localStorage.clear();
    settingsService = new SettingsService();
    settingsService.updateSettings(DEFAULT_SETTINGS);
  });

  it('updates theme and sets data-theme attribute on documentElement', () => {
    settingsService.setTheme('light');
    expect(settingsService.settings.theme).toBe('light');

    if (typeof document !== 'undefined' && document.documentElement) {
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    }
  });

  it('adds tags to blacklist without duplicates', () => {
    settingsService.addToBlacklist('furry');
    settingsService.addToBlacklist('FURRY');
    settingsService.addToBlacklist('gowe');

    expect(settingsService.settings.blacklist).toContain('furry');
    expect(settingsService.settings.blacklist).toContain('gowe');
    expect(settingsService.settings.blacklist.filter(t => t === 'furry').length).toBe(1);
  });

  it('removes tags from blacklist', () => {
    settingsService.addToBlacklist('gore');
    settingsService.removeFromBlacklist('gore');

    expect(settingsService.settings.blacklist).not.toContain('gore');
  });

  it('toggles rating filter permissions', () => {
    const initial = settingsService.settings.allowedRatings.explicit;
    settingsService.toggleRating('explicit');

    const updated = settingsService.settings.allowedRatings.explicit;
    expect(updated).toBe(!initial);
  });

  it('resolves board overrides over global default settings', () => {
    const auth = new AuthService();
    const boardService = new BoardService(auth, settingsService);

    const mockBoard: BooruBoard = {
      id: 'b1',
      name: 'Safe Board',
      booruUrl: 'https://gelbooru.com',
      userId: '100',
      apiKey: 'key100',
      settings: {
        theme: 'light',
        gridDensity: 'compact',
        blacklist: ['ai_generated']
      }
    };

    boardService.boards = [mockBoard];
    boardService.activeBoardId = 'b1';

    const effective = boardService.getEffectiveSettings();

    expect(effective.theme).toBe('light');
    expect(effective.gridDensity).toBe('compact');
  });
});
