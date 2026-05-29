'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Clock3, Download, Loader2, Play, Settings } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEditorStore } from '@/app/_store/useEditorStore';
import { usePlayerStore } from '@/app/_store/usePlayerStore';
import { useRuntimeGraphStore } from '@/app/_store/useRuntimeGraphStore';
import { ensureGraphData, getLocalProject, saveLocalProject } from '@/app/_utils/localProjects';
import { createProjectSnapshot } from '@/app/_utils/projectPersistence';
import { OpenFMVProject } from '@/app/_types';
import { Header } from '../ui/Header';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useClickOutside } from '@/app/_hooks/useClickOutside';

export default function TopBar() {
  const { nodes, edges, setNodes, setEdges, autoSaveEnabled, setAutoSaveEnabled, edgeCurveStyle, setEdgeCurveStyle, setCurrentProjectId } = useEditorStore();
  const { setIsPlaying, setCurrentNode, reset } = usePlayerStore();
  const { setGraph } = useRuntimeGraphStore();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('id');
  const initialTitleFromQuery = searchParams.get('title')?.trim();
  const [project, setProject] = useState<OpenFMVProject | null>(null);
  const [title, setTitle] = useState(initialTitleFromQuery || '未命名项目');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const isFirstGraphChange = useRef(true);
  const settingsRef = useRef<HTMLDivElement>(null);
  const exportStatusTimerRef = useRef<number | null>(null);

  useClickOutside(settingsRef as React.RefObject<HTMLElement>, () => {
    if (isSettingsOpen) setIsSettingsOpen(false);
  });

  useEffect(() => {
    return () => {
      if (exportStatusTimerRef.current) window.clearTimeout(exportStatusTimerRef.current);
    };
  }, []);

  const saveStatus = !autoSaveEnabled
    ? { label: '自动保存暂停', icon: Clock3, className: 'text-openfmv-muted', spin: false }
    : isSaving
    ? { label: '保存中', icon: Loader2, className: 'text-sky-200', spin: true }
    : hasUnsavedChanges
      ? { label: '自动保存中', icon: Clock3, className: 'text-orange-200', spin: false }
      : { label: '已自动保存', icon: Check, className: 'text-emerald-200', spin: false };
  const SaveStatusIcon = saveStatus.icon;

  useEffect(() => {
    const loadedProject = getLocalProject(projectId);
    if (!loadedProject) {
      setCurrentProjectId(projectId);
      return;
    }

    setProject(loadedProject);
    setTitle(loadedProject.title);
    const graphData = ensureGraphData(loadedProject.graphData);
    setNodes(graphData.nodes);
    setEdges(graphData.edges);
    setCurrentProjectId(loadedProject.id);
    setLastSaved(new Date(loadedProject.updatedAt));
    isFirstGraphChange.current = true;
  }, [projectId, setCurrentProjectId, setEdges, setNodes]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const latestProject = project?.id ? getLocalProject(project.id) : null;
      const nextProject = createProjectSnapshot(project, title, nodes, edges, latestProject?.assets);
      const savedProject = await saveLocalProject(nextProject);
      setProject(savedProject);
      setCurrentProjectId(savedProject.id);
      setLastSaved(new Date(savedProject.updatedAt));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save local project', error);
      alert('保存本地项目失败');
    } finally {
      setIsSaving(false);
    }
  }, [edges, nodes, project, setCurrentProjectId, title]);

  const handleSaveAs = useCallback(async () => {
    if (!window.openfmv?.selectDirectory) {
      await handleSave();
      return;
    }

    const projectDirectory = await window.openfmv.selectDirectory();
    if (!projectDirectory) return;

    setIsSaving(true);
    try {
      const latestProject = project?.id ? getLocalProject(project.id) : null;
      const nextProject = createProjectSnapshot(project, title, nodes, edges, latestProject?.assets);
      const savedProject = await saveLocalProject({
        ...nextProject,
        metadata: {
          ...nextProject.metadata,
          projectDirectory,
        },
      });
      setProject(savedProject);
      setCurrentProjectId(savedProject.id);
      setLastSaved(new Date(savedProject.updatedAt));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save local project as', error);
      alert('另存本地项目失败');
    } finally {
      setIsSaving(false);
    }
  }, [edges, handleSave, nodes, project, setCurrentProjectId, title]);

  useEffect(() => {
    if (isFirstGraphChange.current) {
      isFirstGraphChange.current = false;
      return;
    }
    setHasUnsavedChanges(true);
    if (!autoSaveEnabled) return;
    const timer = window.setTimeout(() => {
      void handleSave();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [autoSaveEnabled, edges, handleSave, nodes, title]);

  const handlePlay = () => {
    const startNode = nodes.find((node) => node.type === 'start') ?? nodes[0];
    if (!startNode) return;
    setGraph({ nodes, edges }, startNode.id);
    reset();
    setCurrentNode(startNode.id);
    setIsPlaying(true);
  };

  const showExportStatus = (message: string) => {
    if (exportStatusTimerRef.current) window.clearTimeout(exportStatusTimerRef.current);
    setExportStatus(message);
    exportStatusTimerRef.current = window.setTimeout(() => {
      setExportStatus('');
      exportStatusTimerRef.current = null;
    }, 3600);
  };

  const handleExport = async () => {
    if (!window.openfmv?.exportGame || !window.openfmv?.selectDirectory) {
      showExportStatus('导出 EXE 需要在 OpenFMV 桌面端中使用');
      alert('导出 EXE 需要在 OpenFMV 桌面端中使用。Web 调试页不能打包可执行文件。');
      return;
    }

    const latestProject = project?.id ? getLocalProject(project.id) : null;
    const nextProject = createProjectSnapshot(project, title, nodes, edges, latestProject?.assets);
    showExportStatus('正在导出...');
    setIsExporting(true);
    try {
      const savedProject = await saveLocalProject(nextProject);
      setProject(savedProject);
      const outputDirectory = await window.openfmv.selectDirectory();
      if (!outputDirectory) return;
      await window.openfmv.exportGame(savedProject, {
        gameTitle: savedProject.title,
        outputDirectory,
        entryNodeId: savedProject.metadata.entryNodeId,
        windowMode: 'windowed',
        resolution: { width: 1280, height: 720 },
        includeDebugOverlay: false,
      });
      showExportStatus('游戏导出完成');
      alert('游戏导出完成');
    } catch (error) {
      console.error('Failed to export game', error);
      alert('导出游戏失败');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Header position="absolute" className="h-14 border-transparent bg-transparent px-4 shadow-none">
      <div className="pointer-events-auto flex min-w-0 items-center gap-3">
        <div className="flex h-9 min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/32 px-2.5 pr-4 shadow-[0_10px_34px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
          <div className="h-6 w-6 shrink-0 rounded-full bg-[radial-gradient(circle_at_30%_24%,#fff7ad,transparent_31%),radial-gradient(circle_at_66%_25%,#7dd3fc,transparent_34%),radial-gradient(circle_at_42%_70%,#c084fc,transparent_38%),linear-gradient(135deg,#f97316,#14b8a6)] shadow-[0_0_16px_rgba(125,211,252,0.18)]" />
          <Input type="text" value={title} onChange={(event) => setTitle(event.target.value)} className="h-auto w-36 min-w-0 border-0 bg-transparent px-0 py-0 text-sm font-semibold tracking-normal text-white shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:w-64" />
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 md:gap-2">
        <div className="hidden h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.09] px-3 text-xs text-openfmv-sub shadow-[0_10px_34px_rgba(0,0,0,0.26)] backdrop-blur-2xl md:flex" title={lastSaved ? `最近保存：${lastSaved.toLocaleTimeString()}` : '自动保存已开启'} suppressHydrationWarning>
          <SaveStatusIcon size={12} className={`${saveStatus.className} ${saveStatus.spin ? 'animate-spin' : ''}`} />
          <span className={saveStatus.className}>{saveStatus.label}</span>
        </div>

        <div className="relative" ref={settingsRef}>
          <Button onClick={() => setIsSettingsOpen((value) => !value)} variant="icon" size="icon" className={`h-9 w-9 rounded-full border border-white/10 bg-white/[0.09] shadow-[0_10px_34px_rgba(0,0,0,0.26)] backdrop-blur-2xl ${isSettingsOpen ? 'text-openfmv-accent' : 'text-openfmv-sub'}`} title="设置">
            <Settings size={16} />
          </Button>

          {isSettingsOpen && (
            <div className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-[22px] border border-white/15 bg-white/[0.10] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-3xl">
              <div className="rounded-2xl px-3 py-2">
                <div className="text-sm text-openfmv-text">自动保存</div>
                <div className="mt-1 text-xs leading-5 text-openfmv-muted">{autoSaveEnabled ? '已开启，编辑后会自动保存。' : '已暂停，建议重新开启。'}</div>
              </div>
              <Button onClick={() => setAutoSaveEnabled(!autoSaveEnabled)} variant="ghost" className="w-full justify-start rounded-2xl px-3 py-2 text-sm text-openfmv-text hover:bg-white/[0.045]">
                {autoSaveEnabled ? '暂停自动保存' : '开启自动保存'}
              </Button>
              <Button onClick={() => { setIsSettingsOpen(false); void handleSaveAs(); }} variant="ghost" className="mt-1 w-full justify-start rounded-2xl px-3 py-2 text-sm text-openfmv-text hover:bg-white/[0.045]">
                另存到指定目录
              </Button>
              <div className="mt-1 rounded-2xl px-3 py-2 hover:bg-white/[0.045]">
                <div className="mb-2 text-sm text-openfmv-text">连线样式</div>
                <Select value={edgeCurveStyle} onValueChange={(value) => setEdgeCurveStyle(value as 'smoothstep' | 'bezier' | 'straight')}>
                  <SelectTrigger className="nodrag h-9 rounded-2xl border-white/15 bg-white/[0.08] text-xs text-openfmv-text">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/15 bg-openfmv-node text-openfmv-text">
                    <SelectItem value="smoothstep">平滑折线</SelectItem>
                    <SelectItem value="bezier">贝塞尔曲线</SelectItem>
                    <SelectItem value="straight">直线</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Button onClick={handlePlay} size="pill" className="h-9 bg-white/[0.12] px-3.5 text-sm text-white shadow-[0_10px_34px_rgba(0,0,0,0.26)] backdrop-blur-2xl hover:bg-white/[0.18]">
          <Play size={14} fill="currentColor" />
          预览
        </Button>

        <Button onClick={() => void handleExport()} disabled={isExporting} variant="outline" size="pill" className="h-9 border-white/10 bg-white/[0.09] px-3.5 text-sm text-openfmv-sub shadow-[0_10px_34px_rgba(0,0,0,0.26)] backdrop-blur-2xl hover:border-white/20 hover:bg-white/[0.14] hover:text-white">
          {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          <span className="hidden sm:inline">导出</span>
        </Button>
        {exportStatus && (
          <div className="absolute right-4 top-[58px] z-50 max-w-[360px] truncate rounded-[12px] border border-emerald-300/20 bg-black/72 px-3 py-2 text-xs font-medium text-emerald-100 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-2xl" title={exportStatus}>
            {exportStatus}
          </div>
        )}
      </div>
    </Header>
  );
}


