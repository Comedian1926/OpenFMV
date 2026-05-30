import { z } from 'zod';

import type {
  GameExportConfig,
  OpenFMVAgentId,
  OpenFMVAgentInfo,
  OpenFMVAiConfig,
  OpenFMVAsset,
  OpenFMVByokProviderConfig,
  OpenFMVChatRequest,
  OpenFMVChatResponse,
  OpenFMVConnectionTestResult,
  OpenFMVMediaProviderConfig,
  OpenFMVProject,
} from '../app/_types';

const {
  agentDefinitions,
  byokProviderDefinitions,
  mediaProviderDefinitions,
} = require('./ai-definitions') as {
  agentDefinitions: Array<{ id: OpenFMVAgentId }>;
  byokProviderDefinitions: Array<{ id: OpenFMVByokProviderConfig['providerId'] }>;
  mediaProviderDefinitions: Array<{ id: OpenFMVMediaProviderConfig['providerId'] }>;
};

const nonEmptyString = z.string().min(1);
const recordSchema = z.record(z.string(), z.unknown());

const enumFrom = <T extends string>(values: T[]) => z.enum(values as [T, ...T[]]);

const agentIdSchema = enumFrom(agentDefinitions.map((agent) => agent.id));
const byokProviderIdSchema = enumFrom(byokProviderDefinitions.map((provider) => provider.id));
const mediaProviderIdSchema = enumFrom(mediaProviderDefinitions.map((provider) => provider.id));

const assetSchema: z.ZodType<OpenFMVAsset> = z.object({
  id: nonEmptyString,
  type: enumFrom(['image', 'video', 'audio', 'text']),
  name: z.string(),
  path: nonEmptyString,
  relativePath: nonEmptyString,
  importedAt: nonEmptyString,
  metadata: recordSchema.optional(),
});

const projectSchema: z.ZodType<OpenFMVProject> = z.object({
  schemaVersion: z.literal(1),
  id: nonEmptyString,
  title: nonEmptyString,
  graphData: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()),
  }) as z.ZodType<OpenFMVProject['graphData']>,
  assets: z.array(assetSchema),
  metadata: recordSchema as z.ZodType<OpenFMVProject['metadata']>,
  createdAt: nonEmptyString,
  updatedAt: nonEmptyString,
});

const gameExportConfigSchema: z.ZodType<GameExportConfig> = z.object({
  gameTitle: nonEmptyString,
  outputDirectory: nonEmptyString,
  entryNodeId: z.string().optional(),
  windowMode: enumFrom(['windowed', 'fullscreen', 'borderless']),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  includeDebugOverlay: z.boolean(),
});

const cliSelectionSchema: z.ZodType<OpenFMVAiConfig['cliSelections'][number]> = z.object({
  agentId: agentIdSchema,
  model: z.string(),
  reasoningEffort: z.string().optional(),
});

const byokProviderConfigSchema: z.ZodType<OpenFMVByokProviderConfig> = z.object({
  providerId: byokProviderIdSchema,
  apiKey: z.string(),
  baseUrl: z.string(),
  model: z.string(),
});

const mediaProviderConfigSchema: z.ZodType<OpenFMVMediaProviderConfig> = z.object({
  providerId: mediaProviderIdSchema,
  apiKey: z.string(),
  baseUrl: z.string(),
  model: z.string(),
});

const aiConfigSchema: z.ZodType<OpenFMVAiConfig> = z.object({
  executionMode: z.literal('cli'),
  selectedCliAgentId: agentIdSchema,
  cliSelections: z.array(cliSelectionSchema),
  selectedByokProviderId: byokProviderIdSchema,
  byokProviders: z.array(byokProviderConfigSchema),
  mediaProviders: z.array(mediaProviderConfigSchema),
});

const agentInfoSchema: z.ZodType<OpenFMVAgentInfo> = z.object({
  id: agentIdSchema,
  name: z.string(),
  bin: z.string(),
  version: z.string(),
  available: z.boolean(),
  models: z.array(z.string()),
  reasoningOptions: z.array(z.string()).optional(),
});

const connectionTestResultSchema: z.ZodType<OpenFMVConnectionTestResult> = z.object({
  ok: z.boolean(),
  message: z.string(),
});

const chatRequestSchema: z.ZodType<OpenFMVChatRequest> = z.object({
  messages: z.array(z.object({
    role: enumFrom(['user', 'assistant']),
    content: z.string(),
  })),
});

const chatResponseSchema: z.ZodType<OpenFMVChatResponse> = z.object({
  ok: z.boolean(),
  content: z.string(),
  agentId: agentIdSchema,
  model: z.string(),
  error: z.string().optional(),
});

const outputDirectoryResultSchema = z.object({ outputDirectory: nonEmptyString });

export const openfmvIpcContract = {
  openProject: {
    channel: 'openfmv:open-project',
    args: z.tuple([]),
    result: projectSchema.nullable(),
  },
  saveProject: {
    channel: 'openfmv:save-project',
    args: z.tuple([projectSchema]),
    result: projectSchema,
  },
  importAsset: {
    channel: 'openfmv:import-asset',
    args: z.tuple([nonEmptyString]),
    result: assetSchema,
  },
  selectAsset: {
    channel: 'openfmv:select-asset',
    args: z.tuple([]),
    result: assetSchema.nullable(),
  },
  exportGame: {
    channel: 'openfmv:export-game',
    args: z.tuple([projectSchema, gameExportConfigSchema]),
    result: outputDirectoryResultSchema,
  },
  selectDirectory: {
    channel: 'openfmv:select-directory',
    args: z.tuple([]),
    result: z.string().nullable(),
  },
  minimizeWindow: {
    channel: 'openfmv:minimize-window',
    args: z.tuple([]),
    result: z.void(),
  },
  toggleMaximizeWindow: {
    channel: 'openfmv:toggle-maximize-window',
    args: z.tuple([]),
    result: z.void(),
  },
  closeWindow: {
    channel: 'openfmv:close-window',
    args: z.tuple([]),
    result: z.void(),
  },
  getAiConfig: {
    channel: 'openfmv:get-ai-config',
    args: z.tuple([]),
    result: aiConfigSchema,
  },
  saveAiConfig: {
    channel: 'openfmv:save-ai-config',
    args: z.tuple([aiConfigSchema]),
    result: aiConfigSchema,
  },
  detectAiAgents: {
    channel: 'openfmv:detect-ai-agents',
    args: z.tuple([]),
    result: z.array(agentInfoSchema),
  },
  testAiAgent: {
    channel: 'openfmv:test-ai-agent',
    args: z.tuple([agentIdSchema]),
    result: connectionTestResultSchema,
  },
  sendChatMessage: {
    channel: 'openfmv:send-chat-message',
    args: z.tuple([chatRequestSchema]),
    result: chatResponseSchema,
  },
  testByokProvider: {
    channel: 'openfmv:test-byok-provider',
    args: z.tuple([byokProviderConfigSchema]),
    result: connectionTestResultSchema,
  },
  testMediaProvider: {
    channel: 'openfmv:test-media-provider',
    args: z.tuple([mediaProviderConfigSchema]),
    result: connectionTestResultSchema,
  },
} as const;

export type OpenFMVBridgeMethod = keyof typeof openfmvIpcContract;
type ContractArgs<Method extends OpenFMVBridgeMethod> = z.output<(typeof openfmvIpcContract)[Method]['args']>;
type ContractResult<Method extends OpenFMVBridgeMethod> = z.output<(typeof openfmvIpcContract)[Method]['result']>;

export type OpenFMVBridgeMethods = {
  [Method in OpenFMVBridgeMethod]: (...args: ContractArgs<Method>) => Promise<ContractResult<Method>>;
};

export type OpenFMVBridge = OpenFMVBridgeMethods;

export const openfmvBridgeMethods = Object.freeze(Object.keys(openfmvIpcContract) as OpenFMVBridgeMethod[]);

const formatValidationIssues = (issues: z.core.$ZodIssue[]) => issues
  .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
  .join('; ');

const getContractEntry = <Method extends OpenFMVBridgeMethod>(method: Method) => {
  return openfmvIpcContract[method];
};

export const validateIpcArgs = <Method extends OpenFMVBridgeMethod>(
  method: Method,
  args: unknown[]
): ContractArgs<Method> => {
  const entry = getContractEntry(method);
  const result = entry.args.safeParse(args);
  if (!result.success) {
    throw new TypeError(`Invalid OpenFMV IPC args for ${method}: ${formatValidationIssues(result.error.issues)}`);
  }
  return result.data as ContractArgs<Method>;
};

export const validateIpcResult = <Method extends OpenFMVBridgeMethod>(
  method: Method,
  value: unknown
): ContractResult<Method> => {
  const entry = getContractEntry(method);
  const result = entry.result.safeParse(value);
  if (!result.success) {
    throw new TypeError(`Invalid OpenFMV IPC result for ${method}: ${formatValidationIssues(result.error.issues)}`);
  }
  return result.data as ContractResult<Method>;
};

export const createOpenFMVBridge = (
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
): OpenFMVBridgeMethods => {
  return Object.fromEntries(openfmvBridgeMethods.map((method) => {
    const { channel } = openfmvIpcContract[method];
    return [method, (...args: unknown[]) => Promise.resolve().then(async () => {
      const parsedArgs = validateIpcArgs(method, args);
      const result = await invoke(channel, ...parsedArgs);
      return validateIpcResult(method, result);
    })];
  })) as OpenFMVBridgeMethods;
};

type IpcMainLike = {
  handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => void;
};

export const registerIpcHandler = <Method extends OpenFMVBridgeMethod>(
  ipcMain: IpcMainLike,
  method: Method,
  handler: (event: unknown, ...args: ContractArgs<Method>) => ContractResult<Method> | Promise<ContractResult<Method>>
) => {
  const { channel } = getContractEntry(method);
  ipcMain.handle(channel, async (event, ...args) => {
    const parsedArgs = validateIpcArgs(method, args);
    const result = await handler(event, ...parsedArgs);
    return validateIpcResult(method, result);
  });
};
