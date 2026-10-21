import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import type { WardrobeItem } from '../storage/localDb';
import { createObjectUrlStore } from './objectUrlStore';

function itemsOf(count: number): WardrobeItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${index}`,
    number: index + 1,
    photo: new Blob([`photo ${index}`]),
    addedAt: '2026-10-21T00:00:00.000Z',
  }));
}

describe('createObjectUrlStore', () => {
  let nextUrl: number;
  let createSpy: MockInstance<typeof URL.createObjectURL>;
  let revokeSpy: MockInstance<typeof URL.revokeObjectURL>;

  beforeEach(() => {
    nextUrl = 0;
    createSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:test/${nextUrl++}`);
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates one URL per item in order, and reports them as the snapshot', () => {
    const items = itemsOf(3);
    const store = createObjectUrlStore(items);

    store.subscribe(() => undefined);

    expect(createSpy).toHaveBeenCalledTimes(3);
    expect(createSpy.mock.calls.map(([blob]) => blob)).toEqual(items.map((item) => item.photo));
    expect(store.getSnapshot()).toEqual(['blob:test/0', 'blob:test/1', 'blob:test/2']);
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revokes every URL it created when the last subscriber unsubscribes', () => {
    const store = createObjectUrlStore(itemsOf(2));

    const unsubscribe = store.subscribe(() => undefined);
    unsubscribe();

    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenNthCalledWith(1, 'blob:test/0');
    expect(revokeSpy).toHaveBeenNthCalledWith(2, 'blob:test/1');
    expect(store.getSnapshot()).toEqual([]);
  });

  it('creates a fresh set after StrictMode unsubscribes and resubscribes', () => {
    const store = createObjectUrlStore(itemsOf(2));

    const firstUnsubscribe = store.subscribe(() => undefined);
    firstUnsubscribe();
    const secondUnsubscribe = store.subscribe(() => undefined);

    expect(createSpy).toHaveBeenCalledTimes(4);
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot()).toEqual(['blob:test/2', 'blob:test/3']);

    secondUnsubscribe();
    expect(revokeSpy).toHaveBeenCalledTimes(4);
    expect(revokeSpy.mock.calls.map(([url]) => url)).toEqual([
      'blob:test/0',
      'blob:test/1',
      'blob:test/2',
      'blob:test/3',
    ]);
  });

  it('notifies the subscriber once per subscribe', () => {
    const store = createObjectUrlStore(itemsOf(1));
    const onChange = vi.fn();

    store.subscribe(onChange);

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('creates and revokes nothing for an empty list', () => {
    const store = createObjectUrlStore([]);

    store.subscribe(() => undefined)();

    expect(createSpy).not.toHaveBeenCalled();
    expect(revokeSpy).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toEqual([]);
  });
});
