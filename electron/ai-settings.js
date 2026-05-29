const { spawn } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const path = require('path');

const agentDefinitions = [
  { id: 'codex', name: 'Codex CLI', bin: 'codex', versionArgs: ['--version'], testArgs: ['--version'], fallbackModels: ['codex-default'], reasoningOptions: ['minimal', 'low', 'medium', 'high'], stdinPrompt: true, useOutputLastMessage: true, chatArgs: ({ model, reasoningEffort, outputPath }) => ['exec', ...(model && model !== 'codex-default' ? ['--model', model] : []), '--sandbox', 'read-only', '-c', 'approval_policy="never"', '--ephemeral', ...(reasoningEffort ? ['-c', `model_reasoning_effort="${reasoningEffort}"`] : []), ...(outputPath ? ['--output-last-message', outputPath] : []), '-'] },
  { id: 'claude', name: 'Claude Code', bin: 'claude', versionArgs: ['--version'], testArgs: ['--version'], fallbackModels: ['claude-sonnet-4.5', 'claude-opus-4.1', 'claude-haiku-4.5'], chatArgs: ({ model, prompt }) => ['-p', prompt, '--model', model] },
  { id: 'gemini', name: 'Gemini CLI', bin: 'gemini', versionArgs: ['--version'], testArgs: ['--version'], fallbackModels: ['gemini-2.5-pro', 'gemini-2.5-flash'], chatArgs: ({ model, prompt }) => ['-m', model, '-p', prompt] },
  { id: 'kimi', name: 'Kimi CLI', bin: 'kimi', versionArgs: ['--version'], testArgs: ['--version'], fallbackModels: ['kimi-k2', 'moonshot-v1-128k'], chatArgs: ({ model, prompt }) => ['--quiet', '--model', model, '--prompt', prompt] },
  { id: 'qwen', name: 'Qwen CLI', bin: 'qwen', versionArgs: ['--version'], testArgs: ['--version'], fallbackModels: ['qwen3-coder-plus', 'qwen3-max'], chatArgs: ({ model, prompt }) => ['-m', model, '-p', prompt] },
  { id: 'opencode', name: 'OpenCode', bin: 'opencode', versionArgs: ['--version'], testArgs: ['--version'], fallbackModels: ['opencode-default'], chatArgs: ({ prompt }) => ['run', prompt] },
];

const byokProviderDefinitions = [
  { id: 'anthropic', defaultBaseUrl: 'https://api.anthropic.com', defaultModel: 'claude-sonnet-4.5', needsKey: true },
  { id: 'openai-compatible', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-5', needsKey: true },
  { id: 'google-gemini', defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.5-pro', needsKey: true },
  { id: 'ollama', defaultBaseUrl: 'http://127.0.0.1:11434/v1', defaultModel: 'llama3.1', needsKey: false },
];

const mediaProviderDefinitions = [
  { id: 'openai-image', defaultBaseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-image-1' },
  { id: 'doubao-image', defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seedream-4-0' },
  { id: 'doubao-video', defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-seedance-1-0-pro' },
  { id: 'google-imagen', defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'imagen-4.0-generate-preview-06-06' },
  { id: 'google-veo', defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'veo-3.1-generate-preview' },
  { id: 'kling-video', defaultBaseUrl: 'https://api.klingai.com', defaultModel: 'kling-v1-6' },
  { id: 'minimax-video', defaultBaseUrl: 'https://api.minimax.io/v1', defaultModel: 'video-01' },
  { id: 'minimax-tts', defaultBaseUrl: 'https://api.minimax.io/v1', defaultModel: 'speech-02-hd' },
  { id: 'elevenlabs-audio', defaultBaseUrl: 'https://api.elevenlabs.io/v1', defaultModel: 'eleven_multilingual_v2' },
  { id: 'senseaudio', defaultBaseUrl: '', defaultModel: 'senseaudio-small' },
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
    model: agent.fallbackModels[0],
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
        model: definition?.fallbackModels.includes(textValue(incoming?.model)) ? textValue(incoming?.model) : fallback.model,
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

const getConfigPath = (app) => path.join(app.getPath('userData'), 'config', 'ai-settings.json');

const readAiConfig = async (app) => {
  try {
    const raw = await fs.readFile(getConfigPath(app), 'utf8');
    return normalizeAiConfig(JSON.parse(raw));
  } catch {
    return getDefaultAiConfig();
  }
};

const saveAiConfig = async (app, config) => {
  const normalized = normalizeAiConfig(config);
  const configPath = getConfigPath(app);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
};

const unique = (values) => {
  const seen = new Set();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const existingChildBinDirs = (root, segments) => {
  try {
    return fsSync.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => path.join(root, entry.name, ...segments))
      .filter((entryPath) => fsSync.existsSync(entryPath));
  } catch {
    return [];
  }
};

const getPathEntries = () => {
  const home = os.homedir();
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const npmPrefix = process.env.NPM_CONFIG_PREFIX || process.env.npm_config_prefix;
  const dirs = [
    ...(process.env.PATH || '').split(path.delimiter),
    process.env.VP_HOME ? path.join(process.env.VP_HOME, 'bin') : '',
    npmPrefix ? path.join(npmPrefix, 'bin') : '',
    path.join(home, '.local', 'bin'),
    path.join(home, '.vite-plus', 'bin'),
    path.join(home, '.opencode', 'bin'),
    path.join(home, '.bun', 'bin'),
    path.join(home, '.volta', 'bin'),
    path.join(home, '.asdf', 'shims'),
    path.join(home, 'Library', 'pnpm'),
    path.join(home, '.cargo', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, '.npm-packages', 'bin'),
    path.join(appData, 'npm'),
    path.join(localAppData, 'pnpm'),
    path.join(localAppData, 'Programs', 'pnpm'),
    path.join(home, 'scoop', 'shims'),
    'C:\\ProgramData\\chocolatey\\bin',
    '/opt/homebrew/bin',
    '/usr/local/bin',
  ];
  dirs.push(...existingChildBinDirs(path.join(home, '.local', 'share', 'mise', 'installs', 'npm-openai-codex'), ['bin']));
  dirs.push(...existingChildBinDirs(path.join(home, '.local', 'share', 'mise', 'installs', 'node'), ['bin']));
  dirs.push(...existingChildBinDirs(path.join(home, '.nvm', 'versions', 'node'), ['bin']));
  dirs.push(...existingChildBinDirs(path.join(home, '.local', 'share', 'fnm', 'node-versions'), ['installation', 'bin']));
  dirs.push(...existingChildBinDirs(path.join(home, '.fnm', 'node-versions'), ['installation', 'bin']));
  return unique(dirs);
};

const getExecutableNames = (bin) => {
  if (process.platform !== 'win32') return [bin];
  const extensions = (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';').filter(Boolean);
  const hasExtension = Boolean(path.extname(bin));
  return hasExtension ? [bin] : [...extensions.map((extension) => `${bin}${extension.toLowerCase()}`), ...extensions.map((extension) => `${bin}${extension.toUpperCase()}`)];
};

const findExecutable = async (bin) => {
  for (const directory of getPathEntries()) {
    for (const executableName of getExecutableNames(bin)) {
      const candidate = path.join(directory, executableName);
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
      }
    }
  }
  return null;
};

const runCommand = (command, args, timeoutMs = 3000, input = '') => {
  return new Promise((resolve) => {
    const invocation = createCommandInvocation(command, args);
    const child = spawn(invocation.command, invocation.args, { windowsHide: true, shell: false, windowsVerbatimArguments: invocation.windowsVerbatimArguments });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      resolve({ ok: false, output: (stderr || stdout).trim(), stdout: stdout.trim(), stderr: stderr.trim(), code: null });
    }, timeoutMs);
    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', () => {
      clearTimeout(timeout);
      resolve({ ok: false, output: (stderr || stdout).trim(), stdout: stdout.trim(), stderr: stderr.trim(), code: null });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ ok: code === 0, output: (code === 0 ? stdout : stderr || stdout).trim(), stdout: stdout.trim(), stderr: stderr.trim(), code });
    });
    if (input) child.stdin?.end(input);
  });
};

const normalizeChatMessages = (messages) => {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => isRecord(message) && ['user', 'assistant'].includes(message.role) && textValue(message.content).trim())
    .map((message) => ({ role: message.role, content: textValue(message.content).trim() }));
};

const buildChatPrompt = (messages) => {
  const conversation = messages.map((message) => `${message.role === 'user' ? '用户' : 'AI'}：${message.content}`).join('\n\n');
  return `你是 OpenFMV 的聊天助手。请像正常聊天一样直接回复用户，不要修改文件，不要执行命令。\n\n${conversation}\n\nAI：`;
};

const buildSafeChatPrompt = (messages) => {
  const conversation = messages.map((message) => `${message.role === 'user' ? 'User' : 'AI'}: ${message.content}`).join('\n\n');
  return `You are the OpenFMV chat assistant. Reply directly like a normal chat assistant. Do not edit files or run commands.\n\n${conversation}\n\nAI:`;
};

const sendChatMessage = async (app, request) => {
  const messages = normalizeChatMessages(request?.messages);
  const config = await readAiConfig(app);
  const agent = agentDefinitions.find((item) => item.id === config.selectedCliAgentId) || agentDefinitions[0];
  const selection = config.cliSelections.find((item) => item.agentId === agent.id);
  const model = selection?.model || agent.fallbackModels[0];

  if (!messages.length) return { ok: false, content: '', agentId: agent.id, model, error: 'Please enter a chat message' };

  const executable = await findExecutable(agent.bin);
  if (!executable) return { ok: false, content: '', agentId: agent.id, model, error: `${agent.name} is not installed or not in PATH` };

  const prompt = buildSafeChatPrompt(messages);
  const outputPath = agent.useOutputLastMessage ? path.join(os.tmpdir(), `openfmv-ai-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`) : '';
  const args = agent.chatArgs({ model, prompt, reasoningEffort: selection?.reasoningEffort, outputPath });
  const result = await runCommand(executable, args, 180000, agent.stdinPrompt ? prompt : '');
  let content = result.output;

  if (result.ok && outputPath) {
    try {
      content = (await fs.readFile(outputPath, 'utf8')).trim() || result.stdout || result.output;
    } catch {
      content = result.stdout || result.output;
    } finally {
      await fs.rm(outputPath, { force: true }).catch(() => {});
    }
  }

  if (!result.ok && !result.output) {
    return { ok: false, content: '', agentId: agent.id, model, error: 'AI call failed' };
  }

  return {
    ok: result.ok,
    content: content || 'No AI response received.',
    agentId: agent.id,
    model,
    ...(result.ok ? {} : { error: result.output || 'AI command exited with a non-zero code' }),
  };
};

const quoteWindowsCommandArg = (value) => {
  if (!/[\s"&<>|^%]/.test(value)) return value;
  return `"${value.replace(/"/g, '""').replace(/%/g, '"^%"')}"`;
};

const createCommandInvocation = (command, args) => {
  if (process.platform === 'win32' && /\.(bat|cmd)$/i.test(command)) {
    const inner = [command, ...args].map(quoteWindowsCommandArg).join(' ');
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', `"${inner}"`],
      windowsVerbatimArguments: true,
    };
  }
  return { command, args };
};

const detectAiAgents = async () => {
  return Promise.all(agentDefinitions.map(async (agent) => {
    const executable = await findExecutable(agent.bin);
    if (!executable) {
      return {
        id: agent.id,
        name: agent.name,
        bin: agent.bin,
        version: '',
        available: false,
        models: agent.fallbackModels,
        reasoningOptions: agent.reasoningOptions,
      };
    }
    const versionResult = await runCommand(executable, agent.versionArgs, 3000);
    return {
      id: agent.id,
      name: agent.name,
      bin: agent.bin,
      version: versionResult.output.split(/\r?\n/)[0] || 'installed',
      available: true,
      models: agent.fallbackModels,
      reasoningOptions: agent.reasoningOptions,
    };
  }));
};

const testAiAgent = async (agentId) => {
  const agent = agentDefinitions.find((item) => item.id === agentId);
  if (!agent) return { ok: false, message: '鏈煡 CLI' };
  const executable = await findExecutable(agent.bin);
  if (!executable) return { ok: false, message: '鏈湪 PATH 涓壘鍒板彲鎵ц鏂囦欢' };
  const result = await runCommand(executable, agent.testArgs, 5000);
  return result.ok ? { ok: true, message: result.output || 'CLI available' } : { ok: false, message: result.output || 'CLI test failed' };
};

const probeUrl = async (baseUrl, apiKey) => {
  if (!baseUrl) return { ok: true, message: 'Configuration looks valid' };
  if (typeof fetch !== 'function') return { ok: true, message: '閰嶇疆褰㈡€佹湁鏁堬紝褰撳墠杩愯鏃朵笉鏀寔 HTTP 鎺㈡祴' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: controller.signal,
    });
    return response.status < 500
      ? { ok: true, message: `HTTP ${response.status}` }
      : { ok: false, message: `HTTP ${response.status}` };
  } catch {
    return { ok: false, message: 'HTTP probe failed' };
  } finally {
    clearTimeout(timeout);
  }
};

const testByokProvider = async (provider) => {
  const normalized = normalizeAiConfig({ byokProviders: [provider] }).byokProviders.find((item) => item.providerId === provider?.providerId);
  const definition = byokProviderDefinitions.find((item) => item.id === normalized?.providerId);
  if (!definition || !normalized) return { ok: false, message: '鏈煡 Provider' };
  if (!normalized.model) return { ok: false, message: 'Enter a model name' };
  if (definition.needsKey && !normalized.apiKey) return { ok: false, message: '璇峰～鍐?API Key' };
  return probeUrl(normalized.baseUrl, normalized.apiKey);
};

const testMediaProvider = async (provider) => {
  const normalized = normalizeAiConfig({ mediaProviders: [provider] }).mediaProviders.find((item) => item.providerId === provider?.providerId);
  if (!normalized || !mediaIds.has(normalized.providerId)) return { ok: false, message: '鏈煡 Provider' };
  if (!normalized.apiKey) return { ok: false, message: '璇峰～鍐?API Key' };
  if (!normalized.model) return { ok: false, message: 'Enter a default model' };
  return probeUrl(normalized.baseUrl, normalized.apiKey);
};

const registerAiSettingsIpc = ({ ipcMain, app }) => {
  ipcMain.handle('openfmv:get-ai-config', async () => readAiConfig(app));
  ipcMain.handle('openfmv:save-ai-config', async (_event, config) => saveAiConfig(app, config));
  ipcMain.handle('openfmv:detect-ai-agents', async () => detectAiAgents());
  ipcMain.handle('openfmv:test-ai-agent', async (_event, agentId) => testAiAgent(agentId));
  ipcMain.handle('openfmv:send-chat-message', async (_event, request) => sendChatMessage(app, request));
  ipcMain.handle('openfmv:test-byok-provider', async (_event, provider) => testByokProvider(provider));
  ipcMain.handle('openfmv:test-media-provider', async (_event, provider) => testMediaProvider(provider));
};

module.exports = {
  agentDefinitions,
  byokProviderDefinitions,
  mediaProviderDefinitions,
  getDefaultAiConfig,
  normalizeAiConfig,
  getConfigPath,
  readAiConfig,
  saveAiConfig,
  detectAiAgents,
  testAiAgent,
  sendChatMessage,
  testByokProvider,
  testMediaProvider,
  registerAiSettingsIpc,
};
