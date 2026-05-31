import GameClient from '@/app/play/[id]/GameClient';

export default function PlayPage({ params }: { params: { id: string } }) {
  return <GameClient projectId={params.id} />;
}

