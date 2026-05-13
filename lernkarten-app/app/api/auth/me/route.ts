import { NextResponse } from 'next/server';
import { aktuellerNutzer } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const nutzer = await aktuellerNutzer();
  if (!nutzer) {
    return NextResponse.json({ angemeldet: false });
  }
  return NextResponse.json({
    angemeldet: true,
    name: nutzer.name,
    hatPasswort: nutzer.passwortHash !== null,
    statistik: nutzer.statistik,
    fortschritt: nutzer.fortschritt,
  });
}
