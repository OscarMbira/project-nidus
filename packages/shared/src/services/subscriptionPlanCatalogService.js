/**
 * Load subscription_plans catalog for public pricing pages (catalog prices only).
 */

import { platformDb } from '@nidus/supabase'
import { normalizePlanTypeForCatalog } from './subscriptionPreviewCatalog.js'

function filterPlansForTargetSystem(plans, targetSystem) {
  if (!targetSystem || !Array.isArray(plans)) return plans || []

  return plans.filter((plan) => {
    if (plan.is_active === false) return false
    const scope = plan.catalog_scope || 'both'

    if (targetSystem === 'simulator') {
      return plan.simulator_included !== false && scope === 'simulator'
    }

    if (targetSystem === 'platform') {
      return plan.platform_included !== false && (scope === 'platform' || scope === 'both')
    }

    return true
  })
}

export async function fetchSubscriptionPlansCatalog(targetSystem = null) {
  const rpcArgs = targetSystem ? { p_target_system: targetSystem } : {}

  const { data: rpcData, error: rpcError } = await platformDb.rpc(
    'get_public_subscription_plans',
    rpcArgs,
  )

  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData
  }

  const { data, error } = await platformDb
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (error) {
    const detail = rpcError?.message || error.message || 'Failed to fetch subscription plans'
    throw new Error(detail)
  }

  return filterPlansForTargetSystem(data || [], targetSystem)
}

/**
 * Aggregated (plan_type, has_active) rows across all subscribers — no
 * individual subscriber data, safe for anonymous public pricing pages.
 */
async function fetchSubscriptionPlanActivity() {
  const { data, error } = await platformDb.rpc('get_subscription_plan_activity')
  if (error || !Array.isArray(data)) return []
  return data
}

/**
 * A plan with existing subscribers but none currently 'active' (all
 * expired/cancelled/trialing) is hidden from public pricing. A plan with
 * no subscribers at all (never purchased) is still shown — this only
 * hides plans that have gone stale, not ones that are simply new.
 */
function hasNoActiveSubscribers(plan, planActivity) {
  if (!planActivity?.length || plan.plan_type === 'free') return false

  const system = plan.catalog_scope === 'simulator' ? 'simulator' : 'platform'
  const matches = planActivity.filter(
    (row) => row.target_system === system && normalizePlanTypeForCatalog(row.plan_type, system) === plan.plan_type,
  )

  if (!matches.length) return false
  return !matches.some((row) => row.has_active)
}

export async function fetchPricingCatalogBundle(targetSystem = null) {
  const [plans, planActivity] = await Promise.all([
    fetchSubscriptionPlansCatalog(targetSystem),
    fetchSubscriptionPlanActivity(),
  ])

  return { plans: plans.filter((plan) => !hasNoActiveSubscribers(plan, planActivity)) }
}

export function subscribeToPricingCatalogUpdates(onUpdate) {
  const channel = platformDb
    .channel('nidus-pricing-catalog')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subscription_plans' },
      onUpdate,
    )
    .subscribe()

  return () => {
    platformDb.removeChannel(channel)
  }
}

function planMatchesCatalogScope(plan, system = 'platform') {
  const scope = plan.catalog_scope || 'both'
  if (system === 'simulator') {
    if (plan.simulator_included === false) return false
    return scope === 'simulator'
  }
  if (plan.platform_included === false) return false
  return scope === 'platform' || scope === 'both'
}

export function findCatalogPlanRow(dbPlans, planType, system = 'platform', billingCycle = 'monthly') {
  if (!planType || !dbPlans?.length) return null

  const catalogPlanType = normalizePlanTypeForCatalog(planType, system)
  const cycle = billingCycle === 'lifetime' || catalogPlanType === 'lifetime' || String(planType).startsWith('lifetime_')
    ? 'lifetime'
    : billingCycle

  const candidates = dbPlans.filter((plan) => {
    if (plan.is_active === false) return false
    if (!planMatchesCatalogScope(plan, system)) return false
    if (plan.plan_type !== catalogPlanType) return false
    return plan.billing_cycle === cycle
  })

  if (!candidates.length) return null

  const preferredScope = system === 'simulator' ? 'simulator' : 'platform'
  return (
    candidates.find((plan) => plan.catalog_scope === preferredScope)
    || candidates.find((plan) => plan.catalog_scope === 'both')
    || candidates[0]
  )
}
