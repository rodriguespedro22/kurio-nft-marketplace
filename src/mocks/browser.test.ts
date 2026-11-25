import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { enableMocking } from './browser';
import { scheduleOpenOrders } from './handlers/orders';
import { mountMockPanel } from './panel/mount';

const worker = vi.hoisted(() => ({ start: vi.fn(() => Promise.resolve()) }));

vi.mock('msw/browser', () => ({ setupWorker: () => worker }));
vi.mock('./handlers', () => ({ handlers: [] }));
vi.mock('./handlers/orders', () => ({ scheduleOpenOrders: vi.fn() }));
vi.mock('./panel/mount', () => ({ mountMockPanel: vi.fn() }));

/** `navigator.serviceWorker` mínimo: o jsdom não tem Service Worker. */
class FakeServiceWorkerContainer extends EventTarget {
  controller: object | null = null;
}

let container: FakeServiceWorkerContainer;

beforeEach(() => {
  container = new FakeServiceWorkerContainer();
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('enableMocking', () => {
  test('página sob o Service Worker: conclui logo depois do start', async () => {
    container.controller = {};

    await enableMocking();

    expect(worker.start).toHaveBeenCalledOnce();
    expect(scheduleOpenOrders).toHaveBeenCalledOnce();
    expect(mountMockPanel).toHaveBeenCalledOnce();
  });

  test('página sem controlador: só conclui quando o Service Worker assume a página', async () => {
    let done = false;
    const enabling = enableMocking().then(() => {
      done = true;
    });

    await settle();
    // O MSW recarrega uma página sem controlador; até lá o app não pode renderizar, senão as
    // chamadas vão para a rede real.
    expect(worker.start).toHaveBeenCalledOnce();
    expect(done).toBe(false);
    expect(scheduleOpenOrders).not.toHaveBeenCalled();
    expect(mountMockPanel).not.toHaveBeenCalled();

    container.controller = {};
    container.dispatchEvent(new Event('controllerchange'));
    await enabling;

    expect(done).toBe(true);
    expect(scheduleOpenOrders).toHaveBeenCalledOnce();
    expect(mountMockPanel).toHaveBeenCalledOnce();
  });
});
