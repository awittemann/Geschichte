'use client';

import type { ReactNode } from 'react';

type Props = {
  frage: string;
  antwort?: string;
  antwortSichtbar: boolean;
  onTipp: () => void;
  /** Optionaler Key für die Slide-Animation (z. B. KartenId + Counter). */
  animationKey?: string | number;
  /** Optionaler Footer-Bereich (Bewertungs-Buttons oder „Antwort anzeigen"). */
  footer?: ReactNode;
};

/**
 * Frage-/Antwort-Karte mit weißem Hintergrund.
 * - Im Zustand A (Antwort verborgen): Frage zentriert in großer Schrift.
 *   Tippen auf die Karte deckt die Antwort auf.
 * - Im Zustand B (Antwort sichtbar): Frage kleiner oben, Antwort darunter (fade-in).
 *
 * Der animationKey erzwingt durch React-Key einen Re-Mount und damit ein erneutes
 * Abspielen der slide-in-Animation.
 */
export default function Karte({
  frage,
  antwort,
  antwortSichtbar,
  onTipp,
  animationKey,
  footer,
}: Props) {
  return (
    <div
      key={animationKey}
      className="anim-slide-in rounded-2xl bg-white shadow-md p-6 flex flex-col gap-4"
    >
      {antwortSichtbar ? (
        <>
          <div className="text-base text-slate-500 leading-snug">{frage}</div>
          <div
            className="anim-fade-in text-xl text-slate-900 leading-relaxed whitespace-pre-line"
            aria-live="polite"
          >
            {antwort}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={onTipp}
          aria-label="Antwort anzeigen"
          className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
        >
          <div className="text-2xl text-slate-900 leading-relaxed whitespace-pre-line text-center py-6">
            {frage}
          </div>
        </button>
      )}
      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}
