-- ================================================
-- File: v277_seed_lifecycle_templates.sql
-- Description: Seed lifecycle_templates with common options per organisation.
-- Prerequisites: v275_lifecycle_templates_master.sql (lifecycle_templates, accounts).
-- Safe to re-run: only inserts where (account_id, code) does not already exist.
-- Run in Supabase SQL Editor.
-- ================================================

-- Ensure authenticated role can read (for dropdown and PMO Admin)
GRANT SELECT ON lifecycle_templates TO authenticated;

-- Seed common lifecycle templates for every existing account
INSERT INTO lifecycle_templates (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Waterfall', 'WATERFALL', 'Sequential phases: requirements, design, build, test, deploy', 1, true, false
FROM accounts a
WHERE a.is_deleted = false OR a.is_deleted IS NULL
  AND NOT EXISTS (SELECT 1 FROM lifecycle_templates lt WHERE lt.account_id = a.id AND lt.code = 'WATERFALL');

INSERT INTO lifecycle_templates (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Agile / Iterative', 'AGILE', 'Iterative delivery with sprints and continuous feedback', 2, true, false
FROM accounts a
WHERE a.is_deleted = false OR a.is_deleted IS NULL
  AND NOT EXISTS (SELECT 1 FROM lifecycle_templates lt WHERE lt.account_id = a.id AND lt.code = 'AGILE');

INSERT INTO lifecycle_templates (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Hybrid', 'HYBRID', 'Combination of predictive and adaptive approaches', 3, true, false
FROM accounts a
WHERE a.is_deleted = false OR a.is_deleted IS NULL
  AND NOT EXISTS (SELECT 1 FROM lifecycle_templates lt WHERE lt.account_id = a.id AND lt.code = 'HYBRID');

INSERT INTO lifecycle_templates (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Structured / Traditional', 'STRUCTURED', 'Stage-gated delivery with formal governance', 4, true, false
FROM accounts a
WHERE a.is_deleted = false OR a.is_deleted IS NULL
  AND NOT EXISTS (SELECT 1 FROM lifecycle_templates lt WHERE lt.account_id = a.id AND lt.code = 'STRUCTURED');

INSERT INTO lifecycle_templates (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Kanban', 'KANBAN', 'Continuous flow with work-in-progress limits', 5, true, false
FROM accounts a
WHERE a.is_deleted = false OR a.is_deleted IS NULL
  AND NOT EXISTS (SELECT 1 FROM lifecycle_templates lt WHERE lt.account_id = a.id AND lt.code = 'KANBAN');

INSERT INTO lifecycle_templates (account_id, name, code, description, sort_order, is_active, is_deleted)
SELECT a.id, 'Scrum', 'SCRUM', 'Time-boxed sprints with roles and ceremonies', 6, true, false
FROM accounts a
WHERE a.is_deleted = false OR a.is_deleted IS NULL
  AND NOT EXISTS (SELECT 1 FROM lifecycle_templates lt WHERE lt.account_id = a.id AND lt.code = 'SCRUM');
