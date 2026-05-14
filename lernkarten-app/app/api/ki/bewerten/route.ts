import { NextResponse } from 'next/server';
import { aktuellerNutzerName } from '@/lib/server/auth';
import { findeKarte } from '@/lib/server/karten';
import { kiKonfiguriert, openAiChat } from '@/lib/server/openai';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Du bist ein wohlwollender, aber genauer Geschichts-Lehrer.
Du bewertest die Antwort einer Schülerin/eines Schülers auf eine Lernkarten-Frage.
Vergleiche die Antwort inhaltlich mit der Musterlösung — achte auf Sinn, nicht auf
Wortgleichheit. Tippfehler und freie Formulierungen sind in Ordnung.

Gib zurück:
- "score": eine ganze Zahl von 1 bis 100. 1 = inhaltlich falsch oder leer,
  100 = vollständig und korrekt. Teilwissen liegt dazwischen.
- "feedback": 2–4 Sätze auf Deutsch, in direkter "du"-Ansprache. Sag konkret,
  was richtig war und was gefehlt hat oder falsch war. Bleib freundlich und
  motivierend.`;

export async function POST(request: Request) {
  const name = await aktuellerNutzerName();
  if (!name) {
    return NextResponse.json({ fehler: 'Nicht angemeldet' }, { status: 401 });
  }
  if (!kiKonfiguriert()) {
    return NextResponse.json(
      { fehler: 'KI-Bewertung ist nicht konfiguriert.' },
      { status: 503 },
    );
  }

  let body: { kartenId?: unknown; nutzerAntwort?: unknown };
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
  if (!nutzerAntwort) {
    return NextResponse.json(
      { fehler: 'Bitte zuerst eine Antwort eingeben.' },
      { status: 400 },
    );
  }
  const karte = findeKarte(kartenId);
  if (!karte) {
    return NextResponse.json({ fehler: 'Karte nicht gefunden' }, { status: 404 });
  }

  const userPrompt = [
    `Frage: ${karte.frage}`,
    `Musterlösung: ${karte.antwort}`,
    `Antwort des Schülers: ${nutzerAntwort}`,
  ].join('\n\n');

  try {
    const roh = await openAiChat({
      nachrichten: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      jsonSchema: {
        name: 'lernkarten_bewertung',
        schema: {
          type: 'object',
          properties: {
            score: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              description: 'Bewertung der Antwort von 1 (falsch) bis 100 (perfekt).',
            },
            feedback: {
              type: 'string',
              description: 'Konstruktives Feedback auf Deutsch, 2–4 Sätze, du-Ansprache.',
            },
          },
          required: ['score', 'feedback'],
          additionalProperties: false,
        },
      },
      maxTokens: 600,
    });

    const parsed = JSON.parse(roh) as { score?: unknown; feedback?: unknown };
    const score =
      typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
    const feedback =
      typeof parsed.feedback === 'string' ? parsed.feedback.trim() : '';
    if (!Number.isFinite(score) || feedback.length === 0) {
      return NextResponse.json(
        { fehler: 'KI-Antwort unvollständig.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ score, feedback });
  } catch (err) {
    console.error('KI-Bewertung fehlgeschlagen:', err);
    return NextResponse.json(
      { fehler: 'KI-Dienst nicht erreichbar.' },
      { status: 502 },
    );
  }
}
