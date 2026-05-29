import { describe, expect, it } from 'vitest';

import { classifyAssetSource } from '@/app/_utils/assetPaths';

describe('assetPaths', () => {
  it('classifies project, local, transient, remote, and unknown asset sources', () => {
    expect(classifyAssetSource('assets/images/scene.png')).toBe('projectAsset');
    expect(classifyAssetSource('assets\\images\\scene.png')).toBe('projectAsset');
    expect(classifyAssetSource('D:\\media\\scene.png')).toBe('absolutePath');
    expect(classifyAssetSource('/media/scene.png')).toBe('absolutePath');
    expect(classifyAssetSource('file:///D:/media/scene.png')).toBe('fileUrl');
    expect(classifyAssetSource('blob:http://localhost/asset')).toBe('blobUrl');
    expect(classifyAssetSource('data:image/png;base64,AAAA')).toBe('dataUrl');
    expect(classifyAssetSource('https://example.com/scene.png')).toBe('remoteUrl');
    expect(classifyAssetSource('scene.png')).toBe('unknown');
    expect(classifyAssetSource(' assets/images/scene.png ')).toBe('unknown');
    expect(classifyAssetSource(null)).toBe('unknown');
  });
});
