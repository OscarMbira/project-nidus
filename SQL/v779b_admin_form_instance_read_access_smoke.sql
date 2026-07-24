-- =============================================================================
-- v779b: Smoke checks for Admin form_instance read RPCs (run after v779)
-- Plan: projectplan/v776_admin_form_instance_read_access_plan.md
-- Safe / read-only verification — no data mutation.
-- Run in Supabase SQL editor as a privileged role (e.g. postgres / service_role).
-- =============================================================================

DO $$
DECLARE
    v_code TEXT;
    v_instance_id UUID;
    v_list_count INT;
    v_payload JSONB;
    v_has_keys BOOLEAN;
BEGIN
    -- 1) Functions exist (public + sim)
    IF to_regprocedure('public.list_form_instances_for_template(text)') IS NULL THEN
        RAISE EXCEPTION 'v779b FAIL: public.list_form_instances_for_template missing — apply v779 first';
    END IF;
    IF to_regprocedure('public.get_form_instance_export_data(uuid)') IS NULL THEN
        RAISE EXCEPTION 'v779b FAIL: public.get_form_instance_export_data missing — apply v779 first';
    END IF;
    IF to_regprocedure('sim.list_form_instances_for_template(text)') IS NULL THEN
        RAISE EXCEPTION 'v779b FAIL: sim.list_form_instances_for_template missing — apply v779 first';
    END IF;
    IF to_regprocedure('sim.get_form_instance_export_data(uuid)') IS NULL THEN
        RAISE EXCEPTION 'v779b FAIL: sim.get_form_instance_export_data missing — apply v779 first';
    END IF;

    -- 2) Empty template_code must raise
    BEGIN
        PERFORM * FROM public.list_form_instances_for_template('');
        RAISE EXCEPTION 'v779b FAIL: empty template_code should raise';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM NOT ILIKE '%template_code%' THEN
                RAISE EXCEPTION 'v779b FAIL: unexpected error for empty code: %', SQLERRM;
            END IF;
    END;

    -- 3) Unknown template_code returns zero rows (no leak)
    SELECT COUNT(*) INTO v_list_count
    FROM public.list_form_instances_for_template('__no_such_template_code_v779b__');
    IF v_list_count <> 0 THEN
        RAISE EXCEPTION 'v779b FAIL: unknown template_code returned % rows', v_list_count;
    END IF;

    -- 4) If seeded data exists, validate list filter + export shape
    SELECT t.template_code INTO v_code
    FROM public.form_templates t
    WHERE EXISTS (
        SELECT 1 FROM public.form_instances fi
        WHERE fi.template_id = t.id
          AND fi.status IN ('in_review', 'approved')
    )
    ORDER BY t.template_code
    LIMIT 1;

    IF v_code IS NOT NULL THEN
        SELECT COUNT(*) INTO v_list_count
        FROM public.list_form_instances_for_template(v_code);
        IF v_list_count < 1 THEN
            RAISE EXCEPTION 'v779b FAIL: expected >=1 submitted instance for %', v_code;
        END IF;

        -- Draft/archived must not appear
        IF EXISTS (
            SELECT 1
            FROM public.list_form_instances_for_template(v_code) x
            WHERE x.status NOT IN ('in_review', 'approved')
        ) THEN
            RAISE EXCEPTION 'v779b FAIL: list returned non-submitted status for %', v_code;
        END IF;

        SELECT x.form_instance_id INTO v_instance_id
        FROM public.list_form_instances_for_template(v_code) x
        LIMIT 1;

        v_payload := public.get_form_instance_export_data(v_instance_id);
        v_has_keys := (
            v_payload ? 'instance'
            AND v_payload ? 'values'
            AND v_payload ? 'rows'
            AND jsonb_typeof(v_payload->'values') = 'object'
            AND jsonb_typeof(v_payload->'rows') = 'array'
        );
        IF NOT v_has_keys THEN
            RAISE EXCEPTION 'v779b FAIL: export payload shape invalid: %', v_payload;
        END IF;

        RAISE NOTICE 'v779b OK (with data): template=%, listed=%, instance=%',
            v_code, v_list_count, v_instance_id;
    ELSE
        RAISE NOTICE 'v779b OK (no submitted form_instances yet) — function existence + empty/unknown checks passed';
    END IF;

    -- 5) Missing instance id must raise
    BEGIN
        PERFORM public.get_form_instance_export_data('00000000-0000-0000-0000-000000000001'::uuid);
        RAISE EXCEPTION 'v779b FAIL: missing instance should raise';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM NOT ILIKE '%not found%' AND SQLERRM NOT ILIKE '%form_instance%' THEN
                RAISE EXCEPTION 'v779b FAIL: unexpected missing-instance error: %', SQLERRM;
            END IF;
    END;

    RAISE NOTICE 'v779b_admin_form_instance_read_access_smoke.sql passed';
END $$;
