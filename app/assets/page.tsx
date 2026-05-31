'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Clock3, Edit3, FileText, Film, Grid2X2, Image as ImageIcon, Library, List, PackageOpen, Plus, Search, Trash2, Upload } from 'lucide-react';

import { DeleteAssetModal } from '@/app/_components/modals/DeleteAssetModal';
import { RenameAssetModal } from '@/app/_components/modals/RenameAssetModal';
import { Button } from '@/app/_components/ui/button';
import { Input } from '@/app/_components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/_components/ui/select';
import { OpenFMVAsset, OpenFMVProject } from '@/app/_types';
import { importAssetFromFile, listLocalProjects, saveLocalProject } from '@/app/_utils/localProjects';
import { getLocalizedPath } from '@/app/_utils/localePaths';
import { resolveMediaSrc } from '@/app/_utils/mediaSrc';

type AssetFilter = 'all' | OpenFMVAsset['type'];
type AssetView = 'grid' | 'list';

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

export default function AssetsPage() {
  const locale = useLocale();
  const t = useTranslations('assets');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projects, setProjects] = useState<OpenFMVProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [viewMode, setViewMode] = useState<AssetView>('grid');
  const [isImporting, setIsImporting] = useState(false);
  const [assetToRename, setAssetToRename] = useState<ProjectAsset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<ProjectAsset | null>(null);

  const refreshProjects = () => {
    const nextProjects = listLocalProjects();
    setProjects(nextProjects);
    setSelectedProjectId((current) => current || nextProjects[0]?.id || '');
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const assets = useMemo<ProjectAsset[]>(() => {
    return projects.flatMap((project) => (project.assets || []).map((asset) => ({ project, asset })));
  }, [projects]);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return assets
      .filter(({ asset }) => filter === 'all' || asset.type === filter)
      .filter(({ asset, project }) => {
        if (!normalizedQuery) return true;
        return asset.name.toLowerCase().includes(normalizedQuery) || project.title.toLowerCase().includes(normalizedQuery);
      })
      .sort((first, second) => new Date(second.asset.importedAt).getTime() - new Date(first.asset.importedAt).getTime());
  }, [assets, filter, query]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;

  const handleImportFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedProject) return;
    setIsImporting(true);
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
      alert(t('importFailed'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;
    const { project, asset } = assetToDelete;
    await saveLocalProject({
      ...project,
      assets: project.assets.filter((item) => item.id !== asset.id),
    });
    setAssetToDelete(null);
    refreshProjects();
  };

  const handleRenameAsset = async (name: string) => {
    if (!assetToRename) return;
    const { project, asset } = assetToRename;
    const nextName = name.trim();
    if (!nextName || nextName === asset.name) return;
    await saveLocalProject({
      ...project,
      assets: project.assets.map((item) => (item.id === asset.id ? { ...item, name: nextName } : item)),
    });
    setAssetToRename(null);
    refreshProjects();
  };

  return (
    <main className="relative h-full overflow-hidden bg-[#181818] text-openfmv-text">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(135deg,#202020_0%,#181818_58%,#111111_100%)]" />
      <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,audio/*,.txt,.md" className="hidden" onChange={(event) => void handleImportFiles(event.target.files)} />

      <section className="relative z-10 flex h-full">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#1b1b1b]/88 px-5 py-3 backdrop-blur-3xl lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-openfmv-muted">
                  <PackageOpen size={15} className="text-openfmv-accent" />
                  {t('eyebrow')}
                </div>
                <h1 className="mt-1 truncate text-xl font-semibold text-white">{t('title')}</h1>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 md:w-auto">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="h-10 w-[180px] rounded-[12px] border-white/10 bg-white/[0.065] text-sm text-white focus:ring-orange-400/20">
                  <SelectValue placeholder={t('noProjects')} />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#242424] text-openfmv-text">
                  {projects.length === 0 ? (
                    <SelectItem value="none" disabled>{t('noProjects')}</SelectItem>
                  ) : projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative min-w-0 flex-1 md:w-[360px]">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-openfmv-muted" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('search')} className="h-10 rounded-[12px] border-white/10 bg-white/[0.065] pl-10 text-sm text-white placeholder:text-openfmv-muted focus-visible:ring-orange-400/20" />
              </div>
              <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={!selectedProject || isImporting} className="h-10 shrink-0 rounded-[12px] bg-openfmv-accent px-4 text-sm font-semibold text-white hover:bg-openfmv-accent-hover">
                <Upload size={16} />
                {isImporting ? t('importing') : t('import')}
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {assetFilters.map((item) => (
                  <Button key={item} type="button" onClick={() => setFilter(item)} variant={filter === item ? 'default' : 'glass'} size="sm" className={`rounded-[12px] ${filter === item ? 'bg-orange-400/18 text-orange-100 hover:bg-orange-400/24' : ''}`}>
                    {t(`filter.${item}`)}
                  </Button>
                ))}
              </div>
              <div className="hidden min-w-0 text-sm text-openfmv-muted lg:block">
                {t('resultSummary', { count: filteredAssets.length })}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button type="button" onClick={() => setViewMode('grid')} variant="icon" size="compactIcon" className={`rounded-[12px] ${viewMode === 'grid' ? 'bg-orange-400/18 text-orange-100' : 'bg-white/[0.06] text-openfmv-muted'}`} title={t('gridView')}>
                  <Grid2X2 size={16} />
                </Button>
                <Button type="button" onClick={() => setViewMode('list')} variant="icon" size="compactIcon" className={`rounded-[12px] ${viewMode === 'list' ? 'bg-orange-400/18 text-orange-100' : 'bg-white/[0.06] text-openfmv-muted'}`} title={t('listView')}>
                  <List size={16} />
                </Button>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="grid min-h-[430px] place-items-center rounded-[16px] border border-dashed border-white/12 bg-white/[0.04]">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] border border-white/12 bg-white/[0.08] text-openfmv-muted">
                    <Plus size={28} />
                  </div>
                  <div className="text-lg font-semibold text-white">{t('createProjectFirst')}</div>
                  <p className="mt-2 text-sm leading-7 text-openfmv-muted">{t('createProjectFirstDescription')}</p>
                  <Button asChild className="mt-5 rounded-[12px] bg-openfmv-accent text-white hover:bg-openfmv-accent-hover">
                    <Link href={getLocalizedPath(locale, '/projects')}>{t('backToProjects')}</Link>
                  </Button>
                </div>
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="grid min-h-[430px] place-items-center rounded-[16px] border border-dashed border-white/12 bg-white/[0.04]">
                <div className="max-w-sm text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] border border-white/12 bg-white/[0.08] text-openfmv-muted">
                    <Upload size={28} />
                  </div>
                  <div className="text-lg font-semibold text-white">{t('noMatchingAssets')}</div>
                  <p className="mt-2 text-sm leading-7 text-openfmv-muted">{t('noMatchingAssetsDescription')}</p>
                  <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={!selectedProject} className="mt-5 rounded-[12px] bg-openfmv-accent text-white hover:bg-openfmv-accent-hover">
                    <Upload size={16} />
                    {t('importAsset')}
                  </Button>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredAssets.map(({ asset, project }) => {
                  const Icon = getAssetIcon(asset.type);
                  const src = resolveMediaSrc(asset.path);
                  return (
                    <article key={`${project.id}-${asset.id}`} className="group min-w-0">
                      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.055] transition group-hover:border-orange-300/45">
                        {asset.type === 'image' ? (
                          <img src={src} alt={asset.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                        ) : asset.type === 'video' ? (
                          <video src={src} className="h-full w-full object-cover transition group-hover:scale-105" muted />
                        ) : asset.type === 'audio' ? (
                          <div className="flex w-full flex-col items-center gap-3 px-4">
                            <Icon size={30} className="text-orange-100" />
                            <audio src={src} controls className="w-full max-w-[220px]" />
                          </div>
                        ) : asset.type === 'text' ? (
                          <div className="h-full w-full p-4">
                            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.08] text-orange-100">
                              <Icon size={20} />
                            </div>
                            <p className="line-clamp-4 text-sm leading-6 text-openfmv-sub">{getTextPreview(asset) || t('noTextPreview')}</p>
                          </div>
                        ) : (
                          <Icon size={30} className="text-orange-100" />
                        )}
                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                          <Button type="button" onClick={() => setAssetToRename({ project, asset })} variant="icon" size="compactIcon" className="rounded-[10px] bg-black/45 text-white backdrop-blur-xl hover:bg-white/18" title={t('renameAsset')}>
                            <Edit3 size={14} />
                          </Button>
                          <Button type="button" onClick={() => setAssetToDelete({ project, asset })} variant="icon" size="compactIcon" className="rounded-[10px] bg-black/45 text-white backdrop-blur-xl hover:text-red-300" title={t('removeAsset')}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{asset.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-openfmv-muted">
                          <Clock3 size={12} />
                          <span suppressHydrationWarning>{formatAssetTime(asset.importedAt, locale, t('justNow'))}</span>
                          <span>·</span>
                          <span className="truncate">{formatFileSize(asset.metadata?.size, t('unknownSize'))}</span>
                        </div>
                        <Link href={getAssetStudioHref(locale, project.id, asset.id)} className="mt-1 block truncate text-xs text-openfmv-muted transition hover:text-orange-100">{project.title}</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[14px] border border-white/10 bg-white/[0.04]">
                {filteredAssets.map(({ asset, project }) => {
                  const Icon = getAssetIcon(asset.type);
                  const src = resolveMediaSrc(asset.path);
                  return (
                    <article key={`${project.id}-${asset.id}`} className="flex items-center gap-4 border-b border-white/8 p-3 last:border-b-0">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.06] text-orange-100">
                        {asset.type === 'image' ? <img src={src} alt={asset.name} className="h-full w-full object-cover" /> : <Icon size={22} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-white">{asset.name}</div>
                        {asset.type === 'text' && (
                          <div className="mt-1 truncate text-xs text-openfmv-sub">{getTextPreview(asset) || t('noTextPreview')}</div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-openfmv-muted">
                          <span>{t(`type.${asset.type}`)}</span>
                          <span>{project.title}</span>
                          <span>{formatFileSize(asset.metadata?.size, t('unknownSize'))}</span>
                          <span suppressHydrationWarning>{formatAssetTime(asset.importedAt, locale, t('justNow'))}</span>
                        </div>
                      </div>
                      <Button asChild variant="glass" size="sm" className="hidden rounded-[12px] sm:inline-flex">
                        <Link href={getAssetStudioHref(locale, project.id, asset.id)}>{t('openCanvas')}</Link>
                      </Button>
                      <Button type="button" onClick={() => setAssetToRename({ project, asset })} variant="glass" size="compactIcon" className="rounded-[12px]" title={t('renameAsset')}>
                        <Edit3 size={14} />
                      </Button>
                      <Button type="button" onClick={() => setAssetToDelete({ project, asset })} variant="glass" size="compactIcon" className="rounded-[12px] hover:border-red-400/45 hover:text-red-300" title={t('removeAsset')}>
                        <Trash2 size={14} />
                      </Button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </section>

      <RenameAssetModal
        isOpen={Boolean(assetToRename)}
        onClose={() => setAssetToRename(null)}
        onConfirm={handleRenameAsset}
        currentName={assetToRename?.asset.name || ''}
      />
      <DeleteAssetModal
        isOpen={Boolean(assetToDelete)}
        onClose={() => setAssetToDelete(null)}
        onConfirm={handleDeleteAsset}
      />
    </main>
  );
}
