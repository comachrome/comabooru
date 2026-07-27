import { render, type RenderResult } from '@testing-library/svelte';
import { createServices, type AppServices } from '../src/lib/services/context';

const SERVICES_KEY = Symbol.for('APP_SERVICES');

export function createTestServices(): AppServices {
  return createServices();
}

export function renderWithServices<C extends Record<string, unknown>>(
  Component: import('svelte').Component<C>,
  options: { props?: C; services?: AppServices } = {}
): RenderResult<import('svelte').Component<C>> & { services: AppServices } {
  const services = options.services || createServices();
  const contextMap = new Map();
  // Svelte setContext uses the symbol or key
  contextMap.set(SERVICES_KEY, services);

  const result = render(Component, {
    props: options.props,
    context: contextMap
  } as unknown as Parameters<typeof render>[1]);

  return {
    ...result,
    services
  };
}
