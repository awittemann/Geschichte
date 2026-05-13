'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import lernkartenDaten from '@/data/lernkarten.json';
import type { LernkartenDaten } from '@/lib/typen';
import { markiereKarteAngesehen } from '@/lib/statistik';
import { useIstClient } from '@/lib/sessionStats';
import Karte from '@/components/Karte';

const DATEN = lernkartenDaten as LernkartenDaten;

type FlachKarte = {
  id: string;
  frage: string;
  antwort: string;
  kategorie: string;
};

const KARTEN: FlachKarte[] = DATEN.kategorien.flatMap((k) =>
  k.karten.map((c) => ({ ...c, kategorie: k.name })),
);

export default function KartenBlaetternSeite() {
  const router = useRouter();
  const istClient = useIstClient();
  const [index, setIndex] = useState(0);
  const [antwortSichtbar, setAntwortSichtbar] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  // Markiere die aktuelle Karte als angesehen, sobald sie auf den Bildschirm kommt.
  useEffect(() => {
    if (!istClient) return;
    const karte = KARTEN[index];
    if (karte) markiereKarteAngesehen(karte.id);
  }, [index, istClient]);

  const onVor = useCallback(() => {
    setIndex((i) => Math.min(KARTEN.length - 1, i + 1));
    setAntwortSichtbar(false);
    setAnimKey((k) => k + 1);
  }, []);

  const onZurueck = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setAntwortSichtbar(false);
    setAnimKey((k) => k + 1);
  }, []);

  const onAntwortAnzeigen = useCallback(() => {
    setAntwortSichtbar((v) => !v);
  }, []);

  if (!istClient) {
    return (
      <main className="mx-auto max-w-md safe-area-px safe-area-py w-full">
        <div className="text-slate-500 text-center mt-8">Lädt…</div>
      </main>
    );
  }

  const karte = KARTEN[index];
  const ersteKarte = index === 0;
  const letzteKarte = index === KARTEN.length - 1;

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
          Karte {index + 1} von {KARTEN.length}
        </div>
        <div className="w-12" aria-hidden="true" />
      </div>

      <div className="text-xs text-slate-500 text-right">{karte.kategorie}</div>

      <Karte
        frage={karte.frage}
        antwort={karte.antwort}
        antwortSichtbar={antwortSichtbar}
        onTipp={onAntwortAnzeigen}
        animationKey={`${karte.id}-${animKey}`}
        footer={
          <button
            type="button"
            onClick={onAntwortAnzeigen}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {antwortSichtbar ? 'Antwort verbergen' : 'Antwort anzeigen'}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          type="button"
          onClick={onZurueck}
          disabled={ersteKarte}
          aria-label="Vorherige Karte"
          className="rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          ← Vorherige
        </button>
        <button
          type="button"
          onClick={onVor}
          disabled={letzteKarte}
          aria-label="Nächste Karte"
          className="rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Nächste →
        </button>
      </div>
    </main>
  );
}
