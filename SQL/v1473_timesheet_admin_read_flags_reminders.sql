-- ============================================================================
-- v1473: Timesheets for the Project Administrator — read, flags, reminder log (v1343, slice 3)
-- ============================================================================
-- PRD projectprd/v1343_project_administrator_support_role_PRD.md amendment A2:
--   - a Project Administrator can READ the project team's timesheet entries (no update, no
--     Approve / Reject — the v1172 update and v1169 review policies are unchanged);
--   - Send reminder (in-app + email, manual) — each send is logged in timesheet_reminders;
--   - Flag an entry: one or more reasons from a managed catalogue (timesheet_entry_flag_reasons,
--     managed like the v1169 approve / reject catalogues) plus a note. ADVISORY: a flag never
--     blocks the decision. It resolves when the entry is approved or rejected, or the person who
--     raised it withdraws it. Every flag row is kept (history).
-- Prerequisites: v1169, v1172 (get_user_id_from_auth), v1471 (project_administrator role).
-- Seed reasons: v1474. After running, re-run SQL/v1251_planner_table_wall.sql (CLAUDE.md
-- table rule 6) so the new tables are walled for Planner-edition sessions.
-- No display IDs (no reference columns), so no Admin ID Generation rule is needed.
-- Idempotent.
-- ============================================================================

-- ── 1. Helper: does the user hold one of these roles on this project? ─────────────────
-- Project memberships, project-scoped user_roles, or an organisation-level user_roles row
-- (project_id NULL) for a member of the project — the same reach as the v1172 policies.
CREATE OR REPLACE FUNCTION public.project_user_has_project_role(p_user_id uuid, p_project_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT p_user_id IS NOT NULL AND p_project_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM project_memberships pm JOIN project_roles pr ON pr.id = pm.project_role_id
      WHERE pm.user_id = p_user_id AND pm.project_id = p_project_id AND pm.is_active = TRUE
        AND COALESCE(pm.invitation_status, 'accepted') = 'accepted'
        AND pr.role_name = ANY (p_roles))
    OR EXISTS (
      SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id AND ur.is_active = TRUE AND NOT COALESCE(ur.is_deleted, FALSE)
        AND regexp_replace(lower(replace(r.role_name, ' ', '_')), '^pm_', '') = ANY (p_roles)
        AND (ur.project_id = p_project_id
             OR (ur.project_id IS NULL AND EXISTS (
                   SELECT 1 FROM user_projects up
                   WHERE up.project_id = p_project_id AND up.user_id = p_user_id AND up.is_deleted = FALSE))))
  );
$$;
GRANT EXECUTE ON FUNCTION public.project_user_has_project_role(uuid, uuid, text[]) TO authenticated;

-- ── 2. Timesheet entries: the Project Administrator reads the project's entries ─────────
-- Same as v1172, plus the last OR.
DROP POLICY IF EXISTS "timesheet_entries_select" ON public.timesheet_entries;
CREATE POLICY "timesheet_entries_select" ON public.timesheet_entries
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = timesheet_entries.project_id
          AND up.user_id    = get_user_id_from_auth(auth.uid())
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
    -- v1343 A2: read-only for the project's Project Administrator
    OR public.project_user_has_project_role(get_user_id_from_auth(auth.uid()), timesheet_entries.project_id,
                                            ARRAY['project_administrator'])
  );

-- ── 3. Flag reason catalogue (same shape and admin rules as v1169's catalogues) ────────
CREATE TABLE IF NOT EXISTS public.timesheet_entry_flag_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_flag_reasons_code_unique ON public.timesheet_entry_flag_reasons(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ts_flag_reasons_active ON public.timesheet_entry_flag_reasons(is_active) WHERE is_deleted = FALSE;

DROP TRIGGER IF EXISTS trg_ts_flag_reasons_before_insert ON public.timesheet_entry_flag_reasons;
CREATE TRIGGER trg_ts_flag_reasons_before_insert
    BEFORE INSERT ON public.timesheet_entry_flag_reasons
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();
DROP TRIGGER IF EXISTS trg_ts_flag_reasons_before_update ON public.timesheet_entry_flag_reasons;
CREATE TRIGGER trg_ts_flag_reasons_before_update
    BEFORE UPDATE ON public.timesheet_entry_flag_reasons
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE public.timesheet_entry_flag_reasons IS
  'Predefined reasons for flagging a timesheet entry for the approver''s attention (v1343 / SQL v1473).';

ALTER TABLE public.timesheet_entry_flag_reasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_ts_flag_reasons_select_authenticated ON public.timesheet_entry_flag_reasons;
CREATE POLICY policy_ts_flag_reasons_select_authenticated
    ON public.timesheet_entry_flag_reasons FOR SELECT TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);
DROP POLICY IF EXISTS policy_ts_flag_reasons_admin_all ON public.timesheet_entry_flag_reasons;
CREATE POLICY policy_ts_flag_reasons_admin_all
    ON public.timesheet_entry_flag_reasons FOR ALL TO authenticated
    USING (public.is_user_pmo_admin(auth.uid()))
    WITH CHECK (public.is_user_pmo_admin(auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.timesheet_entry_flag_reasons TO authenticated;

-- ── 4. Flags on entries ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.timesheet_entry_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.timesheet_entries(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    reason_ids UUID[] NOT NULL CHECK (cardinality(reason_ids) >= 1),
    note TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'withdrawn')),
    raised_by UUID NOT NULL REFERENCES public.users(id),
    raised_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_by UUID REFERENCES public.users(id),
    resolved_at TIMESTAMPTZ,
    resolution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ts_entry_flags_entry ON public.timesheet_entry_flags(entry_id);
CREATE INDEX IF NOT EXISTS idx_ts_entry_flags_project_open ON public.timesheet_entry_flags(project_id) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_ts_entry_flags_raised_by ON public.timesheet_entry_flags(raised_by);
COMMENT ON TABLE public.timesheet_entry_flags IS
  'Advisory flags on timesheet entries (v1343 A2): reasons + note for the approver. Never blocks Approve / Reject; resolved when the entry is decided or withdrawn by the raiser. Rows are kept.';

-- project_id always comes from the entry; only open → withdrawn by the raiser through the client.
CREATE OR REPLACE FUNCTION public.trg_timesheet_entry_flags_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.project_id := (SELECT te.project_id FROM timesheet_entries te WHERE te.id = NEW.entry_id);
    NEW.status := 'open';
    NEW.resolved_by := NULL; NEW.resolved_at := NULL; NEW.resolution := NULL;
  ELSE
    NEW.entry_id := OLD.entry_id;
    NEW.project_id := OLD.project_id;
    NEW.raised_by := OLD.raised_by;
    NEW.raised_at := OLD.raised_at;
    IF NEW.status = 'withdrawn' AND OLD.status = 'open' THEN
      NEW.resolved_at := COALESCE(NEW.resolved_at, NOW());
      NEW.resolved_by := COALESCE(NEW.resolved_by, OLD.raised_by);
      NEW.resolution := COALESCE(NEW.resolution, 'Withdrawn');
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_timesheet_entry_flags_guard ON public.timesheet_entry_flags;
CREATE TRIGGER trg_timesheet_entry_flags_guard
  BEFORE INSERT OR UPDATE ON public.timesheet_entry_flags
  FOR EACH ROW EXECUTE FUNCTION public.trg_timesheet_entry_flags_guard();

-- A decision on the entry resolves its open flags.
CREATE OR REPLACE FUNCTION public.trg_timesheet_review_resolves_flags()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
BEGIN
  UPDATE timesheet_entry_flags
  SET status = 'resolved',
      resolved_by = get_user_id_from_auth(NEW.reviewer_id),
      resolved_at = NEW.decided_at,
      resolution = 'Entry ' || NEW.decision
  WHERE entry_id = NEW.entry_id AND status = 'open';
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_timesheet_review_resolves_flags ON public.timesheet_entry_reviews;
CREATE TRIGGER trg_timesheet_review_resolves_flags
  AFTER INSERT ON public.timesheet_entry_reviews
  FOR EACH ROW EXECUTE FUNCTION public.trg_timesheet_review_resolves_flags();

ALTER TABLE public.timesheet_entry_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timesheet_entry_flags_select ON public.timesheet_entry_flags;
CREATE POLICY timesheet_entry_flags_select ON public.timesheet_entry_flags FOR SELECT TO authenticated
  USING (
    raised_by = get_user_id_from_auth(auth.uid())
    OR public.is_user_pmo_admin(auth.uid())
    OR public.project_user_has_project_role(get_user_id_from_auth(auth.uid()), project_id,
         ARRAY['project_manager', 'team_lead', 'team_manager', 'project_administrator'])
  );
DROP POLICY IF EXISTS timesheet_entry_flags_insert ON public.timesheet_entry_flags;
CREATE POLICY timesheet_entry_flags_insert ON public.timesheet_entry_flags FOR INSERT TO authenticated
  WITH CHECK (
    raised_by = get_user_id_from_auth(auth.uid())
    AND public.project_user_has_project_role(get_user_id_from_auth(auth.uid()),
          (SELECT te.project_id FROM public.timesheet_entries te WHERE te.id = entry_id),
          ARRAY['project_manager', 'team_lead', 'team_manager', 'project_administrator'])
  );
DROP POLICY IF EXISTS timesheet_entry_flags_withdraw ON public.timesheet_entry_flags;
CREATE POLICY timesheet_entry_flags_withdraw ON public.timesheet_entry_flags FOR UPDATE TO authenticated
  USING (raised_by = get_user_id_from_auth(auth.uid()) AND status = 'open')
  WITH CHECK (raised_by = get_user_id_from_auth(auth.uid()) AND status IN ('open', 'withdrawn'));
GRANT SELECT, INSERT, UPDATE ON public.timesheet_entry_flags TO authenticated;

-- ── 5. Reminder log ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.timesheet_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    sent_by UUID NOT NULL REFERENCES public.users(id),
    recipient_user_ids UUID[] NOT NULL DEFAULT '{}',
    recipient_count INTEGER NOT NULL DEFAULT 0,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (period_end >= period_start)
);
CREATE INDEX IF NOT EXISTS idx_timesheet_reminders_project ON public.timesheet_reminders(project_id, created_at DESC);
COMMENT ON TABLE public.timesheet_reminders IS
  'Log of manual timesheet reminders (v1343 A2): who sent, for which period, to whom. Insert-only.';

ALTER TABLE public.timesheet_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS timesheet_reminders_select ON public.timesheet_reminders;
CREATE POLICY timesheet_reminders_select ON public.timesheet_reminders FOR SELECT TO authenticated
  USING (
    public.is_user_pmo_admin(auth.uid())
    OR public.project_user_has_project_role(get_user_id_from_auth(auth.uid()), project_id,
         ARRAY['project_manager', 'team_lead', 'team_manager', 'project_administrator'])
  );
DROP POLICY IF EXISTS timesheet_reminders_insert ON public.timesheet_reminders;
CREATE POLICY timesheet_reminders_insert ON public.timesheet_reminders FOR INSERT TO authenticated
  WITH CHECK (
    sent_by = get_user_id_from_auth(auth.uid())
    AND public.project_user_has_project_role(get_user_id_from_auth(auth.uid()), project_id,
          ARRAY['project_manager', 'team_lead', 'team_manager', 'project_administrator'])
  );
GRANT SELECT, INSERT ON public.timesheet_reminders TO authenticated;

-- ── 6. Register the new tables ────────────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('timesheet_entry_flag_reasons', 'Managed reasons for flagging a timesheet entry for the approver (v1343)', false, true),
  ('timesheet_entry_flags', 'Advisory flags raised on timesheet entries, with resolution history (v1343)', false, true),
  ('timesheet_reminders', 'Log of manual timesheet reminders sent for a project and period (v1343)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

NOTIFY pgrst, 'reload schema';
