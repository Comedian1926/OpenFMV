import { AppEdge, AppNode, InteractionRule, OpenFMVGraph } from '../_types';

export interface RuntimeChoice {
  input?: string;
  handleId?: string | null;
}

export function getEntryNodeId(graph: OpenFMVGraph, preferredEntryNodeId?: string | null): string | null;
export function getNodeText(node: AppNode): string;
export function getNodeTitle(node: AppNode): string;
export function getVisibleRules(node: AppNode): InteractionRule[];
export function getOutgoingEdges(nodeId: string, edges: AppEdge[]): AppEdge[];
export function resolveNextNodeId(node: AppNode, edges: AppEdge[], choice?: RuntimeChoice): string | null;
export function getNodeById(nodes: AppNode[], nodeId: string | null | undefined): AppNode | null;
export function getRuntimeInteractionMode(node: AppNode): 'choice' | 'input' | 'slider';
export function shouldShowRuntimeControls(node: AppNode | null | undefined, edges: AppEdge[]): boolean;
export function getRuntimeChoiceRules(node: AppNode): InteractionRule[];
export function buildGraphRuntimeBrowserScript(): string;
export const graphRuntimeFunctionNames: string[];
