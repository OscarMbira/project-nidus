-- =============================================================================
-- v812: Downstream tier (Portfolio/Programme/Project) scoping for form template
-- field overrides and org-added fields.
-- Plan: projectplan/v808_form_template_org_required_field_override_plan.md (Phase 5)
-- Prerequisites: v810 (form_template_field_overrides.is_required, form_template_field_additions)
--
-- Scope columns are NOT NULL with a sentinel: scope_entity_type = 'account' (default) with
-- scope_entity_id = the row's own organisation_id represents the org-wide default layer;
-- a tier value ('portfolio'/'programme'/'project') + that entity's real id represents that
-- specific entity's own policy layer. Deliberately NOT nullable — Postgres NULLs are never
-- equal in a plain UNIQUE constraint, which would otherwise let duplicate org-wide rows slip
-- in once these columns exist, and Supabase's upsert(onConflict:'col,col,...') requires a
-- plain (non-expression, non-partial) unique constraint to target — a COALESCE-based unique
-- index (the v764 pm_template_nodes technique) does not satisfy that.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- form_template_field_overrides
-- -----------------------------------------------------------------------------
ALTER TABLE public.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS scope_entity_type TEXT NOT NULL DEFAULT 'account',
    ADD COLUMN IF NOT EXISTS scope_entity_id UUID NULL;

UPDATE public.form_template_field_overrides
    SET scope_entity_id = organisation_id
    WHERE scope_entity_id IS NULL;

ALTER TABLE public.form_template_field_overrides
    ALTER COLUMN scope_entity_id SET NOT NULL;

ALTER TABLE public.form_template_field_overrides DROP CONSTRAINT IF EXISTS chk_form_template_field_overrides_scope_type;
ALTER TABLE public.form_template_field_overrides ADD CONSTRAINT chk_form_template_field_overrides_scope_type CHECK (
    scope_entity_type IN ('account', 'portfolio', 'programme', 'project')
);

ALTER TABLE public.form_template_field_overrides DROP CONSTRAINT IF EXISTS form_template_field_overrides_organisation_id_template_id_se_key;
ALTER TABLE public.form_template_field_overrides DROP CONSTRAINT IF EXISTS form_template_field_overrides_organisation_id_template_id_section_key_field_key_key;
ALTER TABLE public.form_template_field_overrides ADD CONSTRAINT uq_form_template_field_overrides_scope
    UNIQUE (organisation_id, template_id, section_key, field_key, scope_entity_type, scope_entity_id);

CREATE INDEX IF NOT EXISTS idx_form_template_field_overrides_scope
    ON public.form_template_field_overrides (scope_entity_type, scope_entity_id)
    WHERE scope_entity_type <> 'account';

ALTER TABLE sim.form_template_field_overrides
    ADD COLUMN IF NOT EXISTS scope_entity_type TEXT NOT NULL DEFAULT 'account',
    ADD COLUMN IF NOT EXISTS scope_entity_id UUID NULL;

UPDATE sim.form_template_field_overrides
    SET scope_entity_id = organisation_id
    WHERE scope_entity_id IS NULL;

ALTER TABLE sim.form_template_field_overrides
    ALTER COLUMN scope_entity_id SET NOT NULL;

ALTER TABLE sim.form_template_field_overrides DROP CONSTRAINT IF EXISTS chk_sim_form_template_field_overrides_scope_type;
ALTER TABLE sim.form_template_field_overrides ADD CONSTRAINT chk_sim_form_template_field_overrides_scope_type CHECK (
    scope_entity_type IN ('account', 'portfolio', 'programme', 'project')
);

ALTER TABLE sim.form_template_field_overrides DROP CONSTRAINT IF EXISTS form_template_field_overrides_organisation_id_template_id_se_key;
ALTER TABLE sim.form_template_field_overrides DROP CONSTRAINT IF EXISTS form_template_field_overrides_organisation_id_template_id_section_key_field_key_key;
ALTER TABLE sim.form_template_field_overrides ADD CONSTRAINT uq_sim_form_template_field_overrides_scope
    UNIQUE (organisation_id, template_id, section_key, field_key, scope_entity_type, scope_entity_id);

CREATE INDEX IF NOT EXISTS idx_sim_form_template_field_overrides_scope
    ON sim.form_template_field_overrides (scope_entity_type, scope_entity_id)
    WHERE scope_entity_type <> 'account';

-- -----------------------------------------------------------------------------
-- form_template_field_additions
-- -----------------------------------------------------------------------------
ALTER TABLE public.form_template_field_additions
    ADD COLUMN IF NOT EXISTS scope_entity_type TEXT NOT NULL DEFAULT 'account',
    ADD COLUMN IF NOT EXISTS scope_entity_id UUID NULL;

UPDATE public.form_template_field_additions
    SET scope_entity_id = organisation_id
    WHERE scope_entity_id IS NULL;

ALTER TABLE public.form_template_field_additions
    ALTER COLUMN scope_entity_id SET NOT NULL;

ALTER TABLE public.form_template_field_additions DROP CONSTRAINT IF EXISTS chk_form_template_field_additions_scope_type;
ALTER TABLE public.form_template_field_additions ADD CONSTRAINT chk_form_template_field_additions_scope_type CHECK (
    scope_entity_type IN ('account', 'portfolio', 'programme', 'project')
);

ALTER TABLE public.form_template_field_additions DROP CONSTRAINT IF EXISTS form_template_field_additions_organisation_id_template_id_se_key;
ALTER TABLE public.form_template_field_additions DROP CONSTRAINT IF EXISTS form_template_field_additions_organisation_id_template_id_section_key_field_key_key;
ALTER TABLE public.form_template_field_additions ADD CONSTRAINT uq_form_template_field_additions_scope
    UNIQUE (organisation_id, template_id, section_key, field_key, scope_entity_type, scope_entity_id);

CREATE INDEX IF NOT EXISTS idx_form_template_field_additions_scope
    ON public.form_template_field_additions (scope_entity_type, scope_entity_id)
    WHERE scope_entity_type <> 'account';

ALTER TABLE sim.form_template_field_additions
    ADD COLUMN IF NOT EXISTS scope_entity_type TEXT NOT NULL DEFAULT 'account',
    ADD COLUMN IF NOT EXISTS scope_entity_id UUID NULL;

UPDATE sim.form_template_field_additions
    SET scope_entity_id = organisation_id
    WHERE scope_entity_id IS NULL;

ALTER TABLE sim.form_template_field_additions
    ALTER COLUMN scope_entity_id SET NOT NULL;

ALTER TABLE sim.form_template_field_additions DROP CONSTRAINT IF EXISTS chk_sim_form_template_field_additions_scope_type;
ALTER TABLE sim.form_template_field_additions ADD CONSTRAINT chk_sim_form_template_field_additions_scope_type CHECK (
    scope_entity_type IN ('account', 'portfolio', 'programme', 'project')
);

ALTER TABLE sim.form_template_field_additions DROP CONSTRAINT IF EXISTS form_template_field_additions_organisation_id_template_id_se_key;
ALTER TABLE sim.form_template_field_additions DROP CONSTRAINT IF EXISTS form_template_field_additions_organisation_id_template_id_section_key_field_key_key;
ALTER TABLE sim.form_template_field_additions ADD CONSTRAINT uq_sim_form_template_field_additions_scope
    UNIQUE (organisation_id, template_id, section_key, field_key, scope_entity_type, scope_entity_id);

CREATE INDEX IF NOT EXISTS idx_sim_form_template_field_additions_scope
    ON sim.form_template_field_additions (scope_entity_type, scope_entity_id)
    WHERE scope_entity_type <> 'account';

-- -----------------------------------------------------------------------------
-- RLS: extend PMO-admin write policies to also allow the matching tier manager
-- (portfolio_manager_user_id / programme_manager_user_id / project_manager_user_id)
-- to write their own entity-scoped rows — mirrors can_manage_pm_template_node (v764b).
-- For scope_entity_type = 'account' rows, can_manage_pm_template_node's p_tier argument
-- won't match 'portfolio'/'programme'/'project', so only is_user_pmo_admin can write them —
-- i.e. the org-wide default layer keeps exactly its pre-v812 PMO-only write behaviour.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_form_template_field_overrides_pmo_write ON public.form_template_field_overrides;
CREATE POLICY policy_form_template_field_overrides_pmo_write
    ON public.form_template_field_overrides
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    );

DROP POLICY IF EXISTS policy_sim_form_template_field_overrides_pmo_write ON sim.form_template_field_overrides;
CREATE POLICY policy_sim_form_template_field_overrides_pmo_write
    ON sim.form_template_field_overrides
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR sim.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR sim.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    );

DROP POLICY IF EXISTS policy_form_template_field_additions_pmo_write ON public.form_template_field_additions;
CREATE POLICY policy_form_template_field_additions_pmo_write
    ON public.form_template_field_additions
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR public.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    );

DROP POLICY IF EXISTS policy_sim_form_template_field_additions_pmo_write ON sim.form_template_field_additions;
CREATE POLICY policy_sim_form_template_field_additions_pmo_write
    ON sim.form_template_field_additions
    FOR ALL
    TO authenticated
    USING (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR sim.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(organisation_id)
        AND (
            public.is_user_pmo_admin(auth.uid())
            OR sim.can_manage_pm_template_node(organisation_id, scope_entity_type, scope_entity_type, scope_entity_id, FALSE)
        )
    );

DO $$
BEGIN
  RAISE NOTICE 'v812_form_template_field_tier_scope.sql applied';
END $$;
