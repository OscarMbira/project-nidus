-- ============================================================================
-- v489 — Work Authorisation System (Platform / public schema)
-- PostgreSQL 15+ (Supabase)
-- Tables: work_authorisations, work_authorisation_steps, work_authorisation_history
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.work_authorisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    reference_code VARCHAR(64) NOT NULL DEFAULT '',
    action_type VARCHAR(120) NOT NULL,
    target_entity_type VARCHAR(120),
    target_entity_id UUID,
    title TEXT NOT NULL,
    rationale TEXT,
    risk_impact_summary TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    status VARCHAR(40) NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'in_review', 'approved', 'rejected', 'deferred',
            'suspended', 'executed', 'closed', 'cancelled'
        )),
    suspended_from_status VARCHAR(40),
    current_step_order INTEGER NOT NULL DEFAULT 1,
    requested_by UUID NOT NULL REFERENCES public.users(id),
    primary_approver_user_id UUID REFERENCES public.users(id),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_work_authorisations_reference_code
    ON public.work_authorisations(reference_code);
CREATE INDEX IF NOT EXISTS idx_work_authorisations_project_id
    ON public.work_authorisations(project_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_authorisations_status
    ON public.work_authorisations(status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_work_authorisations_requested_by
    ON public.work_authorisations(requested_by) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.work_authorisation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_authorisation_id UUID NOT NULL REFERENCES public.work_authorisations(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_label VARCHAR(200),
    approver_user_id UUID REFERENCES public.users(id),
    approver_role_hint VARCHAR(120),
    step_status VARCHAR(40) NOT NULL DEFAULT 'pending'
        CHECK (step_status IN ('pending', 'approved', 'rejected', 'skipped', 'deferred')),
    decided_by UUID REFERENCES public.users(id),
    decided_at TIMESTAMPTZ,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (work_authorisation_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_work_auth_steps_wa_id
    ON public.work_authorisation_steps(work_authorisation_id);

CREATE TABLE IF NOT EXISTS public.work_authorisation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_authorisation_id UUID NOT NULL REFERENCES public.work_authorisations(id) ON DELETE CASCADE,
    from_status VARCHAR(40),
    to_status VARCHAR(40) NOT NULL,
    action VARCHAR(80) NOT NULL,
    actor_user_id UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_auth_history_wa_id
    ON public.work_authorisation_history(work_authorisation_id);
CREATE INDEX IF NOT EXISTS idx_work_auth_history_created
    ON public.work_authorisation_history(created_at DESC);

-- -----------------------------------------------------------------------------
-- 2. reference_code generation
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.work_authorisations_set_reference_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
        NEW.reference_code := 'WA-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 10));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_authorisations_reference ON public.work_authorisations;
CREATE TRIGGER trg_work_authorisations_reference
    BEFORE INSERT ON public.work_authorisations
    FOR EACH ROW
    EXECUTE FUNCTION public.work_authorisations_set_reference_code();

-- -----------------------------------------------------------------------------
-- 3. Helper: project visibility (shared by RLS policies)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.work_authorisation_user_can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            JOIN public.users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin')
              AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM public.user_projects up
            JOIN public.users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = p_project_id
              AND COALESCE(up.is_deleted, FALSE) = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM public.projects p
            INNER JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, FALSE) = FALSE
            WHERE p.id = p_project_id AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND a.owner_user_id = get_user_id_from_auth(auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = p_project_id AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            JOIN public.users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = p_project_id
              AND pm.is_active = TRUE
        );
$$;

GRANT EXECUTE ON FUNCTION public.work_authorisation_user_can_access_project(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 4. Helper: approved action gate (for lifecycle embedding)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.work_authorisation_has_approved_action(
    p_project_id UUID,
    p_action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.work_authorisations wa
        WHERE wa.project_id = p_project_id
          AND wa.action_type = p_action_type
          AND wa.is_deleted = FALSE
          AND wa.status IN ('approved', 'executed', 'closed')
    );
END;
$$;

COMMENT ON FUNCTION public.work_authorisation_has_approved_action(UUID, TEXT)
    IS 'Returns true if an approved/executed/closed work authorisation exists for project + action_type.';

-- -----------------------------------------------------------------------------
-- 5. Transition RPC (single entry — plan: submit, approve, reject, defer, suspend, resume, cancel, execute, close, resubmit)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.work_authorisation_transition(
    p_work_authorisation_id UUID,
    p_action TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth UUID := auth.uid();
    v_user_id UUID;
    v_row public.work_authorisations%ROWTYPE;
    v_new_status VARCHAR(40);
    v_perm TEXT;
BEGIN
    IF v_auth IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = v_auth LIMIT 1;
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    SELECT * INTO v_row FROM public.work_authorisations
    WHERE id = p_work_authorisation_id AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Work authorisation not found');
    END IF;

    v_new_status := v_row.status;

    CASE lower(trim(p_action))
        WHEN 'submit' THEN
            v_perm := 'work_authorisation.request';
            IF v_row.status NOT IN ('draft', 'deferred') THEN
                RETURN jsonb_build_object('success', false, 'error', 'Invalid submit from status ' || v_row.status);
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'in_review';

        WHEN 'resubmit' THEN
            v_perm := 'work_authorisation.request';
            IF v_row.status <> 'deferred' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Invalid resubmit from status ' || v_row.status);
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'in_review';

        WHEN 'approve' THEN
            v_perm := 'work_authorisation.approve';
            IF v_row.status <> 'in_review' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Approve only from in_review');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'approved';

        WHEN 'reject' THEN
            v_perm := 'work_authorisation.approve';
            IF v_row.status <> 'in_review' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Reject only from in_review');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'rejected';

        WHEN 'defer' THEN
            v_perm := 'work_authorisation.approve';
            IF v_row.status <> 'in_review' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Defer only from in_review');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'deferred';

        WHEN 'suspend' THEN
            v_perm := 'work_authorisation.suspend';
            IF v_row.status IN ('rejected', 'closed', 'cancelled') THEN
                RETURN jsonb_build_object('success', false, 'error', 'Cannot suspend terminal status');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            UPDATE public.work_authorisations SET
                status = 'suspended',
                suspended_from_status = v_row.status,
                updated_at = NOW(),
                updated_by = v_user_id
            WHERE id = v_row.id;
            INSERT INTO public.work_authorisation_history (work_authorisation_id, from_status, to_status, action, actor_user_id, notes)
            VALUES (v_row.id, v_row.status, 'suspended', 'suspend', v_user_id, p_notes);
            RETURN jsonb_build_object('success', true, 'id', v_row.id, 'status', 'suspended');

        WHEN 'resume' THEN
            v_perm := 'work_authorisation.suspend';
            IF v_row.status <> 'suspended' OR v_row.suspended_from_status IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Resume only from suspended with prior status');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := v_row.suspended_from_status;
            UPDATE public.work_authorisations SET
                status = v_new_status,
                suspended_from_status = NULL,
                updated_at = NOW(),
                updated_by = v_user_id
            WHERE id = v_row.id;
            INSERT INTO public.work_authorisation_history (work_authorisation_id, from_status, to_status, action, actor_user_id, notes)
            VALUES (v_row.id, 'suspended', v_new_status, 'resume', v_user_id, p_notes);
            RETURN jsonb_build_object('success', true, 'id', v_row.id, 'status', v_new_status);

        WHEN 'execute' THEN
            v_perm := 'work_authorisation.request';
            IF v_row.status <> 'approved' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Execute only from approved');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'executed';

        WHEN 'close' THEN
            v_perm := 'work_authorisation.request';
            IF v_row.status <> 'executed' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Close only from executed');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'closed';

        WHEN 'cancel' THEN
            v_perm := 'work_authorisation.request';
            IF v_row.status NOT IN ('draft', 'in_review', 'deferred', 'approved') THEN
                RETURN jsonb_build_object('success', false, 'error', 'Cancel not allowed from ' || v_row.status);
            END IF;
            IF v_row.requested_by <> v_user_id THEN
                RETURN jsonb_build_object('success', false, 'error', 'Only requestor can cancel');
            END IF;
            IF NOT has_project_permission(v_auth, v_row.project_id, v_perm) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: ' || v_perm);
            END IF;
            v_new_status := 'cancelled';

        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Unknown action: ' || p_action);
    END CASE;

    IF lower(trim(p_action)) IN ('suspend', 'resume') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Internal flow error');
    END IF;

    UPDATE public.work_authorisations SET
        status = v_new_status,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_row.id;

    INSERT INTO public.work_authorisation_history (work_authorisation_id, from_status, to_status, action, actor_user_id, notes)
    VALUES (v_row.id, v_row.status, v_new_status, p_action, v_user_id, p_notes);

    RETURN jsonb_build_object('success', true, 'id', v_row.id, 'status', v_new_status);
END;
$$;

COMMENT ON FUNCTION public.work_authorisation_transition(UUID, TEXT, TEXT)
    IS 'v489: Applies a valid status transition with permission checks.';

GRANT EXECUTE ON FUNCTION public.work_authorisation_transition(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.work_authorisation_has_approved_action(UUID, TEXT) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.work_authorisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_authorisation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_authorisation_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_authorisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_authorisation_steps TO authenticated;
GRANT SELECT, INSERT ON public.work_authorisation_history TO authenticated;
GRANT ALL ON public.work_authorisations TO service_role;
GRANT ALL ON public.work_authorisation_steps TO service_role;
GRANT ALL ON public.work_authorisation_history TO service_role;

DROP POLICY IF EXISTS policy_work_authorisations_select ON public.work_authorisations;
CREATE POLICY policy_work_authorisations_select
    ON public.work_authorisations FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE
        AND public.work_authorisation_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS policy_work_authorisations_insert ON public.work_authorisations;
CREATE POLICY policy_work_authorisations_insert
    ON public.work_authorisations FOR INSERT TO authenticated
    WITH CHECK (
        requested_by = get_user_id_from_auth(auth.uid())
        AND public.work_authorisation_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS policy_work_authorisations_update ON public.work_authorisations;
CREATE POLICY policy_work_authorisations_update
    ON public.work_authorisations FOR UPDATE TO authenticated
    USING (
        is_deleted = FALSE
        AND public.work_authorisation_user_can_access_project(project_id)
    )
    WITH CHECK (
        is_deleted = FALSE
        AND public.work_authorisation_user_can_access_project(project_id)
    );

DROP POLICY IF EXISTS policy_work_auth_steps_all ON public.work_authorisation_steps;
CREATE POLICY policy_work_auth_steps_all
    ON public.work_authorisation_steps FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.work_authorisations wa
            WHERE wa.id = work_authorisation_steps.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND public.work_authorisation_user_can_access_project(wa.project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.work_authorisations wa
            WHERE wa.id = work_authorisation_steps.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND public.work_authorisation_user_can_access_project(wa.project_id)
        )
    );

DROP POLICY IF EXISTS policy_work_auth_history_select ON public.work_authorisation_history;
CREATE POLICY policy_work_auth_history_select
    ON public.work_authorisation_history FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.work_authorisations wa
            WHERE wa.id = work_authorisation_history.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND public.work_authorisation_user_can_access_project(wa.project_id)
        )
    );

DROP POLICY IF EXISTS policy_work_auth_history_insert ON public.work_authorisation_history;
CREATE POLICY policy_work_auth_history_insert
    ON public.work_authorisation_history FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.work_authorisations wa
            WHERE wa.id = work_authorisation_history.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND public.work_authorisation_user_can_access_project(wa.project_id)
        )
    );

-- -----------------------------------------------------------------------------
-- 7. Registry
-- -----------------------------------------------------------------------------

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('work_authorisations', 'Governed work authorisation requests and decisions for project lifecycle actions', false, true),
    ('work_authorisation_steps', 'Optional multi-step approval rows for a work authorisation', false, true),
    ('work_authorisation_history', 'Audit trail of work authorisation status changes', true, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();
