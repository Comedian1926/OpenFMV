let fs;
try {
  fs = require('original-fs').promises;
} catch {
  fs = require('fs/promises');
}
const path = require('path');
const crypto = require('crypto');
const { fileURLToPath, pathToFileURL } = require('url');

const ensureDir = async (target) => {
  await fs.mkdir(target, { recursive: true });
  return target;
};

let graphRuntimeCorePromise = null;

const getGraphRuntimeCore = () => {
  if (!graphRuntimeCorePromise) {
    graphRuntimeCorePromise = import(pathToFileURL(path.join(__dirname, '..', 'app', '_utils', 'graphRuntimeCore.mjs')).href);
  }
  return graphRuntimeCorePromise;
};

const sanitizeName = (value) => {
  return String(value || 'OpenFMVGame')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'OpenFMVGame';
};

const toPosixPath = (value) => {
  return value.replace(/\\/g, '/');
};

const copyDir = async (source, target) => {
  await ensureDir(target);
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
};

const copyElectronRuntime = async (electronRuntimeDir, electronExecutablePath, gameDir, gameTitle) => {
  if (!electronRuntimeDir) return;

  await copyDir(electronRuntimeDir, gameDir);
  await fs.rm(path.join(gameDir, 'resources', 'app'), { recursive: true, force: true });
  await fs.rm(path.join(gameDir, 'resources', 'default_app.asar'), { force: true });

  const sourceExeName = electronExecutablePath ? path.basename(electronExecutablePath) : 'electron.exe';
  const copiedSourceExe = path.join(gameDir, sourceExeName);
  const electronExe = path.join(gameDir, 'electron.exe');
  const sourceExe = await fs.access(copiedSourceExe).then(() => copiedSourceExe).catch(() => electronExe);
  const gameExe = path.join(gameDir, `${gameTitle}.exe`);
  await fs.copyFile(sourceExe, gameExe).catch(() => {});
  for (const extraExe of new Set([copiedSourceExe, electronExe])) {
    if (path.resolve(extraExe) !== path.resolve(gameExe)) {
      await fs.rm(extraExe, { force: true }).catch(() => {});
    }
  }
};

const isLocalFilePath = (value) => {
  return typeof value === 'string' && value && !value.startsWith('blob:') && !value.startsWith('data:') && !/^https?:\/\//i.test(value);
};

const resolveLocalPath = (sourcePath, baseDir) => {
  if (sourcePath.startsWith('file://')) {
    return fileURLToPath(sourcePath);
  }
  if (path.isAbsolute(sourcePath)) {
    return sourcePath;
  }
  return path.resolve(baseDir || process.cwd(), sourcePath);
};

const assetFolderForPath = (sourcePath) => {
  const ext = path.extname(sourcePath).toLowerCase();
  if (['.mp4', '.webm', '.mov', '.mkv'].includes(ext)) return 'videos';
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(ext)) return 'images';
  return 'files';
};

const collectGraphMediaPaths = (graphData) => {
  const paths = new Set();
  for (const node of graphData.nodes || []) {
    for (const key of ['image', 'video', 'videoThumbnail']) {
      const value = node.data?.[key];
      if (isLocalFilePath(value)) {
        paths.add(value);
      }
    }
  }
  return Array.from(paths);
};

const copyExportAsset = async (sourcePath, targetDir, usedNames, baseDir) => {
  const absoluteSource = resolveLocalPath(sourcePath, baseDir);
  await fs.access(absoluteSource);

  const parsed = path.parse(absoluteSource);
  let fileName = parsed.base;
  let index = 1;
  while (usedNames.has(fileName.toLowerCase())) {
    fileName = `${parsed.name}-${index}${parsed.ext}`;
    index += 1;
  }
  usedNames.add(fileName.toLowerCase());

  await fs.copyFile(absoluteSource, path.join(targetDir, fileName));
  return `assets/${fileName}`;
};

const copyProjectAsset = async (sourcePath, projectDir, usedNames, baseDir) => {
  const normalizedRelative = toPosixPath(sourcePath);
  if (!path.isAbsolute(sourcePath) && normalizedRelative.startsWith('assets/')) {
    await fs.access(path.join(projectDir, normalizedRelative));
    return normalizedRelative;
  }

  const absoluteSource = resolveLocalPath(sourcePath, baseDir || projectDir);
  await fs.access(absoluteSource);

  const parsed = path.parse(absoluteSource);
  const folder = assetFolderForPath(absoluteSource);
  const targetDir = await ensureDir(path.join(projectDir, 'assets', folder));
  let fileName = parsed.base;
  let index = 1;
  while (usedNames.has(`${folder}/${fileName}`.toLowerCase())) {
    fileName = `${parsed.name}-${index}${parsed.ext}`;
    index += 1;
  }
  usedNames.add(`${folder}/${fileName}`.toLowerCase());

  const targetPath = path.join(targetDir, fileName);
  if (path.resolve(absoluteSource) !== path.resolve(targetPath)) {
    await fs.copyFile(absoluteSource, targetPath);
  }
  return toPosixPath(path.join('assets', folder, fileName));
};

const rewriteGraphMediaPaths = (graphData, pathMap) => {
  for (const node of graphData.nodes || []) {
    if (!node.data) continue;
    for (const key of ['image', 'video', 'videoThumbnail']) {
      const value = node.data[key];
      if (pathMap.has(value)) {
        node.data[key] = pathMap.get(value);
      }
    }
  }
};

const normalizeProjectAssets = async (project, projectDir) => {
  const nextProject = JSON.parse(JSON.stringify(project));
  const baseDir = project.metadata?.projectDirectory || projectDir;
  const pathMap = new Map();
  const usedNames = new Set();

  const normalizePath = async (sourcePath) => {
    if (!isLocalFilePath(sourcePath)) return sourcePath;
    if (pathMap.has(sourcePath)) return pathMap.get(sourcePath);
    const relativePath = await copyProjectAsset(sourcePath, projectDir, usedNames, baseDir);
    pathMap.set(sourcePath, relativePath);
    return relativePath;
  };

  nextProject.assets = await Promise.all((nextProject.assets || []).map(async (asset) => {
    const sourcePath = asset.path || asset.relativePath;
    if (!sourcePath) return asset;
    try {
      const relativePath = await normalizePath(sourcePath);
      if (asset.relativePath) pathMap.set(asset.relativePath, relativePath);
      return {
        ...asset,
        path: relativePath,
        relativePath,
      };
    } catch {
      return asset;
    }
  }));

  for (const mediaPath of collectGraphMediaPaths(nextProject.graphData)) {
    try {
      await normalizePath(mediaPath);
    } catch {
    }
  }

  rewriteGraphMediaPaths(nextProject.graphData, pathMap);
  return nextProject;
};

const saveProjectToDirectory = async (project, projectDir) => {
  await ensureDir(projectDir);
  const projectPath = path.join(projectDir, 'project.openfmv.json');
  const normalizedProject = await normalizeProjectAssets(project, projectDir);
  const nextProject = {
    schemaVersion: normalizedProject.schemaVersion,
    id: normalizedProject.id,
    title: normalizedProject.title,
    graphData: normalizedProject.graphData,
    assets: normalizedProject.assets || [],
    metadata: {
      ...normalizedProject.metadata,
      projectDirectory: projectDir,
      projectPath,
    },
    createdAt: normalizedProject.createdAt,
    updatedAt: normalizedProject.updatedAt,
  };
  await fs.writeFile(projectPath, JSON.stringify(nextProject, null, 2), 'utf8');
  return nextProject;
};

const escapeScriptJson = (value) => {
  return value.replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
};

const createGameShellMain = (config) => `
const { app, BrowserWindow } = require('electron');
const path = require('path');

const createWindow = () => {
  const win = new BrowserWindow({
    width: ${Number(config.resolution?.width) || 1280},
    height: ${Number(config.resolution?.height) || 720},
    fullscreen: ${config.windowMode === 'fullscreen'},
    frame: ${config.windowMode !== 'borderless'},
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'index.html'));
};

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
`;

const createGameShellHtml = (gameJson, graphRuntimeScript = '') => `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OpenFMV Game</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; background: #050505; color: white; font-family: Inter, Arial, sans-serif; overflow: hidden; }
    #app { position: fixed; inset: 0; display: grid; place-items: center; background: radial-gradient(circle at 50% 20%, rgba(249,115,22,.18), transparent 35%), #050505; }
    .scene { position: relative; width: 100%; height: 100%; display: grid; place-items: center; }
    .media { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: .9; background: #000; }
    .shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,.35), rgba(0,0,0,.15), rgba(0,0,0,.72)); }
    .panel { position: relative; z-index: 2; width: min(880px, calc(100vw - 40px)); max-height: calc(100vh - 80px); overflow: auto; padding: 28px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; background: rgba(0,0,0,.58); backdrop-filter: blur(16px); box-shadow: 0 24px 90px rgba(0,0,0,.55); }
    h1 { margin: 0 0 14px; font-size: clamp(28px, 4vw, 56px); }
    p { color: rgba(255,255,255,.86); font-size: 18px; line-height: 1.7; white-space: pre-wrap; }
    .actions { display: grid; gap: 12px; margin-top: 24px; }
    .timer { margin-top: 20px; height: 4px; border-radius: 999px; background: rgba(255,255,255,.16); overflow: hidden; }
    .timer span { display: block; height: 100%; width: 100%; background: #f97316; transform-origin: left; animation: timer linear forwards; }
    @keyframes timer { from { transform: scaleX(1); } to { transform: scaleX(0); } }
    button, input { border: 1px solid rgba(255,255,255,.16); border-radius: 10px; background: rgba(255,255,255,.08); color: white; padding: 13px 16px; font-size: 15px; }
    button { cursor: pointer; text-align: left; }
    button:hover { border-color: rgba(249,115,22,.8); background: rgba(249,115,22,.18); }
    input { width: calc(100% - 34px); outline: none; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="application/json" id="game-data">${escapeScriptJson(gameJson)}</script>
  <script>${graphRuntimeScript}</script>
  <script>
    const appRoot = document.getElementById('app');
    const graphRuntime = window.OpenFMVGraphRuntime;
    let graph = null;
    let current = null;
    let variables = {};
    let countdownTimer = null;

    const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const findNode = (id) => graphRuntime.getNodeById(graph.nodes, id);
    const entryNodeId = () => graphRuntime.getEntryNodeId(graph, graph.metadata && graph.metadata.entryNodeId);

    const go = (id) => {
      const next = findNode(id);
      if (!next) {
        finish();
        return;
      }
      current = next;
      render();
    };

    const finish = () => {
      current = null;
      render();
    };

    const nextFrom = (node, choice) => {
      const targetNodeId = graphRuntime.resolveNextNodeId(node, graph.edges, choice);
      if (targetNodeId) {
        go(targetNodeId);
      } else {
        finish();
      }
    };

    const renderActions = (node) => {
      if (node.type === 'end') return '<button data-end="1">Restart</button>';
      if (graphRuntime.shouldShowRuntimeControls(node, graph.edges)) {
        const mode = graphRuntime.getRuntimeInteractionMode(node);
        if (mode === 'input') {
          return '<input id="answer" placeholder="' + escapeHtml(node.data.buttonText || 'Type your answer') + '" /><button data-input="1">Submit</button>';
        }
        if (mode === 'slider') {
          return '<button data-slider="1" data-handle="slider">' + escapeHtml((node.data.sliderConfig && node.data.sliderConfig.label) || '滑动解锁') + '</button>';
        }
        return graphRuntime.getRuntimeChoiceRules(node).map((rule) => '<button data-choice-input="' + escapeHtml(rule.condition || rule.keyword || '') + '" data-handle="' + escapeHtml(rule.handleId || '') + '">' + escapeHtml(rule.condition || rule.keyword || '选项') + '</button>').join('');
      }
      return '<button data-next="1">Continue</button>';
    };

    const render = () => {
      if (countdownTimer) {
        clearTimeout(countdownTimer);
        countdownTimer = null;
      }
      if (!current) {
        appRoot.innerHTML = '<div class="panel"><h1>播放结束</h1><div class="actions"><button data-end="1">重新开始</button></div></div>';
        appRoot.querySelector('[data-end]')?.addEventListener('click', () => go(entryNodeId()));
        return;
      }
      const media = current.data.video
        ? '<video class="media" src="' + escapeHtml(current.data.video) + '" poster="' + escapeHtml(current.data.videoThumbnail || '') + '" autoplay playsinline controls></video>'
        : current.data.image
          ? '<img class="media" src="' + escapeHtml(current.data.image) + '" />'
          : '';
      const timeLimit = Number(current.data.timeLimit) || 0;
      const timer = timeLimit > 0 ? '<div class="timer"><span style="animation-duration:' + timeLimit + 's"></span></div>' : '';
      appRoot.innerHTML = '<div class="scene">' + media + '<div class="shade"></div><div class="panel"><h1>' + escapeHtml(graphRuntime.getNodeTitle(current)) + '</h1><p>' + escapeHtml(graphRuntime.getNodeText(current)) + '</p><div class="actions">' + renderActions(current) + '</div>' + timer + '</div></div>';
      if (timeLimit > 0 && current.type !== 'end') {
        countdownTimer = setTimeout(() => nextFrom(current), timeLimit * 1000);
      }
      appRoot.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => {
          if (countdownTimer) {
            clearTimeout(countdownTimer);
            countdownTimer = null;
          }
          if (button.dataset.end) {
            go(entryNodeId());
            return;
          }
          if (button.dataset.slider) {
            nextFrom(current, { input: 'unlocked', handleId: button.dataset.handle });
            return;
          }
          if (button.dataset.input) {
            variables.lastInput = document.getElementById('answer')?.value || '';
            nextFrom(current, { input: variables.lastInput });
            return;
          }
          if (button.dataset.choiceInput !== undefined) {
            nextFrom(current, { input: button.dataset.choiceInput, handleId: button.dataset.handle });
            return;
          }
          nextFrom(current);
        });
      });
    };

    try {
      const game = JSON.parse(document.getElementById('game-data').textContent);
      graph = game.graphData;
      graph.metadata = game.metadata || {};
      current = findNode(entryNodeId());
      render();
    } catch (error) {
      appRoot.innerHTML = '<div class="panel"><h1>Unable to load game data</h1></div>';
    }
  </script>
</body>
</html>
`;

const exportGamePackage = async ({ project, config, electronExecutablePath, electronRuntimeDir, isDev }) => {
  const gameTitle = sanitizeName(config.gameTitle || project.title);
  const outputRoot = await ensureDir(config.outputDirectory);
  const gameDir = path.join(outputRoot, gameTitle);
  await fs.rm(gameDir, { recursive: true, force: true });
  await ensureDir(gameDir);
  await copyElectronRuntime(
    electronRuntimeDir || (electronExecutablePath ? path.dirname(electronExecutablePath) : null),
    electronExecutablePath,
    gameDir,
    gameTitle
  );
  const assetsDir = await ensureDir(path.join(gameDir, 'assets'));
  const resourcesAppDir = await ensureDir(path.join(gameDir, 'resources', 'app'));
  const resourcesAssetsDir = await ensureDir(path.join(resourcesAppDir, 'assets'));
  const graphData = JSON.parse(JSON.stringify(project.graphData));
  const assets = JSON.parse(JSON.stringify(project.assets || []));
  const pathMap = new Map();
  const usedNames = new Set();
  const baseDir = project.metadata?.projectDirectory;

  for (const asset of assets) {
    if (!asset.path) continue;
    try {
      const relativePath = await copyExportAsset(asset.path, resourcesAssetsDir, usedNames, baseDir);
      pathMap.set(asset.path, relativePath);
      if (asset.relativePath) pathMap.set(asset.relativePath, relativePath);
      asset.path = relativePath;
      asset.relativePath = relativePath;
    } catch {
    }
  }

  for (const mediaPath of collectGraphMediaPaths(graphData)) {
    if (pathMap.has(mediaPath)) continue;
    try {
      const relativePath = await copyExportAsset(mediaPath, resourcesAssetsDir, usedNames, baseDir);
      pathMap.set(mediaPath, relativePath);
    } catch {
    }
  }

  if (usedNames.size > 0) {
    await copyDir(resourcesAssetsDir, assetsDir);
  }

  rewriteGraphMediaPaths(graphData, pathMap);

  const gameJson = JSON.stringify({
    schemaVersion: project.schemaVersion,
    title: project.title,
    graphData,
    assets,
    metadata: {
      ...project.metadata,
      entryNodeId: config.entryNodeId,
      resolution: config.resolution,
      windowMode: config.windowMode,
      includeDebugOverlay: config.includeDebugOverlay,
    },
  }, null, 2);
  const { buildGraphRuntimeBrowserScript } = await getGraphRuntimeCore();
  const graphRuntimeScript = buildGraphRuntimeBrowserScript();

  await fs.writeFile(path.join(gameDir, 'game.json'), gameJson, 'utf8');
  await fs.writeFile(path.join(resourcesAppDir, 'game.json'), gameJson, 'utf8');
  await fs.writeFile(path.join(resourcesAppDir, 'package.json'), JSON.stringify({ name: 'openfmv-exported-game', main: 'main.js' }, null, 2), 'utf8');
  await fs.writeFile(path.join(resourcesAppDir, 'main.js'), createGameShellMain(config), 'utf8');
  await fs.writeFile(path.join(resourcesAppDir, 'index.html'), createGameShellHtml(gameJson, graphRuntimeScript), 'utf8');

  await fs.writeFile(path.join(gameDir, 'README.txt'), 'Double-click the game executable in this folder to launch the exported OpenFMV game.', 'utf8');
  return { outputDirectory: gameDir };
};

module.exports = {
  collectGraphMediaPaths,
  createGameShellHtml,
  createGameShellMain,
  exportGamePackage,
  isLocalFilePath,
  normalizeProjectAssets,
  rewriteGraphMediaPaths,
  saveProjectToDirectory,
  sanitizeName,
};
