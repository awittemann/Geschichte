// Persistenter JSON-Store für Nutzer und ihren Lernstand.
// Eine Datei (Default: /data/state.json) wird atomar via write-then-rename
// aktualisiert. Eine Promise-Kette serialisiert alle Writes innerhalb des
// Prozesses, damit es zu keinen Race Conditions kommt.
//
// Wichtig: Dieses Modul darf NUR auf dem Server importiert werden. Es nutzt
// node:fs und würde im Client-Bundle scheitern.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Datenbank, Nutzer } from './typen';
import { leereStatistik } from '../statistik';

const DEFAULT_PROD_PATH = '/data/state.json';
const DEFAULT_DEV_PATH = path.join(process.cwd(), '.local-state.json');

function dbPfad(): string {
  if (process.env.LERNKARTEN_DB_PATH) return process.env.LERNKARTEN_DB_PATH;
  return process.env.NODE_ENV === 'production' ? DEFAULT_PROD_PATH : DEFAULT_DEV_PATH;
}

function leereDb(): Datenbank {
  return { version: 1, users: {} };
}

let kette: Promise<unknown> = Promise.resolve();

/**
 * Stellt sicher, dass das Verzeichnis existiert (für /data auf Sliplane in
 * frischen Setups, falls das Volume leer ist).
 */
async function stelleVerzeichnisSicher(p: string): Promise<void> {
  await fs.mkdir(path.dirname(p), { recursive: true });
}

/** Lädt den aktuellen Datenbankstand. Bei Fehler/fehlend: leere DB. */
async function ladeInternal(): Promise<Datenbank> {
  const p = dbPfad();
  try {
    const raw = await fs.readFile(p, 'utf8');
    const parsed = JSON.parse(raw) as Partial<Datenbank>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.users !== 'object' ||
      parsed.users === null
    ) {
      return leereDb();
    }
    return { version: 1, users: parsed.users as Record<string, Nutzer> };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return leereDb();
    // Defensive: bei Parse-Fehlern lieber leere DB liefern, statt zu crashen.
    // Schreibt KEINE neue Datei zurück, damit der Admin die Chance hat,
    // den korrupten Stand zu reparieren.
    console.error('Konnte DB nicht laden:', err);
    return leereDb();
  }
}

/** Schreibt atomar via write-temp + rename. */
async function speichereInternal(db: Datenbank): Promise<void> {
  const p = dbPfad();
  await stelleVerzeichnisSicher(p);
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(db), 'utf8');
  await fs.rename(tmp, p);
}

/**
 * Führt eine atomare Read-Modify-Write-Operation auf der DB aus.
 * Alle Calls werden in einer Promise-Kette serialisiert.
 */
export function mutiereDb<T>(
  modifizieren: (db: Datenbank) => T | Promise<T>,
): Promise<T> {
  const naechste = kette.then(async () => {
    const db = await ladeInternal();
    const ergebnis = await modifizieren(db);
    await speichereInternal(db);
    return ergebnis;
  });
  // Fehler dürfen die Kette nicht abreißen lassen.
  kette = naechste.catch(() => undefined);
  return naechste;
}

/** Reine Lese-Operation (auch serialisiert, damit konsistente Snapshots). */
export function leseDb<T>(lesen: (db: Datenbank) => T | Promise<T>): Promise<T> {
  const naechste = kette.then(async () => {
    const db = await ladeInternal();
    return await lesen(db);
  });
  kette = naechste.catch(() => undefined);
  return naechste;
}

/** Helper für API-Routen: holt einen Nutzer oder gibt null. */
export async function holeNutzer(name: string): Promise<Nutzer | null> {
  return leseDb((db) => db.users[name] ?? null);
}

/** Hilft beim Anlegen eines neuen Nutzers (ohne Passwort, mit leerer Statistik). */
export function neuerNutzer(name: string): Nutzer {
  return {
    name,
    passwortHash: null,
    createdAt: Date.now(),
    fortschritt: null,
    statistik: leereStatistik(),
  };
}

/** Test-Hilfe: gibt den aktuell aufgelösten Pfad zurück. */
export function aktuellerDbPfad(): string {
  return dbPfad();
}
