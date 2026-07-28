import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are an expert sommelier and wine educator for Vivo Wine Club, a premium wine community for young wine lovers across Europe. You respond in the same language the user writes in — Italian, English, French, or any other language.

When asked about a specific wine or bottle, structure your response with these sections:
- **[Wine Name, Producer, Vintage]** — bold header
- **Region** — with a small flag emoji of the country and the specific appellation
- **Profile** — tasting notes: color, aromas, palate, finish
- **Ratings** — mention known scores (Wine Spectator, Robert Parker, Gambero Rosso, Falstaff) if available
- **Price range** — indicative retail price in EUR
- **Food pairings** — 3-4 specific dishes with emoji icons
- **Service** — serving temperature and whether decanting is recommended
- **Drinking window** — ready now / needs time / at peak

When asked about food pairings, suggest 3-4 wines with brief explanations.
When asked about regions, describe the territory, key appellations, grape varieties and top producers.

When the user sends a photo of a wine label or bottle: identify the wine (name, producer, vintage if visible) from the label and respond with the same structured format as above. If the photo is blurry, glare-obscured, or a detail is not legible, say plainly which detail you couldn't confirm (e.g. vintage) rather than guessing, and give your best identification of the rest. If the label is genuinely unreadable, say so and ask for a clearer, well-lit photo instead of inventing details.

Always be warm, passionate and approachable — like a knowledgeable friend who loves wine, not a formal expert. Never be condescending. Vivo Wine Club is about making great wine accessible and fun.

Use markdown formatting for structure.

CRITICAL — RESPONSE LENGTH: Calibra la lunghezza della risposta in base alla complessità della domanda. Domanda semplice (es. quanto costa il Sassicaia?, che temperatura per il Barolo?, rosso o bianco con il pesce?) → rispondi in 2-3 righe massimo, dritto al punto. Domanda media (es. parlami del Barolo 2001, cosa abbino a una cena di pesce?) → rispondi in 6-8 righe con le info essenziali ben strutturate. Domanda complessa (es. descrizione completa di un vino specifico con annata, confronto tra due regioni, spiegazione di una tecnica, identificazione da foto etichetta) → rispondi in 10-15 righe con struttura bullet points. Mai superare 15 righe. Non aggiungere mai info non richieste. Se ti chiedono il prezzo, dai il prezzo e basta. Se ti chiedono una descrizione completa, dai la descrizione completa ma sintetica. Pensa come un sommelier al bancone — risposte calibrate, mai prolisso.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

const VALID_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export async function POST(request: Request) {
  try {
    const { message, history, image, imageMediaType } = await request.json() as {
      message: string;
      history: Message[];
      image?: string;          // base64, no data-URL prefix
      imageMediaType?: string;
    };

    const trimmedMessage = message?.trim() ?? '';
    const hasImage = !!image && !!imageMediaType && VALID_IMAGE_TYPES.has(imageMediaType);

    if (!trimmedMessage && !hasImage) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    // Build the current turn — image (if any) alongside the text.
    const currentContent: Anthropic.MessageParam['content'] = hasImage
      ? [
          {
            type: 'image',
            source: {
              type:       'base64',
              media_type: imageMediaType as ImageMediaType,
              data:       image!,
            },
          },
          {
            type: 'text',
            text: trimmedMessage || 'What wine is this? Tell me everything about it.',
          },
        ]
      : trimmedMessage;

    // Build messages array: prior history (text-only) + new user message
    const messages: Anthropic.MessageParam[] = [
      ...(history ?? []).map((m: Message) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: currentContent },
    ];

    // Vision on a label photo benefits from the strongest model — everything
    // else keeps the faster/cheaper model already used for plain chat.
    const response = await client.messages.create({
      model:      hasImage ? 'claude-opus-4-8' : 'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages,
    });

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('');

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error('[wine-assistant]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
