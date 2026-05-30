const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const fsSync = require('fs');
const http = require('http');
const net = require('net');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { exportGamePackage, sanitizeName, saveProjectToDirectory } = require('./exporter');
const { registerAiSettingsIpc } = require('./ai-settings');
const { registerIpcHandler } = require('../shared/ipc-contract.js');

const isDev = !app.isPackaged;
const appIconPath = path.join(__dirname, '..', 'public', 'logo.png');
Menu.setApplicationMenu(null);
if (process.platform === 'win32') app.setAppUserModelId('com.openfmv.openfmv');

app.on('browser-window-created', (_event, window) => {
  window.setMenu(null);
  window.removeMenu();
  window.setMenuBarVisibility(false);
});

const resolveConfiguredPort = () => {
  const configuredPort = Number(process.env.OPENFMV_PORT || process.env.PORT || '3000');
  return Number.isFinite(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
};
let serverPort = resolveConfiguredPort();
let nextProcess = null;

const createStatusHtml = (title, message) => {
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body style="margin:0;background:#09090b;color:white;font-family:Arial,'Microsoft YaHei',sans-serif;display:grid;place-items:center;height:100vh"><main style="max-width:620px;line-height:1.7;padding:32px"><p style="color:#f97316;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">OpenFMV</p><h1 style="margin:0 0 12px;font-size:32px">${title}</h1><p style="color:#cbd5e1;font-size:15px">${message}</p></main></body></html>`;
};

const loadStatusPage = async (win, title, message) => {
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(createStatusHtml(title, message))}`);
};

const ensureDir = async (target) => {
  await fs.mkdir(target, { recursive: true });
  return target;
};

const getWorkspaceDir = async () => {
  return ensureDir(path.join(app.getPath('userData'), 'projects'));
};

const getAssetDir = async () => {
  return ensureDir(path.join(app.getPath('userData'), 'assets'));
};

const decodeWithLabel = (bytes, label) => {
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return null;
  }
};

const replacementCount = (value) => (value.match(/\uFFFD/g) || []).length;

const mojibakePattern = new RegExp([
  '\\u00c3',
  '\\u00c2',
  '\\u00e2\\u20ac',
  '\\u951f\\u65a4\\u62f7',
  '\\u93c2',
  '\\u7f01',
  '\\u934a',
  '\\u7d31',
  '\\u6f57',
  '\\u6d93',
  '\\u6d58',
].join('|'));

const looksLikeMojibake = (value) => mojibakePattern.test(value);

const decodeTextBuffer = (buffer) => {
  const utf8 = decodeWithLabel(buffer, 'utf-8') || '';
  if (replacementCount(utf8) === 0 && !looksLikeMojibake(utf8)) return utf8;

  return ['gb18030', 'gbk']
    .map((label) => decodeWithLabel(buffer, label))
    .filter(Boolean)
    .reduce((best, candidate) => {
      const bestScore = replacementCount(best) + (looksLikeMojibake(best) ? 2 : 0);
      const candidateScore = replacementCount(candidate) + (looksLikeMojibake(candidate) ? 2 : 0);
      return candidateScore < bestScore ? candidate : best;
    }, utf8);
};

const importAssetAtPath = async (filePath) => {
  const assetDir = await getAssetDir();
  const ext = path.extname(filePath);
  const name = path.basename(filePath);
  const targetName = `${crypto.randomUUID()}${ext}`;
  const targetPath = path.join(assetDir, targetName);
  await fs.copyFile(filePath, targetPath);
  const lower = ext.toLowerCase();
  const type = ['.mp4', '.webm', '.mov', '.mkv'].includes(lower)
    ? 'video'
    : ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'].includes(lower)
      ? 'image'
      : ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(lower)
        ? 'audio'
        : 'text';
  const metadata = {
    originalPath: filePath,
  };

  if (type === 'text') {
    metadata.content = await fs.readFile(targetPath).then(decodeTextBuffer).catch(() => '');
    metadata.title = path.parse(name).name;
  }

  return {
    id: crypto.randomUUID(),
    type,
    name,
    path: targetPath,
    relativePath: pathToFileURL(targetPath).href,
    importedAt: new Date().toISOString(),
    metadata,
  };
};

const requestUrl = (targetUrl) => {
  return new Promise((resolve) => {
    const request = http.get(targetUrl, (response) => {
      response.resume();
      resolve(response.statusCode && response.statusCode < 500);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });
  });
};

const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => {
      probe.close(() => resolve(true));
    });
    probe.listen(port);
  });
};

const findAvailablePort = async (startPort) => {
  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i += 1) {
    const candidate = startPort + i;
    if (await isPortAvailable(candidate)) return candidate;
  }
  return startPort;
};

const waitForUrl = async (targetUrl, timeoutMs) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await requestUrl(targetUrl)) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
};

const getLogPath = () => {
  return path.join(app.getPath('userData'), 'logs', 'next-runtime.log');
};

const createLogStream = (label) => {
  const logDir = path.join(app.getPath('userData'), 'logs');
  fsSync.mkdirSync(logDir, { recursive: true });
  const logStream = fsSync.createWriteStream(getLogPath(), { flags: 'a' });
  logStream.write(`\n[${new Date().toISOString()}] ${label}\n`);
  return logStream;
};

const findStandaloneServer = () => {
  const candidates = [
    process.env.OPENFMV_STANDALONE_DIR,
    process.env[['RA', 'VEN_STANDALONE_DIR'].join('')],
    path.join(__dirname, '..', '.next', 'standalone'),
    path.join(app.getAppPath(), '.next', 'standalone'),
    path.join(process.resourcesPath || '', 'app', '.next', 'standalone'),
    path.join(process.resourcesPath || '', '.next', 'standalone'),
  ].filter(Boolean);

  for (const standaloneDir of candidates) {
    const serverPath = path.join(standaloneDir, 'server.js');
    if (fsSync.existsSync(serverPath)) {
      return { standaloneDir, serverPath };
    }
  }

  return null;
};

const startStandaloneServer = () => {
  if (process.env.ELECTRON_START_URL || nextProcess) return false;
  const standalone = findStandaloneServer();
  if (!standalone) return false;

  const logStream = createLogStream(`Starting standalone server ${standalone.serverPath}`);
  nextProcess = spawn(process.execPath, [standalone.serverPath], {
    cwd: standalone.standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(serverPort),
      HOSTNAME: '127.0.0.1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  nextProcess.stdout?.on('data', (chunk) => logStream.write(chunk));
  nextProcess.stderr?.on('data', (chunk) => logStream.write(chunk));
  nextProcess.on('exit', (code, signal) => {
    logStream.write(`\n[${new Date().toISOString()}] Standalone server exited code=${code} signal=${signal}\n`);
    logStream.end();
    nextProcess = null;
  });
  nextProcess.unref();
  return true;
};

const startDevServer = () => {
  if (!isDev || process.env.ELECTRON_START_URL || nextProcess) return;
  const logStream = createLogStream('Starting Next dev server');
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const port = String(serverPort);
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `npm.cmd run dev -- -p ${port}`]
    : ['run', 'dev', '--', '-p', port];
  logStream.write(`\n[${new Date().toISOString()}] Starting ${command} ${args.join(' ')}\n`);
  nextProcess = spawn(command, args, {
    cwd: path.join(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  nextProcess.stdout?.on('data', (chunk) => logStream.write(chunk));
  nextProcess.stderr?.on('data', (chunk) => logStream.write(chunk));
  nextProcess.on('exit', (code, signal) => {
    logStream.write(`\n[${new Date().toISOString()}] Next dev server exited code=${code} signal=${signal}\n`);
    logStream.end();
    nextProcess = null;
  });
  nextProcess.unref();
};

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    icon: appIconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.setMenu(null);
  win.removeMenu();
  win.setMenuBarVisibility(false);

  await loadStatusPage(win, 'Starting local editor', 'Starting the local interface service. First launch or dependency compilation can take a few seconds.');

  if (!process.env.ELECTRON_START_URL) {
    serverPort = await findAvailablePort(serverPort);
    if (!isDev || process.env.OPENFMV_USE_STANDALONE === '1' || process.env[['RA', 'VEN_USE_STANDALONE'].join('')] === '1') {
      startStandaloneServer();
    } else {
      startDevServer();
    }
  }

  const defaultStartUrl = process.env.ELECTRON_START_URL || `http://127.0.0.1:${serverPort}`;
  const isReady = await waitForUrl(defaultStartUrl, 30000);
  if (!isReady) {
    await loadStatusPage(win, 'Unable to start local interface', `The local interface service did not respond. Confirm port ${serverPort} is available. Log: ${getLogPath()}`);
    return;
  }

  await win.loadURL(defaultStartUrl);
};

registerIpcHandler(ipcMain, 'selectDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

registerIpcHandler(ipcMain, 'openProject', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'OpenFMV Project', extensions: ['json', 'openfmv'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const projectPath = result.filePaths[0];
  const raw = await fs.readFile(projectPath, 'utf8');
  const project = JSON.parse(raw);
  return {
    ...project,
    metadata: {
      ...project.metadata,
      projectDirectory: project.metadata?.projectDirectory || path.dirname(projectPath),
      projectPath,
    },
  };
});

registerIpcHandler(ipcMain, 'saveProject', async (_event, project) => {
  const workspace = await getWorkspaceDir();
  const projectDir = await ensureDir(project.metadata?.projectDirectory || path.join(workspace, sanitizeName(project.title)));
  return saveProjectToDirectory(project, projectDir);
});

registerIpcHandler(ipcMain, 'importAsset', async (_event, filePath) => {
  return importAssetAtPath(filePath);
});

registerIpcHandler(ipcMain, 'selectAsset', async () => {
  const result = await dialog.showOpenDialog({
    filters: [
      { name: 'OpenFMV Assets', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'mp4', 'webm', 'mov', 'mkv', 'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'txt', 'md'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return importAssetAtPath(result.filePaths[0]);
});

registerIpcHandler(ipcMain, 'exportGame', async (_event, project, config) => {
  const electronRuntimeDir = isDev ? path.dirname(process.execPath) : path.dirname(process.resourcesPath);
  return exportGamePackage({
    project,
    config,
    electronExecutablePath: process.execPath,
    electronRuntimeDir,
    isDev,
  });
});

registerIpcHandler(ipcMain, 'minimizeWindow', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

registerIpcHandler(ipcMain, 'toggleMaximizeWindow', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  if (win.isMaximized()) {
    win.unmaximize();
    return;
  }
  win.maximize();
});

registerIpcHandler(ipcMain, 'closeWindow', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

registerAiSettingsIpc({ ipcMain, app });

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
