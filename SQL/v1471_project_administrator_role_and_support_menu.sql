-- ============================================================================
-- v1471: Project Administrator role + Support menu pack (v1343, slice 1)
-- ============================================================================
-- PRD projectprd/v1343_project_administrator_support_role_PRD.md (amendments A1–A10),
-- plan projectplan/v1343_project_administrator_support_role_plan.md.
--
-- 1. Built-in role project_administrator, level 7 on both scales (A10):
--    public.roles (menu grants, user_roles) and the public.project_roles template (invites,
--    memberships). The project role carries role_skills, so "Add from Built-in Roles" offers it as
--    a functional role (A7), and user.invite (A3 / A8). No approve or budget permissions.
-- 2. Placement key 'support' allowed in menu_item_placements and as a custom-role layout.
-- 3. Menu grants: everything the built-in Project Manager can open, except the PA exclusions
--    (D9 / A1): project creation and archives, approval queues and approval chains, Regional &
--    Format, risk categories, role management, Industry Modules switch-off, work authorisation,
--    expense approvals, template administration. "(V)" pages are granted with can_use = FALSE
--    (sidebar "view only" hint — A1). Team Timesheets and My Timesheets come from the Team
--    Manager grants. Simulator items follow the same lists (matched by code, or by label without
--    a leading "Practice").
-- 4. Placements 'support': a copy of the Project Manager placements minus the exclusions, plus
--    Team Timesheets / My Timesheets under Money & Resources. The Support menu is compact (A5:
--    only placed pages show).
-- Idempotent. Run after v1463 / v1469.
-- ============================================================================

-- ── 1. The role ───────────────────────────────────────────────────────────────────────
INSERT INTO public.roles (role_name, role_display_name, role_description, role_level, is_system_role, is_default_role, is_active, account_id)
SELECT 'project_administrator', 'Project Administrator',
       'Assists the Project Manager: meetings, actions, reports, documents, timesheet follow-up and schedule / RAID upkeep.',
       7, TRUE, FALSE, TRUE, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE role_name = 'project_administrator' AND account_id IS NULL);

INSERT INTO public.project_roles (role_name, role_display_name, role_description, is_system_default, is_template, role_level, permissions, role_skills, is_active)
SELECT 'project_administrator', 'Project Administrator',
       'Assists the Project Manager: meetings, actions, reports, documents, timesheet follow-up and schedule / RAID upkeep.',
       TRUE, TRUE, 7,
       '["project.view", "tasks.view", "tasks.create", "tasks.edit", "tasks.assign", "team.view", "risks.manage", "reports.view", "user.invite"]'::jsonb,
       'Meeting organisation and minutes; action tracking; status reporting; timesheet administration and follow-up; document control; schedule and RAID log maintenance',
       TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.project_roles WHERE role_name = 'project_administrator' AND project_id IS NULL AND account_id IS NULL);

UPDATE public.project_roles
SET role_skills = COALESCE(NULLIF(btrim(role_skills), ''),
      'Meeting organisation and minutes; action tracking; status reporting; timesheet administration and follow-up; document control; schedule and RAID log maintenance'),
    role_level = 7
WHERE role_name = 'project_administrator' AND project_id IS NULL AND account_id IS NULL;

-- ── 2. 'support' as a placement key and a custom-role layout ──────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    WHERE nsp.nspname = 'public' AND cls.relname = 'menu_item_placements' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%placement_key%'
  LOOP
    EXECUTE format('ALTER TABLE public.menu_item_placements DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;
ALTER TABLE public.menu_item_placements ADD CONSTRAINT menu_item_placements_placement_key_check CHECK (placement_key IN (
  'pm', 'team', 'team_member', 'support', 'programme', 'portfolio', 'pmo_oversight', 'pmo_organisation',
  'executive', 'sponsor', 'board', 'assurance', 'qa', 'change_authority', 'stakeholder', 'viewer'));

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_menu_layout_key_check;
ALTER TABLE public.roles ADD CONSTRAINT roles_menu_layout_key_check CHECK (menu_layout_key IS NULL OR menu_layout_key IN (
  'pm', 'team', 'team_member', 'support', 'programme', 'portfolio', 'executive', 'sponsor', 'board', 'assurance', 'qa',
  'change_authority', 'stakeholder', 'viewer'));
ALTER TABLE public.project_roles DROP CONSTRAINT IF EXISTS project_roles_menu_layout_key_check;
ALTER TABLE public.project_roles ADD CONSTRAINT project_roles_menu_layout_key_check CHECK (menu_layout_key IS NULL OR menu_layout_key IN (
  'pm', 'team', 'team_member', 'support', 'programme', 'portfolio', 'executive', 'sponsor', 'board', 'assurance', 'qa',
  'change_authority', 'stakeholder', 'viewer'));

-- ── 3. Menu grants ────────────────────────────────────────────────────────────────────
WITH excluded_codes(code) AS (VALUES
  ('plat_pm_all_projects'), ('plat_pm_create_project'), ('plat_pm_archives'),
  ('plat_pm_pending_approval'), ('sim_pm_pending_approval'),
  ('plat_pm_approval_chains'), ('plat_pm_s_regional_format'), ('plat_pm_risk_categories'),
  ('plat_pm_manage_roles'), ('plat_pm_industry_modules'), ('sim_pm_industry_modules'),
  ('plat_pm_s_work_auth'), ('plat_pm_exp_approvals'),
  ('plat_pm_p_itto_templates'), ('plat_pm_p_itto_drafts'),
  ('plat_pm_templates'), ('plat_pm_project_templates'), ('plat_grp_template_library'),
  ('plat_grp_process_groups'), ('plat_grp_standards_based_forms')
),
excluded_labels(label) AS (VALUES
  ('all projects'), ('create project'), ('create practice project'), ('archives'), ('pending approval'),
  ('approval chains'), ('regional & format settings'), ('risk categories'), ('manage roles'),
  ('industry modules'), ('work authorisation'), ('expense approvals'), ('itto templates'), ('itto drafts')
),
view_only_codes(code) AS (VALUES
  ('plat_pm_s_project_details'), ('plat_pm_s_mandate'), ('plat_pm_s_brief'), ('plat_pm_s_charter'),
  ('plat_pm_s_business_case'), ('plat_s_pids'), ('plat_pm_s_pid'), ('plat_s_benefits_review'), ('plat_pm_s_benefits_rp'),
  ('plat_pm_ps_governance'), ('plat_pm_s_working_days_holidays'), ('plat_pm_s_timesheet_settings'),
  ('plat_pm_s_document_signatory'), ('plat_pm_testing_environments'),
  ('plat_pm_s_qms'), ('plat_pm_s_rms'), ('plat_pm_s_cms'), ('plat_pm_s_conf_ms'), ('plat_pm_s_doc_gov'),
  ('plat_pm_planning_scope_statement'), ('plat_pm_eef'), ('plat_pm_planning_scenarios'), ('plat_pm_a_scurve'),
  ('plat_pm_gov_stage_gates'), ('plat_pm_s_stage_gates'), ('plat_pm_s_policies'),
  ('plat_pm_benefits'), ('plat_pm_budget'), ('plat_pm_cost_actuals'), ('plat_pm_cost_evm'), ('plat_pm_fin_reports'),
  ('plat_pm_procurement'), ('plat_pm_all_teams'), ('plat_pm_skill_matrix')
),
view_only_labels AS (
  SELECT DISTINCT lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) AS label
  FROM public.menu_items mi JOIN view_only_codes v ON v.code = mi.menu_code
),
pa AS (SELECT id FROM public.roles WHERE role_name = 'project_administrator' AND account_id IS NULL LIMIT 1),
source_grants AS (
  -- Project Manager grants, plus the Team Manager's two timesheet pages
  SELECT DISTINCT ON (rmi.menu_item_id) rmi.menu_item_id, rmi.can_use
  FROM public.role_menu_items rmi
  JOIN public.roles r ON r.id = rmi.role_id AND r.account_id IS NULL
  JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
  WHERE rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE
    AND (r.role_name = 'project_manager'
         OR (r.role_name = 'team_manager' AND mi.menu_code IN ('plat_tl_timesheet_mgmt', 'plat_tm_timesheets')))
  ORDER BY rmi.menu_item_id, rmi.can_use DESC
),
kept AS (
  SELECT g.menu_item_id, g.can_use, mi.menu_code,
         lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) AS label
  FROM source_grants g
  JOIN public.menu_items mi ON mi.id = g.menu_item_id AND COALESCE(mi.is_deleted, FALSE) = FALSE
  WHERE mi.menu_code NOT IN (SELECT code FROM excluded_codes)
    AND lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) NOT IN (SELECT label FROM excluded_labels)
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), pa.id, k.menu_item_id, TRUE,
       k.can_use AND k.menu_code NOT IN (SELECT code FROM view_only_codes)
                 AND NOT (k.menu_code LIKE 'sim\_%' AND k.label IN (SELECT label FROM view_only_labels)),
       TRUE, NOW(), NOW()
FROM kept k CROSS JOIN pa
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = EXCLUDED.can_use, is_active = TRUE, updated_at = NOW();

-- ── 4. Placements 'support' (copy of 'pm' minus exclusions, plus timesheet pages) ────────
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope)
SELECT p.menu_item_id, 'support', p.section_code, p.parent_menu_item_id, p.slot_key, p.sort_order, p.scope
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE p.placement_key = 'pm' AND p.is_active = TRUE
  AND mi.menu_code NOT IN (
    'plat_pm_all_projects', 'plat_pm_create_project', 'plat_pm_archives', 'plat_pm_pending_approval', 'sim_pm_pending_approval',
    'plat_pm_approval_chains', 'plat_pm_s_regional_format', 'plat_pm_risk_categories', 'plat_pm_manage_roles',
    'plat_pm_industry_modules', 'sim_pm_industry_modules', 'plat_pm_s_work_auth', 'plat_pm_exp_approvals',
    'plat_pm_p_itto_templates', 'plat_pm_p_itto_drafts', 'plat_pm_templates', 'plat_pm_project_templates',
    'plat_grp_template_library', 'plat_grp_process_groups', 'plat_grp_standards_based_forms')
  AND lower(regexp_replace(mi.menu_label, '^Practice\s+', '', 'i')) NOT IN (
    'all projects', 'create project', 'create practice project', 'archives', 'pending approval', 'approval chains',
    'regional & format settings', 'risk categories', 'manage roles', 'industry modules', 'work authorisation',
    'expense approvals', 'itto templates', 'itto drafts')
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  slot_key = EXCLUDED.slot_key, sort_order = EXCLUDED.sort_order, scope = EXCLUDED.scope,
  is_active = TRUE, updated_at = NOW();

INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT mi.id, 'support', v.section_code, NULL, NULL, v.sort_order
FROM (VALUES
  ('plat_tl_timesheet_mgmt', 'money_resources', 10),
  ('plat_tm_timesheets',     'money_resources', 11)
) AS v(menu_code, section_code, sort_order)
JOIN public.menu_items mi ON mi.menu_code = v.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code, sort_order = EXCLUDED.sort_order, is_active = TRUE, updated_at = NOW();

-- Placement writes bump menu_placement_version (v1449 trigger).

-- ── 5. Default invitation message for every organisation (same text as defaultInvitationMessages.js) ──
INSERT INTO public.invitation_message_templates (account_id, role_name, template_label, subject_line, message_body, is_active)
SELECT a.id, 'project_administrator', 'Project Administrator', NULL,
       E'Dear {{invitee_name}},\n\nYou have been invited to join **{{project_name}}** as **{{role_name}}**. You will support the Project Manager with meetings, actions, reports, documents, timesheet follow-up and keeping the schedule and RAID log up to date. Welcome to the team.\n\n{{invitation_expiry_note}}',
       TRUE
FROM public.accounts a
WHERE COALESCE(a.is_deleted, FALSE) = FALSE
ON CONFLICT (account_id, role_name) DO NOTHING;

-- Check: role rows, grants (total / view-only), placements, and excluded pages that slipped through.
SELECT
  (SELECT count(*) FROM public.roles WHERE role_name = 'project_administrator' AND account_id IS NULL) AS roles_row_1,
  (SELECT count(*) FROM public.project_roles WHERE role_name = 'project_administrator' AND project_id IS NULL) AS project_role_row_1,
  (SELECT count(*) FROM public.role_menu_items rmi JOIN public.roles r ON r.id = rmi.role_id
    WHERE r.role_name = 'project_administrator' AND rmi.is_active = TRUE) AS grants,
  (SELECT count(*) FROM public.role_menu_items rmi JOIN public.roles r ON r.id = rmi.role_id
    WHERE r.role_name = 'project_administrator' AND rmi.is_active = TRUE AND rmi.can_use = FALSE) AS view_only_grants,
  (SELECT count(*) FROM public.menu_item_placements WHERE placement_key = 'support' AND is_active = TRUE) AS support_placements,
  (SELECT count(*) FROM public.menu_item_placements p JOIN public.menu_items mi ON mi.id = p.menu_item_id
    WHERE p.placement_key = 'support' AND p.is_active = TRUE
      AND mi.menu_code IN ('plat_pm_create_project', 'plat_pm_approval_chains', 'plat_pm_industry_modules', 'plat_pm_exp_approvals')) AS excluded_placed_expect_0;

NOTIFY pgrst, 'reload schema';
