-- ============================================================================
-- v1002: FIN Testing Strategy + Sanity Checks (fix / complete wire-up)
-- ============================================================================
-- Replaces the fragile v1001_fin_* seed that could abort when
-- public.grant_menu_role_group() is missing, rolling back the whole script —
-- which matches "hard refresh shows no change".
--
-- This script:
--   1) Requires fin_cat_testing_assurance + Banking pack (clear error if missing)
--   2) Upserts the two local_registers
--   3) Links them to the financial_services industry pack
--   4) Upserts menu_items under Testing & Assurance (sort: Strategy, SIT, Sanity, UAT…)
--   5) Copies role_menu_items from fin_reg_fin_sit (same visibility as SIT)
--   6) Wires industry_pack_menu_items so the pack-grouped sidebar keeps them
--
-- Safe to re-run. Run on the SAME Supabase project as Platform.
-- ============================================================================

DO $$
DECLARE
  v_cat_id UUID;
  v_pack_id UUID;
BEGIN
  SELECT id INTO v_cat_id
  FROM public.menu_items
  WHERE menu_code = 'fin_cat_testing_assurance'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_cat_id IS NULL THEN
    RAISE EXCEPTION
      'v1002: fin_cat_testing_assurance not found. Run SQL/v947_fin_banking_categories_and_registers_seed.sql on this project first.';
  END IF;

  SELECT ip.id INTO v_pack_id
  FROM public.industry_packs ip
  WHERE ip.pack_code = 'financial_services'
    AND COALESCE(ip.is_active, TRUE) = TRUE
  LIMIT 1;

  IF v_pack_id IS NULL THEN
    SELECT ip.id INTO v_pack_id
    FROM public.industry_packs ip
    JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
    WHERE ic.name = 'Banking & Financial Services'
    LIMIT 1;
  END IF;

  IF v_pack_id IS NULL THEN
    RAISE EXCEPTION
      'v1002: Banking & Financial Services industry pack not found. Confirm this is the Platform Supabase project.';
  END IF;
END $$;

-- ── 1. local_registers ────────────────────────────────────────────────────────

INSERT INTO public.local_registers (
  id, register_key, label, icon, description, scope_level, account_id,
  status_workflow, is_system_defined, is_active, created_at, updated_at
)
SELECT
  v.id::uuid, v.register_key, v.label, 'list-checks', v.description, 'project', NULL,
  v.status_workflow::jsonb, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  (
    '00000000-0000-4000-9001-00000000003f',
    'fin_testing_strategy',
    'Testing Strategy',
    'Overall testing strategy for the banking programme',
    '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'
  ),
  (
    '00000000-0000-4000-9001-000000000040',
    'fin_sanity_checks',
    'Sanity Checks',
    'Sanity / smoke checks between system and user acceptance testing',
    '[{"key":"not_started","label":"Not Started"},{"key":"in_progress","label":"In Progress"},{"key":"complete","label":"Complete"}]'
  )
) AS v(id, register_key, label, description, status_workflow)
ON CONFLICT (id) DO UPDATE SET
  register_key = EXCLUDED.register_key,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  status_workflow = EXCLUDED.status_workflow,
  is_active = TRUE,
  updated_at = NOW();

-- ── 2. Pack link (prefer pack_code; fall back to category name) ───────────────

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
CROSS JOIN LATERAL (
  SELECT id FROM public.industry_packs WHERE pack_code = 'financial_services' LIMIT 1
) ip
WHERE lr.id IN (
  '00000000-0000-4000-9001-00000000003f'::uuid,
  '00000000-0000-4000-9001-000000000040'::uuid
)
ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
SELECT lr.id, ip.id
FROM public.local_registers lr
JOIN public.industry_packs ip ON ip.industry_category_id = (
  SELECT id FROM public.industry_categories WHERE name = 'Banking & Financial Services' LIMIT 1
)
WHERE lr.id IN (
  '00000000-0000-4000-9001-00000000003f'::uuid,
  '00000000-0000-4000-9001-000000000040'::uuid
)
  AND NOT EXISTS (
    SELECT 1 FROM public.local_register_industry_packs x
    WHERE x.register_id = lr.id AND x.industry_pack_id = ip.id
  );

-- ── 3. Absolute sort orders (idempotent; safe to re-run) ─────────────────────
-- Target: Strategy 649 → SIT 650 → Sanity 651 → UAT 652 → … → OR Testing 657

UPDATE public.menu_items
SET sort_order = CASE menu_code
  WHEN 'fin_reg_fin_sit' THEN 650
  WHEN 'fin_reg_fin_uat' THEN 652
  WHEN 'fin_reg_fin_regression_testing' THEN 653
  WHEN 'fin_reg_fin_performance_testing' THEN 654
  WHEN 'fin_reg_fin_security_testing' THEN 655
  WHEN 'fin_reg_fin_dr_testing' THEN 656
  WHEN 'fin_reg_fin_operational_readiness_testing' THEN 657
  ELSE sort_order
END,
updated_at = NOW()
WHERE menu_code IN (
  'fin_reg_fin_sit',
  'fin_reg_fin_uat',
  'fin_reg_fin_regression_testing',
  'fin_reg_fin_performance_testing',
  'fin_reg_fin_security_testing',
  'fin_reg_fin_dr_testing',
  'fin_reg_fin_operational_readiness_testing'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- Keep all testing leaves under the category (fixes any stray parents)
UPDATE public.menu_items
SET parent_menu_id = (
      SELECT id FROM public.menu_items
      WHERE menu_code = 'fin_cat_testing_assurance'
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    ),
    menu_level = 2,
    updated_at = NOW()
WHERE menu_code IN (
  'fin_reg_fin_sit',
  'fin_reg_fin_uat',
  'fin_reg_fin_regression_testing',
  'fin_reg_fin_performance_testing',
  'fin_reg_fin_security_testing',
  'fin_reg_fin_dr_testing',
  'fin_reg_fin_operational_readiness_testing',
  'fin_reg_fin_testing_strategy',
  'fin_reg_fin_sanity_checks'
)
AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 4. menu_items for the two new registers ───────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id,
  menu_level, sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'fin_reg_' || lr.register_key,
  lr.label,
  lr.description,
  '/platform/local-registers/' || lr.id::text,
  (SELECT id FROM public.menu_items
   WHERE menu_code = 'fin_cat_testing_assurance'
     AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1),
  2,
  v.sort_order,
  'universal',
  'list-checks',
  TRUE,
  TRUE,
  NOW(),
  NOW()
FROM (VALUES
  ('00000000-0000-4000-9001-00000000003f', 649),
  ('00000000-0000-4000-9001-000000000040', 651)
) AS v(register_id, sort_order)
JOIN public.local_registers lr ON lr.id = v.register_id::uuid
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── 5. industry_pack_menu_items (must exist for Banking sidebar bucket) ───────

INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
SELECT DISTINCT lrip.industry_pack_id, mi.id
FROM public.local_register_industry_packs lrip
JOIN public.local_registers lr ON lr.id = lrip.register_id
JOIN public.menu_items mi ON mi.menu_code = 'fin_reg_' || lr.register_key
WHERE lr.id IN (
  '00000000-0000-4000-9001-00000000003f'::uuid,
  '00000000-0000-4000-9001-000000000040'::uuid
)
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

-- ── 6. Role grants — copy whoever already has SIT (no helper dependency) ──────

INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  sit_rmi.role_id,
  new_mi.id,
  COALESCE(sit_rmi.can_view, TRUE),
  COALESCE(sit_rmi.can_use, TRUE),
  TRUE,
  NOW(),
  NOW()
FROM public.menu_items new_mi
CROSS JOIN public.menu_items sit_mi
JOIN public.role_menu_items sit_rmi
  ON sit_rmi.menu_item_id = sit_mi.id
 AND COALESCE(sit_rmi.is_active, TRUE) = TRUE
WHERE new_mi.menu_code IN ('fin_reg_fin_testing_strategy', 'fin_reg_fin_sanity_checks')
  AND sit_mi.menu_code = 'fin_reg_fin_sit'
  AND COALESCE(new_mi.is_deleted, FALSE) = FALSE
  AND COALESCE(sit_mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE,
  can_use = TRUE,
  is_active = TRUE,
  updated_at = NOW();

-- Fallback if SIT has no grants yet: broad delivery-team role set (v934 style)
INSERT INTO public.role_menu_items (
  id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN ('fin_reg_fin_testing_strategy', 'fin_reg_fin_sanity_checks')
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.role_menu_items x
    WHERE x.role_id = r.id AND x.menu_item_id = mi.id
  );

-- ── 7. Verification (expect Strategy, SIT, Sanity, UAT… in that order) ────────

SELECT
  mi.sort_order,
  mi.menu_label,
  mi.menu_code,
  mi.is_active,
  mi.is_visible,
  (SELECT COUNT(*) FROM public.role_menu_items rmi
   WHERE rmi.menu_item_id = mi.id AND COALESCE(rmi.is_active, TRUE)) AS role_grants,
  (SELECT COUNT(*) FROM public.industry_pack_menu_items ipmi
   WHERE ipmi.menu_item_id = mi.id) AS pack_links
FROM public.menu_items mi
WHERE mi.parent_menu_id = (
  SELECT id FROM public.menu_items
  WHERE menu_code = 'fin_cat_testing_assurance'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1
)
AND COALESCE(mi.is_deleted, FALSE) = FALSE
ORDER BY mi.sort_order, mi.menu_label;

DO $$
BEGIN
  RAISE NOTICE 'v1002: Testing Strategy + Sanity Checks wired under Testing & Assurance';
END $$;
