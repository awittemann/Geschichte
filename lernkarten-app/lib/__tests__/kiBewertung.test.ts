import { describe, it, expect } from 'vitest';
import { clampScore, scoreZuBewertung } from '@/lib/kiBewertung';

describe('clampScore', () => {
  it('lässt gültige Werte unverändert (gerundet)', () => {
    expect(clampScore(1)).toBe(1);
    expect(clampScore(50)).toBe(50);
    expect(clampScore(100)).toBe(100);
    expect(clampScore(72.4)).toBe(72);
    expect(clampScore(72.6)).toBe(73);
  });

  it('begrenzt Werte außerhalb 1–100', () => {
    expect(clampScore(0)).toBe(1);
    expect(clampScore(-20)).toBe(1);
    expect(clampScore(150)).toBe(100);
  });

  it('fällt bei nicht-endlichen Zahlen auf 1 zurück', () => {
    expect(clampScore(NaN)).toBe(1);
    expect(clampScore(Infinity)).toBe(1);
    expect(clampScore(-Infinity)).toBe(1);
  });
});

describe('scoreZuBewertung', () => {
  it('mappt die vier Stufen anhand der Schwellen', () => {
    expect(scoreZuBewertung(1)).toBe('nicht_gewusst');
    expect(scoreZuBewertung(40)).toBe('nicht_gewusst');
    expect(scoreZuBewertung(41)).toBe('wenig_gewusst');
    expect(scoreZuBewertung(65)).toBe('wenig_gewusst');
    expect(scoreZuBewertung(66)).toBe('gut_gewusst');
    expect(scoreZuBewertung(85)).toBe('gut_gewusst');
    expect(scoreZuBewertung(86)).toBe('perfekt_gewusst');
    expect(scoreZuBewertung(100)).toBe('perfekt_gewusst');
  });

  it('clampt Werte außerhalb des Bereichs vor dem Mapping', () => {
    expect(scoreZuBewertung(0)).toBe('nicht_gewusst');
    expect(scoreZuBewertung(-5)).toBe('nicht_gewusst');
    expect(scoreZuBewertung(200)).toBe('perfekt_gewusst');
  });
});
