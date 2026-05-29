const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const lockPath = path.join(root, '.openfmv-dev-server.json');

const sanitizePath = (value) => {
  return String(value || '')
    .split(path.delimiter)
    .filter((entry) => entry && !/Start Menu/i.test(entry))
    .join(path.delimiter);
};

const writeLock = (child) => {
  fs.writeFileSync(lockPath, JSON.stringify({
    pid: child.pid,
    cwd: root,
    startedAt: new Date().toISOString(),
  }, null, 2));
};

const removeLock = () => {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    if (lock.pid === child.pid) fs.rmSync(lockPath, { force: true });
  } catch {
    fs.rmSync(lockPath, { force: true });
  }
};

const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: sanitizePath(process.env.PATH),
    Path: sanitizePath(process.env.Path),
  },
  windowsHide: true,
});

writeLock(child);

child.on('exit', (code, signal) => {
  removeLock();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});

process.on('exit', removeLock);
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
