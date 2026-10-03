-- ============================================================================
-- v1004: FIN Dress Rehearsal Strategy — hard fix (copy from Security Testing)
-- ============================================================================
-- Why hard-refresh alone never shows this: menu labels come from the DB.
-- This script inserts the leaf and mirrors EVERYTHING from Security Testing:
--   same parent, same industry_pack_menu_items packs, same role_menu_items.
--
-- Target order under Testing & Assurance:
--   … → Security Testing → Dress Rehearsal Strategy → DR Testing → …
--
-- Safe to re-run. Must run in Supabase SQL Editor on the Platform project
-- (the one where Testing Strategy / Sanity Checks already appear).
-- ============================================================================

DO $$
DECLARE
  v_cat_id          UUID;
  v_sec_id          UUID;
  v_new_id          UUID;
  v_register_id     UUID := '00000000-0000-4000-9001-000000000041'::uuid;
  v_menu_code       TEXT := 'fin_reg_fin_dress_rehearsal_strategy';
  v_pack_links      INT;
  v_role_grants     INT;
BEGIN
  SELECT id INTO v_cat_id
  FROM public.menu_items
  WHERE menu_code = 'fin_cat_testing_assurance'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_cat_id IS NULL THEN
    RAISE EXCEPTION
      'v1004 aborted: fin_cat_testing_assurance missing. Wrong Supabase project, or v947 not applied.';
  END IF;

  SELECT id INTO v_sec_id
  FROM public.menu_items
  WHERE menu_code = 'fin_reg_fin_security_testing'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_sec_id IS NULL THEN
    RAISE EXCEPTION
      'v1004 aborted: fin_reg_fin_security_testing missing. Wrong project or FIN seed incomplete.';
  END IF;

  -- 1) Register definition
  INSERT INTO public.local_registers (
    id, register_key, label, icon, description, scope_level, account_id,
    status_workflow, is_system_defined, is_active, created_at, updated_at
  ) VALUES (
    v_register_id,
    'fin_dress_rehearsal_strategy',
    'Dress Rehearsal Strategy',
    'list-checks',
    'Dress rehearsal strategy for go-live cutover and DR readiness',
    'project',
    NULL,
    '[{"key":"draft","label":"Draft"},{"key":"approved","label":"Approved"}]'::jsonb,
    TRUE,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    register_key = EXCLUDED.register_key,
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    status_workflow = EXCLUDED.status_workflow,
    is_active = TRUE,
    is_deleted = FALSE,
    updated_at = NOW();

  -- 2) Pack links — same packs as Security Testing's register (via its menu route)
  INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
  SELECT DISTINCT v_register_id, ipmi.industry_pack_id
  FROM public.industry_pack_menu_items ipmi
  WHERE ipmi.menu_item_id = v_sec_id
  ON CONFLICT (register_id, industry_pack_id) DO NOTHING;

  -- Fallback if Security has no pack rows yet: financial_services / Banking category
  IF NOT EXISTS (
    SELECT 1 FROM public.local_register_industry_packs WHERE register_id = v_register_id
  ) THEN
    INSERT INTO public.local_register_industry_packs (register_id, industry_pack_id)
    SELECT v_register_id, ip.id
    FROM public.industry_packs ip
    WHERE ip.pack_code = 'financial_services'
       OR ip.industry_category_id = (
            SELECT id FROM public.industry_categories
            WHERE name = 'Banking & Financial Services' LIMIT 1
          )
    ON CONFLICT (register_id, industry_pack_id) DO NOTHING;
  END IF;

  -- 3) Sort: Security 655 → Dress Rehearsal 656 → DR 657 → OR Testing 658
  UPDATE public.menu_items
  SET sort_order = CASE menu_code
        WHEN 'fin_reg_fin_security_testing' THEN 655
        WHEN 'fin_reg_fin_dr_testing' THEN 657
        WHEN 'fin_reg_fin_operational_readiness_testing' THEN 658
        ELSE sort_order
      END,
      updated_at = NOW()
  WHERE menu_code IN (
    'fin_reg_fin_security_testing',
    'fin_reg_fin_dr_testing',
    'fin_reg_fin_operational_readiness_testing'
  )
  AND COALESCE(is_deleted, FALSE) = FALSE;

  -- 4) Menu leaf
  INSERT INTO public.menu_items (
    id, menu_code, menu_label, menu_description, route_path, parent_menu_id,
    menu_level, sort_order, methodology, menu_icon, is_active, is_visible,
    created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    v_menu_code,
    lr.label,
    lr.description,
    '/platform/local-registers/' || lr.id::text,
    v_cat_id,
    2,
    656,
    'universal',
    'list-checks',
    TRUE,
    TRUE,
    NOW(),
    NOW()
  FROM public.local_registers lr
  WHERE lr.id = v_register_id
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

  SELECT id INTO v_new_id
  FROM public.menu_items
  WHERE menu_code = v_menu_code
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_new_id IS NULL THEN
    RAISE EXCEPTION 'v1004 aborted: menu_items row was not created for %', v_menu_code;
  END IF;

  -- 5) industry_pack_menu_items — copy Security Testing's packs (required for Banking bucket)
  INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
  SELECT DISTINCT ipmi.industry_pack_id, v_new_id
  FROM public.industry_pack_menu_items ipmi
  WHERE ipmi.menu_item_id = v_sec_id
  ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

  INSERT INTO public.industry_pack_menu_items (industry_pack_id, menu_item_id)
  SELECT DISTINCT lrip.industry_pack_id, v_new_id
  FROM public.local_register_industry_packs lrip
  WHERE lrip.register_id = v_register_id
  ON CONFLICT (industry_pack_id, menu_item_id) DO NOTHING;

  -- 6) Role grants — copy Security Testing (same visibility)
  INSERT INTO public.role_menu_items (
    id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at
  )
  SELECT
    gen_random_uuid(),
    rmi.role_id,
    v_new_id,
    COALESCE(rmi.can_view, TRUE),
    COALESCE(rmi.can_use, TRUE),
    TRUE,
    NOW(),
    NOW()
  FROM public.role_menu_items rmi
  WHERE rmi.menu_item_id = v_sec_id
    AND COALESCE(rmi.is_active, TRUE) = TRUE
  ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = TRUE,
    can_use = TRUE,
    is_active = TRUE,
    updated_at = NOW();

  SELECT COUNT(*) INTO v_pack_links
  FROM public.industry_pack_menu_items
  WHERE menu_item_id = v_new_id;

  SELECT COUNT(*) INTO v_role_grants
  FROM public.role_menu_items
  WHERE menu_item_id = v_new_id
    AND COALESCE(is_active, TRUE) = TRUE;

  IF v_pack_links < 1 THEN
    RAISE EXCEPTION
      'v1004 aborted: Dress Rehearsal has 0 industry_pack_menu_items links — it would be hidden from Banking. Security Testing pack links may be missing.';
  END IF;

  IF v_role_grants < 1 THEN
    RAISE EXCEPTION
      'v1004 aborted: Dress Rehearsal has 0 role grants — copy from Security Testing found nothing.';
  END IF;

  RAISE NOTICE
    'v1004 OK: Dress Rehearsal Strategy ready (menu_id=%, pack_links=%, role_grants=%). Hard-refresh the app.',
    v_new_id, v_pack_links, v_role_grants;
END $$;

-- Verification (must include Dress Rehearsal Strategy between Security and DR)
SELECT
  mi.sort_order,
  mi.menu_label,
  mi.menu_code,
  (SELECT COUNT(*) FROM public.industry_pack_menu_items x WHERE x.menu_item_id = mi.id) AS pack_links,
  (SELECT COUNT(*) FROM public.role_menu_items x
   WHERE x.menu_item_id = mi.id AND COALESCE(x.is_active, TRUE)) AS role_grants
FROM public.menu_items mi
WHERE mi.parent_menu_id = (
  SELECT id FROM public.menu_items
  WHERE menu_code = 'fin_cat_testing_assurance'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1
)
AND COALESCE(mi.is_deleted, FALSE) = FALSE
ORDER BY mi.sort_order, mi.menu_label;
