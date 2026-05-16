'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Bewertung, Fortschritt } from '@/lib/typen';
import {
  initialisiereFortschrittAusDaten,
  speichereFortschritt,
} from '@/lib/speicher';
import {
  DATEN,
  KARTEN_INDEX as INDEX,
  ladeOderInitFortschritt,
} from '@/lib/kartenIndex';
import {
  istSessionAbgeschlossen,
  verarbeiteBewertung,
  waehleNaechsteKarte,
} from '@/lib/lernAlgorithmus';
import {
  aktualisiereBewertung,
  erfasseLernzeit,
  markiereKarteAngesehen,
  setzeErstenLerntagFallsNoetig,
} from '@/lib/statistik';
import { heutigesDatum } from '@/lib/datum';
import Karte from '@/components/Karte';
import BewertungButtons from '@/components/BewertungButtons';
import Fortschrittsbalken from '@/components/Fortschrittsbalken';
import GefiltertFertigBanner from '@/components/GefiltertFertigBanner';
import { useIstClient } from '@/lib/sessionStats';
import { useKapitelFilter } from '@/lib/client/useKapitelFilter';
import { speichereLetztenModus } from '@/lib/filterSpeicher';

export default function LernenSeite() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md safe-area-px safe-area-py w-full">
          <div className="text-slate-500 text-center mt-8">Lädt…</div>
        </main>
      }
    >
      <LernenSeiteInner />
    </Suspense>
  );
}

function LernenSeiteInner() {
  const router = useRouter();
  const istClient = useIstClient();
  const { kapitel, reihenfolge, erlaubteIds } = useKapitelFilter();

  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(() => {
    if (typeof window === 'undefined') return null;
    return ladeOderInitFortschritt();
  });
  const [aktuelleId, setAktuelleId] = useState<string | null>(null);
  const [antwortSichtbar, setAntwortSichtbar] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const aufdeckZeitRef = useRef<number | null>(null);

  // Modus für "Weiter lernen" auf der Startseite merken.
  useEffect(() => {
    if (!istClient) return;
    speichereLetztenModus('lernen');
  }, [istClient]);

  // Erste Karte wählen, sobald Client und Filter bereit sind.
  useEffect(() => {
    if (!istClient || !fortschritt) return;
    if (aktuelleId !== null) return;
    if (istSessionAbgeschlossen(fortschritt, erlaubteIds)) return;
    setAktuelleId(waehleNaechsteKarte(fortschritt, reihenfolge));
  }, [istClient, fortschritt, aktuelleId, reihenfolge, erlaubteIds]);

  // Karte als angesehen markieren, sobald sie auf den Bildschirm kommt.
  useEffect(() => {
    if (aktuelleId) markiereKarteAngesehen(aktuelleId);
  }, [aktuelleId]);

  const onAntwortAnzeigen = useCallback(() => {
    if (antwortSichtbar) return;
    aufdeckZeitRef.current = Date.now();
    setAntwortSichtbar(true);
  }, [antwortSichtbar]);

  const onBewerten = useCallback(
    (bewertung: Bewertung) => {
      if (!fortschritt || !aktuelleId) return;
      const heute = heutigesDatum();
      const aufdeck = aufdeckZeitRef.current;
      if (aufdeck !== null) {
        const sek = Math.round((Date.now() - aufdeck) / 1000);
        erfasseLernzeit(sek, heute);
      }
      const { neuerFortschritt, wurdeErledigt } = verarbeiteBewertung(
        fortschritt,
        aktuelleId,
        bewertung,
      );
      aktualisiereBewertung(bewertung, wurdeErledigt, heute);
      setzeErstenLerntagFallsNoetig(heute);
      speichereFortschritt(neuerFortschritt);

      if (istSessionAbgeschlossen(neuerFortschritt, erlaubteIds)) {
        setFortschritt(neuerFortschritt);
        setAktuelleId(null);
        if (!kapitel) {
          router.push('/abschluss');
        }
        return;
      }
      const naechste = waehleNaechsteKarte(neuerFortschritt, reihenfolge);
      setFortschritt(neuerFortschritt);
      setAktuelleId(naechste);
      setAntwortSichtbar(false);
      aufdeckZeitRef.current = null;
      setAnimKey((k) => k + 1);
    },
    [fortschritt, aktuelleId, router, reihenfolge, erlaubteIds, kapitel],
  );

  const onNeueSession = useCallback(() => {
    const f = initialisiereFortschrittAusDaten(DATEN);
    speichereFortschritt(f);
    const naechste = waehleNaechsteKarte(f, reihenfolge);
    setFortschritt(f);
    setAktuelleId(naechste);
    setAntwortSichtbar(false);
    aufdeckZeitRef.current = null;
    setAnimKey((k) => k + 1);
  }, [reihenfolge]);

  if (!istClient || !fortschritt) {
    return (
      <main className="mx-auto max-w-md safe-area-px safe-area-py w-full">
        <div className="text-slate-500 text-center mt-8">Lädt…</div>
      </main>
    );
  }

  const gesamt = kapitel ? reihenfolge.length : INDEX.gesamt;
  const offen = Object.values(fortschritt.karten).filter(
    (k) =>
      k.abfragenBisErledigt > 0 && (!erlaubteIds || erlaubteIds.has(k.id)),
  ).length;
  const erledigt = gesamt - offen;
  const karteDaten = aktuelleId ? INDEX.byId.get(aktuelleId) : null;
  const gefiltertFertig =
    kapitel !== null &&
    aktuelleId === null &&
    istSessionAbgeschlossen(fortschritt, erlaubteIds);

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
        <div className="flex-1 min-w-0">
          <Fortschrittsbalken aktuell={erledigt} gesamt={gesamt} kompakt />
          <div className="text-xs text-slate-500 mt-1 text-center">
            Noch {offen} {offen === 1 ? 'Karte' : 'Karten'}
            {kapitel ? ` · ${kapitel}` : ''}
          </div>
        </div>
      </div>

      {gefiltertFertig ? (
        <GefiltertFertigBanner
          kapitel={kapitel}
          modusPfad="/lernen"
          onFilterEntfernt={() => setAktuelleId(null)}
        />
      ) : karteDaten ? (
        <>
          <div className="text-xs text-slate-500 text-right">
            {karteDaten.kategorie}
          </div>
          <Karte
            frage={karteDaten.frage}
            antwort={karteDaten.antwort}
            antwortSichtbar={antwortSichtbar}
            onTipp={onAntwortAnzeigen}
            animationKey={`${aktuelleId}-${animKey}`}
            footer={
              antwortSichtbar ? (
                <BewertungButtons onBewerten={onBewerten} />
              ) : (
                <button
                  type="button"
                  onClick={onAntwortAnzeigen}
                  className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Antwort anzeigen
                </button>
              )
            }
          />
        </>
      ) : (
        <div className="rounded-2xl bg-white shadow-md p-6 text-center flex flex-col gap-4">
          <p className="text-lg text-slate-700">
            Keine Karten zu lernen. Starte eine neue Session.
          </p>
          <button
            type="button"
            onClick={onNeueSession}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
      )}
    </main>
  );
}
