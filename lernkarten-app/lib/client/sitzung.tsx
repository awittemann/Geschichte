'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Fortschritt, StatistikSpeicher } from '../typen';
import {
  apiLogin,
  apiLogout,
  apiMe,
  apiPushFortschritt,
  apiPushStatistik,
  apiRegister,
  type MeAntwort,
} from './api';
import { markiereAngemeldet } from './sync';
import { FORTSCHRITT_KEY, ladeFortschritt } from '../speicher';
import { STATISTIK_KEY, ladeStatistik, leereStatistik } from '../statistik';

type Status = 'laedt' | 'bereit';

type Sitzung =
  | { status: 'laedt' }
  | { status: 'bereit'; nutzer: null }
  | {
      status: 'bereit';
      nutzer: { name: string; hatPasswort: boolean };
    };

type Ctx = {
  sitzung: Sitzung;
  /** Inkrementiert sich nach jedem Login/Logout, damit Screens neu mounten. */
  generation: number;
  login: (name: string, passwort?: string) => Promise<void>;
  registrieren: (args: {
    name: string;
    passwort?: string;
    importiereLokaleDaten: boolean;
  }) => Promise<void>;
  abmelden: () => Promise<void>;
  /** Nach „Passwort gesetzt/entfernt" — aktualisiert nur den lokalen State. */
  aktualisiereHatPasswort: (hatPasswort: boolean) => void;
};

const Kontext = createContext<Ctx | null>(null);

function schreibeLocalStorage(statistik: StatistikSpeicher, fortschritt: Fortschritt | null) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STATISTIK_KEY, JSON.stringify(statistik));
    if (fortschritt === null) {
      window.localStorage.removeItem(FORTSCHRITT_KEY);
    } else {
      window.localStorage.setItem(FORTSCHRITT_KEY, JSON.stringify(fortschritt));
    }
  } catch {
    // bewusst still
  }
}

function uebernehmeServerDaten(antwort: Extract<MeAntwort, { angemeldet: true }>) {
  schreibeLocalStorage(antwort.statistik, antwort.fortschritt);
}

export function SitzungsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('laedt');
  const [nutzer, setNutzer] = useState<{ name: string; hatPasswort: boolean } | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const me = await apiMe();
        if (abgebrochen) return;
        if (me.angemeldet) {
          uebernehmeServerDaten(me);
          markiereAngemeldet(true);
          setNutzer({ name: me.name, hatPasswort: me.hatPasswort });
        } else {
          markiereAngemeldet(false);
          setNutzer(null);
        }
      } catch {
        markiereAngemeldet(false);
        setNutzer(null);
      } finally {
        if (!abgebrochen) setStatus('bereit');
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const login = useCallback(async (name: string, passwort?: string) => {
    await apiLogin(name, passwort);
    const me = await apiMe();
    if (me.angemeldet) {
      uebernehmeServerDaten(me);
      markiereAngemeldet(true);
      setNutzer({ name: me.name, hatPasswort: me.hatPasswort });
      setGeneration((g) => g + 1);
    }
  }, []);

  const registrieren = useCallback(
    async ({
      name,
      passwort,
      importiereLokaleDaten,
    }: {
      name: string;
      passwort?: string;
      importiereLokaleDaten: boolean;
    }) => {
      const lokaleStatistik = importiereLokaleDaten ? ladeStatistik() : leereStatistik();
      const lokalerFortschritt = importiereLokaleDaten ? ladeFortschritt() : null;
      await apiRegister({
        name,
        passwort,
        importiereStatistik: lokaleStatistik,
        importiereFortschritt: lokalerFortschritt,
      });
      // Nach Registrierung: Server hat unsere Daten. localStorage spiegeln und
      // zusätzlich nochmal an Server pushen, falls zwischen import und login
      // weitere lokale Writes passiert wären (in der Praxis unwahrscheinlich).
      schreibeLocalStorage(lokaleStatistik, lokalerFortschritt);
      markiereAngemeldet(true);
      setNutzer({ name, hatPasswort: passwort !== undefined && passwort.length > 0 });
      // Sicherheitsnetz: noch einmal nach dem Anmelden synchronisieren.
      try {
        await Promise.all([
          apiPushStatistik(lokaleStatistik),
          apiPushFortschritt(lokalerFortschritt),
        ]);
      } catch {
        // ignore — kein blockierender Fehler
      }
      setGeneration((g) => g + 1);
    },
    [],
  );

  const abmelden = useCallback(async () => {
    await apiLogout();
    markiereAngemeldet(false);
    setNutzer(null);
    // localStorage leeren, damit ein anderer Nutzer am gleichen Browser frisch startet.
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(FORTSCHRITT_KEY);
        window.localStorage.removeItem(STATISTIK_KEY);
      } catch {
        // ignore
      }
    }
    setGeneration((g) => g + 1);
  }, []);

  const aktualisiereHatPasswort = useCallback((hatPasswort: boolean) => {
    setNutzer((n) => (n ? { ...n, hatPasswort } : n));
  }, []);

  const value = useMemo<Ctx>(() => {
    const sitzung: Sitzung =
      status === 'laedt'
        ? { status: 'laedt' }
        : nutzer
          ? { status: 'bereit', nutzer }
          : { status: 'bereit', nutzer: null };
    return { sitzung, generation, login, registrieren, abmelden, aktualisiereHatPasswort };
  }, [status, nutzer, generation, login, registrieren, abmelden, aktualisiereHatPasswort]);

  return <Kontext.Provider value={value}>{children}</Kontext.Provider>;
}

export function useSitzung(): Ctx {
  const v = useContext(Kontext);
  if (!v) {
    throw new Error('useSitzung muss innerhalb von <SitzungsProvider> verwendet werden');
  }
  return v;
}
