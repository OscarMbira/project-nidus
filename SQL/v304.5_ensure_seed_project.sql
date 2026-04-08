-- ============================================================================
-- v304.5: Ensure at least one project exists for stakeholder seed
-- Description: Inserts a single seed project if no non-deleted project exists.
--              Run this before v304.2_seed_60_stakeholders.sql so the seed has
--              a project to attach stakeholders to.
-- ============================================================================

INSERT INTO projects (project_code, project_name, project_description, is_deleted)
SELECT 'SEED-PROJECT', 'Seed project for stakeholder data', 'Default project for seeded stakeholders', false
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE is_deleted = false);
