const { spawnSync } = require('child_process');
const path = require('path');

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

run(process.execPath, ['node_modules/next/dist/bin/next', 'build']);
run(process.execPath, ['scripts/prepare-standalone.js']);
