/**
 * ai-data-summary Edge Function
 * Generates a short summary from formatted data using Claude Haiku or Gemini.
 * Called when data_answer_mode is 'claude' or 'gemini'.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  formattedText: string;
  question: string;
  mode: 'claude' | 'gemini';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { formattedText, question, mode }: RequestBody = await req.json();
    if (!formattedText || !question) {
      return new Response(
        JSON.stringify({ error: 'formattedText and question are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Using ONLY the following data, answer the user's question in one or two concise sentences. Do not invent any information.\n\nData:\n${(formattedText || '').slice(0, 6000)}\n\nQuestion: ${question}`;

    if (mode === 'claude') {
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
      return new Response(
        JSON.stringify({ answer }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // mode === 'gemini'
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      return new Response(
        JSON.stringify({ error: `Gemini: ${res.status} ${err}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
