-- ============================================================================
-- v1042: Retire "Knowledge & Resources" hub (plat_xf_knowledge) — redundant middleman
-- ============================================================================
-- Found live while auditing "Cross-Framework" per user request (2026-09-11).
-- plat_xf_knowledge ("Knowledge & Resources", /platform/org-knowledge) is not itself a data
-- page — it renders OrgKnowledgeHub.jsx, a 2-card landing page linking to:
--   - Environment Factors (EEF)  -> /platform/eef
--   - Process Assets (OPA)       -> /platform/opa
--
-- For project_manager (and, per the code, any role that can reach this hub), BOTH destinations
-- already have their own independent, directly-granted sidebar entries:
--   - plat_pm_eef  ("EEF") now lives under Scope & Deliverables (v1040)
--   - plat_s_opa   ("Organisational Process Assets (OPA)") lives under Structured >
--     Governance & Standards (added by v714, which already intended to retire the OPA
--     duplicates this hub itself represents — "retire duplicate Process Assets browse row
--     from Knowledge" — but only deactivated pmo_admin/account_owner/org_admin/super_admin/
--     system_admin grants, never touched plat_xf_knowledge itself or project_manager's grant)
--
-- Confirmed via live grant check: project_manager has active grants on BOTH plat_xf_knowledge
-- and plat_s_opa today, meaning Process Assets is reachable via two different sidebar paths for
-- the exact same role. Deactivating the hub removes the redundant path without losing any
-- content — EEF and OPA remain fully reachable via their own proper taxonomy homes.
-- ============================================================================

UPDATE public.menu_items
SET is_active = FALSE, is_visible = FALSE, updated_at = NOW()
WHERE menu_code = 'plat_xf_knowledge'
  AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.role_menu_items rmi
SET is_active = FALSE, updated_at = NOW()
FROM public.menu_items mi
WHERE rmi.menu_item_id = mi.id
  AND mi.menu_code = 'plat_xf_knowledge'
  AND COALESCE(rmi.is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1042: plat_xf_knowledge (Knowledge & Resources hub) deactivated — EEF and OPA remain reachable via Scope & Deliverables and Structured > Governance & Standards';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, is_active, is_visible FROM public.menu_items
--   WHERE menu_code = 'plat_xf_knowledge';
--   -- expect is_active=false.
--
--   SELECT mi.menu_code, count(*) AS remaining_grants FROM public.role_menu_items rmi
--   JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code = 'plat_xf_knowledge' AND rmi.is_active = TRUE;
--   -- expect 0.
