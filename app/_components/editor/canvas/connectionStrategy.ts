import type { Connection, Edge } from '@xyflow/react';

export type CanvasHandleType = 'source' | 'target' | string | null;

export interface ConnectionStartState {
  nodeId: string | null;
  handleId: string | null;
  handleType: CanvasHandleType;
}

export const getEventClientPoint = (event: MouseEvent | TouchEvent) => {
  const touchEvent = event as TouchEvent;
  const mouseEvent = event as MouseEvent;

  return {
    x: touchEvent.changedTouches?.[0]?.clientX ?? mouseEvent.clientX,
    y: touchEvent.changedTouches?.[0]?.clientY ?? mouseEvent.clientY,
  };
};

export const createNodeDropConnection = (
  start: ConnectionStartState,
  targetNodeId: string,
  targetHandleId: string | null
): Connection | null => {
  if (!start.nodeId || targetNodeId === start.nodeId) return null;

  if (start.handleType === 'target') {
    return {
      source: targetNodeId,
      sourceHandle: targetHandleId,
      target: start.nodeId,
      targetHandle: start.handleId,
    };
  }

  return {
    source: start.nodeId,
    sourceHandle: start.handleId,
    target: targetNodeId,
    targetHandle: targetHandleId,
  };
};

export const createPendingNodeConnection = (
  newNodeId: string,
  pendingNodeId: string,
  pendingHandleId: string | null,
  pendingHandleType: CanvasHandleType
): Connection => {
  if (pendingHandleType === 'target') {
    return {
      source: newNodeId,
      sourceHandle: null,
      target: pendingNodeId,
      targetHandle: pendingHandleId,
    };
  }

  return {
    source: pendingNodeId,
    sourceHandle: pendingHandleId,
    target: newNodeId,
    targetHandle: null,
  };
};

export const createPendingReconnectConnection = (
  edge: Edge,
  newNodeId: string,
  handleType: string
): Connection => {
  if (handleType === 'source') {
    return {
      source: newNodeId,
      sourceHandle: null,
      target: edge.target,
      targetHandle: edge.targetHandle ?? null,
    };
  }

  return {
    source: edge.source,
    sourceHandle: edge.sourceHandle ?? null,
    target: newNodeId,
    targetHandle: null,
  };
};

export const createReconnectToNodeConnection = (
  edge: Edge,
  handleType: string,
  targetNodeId: string,
  snappedHandleId: string | null
): Connection | null => {
  if (handleType === 'source' && targetNodeId !== edge.target) {
    return {
      source: targetNodeId,
      sourceHandle: snappedHandleId,
      target: edge.target,
      targetHandle: edge.targetHandle ?? null,
    };
  }

  if (handleType === 'target' && targetNodeId !== edge.source) {
    return {
      source: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      target: targetNodeId,
      targetHandle: snappedHandleId,
    };
  }

  return null;
};
