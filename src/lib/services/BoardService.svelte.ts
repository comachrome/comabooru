import { SvelteSet, SvelteMap } from 'svelte/reactivity';
import type { BooruBoard, AppSettings } from '../api/types';
import { loadBoardsData, saveBoardsData } from '../utils/storage';
import type { AuthService } from './AuthService.svelte';
import type { SettingsService } from './SettingsService.svelte';

export class BoardService {
  boards = $state<BooruBoard[]>([]);
  activeBoardId = $state<string | null>(null);

  activeBoard = $derived(
    this.boards.find(b => b.id === this.activeBoardId) || null
  );

  constructor(
    private authService: AuthService,
    private settingsService: SettingsService
  ) {
    this.init();
  }

  init() {
    const data = loadBoardsData();
    let loadedBoards = data.boards;
    let activeId = data.activeBoardId;

    let needsSave = false;
    let currentMax = 0;

    // Check if any board has a non-numeric ID and migrate to numeric IDs
    const hasNonNumeric = loadedBoards.some(b => isNaN(Number(b.id)));
    if (hasNonNumeric) {
      const idMap = new SvelteMap<string, string>();
      loadedBoards = loadedBoards.map(b => {
        if (!isNaN(Number(b.id))) {
          const num = Number(b.id);
          if (num > currentMax) currentMax = num;
          return b;
        } else {
          currentMax++;
          const newId = String(currentMax);
          idMap.set(b.id, newId);
          return { ...b, id: newId };
        }
      });
      if (activeId && idMap.has(activeId)) {
        activeId = idMap.get(activeId)!;
      }
      needsSave = true;
    }

    this.boards = loadedBoards;
    this.activeBoardId = activeId;

    if (!this.activeBoardId && this.boards.length > 0) {
      this.selectBoard(this.boards[0].id);
    } else if (needsSave) {
      saveBoardsData(this.boards, this.activeBoardId);
    }
  }

  getEffectiveSettings(): AppSettings {
    const globalSettings = this.settingsService.settings;
    if (this.activeBoard && this.activeBoard.settings) {
      return {
        ...globalSettings,
        ...this.activeBoard.settings,
        blacklist: Array.from(new SvelteSet([...(globalSettings.blacklist || []), ...(this.activeBoard.settings.blacklist || [])])),
        allowedRatings: {
          ...globalSettings.allowedRatings,
          ...(this.activeBoard.settings.allowedRatings || {})
        }
      };
    }
    return globalSettings;
  }

  selectBoard(id: string) {
    const target = this.boards.find(b => b.id === id);
    if (!target) return;

    this.activeBoardId = id;
    saveBoardsData(this.boards, id);

    this.authService.setCredentials({
      engine: target.engine || 'gelbooru',
      booruUrl: target.booruUrl,
      userId: target.userId,
      apiKey: target.apiKey
    });
  }

  addBoard(boardData: Omit<BooruBoard, 'id'>): BooruBoard {
    const numericIds = this.boards
      .map(b => parseInt(b.id, 10))
      .filter(n => !isNaN(n));
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;

    const newBoard: BooruBoard = {
      ...boardData,
      id: String(nextId)
    };

    const nextBoards = [...this.boards, newBoard];
    this.boards = nextBoards;
    saveBoardsData(nextBoards, newBoard.id);

    this.selectBoard(newBoard.id);
    return newBoard;
  }

  updateBoard(id: string, updates: Partial<Omit<BooruBoard, 'id'>>) {
    const nextBoards = this.boards.map(b => {
      if (b.id !== id) return b;
      return { ...b, ...updates };
    });

    this.boards = nextBoards;
    saveBoardsData(nextBoards, this.activeBoardId);

    if (this.activeBoardId === id) {
      const updated = nextBoards.find(b => b.id === id);
      if (updated) {
        this.authService.setCredentials({
          engine: updated.engine || 'gelbooru',
          booruUrl: updated.booruUrl,
          userId: updated.userId,
          apiKey: updated.apiKey
        });
      }
    }
  }

  updateBoardSettings(id: string, settings: Partial<AppSettings>) {
    const nextBoards = this.boards.map(b => {
      if (b.id !== id) return b;
      return {
        ...b,
        settings: {
          ...(b.settings || {}),
          ...settings
        }
      };
    });
    this.boards = nextBoards;
    saveBoardsData(nextBoards, this.activeBoardId);
  }

  resetBoardSettings(id: string) {
    const nextBoards = this.boards.map(b => {
      if (b.id !== id) return b;
      const { settings, ...rest } = b;
      return rest;
    });
    this.boards = nextBoards;
    saveBoardsData(nextBoards, this.activeBoardId);
  }

  deleteBoard(id: string) {
    const nextBoards = this.boards.filter(b => b.id !== id);
    this.boards = nextBoards;

    if (this.activeBoardId === id) {
      if (nextBoards.length > 0) {
        this.selectBoard(nextBoards[0].id);
      } else {
        this.activeBoardId = null;
        saveBoardsData(nextBoards, null);
        this.authService.logout();
      }
    } else {
      saveBoardsData(nextBoards, this.activeBoardId);
    }
  }
}
