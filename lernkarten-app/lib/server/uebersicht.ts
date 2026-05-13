// Reine Berechnung von Übersichtskennzahlen für die Nutzerliste.
// Kein File-IO, keine Cookies — kann optional auch im Client genutzt werden.

import type { StatistikSpeicher } from '../typen';
import { berechneStreak, gesamtAbfragen, gesamtLerntage } from '../statistik';
import { heutigesDatum } from '../datum';

export type Uebersicht = {
  lerntageGesamt: number;
  abfragenGesamt: number;
  streak: number;
  karteneErledigt: number;
  angesehen: number;
};

export function berechneUebersicht(
  statistik: StatistikSpeicher,
  heute: string = heutigesDatum(),
): Uebersicht {
  const karteneErledigt = statistik.tage.reduce(
    (acc, t) => acc + t.karteneErledigt,
    0,
  );
  return {
    lerntageGesamt: gesamtLerntage(statistik),
    abfragenGesamt: gesamtAbfragen(statistik),
    streak: berechneStreak(statistik, heute),
    karteneErledigt,
    angesehen: statistik.angeseheneKartenIds.length,
  };
}
