'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Maximize2, Minus, Sparkles, X } from 'lucide-react';

import { getLocalizedPath } from '@/app/_utils/localePaths';

interface AppNavigationProps {
  chatOpen?: boolean;
  onToggleChat?: () => void;
}

export default function AppNavigation({ chatOpen = false, onToggleChat }: AppNavigationProps) {
  const locale = useLocale();
  const t = useTranslations('navigation');

  return (
    <header className="relative z-[100] flex h-14 shrink-0 items-center justify-between bg-[#181818] px-7 [-webkit-app-region:drag]">
      <Link href={getLocalizedPath(locale, '/projects')} className="flex min-w-0 items-center gap-3 text-white/70 transition hover:text-white [-webkit-app-region:no-drag]">
        <img src="/logo.png" alt="OpenFMV" className="h-8 w-8 shrink-0 rounded-[9px] object-cover" />
        <span className="truncate text-base font-semibold">OpenFMV</span>
      </Link>

      <div className="flex min-w-0 items-center gap-3 [-webkit-app-region:no-drag]">
        <button type="button" onClick={onToggleChat} className={`inline-flex h-8 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold transition ${chatOpen ? 'bg-white/[0.17] text-white' : 'bg-white/[0.09] text-white/86 hover:bg-white/[0.14] hover:text-white'}`} title={t('askAi')}>
          <Sparkles size={16} className="text-cyan-300" />
          <span>{t('askAi')}</span>
        </button>
        <span className="h-5 w-px bg-white/18" />
        <button type="button" onClick={() => void window.openfmv?.minimizeWindow?.()} className="flex h-8 w-8 items-center justify-center text-white/75 transition hover:text-white" title={t('minimize')}>
          <Minus size={17} />
        </button>
        <button type="button" onClick={() => void window.openfmv?.toggleMaximizeWindow?.()} className="flex h-8 w-8 items-center justify-center text-white/75 transition hover:text-white" title={t('maximize')}>
          <Maximize2 size={15} />
        </button>
        <button type="button" onClick={() => void window.openfmv?.closeWindow?.()} className="flex h-8 w-8 items-center justify-center text-white/75 transition hover:bg-red-500 hover:text-white" title={t('close')}>
          <X size={17} />
        </button>
      </div>
    </header>
  );
}
