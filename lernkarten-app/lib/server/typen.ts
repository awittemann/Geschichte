import type { Fortschritt, StatistikSpeicher } from '../typen';

export type Nutzer = {
  name: string;
  /** null = öffentlich (kein Passwort gesetzt); string = Hash, dann privat. */
  passwortHash: string | null;
  createdAt: number;
  fortschritt: Fortschritt | null;
  statistik: StatistikSpeicher;
};

export type Datenbank = {
  version: 1;
  users: Record<string, Nutzer>;
};

/** Übersichtsdaten, die in der öffentlichen Nutzerliste landen. */
export type NutzerUebersicht = {
  name: string;
  hatPasswort: boolean;
  oeffentlich: boolean;
  /** Wenn privat und nicht der eigene Nutzer: null. Sonst gesetzt. */
  uebersicht: {
    lerntageGesamt: number;
    abfragenGesamt: number;
    streak: number;
    karteneErledigt: number;
    angesehen: number;
  } | null;
};

export type DetailAntwort = {
  name: string;
  hatPasswort: boolean;
  oeffentlich: boolean;
  istEigenerNutzer: boolean;
  statistik: StatistikSpeicher | null;
  fortschritt: Fortschritt | null;
};
