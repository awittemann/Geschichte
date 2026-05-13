export type Bewertung =
  | 'nicht_gewusst'
  | 'wenig_gewusst'
  | 'gut_gewusst'
  | 'perfekt_gewusst';

export type KartenStatus = {
  id: string;
  letzteBewertung: Bewertung | null;
  abfragenBisErledigt: number;
  anzahlAbfragen: number;
};

export type TagesStatistik = {
  datum: string; // YYYY-MM-DD lokal
  abfragen: {
    nicht_gewusst: number;
    wenig_gewusst: number;
    gut_gewusst: number;
    perfekt_gewusst: number;
  };
  abfragenGesamt: number;
  karteneErledigt: number;
  lernzeitSekunden: number;
  sessionsGestartet: number;
};

export type StatistikSpeicher = {
  tage: TagesStatistik[]; // aufsteigend nach Datum
  ersterLerntag: string | null;
  /**
   * IDs aller Karten, die der Nutzer schon einmal gesehen hat — entweder in
   * der Lern- oder in der Blätter-Ansicht. Wird NICHT durch
   * „Fortschritt zurücksetzen" geleert, nur durch „Statistik-Historie löschen".
   */
  angeseheneKartenIds: string[];
};

export type Lernkarte = {
  id: string;
  frage: string;
  antwort: string;
  kategorie: string;
};

export type Kategorie = {
  name: string;
  karten: { id: string; frage: string; antwort: string }[];
};

export type LernkartenDaten = {
  kategorien: Kategorie[];
};

export type Fortschritt = {
  karten: Record<string, KartenStatus>;
  zuletztGezeigteId: string | null;
  sessionStart: number | null; // ms-Timestamp; null = keine aktive Session
  ersteBewertungen: Record<string, Bewertung>; // pro Karten-ID die erste Bewertung der aktuellen Session
};
