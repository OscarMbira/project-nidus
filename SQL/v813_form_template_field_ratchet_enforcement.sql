-- =============================================================================
-- v813: Server-side enforcement of the one-way required ratchet (decision 11) on
-- form_template_field_overrides — client-side gating (TierFormPolicyPanel) is UX only;
-- this is the actual guarantee, since any direct API/db call must be blocked too.
-- Plan: projectplan/v808_form_template_org_required_field_override_plan.md (Phase 5)
-- Prerequisites: v812 (scope_entity_type/scope_entity_id columns)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- public schema
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.form_template_ancestor_scopes(
    p_scope_entity_type TEXT,
    p_scope_entity_id UUID
)
RETURNS TABLE (scope_entity_type TEXT, scope_entity_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_scope_entity_type = 'project' THEN
        RETURN QUERY
        SELECT 'portfolio'::TEXT, pp.portfolio_id FROM public.portfolio_projects pp WHERE pp.project_id = p_scope_entity_id
        UNION ALL
        SELECT 'programme'::TEXT, pgp.programme_id FROM public.programme_projects pgp WHERE pgp.project_id = p_scope_entity_id;
    ELSIF p_scope_entity_type = 'programme' THEN
        RETURN QUERY
        SELECT 'portfolio'::TEXT, prog.portfolio_id FROM public.programmes prog WHERE prog.id = p_scope_entity_id AND prog.portfolio_id IS NOT NULL;
    END IF;
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_form_template_field_overrides_ratchet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ancestor_required BOOLEAN;
BEGIN
    -- The org-wide default row itself has no ancestor to ratchet against.
    IF NEW.scope_entity_type = 'account' THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.form_template_field_overrides o
        WHERE o.organisation_id = NEW.organisation_id
          AND o.template_id = NEW.template_id
          AND o.section_key = NEW.section_key
          AND o.field_key = NEW.field_key
          AND o.is_required = TRUE
          AND (
              o.scope_entity_type = 'account'
              OR (o.scope_entity_type, o.scope_entity_id) IN (
                  SELECT scope_entity_type, scope_entity_id
                  FROM public.form_template_ancestor_scopes(NEW.scope_entity_type, NEW.scope_entity_id)
              )
          )
    ) INTO v_ancestor_required;

    IF v_ancestor_required AND NEW.is_enabled = FALSE THEN
        RAISE EXCEPTION 'Cannot disable field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    IF v_ancestor_required AND NEW.is_required = FALSE THEN
        RAISE EXCEPTION 'Cannot un-require field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_template_field_overrides_ratchet ON public.form_template_field_overrides;
CREATE TRIGGER trg_form_template_field_overrides_ratchet
    BEFORE INSERT OR UPDATE ON public.form_template_field_overrides
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_form_template_field_overrides_ratchet();

-- -----------------------------------------------------------------------------
-- sim schema (practice_* linkage tables — genuinely different names, not aliases)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.form_template_ancestor_scopes(
    p_scope_entity_type TEXT,
    p_scope_entity_id UUID
)
RETURNS TABLE (scope_entity_type TEXT, scope_entity_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
BEGIN
    IF p_scope_entity_type = 'project' THEN
        RETURN QUERY
        SELECT 'portfolio'::TEXT, pp.practice_portfolio_id FROM sim.practice_portfolio_projects pp WHERE pp.practice_project_id = p_scope_entity_id
        UNION ALL
        SELECT 'programme'::TEXT, pgp.practice_programme_id FROM sim.practice_programme_projects pgp WHERE pgp.practice_project_id = p_scope_entity_id;
    ELSIF p_scope_entity_type = 'programme' THEN
        RETURN QUERY
        SELECT 'portfolio'::TEXT, prog.practice_portfolio_id FROM sim.practice_programmes prog WHERE prog.id = p_scope_entity_id AND prog.practice_portfolio_id IS NOT NULL;
    END IF;
    RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION sim.trg_form_template_field_overrides_ratchet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
    v_ancestor_required BOOLEAN;
BEGIN
    IF NEW.scope_entity_type = 'account' THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM sim.form_template_field_overrides o
        WHERE o.organisation_id = NEW.organisation_id
          AND o.template_id = NEW.template_id
          AND o.section_key = NEW.section_key
          AND o.field_key = NEW.field_key
          AND o.is_required = TRUE
          AND (
              o.scope_entity_type = 'account'
              OR (o.scope_entity_type, o.scope_entity_id) IN (
                  SELECT scope_entity_type, scope_entity_id
                  FROM sim.form_template_ancestor_scopes(NEW.scope_entity_type, NEW.scope_entity_id)
              )
          )
    ) INTO v_ancestor_required;

    IF v_ancestor_required AND NEW.is_enabled = FALSE THEN
        RAISE EXCEPTION 'Cannot disable field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    IF v_ancestor_required AND NEW.is_required = FALSE THEN
        RAISE EXCEPTION 'Cannot un-require field "%.%" — it is required by an ancestor tier', NEW.section_key, NEW.field_key;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sim_form_template_field_overrides_ratchet ON sim.form_template_field_overrides;
CREATE TRIGGER trg_sim_form_template_field_overrides_ratchet
    BEFORE INSERT OR UPDATE ON sim.form_template_field_overrides
    FOR EACH ROW
    EXECUTE FUNCTION sim.trg_form_template_field_overrides_ratchet();

DO $$
BEGIN
  RAISE NOTICE 'v813_form_template_field_ratchet_enforcement.sql applied';
END $$;
