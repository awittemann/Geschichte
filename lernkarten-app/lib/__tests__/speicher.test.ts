import { describe, it, expect, beforeEach } from 'vitest';
import {
  FORTSCHRITT_KEY,
  initialisiereFortschrittAusDaten,
  ladeFortschritt,
  loescheFortschritt,
  localStorageVerfuegbar,
  speichereFortschritt,
} from '@/lib/speicher';
import {
  STATISTIK_KEY,
  ladeStatistik,
  loescheStatistik,
  speichereStatistik,
} from '@/lib/statistik';
import type { Fortschritt, LernkartenDaten, StatistikSpeicher } from '@/lib/typen';

describe('Speicher: Fortschritt-Verwaltung', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('localStorage ist in jsdom verfügbar', () => {
    expect(localStorageVerfuegbar()).toBe(true);
  });

  it('initialisiereFortschrittAusDaten setzt alle Karten auf abfragenBisErledigt=1', () => {
    const daten: LernkartenDaten = {
      kategorien: [
        {
          name: 'A',
          karten: [
            { id: 'a-1', frage: 'q1', antwort: 'a1' },
            { id: 'a-2', frage: 'q2', antwort: 'a2' },
          ],
        },
        {
          name: 'B',
          karten: [{ id: 'b-1', frage: 'q3', antwort: 'a3' }],
        },
      ],
    };
    const f = initialisiereFortschrittAusDaten(daten);
    expect(Object.keys(f.karten)).toHaveLength(3);
    expect(f.karten['a-1'].abfragenBisErledigt).toBe(1);
    expect(f.karten['a-1'].letzteBewertung).toBeNull();
    expect(f.karten['a-1'].anzahlAbfragen).toBe(0);
    expect(f.zuletztGezeigteId).toBeNull();
    expect(f.ersteBewertungen).toEqual({});
    expect(typeof f.sessionStart).toBe('number');
  });

  it('speichern und laden ergibt strukturell identischen Fortschritt', () => {
    const f: Fortschritt = {
      karten: {
        'x-1': {
          id: 'x-1',
          letzteBewertung: 'gut_gewusst',
          abfragenBisErledigt: 2,
          anzahlAbfragen: 3,
        },
      },
      zuletztGezeigteId: 'x-1',
      sessionStart: 123456,
      ersteBewertungen: { 'x-1': 'nicht_gewusst' },
    };
    speichereFortschritt(f);
    const geladen = ladeFortschritt();
    expect(geladen).toEqual(f);
  });

  it('ladeFortschritt liefert null bei leerem Speicher', () => {
    expect(ladeFortschritt()).toBeNull();
  });

  it('ladeFortschritt liefert null bei korruptem JSON', () => {
    localStorage.setItem(FORTSCHRITT_KEY, '{nicht-json');
    expect(ladeFortschritt()).toBeNull();
  });
});

describe('Pflichtfall 4: Reset-Trennung Fortschritt vs. Statistik', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loescheFortschritt entfernt NUR den Fortschritt-Key, Statistik bleibt unverändert', () => {
    const fortschritt: Fortschritt = {
      karten: {
        a: {
          id: 'a',
          letzteBewertung: null,
          abfragenBisErledigt: 1,
          anzahlAbfragen: 0,
        },
      },
      zuletztGezeigteId: null,
      sessionStart: 1,
      ersteBewertungen: {},
    };
    const statistik: StatistikSpeicher = {
      tage: [
        {
          datum: '2026-05-13',
          abfragen: {
            nicht_gewusst: 1,
            wenig_gewusst: 2,
            gut_gewusst: 3,
            perfekt_gewusst: 4,
          },
          abfragenGesamt: 10,
          karteneErledigt: 2,
          lernzeitSekunden: 300,
          sessionsGestartet: 1,
        },
      ],
      ersterLerntag: '2026-05-13',
      angeseheneKartenIds: ['a', 'b'],
    };

    speichereFortschritt(fortschritt);
    speichereStatistik(statistik);

    // Sanity-Check: beide vorhanden
    expect(localStorage.getItem(FORTSCHRITT_KEY)).not.toBeNull();
    expect(localStorage.getItem(STATISTIK_KEY)).not.toBeNull();

    // Snapshot der Statistik VOR dem Löschen
    const statistikVorReset = localStorage.getItem(STATISTIK_KEY);

    loescheFortschritt();

    // Fortschritt weg, Statistik EXAKT unverändert
    expect(localStorage.getItem(FORTSCHRITT_KEY)).toBeNull();
    expect(localStorage.getItem(STATISTIK_KEY)).toBe(statistikVorReset);
    expect(ladeStatistik()).toEqual(statistik);
  });

  it('loescheStatistik entfernt NUR den Statistik-Key, Fortschritt bleibt unverändert', () => {
    const fortschritt: Fortschritt = {
      karten: {
        a: {
          id: 'a',
          letzteBewertung: null,
          abfragenBisErledigt: 1,
          anzahlAbfragen: 0,
        },
      },
      zuletztGezeigteId: null,
      sessionStart: 1,
      ersteBewertungen: {},
    };
    const statistik: StatistikSpeicher = {
      tage: [],
      ersterLerntag: '2026-05-13',
      angeseheneKartenIds: [],
    };
    speichereFortschritt(fortschritt);
    speichereStatistik(statistik);

    const fortschrittVor = localStorage.getItem(FORTSCHRITT_KEY);

    loescheStatistik();

    expect(localStorage.getItem(STATISTIK_KEY)).toBeNull();
    expect(localStorage.getItem(FORTSCHRITT_KEY)).toBe(fortschrittVor);
    expect(ladeFortschritt()).toEqual(fortschritt);
  });
});
