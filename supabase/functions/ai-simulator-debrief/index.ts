/**
 * ai-simulator-debrief Edge Function
 * Post-simulation debrief via Claude Haiku. Input: { runSummary } — aggregated, no PII.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  runSummary: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { runSummary }: RequestBody = await req.json();
    if (!runSummary || typeof runSummary !== 'string') {
      return new Response(
        JSON.stringify({ error: 'runSummary (string) is required' }),
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

    const prompt = `You are a project management simulation coach. Based on the following run summary, generate a structured debrief. Return ONLY a valid JSON object with these exact keys (no markdown, no extra text):
{
  "summary": "1-2 sentence overall performance narrative",
  "strengths": ["up to 3 short strength bullet points"],
  "improvements": ["up to 3 short improvement bullet points"],
  "topTip": "single most important takeaway",
  "moduleCommentary": { "optional object with module names as keys and one sentence each" }
}

Run summary:
${runSummary.slice(0, 8000)}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
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
    const text = data.content?.[0]?.text?.trim() ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    const debrief = match ? JSON.parse(match[0]) : null;

    if (!debrief) {
      return new Response(
        JSON.stringify({ error: 'Invalid debrief JSON from model' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ debrief }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
