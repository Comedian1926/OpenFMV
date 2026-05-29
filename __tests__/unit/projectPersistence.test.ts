import { describe, expect, it, vi } from 'vitest';

import { AppEdge, AppNode, OpenFMVProject } from '@/app/_types';
import { collectProjectAssetsFromGraph, createProjectSnapshot, defaultGraphData, ensureGraphData } from '@/app/_utils/projectPersistence';

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'generated-id'),
});

const storyNode: AppNode = {
  id: 'story',
  type: 'story',
  position: { x: 0, y: 0 },
  data: { type: 'story', title: 'Story', content: '', image: 'assets/scene.png' },
};

describe('projectPersistence', () => {
  it('creates a valid default graph', () => {
    const graph = defaultGraphData();

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].type).toBe('start');
    expect(graph.edges).toEqual([]);
  });

  it('normalizes empty graphs and removes invalid edges', () => {
    const graph = ensureGraphData({
      nodes: [storyNode],
      edges: [
        { id: 'valid', source: 'story', target: 'story-2' },
        { id: 'self', source: 'story', target: 'story' },
      ] as AppEdge[],
    });

    expect(graph.nodes).toEqual([storyNode]);
    expect(graph.edges).toEqual([]);
    expect(ensureGraphData({ nodes: [], edges: [] }).nodes[0].type).toBe('start');
  });

  it('indexes only media bound to playable graph nodes', () => {
    const assets = collectProjectAssetsFromGraph({ nodes: [storyNode], edges: [] });

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({
      type: 'image',
      name: 'scene.png',
      path: 'assets/scene.png',
    });
  });

  it('does not index transient, remote, data, or unknown asset sources', () => {
    const assets = collectProjectAssetsFromGraph({
      nodes: [
        {
          ...storyNode,
          data: {
            ...storyNode.data,
            image: 'blob:http://localhost/1',
            video: 'data:video/mp4;base64,AAAA',
            videoThumbnail: 'https://example.com/poster.png',
          },
        },
        {
          ...storyNode,
          id: 'unknown-relative',
          data: {
            ...storyNode.data,
            image: 'scene.png',
          },
        },
      ],
      edges: [],
    });

    expect(assets).toEqual([]);
  });

  it('creates a project snapshot with normalized graph, entry node, cover and existing assets', () => {
    const project: OpenFMVProject = {
      schemaVersion: 1,
      id: 'project',
      title: 'Old',
      graphData: { nodes: [], edges: [] },
      assets: [{ id: 'existing', type: 'image', name: 'Existing', path: 'assets/scene.png', relativePath: 'assets/scene.png', importedAt: '2026-01-01T00:00:00.000Z' }],
      metadata: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const snapshot = createProjectSnapshot(project, 'Next', [storyNode], [], project.assets);

    expect(snapshot.title).toBe('Next');
    expect(snapshot.graphData.nodes).toEqual([storyNode]);
    expect(snapshot.assets).toEqual(project.assets);
    expect(snapshot.metadata.coverImage).toBe('assets/scene.png');
    expect(snapshot.metadata.entryNodeId).toBe('story');
  });
});
