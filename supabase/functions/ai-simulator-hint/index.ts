/**
 * ai-simulator-hint Edge Function
 * Real-time coaching hints during simulation via Gemini Flash.
 * Input: { stage?, moduleId, score, triggerReason } — no PII.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRIGGER_PROMPTS: Record<string, (moduleId: string, score: number) => string> = {
  stage_entry: (m) =>
    `The user just entered the "${m}" stage of their simulation. Give a brief, encouraging tip for this stage.`,
  score_low: (m, s) =>
    `The user's score in "${m}" is below 60% (current: ${s}%). Give a concise, constructive suggestion to improve.`,
  blank_field: (m) =>
    `The user left a critical field blank in "${m}". Remind them why this field matters.`,
  idle: (m) =>
    `The user has been idle on "${m}" for over 90 seconds. Give a gentle nudge to help them decide.`,
  bad_decision: (m) =>
    `The user made a decision in "${m}" that conflicts with best practice. Briefly explain what to consider instead.`,
};

interface RequestBody {
  stage?: string;
  moduleId: string;
  score?: number;
  triggerReason: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { stage, moduleId, score = 0, triggerReason }: RequestBody = await req.json();
    if (!moduleId || !triggerReason) {
      return new Response(
        JSON.stringify({ error: 'moduleId and triggerReason are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fn = TRIGGER_PROMPTS[triggerReason] || TRIGGER_PROMPTS.stage_entry;
    const prompt = fn(moduleId, score);

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
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are a friendly project management coach in a simulation environment. Keep your response to 1-2 sentences. Be encouraging and practical.\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 256, temperature: 0.4 },
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
    const hint = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    return new Response(
      JSON.stringify({ hint }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
