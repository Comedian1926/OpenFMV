import { redirect } from 'next/navigation';

import { routing } from '@/i18n/routing';

export default function LocaleHomePage({ params }: { params: { locale: string } }) {
  const locale = routing.locales.includes(params.locale as (typeof routing.locales)[number]) ? params.locale : routing.defaultLocale;
  redirect(`/${locale}/projects`);
}
