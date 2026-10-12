/**
 * Paynow Webhook Handler Edge Function
 * Processes Paynow payment status updates
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function periodEnd(cycle: string): string {
  const d = new Date();
  if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/**
 * v1239 — Planner payment: metadata { product: 'planner', action, organisation_id, billing_cycle,
 * seats?, target_plan_type? } plus initiated_by_auth_user_id stamped by paynow-initiate.
 *   action 'planner_subscribe'         → active planner subscription with `seats` members
 *   action 'planner_upgrade_platform'  → change_account_edition(→ platform) + platform subscription
 * Idempotent on the Paynow reference.
 */
// deno-lint-ignore no-explicit-any
async function handlePlannerPayment(supabase: any, transaction: any, amount: number, paynowReference: string) {
  const meta = transaction.metadata || {};
  const accountId = meta.organisation_id;
  const cycle = meta.billing_cycle === 'yearly' ? 'yearly' : 'monthly';

  const { data: already } = await supabase.from('platform_subscriptions').select('id').eq('paynow_reference', paynowReference).maybeSingle();
  if (already) return;

  // The payer must own the account.
  const { data: owner } = await supabase
    .from('accounts').select('id, owner_user_id, users:owner_user_id (auth_user_id)').eq('id', accountId).maybeSingle();
  const ownerAuth = owner?.users?.auth_user_id;
  if (!owner || !meta.initiated_by_auth_user_id || ownerAuth !== meta.initiated_by_auth_user_id) {
    console.error('Planner payment ignored: payer does not own the account', accountId);
    return;
  }

  const planType = meta.action === 'planner_upgrade_platform' ? String(meta.target_plan_type || '') : 'planner';
  const { data: plan } = await supabase
    .from('subscription_plans').select('price, currency, member_limit').eq('plan_type', planType).eq('billing_cycle', cycle).eq('is_active', true)
    .order('price', { ascending: true }).limit(1).maybeSingle();
  if (!plan) {
    console.error('Planner payment ignored: no active catalog plan', planType, cycle);
    return;
  }
  const seats = Math.max(1, Math.floor(Number(meta.seats) || 1));
  const expected = meta.action === 'planner_upgrade_platform' ? Number(plan.price) : Number(plan.price) * seats;
  if (amount + 0.005 < expected) {
    console.error('Planner payment ignored: amount below price', { amount, expected, accountId });
    return;
  }

  const base = {
    account_id: accountId,
    user_id: meta.initiated_by_auth_user_id,
    billing_cycle: cycle,
    status: 'active',
    is_trial: false,
    amount_paid: amount,
    currency: transaction.currency || plan.currency || 'USD',
    paynow_reference: paynowReference,
    started_at: new Date().toISOString(),
    expires_at: periodEnd(cycle),
    metadata: { source: 'planner', action: meta.action },
  };

  if (meta.action === 'planner_upgrade_platform') {
    const { error: edErr } = await supabase.rpc('change_account_edition', {
      p_account_id: accountId, p_edition: 'platform', p_reason: `Paid upgrade (Paynow ${paynowReference})`,
    });
    if (edErr) { console.error('Edition change failed', edErr); return; }
    await supabase.from('platform_subscriptions').insert({ ...base, plan_type: planType, member_limit: plan.member_limit || 20 });
  } else {
    await supabase.from('platform_subscriptions').insert({ ...base, plan_type: 'planner', max_team_members: seats, member_limit: seats });
  }
  await supabase.from('platform_subscriptions').update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('account_id', accountId).eq('plan_type', 'planner').eq('status', 'trialing');
}

serve(async (req) => {
  try {
    // Paynow sends status updates as form data
    const formData = await req.formData();
    
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    const reference = params.reference;
    const paynowReference = params.paynowreference;
    const amount = parseFloat(params.amount || '0');
    const status = params.status; // 'Paid', 'Cancelled', 'Created', etc.
    const pollUrl = params.pollurl;
    const hash = params.hash;

    if (!reference) {
      return new Response(
        JSON.stringify({ error: 'Missing reference' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify hash
    const integrationKey = Deno.env.get('PAYNOW_INTEGRATION_KEY');
    if (integrationKey && hash) {
      const hashParams = new Map<string, string>();
      Object.keys(params).forEach(key => {
        if (key !== 'hash') {
          hashParams.set(key, params[key]);
        }
      });
      
      const sortedParams = Array.from(hashParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const hashString = sortedParams.map(([key, value]) => `${key}=${value}`).join('&') + integrationKey;
      
      const encoder = new TextEncoder();
      const data = encoder.encode(hashString);
      const hashBuffer = await crypto.subtle.digest('SHA-512', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      if (hash !== calculatedHash) {
        console.error('Invalid hash in webhook');
        return new Response(
          JSON.stringify({ error: 'Invalid hash' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Reaching here with both set means the hash matched (a mismatch returned 400 above).
    const hashVerified = Boolean(integrationKey && hash);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Update payment transaction status
    const { data: transaction, error: txError } = await supabase
      .from('payment_transactions')
      .update({
        status: paymentStatus,
        paynow_reference: paynowReference,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)
      .select()
      .single();

    if (txError) {
      console.error('Transaction update error:', txError);
      // Still return success to Paynow to prevent retries
      return new Response(
        JSON.stringify({ status: 'ok' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // v1239 Slice 8.1 — Project Planner payments (per-seat plan, or upgrade to the full PMIS).
    // Stricter than the generic branch below: requires a verified hash, the payer must own the
    // account, and the amount must cover the catalog price.
    if (status === 'Paid' && transaction?.metadata?.product === 'planner') {
      if (!hashVerified) {
        console.error('Planner payment ignored: webhook was not signed', reference);
      } else {
        await handlePlannerPayment(supabase, transaction, amount, paynowReference);
      }
      return new Response(JSON.stringify({ status: 'ok' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // If payment is successful and it's a subscription, create/update subscription
    if (status === 'Paid' && transaction && transaction.metadata?.type === 'subscription') {
      const metadata = transaction.metadata;
      
      // Check if subscription already exists
      const { data: existingSub } = await supabase
        .from('platform_subscriptions')
        .select('id')
        .eq('account_id', metadata.organisation_id)
        .eq('status', 'active')
        .maybeSingle();

      if (!existingSub) {
        // Calculate expiry date
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
              return null;
            default:
              now.setMonth(now.getMonth() + 1);
              return now.toISOString();
          }
        };

        const expiresAt = calculateExpiryDate(metadata.billing_cycle);

        // Create subscription record
        const { data: subscription, error: subError } = await supabase
          .from('platform_subscriptions')
          .insert({
            account_id: metadata.organisation_id,
            project_id: metadata.project_id || null,
            plan_type: metadata.plan_type,
            billing_cycle: metadata.billing_cycle,
            status: 'active',
            member_limit: metadata.member_limit || 20,
            amount_paid: amount,
            currency: transaction.currency,
            paynow_reference: paynowReference,
            started_at: new Date().toISOString(),
            expires_at: expiresAt,
            is_lifetime: metadata.billing_cycle === 'lifetime',
          })
          .select()
          .single();

        if (subError) {
          console.error('Subscription creation error:', subError);
        } else if (metadata.project_id) {
          // Update project if upgrading from trial
          await supabase
            .from('projects')
            .update({
              project_mode: 'paid',
              subscription_id: subscription.id,
              member_limit: metadata.member_limit || 20,
              trial_upgraded_at: new Date().toISOString(),
            })
            .eq('id', metadata.project_id);

          // Update trial tracking
          await supabase
            .from('trial_project_tracking')
            .update({
              status: 'upgraded',
              upgraded_at: new Date().toISOString(),
            })
            .eq('project_id', metadata.project_id)
            .eq('status', 'active');
        }

        // Update account flags
        await supabase
          .from('accounts')
          .update({
            has_paid_project: true,
          })
          .eq('id', metadata.organisation_id);
      }
    }

    // Return success to Paynow
    return new Response(
      JSON.stringify({ status: 'ok' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Paynow webhook error:', error);
    // Still return success to prevent Paynow from retrying
    return new Response(
      JSON.stringify({ status: 'ok' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
});

