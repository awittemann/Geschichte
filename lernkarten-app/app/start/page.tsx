'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ALLE_KATEGORIEN } from '@/lib/kartenIndex';
import {
  ladeKapitelFilter,
  speichereKapitelFilter,
} from '@/lib/filterSpeicher';
import { useIstClient } from '@/lib/sessionStats';

type Modus = 'lernen' | 'abfrage' | 'multiple-choice';

const ALLE = '__alle__';

const MODI: { id: Modus; titel: string; beschreibung: string }[] = [
  {
    id: 'lernen',
    titel: 'Karte umdrehen',
    beschreibung: 'Frage lesen, Antwort aufdecken, selbst bewerten.',
  },
  {
    id: 'abfrage',
    titel: 'Antwort eingeben (mit KI-Feedback)',
    beschreibung: 'Antwort eintippen oder diktieren, KI gibt Feedback.',
  },
  {
    id: 'multiple-choice',
    titel: 'Multiple Choice',
    beschreibung: 'Richtige Antwort aus drei Optionen wählen.',
  },
];

export default function StartSeite() {
  const router = useRouter();
  const istClient = useIstClient();
  const [modus, setModus] = useState<Modus>('lernen');
  const [kapitel, setKapitel] = useState<string>(ALLE);

  // Letzten Filter aus localStorage als Default übernehmen, sobald Client bereit ist.
  useEffect(() => {
    if (!istClient) return;
    const gespeichert = ladeKapitelFilter();
    if (gespeichert) setKapitel(gespeichert);
  }, [istClient]);

  const onStart = () => {
    const filterName = kapitel === ALLE ? null : kapitel;
    speichereKapitelFilter(filterName);
    const ziel = filterName
      ? `/${modus}?kapitel=${encodeURIComponent(filterName)}`
      : `/${modus}`;
    router.push(ziel);
  };

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-py w-full flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Zurück zur Startseite"
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-base font-medium px-2 py-1 -ml-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← Zurück
        </button>
        <div className="w-12" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Quiz starten</h1>

      <section className="flex flex-col gap-2" aria-label="Quiz-Modus">
        <span className="text-sm text-slate-600">Modus</span>
        {MODI.map((m) => {
          const aktiv = modus === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setModus(m.id)}
              aria-pressed={aktiv}
              className={`w-full rounded-xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                aktiv
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 bg-white hover:border-blue-400'
              }`}
            >
              <div className="text-base font-semibold text-slate-900">
                {m.titel}
              </div>
              <div className="text-sm text-slate-600 mt-0.5">
                {m.beschreibung}
              </div>
            </button>
          );
        })}
      </section>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-slate-600">Kapitel</span>
        <select
          value={kapitel}
          onChange={(e) => setKapitel(e.target.value)}
          className="w-full rounded-xl bg-white border border-slate-300 text-slate-900 text-base font-medium py-3 px-3 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value={ALLE}>Alle Kapitel</option>
          {ALLE_KATEGORIEN.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Starten
      </button>
    </main>
  );
}
