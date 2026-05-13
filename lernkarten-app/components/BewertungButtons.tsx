'use client';

import type { Bewertung } from '@/lib/typen';

type Props = {
  onBewerten: (b: Bewertung) => void;
  /** Optional deaktivieren während Animation. */
  disabled?: boolean;
};

type Eintrag = {
  bewertung: Bewertung;
  label: string;
  emoji: string;
  klassen: string;
};

const EINTRAEGE: Eintrag[] = [
  {
    bewertung: 'nicht_gewusst',
    label: 'Nicht gewusst',
    emoji: '🔴',
    klassen: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
  },
  {
    bewertung: 'wenig_gewusst',
    label: 'Ein bisschen gewusst',
    emoji: '🟠',
    klassen: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white',
  },
  {
    bewertung: 'gut_gewusst',
    label: 'Gut gewusst',
    emoji: '🟡',
    klassen:
      'bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-600 text-slate-900',
  },
  {
    bewertung: 'perfekt_gewusst',
    label: 'Perfekt gewusst',
    emoji: '🟢',
    klassen: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white',
  },
];

/**
 * Vier vertikal gestapelte Bewertungs-Buttons.
 * Mindesthöhe 48 px (py-3 + Schrift), gut tippbar.
 */
export default function BewertungButtons({ onBewerten, disabled }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {EINTRAEGE.map((e) => (
        <button
          key={e.bewertung}
          type="button"
          onClick={() => onBewerten(e.bewertung)}
          disabled={disabled}
          aria-label={e.label}
          className={`w-full min-h-12 rounded-xl px-4 py-3 text-lg font-semibold flex items-center justify-center gap-2 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${e.klassen}`}
        >
          <span aria-hidden="true">{e.emoji}</span>
          <span>{e.label}</span>
        </button>
      ))}
    </div>
  );
}
