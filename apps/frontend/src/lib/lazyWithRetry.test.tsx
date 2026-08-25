import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import { lazyWithRetry } from './lazyWithRetry';

describe('lazyWithRetry', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('reloads once and does not surface an error when a chunk fails to load the first time', async () => {
    const reloadSpy = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload: reloadSpy } as any);

    const factory = () => Promise.reject(new Error('Failed to fetch dynamically imported module: /src/pages/Foo.tsx'));
    const Lazy = lazyWithRetry(factory);

    let caught: unknown;
    render(
      <Suspense fallback="loading">
        <Lazy />
      </Suspense>
    );

    // The component never resolves after a first failure — it reloads
    // instead of rendering an error boundary — so the fallback stays up.
    await waitFor(() => expect(reloadSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByText('loading')).toBeDefined();
    expect(sessionStorage.getItem(`bharatassist_chunk_retry:${factory.toString()}`)).toBe('1');
    expect(caught).toBeUndefined();
  });

  it('clears the retry flag and renders normally once the module loads', async () => {
    const key = `bharatassist_chunk_retry:${factory.toString()}`;
    function factory() {
      return Promise.resolve({ default: () => <div>Loaded</div> });
    }
    sessionStorage.setItem(key, '1');

    const Lazy = lazyWithRetry(factory);
    render(
      <Suspense fallback="loading">
        <Lazy />
      </Suspense>
    );

    await waitFor(() => expect(screen.getByText('Loaded')).toBeDefined());
    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
