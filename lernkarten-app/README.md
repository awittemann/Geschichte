# Lernkarten – Aufklärung & Menschenrechte

Eine kleine Web-App zum Lernen von 61 Karteikarten zum Thema „Aufklärung und Menschenrechte". Sie funktioniert offline (nach dem ersten Laden), lässt sich aufs iPhone als App-Symbol legen und merkt sich den Fortschritt im Browser.

Die App ist bewusst **schlicht**: keine Anmeldung, keine Konten, keine Werbung, keine externen Server.

---

## Was die App kann

- **61 Karten in 7 Kategorien** durcharbeiten (Aufklärung, Absolutismus, Locke, Montesquieu, Rousseau, Menschenrechte heute, Vergleich).
- **Selbsteinschätzung** auf vier Stufen (nicht gewusst / wenig / gut / **perfekt**).
- Eine Karte fällt **nur dann** aus dem Stapel, wenn sie als „**perfekt gewusst**" markiert wurde. So lernt man jede Karte am Ende mindestens einmal richtig.
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

**Wichtig zur Persistenz:** Der Lernfortschritt liegt im **`localStorage` des Browsers**, NICHT auf dem Server. Neue Deployments tauschen nur den Container — der Fortschritt der Nutzer bleibt davon **vollständig unberührt**, solange die Domain stabil bleibt. Es ist **kein Persistent Volume nötig**.

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
4. „Deploy" klicken. Beim ersten Build dauert es ein paar Minuten.

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
docker run -p 3000:3000 lernkarten-app
```

Dann <http://localhost:3000> öffnen.

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

Die zentrale Lern- und Statistik-Logik ist mit 45 automatischen Tests abgesichert. Wer mag, kann sie selbst laufen lassen:

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
├── app/                 # Seiten (Startseite, Lernen, Abschluss, Statistik)
├── components/          # UI-Komponenten (Karte, Buttons, Diagramm, …)
├── lib/                 # Logik (Algorithmus, Speicher, Statistik, Datum)
│   └── __tests__/       # 45 Tests
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
