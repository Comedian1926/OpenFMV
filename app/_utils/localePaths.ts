import { routing } from '@/i18n/routing';

export const getLocalizedPath = (locale: string, path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const localePattern = new RegExp(`^/(${routing.locales.map((value) => value.replace('-', '\\-')).join('|')})(/|$)`);
  const pathWithoutLocale = normalizedPath.replace(localePattern, '/');
  return `/${locale}${pathWithoutLocale === '/' ? '' : pathWithoutLocale}`;
};

export const stripLocaleFromPath = (path: string) => {
  const localePattern = new RegExp(`^/(${routing.locales.map((value) => value.replace('-', '\\-')).join('|')})(/|$)`);
  return path.replace(localePattern, '/');
};

