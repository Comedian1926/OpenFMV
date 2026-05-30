import { describe, expect, it } from 'vitest';

import { AppEdge, AppNode, OpenFMVGraph } from '@/app/_types';
import { createRuntime, getEntryNodeId, getNodeText, getNodeTitle, getRuntimeChoiceRules, getRuntimeInteractionMode, getVisibleRules, resolveNextNodeId, shouldShowRuntimeControls } from '@/app/_utils/graphRuntime';

const node = (id: string, type: AppNode['type'], data: AppNode['data']): AppNode => ({
  id,
  type,
  position: { x: 0, y: 0 },
  data,
});

const startNode = node('start', 'start', { type: 'start', label: 'Start' });
const interactiveStartNode = node('start', 'start', {
  type: 'start',
  label: 'Start',
  rules: [
    { id: 'intro', keyword: 'intro', condition: 'Watch intro', handleId: 'intro' },
    { id: 'skip', keyword: 'skip', condition: 'Skip', handleId: 'skip' },
  ],
});
const storyNode = node('story', 'story', { type: 'story', title: 'Story', content: 'Scene text' });
const interactionNode = node('interaction', 'interaction', {
  type: 'interaction',
  rules: [
    { id: 'first', keyword: 'left', condition: 'Go left', handleId: 'left' },
    { id: 'else', keyword: 'else', condition: 'Else', handleId: 'else' },
  ],
});

describe('graphRuntime', () => {
  it('resolves the preferred entry node when it exists', () => {
    const graph: OpenFMVGraph = { nodes: [startNode, storyNode], edges: [] };

    expect(getEntryNodeId(graph, 'story')).toBe('story');
  });

  it('falls back to the start node and then first node', () => {
    expect(getEntryNodeId({ nodes: [startNode, storyNode], edges: [] })).toBe('start');
    expect(getEntryNodeId({ nodes: [storyNode], edges: [] })).toBe('story');
    expect(getEntryNodeId({ nodes: [], edges: [] })).toBeNull();
  });

  it('normalizes node display text and title for runtime UI', () => {
    expect(getNodeTitle(startNode)).toBe('Start');
    expect(getNodeTitle(storyNode)).toBe('Story');
    expect(getNodeText(storyNode)).toBe('Scene text');
  });

  it('hides else rules from player choices', () => {
    expect(getVisibleRules(interactionNode)).toEqual([
      { id: 'first', keyword: 'left', condition: 'Go left', handleId: 'left' },
    ]);
  });

  it('normalizes shared player control state', () => {
    const edges = [
      { id: 'story-next', source: 'story', target: 'next-target' },
    ] as AppEdge[];

    expect(getRuntimeInteractionMode(interactionNode)).toBe('choice');
    expect(shouldShowRuntimeControls(storyNode, edges)).toBe(true);
    expect(shouldShowRuntimeControls(storyNode, [])).toBe(false);
    expect(getRuntimeChoiceRules(node('empty', 'interaction', { type: 'interaction', rules: [] }))).toEqual([
      { id: 'continue', keyword: '继续', condition: '继续', handleId: '' },
    ]);
  });

  it('prefers exact handle routing over input matching', () => {
    const edges = [
      { id: 'left-edge', source: 'interaction', sourceHandle: 'left', target: 'left-target' },
      { id: 'right-edge', source: 'interaction', sourceHandle: 'right', target: 'right-target' },
    ] as AppEdge[];

    expect(resolveNextNodeId(interactionNode, edges, { input: 'go left', handleId: 'right' })).toBe('right-target');
  });

  it('matches text input to interaction rules and falls back to else', () => {
    const edges = [
      { id: 'left-edge', source: 'interaction', sourceHandle: 'left', target: 'left-target' },
      { id: 'else-edge', source: 'interaction', sourceHandle: 'else', target: 'else-target' },
    ] as AppEdge[];

    expect(resolveNextNodeId(interactionNode, edges, { input: 'I should go left now' })).toBe('left-target');
    expect(resolveNextNodeId(interactionNode, edges, { input: 'unknown' })).toBe('else-target');
  });

  it('routes start node choices through interaction handles', () => {
    const edges = [
      { id: 'intro-edge', source: 'start', sourceHandle: 'intro', target: 'intro-target' },
      { id: 'skip-edge', source: 'start', sourceHandle: 'skip', target: 'skip-target' },
    ] as AppEdge[];

    expect(getVisibleRules(interactiveStartNode)).toHaveLength(2);
    expect(resolveNextNodeId(interactiveStartNode, edges, { handleId: 'skip' })).toBe('skip-target');
    expect(resolveNextNodeId(interactiveStartNode, edges, { input: 'watch intro' })).toBe('intro-target');
  });

  it('falls back to the first outgoing edge when no rule matches', () => {
    const edges = [
      { id: 'first-edge', source: 'story', target: 'first-target' },
      { id: 'second-edge', source: 'story', target: 'second-target' },
    ] as AppEdge[];

    expect(resolveNextNodeId(storyNode, edges)).toBe('first-target');
  });

  it('runs graph playback through the runtime core dispatch loop', () => {
    const graph: OpenFMVGraph = {
      nodes: [
        interactiveStartNode,
        storyNode,
        node('end', 'end', { type: 'end', label: 'Finished' }),
      ],
      edges: [
        { id: 'skip-edge', source: 'start', sourceHandle: 'skip', target: 'story' },
        { id: 'finish-edge', source: 'story', target: 'end' },
      ] as AppEdge[],
    };
    const runtime = createRuntime(graph, { entryNodeId: 'start' });

    const start = runtime.start();
    expect(start.currentNodeId).toBe('start');
    expect(start.effects).toContainEqual(expect.objectContaining({ type: 'showChoices' }));

    const story = runtime.dispatch({ type: 'choice.selected', input: 'Skip', handleId: 'skip' });
    expect(story.currentNodeId).toBe('story');
    expect(story.history).toEqual(['start', 'story']);
    expect(story.effects).toContainEqual(expect.objectContaining({ type: 'showContinue' }));

    const finished = runtime.dispatch({ type: 'continue' });
    expect(finished.currentNodeId).toBe('end');
    expect(finished.effects).toContainEqual(expect.objectContaining({ type: 'showRestart' }));
  });

  it('stores text input in runtime variables before resolving routes', () => {
    const graph: OpenFMVGraph = {
      nodes: [
        interactionNode,
        storyNode,
      ],
      edges: [
        { id: 'left-edge', source: 'interaction', sourceHandle: 'left', target: 'story' },
      ] as AppEdge[],
    };
    const runtime = createRuntime(graph, { entryNodeId: 'interaction' });
    runtime.start();

    const snapshot = runtime.dispatch({ type: 'input.submitted', value: 'go left' });

    expect(snapshot.currentNodeId).toBe('story');
    expect(snapshot.variables.lastInput).toBe('go left');
  });
});
