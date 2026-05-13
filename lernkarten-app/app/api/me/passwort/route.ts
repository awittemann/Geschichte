import { NextResponse } from 'next/server';
import { mutiereDb } from '@/lib/server/db';
import { aktuellerNutzerName } from '@/lib/server/auth';
import { hashPasswort, verifyPasswort } from '@/lib/server/passwort';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/me/passwort
 * Body: { altesPasswort?: string, neuesPasswort: string | null }
 *
 * - neuesPasswort === null  → Passwort entfernen (Nutzer wird wieder öffentlich)
 * - neuesPasswort === ""    → 400 (kein leerer String)
 * - altesPasswort ist erforderlich, wenn der Nutzer bereits ein Passwort hat
 */
export async function PUT(request: Request) {
  const name = await aktuellerNutzerName();
  if (!name) {
    return NextResponse.json({ fehler: 'Nicht angemeldet' }, { status: 401 });
  }
  let body: { altesPasswort?: unknown; neuesPasswort?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiger JSON-Body' }, { status: 400 });
  }
  const altes = typeof body.altesPasswort === 'string' ? body.altesPasswort : '';
  const rohNeues = body.neuesPasswort;
  let neuerHash: string | null;
  if (rohNeues === null) {
    neuerHash = null;
  } else if (typeof rohNeues === 'string') {
    if (rohNeues.length < 4) {
      return NextResponse.json(
        { fehler: 'Passwort muss mindestens 4 Zeichen haben' },
        { status: 400 },
      );
    }
    neuerHash = await hashPasswort(rohNeues);
  } else {
    return NextResponse.json(
      { fehler: 'neuesPasswort fehlt oder falsches Format' },
      { status: 400 },
    );
  }

  // Wir können nicht im mutiereDb-Callback hashen (await im Schreiben ist ok,
  // aber Logik sauber trennen). Hash haben wir oben schon.
  // Altes Passwort wird VOR dem Schreiben geprüft (zweistufig).
  const ergebnis = await mutiereDb(async (db) => {
    const nutzer = db.users[name];
    if (!nutzer) return { ok: false as const, fehler: 'Nutzer nicht gefunden', status: 404 };
    if (nutzer.passwortHash !== null) {
      if (!altes) {
        return { ok: false as const, fehler: 'Altes Passwort erforderlich', status: 401 };
      }
      const passt = await verifyPasswort(altes, nutzer.passwortHash);
      if (!passt) {
        return { ok: false as const, fehler: 'Altes Passwort falsch', status: 401 };
      }
    }
    nutzer.passwortHash = neuerHash;
    return { ok: true as const };
  });
  if (!ergebnis.ok) {
    return NextResponse.json({ fehler: ergebnis.fehler }, { status: ergebnis.status });
  }
  return NextResponse.json({ ok: true, hatPasswort: neuerHash !== null });
}
