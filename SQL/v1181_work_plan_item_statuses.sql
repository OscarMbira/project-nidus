-- ================================================
-- File: v1181_work_plan_item_statuses.sql
-- Description: DB-driven status lookup for Work Plan items (v1180 PRD) — a fixed list rather
--              than free text, matching the timesheet_work_categories/timesheet_overtime_types
--              lookup-table pattern already used elsewhere in Timesheets.
--              'carried_forward' is assigned automatically by the opt-in carry-forward feature
--              (v1183+ service layer), not user-selectable like the others.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

CREATE TABLE IF NOT EXISTS public.work_plan_item_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- TRUE for 'carried_forward' — system-assigned, not user-selectable
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id)
);

ALTER TABLE public.work_plan_item_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_plan_item_statuses_select" ON public.work_plan_item_statuses;
CREATE POLICY "work_plan_item_statuses_select" ON public.work_plan_item_statuses
  FOR SELECT TO authenticated
  USING (is_active = TRUE AND COALESCE(is_deleted, FALSE) = FALSE);

INSERT INTO public.work_plan_item_statuses (code, name, description, is_system, sort_order, is_active)
VALUES
  ('not_started',     'Not Started',     'Planned but not yet begun',                                   false, 10, true),
  ('in_progress',      'In Progress',     'Actively being worked on (covers "Ongoing"/"WIP" style entries)', false, 20, true),
  ('completed',        'Completed',       'Finished',                                                     false, 30, true),
  ('blocked',           'Blocked',         'Waiting on a dependency, decision, or external party',         false, 40, true),
  ('carried_forward',   'Carried Forward', 'Brought in from a prior period via the carry-forward feature — assigned automatically, not user-selectable', true, 100, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Register new table in database_tables registry
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('work_plan_item_statuses', 'Fixed status lookup for Work Plan items (Not Started, In Progress, Completed, Blocked, Carried Forward)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.work_plan_item_statuses WHERE is_active = true;
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1181: work_plan_item_statuses created and seeded: % (expected 5)', v_count;
  RAISE NOTICE '================================================';
END $$;
