import { describe, expect, it, vi } from 'vitest';

import { OpenFMVProject } from '@/app/_types';

const {
  createOpenFMVBridge,
  openfmvBridgeMethods,
  registerIpcHandler,
  validateIpcArgs,
} = require('../../shared/ipc-contract');

const project: OpenFMVProject = {
  schemaVersion: 1,
  id: 'project-1',
  title: 'Project',
  graphData: {
    nodes: [],
    edges: [],
  },
  assets: [],
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('OpenFMV IPC contract', () => {
  it('generates bridge methods from the shared contract channels', async () => {
    const invoke = vi.fn(async () => project);
    const bridge = createOpenFMVBridge(invoke);

    expect(openfmvBridgeMethods).toContain('saveProject');
    await expect(bridge.saveProject(project)).resolves.toEqual(project);
    expect(invoke).toHaveBeenCalledWith('openfmv:save-project', project);
  });

  it('rejects invalid filesystem-facing arguments before handlers run', () => {
    expect(() => validateIpcArgs('importAsset', [''])).toThrow(/Invalid OpenFMV IPC args/);
    expect(() => validateIpcArgs('saveProject', [{ ...project, title: '' }])).toThrow(/Invalid OpenFMV IPC args/);
  });

  it('validates registered handler arguments and return values', async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const ipcMain = {
      handle: (channel: string, handler: (...args: unknown[]) => unknown) => handlers.set(channel, handler),
    };

    registerIpcHandler(ipcMain, 'saveProject', async (_event: unknown, nextProject: OpenFMVProject) => nextProject);

    await expect(handlers.get('openfmv:save-project')?.({}, project)).resolves.toEqual(project);
    await expect(handlers.get('openfmv:save-project')?.({}, { ...project, assets: 'bad' })).rejects.toThrow(/Invalid OpenFMV IPC args/);

    registerIpcHandler(ipcMain, 'importAsset', async () => ({ id: 'asset-1' }));

    await expect(handlers.get('openfmv:import-asset')?.({}, 'D:\\clip.mp4')).rejects.toThrow(/Invalid OpenFMV IPC result/);
  });
});
