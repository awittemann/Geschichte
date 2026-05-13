'use client';

import { useSyncExternalStore, useState } from 'react';
import { localStorageVerfuegbar } from '@/lib/speicher';

/**
 * Warnt, wenn localStorage nicht verfügbar ist (z. B. Privater Modus).
 * Lokal dismissible (Zustand im React-State, NICHT in localStorage gespeichert).
 * useSyncExternalStore liefert serverseitig `true` (= verfügbar/keine Warnung),
 * clientseitig den echten Wert — kein Hydration-Mismatch, kein setState in Effect.
 */
const subscribe = () => () => {};
const getSnapshot = (): boolean => localStorageVerfuegbar();
const getServerSnapshot = (): boolean => true;

export default function PrivateModeWarnung() {
  const verfuegbar = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [dismissed, setDismissed] = useState(false);

  if (verfuegbar || dismissed) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-100 text-amber-900 px-4 py-3"
    >
      <p className="text-sm flex-1 leading-snug">
        Hinweis: Dein Browser scheint im privaten Modus zu sein. Dein
        Fortschritt kann nicht gespeichert werden.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hinweis schließen"
        className="text-amber-900 hover:text-amber-700 font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        ×
      </button>
    </div>
  );
}
