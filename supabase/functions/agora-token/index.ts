/**
 * Agora RTC token (server-side; keep App Certificate out of the browser).
 * Secrets: AGORA_APP_ID, AGORA_APP_CERTIFICATE (Supabase Edge Function env).
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @deno-types="https://esm.sh/agora-access-token@2.0.4/build/RtcTokenBuilder.d.ts"
import { RtcTokenBuilder, RtcRole } from 'https://esm.sh/agora-access-token@2.0.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('AGORA_APP_ID') || '';
    const cert = Deno.env.get('AGORA_APP_CERTIFICATE') || '';
    if (!appId || !cert) {
      return new Response(JSON.stringify({ error: 'AGORA_APP_ID / AGORA_APP_CERTIFICATE not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const channelName = body?.channelName || body?.channel;
    const uid = Number(body?.uid ?? 0);
    if (!channelName) {
      return new Response(JSON.stringify({ error: 'channelName required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expire = Math.floor(Date.now() / 1000) + 3600;
    const token = RtcTokenBuilder.buildTokenWithUid(appId, cert, channelName, uid, RtcRole.PUBLISHER, expire);

    return new Response(JSON.stringify({ token, appId, uid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
