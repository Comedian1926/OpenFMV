import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AppWindowFrame from '@/app/_components/local/AppWindowFrame';
import messages from '@/messages/zh-CN.json';

vi.mock('next/navigation', () => ({
  usePathname: () => '/zh-CN/projects',
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
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
      root.render(
        <NextIntlClientProvider locale="zh-CN" messages={messages}>
          <AppWindowFrame><div>content</div></AppWindowFrame>
        </NextIntlClientProvider>
      );
    });

    const settingsButton = document.querySelector('button[title="设置"]');
    expect(settingsButton).toBeTruthy();

    await act(async () => {
      settingsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('设置');
    expect(document.body.textContent).toContain('核心引擎');
  });
});
