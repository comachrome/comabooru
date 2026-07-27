// Gelbooru DAPI Data Types

export type Rating = 'general' | 'sensitive' | 'questionable' | 'explicit';

export type TagCategory = 'general' | 'artist' | 'copyright' | 'character' | 'meta';

export type BooruEngine = 'gelbooru' | 'danbooru';

export interface BooruPost {
  id: number;
  created_at: string;
  score: number;
  width: number;
  height: number;
  md5: string;
  directory: string;
  image: string;
  rating: Rating;
  source: string;
  change?: number;
  owner?: string;
  creator_id?: number;
  parent_id?: number;
  sample?: number | boolean;
  preview_height?: number;
  preview_width?: number;
  tags: string;
  title?: string;
  has_notes?: string | boolean;
  has_comments?: string | boolean;
  file_url: string;
  preview_url: string;
  sample_url: string;
}

export interface GelbooruPostsResponse {
  post?: BooruPost[];
  '@attributes'?: {
    limit: number;
    offset: number;
    count: number;
  };
}

export interface TagSuggestion {
  id: number;
  name: string;
  count: number;
  type: TagCategory;
  ambiguous?: number;
}


export interface BooruCredentials {
  engine?: BooruEngine;
  booruUrl: string; // e.g. https://gelbooru.com or https://danbooru.donmai.us
  userId: string;
  apiKey: string;
}

export interface BooruBoard {
  id: string;
  name: string;
  engine?: BooruEngine;
  booruUrl: string;
  userId: string;
  apiKey: string;
  settings?: Partial<AppSettings>;
}


export type AppReferrerPolicy = 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';

export interface AppSettings {
  theme: 'dark' | 'light';
  accentColor: string;
  gridDensity: 'compact' | 'comfortable';
  blacklist: string[];
  allowedRatings: {
    general: boolean;
    sensitive: boolean;
    questionable: boolean;
    explicit: boolean;
  };
  showRatingBadge: boolean;
  showDownloadButton: boolean;
  autoPlayVideo: boolean;
  loopVideo: boolean;
  muteVideo: boolean;
  referrerPolicy: AppReferrerPolicy;
  useProxyFallback: boolean;
  customProxyUrl?: string;
}
