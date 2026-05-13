// Tages-Statistik-Verwaltung mit localStorage.
// Reine Helpers (Streak, Diagramm-Daten) sind ohne Seiteneffekte testbar.

import type { Bewertung, StatistikSpeicher, TagesStatistik } from './typen';
import { datumVorTagen, tageDazwischen } from './datum';

export const STATISTIK_KEY = 'lernkarten_statistik_v1';

/** Leerer Initialspeicher. */
export function leereStatistik(): StatistikSpeicher {
  return { tage: [], ersterLerntag: null, angeseheneKartenIds: [] };
}

function localStorageVerfuegbar(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const ls = window.localStorage;
    if (!ls) return false;
    const testKey = '__lernkarten_statistik_probe__';
    ls.setItem(testKey, '1');
    ls.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function sortiereTageAufsteigend(tage: TagesStatistik[]): TagesStatistik[] {
  return [...tage].sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
}

/**
 * Lädt die Statistik. Bei Fehler oder fehlend: leereStatistik().
 * Stellt sicher, dass tage aufsteigend sortiert sind.
 */
export function ladeStatistik(): StatistikSpeicher {
  if (!localStorageVerfuegbar()) return leereStatistik();
  try {
    const raw = window.localStorage.getItem(STATISTIK_KEY);
    if (raw === null) return leereStatistik();
    const parsed = JSON.parse(raw) as Partial<StatistikSpeicher>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tage)) {
      return leereStatistik();
    }
    return {
      tage: sortiereTageAufsteigend(parsed.tage as TagesStatistik[]),
      ersterLerntag: parsed.ersterLerntag ?? null,
      angeseheneKartenIds: Array.isArray(parsed.angeseheneKartenIds)
        ? [...new Set(parsed.angeseheneKartenIds as string[])]
        : [],
    };
  } catch {
    return leereStatistik();
  }
}

/** JSON-Stringify + setItem; schluckt Fehler. */
export function speichereStatistik(s: StatistikSpeicher): void {
  if (!localStorageVerfuegbar()) return;
  try {
    window.localStorage.setItem(STATISTIK_KEY, JSON.stringify(s));
  } catch {
    // bewusst still
  }
}

/** Entfernt nur den Statistik-Key. */
export function loescheStatistik(): void {
  if (!localStorageVerfuegbar()) return;
  try {
    window.localStorage.removeItem(STATISTIK_KEY);
  } catch {
    // bewusst still
  }
}

/** Erzeugt einen leeren TagesEintrag für ein Datum. */
function leererTag(datum: string): TagesStatistik {
  return {
    datum,
    abfragen: {
      nicht_gewusst: 0,
      wenig_gewusst: 0,
      gut_gewusst: 0,
      perfekt_gewusst: 0,
    },
    abfragenGesamt: 0,
    karteneErledigt: 0,
    lernzeitSekunden: 0,
    sessionsGestartet: 0,
  };
}

/**
 * Liefert den Tages-Eintrag für `heute` aus s.tage oder erzeugt ihn
 * (und fügt ihn sortiert ein). Setzt zudem ersterLerntag, falls null.
 *
 * Mutiert `s` in-place und gibt den Eintrag zurück (zur direkten Bearbeitung).
 */
export function holeOderErzeugeHeute(s: StatistikSpeicher, heute: string): TagesStatistik {
  let eintrag = s.tage.find((t) => t.datum === heute);
  if (!eintrag) {
    eintrag = leererTag(heute);
    s.tage.push(eintrag);
    s.tage.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));
  }
  if (s.ersterLerntag === null) {
    s.ersterLerntag = heute;
  }
  return eintrag;
}

/**
 * Aktualisiert die Statistik nach einer Bewertung.
 * Lädt → modifiziert → speichert.
 */
export function aktualisiereBewertung(
  bewertung: Bewertung,
  wurdeErledigt: boolean,
  heute: string,
): void {
  const s = ladeStatistik();
  const eintrag = holeOderErzeugeHeute(s, heute);
  eintrag.abfragen[bewertung] += 1;
  eintrag.abfragenGesamt += 1;
  if (wurdeErledigt) {
    eintrag.karteneErledigt += 1;
  }
  speichereStatistik(s);
}

/**
 * Addiert Sekunden zur Lernzeit von `heute`.
 * Negative Werte werden auf 0, Werte > 60 auf 60 gekappt (pro Aufruf, also pro Karte).
 */
export function erfasseLernzeit(sekunden: number, heute: string): void {
  const gekappt = Math.min(60, Math.max(0, sekunden));
  if (gekappt === 0) return;
  const s = ladeStatistik();
  const eintrag = holeOderErzeugeHeute(s, heute);
  eintrag.lernzeitSekunden += gekappt;
  speichereStatistik(s);
}

/**
 * Erhöht den Sessions-Zähler von `heute` um 1.
 */
export function erhoeheSessionsZaehler(heute: string): void {
  const s = ladeStatistik();
  const eintrag = holeOderErzeugeHeute(s, heute);
  eintrag.sessionsGestartet += 1;
  speichereStatistik(s);
}

/**
 * Setzt ersterLerntag = heute, falls noch null. Schreibt ggf. zurück.
 */
export function setzeErstenLerntagFallsNoetig(heute: string): void {
  const s = ladeStatistik();
  if (s.ersterLerntag === null) {
    s.ersterLerntag = heute;
    speichereStatistik(s);
  }
}

/**
 * Berechnet den aktuellen Streak: aufeinanderfolgende Tage mit abfragenGesamt > 0,
 * ausgehend von heute. Wenn heute selbst noch keinen Eintrag (oder 0 Abfragen) hat,
 * ist der Streak 0.
 *
 * Beispiel: tage [d-2, d-1, d] alle aktiv → 3. Lücke bricht.
 */
export function berechneStreak(s: StatistikSpeicher, heute: string): number {
  // Mappe Datum → abfragenGesamt für schnellen Lookup.
  const map = new Map<string, number>();
  for (const t of s.tage) {
    map.set(t.datum, t.abfragenGesamt);
  }
  let streak = 0;
  let offset = 0;
  // Starte bei heute. Wenn heute leer/0: kein Streak.
  // Solange aufeinanderfolgende Tage > 0 haben, zähle hoch.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const datum = datumVorTagen(offset, parseIsoZuDate(heute));
    const wert = map.get(datum) ?? 0;
    if (wert > 0) {
      streak += 1;
      offset += 1;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Hilfs-Parse: ISO-String → Date (lokaler Mitternacht), damit datumVorTagen
 * relative Berechnungen vornehmen kann.
 */
function parseIsoZuDate(iso: string): Date {
  const teile = iso.split('-');
  const jahr = Number(teile[0]);
  const monat = Number(teile[1]);
  const tag = Number(teile[2]);
  return new Date(jahr, monat - 1, tag);
}

/**
 * Liefert genau n Tage zurück, endend mit `heute`.
 * Tage ohne Eintrag werden als leerer Tag aufgefüllt.
 */
export function letzteNTage(
  s: StatistikSpeicher,
  n: number,
  heute: string,
): TagesStatistik[] {
  if (n <= 0) return [];
  const map = new Map<string, TagesStatistik>();
  for (const t of s.tage) {
    map.set(t.datum, t);
  }
  const ergebnis: TagesStatistik[] = [];
  const heuteDate = parseIsoZuDate(heute);
  for (let i = n - 1; i >= 0; i -= 1) {
    const datum = datumVorTagen(i, heuteDate);
    ergebnis.push(map.get(datum) ?? leererTag(datum));
  }
  return ergebnis;
}

/** Summe aller abfragenGesamt über alle Tage. */
export function gesamtAbfragen(s: StatistikSpeicher): number {
  return s.tage.reduce((acc, t) => acc + t.abfragenGesamt, 0);
}

/** Anzahl Tage, an denen tatsächlich gelernt wurde (abfragenGesamt > 0). */
export function gesamtLerntage(s: StatistikSpeicher): number {
  return s.tage.filter((t) => t.abfragenGesamt > 0).length;
}

/**
 * Hilfsfunktion (intern verwendet): Tage seit ersterLerntag.
 * Aktuell nicht exportiert; bei Bedarf kann es exportiert werden.
 */
export function tageSeitErstemLerntag(s: StatistikSpeicher, heute: string): number {
  if (!s.ersterLerntag) return 0;
  return tageDazwischen(s.ersterLerntag, heute) + 1;
}

/**
 * Markiert eine Karte als angesehen. Idempotent — doppelte Aufrufe ändern nichts.
 * Persistiert über `loescheFortschritt` hinweg; wird nur durch
 * `loescheStatistik` entfernt.
 */
export function markiereKarteAngesehen(kartenId: string): void {
  const s = ladeStatistik();
  if (s.angeseheneKartenIds.includes(kartenId)) return;
  s.angeseheneKartenIds.push(kartenId);
  speichereStatistik(s);
}

/** Prüft, ob eine Karte bereits angesehen wurde. */
export function istKarteAngesehen(s: StatistikSpeicher, kartenId: string): boolean {
  return s.angeseheneKartenIds.includes(kartenId);
}

/** Anzahl der bereits angesehenen Karten. */
export function anzahlAngesehen(s: StatistikSpeicher): number {
  return s.angeseheneKartenIds.length;
}
