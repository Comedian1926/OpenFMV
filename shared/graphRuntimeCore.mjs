export const getEntryNodeId = (graph, preferredEntryNodeId) => {
  if (preferredEntryNodeId && graph.nodes.some((node) => node.id === preferredEntryNodeId)) {
    return preferredEntryNodeId;
  }

  return graph.nodes.find((node) => node.type === 'start')?.id ?? graph.nodes[0]?.id ?? null;
};

export const getNodeText = (node) => {
  const data = node.data || {};
  return String(data.fullText || data.content || '');
};

export const getNodeTitle = (node) => {
  const data = node.data || {};
  if (node.type === 'start') return String(data.label || 'Start');
  if (node.type === 'end') return String(data.label || '结束');
  return String(data.title || data.prompt || '剧情');
};

export const getVisibleRules = (node) => {
  const data = node.data || {};
  return (data.rules || []).filter((rule) => rule.id !== 'else' && rule.handleId !== 'else');
};

export const getOutgoingEdges = (nodeId, edges) => edges.filter((edge) => edge.source === nodeId);

export const resolveNextNodeId = (node, edges, choice = {}) => {
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

export const getNodeById = (nodes, nodeId) => {
  if (!nodeId) return null;
  return nodes.find((node) => node.id === nodeId) ?? null;
};

export const getRuntimeInteractionMode = (node) => {
  const mode = node?.data?.interactionMode;
  return mode === 'input' || mode === 'slider' ? mode : 'choice';
};

export const shouldShowRuntimeControls = (node, edges) => {
  return Boolean(node && (node.type === 'interaction' || getOutgoingEdges(node.id, edges).length > 0));
};

export const getRuntimeChoiceRules = (node) => {
  const rules = getVisibleRules(node);
  return rules.length > 0 ? rules : [{ id: 'continue', keyword: '继续', condition: '继续', handleId: '' }];
};

const runtimeFunctions = [
  getEntryNodeId,
  getNodeText,
  getNodeTitle,
  getVisibleRules,
  getOutgoingEdges,
  resolveNextNodeId,
  getNodeById,
  getRuntimeInteractionMode,
  shouldShowRuntimeControls,
  getRuntimeChoiceRules,
];

export const buildGraphRuntimeBrowserScript = () => `(() => {
  const getEntryNodeId = ${getEntryNodeId.toString()};
  const getNodeText = ${getNodeText.toString()};
  const getNodeTitle = ${getNodeTitle.toString()};
  const getVisibleRules = ${getVisibleRules.toString()};
  const getOutgoingEdges = ${getOutgoingEdges.toString()};
  const resolveNextNodeId = ${resolveNextNodeId.toString()};
  const getNodeById = ${getNodeById.toString()};
  const getRuntimeInteractionMode = ${getRuntimeInteractionMode.toString()};
  const shouldShowRuntimeControls = ${shouldShowRuntimeControls.toString()};
  const getRuntimeChoiceRules = ${getRuntimeChoiceRules.toString()};
  window.OpenFMVGraphRuntime = {
    getEntryNodeId,
    getNodeText,
    getNodeTitle,
    getVisibleRules,
    getOutgoingEdges,
    resolveNextNodeId,
    getNodeById,
    getRuntimeInteractionMode,
    shouldShowRuntimeControls,
    getRuntimeChoiceRules,
  };
})();`;

export const graphRuntimeFunctionNames = runtimeFunctions.map((runtimeFunction) => runtimeFunction.name);
