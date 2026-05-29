import assetPaths from '../../shared/assetPaths';

export type AssetSourceKind =
  | 'projectAsset'
  | 'absolutePath'
  | 'fileUrl'
  | 'blobUrl'
  | 'dataUrl'
  | 'remoteUrl'
  | 'unknown';

export const ASSET_SOURCE_KINDS = assetPaths.ASSET_SOURCE_KINDS as Record<AssetSourceKind, AssetSourceKind>;
export const classifyAssetSource = assetPaths.classifyAssetSource as (value: unknown) => AssetSourceKind;
export const isProjectAssetSourceKind = assetPaths.isProjectAssetSourceKind as (kind: AssetSourceKind) => boolean;
