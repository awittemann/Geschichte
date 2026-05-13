'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import lernkartenDaten from '@/data/lernkarten.json';
import type {
  Fortschritt,
  LernkartenDaten,
  TagesStatistik,
} from '@/lib/typen';
import {
  initialisiereFortschrittAusDaten,
  ladeFortschritt,
  speichereFortschritt,
} from '@/lib/speicher';
import {
  berechneStreak,
  erhoeheSessionsZaehler,
  ladeStatistik,
} from '@/lib/statistik';
import { heutigesDatum } from '@/lib/datum';
import {
  sessionAbfragenGesamt,
  sessionDauerMinuten,
  sessionErsteBewertungenAnzahl,
  useIstClient,
} from '@/lib/sessionStats';

const DATEN = lernkartenDaten as LernkartenDaten;
const KARTEN_GESAMT = DATEN.kategorien.reduce(
  (acc, k) => acc + k.karten.length,
  0,
);

type Stand = {
  fortschritt: Fortschritt | null;
  heuteTag: TagesStatistik | null;
  streak: number;
};

function leseStand(): Stand {
  const fortschritt = ladeFortschritt();
  const heute = heutigesDatum();
  const s = ladeStatistik();
  return {
    fortschritt,
    heuteTag: s.tage.find((t) => t.datum === heute) ?? null,
    streak: berechneStreak(s, heute),
  };
}

const LEER: Stand = { fortschritt: null, heuteTag: null, streak: 0 };

export default function AbschlussSeite() {
  const router = useRouter();
  const istClient = useIstClient();
  const stand = istClient ? leseStand() : LEER;
  const { fortschritt, heuteTag, streak } = stand;

  const onNeueSession = useCallback(() => {
    const f = initialisiereFortschrittAusDaten(DATEN);
    speichereFortschritt(f);
    erhoeheSessionsZaehler(heutigesDatum());
    router.push('/lernen');
  }, [router]);

  if (!istClient) {
    return (
      <main className="mx-auto max-w-md safe-area-px safe-area-py w-full">
        <div className="text-slate-500 text-center mt-8">Lädt…</div>
      </main>
    );
  }

  const abfragen = fortschritt ? sessionAbfragenGesamt(fortschritt) : 0;
  const perfektErsterVersuch = fortschritt
    ? sessionErsteBewertungenAnzahl(fortschritt, 'perfekt_gewusst')
    : 0;
  const sessionMinuten = fortschritt ? sessionDauerMinuten(fortschritt) : 0;
  const minutenAnzeige =
    sessionMinuten > 0
      ? sessionMinuten
      : heuteTag
        ? Math.round(heuteTag.lernzeitSekunden / 60)
        : 0;
  const heuteAbfragen = heuteTag?.abfragenGesamt ?? 0;
  const heuteMinuten = heuteTag ? Math.round(heuteTag.lernzeitSekunden / 60) : 0;

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-py w-full flex flex-col gap-5">
      <div className="text-center mt-4">
        <div className="text-6xl" aria-hidden="true">
          🎉
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mt-3">
          Geschafft! Alle {KARTEN_GESAMT} Karten gelernt.
        </h1>
      </div>

      <section className="rounded-2xl bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Diese Session
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-2">
          <Kennzahl wert={abfragen} label="Abfragen" />
          <Kennzahl
            wert={perfektErsterVersuch}
            label="Perfekt 1. Mal"
          />
          <Kennzahl wert={minutenAnzeige} label="Minuten" />
        </dl>
      </section>

      <section className="rounded-2xl bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Heute insgesamt
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <Kennzahl wert={heuteAbfragen} label="Abfragen heute" />
          <Kennzahl wert={heuteMinuten} label="Minuten heute" />
        </dl>
        {streak >= 2 ? (
          <p className="mt-3 text-sm text-slate-700">
            <span aria-hidden="true">🔥</span> Dein Streak: {streak} Tage in
            Folge
          </p>
        ) : null}
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onNeueSession}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Neue Lernsession starten
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Zur Startseite
        </button>
      </div>
    </main>
  );
}

function Kennzahl({ wert, label }: { wert: number; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <dt className="text-xs text-slate-500 order-2 mt-0.5">{label}</dt>
      <dd className="text-2xl font-bold text-slate-900 tabular-nums order-1">
        {wert}
      </dd>
    </div>
  );
}
