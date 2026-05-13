// Session-Cookies mit HMAC-Signatur. Kein JWT-Overhead — wir speichern
// nur den Nutzernamen plus eine HMAC-Signatur, damit niemand das Cookie
// selbst fälschen kann.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { Nutzer } from './typen';
import { holeNutzer } from './db';

const COOKIE_NAME = 'lernkarten_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // ein Jahr

function geheimnis(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    // Im Production-Modus erzwingen wir ein gesetztes Secret.
    throw new Error(
      'SESSION_SECRET fehlt oder zu kurz (mindestens 16 Zeichen).',
    );
  }
  // Dev-Fallback — bewusst statisch, damit Sessions zwischen Restarts halten.
  return 'dev-secret-bitte-nur-lokal-nutzen';
}

function signiere(name: string): string {
  const mac = createHmac('sha256', geheimnis()).update(name).digest('hex');
  return `${encodeURIComponent(name)}.${mac}`;
}

function pruefeSignatur(value: string): string | null {
  if (!value || !value.includes('.')) return null;
  const idx = value.lastIndexOf('.');
  const namePart = value.slice(0, idx);
  const mac = value.slice(idx + 1);
  if (!namePart || !mac) return null;
  try {
    const name = decodeURIComponent(namePart);
    const erwartet = createHmac('sha256', geheimnis()).update(name).digest('hex');
    const a = Buffer.from(erwartet, 'hex');
    const b = Buffer.from(mac, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return name;
  } catch {
    return null;
  }
}

export async function setzeSession(name: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, signiere(name), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function loescheSession(): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: process.env.NODE_ENV === 'production',
  });
}

/** Liefert den eingeloggten Nutzernamen, oder null. */
export async function aktuellerNutzerName(): Promise<string | null> {
  const c = await cookies();
  const raw = c.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  return pruefeSignatur(raw);
}

/** Lädt den eingeloggten Nutzer aus der DB (oder null). */
export async function aktuellerNutzer(): Promise<Nutzer | null> {
  const name = await aktuellerNutzerName();
  if (!name) return null;
  return holeNutzer(name);
}
