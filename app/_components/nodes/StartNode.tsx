import React, { memo, useEffect, useRef, useState } from 'react';
import { Position, NodeProps } from '@xyflow/react';
import { ChevronDown, Clock, Image as ImageIcon, Loader2, Play, Plus, Trash2, Type, Video as VideoIcon, X } from 'lucide-react';

import { AppNode, InteractionMode, InteractionRule } from '../../_types';
import { useDebouncedCallback } from '../../_hooks/useDebounce';
import { useResolvedMediaSrc } from '../../_hooks/useResolvedMediaSrc';
import { useEditorStore } from '../../_store/useEditorStore';
import { addAssetToLocalProject, canUseNativeAssetPicker, importAssetFromFile, importAssetFromNativePicker } from '../../_utils/localProjects';
import OpenFMVVideo from '../video/OpenFMVVideo';
import { CustomHandle } from './CustomHandle';
import { nodeHeaderIconClassName, nodeTitleClassName, nodeTypeBadgeClassName } from './nodeStyles';

const localInteractionMode = (mode: string | undefined): InteractionMode => (mode === 'input' || mode === 'slider' ? mode : 'choice');

const modeLabel = (mode: InteractionMode) => {
  if (mode === 'input') return '输入';
  if (mode === 'slider') return '滑动';
  return '选择';
};

const StartNode = ({ id, data }: NodeProps<AppNode>) => {
  const { currentProjectId, updateNodeData } = useEditorStore();
  const startData = data.type === 'start' ? data : undefined;
  const video = startData?.video;
  const videoPlaybackId = startData?.videoPlaybackId;
  const image = startData?.image;
  const rules = startData?.rules || [];
  const timeLimit = startData?.timeLimit || 0;
  const elseLabel = startData?.elseLabel || '默认';
  const interactionMode = localInteractionMode(startData?.interactionMode);
  const isSlider = interactionMode === 'slider';
  const sliderConfig = startData?.sliderConfig;
  const imageSrc = useResolvedMediaSrc(image);
  const [isImporting, setIsImporting] = useState(false);
  const [localTimeLimit, setLocalTimeLimit] = useState(timeLimit);
  const [localElseLabel, setLocalElseLabel] = useState(elseLabel);
  const [localSliderLabel, setLocalSliderLabel] = useState(sliderConfig?.label || '滑动解锁');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayLabel = startData?.label && startData.label !== '??' ? startData.label : '开始节点';

  useEffect(() => setLocalTimeLimit(timeLimit), [timeLimit]);
  useEffect(() => setLocalElseLabel(elseLabel), [elseLabel]);
  useEffect(() => setLocalSliderLabel(sliderConfig?.label || '滑动解锁'), [sliderConfig?.label]);

  useEffect(() => {
    if (!isSelectOpen) return;
    const handleClickOutside = () => setIsSelectOpen(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isSelectOpen]);

  const debouncedUpdateTimeLimit = useDebouncedCallback((value: number) => updateNodeData(id, { timeLimit: value }), 300);
  const debouncedUpdateElseLabel = useDebouncedCallback((value: string) => updateNodeData(id, { elseLabel: value }), 300);
  const debouncedUpdateSliderLabel = useDebouncedCallback((value: string) => updateNodeData(id, { sliderConfig: { ...(sliderConfig || {}), label: value } }), 300);

  const setMode = (mode: InteractionMode) => {
    updateNodeData(id, { interactionMode: mode, sliderConfig: mode === 'slider' ? { ...(sliderConfig || {}), label: localSliderLabel || '滑动解锁' } : sliderConfig });
    setIsSelectOpen(false);
  };

  const addRule = () => {
    const label = `选项 ${rules.filter((rule) => rule.handleId !== 'else').length + 1}`;
    const newRule: InteractionRule = { id: crypto.randomUUID(), keyword: label, condition: label, handleId: crypto.randomUUID() };
    updateNodeData(id, { rules: [...rules, newRule] });
  };

  const updateRuleCondition = (ruleId: string, condition: string) => {
    updateNodeData(id, { rules: rules.map((rule) => (rule.id === ruleId ? { ...rule, keyword: condition, condition } : rule)) });
  };

  const removeRule = (ruleId: string) => updateNodeData(id, { rules: rules.filter((rule) => rule.id !== ruleId) });

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
      console.error('导入失败:', error);
      alert('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
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
      console.error('导入失败:', error);
      alert('导入失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const removeMedia = () => updateNodeData(id, { video: undefined, videoPlaybackId: undefined, image: undefined, videoThumbnail: undefined });

  return (
    <div className="group relative">
      <div className="w-[320px] rounded-lg border border-white/12 bg-[#1f1f1f] shadow-[0_18px_50px_rgba(0,0,0,0.34)] transition group-hover:border-white/28">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-white/[0.045] px-3">
          <div className={nodeHeaderIconClassName}>
            <Play size={15} fill="currentColor" />
          </div>
          <div className={nodeTitleClassName}>{displayLabel}</div>
          <div className={nodeTypeBadgeClassName}>开始</div>
        </div>

        <div className="space-y-3 p-3">
          <div className="group/media relative aspect-video overflow-hidden rounded-md border border-white/10 bg-black">
            {image ? (
              <>
                <img src={imageSrc} alt="media" className="h-full w-full object-contain" />
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
                  <div className="flex items-center gap-2 text-xs font-semibold text-openfmv-accent"><Loader2 size={16} className="animate-spin" />正在导入</div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-openfmv-muted">
                    <VideoIcon size={15} />
                    <ImageIcon size={15} />
                    <Type size={15} />
                    <span>导入开场媒体</span>
                    <input ref={fileInputRef} type="file" className="hidden" accept="video/*,image/*,.txt,.md" onClick={(event) => event.stopPropagation()} onChange={handleFileUpload} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3">
              <div className="flex items-center gap-2 text-openfmv-sub"><Clock size={14} className="text-openfmv-muted" /><span className="text-xs font-semibold">倒计时</span></div>
              <div className="flex items-center"><input type="number" min="0" value={localTimeLimit || ''} onChange={(event) => { const value = Number.parseInt(event.target.value, 10) || 0; setLocalTimeLimit(value); debouncedUpdateTimeLimit(value); }} className="nodrag nowheel w-8 bg-transparent text-right font-mono text-xs text-openfmv-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="0" onKeyDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} /><span className="ml-1 text-[10px] font-medium text-openfmv-muted">s</span></div>
            </div>

            <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.055] px-3">
              <div className="relative">
                <button onClick={(event) => { event.stopPropagation(); setIsSelectOpen(!isSelectOpen); }} className="nodrag flex min-w-[72px] items-center justify-end gap-1.5 text-right text-xs font-semibold text-openfmv-text transition hover:text-openfmv-accent">{modeLabel(interactionMode)}<ChevronDown size={12} className={`text-openfmv-muted transition ${isSelectOpen ? 'rotate-180' : ''}`} /></button>
                {isSelectOpen && <div className="nodrag nowheel absolute right-0 top-full z-50 mt-1 w-24 overflow-hidden rounded-md border border-white/15 bg-[#252525] py-1 shadow-xl">{(['choice', 'input', 'slider'] as const).map((mode) => <button key={mode} type="button" onClick={(event) => { event.stopPropagation(); setMode(mode); }} className={`block w-full px-3 py-2 text-left text-xs transition ${interactionMode === mode ? 'bg-openfmv-accent/14 text-openfmv-accent' : 'text-openfmv-text hover:bg-white/[0.08] hover:text-openfmv-accent'}`}>{modeLabel(mode)}</button>)}</div>}
              </div>
            </div>
          </div>

          {isSlider ? (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <input type="text" value={localSliderLabel} onChange={(event) => { setLocalSliderLabel(event.target.value); debouncedUpdateSliderLabel(event.target.value); }} placeholder="滑动解锁" className="nodrag w-full rounded-md border border-white/10 bg-white/[0.055] px-3 py-2 text-xs text-openfmv-text outline-none focus:border-white/28" />
              <div className="relative flex h-9 items-center rounded-md border border-white/10 bg-white/[0.055] px-3"><span className="text-xs text-openfmv-muted">滑动成功路径</span><div className="absolute right-[-30px] top-1/2 -translate-y-1/2"><CustomHandle type="source" position={Position.Right} id="slider" className="!border-white/40 !bg-[#2b2b2b]" /></div></div>
            </div>
          ) : (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-openfmv-muted">选项</span><button onClick={addRule} className="rounded-md p-1.5 text-openfmv-muted transition hover:bg-openfmv-accent/10 hover:text-openfmv-accent" title="添加选项"><Plus size={14} /></button></div>
              <div className="flex flex-col gap-2">{rules.filter((rule) => rule.handleId !== 'else').map((rule, index) => <div key={rule.id} className="group/rule relative flex h-9 w-full items-center gap-2"><div className="flex h-full flex-1 items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-2 transition hover:border-white/28"><span className="shrink-0 select-none text-[10px] text-openfmv-muted">#{index + 1}</span><input value={rule.condition || rule.keyword} onChange={(event) => updateRuleCondition(rule.id, event.target.value)} className="nodrag min-w-0 flex-1 bg-transparent text-xs text-openfmv-text outline-none placeholder:text-openfmv-muted" placeholder="选项或条件" onKeyDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} /><button onClick={() => removeRule(rule.id)} className="rounded p-0.5 text-openfmv-muted opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover/rule:opacity-100"><Trash2 size={12} /></button></div><div className="absolute right-[-30px] top-1/2 -translate-y-1/2"><CustomHandle type="source" position={Position.Right} id={rule.handleId} className="!border-white/40 !bg-[#2b2b2b]" /></div></div>)}</div>
            </div>
          )}

          <div className="relative border-t border-dashed border-white/10 pt-3"><div className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.055] px-2 transition hover:border-white/28"><span className="select-none text-[10px] text-openfmv-muted">默认</span><input value={localElseLabel} onChange={(event) => { setLocalElseLabel(event.target.value); debouncedUpdateElseLabel(event.target.value); }} className="nodrag min-w-0 flex-1 bg-transparent text-right text-xs font-medium text-openfmv-sub outline-none placeholder:text-openfmv-muted focus:text-openfmv-text" placeholder="默认路径" /></div><div className="absolute right-[-30px] top-[calc(50%+6px)] -translate-y-1/2"><CustomHandle type="source" position={Position.Right} id="else" className="!border-white/40 !bg-[#2b2b2b]" /></div></div>
        </div>
      </div>
    </div>
  );
};

export default memo(StartNode);
