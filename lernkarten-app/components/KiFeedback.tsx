'use client';

import { useState } from 'react';
import type { KiChatNachricht } from '@/lib/client/api';
import { clampScore, scoreZuBewertung } from '@/lib/kiBewertung';
import type { Bewertung } from '@/lib/typen';

type Props = {
  score: number;
  feedback: string;
  musterloesung: string;
  nutzerAntwort: string;
  /** Rückfragen-Chat NACH dem Feedback (Feedback selbst nicht enthalten). */
  chat: KiChatNachricht[];
  chatLaedt: boolean;
  chatFehler: string | null;
  onFrage: (text: string) => void;
};

const BALKEN_FARBE: Record<Bewertung, string> = {
  nicht_gewusst: 'bg-red-500',
  wenig_gewusst: 'bg-orange-500',
  gut_gewusst: 'bg-yellow-400',
  perfekt_gewusst: 'bg-green-600',
};

export default function KiFeedback({
  score,
  feedback,
  musterloesung,
  nutzerAntwort,
  chat,
  chatLaedt,
  chatFehler,
  onFrage,
}: Props) {
  const [frage, setFrage] = useState('');
  const sichereScore = clampScore(score);
  const balken = BALKEN_FARBE[scoreZuBewertung(sichereScore)];

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    const text = frage.trim();
    if (!text || chatLaedt) return;
    onFrage(text);
    setFrage('');
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Score */}
      <div className="rounded-2xl bg-white shadow-md p-5 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-slate-600">
            Bewertung
          </span>
          <span className="text-2xl font-bold text-slate-900">
            {sichereScore}
            <span className="text-base font-medium text-slate-400"> / 100</span>
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] ${balken}`}
            style={{ width: `${sichereScore}%` }}
          />
        </div>
        <p className="text-base text-slate-900 leading-relaxed whitespace-pre-line">
          {feedback}
        </p>
      </div>

      {/* Vergleich */}
      <div className="rounded-2xl bg-white shadow-sm p-4 flex flex-col gap-3 text-sm">
        <div>
          <div className="text-slate-500 mb-1">Deine Antwort</div>
          <div className="text-slate-900 whitespace-pre-line">
            {nutzerAntwort}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <div className="text-slate-500 mb-1">Musterlösung</div>
          <div className="text-slate-900 whitespace-pre-line">
            {musterloesung}
          </div>
        </div>
      </div>

      {/* Rückfragen-Chat */}
      <div className="rounded-2xl bg-white shadow-sm p-4 flex flex-col gap-3">
        <div className="text-sm font-medium text-slate-600">
          Rückfrage zum Feedback
        </div>
        {chat.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {chat.map((n, i) => (
              <li
                key={i}
                className={
                  n.rolle === 'nutzer'
                    ? 'self-end max-w-[85%] rounded-2xl rounded-br-sm bg-blue-600 text-white px-3 py-2 text-sm whitespace-pre-line'
                    : 'self-start max-w-[85%] rounded-2xl rounded-bl-sm bg-slate-100 text-slate-900 px-3 py-2 text-sm whitespace-pre-line'
                }
              >
                {n.text}
              </li>
            ))}
          </ul>
        ) : null}
        {chatLaedt ? (
          <div className="text-sm text-slate-400" aria-live="polite">
            KI denkt nach…
          </div>
        ) : null}
        {chatFehler ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {chatFehler}
          </p>
        ) : null}
        <form onSubmit={absenden} className="flex items-end gap-2">
          <textarea
            value={frage}
            onChange={(e) => setFrage(e.target.value)}
            rows={2}
            placeholder="z. B. „Warum ist das wichtig?“"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          <button
            type="submit"
            disabled={chatLaedt || frage.trim().length === 0}
            className="shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium px-4 py-2 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Senden
          </button>
        </form>
      </div>
    </div>
  );
}
