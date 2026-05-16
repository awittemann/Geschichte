// LocalStorage-Persistenz für den zuletzt gewählten Kapitel-Filter.
// Wird beim Start eines Quiz aktualisiert; Quiz-Seiten ohne URL-Param
// fallen darauf zurück, damit "Weiter lernen" den letzten Filter behält.

const KAPITEL_FILTER_KEY = 'lernkarten:kapitelFilter';

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
