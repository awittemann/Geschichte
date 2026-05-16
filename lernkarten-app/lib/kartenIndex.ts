// Gemeinsamer Karten-Index und Session-Init für die Lern-Modi.
// Wird sowohl von /lernen (Karte umdrehen) als auch von /abfrage
// (Antwort eingeben) genutzt, damit beide dieselbe Reihenfolge und
// denselben Fortschritt teilen.

import lernkartenDaten from '@/data/lernkarten.json';
import type { Fortschritt, LernkartenDaten } from './typen';
import {
  initialisiereFortschrittAusDaten,
  ladeFortschritt,
  speichereFortschritt,
} from './speicher';

export const DATEN = lernkartenDaten as LernkartenDaten;

export type KartenIndex = {
  byId: Map<string, { frage: string; antwort: string; kategorie: string }>;
  gesamt: number;
  reihenfolge: string[];
};

function baueIndex(daten: LernkartenDaten): KartenIndex {
  const byId = new Map<
    string,
    { frage: string; antwort: string; kategorie: string }
  >();
  const reihenfolge: string[] = [];
  let gesamt = 0;
  for (const kat of daten.kategorien) {
    for (const k of kat.karten) {
      byId.set(k.id, {
        frage: k.frage,
        antwort: k.antwort,
        kategorie: kat.name,
      });
      reihenfolge.push(k.id);
      gesamt += 1;
    }
  }
  return { byId, gesamt, reihenfolge };
}

// Die Daten sind statisch — Index einmal beim Modulladen bauen, statt pro Mount.
export const KARTEN_INDEX: KartenIndex = baueIndex(DATEN);

/** Namen aller Kapitel in Quell-Reihenfolge. */
export const ALLE_KATEGORIEN: string[] = DATEN.kategorien.map((k) => k.name);

/**
 * IDs aller Karten einer Kategorie in Quell-Reihenfolge. `null` liefert alle IDs.
 * Wird vom Quiz-Modus genutzt, um den Algorithmus auf ein einzelnes Kapitel zu
 * scopen, ohne den globalen Fortschritt zu ändern.
 */
export function reihenfolgeFuerKategorie(name: string | null): string[] {
  if (!name) return KARTEN_INDEX.reihenfolge;
  const kategorie = DATEN.kategorien.find((k) => k.name === name);
  if (!kategorie) return KARTEN_INDEX.reihenfolge;
  return kategorie.karten.map((k) => k.id);
}

/**
 * Lädt den Fortschritt aus localStorage oder initialisiert einen neuen.
 * Reaktiviert außerdem eine pausierte Session (sessionStart === null).
 * Nur auf dem Client aufrufen.
 */
export function ladeOderInitFortschritt(): Fortschritt {
  let f = ladeFortschritt();
  if (!f) {
    f = initialisiereFortschrittAusDaten(DATEN);
    speichereFortschritt(f);
  } else if (f.sessionStart === null) {
    f = { ...f, sessionStart: Date.now() };
    speichereFortschritt(f);
  }
  return f;
}
