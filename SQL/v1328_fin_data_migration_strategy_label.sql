-- ============================================================================
-- v1328: Banking › Data Migration — "Migration Strategy" is renamed "Data Migration Strategy"
-- ============================================================================
-- Owner request 2026-10-24. Display names only:
--   * the register (public.local_registers, register_key fin_migration_strategy) — page titles
--     "New Data Migration Strategy", "Back to Data Migration Strategy", list heading, exports;
--   * its sidebar link (fin_reg_fin_migration_strategy, v947; matched by route too).
-- The register key, URLs (/platform/local-registers/fin_migration_strategy) and records are
-- unchanged. Account copies are renamed only if they still carry the old name.
-- v947's seed now carries the new name, so re-running it does not undo this.
-- Industry registers exist in Platform only (Simulator records reference these rows).
-- Idempotent. Rollback: set the two labels back to 'Migration Strategy'.
-- ============================================================================

UPDATE public.local_registers
SET label = 'Data Migration Strategy', updated_at = NOW()
WHERE register_key = 'fin_migration_strategy'
  AND label = 'Migration Strategy';

UPDATE public.menu_items
SET menu_label = 'Data Migration Strategy', updated_at = NOW()
WHERE (menu_code = 'fin_reg_fin_migration_strategy'
       OR route_path IN ('/platform/local-registers/00000000-0000-4000-9001-00000000000c',
                         '/platform/local-registers/fin_migration_strategy'))
  AND menu_label = 'Migration Strategy'
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- Check (read-only)
SELECT 'register' AS kind, register_key AS code, label FROM public.local_registers WHERE register_key = 'fin_migration_strategy'
UNION ALL
SELECT 'menu', menu_code, menu_label FROM public.menu_items
WHERE menu_code = 'fin_reg_fin_migration_strategy'
   OR route_path IN ('/platform/local-registers/00000000-0000-4000-9001-00000000000c',
                     '/platform/local-registers/fin_migration_strategy');

NOTIFY pgrst, 'reload schema';
