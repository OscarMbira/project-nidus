-- =============================================================================
-- v936: Local Register Engine — fix scope-entity CHECK constraint for system-defined registers
-- =============================================================================
-- v931's chk_local_registers_scope_entity required scope_level to have a matching
-- scope_portfolio_id/scope_programme_id/scope_project_id populated. v932 made system-defined
-- registers account-agnostic (no account_id), but never updated this constraint — a
-- system-defined register's scope_level = 'project' describes the GRANULARITY its records will
-- be created at (each record gets its own record_project_id), not one specific project the
-- register itself belongs to. v933's seed data hit this immediately: every system-defined
-- register has scope_level = 'project' with all three scope_*_id columns NULL, which the old
-- constraint correctly rejected as originally written, but which is the intended shape.
--
-- Fix: system-defined registers (is_system_defined = TRUE) are only required to have a
-- scope_level, no scope entity. Member-created registers (is_system_defined = FALSE) keep the
-- original strict requirement — they ARE tied to one specific entity.
--
-- Prerequisites: v931_local_register_engine_schema.sql, v932_local_registers_system_scope_fix.sql
-- =============================================================================

ALTER TABLE public.local_registers DROP CONSTRAINT IF EXISTS chk_local_registers_scope_entity;
ALTER TABLE public.local_registers ADD CONSTRAINT chk_local_registers_scope_entity CHECK (
  (is_system_defined = TRUE AND scope_portfolio_id IS NULL AND scope_programme_id IS NULL AND scope_project_id IS NULL)
  OR (is_system_defined = FALSE AND scope_level = 'pmo' AND scope_portfolio_id IS NULL AND scope_programme_id IS NULL AND scope_project_id IS NULL)
  OR (is_system_defined = FALSE AND scope_level = 'portfolio' AND scope_portfolio_id IS NOT NULL AND scope_programme_id IS NULL AND scope_project_id IS NULL)
  OR (is_system_defined = FALSE AND scope_level = 'programme' AND scope_programme_id IS NOT NULL AND scope_portfolio_id IS NULL AND scope_project_id IS NULL)
  OR (is_system_defined = FALSE AND scope_level = 'project' AND scope_project_id IS NOT NULL AND scope_portfolio_id IS NULL AND scope_programme_id IS NULL)
);

DO $$ BEGIN
  RAISE NOTICE 'v936_local_registers_scope_constraint_fix.sql applied successfully';
END $$;
