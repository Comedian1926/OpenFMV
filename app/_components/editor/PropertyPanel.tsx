'use client';

import React, { useRef, useState } from 'react';
import { Clock, Image as ImageIcon, Plus, Trash2, Upload, Video, X } from 'lucide-react';
import { useResolvedMediaSrc } from '@/app/_hooks/useResolvedMediaSrc';
import { useEditorStore } from '../../_store/useEditorStore';
import { AppNode, InteractionRule, InteractionMode, OpenFMVAsset } from '../../_types';
import { addAssetToLocalProject, canUseNativeAssetPicker, importAssetFromFile, importAssetFromNativePicker } from '../../_utils/localProjects';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const getNodeTitle = (node: AppNode) => {
  const data = node.data as any;
  if (node.type === 'start') return data.label || '开始';
  if (node.type === 'end') return data.label || '结束';
  return data.title || data.prompt || node.type;
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-openfmv-muted">{children}</div>
);

export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    const timeoutId = window.setTimeout(() => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Thumbnail generation timed out'));
    }, 5000);

    video.onloadedmetadata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      window.clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onerror = (error) => {
      window.clearTimeout(timeoutId);
      URL.revokeObjectURL(video.src);
      reject(error);
    };
  });
};

export default function PropertyPanel() {
  const selectedNode = useEditorStore((state) => state.selectedNode);
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useEditorStore((state) => state.setSelectedNodeId);
  const updateNodeData = useEditorStore((state) => state.updateNodeData);
  const removeNode = useEditorStore((state) => state.removeNode);
  const setAssetPickerOpen = useEditorStore((state) => state.setAssetPickerOpen);
  const setTargetNodeIdForAsset = useEditorStore((state) => state.setTargetNodeIdForAsset);
  const currentProjectId = useEditorStore((state) => state.currentProjectId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const selectedData = selectedNode?.data as any;
  const imageSrc = useResolvedMediaSrc(selectedData?.image);
  const videoSrc = useResolvedMediaSrc(selectedData?.video);

  if (!selectedNode) return null;

  const data = selectedData;
  const rules = (data.rules || []) as InteractionRule[];
  const isInteractive = selectedNode.type === 'interaction' || selectedNode.type === 'start';

  const handleChange = (key: string, value: unknown) => {
    updateNodeData(selectedNode.id, { [key]: value } as Partial<AppNode['data']>);
  };

  const handleDelete = () => {
    if (!selectedNodeId) return;
    if (!window.confirm('确定删除这个节点吗？')) return;
    removeNode(selectedNodeId);
    setSelectedNodeId(null);
  };

  const handleOpenAssetPicker = () => {
    setTargetNodeIdForAsset(selectedNode.id);
    setAssetPickerOpen(true);
  };

  const applyAssetToNode = (asset: Awaited<ReturnType<typeof importAssetFromFile>>) => {
    if (asset.type === 'video') {
      updateNodeData(selectedNode.id, { video: asset.relativePath || asset.path, videoThumbnail: undefined, videoPlaybackId: undefined, image: undefined, interactionMode: data.interactionMode } as Partial<AppNode['data']>);
    } else if (asset.type === 'image') {
      updateNodeData(selectedNode.id, { image: asset.relativePath || asset.path, video: undefined, videoThumbnail: undefined, videoPlaybackId: undefined } as Partial<AppNode['data']>);
    } else if (asset.type === 'text') {
      handleChange('fullText', typeof asset.metadata?.content === 'string' ? asset.metadata.content : '');
    }
  };

  const clearBoundMedia = () => {
    updateNodeData(selectedNode.id, {
      image: undefined,
      video: undefined,
      videoThumbnail: undefined,
      videoPlaybackId: undefined,
    } as Partial<AppNode['data']>);
  };

  const clearBoundText = () => {
    updateNodeData(selectedNode.id, {
      fullText: '',
      content: '',
    } as Partial<AppNode['data']>);
  };

  const persistAssetToCurrentProject = async (asset: OpenFMVAsset) => {
    await addAssetToLocalProject(currentProjectId, asset);
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
        await persistAssetToCurrentProject(asset);
        if (asset.type === 'audio') {
          alert('音频已加入素材库，当前节点暂不支持直接绑定音频');
          return;
        }
        applyAssetToNode(asset);
      }
    } catch (error) {
      console.error('Failed to import asset', error);
      alert('导入素材失败');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      alert(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      if (file.type.startsWith('video/')) {
        const asset = await importAssetFromFile(file);
        await persistAssetToCurrentProject(asset);
        const thumbnail = await generateVideoThumbnail(file).catch(() => undefined);
        updateNodeData(selectedNode.id, { video: asset.relativePath || asset.path, videoThumbnail: thumbnail, videoPlaybackId: undefined, image: undefined, interactionMode: data.interactionMode } as Partial<AppNode['data']>);
      } else if (file.type.startsWith('image/')) {
        const asset = await importAssetFromFile(file);
        await persistAssetToCurrentProject(asset);
        applyAssetToNode(asset);
      } else if (file.type.startsWith('audio/')) {
        const asset = await importAssetFromFile(file);
        await persistAssetToCurrentProject(asset);
        alert('音频已加入素材库，当前节点暂不支持直接绑定音频');
      } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const asset = await importAssetFromFile(file);
        await persistAssetToCurrentProject(asset);
        applyAssetToNode(asset);
      }
    } catch (error) {
      console.error('Failed to import asset', error);
      alert('导入素材失败');
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleAddRule = () => {
    const nextRule: InteractionRule = {
      id: crypto.randomUUID(),
      keyword: `选项 ${rules.length + 1}`,
      condition: `选项 ${rules.length + 1}`,
      handleId: crypto.randomUUID(),
    };
    handleChange('rules', [...rules, nextRule]);
  };

  const handleUpdateRule = (id: string, value: string) => {
    handleChange('rules', rules.map((rule) => (rule.id === id ? { ...rule, keyword: value, condition: value } : rule)));
  };

  const handleRemoveRule = (id: string) => {
    handleChange('rules', rules.filter((rule) => rule.id !== id));
  };

  return (
    <aside className="absolute right-4 top-24 z-40 flex max-h-[calc(100%-7rem)] w-[360px] flex-col overflow-hidden rounded-[30px] border border-white/15 bg-white/[0.10] shadow-[0_24px_90px_rgba(0,0,0,0.44)] backdrop-blur-3xl">
      <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-openfmv-muted">{selectedNode.type}</div>
          <div className="mt-1 truncate text-base font-semibold text-white">{getNodeTitle(selectedNode)}</div>
        </div>
        <Button onClick={() => setSelectedNodeId(null)} variant="icon" size="compactIcon" className="rounded-full">
          <X size={16} />
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <section className="space-y-3">
          <SectionTitle>基础信息</SectionTitle>
          <Label className="block">
            <span className="mb-1.5 block text-xs font-medium text-openfmv-sub">标题</span>
            <Input value={data.title || data.label || ''} onChange={(event) => handleChange(selectedNode.type === 'start' || selectedNode.type === 'end' ? 'label' : 'title', event.target.value)} className="nodrag h-12 rounded-[22px] border-white/15 bg-white/[0.055] px-4 text-white" />
          </Label>

          {selectedNode.type !== 'interaction' && (
            <Label className="block">
              <span className="mb-1.5 block text-xs font-medium text-openfmv-sub">剧情文本</span>
              <Textarea value={data.fullText || data.content || ''} onChange={(event) => handleChange('fullText', event.target.value)} className="nodrag nowheel min-h-32 resize-none rounded-[22px] border-white/15 bg-white/[0.055] px-4 py-3 text-white" />
            </Label>
          )}
        </section>

        <section className="space-y-3">
          <SectionTitle>媒体</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void handleImportClick()} disabled={isImporting} variant="glass" className="rounded-[22px] px-3 py-3 text-xs">
              <Upload size={14} />
              {isImporting ? '导入中' : '导入'}
            </Button>
            <Button onClick={handleOpenAssetPicker} variant="glass" className="rounded-[22px] px-3 py-3 text-xs">
              <ImageIcon size={14} />
              素材库
            </Button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*,.txt,.md" className="hidden" onChange={handleFileChange} />
          {(data.image || data.video) && (
            <div className="overflow-hidden rounded-[22px] border border-white/15 bg-white/[0.055] text-xs text-openfmv-muted">
              <div className="grid aspect-video place-items-center bg-black">
                {data.image ? (
                  <img src={imageSrc} alt="节点图片素材" className="h-full w-full object-contain" />
                ) : data.video ? (
                  <video src={videoSrc} className="h-full w-full object-contain" muted />
                ) : null}
              </div>
              <div className="space-y-3 p-3">
                <div className="flex items-center gap-2 truncate">
                  {data.video ? <Video size={14} /> : <ImageIcon size={14} />}
                  <span className="truncate">{data.video || data.image}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleOpenAssetPicker} variant="outline" size="sm" className="flex-1 rounded-full border-white/15 bg-transparent text-openfmv-sub hover:border-openfmv-accent hover:bg-white/[0.08] hover:text-white">
                    替换
                  </Button>
                  <Button onClick={clearBoundMedia} variant="outline" size="sm" className="flex-1 rounded-full border-red-400/25 bg-transparent text-red-300 hover:bg-red-500/10 hover:text-red-200">
                    清除
                  </Button>
                </div>
              </div>
            </div>
          )}
          {(data.fullText || data.content) && (
            <Button onClick={clearBoundText} variant="outline" size="sm" className="w-full rounded-[18px] border-white/15 bg-white/[0.035] text-openfmv-sub hover:border-red-400/35 hover:bg-white/[0.06] hover:text-red-300">
              清除剧情文本
            </Button>
          )}
        </section>

        {isInteractive && (
          <section className="space-y-3">
            <SectionTitle>交互</SectionTitle>
            <Label className="block">
              <span className="mb-1.5 block text-xs font-medium text-openfmv-sub">提示文本</span>
              <Textarea value={data.prompt || ''} onChange={(event) => handleChange('prompt', event.target.value)} className="nodrag nowheel min-h-24 resize-none rounded-[22px] border-white/15 bg-white/[0.055] px-4 py-3 text-white" />
            </Label>

            <Label className="block">
              <span className="mb-1.5 block text-xs font-medium text-openfmv-sub">交互方式</span>
              <Select value={data.interactionMode || 'choice'} onValueChange={(value) => handleChange('interactionMode', value as InteractionMode)}>
                <SelectTrigger className="nodrag h-12 rounded-[22px] border-white/15 bg-white/[0.055] px-4 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/15 bg-openfmv-node text-openfmv-text">
                  <SelectItem value="choice">选择</SelectItem>
                  <SelectItem value="input">输入</SelectItem>
                  <SelectItem value="slider">滑动解锁</SelectItem>
                </SelectContent>
              </Select>
            </Label>

            {data.interactionMode === 'slider' && (
              <Label className="block">
                <span className="mb-1.5 block text-xs font-medium text-openfmv-sub">滑动提示</span>
                <Input value={data.sliderConfig?.label || '滑动解锁'} onChange={(event) => handleChange('sliderConfig', { ...data.sliderConfig, label: event.target.value })} className="nodrag h-12 rounded-[22px] border-white/15 bg-white/[0.055] px-4 text-white" />
              </Label>
            )}

            <Label className="block">
              <span className="mb-1.5 flex items-center gap-1 text-xs font-medium text-openfmv-sub">
                <Clock size={12} />
                倒计时秒数
              </span>
              <Input type="number" min={0} value={data.timeLimit || ''} onChange={(event) => handleChange('timeLimit', Number(event.target.value) || 0)} className="nodrag nowheel h-12 rounded-[22px] border-white/15 bg-white/[0.055] px-4 text-white" />
            </Label>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-openfmv-sub">交互选项</span>
                <Button onClick={handleAddRule} variant="outline" size="sm" className="rounded-full border-white/15 bg-transparent text-openfmv-sub hover:border-openfmv-accent hover:bg-white/[0.08] hover:text-white">
                  <Plus size={12} />
                  添加
                </Button>
              </div>
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2">
                  <Input value={rule.condition || rule.keyword} onChange={(event) => handleUpdateRule(rule.id, event.target.value)} className="nodrag h-11 min-w-0 flex-1 rounded-[22px] border-white/15 bg-white/[0.055] px-4 text-xs text-white" />
                  <Button onClick={() => handleRemoveRule(rule.id)} variant="icon" size="icon" className="rounded-full hover:bg-red-500/10 hover:text-red-300">
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="border-t border-white/15 p-5">
        <Button onClick={handleDelete} variant="outline" className="w-full rounded-[22px] border-red-400/30 bg-red-500/5 px-3 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/10 hover:text-red-200">
          <Trash2 size={14} />
          删除节点
        </Button>
      </div>
    </aside>
  );
}


