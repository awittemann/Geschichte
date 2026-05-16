'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import lernkartenDaten from '@/data/lernkarten.json';
import type {
  Fortschritt,
  LernkartenDaten,
  TagesStatistik,
} from '@/lib/typen';
import {
  ladeFortschritt,
  loescheFortschritt,
} from '@/lib/speicher';
import {
  berechneStreak,
  erhoeheSessionsZaehler,
  ladeStatistik,
} from '@/lib/statistik';
import { heutigesDatum } from '@/lib/datum';
import Fortschrittsbalken from '@/components/Fortschrittsbalken';
import TagesUebersicht from '@/components/TagesUebersicht';
import PrivateModeWarnung from '@/components/PrivateModeWarnung';
import { sessionHatAktivitaet, useIstClient } from '@/lib/sessionStats';

const DATEN = lernkartenDaten as LernkartenDaten;
const KARTEN_GESAMT = DATEN.kategorien.reduce(
  (acc, k) => acc + k.karten.length,
  0,
);

type DatenStand = {
  fortschritt: Fortschritt | null;
  heuteTag: TagesStatistik | null;
  streak: number;
};

function leseDaten(): DatenStand {
  const fortschritt = ladeFortschritt();
  const heute = heutigesDatum();
  const s = ladeStatistik();
  return {
    fortschritt,
    streak: berechneStreak(s, heute),
    heuteTag: s.tage.find((t) => t.datum === heute) ?? null,
  };
}

const LEER: DatenStand = { fortschritt: null, heuteTag: null, streak: 0 };

export default function Startseite() {
  const router = useRouter();
  const istClient = useIstClient();
  // version: bei jeder Mutation hochzählen, um beim nächsten Render neu zu lesen.
  const [version, setVersion] = useState(0);
  const daten = istClient ? leseDaten() : LEER;
  // Markiere version als gelesen (gegen unused-Lint).
  void version;
  const { fortschritt, heuteTag, streak } = daten;

  const erledigt = fortschritt
    ? Object.values(fortschritt.karten).filter(
        (k) => k.abfragenBisErledigt === 0,
      ).length
    : 0;
  const hatAktiveSession =
    fortschritt !== null &&
    sessionHatAktivitaet(fortschritt) &&
    erledigt < KARTEN_GESAMT;

  const onStart = useCallback(() => {
    erhoeheSessionsZaehler(heutigesDatum());
    router.push('/lernen');
  }, [router]);

  const onReset = useCallback(() => {
    const ok = window.confirm(
      'Wirklich allen Fortschritt zurücksetzen? Die Tages-Statistik bleibt erhalten.',
    );
    if (!ok) return;
    loescheFortschritt();
    setVersion((v) => v + 1);
  }, []);

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-py flex flex-col gap-5 w-full">
      <header className="mt-2">
        <h1 className="text-2xl font-bold text-slate-900 leading-tight">
          Lernkarten – Aufklärung &amp; Menschenrechte
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {KARTEN_GESAMT} Karten in {DATEN.kategorien.length} Kategorien
        </p>
      </header>

      <PrivateModeWarnung />

      {istClient ? (
        hatAktiveSession ? (
          <section className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onStart}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Weiter lernen
            </button>
            <Fortschrittsbalken
              aktuell={erledigt}
              gesamt={KARTEN_GESAMT}
              label={`${erledigt} von ${KARTEN_GESAMT} Karten erledigt`}
            />
          </section>
        ) : (
          <button
            type="button"
            onClick={onStart}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Lernen starten
          </button>
        )
      ) : (
        // Platzhalter mit gleicher Höhe gegen Layout-Shift während Hydration.
        <div className="w-full rounded-xl bg-slate-200 py-4 h-[60px]" aria-hidden="true" />
      )}

      {istClient ? (
        <TagesUebersicht tagesStatistik={heuteTag} streak={streak} />
      ) : null}

      <div className="flex flex-col gap-2 mt-2">
        <button
          type="button"
          onClick={() => router.push('/start')}
          className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Quiz starten (Modus &amp; Kapitel wählen)
        </button>
        <button
          type="button"
          onClick={() => router.push('/karten')}
          className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Karten ansehen
        </button>
        <button
          type="button"
          onClick={() => router.push('/uebersicht')}
          className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Karten-Übersicht (Frage &amp; Antwort)
        </button>
        <button
          type="button"
          onClick={() => router.push('/statistik')}
          className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Statistik anzeigen
        </button>
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Fortschritt zurücksetzen
        </button>
      </div>
    </main>
  );
}
