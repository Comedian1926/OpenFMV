'use client';

import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('legal.terms');
  const sections = ['localFirst', 'content', 'exports', 'responsibility'] as const;

  return (
    <main className="h-full overflow-y-auto bg-openfmv-canvas px-5 py-12 text-openfmv-text">
      <section className="mx-auto max-w-3xl space-y-8 rounded-lg border border-openfmv-border bg-openfmv-surface p-8 shadow-openfmv">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-openfmv-muted">{t('eyebrow')}</p>
          <h1 className="text-3xl font-semibold text-white">{t('title')}</h1>
          <p className="text-sm leading-6 text-openfmv-sub">{t('description')}</p>
        </div>

        <div className="space-y-6 text-sm leading-7 text-openfmv-sub">
          {sections.map((section) => (
            <section key={section} className="space-y-2">
              <h2 className="text-lg font-semibold text-white">{t(`${section}.title`)}</h2>
              <p>{t(`${section}.body`)}</p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
