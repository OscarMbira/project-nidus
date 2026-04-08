/**
 * Paynow Payment Initiation Edge Function
 * Creates a Paynow payment request for subscriptions
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { amount, currency, reference, returnUrl, resultUrl, description, metadata } = await req.json();

    // Validate required fields
    if (!amount || !reference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Paynow credentials from environment
    const integrationId = Deno.env.get('PAYNOW_INTEGRATION_ID');
    const integrationKey = Deno.env.get('PAYNOW_INTEGRATION_KEY');
    const paynowUrl = Deno.env.get('PAYNOW_URL') || 'https://www.paynow.co.zw/interface/initiatetransaction';

    if (!integrationId || !integrationKey) {
      return new Response(
        JSON.stringify({ error: 'Paynow configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Paynow request
    const params = new Map<string, string>();
    params.set('id', integrationId);
    params.set('reference', reference);
    params.set('amount', amount.toFixed(2));
    params.set('additionalinfo', description || 'Platform Subscription');
    params.set('returnurl', returnUrl || `${Deno.env.get('SITE_URL')}/checkout/success`);
    params.set('resulturl', resultUrl || `${Deno.env.get('SITE_URL')}/api/webhooks/paynow`);
    params.set('authemail', user.email || '');
    params.set('status', 'Message');

    // Create hash for Paynow authentication
    const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const hashString = sortedParams.map(([key, value]) => `${key}=${value}`).join('&') + integrationKey;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    
    params.set('hash', hash);

    // Make request to Paynow
    const formData = new URLSearchParams();
    params.forEach((value, key) => {
      formData.append(key, value);
    });

    const paynowResponse = await fetch(paynowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const paynowData = await paynowResponse.text();
    
    // Parse Paynow response (format: status=Ok&browserurl=...&pollurl=...)
    const responseParams = new URLSearchParams(paynowData);
    const status = responseParams.get('status');
    const browserUrl = responseParams.get('browserurl');
    const pollUrl = responseParams.get('pollurl');
    const error = responseParams.get('error');

    if (status !== 'Ok') {
      return new Response(
        JSON.stringify({ error: error || 'Paynow request failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store payment transaction in database
    const { error: dbError } = await supabase
      .from('payment_transactions')
      .insert({
        reference,
        amount,
        currency: currency || 'USD',
        status: 'pending',
        payment_provider: 'paynow',
        metadata: metadata || {},
        poll_url: pollUrl,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('Database error:', dbError);
      // Don't fail the request, but log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: browserUrl,
        pollUrl: pollUrl,
        reference: reference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Paynow initiation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

