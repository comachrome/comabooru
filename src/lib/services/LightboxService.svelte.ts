import type { BooruPost } from '../api/types';
import type { GalleryService } from './GalleryService.svelte';

export class LightboxService {
  isOpen = $state<boolean>(false);
  selectedPost = $state<BooruPost | null>(null);
  selectedIndex = $state<number>(-1);

  constructor(private galleryService: GalleryService) {}

  open(post: BooruPost) {
    const posts = this.galleryService.filteredPosts;
    const index = posts.findIndex(p => p.id === post.id);

    this.isOpen = true;
    this.selectedPost = post;
    this.selectedIndex = index !== -1 ? index : 0;
  }

  close() {
    this.isOpen = false;
    this.selectedPost = null;
    this.selectedIndex = -1;
  }

  next() {
    const posts = this.galleryService.filteredPosts;
    if (posts.length === 0 || this.selectedIndex === -1) return;

    const nextIdx = (this.selectedIndex + 1) % posts.length;
    this.selectedIndex = nextIdx;
    this.selectedPost = posts[nextIdx];
  }

  prev() {
    const posts = this.galleryService.filteredPosts;
    if (posts.length === 0 || this.selectedIndex === -1) return;

    const prevIdx = (this.selectedIndex - 1 + posts.length) % posts.length;
    this.selectedIndex = prevIdx;
    this.selectedPost = posts[prevIdx];
  }
}
