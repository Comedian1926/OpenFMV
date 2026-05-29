const decodeWithLabel = (bytes: Uint8Array, label: string) => {
  try {
    return new TextDecoder(label).decode(bytes);
  } catch {
    return null;
  }
};

const replacementCount = (value: string) => (value.match(/\uFFFD/g) || []).length;

const looksLikeMojibake = (value: string) => /[ÃÂâ€]|锟斤拷|鏂|缁|鍓|绱|潗|涓|浘/.test(value);

export const decodeTextBuffer = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const utf8 = decodeWithLabel(bytes, 'utf-8') ?? '';
  if (replacementCount(utf8) === 0 && !looksLikeMojibake(utf8)) return utf8;

  const candidates = ['gb18030', 'gbk']
    .map((label) => decodeWithLabel(bytes, label))
    .filter((value): value is string => value !== null);

  return candidates.reduce((best, candidate) => {
    const bestScore = replacementCount(best) + (looksLikeMojibake(best) ? 2 : 0);
    const candidateScore = replacementCount(candidate) + (looksLikeMojibake(candidate) ? 2 : 0);
    return candidateScore < bestScore ? candidate : best;
  }, utf8);
};
