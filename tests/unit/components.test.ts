import '../setup';
import { describe, test, expect } from 'vitest';
import { fireEvent } from '@testing-library/svelte';
import MediaCard from '../../src/lib/components/gallery/MediaCard.svelte';
import SearchBar from '../../src/lib/components/search/SearchBar.svelte';
import FloatingBoardManager from '../../src/lib/components/board/FloatingBoardManager.svelte';
import Header from '../../src/lib/components/common/Header.svelte';
import SettingsModal from '../../src/lib/components/common/SettingsModal.svelte';
import LightboxModal from '../../src/lib/components/gallery/LightboxModal.svelte';
import BoardModal from '../../src/lib/components/board/BoardModal.svelte';
import FeedView from '../../src/lib/components/gallery/FeedView.svelte';
import { renderWithServices, createTestServices } from '../testUtils';
import type { BooruPost } from '../../src/lib/api/types';

const isVitest = Boolean(process.env.VITEST);

describe.skipIf(!isVitest)('Component Tests', () => {
  const mockPost: BooruPost = {
    id: 100,
    title: 'Test Post',
    file_url: 'https://cdn.example.com/images/100.jpg',
    preview_url: 'https://cdn.example.com/previews/100.jpg',
    sample_url: 'https://cdn.example.com/samples/100.jpg',
    width: 1200,
    height: 800,
    score: 42,
    rating: 'general',
    tags: 'cat_ears solo 1girl',
    owner: 'user1',
    created_at: '2026-01-01',
    md5: 'mockmd5100',
    directory: 'images/100',
    image: '100.jpg',
    source: 'https://example.com/source'
  };

  describe('MediaCard Component', () => {
    test('renders image with correct aspect-ratio and referrerpolicy', () => {
      const { container } = renderWithServices(MediaCard, { props: { post: mockPost } });
      const card = container.querySelector('.media-card') as HTMLElement;
      expect(card).not.toBeNull();
      expect(card.style.aspectRatio).toBe('1200 / 800');

      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('src')).toBe(`/p/${encodeURIComponent(mockPost.preview_url!)}`);
      expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
    });

    test('renders rating badge correctly', () => {
      const { container } = renderWithServices(MediaCard, { props: { post: mockPost } });
      const badge = container.querySelector('.badge.rating-general');
      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim()).toContain('G');
    });

    test('renders VIDEO badge for video files', () => {
      const videoPost: BooruPost = {
        ...mockPost,
        file_url: 'https://cdn.example.com/videos/101.mp4'
      };
      const { container } = renderWithServices(MediaCard, { props: { post: videoPost } });
      const videoBadge = container.querySelector('.badge.video');
      expect(videoBadge).not.toBeNull();
      expect(videoBadge?.textContent).toContain('VIDEO');
    });

    test('opens lightbox on card click', async () => {
      const services = createTestServices();
      const { container } = renderWithServices(MediaCard, { props: { post: mockPost }, services });
      const card = container.querySelector('.media-card') as HTMLElement;
      await fireEvent.click(card);

      expect(services.lightbox.isOpen).toBe(true);
      expect(services.lightbox.selectedPost?.id).toBe(100);
    });
  });

  describe('SearchBar Component', () => {
    test('renders input with custom placeholder and search container', () => {
      const { container } = renderWithServices(SearchBar);
      const input = container.querySelector('input');
      expect(input).not.toBeNull();
      expect(input?.placeholder).toContain('Поиск по тегам');
    });

    test('clears active tags and text on clear button click', async () => {
      const services = createTestServices();
      services.gallery.search('cat_ears solo');
      const { container } = renderWithServices(SearchBar, { services });

      const clearBtn = container.querySelector('.clear-btn');
      if (clearBtn) {
        await fireEvent.click(clearBtn);
      }

      const input = container.querySelector('input') as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });

  describe('FloatingBoardManager Component', () => {
    test('renders active board indicator pill and settings button', () => {
      const services = createTestServices();
      services.board.addBoard({
        name: 'Test Board',
        booruUrl: 'https://gelbooru.com',
        userId: '123',
        apiKey: 'key'
      });

      const { container } = renderWithServices(FloatingBoardManager, { props: { isBoardModalOpen: false }, services });
      const activePill = container.querySelector('.board-pill.active');
      expect(activePill).not.toBeNull();
      expect(container.querySelector('.pill-dot')).not.toBeNull();

      const settingsBtn = container.querySelector('.floating-settings-btn');
      expect(settingsBtn).not.toBeNull();
    });
  });

  describe('Header Component', () => {
    test('renders logo title and brand heading', () => {
      const { container } = renderWithServices(Header, { props: { isSettingsOpen: false, isBoardModalOpen: false } });
      const brand = container.querySelector('.logo-text');
      expect(brand).not.toBeNull();
      expect(brand?.textContent).toContain('comabooru');
    });
  });

  describe('FeedView Component', () => {
    test('renders slides and floating controls when posts exist', () => {
      const services = createTestServices();
      services.gallery.posts = [mockPost, { ...mockPost, id: 101 }];
      const { container } = renderWithServices(FeedView, { services });

      const slides = container.querySelectorAll('.feed-slide');
      expect(slides.length).toBe(2);

      const floatingCtrls = container.querySelector('.feed-controls-floating');
      expect(floatingCtrls).not.toBeNull();

      const counter = container.querySelector('.counter-badge');
      expect(counter?.textContent?.trim()).toBe('1 / 2');
    });
  });

  describe('LightboxModal Component', () => {
    test('does not render overlay when closed', () => {
      const services = createTestServices();
      services.lightbox.close();
      const { container } = renderWithServices(LightboxModal, { services });
      const backdrop = container.querySelector('.lightbox-overlay');
      expect(backdrop).toBeNull();
    });

    test('renders overlay and post image when open', () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });
      const backdrop = container.querySelector('.lightbox-overlay');
      expect(backdrop).not.toBeNull();

      const img = container.querySelector('img');
      expect(img).not.toBeNull();
      expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
    });

    test('toggles tag in pending search list without closing immediately', async () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });

      const plusBtn = container.querySelector('.tag-act') as HTMLButtonElement;
      expect(plusBtn).not.toBeNull();

      await fireEvent.click(plusBtn);

      expect(services.lightbox.isOpen).toBe(true);
      expect(plusBtn.classList.contains('active')).toBe(true);
    });

    test('toggles tag in pending blacklist list without closing immediately', async () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });

      const minusBtn = container.querySelector('.tag-act.exclude') as HTMLButtonElement;
      expect(minusBtn).not.toBeNull();

      await fireEvent.click(minusBtn);

      expect(services.lightbox.isOpen).toBe(true);
      expect(minusBtn.classList.contains('active')).toBe(true);
    });

    test('mutually excludes tag between pending search and blacklist when toggling', async () => {
      const services = createTestServices();
      services.lightbox.open(mockPost);
      const { container } = renderWithServices(LightboxModal, { services });

      const plusBtn = container.querySelector('.tag-act') as HTMLButtonElement;
      const minusBtn = container.querySelector('.tag-act.exclude') as HTMLButtonElement;
      expect(plusBtn).not.toBeNull();
      expect(minusBtn).not.toBeNull();

      // Click + to add tag to search
      await fireEvent.click(plusBtn);
      expect(plusBtn.classList.contains('active')).toBe(true);
      expect(minusBtn.classList.contains('active')).toBe(false);

      // Click - to add same tag to blacklist -> + should automatically become inactive
      await fireEvent.click(minusBtn);
      expect(plusBtn.classList.contains('active')).toBe(false);
      expect(minusBtn.classList.contains('active')).toBe(true);

      // Click + again -> - should automatically become inactive
      await fireEvent.click(plusBtn);
      expect(plusBtn.classList.contains('active')).toBe(true);
      expect(minusBtn.classList.contains('active')).toBe(false);
    });
  });

  describe('BoardModal Component', () => {
    test('renders submit button with explicit check and add label', () => {
      const services = createTestServices();
      const { container } = renderWithServices(BoardModal, { props: { isOpen: true }, services });

      const submitBtn = container.querySelector('.submit-btn') as HTMLButtonElement;
      expect(submitBtn).not.toBeNull();
      expect(submitBtn.textContent).toContain('Проверить и добавить доску');
    });

    test('shows validation error when submitted without required credentials', async () => {
      const services = createTestServices();
      const { container } = renderWithServices(BoardModal, { props: { isOpen: true }, services });

      const form = container.querySelector('form') as HTMLFormElement;
      expect(form).not.toBeNull();

      await fireEvent.submit(form);

      const alert = container.querySelector('.alert-error');
      expect(alert).not.toBeNull();
      expect(alert?.textContent).toContain('заполните');
    });
  });

  describe('SettingsModal Component', () => {
    test('calls gallery refresh when rating settings change', async () => {
      const services = createTestServices();
      services.gallery.searchQuery = 'cats';
      let refreshCalled = false;
      services.gallery.refresh = () => { refreshCalled = true; };

      const { container } = renderWithServices(SettingsModal, { props: { isOpen: true }, services });

      // Change rating setting
      services.settings.toggleRating('explicit');

      // Close modal by clicking close button
      const closeBtn = container.querySelector('.close-btn') as HTMLButtonElement;
      await fireEvent.click(closeBtn);

      expect(refreshCalled).toBe(true);
    });

    test('calls gallery loadMore when blacklist changes and filteredPosts becomes short', async () => {
      const services = createTestServices();
      services.gallery.searchQuery = 'cats';
      services.gallery.hasMore = true;
      services.gallery.posts = [
        { ...mockPost, tags: 'bad_tag' }
      ];
      let loadMoreCalled = false;
      services.gallery.loadMore = async () => { loadMoreCalled = true; };

      const { container } = renderWithServices(SettingsModal, { props: { isOpen: true }, services });

      // Add to blacklist, which filters out the post
      services.settings.addToBlacklist('bad_tag');

      // Close modal
      const closeBtn = container.querySelector('.close-btn') as HTMLButtonElement;
      await fireEvent.click(closeBtn);

      expect(loadMoreCalled).toBe(true);
    });
  });
});
