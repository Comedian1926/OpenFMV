'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Bot, CheckCircle2, ChevronDown, Globe2, Loader2, RefreshCw, Settings2, X, XCircle } from 'lucide-react';

import {
  OpenFMVAgentId,
  OpenFMVAgentInfo,
  OpenFMVAiConfig,
  OpenFMVCliSelection,
  OpenFMVConnectionTestResult,
} from '@/app/_types';
import {
  detectOpenFMVAiAgents,
  getDefaultOpenFMVAiConfig,
  getOpenFMVAiConfig,
  saveOpenFMVAiConfig,
  testOpenFMVAiAgent,
} from '@/app/_utils/aiSettings';
import { getLocalizedPath, stripLocaleFromPath } from '@/app/_utils/localePaths';
import { routing } from '@/i18n/routing';
import AgentIcon from './AgentIcon';

interface OpenFMVAiSettingsCenterProps {
  onClose: () => void;
}

const getResultClassName = (result?: OpenFMVConnectionTestResult) => {
  if (!result) return 'text-openfmv-muted';
  return result.ok ? 'text-emerald-300' : 'text-red-300';
};

export default function OpenFMVAiSettingsCenter({ onClose }: OpenFMVAiSettingsCenterProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('settings');
  const localeT = useTranslations('locale');
  const [config, setConfig] = useState<OpenFMVAiConfig>(() => getDefaultOpenFMVAiConfig());
  const [agents, setAgents] = useState<OpenFMVAgentInfo[]>([]);
  const [configuringAgentId, setConfiguringAgentId] = useState<OpenFMVAgentId | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [savingState, setSavingState] = useState<'' | 'saving' | 'saved' | 'saveFailed'>('');
  const [testingId, setTestingId] = useState('');
  const [testResults, setTestResults] = useState<Record<string, OpenFMVConnectionTestResult>>({});
  const [isLocaleMenuOpen, setIsLocaleMenuOpen] = useState(false);

  const availableAgents = agents.filter((agent) => agent.available);
  const missingAgents = agents.filter((agent) => !agent.available);
  const selectionByAgentId = useMemo(() => new Map(config.cliSelections.map((selection) => [selection.agentId, selection])), [config.cliSelections]);
  const currentLocaleLabel = localeT(locale);

  const scanAgents = async () => {
    setIsScanning(true);
    try {
      setAgents(await detectOpenFMVAiAgents());
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [loadedConfig, detectedAgents] = await Promise.all([getOpenFMVAiConfig(), detectOpenFMVAiAgents()]);
        if (!mounted) return;
        setConfig(loadedConfig);
        setAgents(detectedAgents);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = async (nextConfig: OpenFMVAiConfig) => {
    setConfig(nextConfig);
    setSavingState('saving');
    try {
      setConfig(await saveOpenFMVAiConfig(nextConfig));
      setSavingState('saved');
      window.setTimeout(() => setSavingState(''), 1200);
    } catch (error) {
      console.error('保存 AI 设置失败:', error);
      setSavingState('saveFailed');
    }
  };

  const changeLocale = (nextLocale: string) => {
    setIsLocaleMenuOpen(false);
    const nextPath = getLocalizedPath(nextLocale, stripLocaleFromPath(pathname || '/projects'));
    const query = searchParams.toString();
    window.localStorage.setItem('openfmv.locale', nextLocale);
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.replace(query ? `${nextPath}?${query}` : nextPath);
    router.refresh();
  };

  const updateCliSelection = (agentId: OpenFMVAgentId, patch: { model?: string; reasoningEffort?: string }) => {
    const nextConfig = {
      ...config,
      executionMode: 'cli' as const,
      selectedCliAgentId: agentId,
      cliSelections: config.cliSelections.map((selection) => selection.agentId === agentId ? { ...selection, ...patch } : selection),
    };
    void persist(nextConfig);
  };

  const toggleAgentConfig = (agentId: OpenFMVAgentId) => {
    updateCliSelection(agentId, {});
    setConfiguringAgentId((current) => current === agentId ? '' : agentId);
  };

  const testAgent = async (agentId: OpenFMVAgentId) => {
    setTestingId(agentId);
    try {
      const result = await testOpenFMVAiAgent(agentId);
      setTestResults((current) => ({ ...current, [agentId]: result }));
    } finally {
      setTestingId('');
    }
  };

  const renderAgentCard = (agent: OpenFMVAgentInfo) => (
    <AgentCard
      key={agent.id}
      agent={agent}
      active={config.selectedCliAgentId === agent.id}
      configuring={configuringAgentId === agent.id}
      selection={selectionByAgentId.get(agent.id)}
      testing={testingId === agent.id}
      result={testResults[agent.id]}
      onConfigure={() => toggleAgentConfig(agent.id)}
      onSelectionChange={(patch) => updateCliSelection(agent.id, patch)}
      onTest={() => void testAgent(agent.id)}
    />
  );

  return (
    <div className="fixed inset-0 z-[220] grid place-items-center bg-black/45 px-4 py-5 backdrop-blur-md" role="dialog" aria-modal="true">
      <section className="relative flex h-[min(760px,92vh)] w-full max-w-[1080px] overflow-hidden rounded-[18px] border border-white/10 bg-[#171717]/95 shadow-[0_34px_120px_rgba(0,0,0,0.58)]">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 z-10 grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-openfmv-sub transition hover:bg-white/[0.07] hover:text-white" title={t('close')}>
          <X size={18} />
        </button>
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#131313] p-5">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-openfmv-muted">{t('eyebrow')}</div>
              <h2 className="mt-2 text-xl font-semibold text-white">{t('title')}</h2>
              <div className="mt-1 text-xs text-openfmv-muted">{savingState ? t(savingState) : t('savedLocally')}</div>
            </div>
          </div>

          <nav className="space-y-2">
            <SidebarButton active icon={Bot} title={t('coreEngine')} subtitle={t('localCli')} />
            <div className="rounded-[12px] border border-white/10 bg-white/[0.045] p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-white">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-white/10 bg-white/[0.06] text-openfmv-sub">
                    <Globe2 size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block">{t('language')}</span>
                    <span className="mt-0.5 block truncate text-xs font-medium text-openfmv-muted">{t('interfaceLanguage')}</span>
                  </span>
                </div>
                <div className="relative shrink-0">
                  <button
                    type="button"
                    aria-label={t('interfaceLanguage')}
                    aria-expanded={isLocaleMenuOpen}
                    onClick={() => setIsLocaleMenuOpen((current) => !current)}
                    onBlur={() => window.setTimeout(() => setIsLocaleMenuOpen(false), 120)}
                    className="inline-flex h-9 min-w-[116px] items-center justify-between gap-2 rounded-full border border-openfmv-accent/55 bg-openfmv-accent/8 px-3 text-xs font-semibold text-white outline-none transition hover:bg-openfmv-accent/12 focus:border-openfmv-accent"
                  >
                    <span className="max-w-[78px] truncate">{currentLocaleLabel}</span>
                    <ChevronDown size={14} className={`shrink-0 text-openfmv-sub transition ${isLocaleMenuOpen ? 'rotate-180 text-openfmv-accent' : ''}`} />
                  </button>

                  {isLocaleMenuOpen ? (
                    <div className="absolute right-0 top-full z-40 mt-2 w-[156px] overflow-hidden rounded-[12px] border border-white/12 bg-[#202020]/98 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
                      {routing.locales.map((localeOption) => {
                        const isCurrentLocale = localeOption === locale;
                        return (
                          <button
                            key={localeOption}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => changeLocale(localeOption)}
                            className={`flex h-9 w-full items-center justify-between gap-2 rounded-[9px] px-3 text-left text-xs font-semibold transition ${
                              isCurrentLocale
                                ? 'bg-openfmv-accent text-white'
                                : 'text-openfmv-sub hover:bg-white/[0.07] hover:text-white'
                            }`}
                          >
                            <span className="truncate">{localeT(localeOption)}</span>
                            {isCurrentLocale ? <CheckCircle2 size={13} className="shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-[12px] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between text-xs text-openfmv-muted">
                <span>{t('availableCli')}</span>
                <span className="font-semibold text-white">{availableAgents.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-openfmv-muted">
                <span>{t('missingCli')}</span>
                <span className="font-semibold text-white">{missingAgents.length}</span>
              </div>
            </div>
            <p className="text-xs leading-6 text-openfmv-muted">{t('aiDescription')}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid h-full min-h-[420px] place-items-center text-openfmv-sub">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <div className="p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <PanelHeader
                  title={t('coreEngine')}
                  description={t('coreEngineDescription')}
                />
                <button type="button" onClick={() => void scanAgents()} disabled={isScanning} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.07] px-3 text-sm font-semibold text-white transition hover:bg-white/[0.11] disabled:opacity-50">
                  {isScanning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  {t('rescan')}
                </button>
              </div>

              <section className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.035] p-4">
                <AgentGroup title={t('availableGroup', { count: availableAgents.length })} emptyText={t('noAvailableCli')}>
                  {availableAgents.map(renderAgentCard)}
                </AgentGroup>

                <AgentGroup title={t('missingGroup', { count: missingAgents.length })} emptyText={t('allCliInstalled')}>
                  {missingAgents.map(renderAgentCard)}
                </AgentGroup>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SidebarButton({ active, icon: Icon, title, subtitle }: { active: boolean; icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className={`flex w-full items-center gap-3 rounded-[12px] px-4 py-3 text-left ${active ? 'bg-white/[0.10] text-white' : 'text-openfmv-sub'}`}>
      <Icon size={18} />
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-openfmv-muted">{subtitle}</span>
      </span>
    </div>
  );
}

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-openfmv-muted">{description}</p>
    </div>
  );
}

function AgentGroup({ title, emptyText, children }: { title: string; emptyText: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-openfmv-muted">{title}</div>
      <div className="grid gap-2">
        {React.Children.count(children) > 0 ? children : <div className="rounded-[12px] border border-dashed border-white/10 p-4 text-sm text-openfmv-muted">{emptyText}</div>}
      </div>
    </div>
  );
}

function AgentCard({ agent, active, configuring, selection, testing, result, onConfigure, onSelectionChange, onTest }: {
  agent: OpenFMVAgentInfo;
  active: boolean;
  configuring: boolean;
  selection?: OpenFMVCliSelection;
  testing: boolean;
  result?: OpenFMVConnectionTestResult;
  onConfigure: () => void;
  onSelectionChange: (patch: { model?: string; reasoningEffort?: string }) => void;
  onTest: () => void;
}) {
  const t = useTranslations('settings');
  const selectedModel = selection?.model || agent.models[0] || '';
  const selectedReasoning = selection?.reasoningEffort || agent.reasoningOptions?.[0] || '';

  return (
    <article className={`rounded-[12px] border p-3 transition ${active || configuring ? 'border-cyan-300/35 bg-cyan-300/[0.06]' : 'border-white/10 bg-white/[0.035]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-white/[0.07] text-white">
              <AgentIcon id={agent.id} size={25} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{agent.name}</span>
            <span className={`mt-0.5 block truncate text-xs ${agent.available ? 'text-emerald-300' : 'text-openfmv-muted'}`}>{agent.available ? agent.version || t('installed') : t('missing')}</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onConfigure} className={`inline-flex h-8 items-center gap-1 rounded-[9px] border px-3 text-xs font-semibold transition ${configuring ? 'border-cyan-300/30 bg-cyan-300/[0.12] text-cyan-100' : 'border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.11]'}`}>
            <Settings2 size={13} />
            {t('configure')}
          </button>
          <button type="button" onClick={onTest} disabled={!agent.available || testing} className="inline-flex h-8 items-center gap-1 rounded-[9px] border border-white/10 bg-white/[0.07] px-3 text-xs font-semibold text-white transition hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-45">
            {testing ? <Loader2 size={13} className="animate-spin" /> : t('test')}
          </button>
        </div>
      </div>

      {configuring ? (
        <div className="mt-3 grid gap-3 rounded-[10px] border border-white/10 bg-black/15 p-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-openfmv-muted">{t('model')}</span>
            <select value={selectedModel} onChange={(event) => onSelectionChange({ model: event.target.value })} className="h-10 w-full rounded-[10px] border border-white/10 bg-[#202020] px-3 text-sm text-white outline-none">
              {agent.models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </label>

          {agent.reasoningOptions ? (
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-openfmv-muted">{t('reasoningEffort')}</span>
              <select value={selectedReasoning} onChange={(event) => onSelectionChange({ reasoningEffort: event.target.value })} className="h-10 w-full rounded-[10px] border border-white/10 bg-[#202020] px-3 text-sm text-white outline-none">
                {agent.reasoningOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className={`mt-2 flex items-center gap-2 text-xs ${getResultClassName(result)}`}>
          {result.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span className="line-clamp-2">{result.message}</span>
        </div>
      ) : null}
    </article>
  );
}
