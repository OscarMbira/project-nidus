-- =============================================================================
-- v771: guidance_text_override on pm_template_field_links + Global Template sync
-- Companion Admin: projectplans/v165 + SQL/v165b (payload.guidance_text)
-- Prerequisites: v764/v764c, v765
-- =============================================================================

ALTER TABLE public.pm_template_field_links
    ADD COLUMN IF NOT EXISTS guidance_text_override TEXT NULL;

ALTER TABLE sim.pm_template_field_links
    ADD COLUMN IF NOT EXISTS guidance_text_override TEXT NULL;

COMMENT ON COLUMN public.pm_template_field_links.guidance_text_override IS
    'Instructional help synced from Admin Global Template payload.guidance_text.';
COMMENT ON COLUMN sim.pm_template_field_links.guidance_text_override IS
    'Instructional help synced from Admin Global Template payload.guidance_text.';

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

    RETURN v_node_id;
END;
$$;

REVOKE ALL ON FUNCTION public._sync_global_template_node_for_account(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) FROM PUBLIC;

DO $$
BEGIN
  RAISE NOTICE 'v771_pm_template_field_links_guidance.sql applied';
END $$;
