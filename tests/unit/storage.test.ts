import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
  saveSettings,
  loadSettings,
  DEFAULT_SETTINGS,
  loadBoardsData,
  saveBoardsData,
  clearAllBoards,
  getEffectiveSettings
} from '../../src/lib/utils/storage';

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true });
}

if (typeof globalThis.localStorage === 'undefined') {
  const memoryStore = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => memoryStore.get(k) ?? null,
    setItem: (k: string, v: string) => memoryStore.set(k, String(v)),
    removeItem: (k: string) => memoryStore.delete(k),
    clear: () => memoryStore.clear(),
    key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
    get length() { return memoryStore.size; }
  } as Storage;
}

if (typeof globalThis.document === 'undefined') {
  let cookieStore = '';
  Object.defineProperty(globalThis, 'document', {
    value: {
      get cookie() { return cookieStore; },
      set cookie(val: string) {
        if (!val) return;
        const parts = val.split(';');
        const [kv] = parts;
        const key = kv.split('=')[0].trim();
        if (val.includes('max-age=0')) {
          const cookies = cookieStore.split('; ').filter(c => !c.startsWith(key + '='));
          cookieStore = cookies.join('; ');
        } else {
          const cookies = cookieStore ? cookieStore.split('; ').filter(c => !c.startsWith(key + '=')) : [];
          cookies.push(kv.trim());
          cookieStore = cookies.join('; ');
        }
      }
    },
    writable: true
  });
}

describe('Storage Utils', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCredentials();
    clearAllBoards();
  });

  it('saves and loads credentials correctly', () => {
    const mockCreds = {
      booruUrl: 'https://gelbooru.com',
      userId: '123456',
      apiKey: 'secret_api_key_789'
    };

    saveCredentials(mockCreds);
    const loaded = loadCredentials();

    expect(loaded).not.toBeNull();
    expect(loaded?.booruUrl).toBe('https://gelbooru.com');
    expect(loaded?.userId).toBe('123456');
    expect(loaded?.apiKey).toBe('secret_api_key_789');
  });

  it('returns null when no credentials stored', () => {
    const loaded = loadCredentials();
    expect(loaded).toBeNull();
  });

  it('clears credentials from storage', () => {
    saveCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '123',
      apiKey: 'abc'
    });
    clearCredentials();

    expect(loadCredentials()).toBeNull();
  });

  it('saves and loads app settings', () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      theme: 'light' as const,
      gridDensity: 'compact' as const,
      blacklist: ['gore', 'scat'],
      allowedRatings: { general: true, sensitive: false, questionable: false, explicit: false }
    };

    saveSettings(customSettings);
    const loaded = loadSettings();

    expect(loaded.theme).toBe('light');
    expect(loaded.gridDensity).toBe('compact');
    expect(loaded.blacklist).toEqual(['gore', 'scat']);
    expect(loaded.allowedRatings).toEqual({ general: true, sensitive: false, questionable: false, explicit: false });
  });

  it('handles multi-board load, save, and active selection', () => {
    const boards = [
      { id: 'b1', name: 'Gelbooru Main', booruUrl: 'https://gelbooru.com', userId: '111', apiKey: 'k1' },
      { id: 'b2', name: 'Safebooru', booruUrl: 'https://safebooru.org', userId: '222', apiKey: 'k2' }
    ];

    saveBoardsData(boards, 'b2');

    const data = loadBoardsData();
    expect(data.boards.length).toBe(2);
    expect(data.activeBoardId).toBe('b2');

    // Active credentials synced to legacy loadCredentials
    const activeCreds = loadCredentials();
    expect(activeCreds?.userId).toBe('222');
    expect(activeCreds?.booruUrl).toBe('https://safebooru.org');
  });


  it('resolves per-booru settings overrides over global defaults correctly', () => {
    const globalSettings = {
      ...DEFAULT_SETTINGS,
      gridDensity: 'comfortable' as const,
      blacklist: ['global_block']
    };

    const boardWithOverrides = {
      id: 'b1',
      name: 'Test Board',
      booruUrl: 'https://test.com',
      userId: '1',
      apiKey: '1',
      settings: {
        gridDensity: 'compact' as const,
        blacklist: ['board_block']
      }
    };

    const effective = getEffectiveSettings(boardWithOverrides, globalSettings);
    expect(effective.gridDensity).toBe('compact');
    expect(effective.blacklist).toContain('global_block');
    expect(effective.blacklist).toContain('board_block');
  });
});
