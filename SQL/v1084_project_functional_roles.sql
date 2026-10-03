-- =============================================================================
-- v1084: Project functional roles catalog + menu + migrate from team_functional_roles
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public.project_functional_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_functional_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL,
  required_skills TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_functional_roles_project_label
  ON public.project_functional_roles (project_id, lower(role_label))
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_project_functional_roles_project
  ON public.project_functional_roles (project_id)
  WHERE is_active = TRUE;

COMMENT ON TABLE public.project_functional_roles IS
  'v1084: Project-scoped delivery/functional roles with required skills (not RBAC project_roles).';

ALTER TABLE public.project_functional_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_functional_roles_select ON public.project_functional_roles;
CREATE POLICY project_functional_roles_select ON public.project_functional_roles
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS project_functional_roles_insert ON public.project_functional_roles;
CREATE POLICY project_functional_roles_insert ON public.project_functional_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS project_functional_roles_update ON public.project_functional_roles;
CREATE POLICY project_functional_roles_update ON public.project_functional_roles
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS project_functional_roles_delete ON public.project_functional_roles;
CREATE POLICY project_functional_roles_delete ON public.project_functional_roles
  FOR DELETE TO authenticated
  USING (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_functional_roles TO authenticated;

-- Migrate distinct team roles → project catalog
INSERT INTO public.project_functional_roles (project_id, role_label, required_skills, sort_order, is_active)
SELECT s.project_id, s.role_label, s.required_skills, s.sort_order, TRUE
FROM (
  SELECT DISTINCT ON (t.project_id, lower(fr.role_label))
    t.project_id,
    fr.role_label,
    fr.required_skills,
    COALESCE(fr.sort_order, 100) AS sort_order
  FROM public.team_functional_roles fr
  JOIN public.teams t ON t.id = fr.team_id
  WHERE COALESCE(fr.is_active, TRUE) = TRUE
    AND COALESCE(t.is_deleted, FALSE) = FALSE
    AND NULLIF(btrim(fr.role_label), '') IS NOT NULL
  ORDER BY t.project_id, lower(fr.role_label), fr.sort_order NULLS LAST
) s
WHERE NOT EXISTS (
  SELECT 1 FROM public.project_functional_roles p
  WHERE p.project_id = s.project_id
    AND lower(p.role_label) = lower(s.role_label)
    AND p.is_active = TRUE
);

-- ---------------------------------------------------------------------------
-- sim.practice_project_functional_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.practice_project_functional_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL,
  required_skills TEXT,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_practice_project_functional_roles_label
  ON sim.practice_project_functional_roles (practice_project_id, lower(role_label))
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_sim_practice_project_functional_roles_project
  ON sim.practice_project_functional_roles (practice_project_id)
  WHERE is_active = TRUE;

ALTER TABLE sim.practice_project_functional_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_practice_project_functional_roles_select ON sim.practice_project_functional_roles;
CREATE POLICY sim_practice_project_functional_roles_select ON sim.practice_project_functional_roles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_functional_roles.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS sim_practice_project_functional_roles_manage ON sim.practice_project_functional_roles;
CREATE POLICY sim_practice_project_functional_roles_manage ON sim.practice_project_functional_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_functional_roles.practice_project_id
        AND pp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_functional_roles.practice_project_id
        AND pp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.practice_project_functional_roles TO authenticated;

INSERT INTO sim.practice_project_functional_roles (
  practice_project_id, role_label, required_skills, sort_order, is_active
)
SELECT s.practice_project_id, s.role_label, s.required_skills, s.sort_order, TRUE
FROM (
  SELECT DISTINCT ON (pt.practice_project_id, lower(fr.role_label))
    pt.practice_project_id,
    fr.role_label,
    fr.required_skills,
    COALESCE(fr.sort_order, 100) AS sort_order
  FROM sim.practice_team_functional_roles fr
  JOIN sim.practice_teams pt ON pt.id = fr.practice_team_id
  WHERE COALESCE(fr.is_active, TRUE) = TRUE
    AND COALESCE(pt.is_deleted, FALSE) = FALSE
    AND NULLIF(btrim(fr.role_label), '') IS NOT NULL
  ORDER BY pt.practice_project_id, lower(fr.role_label), fr.sort_order NULLS LAST
) s
WHERE NOT EXISTS (
  SELECT 1 FROM sim.practice_project_functional_roles p
  WHERE p.practice_project_id = s.practice_project_id
    AND lower(p.role_label) = lower(s.role_label)
    AND p.is_active = TRUE
);

-- ---------------------------------------------------------------------------
-- Menu leaf under Project Team (same grants as Team Members)
-- ---------------------------------------------------------------------------
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(),
  'plat_pm_pt_project_roles',
  'Project Roles & Skills',
  'Project-scoped delivery roles and required skills used when assigning team members (v1084).',
  '/platform/project-roles',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_project_team' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, 15, 'universal', 'briefcase', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'plat_pm_pt_project_roles' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Copy grants from Team Members leaf
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_pt_members'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_pt_project_roles' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE
  SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Simulator: practice project roles leaf under Practice Teams group
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(),
  'sim_pm_practice_project_roles',
  'Project Roles & Skills',
  'Practice-project delivery roles and required skills for member assignment (v1084).',
  '/simulator/practice-project-roles',
  (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_teams' AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1),
  3, 15, 'universal', 'briefcase', TRUE, TRUE, NOW(), NOW()
WHERE EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_grp_pm_teams' AND COALESCE(is_deleted, FALSE) = FALSE
)
AND NOT EXISTS (
  SELECT 1 FROM public.menu_items
  WHERE menu_code = 'sim_pm_practice_project_roles' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'sim_pm_my_team'
JOIN public.menu_items dst ON dst.menu_code = 'sim_pm_practice_project_roles' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE
  SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('project_functional_roles', 'Project-scoped functional roles with required skills', false, true, 'project'),
  ('sim.practice_project_functional_roles', 'Practice-project functional roles with required skills', false, true, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1084_project_functional_roles.sql applied';
END $$;
