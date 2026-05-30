const { spawn } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs');
const os = require('os');
const path = require('path');
const {
  agentDefinitions: sharedAgentDefinitions,
  byokProviderDefinitions,
  mediaProviderDefinitions,
  getDefaultAiConfig,
  normalizeAiConfig,
} = require('../shared/ai-definitions');
const { registerIpcHandler } = require('../shared/ipc-contract.js');

const mediaIds = new Set(mediaProviderDefinitions.map((item) => item.id));

const isRecord = (value) => typeof value === 'object' && value !== null;
const textValue = (value) => typeof value === 'string' ? value : '';

const agentRuntimeById = {
  codex: { versionArgs: ['--version'], testArgs: ['--version'], stdinPrompt: true, useOutputLastMessage: true, chatArgs: ({ model, reasoningEffort, outputPath }) => ['exec', ...(model && model !== 'codex-default' ? ['--model', model] : []), '--sandbox', 'read-only', '-c', 'approval_policy="never"', '--ephemeral', ...(reasoningEffort ? ['-c', `model_reasoning_effort="${reasoningEffort}"`] : []), ...(outputPath ? ['--output-last-message', outputPath] : []), '-'] },
  claude: { versionArgs: ['--version'], testArgs: ['--version'], chatArgs: ({ model, prompt }) => ['-p', prompt, '--model', model] },
  gemini: { versionArgs: ['--version'], testArgs: ['--version'], chatArgs: ({ model, prompt }) => ['-m', model, '-p', prompt] },
  kimi: { versionArgs: ['--version'], testArgs: ['--version'], chatArgs: ({ model, prompt }) => ['--quiet', '--model', model, '--prompt', prompt] },
  qwen: { versionArgs: ['--version'], testArgs: ['--version'], chatArgs: ({ model, prompt }) => ['-m', model, '-p', prompt] },
  opencode: { versionArgs: ['--version'], testArgs: ['--version'], chatArgs: ({ prompt }) => ['run', prompt] },
};

const agentDefinitions = sharedAgentDefinitions.map((agent) => ({
  ...agent,
  fallbackModels: agent.models,
  ...agentRuntimeById[agent.id],
}));

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
  if (!agent) return { ok: false, message: 'Unknown CLI' };
  const executable = await findExecutable(agent.bin);
  if (!executable) return { ok: false, message: 'Executable not found in PATH' };
  const result = await runCommand(executable, agent.testArgs, 5000);
  return result.ok ? { ok: true, message: result.output || 'CLI available' } : { ok: false, message: result.output || 'CLI test failed' };
};

const probeUrl = async (baseUrl, apiKey) => {
  if (!baseUrl) return { ok: true, message: 'Configuration looks valid' };
  if (typeof fetch !== 'function') return { ok: true, message: 'Configuration shape is valid, but this runtime cannot probe HTTP.' };
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
  if (!definition || !normalized) return { ok: false, message: 'Unknown provider' };
  if (!normalized.model) return { ok: false, message: 'Enter a model name' };
  if (definition.needsKey && !normalized.apiKey) return { ok: false, message: 'Enter API key' };
  return probeUrl(normalized.baseUrl, normalized.apiKey);
};

const testMediaProvider = async (provider) => {
  const normalized = normalizeAiConfig({ mediaProviders: [provider] }).mediaProviders.find((item) => item.providerId === provider?.providerId);
  if (!normalized || !mediaIds.has(normalized.providerId)) return { ok: false, message: 'Unknown provider' };
  if (!normalized.apiKey) return { ok: false, message: 'Enter API key' };
  if (!normalized.model) return { ok: false, message: 'Enter a default model' };
  return probeUrl(normalized.baseUrl, normalized.apiKey);
};

const registerAiSettingsIpc = ({ ipcMain, app }) => {
  registerIpcHandler(ipcMain, 'getAiConfig', async () => readAiConfig(app));
  registerIpcHandler(ipcMain, 'saveAiConfig', async (_event, config) => saveAiConfig(app, config));
  registerIpcHandler(ipcMain, 'detectAiAgents', async () => detectAiAgents());
  registerIpcHandler(ipcMain, 'testAiAgent', async (_event, agentId) => testAiAgent(agentId));
  registerIpcHandler(ipcMain, 'sendChatMessage', async (_event, request) => sendChatMessage(app, request));
  registerIpcHandler(ipcMain, 'testByokProvider', async (_event, provider) => testByokProvider(provider));
  registerIpcHandler(ipcMain, 'testMediaProvider', async (_event, provider) => testMediaProvider(provider));
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
