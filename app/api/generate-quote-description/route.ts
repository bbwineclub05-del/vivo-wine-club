import { NextResponse } from 'next/server';
import { requireAdminOrStaff } from '@/lib/auth-guard';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: Request) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  if (!ANTHROPIC_API_KEY) {
    console.error('[generate-quote-description] ANTHROPIC_API_KEY is not set in environment');
    return NextResponse.json(
      { error: 'Chiave API Anthropic non configurata. Aggiungi ANTHROPIC_API_KEY al file .env.local e riavvia il server.' },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { clientName, eventType, eventDate, venue, attendees, services } = body;

  const prompt = `Sei il copywriter ufficiale di Vivo Wine Club, un wine club esclusivo per giovani professionisti appassionati di vino.
Scrivi una descrizione professionale, elegante e avvincente per una proposta evento/preventivo da inviare a un cliente.

Dettagli evento:
- Cliente: ${clientName || 'N/D'}
- Tipo evento: ${eventType || 'N/D'}
- Data: ${eventDate || 'N/D'}
- Luogo: ${venue || 'N/D'}
- Numero partecipanti: ${attendees || 'N/D'}
- Servizi inclusi: ${services?.length ? services.join(', ') : 'N/D'}

Scrivi una descrizione di 3-4 paragrafi in italiano, in prima persona plurale ("Vivo Wine Club propone..."), che:
1. Contestualizzi l'esperienza e il valore unico dell'evento
2. Descriva i servizi inclusi in modo evocativo e dettagliato
3. Enfatizzi la cura, la professionalità e l'esclusività di Vivo Wine Club
4. Chiuda con un invito caldo a procedere

Tono: sofisticato, caldo, professionale — non eccessivamente formale. Niente bullet points, solo prosa fluente.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-6',
        max_tokens: 900,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[generate-quote-description] Anthropic HTTP ${response.status}:`, errText);
      return NextResponse.json(
        { error: `Errore API Anthropic (${response.status}). Controlla i log del server.` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text  = data.content?.[0]?.text ?? '';

    if (!text) {
      console.error('[generate-quote-description] Empty response from Anthropic:', JSON.stringify(data));
      return NextResponse.json({ error: 'Risposta vuota dall\'AI.' }, { status: 502 });
    }

    return NextResponse.json({ description: text });
  } catch (err) {
    console.error('[generate-quote-description] Fetch error:', err);
    return NextResponse.json({ error: 'Errore di connessione all\'API Anthropic.' }, { status: 500 });
  }
}
