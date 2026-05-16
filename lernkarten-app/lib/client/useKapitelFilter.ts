'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { reihenfolgeFuerKategorie } from '../kartenIndex';
import { ladeKapitelFilter, speichereKapitelFilter } from '../filterSpeicher';
import { useIstClient } from '../sessionStats';

type Ergebnis = {
  /** Name des aktiven Kapitels oder null für "alle Kapitel". */
  kapitel: string | null;
  /** IDs der erlaubten Karten in Quell-Reihenfolge. */
  reihenfolge: string[];
  /** Set der erlaubten IDs für O(1)-Lookups. Nur gesetzt, wenn Filter aktiv. */
  erlaubteIds: Set<string> | undefined;
};

/**
 * Liest den aktiven Kapitel-Filter aus dem URL-Parameter `?kapitel=`.
 * Fehlt der Parameter, wird der zuletzt gemerkte Filter aus localStorage
 * verwendet. Beim Mount wird der aktive Filter in localStorage gespiegelt,
 * damit "Weiter lernen" ihn beim nächsten Mal wieder einsetzt.
 *
 * Vor Client-Hydration (SSR) wird "alle Kapitel" zurückgegeben — die Quiz-Seiten
 * warten ohnehin auf `useIstClient()`, bevor sie Karten rendern.
 */
export function useKapitelFilter(): Ergebnis {
  const istClient = useIstClient();
  const params = useSearchParams();
  const urlParam = params?.get('kapitel') ?? null;

  const kapitel = useMemo<string | null>(() => {
    if (!istClient) return urlParam;
    if (urlParam !== null) return urlParam;
    return ladeKapitelFilter();
  }, [istClient, urlParam]);

  // localStorage mit aktivem Filter synchronisieren.
  useEffect(() => {
    if (!istClient) return;
    speichereKapitelFilter(kapitel);
  }, [istClient, kapitel]);

  const reihenfolge = useMemo(
    () => reihenfolgeFuerKategorie(kapitel),
    [kapitel],
  );
  const erlaubteIds = useMemo(
    () => (kapitel ? new Set(reihenfolge) : undefined),
    [kapitel, reihenfolge],
  );

  return { kapitel, reihenfolge, erlaubteIds };
}
