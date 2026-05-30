const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'dist',
  'node_modules',
  'out',
  'reference',
]);
const IGNORED_FILES = new Set([
  path.join('docs', 'architecture-diagnostic.md'),
]);
const IGNORED_PATH_PREFIXES = [
  `${path.join('docs', 'superpowers')}${path.sep}`,
];
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
const MOJIBAKE_PATTERN = new RegExp([
  '\\u00c3',
  '\\u00c2',
  '\\u00e2\\u20ac',
  '\\ufffd',
  '\\u951f\\u65a4\\u62f7',
  '\\u934f',
  '\\u7459',
  '\\u95ca',
  '\\u7015',
  '\\u7d31',
  '\\u93c2',
  '\\u93b5',
  '\\u95b2',
  '\\u5a0a',
  '\\u621d',
  '\\u59e9',
  '\\u7470',
  '\\u6503',
  '\\u7f01',
  '\\u934a',
  '\\u6f57',
  '\\u6d93',
  '\\u6d58',
].join('|'));

const shouldScanFile = (filePath) => TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const shouldIgnoreFile = (filePath) => {
  const relativePath = path.relative(ROOT, filePath);
  return IGNORED_FILES.has(relativePath) || IGNORED_PATH_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
};

const walk = (directory, files = []) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        walk(path.join(directory, entry.name), files);
      }
      continue;
    }

    const filePath = path.join(directory, entry.name);
    if (entry.isFile() && shouldScanFile(filePath) && !shouldIgnoreFile(filePath)) files.push(filePath);
  }
  return files;
};

const findings = [];

for (const filePath of walk(ROOT)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = MOJIBAKE_PATTERN.exec(line);
    if (!match) return;
    findings.push({
      filePath: path.relative(ROOT, filePath),
      line: index + 1,
      column: match.index + 1,
      text: line.trim(),
    });
  });
}

if (findings.length > 0) {
  console.error('Locale guard found possible mojibake text:');
  for (const finding of findings) {
    console.error(`${finding.filePath}:${finding.line}:${finding.column} ${finding.text}`);
  }
  process.exit(1);
}

console.log('Locale guard passed: no common mojibake patterns found.');
