/**
 * Proxy audio to OpenAI Whisper (API key server-side).
 * Body: JSON { audioBase64, mimeType } or raw bytes with Content-Type.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const key = Deno.env.get('OPENAI_API_KEY') || '';
  if (!key) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    let blob: Blob;
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const j = await req.json();
      const b64 = j?.audioBase64 || j?.audio;
      const mime = j?.mimeType || 'audio/webm';
      if (!b64) {
        return new Response(JSON.stringify({ error: 'audioBase64 required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      blob = new Blob([bytes], { type: mime });
    } else {
      blob = await req.blob();
    }

    const form = new FormData();
    form.append('file', blob, 'audio.webm');
    form.append('model', 'whisper-1');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.error?.message || res.statusText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ text: data.text || '' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
