// Reine Logik: KI-Score (1–100) → bestehende Bewertungsstufe.
// Keine Seiteneffekte. Hält die KI-Bewertung kompatibel mit dem
// vorhandenen Lern-Algorithmus (siehe lernAlgorithmus.ts).

import type { Bewertung } from './typen';

/**
 * Obergrenzen je Stufe (inklusiv). Ein Score bis einschließlich des
 * Wertes fällt in die jeweilige Stufe; alles darüber ist „perfekt".
 *
 *   1–40  → nicht_gewusst   (4× wiederholen)
 *  41–65  → wenig_gewusst   (3× wiederholen)
 *  66–85  → gut_gewusst     (2× wiederholen)
 *  86–100 → perfekt_gewusst (erledigt)
 */
export const SCORE_SCHWELLEN: { bis: number; bewertung: Bewertung }[] = [
  { bis: 40, bewertung: 'nicht_gewusst' },
  { bis: 65, bewertung: 'wenig_gewusst' },
  { bis: 85, bewertung: 'gut_gewusst' },
];

/** Begrenzt einen beliebigen Zahlenwert auf den gültigen Score-Bereich 1–100. */
export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 1;
  return Math.min(100, Math.max(1, Math.round(score)));
}

/**
 * Bildet einen KI-Score (1–100) auf eine der vier Bewertungsstufen ab.
 * Werte außerhalb 1–100 werden vorher geclampt.
 */
export function scoreZuBewertung(score: number): Bewertung {
  const s = clampScore(score);
  for (const { bis, bewertung } of SCORE_SCHWELLEN) {
    if (s <= bis) return bewertung;
  }
  return 'perfekt_gewusst';
}
