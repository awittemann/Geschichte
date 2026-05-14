'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSitzung } from '@/lib/client/sitzung';
import { apiNutzerListe } from '@/lib/client/api';
import { ladeFortschritt } from '@/lib/speicher';
import { ladeStatistik } from '@/lib/statistik';
import type { NutzerUebersicht } from '@/lib/server/typen';

type Modus = 'login' | 'registrieren';

export default function AnmeldeSeite() {
  const router = useRouter();
  const { sitzung, login, registrieren } = useSitzung();
  const [modus, setModus] = useState<Modus>('login');
  const [name, setName] = useState('');
  const [passwort, setPasswort] = useState('');
  const [setzePasswort, setSetzePasswort] = useState(false);
  const [importieren, setImportieren] = useState(true);
  const [hatLokaleDaten, setHatLokaleDaten] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [arbeitet, setArbeitet] = useState(false);
  const [nutzerListe, setNutzerListe] = useState<NutzerUebersicht[] | null>(null);
  const passwortRef = useRef<HTMLInputElement | null>(null);

  // Initial: Liste der Nutzer holen + Default-Modus setzen.
  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const u = await apiNutzerListe();
        if (abgebrochen) return;
        setNutzerListe(u);
        // Wenn noch keine Nutzer existieren, Register-Tab als Default zeigen.
        if (u.length === 0) setModus('registrieren');
      } catch {
        if (!abgebrochen) setNutzerListe([]);
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

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

  function waehleNutzer(n: NutzerUebersicht) {
    setModus('login');
    setName(n.name);
    setFehler(null);
    setPasswort('');
    // Bei Passwort-Nutzern direkt ins Passwort-Feld springen.
    if (n.hatPasswort) {
      // kleinen Tick warten, damit der Mode-Switch das Feld rendert
      requestAnimationFrame(() => {
        passwortRef.current?.focus();
      });
    } else {
      // Ohne Passwort braucht der Nutzer nichts auszufüllen — Submit fokussieren.
      requestAnimationFrame(() => {
        const btn = document.querySelector<HTMLButtonElement>(
          'button[type="submit"]',
        );
        btn?.focus();
      });
    }
  }

  // Sobald eine Sitzung besteht — frisch eingeloggt/registriert oder schon
  // angemeldet hergekommen — hart auf die Startseite wechseln. Ein harter
  // Wechsel (statt router.replace) ist nötig, weil der Client-Cache von Next
  // sonst die alte, von der Middleware auf /anmelden umgeleitete Antwort für
  // „/" ausliefert und man auf der Anmeldeseite hängen bleibt.
  useEffect(() => {
    if (sitzung.status === 'bereit' && sitzung.nutzer !== null) {
      window.location.replace('/');
    }
  }, [sitzung]);

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
      // Die Weiterleitung auf die Startseite übernimmt der useEffect oben,
      // sobald die Sitzung steht. `arbeitet` lassen wir bewusst true — der
      // Button bleibt „Bitte warten…", bis der harte Seitenwechsel greift.
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler');
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
              ref={passwortRef}
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

      {nutzerListe !== null && nutzerListe.length > 0 ? (
        <section className="rounded-2xl bg-white shadow-sm p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Bereits angelegte Nutzer
          </h2>
          <p className="text-xs text-slate-500 -mt-1">
            Tippe auf deinen Namen, um dich anzumelden.
          </p>
          <ul className="flex flex-wrap gap-2">
            {nutzerListe.map((n) => (
              <li key={n.name}>
                <button
                  type="button"
                  onClick={() => waehleNutzer(n)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    name === n.name
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                  }`}
                  aria-label={
                    n.hatPasswort
                      ? `Als ${n.name} anmelden (Passwort erforderlich)`
                      : `Als ${n.name} anmelden`
                  }
                >
                  {n.name}
                  {n.hatPasswort ? (
                    <span aria-hidden="true" className="ml-1">
                      🔒
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : nutzerListe !== null && nutzerListe.length === 0 ? (
        <p className="text-xs text-slate-500 text-center">
          Noch keine Nutzer. Leg dir oben ein Konto an.
        </p>
      ) : null}
    </main>
  );
}
