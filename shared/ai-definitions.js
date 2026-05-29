const agentDefinitions = [
  { id: 'codex', name: 'Codex CLI', bin: 'codex', models: ['codex-default'], reasoningOptions: ['minimal', 'low', 'medium', 'high'] },
  { id: 'claude', name: 'Claude Code', bin: 'claude', models: ['claude-sonnet-4.5', 'claude-opus-4.1', 'claude-haiku-4.5'] },
  { id: 'gemini', name: 'Gemini CLI', bin: 'gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { id: 'kimi', name: 'Kimi CLI', bin: 'kimi', models: ['kimi-k2', 'moonshot-v1-128k'] },
  { id: 'qwen', name: 'Qwen CLI', bin: 'qwen', models: ['qwen3-coder-plus', 'qwen3-max'] },
  { id: 'opencode', name: 'OpenCode', bin: 'opencode', models: ['opencode-default'] },
];

const byokProviderDefinitions = [
  { id: 'anthropic', name: 'Anthropic', defaultBaseUrl: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4.5', needsKey: true },
  { id: 'openai-compatible', name: 'OpenAI Compatible', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-5', needsKey: true },
  { id: 'google-gemini', name: 'Google Gemini', defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.5-pro', needsKey: true },
  { id: 'ollama', name: 'Ollama / Local', defaultBaseUrl: 'http://127.0.0.1:11434/v1', defaultModel: 'llama3.1', needsKey: false },
];

const mediaProviderDefinitions = [
  { id: 'openai-image', name: 'OpenAI Image', types: ['image'], defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-image-1' },
  { id: 'doubao-image', name: 'Volcengine / Doubao Image', types: ['image'], defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seedream-4-0' },
  { id: 'doubao-video', name: 'Volcengine / Doubao Video', types: ['video'], defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seedance-1-0-pro' },
  { id: 'google-imagen', name: 'Google Imagen', types: ['image'], defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'imagen-4.0-generate-preview-06-06' },
  { id: 'google-veo', name: 'Google Veo', types: ['video'], defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'veo-3.1-generate-preview' },
  { id: 'kling-video', name: 'Kling Video', types: ['video'], defaultBaseUrl: 'https://api.klingai.com', defaultModel: 'kling-v1-6' },
  { id: 'minimax-video', name: 'MiniMax Video', types: ['video'], defaultBaseUrl: 'https://api.minimax.io/v1', defaultModel: 'video-01' },
  { id: 'minimax-tts', name: 'MiniMax TTS', types: ['audio'], defaultBaseUrl: 'https://api.minimax.io/v1', defaultModel: 'speech-02-hd' },
  { id: 'elevenlabs-audio', name: 'ElevenLabs Audio', types: ['audio'], defaultBaseUrl: 'https://api.elevenlabs.io/v1', defaultModel: 'eleven_multilingual_v2' },
  { id: 'senseaudio', name: 'SenseAudio', types: ['audio'], defaultBaseUrl: '', defaultModel: 'senseaudio-small' },
];

const agentIds = new Set(agentDefinitions.map((item) => item.id));
const byokIds = new Set(byokProviderDefinitions.map((item) => item.id));
const mediaIds = new Set(mediaProviderDefinitions.map((item) => item.id));

const isRecord = (value) => typeof value === 'object' && value !== null;
const textValue = (value) => typeof value === 'string' ? value : '';

const getDefaultAiConfig = () => ({
  executionMode: 'cli',
  selectedCliAgentId: 'codex',
  cliSelections: agentDefinitions.map((agent) => ({
    agentId: agent.id,
    model: agent.models[0],
    ...(agent.reasoningOptions ? { reasoningEffort: 'medium' } : {}),
  })),
  selectedByokProviderId: 'anthropic',
  byokProviders: byokProviderDefinitions.map((provider) => ({
    providerId: provider.id,
    apiKey: '',
    baseUrl: provider.defaultBaseUrl,
    model: provider.defaultModel,
  })),
  mediaProviders: mediaProviderDefinitions.map((provider) => ({
    providerId: provider.id,
    apiKey: '',
    baseUrl: provider.defaultBaseUrl,
    model: provider.defaultModel,
  })),
});

const normalizeAiConfig = (value) => {
  const defaults = getDefaultAiConfig();
  if (!isRecord(value)) return defaults;
  const rawCliSelections = Array.isArray(value.cliSelections) ? value.cliSelections.filter(isRecord) : [];
  const rawByokProviders = Array.isArray(value.byokProviders) ? value.byokProviders.filter(isRecord) : [];
  const rawMediaProviders = Array.isArray(value.mediaProviders) ? value.mediaProviders.filter(isRecord) : [];

  return {
    executionMode: 'cli',
    selectedCliAgentId: agentIds.has(value.selectedCliAgentId) ? value.selectedCliAgentId : defaults.selectedCliAgentId,
    selectedByokProviderId: byokIds.has(value.selectedByokProviderId) ? value.selectedByokProviderId : defaults.selectedByokProviderId,
    cliSelections: defaults.cliSelections.map((fallback) => {
      const incoming = rawCliSelections.find((item) => item.agentId === fallback.agentId);
      const definition = agentDefinitions.find((item) => item.id === fallback.agentId);
      const incomingReasoning = textValue(incoming?.reasoningEffort);
      return {
        agentId: fallback.agentId,
        model: definition?.models.includes(textValue(incoming?.model)) ? textValue(incoming?.model) : fallback.model,
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

module.exports = {
  agentDefinitions,
  byokProviderDefinitions,
  mediaProviderDefinitions,
  getDefaultAiConfig,
  normalizeAiConfig,
};
