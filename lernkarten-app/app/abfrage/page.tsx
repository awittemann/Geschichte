'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Fortschritt } from '@/lib/typen';
import { initialisiereFortschrittAusDaten, speichereFortschritt } from '@/lib/speicher';
import {
  DATEN,
  KARTEN_INDEX as INDEX,
  ladeOderInitFortschritt,
} from '@/lib/kartenIndex';
import {
  istSessionAbgeschlossen,
  verarbeiteBewertung,
  waehleNaechsteKarte,
} from '@/lib/lernAlgorithmus';
import { scoreZuBewertung } from '@/lib/kiBewertung';
import {
  aktualisiereBewertung,
  erfasseLernzeit,
  markiereKarteAngesehen,
  setzeErstenLerntagFallsNoetig,
} from '@/lib/statistik';
import { heutigesDatum } from '@/lib/datum';
import { useIstClient } from '@/lib/sessionStats';
import { apiKiBewerten, apiKiChat, type KiChatNachricht } from '@/lib/client/api';
import { useSpracherkennungVerfuegbar } from '@/lib/client/spracherkennung';
import Fortschrittsbalken from '@/components/Fortschrittsbalken';
import SpracheingabeButton from '@/components/SpracheingabeButton';
import KiFeedback from '@/components/KiFeedback';

type Phase = 'eingabe' | 'pruefen' | 'feedback';

export default function AbfrageSeite() {
  const router = useRouter();
  const istClient = useIstClient();
  const spracheVerfuegbar = useSpracherkennungVerfuegbar();

  const [fortschritt, setFortschritt] = useState<Fortschritt | null>(() => {
    if (typeof window === 'undefined') return null;
    return ladeOderInitFortschritt();
  });
  const [aktuelleId, setAktuelleId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const f = ladeOderInitFortschritt();
    if (istSessionAbgeschlossen(f)) return null;
    return waehleNaechsteKarte(f, INDEX.reihenfolge);
  });

  const [phase, setPhase] = useState<Phase>('eingabe');
  const [eingabe, setEingabe] = useState('');
  const [kiErgebnis, setKiErgebnis] = useState<{
    score: number;
    feedback: string;
  } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [chat, setChat] = useState<KiChatNachricht[]>([]);
  const [chatLaedt, setChatLaedt] = useState(false);
  const [chatFehler, setChatFehler] = useState<string | null>(null);
  const [animKey, setAnimKey] = useState(0);
  // Startzeitpunkt der aktuellen Karte; wird im Effekt unten gesetzt.
  const startZeitRef = useRef<number>(0);

  // Karte als angesehen markieren und die Lernzeit-Messung neu starten,
  // sobald eine andere Karte auf den Bildschirm kommt.
  useEffect(() => {
    if (aktuelleId) markiereKarteAngesehen(aktuelleId);
    startZeitRef.current = Date.now();
  }, [aktuelleId]);

  const onPruefen = useCallback(async () => {
    if (!fortschritt || !aktuelleId) return;
    const antwort = eingabe.trim();
    if (!antwort) {
      setFehler('Bitte zuerst eine Antwort eingeben.');
      return;
    }
    setFehler(null);
    setPhase('pruefen');
    try {
      const { score, feedback } = await apiKiBewerten(aktuelleId, antwort);
      const heute = heutigesDatum();
      const bewertung = scoreZuBewertung(score);

      const sek = Math.round((Date.now() - startZeitRef.current) / 1000);
      erfasseLernzeit(sek, heute);

      const { neuerFortschritt, wurdeErledigt } = verarbeiteBewertung(
        fortschritt,
        aktuelleId,
        bewertung,
      );
      // KI-Score zusätzlich im Kartenstatus festhalten.
      const karte = neuerFortschritt.karten[aktuelleId];
      const mitScore: Fortschritt = {
        ...neuerFortschritt,
        karten: {
          ...neuerFortschritt.karten,
          [aktuelleId]: { ...karte, letzteKiScore: score },
        },
      };

      aktualisiereBewertung(bewertung, wurdeErledigt, heute);
      setzeErstenLerntagFallsNoetig(heute);
      speichereFortschritt(mitScore);

      setFortschritt(mitScore);
      setKiErgebnis({ score, feedback });
      setChat([]);
      setChatFehler(null);
      setPhase('feedback');
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Unbekannter Fehler');
      setPhase('eingabe');
    }
  }, [fortschritt, aktuelleId, eingabe]);

  const onNaechste = useCallback(() => {
    if (!fortschritt) return;
    if (istSessionAbgeschlossen(fortschritt)) {
      router.push('/abschluss');
      return;
    }
    const naechste = waehleNaechsteKarte(fortschritt, INDEX.reihenfolge);
    setAktuelleId(naechste);
    setEingabe('');
    setKiErgebnis(null);
    setChat([]);
    setChatFehler(null);
    setFehler(null);
    setPhase('eingabe');
    setAnimKey((k) => k + 1);
  }, [fortschritt, router]);

  const onNeueSession = useCallback(() => {
    const f = initialisiereFortschrittAusDaten(DATEN);
    speichereFortschritt(f);
    setFortschritt(f);
    setAktuelleId(waehleNaechsteKarte(f, INDEX.reihenfolge));
    setEingabe('');
    setKiErgebnis(null);
    setChat([]);
    setChatFehler(null);
    setFehler(null);
    setPhase('eingabe');
    setAnimKey((k) => k + 1);
  }, []);

  const onFrage = useCallback(
    async (text: string) => {
      if (!aktuelleId || !kiErgebnis) return;
      setChatFehler(null);
      // Verlauf für die API: Feedback als erste assistent-Nachricht voranstellen.
      const verlauf: KiChatNachricht[] = [
        { rolle: 'assistent', text: kiErgebnis.feedback },
        ...chat,
        { rolle: 'nutzer', text },
      ];
      setChat((c) => [...c, { rolle: 'nutzer', text }]);
      setChatLaedt(true);
      try {
        const { antwort } = await apiKiChat(aktuelleId, eingabe.trim(), verlauf);
        setChat((c) => [...c, { rolle: 'assistent', text: antwort }]);
      } catch (err) {
        setChatFehler(
          err instanceof Error ? err.message : 'Unbekannter Fehler',
        );
      } finally {
        setChatLaedt(false);
      }
    },
    [aktuelleId, kiErgebnis, chat, eingabe],
  );

  if (!istClient || !fortschritt) {
    return (
      <main className="mx-auto max-w-md safe-area-px safe-area-py w-full">
        <div className="text-slate-500 text-center mt-8">Lädt…</div>
      </main>
    );
  }

  const offen = Object.values(fortschritt.karten).filter(
    (k) => k.abfragenBisErledigt > 0,
  ).length;
  const erledigt = INDEX.gesamt - offen;
  const karteDaten = aktuelleId ? INDEX.byId.get(aktuelleId) : null;

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-py w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Zurück zur Startseite"
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-base font-medium px-2 py-1 -ml-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← Zurück
        </button>
        <div className="flex-1 min-w-0">
          <Fortschrittsbalken aktuell={erledigt} gesamt={INDEX.gesamt} kompakt />
          <div className="text-xs text-slate-500 mt-1 text-center">
            Noch {offen} {offen === 1 ? 'Karte' : 'Karten'}
          </div>
        </div>
      </div>

      {karteDaten ? (
        <div key={`${aktuelleId}-${animKey}`} className="anim-slide-in flex flex-col gap-4">
          <div className="text-xs text-slate-500 text-right">
            {karteDaten.kategorie}
          </div>

          <div className="rounded-2xl bg-white shadow-md p-6">
            <div className="text-xl text-slate-900 leading-relaxed whitespace-pre-line">
              {karteDaten.frage}
            </div>
          </div>

          {phase === 'feedback' && kiErgebnis ? (
            <>
              <KiFeedback
                score={kiErgebnis.score}
                feedback={kiErgebnis.feedback}
                musterloesung={karteDaten.antwort}
                nutzerAntwort={eingabe.trim()}
                chat={chat}
                chatLaedt={chatLaedt}
                chatFehler={chatFehler}
                onFrage={onFrage}
              />
              <button
                type="button"
                onClick={onNaechste}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Nächste Karte
              </button>
            </>
          ) : (
            <div className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-3">
              <label
                htmlFor="antwort-eingabe"
                className="text-sm text-slate-600"
              >
                Deine Antwort
              </label>
              <textarea
                id="antwort-eingabe"
                value={eingabe}
                onChange={(e) => setEingabe(e.target.value)}
                rows={5}
                disabled={phase === 'pruefen'}
                placeholder="Antwort eintippen oder diktieren…"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
              />
              <div className="flex items-center gap-2">
                <SpracheingabeButton
                  disabled={phase === 'pruefen'}
                  onText={(text) =>
                    setEingabe((e) => (e ? `${e} ${text}` : text))
                  }
                />
                <span className="text-xs text-slate-500">
                  {spracheVerfuegbar
                    ? 'Sprache wird im Browser erkannt.'
                    : 'Auf dem iPhone: ins Textfeld tippen und die 🎤-Taste der Tastatur zum Diktieren nutzen.'}
                </span>
              </div>
              {fehler ? (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {fehler}
                </p>
              ) : null}
              <button
                type="button"
                onClick={onPruefen}
                disabled={phase === 'pruefen' || eingabe.trim().length === 0}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-4 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {phase === 'pruefen' ? 'KI bewertet…' : 'Antwort prüfen'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-md p-6 text-center flex flex-col gap-4">
          <p className="text-lg text-slate-700">
            Keine Karten zu lernen. Starte eine neue Session.
          </p>
          <button
            type="button"
            onClick={onNeueSession}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-semibold py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Neue Lernsession starten
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Zur Startseite
          </button>
        </div>
      )}
    </main>
  );
}
