'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/app/_store/usePlayerStore';
import { useRuntimeGraphStore } from '@/app/_store/useRuntimeGraphStore';
import { getLocalProject } from '@/app/_utils/localProjects';
import { getEntryNodeId } from '@/app/_utils/graphRuntime';
import PlayerOverlay from '@/app/_components/player/PlayerOverlay';

export default function GameClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { setGraph, resetGraph } = useRuntimeGraphStore();
  const { isPlaying, setIsPlaying, setCurrentNode, reset: resetPlayer } = usePlayerStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const project = getLocalProject(projectId);
    const graphData = project?.graphData;
    if (!graphData) {
      setInitialized(true);
      return;
    }

    const entryNodeId = getEntryNodeId(graphData, project.metadata?.entryNodeId);
    const startNode = graphData.nodes.find((node) => node.id === entryNodeId) ?? graphData.nodes[0];
    setGraph(graphData, entryNodeId);
    resetPlayer();
    if (startNode) {
      setCurrentNode(startNode.id);
      setIsPlaying(true);
    }
    setInitialized(true);

    return () => {
      setIsPlaying(false);
      resetPlayer();
      resetGraph();
    };
  }, [projectId, resetGraph, resetPlayer, setCurrentNode, setGraph, setIsPlaying]);

  useEffect(() => {
    if (initialized && !isPlaying) {
      router.push('/projects');
    }
  }, [initialized, isPlaying, router]);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-black">
      {!initialized && <div className="animate-pulse text-white">Loading Game...</div>}
      {initialized && !isPlaying && <div className="text-sm text-white/60">Project not found or empty.</div>}
      <PlayerOverlay />
    </div>
  );
}
