import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_SETTINGS } from '../../src/lib/utils/storage';

describe('Architectural & System Invariant Tests', () => {
  const srcDir = path.resolve('./src');

  function getAllFiles(dir: string, extList: string[]): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file: string) => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(fullPath, extList));
      } else if (extList.some(ext => fullPath.endsWith(ext))) {
        results.push(fullPath);
      }
    });
    return results;
  }

  describe('Theme & Aesthetic Invariants', () => {
    test('default dark theme uses pitch black OLED (#000000) for app background', () => {
      const variablesCss = fs.readFileSync(path.join(srcDir, 'lib/styles/variables.css'), 'utf-8');
      expect(variablesCss).toContain('--bg-app: #000000');
    });

    test('no purple colors (rgba(124, 58, 237), #7c3aed, etc.) remain in CSS/Svelte files', () => {
      const files = getAllFiles(srcDir, ['.css', '.svelte']);
      const purplePatterns = [/124,\s*58,\s*237/i, /#7c3aed/i, /#8b5cf6/i, /purple/i];

      files.forEach((filePath: string) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        purplePatterns.forEach(pattern => {
          expect(content, `File ${path.basename(filePath)} contains prohibited purple color match: ${pattern}`).not.toMatch(pattern);
        });
      });
    });

    test('AppSettings schema enforces dark|light themes and compact|comfortable densities', () => {
      expect(['dark', 'light']).toContain(DEFAULT_SETTINGS.theme);
      expect(['compact', 'comfortable']).toContain(DEFAULT_SETTINGS.gridDensity);
      expect(DEFAULT_SETTINGS).not.toHaveProperty('paginationMode');
      expect(DEFAULT_SETTINGS).not.toHaveProperty('oled');
    });
  });

  describe('Single-Engine Infinite Scroll Architecture', () => {
    test('PaginationControls.svelte has been purged completely from project', () => {
      const paginationComponentPath = path.join(srcDir, 'lib/components/gallery/PaginationControls.svelte');
      expect(fs.existsSync(paginationComponentPath)).toBe(false);
    });

    test('GalleryGrid.svelte uses IntersectionObserver sentinel for infinite loading', () => {
      const galleryGridPath = path.join(srcDir, 'lib/components/gallery/GalleryGrid.svelte');
      const content = fs.readFileSync(galleryGridPath, 'utf-8');
      expect(content).toContain('IntersectionObserver');
      expect(content).toContain('use:setupObserver');
      expect(content).not.toContain('PaginationControls');
    });
  });

  describe('CDN Security & Referrer Policy Contract', () => {
    test('MediaCard.svelte enforces referrerpolicy attribute on <img>', () => {
      const mediaCardPath = path.join(srcDir, 'lib/components/gallery/MediaCard.svelte');
      const content = fs.readFileSync(mediaCardPath, 'utf-8');
      expect(content).toMatch(/referrerpolicy=\{[^}]+\}/);
    });

    test('LightboxModal.svelte enforces referrerpolicy attribute on <img>', () => {
      const lightboxPath = path.join(srcDir, 'lib/components/gallery/LightboxModal.svelte');
      const content = fs.readFileSync(lightboxPath, 'utf-8');
      expect(content).toMatch(/referrerpolicy=\{[^}]+\}/);
    });
  });
});
