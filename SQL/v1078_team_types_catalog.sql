-- v1078: shared team types catalog (searchable + user-extendable)
-- Used by Create Team "Team type" field. New types appear for all users.

CREATE TABLE IF NOT EXISTS public.team_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code VARCHAR(80) NOT NULL,
  type_label VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_team_types_code UNIQUE (type_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_types_label_ci
  ON public.team_types (lower(type_label))
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_team_types_active
  ON public.team_types (sort_order, type_label)
  WHERE is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE;

COMMENT ON TABLE public.team_types IS
  'Catalog of team types for teams.team_type (system seed + user-added).';

INSERT INTO public.team_types (type_code, type_label, sort_order, is_system, is_active)
VALUES
  ('delivery', 'Delivery', 10, TRUE, TRUE),
  ('support', 'Support', 20, TRUE, TRUE),
  ('cross-functional', 'Cross-functional', 30, TRUE, TRUE),
  ('specialist', 'Specialist', 40, TRUE, TRUE),
  ('other', 'Other', 100, TRUE, TRUE)
ON CONFLICT (type_code) DO UPDATE SET
  type_label = EXCLUDED.type_label,
  sort_order = EXCLUDED.sort_order,
  is_system = EXCLUDED.is_system,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

ALTER TABLE public.team_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_types_select ON public.team_types;
CREATE POLICY team_types_select ON public.team_types
  FOR SELECT TO authenticated
  USING (COALESCE(is_deleted, FALSE) = FALSE);

DROP POLICY IF EXISTS team_types_insert ON public.team_types;
CREATE POLICY team_types_insert ON public.team_types
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS team_types_update ON public.team_types;
CREATE POLICY team_types_update ON public.team_types
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Simulator mirror
CREATE TABLE IF NOT EXISTS sim.team_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code VARCHAR(80) NOT NULL,
  type_label VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uq_sim_team_types_code UNIQUE (type_code)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_team_types_label_ci
  ON sim.team_types (lower(type_label))
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_sim_team_types_active
  ON sim.team_types (sort_order, type_label)
  WHERE is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO sim.team_types (type_code, type_label, sort_order, is_system, is_active)
VALUES
  ('delivery', 'Delivery', 10, TRUE, TRUE),
  ('support', 'Support', 20, TRUE, TRUE),
  ('cross-functional', 'Cross-functional', 30, TRUE, TRUE),
  ('specialist', 'Specialist', 40, TRUE, TRUE),
  ('other', 'Other', 100, TRUE, TRUE)
ON CONFLICT (type_code) DO UPDATE SET
  type_label = EXCLUDED.type_label,
  sort_order = EXCLUDED.sort_order,
  is_system = EXCLUDED.is_system,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

ALTER TABLE sim.team_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_team_types_select ON sim.team_types;
CREATE POLICY sim_team_types_select ON sim.team_types
  FOR SELECT TO authenticated
  USING (COALESCE(is_deleted, FALSE) = FALSE);

DROP POLICY IF EXISTS sim_team_types_insert ON sim.team_types;
CREATE POLICY sim_team_types_insert ON sim.team_types
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS sim_team_types_update ON sim.team_types;
CREATE POLICY sim_team_types_update ON sim.team_types
  FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('team_types', 'Shared catalog of team types for Create/Edit Team', false, true),
  ('sim.team_types', 'Simulator catalog of team types', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1078_team_types_catalog.sql applied';
END $$;
