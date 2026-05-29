import { AppEdge, AppNode, InteractionMode, InteractionRule, OpenFMVGraph } from '../_types';
import {
  getEntryNodeId as getCoreEntryNodeId,
  getNodeById as getCoreNodeById,
  getNodeText as getCoreNodeText,
  getNodeTitle as getCoreNodeTitle,
  getOutgoingEdges as getCoreOutgoingEdges,
  getRuntimeChoiceRules as getCoreRuntimeChoiceRules,
  getRuntimeInteractionMode as getCoreRuntimeInteractionMode,
  getVisibleRules as getCoreVisibleRules,
  resolveNextNodeId as resolveCoreNextNodeId,
  shouldShowRuntimeControls as shouldCoreShowRuntimeControls,
} from './graphRuntimeCore.mjs';

export interface RuntimeChoice {
  input?: string;
  handleId?: string | null;
}

export const getEntryNodeId = (graph: OpenFMVGraph, preferredEntryNodeId?: string | null): string | null => {
  return getCoreEntryNodeId(graph, preferredEntryNodeId);
};

export const getNodeText = (node: AppNode): string => getCoreNodeText(node);

export const getNodeTitle = (node: AppNode): string => getCoreNodeTitle(node);

export const getVisibleRules = (node: AppNode): InteractionRule[] => getCoreVisibleRules(node);

export const getOutgoingEdges = (nodeId: string, edges: AppEdge[]): AppEdge[] => getCoreOutgoingEdges(nodeId, edges);

export const resolveNextNodeId = (node: AppNode, edges: AppEdge[], choice: RuntimeChoice = {}): string | null => {
  return resolveCoreNextNodeId(node, edges, choice);
};

export const getNodeById = (nodes: AppNode[], nodeId: string | null | undefined): AppNode | null => {
  return getCoreNodeById(nodes, nodeId);
};

export const getRuntimeInteractionMode = (node: AppNode): InteractionMode => getCoreRuntimeInteractionMode(node);

export const shouldShowRuntimeControls = (node: AppNode | null | undefined, edges: AppEdge[]): boolean => {
  return shouldCoreShowRuntimeControls(node, edges);
};

export const getRuntimeChoiceRules = (node: AppNode): InteractionRule[] => getCoreRuntimeChoiceRules(node);
