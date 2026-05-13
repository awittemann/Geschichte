import { describe, it, expect } from 'vitest';
import {
  BEWERTUNG_ZU_ABFRAGEN,
  anzahlErledigt,
  istSessionAbgeschlossen,
  offeneKarten,
  verarbeiteBewertung,
  waehleNaechsteKarte,
} from '@/lib/lernAlgorithmus';
import type { Fortschritt, KartenStatus } from '@/lib/typen';

function makeKarte(id: string, abfragen = 1): KartenStatus {
  return {
    id,
    letzteBewertung: null,
    abfragenBisErledigt: abfragen,
    anzahlAbfragen: 0,
  };
}

function makeFortschritt(karten: KartenStatus[]): Fortschritt {
  const map: Record<string, KartenStatus> = {};
  for (const k of karten) map[k.id] = k;
  return {
    karten: map,
    zuletztGezeigteId: null,
    sessionStart: 0,
    ersteBewertungen: {},
  };
}

describe('Bewertungstabelle', () => {
  it('entspricht exakt der Spec', () => {
    expect(BEWERTUNG_ZU_ABFRAGEN).toEqual({
      nicht_gewusst: 4,
      wenig_gewusst: 3,
      gut_gewusst: 2,
      perfekt_gewusst: 0,
    });
  });
});

describe('verarbeiteBewertung — Pflichtfall 1 & 2', () => {
  it('perfekt_gewusst auf Karte mit abfragenBisErledigt=1 setzt sie auf 0 und meldet wurdeErledigt=true', () => {
    const f = makeFortschritt([makeKarte('a', 1)]);
    const { neuerFortschritt, wurdeErledigt } = verarbeiteBewertung(f, 'a', 'perfekt_gewusst');
    expect(neuerFortschritt.karten.a.abfragenBisErledigt).toBe(0);
    expect(neuerFortschritt.karten.a.anzahlAbfragen).toBe(1);
    expect(neuerFortschritt.karten.a.letzteBewertung).toBe('perfekt_gewusst');
    expect(wurdeErledigt).toBe(true);
  });

  it('gut_gewusst auf Karte mit abfragenBisErledigt=1 setzt sie auf 2 und meldet wurdeErledigt=false', () => {
    const f = makeFortschritt([makeKarte('a', 1)]);
    const { neuerFortschritt, wurdeErledigt } = verarbeiteBewertung(f, 'a', 'gut_gewusst');
    expect(neuerFortschritt.karten.a.abfragenBisErledigt).toBe(2);
    expect(neuerFortschritt.karten.a.letzteBewertung).toBe('gut_gewusst');
    expect(wurdeErledigt).toBe(false);
  });

  it('wenig_gewusst setzt auf 3, nicht_gewusst auf 4', () => {
    const f = makeFortschritt([makeKarte('a', 1), makeKarte('b', 1)]);
    const a = verarbeiteBewertung(f, 'a', 'wenig_gewusst');
    expect(a.neuerFortschritt.karten.a.abfragenBisErledigt).toBe(3);
    expect(a.wurdeErledigt).toBe(false);
    const b = verarbeiteBewertung(f, 'b', 'nicht_gewusst');
    expect(b.neuerFortschritt.karten.b.abfragenBisErledigt).toBe(4);
    expect(b.wurdeErledigt).toBe(false);
  });

  it('verarbeiteBewertung ist immutabel — Original-Fortschritt bleibt unverändert', () => {
    const f = makeFortschritt([makeKarte('a', 1)]);
    verarbeiteBewertung(f, 'a', 'perfekt_gewusst');
    expect(f.karten.a.abfragenBisErledigt).toBe(1);
    expect(f.karten.a.anzahlAbfragen).toBe(0);
    expect(f.karten.a.letzteBewertung).toBeNull();
  });

  it('zweite Bewertung auf bereits erledigter Karte zählt nicht erneut als wurdeErledigt', () => {
    const f = makeFortschritt([makeKarte('a', 0)]);
    const { wurdeErledigt } = verarbeiteBewertung(f, 'a', 'perfekt_gewusst');
    expect(wurdeErledigt).toBe(false);
  });

  it('speichert ersteBewertung pro Karte nur einmal', () => {
    const f = makeFortschritt([makeKarte('a', 1)]);
    const erste = verarbeiteBewertung(f, 'a', 'nicht_gewusst');
    expect(erste.neuerFortschritt.ersteBewertungen.a).toBe('nicht_gewusst');
    const zweite = verarbeiteBewertung(erste.neuerFortschritt, 'a', 'perfekt_gewusst');
    expect(zweite.neuerFortschritt.ersteBewertungen.a).toBe('nicht_gewusst');
  });
});

describe('istSessionAbgeschlossen — Pflichtfall 3', () => {
  it('ist false, solange mindestens eine Karte > 0 hat', () => {
    const f = makeFortschritt([makeKarte('a', 0), makeKarte('b', 1)]);
    expect(istSessionAbgeschlossen(f)).toBe(false);
  });

  it('ist true, wenn alle Karten 0 haben', () => {
    const f = makeFortschritt([makeKarte('a', 0), makeKarte('b', 0), makeKarte('c', 0)]);
    expect(istSessionAbgeschlossen(f)).toBe(true);
  });

  it('ist false bei komplett leerem Stapel (nichts initialisiert)', () => {
    const f = makeFortschritt([]);
    expect(istSessionAbgeschlossen(f)).toBe(false);
  });
});

describe('offeneKarten & anzahlErledigt', () => {
  it('zählen Karten korrekt', () => {
    const f = makeFortschritt([
      makeKarte('a', 0),
      makeKarte('b', 1),
      makeKarte('c', 2),
      makeKarte('d', 0),
    ]);
    expect(offeneKarten(f)).toHaveLength(2);
    expect(anzahlErledigt(f)).toBe(2);
  });
});

describe('waehleNaechsteKarte — Phase 2 (Zufall, ohne Reihenfolge)', () => {
  it('gibt null, wenn keine offene Karte', () => {
    const f = makeFortschritt([makeKarte('a', 0)]);
    expect(waehleNaechsteKarte(f, [], () => 0)).toBeNull();
  });

  it('vermeidet zuletztGezeigteId, wenn weitere offen', () => {
    const f: Fortschritt = {
      karten: {
        a: { ...makeKarte('a', 1), anzahlAbfragen: 1 },
        b: { ...makeKarte('b', 1), anzahlAbfragen: 1 },
        c: { ...makeKarte('c', 1), anzahlAbfragen: 1 },
      },
      zuletztGezeigteId: 'a',
      sessionStart: 0,
      ersteBewertungen: {},
    };
    // Auch wenn zufall() bei index 0 landen würde, wäre die Kandidaten-Liste nur [b, c]
    for (const r of [0, 0.4, 0.9]) {
      const id = waehleNaechsteKarte(f, [], () => r);
      expect(id).not.toBe('a');
      expect(['b', 'c']).toContain(id);
    }
  });

  it('zeigt die zuletzt gezeigte Karte wieder, wenn sie die einzige offene ist', () => {
    const f: Fortschritt = {
      karten: {
        a: makeKarte('a', 0),
        b: { ...makeKarte('b', 1), anzahlAbfragen: 1 },
      },
      zuletztGezeigteId: 'b',
      sessionStart: 0,
      ersteBewertungen: {},
    };
    expect(waehleNaechsteKarte(f, [], () => 0)).toBe('b');
  });

  it('wählt deterministisch mit injiziertem zufall (alle Karten bereits gesehen)', () => {
    const f = makeFortschritt([
      { ...makeKarte('a', 1), anzahlAbfragen: 1 },
      { ...makeKarte('b', 1), anzahlAbfragen: 1 },
      { ...makeKarte('c', 1), anzahlAbfragen: 1 },
    ]);
    expect(waehleNaechsteKarte(f, [], () => 0)).toBe('a');
    expect(waehleNaechsteKarte(f, [], () => 0.5)).toBe('b');
    expect(waehleNaechsteKarte(f, [], () => 0.99)).toBe('c');
  });
});

describe('waehleNaechsteKarte — Phase 1 (Themen-Reihenfolge im ersten Durchlauf)', () => {
  it('frische Session: gibt erste Karte der Reihenfolge zurück, unabhängig vom RNG', () => {
    const f = makeFortschritt([makeKarte('a', 1), makeKarte('b', 1), makeKarte('c', 1)]);
    const reihenfolge = ['a', 'b', 'c'];
    // RNG würde sonst 'c' (index 2) liefern — Phase 1 dominiert.
    expect(waehleNaechsteKarte(f, reihenfolge, () => 0.99)).toBe('a');
    expect(waehleNaechsteKarte(f, reihenfolge, () => 0)).toBe('a');
  });

  it('überspringt bereits gesehene Karte und gibt nächste ungesehene aus der Reihenfolge', () => {
    // Karte 'a' wurde schon abgefragt (anzahlAbfragen=1), aber ist noch offen (z. B. nach gut_gewusst).
    // Phase 1 muss sie überspringen und 'b' liefern.
    const f: Fortschritt = {
      karten: {
        a: { id: 'a', letzteBewertung: 'gut_gewusst', abfragenBisErledigt: 2, anzahlAbfragen: 1 },
        b: makeKarte('b', 1),
        c: makeKarte('c', 1),
      },
      zuletztGezeigteId: 'a',
      sessionStart: 0,
      ersteBewertungen: { a: 'gut_gewusst' },
    };
    expect(waehleNaechsteKarte(f, ['a', 'b', 'c'], () => 0.99)).toBe('b');
  });

  it('schaltet auf Phase 2 (Zufall) um, sobald alle Karten mindestens einmal gesehen wurden', () => {
    // Alle Karten anzahlAbfragen ≥ 1, einige noch offen (abfragenBisErledigt > 0).
    const f: Fortschritt = {
      karten: {
        a: { id: 'a', letzteBewertung: 'gut_gewusst', abfragenBisErledigt: 2, anzahlAbfragen: 1 },
        b: { id: 'b', letzteBewertung: 'gut_gewusst', abfragenBisErledigt: 2, anzahlAbfragen: 1 },
        c: { id: 'c', letzteBewertung: 'perfekt_gewusst', abfragenBisErledigt: 0, anzahlAbfragen: 1 },
      },
      zuletztGezeigteId: 'a',
      sessionStart: 0,
      ersteBewertungen: { a: 'gut_gewusst', b: 'gut_gewusst', c: 'perfekt_gewusst' },
    };
    // Phase 1 findet keine ungesehene Karte → Phase 2.
    // Phase-2-Logik vermeidet zuletztGezeigteId='a' → Kandidaten = [b].
    // RNG ist egal — nur 'b' übrig (c ist erledigt).
    for (const r of [0, 0.5, 0.99]) {
      expect(waehleNaechsteKarte(f, ['a', 'b', 'c'], () => r)).toBe('b');
    }
  });
});
