-- =============================================================================
-- v1154: Lookup for communication-plan format and level of detail.
--        The form reads active rows. It does not keep its own list.
-- Platform: public.communication_information_options
-- Simulator: sim.communication_information_options
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.communication_information_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_kind VARCHAR(30) NOT NULL,
  option_code VARCHAR(50) NOT NULL,
  option_label VARCHAR(150) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT communication_information_options_kind_check
    CHECK (option_kind IN ('format', 'detail_level'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comm_info_options_kind_code
  ON public.communication_information_options (option_kind, lower(option_code))
  WHERE is_deleted = FALSE;

ALTER TABLE public.communication_information_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS communication_information_options_select ON public.communication_information_options;
CREATE POLICY communication_information_options_select
  ON public.communication_information_options
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

INSERT INTO public.communication_information_options (id, option_kind, option_code, option_label, sort_order) VALUES
  ('11540001-f001-4a01-9c01-534433340001', 'format', 'brief', 'Brief', 1),
  ('11540001-f001-4a01-9c01-534433340002', 'format', 'report', 'Report', 2),
  ('11540001-f001-4a01-9c01-534433340003', 'format', 'presentation', 'Presentation', 3),
  ('11540001-f001-4a01-9c01-534433340004', 'format', 'table', 'Table', 4),
  ('11540001-f001-4a01-9c01-534433340005', 'format', 'notice', 'Notice', 5),
  ('11540001-f001-4a01-9c01-534433340006', 'format', 'narrative', 'Narrative', 6),
  ('11540001-d001-4a01-9c01-534433340001', 'detail_level', 'headline', 'Headline', 1),
  ('11540001-d001-4a01-9c01-534433340002', 'detail_level', 'summary', 'Summary', 2),
  ('11540001-d001-4a01-9c01-534433340003', 'detail_level', 'detailed', 'Detailed', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('communication_information_options', 'Lookup of communication-plan formats and levels of detail', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS sim.communication_information_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_kind VARCHAR(30) NOT NULL,
  option_code VARCHAR(50) NOT NULL,
  option_label VARCHAR(150) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT sim_communication_information_options_kind_check
    CHECK (option_kind IN ('format', 'detail_level'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sim_comm_info_options_kind_code
  ON sim.communication_information_options (option_kind, lower(option_code))
  WHERE is_deleted = FALSE;

ALTER TABLE sim.communication_information_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS communication_information_options_select ON sim.communication_information_options;
CREATE POLICY communication_information_options_select
  ON sim.communication_information_options
  FOR SELECT TO authenticated
  USING (is_deleted = FALSE);

INSERT INTO sim.communication_information_options (id, option_kind, option_code, option_label, sort_order) VALUES
  ('11540001-f001-4a01-9c01-534433340001', 'format', 'brief', 'Brief', 1),
  ('11540001-f001-4a01-9c01-534433340002', 'format', 'report', 'Report', 2),
  ('11540001-f001-4a01-9c01-534433340003', 'format', 'presentation', 'Presentation', 3),
  ('11540001-f001-4a01-9c01-534433340004', 'format', 'table', 'Table', 4),
  ('11540001-f001-4a01-9c01-534433340005', 'format', 'notice', 'Notice', 5),
  ('11540001-f001-4a01-9c01-534433340006', 'format', 'narrative', 'Narrative', 6),
  ('11540001-d001-4a01-9c01-534433340001', 'detail_level', 'headline', 'Headline', 1),
  ('11540001-d001-4a01-9c01-534433340002', 'detail_level', 'summary', 'Summary', 2),
  ('11540001-d001-4a01-9c01-534433340003', 'detail_level', 'detailed', 'Detailed', 3)
ON CONFLICT (id) DO NOTHING;
