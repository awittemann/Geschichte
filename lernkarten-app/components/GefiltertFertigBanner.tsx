'use client';

import { useRouter } from 'next/navigation';
import { speichereKapitelFilter } from '@/lib/filterSpeicher';

type Props = {
  kapitel: string;
  /** Pfad des aktuellen Quiz-Modus, z. B. "/lernen". */
  modusPfad: string;
  /** Wird aufgerufen, nachdem der Filter entfernt wurde — Quiz-Seite soll dann neu starten. */
  onFilterEntfernt: () => void;
};

/**
 * Hinweis-Banner, wenn alle Karten des aktiven Kapitels durchgearbeitet sind.
 * Bietet zwei Wege: anderes Kapitel wählen oder ungefiltert weiterüben.
 */
export default function GefiltertFertigBanner({
  kapitel,
  modusPfad,
  onFilterEntfernt,
}: Props) {
  const router = useRouter();
  return (
    <div className="rounded-2xl bg-white shadow-md p-6 text-center flex flex-col gap-4">
      <p className="text-lg text-slate-700">
        Alle Karten aus „{kapitel}" sind durch. 🎉
      </p>
      <p className="text-sm text-slate-500 -mt-2">
        In anderen Kapiteln sind eventuell noch Karten offen.
      </p>
      <button
        type="button"
        onClick={() => router.push('/start')}
        className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Anderes Kapitel wählen
      </button>
      <button
        type="button"
        onClick={() => {
          speichereKapitelFilter(null);
          router.replace(modusPfad);
          onFilterEntfernt();
        }}
        className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        Alle Kapitel weiterüben
      </button>
      <button
        type="button"
        onClick={() => router.push('/')}
        className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        Zur Startseite
      </button>
    </div>
  );
}
