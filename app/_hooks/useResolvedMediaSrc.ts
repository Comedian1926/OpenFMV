import { useEffect, useState } from 'react';

import { isBrowserAssetRef, resolveBrowserAssetRef } from '@/app/_utils/browserAssets';
import { resolveMediaSrc } from '@/app/_utils/mediaSrc';

export const useResolvedMediaSrc = (src?: string | null) => {
  const [resolvedSrc, setResolvedSrc] = useState(() => resolveMediaSrc(src));

  useEffect(() => {
    let isMounted = true;
    const initialSrc = resolveMediaSrc(src);
    setResolvedSrc(initialSrc);

    if (!src || !isBrowserAssetRef(src)) return;

    void resolveBrowserAssetRef(src).then((value) => {
      if (isMounted) setResolvedSrc(value);
    });

    return () => {
      isMounted = false;
    };
  }, [src]);

  return resolvedSrc;
};
