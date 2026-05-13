import { NextResponse } from 'next/server';
import { mutiereDb } from '@/lib/server/db';
import { aktuellerNutzerName } from '@/lib/server/auth';
import type { Fortschritt } from '@/lib/typen';

export const dynamic = 'force-dynamic';

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export async function PUT(request: Request) {
  const name = await aktuellerNutzerName();
  if (!name) {
    return NextResponse.json({ fehler: 'Nicht angemeldet' }, { status: 401 });
  }
  let body: { fortschritt?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiger JSON-Body' }, { status: 400 });
  }
  const f = body.fortschritt;
  if (f !== null && !isObject(f)) {
    return NextResponse.json({ fehler: 'fortschritt fehlt oder falsches Format' }, { status: 400 });
  }
  const result = await mutiereDb((db) => {
    const nutzer = db.users[name];
    if (!nutzer) return { ok: false as const };
    nutzer.fortschritt = (f as Fortschritt | null) ?? null;
    return { ok: true as const };
  });
  if (!result.ok) {
    return NextResponse.json({ fehler: 'Nutzer nicht gefunden' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
