'use client';

import React from 'react';
import type { CSSProperties } from 'react';

interface AgentIconProps {
  id: string;
  size?: number;
  className?: string;
}

const iconExt: Record<string, 'svg' | 'png'> = {
  claude: 'svg',
  codex: 'svg',
  gemini: 'svg',
  kimi: 'svg',
  opencode: 'svg',
  qwen: 'svg',
};

const monoIcons = new Set(['opencode']);

export default function AgentIcon({ id, size = 36, className }: AgentIconProps) {
  const ext = iconExt[id];
  const cls = className ?? '';

  if (ext === 'svg' && monoIcons.has(id)) {
    const src = `/agent-icons/${id}.svg`;
    const style: CSSProperties = {
      width: size,
      height: size,
      WebkitMaskImage: `url("${src}")`,
      maskImage: `url("${src}")`,
    };

    return (
      <span
        aria-hidden="true"
        className={`inline-block shrink-0 bg-current [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] ${cls}`}
        style={style}
      />
    );
  }

  if (ext) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className={`shrink-0 object-contain ${cls}`}
        draggable={false}
        height={size}
        src={`/agent-icons/${id}.${ext}`}
        width={size}
      />
    );
  }

  const initial = (id.match(/[a-z]/i)?.[0] ?? '?').toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-[9px] border border-white/10 bg-white/[0.07] font-semibold text-white ${cls}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}
