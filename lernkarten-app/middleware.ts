import { NextResponse, type NextRequest } from 'next/server';

// Diese Middleware blockt UI-Routen für nicht angemeldete Nutzer.
// API-Routen sind hier NICHT erfasst (siehe matcher) — die prüfen ihre Auth
// selbst (z. B. /api/me/* via aktuellerNutzerName()).
//
// Edge-Runtime: wir nutzen Web Crypto (subtle.verify) statt Node-crypto,
// damit die Middleware ohne Node-Runtime auskommt.

const COOKIE_NAME = 'lernkarten_session';

function geheimnis(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET fehlt oder zu kurz (mindestens 16 Zeichen).');
  }
  return 'dev-secret-bitte-nur-lokal-nutzen';
}

function hexZuBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0) return null;
  const buf = new ArrayBuffer(hex.length / 2);
  const out = new Uint8Array(buf);
  for (let i = 0; i < out.length; i += 1) {
    const b = parseInt(hex.substr(i * 2, 2), 16);
    if (Number.isNaN(b)) return null;
    out[i] = b;
  }
  return out;
}

async function pruefeCookie(cookie: string | undefined): Promise<string | null> {
  if (!cookie || !cookie.includes('.')) return null;
  const idx = cookie.lastIndexOf('.');
  const namePart = cookie.slice(0, idx);
  const mac = cookie.slice(idx + 1);
  if (!namePart || !mac) return null;
  try {
    const name = decodeURIComponent(namePart);
    const enc = new TextEncoder();
    const macBytes = hexZuBytes(mac);
    if (!macBytes) return null;
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(geheimnis()),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify('HMAC', key, macBytes, enc.encode(name));
    return ok ? name : null;
  } catch {
    return null;
  }
}

const ANMELDE_PFAD = '/anmelden';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const angemeldetAls = await pruefeCookie(cookie);

  if (pathname === ANMELDE_PFAD) {
    if (angemeldetAls) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!angemeldetAls) {
    const url = new URL(ANMELDE_PFAD, request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Statische Assets, API-Routen und Next-internals NICHT durchschleifen.
export const config = {
  matcher: [
    '/((?!_next/|api/|favicon\\.ico|manifest\\.json|icon-).*)',
  ],
};
