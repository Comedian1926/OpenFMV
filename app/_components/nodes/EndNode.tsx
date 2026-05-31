import React, { memo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Position, NodeProps } from '@xyflow/react';
import { CheckCircle2, Image as ImageIcon, Loader2, Type, Video as VideoIcon, X } from 'lucide-react';

import { AppNode } from '../../_types';
import { useResolvedMediaSrc } from '../../_hooks/useResolvedMediaSrc';
import { useEditorStore } from '../../_store/useEditorStore';
import { addAssetToLocalProject, canUseNativeAssetPicker, importAssetFromFile, importAssetFromNativePicker } from '../../_utils/localProjects';
import OpenFMVVideo from '../video/OpenFMVVideo';
import { CustomHandle } from './CustomHandle';
import { nodeHeaderIconClassName, nodeTitleClassName, nodeTypeBadgeClassName } from './nodeStyles';

const EndNode = ({ id, data }: NodeProps<AppNode>) => {
  const t = useTranslations('editor');
  const assetsT = useTranslations('assets');
  const { currentProjectId, updateNodeData } = useEditorStore();
  const label = data.type === 'end' ? data.label || t('endNode') : t('endNode');
  const video = data.type === 'end' ? data.video : undefined;
  const videoPlaybackId = data.type === 'end' ? data.videoPlaybackId : undefined;
  const image = data.type === 'end' ? data.image : undefined;
  const imageSrc = useResolvedMediaSrc(image);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyAssetToNode = (asset: Awaited<ReturnType<typeof importAssetFromFile>>) => {
    if (asset.type === 'image') updateNodeData(id, { image: asset.relativePath || asset.path, video: undefined, videoPlaybackId: undefined, videoThumbnail: undefined });
    if (asset.type === 'video') updateNodeData(id, { video: asset.relativePath || asset.path, videoPlaybackId: undefined, image: undefined, videoThumbnail: undefined });
    if (asset.type === 'text') {
      const nextContent = typeof asset.metadata?.content === 'string' ? asset.metadata.content : '';
      updateNodeData(id, { content: nextContent, fullText: nextContent });
    }
  };

  const handleImportClick = async () => {
    if (!canUseNativeAssetPicker()) {
      fileInputRef.current?.click();
      return;
    }
    setIsImporting(true);
    try {
      const asset = await importAssetFromNativePicker();
      if (asset) {
        await addAssetToLocalProject(currentProjectId, asset);
        applyAssetToNode(asset);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(`${assetsT('importFailed')}: ${error instanceof Error ? error.message : t('unknownError')}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const asset = await importAssetFromFile(file);
      await addAssetToLocalProject(currentProjectId, asset);
      applyAssetToNode(asset);
    } catch (error) {
      console.error('Import error:', error);
      alert(`${assetsT('importFailed')}: ${error instanceof Error ? error.message : t('unknownError')}`);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const removeMedia = () => updateNodeData(id, { video: undefined, videoPlaybackId: undefined, image: undefined, videoThumbnail: undefined });

  return (
    <div className="group relative">
      <div className="w-[320px] overflow-hidden rounded-lg border border-white/12 bg-[#1f1f1f] shadow-[0_18px_50px_rgba(0,0,0,0.34)] transition group-hover:border-white/28">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-white/[0.045] px-3">
          <div className={nodeHeaderIconClassName}><CheckCircle2 size={15} /></div>
          <div className={`${nodeTitleClassName} truncate`}>{label}</div>
          <div className={nodeTypeBadgeClassName}>{t('nodeTypes.end.name')}</div>
        </div>

        <div className="space-y-3 p-3">
          <div className="group/media relative aspect-video overflow-hidden rounded-md border border-white/10 bg-black">
            {image ? (
              <>
                <img src={imageSrc} alt={t('endMediaAlt')} className="h-full w-full object-contain" />
                <button onClick={(event) => { event.stopPropagation(); removeMedia(); }} className="absolute right-2 top-2 z-10 rounded-md bg-black/55 p-1.5 text-white opacity-0 transition hover:bg-red-500/85 group-hover/media:opacity-100"><X size={14} /></button>
              </>
            ) : video ? (
              <>
                <OpenFMVVideo src={video} playbackId={videoPlaybackId} className="h-full w-full object-contain" controls playsInline />
                <button onClick={(event) => { event.stopPropagation(); removeMedia(); }} className="absolute right-2 top-2 z-10 rounded-md bg-black/55 p-1.5 text-white opacity-0 transition hover:bg-red-500/85 group-hover/media:opacity-100"><X size={14} /></button>
              </>
            ) : (
              <div onClick={() => void handleImportClick()} className="absolute inset-0 grid cursor-pointer place-items-center bg-white/[0.02] transition hover:bg-white/[0.06]">
                {isImporting ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-openfmv-accent"><Loader2 size={16} className="animate-spin" />{assetsT('importing')}</div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-openfmv-muted">
                    <VideoIcon size={15} />
                    <ImageIcon size={15} />
                    <Type size={15} />
                    <span>{t('importEndingAsset')}</span>
                    <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*,.txt,.md" onClick={(event) => event.stopPropagation()} onChange={handleFileUpload} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute left-[-10px] top-6 -translate-x-1/2"><CustomHandle type="target" position={Position.Left} isConnectable className="!border-white/30 !bg-[#1f1f1f]" /></div>
    </div>
  );
};

export default memo(EndNode);
