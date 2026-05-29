import { describe, expect, it, vi } from 'vitest';

import { AppNode } from '@/app/_types';
import { createEditorNode, getAvailableNodePosition } from '@/app/_components/editor/canvas/nodeFactory';

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'new-node-id'),
});

const storyNode = (id: string, x: number, y: number): AppNode => ({
  id,
  type: 'story',
  position: { x, y },
  data: { type: 'story', title: id, content: '' },
});

describe('editor canvas nodeFactory', () => {
  it('keeps open positions unchanged', () => {
    expect(getAvailableNodePosition({ x: 100, y: 100 }, [storyNode('existing', 300, 300)])).toEqual({ x: 100, y: 100 });
  });

  it('offsets a new node away from occupied positions', () => {
    expect(getAvailableNodePosition({ x: 100, y: 100 }, [storyNode('existing', 100, 100)])).toEqual({ x: 160, y: 160 });
  });

  it('creates nodes through the registry with story count context', () => {
    const node = createEditorNode('story', { x: 10, y: 20 }, [
      storyNode('story-1', 0, 0),
      storyNode('story-2', 100, 0),
    ]);

    expect(node).toEqual({
      id: 'new-node-id',
      type: 'story',
      position: { x: 10, y: 20 },
      data: { type: 'story', title: '剧情节点-3', content: '' },
    });
  });
});
