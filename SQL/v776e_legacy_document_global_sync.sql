-- =============================================================================
-- v776e: Extend sync_global_template_node for legacy_document + structured_list
-- Plan: projectplan/v775_legacy_template_upload_plan.md (Phase 3 monorepo half)
-- Prerequisites: v773, v776, v776f; Admin domain extension (v173) before publish
-- =============================================================================

CREATE OR REPLACE FUNCTION public._sync_global_legacy_document_catalog(
    p_global_template_id UUID,
    p_payload JSONB,
    p_name TEXT,
    p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_account UUID;
BEGIN
    IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'legacy_document payload must be a JSON object';
    END IF;

    -- Prefer first active account as system catalog holder for shared masters
    SELECT a.id INTO v_account
    FROM public.accounts a
    WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    ORDER BY a.created_at NULLS LAST, a.id
    LIMIT 1;

    IF v_account IS NULL THEN
        RAISE EXCEPTION 'No active account available for legacy_document catalog sync';
    END IF;

    SELECT id INTO v_id
    FROM public.pmo_legacy_document_templates
    WHERE global_template_id = p_global_template_id
    LIMIT 1;

    IF v_id IS NULL THEN
        INSERT INTO public.pmo_legacy_document_templates (
            account_id, title, doc_category, original_filename,
            storage_bucket, storage_path, file_size, mime_type, extracted_text,
            status, version, global_template_id, is_system_synced
        ) VALUES (
            v_account,
            COALESCE(NULLIF(trim(p_name), ''), 'Legacy document'),
            COALESCE(NULLIF(trim(p_payload->>'doc_category'), ''), 'other'),
            COALESCE(NULLIF(trim(p_payload->>'original_filename'), ''), 'document.bin'),
            COALESCE(NULLIF(trim(p_payload->>'storage_bucket'), ''), 'legacy-templates'),
            COALESCE(NULLIF(trim(p_payload->>'storage_path'), ''), ''),
            NULLIF(p_payload->>'file_size', '')::bigint,
            NULLIF(trim(p_payload->>'mime_type'), ''),
            NULLIF(p_payload->>'extracted_text', ''),
            'published',
            1,
            p_global_template_id,
            TRUE
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.pmo_legacy_document_templates SET
            title = COALESCE(NULLIF(trim(p_name), ''), title),
            doc_category = COALESCE(NULLIF(trim(p_payload->>'doc_category'), ''), doc_category),
            original_filename = COALESCE(NULLIF(trim(p_payload->>'original_filename'), ''), original_filename),
            storage_bucket = COALESCE(NULLIF(trim(p_payload->>'storage_bucket'), ''), storage_bucket),
            storage_path = COALESCE(NULLIF(trim(p_payload->>'storage_path'), ''), storage_path),
            file_size = COALESCE(NULLIF(p_payload->>'file_size', '')::bigint, file_size),
            mime_type = COALESCE(NULLIF(trim(p_payload->>'mime_type'), ''), mime_type),
            extracted_text = COALESCE(NULLIF(p_payload->>'extracted_text', ''), extracted_text),
            status = 'published',
            is_system_synced = TRUE,
            updated_at = NOW()
        WHERE id = v_id;
    END IF;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._sync_global_structured_list_catalog(
    p_global_template_id UUID,
    p_payload JSONB,
    p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_account UUID;
    v_list_type TEXT;
BEGIN
    IF jsonb_typeof(COALESCE(p_payload, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'structured_list payload must be a JSON object';
    END IF;

    v_list_type := NULLIF(trim(COALESCE(p_payload->>'list_type', '')), '');
    IF v_list_type IS NULL OR v_list_type NOT IN (
        'risk_register', 'raid_log', 'stakeholder_register', 'budget'
    ) THEN
        RAISE EXCEPTION 'structured_list payload.list_type is required';
    END IF;

    SELECT a.id INTO v_account
    FROM public.accounts a
    WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    ORDER BY a.created_at NULLS LAST, a.id
    LIMIT 1;

    IF v_account IS NULL THEN
        RAISE EXCEPTION 'No active account available for structured_list catalog sync';
    END IF;

    SELECT id INTO v_id
    FROM public.pmo_legacy_structured_lists
    WHERE global_template_id = p_global_template_id
    LIMIT 1;

    IF v_id IS NULL THEN
        INSERT INTO public.pmo_legacy_structured_lists (
            account_id, title, list_type, rows, column_mapping,
            status, version, global_template_id, is_system_synced
        ) VALUES (
            v_account,
            COALESCE(NULLIF(trim(p_name), ''), 'Structured list'),
            v_list_type,
            COALESCE(p_payload->'rows', '[]'::jsonb),
            COALESCE(p_payload->'column_mapping', '{}'::jsonb),
            'published',
            1,
            p_global_template_id,
            TRUE
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE public.pmo_legacy_structured_lists SET
            title = COALESCE(NULLIF(trim(p_name), ''), title),
            list_type = v_list_type,
            rows = COALESCE(p_payload->'rows', rows),
            column_mapping = COALESCE(p_payload->'column_mapping', column_mapping),
            status = 'published',
            is_system_synced = TRUE,
            updated_at = NOW()
        WHERE id = v_id;
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
            RAISE EXCEPTION 'industry_plan payload must be a JSON object (got %)', jsonb_typeof(v_payload);
        END IF;
        IF NULLIF(trim(COALESCE(v_payload->>'industry_code', '')), '') IS NULL THEN
            RAISE EXCEPTION 'industry_plan payload.industry_code is required';
        END IF;
        v_template_id := public._sync_global_industry_template_catalog(
            v_payload, trim(p_name), p_description
        );
    ELSIF p_domain = 'legacy_document' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        IF jsonb_typeof(v_payload) <> 'object' THEN
            RAISE EXCEPTION 'legacy_document payload must be a JSON object';
        END IF;
        IF NULLIF(trim(COALESCE(v_payload->>'storage_path', '')), '') IS NULL THEN
            RAISE EXCEPTION 'legacy_document payload.storage_path is required';
        END IF;
        v_template_id := public._sync_global_legacy_document_catalog(
            p_global_template_id, v_payload, trim(p_name), p_description
        );
    ELSIF p_domain = 'structured_list' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        IF jsonb_typeof(v_payload) <> 'object' THEN
            RAISE EXCEPTION 'structured_list payload must be a JSON object';
        END IF;
        v_template_id := public._sync_global_structured_list_catalog(
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

    IF p_domain = 'legacy_document' AND v_template_id IS NOT NULL AND v_first_node IS NOT NULL THEN
        UPDATE public.pmo_legacy_document_templates
        SET pm_template_node_id = COALESCE(pm_template_node_id, v_first_node),
            updated_at = NOW()
        WHERE id = v_template_id;
    END IF;
    IF p_domain = 'structured_list' AND v_template_id IS NOT NULL AND v_first_node IS NOT NULL THEN
        UPDATE public.pmo_legacy_structured_lists
        SET pm_template_node_id = COALESCE(pm_template_node_id, v_first_node),
            updated_at = NOW()
        WHERE id = v_template_id;
    END IF;

    RETURN jsonb_build_object(
        'global_template_id', p_global_template_id,
        'accounts_synced', v_accounts,
        'sample_node_id', v_first_node,
        'domain', p_domain,
        'version', GREATEST(COALESCE(p_version, 1), 1),
        'industry_template_id', CASE WHEN p_domain = 'industry_plan' THEN v_template_id ELSE NULL END,
        'legacy_document_id', CASE WHEN p_domain = 'legacy_document' THEN v_template_id ELSE NULL END,
        'structured_list_id', CASE WHEN p_domain = 'structured_list' THEN v_template_id ELSE NULL END
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
  RAISE NOTICE 'v776e_legacy_document_global_sync.sql applied';
END $$;
