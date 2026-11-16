import { afterEach, describe, expect, it, vi } from 'vitest';
import { setSession } from '../auth/session';
import { accountWardrobeStore } from './remoteStore';

describe('accountWardrobeStore.listItems', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setSession(null);
  });

  it('reads the items from the {items} envelope the API returns', async () => {
    setSession({ accessToken: 'token', expiresAt: Date.now() + 60_000 });
    const fetchMock = vi.fn((url: string) => {
      if (url.endsWith('/wardrobe/items')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({ items: [{ id: 'a', number: 1, addedAt: '2026-11-16T10:00:00Z' }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(
        new Response(new Blob(['x'], { type: 'image/jpeg' }), { status: 200 }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const items = await accountWardrobeStore.listItems();

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'a', number: 1, addedAt: '2026-11-16T10:00:00Z' });
  });

  it('returns an empty list when the account has no items', async () => {
    setSession({ accessToken: 'token', expiresAt: Date.now() + 60_000 });
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ items: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    await expect(accountWardrobeStore.listItems()).resolves.toEqual([]);
  });
});
