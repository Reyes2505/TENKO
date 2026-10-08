'use client';

import { useEffect, useState } from 'react';
import { cookiePolicy, Locale } from './content';

export default function CookiePolicyPage() {
  const [locale, setLocale] = useState<Locale>('es');

  useEffect(() => {
    const saved = (localStorage.getItem('tenko-locale') as Locale) || 'es';
    setLocale(saved);
  }, []);

  const handleLocaleChange = (next: Locale) => {
    setLocale(next);
    localStorage.setItem('tenko-locale', next);
    document.documentElement.lang = next;
  };

  const data = cookiePolicy[locale];

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <div className="mb-8 flex items-center justify-end gap-2">
          <button
            onClick={() => handleLocaleChange('es')}
            aria-pressed={locale === 'es'}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              locale === 'es'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            Español
          </button>
          <button
            onClick={() => handleLocaleChange('en')}
            aria-pressed={locale === 'en'}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              locale === 'en'
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            English
          </button>
        </div>

        <header className="mb-10 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.title}</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{data.lastUpdated}</p>
        </header>

        <article className="space-y-10">
          {data.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className="mb-4 text-xl font-semibold tracking-tight sm:text-2xl">{section.title}</h2>
              <div className="space-y-3 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {section.body.map((block, i) => {
                  if (typeof block === 'string') return <p key={i}>{block}</p>;
                  if ('list' in block) {
                    return (
                      <ul key={i} className="list-disc space-y-2 pl-6">
                        {block.list.map((item, j) => <li key={j}>{item}</li>)}
                      </ul>
                    );
                  }
                  if ('table' in block) {
                    return (
                      <div key={i} className="my-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead className="bg-neutral-50 dark:bg-neutral-900">
                            <tr>
                              {block.table.headers.map((h, j) => (
                                <th key={j} className="border-b border-neutral-200 px-4 py-2 font-semibold dark:border-neutral-800">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.table.rows.map((row, r) => (
                              <tr key={r} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-neutral-950 dark:even:bg-neutral-900/50">
                                {row.map((cell, c) => (
                                  <td key={c} className="border-b border-neutral-100 px-4 py-2 align-top dark:border-neutral-800/60">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </section>
          ))}
        </article>

        <footer className="mt-16 border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          {data.footerNote}
        </footer>
      </div>
    </main>
  );
}
