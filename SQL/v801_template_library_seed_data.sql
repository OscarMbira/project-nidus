-- =============================================================================
-- v801: Template Library seed data (public + sim) — idempotent
-- Plan: projectplan/v798_template_library_menu_rationalisation_and_copy_plan.md
-- Prerequisites: v764+ pm_template_nodes, v785/v798 methodology, v795 domain_ref uniqueness
--
-- IMPORTANT: uq_pm_template_nodes_current_scope is per
--   (account, tier, domain, scope_entity_type, scope_entity_id, domain_ref_id).
-- Multiple library rows in the same tier/domain MUST use distinct domain_ref_id
-- (here: domain_ref_id = id, same pattern as global sync).
-- =============================================================================

DO $seed$
DECLARE
  v_account UUID;
  v_sim_account UUID;
BEGIN
  SELECT id INTO v_account
  FROM public.accounts
  WHERE COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF v_account IS NULL THEN
    RAISE NOTICE 'v801 seed skipped: no public.accounts row';
    RETURN;
  END IF;

  -- public: one row per (tier x methodology) with unique domain_ref_id (= id)
  INSERT INTO public.pm_template_nodes (
    id, account_id, tier, domain, domain_ref_id, source_global_template_id,
    name, description, category, methodology,
    status, version, is_current, is_system_synced, scope_entity_type
  ) VALUES
    ('a8010000-0000-4000-8000-000000000001', v_account, 'portfolio', 'fields',
     'a8010000-0000-4000-8000-000000000001', 'a8010000-0000-4000-8000-000000000001',
     'Seed Portfolio Fields - Structured', 'v801 seed', 'seed', 'structured',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000002', v_account, 'portfolio', 'fields',
     'a8010000-0000-4000-8000-000000000002', 'a8010000-0000-4000-8000-000000000002',
     'Seed Portfolio Fields - Standards-Based', 'v801 seed', 'seed', 'standards_based',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000003', v_account, 'portfolio', 'fields',
     'a8010000-0000-4000-8000-000000000003', 'a8010000-0000-4000-8000-000000000003',
     'Seed Portfolio Fields - Agile', 'v801 seed', 'seed', 'agile',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000004', v_account, 'portfolio', 'fields',
     'a8010000-0000-4000-8000-000000000004', 'a8010000-0000-4000-8000-000000000004',
     'Seed Portfolio Fields - Common', 'Always enabled', 'seed', NULL,
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000011', v_account, 'programme', 'fields',
     'a8010000-0000-4000-8000-000000000011', 'a8010000-0000-4000-8000-000000000011',
     'Seed Programme Fields - Structured', 'v801 seed', 'seed', 'structured',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000012', v_account, 'programme', 'fields',
     'a8010000-0000-4000-8000-000000000012', 'a8010000-0000-4000-8000-000000000012',
     'Seed Programme Fields - Standards-Based', 'v801 seed', 'seed', 'standards_based',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000013', v_account, 'programme', 'fields',
     'a8010000-0000-4000-8000-000000000013', 'a8010000-0000-4000-8000-000000000013',
     'Seed Programme Fields - Agile', 'v801 seed', 'seed', 'agile',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000014', v_account, 'programme', 'fields',
     'a8010000-0000-4000-8000-000000000014', 'a8010000-0000-4000-8000-000000000014',
     'Seed Programme Risk Register - Common', 'Always enabled', 'seed', NULL,
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000021', v_account, 'project', 'fields',
     'a8010000-0000-4000-8000-000000000021', 'a8010000-0000-4000-8000-000000000021',
     'Seed Project Fields - Structured', 'v801 seed', 'seed', 'structured',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000022', v_account, 'project', 'fields',
     'a8010000-0000-4000-8000-000000000022', 'a8010000-0000-4000-8000-000000000022',
     'Seed Project Fields - Standards-Based', 'v801 seed', 'seed', 'standards_based',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000023', v_account, 'project', 'fields',
     'a8010000-0000-4000-8000-000000000023', 'a8010000-0000-4000-8000-000000000023',
     'Seed Project Fields - Agile', 'v801 seed', 'seed', 'agile',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000024', v_account, 'project', 'fields',
     'a8010000-0000-4000-8000-000000000024', 'a8010000-0000-4000-8000-000000000024',
     'Seed Project Stakeholder Register - Common', 'Always enabled', 'seed', NULL,
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000031', v_account, 'pmo', 'form_template',
     'a8010000-0000-4000-8000-000000000031', 'a8010000-0000-4000-8000-000000000031',
     'Seed Form - Structured', 'v801 seed', 'seed', 'structured',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000032', v_account, 'pmo', 'form_template',
     'a8010000-0000-4000-8000-000000000032', 'a8010000-0000-4000-8000-000000000032',
     'Seed Form - Standards-Based', 'v801 seed', 'seed', 'standards_based',
     'published', 1, TRUE, TRUE, 'account'),
    ('a8010000-0000-4000-8000-000000000033', v_account, 'pmo', 'form_template',
     'a8010000-0000-4000-8000-000000000033', 'a8010000-0000-4000-8000-000000000033',
     'Seed Form - Agile', 'v801 seed', 'seed', 'agile',
     'published', 1, TRUE, TRUE, 'account')
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.portfolios
  SET delivery_methodology_track = 'agile', updated_at = NOW()
  WHERE id = (
    SELECT id FROM public.portfolios
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND delivery_methodology_track IS NULL
    ORDER BY created_at NULLS LAST
    LIMIT 1
  );

  UPDATE public.programmes
  SET delivery_methodology_track = 'structured', updated_at = NOW()
  WHERE id = (
    SELECT id FROM public.programmes
    WHERE COALESCE(is_deleted, FALSE) = FALSE
      AND delivery_methodology_track IS NULL
    ORDER BY created_at NULLS LAST
    LIMIT 1
  );

  SELECT id INTO v_sim_account
  FROM public.accounts
  WHERE COALESCE(is_deleted, FALSE) = FALSE
  ORDER BY created_at NULLS LAST
  LIMIT 1;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'pm_template_nodes'
  ) THEN
    INSERT INTO sim.pm_template_nodes (
      id, account_id, tier, domain, domain_ref_id, source_global_template_id,
      name, description, category, methodology,
      status, version, is_current, is_system_synced, scope_entity_type
    ) VALUES
      ('b8010000-0000-4000-8000-000000000001', v_sim_account, 'portfolio', 'fields',
       'b8010000-0000-4000-8000-000000000001', 'b8010000-0000-4000-8000-000000000001',
       'Sim Seed Portfolio Fields - Structured', 'v801 seed', 'seed', 'structured',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000002', v_sim_account, 'portfolio', 'fields',
       'b8010000-0000-4000-8000-000000000002', 'b8010000-0000-4000-8000-000000000002',
       'Sim Seed Portfolio Fields - Standards-Based', 'v801 seed', 'seed', 'standards_based',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000003', v_sim_account, 'portfolio', 'fields',
       'b8010000-0000-4000-8000-000000000003', 'b8010000-0000-4000-8000-000000000003',
       'Sim Seed Portfolio Fields - Agile', 'v801 seed', 'seed', 'agile',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000004', v_sim_account, 'portfolio', 'fields',
       'b8010000-0000-4000-8000-000000000004', 'b8010000-0000-4000-8000-000000000004',
       'Sim Seed Portfolio Fields - Common', 'Always enabled', 'seed', NULL,
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000011', v_sim_account, 'programme', 'fields',
       'b8010000-0000-4000-8000-000000000011', 'b8010000-0000-4000-8000-000000000011',
       'Sim Seed Programme Fields - Structured', 'v801 seed', 'seed', 'structured',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000012', v_sim_account, 'programme', 'fields',
       'b8010000-0000-4000-8000-000000000012', 'b8010000-0000-4000-8000-000000000012',
       'Sim Seed Programme Fields - Standards-Based', 'v801 seed', 'seed', 'standards_based',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000013', v_sim_account, 'programme', 'fields',
       'b8010000-0000-4000-8000-000000000013', 'b8010000-0000-4000-8000-000000000013',
       'Sim Seed Programme Fields - Agile', 'v801 seed', 'seed', 'agile',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000014', v_sim_account, 'programme', 'fields',
       'b8010000-0000-4000-8000-000000000014', 'b8010000-0000-4000-8000-000000000014',
       'Sim Seed Programme Common', 'Always enabled', 'seed', NULL,
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000021', v_sim_account, 'project', 'fields',
       'b8010000-0000-4000-8000-000000000021', 'b8010000-0000-4000-8000-000000000021',
       'Sim Seed Project Fields - Structured', 'v801 seed', 'seed', 'structured',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000022', v_sim_account, 'project', 'fields',
       'b8010000-0000-4000-8000-000000000022', 'b8010000-0000-4000-8000-000000000022',
       'Sim Seed Project Fields - Standards-Based', 'v801 seed', 'seed', 'standards_based',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000023', v_sim_account, 'project', 'fields',
       'b8010000-0000-4000-8000-000000000023', 'b8010000-0000-4000-8000-000000000023',
       'Sim Seed Project Fields - Agile', 'v801 seed', 'seed', 'agile',
       'published', 1, TRUE, TRUE, 'account'),
      ('b8010000-0000-4000-8000-000000000024', v_sim_account, 'project', 'fields',
       'b8010000-0000-4000-8000-000000000024', 'b8010000-0000-4000-8000-000000000024',
       'Sim Seed Project Common', 'Always enabled', 'seed', NULL,
       'published', 1, TRUE, TRUE, 'account')
    ON CONFLICT (id) DO NOTHING;

    UPDATE sim.practice_portfolios
    SET delivery_methodology_track = 'agile', updated_at = NOW()
    WHERE id = (
      SELECT id FROM sim.practice_portfolios
      WHERE COALESCE(is_deleted, FALSE) = FALSE
        AND delivery_methodology_track IS NULL
      ORDER BY created_at NULLS LAST
      LIMIT 1
    );

    UPDATE sim.practice_programmes
    SET delivery_methodology_track = 'structured', updated_at = NOW()
    WHERE id = (
      SELECT id FROM sim.practice_programmes
      WHERE COALESCE(is_deleted, FALSE) = FALSE
        AND delivery_methodology_track IS NULL
      ORDER BY created_at NULLS LAST
      LIMIT 1
    );
  END IF;

  RAISE NOTICE 'v801_template_library_seed_data.sql applied for account %', v_account;
END
$seed$;
