// Reine Logik für den Multiple-Choice-Modus.
// Keine localStorage-Zugriffe, keine Date-Calls; Random nur über Override.

export type MCOption = {
  text: string;
  istRichtig: boolean;
};

/** Fisher-Yates-Shuffle mit injizierbarem RNG (für deterministische Tests). */
function mische<T>(arr: readonly T[], zufall: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.min(Math.floor(zufall() * (i + 1)), i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Baut die Antwort-Optionen für eine Karte: die richtige Antwort plus zwei
 * falsche. Die Distraktoren werden bevorzugt aus `pool` gezogen; reicht der
 * Pool nicht für zwei eindeutige Optionen, wird aus `fallback` aufgefüllt
 * (z. B. Antworten anderer Karten). Das Ergebnis ist gemischt.
 *
 * @param richtigeAntwort Die korrekte Antwort der Karte.
 * @param pool            Kartenspezifische Distraktoren.
 * @param fallback        Ersatz-Distraktoren, falls der Pool zu klein ist.
 * @param zufall          Optionaler RNG (Default: Math.random).
 */
export function baueOptionen(
  richtigeAntwort: string,
  pool: readonly string[],
  fallback: readonly string[] = [],
  zufall: () => number = Math.random,
): MCOption[] {
  const istBrauchbar = (d: string) =>
    typeof d === 'string' && d.trim().length > 0 && d !== richtigeAntwort;

  // Erst aus dem Pool wählen, dann ggf. aus dem Fallback auffüllen — beide
  // Quellen werden für sich gemischt, Duplikate werden entfernt.
  const ausPool = mische([...new Set(pool)].filter(istBrauchbar), zufall);
  const ausFallback = mische([...new Set(fallback)].filter(istBrauchbar), zufall);

  const distraktoren: string[] = [];
  for (const kandidat of [...ausPool, ...ausFallback]) {
    if (distraktoren.length >= 2) break;
    if (!distraktoren.includes(kandidat)) distraktoren.push(kandidat);
  }

  const optionen: MCOption[] = [
    { text: richtigeAntwort, istRichtig: true },
    ...distraktoren.map((text) => ({ text, istRichtig: false })),
  ];
  return mische(optionen, zufall);
}
