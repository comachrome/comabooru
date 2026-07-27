import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/lib/services/AuthService.svelte';

describe('Auth Service', () => {
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    authService = new AuthService();
    authService.logout();
  });

  it('starts unauthenticated when storage is empty', () => {
    expect(authService.credentials).toBeNull();
    expect(authService.isAuthenticated).toBe(false);
  });

  it('sets credentials and updates isAuthenticated state', () => {
    const creds = {
      booruUrl: 'https://gelbooru.com',
      userId: '9999',
      apiKey: 'secret_api_key'
    };

    authService.setCredentials(creds);

    expect(authService.credentials).toEqual(creds);
    expect(authService.isAuthenticated).toBe(true);
  });

  it('logs out and clears state', () => {
    authService.setCredentials({
      booruUrl: 'https://gelbooru.com',
      userId: '9999',
      apiKey: 'secret_api_key'
    });

    expect(authService.isAuthenticated).toBe(true);

    authService.logout();

    expect(authService.credentials).toBeNull();
    expect(authService.isAuthenticated).toBe(false);
  });
});
