import { setContext, getContext } from 'svelte';
import { AuthService } from './AuthService.svelte';
import { SettingsService } from './SettingsService.svelte';
import { BoardService } from './BoardService.svelte';
import { GalleryService } from './GalleryService.svelte';
import { LightboxService } from './LightboxService.svelte';

export interface AppServices {
  auth: AuthService;
  settings: SettingsService;
  board: BoardService;
  gallery: GalleryService;
  lightbox: LightboxService;
}

const SERVICES_KEY = Symbol.for('APP_SERVICES');

export function createServices(): AppServices {
  const auth = new AuthService();
  const settings = new SettingsService();
  const board = new BoardService(auth, settings);
  const gallery = new GalleryService(auth, board);
  const lightbox = new LightboxService(gallery);

  return { auth, settings, board, gallery, lightbox };
}

export function setAppServices(services: AppServices) {
  setContext(SERVICES_KEY, services);
}

export function getAppServices(): AppServices {
  const services = getContext<AppServices>(SERVICES_KEY);
  if (!services) {
    throw new Error('AppServices were not found in Svelte Context tree.');
  }
  return services;
}

export function getAuthService(): AuthService {
  return getAppServices().auth;
}

export function getSettingsService(): SettingsService {
  return getAppServices().settings;
}

export function getBoardService(): BoardService {
  return getAppServices().board;
}

export function getGalleryService(): GalleryService {
  return getAppServices().gallery;
}

export function getLightboxService(): LightboxService {
  return getAppServices().lightbox;
}
