import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/lib/services/AuthService.svelte';
import { SettingsService } from '../../src/lib/services/SettingsService.svelte';
import { BoardService } from '../../src/lib/services/BoardService.svelte';
import { clearAllBoards, clearCredentials } from '../../src/lib/utils/storage';

describe('Board Service', () => {
  let authService: AuthService;
  let settingsService: SettingsService;
  let boardService: BoardService;

  beforeEach(() => {
    localStorage.clear();
    clearCredentials();
    clearAllBoards();
    authService = new AuthService();
    settingsService = new SettingsService();
    boardService = new BoardService(authService, settingsService);
  });

  it('starts with empty boards if no storage available', () => {
    expect(boardService.boards).toEqual([]);
    expect(boardService.activeBoardId).toBeNull();
    expect(boardService.activeBoard).toBeNull();
  });

  it('adds a new booru board and selects it as active', () => {
    const b1 = boardService.addBoard({
      name: 'Gelbooru Main',
      booruUrl: 'https://gelbooru.com',
      userId: '100',
      apiKey: 'key1'
    });

    expect(boardService.boards.length).toBe(1);
    expect(boardService.activeBoardId).toBe(b1.id);
    expect(boardService.activeBoard?.name).toBe('Gelbooru Main');
    expect(boardService.activeBoard?.userId).toBe('100');
  });

  it('allows adding multiple boards and switching between them', () => {
    const b1 = boardService.addBoard({
      name: 'Gelbooru Main',
      booruUrl: 'https://gelbooru.com',
      userId: '100',
      apiKey: 'key1'
    });

    const b2 = boardService.addBoard({
      name: 'Safebooru',
      booruUrl: 'https://safebooru.org',
      userId: '200',
      apiKey: 'key2'
    });

    expect(boardService.boards.length).toBe(2);
    expect(boardService.activeBoard?.id).toBe(b2.id);

    // Switch back to b1
    boardService.selectBoard(b1.id);
    expect(boardService.activeBoard?.id).toBe(b1.id);
    expect(boardService.activeBoard?.name).toBe('Gelbooru Main');
  });

  it('deletes a board and updates active board appropriately', () => {
    const b1 = boardService.addBoard({
      name: 'Gelbooru Main',
      booruUrl: 'https://gelbooru.com',
      userId: '100',
      apiKey: 'key1'
    });

    const b2 = boardService.addBoard({
      name: 'Safebooru',
      booruUrl: 'https://safebooru.org',
      userId: '200',
      apiKey: 'key2'
    });

    // Currently active is b2. Delete b2.
    boardService.deleteBoard(b2.id);

    expect(boardService.boards.length).toBe(1);
    expect(boardService.activeBoardId).toBe(b1.id);
    expect(boardService.activeBoard?.id).toBe(b1.id);

    // Delete remaining b1
    boardService.deleteBoard(b1.id);
    expect(boardService.boards.length).toBe(0);
    expect(boardService.activeBoard).toBeNull();
  });

  it('generates sequential numeric IDs for boards', () => {
    const b1 = boardService.addBoard({
      name: 'Board 1',
      booruUrl: 'https://gelbooru.com',
      userId: '1',
      apiKey: 'k1'
    });
    const b2 = boardService.addBoard({
      name: 'Board 2',
      booruUrl: 'https://danbooru.donmai.us',
      userId: '2',
      apiKey: 'k2'
    });

    expect(b1.id).toBe('1');
    expect(b2.id).toBe('2');
  });

  it('migrates legacy non-numeric board IDs to clean numeric IDs during init', () => {
    // Manually set legacy raw boards
    localStorage.setItem('comabooru_boards', JSON.stringify([
      { id: '1', name: 'Board 1', booruUrl: 'https://gelbooru.com', userId: '1', apiKey: 'k1' },
      { id: 'board_178499_bb1c', name: 'Legacy Board', booruUrl: 'https://danbooru.donmai.us', userId: '2', apiKey: 'k2' }
    ]));
    localStorage.setItem('comabooru_active_board_id', 'board_178499_bb1c');

    const newService = new BoardService(authService, settingsService);

    expect(newService.boards[0].id).toBe('1');
    expect(newService.boards[1].id).toBe('2');
    expect(newService.activeBoardId).toBe('2');
  });
});
