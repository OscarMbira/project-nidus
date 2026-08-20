-- =============================================================================
-- v871: Rename sidebar leaf to "Document Signatory" (Platform + Simulator)
-- Was: "Document Signatory Requirements" (v868d / v870)
-- Sidebar renders menu_items.menu_label from the DB (no client hardcode).
-- After apply: hard-refresh the app (sidebar cache version bumps invalidate
-- localStorage). Verify with the SELECT at the bottom of this file.
-- =============================================================================

UPDATE public.menu_items
SET
  menu_label = 'Document Signatory',
  menu_description = 'Configure required signatory role-slots per document type for formal sign-off',
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND (
    menu_code IN ('plat_tpl_signatory_requirements', 'sim_tpl_signatory_requirements')
    OR route_path IN (
      '/app/pmo/signatory-requirements',
      '/simulator/pmo/organisational-templates/signatory-requirements'
    )
    OR menu_label ILIKE 'Document Signatory Requirements'
  );

-- Show what the app will read next (must be "Document Signatory")
DO $$
DECLARE
  r RECORD;
  n int := 0;
BEGIN
  FOR r IN
    SELECT menu_code, menu_label, route_path
    FROM public.menu_items
    WHERE menu_code IN ('plat_tpl_signatory_requirements', 'sim_tpl_signatory_requirements')
       OR route_path IN (
         '/app/pmo/signatory-requirements',
         '/simulator/pmo/organisational-templates/signatory-requirements'
       )
  LOOP
    n := n + 1;
    RAISE NOTICE 'v871 row: code=% label=% path=%', r.menu_code, r.menu_label, r.route_path;
  END LOOP;
  IF n = 0 THEN
    RAISE WARNING 'v871: no matching menu_items row found — run v868d/v870 first';
  END IF;
END $$;
