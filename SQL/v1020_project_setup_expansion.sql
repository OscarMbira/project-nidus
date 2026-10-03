-- ============================================================================
-- v1020: Project Setup taxonomy expansion — Project Details, Project Charter,
-- Project Team group, Governance group
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md section 3's "Project Setup"
-- branch describes 5 sub-areas (Project Details, Business Case, Project Charter,
-- Project Team, Governance) with ~30 individual fields/sections between them. The
-- live sidebar (v981) only ever exposed 5 flat document leaves (Mandate, Brief,
-- Business Case, PIDs, Governance Framework) — this migration closes the rest of
-- that gap, after live investigation found:
--   - Business Case: already fully built (BusinessCaseForm.jsx sections cover all
--     6 taxonomy sub-items) — no DB change needed, it's already a Project Setup leaf.
--   - Project Details: projects already has project_description, delivery_methodology,
--     success_criteria, project_classification, industry_category_id — just needed a
--     dedicated page + one new column (project_objectives — previously only captured
--     via a separate business-justification flow, not on projects itself) + a
--     "Metadata" read-only card composed from existing columns.
--   - Project Charter: user decision — build as a SEPARATE document from the existing
--     PRINCE2-style "Project Brief". Reuses the already-live, already-working generic
--     process-template system (project_charters table, v629 shape, processTemplateCrudFactory)
--     — no new table needed there, just new dedicated pages or this generic system stays
--     unused for a live UI path.
--   - Project Team: Team Members/RACI/Roles & Responsibilities already exist as separate,
--     already-live pages, just never linked from Project Setup. Only "Contact Directory"
--     is genuinely net new (this migration). "Organisation Structure" reuses existing
--     project-team-with-roles data, no new table.
--   - Governance: user decision — build Steering Committee/Project Board/Meeting
--     Calendar/PMO Oversight now, not deferred. Governance Decisions
--     (project_decisions, v628d) and Delegated Authorities (organisation_authorities,
--     v986) already have full, live, working CRUD pages — just needed linking in.
--     Meeting Calendar reuses the existing comm_meetings/meetingService.js (project-
--     scoped already) — no new table. Steering Committee + Project Board rosters and
--     Governance Structure/PMO Oversight/Escalation Path notes are genuinely net new.
--
-- RLS pattern: all 3 new tables use public.auth_user_can_access_project() (SECURITY
-- DEFINER, row_security off, v841/v406) rather than a raw join policy — this session's
-- hard-won lesson (v1016/v1018) after repeated HTTP-500-under-authenticated-role bugs
-- from policies that join through users/user_roles without disabling row_security.
--
-- Platform sidebar only, same as every other Phase-9-shaped taxonomy group this
-- initiative has added (v981 et al.) — Simulator's own taxonomy mirror remains a
-- separate, deferred follow-up (its project flow is a structurally different bespoke
-- system, PracticeProjectCreate.jsx, not a mirror of these Platform pages/tables).
-- ============================================================================

-- ── 1. Project Details: one new column on projects ──────────────────────────────────────────

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_objectives TEXT;
COMMENT ON COLUMN public.projects.project_objectives IS
  'v1020: free-text project objectives, one per line — Project Details taxonomy leaf. Distinct from the separate business-justification objectives flow captured during project creation.';

-- ── 2. Governance Structure (one row per project — structure notes, escalation path, PMO oversight) ──

CREATE TABLE IF NOT EXISTS public.project_governance_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  structure_notes TEXT,
  escalation_path TEXT,
  pmo_oversight_notes TEXT,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE public.project_governance_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_project_governance_structure_select ON public.project_governance_structure;
CREATE POLICY policy_project_governance_structure_select ON public.project_governance_structure
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_governance_structure_insert ON public.project_governance_structure;
CREATE POLICY policy_project_governance_structure_insert ON public.project_governance_structure
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_governance_structure_update ON public.project_governance_structure;
CREATE POLICY policy_project_governance_structure_update ON public.project_governance_structure
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

-- ── 3. Governance roster (Steering Committee / Project Board members) ───────────────────────

CREATE TABLE IF NOT EXISTS public.project_governance_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  body_type TEXT NOT NULL CHECK (body_type IN ('steering_committee', 'project_board')),
  member_name TEXT NOT NULL,
  role_title TEXT,
  organisation TEXT,
  email TEXT,
  phone TEXT,
  is_chair BOOLEAN NOT NULL DEFAULT FALSE,
  appointed_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_project_governance_members_project
  ON public.project_governance_members(project_id, body_type)
  WHERE is_deleted = FALSE;

ALTER TABLE public.project_governance_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_project_governance_members_select ON public.project_governance_members;
CREATE POLICY policy_project_governance_members_select ON public.project_governance_members
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_governance_members_insert ON public.project_governance_members;
CREATE POLICY policy_project_governance_members_insert ON public.project_governance_members
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_governance_members_update ON public.project_governance_members;
CREATE POLICY policy_project_governance_members_update ON public.project_governance_members
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

-- ── 4. Contact Directory ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  role_title TEXT,
  organisation TEXT,
  contact_type TEXT CHECK (contact_type IS NULL OR contact_type IN ('internal', 'client', 'vendor', 'other')),
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_project_contacts_project
  ON public.project_contacts(project_id)
  WHERE is_deleted = FALSE;

ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_project_contacts_select ON public.project_contacts;
CREATE POLICY policy_project_contacts_select ON public.project_contacts
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE AND public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_contacts_insert ON public.project_contacts;
CREATE POLICY policy_project_contacts_insert ON public.project_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_contacts_update ON public.project_contacts;
CREATE POLICY policy_project_contacts_update ON public.project_contacts
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

-- ── 5. Register new tables ───────────────────────────────────────────────────────────────────

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_governance_structure', 'One row per project: governance structure notes, escalation path, and PMO oversight notes', false, true),
  ('project_governance_members', 'Steering Committee and Project Board membership rosters, per project', false, true),
  ('project_contacts', 'Project contact directory (internal, client, vendor, and other contacts)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── 6. Sidebar menu wiring ───────────────────────────────────────────────────────────────────
-- All new leaves/groups sit under the existing plat_pm_project_setup root (v981).

-- 6a. Project Details (leaf, sits before Mandate)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_s_project_details', 'Project Details',
  'Overview, objectives, success criteria, classification, methodology, and metadata (taxonomy §3, Project Details).',
  '/platform/project-details',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 5, 'universal', 'file-text', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_s_project_details' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 6b. Project Charter (leaf, sits between Business Case and PIDs)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_s_charter', 'Project Charter',
  'Purpose, scope, objectives, high-level milestones, constraints, assumptions, and approval (taxonomy §3, Project Charter).',
  '/platform/project-charter',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 35, 'universal', 'file-check', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_s_charter' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 6c. Project Team (group)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_project_team', 'Project Team',
  'Team members, roles & responsibilities, RACI, organisation structure, and contact directory (taxonomy §3, Project Team).',
  NULL,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 60, 'universal', 'users', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_project_team' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_team' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_pt_members',      'Team Members',              'Project team roster.', '/platform/teams', 10, 'user-check'),
  ('plat_pm_pt_roles',        'Roles & Responsibilities',  'Defined project roles and their responsibilities.', '/pmo-admin/roles-responsibilities', 20, 'clipboard-list'),
  ('plat_pm_pt_raci',         'RACI',                      'Responsible / Accountable / Consulted / Informed matrix.', '/pm/resources/raci', 30, 'check-square'),
  ('plat_pm_pt_org_structure','Organisation Structure',    'Project team reporting structure by role.', '/platform/project-team/org-structure', 40, 'network'),
  ('plat_pm_pt_contacts',     'Contact Directory',         'Project contacts — internal, client, vendor, and other.', '/platform/project-contacts', 50, 'book-open')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 6d. Governance (group)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_governance', 'Governance',
  'Governance structure, steering committee, project board, meeting calendar, delegated authorities, and decisions (taxonomy §3, Governance).',
  NULL,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_setup' AND COALESCE(is_deleted, FALSE) = FALSE),
  2, 70, 'universal', 'shield', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_gov_structure',   'Governance Structure',  'Governance model, escalation path, and PMO oversight notes.', '/platform/governance-structure', 10, 'layers'),
  ('plat_pm_gov_steering',    'Steering Committee',    'Steering Committee membership.', '/platform/governance/steering-committee', 20, 'users-2'),
  ('plat_pm_gov_board',       'Project Board',         'Project Board membership.', '/platform/governance/project-board', 30, 'briefcase'),
  ('plat_pm_gov_meetings',    'Meeting Calendar',      'Scheduled governance meetings for this project.', '/platform/governance/meeting-calendar', 40, 'calendar'),
  ('plat_pm_gov_authorities', 'Delegated Authorities', 'Approval thresholds and delegated authority levels.', '/pmo-admin/authorities', 50, 'clipboard-check'),
  ('plat_pm_gov_decisions',   'Governance Decisions',  'Project decision log.', '/platform/governance/decisions', 60, 'target')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Re-parent the existing "Governance Framework" leaf (currently a flat Project Setup
-- child, v981) into the new Governance group as its 7th, most-general item.
UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_governance' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 3,
    sort_order = 70,
    updated_at = NOW()
WHERE menu_code = 'plat_pm_s_gov_framework' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 7. Grants — copy the existing Project Setup grant set (plat_pm_s_gov_framework's
-- role_menu_items rows) onto every new leaf. Groups need no explicit grant row — their
-- visibility is derived purely from whether they have any visible children (v981 pattern).

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_s_gov_framework'
JOIN public.menu_items dst ON dst.menu_code IN (
  'plat_pm_s_project_details', 'plat_pm_s_charter',
  'plat_pm_pt_members', 'plat_pm_pt_roles', 'plat_pm_pt_raci', 'plat_pm_pt_org_structure', 'plat_pm_pt_contacts',
  'plat_pm_gov_structure', 'plat_pm_gov_steering', 'plat_pm_gov_board', 'plat_pm_gov_meetings',
  'plat_pm_gov_authorities', 'plat_pm_gov_decisions'
) AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1020: Project Setup expanded — Project Details, Project Charter, Project Team group (5 items), Governance group (7 items)';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, parent_menu_id, menu_level, sort_order
--   FROM public.menu_items
--   WHERE menu_code LIKE 'plat_pm_s_%' OR menu_code LIKE 'plat_pm_pt_%' OR menu_code LIKE 'plat_pm_gov_%'
--      OR menu_code IN ('plat_pm_project_team', 'plat_pm_governance')
--   ORDER BY menu_level, sort_order;
