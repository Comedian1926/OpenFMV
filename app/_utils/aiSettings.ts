import {
  OpenFMVAgentId,
  OpenFMVAgentInfo,
  OpenFMVAiConfig,
  OpenFMVByokProviderConfig,
  OpenFMVByokProviderId,
  OpenFMVChatRequest,
  OpenFMVChatResponse,
  OpenFMVConnectionTestResult,
  OpenFMVMediaProviderConfig,
  OpenFMVMediaProviderId,
  OpenFMVMediaProviderType,
} from '../_types';

import aiDefinitions from '../../shared/ai-definitions';

const STORAGE_KEY = 'openfmv-ai-settings';
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

export const openfmvAgentDefinitions = aiDefinitions.agentDefinitions as OpenFMVAgentDefinition[];
export const openfmvByokProviderDefinitions = aiDefinitions.byokProviderDefinitions.map(({ needsKey, ...provider }) => provider) as OpenFMVByokProviderDefinition[];
export const openfmvMediaProviderDefinitions = aiDefinitions.mediaProviderDefinitions as OpenFMVMediaProviderDefinition[];
export const getDefaultOpenFMVAiConfig = (): OpenFMVAiConfig => aiDefinitions.getDefaultAiConfig() as OpenFMVAiConfig;
export const normalizeOpenFMVAiConfig = (value: unknown): OpenFMVAiConfig => aiDefinitions.normalizeAiConfig(value) as OpenFMVAiConfig;

export const getOpenFMVAiConfig = async (): Promise<OpenFMVAiConfig> => {
  if (typeof window === 'undefined') return getDefaultOpenFMVAiConfig();
  if (window.openfmv?.getAiConfig) return normalizeOpenFMVAiConfig(await window.openfmv.getAiConfig());
  const raw = window.localStorage.getItem(STORAGE_KEY);
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
