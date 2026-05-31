import React from 'react';
import dynamic from 'next/dynamic';

import TopBar from '@/app/_components/editor/TopBar';
import PlayerOverlay from '@/app/_components/player/PlayerOverlay';
import EditorLoading from '@/app/_components/editor/EditorLoading';

const EditorCanvas = dynamic(() => import('@/app/_components/editor/EditorCanvas'), {
  ssr: false,
  loading: () => <EditorLoading />,
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

