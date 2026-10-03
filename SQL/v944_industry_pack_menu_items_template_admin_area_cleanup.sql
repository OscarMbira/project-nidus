-- ============================================================================
-- v944: Remove the FULL set of Template/Forms admin-area menu codes from industry pack
-- classification — v939/v940/v943 each caught only part of this set.
-- ============================================================================
-- Diagnosed live (2026-08-21) via a temporary client-side debug log in useMenu.js: the
-- account's resolved menuCodeToPack still had 18 entries matching template/signatory/execution/
-- organisational, all mapped to the same (IT & Software) pack id — not just the 5 exact labels
-- v943 targeted. The Templates/Forms admin area has many more sibling menu codes (per-tab
-- variants: Forms, Security, ITTO, Organisational Templates x Templates/Forms, New Form
-- Template, etc.) that v921's role-grant derivation tagged the same way, for the same reason as
-- before (industry-tagged roles inherit the full generic grant set from their tier_source role).
--
-- This is the exact 18-code list read directly from the account's own live classification —
-- not a guess or a heuristic. 12 are Platform-prefixed (plat_*), 6 are the Simulator-prefixed
-- (sim_*) equivalents (present in the same shared public.menu_items table; harmless to Platform
-- rendering today since Platform prunes non-/simulator routes, but genuinely mis-tagged and
-- would surface as the same bug once Simulator's own pack-grouping is exercised — fixed here
-- too for parity, rule 34.1).
--
-- Idempotent: safe to re-run. Same v921 re-run caveat as v939/v940/v943 applies: if v921 is ever
-- re-run after new grants are added, re-run this file afterward too.
-- ============================================================================

DO $$
DECLARE
  v_removed INT;
BEGIN
  WITH template_admin_items AS (
    SELECT id AS menu_item_id
    FROM public.menu_items
    WHERE menu_code IN (
      'plat_pm_project_templates',
      'plat_sec_templates',
      'plat_pm_project_templates_forms',
      'plat_tpl_library_templates',
      'plat_tpl_organisational_templates',
      'plat_p_new_form_template',
      'plat_pm_project_templates_templates',
      'plat_tpl_organisational_forms',
      'plat_pm_templates_forms',
      'plat_pm_p_itto_templates',
      'plat_pm_templates_templates',
      'plat_pm_templates',
      'sim_tpl_organisational_templates',
      'sim_sec_templates',
      'sim_tpl_organisational_forms',
      'sim_pm_project_templates_forms',
      'sim_tpl_library_templates',
      'sim_pm_project_templates_templates'
    )
  ),
  deleted AS (
    DELETE FROM public.industry_pack_menu_items ipmi
    USING template_admin_items tai, public.industry_packs ip, public.industry_categories ic
    WHERE ipmi.menu_item_id = tai.menu_item_id
      AND ipmi.industry_pack_id = ip.id
      AND ip.industry_category_id = ic.id
      AND ic.name <> 'Cross-Industry'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_removed FROM deleted;

  RAISE NOTICE 'v944: removed % industry_pack_menu_items rows for the 18 Template/Forms admin-area menu codes (now fall through to Core Project Management)', v_removed;
END $$;

-- Read-only verification — returns rows directly in the Results tab. Should be empty.
SELECT mi.menu_label, mi.menu_code, ic.name AS still_classified_under
FROM public.industry_pack_menu_items ipmi
JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id
JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id
WHERE mi.menu_code IN (
  'plat_pm_project_templates', 'plat_sec_templates', 'plat_pm_project_templates_forms',
  'plat_tpl_library_templates', 'plat_tpl_organisational_templates', 'plat_p_new_form_template',
  'plat_pm_project_templates_templates', 'plat_tpl_organisational_forms', 'plat_pm_templates_forms',
  'plat_pm_p_itto_templates', 'plat_pm_templates_templates', 'plat_pm_templates',
  'sim_tpl_organisational_templates', 'sim_sec_templates', 'sim_tpl_organisational_forms',
  'sim_pm_project_templates_forms', 'sim_tpl_library_templates', 'sim_pm_project_templates_templates'
)
AND ic.name <> 'Cross-Industry'
ORDER BY mi.menu_label, ic.name;
