-- =============================================================================
-- v782: Industry plan template grid parity (Admin v181–v184 → Platform/Simulator)
-- Plan: projectplan/v190_industry_plan_grid_parity_platform_simulator_plan.md
-- Adds planning defaults, required_skills, WBS nesting ids, custom_fields, ui defs.
-- Updates Admin→Platform catalog sync so published payloads are not lossy.
-- =============================================================================

-- ── Header: custom column defs ───────────────────────────────────────────────
ALTER TABLE public.pmo_industry_templates
  ADD COLUMN IF NOT EXISTS ui JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pmo_industry_templates.ui IS
  'Template UI prefs; custom_column_defs[] for industry plan grid (Admin v184 parity)';

-- ── Planning defaults helper columns (phases / activities / deliverables / milestones)
ALTER TABLE public.pmo_industry_template_phases
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_hours NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_cost NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_offset_days NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS row_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pmo_industry_template_activities
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_hours NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_cost NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_offset_days NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS required_skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS row_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pmo_industry_template_deliverables
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_hours NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_cost NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_offset_days NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS row_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pmo_industry_template_milestones
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_hours NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_cost NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_offset_days NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS row_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pmo_industry_template_risks
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.pmo_industry_template_roles
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── Refresh catalog sync so Admin publish maps new fields ──────────────────
CREATE OR REPLACE FUNCTION public._sync_global_industry_template_catalog(
    p_payload JSONB,
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_code TEXT;
    v_template_id UUID;
    v_tags TEXT[];
    v_item JSONB;
    v_phase_id UUID;
    v_phase_number INT;
    v_ord INTEGER;
    v_phase_map JSONB := '{}'::jsonb;
    v_ui JSONB := '{}'::jsonb;
    v_skills TEXT[];
BEGIN
    IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
        RAISE EXCEPTION 'industry_plan payload must be a JSON object';
    END IF;

    v_code := NULLIF(trim(COALESCE(p_payload->>'industry_code', '')), '');
    IF v_code IS NULL THEN
        RAISE EXCEPTION 'industry_plan payload.industry_code is required';
    END IF;

    IF p_payload ? 'tags' AND jsonb_typeof(p_payload->'tags') = 'array' THEN
        SELECT COALESCE(array_agg(x), '{}'::text[])
        INTO v_tags
        FROM (
            SELECT NULLIF(trim(tag), '') AS x
            FROM jsonb_array_elements_text(p_payload->'tags') AS t(tag)
            WHERE NULLIF(trim(tag), '') IS NOT NULL
        ) s;
    ELSE
        v_tags := '{}'::text[];
    END IF;

    IF p_payload ? 'ui' AND jsonb_typeof(p_payload->'ui') = 'object' THEN
        v_ui := p_payload->'ui';
    END IF;

    INSERT INTO public.pmo_industry_templates (
        industry_code, industry_name, description, typical_duration, icon, tags,
        status, is_active, is_deleted, ui, updated_at
    ) VALUES (
        v_code,
        COALESCE(
            NULLIF(trim(COALESCE(p_payload->>'industry_name', '')), ''),
            NULLIF(trim(COALESCE(p_name, '')), ''),
            v_code
        ),
        COALESCE(
            NULLIF(trim(COALESCE(p_payload->>'description', '')), ''),
            NULLIF(trim(COALESCE(p_description, '')), '')
        ),
        NULLIF(trim(COALESCE(p_payload->>'typical_duration', '')), ''),
        NULLIF(trim(COALESCE(p_payload->>'icon', '')), ''),
        COALESCE(v_tags, '{}'::text[]),
        'published', TRUE, FALSE, COALESCE(v_ui, '{}'::jsonb), NOW()
    )
    ON CONFLICT (industry_code) DO UPDATE SET
        industry_name = EXCLUDED.industry_name,
        description = EXCLUDED.description,
        typical_duration = EXCLUDED.typical_duration,
        icon = EXCLUDED.icon,
        tags = EXCLUDED.tags,
        status = 'published',
        is_active = TRUE,
        is_deleted = FALSE,
        ui = EXCLUDED.ui,
        updated_at = NOW()
    RETURNING id INTO v_template_id;

    DELETE FROM public.pmo_industry_template_activities WHERE template_id = v_template_id;
    DELETE FROM public.pmo_industry_template_deliverables WHERE template_id = v_template_id;
    DELETE FROM public.pmo_industry_template_risks WHERE template_id = v_template_id;
    DELETE FROM public.pmo_industry_template_milestones WHERE template_id = v_template_id;
    DELETE FROM public.pmo_industry_template_roles WHERE template_id = v_template_id;
    DELETE FROM public.pmo_industry_template_phases WHERE template_id = v_template_id;

    v_ord := 0;
    IF p_payload ? 'phases' AND jsonb_typeof(p_payload->'phases') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'phases')
        LOOP
            v_ord := v_ord + 1;
            v_phase_number := COALESCE(
                NULLIF(trim(COALESCE(v_item->>'phase_number', '')), '')::integer,
                v_ord
            );
            INSERT INTO public.pmo_industry_template_phases (
                template_id, phase_number, phase_name, phase_description,
                estimated_duration, sort_order,
                priority, planned_hours, planned_cost, start_offset_days, is_locked,
                row_id, parent_id, custom_fields
            ) VALUES (
                v_template_id,
                v_phase_number,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'phase_name', '')), ''), 'Phase ' || v_phase_number),
                NULLIF(trim(COALESCE(v_item->>'phase_description', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'estimated_duration', '')), ''),
                COALESCE((v_item->>'sort_order')::integer, v_ord),
                NULLIF(lower(trim(COALESCE(v_item->>'priority', ''))), ''),
                NULLIF(v_item->>'planned_hours', '')::numeric,
                NULLIF(v_item->>'planned_cost', '')::numeric,
                NULLIF(v_item->>'start_offset_days', '')::numeric,
                COALESCE((v_item->>'is_locked')::boolean, FALSE),
                NULLIF(trim(COALESCE(v_item->>'row_id', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'parent_id', '')), ''),
                COALESCE(v_item->'custom_fields', '{}'::jsonb)
            )
            RETURNING id INTO v_phase_id;
            v_phase_map := v_phase_map || jsonb_build_object(v_phase_number::text, v_phase_id);
        END LOOP;
    END IF;

    v_ord := 0;
    IF p_payload ? 'activities' AND jsonb_typeof(p_payload->'activities') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'activities')
        LOOP
            v_ord := v_ord + 1;
            v_phase_id := NULL;
            IF NULLIF(trim(COALESCE(v_item->>'phase_number', '')), '') IS NOT NULL THEN
                v_phase_id := NULLIF(v_phase_map->>trim(v_item->>'phase_number'), '')::uuid;
            END IF;
            v_skills := '{}'::text[];
            IF v_item ? 'required_skills' AND jsonb_typeof(v_item->'required_skills') = 'array' THEN
                SELECT COALESCE(array_agg(x), '{}'::text[]) INTO v_skills
                FROM (
                    SELECT NULLIF(trim(s), '') AS x
                    FROM jsonb_array_elements_text(v_item->'required_skills') AS t(s)
                    WHERE NULLIF(trim(s), '') IS NOT NULL
                ) q;
            END IF;
            INSERT INTO public.pmo_industry_template_activities (
                template_id, phase_id, activity_name, activity_description,
                activity_type, typical_duration, typical_effort, resource_type,
                predecessor_notes, constraints, sort_order,
                priority, planned_hours, planned_cost, start_offset_days, is_locked,
                required_skills, row_id, parent_id, custom_fields
            ) VALUES (
                v_template_id,
                v_phase_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'activity_name', '')), ''), 'Activity ' || v_ord),
                NULLIF(trim(COALESCE(v_item->>'activity_description', '')), ''),
                COALESCE(NULLIF(trim(COALESCE(v_item->>'activity_type', '')), ''), 'task'),
                NULLIF(trim(COALESCE(v_item->>'typical_duration', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'typical_effort', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'resource_type', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'predecessor_notes', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'constraints', '')), ''),
                COALESCE((v_item->>'sort_order')::integer, v_ord),
                NULLIF(lower(trim(COALESCE(v_item->>'priority', ''))), ''),
                NULLIF(v_item->>'planned_hours', '')::numeric,
                NULLIF(v_item->>'planned_cost', '')::numeric,
                NULLIF(v_item->>'start_offset_days', '')::numeric,
                COALESCE((v_item->>'is_locked')::boolean, FALSE),
                COALESCE(v_skills, '{}'::text[]),
                NULLIF(trim(COALESCE(v_item->>'row_id', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'parent_id', '')), ''),
                COALESCE(v_item->'custom_fields', '{}'::jsonb)
            );
        END LOOP;
    END IF;

    v_ord := 0;
    IF p_payload ? 'deliverables' AND jsonb_typeof(p_payload->'deliverables') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'deliverables')
        LOOP
            v_ord := v_ord + 1;
            v_phase_id := NULL;
            IF NULLIF(trim(COALESCE(v_item->>'phase_number', '')), '') IS NOT NULL THEN
                v_phase_id := NULLIF(v_phase_map->>trim(v_item->>'phase_number'), '')::uuid;
            END IF;
            INSERT INTO public.pmo_industry_template_deliverables (
                template_id, phase_id, deliverable_name, deliverable_type,
                is_mandatory, sort_order,
                priority, planned_hours, planned_cost, start_offset_days, is_locked,
                row_id, parent_id, custom_fields
            ) VALUES (
                v_template_id,
                v_phase_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'deliverable_name', '')), ''), 'Deliverable ' || v_ord),
                COALESCE(NULLIF(trim(COALESCE(v_item->>'deliverable_type', '')), ''), 'document'),
                COALESCE((v_item->>'is_mandatory')::boolean, FALSE),
                COALESCE((v_item->>'sort_order')::integer, v_ord),
                NULLIF(lower(trim(COALESCE(v_item->>'priority', ''))), ''),
                NULLIF(v_item->>'planned_hours', '')::numeric,
                NULLIF(v_item->>'planned_cost', '')::numeric,
                NULLIF(v_item->>'start_offset_days', '')::numeric,
                COALESCE((v_item->>'is_locked')::boolean, FALSE),
                NULLIF(trim(COALESCE(v_item->>'row_id', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'parent_id', '')), ''),
                COALESCE(v_item->'custom_fields', '{}'::jsonb)
            );
        END LOOP;
    END IF;

    v_ord := 0;
    IF p_payload ? 'risks' AND jsonb_typeof(p_payload->'risks') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'risks')
        LOOP
            v_ord := v_ord + 1;
            INSERT INTO public.pmo_industry_template_risks (
                template_id, risk_title, risk_description, risk_category,
                likelihood, impact, sort_order, custom_fields
            ) VALUES (
                v_template_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'risk_title', '')), ''), 'Risk ' || v_ord),
                NULLIF(trim(COALESCE(v_item->>'risk_description', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'risk_category', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'likelihood', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'impact', '')), ''),
                COALESCE((v_item->>'sort_order')::integer, v_ord),
                COALESCE(v_item->'custom_fields', '{}'::jsonb)
            );
        END LOOP;
    END IF;

    v_ord := 0;
    IF p_payload ? 'milestones' AND jsonb_typeof(p_payload->'milestones') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'milestones')
        LOOP
            v_ord := v_ord + 1;
            v_phase_id := NULL;
            IF NULLIF(trim(COALESCE(v_item->>'phase_number', '')), '') IS NOT NULL THEN
                v_phase_id := NULLIF(v_phase_map->>trim(v_item->>'phase_number'), '')::uuid;
            END IF;
            INSERT INTO public.pmo_industry_template_milestones (
                template_id, phase_id, milestone_name, milestone_description, sort_order,
                priority, planned_hours, planned_cost, start_offset_days, is_locked,
                row_id, parent_id, custom_fields
            ) VALUES (
                v_template_id,
                v_phase_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'milestone_name', '')), ''), 'Milestone ' || v_ord),
                NULLIF(trim(COALESCE(v_item->>'milestone_description', '')), ''),
                COALESCE((v_item->>'sort_order')::integer, v_ord),
                NULLIF(lower(trim(COALESCE(v_item->>'priority', ''))), ''),
                NULLIF(v_item->>'planned_hours', '')::numeric,
                NULLIF(v_item->>'planned_cost', '')::numeric,
                NULLIF(v_item->>'start_offset_days', '')::numeric,
                COALESCE((v_item->>'is_locked')::boolean, FALSE),
                NULLIF(trim(COALESCE(v_item->>'row_id', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'parent_id', '')), ''),
                COALESCE(v_item->'custom_fields', '{}'::jsonb)
            );
        END LOOP;
    END IF;

    v_ord := 0;
    IF p_payload ? 'roles' AND jsonb_typeof(p_payload->'roles') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'roles')
        LOOP
            v_ord := v_ord + 1;
            INSERT INTO public.pmo_industry_template_roles (
                template_id, role_title, role_description, is_key_role, sort_order, custom_fields
            ) VALUES (
                v_template_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'role_title', '')), ''), 'Role ' || v_ord),
                NULLIF(trim(COALESCE(v_item->>'role_description', '')), ''),
                COALESCE((v_item->>'is_key_role')::boolean, FALSE),
                COALESCE((v_item->>'sort_order')::integer, v_ord),
                COALESCE(v_item->'custom_fields', '{}'::jsonb)
            );
        END LOOP;
    END IF;

    RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public._sync_global_industry_template_catalog(JSONB, TEXT, TEXT) FROM PUBLIC;
