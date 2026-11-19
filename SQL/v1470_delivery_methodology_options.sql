-- =============================================================================
-- v1470: delivery_methodology_options — seeded lookup for Project Details
--          Methodology dropdown (and other delivery_methodology pickers)
-- =============================================================================
-- Values align with chk_projects_delivery_methodology (v1005) and
-- accounts.default_methodology / delivery_methodology_track vocabulary.
-- Primary (is_legacy = FALSE): hybrid | structured | standards_based | agile
-- Legacy rows kept for display of pre-v1005 TitleCase values; UI may hide them
-- when the project already stores a current code.
--
-- After apply: re-run SQL/v1251_planner_table_wall.sql (planner wall, rule).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.delivery_methodology_options (
  code           VARCHAR(40) PRIMARY KEY,
  label          VARCHAR(120) NOT NULL,
  description    TEXT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_legacy      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.delivery_methodology_options IS
  'v1470: seeded options for projects.delivery_methodology (and related track pickers). '
  'DB-driven per rule 25.1 — not a hardcoded JS list.';

ALTER TABLE public.delivery_methodology_options ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.delivery_methodology_options TO authenticated, anon;
GRANT ALL ON public.delivery_methodology_options TO service_role;

DROP POLICY IF EXISTS policy_delivery_methodology_options_select ON public.delivery_methodology_options;
CREATE POLICY policy_delivery_methodology_options_select
  ON public.delivery_methodology_options
  FOR SELECT
  TO authenticated, anon
  USING (is_active = TRUE);

INSERT INTO public.delivery_methodology_options
  (code, label, description, display_order, is_legacy, is_active)
VALUES
  ('hybrid', 'Hybrid (all tracks)',
   'Use Structured, Standards-Based and Agile tracks together.', 10, FALSE, TRUE),
  ('structured', 'Structured / Traditional',
   'Phase / stage-gate delivery (structured traditional approach).', 20, FALSE, TRUE),
  ('standards_based', 'Standards-Based Process Groups',
   'Process-group / standards-based delivery track.', 30, FALSE, TRUE),
  ('agile', 'Agile & Lean',
   'Agile and lean delivery track.', 40, FALSE, TRUE),
  -- Legacy TitleCase (and PRINCE2) — existing rows only; not offered as primary picks
  ('Hybrid', 'Hybrid (legacy)', NULL, 110, TRUE, TRUE),
  ('Structured', 'Structured (legacy)', NULL, 120, TRUE, TRUE),
  ('Agile', 'Agile (legacy)', NULL, 130, TRUE, TRUE),
  ('Waterfall', 'Waterfall (legacy)', NULL, 140, TRUE, TRUE),
  ('PRINCE2', 'PRINCE2 (legacy)', NULL, 150, TRUE, TRUE)
ON CONFLICT (code) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_legacy = EXCLUDED.is_legacy,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'delivery_methodology_options',
  'Seeded delivery methodology / track options for project Methodology pickers (v1470)',
  true,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1470: delivery_methodology_options seeded (4 primary + 5 legacy).';
END $$;
