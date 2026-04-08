-- =============================================================================
-- v247: Rename mandate-template to mandate
-- Purpose: Update existing sidebar_config records to use 'mandate' instead of 'mandate-template'
-- This ensures consistency across the application after the terminology cleanup
-- =============================================================================

-- Update public schema sidebar_config table
UPDATE sidebar_config
SET
  document_type = 'mandate',
  display_label = REPLACE(display_label, 'Project Mandate Template', 'Project Mandate'),
  route_path = REPLACE(route_path, 'mandate-template', 'mandate'),
  updated_at = NOW()
WHERE document_type = 'mandate-template';

-- Update sim schema sidebar_config table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'sim' AND table_name = 'sidebar_config') THEN
    UPDATE sim.sidebar_config
    SET
      document_type = 'mandate',
      route_path = REPLACE(route_path, 'mandate-template', 'mandate'),
      updated_at = NOW()
    WHERE document_type = 'mandate-template';
  END IF;
END $$;

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Successfully renamed mandate-template to mandate in sidebar_config tables';
END $$;
