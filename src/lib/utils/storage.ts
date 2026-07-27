import type { BooruCredentials, BooruBoard, AppSettings } from '../api/types';

const CREDENTIALS_KEY = 'comabooru_credentials';
const SETTINGS_KEY = 'comabooru_settings';
const BOARDS_KEY = 'comabooru_boards';
const ACTIVE_BOARD_ID_KEY = 'comabooru_active_board_id';

export const DEFAULT_CREDENTIALS: BooruCredentials = {
  booruUrl: 'https://gelbooru.com',
  userId: '',
  apiKey: ''
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#ffffff',
  gridDensity: 'comfortable',
  blacklist: [],
  allowedRatings: {
    general: true,
    sensitive: true,
    questionable: true,
    explicit: true
  },
  showRatingBadge: true,
  showDownloadButton: true,
  autoPlayVideo: true,
  loopVideo: true,
  muteVideo: true,
  referrerPolicy: 'no-referrer',
  useProxyFallback: false,
  customProxyUrl: ''
};

export function slugifyBoardName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'main';
}

/**
 * Saves credentials to localStorage and cookies
 */
export function saveCredentials(creds: BooruCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(creds);
    localStorage.setItem(CREDENTIALS_KEY, json);
    document.cookie = `${CREDENTIALS_KEY}=${encodeURIComponent(json)}; path=/; max-age=31536000; SameSite=Strict`;
  } catch (e) {
    console.error('Failed to save credentials to localStorage/cookie:', e);
  }
}

export function loadCredentials(): BooruCredentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = localStorage.getItem(CREDENTIALS_KEY);
    if (fromStorage) {
      const parsed = JSON.parse(fromStorage);
      if (parsed && parsed.userId && parsed.apiKey) {
        return {
          engine: parsed.engine,
          booruUrl: parsed.booruUrl || 'https://gelbooru.com',
          userId: String(parsed.userId).trim(),
          apiKey: String(parsed.apiKey).trim()
        };
      }
    }

    const cookies = document.cookie ? document.cookie.split('; ') : [];
    const match = cookies.find(row => row.startsWith(`${CREDENTIALS_KEY}=`));
    if (match) {
      const json = decodeURIComponent(match.split('=')[1]);
      const parsed = JSON.parse(json);
      if (parsed && parsed.userId && parsed.apiKey) {
        return {
          engine: parsed.engine,
          booruUrl: parsed.booruUrl || 'https://gelbooru.com',
          userId: String(parsed.userId).trim(),
          apiKey: String(parsed.apiKey).trim()
        };
      }
    }
  } catch (e) {
    console.error('Failed to load credentials:', e);
  }
  return null;
}

export function clearCredentials(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
    document.cookie = `${CREDENTIALS_KEY}=; path=/; max-age=0; SameSite=Strict`;
  } catch (e) {
    console.error('Failed to clear credentials:', e);
  }
}

/**
 * Multi-Board Storage Helpers
 */
export function loadBoardsData(): { boards: BooruBoard[]; activeBoardId: string | null } {
  if (typeof window === 'undefined') return { boards: [], activeBoardId: null };

  try {
    const rawBoards = localStorage.getItem(BOARDS_KEY);
    const activeId = localStorage.getItem(ACTIVE_BOARD_ID_KEY);

    if (rawBoards) {
      const boards: BooruBoard[] = JSON.parse(rawBoards);
      if (Array.isArray(boards) && boards.length > 0) {
        const validActiveId = boards.some(b => b.id === activeId) ? activeId : boards[0].id;
        return { boards, activeBoardId: validActiveId };
      }
    }
  } catch (e) {
    console.error('Failed to load boards data:', e);
  }

  return { boards: [], activeBoardId: null };
}

export function saveBoardsData(boards: BooruBoard[], activeBoardId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
    if (activeBoardId) {
      localStorage.setItem(ACTIVE_BOARD_ID_KEY, activeBoardId);
    } else {
      localStorage.removeItem(ACTIVE_BOARD_ID_KEY);
    }

    const activeBoard = boards.find(b => b.id === activeBoardId);
    if (activeBoard) {
      saveCredentials({
        engine: activeBoard.engine,
        booruUrl: activeBoard.booruUrl,
        userId: activeBoard.userId,
        apiKey: activeBoard.apiKey
      });
    } else if (boards.length === 0) {
      clearCredentials();
    }
  } catch (e) {
    console.error('Failed to save boards data:', e);
  }
}

export function clearAllBoards(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BOARDS_KEY);
    localStorage.removeItem(ACTIVE_BOARD_ID_KEY);
    clearCredentials();
  } catch (e) {
    console.error('Failed to clear boards:', e);
  }
}

/**
 * Saves application settings
 */
export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

/**
 * Loads application settings
 */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const allowedRatings = { ...DEFAULT_SETTINGS.allowedRatings, ...parsed.allowedRatings };
      if (!Object.values(allowedRatings).some(Boolean)) {
        allowedRatings.general = true;
        allowedRatings.sensitive = true;
        allowedRatings.questionable = true;
        allowedRatings.explicit = true;
      }
      return { ...DEFAULT_SETTINGS, ...parsed, allowedRatings };
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

export function getEffectiveSettings(board?: BooruBoard | null, baseSettings: AppSettings = DEFAULT_SETTINGS): AppSettings {
  if (board && board.settings) {
    return {
      ...baseSettings,
      ...board.settings,
      blacklist: Array.from(new Set([...(baseSettings.blacklist || []), ...(board.settings.blacklist || [])])),
      allowedRatings: {
        ...baseSettings.allowedRatings,
        ...(board.settings.allowedRatings || {})
      }
    };
  }
  return baseSettings;
}
