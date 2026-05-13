import { describe, it, expect, beforeEach } from 'vitest';
import {
  STATISTIK_KEY,
  aktualisiereBewertung,
  berechneStreak,
  erfasseLernzeit,
  erhoeheSessionsZaehler,
  gesamtAbfragen,
  gesamtLerntage,
  holeOderErzeugeHeute,
  ladeStatistik,
  leereStatistik,
  letzteNTage,
  setzeErstenLerntagFallsNoetig,
  speichereStatistik,
} from '@/lib/statistik';
import type { StatistikSpeicher, TagesStatistik } from '@/lib/typen';
import {
  datumVorTagen,
  formatiereDatum,
  heutigesDatum,
  tageDazwischen,
  wochentagKurz,
} from '@/lib/datum';

function leererTag(datum: string): TagesStatistik {
  return {
    datum,
    abfragen: {
      nicht_gewusst: 0,
      wenig_gewusst: 0,
      gut_gewusst: 0,
      perfekt_gewusst: 0,
    },
    abfragenGesamt: 0,
    karteneErledigt: 0,
    lernzeitSekunden: 0,
    sessionsGestartet: 0,
  };
}

function tagMit(datum: string, abfragenGesamt: number): TagesStatistik {
  const t = leererTag(datum);
  t.abfragen.gut_gewusst = abfragenGesamt;
  t.abfragenGesamt = abfragenGesamt;
  return t;
}

describe('datum.ts', () => {
  it('heutigesDatum liefert lokale YYYY-MM-DD (NICHT UTC)', () => {
    // 13. Mai 2026, 01:00 Lokalzeit → in vielen Zeitzonen wäre UTC noch der 12. Mai.
    // Wir prüfen mit Local-Konstruktor, dass das lokale Jahr/Monat/Tag verwendet wird.
    const d = new Date(2026, 4, 13, 1, 0, 0); // Monat 4 = Mai
    expect(heutigesDatum(d)).toBe('2026-05-13');
  });

  it('tageDazwischen berechnet Tagesdifferenz korrekt (auch über Monatswechsel)', () => {
    expect(tageDazwischen('2026-05-13', '2026-05-13')).toBe(0);
    expect(tageDazwischen('2026-05-13', '2026-05-14')).toBe(1);
    expect(tageDazwischen('2026-05-14', '2026-05-13')).toBe(-1);
    expect(tageDazwischen('2026-04-30', '2026-05-01')).toBe(1);
    expect(tageDazwischen('2025-12-31', '2026-01-01')).toBe(1);
  });

  it('datumVorTagen ist konsistent mit heutigesDatum', () => {
    const d = new Date(2026, 4, 13, 12, 0, 0);
    expect(datumVorTagen(0, d)).toBe('2026-05-13');
    expect(datumVorTagen(1, d)).toBe('2026-05-12');
    expect(datumVorTagen(13, d)).toBe('2026-04-30');
  });

  it('wochentagKurz liefert korrektes Kürzel', () => {
    // 2026-05-13 ist ein Mittwoch
    expect(wochentagKurz('2026-05-13')).toBe('Mi');
    // 2026-05-11 ist ein Montag
    expect(wochentagKurz('2026-05-11')).toBe('Mo');
  });

  it('formatiereDatum gibt "Heute"/"Gestern" und ansonsten Wochentag + Datum', () => {
    const d = new Date(2026, 4, 13, 12, 0, 0);
    expect(formatiereDatum('2026-05-13', d)).toBe('Heute');
    expect(formatiereDatum('2026-05-12', d)).toBe('Gestern');
    // 2026-05-11 ist ein Montag
    expect(formatiereDatum('2026-05-11', d)).toBe('Mo, 11.05.');
  });
});

describe('Statistik-Grundgerüst', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('leereStatistik & ladeStatistik bei fehlendem Speicher', () => {
    expect(leereStatistik()).toEqual({ tage: [], ersterLerntag: null });
    expect(ladeStatistik()).toEqual({ tage: [], ersterLerntag: null });
  });

  it('ladeStatistik liefert leereStatistik bei korruptem JSON', () => {
    localStorage.setItem(STATISTIK_KEY, '{kaputt');
    expect(ladeStatistik()).toEqual({ tage: [], ersterLerntag: null });
  });

  it('ladeStatistik sortiert tage aufsteigend', () => {
    const s: StatistikSpeicher = {
      tage: [tagMit('2026-05-13', 1), tagMit('2026-05-11', 2), tagMit('2026-05-12', 3)],
      ersterLerntag: '2026-05-11',
    };
    speichereStatistik(s);
    const geladen = ladeStatistik();
    expect(geladen.tage.map((t) => t.datum)).toEqual([
      '2026-05-11',
      '2026-05-12',
      '2026-05-13',
    ]);
  });

  it('holeOderErzeugeHeute erzeugt Eintrag und setzt ersterLerntag', () => {
    const s = leereStatistik();
    const t = holeOderErzeugeHeute(s, '2026-05-13');
    expect(t.datum).toBe('2026-05-13');
    expect(t.abfragenGesamt).toBe(0);
    expect(s.tage).toHaveLength(1);
    expect(s.ersterLerntag).toBe('2026-05-13');
  });

  it('holeOderErzeugeHeute liefert existierenden Eintrag zurück (keine Duplikate)', () => {
    const s: StatistikSpeicher = {
      tage: [tagMit('2026-05-13', 5)],
      ersterLerntag: '2026-05-11',
    };
    const t = holeOderErzeugeHeute(s, '2026-05-13');
    expect(t.abfragenGesamt).toBe(5);
    expect(s.tage).toHaveLength(1);
    expect(s.ersterLerntag).toBe('2026-05-11');
  });
});

describe('Pflichtfall 5: Bewertung erhöht den richtigen Zähler des heutigen Eintrags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('aktualisiereBewertung("gut_gewusst", false, heute) auf leerer Statistik', () => {
    aktualisiereBewertung('gut_gewusst', false, '2026-05-13');
    const s = ladeStatistik();
    expect(s.tage).toHaveLength(1);
    const heute = s.tage[0];
    expect(heute.datum).toBe('2026-05-13');
    expect(heute.abfragen.gut_gewusst).toBe(1);
    expect(heute.abfragen.nicht_gewusst).toBe(0);
    expect(heute.abfragen.wenig_gewusst).toBe(0);
    expect(heute.abfragen.perfekt_gewusst).toBe(0);
    expect(heute.abfragenGesamt).toBe(1);
    expect(heute.karteneErledigt).toBe(0);
    expect(s.ersterLerntag).toBe('2026-05-13');
  });

  it('mehrere Bewertungen akkumulieren korrekt', () => {
    aktualisiereBewertung('nicht_gewusst', false, '2026-05-13');
    aktualisiereBewertung('gut_gewusst', false, '2026-05-13');
    aktualisiereBewertung('perfekt_gewusst', true, '2026-05-13');
    const s = ladeStatistik();
    const heute = s.tage[0];
    expect(heute.abfragen).toEqual({
      nicht_gewusst: 1,
      wenig_gewusst: 0,
      gut_gewusst: 1,
      perfekt_gewusst: 1,
    });
    expect(heute.abfragenGesamt).toBe(3);
    expect(heute.karteneErledigt).toBe(1);
  });

  it('erhoeheSessionsZaehler und setzeErstenLerntagFallsNoetig wirken nur einmal auf ersterLerntag', () => {
    erhoeheSessionsZaehler('2026-05-13');
    erhoeheSessionsZaehler('2026-05-13');
    setzeErstenLerntagFallsNoetig('2030-01-01'); // darf ersterLerntag NICHT überschreiben
    const s = ladeStatistik();
    expect(s.tage[0].sessionsGestartet).toBe(2);
    expect(s.ersterLerntag).toBe('2026-05-13');
  });
});

describe('Pflichtfall 6: Streak-Berechnung', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('drei aufeinanderfolgende Tage aktiv → Streak 3', () => {
    const s: StatistikSpeicher = {
      tage: [
        tagMit('2026-05-11', 2),
        tagMit('2026-05-12', 5),
        tagMit('2026-05-13', 3),
      ],
      ersterLerntag: '2026-05-11',
    };
    expect(berechneStreak(s, '2026-05-13')).toBe(3);
  });

  it('Lücke mittendrin bricht den Streak ab — nur heute aktiv, gestern fehlt → 1', () => {
    const s: StatistikSpeicher = {
      tage: [tagMit('2026-05-11', 4), tagMit('2026-05-13', 2)],
      ersterLerntag: '2026-05-11',
    };
    expect(berechneStreak(s, '2026-05-13')).toBe(1);
  });

  it('Wenn heute noch nicht aktiv: Streak ist 0', () => {
    const s: StatistikSpeicher = {
      tage: [tagMit('2026-05-11', 2), tagMit('2026-05-12', 3)],
      ersterLerntag: '2026-05-11',
    };
    expect(berechneStreak(s, '2026-05-13')).toBe(0);
  });

  it('leere Statistik → Streak 0', () => {
    expect(berechneStreak(leereStatistik(), '2026-05-13')).toBe(0);
  });
});

describe('Pflichtfall 7: Lernzeit-Kappung auf 60s pro Aufruf (eine Karte)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('erfasseLernzeit(300, heute) addiert nur 60 s zur Tagessumme', () => {
    erfasseLernzeit(300, '2026-05-13');
    const s = ladeStatistik();
    expect(s.tage[0].lernzeitSekunden).toBe(60);
  });

  it('mehrere Karten werden einzeln gekappt und summiert', () => {
    erfasseLernzeit(300, '2026-05-13'); // → 60
    erfasseLernzeit(20, '2026-05-13'); // → 20
    erfasseLernzeit(75, '2026-05-13'); // → 60
    const s = ladeStatistik();
    expect(s.tage[0].lernzeitSekunden).toBe(60 + 20 + 60);
  });

  it('negative oder null-Werte werden ignoriert (kein Eintrag erzeugt)', () => {
    erfasseLernzeit(0, '2026-05-13');
    erfasseLernzeit(-100, '2026-05-13');
    const s = ladeStatistik();
    // Da nichts geschrieben wurde, sollte kein Tageseintrag existieren.
    expect(s.tage).toHaveLength(0);
  });
});

describe('letzteNTage & Summen-Helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('letzteNTage füllt fehlende Tage mit leeren Einträgen auf', () => {
    const s: StatistikSpeicher = {
      tage: [tagMit('2026-05-11', 4), tagMit('2026-05-13', 2)],
      ersterLerntag: '2026-05-11',
    };
    const reihe = letzteNTage(s, 3, '2026-05-13');
    expect(reihe.map((t) => t.datum)).toEqual([
      '2026-05-11',
      '2026-05-12',
      '2026-05-13',
    ]);
    expect(reihe[0].abfragenGesamt).toBe(4);
    expect(reihe[1].abfragenGesamt).toBe(0);
    expect(reihe[2].abfragenGesamt).toBe(2);
  });

  it('letzteNTage mit n=14 liefert genau 14 Einträge', () => {
    const s = leereStatistik();
    const reihe = letzteNTage(s, 14, '2026-05-13');
    expect(reihe).toHaveLength(14);
    expect(reihe[13].datum).toBe('2026-05-13');
    expect(reihe[0].datum).toBe('2026-04-30');
  });

  it('gesamtAbfragen & gesamtLerntage summieren korrekt', () => {
    const s: StatistikSpeicher = {
      tage: [tagMit('2026-05-11', 4), tagMit('2026-05-12', 0), tagMit('2026-05-13', 3)],
      ersterLerntag: '2026-05-11',
    };
    expect(gesamtAbfragen(s)).toBe(7);
    expect(gesamtLerntage(s)).toBe(2);
  });
});
