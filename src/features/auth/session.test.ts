import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  clearSession,
  consumeSignOutReason,
  getGuestCartId,
  getSession,
  isSessionExpired,
  reloadSessionFromStorage,
  safeRedirect,
  SESSION_STORAGE_KEY,
  setSession,
  subscribeSession,
  type Session,
} from './session';

const session = (over: Partial<Session> = {}): Session => ({
  token: 'tok-1',
  expiresAt: '2099-01-01T00:00:00.000Z',
  user: {
    id: 'user-1',
    email: 'a@kurio.test',
    displayName: 'A',
    username: 'a',
    avatarUrl: null,
    bio: null,
  },
  ...over,
});

afterEach(() => {
  clearSession('logout');
  consumeSignOutReason();
});

describe('sessão', () => {
  test('setSession persiste em localStorage e notifica com a sessão anterior', () => {
    const calls: Array<[string | undefined, string | undefined]> = [];
    const unsubscribe = subscribeSession((next, prev) => calls.push([next?.user.id, prev?.user.id]));

    setSession(session());
    expect(getSession()?.token).toBe('tok-1');
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? '{}').token).toBe('tok-1');

    clearSession('logout');
    expect(getSession()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(calls).toEqual([
      ['user-1', undefined],
      [undefined, 'user-1'],
    ]);
    unsubscribe();
  });

  test('armazenamento corrompido ou fora do contrato vira "sem sessão"', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{"token": 1');
    expect(reloadSessionFromStorage()).toBeNull();
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: 'x' }));
    expect(reloadSessionFromStorage()).toBeNull();
  });

  test('motivo de saída "expired" é consumido uma única vez', () => {
    setSession(session());
    clearSession('expired');
    expect(consumeSignOutReason()).toBe('expired');
    expect(consumeSignOutReason()).toBeNull();
  });

  test('isSessionExpired compara expiresAt com o relógio', () => {
    vi.useFakeTimers({ now: new Date('2026-11-24T12:00:00.000Z') });
    expect(isSessionExpired(session({ expiresAt: '2026-11-24T11:59:59.000Z' }))).toBe(true);
    expect(isSessionExpired(session({ expiresAt: '2026-11-24T12:00:01.000Z' }))).toBe(false);
    vi.useRealTimers();
  });

  test('getGuestCartId cria uma vez e reaproveita', () => {
    const first = getGuestCartId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(getGuestCartId()).toBe(first);
  });
});

describe('safeRedirect()', () => {
  test.each([
    ['/perfil', '/perfil'],
    ['/nft/abc?x=1#h', '/nft/abc?x=1#h'],
    [undefined, '/'],
    ['', '/'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    ['javascript:alert(1)', '/'],
    ['/login?redirect=%2Fperfil', '/'],
    ['/cadastro', '/'],
  ])('%s → %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });
});
