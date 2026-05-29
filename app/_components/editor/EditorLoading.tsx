'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const MESSAGES = ['装载剧情引擎...', '整理节点画布...', '校准交互连线...', '准备本地素材...', '即将进入编辑器...'];

const EditorLoading = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('启动 OpenFMV 编辑器...');

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2200;
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 99);
      setProgress(nextProgress);
      const messageIndex = Math.floor((nextProgress / 100) * MESSAGES.length);
      if (MESSAGES[messageIndex]) setStatusText(MESSAGES[messageIndex]);
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-white/[0.055] text-openfmv-text">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(249,115,22,0.20),transparent_36%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.10),transparent_30%),linear-gradient(135deg,#151821,#080a10_58%,#17120f)]" />
      <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-[34px] border border-white/18 bg-white/[0.10] backdrop-blur-3xl shadow-[0_0_90px_rgba(249,115,22,0.24)]">
        <Image src="/logo.png" alt="OpenFMV Logo" width={72} height={72} className="rounded-[22px] object-cover" />
      </div>
      <div className="relative mb-3 text-xl font-semibold tracking-wide text-white">{statusText}</div>
      <div className="relative h-1.5 w-72 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-openfmv-accent transition-all duration-300 ease-out shadow-[0_0_22px_rgba(249,115,22,0.42)]" style={{ width: `${progress}%` }} />
      </div>
      <div className="relative mt-3 font-mono text-xs text-openfmv-muted">{Math.round(progress)}%</div>
    </div>
  );
};

export default EditorLoading;



