import { NextResponse } from 'next/server';
import { holeNutzer } from '@/lib/server/db';
import { aktuellerNutzerName } from '@/lib/server/auth';
import type { DetailAntwort } from '@/lib/server/typen';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const { name: rawName } = await ctx.params;
  const name = decodeURIComponent(rawName);
  const [nutzer, currentName] = await Promise.all([
    holeNutzer(name),
    aktuellerNutzerName(),
  ]);
  if (!nutzer) {
    return NextResponse.json({ fehler: 'Nutzer nicht gefunden' }, { status: 404 });
  }
  const istEigenerNutzer = currentName === nutzer.name;
  const oeffentlich = nutzer.passwortHash === null;
  if (!oeffentlich && !istEigenerNutzer) {
    return NextResponse.json(
      { fehler: 'Privat — Anmeldung mit Passwort erforderlich' },
      { status: 403 },
    );
  }
  const antwort: DetailAntwort = {
    name: nutzer.name,
    hatPasswort: nutzer.passwortHash !== null,
    oeffentlich,
    istEigenerNutzer,
    statistik: nutzer.statistik,
    fortschritt: istEigenerNutzer ? nutzer.fortschritt : null,
  };
  return NextResponse.json(antwort);
}
