const ASSET_SOURCE_KINDS = Object.freeze({
  projectAsset: 'projectAsset',
  absolutePath: 'absolutePath',
  fileUrl: 'fileUrl',
  blobUrl: 'blobUrl',
  dataUrl: 'dataUrl',
  remoteUrl: 'remoteUrl',
  unknown: 'unknown',
});

const isAbsolutePath = (value) => {
  return /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('/') || value.startsWith('\\\\');
};

const classifyAssetSource = (value) => {
  if (typeof value !== 'string') return ASSET_SOURCE_KINDS.unknown;
  if (!value.trim()) return ASSET_SOURCE_KINDS.unknown;
  const source = value;
  if (/^blob:/i.test(source)) return ASSET_SOURCE_KINDS.blobUrl;
  if (/^data:/i.test(source)) return ASSET_SOURCE_KINDS.dataUrl;
  if (/^https?:\/\//i.test(source)) return ASSET_SOURCE_KINDS.remoteUrl;
  if (/^file:/i.test(source)) return ASSET_SOURCE_KINDS.fileUrl;
  if (/^assets[\\/]/i.test(source)) return ASSET_SOURCE_KINDS.projectAsset;
  if (isAbsolutePath(source)) return ASSET_SOURCE_KINDS.absolutePath;
  return ASSET_SOURCE_KINDS.unknown;
};

const isProjectAssetSourceKind = (kind) => {
  return kind === ASSET_SOURCE_KINDS.projectAsset || kind === ASSET_SOURCE_KINDS.absolutePath || kind === ASSET_SOURCE_KINDS.fileUrl;
};

module.exports = {
  ASSET_SOURCE_KINDS,
  classifyAssetSource,
  isProjectAssetSourceKind,
};
