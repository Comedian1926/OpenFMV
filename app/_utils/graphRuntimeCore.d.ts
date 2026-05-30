import { AppEdge, AppNode, InteractionRule, NodeType, OpenFMVGraph } from '../_types';

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
export type RuntimeStatus = 'running' | 'ended';
export interface RuntimeProgram {
  graph: OpenFMVGraph;
  entryNodeId: string | null;
}
export interface RuntimeState {
  status: RuntimeStatus;
  currentNodeId: string | null;
  history: string[];
  variables: Record<string, unknown>;
}
export type RuntimeEvent =
  | { type: 'runtime.start' }
  | { type: 'restart' }
  | { type: 'continue' }
  | { type: 'timer.timeout' }
  | { type: 'choice.selected'; input?: string; handleId?: string | null }
  | { type: 'input.submitted'; value: string }
  | { type: 'slider.unlocked'; input?: string; handleId?: string | null }
  | { type: 'navigate'; nodeId: string | null }
  | { type: 'variable.set'; key: string; value: unknown };
export type RuntimeEffect =
  | { type: 'scene'; nodeId: string; nodeType: NodeType; title: string; text: string }
  | { type: 'playMedia'; mediaType: 'video'; src: string; playbackId?: string; poster?: string }
  | { type: 'playMedia'; mediaType: 'image'; src: string }
  | { type: 'showChoices'; prompt: string; choices: Array<{ id: string; label: string; input: string; handleId: string; rule: InteractionRule }> }
  | { type: 'showInput'; prompt: string; placeholder: string }
  | { type: 'showSlider'; prompt: string; label: string; handleId: string }
  | { type: 'showContinue'; label: string }
  | { type: 'showRestart' }
  | { type: 'startTimer'; seconds: number; key: string }
  | { type: 'end' };
export interface RuntimeSnapshot {
  status: RuntimeStatus;
  currentNodeId: string | null;
  currentNode: AppNode | null;
  history: string[];
  variables: Record<string, unknown>;
  effects: RuntimeEffect[];
}
export interface RuntimeController {
  program: RuntimeProgram;
  start(): RuntimeSnapshot;
  dispatch(event: RuntimeEvent): RuntimeSnapshot;
  getSnapshot(): RuntimeSnapshot;
}
export function compileRuntimeGraph(graph: OpenFMVGraph, options?: { entryNodeId?: string | null }): RuntimeProgram;
export function createRuntimeState(program: RuntimeProgram, seed?: Partial<RuntimeState>): RuntimeState;
export function buildNodeEffects(node: AppNode | null | undefined, edges: AppEdge[]): RuntimeEffect[];
export function getRuntimeSnapshot(program: RuntimeProgram, state: RuntimeState): RuntimeSnapshot;
export function dispatchRuntimeEvent(program: RuntimeProgram, state: RuntimeState, event: RuntimeEvent): RuntimeState;
export function createRuntime(graph: OpenFMVGraph, options?: { entryNodeId?: string | null; initialState?: Partial<RuntimeState> }): RuntimeController;
export function buildGraphRuntimeBrowserScript(): string;
export function buildRuntimeCoreBrowserScript(): string;
export const graphRuntimeFunctionNames: string[];
export const runtimeCoreFunctionNames: string[];
