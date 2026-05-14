'use client';

// Dünner Hook um die Web Speech API des Browsers.
// Erkennt Sprache clientseitig und ruft `onText` mit dem fertigen Transkript.
// Wird nicht von allen Browsern unterstützt (v. a. iOS Safari ist unzuverlässig)
// — daher liefert der Hook ein `unterstuetzt`-Flag zum Ausblenden der UI.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

type SpeechErgebnis = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

interface SpeechRecognitionInstanz {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechErgebnis) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanz;

/** Erkennt iOS-Geräte (inkl. iPadOS, das sich als „Macintosh" ausgibt). */
function istIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return (
    /Macintosh/.test(ua) &&
    typeof document !== 'undefined' &&
    'ontouchend' in document
  );
}

function holeCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  // iOS-Browser nutzen alle WebKit: webkitSpeechRecognition ist dort zwar
  // vorhanden, die Erkennung funktioniert aber nicht zuverlässig. Deshalb auf
  // iOS gar nicht anbieten — die iOS-Bildschirmtastatur hat ein eigenes Diktat.
  if (istIOS()) return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Support-Erkennung als externe „Quelle" — vermeidet setState-in-effect und
// Hydration-Mismatch (Server: false, Client: tatsächlicher Wert).
const leeresAbo = () => () => {};
const unterstuetztClient = () => holeCtor() !== null;
const unterstuetztServer = () => false;

type Optionen = {
  sprache?: string;
  /** Wird mit dem erkannten Text aufgerufen (bereits getrimmt). */
  onText: (text: string) => void;
};

export type Spracherkennung = {
  unterstuetzt: boolean;
  hoert: boolean;
  starten: () => void;
  stoppen: () => void;
};

/**
 * Leichter Hook, der nur prüft, ob die In-App-Spracherkennung verfügbar ist —
 * ohne einen Erkenner aufzubauen. Praktisch für UI, die abhängig davon einen
 * Hinweis statt eines Buttons zeigen will (z. B. iOS-Tastatur-Diktat).
 */
export function useSpracherkennungVerfuegbar(): boolean {
  return useSyncExternalStore(
    leeresAbo,
    unterstuetztClient,
    unterstuetztServer,
  );
}

export function useSpracherkennung({
  sprache = 'de-DE',
  onText,
}: Optionen): Spracherkennung {
  const unterstuetzt = useSyncExternalStore(
    leeresAbo,
    unterstuetztClient,
    unterstuetztServer,
  );
  const [hoert, setHoert] = useState(false);
  const erkennungRef = useRef<SpeechRecognitionInstanz | null>(null);
  // onText kann sich pro Render ändern — über Ref aktuell halten, ohne den
  // Erkenner neu aufzubauen.
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    const Ctor = holeCtor();
    if (!Ctor) return;

    const erkennung = new Ctor();
    erkennung.lang = sprache;
    erkennung.continuous = false;
    erkennung.interimResults = false;
    erkennung.onresult = (e: SpeechErgebnis) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        text += e.results[i][0]?.transcript ?? '';
      }
      const sauber = text.trim();
      if (sauber) onTextRef.current(sauber);
    };
    erkennung.onend = () => setHoert(false);
    erkennung.onerror = () => setHoert(false);
    erkennungRef.current = erkennung;

    return () => {
      erkennung.onresult = null;
      erkennung.onend = null;
      erkennung.onerror = null;
      try {
        erkennung.abort();
      } catch {
        // bewusst still
      }
      erkennungRef.current = null;
    };
  }, [sprache]);

  const starten = useCallback(() => {
    const e = erkennungRef.current;
    if (!e) return;
    try {
      e.start();
      setHoert(true);
    } catch {
      // start() wirft, wenn bereits aktiv — dann ignorieren.
    }
  }, []);

  const stoppen = useCallback(() => {
    const e = erkennungRef.current;
    if (!e) return;
    try {
      e.stop();
    } catch {
      // bewusst still
    }
    setHoert(false);
  }, []);

  return { unterstuetzt, hoert, starten, stoppen };
}
