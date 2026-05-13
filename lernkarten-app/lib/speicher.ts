// SSR-sicherer localStorage-Wrapper für den Karten-Fortschritt.
// Statistik-Schlüssel werden hier NICHT angefasst.

import type {
  Fortschritt,
  KartenStatus,
  LernkartenDaten,
} from './typen';

export const FORTSCHRITT_KEY = 'lernkarten_fortschritt_v1';

/**
 * Prüft, ob localStorage existiert UND beschreibbar ist.
 * Berücksichtigt: Server (typeof window === 'undefined'), privater Modus, Quota.
 */
export function localStorageVerfuegbar(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const ls = window.localStorage;
    if (!ls) return false;
    const testKey = '__lernkarten_probe__';
    ls.setItem(testKey, '1');
    ls.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lädt den Karten-Fortschritt aus localStorage.
 * Bei Fehler oder ungültigem Inhalt: null.
 */
export function ladeFortschritt(): Fortschritt | null {
  if (!localStorageVerfuegbar()) return null;
  try {
    const raw = window.localStorage.getItem(FORTSCHRITT_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<Fortschritt>;
    if (!parsed || typeof parsed !== 'object' || !parsed.karten) {
      return null;
    }
    return {
      karten: parsed.karten as Record<string, KartenStatus>,
      zuletztGezeigteId: parsed.zuletztGezeigteId ?? null,
      sessionStart: parsed.sessionStart ?? null,
      ersteBewertungen: parsed.ersteBewertungen ?? {},
    };
  } catch {
    return null;
  }
}

/**
 * Schreibt den Karten-Fortschritt; schluckt Fehler.
 */
export function speichereFortschritt(f: Fortschritt): void {
  if (!localStorageVerfuegbar()) return;
  try {
    window.localStorage.setItem(FORTSCHRITT_KEY, JSON.stringify(f));
  } catch {
    // bewusst still
  }
}

/**
 * Entfernt NUR den Karten-Stapel-Key.
 * Die Statistik (`lernkarten_statistik_v1`) bleibt unangetastet.
 */
export function loescheFortschritt(): void {
  if (!localStorageVerfuegbar()) return;
  try {
    window.localStorage.removeItem(FORTSCHRITT_KEY);
  } catch {
    // bewusst still
  }
}

/**
 * Erzeugt einen frischen Fortschritt aus den Lernkarten-Daten:
 * Alle Karten beginnen mit abfragenBisErledigt = 1.
 */
export function initialisiereFortschrittAusDaten(daten: LernkartenDaten): Fortschritt {
  const karten: Record<string, KartenStatus> = {};
  for (const kategorie of daten.kategorien) {
    for (const karte of kategorie.karten) {
      karten[karte.id] = {
        id: karte.id,
        letzteBewertung: null,
        abfragenBisErledigt: 1,
        anzahlAbfragen: 0,
      };
    }
  }
  return {
    karten,
    zuletztGezeigteId: null,
    sessionStart: Date.now(),
    ersteBewertungen: {},
  };
}
