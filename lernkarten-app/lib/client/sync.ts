// Sync-Queue für Schreiboperationen vom Client zum Server.
// Ist KEIN Mehrgeräte-CRDT — bei Konflikten gewinnt der letzte Write.
// Für den Familien-/Klassen-Anwendungsfall reicht das.

import type { Fortschritt, StatistikSpeicher } from '../typen';
import { apiPushFortschritt, apiPushStatistik } from './api';

let angemeldet = false;

/** Wird vom SitzungsProvider gesetzt, sobald wir wissen, wer eingeloggt ist. */
export function markiereAngemeldet(istAngemeldet: boolean): void {
  angemeldet = istAngemeldet;
}

export function istAngemeldet(): boolean {
  return angemeldet;
}

// Pro Datentyp eine Queue, damit aufeinanderfolgende Writes nicht race-condition-fail.
let fortschrittKette: Promise<unknown> = Promise.resolve();
let statistikKette: Promise<unknown> = Promise.resolve();

export function pushFortschritt(f: Fortschritt | null): void {
  if (!angemeldet) return;
  if (typeof window === 'undefined') return;
  fortschrittKette = fortschrittKette.then(() =>
    apiPushFortschritt(f).catch((err) => {
      // Fehler nicht laut werden lassen; Local-First-Modell: localStorage ist die UI-Quelle.
      console.warn('Konnte Fortschritt nicht an Server senden:', err);
    }),
  );
}

export function pushStatistik(s: StatistikSpeicher): void {
  if (!angemeldet) return;
  if (typeof window === 'undefined') return;
  statistikKette = statistikKette.then(() =>
    apiPushStatistik(s).catch((err) => {
      console.warn('Konnte Statistik nicht an Server senden:', err);
    }),
  );
}
