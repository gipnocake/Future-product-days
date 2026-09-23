"use client";

import Link from "next/link";
import { LOCALES, useI18n } from "@/i18n/I18nProvider";
import { privacyContent } from "@/i18n/privacy";

export function PrivacyPolicy() {
  const { locale, setLocale } = useI18n();
  const c = privacyContent[locale];
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-600 underline">
          {c.back}
        </Link>
        <div className="flex gap-2 text-xs">
          {LOCALES.map((l) => (
            <button key={l} type="button" onClick={() => setLocale(l)} aria-pressed={locale === l} className={`uppercase ${locale === l ? "font-bold" : "text-stone-500"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <header>
        <h1 className="text-2xl font-bold text-stone-900">{c.title}</h1>
        <p className="text-sm text-stone-500">{c.updated}</p>
      </header>
      {c.sections.map((s) => (
        <section key={s.heading} className="space-y-2">
          <h2 className="text-lg font-semibold text-stone-900">{s.heading}</h2>
          {s.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-stone-700">
              {p}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
