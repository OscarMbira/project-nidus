-- ================================================
-- File: v1165_assignment_roles_expand_seed.sql
-- Description: Expand assignment_roles with standard RACI terms and common
--              delivery-role labels; re-sequence sort_order for the full set
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1164_create_assignment_roles_table.sql

-- Purpose:
-- The initial v1164 seed (Lead, Contributor, Reviewer, Approver, Consulted, Informed,
-- Support, Observer) was missing the actual RACI terms (Responsible / Accountable) and
-- several roles commonly used on resource assignments in delivery tools (Owner,
-- Collaborator, Subject Matter Expert, Quality Assurance, Sponsor, Coordinator, Backup,
-- Point of Contact). This file adds those and re-sequences sort_order across the full set
-- so the dropdown reads in a sensible order (ON CONFLICT DO UPDATE is safe to re-run and
-- also re-orders the original 8 rows from v1164).

INSERT INTO assignment_roles (code, name, description, sort_order, is_active)
VALUES
    ('owner',                 'Owner',                 'Ultimately owns the outcome of the assignment', 10, true),
    ('lead',                  'Lead',                   'Owns and drives the assignment to completion', 20, true),
    ('responsible',           'Responsible',            'Does the work (RACI: Responsible)', 30, true),
    ('accountable',           'Accountable',            'Answerable for correct, timely completion (RACI: Accountable)', 40, true),
    ('contributor',           'Contributor',            'Actively works on the assignment', 50, true),
    ('collaborator',          'Collaborator',           'Works jointly with the assignee on shared output', 60, true),
    ('subject_matter_expert', 'Subject Matter Expert',  'Provides specialist knowledge on request', 70, true),
    ('reviewer',              'Reviewer',               'Reviews output before it is considered done', 80, true),
    ('quality_assurance',     'Quality Assurance',      'Validates output meets quality standards', 90, true),
    ('approver',              'Approver',               'Gives final sign-off', 100, true),
    ('sponsor',               'Sponsor',                'Provides authority and resourcing backing', 110, true),
    ('consulted',             'Consulted',              'Provides input before work proceeds (RACI: Consulted)', 120, true),
    ('informed',              'Informed',               'Kept up to date on progress (RACI: Informed)', 130, true),
    ('support',               'Support',                'Provides supporting effort alongside the lead', 140, true),
    ('coordinator',           'Coordinator',             'Coordinates activity across contributors', 150, true),
    ('backup',                'Backup',                 'Covers the assignment if the primary is unavailable', 160, true),
    ('point_of_contact',      'Point of Contact',       'First point of contact for questions on this assignment', 170, true),
    ('observer',              'Observer',               'Observes without active responsibility', 180, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_role_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_role_count
    FROM assignment_roles
    WHERE is_active = TRUE AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Assignment Roles Expanded';
    RAISE NOTICE 'Active Roles: %', v_role_count;
    RAISE NOTICE '================================================';
END $$;
