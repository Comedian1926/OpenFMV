const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const electronDistDir = path.join(root, 'node_modules', 'electron', 'dist');
const standaloneDir = path.join(root, '.next', 'standalone');
const appName = 'OpenFMV';
let outputDir = path.join(root, 'dist', `${appName}-win32-x64`);

const copyDir = (source, target) => {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
};

if (!fs.existsSync(path.join(electronDistDir, 'electron.exe'))) {
  throw new Error('Missing Electron runtime. Run npm install first.');
}

if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
  throw new Error('Missing Next standalone output. Run npm run build first.');
}

try {
  fs.rmSync(outputDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
} catch (error) {
  if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  outputDir = path.join(root, 'dist', `${appName}-win32-x64-${stamp}`);
}

const resourcesAppDir = path.join(outputDir, 'resources', 'app');
copyDir(electronDistDir, outputDir);
fs.rmSync(path.join(outputDir, 'resources', 'app'), { recursive: true, force: true });
fs.rmSync(path.join(outputDir, 'resources', 'default_app.asar'), { force: true });
fs.mkdirSync(resourcesAppDir, { recursive: true });

copyDir(path.join(root, 'electron'), path.join(resourcesAppDir, 'electron'));
copyDir(path.join(root, 'public'), path.join(resourcesAppDir, 'public'));
copyDir(path.join(root, 'shared'), path.join(resourcesAppDir, 'shared'));
copyDir(standaloneDir, path.join(resourcesAppDir, '.next', 'standalone'));

fs.writeFileSync(
  path.join(resourcesAppDir, 'package.json'),
  JSON.stringify({ name: 'openfmv-client', main: 'electron/main.js' }, null, 2),
  'utf8'
);

fs.copyFileSync(path.join(outputDir, 'electron.exe'), path.join(outputDir, `${appName}.exe`));
fs.writeFileSync(
  path.join(outputDir, 'README.txt'),
  'Double-click OpenFMV.exe to start the local interactive movie editor.',
  'utf8'
);

console.log(`Packaged desktop client: ${outputDir}`);
