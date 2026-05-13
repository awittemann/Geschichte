'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiNutzerListe } from '@/lib/client/api';
import { useSitzung } from '@/lib/client/sitzung';
import type { NutzerUebersicht } from '@/lib/server/typen';

export default function NutzerListeSeite() {
  const router = useRouter();
  const { sitzung } = useSitzung();
  const [liste, setListe] = useState<NutzerUebersicht[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const u = await apiNutzerListe();
        if (!abgebrochen) setListe(u);
      } catch (err) {
        if (!abgebrochen) setFehler(err instanceof Error ? err.message : 'Fehler');
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const eigenerName = sitzung.status === 'bereit' && sitzung.nutzer ? sitzung.nutzer.name : null;

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-pb w-full flex flex-col gap-4 mt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Zurück zur Startseite"
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-base font-medium px-2 py-1 -ml-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← Zurück
        </button>
        <h1 className="text-lg font-bold text-slate-900">Nutzer</h1>
        <div className="w-12" aria-hidden="true" />
      </div>

      {sitzung.status === 'bereit' && sitzung.nutzer === null ? (
        <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-900">
          Du bist nicht angemeldet. <Link href="/anmelden" className="font-medium underline">Anmelden oder Konto anlegen</Link>.
        </div>
      ) : null}

      {fehler ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fehler}</p>
      ) : null}

      {liste === null ? (
        <div className="text-slate-500 text-center mt-4">Lädt…</div>
      ) : liste.length === 0 ? (
        <div className="text-slate-500 text-center mt-4">
          Noch keine Nutzer. <Link href="/anmelden" className="text-blue-600 underline">Lege dir ein Konto an.</Link>
        </div>
      ) : (
        <ul className="rounded-2xl bg-white shadow-sm divide-y divide-slate-100">
          {liste.map((n) => {
            const istEigener = eigenerName === n.name;
            const link = `/nutzer/${encodeURIComponent(n.name)}`;
            return (
              <li key={n.name}>
                <Link
                  href={link}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {n.name}
                      {istEigener ? (
                        <span className="ml-2 text-xs text-blue-700 font-normal">(du)</span>
                      ) : null}
                      {n.hatPasswort ? (
                        <span className="ml-2" title="Privat" aria-label="Privat">
                          🔒
                        </span>
                      ) : null}
                    </div>
                    {n.uebersicht ? (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {n.uebersicht.streak >= 2 ? '🔥 ' : ''}
                        {n.uebersicht.streak} Tage Streak ·{' '}
                        {n.uebersicht.lerntageGesamt} Lerntage ·{' '}
                        {n.uebersicht.abfragenGesamt} Abfragen
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 mt-0.5">Privat — Statistik nur mit Anmeldung sichtbar.</div>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
