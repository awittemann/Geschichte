'use client';

import { useSpracherkennung } from '@/lib/client/spracherkennung';

type Props = {
  /** Erhält das erkannte Transkript. */
  onText: (text: string) => void;
  disabled?: boolean;
};

/**
 * Mikrofon-Button, der die Web Speech API anstößt. Blendet sich komplett aus,
 * wenn der Browser keine Spracherkennung unterstützt.
 */
export default function SpracheingabeButton({ onText, disabled }: Props) {
  const { unterstuetzt, hoert, starten, stoppen } = useSpracherkennung({
    onText,
  });

  if (!unterstuetzt) return null;

  return (
    <button
      type="button"
      onClick={hoert ? stoppen : starten}
      disabled={disabled}
      aria-pressed={hoert}
      aria-label={hoert ? 'Aufnahme stoppen' : 'Antwort diktieren'}
      className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 ${
        hoert
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-slate-200 hover:bg-slate-300 text-slate-900'
      }`}
    >
      {hoert ? '⏹ Aufnahme…' : '🎤 Diktieren'}
    </button>
  );
}
