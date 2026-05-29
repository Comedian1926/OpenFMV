import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import OpenFMVAiSettingsCenter from '@/app/_components/local/OpenFMVAiSettingsCenter';
import { OpenFMVAgentInfo, OpenFMVAiConfig } from '@/app/_types';
import { getDefaultOpenFMVAiConfig, normalizeOpenFMVAiConfig } from '@/app/_utils/aiSettings';

let container: HTMLDivElement;
let root: Root;
let savedConfig: OpenFMVAiConfig;

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const renderSettings = async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<OpenFMVAiSettingsCenter onClose={vi.fn()} />);
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('OpenFMVAiSettingsCenter', () => {
  beforeEach(() => {
    savedConfig = getDefaultOpenFMVAiConfig();
    window.openfmv = {
      getAiConfig: vi.fn(async () => savedConfig),
      saveAiConfig: vi.fn(async (config: OpenFMVAiConfig) => {
        savedConfig = normalizeOpenFMVAiConfig(config);
        return savedConfig;
      }),
      detectAiAgents: vi.fn(async (): Promise<OpenFMVAgentInfo[]> => [
        { id: 'codex', name: 'Codex CLI', bin: 'codex', version: '', available: false, models: ['gpt-5-codex'], reasoningOptions: ['minimal', 'low', 'medium', 'high'] },
        { id: 'claude', name: 'Claude Code', bin: 'claude', version: '1.2.3', available: true, models: ['claude-sonnet-4.5'] },
      ]),
      testAiAgent: vi.fn(async () => ({ ok: true, message: 'CLI available' })),
      testByokProvider: vi.fn(async () => ({ ok: true, message: 'HTTP 200' })),
      testMediaProvider: vi.fn(async () => ({ ok: true, message: 'HTTP 200' })),
    };
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    vi.restoreAllMocks();
  });

  it('shows local CLI execution settings without BYOK', async () => {
    await renderSettings();

    expect(document.body.textContent).toContain('CLI');
    expect(document.body.textContent).not.toContain('Execution mode');
    expect(document.body.textContent).toContain('CLI');
    expect(document.body.textContent).not.toContain('BYOK Provider');
    expect(document.body.textContent).not.toContain('Anthropic');
    expect(document.body.textContent).not.toContain('Execution mode');
    expect(document.body.textContent).toContain('Codex CLI');
    expect(document.body.textContent).toContain('CLI');
    expect(document.body.textContent).toContain('Claude Code');
    expect(document.body.textContent).toContain('1.2.3');
  });

  it('renders Open Design agent icon assets for local CLI agents', async () => {
    await renderSettings();

    const icons = Array.from(document.querySelectorAll('img[src^="/agent-icons/"]')) as HTMLImageElement[];
    expect(icons.map((icon) => icon.getAttribute('src'))).toContain('/agent-icons/codex.svg');
    expect(icons.map((icon) => icon.getAttribute('src'))).toContain('/agent-icons/claude.svg');
  });

  it('opens model configuration inside the matching CLI card', async () => {
    await renderSettings();

    expect(document.body.textContent).not.toContain('Execution mode');

    const configureButton = Array.from(document.querySelectorAll('button')).filter((button) => button.textContent?.includes('配置')).at(-1);
    expect(configureButton).toBeTruthy();

    await act(async () => {
      configureButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('CLI');
    expect(document.body.textContent).toContain('CLI');
    expect(document.querySelectorAll('section.rounded-\\[14px\\]').length).toBe(1);
  });
});
