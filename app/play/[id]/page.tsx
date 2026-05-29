import GameClient from './GameClient';

export default function PlayPage({ params }: { params: { id: string } }) {
  return <GameClient projectId={params.id} />;
}
