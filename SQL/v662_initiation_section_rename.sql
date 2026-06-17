-- v662: Rename sidebar section "Initiation & Business Justification" → "Business Justification"
-- Platform + Simulator menu_items. Idempotent.

UPDATE public.menu_items
SET menu_label = 'Business Justification',
    updated_at = NOW()
WHERE menu_label = 'Initiation & Business Justification'
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$ BEGIN RAISE NOTICE 'v662_initiation_section_rename.sql completed'; END $$;
