import {
  OpenFMVAgentId,
  OpenFMVAgentInfo,
  OpenFMVAiConfig,
  OpenFMVByokProviderConfig,
  OpenFMVByokProviderId,
  OpenFMVChatRequest,
  OpenFMVChatResponse,
  OpenFMVConnectionTestResult,
  OpenFMVExecutionMode,
  OpenFMVMediaProviderConfig,
  OpenFMVMediaProviderId,
  OpenFMVMediaProviderType,
} from '../_types';

const STORAGE_KEY = 'openfmv-ai-settings';
const LEGACY_STORAGE_KEY = ['ra', 'ven-ai-settings'].join('');
const CHANGE_EVENT = 'openfmv-ai-settings-changed';

export interface OpenFMVAgentDefinition {
  id: OpenFMVAgentId;
  name: string;
  bin: string;
  models: string[];
  reasoningOptions?: string[];
}

export interface OpenFMVByokProviderDefinition {
  id: OpenFMVByokProviderId;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
}

export interface OpenFMVMediaProviderDefinition {
  id: OpenFMVMediaProviderId;
  name: string;
  types: OpenFMVMediaProviderType[];
  defaultBaseUrl: string;
  defaultModel: string;
}

export const openfmvAgentDefinitions: OpenFMVAgentDefinition[] = [
  { id: 'codex', name: 'Codex CLI', bin: 'codex', models: ['codex-default'], reasoningOptions: ['minimal', 'low', 'medium', 'high'] },
  { id: 'claude', name: 'Claude Code', bin: 'claude', models: ['claude-sonnet-4.5', 'claude-opus-4.1', 'claude-haiku-4.5'] },
  { id: 'gemini', name: 'Gemini CLI', bin: 'gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { id: 'kimi', name: 'Kimi CLI', bin: 'kimi', models: ['kimi-k2', 'moonshot-v1-128k'] },
  { id: 'qwen', name: 'Qwen CLI', bin: 'qwen', models: ['qwen3-coder-plus', 'qwen3-max'] },
  { id: 'opencode', name: 'OpenCode', bin: 'opencode', models: ['opencode-default'] },
];

export const openfmvByokProviderDefinitions: OpenFMVByokProviderDefinition[] = [
  { id: 'anthropic', name: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4.5' },
  { id: 'openai-compatible', name: 'OpenAI Compatible', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-5' },
  { id: 'google-gemini', name: 'Google Gemini', defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.5-pro' },
  { id: 'ollama', name: 'Ollama / Local', defaultBaseUrl: 'http://127.0.0.1:11434/v1', defaultModel: 'llama3.1' },
];

export const openfmvMediaProviderDefinitions: OpenFMVMediaProviderDefinition[] = [
  { id: 'openai-image', name: 'OpenAI 鍥剧墖', types: ['image'], defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-image-1' },
  { id: 'doubao-image', name: '鐏北 / 璞嗗寘鍥剧墖', types: ['image'], defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seedream-4-0' },
  { id: 'doubao-video', name: '鐏北 / 璞嗗寘瑙嗛', types: ['video'], defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seedance-1-0-pro' },
  { id: 'google-imagen', name: 'Google Imagen', types: ['image'], defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'imagen-4.0-generate-preview-06-06' },
  { id: 'google-veo', name: 'Google Veo', types: ['video'], defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'veo-3.1-generate-preview' },
  { id: 'kling-video', name: 'Kling 瑙嗛', types: ['video'], defaultBaseUrl: 'https://api.klingai.com', defaultModel: 'kling-v1-6' },
  { id: 'minimax-video', name: 'MiniMax 瑙嗛', types: ['video'], defaultBaseUrl: 'https://api.minimax.io/v1', defaultModel: 'video-01' },
  { id: 'minimax-tts', name: 'MiniMax TTS', types: ['audio'], defaultBaseUrl: 'https://api.minimax.io/v1', defaultModel: 'speech-02-hd' },
  { id: 'elevenlabs-audio', name: 'ElevenLabs 闊抽', types: ['audio'], defaultBaseUrl: 'https://api.elevenlabs.io/v1', defaultModel: 'eleven_multilingual_v2' },
  { id: 'senseaudio', name: 'SenseAudio 闊抽', types: ['audio'], defaultBaseUrl: '', defaultModel: 'senseaudio-small' },
];

const agentIds = new Set(openfmvAgentDefinitions.map((item) => item.id));
const byokIds = new Set(openfmvByokProviderDefinitions.map((item) => item.id));
const mediaIds = new Set(openfmvMediaProviderDefinitions.map((item) => item.id));

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const textValue = (value: unknown) => typeof value === 'string' ? value : '';

export const getDefaultOpenFMVAiConfig = (): OpenFMVAiConfig => ({
  executionMode: 'cli',
  selectedCliAgentId: 'codex',
  cliSelections: openfmvAgentDefinitions.map((agent) => ({
    agentId: agent.id,
    model: agent.models[0],
    ...(agent.reasoningOptions ? { reasoningEffort: 'medium' } : {}),
  })),
  selectedByokProviderId: 'anthropic',
  byokProviders: openfmvByokProviderDefinitions.map((provider) => ({
    providerId: provider.id,
    apiKey: '',
    baseUrl: provider.defaultBaseUrl,
    model: provider.defaultModel,
  })),
  mediaProviders: openfmvMediaProviderDefinitions.map((provider) => ({
    providerId: provider.id,
    apiKey: '',
    baseUrl: provider.defaultBaseUrl,
    model: provider.defaultModel,
  })),
});

export const normalizeOpenFMVAiConfig = (value: unknown): OpenFMVAiConfig => {
  const defaults = getDefaultOpenFMVAiConfig();
  if (!isRecord(value)) return defaults;

  const executionMode: OpenFMVExecutionMode = 'cli';
  const selectedCliAgentId = typeof value.selectedCliAgentId === 'string' && agentIds.has(value.selectedCliAgentId as OpenFMVAgentId)
    ? value.selectedCliAgentId as OpenFMVAgentId
    : defaults.selectedCliAgentId;
  const selectedByokProviderId = typeof value.selectedByokProviderId === 'string' && byokIds.has(value.selectedByokProviderId as OpenFMVByokProviderId)
    ? value.selectedByokProviderId as OpenFMVByokProviderId
    : defaults.selectedByokProviderId;

  const rawCliSelections = Array.isArray(value.cliSelections) ? value.cliSelections.filter(isRecord) : [];
  const rawByokProviders = Array.isArray(value.byokProviders) ? value.byokProviders.filter(isRecord) : [];
  const rawMediaProviders = Array.isArray(value.mediaProviders) ? value.mediaProviders.filter(isRecord) : [];

  return {
    executionMode,
    selectedCliAgentId,
    selectedByokProviderId,
    cliSelections: defaults.cliSelections.map((fallback) => {
      const incoming = rawCliSelections.find((item) => item.agentId === fallback.agentId);
      const definition = openfmvAgentDefinitions.find((item) => item.id === fallback.agentId);
      const incomingModel = textValue(incoming?.model);
      const incomingReasoning = textValue(incoming?.reasoningEffort);
      return {
        agentId: fallback.agentId,
        model: definition?.models.includes(incomingModel) ? incomingModel : fallback.model,
        ...(definition?.reasoningOptions ? { reasoningEffort: definition.reasoningOptions.includes(incomingReasoning) ? incomingReasoning : fallback.reasoningEffort } : {}),
      };
    }),
    byokProviders: defaults.byokProviders.map((fallback) => {
      const incoming = rawByokProviders.find((item) => item.providerId === fallback.providerId);
      return {
        providerId: fallback.providerId,
        apiKey: textValue(incoming?.apiKey),
        baseUrl: textValue(incoming?.baseUrl) || fallback.baseUrl,
        model: textValue(incoming?.model) || fallback.model,
      };
    }),
    mediaProviders: defaults.mediaProviders.map((fallback) => {
      const incoming = rawMediaProviders.find((item) => item.providerId === fallback.providerId);
      return {
        providerId: fallback.providerId,
        apiKey: textValue(incoming?.apiKey),
        baseUrl: textValue(incoming?.baseUrl) || fallback.baseUrl,
        model: textValue(incoming?.model) || fallback.model,
      };
    }),
  };
};

export const getOpenFMVAiConfig = async (): Promise<OpenFMVAiConfig> => {
  if (typeof window === 'undefined') return getDefaultOpenFMVAiConfig();
  if (window.openfmv?.getAiConfig) return normalizeOpenFMVAiConfig(await window.openfmv.getAiConfig());
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return getDefaultOpenFMVAiConfig();
  try {
    const config = normalizeOpenFMVAiConfig(JSON.parse(raw));
    if (!window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
    return config;
  } catch {
    return getDefaultOpenFMVAiConfig();
  }
};

export const saveOpenFMVAiConfig = async (config: OpenFMVAiConfig): Promise<OpenFMVAiConfig> => {
  const normalized = normalizeOpenFMVAiConfig(config);
  if (typeof window === 'undefined') return normalized;
  const saved = window.openfmv?.saveAiConfig
    ? normalizeOpenFMVAiConfig(await window.openfmv.saveAiConfig(normalized))
    : normalized;
  if (!window.openfmv?.saveAiConfig) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: saved }));
  return saved;
};

export const detectOpenFMVAiAgents = async (): Promise<OpenFMVAgentInfo[]> => {
  if (typeof window !== 'undefined' && window.openfmv?.detectAiAgents) {
    return window.openfmv.detectAiAgents();
  }
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/ai-settings/agents', { cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json() as { agents?: OpenFMVAgentInfo[] };
        if (Array.isArray(payload.agents)) return payload.agents;
      }
    } catch {
    }
  }
  return openfmvAgentDefinitions.map((agent) => ({
    id: agent.id,
    name: agent.name,
    bin: agent.bin,
    version: '',
    available: false,
    models: agent.models,
    reasoningOptions: agent.reasoningOptions,
  }));
};

export const testOpenFMVAiAgent = async (agentId: OpenFMVAgentId): Promise<OpenFMVConnectionTestResult> => {
  if (typeof window !== 'undefined' && window.openfmv?.testAiAgent) return window.openfmv.testAiAgent(agentId);
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch(`/api/ai-settings/agents/${agentId}/test`, { method: 'POST', cache: 'no-store' });
      if (response.ok) return await response.json() as OpenFMVConnectionTestResult;
    } catch {
    }
  }
  return { ok: false, message: 'Current browser environment cannot test local CLI.' };
};

export const sendOpenFMVChatMessage = async (request: OpenFMVChatRequest): Promise<OpenFMVChatResponse> => {
  const config = await getOpenFMVAiConfig();
  const selection = config.cliSelections.find((item) => item.agentId === config.selectedCliAgentId);
  const model = selection?.model || openfmvAgentDefinitions.find((item) => item.id === config.selectedCliAgentId)?.models[0] || '';

  if (typeof window !== 'undefined' && window.openfmv?.sendChatMessage) {
    return window.openfmv.sendChatMessage(request);
  }

  return {
    ok: false,
    content: '',
    agentId: config.selectedCliAgentId,
    model,
    error: '当前环境无法调用本地 AI CLI，请在 OpenFMV 桌面端使用聊天。',
  };
};

export const testOpenFMVByokProvider = async (provider: OpenFMVByokProviderConfig): Promise<OpenFMVConnectionTestResult> => {
  if (typeof window !== 'undefined' && window.openfmv?.testByokProvider) return window.openfmv.testByokProvider(provider);
  return { ok: Boolean(provider.model && (provider.providerId === 'ollama' || provider.apiKey)), message: provider.model ? 'Configuration looks valid' : 'Enter a model name' };
};

export const testOpenFMVMediaProvider = async (provider: OpenFMVMediaProviderConfig): Promise<OpenFMVConnectionTestResult> => {
  if (typeof window !== 'undefined' && window.openfmv?.testMediaProvider) return window.openfmv.testMediaProvider(provider);
  return { ok: Boolean(provider.apiKey && provider.model), message: provider.apiKey && provider.model ? 'Configuration looks valid' : 'Enter API key and model' };
};
