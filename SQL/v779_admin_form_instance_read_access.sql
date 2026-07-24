-- =============================================================================
-- v779: Read-only RPCs — list/get completed form_instance data for Admin export
-- Companion: Admin SQL/v177_admin_form_instance_read_wrapper.sql
-- Plan: projectplan/v776_admin_form_instance_read_access_plan.md
-- Narrow read exception: Admin wrappers only; EXECUTE granted to service_role.
-- Status filter: form engine uses draft | in_review | approved | rejected | archived
--   (no "completed"); export lists submitted forms: in_review + approved.
-- Note: project_name / owner_name / status are cast to text — underlying columns
--   are often varchar, which must match RETURNS TABLE (... TEXT ...).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public (Platform)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_form_instances_for_template(p_template_code TEXT)
RETURNS TABLE (
    form_instance_id UUID,
    project_id UUID,
    project_name TEXT,
    status TEXT,
    owner_name TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NULLIF(trim(COALESCE(p_template_code, '')), '') IS NULL THEN
        RAISE EXCEPTION 'template_code is required';
    END IF;

    RETURN QUERY
    SELECT
        fi.id AS form_instance_id,
        fi.project_id,
        COALESCE(p.project_name, p.project_code, fi.project_id::text)::text AS project_name,
        fi.status::text AS status,
        COALESCE(u.full_name, u.email, fi.owner_id::text)::text AS owner_name,
        fi.updated_at
    FROM public.form_instances fi
    INNER JOIN public.form_templates ft ON ft.id = fi.template_id
    LEFT JOIN public.projects p ON p.id = fi.project_id
    LEFT JOIN public.users u ON u.id = fi.owner_id
    WHERE ft.template_code = trim(p_template_code)
      AND fi.status IN ('in_review', 'approved')
    ORDER BY fi.updated_at DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_form_instance_export_data(p_form_instance_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_instance JSONB;
    v_values JSONB;
    v_rows JSONB;
BEGIN
    IF p_form_instance_id IS NULL THEN
        RAISE EXCEPTION 'form_instance_id is required';
    END IF;

    SELECT jsonb_build_object(
        'id', fi.id,
        'project_id', fi.project_id,
        'template_id', fi.template_id,
        'template_version_id', fi.template_version_id,
        'owner_id', fi.owner_id,
        'status', fi.status,
        'created_at', fi.created_at,
        'updated_at', fi.updated_at,
        'template_code', ft.template_code,
        'project_name', COALESCE(p.project_name, p.project_code)
    )
    INTO v_instance
    FROM public.form_instances fi
    LEFT JOIN public.form_templates ft ON ft.id = fi.template_id
    LEFT JOIN public.projects p ON p.id = fi.project_id
    WHERE fi.id = p_form_instance_id;

    IF v_instance IS NULL THEN
        RAISE EXCEPTION 'form_instance not found: %', p_form_instance_id;
    END IF;

    SELECT COALESCE(
        jsonb_object_agg(fiv.field_key, fiv.field_value),
        '{}'::jsonb
    )
    INTO v_values
    FROM public.form_instance_values fiv
    WHERE fiv.form_instance_id = p_form_instance_id;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'section_key', fir.section_key,
                'row_index', fir.row_index,
                'row_value', fir.row_value
            )
            ORDER BY fir.section_key, fir.row_index
        ),
        '[]'::jsonb
    )
    INTO v_rows
    FROM public.form_instance_rows fir
    WHERE fir.form_instance_id = p_form_instance_id;

    RETURN jsonb_build_object(
        'instance', v_instance,
        'values', COALESCE(v_values, '{}'::jsonb),
        'rows', COALESCE(v_rows, '[]'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.list_form_instances_for_template(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_form_instance_export_data(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_form_instances_for_template(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_form_instance_export_data(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_form_instances_for_template(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_form_instance_export_data(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- sim (Simulator) — identical signatures
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sim.list_form_instances_for_template(p_template_code TEXT)
RETURNS TABLE (
    form_instance_id UUID,
    project_id UUID,
    project_name TEXT,
    status TEXT,
    owner_name TEXT,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
BEGIN
    IF NULLIF(trim(COALESCE(p_template_code, '')), '') IS NULL THEN
        RAISE EXCEPTION 'template_code is required';
    END IF;

    RETURN QUERY
    SELECT
        fi.id AS form_instance_id,
        fi.project_id,
        COALESCE(p.project_name, p.project_code, fi.project_id::text)::text AS project_name,
        fi.status::text AS status,
        COALESCE(u.full_name, u.email, fi.owner_id::text)::text AS owner_name,
        fi.updated_at
    FROM sim.form_instances fi
    INNER JOIN sim.form_templates ft ON ft.id = fi.template_id
    LEFT JOIN public.projects p ON p.id = fi.project_id
    LEFT JOIN public.users u ON u.id = fi.owner_id
    WHERE ft.template_code = trim(p_template_code)
      AND fi.status IN ('in_review', 'approved')
    ORDER BY fi.updated_at DESC NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION sim.get_form_instance_export_data(p_form_instance_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sim, public
AS $$
DECLARE
    v_instance JSONB;
    v_values JSONB;
    v_rows JSONB;
BEGIN
    IF p_form_instance_id IS NULL THEN
        RAISE EXCEPTION 'form_instance_id is required';
    END IF;

    SELECT jsonb_build_object(
        'id', fi.id,
        'project_id', fi.project_id,
        'template_id', fi.template_id,
        'template_version_id', fi.template_version_id,
        'owner_id', fi.owner_id,
        'status', fi.status,
        'created_at', fi.created_at,
        'updated_at', fi.updated_at,
        'template_code', ft.template_code,
        'project_name', COALESCE(p.project_name, p.project_code)
    )
    INTO v_instance
    FROM sim.form_instances fi
    LEFT JOIN sim.form_templates ft ON ft.id = fi.template_id
    LEFT JOIN public.projects p ON p.id = fi.project_id
    WHERE fi.id = p_form_instance_id;

    IF v_instance IS NULL THEN
        RAISE EXCEPTION 'form_instance not found: %', p_form_instance_id;
    END IF;

    SELECT COALESCE(
        jsonb_object_agg(fiv.field_key, fiv.field_value),
        '{}'::jsonb
    )
    INTO v_values
    FROM sim.form_instance_values fiv
    WHERE fiv.form_instance_id = p_form_instance_id;

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'section_key', fir.section_key,
                'row_index', fir.row_index,
                'row_value', fir.row_value
            )
            ORDER BY fir.section_key, fir.row_index
        ),
        '[]'::jsonb
    )
    INTO v_rows
    FROM sim.form_instance_rows fir
    WHERE fir.form_instance_id = p_form_instance_id;

    RETURN jsonb_build_object(
        'instance', v_instance,
        'values', COALESCE(v_values, '{}'::jsonb),
        'rows', COALESCE(v_rows, '[]'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION sim.list_form_instances_for_template(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sim.get_form_instance_export_data(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION sim.list_form_instances_for_template(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION sim.get_form_instance_export_data(UUID) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION sim.list_form_instances_for_template(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION sim.get_form_instance_export_data(UUID) TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'v779_admin_form_instance_read_access.sql applied';
END $$;
