import { addEdge, Connection, Edge } from '@xyflow/react';

import { AppEdge, AppNode } from '../_types';

const normalizeHandle = (handle: string | null | undefined) => handle ?? null;

export const hasNode = (nodes: AppNode[], id: string | null | undefined) => {
  return Boolean(id && nodes.some((node) => node.id === id));
};

export const hasSourceHandleEdge = (
  edges: Edge[],
  source: string | null | undefined,
  sourceHandle: string | null | undefined
) => {
  return edges.some((edge) => edge.source === source && normalizeHandle(edge.sourceHandle) === normalizeHandle(sourceHandle));
};

export const isValidGraphConnection = (connection: Connection | Edge, edges: Edge[], nodes?: AppNode[]) => {
  if (!connection.source || !connection.target) return false;
  if (connection.source === connection.target) return false;
  if (nodes && (!hasNode(nodes, connection.source) || !hasNode(nodes, connection.target))) return false;
  return !hasSourceHandleEdge(edges, connection.source, connection.sourceHandle);
};

export const addGraphEdge = (connection: Connection, edges: AppEdge[], nodes?: AppNode[]) => {
  if (!isValidGraphConnection(connection, edges, nodes)) return edges;
  return addEdge(connection, edges) as AppEdge[];
};

export const addNodeAndGraphEdge = (node: AppNode, connection: Connection, nodes: AppNode[], edges: AppEdge[]) => {
  const nextNodes = [...nodes, node];
  const nextEdges = addGraphEdge(connection, edges, nextNodes);
  if (nextEdges === edges) {
    return { nodes, edges };
  }
  return { nodes: nextNodes, edges: nextEdges };
};

export const filterEdgesForNodes = (edges: AppEdge[] | undefined, nodes: AppNode[]) => {
  if (!Array.isArray(edges)) return [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges.filter((edge) => edge.source !== edge.target && nodeIds.has(edge.source) && nodeIds.has(edge.target));
};
