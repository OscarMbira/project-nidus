-- =============================================================================
-- v765: Global Template → Platform/Simulator sync RPCs
-- Companion: Admin plan projectplans/v159_global_template_library_plan.md (Phase 1)
-- Depends on: v764 / v764c (pm_template_nodes + field_links in public + sim)
--
-- Adds source_global_template_id for idempotent upserts, then SECURITY DEFINER
-- RPCs that materialise a published Global Template as system-synced PMO nodes
-- (one per active account) with optional fields-domain field links.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Tracking column (public + sim)
-- -----------------------------------------------------------------------------
ALTER TABLE public.pm_template_nodes
    ADD COLUMN IF NOT EXISTS source_global_template_id UUID NULL;

COMMENT ON COLUMN public.pm_template_nodes.source_global_template_id IS
    'admin.global_template_library.id this system-synced node was published from.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_pm_template_nodes_source_global_account
    ON public.pm_template_nodes (account_id, source_global_template_id)
    WHERE is_system_synced = TRUE
      AND source_global_template_id IS NOT NULL;

ALTER TABLE sim.pm_template_nodes
    ADD COLUMN IF NOT EXISTS source_global_template_id UUID NULL;

COMMENT ON COLUMN sim.pm_template_nodes.source_global_template_id IS
    'admin.global_template_library.id this system-synced node was published from.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_pm_template_nodes_source_global_account
    ON sim.pm_template_nodes (account_id, source_global_template_id)
    WHERE is_system_synced = TRUE
      AND source_global_template_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2) Helper: upsert one account's node (+ fields links) in a target schema
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._sync_global_template_node_for_account(
    p_schema TEXT,
    p_account_id UUID,
    p_global_template_id UUID,
    p_domain TEXT,
    p_name TEXT,
    p_description TEXT,
    p_category TEXT,
    p_version INTEGER,
    p_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_node_id UUID;
    v_field JSONB;
    v_field_code TEXT;
    v_def_id UUID;
    v_ord INTEGER := 0;
BEGIN
    IF p_schema NOT IN ('public', 'sim') THEN
        RAISE EXCEPTION 'Invalid schema: %', p_schema;
    END IF;

    -- Upsert node (select then insert/update — partial unique index)
    EXECUTE format(
        'SELECT id FROM %I.pm_template_nodes
         WHERE account_id = $1
           AND source_global_template_id = $2
           AND is_system_synced = TRUE
         LIMIT 1',
        p_schema
    ) INTO v_node_id USING p_account_id, p_global_template_id;

    IF v_node_id IS NULL THEN
        EXECUTE format(
            'INSERT INTO %I.pm_template_nodes (
                account_id, tier, domain, domain_ref_id, parent_node_id,
                scope_entity_type, scope_entity_id,
                name, description, category,
                status, version, is_current, is_system_synced,
                source_global_template_id
             ) VALUES (
                $1, ''pmo'', $2, NULL, NULL,
                ''account'', NULL,
                $3, $4, $5,
                ''published'', GREATEST(COALESCE($6, 1), 1), TRUE, TRUE,
                $7
             ) RETURNING id',
            p_schema
        ) INTO v_node_id
        USING p_account_id, p_domain, p_name, p_description, p_category, p_version, p_global_template_id;
    ELSE
        EXECUTE format(
            'UPDATE %I.pm_template_nodes SET
                domain = $2,
                name = $3,
                description = $4,
                category = $5,
                status = ''published'',
                version = GREATEST(COALESCE($6, 1), 1),
                is_current = TRUE,
                updated_at = NOW()
             WHERE id = $1',
            p_schema
        ) USING v_node_id, p_domain, p_name, p_description, p_category, p_version;
    END IF;

    -- Fields domain: materialise definitions + links
    IF p_domain = 'fields' AND p_payload IS NOT NULL AND jsonb_typeof(p_payload) = 'array' THEN
        EXECUTE format(
            'DELETE FROM %I.pm_template_field_links
             WHERE node_id = $1 AND COALESCE(is_local, FALSE) = FALSE',
            p_schema
        ) USING v_node_id;

        FOR v_field IN SELECT * FROM jsonb_array_elements(p_payload)
        LOOP
            v_ord := v_ord + 1;
            v_field_code := left(
                'gtl_' || replace(p_global_template_id::text, '-', '') || '_' ||
                lower(regexp_replace(COALESCE(v_field->>'field_code', 'field'), '[^a-z0-9_]+', '_', 'g')),
                120
            );

            EXECUTE format(
                'SELECT id FROM %I.custom_field_definitions
                 WHERE account_id = $1 AND field_code = $2
                   AND COALESCE(is_deleted, FALSE) = FALSE
                 LIMIT 1',
                p_schema
            ) INTO v_def_id USING p_account_id, v_field_code;

            IF v_def_id IS NULL THEN
                EXECUTE format(
                    'INSERT INTO %I.custom_field_definitions (
                        account_id, field_code, label, description, field_type,
                        workflow_status, validation_rules, display_sort_order,
                        field_metadata
                     ) VALUES (
                        $1, $2, $3, $4, $5,
                        ''published'', COALESCE($6, ''{}''::jsonb), $7,
                        jsonb_build_object(
                            ''source'', ''global_template'',
                            ''global_template_id'', $8::text
                        )
                     ) RETURNING id',
                    p_schema
                ) INTO v_def_id
                USING
                    p_account_id,
                    v_field_code,
                    COALESCE(NULLIF(trim(v_field->>'label'), ''), v_field_code),
                    NULLIF(trim(v_field->>'description'), ''),
                    COALESCE(NULLIF(trim(v_field->>'field_type'), ''), 'text'),
                    COALESCE(v_field->'validation_rules', '{}'::jsonb),
                    COALESCE((v_field->>'display_order')::integer, v_ord),
                    p_global_template_id;
            ELSE
                EXECUTE format(
                    'UPDATE %I.custom_field_definitions SET
                        label = $2,
                        field_type = $3,
                        validation_rules = COALESCE($4, validation_rules),
                        display_sort_order = $5,
                        workflow_status = ''published'',
                        updated_at = NOW()
                     WHERE id = $1',
                    p_schema
                ) USING
                    v_def_id,
                    COALESCE(NULLIF(trim(v_field->>'label'), ''), v_field_code),
                    COALESCE(NULLIF(trim(v_field->>'field_type'), ''), 'text'),
                    COALESCE(v_field->'validation_rules', '{}'::jsonb),
                    COALESCE((v_field->>'display_order')::integer, v_ord);
            END IF;

            EXECUTE format(
                'INSERT INTO %I.pm_template_field_links (
                    node_id, custom_field_definition_id, is_local, enabled,
                    required_override, default_value_override, label_override, display_order
                 ) VALUES (
                    $1, $2, FALSE, TRUE,
                    CASE WHEN ($3)::text IN (''true'', ''t'', ''1'') THEN TRUE
                         WHEN ($3)::text IN (''false'', ''f'', ''0'') THEN FALSE
                         ELSE NULL END,
                    $4,
                    NULLIF(trim($5), ''''),
                    $6
                 )
                 ON CONFLICT (node_id, custom_field_definition_id) DO UPDATE SET
                    enabled = TRUE,
                    required_override = EXCLUDED.required_override,
                    default_value_override = EXCLUDED.default_value_override,
                    label_override = EXCLUDED.label_override,
                    display_order = EXCLUDED.display_order,
                    is_local = FALSE,
                    updated_at = NOW()',
                p_schema
            ) USING
                v_node_id,
                v_def_id,
                COALESCE(v_field->>'required', ''),
                v_field->'default_value',
                v_field->>'label',
                COALESCE((v_field->>'display_order')::integer, v_ord);
        END LOOP;
    END IF;

    RETURN v_node_id;
END;
$$;

REVOKE ALL ON FUNCTION public._sync_global_template_node_for_account(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 3) Public entry point — sync to all active accounts (public + sim)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_global_template_node(
    p_global_template_id UUID,
    p_domain TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_version INTEGER DEFAULT 1,
    p_payload JSONB DEFAULT '[]'::jsonb
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
BEGIN
    IF p_global_template_id IS NULL THEN
        RAISE EXCEPTION 'global_template_id is required';
    END IF;
    IF p_domain IS NULL OR p_domain NOT IN (
        'fields', 'form_template', 'industry_plan', 'opa', 'process_template'
    ) THEN
        RAISE EXCEPTION 'Invalid domain: %', p_domain;
    END IF;
    IF NULLIF(trim(COALESCE(p_name, '')), '') IS NULL THEN
        RAISE EXCEPTION 'name is required';
    END IF;

    FOR v_account IN
        SELECT a.id
        FROM public.accounts a
        WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    LOOP
        v_public_node := public._sync_global_template_node_for_account(
            'public', v_account.id, p_global_template_id, p_domain,
            trim(p_name), p_description, p_category, p_version,
            COALESCE(p_payload, '[]'::jsonb)
        );
        v_sim_node := public._sync_global_template_node_for_account(
            'sim', v_account.id, p_global_template_id, p_domain,
            trim(p_name), p_description, p_category, p_version,
            COALESCE(p_payload, '[]'::jsonb)
        );
        v_accounts := v_accounts + 1;
        IF v_first_node IS NULL THEN
            v_first_node := v_public_node;
        END IF;
        -- silence unused warning for sim node in loop
        PERFORM v_sim_node;
    END LOOP;

    RETURN jsonb_build_object(
        'global_template_id', p_global_template_id,
        'accounts_synced', v_accounts,
        'sample_node_id', v_first_node,
        'domain', p_domain,
        'version', GREATEST(COALESCE(p_version, 1), 1)
    );
END;
$$;

-- Convenience alias for sim schema callers (same implementation)
CREATE OR REPLACE FUNCTION sim.sync_global_template_node(
    p_global_template_id UUID,
    p_domain TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_version INTEGER DEFAULT 1,
    p_payload JSONB DEFAULT '[]'::jsonb
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
-- Callable from Admin SECURITY DEFINER wrappers (same DB role) and service_role
GRANT EXECUTE ON FUNCTION public.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION sim.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'v765_global_template_sync_rpc.sql applied';
END $$;
