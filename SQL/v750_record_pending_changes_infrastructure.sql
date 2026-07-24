-- v750: Record pending changes infrastructure (defer-apply)
-- PostgreSQL 15+ / Supabase
-- Plan: projectplan/v752_record_lifecycle_defer_apply_plan.md
-- Prerequisites: v651_record_lifecycle_infrastructure.sql, v656_sim_lifecycle_mirror.sql

-- ── public.record_pending_changes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.record_pending_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  root_record_id UUID NOT NULL,
  submission_batch_id UUID NOT NULL,
  previous_status TEXT NOT NULL,
  proposed_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by UUID REFERENCES public.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_public_record_pending_changes UNIQUE (table_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_public_record_pending_changes_record
  ON public.record_pending_changes (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_public_record_pending_changes_batch
  ON public.record_pending_changes (submission_batch_id);

ALTER TABLE public.record_pending_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_public_pending_changes_select ON public.record_pending_changes;
CREATE POLICY policy_public_pending_changes_select ON public.record_pending_changes
  FOR SELECT TO authenticated
  USING (
    submitted_by IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.record_authorisers ra
      JOIN public.users u ON u.id = ra.authoriser_user_id
      WHERE ra.table_name = public.record_pending_changes.table_name
        AND ra.is_active = TRUE
        AND u.auth_user_id = auth.uid()
    )
    OR public.is_user_pmo_admin(auth.uid())
  );

GRANT SELECT ON public.record_pending_changes TO authenticated, service_role;

-- ── sim.record_pending_changes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.record_pending_changes (
  LIKE public.record_pending_changes INCLUDING ALL
);

CREATE INDEX IF NOT EXISTS idx_sim_record_pending_changes_record
  ON sim.record_pending_changes (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_sim_record_pending_changes_batch
  ON sim.record_pending_changes (submission_batch_id);

ALTER TABLE sim.record_pending_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_sim_pending_changes_select ON sim.record_pending_changes;
CREATE POLICY policy_sim_pending_changes_select ON sim.record_pending_changes
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON sim.record_pending_changes TO authenticated, service_role;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('public.record_pending_changes', 'Deferred field changes awaiting lifecycle authorisation', false, true),
  ('sim.record_pending_changes', 'Simulator deferred field changes awaiting authorisation', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v750_record_pending_changes_infrastructure.sql completed'; END $$;
