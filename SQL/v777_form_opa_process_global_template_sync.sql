-- =============================================================================
-- v777: sync_global_template_node — form_template, opa, process_template catalogs
-- Plan: project-nidus-admin/projectplans/v173_global_template_library_domain_coverage_plan.md
--       (Admin companion SQL is v174*; this file is monorepo sync half)
-- Prerequisites: v773, v776e; form_templates (v502/v503); OPA (v400); process tables (v629/v632)
-- =============================================================================

-- form_template: upsert public + sim by template_code; fan-out nodes per account
CREATE OR REPLACE FUNCTION public._sync_global_form_template_catalog(
    p_global_template_id UUID,
    p_payload JSONB,
    p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
    v_code TEXT;
    v_name TEXT;
    v_group TEXT;
    v_schema JSONB;
    v_id UUID;
    v_sim_id UUID;
    v_ver INT;
BEGIN
    IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'form_template payload must be a JSON object';
    END IF;
    v_code := NULLIF(trim(COALESCE(p_payload->>'template_code', '')), '');
    IF v_code IS NULL THEN
        RAISE EXCEPTION 'form_template payload.template_code is required';
    END IF;
    v_name := COALESCE(NULLIF(trim(p_name), ''), NULLIF(trim(p_payload->>'name'), ''), v_code);
    v_group := COALESCE(NULLIF(trim(p_payload->>'process_group'), ''), 'planning');
    v_schema := COALESCE(p_payload->'schema', '{}'::jsonb);

    INSERT INTO public.form_templates (template_code, name, process_group, is_active)
    VALUES (v_code, v_name, v_group, COALESCE((p_payload->>'is_active')::boolean, TRUE))
    ON CONFLICT (template_code) DO UPDATE SET
        name = EXCLUDED.name,
        process_group = EXCLUDED.process_group,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    RETURNING id INTO v_id;

    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_ver
    FROM public.form_template_versions WHERE template_id = v_id;

    UPDATE public.form_template_versions SET is_current = FALSE WHERE template_id = v_id;
    INSERT INTO public.form_template_versions (template_id, version_number, schema, is_current)
    VALUES (v_id, v_ver, v_schema, TRUE);

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'sim' AND table_name = 'form_templates') THEN
        INSERT INTO sim.form_templates (id, template_code, name, process_group, is_active)
        VALUES (v_id, v_code, v_name, v_group, COALESCE((p_payload->>'is_active')::boolean, TRUE))
        ON CONFLICT (template_code) DO UPDATE SET
            name = EXCLUDED.name,
            process_group = EXCLUDED.process_group,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING id INTO v_sim_id;

        IF v_sim_id IS NULL THEN
            SELECT id INTO v_sim_id FROM sim.form_templates WHERE template_code = v_code LIMIT 1;
        END IF;

        UPDATE sim.form_template_versions SET is_current = FALSE WHERE template_id = v_sim_id;
        INSERT INTO sim.form_template_versions (template_id, version_number, schema, is_current)
        VALUES (v_sim_id, v_ver, v_schema, TRUE)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN v_id;
END;
$$;

-- opa: one shared row per global template, keyed by document_reference
CREATE OR REPLACE FUNCTION public._sync_global_opa_catalog(
    p_global_template_id UUID,
    p_payload JSONB,
    p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
    v_org UUID;
    v_creator UUID;
    v_id UUID;
    v_ref TEXT;
    v_title TEXT;
BEGIN
    IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'opa payload must be a JSON object';
    END IF;

    v_ref := 'global_template:' || p_global_template_id::text;
    v_title := COALESCE(NULLIF(trim(p_name), ''), NULLIF(trim(p_payload->>'title'), ''), 'OPA');

    SELECT a.id INTO v_org
    FROM public.accounts a
    WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    ORDER BY a.created_at NULLS LAST, a.id
    LIMIT 1;

    IF v_org IS NULL THEN
        RAISE EXCEPTION 'No active account for OPA catalog sync';
    END IF;

    SELECT u.id INTO v_creator FROM auth.users u ORDER BY u.created_at NULLS LAST LIMIT 1;
    IF v_creator IS NULL THEN
        RAISE EXCEPTION 'OPA catalog sync requires at least one auth.users row for created_by';
    END IF;

    SELECT id INTO v_id
    FROM public.organisational_process_assets
    WHERE document_reference = v_ref
    LIMIT 1;

    IF v_id IS NULL THEN
        INSERT INTO public.organisational_process_assets (
            title, description, opa_type, version, status,
            document_reference, tags, notes, organisation_id, created_by
        ) VALUES (
            v_title,
            NULLIF(trim(COALESCE(p_payload->>'description', '')), ''),
            COALESCE(NULLIF(trim(p_payload->>'opa_type'), ''), 'template'),
            COALESCE(NULLIF(trim(p_payload->>'version'), ''), '1.0'),
            COALESCE(NULLIF(trim(p_payload->>'status'), ''), 'active'),
            v_ref,
            COALESCE(
                ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'tags', '[]'::jsonb))),
                '{}'::text[]
            ),
            NULLIF(trim(COALESCE(p_payload->>'notes', '')), ''),
            v_org,
            v_creator
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.organisational_process_assets SET
            title = v_title,
            description = COALESCE(NULLIF(trim(p_payload->>'description'), ''), description),
            opa_type = COALESCE(NULLIF(trim(p_payload->>'opa_type'), ''), opa_type),
            version = COALESCE(NULLIF(trim(p_payload->>'version'), ''), version),
            status = COALESCE(NULLIF(trim(p_payload->>'status'), ''), status),
            notes = COALESCE(NULLIF(trim(p_payload->>'notes'), ''), notes),
            updated_at = NOW()
        WHERE id = v_id;
    END IF;

    -- Best-effort sim mirror (same id when possible)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'sim' AND table_name = 'organisational_process_assets') THEN
        INSERT INTO sim.organisational_process_assets (
            id, title, description, opa_type, version, status,
            document_reference, tags, notes, organisation_id, created_by
        )
        SELECT
            v_id, v_title,
            NULLIF(trim(COALESCE(p_payload->>'description', '')), ''),
            COALESCE(NULLIF(trim(p_payload->>'opa_type'), ''), 'template'),
            COALESCE(NULLIF(trim(p_payload->>'version'), ''), '1.0'),
            COALESCE(NULLIF(trim(p_payload->>'status'), ''), 'active'),
            v_ref,
            COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_payload->'tags', '[]'::jsonb))), '{}'::text[]),
            NULLIF(trim(COALESCE(p_payload->>'notes', '')), ''),
            v_org,
            v_creator
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            updated_at = NOW();
    END IF;

    RETURN v_id;
END;
$$;

-- process_template: dynamic dispatch to one of 24 tables (public + sim)
CREATE OR REPLACE FUNCTION public._sync_global_process_template_catalog(
    p_global_template_id UUID,
    p_payload JSONB,
    p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
    v_table TEXT;
    v_title TEXT;
    v_ref TEXT;
    v_id UUID;
    v_allowed TEXT[] := ARRAY[
        'project_charters', 'assumption_logs', 'project_management_plans',
        'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
        'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
        'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
        'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
        'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
        'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
        'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
    ];
    v_account UUID;
BEGIN
    IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'process_template payload must be a JSON object';
    END IF;
    v_table := NULLIF(trim(COALESCE(p_payload->>'document_type', '')), '');
    IF v_table IS NULL OR NOT (v_table = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'process_template payload.document_type is invalid: %', v_table;
    END IF;

    v_title := COALESCE(NULLIF(trim(p_name), ''), NULLIF(trim(p_payload->>'title'), ''), v_table);
    v_ref := 'GTL-' || replace(p_global_template_id::text, '-', '');

    SELECT a.id INTO v_account
    FROM public.accounts a
    WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    ORDER BY a.created_at NULLS LAST, a.id
    LIMIT 1;

    EXECUTE format(
        'SELECT id FROM public.%I WHERE is_master = TRUE AND reference_code = $1 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1',
        v_table
    ) INTO v_id USING v_ref;

    IF v_id IS NULL THEN
        EXECUTE format(
            'INSERT INTO public.%I (
                project_id, account_id, reference_code, title, description, document_data,
                status, is_master, is_deleted
             ) VALUES (
                NULL, $1, $2, $3, $4, COALESCE($5, ''{}''::jsonb),
                COALESCE(NULLIF(trim($6), ''''), ''active''), TRUE, FALSE
             ) RETURNING id',
            v_table
        ) INTO v_id
        USING
            v_account,
            v_ref,
            v_title,
            NULLIF(trim(COALESCE(p_payload->>'description', '')), ''),
            p_payload->'document_data',
            COALESCE(NULLIF(trim(p_payload->>'status'), ''), 'active');
    ELSE
        EXECUTE format(
            'UPDATE public.%I SET
                title = $2,
                description = COALESCE($3, description),
                document_data = COALESCE($4, document_data),
                status = COALESCE($5, status),
                updated_at = NOW()
             WHERE id = $1',
            v_table
        ) USING
            v_id,
            v_title,
            NULLIF(trim(COALESCE(p_payload->>'description', '')), ''),
            p_payload->'document_data',
            COALESCE(NULLIF(trim(p_payload->>'status'), ''), 'active');
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sim' AND table_name = v_table
    ) THEN
        EXECUTE format(
            'INSERT INTO sim.%I (
                id, project_id, account_id, reference_code, title, description, document_data,
                status, is_master, is_deleted
             ) VALUES (
                $1, NULL, $2, $3, $4, $5, COALESCE($6, ''{}''::jsonb),
                COALESCE(NULLIF(trim($7), ''''), ''active''), TRUE, FALSE
             )
             ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                document_data = EXCLUDED.document_data,
                updated_at = NOW()',
            v_table
        ) USING
            v_id, v_account, v_ref, v_title,
            NULLIF(trim(COALESCE(p_payload->>'description', '')), ''),
            p_payload->'document_data',
            COALESCE(NULLIF(trim(p_payload->>'status'), ''), 'active');
    END IF;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_global_template_node(
    p_global_template_id UUID,
    p_domain TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_version INTEGER DEFAULT 1,
    p_payload JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, sim
AS $$
DECLARE
    v_account RECORD;
    v_public_node UUID;
    v_sim_node UUID;
    v_accounts INTEGER := 0;
    v_first_node UUID;
    v_payload JSONB;
    v_template_id UUID := NULL;
BEGIN
    IF p_global_template_id IS NULL THEN
        RAISE EXCEPTION 'global_template_id is required';
    END IF;
    IF p_domain IS NULL OR p_domain NOT IN (
        'fields', 'form_template', 'industry_plan', 'opa', 'process_template',
        'legacy_document', 'structured_list'
    ) THEN
        RAISE EXCEPTION 'Invalid domain: %', p_domain;
    END IF;
    IF NULLIF(trim(COALESCE(p_name, '')), '') IS NULL THEN
        RAISE EXCEPTION 'name is required';
    END IF;

    IF p_domain = 'industry_plan' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        IF jsonb_typeof(v_payload) <> 'object' THEN
            RAISE EXCEPTION 'industry_plan payload must be a JSON object';
        END IF;
        v_template_id := public._sync_global_industry_template_catalog(
            v_payload, trim(p_name), p_description
        );
    ELSIF p_domain = 'legacy_document' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_legacy_document_catalog(
            p_global_template_id, v_payload, trim(p_name), p_description
        );
    ELSIF p_domain = 'structured_list' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_structured_list_catalog(
            p_global_template_id, v_payload, trim(p_name)
        );
    ELSIF p_domain = 'form_template' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_form_template_catalog(
            p_global_template_id, v_payload, trim(p_name)
        );
    ELSIF p_domain = 'opa' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_opa_catalog(
            p_global_template_id, v_payload, trim(p_name)
        );
    ELSIF p_domain = 'process_template' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_process_template_catalog(
            p_global_template_id, v_payload, trim(p_name)
        );
    ELSE
        v_payload := COALESCE(p_payload, '[]'::jsonb);
    END IF;

    FOR v_account IN
        SELECT a.id
        FROM public.accounts a
        WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    LOOP
        v_public_node := public._sync_global_template_node_for_account(
            'public', v_account.id, p_global_template_id, p_domain,
            trim(p_name), p_description, p_category, p_version,
            v_payload, v_template_id
        );
        v_sim_node := public._sync_global_template_node_for_account(
            'sim', v_account.id, p_global_template_id, p_domain,
            trim(p_name), p_description, p_category, p_version,
            v_payload, v_template_id
        );
        v_accounts := v_accounts + 1;
        IF v_first_node IS NULL THEN
            v_first_node := v_public_node;
        END IF;
        PERFORM v_sim_node;
    END LOOP;

    IF p_domain = 'form_template' AND v_template_id IS NOT NULL AND v_first_node IS NOT NULL THEN
        UPDATE public.form_templates
        SET pm_template_node_id = COALESCE(pm_template_node_id, v_first_node),
            updated_at = NOW()
        WHERE id = v_template_id;
    END IF;
    IF p_domain = 'opa' AND v_template_id IS NOT NULL AND v_first_node IS NOT NULL THEN
        BEGIN
            UPDATE public.organisational_process_assets
            SET pm_template_node_id = COALESCE(pm_template_node_id, v_first_node),
                updated_at = NOW()
            WHERE id = v_template_id;
        EXCEPTION WHEN undefined_column THEN
            NULL;
        END;
    END IF;

    RETURN jsonb_build_object(
        'global_template_id', p_global_template_id,
        'accounts_synced', v_accounts,
        'sample_node_id', v_first_node,
        'domain', p_domain,
        'version', GREATEST(COALESCE(p_version, 1), 1),
        'catalog_ref_id', v_template_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION sim.sync_global_template_node(
    p_global_template_id UUID,
    p_domain TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_version INTEGER DEFAULT 1,
    p_payload JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, sim
AS $$
    SELECT public.sync_global_template_node(
        p_global_template_id, p_domain, p_name, p_description,
        p_category, p_version, p_payload
    );
$$;

REVOKE ALL ON FUNCTION public.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION sim.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION sim.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'v777_form_opa_process_global_template_sync.sql applied';
END $$;
