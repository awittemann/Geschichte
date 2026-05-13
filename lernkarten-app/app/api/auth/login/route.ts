import { NextResponse } from 'next/server';
import { holeNutzer } from '@/lib/server/db';
import { setzeSession } from '@/lib/server/auth';
import { verifyPasswort } from '@/lib/server/passwort';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { name?: unknown; passwort?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiger JSON-Body' }, { status: 400 });
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const passwort = typeof body.passwort === 'string' ? body.passwort : '';
  if (!name) {
    return NextResponse.json({ fehler: 'Name fehlt' }, { status: 400 });
  }
  const nutzer = await holeNutzer(name);
  if (!nutzer) {
    return NextResponse.json({ fehler: 'Nutzer nicht gefunden' }, { status: 404 });
  }
  if (nutzer.passwortHash) {
    if (!passwort) {
      return NextResponse.json(
        { fehler: 'Passwort erforderlich' },
        { status: 401 },
      );
    }
    const ok = await verifyPasswort(passwort, nutzer.passwortHash);
    if (!ok) {
      return NextResponse.json(
        { fehler: 'Passwort falsch' },
        { status: 401 },
      );
    }
  }
  await setzeSession(nutzer.name);
  return NextResponse.json({
    name: nutzer.name,
    hatPasswort: nutzer.passwortHash !== null,
  });
}
