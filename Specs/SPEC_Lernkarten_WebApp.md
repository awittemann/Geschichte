# Spezifikation: Lernkarten Web-App (iPhone)

## Projektübersicht

**Name:** Lernkarten Aufklärung & Menschenrechte
**Zweck:** Eine mobile Web-App (Progressive Web App / PWA), mit der ein Schüler 61 Lernkarten zum Thema „Aufklärung und Menschenrechte" lernen kann. Die App nutzt ein einfaches Spaced-Repetition-System: Karten, die schlecht gewusst werden, kommen häufiger dran; Karten, die perfekt gewusst werden, fallen aus dem Stapel. Ziel ist, dass am Ende einer Lernsession **alle Karten mindestens einmal mit „perfekt gewusst" bewertet wurden**.

**Zielgerät:** iPhone (Safari, Chrome). Muss aber auch auf Desktop-Browsern funktionieren.
**Sprache der UI:** Deutsch
**Zielnutzer:** Ein einzelner Schüler. Kein Login, kein Backend.

---

## Tech-Stack

- **Framework:** Next.js (App Router) mit TypeScript
- **Styling:** Tailwind CSS
- **Hosting:** Statisch deploybar (z. B. Vercel, Netlify). Kein Server-Backend nötig.
- **Daten:** Lernkarten als statische JSON-Datei im Projekt
- **Persistenz:** `localStorage` des Browsers (für Lernfortschritt zwischen Sessions)
- **Keine externen Abhängigkeiten** außer den oben genannten. Kein Tracking, keine Analytics.

---

## Datenmodell

### Lernkarte (Input)

Die 61 Lernkarten liegen als JSON-Datei vor (`data/lernkarten.json`). Beispielstruktur:

```json
{
  "kategorien": [
    {
      "name": "Aufklärung – Grundbegriffe",
      "karten": [
        {
          "id": "aufkl-01",
          "frage": "Was ist Aufklärung nach Immanuel Kant?",
          "antwort": "Aufklärung ist „der Ausgang des Menschen aus seiner selbstverschuldeten Unmündigkeit"..."
        }
      ]
    }
  ]
}
```

**Wichtig:** Die JSON-Datei `content_lernkarten.json` aus dem Lernpaket muss in dieses Format gebracht werden. Jede Karte braucht zusätzlich eine eindeutige `id` (z. B. `aufkl-01`, `aufkl-02` ... `locke-01` etc.). Die ID muss stabil sein, damit der Lernfortschritt zugeordnet werden kann.

### Lernfortschritt (Runtime)

Pro Karte wird im localStorage gespeichert:

```typescript
type Bewertung = 'nicht_gewusst' | 'wenig_gewusst' | 'gut_gewusst' | 'perfekt_gewusst';

type KartenStatus = {
  id: string;
  letzteBewertung: Bewertung | null;
  abfragenBisErledigt: number;  // wie oft muss diese Karte noch korrekt kommen
  anzahlAbfragen: number;        // Statistik: wie oft wurde sie insgesamt abgefragt
};
```

Speicher-Key: `lernkarten_fortschritt_v1`

### Tages-Statistik (Runtime)

Zusätzlich zum Karten-Fortschritt wird pro Kalendertag ein Statistik-Eintrag im localStorage geführt. Das ist die Grundlage für die Anzeige des täglichen Fortschritts.

```typescript
type TagesStatistik = {
  datum: string;                  // ISO-Format YYYY-MM-DD (lokale Zeitzone des Geräts)
  abfragen: {
    nicht_gewusst: number;
    wenig_gewusst: number;
    gut_gewusst: number;
    perfekt_gewusst: number;
  };
  abfragenGesamt: number;         // Summe der vier obigen Werte
  karteneErledigt: number;        // Karten, die an diesem Tag von ">0" auf "0" gefallen sind
  lernzeitSekunden: number;       // aktive Lernzeit an diesem Tag in Sekunden
  sessionsGestartet: number;      // Anzahl gestarteter Sessions an diesem Tag
};

type StatistikSpeicher = {
  tage: TagesStatistik[];         // sortiert nach Datum aufsteigend
  ersterLerntag: string | null;   // ISO-Datum, an dem zum ersten Mal gelernt wurde
};
```

Speicher-Key: `lernkarten_statistik_v1`

**Regeln für die Tages-Statistik:**

- Das Datum wird in der **lokalen Zeitzone** des Geräts bestimmt (nicht UTC), damit „heute" für den Schüler intuitiv stimmt.
- Bei jeder Bewertung wird der entsprechende Zähler im Eintrag des aktuellen Tages um 1 erhöht. Existiert noch kein Eintrag für heute, wird er beim ersten Tipp angelegt.
- `karteneErledigt` wird nur erhöht, wenn der Bewertungs-Tipp eine Karte von `abfragenBisErledigt > 0` auf `0` setzt (also nur bei „perfekt_gewusst" auf einer noch nicht erledigten Karte).
- `lernzeitSekunden`: Zeit zwischen Aufdecken einer Frage und Tippen auf einen Bewertungs-Button wird je Karte gemessen und zur Tagessumme addiert. Pausen länger als 60 Sekunden (z. B. Schüler legt das Handy weg) werden auf 60 Sekunden gekappt, damit eine einzelne Karte die Statistik nicht verzerrt.
- `sessionsGestartet`: Wird bei jedem Klick auf „Lernen starten" oder „Weiter lernen" um 1 erhöht.
- Die Tages-Statistik wird **niemals automatisch gelöscht**, auch nicht beim „Fortschritt zurücksetzen". Der Reset betrifft nur den Karten-Stapel, nicht die Lern-Historie. Es gibt einen separaten Button „Statistik-Historie löschen" mit doppelter Bestätigung (siehe Screen 4).
- **Streak-Berechnung:** Ein „Streak" zählt aufeinanderfolgende Tage, an denen mindestens 1 Karte abgefragt wurde. Wird unterbrochen, wenn ein Tag ohne Aktivität dazwischenliegt.

---

## Lern-Algorithmus (zentrale Logik)

Dies ist der wichtigste Teil der App. Bitte exakt umsetzen.

### Initialisierung

Beim Start einer neuen Lernsession (oder beim ersten Öffnen der App):
- Jede der 61 Karten bekommt `abfragenBisErledigt = 1`.
- Eine Karte gilt als „erledigt", wenn `abfragenBisErledigt === 0`.

### Auswahl der nächsten Karte

Aus allen nicht erledigten Karten (`abfragenBisErledigt > 0`) wird **zufällig** eine ausgewählt.
- Wenn möglich, soll die zuletzt gezeigte Karte nicht direkt wieder gezeigt werden (außer es ist die einzige verbliebene).

### Reaktion auf Bewertung

Nachdem der Schüler die Antwort aufgedeckt und seine Selbsteinschätzung abgegeben hat, wird `abfragenBisErledigt` für diese Karte wie folgt **neu gesetzt** (nicht: dekrementiert!):

| Bewertung | Neuer Wert `abfragenBisErledigt` |
|---|---|
| `nicht_gewusst` | **4** |
| `wenig_gewusst` | **3** |
| `gut_gewusst` | **2** |
| `perfekt_gewusst` | **0** (= sofort erledigt) |

Dann wird `anzahlAbfragen` um 1 erhöht.

**Konsequenz dieser Logik:**
- Eine Karte, die „nicht gewusst" wurde, muss mindestens viermal richtig kommen, bevor sie verschwindet – aber nur, wenn jede weitere Bewertung mindestens „perfekt" ist (dann fällt sie sofort raus) oder die Werte sich weiter Richtung 0 schieben.
- **Achtung Korrektur:** Mit der obigen Tabelle würde `abfragenBisErledigt` nie kleiner werden, außer bei „perfekt_gewusst". Das ist gewollt: Die App fordert vom Schüler ein „perfekt gewusst", damit eine Karte aus dem Stapel fällt. Solange nur „gut gewusst" angeklickt wird, bleibt die Karte im Stapel (mit `abfragenBisErledigt = 2`) und kommt weiter dran. Nur „perfekt gewusst" entfernt eine Karte endgültig.

So ist sichergestellt, dass am Ende **jede Karte mindestens einmal mit „perfekt gewusst" bewertet wurde**.

### Session-Ende

Sobald alle Karten `abfragenBisErledigt === 0` haben, ist die Lernsession abgeschlossen. Der Schüler bekommt einen Glückwunsch-Bildschirm mit Statistik (Gesamtzahl Abfragen, Zeit gebraucht, Verteilung der ersten Bewertungen).

### Reset

Es gibt einen Button „Neue Lernsession starten", der den Fortschritt zurücksetzt.

---

## Benutzeroberfläche – Screens

### Screen 1: Startseite

- Titel: „Lernkarten – Aufklärung & Menschenrechte"
- Anzeige: „61 Karten in 7 Kategorien"
- Falls eine Session im Gange ist: Button **„Weiter lernen"** + Fortschrittsbalken („X von 61 Karten erledigt").
- Falls noch keine Session: Button **„Lernen starten"**.
- **Tages-Übersicht (kompakte Karte direkt unter den Haupt-Buttons):**
  - Überschrift: „Heute"
  - Drei Kennzahlen nebeneinander (große Zahl + kleines Label darunter):
    - **Abfragen** (Gesamtzahl der heutigen Bewertungs-Tipps)
    - **Erledigt** (Karten, die heute aus dem Stapel gefallen sind)
    - **Minuten** (aktive Lernzeit heute, gerundet)
  - Wenn heute noch nicht gelernt wurde: „Noch keine Aktivität heute – los geht's!"
  - Wenn ein Streak aktiv ist (≥ 2 Tage in Folge): Klein darunter ein Hinweis mit Flammen-Emoji: „🔥 X Tage in Folge gelernt"
- Sekundär-Button: „Statistik anzeigen" (siehe Screen 4).
- Sekundär-Button: „Fortschritt zurücksetzen" (mit Bestätigungs-Dialog).

### Screen 2: Karten-Ansicht (zentrale Lern-Ansicht)

**Layout vertikal, optimiert für iPhone-Hochformat:**

1. **Top-Leiste:**
   - Links: „Zurück" (zur Startseite)
   - Mitte: Fortschrittsbalken („Noch X Karten")
   - Rechts: Kategorie-Label der aktuellen Karte (klein)

2. **Karten-Bereich (Hauptfläche):**
   - Großes Karten-Element mit weißem Hintergrund, leichtem Schatten, abgerundeten Ecken.
   - **Zustand A (Frage):** Nur die Frage ist sichtbar, zentriert, große Schrift.
     - Darunter: Großer Button „Antwort anzeigen".
   - **Zustand B (Antwort aufgedeckt):** Frage oben (kleiner), Antwort darunter (groß, gut lesbar).
     - Darunter: Vier farbige Bewertungs-Buttons (siehe unten).

3. **Bewertungs-Buttons (nur in Zustand B sichtbar):**
   Vier vertikal gestapelte, große, gut tippbare Buttons (mindestens 48px Höhe je Button):
   - 🔴 **„Nicht gewusst"** (rot, z. B. `bg-red-500`)
   - 🟠 **„Ein bisschen gewusst"** (orange, z. B. `bg-orange-400`)
   - 🟡 **„Gut gewusst"** (gelb, z. B. `bg-yellow-400`)
   - 🟢 **„Perfekt gewusst"** (grün, z. B. `bg-green-500`)

   Nach Tippen auf einen Button: Sofort die nächste Karte (kein Zwischenscreen).

### Screen 3: Abschluss-Bildschirm

Erscheint, sobald alle Karten erledigt sind:
- Großes 🎉
- Text: „Geschafft! Alle 61 Karten gelernt."
- **Statistik dieser Session:**
  - Gesamtzahl Abfragen: X
  - Davon perfekt beim ersten Versuch: X
  - Dauer der Session: X Minuten
- **Statistik heute (zusätzlich, falls heute auch andere Sessions liefen):**
  - Heute insgesamt: X Abfragen in X Minuten
  - Falls Streak ≥ 2: „🔥 Dein Streak: X Tage in Folge"
- Button: „Neue Lernsession starten"
- Button: „Zur Startseite"

### Screen 4: Statistik-Übersicht (von Startseite erreichbar)

Diese Seite hat zwei Bereiche, mit einem Tab- oder Segment-Wechsler oben (z. B. „Heute & Verlauf" / „Karten"):

#### Bereich A: Heute & Verlauf (Standard-Ansicht)

1. **Übersichts-Karten am Anfang (3 große Kennzahlen):**
   - **Heute**: Abfragen heute (große Zahl) + Lernzeit in Minuten
   - **Aktueller Streak**: Anzahl Tage in Folge mit Aktivität, plus Flammen-Emoji wenn ≥ 2
   - **Gesamt**: Lerntage insgesamt + Gesamtzahl Abfragen seit Beginn

2. **Tages-Balkendiagramm (letzte 14 Tage):**
   - Horizontale oder vertikale Balken, ein Balken pro Tag.
   - Jeder Balken zeigt die Anzahl der Abfragen an diesem Tag.
   - Balkenfarbe: dezentes Blau. Heute farblich hervorheben (z. B. dunkleres Blau oder Rahmen).
   - Tage ohne Aktivität: leerer Balken bzw. dünne graue Linie auf der Achse.
   - X-Achsen-Labels: Wochentag-Kürzel (Mo, Di, ...) oder Tag.Monat in kompakter Form.
   - Y-Achse: Anzahl Abfragen. Skalierung automatisch.
   - Beim Tippen/Hover auf einen Balken: Detail-Tooltip mit Datum, Anzahl Abfragen, Lernzeit, Karten erledigt.

3. **Tages-Liste (chronologisch absteigend, scrollbar):**
   Liste aller Tage, an denen gelernt wurde. Pro Eintrag:
   - Datum (formatiert: „Heute", „Gestern", sonst „Mo, 15.04." o. ä.)
   - Anzahl Abfragen
   - Lernzeit in Minuten
   - Karten erledigt
   - **Mini-Verteilungs-Balken** der Bewertungen (vier farbige Segmente nebeneinander, proportional zur Anzahl): 🔴🟠🟡🟢 – zeigt auf einen Blick, ob der Tag gut oder schwer war.

4. **Erster Lerntag:** Klein am Ende der Liste: „Du lernst seit dem [Datum]. Das sind X Tage."

5. **Aktionen am Ende der Seite:**
   - Button „Statistik als Text kopieren" (kopiert eine einfache Text-Zusammenfassung in die Zwischenablage – nützlich, wenn der Schüler den Stand teilen will).
   - Button „Statistik-Historie löschen" – versteckt unter einem aufklappbaren Bereich „Erweiterte Optionen", mit doppelter Bestätigung. Löscht ausschließlich die Tages-Statistik, nicht den aktuellen Karten-Fortschritt.

#### Bereich B: Karten

Tabelle / Liste aller Karten mit:
- Kategorie
- Frage (gekürzt auf eine Zeile)
- Status (erledigt / noch X-mal nötig)
- Letzte Bewertung (farbiger Punkt: 🔴🟠🟡🟢)

Hilfreich, damit der Schüler sieht, welche Karten ihm noch Probleme machen.

Sortier-/Filter-Optionen oben:
- „Alle anzeigen" / „Nur offene" / „Nur erledigte"
- Sortierung: nach Kategorie (Standard) oder nach Status (offene zuerst).

---

## Verhalten & Details

### Animationen

- Beim Wechsel zur nächsten Karte: Kurze Slide-Animation (Karte rutscht nach links raus, nächste kommt von rechts). Sehr dezent, ~200ms.
- Beim Aufdecken der Antwort: Sanftes Einblenden der Antwort (Fade-in, ~150ms).
- Kein „echtes" Karten-Flip nötig – die Schlichtheit hat Priorität.

### Touch- und Wisch-Gesten

- **Optional, aber empfohlen:** Tippen auf die Karte deckt die Antwort auf (zusätzlich zum Button).
- Keine Swipe-to-Rate-Geste (Buttons sind klarer und reduzieren Fehl-Eingaben).

### iPhone-spezifische Anforderungen

- `viewport`-Meta-Tag korrekt setzen (`width=device-width, initial-scale=1, viewport-fit=cover`).
- **Safe Area** beachten (iPhone-Notch und Home-Indicator): Padding via `env(safe-area-inset-*)`.
- Touch-Targets mindestens **44×44px** (Apple HIG).
- Schriftgröße der Fragen/Antworten: Mindestens **18px**, idealerweise **20–24px** Body.
- Manifest-Datei (`manifest.json`) für „Zum Home-Bildschirm hinzufügen": Name, Icon (192px und 512px), `display: standalone`, theme-color.
- Icon: Schlichtes, lesbares Lernkarten-Symbol (kann von Claude Code als simples SVG/PNG generiert werden).

### Barrierefreiheit

- Sinnvolle ARIA-Labels für alle Buttons.
- Ausreichender Farbkontrast (Bewertungs-Buttons mit weißem Text auf farbigem Grund).
- Bedienung auch ohne Touch möglich (Tab-Reihenfolge, Enter zum Aufdecken).

### Fehlerverhalten

- Wenn `localStorage` nicht verfügbar ist (z. B. Privater Modus): Warnhinweis anzeigen, App funktioniert dann nur innerhalb einer Session ohne Speicherung.
- Wenn die JSON-Datei nicht geladen werden kann: Fehlermeldung „Lernkarten konnten nicht geladen werden – bitte Seite neu laden".

### Performance

- Initiales Laden < 2 Sekunden auf 4G.
- Keine externen Schriftarten laden – System-Stacks verwenden (`-apple-system, BlinkMacSystemFont, …`).

---

## Projektstruktur (Vorschlag)

```
lernkarten-app/
├── app/
│   ├── layout.tsx          # Root-Layout mit Viewport-Meta
│   ├── page.tsx            # Startseite (Screen 1)
│   ├── lernen/
│   │   └── page.tsx        # Karten-Ansicht (Screen 2)
│   ├── abschluss/
│   │   └── page.tsx        # Abschluss (Screen 3)
│   └── statistik/
│       └── page.tsx        # Statistik (Screen 4)
├── components/
│   ├── Karte.tsx           # Karten-Komponente (Frage/Antwort)
│   ├── BewertungButtons.tsx
│   ├── Fortschrittsbalken.tsx
│   ├── TagesUebersicht.tsx # Kompakte Tages-Kennzahlen (Startseite)
│   ├── TagesDiagramm.tsx   # 14-Tage-Balkendiagramm
│   ├── TagesListe.tsx      # Chronologische Tagesliste
│   └── ...
├── lib/
│   ├── lernAlgorithmus.ts  # Logik zur Auswahl der nächsten Karte
│   ├── speicher.ts          # localStorage-Wrapper (Karten-Fortschritt)
│   ├── statistik.ts         # Tages-Statistik: schreiben, lesen, Streak-Berechnung
│   ├── datum.ts             # Hilfsfunktionen für lokale Datumsformatierung
│   └── typen.ts             # TypeScript-Typen
├── data/
│   └── lernkarten.json     # Die 61 Karten in 7 Kategorien
├── public/
│   ├── manifest.json
│   ├── icon-192.png
│   └── icon-512.png
└── package.json
```

---

## Aufgabe für die Agenten (Team Mode)

### Agent 1: Setup & Daten
- Next.js-Projekt initialisieren (TypeScript, Tailwind, App Router).
- Lernkarten-JSON in das beschriebene Format konvertieren (mit IDs).
- PWA-Manifest und Icons erstellen.
- TypeScript-Typen definieren (`lib/typen.ts`).

### Agent 2: Kern-Logik
- `lib/lernAlgorithmus.ts` implementieren (Auswahl der nächsten Karte, Bewertungs-Logik gemäß Tabelle oben).
- `lib/speicher.ts` implementieren (localStorage lesen/schreiben/zurücksetzen).
- `lib/statistik.ts` implementieren:
  - Funktion zum Aktualisieren der heutigen Tages-Statistik bei jeder Bewertung.
  - Funktion zum Erhöhen der Lernzeit (Sekunden zwischen Aufdecken und Bewertung, gekappt auf 60 s pro Karte).
  - Funktion zur Streak-Berechnung (aufeinanderfolgende Tage mit Aktivität, bezogen auf heute).
  - Funktion zum Holen der letzten N Tage (für Diagramm).
- `lib/datum.ts`: lokale Datumsformatierung („Heute", „Gestern", „Mo, 15.04."), Tages-Schlüssel-Generator (YYYY-MM-DD lokal).
- Unit-Tests für die Algorithmus- und Statistik-Logik schreiben (z. B. mit Vitest). Mindestens diese Fälle prüfen:
  1. Karte mit „perfekt_gewusst" verschwindet aus dem Stapel.
  2. Karte mit „gut_gewusst" bleibt im Stapel.
  3. Session endet erst, wenn alle Karten 0 erreichen.
  4. Reset setzt alle Karten auf 1 zurück, **aber Tages-Statistik bleibt erhalten**.
  5. Tages-Statistik: Bewertung erhöht den richtigen Zähler des heutigen Eintrags.
  6. Streak-Berechnung: drei Tage in Folge ergibt Streak 3; ein ausgelassener Tag bricht den Streak.
  7. Lernzeit-Kappung: Eine Karte, die 5 Minuten offen war, addiert nur 60 s zur Tagessumme.

### Agent 3: UI-Komponenten & Screens
- Alle vier Screens umsetzen (Startseite, Lernen, Abschluss, Statistik).
- Tages-Übersicht auf der Startseite (kompakte Karte mit 3 Kennzahlen + Streak-Hinweis).
- Statistik-Seite mit Tab-Wechsler („Heute & Verlauf" / „Karten"), 14-Tage-Balkendiagramm, chronologischer Tagesliste mit Mini-Verteilungsbalken.
- Diagramm bevorzugt **ohne externe Bibliothek** umsetzen (einfaches Flexbox/Grid-Balkendiagramm reicht). Falls eine Bibliothek nötig wird, dann eine kleine wie `recharts` – aber nur wenn ohne deutlich mehr Aufwand entstünde.
- Tailwind-Styling mobile-first.
- Safe-Area- und iOS-Spezifika beachten.
- Animationen einbauen.

### Agent 4: Test, Polish, Deploy-Vorbereitung
- Manuelle Test-Durchläufe auf iPhone-Simulator (oder echtem iPhone, falls verfügbar) durchführen.
- README.md schreiben mit Anleitung: lokales Starten, Deploy.
- Schlusscheck: Lighthouse-Score, A11y-Check, Performance.

---

## Definition of Done

Die App ist fertig, wenn:

1. Sie auf einem iPhone im Safari ohne sichtbare Layout-Probleme läuft.
2. Eine komplette Lernsession (alle 61 Karten bis „perfekt gewusst") durchgespielt werden kann.
3. Der Fortschritt zwischen App-Schließen und Wiedereröffnen erhalten bleibt.
4. Der „Fortschritt zurücksetzen"-Button funktioniert (und die Tages-Statistik bleibt davon unberührt).
5. Die Bewertungs- und Statistik-Logik in Tests verifiziert sind.
6. Die App als PWA „Zum Home-Bildschirm hinzufügen" auf dem iPhone installierbar ist.
7. Die Startseite zeigt korrekt die heutigen Abfragen, erledigten Karten und Lernzeit an.
8. Die Statistik-Seite zeigt das 14-Tage-Balkendiagramm und die chronologische Tagesliste korrekt an.
9. Die Streak-Anzeige funktioniert: Wer drei Tage in Folge lernt, sieht „🔥 3 Tage in Folge".
10. Eine `README.md` existiert, die einem Nicht-Programmierer erklärt, wie er die App lokal startet (`npm install`, `npm run dev`) und wie er sie deployen kann (z. B. via Vercel-Drag-and-Drop).

---

## Wichtige Hinweise für die Agenten

- **Sprache:** Sämtliche sichtbaren Texte in der App sind auf **Deutsch**. Code-Kommentare dürfen Deutsch oder Englisch sein.
- **Keine Backend-Aufrufe.** Die App muss komplett offline funktionieren, sobald sie geladen ist.
- **Einfachheit vor Features.** Lieber eine schlichte, aber funktionierende App als ein überladenes Konstrukt. Der Nutzer ist kein Programmierer und braucht keinen Konfigurations-Schnickschnack.
- **Bei Unklarheiten:** Im Zweifel die simplere Variante wählen. Beispiel: Wenn die Sortierreihenfolge der Kategorien unklar ist, einfach nach Reihenfolge im JSON gehen.
