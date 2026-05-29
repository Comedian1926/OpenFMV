import { describe, expect, it } from 'vitest';

import { AppEdge, AppNode } from '@/app/_types';
import { addGraphEdge, addNodeAndGraphEdge, filterEdgesForNodes, isValidGraphConnection } from '@/app/_utils/graphRules';

const nodes: AppNode[] = [
  {
    id: 'source',
    type: 'story',
    position: { x: 0, y: 0 },
    data: { type: 'story', title: 'Source', content: '' },
  },
  {
    id: 'target-a',
    type: 'story',
    position: { x: 100, y: 0 },
    data: { type: 'story', title: 'Target A', content: '' },
  },
  {
    id: 'target-b',
    type: 'story',
    position: { x: 200, y: 0 },
    data: { type: 'story', title: 'Target B', content: '' },
  },
];

describe('graphRules', () => {
  it('rejects duplicate source and sourceHandle edges', () => {
    const edges = addGraphEdge({ source: 'source', sourceHandle: 'a', target: 'target-a', targetHandle: null }, [], nodes);
    const nextEdges = addGraphEdge({ source: 'source', sourceHandle: 'a', target: 'target-b', targetHandle: null }, edges, nodes);

    expect(nextEdges).toHaveLength(1);
    expect(nextEdges[0].target).toBe('target-a');
  });

  it('allows different handles from the same source', () => {
    const first = addGraphEdge({ source: 'source', sourceHandle: 'a', target: 'target-a', targetHandle: null }, [], nodes);
    const second = addGraphEdge({ source: 'source', sourceHandle: 'b', target: 'target-b', targetHandle: null }, first, nodes);

    expect(second).toHaveLength(2);
  });

  it('rejects self loops', () => {
    expect(isValidGraphConnection({ source: 'source', sourceHandle: null, target: 'source', targetHandle: null }, [], nodes)).toBe(false);
  });

  it('filters invalid persisted edges', () => {
    const persistedEdges = [
      { id: 'valid', source: 'source', target: 'target-a' },
      { id: 'missing-source', source: 'missing', target: 'target-a' },
      { id: 'missing-target', source: 'source', target: 'missing' },
      { id: 'self', source: 'source', target: 'source' },
    ] as AppEdge[];

    expect(filterEdgesForNodes(persistedEdges, nodes)).toEqual([{ id: 'valid', source: 'source', target: 'target-a' }]);
  });

  it('creates and connects a node atomically when the connection is valid', () => {
    const node: AppNode = {
      id: 'created',
      type: 'story',
      position: { x: 300, y: 0 },
      data: { type: 'story', title: 'Created', content: '' },
    };

    const result = addNodeAndGraphEdge(node, { source: 'source', sourceHandle: 'new', target: 'created', targetHandle: null }, nodes, []);

    expect(result.nodes).toHaveLength(4);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].target).toBe('created');
  });
});
