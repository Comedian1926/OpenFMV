'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';

interface DebugAgent {
  id: string;
  name: string;
  bin: string;
  candidateBins: string[];
  pathEntries: string[];
  resolvedPath: string;
  available: boolean;
  version: string;
  versionArgs: string[];
  probeOk: boolean;
  probeCode: number | null;
  probeOutput: string;
  probeError: string;
}

interface DebugPayload {
  platform: string;
  path: string;
  agents: DebugAgent[];
}

export default function AiDebugPage() {
  const [payload, setPayload] = useState<DebugPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ai-settings/agents?debug=1', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setPayload(await response.json() as DebugPayload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const pathEntries = payload?.agents[0]?.pathEntries || [];

  return (
    <main className="min-h-screen bg-[#181818] px-6 py-8 text-openfmv-text">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-openfmv-muted">OpenFMV AI Debug</div>
            <h1 className="mt-2 text-3xl font-semibold text-white">Assets</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-openfmv-muted">OpenFMV local editor.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={isLoading} className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.07] px-4 text-sm font-semibold text-white transition hover:bg-white/[0.11] disabled:opacity-50">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            閲嶆柊鎵弿
          </button>
        </div>

        {error ? (
          <div className="mb-5 rounded-[12px] border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : null}

        <section className="mb-5 rounded-[14px] border border-white/10 bg-white/[0.035] p-4">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <InfoLine label="Platform" value={payload?.platform || 'loading'} />
            <InfoLine label="PATH entries" value={String(pathEntries.length)} />
          </div>
          <div className="mt-4 rounded-[10px] border border-white/10 bg-black/20 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-openfmv-muted">Effective Search Dirs</div>
            <div className="max-h-48 overflow-auto font-mono text-xs leading-6 text-openfmv-sub">
              {pathEntries.map((entry) => <div key={entry}>{entry}</div>)}
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          {isLoading && !payload ? (
            <div className="grid min-h-48 place-items-center text-openfmv-sub">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : payload?.agents.map((agent) => (
            <article key={agent.id} className="rounded-[14px] border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {agent.available ? <CheckCircle2 size={16} className="text-emerald-300" /> : <XCircle size={16} className="text-red-300" />}
                    <h2 className="text-base font-semibold text-white">Settings</h2>
                    <span className="rounded-[8px] border border-white/10 bg-white/[0.06] px-2 py-1 font-mono text-xs text-openfmv-sub">{agent.bin}</span>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-openfmv-sub">OpenFMV local editor.</p>
                </div>
                <span className={`rounded-[8px] border px-2.5 py-1 text-xs font-semibold ${agent.available ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-red-300/20 bg-red-300/10 text-red-200'}`}>
                  {agent.available ? 'available' : 'missing'}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <InfoLine label="Version" value={agent.version || '-'} />
                <InfoLine label="Probe args" value={agent.versionArgs.join(' ')} />
                <InfoLine label="Probe code" value={agent.probeCode == null ? '-' : String(agent.probeCode)} />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <DebugBlock title="Candidate names" lines={agent.candidateBins} />
                <DebugBlock title="Probe output" lines={[agent.probeOutput || agent.probeError || '-']} />
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-openfmv-muted">{label}</div>
      <div className="mt-1 break-all font-mono text-xs text-white">{value}</div>
    </div>
  );
}

function DebugBlock({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-[10px] border border-white/10 bg-black/20 p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-openfmv-muted">{title}</div>
      <div className="max-h-32 overflow-auto font-mono text-xs leading-6 text-openfmv-sub">
        {lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
      </div>
    </div>
  );
}
