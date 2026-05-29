import React from 'react';
import dynamic from 'next/dynamic';
import TopBar from '../_components/editor/TopBar';
import PlayerOverlay from '../_components/player/PlayerOverlay';
import EditorLoading from '../_components/editor/EditorLoading';

const EditorCanvas = dynamic(() => import('../_components/editor/EditorCanvas'), { 
  ssr: false,
  loading: () => <EditorLoading />
});

export default function EditorPage({ searchParams }: { searchParams: { id?: string } }) {
  return (
    <main className="relative h-full w-full overflow-hidden bg-[#020202]">
      <TopBar />
      <div className="absolute inset-0">
        <EditorCanvas projectId={searchParams.id} />
      </div>
      <PlayerOverlay />
    </main>
  );
}
