// Kleine Hilfs-Funktionen, die der UI-Schicht (Agent 3) gehören.
// Bewusst NICHT in den Kern-Modulen (Agent 2), weil sie nur aggregieren.

import { useSyncExternalStore } from 'react';
import type { Bewertung, Fortschritt } from './typen';

/**
 * Hook für SSR-sicheres Mount-Flag.
 * - Server: false (kein Window).
 * - Client nach Hydration: true.
 * Vermeidet Hydration-Mismatch ohne setState-in-effect-Lint.
 */
const mountedSubscribe = () => () => {};
const mountedClient = () => true;
const mountedServer = () => false;
export function useIstClient(): boolean {
  return useSyncExternalStore(
    mountedSubscribe,
    mountedClient,
    mountedServer,
  );
}

/** Summe aller anzahlAbfragen-Werte über alle Karten der aktuellen Session. */
export function sessionAbfragenGesamt(f: Fortschritt): number {
  return Object.values(f.karten).reduce(
    (acc, k) => acc + k.anzahlAbfragen,
    0,
  );
}

/** Anzahl Karten, die mit einer bestimmten Bewertung erstmalig in der Session bewertet wurden. */
export function sessionErsteBewertungenAnzahl(
  f: Fortschritt,
  bewertung: Bewertung,
): number {
  return Object.values(f.ersteBewertungen).filter((b) => b === bewertung).length;
}

/** Dauer der Session in Minuten (gerundet). Wenn kein Start: 0. */
export function sessionDauerMinuten(f: Fortschritt, jetzt: number = Date.now()): number {
  if (!f.sessionStart) return 0;
  const ms = Math.max(0, jetzt - f.sessionStart);
  return Math.round(ms / 60000);
}

/** Prüft, ob die Session bereits Aktivität enthält (mindestens eine Karte wurde abgefragt). */
export function sessionHatAktivitaet(f: Fortschritt): boolean {
  return Object.values(f.karten).some((k) => k.anzahlAbfragen > 0);
}
