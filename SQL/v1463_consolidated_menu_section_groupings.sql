-- ============================================================================
-- v1463: Consolidated role menus — shorter sections (audit result C, owner decisions 2026-11-14)
-- PRD/plan: projectprd/v1341 (D14, rule 75 "about 12 pages per section") / projectplan/v1341
--
-- Audit C found core sections over ~12 entries. The owner chose these sub-menus (Level 3, like
-- Project Team / Governance Setup); pages and routes do not change:
--   Project Setup        › Management Strategies  Quality, Risk, Communication, Configuration
--                                                  Management Strategies + Document Governance
--   Reports & Documents  › Project Reports        Checkpoint, Highlight, Issue, Exception,
--                                                  End Stage and End Project reports
--   Deliver & Test       › Agile Tools            Releases / Sprints, Story Map, Value Stream Map,
--                                                  Kaizen Board, Planning Poker, Agile Process Forms
--   Plan & Schedule      › ITTO                   ITTO Project, ITTO Templates, ITTO Drafts
--   Risks, Changes & Gov › RAID Registers         Risk, Issue, Assumptions, Constraints registers
--                                                  (RAID Log stays its own entry)
--   Home                 › My Work                My Tasks, My Daily Log, My Expenses, Calendar
-- and the Benefits Review Plan shows once (two catalogue rows open the same page).
--
-- Each sub-menu is a consolidated-only catalogue row (is_visible = FALSE, rule 75): today's
-- sidebar never shows it. A role gets the sub-menu only where it has two or more of the group's
-- pages placed at top level, so no role gets a one-item sub-menu.
-- Platform menus. The Simulator's practice sections were not over the limit (audit C).
-- Idempotent. Run after v1462.
-- ============================================================================

-- ── 1. Catalogue: the sub-menu rows (consolidated-only) ─────────────────────
WITH tmp_menu_groups(group_code, label, icon, section_code, parent_code, description) AS (VALUES
('plat_pm_grp_mgmt_strategies', 'Management Strategies', 'book-open',     'project_setup',    'plat_pm_project_setup',
   'Consolidated sidebar sub-menu (v1463): quality, risk, communication and configuration management strategies, document governance.'),
  ('plat_pm_grp_project_reports', 'Project Reports',       'file-bar-chart', 'footer',           NULL,
   'Consolidated sidebar sub-menu (v1463): checkpoint, highlight, issue, exception, end stage and end project reports.'),
  ('plat_pm_grp_agile_tools',     'Agile Tools',           'zap',           'deliver_test',     NULL,
   'Consolidated sidebar sub-menu (v1463): releases, story map, value stream map, kaizen, planning poker, agile process forms.'),
  ('plat_pm_grp_itto',            'ITTO',                  'list-tree',     'plan_schedule',    NULL,
   'Consolidated sidebar sub-menu (v1463): ITTO project, templates and drafts.'),
  ('plat_pm_grp_raid_registers',  'RAID Registers',        'shield-alert',  'risks_governance', 'plat_pm_raid',
   'Consolidated sidebar sub-menu (v1463): risk, issue, assumptions and constraints registers.'),
  ('plat_pm_grp_my_work',         'My Work',               'briefcase',     'home',             NULL,
   'Consolidated sidebar sub-menu (v1463): my tasks, daily log, expenses and calendar.')
)
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), g.group_code, g.label, g.description, NULL,
       (SELECT id FROM public.menu_items WHERE menu_code = g.parent_code AND COALESCE(is_deleted, FALSE) = FALSE),
       2, 0, 'universal', g.icon, TRUE, FALSE, NOW(), NOW()
FROM tmp_menu_groups g
WHERE NOT EXISTS (SELECT 1 FROM public.menu_items m WHERE m.menu_code = g.group_code);

-- ── 2. Sub-menu placement for every role with 2+ of the group's pages ───────
WITH tmp_menu_groups(group_code, label, icon, section_code, parent_code, description) AS (VALUES
('plat_pm_grp_mgmt_strategies', 'Management Strategies', 'book-open',     'project_setup',    'plat_pm_project_setup',
   'Consolidated sidebar sub-menu (v1463): quality, risk, communication and configuration management strategies, document governance.'),
  ('plat_pm_grp_project_reports', 'Project Reports',       'file-bar-chart', 'footer',           NULL,
   'Consolidated sidebar sub-menu (v1463): checkpoint, highlight, issue, exception, end stage and end project reports.'),
  ('plat_pm_grp_agile_tools',     'Agile Tools',           'zap',           'deliver_test',     NULL,
   'Consolidated sidebar sub-menu (v1463): releases, story map, value stream map, kaizen, planning poker, agile process forms.'),
  ('plat_pm_grp_itto',            'ITTO',                  'list-tree',     'plan_schedule',    NULL,
   'Consolidated sidebar sub-menu (v1463): ITTO project, templates and drafts.'),
  ('plat_pm_grp_raid_registers',  'RAID Registers',        'shield-alert',  'risks_governance', 'plat_pm_raid',
   'Consolidated sidebar sub-menu (v1463): risk, issue, assumptions and constraints registers.'),
  ('plat_pm_grp_my_work',         'My Work',               'briefcase',     'home',             NULL,
   'Consolidated sidebar sub-menu (v1463): my tasks, daily log, expenses and calendar.')
),
tmp_menu_group_children(group_code, menu_code, ord) AS (VALUES
('plat_pm_grp_mgmt_strategies', 'plat_pm_s_qms', 10),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_rms', 20),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_cms', 30),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_conf_ms', 40),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_doc_gov', 50),
  ('plat_pm_grp_project_reports', 'plat_pm_s_checkpoint', 10),
  ('plat_pm_grp_project_reports', 'plat_pm_s_highlight', 20),
  ('plat_pm_grp_project_reports', 'plat_pm_s_issue_rep', 30),
  ('plat_pm_grp_project_reports', 'plat_pm_s_exception', 40),
  ('plat_pm_grp_project_reports', 'plat_pm_s_end_stage', 50),
  ('plat_pm_grp_project_reports', 'plat_pm_s_end_project', 60),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_releases', 10),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_story_map', 20),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_vsm', 30),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_kaizen', 40),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_planning_poker', 50),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_process_forms', 60),
  ('plat_pm_grp_itto',            'plat_pm_p_itto_project', 10),
  ('plat_pm_grp_itto',            'plat_pm_p_itto_templates', 20),
  ('plat_pm_grp_itto',            'plat_pm_p_itto_drafts', 30),
  ('plat_pm_grp_raid_registers',  'plat_pm_risk_reg', 10),
  ('plat_pm_grp_raid_registers',  'plat_pm_issue_log', 20),
  ('plat_pm_grp_raid_registers',  'plat_pm_assumptions_reg', 30),
  ('plat_pm_grp_raid_registers',  'plat_pm_constraints_reg', 40),
  ('plat_pm_grp_my_work',         'plat_pm_my_tasks', 10),
  ('plat_pm_grp_my_work',         'plat_pm_daily_log', 20),
  ('plat_pm_grp_my_work',         'plat_pm_my_expenses', 30),
  ('plat_pm_grp_my_work',         'my_expenses', 31),
  ('plat_pm_grp_my_work',         'plat_pm_calendar', 40)
)
INSERT INTO public.menu_item_placements (menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order)
SELECT gi.id, p.placement_key, g.section_code, NULL, NULL, min(p.sort_order)
FROM tmp_menu_group_children c
JOIN tmp_menu_groups g ON g.group_code = c.group_code
JOIN public.menu_items gi ON gi.menu_code = g.group_code
JOIN public.menu_items ci ON ci.menu_code = c.menu_code AND COALESCE(ci.is_deleted, FALSE) = FALSE
JOIN public.menu_item_placements p
  ON p.menu_item_id = ci.id AND p.is_active = TRUE
 AND (p.parent_menu_item_id IS NULL OR p.parent_menu_item_id = gi.id)
 AND p.section_code = g.section_code
GROUP BY gi.id, p.placement_key, g.section_code
HAVING count(DISTINCT ci.id) >= 2
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  sort_order = LEAST(public.menu_item_placements.sort_order, EXCLUDED.sort_order),
  is_active = TRUE,
  updated_at = NOW();

-- ── 3. Move the pages under their sub-menu, for those roles ─────────────────
WITH tmp_menu_groups(group_code, label, icon, section_code, parent_code, description) AS (VALUES
('plat_pm_grp_mgmt_strategies', 'Management Strategies', 'book-open',     'project_setup',    'plat_pm_project_setup',
   'Consolidated sidebar sub-menu (v1463): quality, risk, communication and configuration management strategies, document governance.'),
  ('plat_pm_grp_project_reports', 'Project Reports',       'file-bar-chart', 'footer',           NULL,
   'Consolidated sidebar sub-menu (v1463): checkpoint, highlight, issue, exception, end stage and end project reports.'),
  ('plat_pm_grp_agile_tools',     'Agile Tools',           'zap',           'deliver_test',     NULL,
   'Consolidated sidebar sub-menu (v1463): releases, story map, value stream map, kaizen, planning poker, agile process forms.'),
  ('plat_pm_grp_itto',            'ITTO',                  'list-tree',     'plan_schedule',    NULL,
   'Consolidated sidebar sub-menu (v1463): ITTO project, templates and drafts.'),
  ('plat_pm_grp_raid_registers',  'RAID Registers',        'shield-alert',  'risks_governance', 'plat_pm_raid',
   'Consolidated sidebar sub-menu (v1463): risk, issue, assumptions and constraints registers.'),
  ('plat_pm_grp_my_work',         'My Work',               'briefcase',     'home',             NULL,
   'Consolidated sidebar sub-menu (v1463): my tasks, daily log, expenses and calendar.')
),
tmp_menu_group_children(group_code, menu_code, ord) AS (VALUES
('plat_pm_grp_mgmt_strategies', 'plat_pm_s_qms', 10),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_rms', 20),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_cms', 30),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_conf_ms', 40),
  ('plat_pm_grp_mgmt_strategies', 'plat_pm_s_doc_gov', 50),
  ('plat_pm_grp_project_reports', 'plat_pm_s_checkpoint', 10),
  ('plat_pm_grp_project_reports', 'plat_pm_s_highlight', 20),
  ('plat_pm_grp_project_reports', 'plat_pm_s_issue_rep', 30),
  ('plat_pm_grp_project_reports', 'plat_pm_s_exception', 40),
  ('plat_pm_grp_project_reports', 'plat_pm_s_end_stage', 50),
  ('plat_pm_grp_project_reports', 'plat_pm_s_end_project', 60),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_releases', 10),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_story_map', 20),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_vsm', 30),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_kaizen', 40),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_planning_poker', 50),
  ('plat_pm_grp_agile_tools',     'plat_pm_a_process_forms', 60),
  ('plat_pm_grp_itto',            'plat_pm_p_itto_project', 10),
  ('plat_pm_grp_itto',            'plat_pm_p_itto_templates', 20),
  ('plat_pm_grp_itto',            'plat_pm_p_itto_drafts', 30),
  ('plat_pm_grp_raid_registers',  'plat_pm_risk_reg', 10),
  ('plat_pm_grp_raid_registers',  'plat_pm_issue_log', 20),
  ('plat_pm_grp_raid_registers',  'plat_pm_assumptions_reg', 30),
  ('plat_pm_grp_raid_registers',  'plat_pm_constraints_reg', 40),
  ('plat_pm_grp_my_work',         'plat_pm_my_tasks', 10),
  ('plat_pm_grp_my_work',         'plat_pm_daily_log', 20),
  ('plat_pm_grp_my_work',         'plat_pm_my_expenses', 30),
  ('plat_pm_grp_my_work',         'my_expenses', 31),
  ('plat_pm_grp_my_work',         'plat_pm_calendar', 40)
)
UPDATE public.menu_item_placements p
   SET parent_menu_item_id = gi.id,
       sort_order = c.ord,
       updated_at = NOW()
  FROM tmp_menu_group_children c
  JOIN tmp_menu_groups g ON g.group_code = c.group_code
  JOIN public.menu_items gi ON gi.menu_code = g.group_code
  JOIN public.menu_items ci ON ci.menu_code = c.menu_code
 WHERE p.menu_item_id = ci.id
   AND p.is_active = TRUE
   AND p.parent_menu_item_id IS NULL
   AND p.section_code = g.section_code
   AND EXISTS (
     SELECT 1 FROM public.menu_item_placements gp
     WHERE gp.menu_item_id = gi.id AND gp.placement_key = p.placement_key AND gp.is_active = TRUE
   );

-- ── 4. Benefits Review Plan once (two catalogue rows open the same page) ────
UPDATE public.menu_item_placements p
   SET is_active = FALSE, updated_at = NOW()
  FROM public.menu_items dup
 WHERE p.menu_item_id = dup.id
   AND dup.menu_code = 'plat_pm_s_benefits_rp'
   AND p.is_active = TRUE
   AND EXISTS (
     SELECT 1 FROM public.menu_item_placements keep
     JOIN public.menu_items km ON km.id = keep.menu_item_id AND km.menu_code = 'plat_s_benefits_review'
     WHERE keep.placement_key = p.placement_key AND keep.is_active = TRUE
   );


-- ── Check: sub-menus per role (re-run v1452 block C afterwards) ─────────────
SELECT mi.menu_label AS sub_menu, p.placement_key,
       (SELECT count(*) FROM public.menu_item_placements c WHERE c.parent_menu_item_id = mi.id AND c.placement_key = p.placement_key AND c.is_active) AS pages
FROM public.menu_item_placements p
JOIN public.menu_items mi ON mi.id = p.menu_item_id
WHERE mi.menu_code LIKE 'plat\_pm\_grp\_%' AND p.is_active = TRUE
ORDER BY mi.menu_label, p.placement_key;
