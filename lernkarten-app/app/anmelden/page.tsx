'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSitzung } from '@/lib/client/sitzung';
import { ladeFortschritt } from '@/lib/speicher';
import { ladeStatistik } from '@/lib/statistik';

type Modus = 'login' | 'registrieren';

export default function AnmeldeSeite() {
  const router = useRouter();
  const { sitzung, login, registrieren } = useSitzung();
  const [modus, setModus] = useState<Modus>('registrieren');
  const [name, setName] = useState('');
  const [passwort, setPasswort] = useState('');
  const [setzePasswort, setSetzePasswort] = useState(false);
  const [importieren, setImportieren] = useState(true);
  const [hatLokaleDaten, setHatLokaleDaten] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [arbeitet, setArbeitet] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const f = ladeFortschritt();
    const s = ladeStatistik();
    const hatDaten =
      (f !== null && Object.keys(f.karten).length > 0) ||
      s.tage.length > 0 ||
      s.angeseheneKartenIds.length > 0;
    setHatLokaleDaten(hatDaten);
    if (!hatDaten) setImportieren(false);
  }, []);

  // Wenn schon angemeldet, weiterleiten.
  useEffect(() => {
    if (sitzung.status === 'bereit' && sitzung.nutzer !== null) {
      router.replace('/');
    }
  }, [sitzung, router]);

  async function abschicken(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    const nameNorm = name.trim();
    if (!nameNorm) {
      setFehler('Bitte Namen eingeben.');
      return;
    }
    setArbeitet(true);
    try {
      if (modus === 'login') {
        await login(nameNorm, passwort || undefined);
      } else {
        await registrieren({
          name: nameNorm,
          passwort: setzePasswort && passwort ? passwort : undefined,
          importiereLokaleDaten: importieren,
        });
      }
      router.push('/');
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setArbeitet(false);
    }
  }

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-pb w-full flex flex-col gap-4 mt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Zurück zur Startseite"
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-base font-medium px-2 py-1 -ml-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← Zurück
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          {modus === 'login' ? 'Anmelden' : 'Konto anlegen'}
        </h1>
        <div className="w-12" aria-hidden="true" />
      </div>

      <div
        role="tablist"
        aria-label="Modus"
        className="grid grid-cols-2 gap-1 p-1 bg-slate-200 rounded-xl"
      >
        <button
          type="button"
          role="tab"
          aria-selected={modus === 'registrieren'}
          onClick={() => setModus('registrieren')}
          className={`rounded-lg py-2 text-sm font-medium ${
            modus === 'registrieren' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Neu hier
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={modus === 'login'}
          onClick={() => setModus('login')}
          className={`rounded-lg py-2 text-sm font-medium ${
            modus === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          Schon ein Konto
        </button>
      </div>

      <form onSubmit={abschicken} className="flex flex-col gap-4 rounded-2xl bg-white shadow-sm p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">Name</span>
          <input
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            required
            maxLength={32}
          />
        </label>

        {modus === 'registrieren' ? (
          <>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={setzePasswort}
                onChange={(e) => {
                  setSetzePasswort(e.target.checked);
                  if (!e.target.checked) setPasswort('');
                }}
                className="mt-1"
              />
              <span>
                Passwort vergeben — nur dann ist deine Statistik privat. Ohne
                Passwort können andere Nutzer dich sehen.
              </span>
            </label>
            {setzePasswort ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-slate-600">Passwort</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwort}
                  onChange={(e) => setPasswort(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  minLength={4}
                  required
                />
              </label>
            ) : null}

            {hatLokaleDaten ? (
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={importieren}
                  onChange={(e) => setImportieren(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  Bisherigen Fortschritt aus diesem Browser in das neue Konto
                  übernehmen.
                </span>
              </label>
            ) : null}
          </>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">
              Passwort (nur wenn du eines gesetzt hast)
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={passwort}
              onChange={(e) => setPasswort(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </label>
        )}

        {fehler ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {fehler}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={arbeitet}
          className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-3 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {arbeitet
            ? 'Bitte warten…'
            : modus === 'login'
              ? 'Anmelden'
              : 'Konto anlegen'}
        </button>
      </form>
    </main>
  );
}
