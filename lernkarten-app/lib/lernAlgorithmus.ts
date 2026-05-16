// Reine Logik für den Lern-Algorithmus.
// Keine localStorage-Zugriffe, keine Date-Calls, keine Random-Calls ohne Override.

import type { Bewertung, Fortschritt, KartenStatus } from './typen';

/**
 * Mapping Bewertung → neuer Wert für abfragenBisErledigt.
 * EXAKT laut Spec — bitte nicht "intuitiv intelligenter" machen.
 */
export const BEWERTUNG_ZU_ABFRAGEN: Record<Bewertung, number> = {
  nicht_gewusst: 4,
  wenig_gewusst: 3,
  gut_gewusst: 2,
  perfekt_gewusst: 0,
};

/**
 * Alle Karten, die noch mindestens einmal abgefragt werden müssen.
 * Mit optionalem `erlaubteIds`-Set werden nur Karten dieser Teilmenge berücksichtigt.
 */
export function offeneKarten(
  f: Fortschritt,
  erlaubteIds?: Set<string>,
): KartenStatus[] {
  return Object.values(f.karten).filter(
    (k) =>
      k.abfragenBisErledigt > 0 && (!erlaubteIds || erlaubteIds.has(k.id)),
  );
}

/**
 * Session ist abgeschlossen, sobald alle Karten 0 erreicht haben.
 * Bei leerem Stapel (keine Karten) ist die Session per Definition NICHT abgeschlossen,
 * weil noch nichts initialisiert wurde. Mit `erlaubteIds` scoped auf eine Teilmenge.
 */
export function istSessionAbgeschlossen(
  f: Fortschritt,
  erlaubteIds?: Set<string>,
): boolean {
  const werte = erlaubteIds
    ? Object.values(f.karten).filter((k) => erlaubteIds.has(k.id))
    : Object.values(f.karten);
  if (werte.length === 0) return false;
  return werte.every((k) => k.abfragenBisErledigt === 0);
}

/**
 * Anzahl Karten, die bereits erledigt (abfragenBisErledigt === 0) sind.
 * Mit `erlaubteIds` scoped auf eine Teilmenge.
 */
export function anzahlErledigt(
  f: Fortschritt,
  erlaubteIds?: Set<string>,
): number {
  return Object.values(f.karten).filter(
    (k) =>
      k.abfragenBisErledigt === 0 && (!erlaubteIds || erlaubteIds.has(k.id)),
  ).length;
}

/**
 * Wählt die nächste abzufragende Karte.
 *
 * Phase 1 — Themen-Reihenfolge: Solange Karten existieren, die noch nie
 * abgefragt wurden (`anzahlAbfragen === 0`), wird die nächste in der
 * übergebenen `reihenfolge` zurückgegeben. So werden Themen zusammenhängend
 * eingelernt.
 *
 * Phase 2 — Wiederholung: Sobald jede Karte mindestens einmal abgefragt
 * wurde, wird zufällig aus den noch offenen Karten gewählt; `zuletztGezeigteId`
 * wird vermieden, außer es ist die einzige verbleibende.
 *
 * @param reihenfolge Geordnete Karten-IDs für Phase 1 (Default `[]` → direkt Phase 2).
 * @param zufall Optionaler RNG (für deterministische Tests). Default: Math.random.
 */
export function waehleNaechsteKarte(
  f: Fortschritt,
  reihenfolge: string[] = [],
  zufall: () => number = Math.random,
): string | null {
  // Phase 1: nächste noch nie gesehene, noch offene Karte in Themen-Reihenfolge.
  for (const id of reihenfolge) {
    const k = f.karten[id];
    if (k && k.anzahlAbfragen === 0 && k.abfragenBisErledigt > 0) {
      return id;
    }
  }
  // Phase 2: zufällige Auswahl aus den noch offenen Karten. Wenn eine
  // Reihenfolge übergeben wurde, wird auf genau diese Teilmenge eingeschränkt
  // (relevant für Kapitel-Filter); ohne Reihenfolge bleibt das alte Verhalten.
  const erlaubt = reihenfolge.length > 0 ? new Set(reihenfolge) : undefined;
  const offen = offeneKarten(f, erlaubt);
  if (offen.length === 0) return null;
  let kandidaten = offen;
  if (f.zuletztGezeigteId !== null && offen.length > 1) {
    const gefiltert = offen.filter((k) => k.id !== f.zuletztGezeigteId);
    if (gefiltert.length > 0) {
      kandidaten = gefiltert;
    }
  }
  const idx = Math.floor(zufall() * kandidaten.length);
  // Math.floor kann theoretisch length erreichen, wenn zufall() exakt 1 zurückgibt
  const sicherer = Math.min(idx, kandidaten.length - 1);
  return kandidaten[sicherer].id;
}

/**
 * Verarbeitet eine Bewertung für die angegebene Karte.
 * Setzt abfragenBisErledigt NEU (nicht dekrementieren!).
 * Liefert einen NEUEN Fortschritt zurück (immutabel) plus die Info,
 * ob die Karte durch diese Bewertung erledigt wurde (von >0 auf 0).
 */
export function verarbeiteBewertung(
  f: Fortschritt,
  kartenId: string,
  bewertung: Bewertung,
): { neuerFortschritt: Fortschritt; wurdeErledigt: boolean } {
  const alt = f.karten[kartenId];
  if (!alt) {
    // Unbekannte ID — Fortschritt unverändert lassen.
    return { neuerFortschritt: f, wurdeErledigt: false };
  }
  const neuerWert = BEWERTUNG_ZU_ABFRAGEN[bewertung];
  const wurdeErledigt = alt.abfragenBisErledigt > 0 && neuerWert === 0;

  const aktualisierteKarte: KartenStatus = {
    ...alt,
    letzteBewertung: bewertung,
    abfragenBisErledigt: neuerWert,
    anzahlAbfragen: alt.anzahlAbfragen + 1,
  };

  const neueErsteBewertungen = { ...f.ersteBewertungen };
  if (!(kartenId in neueErsteBewertungen)) {
    neueErsteBewertungen[kartenId] = bewertung;
  }

  const neuerFortschritt: Fortschritt = {
    ...f,
    karten: {
      ...f.karten,
      [kartenId]: aktualisierteKarte,
    },
    zuletztGezeigteId: kartenId,
    ersteBewertungen: neueErsteBewertungen,
  };

  return { neuerFortschritt, wurdeErledigt };
}

/**
 * Leitet aus einem `abfragenBisErledigt`-Wert eine passende Bewertungsstufe ab.
 * Wird im Multiple-Choice-Modus genutzt, damit Statistik und `letzteBewertung`
 * konsistent zum bestehenden 4-Stufen-Modell bleiben.
 */
export function bewertungFuerAbfragen(abfragenBisErledigt: number): Bewertung {
  if (abfragenBisErledigt <= 0) return 'perfekt_gewusst';
  if (abfragenBisErledigt <= 2) return 'gut_gewusst';
  if (abfragenBisErledigt <= 3) return 'wenig_gewusst';
  return 'nicht_gewusst';
}

/**
 * Verarbeitet eine Multiple-Choice-Antwort.
 * - Richtige Auswahl: Karte wird eine Stufe besser (`abfragenBisErledigt` − 1, min. 0).
 * - Falsche Auswahl: Karte wird eine Stufe schlechter (`abfragenBisErledigt` + 1, max. 4).
 *
 * Liefert einen NEUEN Fortschritt (immutabel), die Info ob die Karte dadurch
 * erledigt wurde (von >0 auf 0) sowie die abgeleitete Bewertungsstufe — damit
 * der Aufrufer Statistik wie gewohnt mit `aktualisiereBewertung` führen kann.
 */
export function verarbeiteMultipleChoice(
  f: Fortschritt,
  kartenId: string,
  richtig: boolean,
): { neuerFortschritt: Fortschritt; wurdeErledigt: boolean; bewertung: Bewertung } {
  const alt = f.karten[kartenId];
  if (!alt) {
    // Unbekannte ID — Fortschritt unverändert lassen.
    return { neuerFortschritt: f, wurdeErledigt: false, bewertung: 'nicht_gewusst' };
  }
  const delta = richtig ? -1 : 1;
  const neuerWert = Math.min(4, Math.max(0, alt.abfragenBisErledigt + delta));
  const wurdeErledigt = alt.abfragenBisErledigt > 0 && neuerWert === 0;
  const bewertung = bewertungFuerAbfragen(neuerWert);

  const aktualisierteKarte: KartenStatus = {
    ...alt,
    letzteBewertung: bewertung,
    abfragenBisErledigt: neuerWert,
    anzahlAbfragen: alt.anzahlAbfragen + 1,
  };

  const neueErsteBewertungen = { ...f.ersteBewertungen };
  if (!(kartenId in neueErsteBewertungen)) {
    neueErsteBewertungen[kartenId] = bewertung;
  }

  const neuerFortschritt: Fortschritt = {
    ...f,
    karten: {
      ...f.karten,
      [kartenId]: aktualisierteKarte,
    },
    zuletztGezeigteId: kartenId,
    ersteBewertungen: neueErsteBewertungen,
  };

  return { neuerFortschritt, wurdeErledigt, bewertung };
}
