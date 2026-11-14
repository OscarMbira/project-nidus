-- ============================================================================
-- v1449: Consolidated role menus — placement data foundation (Slice 1)
-- PRD/plan: projectprd/v1341_consolidated_role_menus_PRD.md / projectplan/v1341_consolidated_role_menus_plan.md
--
-- The sidebar becomes one consolidated menu per role (rule 75). The catalogue (menu_items,
-- industry_pack_menu_items, role_menu_items) is unchanged. This file adds the placement layer:
--   public.menu_sections            sections per app (D29): 9 sections + footer, labels from data,
--                                   plus 'organisation' (PMO Organisation zone and D28 organisation-level
--                                   industry pages; hidden for roles with nothing placed there)
--   public.menu_slots               shared slots (D4 / D5 / D23): one sidebar entry, several pages
--   public.menu_item_placements     menu item x placement key -> section, sub-menu parent, slot, order, scope
--   public.menu_items.default_section_code   safety net for items with no placement (story 25)
--   public.menu_placement_version   version stamp, bumped by any placement / section / slot write (R5)
--   public.account_menu_settings    per-organisation switch (D11 / D20 / D30), written by Admin only
--   public.project_disabled_menu_items       per-project switch-off (D16 / D19)
--   sim.practice_project_disabled_menu_items per-practice-project switch-off (D12)
--
-- With every organisation's switch off (the default), nothing changes in any sidebar.
-- Writes: no client write policies. Admin writes through public.admin_* RPCs (Admin SQL,
-- Slice 13); project switch-off through SECURITY DEFINER RPCs (Slice 5).
-- After running: re-run SQL/v1251_planner_table_wall.sql (new public tables).
-- Idempotent.
-- ============================================================================

-- ── 1. Sections (D29) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app TEXT NOT NULL CHECK (app IN ('platform', 'simulator')),
  section_code TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_footer BOOLEAN NOT NULL DEFAULT FALSE,
  overflow_label TEXT,                       -- D14: label of the generated industry group entry
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (app, section_code)
);

-- ── 2. Shared slots (D4 / D5 / D23) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app TEXT NOT NULL CHECK (app IN ('platform', 'simulator')),
  slot_key TEXT NOT NULL,
  label TEXT NOT NULL,                       -- used when two or more members are visible
  section_code TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (app, slot_key)
);

-- ── 3. Placements (D10) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_item_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  placement_key TEXT NOT NULL CHECK (placement_key IN (
    'pm', 'team', 'team_member', 'programme', 'portfolio', 'pmo_oversight', 'pmo_organisation',
    'executive', 'sponsor', 'board', 'assurance', 'qa', 'change_authority', 'stakeholder', 'viewer')),
  section_code TEXT NOT NULL,
  parent_menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,  -- Level 3 (D13 / D13b)
  slot_key TEXT,                             -- member of a shared slot
  sort_order INTEGER NOT NULL DEFAULT 0,
  scope TEXT NOT NULL DEFAULT 'project' CHECK (scope IN ('project', 'organisation')),  -- D28
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (menu_item_id, placement_key)
);

CREATE INDEX IF NOT EXISTS idx_menu_item_placements_key
  ON public.menu_item_placements(placement_key) WHERE is_active = TRUE;

-- ── 4. Default section (story 25) ───────────────────────────────────────────
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS default_section_code TEXT;
COMMENT ON COLUMN public.menu_items.default_section_code IS
  'v1449: section an item (and its descendants without a placement) falls back to in the consolidated sidebar.';

-- ── 5. Version stamp (R5) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menu_placement_version (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO public.menu_placement_version (id, version) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.bump_menu_placement_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.menu_placement_version SET version = version + 1, updated_at = NOW() WHERE id = 1;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_menu_sections_version ON public.menu_sections;
CREATE TRIGGER trg_menu_sections_version AFTER INSERT OR UPDATE OR DELETE ON public.menu_sections
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_menu_placement_version();
DROP TRIGGER IF EXISTS trg_menu_slots_version ON public.menu_slots;
CREATE TRIGGER trg_menu_slots_version AFTER INSERT OR UPDATE OR DELETE ON public.menu_slots
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_menu_placement_version();
DROP TRIGGER IF EXISTS trg_menu_item_placements_version ON public.menu_item_placements;
CREATE TRIGGER trg_menu_item_placements_version AFTER INSERT OR UPDATE OR DELETE ON public.menu_item_placements
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_menu_placement_version();
DROP TRIGGER IF EXISTS trg_menu_items_default_section_version ON public.menu_items;
CREATE TRIGGER trg_menu_items_default_section_version AFTER UPDATE OF default_section_code ON public.menu_items
  FOR EACH STATEMENT EXECUTE FUNCTION public.bump_menu_placement_version();

-- ── 6. Per-organisation switch (D11 / D20 / D30) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.account_menu_settings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  consolidated_menu_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID                            -- Admin user id (admin.admin_users), set by the Admin RPC
);

-- ── 7. Per-project switch-off (D16 / D19, R3) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_disabled_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  disabled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  disabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, menu_item_id)
);

CREATE TABLE IF NOT EXISTS sim.practice_project_disabled_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  disabled_by UUID,                          -- auth.users id of the practice project owner
  disabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (practice_project_id, menu_item_id)
);

-- Switch-off history (R3: who switched what, and when; never changes records).
CREATE TABLE IF NOT EXISTS public.project_menu_item_switch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app TEXT NOT NULL CHECK (app IN ('platform', 'simulator')),
  project_id UUID NOT NULL,                  -- public.projects.id or sim.practice_projects.id
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('switched_off', 'switched_on')),
  changed_by_auth_id UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_menu_item_switch_log_project
  ON public.project_menu_item_switch_log(app, project_id, changed_at DESC);

-- ── 8. RLS: read-only for clients ───────────────────────────────────────────
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_placement_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_menu_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_disabled_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.practice_project_disabled_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_menu_item_switch_log ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.menu_sections, public.menu_slots, public.menu_item_placements,
  public.menu_placement_version, public.account_menu_settings, public.project_disabled_menu_items,
  public.project_menu_item_switch_log TO authenticated;
GRANT SELECT ON sim.practice_project_disabled_menu_items TO authenticated;
GRANT ALL ON public.menu_sections, public.menu_slots, public.menu_item_placements,
  public.menu_placement_version, public.account_menu_settings, public.project_disabled_menu_items,
  public.project_menu_item_switch_log TO service_role;
GRANT ALL ON sim.practice_project_disabled_menu_items TO service_role;

DROP POLICY IF EXISTS policy_menu_sections_read ON public.menu_sections;
CREATE POLICY policy_menu_sections_read ON public.menu_sections FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS policy_menu_slots_read ON public.menu_slots;
CREATE POLICY policy_menu_slots_read ON public.menu_slots FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS policy_menu_item_placements_read ON public.menu_item_placements;
CREATE POLICY policy_menu_item_placements_read ON public.menu_item_placements FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS policy_menu_placement_version_read ON public.menu_placement_version;
CREATE POLICY policy_menu_placement_version_read ON public.menu_placement_version FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS policy_account_menu_settings_read ON public.account_menu_settings;
CREATE POLICY policy_account_menu_settings_read ON public.account_menu_settings
  FOR SELECT TO authenticated USING (public.auth_user_is_account_member(account_id));

DROP POLICY IF EXISTS policy_project_disabled_menu_items_read ON public.project_disabled_menu_items;
CREATE POLICY policy_project_disabled_menu_items_read ON public.project_disabled_menu_items
  FOR SELECT TO authenticated USING (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_sim_practice_project_disabled_menu_items_read ON sim.practice_project_disabled_menu_items;
CREATE POLICY policy_sim_practice_project_disabled_menu_items_read ON sim.practice_project_disabled_menu_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_disabled_menu_items.practice_project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    )
  );

DROP POLICY IF EXISTS policy_project_menu_item_switch_log_read ON public.project_menu_item_switch_log;
CREATE POLICY policy_project_menu_item_switch_log_read ON public.project_menu_item_switch_log
  FOR SELECT TO authenticated
  USING (
    (app = 'platform' AND public.auth_user_can_access_project(project_id))
    OR (app = 'simulator' AND EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = project_menu_item_switch_log.project_id
        AND (pp.user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM sim.practice_project_memberships m
          WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND m.is_active = TRUE
        ))
    ))
  );

-- ── 9. Seed: sections for both apps (D29) ───────────────────────────────────
INSERT INTO public.menu_sections (app, section_code, label, icon, sort_order, is_footer, overflow_label)
SELECT a.app, v.section_code, v.label, v.icon, v.sort_order, v.is_footer, v.overflow_label
FROM (VALUES ('platform'), ('simulator')) AS a(app)
CROSS JOIN (VALUES
  ('home',                  'Home',                         'home',           10,  FALSE, NULL),
  ('project_setup',         'Project Setup',                'folder-cog',     20,  FALSE, 'Industry setup'),
  ('scope_requirements',    'Scope & Requirements',         'target',         30,  FALSE, 'Industry scope'),
  ('plan_schedule',         'Plan & Schedule',              'calendar-range', 40,  FALSE, 'Industry planning'),
  ('deliver_test',          'Deliver & Test',               'hammer',         50,  FALSE, 'Industry delivery'),
  ('risks_governance',      'Risks, Changes & Governance',  'shield-alert',   60,  FALSE, 'Industry controls'),
  ('stakeholders_adoption', 'Stakeholders & Adoption',      'users',          70,  FALSE, 'Industry adoption'),
  ('readiness_close',       'Readiness, Benefits & Close',  'flag',           80,  FALSE, 'Industry readiness'),
  ('money_resources',       'Money & Resources',            'wallet',         90,  FALSE, 'Industry commercial'),
  ('organisation',          'Organisation',                 'building-2',     95,  FALSE, 'Industry libraries'),
  ('footer',                'Reports & Documents',          'file-text',      100, TRUE,  NULL)
) AS v(section_code, label, icon, sort_order, is_footer, overflow_label)
ON CONFLICT (app, section_code) DO NOTHING;

-- ── 10. Seed: shared slots (proposal §4; core pages lead, D23) ──────────────
INSERT INTO public.menu_slots (app, slot_key, label, section_code, sort_order)
SELECT a.app, v.slot_key, v.label, v.section_code, v.sort_order
FROM (VALUES ('platform'), ('simulator')) AS a(app)
CROSS JOIN (VALUES
  ('delivery_overview',     'Delivery Overview',          'project_setup',         15),
  ('environments',          'Environments',               'project_setup',         95),
  ('requirements',          'Requirements',               'scope_requirements',    30),
  ('design_architecture',   'Design & Architecture',      'scope_requirements',    60),
  ('interfaces',            'Interfaces',                 'scope_requirements',    70),
  ('data_migration',        'Data & Migration',           'deliver_test',          40),
  ('facilities_equipment',  'Facilities & Equipment',     'deliver_test',          45),
  ('quality',               'Quality',                    'deliver_test',          60),
  ('testing',               'Testing',                    'deliver_test',          70),
  ('compliance',            'Compliance',                 'risks_governance',      80),
  ('health_safety',         'Health, Safety & Environment','risks_governance',     85),
  ('business_change',       'Business Change',            'stakeholders_adoption', 60),
  ('training',              'Training',                   'stakeholders_adoption', 70),
  ('benefits_results',      'Benefits & Results',         'readiness_close',       10),
  ('operational_readiness', 'Operational Readiness',      'readiness_close',       30),
  ('cutover',               'Cutover',                    'readiness_close',       40),
  ('go_live_hypercare',     'Go-Live & Hypercare',        'readiness_close',       50),
  ('procurement',           'Procurement',                'money_resources',       60)
) AS v(slot_key, label, section_code, sort_order)
ON CONFLICT (app, slot_key) DO NOTHING;

-- ── 11. Register new tables ─────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('menu_sections', 'Consolidated sidebar sections per app (labels, icons, order, footer), v1449', true, true),
  ('menu_slots', 'Shared sidebar slots: one entry for pages that mean the same across industry packs, v1449', true, true),
  ('menu_item_placements', 'Where each menu item appears per role layout: section, sub-menu parent, slot, order, scope, v1449', true, true),
  ('menu_placement_version', 'Version stamp bumped on any sidebar placement change, used to refresh cached menus, v1449', true, true),
  ('account_menu_settings', 'Per-organisation switch for the consolidated role sidebar, set by Admin, v1449', true, true),
  ('project_disabled_menu_items', 'Industry menu items a project has switched off (hidden only, records kept), v1449', false, true),
  ('sim.practice_project_disabled_menu_items', 'Industry menu items a practice project has switched off, v1449', false, true),
  ('project_menu_item_switch_log', 'History of industry menu items switched off / on per project, v1449', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ── Check ───────────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.menu_sections WHERE app = 'platform') AS platform_sections_expected_11,
  (SELECT count(*) FROM public.menu_sections WHERE app = 'simulator') AS simulator_sections_expected_11,
  (SELECT count(*) FROM public.menu_slots WHERE app = 'platform') AS platform_slots_expected_18,
  (SELECT version FROM public.menu_placement_version WHERE id = 1) AS placement_version;
