/**
 * Structured meeting extraction from transcript (Gemini).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `You are a project management assistant. Analyse the meeting transcript and return ONLY valid JSON:
{
  "summary": "string",
  "key_decisions": [{"decision": "string", "made_by": "string"}],
  "action_items": [{"description": "string", "owner_name": "string", "due_date": null, "priority": "medium"}],
  "issues": [{"title": "string", "description": "string", "priority": "high|medium|low", "category": "string", "source_quote": "string"}],
  "risks": [{"title": "string", "description": "string", "probability": "high|medium|low", "impact": "high|medium|low", "category": "string", "response": "mitigate|avoid|transfer|accept", "source_quote": "string"}]
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY') || '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { transcript } = await req.json();
    if (!transcript || typeof transcript !== 'string') {
      return new Response(JSON.stringify({ error: 'transcript required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `${SYSTEM}\n\nTranscript:\n${transcript.slice(0, 48000)}`;

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
      encodeURIComponent(apiKey);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    const raw = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: raw?.error?.message || res.statusText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
