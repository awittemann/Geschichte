# Lernkarten – Aufklärung & Menschenrechte

Eine kleine Web-App zum Lernen von 61 Karteikarten zum Thema „Aufklärung und Menschenrechte". Sie funktioniert offline (nach dem ersten Laden), lässt sich aufs iPhone als App-Symbol legen und merkt sich den Fortschritt im Browser.

Die App ist bewusst **schlicht**: keine Anmeldung, keine Konten, keine Werbung, keine externen Server.

---

## Was die App kann

- **61 Karten in 7 Kategorien** durcharbeiten (Aufklärung, Absolutismus, Locke, Montesquieu, Rousseau, Menschenrechte heute, Vergleich).
- **Selbsteinschätzung** auf vier Stufen (nicht gewusst / wenig / gut / **perfekt**).
- Eine Karte fällt **nur dann** aus dem Stapel, wenn sie als „**perfekt gewusst**" markiert wurde. So lernt man jede Karte am Ende mindestens einmal richtig.
- **KI-Abfragemodus**: Antwort selbst eintippen (oder per Sprache diktieren), ein OpenAI-Modell bewertet sie mit Feedback und einer Punktzahl (1–100); die Punktzahl steuert, wie oft die Karte noch drankommt. Rückfragen zum Feedback sind im Chat möglich. Optional — siehe Abschnitt „KI-Abfragemodus" unten.
- **Multiple-Choice-Modus**: Aus drei Antworten die richtige auswählen. Eine richtige Wahl macht die Karte eine Stufe besser, eine falsche eine Stufe schlechter. Funktioniert ohne API-Key.
- **Tages-Statistik**: heutige Abfragen, erledigte Karten, Lernzeit, Lern-Streak (🔥 ab 2 Tagen in Folge).
- **14-Tage-Diagramm** und eine Liste aller Lerntage.
- Funktioniert auf dem Handy (iPhone-optimiert) und am Computer.

---

## Die App lokal starten (auf deinem Mac)

Du brauchst dafür **Node.js 18 oder neuer**. Falls du Node noch nicht hast: Lade es von <https://nodejs.org/de> (Version „LTS", links).

Dann im Terminal:

```bash
cd lernkarten-app
npm install
npm run dev
```

Sobald du im Terminal die Zeile „Ready in X ms" siehst, öffne im Browser:

<http://localhost:3000>

Zum Beenden: im Terminal **Strg+C** drücken.

---

## Die App auf das iPhone bringen (lokal im selben WLAN)

Wenn der Dev-Server läuft, zeigt das Terminal auch eine Netzwerk-Adresse an (z. B. `http://192.168.x.x:3000`). Öffnest du diese auf dem iPhone, kannst du die App dort benutzen.

Im **Safari**: Teilen-Button (Quadrat mit Pfeil nach oben) → „Zum Home-Bildschirm". Danach hast du ein App-Icon, und die App läuft im Vollbild.

---

## Online stellen — Variante A: Sliplane (Docker via GitHub)

Sliplane baut bei jedem Push auf GitHub ein neues Docker-Image und tauscht es live aus. Das Repo enthält bereits alles dafür: `Dockerfile`, `.dockerignore` und `next.config.ts` mit `output: 'standalone'`.

**Wichtig zur Persistenz:** Mit Nutzer-Accounts liegt der Lernfortschritt **auf dem Server** unter `/data/state.json`. Damit Deployments den Stand NICHT verlieren, MUSS in Sliplane ein **Persistent Volume an `/data`** gemountet sein.

Zusätzlich braucht der Server eine **`SESSION_SECRET`** Env Var (mindestens 16 Zeichen), damit Session-Cookies signiert werden können. Ohne diese Variable startet die App in Production absichtlich nicht.

### Schritt 1: Repo bei GitHub anlegen

Im Projekt-Ordner (`lernkarten-app/` oder das übergeordnete Verzeichnis, je nach Strategie):

```bash
git init
git add .
git commit -m "Erstes Commit"
# Repo auf github.com erstellen, dann:
git remote add origin git@github.com:DEIN-NUTZERNAME/lernkarten-app.git
git branch -M main
git push -u origin main
```

### Schritt 2: Sliplane-Service anlegen

1. Auf <https://sliplane.io> anmelden (GitHub-Login).
2. „New Service" → „Deploy from GitHub" → das Repo auswählen.
3. **Build-Konfiguration:**
   - **Builder:** Dockerfile
   - **Dockerfile path:** `lernkarten-app/Dockerfile`
   - **Build context:** `.` (also der Repo-Root — das ist die Sliplane-Voreinstellung)
   - **Port:** `3000`
4. **Persistent Volume anlegen:**
   - In den Sliplane-Service-Einstellungen → „Volumes" → neues Volume mit Mount-Pfad `/data` (Größe 1 GB reicht).
   - **WICHTIG:** Ohne dieses Volume gehen alle Nutzer-Accounts und Statistiken bei jedem Deployment verloren.
5. **Environment Variables setzen:**
   - `SESSION_SECRET` = ein zufälliger String mit mindestens 16 Zeichen (z. B. `openssl rand -hex 32`). Bei Änderung werden alle Nutzer ausgeloggt.
   - `OPENAI_API_KEY` (optional) = API-Key für den KI-Abfragemodus. Ohne den Key ist nur dieser Modus deaktiviert, der Rest der App läuft normal.
   - `OPENAI_MODEL` (optional) = Chat-Modell, Default `gpt-4o-mini`.
6. „Deploy" klicken. Beim ersten Build dauert es ein paar Minuten.

> Der Dockerfile-Pfad ist relativ zum Repo-Root. Die `COPY`-Anweisungen im Dockerfile sind so geschrieben, dass sie den `lernkarten-app/`-Unterordner aus dem Repo-Root holen. Eine `.dockerignore` liegt ebenfalls am Repo-Root und hält den Build-Kontext klein.

### Schritt 3: Domain und Persistenz

- Sliplane gibt dem Service standardmäßig eine `*.sliplane.app`-URL. Diese URL ist die **Heimat-Domain** des Fortschritts.
- Sobald du eine eigene Domain dranhängst (z. B. `lernkarten.example.de`), bleibt der `localStorage` der **neuen** Domain leer (alter Fortschritt liegt unter der alten Sliplane-URL). **Wähle die finale Domain möglichst früh** und teile dem Nutzer immer dieselbe URL mit.
- **Wichtig:** Du brauchst **kein Persistent Volume**. Die Container sind stateless. Der Fortschritt überlebt jedes Deployment, weil er nicht im Container, sondern im Browser des Schülers gespeichert ist.

### Schritt 4: Updates ausrollen

Einfach auf `main` pushen — Sliplane baut und tauscht. Während des Builds antwortet die alte Version weiter; sobald die neue läuft, wird umgeschaltet. Nutzer auf einem offenen Tab müssen nur die Seite neu laden, um die neue Version zu sehen. Ihr `localStorage` bleibt erhalten.

### Lokal das Docker-Image testen

Aus dem Repo-Root (also dem Verzeichnis, das `lernkarten-app/` enthält):

```bash
docker build -f lernkarten-app/Dockerfile -t lernkarten-app .
docker run -p 3000:3000 \
  -v lernkarten-state:/data \
  -e SESSION_SECRET="$(openssl rand -hex 32)" \
  lernkarten-app
```

Dann <http://localhost:3000> öffnen. Der Container schreibt Nutzer und Statistiken in das Docker-Volume `lernkarten-state` (lokal persistent über Restarts).

---

## Online stellen — Variante B: Vercel (ohne Docker)

Die einfachste Variante: **Drag-and-Drop bei Vercel**.

1. Geh auf <https://vercel.com> und melde dich an (kostenlos).
2. Klicke auf „New Project" → „Import" → wähle „Upload".
3. Ziehe den Ordner `lernkarten-app/` ins Browser-Fenster.
4. Vercel erkennt automatisch Next.js und baut die App.
5. Nach 1–2 Minuten bekommst du eine URL wie `https://lernkarten-app-xyz.vercel.app`.

Alternative: GitHub-Repo erstellen, mit Vercel verbinden — jede Änderung wird automatisch live geschaltet.

**Wichtig:** Die App speichert NICHTS auf einem Server. Aller Fortschritt liegt nur im Browser des Geräts, auf dem du lernst (per `localStorage`). Wenn du auf einem anderen Gerät weiterlernen willst, fängst du dort wieder bei Null an.

---

## So funktioniert das Lernen

**Reihenfolge:** Im ersten Durchlauf werden die Karten Kategorie für Kategorie in der vorgegebenen Reihenfolge gestellt (also zuerst alle Aufklärung-Karten, dann Absolutismus usw.) — so kannst du jedes Thema zusammenhängend einlernen. Sobald jede Karte einmal dran war, wiederholt die App nur noch die Karten, die du noch nicht „perfekt gewusst" hast, in zufälliger Reihenfolge.

**„Karten ansehen":** Zusätzlich gibt es auf der Startseite den Punkt „Karten ansehen" — eine Blätter-Ansicht durch alle 61 Karten **ohne** Bewertungs-Druck. Frage zeigen, optional Antwort aufdecken, vor/zurück. Die Statistik (Tab „Karten") merkt sich mit einem 👁-Symbol, welche Karten du schon angeschaut hast (egal ob in der Lern- oder in der Blätter-Ansicht). Mit dem Filter „Noch nicht angesehen" siehst du sofort, was dir im Stoff noch fehlt.

---

## KI-Abfragemodus (OpenAI)

Auf der Startseite gibt es neben „Lernen starten" den Punkt **„Antwort eingeben (mit KI-Feedback)"**. Statt sich selbst einzuschätzen, gibst du die Antwort hier aktiv ein:

- **Antwort eintippen** — oder diktieren. Auf Chrome/Desktop gibt es dafür den **🎤-Diktieren**-Button (Browser-Spracherkennung). Auf dem **iPhone/iPad** ist die Web-Spracherkennung unzuverlässig — dort wird der Button ausgeblendet; stattdessen einfach ins Textfeld tippen und die **Mikrofon-Taste der iOS-Bildschirmtastatur** verwenden (zuverlässig und kostenlos).
- **„Antwort prüfen"** schickt Frage, deine Antwort und die Musterlösung an ein OpenAI-Modell. Du bekommst ein **Feedback** und eine **Punktzahl von 1–100**.
- Die Punktzahl wird auf die vier bekannten Stufen abgebildet (1–40 → „nicht gewusst", 41–65 → „wenig", 66–85 → „gut", 86–100 → „perfekt") und steuert wie gewohnt, wie oft die Karte noch drankommt. Statistik und Abschluss-Bildschirm funktionieren unverändert.
- Zum Feedback kannst du im **Chat Rückfragen** stellen.

Der Modus teilt sich Karten-Stapel und Fortschritt mit „Lernen starten" — du kannst beides mischen.

**Einrichtung:** In der ENV-Variable `OPENAI_API_KEY` einen Key von <https://platform.openai.com/api-keys> hinterlegen, optional `OPENAI_MODEL` (Default `gpt-4o-mini`). Lokal: `.env.example` nach `.env.local` kopieren und ausfüllen. Ist kein Key gesetzt, bleibt der Button sichtbar, „Antwort prüfen" zeigt aber einen Hinweis statt einer Bewertung — der Rest der App ist nicht betroffen.

> Hinweis: Anfragen an OpenAI laufen ausschließlich serverseitig; der API-Key gelangt nie in den Browser. Jede Bewertung und jede Chat-Rückfrage verursacht API-Kosten bei OpenAI.

---

## Multiple-Choice-Modus

Auf der Startseite gibt es zusätzlich den Punkt **„Multiple Choice"**. Zu jeder Frage werden drei Antworten gezeigt — eine richtige und zwei falsche. Du wählst die richtige aus:

- **Richtige Wahl** → die Karte wird **eine Stufe besser** (kommt seltener dran, bei „perfekt" fällt sie aus dem Stapel).
- **Falsche Wahl** → die Karte wird **eine Stufe schlechter** (kommt häufiger dran). Die richtige Antwort wird danach grün markiert.

Die falschen Antworten stammen aus einem kuratierten Pool in `data/distraktoren.json` — pro Karte mehrere plausible, aber falsche Optionen (verbreitete Verwechslungen). Im Quiz werden daraus jeweils zwei zufällig gezogen, sodass nicht immer dieselbe Auswahl erscheint. Dieser Modus braucht **keinen API-Key** und teilt sich Karten-Stapel und Fortschritt mit den anderen Lern-Modi.

---

## Nutzer-Accounts (Multi-User-Modus)

Wenn der Server läuft (lokal mit `npm run dev` oder per Docker mit gemountetem `/data`-Volume), kannst du Konten anlegen und vergleichen.

- **Oben rechts** im Header: „Anmelden" / „Nutzer" / aktueller Nutzer.
- **„Konto anlegen"** auf der Anmelde-Seite: Name eingeben, optional Passwort. Wenn du bereits Fortschritt im Browser hast, kannst du ihn ins Konto übernehmen.
- **Ohne Passwort** ist deine Statistik **öffentlich** — andere Nutzer können sie sehen.
- **Mit Passwort** ist sie **privat** — nur du selbst siehst sie, andere bekommen ein 🔒-Symbol.
- **„Nutzer"-Liste** zeigt alle angemeldeten Personen mit Streak und Lerntagen. Private Accounts sind sichtbar, aber ihre Zahlen sind verborgen.
- **Eigenes Profil:** auf den eigenen Namen klicken → 14-Tage-Diagramm + Passwort-Verwaltung (setzen, ändern, entfernen).

Die Daten werden auf dem Server unter `/data/state.json` gespeichert (siehe Sliplane-Anleitung). Lokal in der Entwicklung landet die Datei als `.local-state.json` im Projekt-Verzeichnis (gitignoriert).

1. Auf der Startseite: **„Lernen starten"**.
2. Karte zeigt eine Frage. Du überlegst dir die Antwort.
3. **„Antwort anzeigen"** tippen.
4. Selbst einschätzen:
   - 🔴 „Nicht gewusst" → Karte kommt mindestens noch 4× dran.
   - 🟠 „Ein bisschen gewusst" → mindestens noch 3× dran.
   - 🟡 „Gut gewusst" → mindestens noch 2× dran.
   - 🟢 **„Perfekt gewusst" → Karte ist fertig** und kommt nicht mehr.
5. Die nächste Karte erscheint automatisch.
6. Wenn alle 61 Karten „perfekt" waren: 🎉 Glückwunsch-Bildschirm.

Du kannst die App jederzeit schließen — beim nächsten Öffnen geht es genau dort weiter.

---

## „Fortschritt zurücksetzen" vs. „Statistik-Historie löschen"

Die App trennt zwei Dinge bewusst:

- **„Fortschritt zurücksetzen"** (auf der Startseite) — setzt nur den **Karten-Stapel** auf Anfang. Deine Lern-Historie (Tage, Streak, Lernzeit) bleibt komplett erhalten.
- **„Statistik-Historie löschen"** (versteckt unter „Erweiterte Optionen" auf der Statistik-Seite, mit doppelter Bestätigung) — löscht nur die **Tages-Historie**. Dein aktueller Karten-Fortschritt bleibt.

So kann man eine neue Session anfangen, ohne die ganze Lern-Statistik zu verlieren.

---

## Tests

Die zentrale Lern- und Statistik-Logik (inkl. KI-Score-Zuordnung) ist mit 74 automatischen Tests abgesichert. Wer mag, kann sie selbst laufen lassen:

```bash
npm test
```

---

## Technische Details (für Neugierige)

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (Styling)
- **Vitest** (Tests)
- Keine externen Web-Fonts (System-Schrift), kein Tracking, kein Backend
- PWA-Manifest + Icons (192 px / 512 px) für „Zum Home-Bildschirm hinzufügen"
- Persistenz: `localStorage` des Browsers

### Projektstruktur

```
lernkarten-app/
├── app/                 # Seiten (Startseite, Lernen, Abfrage, Abschluss, …)
│   └── api/             # Server-Routen (Auth, Nutzer, KI-Bewertung & -Chat)
├── components/          # UI-Komponenten (Karte, Buttons, Diagramm, KI-Feedback, …)
├── lib/                 # Logik (Algorithmus, Speicher, Statistik, Datum, KI)
│   ├── server/          # nur serverseitig (DB, Auth, OpenAI-Wrapper)
│   └── __tests__/       # 74 Tests
├── data/lernkarten.json # die 61 Karten
└── public/              # Manifest und Icons
```

---

## Häufige Fragen

**Wo ist mein Fortschritt gespeichert?** Im Browser des Geräts, auf dem du gerade lernst. Wenn du den Browser-Cache komplett löschst (oder „im privaten Modus" lernst), ist er weg.

**Funktioniert die App offline?** Ja, sobald sie einmal geladen ist. (Sie funktioniert auch im Flugzeug, sobald die Seite im Browser/auf dem Home-Bildschirm offen war.)

**Was, wenn ich im privaten Modus surfe?** Die App zeigt einen Hinweis an. Du kannst trotzdem lernen, aber der Fortschritt geht beim Schließen des Tabs verloren.

**Was, wenn ich die App löschen will?** Karten-Fortschritt und Statistik liegen im `localStorage` des Browsers — Browser-Einstellungen → Daten löschen → Website-Daten.

---

Viel Erfolg beim Lernen! 📚
