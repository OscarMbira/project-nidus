/**
 * ai-docs Edge Function (Phase 1.5)
 * Answers "how do I" / guide questions using only provided documentation chunks.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocChunk {
  doc_title?: string;
  chunk_text?: string;
  doc_filename?: string;
  doc_route?: string;
}

interface RequestBody {
  chunks: DocChunk[];
  question: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { chunks, question }: RequestBody = await req.json();
    if (!chunks?.length || !question) {
      return new Response(
        JSON.stringify({ error: 'chunks and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const docBlock = chunks
      .map((c) => `[${c.doc_title ?? 'Doc'}]\n${(c.chunk_text ?? '').slice(0, 2000)}`)
      .join('\n\n---\n\n');

    const prompt = `Using ONLY the following documentation excerpts, answer the user's question. Do not use external knowledge. If the answer is not in the excerpts, say so.\n\n${docBlock.slice(0, 12000)}\n\nQuestion: ${question}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(
        JSON.stringify({ error: `Claude: ${res.status} ${err}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const answer = data.content?.[0]?.text ?? '';
    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
