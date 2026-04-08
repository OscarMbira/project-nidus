/**
 * Paynow Payment Status Polling Edge Function
 * Polls Paynow for payment status
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

    // Get poll URL from query parameters
    const url = new URL(req.url);
    const pollUrl = url.searchParams.get('pollUrl');

    if (!pollUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing pollUrl parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Poll Paynow for payment status
    const pollResponse = await fetch(pollUrl, {
      method: 'GET',
    });

    const pollData = await pollResponse.text();
    
    // Parse Paynow response
    const responseParams = new URLSearchParams(pollData);
    const status = responseParams.get('status');
    const reference = responseParams.get('reference');
    const paynowReference = responseParams.get('paynowreference');
    const amount = responseParams.get('amount');
    const hash = responseParams.get('hash');

    // Verify hash if provided
    if (hash) {
      const integrationKey = Deno.env.get('PAYNOW_INTEGRATION_KEY');
      if (integrationKey) {
        const params = new Map<string, string>();
        responseParams.forEach((value, key) => {
          if (key !== 'hash') {
            params.set(key, value);
          }
        });
        
        const sortedParams = Array.from(params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const hashString = sortedParams.map(([key, value]) => `${key}=${value}`).join('&') + integrationKey;
        
        const encoder = new TextEncoder();
        const data = encoder.encode(hashString);
        const hashBuffer = await crypto.subtle.digest('SHA-512', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

        if (hash !== calculatedHash) {
          return new Response(
            JSON.stringify({ error: 'Invalid hash' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Map Paynow status to our status
    let paymentStatus = 'pending';
    if (status === 'Paid') {
      paymentStatus = 'paid';
    } else if (status === 'Cancelled') {
      paymentStatus = 'cancelled';
    } else if (status === 'Created') {
      paymentStatus = 'pending';
    } else if (status === 'Error') {
      paymentStatus = 'failed';
    }

    // Update payment transaction if reference exists
    if (reference) {
      await supabase
        .from('payment_transactions')
        .update({
          status: paymentStatus,
          paynow_reference: paynowReference,
          updated_at: new Date().toISOString(),
        })
        .eq('reference', reference);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: paymentStatus,
        reference: reference,
        paynowReference: paynowReference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Paynow poll error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

