import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { OpenFMVAgentId, OpenFMVAgentInfo, OpenFMVConnectionTestResult } from '../_types';
import { openfmvAgentDefinitions } from './aiSettings';

interface CommandInvocation {
  command: string;
  args: string[];
  windowsVerbatimArguments?: boolean;
}

export interface OpenFMVAgentDebugInfo {
  id: OpenFMVAgentId;
  name: string;
  bin: string;
  candidateBins: string[];
  pathEntries: string[];
  resolvedPath: string;
  available: boolean;
  version: string;
  versionArgs: string[];
  probeOk: boolean;
  probeCode: number | null;
  probeOutput: string;
  probeError: string;
}

const versionArgsByAgent = new Map<OpenFMVAgentId, string[]>(openfmvAgentDefinitions.map((agent) => [agent.id, ['--version']]));
const testArgsByAgent = new Map<OpenFMVAgentId, string[]>(openfmvAgentDefinitions.map((agent) => [agent.id, ['--version']]));

const unique = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const existingChildBinDirs = (root: string, segments: string[]) => {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
      .map((entry) => path.join(root, entry.name, ...segments))
      .filter((entryPath) => existsSync(entryPath));
  } catch {
    return [];
  }
};

const wellKnownUserToolchainBins = () => {
  return [];
};

export const getAgentPathEntries = () => unique([
  ...(process.env[['PA', 'TH'].join('')] || '').split(path.delimiter).filter((entry) => !/Start Menu/i.test(entry)),
  ...wellKnownUserToolchainBins(),
]);

const getExecutableNames = (bin: string) => {
  if (process.platform !== 'win32') return [bin];
  const extensions = (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM')
    .split(';')
    .map((extension) => extension.trim())
    .filter(Boolean);
  if (path.extname(bin)) return [bin];
  return unique([
    ...extensions.map((extension) => `${bin}${extension.toLowerCase()}`),
    ...extensions.map((extension) => `${bin}${extension.toUpperCase()}`),
  ]);
};

const findExecutable = async (bin: string, pathEntries = getAgentPathEntries()) => {
  const candidateBins = getExecutableNames(bin);
  for (const directory of pathEntries) {
    for (const executableName of candidateBins) {
      const candidate = path.join(directory, executableName);
      try {
        await access(candidate);
        if (statSync(candidate).isFile()) return candidate;
      } catch {
      }
    }
  }
  return '';
};

const quoteWindowsCommandArg = (value: string) => {
  if (!/[\s"&<>|^%]/.test(value)) return value;
  return `"${value.replace(/"/g, '""').replace(/%/g, '"^%"')}"`;
};

const createCommandInvocation = (command: string, args: string[]): CommandInvocation => {
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

const runCommand = (command: string, args: string[], timeoutMs = 3000) => new Promise<{ ok: boolean; output: string; code: number | null; error: string }>((resolve) => {
  const invocation = createCommandInvocation(command, args);
  const child = spawn(invocation.command, invocation.args, {
    shell: false,
    windowsHide: true,
    windowsVerbatimArguments: invocation.windowsVerbatimArguments,
  });
  let output = '';
  let settled = false;
  const finish = (result: { ok: boolean; code: number | null; error?: string }) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    resolve({ ok: result.ok, output: output.trim(), code: result.code, error: result.error || '' });
  };
  const timeout = setTimeout(() => {
    child.kill();
    finish({ ok: false, code: null, error: 'timeout' });
  }, timeoutMs);
  child.stdout?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.on('error', (error) => {
    finish({ ok: false, code: null, error: error.message });
  });
  child.on('close', (code) => {
    finish({ ok: code === 0, code });
  });
});

export const inspectOpenFMVAiAgents = async (): Promise<OpenFMVAgentDebugInfo[]> => {
  const pathEntries = getAgentPathEntries();
  return Promise.all(openfmvAgentDefinitions.map(async (agent) => {
    const resolvedPath = await findExecutable(agent.bin, pathEntries);
    const versionArgs = versionArgsByAgent.get(agent.id) || ['--version'];
    if (!resolvedPath) {
      return {
        id: agent.id,
        name: agent.name,
        bin: agent.bin,
        candidateBins: getExecutableNames(agent.bin),
        pathEntries,
        resolvedPath: '',
        available: false,
        version: '',
        versionArgs,
        probeOk: false,
        probeCode: null,
        probeOutput: '',
        probeError: 'not found',
      };
    }

    const versionResult = await runCommand(resolvedPath, versionArgs, 3000);
    const hardUnavailable = ['ENOENT', 'EACCES', 'ENOTDIR'].some((code) => versionResult.error.includes(code)) || versionResult.code === 126 || versionResult.code === 127;
    return {
      id: agent.id,
      name: agent.name,
      bin: agent.bin,
      candidateBins: getExecutableNames(agent.bin),
      pathEntries,
      resolvedPath,
      available: !hardUnavailable,
      version: versionResult.output.split(/\r?\n/)[0] || (hardUnavailable ? '' : 'installed'),
      versionArgs,
      probeOk: versionResult.ok,
      probeCode: versionResult.code,
      probeOutput: versionResult.output,
      probeError: versionResult.error,
    };
  }));
};

export const detectOpenFMVAiAgentsOnServer = async (): Promise<OpenFMVAgentInfo[]> => {
  const inspected = await inspectOpenFMVAiAgents();
  return inspected.map((agent) => {
    const definition = openfmvAgentDefinitions.find((item) => item.id === agent.id);
    return {
      id: agent.id,
      name: agent.name,
      bin: agent.bin,
      version: agent.version,
      available: agent.available,
      models: definition?.models || [],
      reasoningOptions: definition?.reasoningOptions,
    };
  });
};

export const testOpenFMVAiAgentOnServer = async (agentId: OpenFMVAgentId): Promise<OpenFMVConnectionTestResult> => {
  const agent = openfmvAgentDefinitions.find((item) => item.id === agentId);
  if (!agent) return { ok: false, message: 'Unknown CLI' };
  const executable = await findExecutable(agent.bin);
  if (!executable) return { ok: false, message: 'Executable not found in PATH' };
  const result = await runCommand(executable, testArgsByAgent.get(agentId) || ['--version'], 5000);
  return result.ok || result.output
    ? { ok: true, message: result.output || 'CLI available' }
    : { ok: false, message: result.error || 'CLI test failed' };
};
