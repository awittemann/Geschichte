'use client';

import { useMemo, useState } from 'react';
import type { TagesStatistik } from '@/lib/typen';
import { formatiereDatum, heutigesDatum, wochentagKurz } from '@/lib/datum';

type Props = {
  tage: TagesStatistik[];
};

/**
 * 14-Tage-Balkendiagramm OHNE externe Library.
 * - Heutiger Balken: dunkleres Blau, andere bg-blue-400.
 * - Tage ohne Aktivität: dünne Linie (h-1).
 * - Tap auf Balken: zeigt unterhalb des Diagramms einen Detail-Bereich.
 */
export default function TagesDiagramm({ tage }: Props) {
  const heute = heutigesDatum();
  // Default-Auswahl: heutiger Tag, sonst der letzte aktive Tag.
  const initialIndex = useMemo(() => {
    const heuteIdx = tage.findIndex((t) => t.datum === heute);
    if (heuteIdx >= 0) return heuteIdx;
    for (let i = tage.length - 1; i >= 0; i -= 1) {
      if (tage[i].abfragenGesamt > 0) return i;
    }
    return null;
  }, [tage, heute]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    initialIndex,
  );
  const max = tage.reduce(
    (acc, t) => (t.abfragenGesamt > acc ? t.abfragenGesamt : acc),
    0,
  );
  const ausgewaehlt =
    selectedIndex !== null && selectedIndex >= 0 && selectedIndex < tage.length
      ? tage[selectedIndex]
      : null;

  return (
    <div className="rounded-2xl bg-white shadow-sm p-4">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Letzte 14 Tage
      </h2>
      <div className="flex items-stretch gap-1 h-32">
        {tage.map((t, i) => {
          const istHeute = t.datum === heute;
          const aktiv = t.abfragenGesamt > 0;
          const hoehe = aktiv && max > 0 ? (t.abfragenGesamt / max) * 100 : 0;
          // Mindesthöhe für aktive Balken (5 %), damit auch ein einzelner Tag sichtbar bleibt.
          const angezeigteHoehe = aktiv ? Math.max(5, hoehe) : 0;
          const farbe = istHeute ? 'bg-blue-700' : 'bg-blue-400';
          const istSelektiert = selectedIndex === i;
          return (
            <button
              key={t.datum}
              type="button"
              onClick={() =>
                setSelectedIndex((prev) => (prev === i ? null : i))
              }
              aria-label={`${formatiereDatum(t.datum)}: ${t.abfragenGesamt} Abfragen`}
              aria-pressed={istSelektiert}
              className="flex-1 h-full flex flex-col justify-end items-center group focus:outline-none"
            >
              {aktiv ? (
                <div
                  className={`w-full rounded-t ${farbe} ${
                    istSelektiert ? 'ring-2 ring-blue-900' : ''
                  } transition-all`}
                  style={{ height: `${angezeigteHoehe}%` }}
                />
              ) : (
                <div
                  className={`w-full h-1 ${
                    istSelektiert ? 'bg-slate-400' : 'bg-slate-200'
                  } rounded`}
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1 mt-2" aria-hidden="true">
        {tage.map((t) => (
          <div
            key={`${t.datum}-label`}
            className="flex-1 text-center text-[10px] text-slate-500"
          >
            {wochentagKurz(t.datum)}
          </div>
        ))}
      </div>
      {ausgewaehlt ? (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">
            {formatiereDatum(ausgewaehlt.datum)}
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2">
            <DetailZahl wert={ausgewaehlt.abfragenGesamt} label="Abfragen" />
            <DetailZahl
              wert={Math.round(ausgewaehlt.lernzeitSekunden / 60)}
              label="Minuten"
            />
            <DetailZahl wert={ausgewaehlt.karteneErledigt} label="Erledigt" />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Tippe auf einen Balken für Details.
        </p>
      )}
    </div>
  );
}

function DetailZahl({ wert, label }: { wert: number; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="text-lg font-bold text-slate-900 tabular-nums">{wert}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
