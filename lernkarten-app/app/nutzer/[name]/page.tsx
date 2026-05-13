'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import lernkartenDaten from '@/data/lernkarten.json';
import type { LernkartenDaten } from '@/lib/typen';
import { apiNutzerDetail, apiPasswortAendern } from '@/lib/client/api';
import { useSitzung } from '@/lib/client/sitzung';
import type { DetailAntwort } from '@/lib/server/typen';
import { berechneStreak, gesamtAbfragen, gesamtLerntage, letzteNTage } from '@/lib/statistik';
import { formatiereDatum, heutigesDatum } from '@/lib/datum';
import TagesDiagramm from '@/components/TagesDiagramm';
import TagesListe from '@/components/TagesListe';

const DATEN = lernkartenDaten as LernkartenDaten;
const KARTEN_GESAMT = DATEN.kategorien.reduce((acc, k) => acc + k.karten.length, 0);

export default function NutzerProfilSeite({ params }: { params: Promise<{ name: string }> }) {
  const { name: rawName } = use(params);
  const name = decodeURIComponent(rawName);
  const router = useRouter();
  const { sitzung, aktualisiereHatPasswort } = useSitzung();
  const [detail, setDetail] = useState<DetailAntwort | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const heute = heutigesDatum();

  useEffect(() => {
    let abgebrochen = false;
    void (async () => {
      try {
        const d = await apiNutzerDetail(name);
        if (!abgebrochen) setDetail(d);
      } catch (err) {
        if (!abgebrochen) setFehler(err instanceof Error ? err.message : 'Fehler');
      }
    })();
    return () => {
      abgebrochen = true;
    };
  }, [name]);

  const eigener =
    sitzung.status === 'bereit' && sitzung.nutzer !== null && sitzung.nutzer.name === name;

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-pb w-full flex flex-col gap-4 mt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/nutzer')}
          aria-label="Zurück zur Nutzerliste"
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-base font-medium px-2 py-1 -ml-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← Zurück
        </button>
        <h1 className="text-lg font-bold text-slate-900 truncate">{name}</h1>
        <div className="w-12" aria-hidden="true" />
      </div>

      {fehler ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {fehler}
        </p>
      ) : null}

      {detail === null && !fehler ? (
        <div className="text-slate-500 text-center mt-4">Lädt…</div>
      ) : detail ? (
        <ProfilInhalt
          detail={detail}
          heute={heute}
          eigener={eigener}
          onPasswortGeaendert={(hat) => aktualisiereHatPasswort(hat)}
        />
      ) : null}
    </main>
  );
}

function ProfilInhalt({
  detail,
  heute,
  eigener,
  onPasswortGeaendert,
}: {
  detail: DetailAntwort;
  heute: string;
  eigener: boolean;
  onPasswortGeaendert: (hatPasswort: boolean) => void;
}) {
  const stats = detail.statistik;
  if (!stats) {
    return (
      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        Diese Statistik ist privat.
      </div>
    );
  }
  const streak = berechneStreak(stats, heute);
  const lerntage = gesamtLerntage(stats);
  const abfragen = gesamtAbfragen(stats);
  const letzte14 = letzteNTage(stats, 14, heute);
  const angesehen = stats.angeseheneKartenIds.length;
  const karteneErledigt = stats.tage.reduce((acc, t) => acc + t.karteneErledigt, 0);

  return (
    <>
      {detail.hatPasswort ? (
        <div className="text-xs text-slate-500 text-center">
          🔒 Privater Account — nur für {detail.name} selbst sichtbar.
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <KennzahlKarte titel="Streak" haupt={String(streak)} unten={streak >= 2 ? '🔥 Tage' : 'Tage'} />
        <KennzahlKarte titel="Lerntage" haupt={String(lerntage)} unten={`${abfragen} Abfragen`} />
        <KennzahlKarte titel="Angesehen" haupt={String(angesehen)} unten={`von ${KARTEN_GESAMT}`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <KennzahlKarte titel="Karten erledigt" haupt={String(karteneErledigt)} unten="seit Beginn" />
        <KennzahlKarte
          titel="Erster Lerntag"
          haupt={stats.ersterLerntag ? formatiereDatum(stats.ersterLerntag) : '—'}
          unten=" "
        />
      </div>

      <TagesDiagramm tage={letzte14} />
      <TagesListe tage={stats.tage} />

      {eigener ? <PasswortBlock detail={detail} onPasswortGeaendert={onPasswortGeaendert} /> : null}
    </>
  );
}

function KennzahlKarte({ titel, haupt, unten }: { titel: string; haupt: string; unten: string }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-3 flex flex-col items-center text-center">
      <div className="text-xs text-slate-500 uppercase tracking-wide">{titel}</div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{haupt}</div>
      <div className="text-xs text-slate-500 mt-0.5">{unten}</div>
    </div>
  );
}

function PasswortBlock({
  detail,
  onPasswortGeaendert,
}: {
  detail: DetailAntwort;
  onPasswortGeaendert: (hatPasswort: boolean) => void;
}) {
  const [offen, setOffen] = useState(false);
  const [altes, setAltes] = useState('');
  const [neues, setNeues] = useState('');
  const [arbeitet, setArbeitet] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  async function setze(neuesPasswort: string | null) {
    setFehler(null);
    setMeldung(null);
    setArbeitet(true);
    try {
      const r = await apiPasswortAendern(altes || undefined, neuesPasswort);
      onPasswortGeaendert(r.hatPasswort);
      setMeldung(neuesPasswort === null ? 'Passwort entfernt.' : 'Passwort gesetzt.');
      setAltes('');
      setNeues('');
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setArbeitet(false);
    }
  }

  return (
    <details
      className="rounded-2xl bg-white shadow-sm p-3"
      open={offen}
      onToggle={(e) => setOffen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="text-sm font-medium text-slate-700 cursor-pointer select-none">
        {detail.hatPasswort ? 'Passwort ändern oder entfernen' : 'Passwort vergeben'}
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        {detail.hatPasswort ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-600">Aktuelles Passwort</span>
            <input
              type="password"
              autoComplete="current-password"
              value={altes}
              onChange={(e) => setAltes(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
            />
          </label>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-600">
            Neues Passwort (mindestens 4 Zeichen)
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={neues}
            onChange={(e) => setNeues(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-base"
            minLength={4}
          />
        </label>
        {meldung ? <p className="text-sm text-green-700">{meldung}</p> : null}
        {fehler ? <p className="text-sm text-red-700">{fehler}</p> : null}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={arbeitet || neues.length < 4}
            onClick={() => setze(neues)}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {detail.hatPasswort ? 'Passwort ändern' : 'Passwort setzen'}
          </button>
          {detail.hatPasswort ? (
            <button
              type="button"
              disabled={arbeitet}
              onClick={() => setze(null)}
              className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium py-2 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Passwort entfernen (Statistik wird wieder öffentlich)
            </button>
          ) : null}
        </div>
      </div>
    </details>
  );
}
