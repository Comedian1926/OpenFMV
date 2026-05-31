'use client';

import { useEffect } from 'react';

import { AppLocale } from '@/i18n/routing';

export default function LocaleSync({ locale }: { locale: AppLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem('openfmv.locale', locale);
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }, [locale]);

  return null;
}

