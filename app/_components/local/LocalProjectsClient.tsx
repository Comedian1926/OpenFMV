'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Clock3, Copy, Download, Edit3, FileJson, FileText, Film, Grid2X2, Image as ImageIcon, Layout, Library, List, MoreHorizontal, PackageOpen, Play, Plus, Search, Settings, Trash2, Upload } from 'lucide-react';
import BorderGlow from '@/app/_components/ui/BorderGlow';
import OpenFMVAiSettingsCenter from '@/app/_components/local/OpenFMVAiSettingsCenter';
import { AppNode, OpenFMVAsset, OpenFMVProject } from '@/app/_types';
import { createAndSaveLocalProject, deleteLocalProject, exportProjectJson, importAssetFromFile, listLocalProjects, openLocalProject, registerLocalProject, saveLocalProject } from '@/app/_utils/localProjects';
import { getLocalizedPath } from '@/app/_utils/localePaths';
import { resolveMediaSrc } from '@/app/_utils/mediaSrc';

const upgradeCards = [
  {
    key: 'nodeStory',
    className: 'from-cyan-300/16 via-white/6 to-[#202020]',
  },
  {
    key: 'interactivePreview',
    className: 'from-fuchsia-300/14 via-white/5 to-[#202020]',
  },
  {
    key: 'assetManagement',
    className: 'from-sky-300/12 via-white/4 to-[#202020]',
  },
  {
    key: 'localExport',
    className: 'from-violet-300/12 via-white/5 to-[#202020]',
  },
];

const sidebarItems = [
  { labelKey: 'workspace', icon: Layout, action: 'home' },
  { labelKey: 'assetLibrary', icon: ImageIcon, action: 'assets' },
] as const;

type WorkspaceView = 'home' | 'assets';
type AssetFilter = 'all' | OpenFMVAsset['type'];

interface ProjectAsset {
  asset: OpenFMVAsset;
  project: OpenFMVProject;
}

const assetFilters: AssetFilter[] = [
  'all',
  'image',
  'video',
  'audio',
  'text',
];

const formatProjectTime = (value: string, locale: string, justNow: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return justNow;
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getProjectStats = (project: OpenFMVProject) => ({
  nodes: project.graphData?.nodes?.length ?? 0,
  edges: project.graphData?.edges?.length ?? 0,
  assets: project.assets?.length ?? 0,
});

const getProjectCover = (project: OpenFMVProject) => {
  if (project.metadata?.coverImage) return project.metadata.coverImage;
  const nodeCover = project.graphData?.nodes
    ?.map((node) => node.data as Record<string, unknown>)
    .map((data) => data.image || data.videoThumbnail)
    .find((value): value is string => typeof value === 'string' && value.length > 0);
  if (nodeCover) return nodeCover;
  return project.assets.find((asset) => asset.type === 'image')?.path || '';
};

const formatAssetTime = (value: string, locale: string, justNow: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return justNow;
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatFileSize = (value: unknown, unknownSize: string) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return unknownSize;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
};

const getAssetIcon = (type: OpenFMVAsset['type']) => {
  if (type === 'image') return ImageIcon;
  if (type === 'video') return Film;
  if (type === 'audio') return Library;
  return FileText;
};

const getTextPreview = (asset: OpenFMVAsset) => {
  const content = asset.metadata?.content;
  if (typeof content !== 'string') return '';
  return content.replace(/\s+/g, ' ').trim().slice(0, 120);
};

const getAssetStudioHref = (locale: string, projectId: string, assetId: string) => getLocalizedPath(locale, `/asset-studio?projectId=${encodeURIComponent(projectId)}&assetId=${encodeURIComponent(assetId)}`);
const getEditorHref = (locale: string, projectId: string) => getLocalizedPath(locale, `/editor?id=${projectId}`);
const getPlayHref = (locale: string, projectId: string) => getLocalizedPath(locale, `/play/${projectId}`);

export default function LocalProjectsClient() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('projects');
  const assetsT = useTranslations('assets');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const assetFileInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<OpenFMVProject[]>([]);
  const [activeView, setActiveView] = useState<WorkspaceView>('home');
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortMode, setSortMode] = useState<'recent' | 'oldest'>('recent');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assetQuery, setAssetQuery] = useState('');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');
  const [isImportingAssets, setIsImportingAssets] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const refreshProjects = () => {
    const nextProjects = listLocalProjects();
    setProjects(nextProjects);
    setSelectedProjectId((current) => current || nextProjects[0]?.id || '');
  };

  useEffect(() => {
    refreshProjects();
  }, []);


  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchedProjects = normalizedQuery
      ? projects.filter((project) => project.title.toLowerCase().includes(normalizedQuery))
      : projects;
    return [...matchedProjects].sort((first, second) => {
      const firstTime = new Date(first.updatedAt).getTime();
      const secondTime = new Date(second.updatedAt).getTime();
      return sortMode === 'recent' ? secondTime - firstTime : firstTime - secondTime;
    });
  }, [projects, query, sortMode]);

  const projectTotal = projects.length;
  const nodeTotal = projects.reduce((total, project) => total + (project.graphData?.nodes?.length ?? 0), 0);
  const assetTotal = projects.reduce((total, project) => total + (project.assets?.length ?? 0), 0);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const assets = useMemo<ProjectAsset[]>(() => {
    return projects.flatMap((project) => (project.assets || []).map((asset) => ({ project, asset })));
  }, [projects]);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = assetQuery.trim().toLowerCase();
    return assets
      .filter(({ asset }) => assetFilter === 'all' || asset.type === assetFilter)
      .filter(({ asset, project }) => {
        if (!normalizedQuery) return true;
        return asset.name.toLowerCase().includes(normalizedQuery) || project.title.toLowerCase().includes(normalizedQuery);
      })
      .sort((first, second) => new Date(second.asset.importedAt).getTime() - new Date(first.asset.importedAt).getTime());
  }, [assetFilter, assetQuery, assets]);

  const handleCreate = async (name?: string) => {
    const projectTitle = (name ?? title).trim() || t('untitledProject');
    const project = await createAndSaveLocalProject(projectTitle);
    setTitle('');
    refreshProjects();
    router.push(getEditorHref(locale, project.id));
  };

  const handleOpenProject = async () => {
    try {
      const project = await openLocalProject();
      if (!project) {
        projectFileInputRef.current?.click();
        return;
      }
      refreshProjects();
      router.push(getEditorHref(locale, project.id));
    } catch (error) {
      console.error('Failed to open local project', error);
      alert(t('openProjectFailed'));
    }
  };

  const handleImportProjectFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      const parsed = JSON.parse(content) as OpenFMVProject;
      if (!parsed?.id || !parsed?.title || !parsed?.graphData) {
        alert(t('invalidProjectFile'));
        return;
      }
      const importedProject = registerLocalProject(parsed);
      refreshProjects();
      router.push(getEditorHref(locale, importedProject.id));
    } catch (error) {
      console.error('Failed to import project file', error);
      alert(t('importProjectFailed'));
    } finally {
      if (projectFileInputRef.current) projectFileInputRef.current.value = '';
    }
  };

  const handleDelete = (projectId: string, projectTitle: string) => {
    if (!window.confirm(t('deleteProjectConfirm', { title: projectTitle }))) return;
    deleteLocalProject(projectId);
    refreshProjects();
  };

  const handleRename = async (project: OpenFMVProject) => {
    const nextTitle = window.prompt(t('renameProjectPrompt'), project.title)?.trim();
    if (!nextTitle || nextTitle === project.title) return;
    await saveLocalProject({ ...project, title: nextTitle });
    refreshProjects();
  };

  const handleDuplicate = async (project: OpenFMVProject) => {
    const timestamp = new Date().toISOString();
    await saveLocalProject({
      ...project,
      id: crypto.randomUUID(),
      title: t('copyTitle', { title: project.title }),
      createdAt: timestamp,
      updatedAt: timestamp,
      graphData: {
        nodes: project.graphData.nodes.map((node) => ({ ...node, data: { ...node.data } as AppNode['data'] })),
        edges: project.graphData.edges.map((edge) => ({ ...edge })),
      },
      assets: project.assets.map((asset) => ({ ...asset, id: crypto.randomUUID() })),
      metadata: { ...project.metadata },
    });
    refreshProjects();
  };

  const handleImportAssets = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedProject) return;
    setIsImportingAssets(true);
    try {
      const importedAssets = await Promise.all(Array.from(files).map((file) => importAssetFromFile(file)));
      const existingKeys = new Set(selectedProject.assets.map((asset) => asset.path || asset.relativePath));
      const nextAssets = importedAssets.filter((asset) => !existingKeys.has(asset.path || asset.relativePath));
      await saveLocalProject({
        ...selectedProject,
        assets: [...selectedProject.assets, ...nextAssets],
      });
      refreshProjects();
    } catch (error) {
      console.error('导入素材失败:', error);
      alert(assetsT('importFailed'));
    } finally {
      setIsImportingAssets(false);
      if (assetFileInputRef.current) assetFileInputRef.current.value = '';
    }
  };

  const handleDeleteAsset = async (project: OpenFMVProject, asset: OpenFMVAsset) => {
    if (!window.confirm(t('deleteAssetConfirm', { projectTitle: project.title, assetName: asset.name }))) return;
    try {
      await saveLocalProject({
        ...project,
        assets: project.assets.filter((item) => item.id !== asset.id),
      });
      refreshProjects();
    } catch (error) {
      console.error('删除素材失败:', error);
      alert(t('deleteAssetFailed'));
    }
  };

  return (
    <main className="relative flex h-full overflow-hidden bg-[#181818] text-openfmv-text">
      <input ref={projectFileInputRef} type="file" accept=".json,.openfmv,.openfmv.json,application/json" className="hidden" onChange={(event) => { void handleImportProjectFile(event.target.files); }} />
      <input ref={assetFileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.txt,.md" className="hidden" onChange={(event) => void handleImportAssets(event.target.files)} />
      <div className="pointer-events-none fixed inset-0 bg-[#181818]" />

      <aside className="relative z-20 flex w-[272px] shrink-0 flex-col bg-[#1b1b1b] px-6 pb-7 pt-9">
        <nav className="space-y-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.action === activeView;
            const className = `flex h-[56px] w-full items-center gap-4 rounded-[10px] px-5 text-left text-base font-semibold transition ${isActive ? 'bg-[radial-gradient(circle_at_0%_50%,rgba(125,211,252,0.16),transparent_42%),rgba(255,255,255,0.07)] text-white' : 'text-white hover:bg-white/[0.045]'}`;
            return (
              <button
                key={item.labelKey}
                type="button"
                onClick={() => {
                  setActiveView(item.action);
                }}
                className={className}
              >
                <Icon size={22} />
                <span>{t(`sidebar.${item.labelKey}`)}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6 lg:px-14">
          <section className="mx-auto max-w-[1330px]">
            {activeView === 'assets' ? (
              <>
                <section className="flex min-h-[180px] items-end justify-between gap-5 rounded-[9px] bg-[radial-gradient(circle_at_20%_105%,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_74%_0%,rgba(255,255,255,0.06),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025)_45%,rgba(0,0,0,0.18))] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.22)]">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-openfmv-muted">
                      <PackageOpen size={15} className="text-white/45" />
                      {assetsT('eyebrow')}
                    </div>
                    <h1 className="mt-3 text-[32px] font-bold text-white">{t('assetLibraryTitle')}</h1>
                    <div className="mt-2 text-sm text-openfmv-muted">{t('assetLibrarySummary', { assets: filteredAssets.length, projects: projectTotal })}</div>
                  </div>
                  <button type="button" onClick={() => assetFileInputRef.current?.click()} disabled={!selectedProject || isImportingAssets} className="inline-flex h-11 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.08] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-45">
                    <Upload size={17} />
                    {isImportingAssets ? assetsT('importing') : assetsT('importAsset')}
                  </button>
                </section>

                <section className="mt-7">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {assetFilters.map((item) => (
                        <button key={item} type="button" onClick={() => setAssetFilter(item)} className={`h-10 rounded-[12px] px-4 text-sm font-semibold transition ${assetFilter === item ? 'bg-white/[0.12] text-white' : 'bg-white/[0.045] text-openfmv-sub hover:bg-white/[0.07] hover:text-white'}`}>
                          {assetsT(`filter.${item}`)}
                        </button>
                      ))}
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <select value={selectedProjectId} onChange={(event) => setSelectedProjectId(event.target.value)} className="h-10 w-[190px] rounded-[12px] border border-white/10 bg-white/[0.055] px-3 text-sm text-white outline-none">
                        {projects.length === 0 ? (
                          <option value="">{assetsT('noProjects')}</option>
                        ) : projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.title}</option>
                        ))}
                      </select>
                      <div className="relative min-w-0 md:w-[360px]">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-openfmv-muted" />
                        <input value={assetQuery} onChange={(event) => setAssetQuery(event.target.value)} placeholder={t('searchAssetsOrProjects')} className="h-10 w-full rounded-[12px] border border-white/10 bg-white/[0.055] pl-10 pr-3 text-sm text-white outline-none placeholder:text-openfmv-muted" />
                      </div>
                    </div>
                  </div>

                  {filteredAssets.length === 0 ? (
                    <div className="mt-6 grid min-h-[360px] place-items-center rounded-[16px] bg-white/[0.035]">
                      <div className="max-w-sm text-center">
                        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[16px] border border-white/12 bg-white/[0.08] text-openfmv-muted">
                          <ImageIcon size={28} />
                        </div>
                        <div className="text-lg font-semibold text-white">{assetsT('noAssetsYet')}</div>
                        <p className="mt-2 text-sm leading-7 text-openfmv-muted">{t('assetEmptyDescription')}</p>
                        <button type="button" onClick={() => assetFileInputRef.current?.click()} disabled={!selectedProject} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.08] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.12] disabled:opacity-45">
                          <Upload size={16} />
                          {assetsT('importAsset')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-5">
                      {filteredAssets.map(({ asset, project }) => {
                        const Icon = getAssetIcon(asset.type);
                        const src = resolveMediaSrc(asset.path);
                        return (
                          <article key={`${project.id}-${asset.id}`} className="group relative min-w-0">
                            <Link href={getAssetStudioHref(locale, project.id, asset.id)} className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.055] transition group-hover:border-white/25">
                              {asset.type === 'image' ? (
                                <img src={src} alt={asset.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                              ) : asset.type === 'video' ? (
                                <video src={src} className="h-full w-full object-cover transition group-hover:scale-105" muted />
                              ) : asset.type === 'text' ? (
                                <div className="h-full w-full p-4">
                                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-[12px] border border-white/10 bg-white/[0.08] text-white/75">
                                    <Icon size={20} />
                                  </div>
                                  <p className="line-clamp-4 text-sm leading-6 text-openfmv-sub">{getTextPreview(asset) || assetsT('noTextPreview')}</p>
                                </div>
                              ) : (
                                <Icon size={30} className="text-white/75" />
                              )}
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleDeleteAsset(project, asset)}
                              className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-black/55 text-white/75 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-xl transition hover:border-red-400/45 hover:bg-red-500/15 hover:text-red-300"
                              title={assetsT('removeAsset')}
                            >
                              <Trash2 size={14} />
                            </button>
                            <div className="mt-3 min-w-0">
                              <Link href={getAssetStudioHref(locale, project.id, asset.id)} className="block truncate text-sm font-semibold text-white transition hover:text-white/80">{asset.name}</Link>
                              <div className="mt-1 flex items-center gap-2 text-xs text-openfmv-muted">
                                <Clock3 size={12} />
                                <span suppressHydrationWarning>{formatAssetTime(asset.importedAt, locale, assetsT('justNow'))}</span>
                                <span>·</span>
                                <span className="truncate">{formatFileSize(asset.metadata?.size, assetsT('unknownSize'))}</span>
                              </div>
                              <Link href={getEditorHref(locale, project.id)} className="mt-1 block truncate text-xs text-openfmv-muted transition hover:text-white">{project.title}</Link>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>) : (
              <>
            <BorderGlow className="w-full" edgeSensitivity={24} glowColor="190 86 72" backgroundColor="#1a1a1a" borderRadius={9} glowRadius={34} glowIntensity={0.55} coneSpread={20} colors={['#67e8f9', '#f0abfc', '#93c5fd']} fillOpacity={0.18}>
              <button onClick={() => void handleCreate()} className="group relative flex h-[180px] w-full items-center justify-center overflow-hidden rounded-[9px] bg-[radial-gradient(circle_at_18%_108%,rgba(217,70,239,0.24),transparent_34%),radial-gradient(circle_at_70%_-8%,rgba(20,184,166,0.38),transparent_46%),linear-gradient(135deg,rgba(148,163,184,0.12),rgba(255,255,255,0.03)_46%,rgba(0,0,0,0.20))] text-white transition">
                <span className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0" />
                <span className="relative flex items-center gap-4 text-[28px] font-semibold">
                  <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-white/85 text-[#1b1b1b] shadow-[0_0_22px_rgba(103,232,249,0.22),0_8px_24px_rgba(0,0,0,0.22)]">
                    <Plus size={22} />
                  </span>
                  {t('startCreating')}
                </span>
              </button>
            </BorderGlow>

            <section className="mt-12">
              <h2 className="text-[26px] font-bold text-white">{t('featuresTitle')}</h2>
              <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-5">
                {upgradeCards.map((card) => (
                  <BorderGlow key={card.key} className="h-[150px] overflow-hidden" edgeSensitivity={24} glowColor="190 82 74" backgroundColor="#1b1b1b" borderRadius={9} glowRadius={24} glowIntensity={0.42} coneSpread={20} colors={['#67e8f9', '#f0abfc', '#93c5fd']} fillOpacity={0.12}>
                    <div className={`relative h-full overflow-hidden rounded-[9px] bg-gradient-to-br ${card.className}`}>
                      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,0.32)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.20)_1px,transparent_1px)] [background-size:24px_24px]" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#202020]/95 to-transparent p-5">
                        <div className="text-xl font-semibold text-white">{t(`features.${card.key}.title`)}</div>
                        <div className="mt-1 text-base text-white/55">{t(`features.${card.key}.description`)}</div>
                      </div>
                    </div>
                  </BorderGlow>
                ))}
              </div>
            </section>

            <section className="mt-12 scroll-mt-8">
              <div className="mb-7 flex items-center justify-between gap-5">
                <div>
                  <h2 className="text-[26px] font-bold text-white">{t('localDrafts')}</h2>
                  <div className="mt-1 text-sm text-openfmv-muted">{t('draftSummary', { projects: filteredProjects.length, nodes: nodeTotal, assets: assetTotal })}</div>
                </div>
                {projects.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="hidden overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.06] lg:flex">
                      <input value={title} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void handleCreate(); }} placeholder={t('projectName')} className="h-10 w-52 bg-transparent px-4 text-sm text-white outline-none placeholder:text-openfmv-muted" />
                      <button onClick={() => void handleCreate()} className="px-4 text-sm font-semibold text-white transition hover:bg-white/[0.08]">{t('create')}</button>
                    </div>
                    <div className="hidden items-center gap-1 rounded-[12px] border border-white/10 bg-white/[0.05] p-1 xl:flex">
                      <button onClick={() => searchInputRef.current?.focus()} className="flex h-8 w-8 items-center justify-center rounded-[10px] text-openfmv-muted transition hover:bg-white/[0.08] hover:text-white" title={t('search')}>
                        <Search size={16} />
                      </button>
                      <button onClick={() => setViewMode('grid')} className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition ${viewMode === 'grid' ? 'bg-white/[0.12] text-white' : 'text-openfmv-muted hover:bg-white/[0.08] hover:text-white'}`} title={assetsT('gridView')}>
                        <Grid2X2 size={16} />
                      </button>
                      <button onClick={() => setViewMode('list')} className={`flex h-8 w-8 items-center justify-center rounded-[10px] transition ${viewMode === 'list' ? 'bg-white/[0.12] text-white' : 'text-openfmv-muted hover:bg-white/[0.08] hover:text-white'}`} title={assetsT('listView')}>
                        <List size={16} />
                      </button>
                      <button onClick={() => setSortMode(sortMode === 'recent' ? 'oldest' : 'recent')} className="flex h-8 w-8 items-center justify-center rounded-[10px] text-openfmv-muted transition hover:bg-white/[0.08] hover:text-white" title={sortMode === 'recent' ? t('recentFirst') : t('oldestFirst')}>
                        <Clock3 size={16} />
                      </button>
                    </div>
                    <button onClick={() => void handleOpenProject()} className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-openfmv-sub transition hover:border-white/25 hover:text-white">
                      <FileJson size={15} />
                      {t('importProject')}
                    </button>
                    <button onClick={() => setShowSettings(true)} className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.06] text-openfmv-sub transition hover:border-white/25 hover:text-white" title={t('settings')}>
                      <Settings size={16} />
                    </button>
                    <button className="hidden h-10 w-10 items-center justify-center rounded-[12px] text-openfmv-sub transition hover:bg-white/[0.06] hover:text-white md:inline-flex" title={t('more')}>
                      <MoreHorizontal size={19} />
                    </button>
                  </div>
                )}
              </div>

              {filteredProjects.length === 0 ? (
                <div className="grid min-h-[280px] place-items-center rounded-[18px] bg-white/[0.035] px-6 py-10 backdrop-blur-3xl">
                  <div className="max-w-xl text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/12 bg-white/[0.08] text-openfmv-muted">
                      <Layout size={32} />
                    </div>
                    <div className="text-xl font-semibold text-white">{t('noDrafts')}</div>
                    <p className="mt-3 text-sm leading-7 text-openfmv-muted">{t('noDraftsDescription')}</p>
                    <div className="mt-6 flex justify-center gap-3">
                      <button onClick={() => void handleCreate()} className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.08] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.12]">
                        <Plus size={16} />
                        {t('newStory')}
                      </button>
                      <button onClick={() => void handleOpenProject()} className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.06] px-5 text-sm font-semibold text-openfmv-sub transition hover:border-white/25 hover:text-white">
                        <FileJson size={15} />
                        {t('importProject')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-6">
                  {filteredProjects.map((project) => {
                    const stats = getProjectStats(project);
                    const cover = getProjectCover(project);
                    return (
                      <article key={project.id} className="group relative min-w-0">
                        <Link href={getEditorHref(locale, project.id)} className="block">
                          <BorderGlow className="aspect-square overflow-hidden transition group-hover:-translate-y-1" edgeSensitivity={24} glowColor="198 80 76" backgroundColor="#1f1f1f" borderRadius={14} glowRadius={22} glowIntensity={0.34} coneSpread={20} colors={['#67e8f9', '#a5b4fc', '#f0abfc']} fillOpacity={0.1}>
                            <div className="relative h-full overflow-hidden rounded-[14px] bg-[radial-gradient(circle_at_30%_16%,rgba(125,211,252,0.10),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))]">
                              {cover ? (
                                <img src={cover} alt={project.title} className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:scale-105" />
                              ) : (
                                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:22px_22px]" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/12 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                <div className="truncate text-sm font-semibold text-white">{project.title}</div>
                              </div>
                            </div>
                          </BorderGlow>
                        </Link>
                        <Link href={getPlayHref(locale, project.id)} className="absolute left-1/2 top-[90px] z-20 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white opacity-0 shadow-[0_16px_42px_rgba(0,0,0,0.36)] backdrop-blur-3xl transition hover:scale-105 hover:bg-white/15 group-hover:opacity-100" title={t('preview')}>
                          <Play size={22} fill="currentColor" className="ml-0.5" />
                        </Link>
                        <div className="absolute left-7 right-7 top-1 z-20 flex items-center justify-between opacity-0 transition group-hover:opacity-100">
                          <button onClick={() => void handleRename(project)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-openfmv-sub backdrop-blur-3xl hover:text-white" title={t('rename')}>
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => void handleDuplicate(project)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-openfmv-sub backdrop-blur-3xl hover:text-white" title={t('duplicate')}>
                            <Copy size={14} />
                          </button>
                          <button onClick={() => exportProjectJson(project)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-openfmv-sub backdrop-blur-3xl hover:text-white" title={t('exportBackup')}>
                            <Download size={14} />
                          </button>
                          <button onClick={() => handleDelete(project.id, project.title)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-openfmv-sub backdrop-blur-3xl hover:text-red-300" title={t('deleteProject')}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-3 min-w-0">
                          <div className="truncate text-base font-semibold text-white">{project.title}</div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-openfmv-muted">
                            <Clock3 size={12} />
                            <span suppressHydrationWarning>{formatProjectTime(project.updatedAt, locale, assetsT('justNow'))}</span>
                          </div>
                          <div className="mt-1 truncate text-xs text-openfmv-muted">{t('projectCardStats', { nodes: stats.nodes, assets: stats.assets })}</div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[22px] bg-white/[0.045] backdrop-blur-3xl">
                  {filteredProjects.map((project) => {
                    const stats = getProjectStats(project);
                    const cover = getProjectCover(project);
                    return (
                      <article key={project.id} className="group flex items-center gap-4 p-4">
                        <Link href={getEditorHref(locale, project.id)} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] border border-white/10 bg-[radial-gradient(circle_at_30%_16%,rgba(255,255,255,0.11),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035))] text-white/75 transition group-hover:border-white/25">
                          {cover ? <img src={cover} alt={project.title} className="h-full w-full rounded-[18px] object-cover" /> : <Layout size={24} />}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={getEditorHref(locale, project.id)} className="truncate text-base font-semibold text-white transition hover:text-white/80">{project.title}</Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-openfmv-muted">
                            <span suppressHydrationWarning>{formatProjectTime(project.updatedAt, locale, assetsT('justNow'))}</span>
                            <span>{t('nodesCount', { count: stats.nodes })}</span>
                            <span>{t('edgesCount', { count: stats.edges })}</span>
                            <span>{t('assetsCount', { count: stats.assets })}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Link href={getPlayHref(locale, project.id)} className="inline-flex h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-openfmv-sub transition hover:border-white/25 hover:text-white">
                            <Play size={14} />
                            {t('preview')}
                          </Link>
                          <button onClick={() => void handleRename(project)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-openfmv-sub transition hover:border-white/25 hover:text-white" title={t('rename')}>
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => void handleDuplicate(project)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-openfmv-sub transition hover:border-white/25 hover:text-white" title={t('duplicate')}>
                            <Copy size={14} />
                          </button>
                          <button onClick={() => exportProjectJson(project)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-openfmv-sub transition hover:border-white/25 hover:text-white" title={t('exportBackup')}>
                            <Download size={14} />
                          </button>
                          <button onClick={() => handleDelete(project.id, project.title)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-openfmv-sub transition hover:border-red-400/45 hover:text-red-300" title={t('deleteProject')}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
              </>
            )}

            <div className="h-12" />
          </section>
        </div>
      </section>
      {showSettings && <OpenFMVAiSettingsCenter onClose={() => setShowSettings(false)} />}
    </main>
  );
}
