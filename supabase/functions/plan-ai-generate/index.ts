/**
 * plan-ai-generate — AI-assisted schedule / plan structure for Planning module (M5).
 * Body: { prompt, industryTemplate?, projectId }
 * Returns JSON consumed by src/services/planAIService.js (generated_* + ai_assumptions + ai_explanation).
 *
 * Env: GEMINI_API_KEY (optional — when unset, returns a deterministic stub so the client can persist sessions).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM = `You are a project planning assistant. Return ONLY valid JSON (no markdown) with this shape:
{
  "generated_phases": [{"name": string, "order_index": number}],
  "generated_milestones": [{"name": string, "target_date": string | null, "description": string | null}],
  "generated_tasks": [{"name": string, "duration_days": number, "start_date": string | null, "due_date": string | null, "description": string | null, "is_milestone": boolean}],
  "generated_risks": [{"title": string, "description": string | null}],
  "ai_assumptions": [string],
  "ai_explanation": string
}
Use realistic but generic names; do not invent confidential data.`;

interface ReqBody {
  prompt?: string;
  industryTemplate?: string | null;
  projectId?: string;
}

function stubPayload(prompt: string, industryTemplate: string | null | undefined) {
  const ind = industryTemplate ? ` Template context: ${industryTemplate}.` : '';
  return {
    generated_phases: [
      { name: 'Initiation', order_index: 1 },
      { name: 'Delivery', order_index: 2 },
      { name: 'Closure', order_index: 3 },
    ],
    generated_milestones: [
      { name: 'Scope agreed', target_date: null, description: null },
      { name: 'Release ready', target_date: null, description: null },
    ],
    generated_tasks: [
      {
        name: 'Confirm scope and stakeholders',
        duration_days: 3,
        start_date: null,
        due_date: null,
        description: 'Stub task — replace after review.',
        is_milestone: false,
      },
      {
        name: 'Delivery milestone',
        duration_days: 1,
        start_date: null,
        due_date: null,
        description: null,
        is_milestone: true,
      },
    ],
    generated_risks: [{ title: 'Schedule compression', description: 'Buffer may be insufficient if dependencies slip.' }],
    ai_assumptions: [
      'Stub response: deploy GEMINI_API_KEY on Supabase Edge to enable live generation.',
      ind || 'No industry template was supplied.',
    ],
    ai_explanation: `Structured placeholder plan for: "${(prompt || '').slice(0, 200)}". ${ind}`,
  };
}

async function callGemini(prompt: string, apiKey: string): Promise<Record<string, unknown>> {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
    encodeURIComponent(apiKey);
  const text = `${SYSTEM}\n\nUser request:\n${(prompt || '').slice(0, 12000)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  });
  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.error?.message || `Gemini ${res.status}`);
  }
  const part = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!part || typeof part !== 'string') {
    throw new Error('Empty Gemini response');
  }
  const jsonMatch = part.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in model output');
  return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ReqBody;
    const prompt = body.prompt?.trim();
    const projectId = body.projectId;
    if (!prompt || !projectId) {
      return new Response(JSON.stringify({ error: 'prompt and projectId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY') || '';
    let out: Record<string, unknown>;

    if (apiKey) {
      try {
        out = await callGemini(prompt, apiKey);
      } catch (e) {
        const stub = stubPayload(prompt, body.industryTemplate ?? null);
        out = {
          ...stub,
          ai_explanation:
            (stub.ai_explanation as string) +
            ` Live generation failed: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    } else {
      out = stubPayload(prompt, body.industryTemplate ?? null);
    }

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
