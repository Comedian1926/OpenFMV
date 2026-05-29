import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const contentTypes: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
};

const resolveLocalPath = (src: string) => {
  if (src.startsWith('file://')) return fileURLToPath(src);
  if (path.isAbsolute(src) || /^[a-zA-Z]:[\\/]/.test(src)) return src;
  return null;
};

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get('src');
  if (!src || src.startsWith('data:') || src.startsWith('blob:') || /^https?:\/\//i.test(src)) {
    return new Response('Invalid asset source', { status: 400 });
  }

  const filePath = resolveLocalPath(src);
  if (!filePath) {
    return new Response('Invalid local path', { status: 400 });
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return new Response('Not found', { status: 404 });
    }

    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    const contentType = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    return new Response(stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStat.size),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
