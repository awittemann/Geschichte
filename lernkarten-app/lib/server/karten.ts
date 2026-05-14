// Serverseitiger Karten-Lookup. Die Lernkarten-Daten sind statisch und
// werden ins Bundle eingebettet — so kann der Server Frage & Musterlösung
// autoritativ auflösen, ohne der Client-Eingabe vertrauen zu müssen.

import lernkartenDaten from '@/data/lernkarten.json';
import type { LernkartenDaten } from '@/lib/typen';

const DATEN = lernkartenDaten as LernkartenDaten;

export type ServerKarte = {
  id: string;
  frage: string;
  antwort: string;
  kategorie: string;
};

const KARTEN = new Map<string, ServerKarte>();
for (const kat of DATEN.kategorien) {
  for (const k of kat.karten) {
    KARTEN.set(k.id, {
      id: k.id,
      frage: k.frage,
      antwort: k.antwort,
      kategorie: kat.name,
    });
  }
}

/** Sucht eine Karte anhand ihrer ID. Liefert null, wenn unbekannt. */
export function findeKarte(id: string): ServerKarte | null {
  return KARTEN.get(id) ?? null;
}
