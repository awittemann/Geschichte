import { NextResponse } from 'next/server';
import { mutiereDb, leseDb, neuerNutzer } from '@/lib/server/db';
import { setzeSession } from '@/lib/server/auth';
import { hashPasswort } from '@/lib/server/passwort';
import { berechneUebersicht } from '@/lib/server/uebersicht';
import type { NutzerUebersicht } from '@/lib/server/typen';
import type { Fortschritt, StatistikSpeicher } from '@/lib/typen';
import { heutigesDatum } from '@/lib/datum';
import { leereStatistik } from '@/lib/statistik';

export const dynamic = 'force-dynamic';

const MAX_NAMEN_LAENGE = 32;
const NAMEN_REGEX = /^[\p{L}\p{N} _.\-]+$/u;

function nameNormalisieren(s: string): string {
  return s.trim();
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/** Defensive Validierung importierter Daten. Bei ungültig: leere Defaults. */
function bereinigeStatistikImport(x: unknown): StatistikSpeicher {
  if (!isObject(x)) return leereStatistik();
  const s = leereStatistik();
  if (Array.isArray(x.tage)) s.tage = x.tage as StatistikSpeicher['tage'];
  if (typeof x.ersterLerntag === 'string') s.ersterLerntag = x.ersterLerntag;
  if (Array.isArray(x.angeseheneKartenIds)) {
    s.angeseheneKartenIds = [
      ...new Set((x.angeseheneKartenIds as unknown[]).filter((id): id is string => typeof id === 'string')),
    ];
  }
  return s;
}

function bereinigeFortschrittImport(x: unknown): Fortschritt | null {
  if (!isObject(x) || !isObject(x.karten)) return null;
  return {
    karten: x.karten as Fortschritt['karten'],
    zuletztGezeigteId:
      typeof x.zuletztGezeigteId === 'string' ? x.zuletztGezeigteId : null,
    sessionStart: typeof x.sessionStart === 'number' ? x.sessionStart : null,
    ersteBewertungen: isObject(x.ersteBewertungen)
      ? (x.ersteBewertungen as Fortschritt['ersteBewertungen'])
      : {},
  };
}

/** GET /api/users — Liste aller Nutzer mit öffentlicher Übersicht. */
export async function GET() {
  const heute = heutigesDatum();
  const liste = await leseDb((db): NutzerUebersicht[] => {
    return Object.values(db.users)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((n) => {
        const oeffentlich = n.passwortHash === null;
        return {
          name: n.name,
          hatPasswort: n.passwortHash !== null,
          oeffentlich,
          uebersicht: oeffentlich ? berechneUebersicht(n.statistik, heute) : null,
        };
      });
  });
  return NextResponse.json({ users: liste });
}

/** POST /api/users — neuen Nutzer anlegen + sofort einloggen. */
export async function POST(request: Request) {
  let body: {
    name?: unknown;
    passwort?: unknown;
    importiereFortschritt?: unknown;
    importiereStatistik?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiger JSON-Body' }, { status: 400 });
  }
  const rohName = typeof body.name === 'string' ? body.name : '';
  const name = nameNormalisieren(rohName);
  const passwort =
    typeof body.passwort === 'string' && body.passwort.length > 0
      ? body.passwort
      : null;

  if (!name) {
    return NextResponse.json({ fehler: 'Name fehlt' }, { status: 400 });
  }
  if (name.length > MAX_NAMEN_LAENGE) {
    return NextResponse.json(
      { fehler: `Name zu lang (max ${MAX_NAMEN_LAENGE} Zeichen)` },
      { status: 400 },
    );
  }
  if (!NAMEN_REGEX.test(name)) {
    return NextResponse.json(
      { fehler: 'Name enthält ungültige Zeichen' },
      { status: 400 },
    );
  }
  if (passwort !== null && passwort.length < 4) {
    return NextResponse.json(
      { fehler: 'Passwort muss mindestens 4 Zeichen haben' },
      { status: 400 },
    );
  }

  const passwortHash = passwort !== null ? await hashPasswort(passwort) : null;
  const fortschrittImport = bereinigeFortschrittImport(body.importiereFortschritt);
  const statistikImport = bereinigeStatistikImport(body.importiereStatistik);

  const ergebnis = await mutiereDb((db) => {
    if (db.users[name]) {
      return { ok: false as const, fehler: 'Name bereits vergeben' };
    }
    const eintrag = neuerNutzer(name);
    eintrag.passwortHash = passwortHash;
    eintrag.fortschritt = fortschrittImport;
    eintrag.statistik = statistikImport;
    db.users[name] = eintrag;
    return { ok: true as const };
  });

  if (!ergebnis.ok) {
    return NextResponse.json({ fehler: ergebnis.fehler }, { status: 409 });
  }
  await setzeSession(name);
  return NextResponse.json({ name, hatPasswort: passwortHash !== null });
}
