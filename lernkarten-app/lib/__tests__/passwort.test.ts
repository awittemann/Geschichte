import { describe, it, expect } from 'vitest';
import { hashPasswort, verifyPasswort } from '@/lib/server/passwort';

describe('Passwort-Hashing (scrypt)', () => {
  it('hash + verify funktioniert für das gleiche Passwort', async () => {
    const hash = await hashPasswort('mein-geheimnis');
    expect(await verifyPasswort('mein-geheimnis', hash)).toBe(true);
  });

  it('verify schlägt fehl bei falschem Passwort', async () => {
    const hash = await hashPasswort('richtig');
    expect(await verifyPasswort('falsch', hash)).toBe(false);
  });

  it('zwei Hashes desselben Passworts unterscheiden sich (zufälliges Salt)', async () => {
    const a = await hashPasswort('gleich');
    const b = await hashPasswort('gleich');
    expect(a).not.toBe(b);
    expect(await verifyPasswort('gleich', a)).toBe(true);
    expect(await verifyPasswort('gleich', b)).toBe(true);
  });

  it('verify gibt false bei kaputtem Hash zurück, ohne zu werfen', async () => {
    expect(await verifyPasswort('x', '')).toBe(false);
    expect(await verifyPasswort('x', 'no-colon')).toBe(false);
    expect(await verifyPasswort('x', 'aa:bb')).toBe(false);
    expect(await verifyPasswort('x', 'aa:')).toBe(false);
  });
});
