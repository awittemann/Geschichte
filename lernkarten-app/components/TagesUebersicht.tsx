'use client';

import type { TagesStatistik } from '@/lib/typen';

type Props = {
  tagesStatistik: TagesStatistik | null;
  streak: number;
};

/**
 * Kompakte „Heute"-Karte für die Startseite.
 * Zeigt 3 Kennzahlen (Abfragen, Erledigt, Minuten) und optional einen Streak-Hinweis.
 * Wenn heute keinen Eintrag oder 0 Abfragen: stattdessen freundlicher Hinweis.
 */
export default function TagesUebersicht({ tagesStatistik, streak }: Props) {
  const hatAktivitaet =
    tagesStatistik !== null && tagesStatistik.abfragenGesamt > 0;
  const minuten = tagesStatistik
    ? Math.round(tagesStatistik.lernzeitSekunden / 60)
    : 0;
  return (
    <section
      aria-label="Heute"
      className="rounded-2xl bg-white shadow-sm p-4"
    >
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
        Heute
      </h2>
      {hatAktivitaet ? (
        <>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Kennzahl
              wert={tagesStatistik.abfragenGesamt}
              label="Abfragen"
            />
            <Kennzahl
              wert={tagesStatistik.karteneErledigt}
              label="Erledigt"
            />
            <Kennzahl wert={minuten} label="Minuten" />
          </div>
          {streak >= 2 ? (
            <p className="mt-3 text-sm text-slate-700">
              <span aria-hidden="true">🔥</span> {streak} Tage in Folge gelernt
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-base text-slate-600">
          Noch keine Aktivität heute – los geht&apos;s!
        </p>
      )}
    </section>
  );
}

function Kennzahl({ wert, label }: { wert: number; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-2xl font-bold text-slate-900 tabular-nums">
        {wert}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
