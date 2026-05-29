import { AppEdge, AppNode, OpenFMVAsset, OpenFMVGraph, OpenFMVProject } from '../_types';
import { getEntryNodeId } from './graphRuntime';

export const defaultGraphData = (): OpenFMVGraph => ({
  nodes: [
    {
      id: 'start-node',
      type: 'start',
      position: { x: 100, y: 100 },
      data: { type: 'start', label: 'Start' },
    },
  ],
  edges: [],
});

export const ensureGraphData = (graphData?: Partial<OpenFMVGraph> | null): OpenFMVGraph => {
  const fallback = defaultGraphData();
  const nodes = Array.isArray(graphData?.nodes) && graphData.nodes.length > 0 ? graphData.nodes : fallback.nodes;
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = Array.isArray(graphData?.edges)
    ? graphData.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target) && edge.source !== edge.target)
    : fallback.edges;

  return { nodes, edges };
};

const now = () => new Date().toISOString();

const isTrackableAssetPath = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0 && !value.startsWith('blob:');
};

const assetTypeFromPath = (value: string): OpenFMVAsset['type'] => {
  const lower = value.split('?')[0].split('#')[0].toLowerCase();
  if (/\.(mp4|webm|mov|mkv)$/.test(lower)) return 'video';
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/.test(lower)) return 'image';
  if (/\.(mp3|wav|ogg|m4a|aac|flac)$/.test(lower)) return 'audio';
  return 'text';
};

const nameFromPath = (value: string, fallback: string) => {
  try {
    const pathname = value.startsWith('file:') ? new URL(value).pathname : value;
    const normalized = decodeURIComponent(pathname.replace(/\\/g, '/'));
    return normalized.split('/').filter(Boolean).pop() || fallback;
  } catch {
    return fallback;
  }
};

export const collectProjectAssetsFromGraph = (
  graphData: OpenFMVGraph,
  existingAssets: OpenFMVAsset[] = []
): OpenFMVAsset[] => {
  const assetsByPath = new Map<string, OpenFMVAsset>();
  for (const asset of existingAssets) {
    const key = asset.relativePath || asset.path;
    if (key) assetsByPath.set(key, asset);
  }

  const addAsset = (value: unknown, label: string) => {
    if (!isTrackableAssetPath(value)) return;
    if (assetsByPath.has(value)) return;
    assetsByPath.set(value, {
      id: crypto.randomUUID(),
      type: assetTypeFromPath(value),
      name: nameFromPath(value, label),
      path: value,
      relativePath: value,
      importedAt: now(),
      metadata: {},
    });
  };

  for (const node of graphData.nodes || []) {
    const data = node.data as Record<string, unknown>;
    addAsset(data.image, `${node.id}-image`);
    addAsset(data.video, `${node.id}-video`);
    addAsset(data.videoThumbnail, `${node.id}-thumbnail`);
  }

  return Array.from(assetsByPath.values());
};

export const createProjectSnapshot = (
  project: OpenFMVProject | null,
  title: string,
  nodes: AppNode[],
  edges: AppEdge[],
  existingAssets: OpenFMVAsset[] = []
): OpenFMVProject => {
  const timestamp = now();
  const graphData = ensureGraphData({ nodes, edges });
  const baseProject = project ?? {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    title,
    graphData,
    assets: [],
    metadata: {},
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const coverImage = graphData.nodes
    .map((node) => node.data as Record<string, unknown>)
    .map((data) => data.image || data.videoThumbnail)
    .find((value): value is string => typeof value === 'string' && value.length > 0);

  return {
    ...baseProject,
    title,
    graphData,
    assets: collectProjectAssetsFromGraph(graphData, existingAssets.length > 0 ? existingAssets : baseProject.assets),
    metadata: {
      ...baseProject.metadata,
      coverImage: coverImage || baseProject.metadata.coverImage,
      entryNodeId: getEntryNodeId(graphData, baseProject.metadata.entryNodeId),
    },
  };
};
