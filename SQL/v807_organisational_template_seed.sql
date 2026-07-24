-- =============================================================================
-- v807b: Seed data — Global tier-template coverage for the new methodology-
-- grouped Organisational Templates sidebar (SQL/v807_organisational_templates_
-- methodology_sidebar.sql). Rule 18.2 companion seed file.
--
-- Without this, the 9 new sidebar leaves (Portfolio/Programme/Project x
-- Structured/Standards-Based/Agile) render empty — there is no existing Global
-- coverage for portfolio_template/programme_template/project_template across
-- all three methodologies to bulk-copy from.
--
-- Uses the existing public.sync_global_template_node() RPC (SQL/v785), which
-- fans a "global" template out to every account in both public and sim
-- schemas when p_target='both' — one call per file covers Platform AND
-- Simulator, matching how all other Global Template Library content is
-- already seeded. This does NOT fabricate per-account customisations (see
-- the plan's Phase 2b note) — only Global (is_system_synced=true) rows.
--
-- Idempotent: fixed hex UUIDs as p_global_template_id — re-running updates
-- the same synced rows rather than duplicating them (v785's own dedupe key
-- is source_global_template_id).
--
-- p_methodology values are 'structured' | 'standards_based' | 'agile'.
-- CORRECTION: an earlier draft of this file used 'pmbok' here, based on
-- SQL/v785's original CHECK constraint. SQL/v798 (found after that draft was
-- first tested against a live DB — see the "Invalid methodology: pmbok"
-- error it raised) later renamed the STORED identifier itself from 'pmbok'
-- to 'standards_based' (not just the display label, which SQL/v797 renamed
-- earlier) — both the CHECK constraints and sync_global_template_node's own
-- validation (`v_methodology NOT IN ('standards_based','structured','agile')`)
-- now reject 'pmbok' outright. 'standards_based' is correct here.
-- =============================================================================

-- Portfolio ------------------------------------------------------------------
SELECT public.sync_global_template_node(
  '00000000-0000-4807-8001-000000000001'::uuid, 'portfolio_template',
  'Demo Portfolio Charter (Structured)', 'Seed: organisational-copyable Portfolio template, Structured track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_portfolio_structured'), 'structured', 'both'
);

SELECT public.sync_global_template_node(
  '00000000-0000-4807-8001-000000000002'::uuid, 'portfolio_template',
  'Demo Portfolio Charter (Standards-Based)', 'Seed: organisational-copyable Portfolio template, Standards-Based track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_portfolio_standards_based'), 'standards_based', 'both'
);

SELECT public.sync_global_template_node(
  '00000000-0000-4807-8001-000000000003'::uuid, 'portfolio_template',
  'Demo Portfolio Charter (Agile)', 'Seed: organisational-copyable Portfolio template, Agile track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_portfolio_agile'), 'agile', 'both'
);

-- Programme --------------------------------------------------------------
SELECT public.sync_global_template_node(
  '00000000-0000-4807-8002-000000000001'::uuid, 'programme_template',
  'Demo Programme Charter (Structured)', 'Seed: organisational-copyable Programme template, Structured track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_programme_structured'), 'structured', 'both'
);

SELECT public.sync_global_template_node(
  '00000000-0000-4807-8002-000000000002'::uuid, 'programme_template',
  'Demo Programme Charter (Standards-Based)', 'Seed: organisational-copyable Programme template, Standards-Based track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_programme_standards_based'), 'standards_based', 'both'
);

SELECT public.sync_global_template_node(
  '00000000-0000-4807-8002-000000000003'::uuid, 'programme_template',
  'Demo Programme Charter (Agile)', 'Seed: organisational-copyable Programme template, Agile track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_programme_agile'), 'agile', 'both'
);

-- Project ------------------------------------------------------------------
SELECT public.sync_global_template_node(
  '00000000-0000-4807-8003-000000000001'::uuid, 'project_template',
  'Demo Project Charter (Structured)', 'Seed: organisational-copyable Project template, Structured track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_project_structured'), 'structured', 'both'
);

SELECT public.sync_global_template_node(
  '00000000-0000-4807-8003-000000000002'::uuid, 'project_template',
  'Demo Project Charter (Standards-Based)', 'Seed: organisational-copyable Project template, Standards-Based track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_project_standards_based'), 'standards_based', 'both'
);

SELECT public.sync_global_template_node(
  '00000000-0000-4807-8003-000000000003'::uuid, 'project_template',
  'Demo Project Charter (Agile)', 'Seed: organisational-copyable Project template, Agile track',
  NULL, 1, jsonb_build_object('template_code', 'v807_seed_project_agile'), 'agile', 'both'
);

DO $$
BEGIN
  RAISE NOTICE 'v807_organisational_template_seed.sql applied';
END $$;
