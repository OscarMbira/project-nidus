-- =============================================================================
-- v963k_recurring_tasks_raci_guest_training_rls_fix.sql
-- v963 PMIS Core Gap Closure — Phases 11-14 (Recurring Tasks / RACI / Guest Access /
-- Training Tracker). v644/v645 created these tables but only enabled RLS on the
-- top-level project-scoped parent (recurring_task_templates, raci_matrices) or left
-- child/related tables with NO row level security at all:
--   recurring_task_schedules, recurring_task_instances (children of
--     recurring_task_templates), raci_rows, raci_assignments (children of
--     raci_matrices), guest_access_tokens (child of guest_collaborators, which DOES
--     already have RLS from v645), training_certifications, member_training_records
--     (no RLS at all in v645).
-- This file only touches the tables this initiative's Phases 11-14 build real CRUD
-- for — other gap tables' RLS gaps are out of scope for this file.
-- Prerequisites: v644_pmis_gap_tables_tier2.sql, v645_pmis_gap_tables_tier3.sql,
--                 public.is_user_pmo_admin()
-- PostgreSQL 15+ (Supabase). Idempotent (DROP POLICY IF EXISTS + CREATE POLICY).
-- =============================================================================

-- ── Recurring Tasks (GAP-08) — children of recurring_task_templates ─────────

ALTER TABLE public.recurring_task_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_recurring_task_schedules ON public.recurring_task_schedules;
CREATE POLICY policy_recurring_task_schedules ON public.recurring_task_schedules FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recurring_task_templates t
    JOIN public.user_projects up ON up.project_id = t.project_id
    WHERE t.id = recurring_task_schedules.template_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recurring_task_templates t
    JOIN public.user_projects up ON up.project_id = t.project_id
    WHERE t.id = recurring_task_schedules.template_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ));

ALTER TABLE public.recurring_task_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_recurring_task_instances ON public.recurring_task_instances;
CREATE POLICY policy_recurring_task_instances ON public.recurring_task_instances FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.recurring_task_templates t
    JOIN public.user_projects up ON up.project_id = t.project_id
    WHERE t.id = recurring_task_instances.template_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.recurring_task_templates t
    JOIN public.user_projects up ON up.project_id = t.project_id
    WHERE t.id = recurring_task_instances.template_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ));

-- ── RACI Matrix (GAP-10) — children of raci_matrices ─────────────────────────

ALTER TABLE public.raci_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_raci_rows ON public.raci_rows;
CREATE POLICY policy_raci_rows ON public.raci_rows FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.raci_matrices m
    JOIN public.user_projects up ON up.project_id = m.project_id
    WHERE m.id = raci_rows.matrix_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.raci_matrices m
    JOIN public.user_projects up ON up.project_id = m.project_id
    WHERE m.id = raci_rows.matrix_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ));

ALTER TABLE public.raci_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_raci_assignments ON public.raci_assignments;
CREATE POLICY policy_raci_assignments ON public.raci_assignments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.raci_rows r
    JOIN public.raci_matrices m ON m.id = r.matrix_id
    JOIN public.user_projects up ON up.project_id = m.project_id
    WHERE r.id = raci_assignments.row_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.raci_rows r
    JOIN public.raci_matrices m ON m.id = r.matrix_id
    JOIN public.user_projects up ON up.project_id = m.project_id
    WHERE r.id = raci_assignments.row_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ));

-- ── Guest Access (GAP-19) — guest_access_tokens (child of guest_collaborators,
--    which already has RLS from v645) ─────────────────────────────────────────

ALTER TABLE public.guest_access_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_guest_access_tokens ON public.guest_access_tokens;
CREATE POLICY policy_guest_access_tokens ON public.guest_access_tokens FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.guest_collaborators g
    JOIN public.user_projects up ON up.project_id = g.project_id
    WHERE g.id = guest_access_tokens.guest_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.guest_collaborators g
    JOIN public.user_projects up ON up.project_id = g.project_id
    WHERE g.id = guest_access_tokens.guest_id AND up.user_id = auth.uid() AND up.is_deleted = FALSE
  ));

-- ── Training Tracker (GAP-20) — no RLS at all in v645 ────────────────────────

ALTER TABLE public.training_certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_training_certifications_read ON public.training_certifications;
CREATE POLICY policy_training_certifications_read ON public.training_certifications FOR SELECT TO authenticated
  USING (COALESCE(is_deleted, FALSE) = FALSE);
DROP POLICY IF EXISTS policy_training_certifications_write ON public.training_certifications;
CREATE POLICY policy_training_certifications_write ON public.training_certifications FOR INSERT TO authenticated
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));
DROP POLICY IF EXISTS policy_training_certifications_update ON public.training_certifications;
CREATE POLICY policy_training_certifications_update ON public.training_certifications FOR UPDATE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid())) WITH CHECK (public.is_user_pmo_admin(auth.uid()));
DROP POLICY IF EXISTS policy_training_certifications_delete ON public.training_certifications;
CREATE POLICY policy_training_certifications_delete ON public.training_certifications FOR DELETE TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()));

ALTER TABLE public.member_training_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_member_training_records ON public.member_training_records;
CREATE POLICY policy_member_training_records ON public.member_training_records FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

DO $$ BEGIN RAISE NOTICE 'v963k_recurring_tasks_raci_guest_training_rls_fix.sql completed'; END $$;
