-- =============================================================================
-- v773: Global Template sync — industry_plan domain (catalog + per-account nodes)
-- Plan: projectplan/v772_industry_template_springboard_content_plan.md (Phase 2)
-- Companion Admin: projectplans/v166 + SQL/v166
-- Prerequisites: v765, v766 (pm_template_node_id on pmo_industry_templates), v771
--
-- Replaces public._sync_global_template_node_for_account (keeps v771 fields/
-- guidance_text_override behaviour) and updates public.sync_global_template_node
-- so industry_plan payloads are JSONB objects (not arrays).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Companion: upsert shared public.pmo_industry_templates + children once
-- -----------------------------------------------------------------------------
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

    INSERT INTO public.pmo_industry_templates (
        industry_code,
        industry_name,
        description,
        typical_duration,
        icon,
        tags,
        status,
        is_active,
        is_deleted,
        updated_at
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
        'published',
        TRUE,
        FALSE,
        NOW()
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
        updated_at = NOW()
    RETURNING id INTO v_template_id;

    -- Replace children from payload arrays
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
                estimated_duration, sort_order
            ) VALUES (
                v_template_id,
                v_phase_number,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'phase_name', '')), ''), 'Phase ' || v_phase_number),
                NULLIF(trim(COALESCE(v_item->>'phase_description', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'estimated_duration', '')), ''),
                COALESCE((v_item->>'sort_order')::integer, v_ord)
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
            INSERT INTO public.pmo_industry_template_activities (
                template_id, phase_id, activity_name, activity_description,
                activity_type, typical_duration, typical_effort, resource_type,
                predecessor_notes, constraints, sort_order
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
                COALESCE((v_item->>'sort_order')::integer, v_ord)
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
                is_mandatory, sort_order
            ) VALUES (
                v_template_id,
                v_phase_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'deliverable_name', '')), ''), 'Deliverable ' || v_ord),
                COALESCE(NULLIF(trim(COALESCE(v_item->>'deliverable_type', '')), ''), 'document'),
                COALESCE((v_item->>'is_mandatory')::boolean, FALSE),
                COALESCE((v_item->>'sort_order')::integer, v_ord)
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
                likelihood, impact, sort_order
            ) VALUES (
                v_template_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'risk_title', '')), ''), 'Risk ' || v_ord),
                NULLIF(trim(COALESCE(v_item->>'risk_description', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'risk_category', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'likelihood', '')), ''),
                NULLIF(trim(COALESCE(v_item->>'impact', '')), ''),
                COALESCE((v_item->>'sort_order')::integer, v_ord)
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
                template_id, phase_id, milestone_name, milestone_description, sort_order
            ) VALUES (
                v_template_id,
                v_phase_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'milestone_name', '')), ''), 'Milestone ' || v_ord),
                NULLIF(trim(COALESCE(v_item->>'milestone_description', '')), ''),
                COALESCE((v_item->>'sort_order')::integer, v_ord)
            );
        END LOOP;
    END IF;

    v_ord := 0;
    IF p_payload ? 'roles' AND jsonb_typeof(p_payload->'roles') = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'roles')
        LOOP
            v_ord := v_ord + 1;
            INSERT INTO public.pmo_industry_template_roles (
                template_id, role_title, role_description, is_key_role, sort_order
            ) VALUES (
                v_template_id,
                COALESCE(NULLIF(trim(COALESCE(v_item->>'role_title', '')), ''), 'Role ' || v_ord),
                NULLIF(trim(COALESCE(v_item->>'role_description', '')), ''),
                COALESCE((v_item->>'is_key_role')::boolean, FALSE),
                COALESCE((v_item->>'sort_order')::integer, v_ord)
            );
        END LOOP;
    END IF;

    RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public._sync_global_industry_template_catalog(JSONB, TEXT, TEXT) FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 2) Per-account helper (fields from v771 + industry_plan node link)
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
    p_payload JSONB,
    p_domain_ref_id UUID DEFAULT NULL
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
    v_guidance TEXT;
    v_description TEXT;
BEGIN
    IF p_schema NOT IN ('public', 'sim') THEN
        RAISE EXCEPTION 'Invalid schema: %', p_schema;
    END IF;

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
                $1, ''pmo'', $2, $3, NULL,
                ''account'', NULL,
                $4, $5, $6,
                ''published'', GREATEST(COALESCE($7, 1), 1), TRUE, TRUE,
                $8
             ) RETURNING id',
            p_schema
        ) INTO v_node_id
        USING
            p_account_id, p_domain, p_domain_ref_id,
            p_name, p_description, p_category, p_version, p_global_template_id;
    ELSE
        EXECUTE format(
            'UPDATE %I.pm_template_nodes SET
                domain = $2,
                domain_ref_id = COALESCE($3, domain_ref_id),
                name = $4,
                description = $5,
                category = $6,
                status = ''published'',
                version = GREATEST(COALESCE($7, 1), 1),
                is_current = TRUE,
                updated_at = NOW()
             WHERE id = $1',
            p_schema
        ) USING
            v_node_id, p_domain, p_domain_ref_id,
            p_name, p_description, p_category, p_version;
    END IF;

    -- Fields domain: materialise definitions + links (v771 guidance)
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
            v_guidance := NULLIF(trim(COALESCE(v_field->>'guidance_text', '')), '');
            v_description := COALESCE(
                NULLIF(trim(COALESCE(v_field->>'description', '')), ''),
                v_guidance
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
                    v_description,
                    COALESCE(NULLIF(trim(v_field->>'field_type'), ''), 'text'),
                    COALESCE(v_field->'validation_rules', '{}'::jsonb),
                    COALESCE((v_field->>'display_order')::integer, v_ord),
                    p_global_template_id;
            ELSE
                EXECUTE format(
                    'UPDATE %I.custom_field_definitions SET
                        label = $2,
                        description = COALESCE($3, description),
                        field_type = $4,
                        validation_rules = COALESCE($5, validation_rules),
                        display_sort_order = $6,
                        workflow_status = ''published'',
                        updated_at = NOW()
                     WHERE id = $1',
                    p_schema
                ) USING
                    v_def_id,
                    COALESCE(NULLIF(trim(v_field->>'label'), ''), v_field_code),
                    v_description,
                    COALESCE(NULLIF(trim(v_field->>'field_type'), ''), 'text'),
                    COALESCE(v_field->'validation_rules', '{}'::jsonb),
                    COALESCE((v_field->>'display_order')::integer, v_ord);
            END IF;

            EXECUTE format(
                'INSERT INTO %I.pm_template_field_links (
                    node_id, custom_field_definition_id, is_local, enabled,
                    required_override, default_value_override, guidance_text_override,
                    label_override, display_order
                 ) VALUES (
                    $1, $2, FALSE, TRUE,
                    CASE WHEN ($3)::text IN (''true'', ''t'', ''1'') THEN TRUE
                         WHEN ($3)::text IN (''false'', ''f'', ''0'') THEN FALSE
                         ELSE NULL END,
                    $4,
                    $5,
                    NULLIF(trim($6), ''''),
                    $7
                 )
                 ON CONFLICT (node_id, custom_field_definition_id) DO UPDATE SET
                    enabled = TRUE,
                    required_override = EXCLUDED.required_override,
                    default_value_override = EXCLUDED.default_value_override,
                    guidance_text_override = EXCLUDED.guidance_text_override,
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
                v_guidance,
                v_field->>'label',
                COALESCE((v_field->>'display_order')::integer, v_ord);
        END LOOP;
    END IF;

    -- industry_plan: link shared catalog row's pm_template_node_id on first write
    IF p_domain = 'industry_plan'
       AND p_schema = 'public'
       AND p_domain_ref_id IS NOT NULL THEN
        UPDATE public.pmo_industry_templates
        SET pm_template_node_id = v_node_id,
            updated_at = NOW()
        WHERE id = p_domain_ref_id
          AND pm_template_node_id IS NULL;
    END IF;

    RETURN v_node_id;
END;
$$;

-- Drop prior 9-arg overload so callers resolve to the new signature
DROP FUNCTION IF EXISTS public._sync_global_template_node_for_account(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB);

REVOKE ALL ON FUNCTION public._sync_global_template_node_for_account(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, UUID) FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 3) Outer entry point — fields (array) + industry_plan (object)
-- -----------------------------------------------------------------------------
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
        'fields', 'form_template', 'industry_plan', 'opa', 'process_template'
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

    RETURN jsonb_build_object(
        'global_template_id', p_global_template_id,
        'accounts_synced', v_accounts,
        'sample_node_id', v_first_node,
        'domain', p_domain,
        'version', GREATEST(COALESCE(p_version, 1), 1),
        'industry_template_id', v_template_id
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
    RAISE NOTICE 'v773_global_industry_template_sync.sql applied';
END $$;
