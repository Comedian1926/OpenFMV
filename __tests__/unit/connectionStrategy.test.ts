import { describe, expect, it } from 'vitest';

import {
  createNodeDropConnection,
  createPendingNodeConnection,
  createPendingReconnectConnection,
  createReconnectToNodeConnection,
  getEventClientPoint,
} from '@/app/_components/editor/canvas/connectionStrategy';

describe('editor canvas connectionStrategy', () => {
  it('creates forward and reverse node drop connections', () => {
    expect(createNodeDropConnection({ nodeId: 'source', handleId: 'out', handleType: 'source' }, 'target', 'in')).toEqual({
      source: 'source',
      sourceHandle: 'out',
      target: 'target',
      targetHandle: 'in',
    });

    expect(createNodeDropConnection({ nodeId: 'target', handleId: 'in', handleType: 'target' }, 'source', 'out')).toEqual({
      source: 'source',
      sourceHandle: 'out',
      target: 'target',
      targetHandle: 'in',
    });
  });

  it('rejects self node drop connections', () => {
    expect(createNodeDropConnection({ nodeId: 'node', handleId: null, handleType: 'source' }, 'node', null)).toBeNull();
  });

  it('creates connections for nodes inserted from a pending connection menu', () => {
    expect(createPendingNodeConnection('created', 'from', 'out', 'source')).toEqual({
      source: 'from',
      sourceHandle: 'out',
      target: 'created',
      targetHandle: null,
    });

    expect(createPendingNodeConnection('created', 'to', 'in', 'target')).toEqual({
      source: 'created',
      sourceHandle: null,
      target: 'to',
      targetHandle: 'in',
    });
  });

  it('creates reconnect connections through inserted nodes and node drops', () => {
    const edge = { id: 'edge', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' };

    expect(createPendingReconnectConnection(edge, 'created', 'source')).toEqual({
      source: 'created',
      sourceHandle: null,
      target: 'b',
      targetHandle: 'in',
    });

    expect(createPendingReconnectConnection(edge, 'created', 'target')).toEqual({
      source: 'a',
      sourceHandle: 'out',
      target: 'created',
      targetHandle: null,
    });

    expect(createReconnectToNodeConnection(edge, 'source', 'next-source', 'new-out')).toEqual({
      source: 'next-source',
      sourceHandle: 'new-out',
      target: 'b',
      targetHandle: 'in',
    });

    expect(createReconnectToNodeConnection(edge, 'target', 'next-target', 'new-in')).toEqual({
      source: 'a',
      sourceHandle: 'out',
      target: 'next-target',
      targetHandle: 'new-in',
    });
  });

  it('reads mouse and touch client points', () => {
    expect(getEventClientPoint({ clientX: 12, clientY: 34 } as MouseEvent)).toEqual({ x: 12, y: 34 });
    expect(getEventClientPoint({ changedTouches: [{ clientX: 56, clientY: 78 }] } as unknown as TouchEvent)).toEqual({ x: 56, y: 78 });
  });
});
