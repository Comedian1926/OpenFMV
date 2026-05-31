'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const t = useTranslations('player');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const interval = 20;
    const steps = duration / interval;
    const increment = 100 / steps;
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          window.clearInterval(timer);
          window.setTimeout(onComplete, 500);
          return 100;
        }
        return next;
      });
    }, interval);
    return () => window.clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_30%,rgba(249,115,22,0.22),transparent_34%),linear-gradient(135deg,#151821,#080a10_58%,#17120f)] text-white">
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.10] shadow-[0_24px_90px_rgba(0,0,0,0.34)] backdrop-blur-3xl">
        <Image src="/logo.png" alt="OpenFMV Logo" fill sizes="80px" className="object-cover opacity-90" />
      </div>
      <div className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-openfmv-sub">{t('enteringWorld')}</div>
      <div className="mb-8 font-mono text-4xl font-bold text-openfmv-accent">{Math.round(progress)}%</div>
      <div className="h-1.5 w-72 overflow-hidden rounded-full border border-white/10 bg-white/[0.10] backdrop-blur-3xl">
        <div className="h-full rounded-full bg-openfmv-accent transition-all duration-100 ease-out shadow-[0_0_22px_rgba(249,115,22,0.42)]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
