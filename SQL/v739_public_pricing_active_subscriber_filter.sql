-- ============================================================================
-- v739: Hide public pricing plans with no active subscriber
-- PostgreSQL 15+ / Supabase
-- Prerequisites: public.platform_subscriptions, sim.simulator_subscriptions
--
-- Public pricing pages (Platform/Simulator/Bundle) should hide a paid plan
-- once every subscriber on it has moved off 'active' status (all expired/
-- cancelled/trialing), while still showing brand-new plans that have never
-- had a subscriber at all. This RPC returns only aggregated (plan_type,
-- has_active) rows — no individual subscriber data — so it is safe to grant
-- to anon/authenticated for use on unauthenticated public pricing pages.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_subscription_plan_activity()
RETURNS TABLE (
    target_system TEXT,
    plan_type TEXT,
    has_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, sim
AS $$
    SELECT 'platform'::TEXT AS target_system, ps.plan_type, bool_or(ps.status = 'active') AS has_active
    FROM public.platform_subscriptions ps
    GROUP BY ps.plan_type

    UNION ALL

    SELECT 'simulator'::TEXT AS target_system, ss.plan_type, bool_or(ss.status = 'active') AS has_active
    FROM sim.simulator_subscriptions ss
    GROUP BY ss.plan_type;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_plan_activity() TO anon, authenticated, service_role;
