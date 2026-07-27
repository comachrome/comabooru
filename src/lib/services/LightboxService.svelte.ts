import type { BooruPost } from '../api/types';
import type { GalleryService } from './GalleryService.svelte';

export class LightboxService {
  isOpen = $state<boolean>(false);
  selectedPost = $state<BooruPost | null>(null);
  selectedIndex = $state<number>(-1);
  private isNavigating = false;

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

  async next() {
    if (this.isNavigating) return;
    this.isNavigating = true;
    
    try {
      let posts = this.galleryService.filteredPosts;
      if (posts.length === 0 || this.selectedIndex === -1) return;

      if (this.selectedIndex + 1 >= posts.length) {
        if (this.galleryService.hasMore) {
          if (this.galleryService.isLoadingMore) {
            while (this.galleryService.isLoadingMore) {
              await new Promise(r => setTimeout(r, 100));
            }
          } else {
            await this.galleryService.loadMore();
          }
          posts = this.galleryService.filteredPosts;
        }
        
        if (this.selectedIndex + 1 >= posts.length) {
          this.selectedIndex = 0;
          this.selectedPost = posts[0];
          return;
        }
      } else if (this.selectedIndex + 5 >= posts.length && this.galleryService.hasMore && !this.galleryService.isLoadingMore) {
        // Preload next page when getting close to the end
        this.galleryService.loadMore();
      }

      const nextIdx = this.selectedIndex + 1;
      this.selectedIndex = nextIdx;
      this.selectedPost = posts[nextIdx];
    } finally {
      this.isNavigating = false;
    }
  }

  prev() {
    const posts = this.galleryService.filteredPosts;
    if (posts.length === 0 || this.selectedIndex === -1) return;

    const prevIdx = (this.selectedIndex - 1 + posts.length) % posts.length;
    this.selectedIndex = prevIdx;
    this.selectedPost = posts[prevIdx];
  }
}
