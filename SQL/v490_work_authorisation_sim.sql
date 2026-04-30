-- ============================================================================
-- v490 — Work Authorisation System (Simulator / sim schema)
-- PostgreSQL 15+ (Supabase)
-- Parity with v489 for practice projects
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.work_authorisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
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
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_work_authorisations_ref
    ON sim.work_authorisations(reference_code);
CREATE INDEX IF NOT EXISTS idx_sim_work_authorisations_pp
    ON sim.work_authorisations(practice_project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS sim.work_authorisation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_authorisation_id UUID NOT NULL REFERENCES sim.work_authorisations(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS sim.work_authorisation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_authorisation_id UUID NOT NULL REFERENCES sim.work_authorisations(id) ON DELETE CASCADE,
    from_status VARCHAR(40),
    to_status VARCHAR(40) NOT NULL,
    action VARCHAR(80) NOT NULL,
    actor_user_id UUID REFERENCES public.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION sim.work_authorisations_set_reference_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_code IS NULL OR NEW.reference_code = '' THEN
        NEW.reference_code := 'SWA-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' || UPPER(SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 10));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sim_work_authorisations_reference ON sim.work_authorisations;
CREATE TRIGGER trg_sim_work_authorisations_reference
    BEFORE INSERT ON sim.work_authorisations
    FOR EACH ROW
    EXECUTE FUNCTION sim.work_authorisations_set_reference_code();

CREATE OR REPLACE FUNCTION sim.sim_work_authorisation_practice_access(p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, sim
AS $$
    SELECT
        EXISTS (
            SELECT 1 FROM sim.practice_projects pp
            WHERE pp.id = p_practice_project_id
              AND pp.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM sim.practice_project_memberships m
            WHERE m.practice_project_id = p_practice_project_id
              AND m.user_id = auth.uid()
              AND COALESCE(m.is_active, TRUE) = TRUE
        );
$$;

GRANT EXECUTE ON FUNCTION sim.sim_work_authorisation_practice_access(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION sim.work_authorisation_has_approved_action(
    p_practice_project_id UUID,
    p_action_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, sim
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM sim.work_authorisations wa
        WHERE wa.practice_project_id = p_practice_project_id
          AND wa.action_type = p_action_type
          AND wa.is_deleted = FALSE
          AND wa.status IN ('approved', 'executed', 'closed')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION sim.work_authorisation_has_approved_action(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION sim.sim_wa_can_request(p_auth UUID, p_practice_project_id UUID, p_requested_by UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
    v_uid UUID;
BEGIN
    SELECT id INTO v_uid FROM public.users WHERE auth_user_id = p_auth LIMIT 1;
    IF v_uid IS NULL THEN RETURN FALSE; END IF;
    IF v_uid <> p_requested_by THEN RETURN FALSE; END IF;
    RETURN sim.sim_work_authorisation_practice_access(p_practice_project_id);
END;
$$;

CREATE OR REPLACE FUNCTION sim.sim_wa_can_approve(p_auth UUID, p_practice_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, sim
AS $$
BEGIN
    RETURN sim.sim_work_authorisation_practice_access(p_practice_project_id);
END;
$$;

CREATE OR REPLACE FUNCTION sim.work_authorisation_transition(
    p_work_authorisation_id UUID,
    p_action TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
    v_auth UUID := auth.uid();
    v_user_id UUID;
    v_row sim.work_authorisations%ROWTYPE;
    v_new_status VARCHAR(40);
BEGIN
    IF v_auth IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = v_auth LIMIT 1;
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    SELECT * INTO v_row FROM sim.work_authorisations
    WHERE id = p_work_authorisation_id AND is_deleted = FALSE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Work authorisation not found');
    END IF;

    v_new_status := v_row.status;

    CASE lower(trim(p_action))
        WHEN 'submit' THEN
            IF v_row.status NOT IN ('draft', 'deferred') THEN
                RETURN jsonb_build_object('success', false, 'error', 'Invalid submit from status ' || v_row.status);
            END IF;
            IF NOT sim.sim_wa_can_request(v_auth, v_row.practice_project_id, v_row.requested_by) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: request');
            END IF;
            v_new_status := 'in_review';

        WHEN 'resubmit' THEN
            IF v_row.status <> 'deferred' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Invalid resubmit');
            END IF;
            IF NOT sim.sim_wa_can_request(v_auth, v_row.practice_project_id, v_row.requested_by) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: request');
            END IF;
            v_new_status := 'in_review';

        WHEN 'approve' THEN
            IF v_row.status <> 'in_review' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Approve only from in_review');
            END IF;
            IF NOT sim.sim_wa_can_approve(v_auth, v_row.practice_project_id) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: approve');
            END IF;
            v_new_status := 'approved';

        WHEN 'reject' THEN
            IF v_row.status <> 'in_review' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Reject only from in_review');
            END IF;
            IF NOT sim.sim_wa_can_approve(v_auth, v_row.practice_project_id) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: approve');
            END IF;
            v_new_status := 'rejected';

        WHEN 'defer' THEN
            IF v_row.status <> 'in_review' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Defer only from in_review');
            END IF;
            IF NOT sim.sim_wa_can_approve(v_auth, v_row.practice_project_id) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: approve');
            END IF;
            v_new_status := 'deferred';

        WHEN 'suspend' THEN
            IF v_row.status IN ('rejected', 'closed', 'cancelled') THEN
                RETURN jsonb_build_object('success', false, 'error', 'Cannot suspend terminal status');
            END IF;
            IF NOT sim.sim_wa_can_approve(v_auth, v_row.practice_project_id) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: suspend');
            END IF;
            UPDATE sim.work_authorisations SET
                status = 'suspended',
                suspended_from_status = v_row.status,
                updated_at = NOW(),
                updated_by = v_user_id
            WHERE id = v_row.id;
            INSERT INTO sim.work_authorisation_history (work_authorisation_id, from_status, to_status, action, actor_user_id, notes)
            VALUES (v_row.id, v_row.status, 'suspended', 'suspend', v_user_id, p_notes);
            RETURN jsonb_build_object('success', true, 'id', v_row.id, 'status', 'suspended');

        WHEN 'resume' THEN
            IF v_row.status <> 'suspended' OR v_row.suspended_from_status IS NULL THEN
                RETURN jsonb_build_object('success', false, 'error', 'Resume only from suspended');
            END IF;
            IF NOT sim.sim_wa_can_approve(v_auth, v_row.practice_project_id) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: resume');
            END IF;
            v_new_status := v_row.suspended_from_status;
            UPDATE sim.work_authorisations SET
                status = v_new_status,
                suspended_from_status = NULL,
                updated_at = NOW(),
                updated_by = v_user_id
            WHERE id = v_row.id;
            INSERT INTO sim.work_authorisation_history (work_authorisation_id, from_status, to_status, action, actor_user_id, notes)
            VALUES (v_row.id, 'suspended', v_new_status, 'resume', v_user_id, p_notes);
            RETURN jsonb_build_object('success', true, 'id', v_row.id, 'status', v_new_status);

        WHEN 'execute' THEN
            IF v_row.status <> 'approved' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Execute only from approved');
            END IF;
            IF NOT sim.sim_wa_can_request(v_auth, v_row.practice_project_id, v_row.requested_by) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: execute');
            END IF;
            v_new_status := 'executed';

        WHEN 'close' THEN
            IF v_row.status <> 'executed' THEN
                RETURN jsonb_build_object('success', false, 'error', 'Close only from executed');
            END IF;
            IF NOT sim.sim_wa_can_request(v_auth, v_row.practice_project_id, v_row.requested_by) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: close');
            END IF;
            v_new_status := 'closed';

        WHEN 'cancel' THEN
            IF v_row.status NOT IN ('draft', 'in_review', 'deferred', 'approved') THEN
                RETURN jsonb_build_object('success', false, 'error', 'Cancel not allowed');
            END IF;
            IF v_row.requested_by <> v_user_id THEN
                RETURN jsonb_build_object('success', false, 'error', 'Only requestor can cancel');
            END IF;
            IF NOT sim.sim_wa_can_request(v_auth, v_row.practice_project_id, v_row.requested_by) THEN
                RETURN jsonb_build_object('success', false, 'error', 'Permission denied: cancel');
            END IF;
            v_new_status := 'cancelled';

        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Unknown action: ' || p_action);
    END CASE;

    IF lower(trim(p_action)) IN ('suspend', 'resume') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Internal flow error');
    END IF;

    UPDATE sim.work_authorisations SET
        status = v_new_status,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_row.id;

    INSERT INTO sim.work_authorisation_history (work_authorisation_id, from_status, to_status, action, actor_user_id, notes)
    VALUES (v_row.id, v_row.status, v_new_status, p_action, v_user_id, p_notes);

    RETURN jsonb_build_object('success', true, 'id', v_row.id, 'status', v_new_status);
END;
$$;

COMMENT ON FUNCTION sim.work_authorisation_transition(UUID, TEXT, TEXT) IS 'v490: Simulator work authorisation transitions.';

GRANT EXECUTE ON FUNCTION sim.work_authorisation_transition(UUID, TEXT, TEXT) TO authenticated;

ALTER TABLE sim.work_authorisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.work_authorisation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.work_authorisation_history ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.work_authorisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.work_authorisation_steps TO authenticated;
GRANT SELECT, INSERT ON sim.work_authorisation_history TO authenticated;
GRANT ALL ON sim.work_authorisations TO service_role;
GRANT ALL ON sim.work_authorisation_steps TO service_role;
GRANT ALL ON sim.work_authorisation_history TO service_role;

DROP POLICY IF EXISTS policy_sim_work_authorisations_select ON sim.work_authorisations;
CREATE POLICY policy_sim_work_authorisations_select
    ON sim.work_authorisations FOR SELECT TO authenticated
    USING (
        is_deleted = FALSE
        AND sim.sim_work_authorisation_practice_access(practice_project_id)
    );

DROP POLICY IF EXISTS policy_sim_work_authorisations_insert ON sim.work_authorisations;
CREATE POLICY policy_sim_work_authorisations_insert
    ON sim.work_authorisations FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND requested_by = (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1)
        AND sim.sim_work_authorisation_practice_access(practice_project_id)
    );

DROP POLICY IF EXISTS policy_sim_work_authorisations_update ON sim.work_authorisations;
CREATE POLICY policy_sim_work_authorisations_update
    ON sim.work_authorisations FOR UPDATE TO authenticated
    USING (
        is_deleted = FALSE
        AND sim.sim_work_authorisation_practice_access(practice_project_id)
    )
    WITH CHECK (
        is_deleted = FALSE
        AND sim.sim_work_authorisation_practice_access(practice_project_id)
    );

DROP POLICY IF EXISTS policy_sim_work_auth_steps_all ON sim.work_authorisation_steps;
CREATE POLICY policy_sim_work_auth_steps_all
    ON sim.work_authorisation_steps FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.work_authorisations wa
            WHERE wa.id = work_authorisation_steps.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND sim.sim_work_authorisation_practice_access(wa.practice_project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.work_authorisations wa
            WHERE wa.id = work_authorisation_steps.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND sim.sim_work_authorisation_practice_access(wa.practice_project_id)
        )
    );

DROP POLICY IF EXISTS policy_sim_work_auth_history_select ON sim.work_authorisation_history;
CREATE POLICY policy_sim_work_auth_history_select
    ON sim.work_authorisation_history FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.work_authorisations wa
            WHERE wa.id = work_authorisation_history.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND sim.sim_work_authorisation_practice_access(wa.practice_project_id)
        )
    );

DROP POLICY IF EXISTS policy_sim_work_auth_history_insert ON sim.work_authorisation_history;
CREATE POLICY policy_sim_work_auth_history_insert
    ON sim.work_authorisation_history FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.work_authorisations wa
            WHERE wa.id = work_authorisation_history.work_authorisation_id
              AND wa.is_deleted = FALSE
              AND sim.sim_work_authorisation_practice_access(wa.practice_project_id)
        )
    );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
    ('sim.work_authorisations', 'Practice work authorisation requests and decisions (simulator)', false, true, 'simulation'),
    ('sim.work_authorisation_steps', 'Multi-step approval rows for simulator work authorisations', false, true, 'simulation'),
    ('sim.work_authorisation_history', 'Audit trail for simulator work authorisations', true, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
