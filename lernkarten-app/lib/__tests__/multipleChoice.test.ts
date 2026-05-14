import { describe, it, expect } from 'vitest';
import {
  bewertungFuerAbfragen,
  verarbeiteMultipleChoice,
} from '@/lib/lernAlgorithmus';
import { baueOptionen } from '@/lib/multipleChoice';
import type { Fortschritt, KartenStatus } from '@/lib/typen';

function makeKarte(id: string, abfragen = 1, anzahl = 0): KartenStatus {
  return {
    id,
    letzteBewertung: null,
    abfragenBisErledigt: abfragen,
    anzahlAbfragen: anzahl,
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

describe('bewertungFuerAbfragen', () => {
  it('bildet abfragenBisErledigt auf eine Stufe ab', () => {
    expect(bewertungFuerAbfragen(0)).toBe('perfekt_gewusst');
    expect(bewertungFuerAbfragen(1)).toBe('gut_gewusst');
    expect(bewertungFuerAbfragen(2)).toBe('gut_gewusst');
    expect(bewertungFuerAbfragen(3)).toBe('wenig_gewusst');
    expect(bewertungFuerAbfragen(4)).toBe('nicht_gewusst');
  });
});

describe('verarbeiteMultipleChoice', () => {
  it('macht die Karte bei richtiger Auswahl eine Stufe besser', () => {
    const f = makeFortschritt([makeKarte('a', 4)]);
    const { neuerFortschritt, wurdeErledigt, bewertung } = verarbeiteMultipleChoice(
      f,
      'a',
      true,
    );
    expect(neuerFortschritt.karten.a.abfragenBisErledigt).toBe(3);
    expect(neuerFortschritt.karten.a.anzahlAbfragen).toBe(1);
    expect(wurdeErledigt).toBe(false);
    expect(bewertung).toBe('wenig_gewusst');
  });

  it('erledigt eine Karte, die von 1 auf 0 fällt', () => {
    const f = makeFortschritt([makeKarte('a', 1)]);
    const { neuerFortschritt, wurdeErledigt, bewertung } = verarbeiteMultipleChoice(
      f,
      'a',
      true,
    );
    expect(neuerFortschritt.karten.a.abfragenBisErledigt).toBe(0);
    expect(wurdeErledigt).toBe(true);
    expect(bewertung).toBe('perfekt_gewusst');
  });

  it('macht die Karte bei falscher Auswahl eine Stufe schlechter', () => {
    const f = makeFortschritt([makeKarte('a', 2)]);
    const { neuerFortschritt, wurdeErledigt } = verarbeiteMultipleChoice(f, 'a', false);
    expect(neuerFortschritt.karten.a.abfragenBisErledigt).toBe(3);
    expect(wurdeErledigt).toBe(false);
  });

  it('kappt eine falsche Auswahl bei 4', () => {
    const f = makeFortschritt([makeKarte('a', 4)]);
    const { neuerFortschritt } = verarbeiteMultipleChoice(f, 'a', false);
    expect(neuerFortschritt.karten.a.abfragenBisErledigt).toBe(4);
  });

  it('lässt den ursprünglichen Fortschritt unverändert (immutabel)', () => {
    const f = makeFortschritt([makeKarte('a', 2)]);
    verarbeiteMultipleChoice(f, 'a', true);
    expect(f.karten.a.abfragenBisErledigt).toBe(2);
    expect(f.karten.a.anzahlAbfragen).toBe(0);
  });

  it('lässt unbekannte IDs unverändert', () => {
    const f = makeFortschritt([makeKarte('a', 2)]);
    const { neuerFortschritt, wurdeErledigt } = verarbeiteMultipleChoice(f, 'x', true);
    expect(neuerFortschritt).toBe(f);
    expect(wurdeErledigt).toBe(false);
  });

  it('merkt sich die erste Bewertung der Session', () => {
    const f = makeFortschritt([makeKarte('a', 1)]);
    const erst = verarbeiteMultipleChoice(f, 'a', true);
    expect(erst.neuerFortschritt.ersteBewertungen.a).toBe('perfekt_gewusst');
    // Spätere Bewertung überschreibt die erste nicht.
    const zweit = verarbeiteMultipleChoice(erst.neuerFortschritt, 'a', false);
    expect(zweit.neuerFortschritt.ersteBewertungen.a).toBe('perfekt_gewusst');
  });
});

describe('baueOptionen', () => {
  const richtig = 'Die richtige Antwort.';
  const pool = ['Falsch A', 'Falsch B', 'Falsch C', 'Falsch D', 'Falsch E'];

  it('liefert genau 3 Optionen mit genau einer richtigen', () => {
    const optionen = baueOptionen(richtig, pool, [], () => 0.5);
    expect(optionen).toHaveLength(3);
    expect(optionen.filter((o) => o.istRichtig)).toHaveLength(1);
    expect(optionen.find((o) => o.istRichtig)?.text).toBe(richtig);
  });

  it('zieht die Distraktoren aus dem Pool', () => {
    const optionen = baueOptionen(richtig, pool, [], () => 0);
    const distraktoren = optionen.filter((o) => !o.istRichtig).map((o) => o.text);
    expect(distraktoren).toHaveLength(2);
    for (const d of distraktoren) expect(pool).toContain(d);
  });

  it('verwendet die richtige Antwort nie als Distraktor', () => {
    const poolMitRichtiger = [richtig, 'Falsch A', 'Falsch B'];
    const optionen = baueOptionen(richtig, poolMitRichtiger, [], () => 0.3);
    expect(optionen.filter((o) => o.text === richtig)).toHaveLength(1);
  });

  it('füllt aus dem Fallback auf, wenn der Pool zu klein ist', () => {
    const optionen = baueOptionen(richtig, ['Nur einer'], ['Ersatz 1', 'Ersatz 2'], () => 0.7);
    expect(optionen).toHaveLength(3);
    const distraktoren = optionen.filter((o) => !o.istRichtig).map((o) => o.text);
    expect(distraktoren).toContain('Nur einer');
    expect(distraktoren.some((d) => d === 'Ersatz 1' || d === 'Ersatz 2')).toBe(true);
  });

  it('entfernt Duplikate aus dem Pool', () => {
    const optionen = baueOptionen(richtig, ['Falsch A', 'Falsch A'], ['Ersatz 1'], () => 0.1);
    const distraktoren = optionen.filter((o) => !o.istRichtig).map((o) => o.text);
    expect(new Set(distraktoren).size).toBe(distraktoren.length);
    expect(distraktoren).toContain('Falsch A');
    expect(distraktoren).toContain('Ersatz 1');
  });
});
