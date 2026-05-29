import { AppNode, OpenFMVAsset } from '@/app/_types';

export type PickerAsset = {
  id: string;
  type: OpenFMVAsset['type'];
  url: string;
  prompt: string | null;
  metadata: unknown;
  createdAt: Date;
};

export const canReceiveAsset = (node: AppNode) => {
  return node.type === 'start' || node.type === 'story' || node.type === 'interaction' || node.type === 'end';
};

export const getPickerAssetUpdate = (targetNode: AppNode, asset: PickerAsset) => {
  if (!canReceiveAsset(targetNode)) return null;

  if (asset.type === 'image') {
    return { image: asset.url, video: undefined, videoThumbnail: undefined };
  }

  if (asset.type === 'video') {
    const metadata = typeof asset.metadata === 'object' && asset.metadata ? asset.metadata as Record<string, unknown> : {};
    return {
      video: asset.url,
      videoPlaybackId: typeof metadata.playbackId === 'string' ? metadata.playbackId : undefined,
      videoThumbnail: undefined,
      image: undefined,
    };
  }

  if (asset.type === 'text') {
    const metadata = typeof asset.metadata === 'object' && asset.metadata ? asset.metadata as Record<string, unknown> : {};
    const content = typeof metadata.content === 'string' ? metadata.content : asset.prompt || '';
    return targetNode.type === 'interaction' ? { prompt: content } : { content, fullText: content };
  }

  return null;
};
