import type { BooruCredentials } from '../api/types';
import { loadCredentials, saveCredentials, clearCredentials, clearAllBoards } from '../utils/storage';

export class AuthService {
  credentials = $state<BooruCredentials | null>(null);

  isAuthenticated = $derived(
    Boolean(this.credentials && this.credentials.userId && this.credentials.apiKey)
  );

  constructor() {
    this.credentials = loadCredentials();
  }

  init() {
    this.credentials = loadCredentials();
  }

  setCredentials(creds: BooruCredentials) {
    saveCredentials(creds);
    this.credentials = creds;
  }

  logout() {
    clearAllBoards();
    clearCredentials();
    this.credentials = null;
  }
}
