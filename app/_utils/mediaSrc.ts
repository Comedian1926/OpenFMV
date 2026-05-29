import { getCachedBrowserAssetUrl, isBrowserAssetRef, resolveBrowserAssetRef } from './browserAssets';

const isAbsoluteWindowsPath = (value: string) => /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('\\\\');

export const resolveMediaSrc = (src?: string | null) => {
  if (!src) return undefined;
  if (isBrowserAssetRef(src)) return getCachedBrowserAssetUrl(src);
  if (src.startsWith('file://') || isAbsoluteWindowsPath(src)) {
    return `/api/local-asset?src=${encodeURIComponent(src)}`;
  }
  return src;
};

export const resolveMediaSrcAsync = async (src?: string | null) => {
  if (!src) return undefined;
  if (isBrowserAssetRef(src)) return resolveBrowserAssetRef(src);
  return resolveMediaSrc(src);
};
