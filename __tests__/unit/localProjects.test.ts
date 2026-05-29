import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OpenFMVAsset, OpenFMVProject } from '@/app/_types';
import { addAssetsToLocalProject } from '@/app/_utils/localProjects';

const PROJECTS_KEY = 'openfmv-local-projects';

const project: OpenFMVProject = {
  schemaVersion: 1,
  id: 'project-1',
  title: 'Project',
  graphData: {
    nodes: [
      {
        id: 'start-node',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { type: 'start', label: 'Start' },
      },
    ],
    edges: [],
  },
  assets: [
    {
      id: 'asset-1',
      type: 'image',
      name: 'Scene',
      path: 'file:///D:/scene.png',
      relativePath: 'assets/scene.png',
      importedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const nextAsset: OpenFMVAsset = {
  id: 'asset-2',
  type: 'video',
  name: 'Clip',
  path: 'file:///D:/clip.mp4',
  relativePath: 'assets/clip.mp4',
  importedAt: '2026-01-02T00:00:00.000Z',
};

describe('localProjects', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {
      [PROJECTS_KEY]: JSON.stringify([project]),
    };

    const localStorageMock = {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        storage = {};
      }),
      key: vi.fn((index: number) => Object.keys(storage)[index] ?? null),
      get length() {
        return Object.keys(storage).length;
      },
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: localStorageMock,
    });
  });

  it('adds editor imported assets to the current local project with de-duplication', async () => {
    await addAssetsToLocalProject('project-1', [
      { ...nextAsset, id: 'duplicate-id', path: 'file:///other/scene.png', relativePath: 'assets/scene.png' },
      nextAsset,
    ]);

    const savedProjects = JSON.parse(storage[PROJECTS_KEY]) as OpenFMVProject[];

    expect(savedProjects[0].assets).toHaveLength(2);
    expect(savedProjects[0].assets.map((asset) => asset.id)).toEqual(['asset-1', 'asset-2']);
  });
});
