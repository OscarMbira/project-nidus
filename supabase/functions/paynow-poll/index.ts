/**
 * Paynow Payment Status Polling Edge Function
 * Polls Paynow for payment status
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isPaynowPollUrl, mapPaynowStatus, verifyPaynowHash } from '../_shared/paynow.js';

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

    // v1352 Slice 2: only Paynow's own addresses are polled, and the answer is trusted only with a
    // matching hash (shared verifier; the hourly payments.pending_recheck job does the same server-side).
    if (!isPaynowPollUrl(pollUrl)) {
      return new Response(
        JSON.stringify({ error: 'pollUrl is not a Paynow address' }),
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

    if (!(await verifyPaynowHash(responseParams, Deno.env.get('PAYNOW_INTEGRATION_KEY') || ''))) {
      return new Response(
        JSON.stringify({ error: 'Invalid hash' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Paynow status to our status
    const paymentStatus = mapPaynowStatus(status);

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

