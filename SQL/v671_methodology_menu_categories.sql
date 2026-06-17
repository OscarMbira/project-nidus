-- =============================================================================
-- v671: Methodology column on menu_items + category track tagging
-- Prerequisites: menu_items table (v638+)
-- =============================================================================

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS methodology TEXT;

COMMENT ON COLUMN public.menu_items.methodology IS
  'Sidebar track: structured | pmbok | agile | universal (null = infer at runtime)';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_menu_items_methodology'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT chk_menu_items_methodology
      CHECK (
        methodology IS NULL
        OR methodology IN ('structured', 'pmbok', 'agile', 'universal')
      );
  END IF;
END $$;

-- Structured / Traditional
UPDATE public.menu_items SET methodology = 'structured', updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND (
    menu_code LIKE 'pmo_init_%'
    OR menu_code LIKE 'pmo_gov_%'
    OR menu_code LIKE 'sim_pmo_init_%'
    OR menu_code LIKE 'sim_pmo_gov_%'
    OR menu_code IN ('pmo_section_initiation', 'pmo_section_governance', 'sim_pmo_section_initiation', 'sim_pmo_section_governance')
    OR route_path ~ '/pmo/initiation/'
    OR route_path ~ '/simulator/pmo/initiation/'
    OR route_path ~ '/platform/mandates/'
    OR menu_label ILIKE '%project mandate%'
    OR menu_label ILIKE '%business case%'
    OR menu_label ILIKE '%project brief%'
    OR menu_label ILIKE '%benefits review%'
  );

-- PMBOK process groups / ITTO / EEF
UPDATE public.menu_items SET methodology = 'pmbok', updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND methodology IS NULL
  AND (
    route_path ~ '/process-group-forms'
    OR route_path ~ '/forms\?group='
    OR menu_code ~ '_itto_'
    OR menu_code ~ '_eef'
    OR route_path ~ '/eef'
    OR menu_label ILIKE '%process group%'
    OR menu_label ILIKE '%itto%'
    OR menu_label ILIKE '%environmental factor%'
  );

-- Agile & Lean
UPDATE public.menu_items SET methodology = 'agile', updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND methodology IS NULL
  AND (
    menu_code ~ '_agile_'
    OR menu_code ~ '_scrum_'
    OR menu_code ~ '_lean_'
    OR route_path ~ '/scrum/'
    OR route_path ~ '/lean/'
    OR menu_label ILIKE '%scrum of scrums%'
    OR menu_label ILIKE '%value stream%'
    OR menu_label ILIKE '%kaizen%'
    OR menu_label ILIKE '%sprint metric%'
    OR menu_label ILIKE '%story map%'
  );

-- Explicit universal for top-level PMO sections
UPDATE public.menu_items SET methodology = 'universal', updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND methodology IS NULL
  AND menu_level <= 1
  AND parent_menu_id IS NULL
  AND menu_code LIKE 'pmo-cat-%';

DO $$ BEGIN RAISE NOTICE 'v671_methodology_menu_categories.sql applied'; END $$;
