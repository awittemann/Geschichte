// Schmaler Wrapper um die OpenAI Chat-Completions-API.
// Nutzt nur `fetch` — keine zusätzliche npm-Abhängigkeit.
//
// Wichtig: Dieses Modul darf NUR auf dem Server importiert werden.
// Der API-Key (OPENAI_API_KEY) darf niemals ins Client-Bundle gelangen.

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODELL = 'gpt-4o-mini';

export type ChatNachricht = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/** Prüft, ob ein API-Key hinterlegt ist. */
export function kiKonfiguriert(): boolean {
  return typeof process.env.OPENAI_API_KEY === 'string'
    && process.env.OPENAI_API_KEY.trim().length > 0;
}

/** Liefert das per ENV gewählte Modell oder den Default. */
function modell(): string {
  const m = process.env.OPENAI_MODEL;
  return m && m.trim().length > 0 ? m.trim() : DEFAULT_MODELL;
}

type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

/**
 * Schickt eine Chat-Anfrage an OpenAI und liefert den Antworttext.
 * Wirft bei fehlender Konfiguration oder API-Fehlern.
 *
 * @param jsonSchema Optional — erzwingt strukturierte JSON-Ausgabe nach Schema.
 */
export async function openAiChat(opts: {
  nachrichten: ChatNachricht[];
  jsonSchema?: JsonSchema;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('OPENAI_API_KEY ist nicht gesetzt.');
  }

  const body: Record<string, unknown> = {
    model: modell(),
    messages: opts.nachrichten,
    max_completion_tokens: opts.maxTokens ?? 700,
  };
  if (opts.jsonSchema) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: opts.jsonSchema.name,
        strict: true,
        schema: opts.jsonSchema.schema,
      },
    };
  }

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `OpenAI nicht erreichbar: ${err instanceof Error ? err.message : 'unbekannt'}`,
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI-Fehler ${res.status}: ${text.slice(0, 500)}`);
  }

  const daten = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const inhalt = daten.choices?.[0]?.message?.content;
  if (typeof inhalt !== 'string' || inhalt.length === 0) {
    throw new Error('OpenAI lieferte keine Antwort.');
  }
  return inhalt;
}
