'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Fortschritt } from '@/lib/typen';
import { initialisiereFortschrittAusDaten, speichereFortschritt } from '@/lib/speicher';
import {
  DATEN,
  KARTEN_INDEX as INDEX,
  ladeOderInitFortschritt,
} from '@/lib/kartenIndex';
import {
  istSessionAbgeschlossen,
  verarbeiteMultipleChoice,
  waehleNaechsteKarte,
} from '@/lib/lernAlgorithmus';
import { baueOptionen, type MCOption } from '@/lib/multipleChoice';
import {
  aktualisiereBewertung,
  erfasseLernzeit,
  markiereKarteAngesehen,
  setzeErstenLerntagFallsNoetig,
} from '@/lib/statistik';
import { heutigesDatum } from '@/lib/datum';
import { useIstClient } from '@/lib/sessionStats';
import { useKapitelFilter } from '@/lib/client/useKapitelFilter';
import Fortschrittsbalken from '@/components/Fortschrittsbalken';
import GefiltertFertigBanner from '@/components/GefiltertFertigBanner';
import distraktorenDaten from '@/data/distraktoren.json';

const POOL = (distraktorenDaten as { distraktoren: Record<string, string[]> })
  .distraktoren;

function holePool(id: string): string[] {
  return POOL[id] ?? [];
}

/** Antworten aller anderen Karten — Notnagel, falls der Pool zu klein ist. */
function holeFallback(id: string): string[] {
  const out: string[] = [];
  for (const otherId of INDEX.reihenfolge) {
    if (otherId === id) continue;
    const k = INDEX.byId.get(otherId);
    if (k) out.push(k.antwort);
  }
  return out;
}

type Aktuell = {
  id: string;
  frage: string;
  kategorie: string;
  optionen: MCOption[];
} | null;

function baueAktuell(f: Fortschritt, reihenfolge: string[]): Aktuell {
  const id = waehleNaechsteKarte(f, reihenfolge);
  if (!id) return null;
  const karte = INDEX.byId.get(id);
  if (!karte) return null;
  return {
    id,
    frage: karte.frage,
    kategorie: karte.kategorie,
    optionen: baueOptionen(karte.antwort, holePool(id), holeFallback(id)),
  };
}

export default function MultipleChoiceSeite() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md safe-area-px safe-area-py w-full">
          <div className="text-slate-500 text-center mt-8">Lädt…</div>
        </main>
      }
    >
      <MultipleChoiceSeiteInner />
    </Suspense>
  );
}

function MultipleChoiceSeiteInner() {
  const router = useRouter();
  const istClient = useIstClient();
  const { kapitel, reihenfolge, erlaubteIds } = useKapitelFilter();

  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(() => {
    if (typeof window === 'undefined') return null;
    return ladeOderInitFortschritt();
  });
  const [aktuell, setAktuell] = useState<Aktuell>(null);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const startZeitRef = useRef<number>(0);

  // Erste Karte erzeugen, sobald Client und Filter bereit sind.
  useEffect(() => {
    if (!istClient || !fortschritt) return;
    if (aktuell !== null) return;
    if (istSessionAbgeschlossen(fortschritt, erlaubteIds)) return;
    setAktuell(baueAktuell(fortschritt, reihenfolge));
  }, [istClient, fortschritt, aktuell, reihenfolge, erlaubteIds]);

  useEffect(() => {
    if (aktuell) markiereKarteAngesehen(aktuell.id);
    startZeitRef.current = Date.now();
  }, [aktuell]);

  const onAuswahl = useCallback(
    (index: number) => {
      if (!fortschritt || !aktuell || gewaehlt !== null) return;
      const option = aktuell.optionen[index];
      if (!option) return;
      setGewaehlt(index);

      const heute = heutigesDatum();
      const sek = Math.round((Date.now() - startZeitRef.current) / 1000);
      erfasseLernzeit(sek, heute);

      const { neuerFortschritt, wurdeErledigt, bewertung } =
        verarbeiteMultipleChoice(fortschritt, aktuell.id, option.istRichtig);
      aktualisiereBewertung(bewertung, wurdeErledigt, heute);
      setzeErstenLerntagFallsNoetig(heute);
      speichereFortschritt(neuerFortschritt);
      setFortschritt(neuerFortschritt);
    },
    [fortschritt, aktuell, gewaehlt],
  );

  const onNaechste = useCallback(() => {
    if (!fortschritt) return;
    if (istSessionAbgeschlossen(fortschritt, erlaubteIds)) {
      setAktuell(null);
      if (!kapitel) {
        router.push('/abschluss');
      }
      return;
    }
    setAktuell(baueAktuell(fortschritt, reihenfolge));
    setGewaehlt(null);
    setAnimKey((k) => k + 1);
  }, [fortschritt, router, reihenfolge, erlaubteIds, kapitel]);

  const onNeueSession = useCallback(() => {
    const f = initialisiereFortschrittAusDaten(DATEN);
    speichereFortschritt(f);
    setFortschritt(f);
    setAktuell(baueAktuell(f, reihenfolge));
    setGewaehlt(null);
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
  const beantwortet = gewaehlt !== null;
  const richtigGewaehlt =
    beantwortet && aktuell?.optionen[gewaehlt]?.istRichtig === true;
  const gefiltertFertig =
    kapitel !== null &&
    aktuell === null &&
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
          modusPfad="/multiple-choice"
          onFilterEntfernt={() => setAktuell(null)}
        />
      ) : aktuell ? (
        <div
          key={`${aktuell.id}-${animKey}`}
          className="anim-slide-in flex flex-col gap-4"
        >
          <div className="text-xs text-slate-500 text-right">
            {aktuell.kategorie}
          </div>

          <div className="rounded-2xl bg-white shadow-md p-6">
            <div className="text-xl text-slate-900 leading-relaxed whitespace-pre-line">
              {aktuell.frage}
            </div>
          </div>

          <div
            className="flex flex-col gap-2"
            role="group"
            aria-label="Antwortmöglichkeiten"
          >
            {aktuell.optionen.map((o, i) => {
              let klassen =
                'bg-white border-slate-300 text-slate-900 hover:border-blue-400 hover:bg-slate-50';
              let marke: string | null = null;
              if (beantwortet) {
                if (o.istRichtig) {
                  klassen = 'bg-green-50 border-green-500 text-green-900';
                  marke = '✓';
                } else if (i === gewaehlt) {
                  klassen = 'bg-red-50 border-red-400 text-red-900';
                  marke = '✗';
                } else {
                  klassen = 'bg-white border-slate-200 text-slate-400';
                }
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAuswahl(i)}
                  disabled={beantwortet}
                  className={`w-full rounded-xl border p-4 text-left text-base leading-relaxed whitespace-pre-line transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-default ${klassen}`}
                >
                  {marke ? (
                    <span className="font-bold mr-1.5" aria-hidden="true">
                      {marke}
                    </span>
                  ) : null}
                  {o.text}
                </button>
              );
            })}
          </div>

          {beantwortet ? (
            <>
              <p
                className={`rounded-xl px-4 py-3 text-sm ${
                  richtigGewaehlt
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-amber-50 border border-amber-200 text-amber-900'
                }`}
                aria-live="polite"
              >
                {richtigGewaehlt
                  ? 'Richtig! Die Karte ist jetzt eine Stufe besser.'
                  : 'Leider falsch. Die richtige Antwort ist grün markiert — die Karte kommt jetzt eine Stufe häufiger dran.'}
              </p>
              <button
                type="button"
                onClick={onNaechste}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Nächste Karte
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-400 text-center">
              Wähle die richtige Antwort.
            </p>
          )}
        </div>
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
