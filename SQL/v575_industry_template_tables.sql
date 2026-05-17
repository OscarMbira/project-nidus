-- ============================================================================
-- v575: Industry Plan Templates — Database Tables
-- Creates 9 tables: 7 PMO master tables (public schema) +
--   project_industry_plan (Platform PM copy) +
--   sim.practice_industry_plan (Simulator PM copy)
-- Prerequisites: v400 (sim schema), public.projects, sim.practice_projects
-- Execution order: v575 → v576 (seed) → v577 (menu)
-- ============================================================================

-- ── 1. pmo_industry_templates — Master template header (PMO-owned) ─────────

CREATE TABLE IF NOT EXISTS public.pmo_industry_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_code     TEXT NOT NULL UNIQUE,
  industry_name     TEXT NOT NULL,
  description       TEXT,
  typical_duration  TEXT,
  icon              TEXT,
  tags              TEXT[] DEFAULT '{}',
  version           TEXT NOT NULL DEFAULT '1.0',
  status            TEXT NOT NULL DEFAULT 'published'
                      CHECK (status IN ('draft', 'published', 'archived')),
  is_active         BOOLEAN DEFAULT TRUE,
  is_deleted        BOOLEAN DEFAULT FALSE,
  created_by        UUID REFERENCES auth.users(id),
  updated_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pit_status ON public.pmo_industry_templates(status)
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_pit_industry_code ON public.pmo_industry_templates(industry_code);

-- ── 2. pmo_industry_template_phases — Stages per template ─────────────────

CREATE TABLE IF NOT EXISTS public.pmo_industry_template_phases (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_number          INT NOT NULL,
  phase_name            TEXT NOT NULL,
  phase_description     TEXT,
  estimated_duration    TEXT,
  sort_order            INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitp_template ON public.pmo_industry_template_phases(template_id);

-- ── 3. pmo_industry_template_activities — Activities with attributes ───────

CREATE TABLE IF NOT EXISTS public.pmo_industry_template_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_id              UUID REFERENCES public.pmo_industry_template_phases(id) ON DELETE SET NULL,
  activity_name         TEXT NOT NULL,
  activity_description  TEXT,
  activity_type         TEXT DEFAULT 'task'
                          CHECK (activity_type IN ('task','review','approval','meeting','deliverable','milestone')),
  typical_duration      TEXT,
  typical_effort        TEXT,
  resource_type         TEXT,
  predecessor_notes     TEXT,
  constraints           TEXT,
  sort_order            INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pita_template ON public.pmo_industry_template_activities(template_id);
CREATE INDEX IF NOT EXISTS idx_pita_phase ON public.pmo_industry_template_activities(phase_id);

-- ── 4. pmo_industry_template_deliverables — Typical deliverables ──────────

CREATE TABLE IF NOT EXISTS public.pmo_industry_template_deliverables (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_id              UUID REFERENCES public.pmo_industry_template_phases(id) ON DELETE SET NULL,
  deliverable_name      TEXT NOT NULL,
  deliverable_type      TEXT DEFAULT 'document'
                          CHECK (deliverable_type IN ('document','report','artefact','decision','approval')),
  is_mandatory          BOOLEAN DEFAULT FALSE,
  sort_order            INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitd_template ON public.pmo_industry_template_deliverables(template_id);

-- ── 5. pmo_industry_template_risks — Pre-defined risks ────────────────────

CREATE TABLE IF NOT EXISTS public.pmo_industry_template_risks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  risk_title        TEXT NOT NULL,
  risk_description  TEXT,
  risk_category     TEXT,
  likelihood        TEXT CHECK (likelihood IN ('low','medium','high')),
  impact            TEXT CHECK (impact IN ('low','medium','high')),
  sort_order        INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitr_template ON public.pmo_industry_template_risks(template_id);

-- ── 6. pmo_industry_template_milestones — Key milestones ──────────────────

CREATE TABLE IF NOT EXISTS public.pmo_industry_template_milestones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  phase_id              UUID REFERENCES public.pmo_industry_template_phases(id) ON DELETE SET NULL,
  milestone_name        TEXT NOT NULL,
  milestone_description TEXT,
  sort_order            INT DEFAULT 0,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitm_template ON public.pmo_industry_template_milestones(template_id);

-- ── 7. pmo_industry_template_roles — Recommended team roles ───────────────

CREATE TABLE IF NOT EXISTS public.pmo_industry_template_roles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID NOT NULL REFERENCES public.pmo_industry_templates(id) ON DELETE CASCADE,
  role_title        TEXT NOT NULL,
  role_description  TEXT,
  is_key_role       BOOLEAN DEFAULT FALSE,
  sort_order        INT DEFAULT 0,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pitroles_template ON public.pmo_industry_template_roles(template_id);

-- ── 8. project_industry_plan — Platform PM copy (one row per project) ──────

CREATE TABLE IF NOT EXISTS public.project_industry_plan (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id),
  created_by            UUID NOT NULL REFERENCES auth.users(id),
  updated_by            UUID REFERENCES auth.users(id),
  plan_title            TEXT NOT NULL,
  customisation_notes   TEXT,
  included_phases       JSONB DEFAULT '[]',
  included_activities   JSONB DEFAULT '[]',
  included_deliverables JSONB DEFAULT '[]',
  included_risks        JSONB DEFAULT '[]',
  included_milestones   JSONB DEFAULT '[]',
  included_roles        JSONB DEFAULT '[]',
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','active','completed','archived')),
  is_on_hold            BOOLEAN DEFAULT FALSE,
  on_hold_reason        TEXT,
  is_deleted            BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pip_project ON public.project_industry_plan(project_id)
  WHERE is_deleted = FALSE;

-- ── 9. sim.practice_industry_plan — Simulator PM copy ─────────────────────

CREATE TABLE IF NOT EXISTS sim.practice_industry_plan (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id   UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  template_id           UUID NOT NULL REFERENCES public.pmo_industry_templates(id),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_title            TEXT NOT NULL,
  customisation_notes   TEXT,
  included_phases       JSONB DEFAULT '[]',
  included_activities   JSONB DEFAULT '[]',
  included_deliverables JSONB DEFAULT '[]',
  included_risks        JSONB DEFAULT '[]',
  included_milestones   JSONB DEFAULT '[]',
  included_roles        JSONB DEFAULT '[]',
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','active','completed','archived')),
  is_on_hold            BOOLEAN DEFAULT FALSE,
  on_hold_reason        TEXT,
  is_deleted            BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spip_project ON sim.practice_industry_plan(practice_project_id)
  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_spip_user ON sim.practice_industry_plan(user_id)
  WHERE is_deleted = FALSE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ── Master tables: pmo_industry_templates ────────────────────────────────────

ALTER TABLE public.pmo_industry_templates ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read published templates
CREATE POLICY "pit_select_published" ON public.pmo_industry_templates
  FOR SELECT USING (status = 'published' AND is_deleted = FALSE);

-- PMO / Platform Admin can read all (including draft / archived)
CREATE POLICY "pit_select_pmo" ON public.pmo_industry_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- PMO INSERT
CREATE POLICY "pit_insert_pmo" ON public.pmo_industry_templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- PMO UPDATE
CREATE POLICY "pit_update_pmo" ON public.pmo_industry_templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- PMO DELETE (soft delete preferred; hard delete guarded by same check)
CREATE POLICY "pit_delete_pmo" ON public.pmo_industry_templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- ── Phases ────────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_industry_template_phases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pitp_select_all" ON public.pmo_industry_template_phases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pmo_industry_templates t
      WHERE t.id = template_id
        AND (t.status = 'published' OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
        ))
        AND t.is_deleted = FALSE
    )
  );

CREATE POLICY "pitp_write_pmo" ON public.pmo_industry_template_phases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- ── Activities ────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_industry_template_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pita_select_all" ON public.pmo_industry_template_activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pmo_industry_templates t
      WHERE t.id = template_id
        AND (t.status = 'published' OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
        ))
        AND t.is_deleted = FALSE
    )
  );

CREATE POLICY "pita_write_pmo" ON public.pmo_industry_template_activities
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- ── Deliverables ─────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_industry_template_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pitd_select_all" ON public.pmo_industry_template_deliverables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pmo_industry_templates t
      WHERE t.id = template_id
        AND (t.status = 'published' OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
        ))
        AND t.is_deleted = FALSE
    )
  );

CREATE POLICY "pitd_write_pmo" ON public.pmo_industry_template_deliverables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- ── Risks ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_industry_template_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pitr_select_all" ON public.pmo_industry_template_risks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pmo_industry_templates t
      WHERE t.id = template_id
        AND (t.status = 'published' OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
        ))
        AND t.is_deleted = FALSE
    )
  );

CREATE POLICY "pitr_write_pmo" ON public.pmo_industry_template_risks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- ── Milestones ────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_industry_template_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pitm_select_all" ON public.pmo_industry_template_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pmo_industry_templates t
      WHERE t.id = template_id
        AND (t.status = 'published' OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
        ))
        AND t.is_deleted = FALSE
    )
  );

CREATE POLICY "pitm_write_pmo" ON public.pmo_industry_template_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- ── Roles ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.pmo_industry_template_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pitroles_select_all" ON public.pmo_industry_template_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pmo_industry_templates t
      WHERE t.id = template_id
        AND (t.status = 'published' OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
        ))
        AND t.is_deleted = FALSE
    )
  );

CREATE POLICY "pitroles_write_pmo" ON public.pmo_industry_template_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- ── project_industry_plan (Platform PM copy) ──────────────────────────────────

ALTER TABLE public.project_industry_plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pip_select_member" ON public.project_industry_plan;
DROP POLICY IF EXISTS "pip_select_pmo" ON public.project_industry_plan;
DROP POLICY IF EXISTS "pip_insert_pm" ON public.project_industry_plan;
DROP POLICY IF EXISTS "pip_update_pm" ON public.project_industry_plan;
DROP POLICY IF EXISTS "pip_delete_pm" ON public.project_industry_plan;

-- PM and team members can read their own project's plan
CREATE POLICY "pip_select_member" ON public.project_industry_plan
  FOR SELECT USING (
    project_id IN (
      SELECT pm.project_id
      FROM public.project_memberships pm
      INNER JOIN public.users u ON u.id = pm.user_id
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(pm.is_active, TRUE) = TRUE
        AND pm.invitation_status = 'accepted'
    )
  );

-- PMO can read all plans (oversight)
CREATE POLICY "pip_select_pmo" ON public.project_industry_plan
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

-- PM INSERT (must be project member)
CREATE POLICY "pip_insert_pm" ON public.project_industry_plan
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND project_id IN (
      SELECT pm.project_id
      FROM public.project_memberships pm
      INNER JOIN public.users u ON u.id = pm.user_id
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(pm.is_active, TRUE) = TRUE
        AND pm.invitation_status = 'accepted'
    )
  );

-- PM UPDATE (own record)
CREATE POLICY "pip_update_pm" ON public.project_industry_plan
  FOR UPDATE USING (
    created_by = auth.uid()
    OR project_id IN (
      SELECT pm.project_id
      FROM public.project_memberships pm
      INNER JOIN public.users u ON u.id = pm.user_id
      WHERE u.auth_user_id = auth.uid()
        AND COALESCE(pm.is_active, TRUE) = TRUE
        AND pm.invitation_status = 'accepted'
    )
  );

-- PM DELETE (soft delete only — guarded same as update)
CREATE POLICY "pip_delete_pm" ON public.project_industry_plan
  FOR DELETE USING (created_by = auth.uid());

-- ── sim.practice_industry_plan (Simulator PM copy) ────────────────────────────

ALTER TABLE sim.practice_industry_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spip_select_own" ON sim.practice_industry_plan
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "spip_insert_own" ON sim.practice_industry_plan
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "spip_update_own" ON sim.practice_industry_plan
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "spip_delete_own" ON sim.practice_industry_plan
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- DATABASE_TABLES REGISTRY — register all 9 new tables
-- ============================================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('pmo_industry_templates',            'PMO-maintained industry-specific project plan template headers; one row per industry', false, true),
  ('pmo_industry_template_phases',      'Phase/stage definitions for each industry plan template', false, true),
  ('pmo_industry_template_activities',  'Activity-level work items with attributes (type, duration, effort, resources) per template phase', false, true),
  ('pmo_industry_template_deliverables','Typical deliverables per industry plan template, optionally linked to a phase', false, true),
  ('pmo_industry_template_risks',       'Pre-defined risks per industry plan template with likelihood and impact ratings', false, true),
  ('pmo_industry_template_milestones',  'Key milestones per industry plan template, optionally linked to a phase', false, true),
  ('pmo_industry_template_roles',       'Recommended team roles per industry plan template, flagged as key or supporting', false, true),
  ('project_industry_plan',             'Platform PM copy of an industry plan template customised for a specific project (JSONB snapshots)', false, true),
  ('sim.practice_industry_plan',        'Simulator PM copy of an industry plan template customised for a practice project (JSONB snapshots)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();

-- ── Verify ────────────────────────────────────────────────────────────────────

SELECT
  table_schema,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_schema = t.table_schema AND c.table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE (table_schema = 'public' AND table_name IN (
        'pmo_industry_templates',
        'pmo_industry_template_phases',
        'pmo_industry_template_activities',
        'pmo_industry_template_deliverables',
        'pmo_industry_template_risks',
        'pmo_industry_template_milestones',
        'pmo_industry_template_roles',
        'project_industry_plan'
       ))
   OR (table_schema = 'sim' AND table_name = 'practice_industry_plan')
ORDER BY table_schema, table_name;
