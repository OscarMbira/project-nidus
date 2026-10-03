-- ============================================================================
-- v940: Stronger fix for over-broad industry pack menu-item classification
-- (v939 ran successfully but did not fully resolve the reported symptom — this supersedes its
-- heuristic with a more precise one; both are safe to have applied, they are complementary
-- pure-DELETE cleanups, not conflicting.)
-- ============================================================================
-- v939's "majority of the 9 real industry packs" threshold assumed a menu item would only be
-- over-tagged if it were independently granted across many industries' role tiers. Live testing
-- (2026-08-21) showed IT & Software Pack still surfacing Template Library / Organisational
-- Templates / Document Signatory / Field Templates after v939 — meaning the actual pack_count
-- for these items apparently did not clear that majority threshold, even though they are
-- unambiguously generic PM chrome.
--
-- More precise signal: public.industry_categories.name / SQL/v906's own header comment defines
-- "NULL = generic/methodology role" for public.roles.industry_category_id — the ORIGINAL,
-- pre-industry-catalog built-in roles (project_manager, programme_manager, pmo_admin, etc.,
-- account_id IS NULL, industry_category_id IS NULL) ARE the canonical "generic" role set by
-- design, independent of any statistical distribution across industry packs. If a menu item is
-- granted to one of these untagged baseline roles, it is generic PM tooling by definition — not
-- specific to whichever industry's tier_source role happened to copy that grant in (SQL/v907's
-- copy-from-tier_source seeding, see v921's own header comment for how that happened).
--
-- Fix: remove a menu item from every non-Cross-Industry pack's classification whenever that
-- item is ALSO granted to at least one untagged, built-in, active role. groupMenuTreeByIndustryPack
-- ()'s owner lookup already falls through to 'core' for any menu_code with no
-- industry_pack_menu_items row, so the item simply reappears under "Core Project Management".
--
-- Idempotent: safe to re-run. Same v921 re-run caveat as v939 applies here too.
-- Prerequisites: v902 (roles.account_id), v906/v907/v913 (industry role catalog), v920/v921
-- (industry_packs schema+seed), v939 (first-pass cleanup, not required but harmless to have run)
-- ============================================================================

DO $$
DECLARE
  v_removed INT;
BEGIN
  WITH generic_menu_items AS (
    SELECT DISTINCT rmi.menu_item_id
    FROM public.role_menu_items rmi
    JOIN public.roles r ON r.id = rmi.role_id
    WHERE rmi.is_active = TRUE
      AND r.is_active = TRUE
      AND r.account_id IS NULL
      AND r.industry_category_id IS NULL
  ),
  deleted AS (
    DELETE FROM public.industry_pack_menu_items ipmi
    USING public.industry_packs ip, public.industry_categories ic, generic_menu_items gmi
    WHERE ipmi.industry_pack_id = ip.id
      AND ip.industry_category_id = ic.id
      AND ic.name <> 'Cross-Industry'
      AND ipmi.menu_item_id = gmi.menu_item_id
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_removed FROM deleted;

  RAISE NOTICE 'v940: removed % industry_pack_menu_items rows that duplicated a generic/untagged built-in role''s grants (now falls through to Core Project Management)', v_removed;
END $$;

-- ── Diagnostic — lists anything STILL classified under IT & Software that looks generic by
-- label, so if the symptom persists after this migration we have real data instead of another
-- guess. Read-only; does not modify anything. Paste the NOTICE output back if the sidebar still
-- shows these under IT & Software Pack after this migration.
DO $$
DECLARE
  r RECORD;
  v_found BOOLEAN := FALSE;
BEGIN
  FOR r IN
    SELECT mi.menu_label, mi.menu_code, r2.role_name AS granted_via_role, r2.industry_category_id
    FROM public.industry_pack_menu_items ipmi
    JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id
    JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
    JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id
    LEFT JOIN public.role_menu_items rmi2 ON rmi2.menu_item_id = mi.id AND rmi2.is_active = TRUE
    LEFT JOIN public.roles r2 ON r2.id = rmi2.role_id AND r2.account_id IS NULL AND r2.is_active = TRUE
    WHERE ic.name = 'IT & Software'
      AND (
        mi.menu_label ILIKE '%template%' OR
        mi.menu_label ILIKE '%signatory%' OR
        mi.menu_label ILIKE '%field template%' OR
        mi.menu_label ILIKE '%organisational%'
      )
    ORDER BY mi.menu_label
  LOOP
    v_found := TRUE;
    RAISE NOTICE 'STILL CLASSIFIED UNDER IT & SOFTWARE: % (code=%) — also granted via role % (industry_category_id=%)',
      r.menu_label, r.menu_code, COALESCE(r.granted_via_role, '(none found)'), r.industry_category_id;
  END LOOP;

  IF NOT v_found THEN
    RAISE NOTICE 'v940 diagnostic: no template/signatory/organisational-labelled items remain classified under IT & Software Pack.';
  END IF;
END $$;

