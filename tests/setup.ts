import { JSDOM } from 'jsdom';

if (typeof globalThis.document === 'undefined') {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>', {
    url: 'http://localhost/',
    referrer: 'http://localhost/'
  });

  const win = dom.window as unknown as Window & typeof globalThis;
  (globalThis as unknown as Record<string, unknown>).window = win;
  (globalThis as unknown as Record<string, unknown>).document = dom.window.document;
  (globalThis as unknown as Record<string, unknown>).navigator = dom.window.navigator;
  (globalThis as unknown as Record<string, unknown>).HTMLElement = dom.window.HTMLElement;
  (globalThis as unknown as Record<string, unknown>).Element = dom.window.Element;
  (globalThis as unknown as Record<string, unknown>).Node = dom.window.Node;
  (globalThis as unknown as Record<string, unknown>).MutationObserver = dom.window.MutationObserver;
  (globalThis as unknown as Record<string, unknown>).CustomEvent = dom.window.CustomEvent;
  (globalThis as unknown as Record<string, unknown>).Event = dom.window.Event;
  (globalThis as unknown as Record<string, unknown>).MouseEvent = dom.window.MouseEvent;
  (globalThis as unknown as Record<string, unknown>).KeyboardEvent = dom.window.KeyboardEvent;

  if (typeof globalThis.localStorage === 'undefined') {
    (globalThis as unknown as Record<string, unknown>).localStorage = dom.window.localStorage;
  }
}
