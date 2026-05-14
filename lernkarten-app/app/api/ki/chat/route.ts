import { NextResponse } from 'next/server';
import { aktuellerNutzerName } from '@/lib/server/auth';
import { findeKarte } from '@/lib/server/karten';
import {
  kiKonfiguriert,
  openAiChat,
  type ChatNachricht,
} from '@/lib/server/openai';

export const dynamic = 'force-dynamic';

// Maximale Anzahl Verlaufseinträge, die an OpenAI geschickt werden — begrenzt
// Kosten und Token-Verbrauch bei langen Chats.
const MAX_VERLAUF = 20;

type RohNachricht = { rolle?: unknown; text?: unknown };

export async function POST(request: Request) {
  const name = await aktuellerNutzerName();
  if (!name) {
    return NextResponse.json({ fehler: 'Nicht angemeldet' }, { status: 401 });
  }
  if (!kiKonfiguriert()) {
    return NextResponse.json(
      { fehler: 'KI-Chat ist nicht konfiguriert.' },
      { status: 503 },
    );
  }

  let body: {
    kartenId?: unknown;
    nutzerAntwort?: unknown;
    verlauf?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fehler: 'Ungültiger JSON-Body' }, { status: 400 });
  }

  const kartenId = typeof body.kartenId === 'string' ? body.kartenId : '';
  const nutzerAntwort =
    typeof body.nutzerAntwort === 'string' ? body.nutzerAntwort.trim() : '';
  if (!kartenId) {
    return NextResponse.json({ fehler: 'kartenId fehlt' }, { status: 400 });
  }
  const karte = findeKarte(kartenId);
  if (!karte) {
    return NextResponse.json({ fehler: 'Karte nicht gefunden' }, { status: 404 });
  }

  const rohVerlauf: RohNachricht[] = Array.isArray(body.verlauf)
    ? (body.verlauf as RohNachricht[])
    : [];
  const verlauf: ChatNachricht[] = rohVerlauf
    .slice(-MAX_VERLAUF)
    .filter(
      (n): n is { rolle: 'nutzer' | 'assistent'; text: string } =>
        !!n &&
        typeof n.text === 'string' &&
        n.text.trim().length > 0 &&
        (n.rolle === 'nutzer' || n.rolle === 'assistent'),
    )
    .map((n) => ({
      role: n.rolle === 'nutzer' ? ('user' as const) : ('assistant' as const),
      content: n.text,
    }));

  if (!verlauf.some((n) => n.role === 'user')) {
    return NextResponse.json(
      { fehler: 'Keine Rückfrage übermittelt.' },
      { status: 400 },
    );
  }

  const systemPrompt = [
    'Du bist ein hilfreicher Geschichts-Tutor. Eine Schülerin/ein Schüler hat',
    'eine Lernkarte beantwortet und bereits ein Feedback erhalten und stellt',
    'jetzt Rückfragen dazu. Antworte knapp, klar und auf Deutsch in direkter',
    '"du"-Ansprache. Bleib beim Thema der Karte.',
    '',
    `Frage der Karte: ${karte.frage}`,
    `Musterlösung: ${karte.antwort}`,
    nutzerAntwort
      ? `Ursprüngliche Antwort des Schülers: ${nutzerAntwort}`
      : 'Der Schüler hatte keine Antwort eingegeben.',
  ].join('\n');

  try {
    const antwort = await openAiChat({
      nachrichten: [
        { role: 'system', content: systemPrompt },
        ...verlauf,
      ],
      maxTokens: 600,
    });
    return NextResponse.json({ antwort: antwort.trim() });
  } catch (err) {
    console.error('KI-Chat fehlgeschlagen:', err);
    return NextResponse.json(
      { fehler: 'KI-Dienst nicht erreichbar.' },
      { status: 502 },
    );
  }
}
