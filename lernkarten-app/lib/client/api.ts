// Dünne Fetch-Wrapper für die Server-API. Alle Calls senden/erwarten JSON.
// `credentials: 'same-origin'` ist Default, damit das Session-Cookie mitgeht.

import type { Fortschritt, StatistikSpeicher } from '../typen';
import type { DetailAntwort, NutzerUebersicht } from '../server/typen';

export type MeAntwort =
  | { angemeldet: false }
  | {
      angemeldet: true;
      name: string;
      hatPasswort: boolean;
      statistik: StatistikSpeicher;
      fortschritt: Fortschritt | null;
    };

async function jsonOderFehler<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let fehler = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { fehler?: string };
      if (body?.fehler) fehler = body.fehler;
    } catch {
      // ignore
    }
    throw new Error(fehler);
  }
  return (await res.json()) as T;
}

export async function apiMe(): Promise<MeAntwort> {
  const res = await fetch('/api/auth/me', { cache: 'no-store' });
  return jsonOderFehler<MeAntwort>(res);
}

export async function apiLogin(name: string, passwort?: string): Promise<{ name: string; hatPasswort: boolean }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, passwort }),
  });
  return jsonOderFehler<{ name: string; hatPasswort: boolean }>(res);
}

export async function apiLogout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export async function apiRegister(daten: {
  name: string;
  passwort?: string;
  importiereFortschritt?: Fortschritt | null;
  importiereStatistik?: StatistikSpeicher;
}): Promise<{ name: string; hatPasswort: boolean }> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(daten),
  });
  return jsonOderFehler<{ name: string; hatPasswort: boolean }>(res);
}

export async function apiNutzerListe(): Promise<NutzerUebersicht[]> {
  const res = await fetch('/api/users', { cache: 'no-store' });
  const data = await jsonOderFehler<{ users: NutzerUebersicht[] }>(res);
  return data.users;
}

export async function apiNutzerDetail(name: string): Promise<DetailAntwort> {
  const res = await fetch(`/api/users/${encodeURIComponent(name)}`, { cache: 'no-store' });
  return jsonOderFehler<DetailAntwort>(res);
}

export async function apiPushFortschritt(fortschritt: Fortschritt | null): Promise<void> {
  await fetch('/api/me/fortschritt', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fortschritt }),
  });
}

export async function apiPushStatistik(statistik: StatistikSpeicher): Promise<void> {
  await fetch('/api/me/statistik', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ statistik }),
  });
}

export async function apiPasswortAendern(
  altesPasswort: string | undefined,
  neuesPasswort: string | null,
): Promise<{ hatPasswort: boolean }> {
  const res = await fetch('/api/me/passwort', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ altesPasswort, neuesPasswort }),
  });
  return jsonOderFehler<{ ok: true; hatPasswort: boolean }>(res);
}

// --- KI-Abfragemodus ---------------------------------------------------------

/** Eine Nachricht im Rückfragen-Chat zum KI-Feedback. */
export type KiChatNachricht = { rolle: 'nutzer' | 'assistent'; text: string };

/**
 * Lässt die eingegebene Antwort zu einer Karte vom LLM bewerten.
 * Liefert eine Score (1–100) und ein Feedback in Textform.
 */
export async function apiKiBewerten(
  kartenId: string,
  nutzerAntwort: string,
): Promise<{ score: number; feedback: string }> {
  const res = await fetch('/api/ki/bewerten', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kartenId, nutzerAntwort }),
  });
  return jsonOderFehler<{ score: number; feedback: string }>(res);
}

/**
 * Stellt eine Rückfrage zum KI-Feedback. `verlauf` enthält den bisherigen
 * Chat inklusive des ursprünglichen Feedbacks (als erste assistent-Nachricht).
 */
export async function apiKiChat(
  kartenId: string,
  nutzerAntwort: string,
  verlauf: KiChatNachricht[],
): Promise<{ antwort: string }> {
  const res = await fetch('/api/ki/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kartenId, nutzerAntwort, verlauf }),
  });
  return jsonOderFehler<{ antwort: string }>(res);
}
