-- v662: Record lifecycle menu registry (platform + simulator)
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md
-- @see src/config/recordLifecycleMenuRegistry.js

-- Platform PMO / PM + Simulator PMO / PM / TM authorisation menus
-- Run after v651-v659 lifecycle infrastructure

DO $$
BEGIN
  RAISE NOTICE 'v662: Apply record lifecycle menus via menuRegistry.js + role_menu_items backfill script';
  RAISE NOTICE 'Registry entries: recordLifecycleMenuRegistry.js merged into menuRegistry.js';
  RAISE NOTICE 'Hard-refresh after deploy — menu cache v23';
END $$;
