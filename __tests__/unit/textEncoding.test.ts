import { describe, expect, it } from 'vitest';

import { decodeTextBuffer } from '@/app/_utils/textEncoding';

describe('decodeTextBuffer', () => {
  it('keeps UTF-8 Chinese text intact', () => {
    const bytes = new TextEncoder().encode('中文测试');

    expect(decodeTextBuffer(bytes)).toBe('中文测试');
  });

  it('falls back to GB18030 for Chinese text files saved as ANSI/GBK', () => {
    const bytes = new Uint8Array([0xd6, 0xd0, 0xce, 0xc4, 0xb2, 0xe2, 0xca, 0xd4]);

    expect(decodeTextBuffer(bytes)).toBe('中文测试');
  });
});
