/**
 * v1239 Slice 8.1 — Planner checkout through the existing Paynow Edge Functions.
 * The browser sends the expected amount; the webhook re-checks it against the catalog price,
 * the payer's ownership of the account and the Paynow hash before anything changes (v1239).
 */
import { platformDb } from '@nidus/supabase'

export const platformUrl = () => import.meta.env.VITE_PLATFORM_URL || 'http://localhost:5173'

export async function getCatalog() {
  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('id, plan_name, plan_type, billing_cycle, price, currency, member_limit, platform_included, display_order')
    .eq('is_active', true)
    .order('display_order')
  if (error) throw new Error(error.message || 'Could not load plans.')
  const rows = data || []
  return {
    // Plans with no price yet (e.g. the v1248 seed rows before Admin sets a price) are never offered.
    planner: rows.filter((p) => p.plan_type === 'planner' && Number(p.price) > 0),
    platform: rows.filter((p) => p.plan_type !== 'planner' && p.platform_included && p.billing_cycle !== 'lifetime'),
  }
}

/** Amount for a checkout. Pure; exported for tests. */
export function checkoutAmount(plan, { action, seats }) {
  const price = Number(plan?.price) || 0
  if (action === 'planner_upgrade_platform') return Math.round(price * 100) / 100
  return Math.round(price * Math.max(1, Math.floor(Number(seats) || 1)) * 100) / 100
}

export async function startCheckout({ plan, action, seats, accountId }) {
  const amount = checkoutAmount(plan, { action, seats })
  if (!(amount > 0)) throw new Error('This plan has no price yet. Please contact support.')
  const { data: session } = await platformDb.auth.getSession()
  const token = session?.session?.access_token
  const reference = `PLN-${Date.now()}`
  const base = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${base}/functions/v1/paynow-initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    body: JSON.stringify({
      amount,
      currency: plan.currency || 'USD',
      reference,
      returnUrl: `${window.location.origin}/app/billing?ref=${reference}`,
      resultUrl: `${base}/functions/v1/paynow-webhook`,
      description: action === 'planner_upgrade_platform' ? `Upgrade to Nidus PMIS — ${plan.plan_name}` : `Nidus Planner — ${seats} seat(s)`,
      metadata: {
        product: 'planner',
        type: 'planner',
        action,
        organisation_id: accountId,
        billing_cycle: plan.billing_cycle,
        seats: action === 'planner_subscribe' ? Math.max(1, Math.floor(Number(seats) || 1)) : undefined,
        target_plan_type: action === 'planner_upgrade_platform' ? plan.plan_type : undefined,
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.checkoutUrl) throw new Error(data.error || 'Could not start the payment.')
  return data
}

export async function listPayments(accountId) {
  const { data, error } = await platformDb
    .from('payment_transactions')
    .select('id, reference, amount, currency, status, created_at, metadata')
    .eq('metadata->>organisation_id', accountId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message || 'Could not load payments.')
  return (data || []).filter((p) => p.metadata?.product === 'planner')
}
