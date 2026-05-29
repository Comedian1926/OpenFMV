'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, X } from 'lucide-react';
import { AppEdge, AppNode } from '../../_types';
import { useResolvedMediaSrc } from '../../_hooks/useResolvedMediaSrc';
import { usePlayerStore } from '../../_store/usePlayerStore';
import { useRuntimeGraphStore } from '../../_store/useRuntimeGraphStore';
import OpenFMVVideo from '../video/OpenFMVVideo';
import { SwipeUnlock } from './interactions';
import { getNodeText, getNodeTitle, getOutgoingEdges, getVisibleRules, resolveNextNodeId } from '../../_utils/graphRuntime';

const Countdown = ({ seconds, countdownKey, onTimeout }: { seconds?: number; countdownKey: string; onTimeout: () => void }) => {
  const normalizedSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const [countdownState, setCountdownState] = useState({ key: countdownKey, timeLeft: normalizedSeconds });
  const timeoutKeyRef = useRef<string | null>(null);

  useEffect(() => {
    timeoutKeyRef.current = null;
    setCountdownState({ key: countdownKey, timeLeft: normalizedSeconds });
  }, [countdownKey, normalizedSeconds]);

  useEffect(() => {
    if (countdownState.key !== countdownKey || normalizedSeconds <= 0 || countdownState.timeLeft <= 0) return;
    const timer = window.setTimeout(() => setCountdownState((state) => (state.key === countdownKey ? { ...state, timeLeft: state.timeLeft - 1 } : state)), 1000);
    return () => window.clearTimeout(timer);
  }, [countdownKey, countdownState, normalizedSeconds]);

  useEffect(() => {
    if (countdownState.key !== countdownKey || normalizedSeconds <= 0 || countdownState.timeLeft !== 0) return;
    if (timeoutKeyRef.current === countdownKey) return;
    timeoutKeyRef.current = countdownKey;
    onTimeout();
  }, [countdownKey, countdownState, normalizedSeconds, onTimeout]);

  if (normalizedSeconds <= 0 || countdownState.key !== countdownKey || countdownState.timeLeft <= 0) return null;

  return (
    <div className="mx-auto mt-5 w-full max-w-xs">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-openfmv-accent transition-all duration-1000" style={{ width: `${(countdownState.timeLeft / normalizedSeconds) * 100}%` }} />
      </div>
      <div className="mt-2 text-center font-mono text-xs font-semibold text-openfmv-accent">{countdownState.timeLeft}s</div>
    </div>
  );
};

const InteractionControls = ({ node, edges, onNavigate }: { node: AppNode; edges: AppEdge[]; onNavigate: (targetNodeId: string | null) => void }) => {
  const data = node.data as Record<string, any>;
  const rules = getVisibleRules(node);
  const mode = data.interactionMode === 'input' || data.interactionMode === 'slider' ? data.interactionMode : 'choice';
  const [inputValue, setInputValue] = useState('');

  const goNext = useCallback((input?: string, handleId?: string) => onNavigate(resolveNextNodeId(node, edges, { input, handleId })), [edges, node, onNavigate]);

  return (
    <div className="w-full max-w-4xl">
      {data.prompt && <h2 className="mb-5 text-center text-2xl font-semibold text-white drop-shadow-lg md:text-3xl">{data.prompt}</h2>}

      {mode === 'slider' ? (
        <div className="flex justify-center"><SwipeUnlock label={data.sliderConfig?.label || '滑动解锁'} onUnlock={() => goNext('unlocked', 'slider')} /></div>
      ) : mode === 'input' ? (
        <div className="mx-auto flex max-w-xl items-center gap-2 rounded-full border border-white/15 bg-white/[0.12] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-3xl">
          <input value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { goNext(inputValue); setInputValue(''); } }} placeholder="输入你的回答..." className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder-white/35" />
          <button onClick={() => { goNext(inputValue); setInputValue(''); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-openfmv-accent text-white transition hover:bg-openfmv-accent-hover"><ArrowRight size={18} /></button>
        </div>
      ) : (
        <div className={`grid gap-3 ${rules.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1 place-items-center'}`}>
          {(rules.length > 0 ? rules : [{ id: 'continue', keyword: '继续', condition: '继续', handleId: '' }]).map((rule) => (
            <button key={rule.id} onClick={() => goNext(rule.condition || rule.keyword, rule.handleId)} className="group flex min-h-16 w-full max-w-xl items-center justify-between gap-3 rounded-[22px] border border-white/15 bg-white/10 px-5 py-4 text-left text-white shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-3xl transition hover:-translate-y-0.5 hover:border-openfmv-accent/70 hover:bg-white/16">
              <span className="min-w-0 break-words text-lg">{rule.condition || rule.keyword || '选项'}</span>
              <ArrowRight size={18} className="shrink-0 opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      )}

      <Countdown seconds={Number(data.timeLimit) || 0} countdownKey={node.id} onTimeout={() => goNext()} />
    </div>
  );
};

export default function PlayerOverlay() {
  const { isPlaying, currentNodeId, setCurrentNode, setIsPlaying, reset } = usePlayerStore();
  const runtimeGraph = useRuntimeGraphStore();
  const nodes = runtimeGraph.nodes;
  const edges = runtimeGraph.edges;
  const startNode = useMemo(() => nodes.find((node) => node.type === 'start') ?? nodes[0], [nodes]);
  const currentNode = nodes.find((node) => node.id === currentNodeId) ?? startNode;
  const data = (currentNode?.data || {}) as Record<string, any>;
  const imageSrc = useResolvedMediaSrc(data.image);
  const text = currentNode ? getNodeText(currentNode) : '';
  const shouldShowControls = currentNode && (currentNode.type === 'interaction' || getOutgoingEdges(currentNode.id, edges).length > 0);

  const closePlayer = () => {
    runtimeGraph.resetGraph();
    reset();
    setIsPlaying(false);
  };

  const navigateTo = useCallback((targetNodeId: string | null) => {
    if (!targetNodeId) {
      setIsPlaying(false);
      return;
    }
    setCurrentNode(targetNodeId);
  }, [setCurrentNode, setIsPlaying]);

  const restart = () => {
    if (!startNode) return;
    setCurrentNode(startNode.id);
  };

  if (!isPlaying || !currentNode) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[linear-gradient(135deg,#090b10,#15110d)] text-white">
      <div className="absolute left-4 top-4 z-50 flex items-center gap-2">
        <button onClick={closePlayer} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.11] px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-3xl transition hover:border-openfmv-accent/70 hover:text-white"><X size={16} />退出</button>
        <button onClick={restart} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.11] px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-3xl transition hover:border-openfmv-accent/70 hover:text-white"><RotateCcw size={16} />重播</button>
      </div>

      <div className="absolute inset-0 bg-black">
        {data.image ? <img src={imageSrc} alt={getNodeTitle(currentNode)} className="h-full w-full object-contain" /> : data.video ? <OpenFMVVideo src={data.video} playbackId={data.videoPlaybackId} poster={data.videoThumbnail} autoPlay playsInline controls className="h-full w-full object-contain" /> : <div className="h-full w-full bg-[radial-gradient(circle_at_50%_24%,rgba(249,115,22,0.22),transparent_34%),radial-gradient(circle_at_78%_12%,rgba(255,255,255,0.09),transparent_30%),linear-gradient(135deg,#151821,#070a10_62%,#17120f)]" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/62 via-black/18 to-black/88" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle_at_50%_100%,rgba(249,115,22,0.15),transparent_45%)]" />
      </div>

      <div className="relative z-10 flex min-h-full flex-col justify-end px-5 py-8 md:px-12 md:py-12">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-8 max-w-3xl">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-openfmv-accent">{currentNode.type}</div>
            <h1 className="text-4xl font-semibold tracking-tight drop-shadow-2xl md:text-6xl">{getNodeTitle(currentNode)}</h1>
            {text && <p className="mt-5 whitespace-pre-wrap text-base leading-8 text-white/86 drop-shadow-lg md:text-xl md:leading-9">{text}</p>}
          </div>

          {currentNode.type === 'end' ? (
            <button onClick={restart} className="inline-flex items-center gap-2 rounded-full bg-openfmv-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-openfmv-accent-hover"><RotateCcw size={16} />重新开始</button>
          ) : shouldShowControls ? (
            <InteractionControls node={currentNode} edges={edges} onNavigate={navigateTo} />
          ) : (
            <button onClick={() => navigateTo(resolveNextNodeId(currentNode, edges))} className="inline-flex items-center gap-2 rounded-full bg-openfmv-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-openfmv-accent-hover">继续<ArrowRight size={16} /></button>
          )}
        </div>
      </div>
    </div>
  );
}



