import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';

const { getDefaultAiConfig, readAiConfig, registerAiSettingsIpc, saveAiConfig } = require('../../../electron/ai-settings');

describe('electron AI settings handlers', () => {
  it('returns default config when the settings file does not exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'openfmv-ai-settings-'));
    const app = { getPath: () => dir };

    try {
      await expect(readAiConfig(app)).resolves.toEqual(getDefaultAiConfig());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('registers an IPC handler that returns default config when no settings file exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'openfmv-ai-settings-ipc-'));
    const app = { getPath: () => dir };
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const ipcMain = {
      handle: (channel: string, handler: (...args: unknown[]) => unknown) => handlers.set(channel, handler),
    };

    try {
      registerAiSettingsIpc({ ipcMain, app });
      await expect(handlers.get('openfmv:get-ai-config')?.()).resolves.toEqual(getDefaultAiConfig());
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('normalizes saved config and drops unknown ids', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'openfmv-ai-settings-'));
    const app = { getPath: () => dir };

    try {
      const saved = await saveAiConfig(app, {
        selectedCliAgentId: 'ghost',
        byokProviders: [
          { providerId: 'anthropic', apiKey: 'key', baseUrl: 'https://api.test', model: 'claude-test' },
          { providerId: 'ghost', apiKey: 'ghost', baseUrl: 'https://ghost.test', model: 'ghost' },
        ],
      });

      expect(saved.selectedCliAgentId).toBe('codex');
      expect(saved.byokProviders.find((item: { providerId: string }) => item.providerId === 'anthropic')?.apiKey).toBe('key');
      expect(saved.byokProviders.some((item: { providerId: string }) => item.providerId === 'ghost')).toBe(false);
      await expect(readAiConfig(app)).resolves.toEqual(saved);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
