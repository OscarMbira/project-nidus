/**
 * Paynow Subscription Verification Edge Function
 * Verifies payment and creates subscription
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

    // Get reference from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const reference = pathParts[pathParts.length - 1];

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Missing reference parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get payment transaction
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('reference', reference)
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment is successful
    if (transaction.status !== 'paid') {
      return new Response(
        JSON.stringify({ error: `Payment status is ${transaction.status}, not paid` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get metadata
    const metadata = transaction.metadata || {};
    const planId = metadata.plan_id;
    const planType = metadata.plan_type;
    const billingCycle = metadata.billing_cycle;
    const organisationId = metadata.organisation_id;
    const projectId = metadata.project_id;
    const memberLimit = metadata.member_limit || 20;

    if (!planId || !organisationId) {
      return new Response(
        JSON.stringify({ error: 'Missing plan or organisation information' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiry date based on billing cycle
    const calculateExpiryDate = (cycle: string): string | null => {
      const now = new Date();
      switch (cycle) {
        case 'monthly':
          now.setMonth(now.getMonth() + 1);
          return now.toISOString();
        case 'yearly':
          now.setFullYear(now.getFullYear() + 1);
          return now.toISOString();
        case 'lifetime':
          return null; // Lifetime subscriptions don't expire
        default:
          now.setMonth(now.getMonth() + 1);
          return now.toISOString();
      }
    };

    const expiresAt = calculateExpiryDate(billingCycle);

    // Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('platform_subscriptions')
      .insert({
        account_id: organisationId,
        project_id: projectId || null,
        plan_type: planType,
        billing_cycle: billingCycle,
        status: 'active',
        member_limit: memberLimit,
        amount_paid: transaction.amount,
        currency: transaction.currency,
        paynow_reference: transaction.paynow_reference,
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_lifetime: billingCycle === 'lifetime',
      })
      .select()
      .single();

    if (subError) {
      console.error('Subscription creation error:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription', details: subError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If upgrading from trial, update project
    if (projectId) {
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          project_mode: 'paid',
          subscription_id: subscription.id,
          member_limit: memberLimit,
          trial_upgraded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);

      if (projectError) {
        console.error('Project update error:', projectError);
        // Don't fail the request, but log the error
      }

      // Update trial tracking if exists
      await supabase
        .from('trial_project_tracking')
        .update({
          status: 'upgraded',
          upgraded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('project_id', projectId)
        .eq('status', 'active');
    }

    // Update account flags
    await supabase
      .from('accounts')
      .update({
        has_paid_project: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organisationId);

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        project_id: projectId || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Subscription verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

