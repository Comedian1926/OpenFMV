import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { describe, expect, it } from 'vitest';

import { graphRuntimeFunctionNames } from '@/app/_utils/graphRuntimeCore.mjs';

const require = createRequire(import.meta.url);
const { exportGamePackage, saveProjectToDirectory } = require('../../../electron/exporter');

describe('electron game exporter', () => {
  it('copies local graph media and rewrites runtime paths to relative assets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openfmv-export-'));
    const sourceImage = join(root, 'source.png');
    await writeFile(sourceImage, Buffer.from([137, 80, 78, 71]));

    const project = {
      schemaVersion: 1,
      id: 'project-1',
      title: 'Offline Game',
      graphData: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 0, y: 0 },
            data: {
              type: 'start',
              label: 'Start',
              image: pathToFileURL(sourceImage).href,
              content: 'Hello local game',
            },
          },
        ],
        edges: [],
      },
      assets: [
        {
          id: 'asset-1',
          type: 'image',
          name: 'source.png',
          path: pathToFileURL(sourceImage).href,
          relativePath: pathToFileURL(sourceImage).href,
          importedAt: new Date().toISOString(),
        },
      ],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await exportGamePackage({
      project,
      config: {
        gameTitle: 'Offline Game',
        outputDirectory: root,
        entryNodeId: 'start',
        windowMode: 'windowed',
        resolution: { width: 1280, height: 720 },
        includeDebugOverlay: false,
      },
      isDev: false,
    });

    const gameJson = JSON.parse(await readFile(join(result.outputDirectory, 'resources', 'app', 'game.json'), 'utf8'));
    const rewrittenImage = gameJson.graphData.nodes[0].data.image;
    expect(rewrittenImage).toBe('assets/source.png');
    expect(gameJson.assets[0].path).toBe('assets/source.png');
    expect(gameJson.assets[0].relativePath).toBe('assets/source.png');

    await expect(stat(join(result.outputDirectory, 'resources', 'app', rewrittenImage))).resolves.toBeTruthy();

    const html = await readFile(join(result.outputDirectory, 'resources', 'app', 'index.html'), 'utf8');
    expect(html).toContain('id="game-data"');
    expect(html).toContain('assets/source.png');
    expect(html).not.toContain("fetch('game.json')");
  });

  it('renders countdown runtime support for timed interactions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openfmv-export-countdown-'));
    const project = {
      schemaVersion: 1,
      id: 'project-countdown',
      title: 'Timed Game',
      graphData: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { type: 'start', label: 'Start', timeLimit: 3 },
          },
        ],
        edges: [],
      },
      assets: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await exportGamePackage({
      project,
      config: {
        gameTitle: 'Timed Game',
        outputDirectory: root,
        entryNodeId: 'start',
        windowMode: 'borderless',
        resolution: { width: 1280, height: 720 },
        includeDebugOverlay: false,
      },
      isDev: false,
    });

    const html = await readFile(join(result.outputDirectory, 'resources', 'app', 'index.html'), 'utf8');
    const main = await readFile(join(result.outputDirectory, 'resources', 'app', 'main.js'), 'utf8');
    expect(html).toContain('countdownTimer = setTimeout');
    expect(html).toContain('class="timer"');
    expect(main).toContain('frame: false');
  });

  it('exports the shared graph runtime for navigation rules', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openfmv-export-runtime-rules-'));
    const project = {
      schemaVersion: 1,
      id: 'project-runtime-rules',
      title: 'Runtime Rules',
      graphData: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { type: 'start', label: 'Start' },
          },
          {
            id: 'choice',
            type: 'interaction',
            position: { x: 100, y: 0 },
            data: {
              type: 'interaction',
              prompt: 'Choose',
              interactionMode: 'input',
              rules: [
                { id: 'left', keyword: 'left', condition: 'Left', handleId: 'left-handle' },
                { id: 'else', keyword: 'else', condition: 'Else', handleId: 'else' },
              ],
            },
          },
        ],
        edges: [
          { id: 'to-choice', source: 'start', target: 'choice' },
          { id: 'left-edge', source: 'choice', sourceHandle: 'left-handle', target: 'left-target' },
          { id: 'else-edge', source: 'choice', sourceHandle: 'else', target: 'else-target' },
        ],
      },
      assets: [],
      metadata: { entryNodeId: 'choice' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await exportGamePackage({
      project,
      config: {
        gameTitle: 'Runtime Rules',
        outputDirectory: root,
        entryNodeId: 'choice',
        windowMode: 'windowed',
        resolution: { width: 1280, height: 720 },
        includeDebugOverlay: false,
      },
      isDev: false,
    });

    const html = await readFile(join(result.outputDirectory, 'resources', 'app', 'index.html'), 'utf8');
    expect(html).toContain('window.OpenFMVGraphRuntime');
    for (const functionName of graphRuntimeFunctionNames) {
      expect(html).toContain(functionName);
    }
    expect(html).toContain('graphRuntime.resolveNextNodeId(node, graph.edges, choice)');
    expect(html).toContain('graphRuntime.shouldShowRuntimeControls(node, graph.edges)');
    expect(html).toContain('normalizedInput.includes(condition) || condition.includes(normalizedInput)');
    expect(html).toContain("outgoing.find((edge) => edge.sourceHandle === 'else')?.target");
    expect(html).toContain('nextFrom(current, { input: variables.lastInput })');
    expect(html).toContain('go(entryNodeId())');
  });

  it('uses the shared player control rules for start node choices and terminal fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openfmv-export-start-rules-'));
    const project = {
      schemaVersion: 1,
      id: 'project-start-rules',
      title: 'Start Rules',
      graphData: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 0, y: 0 },
            data: {
              type: 'start',
              label: 'Start',
              rules: [
                { id: 'intro', keyword: 'intro', condition: 'Watch intro', handleId: 'intro' },
              ],
            },
          },
        ],
        edges: [
          { id: 'intro-edge', source: 'start', sourceHandle: 'intro', target: 'intro-target' },
        ],
      },
      assets: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await exportGamePackage({
      project,
      config: {
        gameTitle: 'Start Rules',
        outputDirectory: root,
        entryNodeId: 'start',
        windowMode: 'windowed',
        resolution: { width: 1280, height: 720 },
        includeDebugOverlay: false,
      },
      isDev: false,
    });

    const html = await readFile(join(result.outputDirectory, 'resources', 'app', 'index.html'), 'utf8');
    expect(html).toContain('graphRuntime.getRuntimeChoiceRules(node).map');
    expect(html).toContain('data-choice-input');
    expect(html).toContain('button.dataset.choiceInput');
    expect(html).toContain('播放结束');
  });

  it('copies packaged electron runtime without leaking editor resources into exported game', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openfmv-packaged-runtime-'));
    const runtimeDir = join(root, 'runtime');
    await mkdir(join(runtimeDir, 'resources', 'app'), { recursive: true });
    await writeFile(join(runtimeDir, 'OpenFMV.exe'), Buffer.from('client-exe'));
    await writeFile(join(runtimeDir, 'electron.exe'), Buffer.from('electron-exe'));
    await writeFile(join(runtimeDir, 'resources', 'app', 'editor-only.txt'), 'editor');

    const project = {
      schemaVersion: 1,
      id: 'project-runtime',
      title: 'Runtime Clean Game',
      graphData: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { type: 'start', label: 'Start' },
          },
        ],
        edges: [],
      },
      assets: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await exportGamePackage({
      project,
      config: {
        gameTitle: 'Runtime Clean Game',
        outputDirectory: root,
        entryNodeId: 'start',
        windowMode: 'windowed',
        resolution: { width: 1280, height: 720 },
        includeDebugOverlay: false,
      },
      electronExecutablePath: join(runtimeDir, 'OpenFMV.exe'),
      electronRuntimeDir: runtimeDir,
      isDev: false,
    });

    await expect(stat(join(result.outputDirectory, 'Runtime Clean Game.exe'))).resolves.toBeTruthy();
    await expect(stat(join(result.outputDirectory, 'resources', 'app', 'main.js'))).resolves.toBeTruthy();
    await expect(stat(join(result.outputDirectory, 'resources', 'app', 'editor-only.txt'))).rejects.toBeTruthy();
    await expect(stat(join(result.outputDirectory, 'OpenFMV.exe'))).rejects.toBeTruthy();
    await expect(stat(join(result.outputDirectory, 'electron.exe'))).rejects.toBeTruthy();
    expect((await readdir(result.outputDirectory)).filter((entry) => entry.endsWith('.exe'))).toEqual(['Runtime Clean Game.exe']);
  });

  it('saves project JSON with project-relative media paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openfmv-project-save-'));
    const sourceImage = join(root, 'source.png');
    const projectDir = join(root, 'Saved Project');
    await writeFile(sourceImage, Buffer.from([137, 80, 78, 71]));

    const project = {
      schemaVersion: 1,
      id: 'project-save',
      title: 'Saved Project',
      graphData: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 0, y: 0 },
            data: {
              type: 'start',
              label: 'Start',
              image: sourceImage,
            },
          },
        ],
        edges: [],
      },
      assets: [
        {
          id: 'asset-1',
          type: 'image',
          name: 'source.png',
          path: sourceImage,
          relativePath: pathToFileURL(sourceImage).href,
          importedAt: new Date().toISOString(),
        },
      ],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedProject = await saveProjectToDirectory(project, projectDir);
    const savedJson = JSON.parse(await readFile(join(projectDir, 'project.openfmv.json'), 'utf8'));

    expect(savedProject.graphData.nodes[0].data.image).toBe('assets/images/source.png');
    expect(savedJson.graphData.nodes[0].data.image).toBe('assets/images/source.png');
    expect(savedJson.assets[0].path).toBe('assets/images/source.png');
    expect(savedJson.assets[0].relativePath).toBe('assets/images/source.png');
    await expect(stat(join(projectDir, 'assets', 'images', 'source.png'))).resolves.toBeTruthy();
  });

  it('does not persist unknown AI settings or API keys into project JSON', async () => {
    const root = await mkdtemp(join(tmpdir(), 'openfmv-project-secret-'));
    const projectDir = join(root, 'Secret Project');

    const project = {
      schemaVersion: 1,
      id: 'project-secret',
      title: 'Secret Project',
      graphData: {
        nodes: [
          {
            id: 'start',
            type: 'start',
            position: { x: 0, y: 0 },
            data: { type: 'start', label: 'Start' },
          },
        ],
        edges: [],
      },
      assets: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiSettings: {
        byokProviders: [
          { providerId: 'anthropic', apiKey: 'secret-api-key', baseUrl: 'https://api.test', model: 'claude-test' },
        ],
      },
    };

    await saveProjectToDirectory(project, projectDir);
    const rawJson = await readFile(join(projectDir, 'project.openfmv.json'), 'utf8');
    const savedJson = JSON.parse(rawJson);

    expect(rawJson).not.toContain('secret-api-key');
    expect(rawJson).not.toContain('aiSettings');
    expect(savedJson.aiSettings).toBeUndefined();
  });
});
