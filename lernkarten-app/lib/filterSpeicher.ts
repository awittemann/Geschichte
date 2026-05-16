// LocalStorage-Persistenz für die zuletzt gewählte Quiz-Wahl (Kapitel + Modus).
// Wird beim Start eines Quiz aktualisiert; Quiz-Seiten ohne URL-Param
// fallen darauf zurück, damit "Weiter lernen" Modus und Filter behält.

export type QuizModus = 'lernen' | 'abfrage' | 'multiple-choice';

const KAPITEL_FILTER_KEY = 'lernkarten:kapitelFilter';
const LETZTER_MODUS_KEY = 'lernkarten:letzterModus';
const ERLAUBTE_MODI: readonly QuizModus[] = [
  'lernen',
  'abfrage',
  'multiple-choice',
];

export function ladeKapitelFilter(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const wert = window.localStorage.getItem(KAPITEL_FILTER_KEY);
    return wert && wert.length > 0 ? wert : null;
  } catch {
    return null;
  }
}

export function speichereKapitelFilter(name: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (name === null || name.length === 0) {
      window.localStorage.removeItem(KAPITEL_FILTER_KEY);
    } else {
      window.localStorage.setItem(KAPITEL_FILTER_KEY, name);
    }
  } catch {
    // bewusst still — fehlender Storage darf das Quiz nicht blockieren
  }
}

export function ladeLetztenModus(): QuizModus | null {
  if (typeof window === 'undefined') return null;
  try {
    const wert = window.localStorage.getItem(LETZTER_MODUS_KEY);
    return ERLAUBTE_MODI.includes(wert as QuizModus)
      ? (wert as QuizModus)
      : null;
  } catch {
    return null;
  }
}

export function speichereLetztenModus(modus: QuizModus): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LETZTER_MODUS_KEY, modus);
  } catch {
    // bewusst still
  }
}
