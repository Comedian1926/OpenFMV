'use client';

import React from 'react';
import { useResolvedMediaSrc } from '../../_hooks/useResolvedMediaSrc';

type OpenFMVVideoProps = {
  src?: string;
  playbackId?: string;
  metadata?: unknown;
  className?: string;
  style?: React.CSSProperties;
  poster?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  onEnded?: () => void;
  onError?: () => void;
  onCanPlay?: () => void;
  onLoadedData?: () => void;
  onPlaying?: () => void;
  onMouseOver?: React.MouseEventHandler;
  onMouseOut?: React.MouseEventHandler;
  playerRef?: React.Ref<HTMLVideoElement>;
};

export default function OpenFMVVideo({
  src,
  className,
  style,
  poster,
  controls = true,
  autoPlay,
  muted,
  loop,
  playsInline,
  preload,
  onEnded,
  onError,
  onCanPlay,
  onLoadedData,
  onPlaying,
  onMouseOver,
  onMouseOut,
  playerRef,
}: OpenFMVVideoProps) {
  const resolvedSrc = useResolvedMediaSrc(src);
  const resolvedPoster = useResolvedMediaSrc(poster);

  return (
    <video
      ref={playerRef}
      src={resolvedSrc}
      className={className}
      style={style}
      poster={resolvedPoster}
      controls={controls}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      preload={preload}
      onEnded={onEnded}
      onError={onError}
      onCanPlay={onCanPlay}
      onLoadedData={onLoadedData}
      onPlaying={onPlaying}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    />
  );
}
