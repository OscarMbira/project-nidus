-- =============================================================================
-- v798: Rename internal methodology identifier pmbok → standards_based
-- (Platform + Simulator: public + sim)
-- Plan: projectplan/v797_pmbok_internal_identifier_rename_plan.md
-- Companion Admin: project-nidus-admin SQL/v196_rename_pmbok_methodology_to_standards_based.sql
-- Apply BEFORE or WITH Admin v196 in the same deploy window.
-- Prerequisites: v785, v795 (outer sync body base), v671–v673 CHECKs
-- Order: DROP old CHECKs → UPDATE rows → ADD new CHECKs (required: existing
--   methodology='pmbok' rows would violate the new CHECK if added first).
-- Idempotent: safe to re-run after a partial failure on the first ADD.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Drop old CHECKs that still allow 'pmbok'
-- ---------------------------------------------------------------------------
ALTER TABLE public.pm_template_nodes DROP CONSTRAINT IF EXISTS chk_pm_template_nodes_methodology;
ALTER TABLE sim.pm_template_nodes DROP CONSTRAINT IF EXISTS chk_sim_pm_template_nodes_methodology;
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS chk_menu_items_methodology;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_delivery_methodology_track;
ALTER TABLE sim.practice_projects DROP CONSTRAINT IF EXISTS chk_practice_projects_delivery_methodology_track;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS chk_accounts_default_methodology;
ALTER TABLE sim.learning_paths DROP CONSTRAINT IF EXISTS chk_sim_learning_paths_methodology;
ALTER TABLE sim.scenarios DROP CONSTRAINT IF EXISTS chk_sim_scenarios_methodology;
ALTER TABLE sim.custom_scenarios DROP CONSTRAINT IF EXISTS chk_sim_custom_scenarios_methodology;

DO $drop$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT nsp.nspname AS sch, rel.relname AS tbl, con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.contype = 'c'
      AND nsp.nspname = 'sim'
      AND rel.relname IN ('learning_paths', 'scenarios', 'custom_scenarios')
      AND pg_get_constraintdef(con.oid) ILIKE '%pmbok%'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.sch, r.tbl, r.conname);
  END LOOP;
END
$drop$;

-- ---------------------------------------------------------------------------
-- 2) Migrate data while CHECKs are off
-- ---------------------------------------------------------------------------
-- Include soft-deleted rows — CHECKs apply to every row, not only live ones.
UPDATE public.menu_items
SET
  menu_code = CASE
    WHEN menu_code LIKE '%pmbok%' THEN REPLACE(menu_code, 'pmbok', 'standards_based')
    ELSE menu_code
  END,
  methodology = CASE
    WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
    WHEN lower(trim(COALESCE(methodology, ''))) IN ('structured', 'standards_based', 'agile', 'universal')
      THEN lower(trim(methodology))
    WHEN methodology IS NULL OR trim(methodology) = '' THEN NULL
    ELSE NULL  -- drop unknown values that would fail the new CHECK
  END,
  updated_at = NOW()
WHERE menu_code LIKE '%pmbok%'
   OR lower(trim(COALESCE(methodology, ''))) = 'pmbok'
   OR lower(trim(COALESCE(methodology, ''))) = 'waterfall-pmbok'
   OR (
     methodology IS NOT NULL
     AND trim(methodology) <> ''
     AND lower(trim(methodology)) NOT IN ('structured', 'standards_based', 'agile', 'universal', 'pmbok', 'waterfall-pmbok')
   );

-- Final sweep: any remaining non-allowed methodology (defensive)
UPDATE public.menu_items
SET methodology = CASE
  WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
  WHEN methodology IS NOT NULL
    AND lower(trim(methodology)) NOT IN ('structured', 'standards_based', 'agile', 'universal')
    THEN NULL
  ELSE methodology
END
WHERE methodology IS NOT NULL
  AND lower(trim(methodology)) NOT IN ('structured', 'standards_based', 'agile', 'universal');

UPDATE public.pm_template_nodes
SET methodology = CASE
  WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
  WHEN methodology IS NOT NULL
    AND lower(trim(methodology)) NOT IN ('standards_based', 'structured', 'agile')
    THEN NULL
  ELSE lower(trim(methodology))
END,
updated_at = NOW()
WHERE methodology IS NOT NULL
  AND lower(trim(methodology)) NOT IN ('standards_based', 'structured', 'agile');

UPDATE sim.pm_template_nodes
SET methodology = CASE
  WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
  WHEN methodology IS NOT NULL
    AND lower(trim(methodology)) NOT IN ('standards_based', 'structured', 'agile')
    THEN NULL
  ELSE lower(trim(methodology))
END,
updated_at = NOW()
WHERE methodology IS NOT NULL
  AND lower(trim(methodology)) NOT IN ('standards_based', 'structured', 'agile');

UPDATE public.accounts
SET default_methodology = CASE
  WHEN lower(trim(COALESCE(default_methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
  WHEN lower(trim(COALESCE(default_methodology, ''))) IN ('structured', 'standards_based', 'agile', 'hybrid')
    THEN lower(trim(default_methodology))
  ELSE 'hybrid'
END,
updated_at = NOW()
WHERE default_methodology IS NULL
   OR lower(trim(default_methodology)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid');

UPDATE public.projects
SET delivery_methodology_track = CASE
  WHEN lower(trim(COALESCE(delivery_methodology_track, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
  WHEN delivery_methodology_track IS NOT NULL
    AND lower(trim(delivery_methodology_track)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid')
    THEN NULL
  ELSE lower(trim(delivery_methodology_track))
END,
updated_at = NOW()
WHERE delivery_methodology_track IS NOT NULL
  AND lower(trim(delivery_methodology_track)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid');

UPDATE sim.practice_projects
SET delivery_methodology_track = CASE
  WHEN lower(trim(COALESCE(delivery_methodology_track, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
  WHEN delivery_methodology_track IS NOT NULL
    AND lower(trim(delivery_methodology_track)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid')
    THEN NULL
  ELSE lower(trim(delivery_methodology_track))
END,
updated_at = NOW()
WHERE delivery_methodology_track IS NOT NULL
  AND lower(trim(delivery_methodology_track)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid');

UPDATE sim.simulation_runs
SET delivery_methodology_track = CASE
  WHEN lower(trim(COALESCE(delivery_methodology_track, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
  WHEN delivery_methodology_track IS NOT NULL
    AND lower(trim(delivery_methodology_track)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid')
    THEN NULL
  ELSE lower(trim(delivery_methodology_track))
END
WHERE delivery_methodology_track IS NOT NULL
  AND lower(trim(delivery_methodology_track)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid');

-- sim learning / scenarios / custom_scenarios — full sanitize (not exact-match only)
DO $simdata$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'learning_paths' AND column_name = 'methodology'
  ) THEN
    EXECUTE $u$
      UPDATE sim.learning_paths
      SET methodology = CASE
        WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
        WHEN methodology IS NULL OR trim(methodology) = '' THEN NULL
        WHEN lower(trim(methodology)) IN ('structured', 'standards_based', 'agile', 'universal')
          THEN lower(trim(methodology))
        ELSE NULL
      END
      WHERE methodology IS NOT NULL
        AND lower(trim(methodology)) NOT IN ('structured', 'standards_based', 'agile', 'universal')
    $u$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'scenarios' AND column_name = 'methodology'
  ) THEN
    EXECUTE $u$
      UPDATE sim.scenarios
      SET methodology = CASE
        WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
        WHEN methodology IS NULL OR trim(methodology) = '' THEN NULL
        WHEN lower(trim(methodology)) IN ('structured', 'standards_based', 'agile', 'hybrid')
          THEN lower(trim(methodology))
        ELSE NULL
      END
      WHERE methodology IS NOT NULL
        AND lower(trim(methodology)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid')
    $u$;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'custom_scenarios' AND column_name = 'methodology'
  ) THEN
    EXECUTE $u$
      UPDATE sim.custom_scenarios
      SET methodology = CASE
        WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
        WHEN methodology IS NULL OR trim(methodology) = '' THEN NULL
        WHEN lower(trim(methodology)) IN ('structured', 'standards_based', 'agile', 'hybrid')
          THEN lower(trim(methodology))
        ELSE NULL
      END
      WHERE methodology IS NOT NULL
        AND lower(trim(methodology)) NOT IN ('structured', 'standards_based', 'agile', 'hybrid')
    $u$;
  END IF;
END
$simdata$;

-- ---------------------------------------------------------------------------
-- 3) Add new CHECKs (data already uses standards_based)
-- Idempotent: DROP again in case a prior partial run left some constraints on.
-- ---------------------------------------------------------------------------
ALTER TABLE public.pm_template_nodes DROP CONSTRAINT IF EXISTS chk_pm_template_nodes_methodology;
ALTER TABLE public.pm_template_nodes
  ADD CONSTRAINT chk_pm_template_nodes_methodology CHECK (
    methodology IS NULL OR methodology IN ('standards_based', 'structured', 'agile')
  );

ALTER TABLE sim.pm_template_nodes DROP CONSTRAINT IF EXISTS chk_sim_pm_template_nodes_methodology;
ALTER TABLE sim.pm_template_nodes
  ADD CONSTRAINT chk_sim_pm_template_nodes_methodology CHECK (
    methodology IS NULL OR methodology IN ('standards_based', 'structured', 'agile')
  );

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS chk_menu_items_methodology;
ALTER TABLE public.menu_items
  ADD CONSTRAINT chk_menu_items_methodology CHECK (
    methodology IS NULL
    OR methodology IN ('structured', 'standards_based', 'agile', 'universal')
  );

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS chk_projects_delivery_methodology_track;
ALTER TABLE public.projects
  ADD CONSTRAINT chk_projects_delivery_methodology_track CHECK (
    delivery_methodology_track IS NULL
    OR delivery_methodology_track IN ('structured', 'standards_based', 'agile', 'hybrid')
  );

ALTER TABLE sim.practice_projects DROP CONSTRAINT IF EXISTS chk_practice_projects_delivery_methodology_track;
ALTER TABLE sim.practice_projects
  ADD CONSTRAINT chk_practice_projects_delivery_methodology_track CHECK (
    delivery_methodology_track IS NULL
    OR delivery_methodology_track IN ('structured', 'standards_based', 'agile', 'hybrid')
  );

ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS chk_accounts_default_methodology;
ALTER TABLE public.accounts
  ADD CONSTRAINT chk_accounts_default_methodology CHECK (
    default_methodology IN ('structured', 'standards_based', 'agile', 'hybrid')
  );

DO $add$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'learning_paths' AND column_name = 'methodology'
  ) THEN
    UPDATE sim.learning_paths
    SET methodology = CASE
      WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
      WHEN methodology IS NULL OR btrim(methodology) = '' THEN NULL
      WHEN lower(btrim(methodology)) IN ('structured', 'standards_based', 'agile', 'universal')
        THEN lower(btrim(methodology))
      ELSE NULL
    END;

    BEGIN
      ALTER TABLE sim.learning_paths DROP CONSTRAINT IF EXISTS chk_sim_learning_paths_methodology;
      ALTER TABLE sim.learning_paths
        ADD CONSTRAINT chk_sim_learning_paths_methodology
        CHECK (methodology IS NULL OR methodology IN ('structured','standards_based','agile','universal'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$add$;

DO $add2$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'scenarios' AND column_name = 'methodology'
  ) THEN
    -- Sanitize every row immediately before ADD (covers whitespace / case / unknown values)
    UPDATE sim.scenarios
    SET methodology = CASE
      WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
      WHEN methodology IS NULL OR btrim(methodology) = '' THEN NULL
      WHEN lower(btrim(methodology)) IN ('structured', 'standards_based', 'agile', 'hybrid')
        THEN lower(btrim(methodology))
      ELSE NULL
    END;

    BEGIN
      ALTER TABLE sim.scenarios DROP CONSTRAINT IF EXISTS chk_sim_scenarios_methodology;
      ALTER TABLE sim.scenarios
        ADD CONSTRAINT chk_sim_scenarios_methodology
        CHECK (methodology IS NULL OR methodology IN ('structured','standards_based','agile','hybrid'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$add2$;

DO $add3$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim' AND table_name = 'custom_scenarios' AND column_name = 'methodology'
  ) THEN
    UPDATE sim.custom_scenarios
    SET methodology = CASE
      WHEN lower(trim(COALESCE(methodology, ''))) IN ('pmbok', 'waterfall-pmbok') THEN 'standards_based'
      WHEN methodology IS NULL OR btrim(methodology) = '' THEN NULL
      WHEN lower(btrim(methodology)) IN ('structured', 'standards_based', 'agile', 'hybrid')
        THEN lower(btrim(methodology))
      ELSE NULL
    END;

    BEGIN
      ALTER TABLE sim.custom_scenarios DROP CONSTRAINT IF EXISTS chk_sim_custom_scenarios_methodology;
      ALTER TABLE sim.custom_scenarios
        ADD CONSTRAINT chk_sim_custom_scenarios_methodology
        CHECK (methodology IS NULL OR methodology IN ('structured','standards_based','agile','hybrid'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$add3$;

COMMENT ON COLUMN public.menu_items.methodology IS
  'Sidebar track: structured | standards_based | agile | universal (null = infer at runtime)';
COMMENT ON COLUMN public.pm_template_nodes.methodology IS
  'Track: standards_based | structured | agile (nullable)';
COMMENT ON COLUMN sim.pm_template_nodes.methodology IS
  'Track: standards_based | structured | agile (nullable)';

-- Re-issue sync functions (helper from v785 + outer from v795)

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
    p_domain_ref_id UUID DEFAULT NULL,
    p_methodology TEXT DEFAULT NULL
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
    v_tier TEXT;
    v_methodology TEXT;
BEGIN
    IF p_schema NOT IN ('public', 'sim') THEN
        RAISE EXCEPTION 'Invalid schema: %', p_schema;
    END IF;

    v_methodology := NULLIF(lower(trim(COALESCE(p_methodology, ''))), '');
    IF v_methodology IS NOT NULL AND v_methodology NOT IN ('standards_based', 'structured', 'agile') THEN
        RAISE EXCEPTION 'Invalid methodology: %', p_methodology;
    END IF;

    v_tier := CASE p_domain
        WHEN 'portfolio_template' THEN 'portfolio'
        WHEN 'programme_template' THEN 'programme'
        WHEN 'project_template' THEN 'project'
        ELSE 'pmo'
    END;

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
                name, description, category, methodology,
                status, version, is_current, is_system_synced,
                source_global_template_id
             ) VALUES (
                $1, $2, $3, $4, NULL,
                ''account'', NULL,
                $5, $6, $7, $8,
                ''published'', GREATEST(COALESCE($9, 1), 1), TRUE, TRUE,
                $10
             ) RETURNING id',
            p_schema
        ) INTO v_node_id
        USING
            p_account_id, v_tier, p_domain, p_domain_ref_id,
            p_name, p_description, p_category, v_methodology,
            p_version, p_global_template_id;
    ELSE
        EXECUTE format(
            'UPDATE %I.pm_template_nodes SET
                tier = $2,
                domain = $3,
                domain_ref_id = COALESCE($4, domain_ref_id),
                name = $5,
                description = $6,
                category = $7,
                methodology = $8,
                status = ''published'',
                version = GREATEST(COALESCE($9, 1), 1),
                is_current = TRUE,
                updated_at = NOW()
             WHERE id = $1',
            p_schema
        ) USING
            v_node_id, v_tier, p_domain, p_domain_ref_id,
            p_name, p_description, p_category, v_methodology, p_version;
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

DROP FUNCTION IF EXISTS public._sync_global_template_node_for_account(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, UUID);
REVOKE ALL ON FUNCTION public._sync_global_template_node_for_account(TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, UUID, TEXT) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 4) Outer sync RPC — project_template + p_methodology
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT);
DROP FUNCTION IF EXISTS sim.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT);


CREATE OR REPLACE FUNCTION public.sync_global_template_node(
    p_global_template_id UUID,
    p_domain TEXT,
    p_name TEXT,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_version INTEGER DEFAULT 1,
    p_payload JSONB DEFAULT NULL,
    p_methodology TEXT DEFAULT NULL,
    p_target TEXT DEFAULT 'both'
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
    v_target TEXT := lower(trim(COALESCE(p_target, 'both')));
    v_industry_code TEXT;
    v_methodology TEXT;
BEGIN
    IF v_target NOT IN ('platform', 'simulator', 'both') THEN
        RAISE EXCEPTION 'Invalid sync target: % (use platform, simulator, or both)', p_target;
    END IF;
    IF p_global_template_id IS NULL THEN
        RAISE EXCEPTION 'global_template_id is required';
    END IF;
    IF p_domain IS NULL OR p_domain NOT IN (
        'fields', 'form_template', 'industry_plan', 'opa', 'process_template',
        'legacy_document', 'structured_list',
        'portfolio_template', 'programme_template', 'project_template'
    ) THEN
        RAISE EXCEPTION 'Invalid domain: %', p_domain;
    END IF;
    IF NULLIF(trim(COALESCE(p_name, '')), '') IS NULL THEN
        RAISE EXCEPTION 'name is required';
    END IF;

    v_methodology := NULLIF(lower(trim(COALESCE(p_methodology, ''))), '');
    IF v_methodology IS NOT NULL AND v_methodology NOT IN ('standards_based', 'structured', 'agile') THEN
        RAISE EXCEPTION 'Invalid methodology: %', p_methodology;
    END IF;

    IF p_domain = 'industry_plan' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        IF jsonb_typeof(v_payload) <> 'object' THEN
            RAISE EXCEPTION 'industry_plan payload must be a JSON object';
        END IF;
        v_industry_code := NULLIF(trim(COALESCE(v_payload->>'industry_code', '')), '');
        IF v_industry_code IS NULL THEN
            RAISE EXCEPTION 'industry_plan payload.industry_code is required';
        END IF;
        IF v_target IN ('platform', 'both') THEN
            v_template_id := public._sync_global_industry_template_catalog(
                v_payload, trim(p_name), p_description
            );
        ELSE
            SELECT id INTO v_template_id
            FROM public.pmo_industry_templates
            WHERE industry_code = v_industry_code
              AND COALESCE(is_deleted, FALSE) = FALSE
            LIMIT 1;
        END IF;
    ELSIF p_domain = 'legacy_document' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        IF v_target IN ('platform', 'both') THEN
            v_template_id := public._sync_global_legacy_document_catalog(
                p_global_template_id, v_payload, trim(p_name), p_description
            );
        ELSE
            SELECT id INTO v_template_id
            FROM public.pmo_legacy_document_templates
            WHERE global_template_id = p_global_template_id
            LIMIT 1;
        END IF;
    ELSIF p_domain = 'structured_list' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        IF v_target IN ('platform', 'both') THEN
            v_template_id := public._sync_global_structured_list_catalog(
                p_global_template_id, v_payload, trim(p_name)
            );
        ELSE
            SELECT id INTO v_template_id
            FROM public.pmo_legacy_structured_lists
            WHERE global_template_id = p_global_template_id
            LIMIT 1;
        END IF;
    ELSIF p_domain = 'form_template' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_form_template_catalog(
            p_global_template_id, v_payload, trim(p_name), v_target
        );
    ELSIF p_domain = 'opa' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_opa_catalog(
            p_global_template_id, v_payload, trim(p_name), v_target
        );
    ELSIF p_domain = 'process_template' THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        v_template_id := public._sync_global_process_template_catalog(
            p_global_template_id, v_payload, trim(p_name), v_target
        );
    ELSIF p_domain IN ('portfolio_template', 'programme_template', 'project_template') THEN
        v_payload := COALESCE(p_payload, '{}'::jsonb);
        IF jsonb_typeof(v_payload) <> 'object' THEN
            RAISE EXCEPTION '% payload must be a JSON object', p_domain;
        END IF;
        IF NULLIF(trim(COALESCE(v_payload->>'template_code', '')), '') IS NULL THEN
            RAISE EXCEPTION '% payload.template_code is required', p_domain;
        END IF;
        -- Per-document slot under uq_pm_template_nodes_current_scope (v774).
        -- No separate catalog table — use the Admin global template id.
        v_template_id := p_global_template_id;
    ELSE
        v_payload := COALESCE(p_payload, '[]'::jsonb);
    END IF;

    FOR v_account IN
        SELECT a.id
        FROM public.accounts a
        WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    LOOP
        IF v_target IN ('platform', 'both') THEN
            v_public_node := public._sync_global_template_node_for_account(
                'public', v_account.id, p_global_template_id, p_domain,
                trim(p_name), p_description, p_category, p_version,
                v_payload, v_template_id, v_methodology
            );
            IF v_first_node IS NULL THEN
                v_first_node := v_public_node;
            END IF;
        END IF;
        IF v_target IN ('simulator', 'both') THEN
            v_sim_node := public._sync_global_template_node_for_account(
                'sim', v_account.id, p_global_template_id, p_domain,
                trim(p_name), p_description, p_category, p_version,
                v_payload, v_template_id, v_methodology
            );
            IF v_first_node IS NULL THEN
                v_first_node := v_sim_node;
            END IF;
        END IF;
        v_accounts := v_accounts + 1;
    END LOOP;

    IF v_target IN ('platform', 'both')
       AND p_domain = 'form_template'
       AND v_template_id IS NOT NULL
       AND v_first_node IS NOT NULL
    THEN
        UPDATE public.form_templates
        SET pm_template_node_id = COALESCE(pm_template_node_id, v_first_node),
            updated_at = NOW()
        WHERE id = v_template_id;
    END IF;
    IF v_target IN ('platform', 'both')
       AND p_domain = 'opa'
       AND v_template_id IS NOT NULL
       AND v_first_node IS NOT NULL
    THEN
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
        'methodology', v_methodology,
        'version', GREATEST(COALESCE(p_version, 1), 1),
        'catalog_ref_id', v_template_id,
        'target', v_target
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
    p_payload JSONB DEFAULT NULL,
    p_methodology TEXT DEFAULT NULL,
    p_target TEXT DEFAULT 'both'
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, sim
AS $$
    SELECT public.sync_global_template_node(
        p_global_template_id, p_domain, p_name, p_description,
        p_category, p_version, p_payload, p_methodology, p_target
    );
$$;

REVOKE ALL ON FUNCTION public.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION sim.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION sim.sync_global_template_node(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT, TEXT) TO service_role;

DO $$
BEGIN
  RAISE NOTICE 'v798_rename_pmbok_identifier_standards_based.sql applied';
END $$;
