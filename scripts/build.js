const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const devLockPath = path.join(root, '.openfmv-dev-server.json');

const sanitizePath = (value) => {
  return String(value || '')
    .split(path.delimiter)
    .filter((entry) => entry && !/Start Menu/i.test(entry))
    .join(path.delimiter);
};

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32' && /\.cmd$/i.test(command),
    env: {
      ...process.env,
      PATH: sanitizePath(process.env.PATH),
      Path: sanitizePath(process.env.Path),
    },
  });
  if (result.error) {
    console.error(result.error);
  }
  if (result.status !== 0) process.exit(result.status || 1);
};

const isProcessAlive = (pid) => {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const assertNoDevServer = () => {
  if (!fs.existsSync(devLockPath)) return;
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(devLockPath, 'utf8'));
  } catch {
    fs.rmSync(devLockPath, { force: true });
    return;
  }

  if (path.resolve(lock.cwd || '') !== path.resolve(root) || !isProcessAlive(Number(lock.pid))) {
    fs.rmSync(devLockPath, { force: true });
    return;
  }

  console.error(`Refusing to run Next build while the OpenFMV dev server is running (pid ${lock.pid}).`);
  console.error('Stop npm run dev first; dev and build share .next and running both can break CSS/JS chunks.');
  process.exit(1);
};

assertNoDevServer();
run(process.execPath, ['node_modules/next/dist/bin/next', 'build']);
run(process.execPath, ['scripts/prepare-standalone.js']);
