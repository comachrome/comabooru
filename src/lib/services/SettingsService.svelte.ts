import type { AppSettings, AppReferrerPolicy } from '../api/types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../utils/storage';

export class SettingsService {
  settings = $state<AppSettings>({ ...DEFAULT_SETTINGS });

  constructor() {
    this.settings = loadSettings();
    this.applyTheme(this.settings.theme);
  }

  init() {
    this.settings = loadSettings();
    this.applyTheme(this.settings.theme);
  }

  private applyTheme(theme: 'dark' | 'light') {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  updateSettings(partial: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...partial };
    saveSettings(this.settings);
    if (partial.theme) {
      this.applyTheme(partial.theme);
    }
  }

  setTheme(theme: 'dark' | 'light') {
    this.updateSettings({ theme });
  }

  setGridDensity(gridDensity: 'compact' | 'comfortable') {
    this.updateSettings({ gridDensity });
  }

  addToBlacklist(tag: string) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return;
    if (!this.settings.blacklist.includes(trimmed)) {
      const nextBlacklist = [...this.settings.blacklist, trimmed];
      this.updateSettings({ blacklist: nextBlacklist });
    }
  }

  removeFromBlacklist(tag: string) {
    const trimmed = tag.trim().toLowerCase();
    const nextBlacklist = this.settings.blacklist.filter(t => t !== trimmed);
    this.updateSettings({ blacklist: nextBlacklist });
  }

  toggleRating(rating: keyof AppSettings['allowedRatings']) {
    const current = this.settings.allowedRatings || DEFAULT_SETTINGS.allowedRatings;
    const nextAllowed = { ...current, [rating]: !current[rating] };
    this.updateSettings({ allowedRatings: nextAllowed });
  }

  setReferrerPolicy(policy: AppReferrerPolicy) {
    this.updateSettings({ referrerPolicy: policy });
  }
}
