import AssetStudioClient from '@/app/_components/assets/AssetStudioClient';

export default function AssetStudioPage({ searchParams }: { searchParams: { projectId?: string; assetId?: string } }) {
  return <AssetStudioClient projectId={searchParams.projectId} assetId={searchParams.assetId} />;
}

