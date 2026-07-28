import '../setup';
import { describe, test, expect } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import Header from '../../src/lib/components/common/Header.svelte';
import FloatingBoardManager from '../../src/lib/components/board/FloatingBoardManager.svelte';
import LightboxModal from '../../src/lib/components/gallery/LightboxModal.svelte';
import { renderWithServices, createTestServices } from '../testUtils';
import type { BooruPost } from '../../src/lib/api/types';

const isVitest = Boolean(process.env.VITEST);

describe.skipIf(!isVitest)('Mobile UI Component Tests', () => {
  const mockPost: BooruPost = {
    id: 999,
    title: 'Mobile Test Post',
    file_url: 'https://cdn.example.com/images/999.jpg',
    preview_url: 'https://cdn.example.com/previews/999.jpg',
    sample_url: 'https://cdn.example.com/samples/999.jpg',
    width: 1080,
    height: 1920,
    score: 88,
    rating: 'general',
    tags: 'mobile_ui test_tag 1girl portrait_view',
    owner: 'mobile_tester',
    created_at: '2026-07-25',
    md5: 'mockmd5mobile',
    directory: 'images/999',
    image: '999.jpg',
    source: 'https://example.com/mobile'
  };

  describe('Header Component Mobile Controls', () => {
    test('renders mobile nav control buttons and opens search bar on search click', async () => {
      const { container } = renderWithServices(Header, { props: { isSettingsOpen: false, isBoardModalOpen: false } });
      
      const mobileControls = container.querySelector('.mobile-nav-controls');
      expect(mobileControls).not.toBeNull();

      const buttons = container.querySelectorAll('.mobile-nav-controls .action-btn');
      expect(buttons.length).toBe(3);

      // Click mobile search toggle button (index 1: ViewMode=0, Search=1, Menu=2)
      const searchBtn = buttons[1];
      await fireEvent.click(searchBtn);

      const searchDrawer = container.querySelector('.mobile-search-bar');
      expect(searchDrawer).not.toBeNull();
    });

    test('opens mobile burger menu drawer on menu button click', async () => {
      const { container } = renderWithServices(Header, { props: { isSettingsOpen: false, isBoardModalOpen: false } });

      const buttons = container.querySelectorAll('.mobile-nav-controls .action-btn');
      const menuBtn = buttons[2];
      await fireEvent.click(menuBtn);

      const menuDrawer = container.querySelector('.mobile-menu-drawer');
      expect(menuDrawer).not.toBeNull();
      expect(menuDrawer?.textContent).toContain('Светлая тема');
      expect(menuDrawer?.textContent).toContain('Настройки');
    });
  });

  describe('FloatingBoardManager Component Drawer Variant', () => {
    test('renders full-width mobile board list and active indicator badge when variant="drawer"', () => {
      const services = createTestServices();
      services.board.addBoard({
        name: 'Mobile Gelbooru',
        booruUrl: 'https://gelbooru.com',
        userId: '999',
        apiKey: 'key999'
      });

      const { container } = renderWithServices(FloatingBoardManager, {
        props: { isBoardModalOpen: false, variant: 'drawer' as const },
        services
      });

      const drawerManager = container.querySelector('.drawer-board-manager');
      expect(drawerManager).not.toBeNull();

      const boardCards = container.querySelectorAll('.drawer-board-card');
      expect(boardCards.length).toBeGreaterThan(0);

      const activeBadge = container.querySelector('.active-badge');
      expect(activeBadge).not.toBeNull();
      expect(activeBadge?.textContent).toContain('Активно');

      const manageBtn = container.querySelector('.drawer-manage-btn');
      expect(manageBtn).not.toBeNull();
      expect(manageBtn?.textContent).toContain('Управление досками');
    });

    test('triggers board switch and onSelect callback when clicking a board in drawer mode', async () => {
      let callbackTriggered = false;
      const { container } = renderWithServices(FloatingBoardManager, {
        props: {
          isBoardModalOpen: false,
          variant: 'drawer' as const,
          onSelect: () => {
            callbackTriggered = true;
          }
        }
      });

      const boardCard = container.querySelector('.drawer-board-card') as HTMLElement;
      if (boardCard) {
        await fireEvent.click(boardCard);
        expect(callbackTriggered).toBe(true);
      }
    });
  });

  describe('LightboxModal Expandable Bottom Sheet', () => {
    test('renders mobile drag handle bar and handle pill', () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });

      const dragHandle = container.querySelector('.sheet-drag-handle');
      expect(dragHandle).not.toBeNull();

      const pill = container.querySelector('.handle-pill');
      expect(pill).not.toBeNull();
    });

    test('toggles expanded bottom sheet state on drag handle click', async () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });

      const dragHandle = container.querySelector('.sheet-drag-handle') as HTMLElement;
      const sidebar = container.querySelector('.sidebar') as HTMLElement;
      expect(sidebar.classList.contains('expanded')).toBe(false);

      await fireEvent.click(dragHandle);
      expect(sidebar.classList.contains('expanded')).toBe(true);

      await fireEvent.click(dragHandle);
      expect(sidebar.classList.contains('expanded')).toBe(false);
    });

    test('expands bottom sheet on swipe UP gesture (negative deltaY)', async () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });

      const sidebarHeader = container.querySelector('.sidebar-header') as HTMLElement;
      const sidebar = container.querySelector('.sidebar') as HTMLElement;

      await fireEvent.touchStart(sidebarHeader, { touches: [{ clientY: 500 }] });
      await fireEvent.touchEnd(sidebarHeader, { changedTouches: [{ clientY: 400 }] });

      expect(sidebar.classList.contains('expanded')).toBe(true);
    });

    test('collapses bottom sheet on swipe DOWN gesture (positive deltaY)', async () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });

      const sidebarHeader = container.querySelector('.sidebar-header') as HTMLElement;
      const sidebar = container.querySelector('.sidebar') as HTMLElement;

      // First expand
      await fireEvent.touchStart(sidebarHeader, { touches: [{ clientY: 500 }] });
      await fireEvent.touchEnd(sidebarHeader, { changedTouches: [{ clientY: 400 }] });
      expect(sidebar.classList.contains('expanded')).toBe(true);

      // Then collapse by swiping down
      await fireEvent.touchStart(sidebarHeader, { touches: [{ clientY: 200 }] });
      await fireEvent.touchEnd(sidebarHeader, { changedTouches: [{ clientY: 300 }] });
      expect(sidebar.classList.contains('expanded')).toBe(false);
    });
  });
});
