'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import lernkartenDaten from '@/data/lernkarten.json';
import type {
  Bewertung,
  Fortschritt,
  KartenStatus,
  LernkartenDaten,
  StatistikSpeicher,
  TagesStatistik,
} from '@/lib/typen';
import { ladeFortschritt } from '@/lib/speicher';
import {
  berechneStreak,
  gesamtAbfragen,
  gesamtLerntage,
  ladeStatistik,
  letzteNTage,
  leereStatistik,
  loescheStatistik,
  tageSeitErstemLerntag,
} from '@/lib/statistik';
import { formatiereDatum, heutigesDatum } from '@/lib/datum';
import TagesDiagramm from '@/components/TagesDiagramm';
import TagesListe from '@/components/TagesListe';
import { useIstClient } from '@/lib/sessionStats';

const DATEN = lernkartenDaten as LernkartenDaten;

type Tab = 'verlauf' | 'karten';
type KartenFilter = 'alle' | 'offen' | 'erledigt' | 'nicht_angesehen';
type KartenSortierung = 'kategorie' | 'status';

type IndizierteKarte = {
  id: string;
  frage: string;
  kategorie: string;
  kategorieIndex: number;
};

function baueKartenIndex(daten: LernkartenDaten): IndizierteKarte[] {
  const liste: IndizierteKarte[] = [];
  daten.kategorien.forEach((kat, i) => {
    for (const k of kat.karten) {
      liste.push({
        id: k.id,
        frage: k.frage,
        kategorie: kat.name,
        kategorieIndex: i,
      });
    }
  });
  return liste;
}

export default function StatistikSeite() {
  const router = useRouter();
  const istClient = useIstClient();
  const [tab, setTab] = useState<Tab>('verlauf');
  // version: erzwingt Re-Render nach Mutationen (z. B. „Statistik löschen").
  const [version, setVersion] = useState(0);
  void version;
  const heute = useMemo(() => heutigesDatum(), []);

  const statistik: StatistikSpeicher = istClient
    ? ladeStatistik()
    : leereStatistik();
  const fortschritt: Fortschritt | null = istClient ? ladeFortschritt() : null;

  const ladeAlles = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  if (!istClient) {
    return (
      <main className="mx-auto max-w-md safe-area-px safe-area-py w-full">
        <div className="text-slate-500 text-center mt-8">Lädt…</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md safe-area-px safe-area-py w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/')}
          aria-label="Zurück zur Startseite"
          className="text-blue-600 hover:text-blue-700 active:text-blue-800 text-base font-medium px-2 py-1 -ml-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          ← Zurück
        </button>
        <h1 className="text-lg font-bold text-slate-900">Statistik</h1>
        <div className="w-12" aria-hidden="true" />
      </div>

      <div
        role="tablist"
        aria-label="Statistik-Bereiche"
        className="grid grid-cols-2 gap-1 p-1 bg-slate-200 rounded-xl"
      >
        <TabButton
          aktiv={tab === 'verlauf'}
          onClick={() => setTab('verlauf')}
          label="Heute & Verlauf"
        />
        <TabButton
          aktiv={tab === 'karten'}
          onClick={() => setTab('karten')}
          label="Karten"
        />
      </div>

      {tab === 'verlauf' ? (
        <VerlaufTab
          statistik={statistik}
          heute={heute}
          onStatistikGeloescht={ladeAlles}
        />
      ) : (
        <KartenTab fortschritt={fortschritt} statistik={statistik} />
      )}
    </main>
  );
}

function TabButton({
  aktiv,
  onClick,
  label,
}: {
  aktiv: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={aktiv}
      onClick={onClick}
      className={`rounded-lg py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        aktiv
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function VerlaufTab({
  statistik,
  heute,
  onStatistikGeloescht,
}: {
  statistik: StatistikSpeicher;
  heute: string;
  onStatistikGeloescht: () => void;
}) {
  const heuteTag = useMemo<TagesStatistik | null>(
    () => statistik.tage.find((t) => t.datum === heute) ?? null,
    [statistik, heute],
  );
  const streak = useMemo(
    () => berechneStreak(statistik, heute),
    [statistik, heute],
  );
  const lerntageGesamt = useMemo(
    () => gesamtLerntage(statistik),
    [statistik],
  );
  const abfragenGesamt = useMemo(
    () => gesamtAbfragen(statistik),
    [statistik],
  );
  const letzte14 = useMemo(
    () => letzteNTage(statistik, 14, heute),
    [statistik, heute],
  );
  const tageSeitStart = useMemo(
    () => tageSeitErstemLerntag(statistik, heute),
    [statistik, heute],
  );

  const [kopiertHinweis, setKopiertHinweis] = useState<string | null>(null);

  const onKopieren = useCallback(async () => {
    const text = [
      'Lernkarten-Statistik',
      `Heute: ${heuteTag?.abfragenGesamt ?? 0} Abfragen, ${
        heuteTag ? Math.round(heuteTag.lernzeitSekunden / 60) : 0
      } Minuten`,
      `Streak: ${streak} Tage`,
      `Lerntage gesamt: ${lerntageGesamt}`,
      `Abfragen gesamt: ${abfragenGesamt}`,
      `Erster Lerntag: ${statistik.ersterLerntag ?? '–'}`,
    ].join('\n');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setKopiertHinweis('Kopiert!');
      } else {
        setKopiertHinweis('Kopieren nicht unterstützt');
      }
    } catch {
      setKopiertHinweis('Kopieren fehlgeschlagen');
    }
    window.setTimeout(() => setKopiertHinweis(null), 2000);
  }, [heuteTag, streak, lerntageGesamt, abfragenGesamt, statistik]);

  const onLoeschen = useCallback(() => {
    const ok1 = window.confirm(
      'Wirklich alle Statistik-Historie löschen? Dein Karten-Fortschritt bleibt erhalten.',
    );
    if (!ok1) return;
    const ok2 = window.confirm('Endgültig löschen?');
    if (!ok2) return;
    loescheStatistik();
    onStatistikGeloescht();
  }, [onStatistikGeloescht]);

  const heuteMinuten = heuteTag
    ? Math.round(heuteTag.lernzeitSekunden / 60)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <UebersichtsKarte
          titel="Heute"
          haupt={String(heuteTag?.abfragenGesamt ?? 0)}
          unten={`${heuteMinuten} Min`}
        />
        <UebersichtsKarte
          titel="Streak"
          haupt={String(streak)}
          unten={streak >= 2 ? '🔥 Tage' : 'Tage'}
        />
        <UebersichtsKarte
          titel="Lerntage"
          haupt={String(lerntageGesamt)}
          unten={`${abfragenGesamt} Abfragen`}
        />
      </div>

      <TagesDiagramm tage={letzte14} />

      <TagesListe tage={statistik.tage} />

      {statistik.ersterLerntag ? (
        <p className="text-xs text-slate-500 text-center px-4">
          Du lernst seit dem {formatiereDatum(statistik.ersterLerntag)}. Das
          sind {tageSeitStart} {tageSeitStart === 1 ? 'Tag' : 'Tage'}.
        </p>
      ) : null}

      <div className="flex flex-col gap-2 mt-2">
        <button
          type="button"
          onClick={onKopieren}
          className="w-full rounded-xl bg-slate-200 hover:bg-slate-300 active:bg-slate-400 text-slate-900 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          {kopiertHinweis ?? 'Statistik als Text kopieren'}
        </button>
        <details className="rounded-xl bg-white shadow-sm">
          <summary className="cursor-pointer px-4 py-3 text-sm text-slate-600 select-none">
            Erweiterte Optionen
          </summary>
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={onLoeschen}
              className="w-full rounded-xl bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-800 font-medium py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              Statistik-Historie löschen
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Löscht ausschließlich die Tages-Statistik. Dein aktueller
              Karten-Fortschritt bleibt erhalten.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

function UebersichtsKarte({
  titel,
  haupt,
  unten,
}: {
  titel: string;
  haupt: string;
  unten: string;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-3 flex flex-col items-center text-center">
      <div className="text-xs text-slate-500 uppercase tracking-wide">
        {titel}
      </div>
      <div className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
        {haupt}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{unten}</div>
    </div>
  );
}

function KartenTab({
  fortschritt,
  statistik,
}: {
  fortschritt: Fortschritt | null;
  statistik: StatistikSpeicher;
}) {
  const [filter, setFilter] = useState<KartenFilter>('alle');
  const [sortierung, setSortierung] = useState<KartenSortierung>('kategorie');
  const karten = useMemo(() => baueKartenIndex(DATEN), []);

  const statusFuer = useCallback(
    (id: string): KartenStatus | null => {
      if (!fortschritt) return null;
      return fortschritt.karten[id] ?? null;
    },
    [fortschritt],
  );

  const angesehenSet = useMemo(
    () => new Set(statistik.angeseheneKartenIds),
    [statistik],
  );

  const gefiltert = useMemo(() => {
    return karten.filter((k) => {
      const st = statusFuer(k.id);
      if (filter === 'alle') return true;
      if (filter === 'erledigt') {
        return st !== null && st.abfragenBisErledigt === 0;
      }
      if (filter === 'nicht_angesehen') {
        return !angesehenSet.has(k.id);
      }
      // offen
      return st === null || st.abfragenBisErledigt > 0;
    });
  }, [karten, filter, statusFuer, angesehenSet]);

  const sortiert = useMemo(() => {
    const liste = [...gefiltert];
    if (sortierung === 'kategorie') {
      liste.sort((a, b) => {
        if (a.kategorieIndex !== b.kategorieIndex) {
          return a.kategorieIndex - b.kategorieIndex;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    } else {
      // offene zuerst, danach Kategorie/ID
      liste.sort((a, b) => {
        const sa = statusFuer(a.id);
        const sb = statusFuer(b.id);
        const offenA = sa === null || sa.abfragenBisErledigt > 0 ? 0 : 1;
        const offenB = sb === null || sb.abfragenBisErledigt > 0 ? 0 : 1;
        if (offenA !== offenB) return offenA - offenB;
        if (a.kategorieIndex !== b.kategorieIndex) {
          return a.kategorieIndex - b.kategorieIndex;
        }
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }
    return liste;
  }, [gefiltert, sortierung, statusFuer]);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-500 text-center">
        <span aria-hidden="true">👁 </span>
        {angesehenSet.size} von {karten.length} Karten angesehen
      </p>
      <div
        role="tablist"
        aria-label="Filter"
        className="grid grid-cols-2 gap-1 p-1 bg-slate-200 rounded-xl"
      >
        <FilterButton
          aktiv={filter === 'alle'}
          onClick={() => setFilter('alle')}
          label="Alle"
        />
        <FilterButton
          aktiv={filter === 'offen'}
          onClick={() => setFilter('offen')}
          label="Nur offene"
        />
        <FilterButton
          aktiv={filter === 'erledigt'}
          onClick={() => setFilter('erledigt')}
          label="Nur erledigte"
        />
        <FilterButton
          aktiv={filter === 'nicht_angesehen'}
          onClick={() => setFilter('nicht_angesehen')}
          label="Noch nicht angesehen"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <span>Sortierung:</span>
        <select
          value={sortierung}
          onChange={(e) =>
            setSortierung(e.target.value as KartenSortierung)
          }
          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <option value="kategorie">Nach Kategorie</option>
          <option value="status">Nach Status (offene zuerst)</option>
        </select>
      </label>

      <ul className="rounded-2xl bg-white shadow-sm divide-y divide-slate-100">
        {sortiert.map((k) => {
          const st = statusFuer(k.id);
          const erledigt = st !== null && st.abfragenBisErledigt === 0;
          const angesehen = angesehenSet.has(k.id);
          const statusText = !st
            ? 'Noch nicht gestartet'
            : erledigt
              ? 'Erledigt'
              : `Noch ${st.abfragenBisErledigt}× nötig`;
          return (
            <li
              key={k.id}
              className="px-4 py-3 flex items-center gap-3"
            >
              <BewertungsPunkt bewertung={st?.letzteBewertung ?? null} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-500 truncate">
                  {k.kategorie}
                </div>
                <div className="text-sm text-slate-900 truncate">
                  {k.frage}
                </div>
                <div
                  className={`text-xs mt-0.5 ${
                    erledigt ? 'text-green-700' : 'text-slate-500'
                  }`}
                >
                  {statusText}
                </div>
              </div>
              <span
                className={`text-base shrink-0 ${angesehen ? '' : 'opacity-15'}`}
                title={angesehen ? 'Schon angesehen' : 'Noch nicht angesehen'}
                aria-label={angesehen ? 'Schon angesehen' : 'Noch nicht angesehen'}
              >
                👁
              </span>
            </li>
          );
        })}
        {sortiert.length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-slate-500">
            Keine Karten zu diesem Filter.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function FilterButton({
  aktiv,
  onClick,
  label,
}: {
  aktiv: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={aktiv}
      onClick={onClick}
      className={`rounded-lg py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        aktiv
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {label}
    </button>
  );
}

function BewertungsPunkt({ bewertung }: { bewertung: Bewertung | null }) {
  const farbe = ((): string => {
    switch (bewertung) {
      case 'nicht_gewusst':
        return 'bg-red-500';
      case 'wenig_gewusst':
        return 'bg-orange-500';
      case 'gut_gewusst':
        return 'bg-yellow-400';
      case 'perfekt_gewusst':
        return 'bg-green-600';
      default:
        return 'bg-slate-300';
    }
  })();
  const label = ((): string => {
    switch (bewertung) {
      case 'nicht_gewusst':
        return 'Zuletzt nicht gewusst';
      case 'wenig_gewusst':
        return 'Zuletzt ein bisschen gewusst';
      case 'gut_gewusst':
        return 'Zuletzt gut gewusst';
      case 'perfekt_gewusst':
        return 'Zuletzt perfekt gewusst';
      default:
        return 'Noch nicht bewertet';
    }
  })();
  return (
    <span
      className={`w-3 h-3 rounded-full ${farbe} flex-shrink-0`}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
