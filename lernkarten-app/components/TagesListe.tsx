'use client';

import type { TagesStatistik } from '@/lib/typen';
import { formatiereDatum } from '@/lib/datum';

type Props = {
  tage: TagesStatistik[];
};

/**
 * Chronologisch absteigende Liste aller Tage mit Aktivität.
 * Pro Eintrag: Datum, Abfragen, Minuten, Erledigt, Mini-Verteilungsbalken.
 */
export default function TagesListe({ tage }: Props) {
  const aktive = tage
    .filter((t) => t.abfragenGesamt > 0)
    .slice()
    .sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0));

  if (aktive.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-4 text-sm text-slate-600">
        Noch keine Lerntage – starte deine erste Session!
      </div>
    );
  }

  return (
    <ul className="rounded-2xl bg-white shadow-sm divide-y divide-slate-100">
      {aktive.map((t) => {
        const minuten = Math.round(t.lernzeitSekunden / 60);
        return (
          <li key={t.datum} className="p-4 flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold text-slate-900">
                {formatiereDatum(t.datum)}
              </span>
              <span className="text-xs text-slate-500">{t.datum}</span>
            </div>
            <div className="text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
              <span>{t.abfragenGesamt} Abfragen</span>
              <span>{minuten} Min</span>
              <span>{t.karteneErledigt} erledigt</span>
            </div>
            <VerteilungsBalken tag={t} />
          </li>
        );
      })}
    </ul>
  );
}

function VerteilungsBalken({ tag }: { tag: TagesStatistik }) {
  const gesamt = tag.abfragenGesamt;
  if (gesamt === 0) return null;
  const segmente: { farbe: string; anteil: number; label: string }[] = [
    {
      farbe: 'bg-red-500',
      anteil: tag.abfragen.nicht_gewusst / gesamt,
      label: `${tag.abfragen.nicht_gewusst} nicht gewusst`,
    },
    {
      farbe: 'bg-orange-500',
      anteil: tag.abfragen.wenig_gewusst / gesamt,
      label: `${tag.abfragen.wenig_gewusst} ein bisschen gewusst`,
    },
    {
      farbe: 'bg-yellow-400',
      anteil: tag.abfragen.gut_gewusst / gesamt,
      label: `${tag.abfragen.gut_gewusst} gut gewusst`,
    },
    {
      farbe: 'bg-green-600',
      anteil: tag.abfragen.perfekt_gewusst / gesamt,
      label: `${tag.abfragen.perfekt_gewusst} perfekt gewusst`,
    },
  ];
  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden flex bg-slate-100"
      role="img"
      aria-label={segmente.map((s) => s.label).join(', ')}
    >
      {segmente.map((s, i) =>
        s.anteil > 0 ? (
          <div
            key={i}
            className={s.farbe}
            style={{ width: `${s.anteil * 100}%` }}
            title={s.label}
          />
        ) : null,
      )}
    </div>
  );
}
