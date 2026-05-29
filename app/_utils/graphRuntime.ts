import { AppEdge, AppNode, InteractionRule, OpenFMVGraph } from '../_types';

export interface RuntimeChoice {
  input?: string;
  handleId?: string | null;
}

export const getEntryNodeId = (graph: OpenFMVGraph, preferredEntryNodeId?: string | null) => {
  if (preferredEntryNodeId && graph.nodes.some((node) => node.id === preferredEntryNodeId)) {
    return preferredEntryNodeId;
  }

  return graph.nodes.find((node) => node.type === 'start')?.id ?? graph.nodes[0]?.id ?? null;
};

export const getNodeText = (node: AppNode) => {
  const data = node.data as Record<string, unknown>;
  return String(data.fullText || data.content || '');
};

export const getNodeTitle = (node: AppNode) => {
  const data = node.data as Record<string, unknown>;
  if (node.type === 'start') return String(data.label || 'Start');
  if (node.type === 'end') return String(data.label || '缁撴潫');
  return String(data.title || data.prompt || '鍓ф儏');
};

export const getVisibleRules = (node: AppNode) => {
  const data = node.data as { rules?: InteractionRule[] };
  return (data.rules || []).filter((rule) => rule.id !== 'else' && rule.handleId !== 'else');
};

export const getOutgoingEdges = (nodeId: string, edges: AppEdge[]) => edges.filter((edge) => edge.source === nodeId);

export const resolveNextNodeId = (node: AppNode, edges: AppEdge[], choice: RuntimeChoice = {}) => {
  const outgoing = getOutgoingEdges(node.id, edges);
  if (outgoing.length === 0) return null;

  if (choice.handleId) {
    const exactEdge = outgoing.find((edge) => edge.sourceHandle === choice.handleId);
    if (exactEdge) return exactEdge.target;
  }

  const normalizedInput = choice.input?.trim().toLowerCase();
  if (normalizedInput) {
    const matchedRule = getVisibleRules(node).find((rule) => {
      const condition = (rule.condition || rule.keyword || '').toLowerCase();
      return condition && (normalizedInput.includes(condition) || condition.includes(normalizedInput));
    });
    if (matchedRule) {
      const matchedEdge = outgoing.find((edge) => edge.sourceHandle === matchedRule.handleId);
      if (matchedEdge) return matchedEdge.target;
    }
  }

  return outgoing.find((edge) => edge.sourceHandle === 'else')?.target ?? outgoing[0]?.target ?? null;
};

export const getNodeById = (nodes: AppNode[], nodeId: string | null | undefined) => {
  if (!nodeId) return null;
  return nodes.find((node) => node.id === nodeId) ?? null;
};
