-- ============================================================================
-- v1343: Data Migration menus — role access for everyone who takes part in a strategy
-- ============================================================================
-- Owner request 2026-10-25 ("make sure you have added associated menu access per each role").
-- The CBS DMSD templates (v1336) add no new menu: templates live on the Data Migration Strategy
-- page (New → From template, Templates tab, Save as template). Until now that page, Data Scope and
-- their Data Migration category were granted only to account_owner, pm_team_manager, pmo_admin,
-- portfolio_manager, programme_manager, project_manager and system_admin — so the people a strategy
-- names as approvers, signatories and data owners could not reach it.
--
-- Granted here (global role definitions, account_id IS NULL), view + use:
--   financial_programme_manager — banking programme lead (also manages templates, v1336)
--   project_sponsor, project_board_member — approvers / signatories
--   pm_project_assurance, internal_auditor, risk_compliance_manager — assurance, audit, risk sign-off
--   financial_analyst — finance balances and reconciliation
--   data_analyst, data_engineer — data validation; extraction / upload leads
--   pm_team_member — product / data owners maintaining their Data Scope records
-- A menu grant only shows the page; what someone can read or change is still limited by project
-- membership (RLS), sign-off rules (v1318/v1319) and template rights (v1336).
-- Existing grants are left as they are. Idempotent.
-- ============================================================================

WITH target_roles AS (
  SELECT id
  FROM public.roles
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND account_id IS NULL
    AND lower(regexp_replace(trim(role_name), '[[:space:]]+', '_', 'g')) IN (
      'financial_programme_manager', 'project_sponsor', 'project_board_member', 'pm_project_assurance',
      'internal_auditor', 'risk_compliance_manager', 'financial_analyst', 'data_analyst', 'data_engineer',
      'pm_team_member'
    )
),
target_items AS (
  SELECT id
  FROM public.menu_items
  WHERE COALESCE(is_deleted, FALSE) = FALSE
    AND menu_code IN ('fin_cat_data_migration', 'fin_reg_fin_migration_strategy', 'fin_reg_fin_data_scope')
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r.id, m.id, TRUE, TRUE, TRUE, FALSE, NOW(), NOW()
FROM target_roles r
CROSS JOIN target_items m
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- Check (read-only): roles that can now see each menu.
SELECT mi.menu_code, mi.menu_label, COUNT(*) AS roles, string_agg(r.role_name, ', ' ORDER BY r.role_name) AS role_names
FROM public.menu_items mi
JOIN public.role_menu_items rmi ON rmi.menu_item_id = mi.id AND rmi.can_view AND rmi.is_active AND COALESCE(rmi.is_deleted, FALSE) = FALSE
JOIN public.roles r ON r.id = rmi.role_id
WHERE mi.menu_code IN ('fin_cat_data_migration', 'fin_reg_fin_migration_strategy', 'fin_reg_fin_data_scope')
GROUP BY mi.menu_code, mi.menu_label
ORDER BY mi.menu_code;
