// Hilfsfunktionen für lokale Datumsformatierung.
// Alle Funktionen sind SSR- und Client-tauglich (kein Window-Zugriff).

const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const;

/**
 * Parst einen ISO-String YYYY-MM-DD in seine drei Bestandteile.
 * Wirft, wenn der String nicht im erwarteten Format ist.
 */
function parseIsoDatum(iso: string): { jahr: number; monat: number; tag: number } {
  const teile = iso.split('-');
  if (teile.length !== 3) {
    throw new Error(`Ungültiges ISO-Datum: ${iso}`);
  }
  const jahr = Number(teile[0]);
  const monat = Number(teile[1]);
  const tag = Number(teile[2]);
  if (!Number.isFinite(jahr) || !Number.isFinite(monat) || !Number.isFinite(tag)) {
    throw new Error(`Ungültiges ISO-Datum: ${iso}`);
  }
  return { jahr, monat, tag };
}

/**
 * Gibt das heutige Datum in lokaler Zeitzone als YYYY-MM-DD zurück.
 * Verwendet bewusst nicht `toISOString()` (das wäre UTC).
 */
export function heutigesDatum(now?: Date): string {
  const d = now ?? new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Anzahl Tage von isoA bis isoB. Positiv, wenn B nach A liegt.
 * Nutzt `Date.UTC`, damit Zeitzonen-/Sommerzeit-Effekte keine Rolle spielen.
 */
export function tageDazwischen(isoA: string, isoB: string): number {
  const a = parseIsoDatum(isoA);
  const b = parseIsoDatum(isoB);
  const msA = Date.UTC(a.jahr, a.monat - 1, a.tag);
  const msB = Date.UTC(b.jahr, b.monat - 1, b.tag);
  const tageMs = 1000 * 60 * 60 * 24;
  return Math.round((msB - msA) / tageMs);
}

/**
 * Liefert das ISO-Datum, das `tage` Tage vor heute liegt.
 * Negative Werte ergeben Daten in der Zukunft.
 */
export function datumVorTagen(tage: number, now?: Date): string {
  const d = now ?? new Date();
  // Lokale Konstruktion, damit Sommerzeit-Wechsel um Mitternacht nicht stört.
  const lokal = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  lokal.setDate(lokal.getDate() - tage);
  const yyyy = lokal.getFullYear();
  const mm = String(lokal.getMonth() + 1).padStart(2, '0');
  const dd = String(lokal.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Liefert das Kurz-Kürzel des Wochentags zum ISO-Datum.
 * Z. B. "Mo", "Di", … "So".
 */
export function wochentagKurz(iso: string): string {
  const { jahr, monat, tag } = parseIsoDatum(iso);
  // UTC ist hier ausreichend, da wir keine Uhrzeit haben.
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  return WOCHENTAGE_KURZ[d.getUTCDay()];
}

/**
 * Menschliche Formatierung:
 * - "Heute" / "Gestern" relativ zu `now`.
 * - Andernfalls "Mo, 15.04." (Wochentag-Kurz + Tag.Monat.)
 */
export function formatiereDatum(iso: string, now?: Date): string {
  const heute = heutigesDatum(now);
  const diff = tageDazwischen(iso, heute);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  const { monat, tag } = parseIsoDatum(iso);
  const tagStr = String(tag).padStart(2, '0');
  const monatStr = String(monat).padStart(2, '0');
  return `${wochentagKurz(iso)}, ${tagStr}.${monatStr}.`;
}
