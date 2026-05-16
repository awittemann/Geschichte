'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import lernkartenDaten from '@/data/lernkarten.json';
import type { LernkartenDaten } from '@/lib/typen';

const DATEN = lernkartenDaten as LernkartenDaten;

const ALLE = '__alle__';

export default function UebersichtSeite() {
  const router = useRouter();
  const [auswahl, setAuswahl] = useState<string>(ALLE);

  const angezeigteKategorien = useMemo(() => {
    if (auswahl === ALLE) return DATEN.kategorien;
    const k = DATEN.kategorien.find((x) => x.name === auswahl);
    return k ? [k] : [];
  }, [auswahl]);

  const anzahlKarten = useMemo(
    () => angezeigteKategorien.reduce((acc, k) => acc + k.karten.length, 0),
    [angezeigteKategorien],
  );

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-py w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Zurück zur Startseite"
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-base font-medium px-2 py-1 -ml-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← Zurück
        </button>
        <div className="text-sm text-slate-600 tabular-nums">
          {anzahlKarten} {anzahlKarten === 1 ? 'Karte' : 'Karten'}
        </div>
        <div className="w-12" aria-hidden="true" />
      </div>

      <h1 className="text-xl font-bold text-slate-900">Karten-Übersicht</h1>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Kapitel</span>
        <select
          value={auswahl}
          onChange={(e) => setAuswahl(e.target.value)}
          className="w-full rounded-xl bg-white border border-slate-300 text-slate-900 text-base font-medium py-3 px-3 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value={ALLE}>Alle Kapitel</option>
          {DATEN.kategorien.map((k) => (
            <option key={k.name} value={k.name}>
              {k.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-6 mt-2">
        {angezeigteKategorien.map((kategorie) => (
          <section key={kategorie.name} className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-slate-700 sticky top-0 bg-slate-50 py-1">
              {kategorie.name}
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({kategorie.karten.length})
              </span>
            </h2>
            <ol className="flex flex-col gap-3">
              {kategorie.karten.map((karte, idx) => (
                <li
                  key={karte.id}
                  className="rounded-2xl bg-white shadow-sm p-4 flex flex-col gap-2"
                >
                  <div className="text-base font-semibold text-slate-900 leading-snug">
                    <span className="text-slate-400 tabular-nums mr-2">
                      {idx + 1}.
                    </span>
                    {karte.frage}
                  </div>
                  <div className="text-base text-slate-700 leading-relaxed whitespace-pre-line">
                    {karte.antwort}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
