// Passwort-Hashing mit Node-eigenem crypto.scrypt — keine externe Lib nötig.

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (
  passwort: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LEN = 64;

/** Hasht ein Passwort zu `${saltHex}:${keyHex}`. */
export async function hashPasswort(passwort: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(passwort, salt, KEY_LEN);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

/** Prüft ein Passwort gegen einen Hash. Timing-safe. */
export async function verifyPasswort(passwort: string, hash: string): Promise<boolean> {
  if (!hash || typeof hash !== 'string' || !hash.includes(':')) return false;
  const [saltHex, keyHex] = hash.split(':');
  if (!saltHex || !keyHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const erwartet = Buffer.from(keyHex, 'hex');
    if (erwartet.length !== KEY_LEN) return false;
    const tatsaechlich = await scrypt(passwort, salt, KEY_LEN);
    return timingSafeEqual(erwartet, tatsaechlich);
  } catch {
    return false;
  }
}
