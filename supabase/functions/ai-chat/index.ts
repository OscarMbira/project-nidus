/**
 * ai-chat Edge Function
 * Generic Gemini call for the AI Assistant's "no project data / no docs" path (plain PM
 * knowledge questions). Holds GEMINI_API_KEY as a server secret — replaces the old client-side
 * VITE_GEMINI_API_KEY call in aiAssistantService.js's callGemini(), which embedded the key
 * directly in the browser bundle and got flagged/revoked by Google's leak detection (found live
 * 2026-09-11). Same auth-less, CORS "*" pattern as the sibling ai-data-summary/ai-docs
 * functions — consistent with what's already deployed for this feature.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  question: string;
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Preferred models newest-first — mirrors the client's old GEMINI_MODEL_PREFERENCE so behaviour
// (auto-adapting when Google deprecates a model) is unchanged, just moved server-side.
const GEMINI_MODEL_PREFERENCE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

// Cached across invocations for the lifetime of this function instance (Deno isolates are
// reused between requests) — avoids a ListModels call on every single chat message.
let resolvedModel: string | null = null;

async function discoverModel(apiKey: string): Promise<string> {
  if (resolvedModel) return resolvedModel;

  try {
    const res = await fetch(`${GEMINI_BASE}/models?key=${apiKey}`);
    const listData = await res.json();
    const available = new Set(
      (listData?.models ?? [])
        .filter((m: { supportedGenerationMethods?: string[] }) =>
          m.supportedGenerationMethods?.includes('generateContent')
        )
        .map((m: { name: string }) => m.name.replace('models/', ''))
    );
    const match = GEMINI_MODEL_PREFERENCE.find((m) => available.has(m));
    if (match) {
      resolvedModel = match;
      return match;
    }
  } catch {
    // Network error during discovery — fall through to the preference list without filtering.
  }

  resolvedModel = GEMINI_MODEL_PREFERENCE[0];
  return resolvedModel;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { question }: RequestBody = await req.json();
    if (!question) {
      return new Response(
        JSON.stringify({ error: 'question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let model = await discoverModel(apiKey);
    let res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: question }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
      }),
    });

    if (res.status === 404) {
      // Chosen model was deprecated — clear cache and retry once with fresh discovery.
      resolvedModel = null;
      model = await discoverModel(apiKey);
      res = await fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: question }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      });
    }

    if (!res.ok) {
      const err = await res.text();
      return new Response(
        JSON.stringify({ error: `Gemini: ${res.status} ${err}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received from Gemini.';
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
