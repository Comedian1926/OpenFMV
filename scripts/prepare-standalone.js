const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');
const standaloneNextDir = path.join(standaloneDir, '.next');
const sourceStaticDir = path.join(root, '.next', 'static');
const targetStaticDir = path.join(standaloneNextDir, 'static');
const sourcePublicDir = path.join(root, 'public');
const targetPublicDir = path.join(standaloneDir, 'public');

if (!fs.existsSync(path.join(standaloneDir, 'server.js'))) {
  throw new Error('Missing .next/standalone/server.js. Run npm run build first.');
}

fs.mkdirSync(standaloneNextDir, { recursive: true });

if (fs.existsSync(sourceStaticDir)) {
  fs.rmSync(targetStaticDir, { recursive: true, force: true });
  fs.cpSync(sourceStaticDir, targetStaticDir, { recursive: true });
}

if (fs.existsSync(sourcePublicDir)) {
  fs.rmSync(targetPublicDir, { recursive: true, force: true });
  fs.cpSync(sourcePublicDir, targetPublicDir, { recursive: true });
}

console.log('Prepared Next standalone assets.');
