'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AssetRecordType,
  Editor,
  TLAsset,
  Tldraw,
  createShapeId,
  createShapesForAssets,
  toRichText,
} from 'tldraw';
import { OpenFMVAsset, OpenFMVProject } from '@/app/_types';
import { listLocalProjects } from '@/app/_utils/localProjects';
import { resolveMediaSrcAsync } from '@/app/_utils/mediaSrc';

interface AssetStudioClientProps {
  projectId?: string;
  assetId?: string;
}

const fitSize = (width: number, height: number) => {
  const maxWidth = 980;
  const maxHeight = 680;
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    w: Math.max(80, Math.round(width * ratio)),
    h: Math.max(80, Math.round(height * ratio)),
  };
};

const getImageSize = (src: string) => {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(fitSize(image.naturalWidth || 960, image.naturalHeight || 540));
    image.onerror = () => resolve({ w: 960, h: 540 });
    image.src = src;
  });
};

const getVideoSize = (src: string) => {
  return new Promise<{ w: number; h: number }>((resolve) => {
    const video = document.createElement('video');
    video.onloadedmetadata = () => resolve(fitSize(video.videoWidth || 960, video.videoHeight || 540));
    video.onerror = () => resolve({ w: 960, h: 540 });
    video.src = src;
  });
};

const getTextPreview = (asset?: OpenFMVAsset) => {
  const content = asset?.metadata?.content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  return asset?.name || 'Asset not found';
};

const getMimeType = (asset: OpenFMVAsset) => {
  const mimeType = asset.metadata?.mimeType;
  if (typeof mimeType === 'string') return mimeType;
  const path = `${asset.name} ${asset.path}`.toLowerCase();
  if (path.includes('.png')) return 'image/png';
  if (path.includes('.gif')) return 'image/gif';
  if (path.includes('.webp')) return 'image/webp';
  if (path.includes('.mp4')) return 'video/mp4';
  if (path.includes('.webm')) return 'video/webm';
  if (asset.type === 'image') return 'image/jpeg';
  if (asset.type === 'video') return 'video/mp4';
  return null;
};

const findAsset = (projects: OpenFMVProject[], projectId?: string, assetId?: string) => {
  const project = projects.find((item) => item.id === projectId) ?? projects.find((item) => item.assets.some((asset) => asset.id === assetId));
  const asset = project?.assets.find((item) => item.id === assetId);
  return { project, asset };
};

const clearCanvas = (editor: Editor) => {
  const shapeIds = Array.from(editor.getCurrentPageShapeIds());
  if (shapeIds.length) editor.deleteShapes(shapeIds);
};

const getTldrawAssetSrc = async (editor: Editor, asset: OpenFMVAsset, tldrawAsset: TLAsset, src: string) => {
  if (!src.startsWith('blob:')) return src;
  const response = await fetch(src);
  if (!response.ok) throw new Error('Failed to load asset preview');
  const blob = await response.blob();
  const file = new File([blob], asset.name, { type: getMimeType(asset) ?? (blob.type || 'application/octet-stream') });
  const uploaded = await editor.store.props.assets.upload(tldrawAsset, file);
  return uploaded.src;
};

const createMediaShape = async (editor: Editor, asset: OpenFMVAsset, src: string) => {
  const size = asset.type === 'video' ? await getVideoSize(src) : await getImageSize(src);
  const tldrawAsset: TLAsset = {
    id: AssetRecordType.createId(asset.id),
    typeName: 'asset',
    type: asset.type,
    props: {
      name: asset.name,
      src,
      w: size.w,
      h: size.h,
      mimeType: getMimeType(asset),
      isAnimated: asset.type === 'video' || asset.name.toLowerCase().endsWith('.gif'),
      fileSize: typeof asset.metadata?.size === 'number' ? asset.metadata.size : undefined,
    },
    meta: {},
  } as TLAsset;

  const tldrawSrc = await getTldrawAssetSrc(editor, asset, tldrawAsset, src);
  (tldrawAsset.props as { src: string | null }).src = tldrawSrc;
  await createShapesForAssets(editor, [tldrawAsset], { x: 0, y: 0 });
};

const createTextShape = (editor: Editor, text: string) => {
  const id = createShapeId('asset-text');
  editor.createShapes([
    {
      id,
      type: 'text',
      x: -360,
      y: -120,
      props: {
        richText: toRichText(text),
        w: 720,
        autoSize: false,
      },
    },
  ]);
  editor.select(id);
};

export default function AssetStudioClient({ projectId, assetId }: AssetStudioClientProps) {
  const [projects, setProjects] = useState<OpenFMVProject[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  useEffect(() => {
    setProjects(listLocalProjects());
  }, []);

  const { asset } = useMemo(() => findAsset(projects, projectId, assetId), [assetId, projectId, projects]);

  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      setHasSelection(editor.getSelectedShapeIds().length > 0);
    };

    updateSelection();
    return editor.store.listen(updateSelection);
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    let cancelled = false;

    const renderAsset = async () => {
      editor.updateInstanceState({ isReadonly: false });
      clearCanvas(editor);

      if (!asset) {
        createTextShape(editor, 'Asset not found');
        editor.zoomToFit();
        return;
      }

      const src = await resolveMediaSrcAsync(asset.path || asset.relativePath);

      if ((asset.type === 'image' || asset.type === 'video') && src) {
        await createMediaShape(editor, asset, src);
      } else {
        createTextShape(editor, getTextPreview(asset));
      }

      if (cancelled) return;
      editor.zoomToFit();
    };

    void renderAsset();

    return () => {
      cancelled = true;
    };
  }, [asset, editor]);

  return (
    <main className="openfmv-infinite-canvas asset-studio-canvas relative h-full w-full overflow-hidden bg-openfmv-canvas">
      <div className="relative z-0 h-full w-full">
        <Tldraw
          hideUi
          colorScheme="dark"
          persistenceKey={`asset-studio-${assetId || 'empty'}`}
          onMount={(mountedEditor) => {
            setEditor(mountedEditor);
          }}
        />
      </div>
      {hasSelection && (
        <div className="pointer-events-none absolute bottom-7 left-1/2 z-20 -translate-x-1/2 rounded-[18px] border border-white/14 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white/85 shadow-[0_18px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
          More tools are in development
        </div>
      )}
    </main>
  );
}
