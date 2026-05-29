import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AppWindowFrame from '@/app/_components/local/AppWindowFrame';

vi.mock('next/navigation', () => ({
  usePathname: () => '/projects',
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('AppWindowFrame', () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    vi.restoreAllMocks();
  });

  it('opens the OpenFMV AI settings center from the frame settings button', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(<AppWindowFrame><div>content</div></AppWindowFrame>);
    });

    const settingsButton = document.querySelector('button[title="Settings"]');
    expect(settingsButton).toBeTruthy();

    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('设置');
    expect(document.body.textContent).toContain('核心引擎');
  });
});
