-- ============================================================================
-- v735_03: Admin System — subscription management functions
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v735_01, v735_02; public.subscription_plans, platform_subscriptions
-- ============================================================================

-- ---------------------------------------------------------------------------
-- pricing_change_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.pricing_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.subscription_plans(id),
    target_system VARCHAR(20) NOT NULL CHECK (target_system IN ('platform', 'simulator', 'both')),
    plan_type VARCHAR(50),
    billing_cycle VARCHAR(20),
    previous_price DECIMAL(10, 2),
    new_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES admin.admin_users(id),
    change_reason TEXT,
    affected_subscribers_count INTEGER,
    previous_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_change_history_plan_id ON admin.pricing_change_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_pricing_change_history_effective_date ON admin.pricing_change_history(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_change_history_target_system ON admin.pricing_change_history(target_system);

COMMENT ON TABLE admin.pricing_change_history IS 'Audit history of subscription plan pricing changes (non-retroactive effective dates)';

ALTER TABLE admin.pricing_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_change_history_select ON admin.pricing_change_history;
CREATE POLICY pricing_change_history_select ON admin.pricing_change_history
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

DROP POLICY IF EXISTS pricing_change_history_insert ON admin.pricing_change_history;
CREATE POLICY pricing_change_history_insert ON admin.pricing_change_history
    FOR INSERT TO authenticated
    WITH CHECK (admin.is_active_admin());

GRANT SELECT, INSERT ON admin.pricing_change_history TO authenticated;
GRANT ALL ON admin.pricing_change_history TO service_role;

-- ---------------------------------------------------------------------------
-- admin.count_active_subscribers_for_plan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.count_active_subscribers_for_plan(
    p_plan_type TEXT,
    p_billing_cycle TEXT DEFAULT NULL,
    p_target_system TEXT DEFAULT 'platform'
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = admin, public, sim
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    IF p_target_system IN ('platform', 'both') THEN
        SELECT COUNT(*)::INTEGER INTO v_count
        FROM public.platform_subscriptions ps
        WHERE ps.status IN ('active', 'trialing', 'past_due')
          AND ps.plan_type = p_plan_type
          AND (p_billing_cycle IS NULL OR ps.billing_cycle = p_billing_cycle);
    END IF;

    IF p_target_system IN ('simulator', 'both') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'sim' AND table_name = 'simulator_subscriptions'
        ) THEN
            v_count := v_count + (
                SELECT COUNT(*)::INTEGER
                FROM sim.simulator_subscriptions ss
                WHERE ss.status IN ('active', 'trialing', 'past_due')
                  AND ss.plan_type = p_plan_type
                  AND (p_billing_cycle IS NULL OR ss.billing_cycle = p_billing_cycle)
            );
        END IF;
    END IF;

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION admin.count_active_subscribers_for_plan IS
  'Returns count of active/trialing subscribers for a plan type (Platform and/or Simulator).';

-- ---------------------------------------------------------------------------
-- admin.record_pricing_change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.record_pricing_change(
    p_plan_id UUID,
    p_target_system TEXT,
    p_new_price DECIMAL(10, 2),
    p_effective_date TIMESTAMPTZ,
    p_admin_user_id UUID,
    p_change_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
    v_plan public.subscription_plans%ROWTYPE;
    v_history_id UUID;
    v_affected INTEGER;
    v_prev JSONB;
BEGIN
    IF NOT admin.check_admin_permission(p_admin_user_id, 'pricing.edit') THEN
        RAISE EXCEPTION 'Permission denied: pricing.edit required';
    END IF;

    SELECT * INTO v_plan
    FROM public.subscription_plans
    WHERE id = p_plan_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Subscription plan not found: %', p_plan_id;
    END IF;

    v_affected := admin.count_active_subscribers_for_plan(
        v_plan.plan_type,
        v_plan.billing_cycle,
        p_target_system
    );

    v_prev := jsonb_build_object(
        'price', v_plan.price,
        'original_price', v_plan.original_price,
        'is_active', v_plan.is_active
    );

    UPDATE public.subscription_plans
    SET price = p_new_price,
        updated_at = NOW()
    WHERE id = p_plan_id;

    INSERT INTO admin.pricing_change_history (
        plan_id,
        target_system,
        plan_type,
        billing_cycle,
        previous_price,
        new_price,
        currency,
        effective_date,
        changed_by,
        change_reason,
        affected_subscribers_count,
        previous_values,
        new_values
    )
    VALUES (
        p_plan_id,
        p_target_system,
        v_plan.plan_type,
        v_plan.billing_cycle,
        v_plan.price,
        p_new_price,
        v_plan.currency,
        p_effective_date,
        p_admin_user_id,
        p_change_reason,
        v_affected,
        v_prev,
        jsonb_build_object('price', p_new_price, 'effective_date', p_effective_date)
    )
    RETURNING id INTO v_history_id;

    PERFORM admin.log_admin_action(
        p_admin_user_id,
        'pricing.update',
        'subscription_plan',
        p_plan_id,
        jsonb_build_object('target_system', p_target_system, 'affected_subscribers', v_affected),
        v_prev,
        jsonb_build_object('price', p_new_price, 'effective_date', p_effective_date)
    );

    RETURN v_history_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- admin.admin_update_subscription_status
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.admin_update_subscription_status(
    p_subscription_id UUID,
    p_target_system TEXT,
    p_new_status TEXT,
    p_admin_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public, sim
AS $$
DECLARE
    v_prev JSONB;
    v_perm TEXT;
BEGIN
    v_perm := CASE
        WHEN p_new_status = 'cancelled' THEN 'subscriptions.cancel'
        ELSE 'subscriptions.edit'
    END;

    IF NOT admin.check_admin_permission(p_admin_user_id, v_perm) THEN
        RAISE EXCEPTION 'Permission denied: % required', v_perm;
    END IF;

    IF p_target_system = 'platform' THEN
        SELECT to_jsonb(ps.*) INTO v_prev
        FROM public.platform_subscriptions ps
        WHERE ps.id = p_subscription_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Platform subscription not found: %', p_subscription_id;
        END IF;

        UPDATE public.platform_subscriptions
        SET status = p_new_status,
            cancellation_reason = COALESCE(p_reason, cancellation_reason),
            cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
            updated_at = NOW()
        WHERE id = p_subscription_id;
    ELSIF p_target_system = 'simulator' THEN
        SELECT to_jsonb(ss.*) INTO v_prev
        FROM sim.simulator_subscriptions ss
        WHERE ss.id = p_subscription_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Simulator subscription not found: %', p_subscription_id;
        END IF;

        UPDATE sim.simulator_subscriptions
        SET status = p_new_status,
            cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END,
            updated_at = NOW()
        WHERE id = p_subscription_id;
    ELSE
        RAISE EXCEPTION 'Invalid target_system: %', p_target_system;
    END IF;

    PERFORM admin.log_admin_action(
        p_admin_user_id,
        'subscription.update',
        'subscription',
        p_subscription_id,
        jsonb_build_object('target_system', p_target_system, 'reason', p_reason),
        v_prev,
        jsonb_build_object('status', p_new_status)
    );

    RETURN TRUE;
END;
$$;

-- ---------------------------------------------------------------------------
-- admin.admin_extend_subscription_trial
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.admin_extend_subscription_trial(
    p_subscription_id UUID,
    p_target_system TEXT,
    p_extension_days INTEGER,
    p_admin_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public, sim
AS $$
DECLARE
    v_new_trial_end TIMESTAMPTZ;
    v_prev JSONB;
BEGIN
    IF NOT admin.check_admin_permission(p_admin_user_id, 'subscriptions.edit') THEN
        RAISE EXCEPTION 'Permission denied: subscriptions.edit required';
    END IF;

    IF p_extension_days IS NULL OR p_extension_days <= 0 THEN
        RAISE EXCEPTION 'extension_days must be a positive integer';
    END IF;

    IF p_target_system = 'platform' THEN
        SELECT to_jsonb(ps.*) INTO v_prev
        FROM public.platform_subscriptions ps
        WHERE ps.id = p_subscription_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Platform subscription not found: %', p_subscription_id;
        END IF;

        v_new_trial_end := COALESCE(
            (SELECT trial_end FROM public.platform_subscriptions WHERE id = p_subscription_id),
            NOW()
        ) + (p_extension_days || ' days')::INTERVAL;

        UPDATE public.platform_subscriptions
        SET trial_end = v_new_trial_end,
            expires_at = GREATEST(COALESCE(expires_at, v_new_trial_end), v_new_trial_end),
            is_trial = TRUE,
            status = CASE WHEN status = 'expired' THEN 'trialing' ELSE status END,
            updated_at = NOW()
        WHERE id = p_subscription_id;
    ELSIF p_target_system = 'simulator' THEN
        SELECT to_jsonb(ss.*) INTO v_prev
        FROM sim.simulator_subscriptions ss
        WHERE ss.id = p_subscription_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Simulator subscription not found: %', p_subscription_id;
        END IF;

        v_new_trial_end := COALESCE(
            (SELECT expires_at FROM sim.simulator_subscriptions WHERE id = p_subscription_id),
            NOW()
        ) + (p_extension_days || ' days')::INTERVAL;

        UPDATE sim.simulator_subscriptions
        SET expires_at = v_new_trial_end,
            status = CASE WHEN status IN ('expired', 'cancelled') THEN 'trialing' ELSE status END,
            updated_at = NOW()
        WHERE id = p_subscription_id;
    ELSE
        RAISE EXCEPTION 'Invalid target_system: %', p_target_system;
    END IF;

    PERFORM admin.log_admin_action(
        p_admin_user_id,
        'subscription.extend_trial',
        'subscription',
        p_subscription_id,
        jsonb_build_object(
            'target_system', p_target_system,
            'extension_days', p_extension_days,
            'reason', p_reason
        ),
        v_prev,
        jsonb_build_object('trial_end', v_new_trial_end)
    );

    RETURN v_new_trial_end;
END;
$$;

-- ---------------------------------------------------------------------------
-- admin.get_subscription_admin_summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.get_subscription_admin_summary(p_target_system TEXT DEFAULT 'platform')
RETURNS TABLE (
    total_active BIGINT,
    total_trialing BIGINT,
    total_cancelled BIGINT,
    total_expired BIGINT,
    mrr_estimate NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = admin, public, sim
AS $$
BEGIN
    IF p_target_system = 'platform' THEN
        RETURN QUERY
        SELECT
            COUNT(*) FILTER (WHERE ps.status = 'active') AS total_active,
            COUNT(*) FILTER (WHERE ps.status = 'trialing') AS total_trialing,
            COUNT(*) FILTER (WHERE ps.status = 'cancelled') AS total_cancelled,
            COUNT(*) FILTER (WHERE ps.status = 'expired') AS total_expired,
            COALESCE(SUM(ps.amount_paid) FILTER (
                WHERE ps.status IN ('active', 'trialing')
                  AND ps.billing_cycle = 'monthly'
            ), 0) AS mrr_estimate
        FROM public.platform_subscriptions ps;
    ELSIF p_target_system = 'simulator' THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'sim' AND table_name = 'simulator_subscriptions'
        ) THEN
            RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::NUMERIC;
            RETURN;
        END IF;

        RETURN QUERY
        SELECT
            COUNT(*) FILTER (WHERE ss.status = 'active') AS total_active,
            COUNT(*) FILTER (WHERE ss.status = 'trialing') AS total_trialing,
            COUNT(*) FILTER (WHERE ss.status = 'cancelled') AS total_cancelled,
            COUNT(*) FILTER (WHERE ss.status = 'expired') AS total_expired,
            COALESCE(SUM(ss.amount_paid) FILTER (
                WHERE ss.status IN ('active', 'trialing')
                  AND ss.billing_cycle = 'monthly'
            ), 0) AS mrr_estimate
        FROM sim.simulator_subscriptions ss;
    ELSE
        RAISE EXCEPTION 'Invalid target_system: %', p_target_system;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin.count_active_subscribers_for_plan TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.record_pricing_change TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.admin_update_subscription_status TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.admin_extend_subscription_trial TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.get_subscription_admin_summary TO authenticated, service_role;

INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
    ('pricing_change_history', 'Audit history of subscription plan pricing changes', 'admin', TRUE, TRUE, 'admin')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    schema_name = EXCLUDED.schema_name,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
