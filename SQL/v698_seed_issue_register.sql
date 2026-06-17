-- =============================================================================
-- v698: Seed Data – Issue Register (8 issues for EDP-2024)
-- Prerequisites: v696 (demo project + issue register must exist).
-- Covers: Problems, Concerns, Requests for Change, Off-Specification items.
-- Roles served: pmo_admin, project_manager, team_member, project_assurance
-- =============================================================================

-- ─── Inline fix for track_issue_history (v707) ───────────────────────────────
-- The v25 version uses COALESCE(NEW.updated_by, NEW.created_by) for
-- changed_by_user_id.  When trigger_set_created_fields runs first and sets
-- created_by = auth.uid() = NULL (service-role context), the NOT NULL
-- constraint on issue_history.changed_by_user_id fails.
-- Fix: extend the fallback chain to raised_by_id / reported_by_user_id / owner_id.
CREATE OR REPLACE FUNCTION track_issue_history()
RETURNS TRIGGER AS $$
DECLARE
    v_change_type VARCHAR(50);
    v_description TEXT;
    v_changed_by  UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_change_type := 'created';
        v_description := 'Issue created';
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_change_type := 'status_changed';
            v_description := 'Status changed from ' || COALESCE(OLD.status,'N/A') || ' to ' || COALESCE(NEW.status,'N/A');
        ELSIF OLD.assigned_to_user_id IS DISTINCT FROM NEW.assigned_to_user_id THEN
            v_change_type := 'assigned'; v_description := 'Issue assigned';
        ELSIF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
            v_change_type := 'resolved'; v_description := 'Issue resolved';
        ELSIF NEW.status = 'closed'   AND OLD.status != 'closed'   THEN
            v_change_type := 'closed';   v_description := 'Issue closed';
        ELSIF NEW.status = 'reopened' AND OLD.status != 'reopened' THEN
            v_change_type := 'reopened'; v_description := 'Issue reopened';
        ELSE
            v_change_type := 'updated';  v_description := 'Issue updated';
        END IF;
    END IF;
    v_changed_by := COALESCE(NEW.updated_by, NEW.created_by,
                             NEW.raised_by_id, NEW.reported_by_user_id,
                             NEW.owner_id, NEW.assigned_to_user_id, NEW.author_id);
    IF v_changed_by IS NULL THEN RETURN NEW; END IF;
    INSERT INTO issue_history (issue_id, changed_by_user_id, change_type,
                               change_description, changed_at, created_by)
    VALUES (NEW.id, v_changed_by, v_change_type, v_description, NOW(), v_changed_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  v_project_id   UUID;
  v_reg_id       UUID;
  v_user_id      UUID;
  v_auth_uid     UUID;
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v698: Demo project not found – run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_reg_id
  FROM public.issue_registers
  WHERE project_id = v_project_id AND COALESCE(is_deleted, false) = false LIMIT 1;

  SELECT id INTO v_user_id
  FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;

  -- Set auth.uid() context so triggers (issue_history, created_by) get a real user ID
  SELECT auth_user_id INTO v_auth_uid FROM public.users WHERE id = v_user_id;
  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', v_auth_uid::text)::text, true);
  END IF;

  INSERT INTO public.issues (
    id, issue_register_id, project_id,
    issue_code, issue_title, issue_description,
    issue_type, issue_category,
    priority, severity,
    impact_description, cause_description,
    status,
    raised_by_id, owner_id, author_id, assigned_to_user_id,
    reported_by_user_id,
    date_raised, due_date,
    cost_impact, schedule_impact_days,
    affects_baseline,
    is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_reg_id, v_project_id,
    i.issue_code, i.issue_title, i.issue_desc,
    i.issue_type, i.issue_category,
    i.priority, i.severity,
    i.impact_desc, i.cause_desc,
    i.status,
    v_user_id, v_user_id, v_user_id, v_user_id,
    v_user_id,
    CURRENT_DATE - (i.days_ago || ' days')::interval,
    CURRENT_DATE + (i.due_in || ' days')::interval,
    i.cost_impact, i.schedule_days,
    i.affects_baseline,
    false, NOW(), NOW()
  FROM (VALUES
    ('ISS-001',
     'API Timeout Errors in Payment Gateway Integration',
     'During load testing the payment gateway integration is returning HTTP 504 timeout errors when concurrent users exceed 200. The vendor-supplied API wrapper does not implement retry logic.',
     'problem_concern', 'technical',
     'high', 'major',
     'Payment transactions fail silently for 15–20% of users during peak load; go-live acceptance criteria not met',
     'API wrapper built to vendor v1.2 specification; v1.4 (with retry logic) was released but not adopted in build',
     'in_progress', 3, 14, 35000, 10, true),

    ('ISS-002',
     'Legacy Finance System Export Producing Incorrect VAT Codes',
     'Weekly extract from legacy system maps EU VAT codes to incorrect domestic codes when country of supply is outside UK. Affects approx. 340 records per week.',
     'off_specification', 'data_quality',
     'high', 'major',
     'Incorrect VAT amounts posted to new data warehouse; management accounts for Q1 will require manual correction',
     'VAT mapping table was built against pre-Brexit tax codes and has not been updated to reflect post-Brexit EU supply rules',
     'open', 5, 21, 12000, 5, true),

    ('ISS-003',
     'Staff Resistance to New Timesheet Module',
     'Field operations team (approx. 60 staff) are refusing to complete onboarding for the new digital timesheet module. Team leads report concerns about surveillance and data privacy.',
     'problem_concern', 'people',
     'medium', 'moderate',
     'Timesheet compliance at 18% against 85% target; payroll processing will require manual intervention if not resolved',
     'Change management communications did not address data privacy concerns explicitly; no union consultation was conducted',
     'open', 7, 30, 0, 0, false),

    ('ISS-004',
     'Test Environment Unavailable – Blocking Stage 3 Entry',
     'Shared test environment has been allocated to another programme until the end of next month. EDP-2024 Stage 3 entry gate cannot be met without a functional test environment.',
     'problem_concern', 'resource',
     'critical', 'critical',
     'Stage 3 entry date slips by minimum 6 weeks; knock-on delay to UAT and go-live schedule',
     'Environment scheduling conflict not identified during resource planning; PMO resource register was not consulted',
     'in_progress', 1, 5, 0, 42, true),

    ('ISS-005',
     'Request to Include Self-Service HR Portal in Scope',
     'Head of HR has formally requested that a self-service HR portal module be included in the EDP-2024 delivery. This was explicitly excluded from the Project Initiation Document.',
     'request_for_change', 'scope',
     'medium', 'minor',
     'If accepted, adds estimated 14 weeks to delivery timeline and £85K to budget; must go to Change Board',
     'HR Director escalated request following CEO strategic briefing on employee experience improvement',
     'open', 3, 45, 85000, 98, false),

    ('ISS-006',
     'Mobile App Build Failing on Android API Level 34',
     'Since Android 14 rollout the mobile workforce app crashes on launch when compiled against API level 33. Google Play Store requires API level 34 compliance from November.',
     'off_specification', 'technical',
     'high', 'major',
     'Mobile app cannot be published to Google Play Store; field teams on Android 14 devices are blocked from accessing the app',
     'Target API level was set during scoping 9 months ago; Google extended deadline policy was not tracked',
     'in_progress', 2, 12, 8000, 5, false),

    ('ISS-007',
     'Data Warehouse Column Naming Inconsistency',
     'Business intelligence team has identified 47 column names in the new data warehouse that do not conform to the agreed naming convention. Three dashboards built by Finance reference old column names.',
     'off_specification', 'data_quality',
     'low', 'minor',
     'Three Finance dashboards return null values; manual workaround via Excel in place; limited business impact at present',
     'Naming convention document was updated after initial warehouse build; build team was not notified of changes',
     'resolved', 14, 0, 2000, 2, false),

    ('ISS-008',
     'Cloud Infrastructure Cost Exceeding Monthly Forecast',
     'Azure spend for the development and test environments is running 38% over the monthly forecast (actual £42K vs forecast £30K). Root cause identified as untagged non-production resources left running.',
     'problem_concern', 'financial',
     'medium', 'moderate',
     'Cumulative overspend of £36K to date; if not resolved the contingency reserve will be consumed by end of Stage 3',
     'No automated cost alerts were configured on the Azure subscription; untagged resources bypassed the tagging policy enforcement',
     'open', 4, 10, 36000, 0, true)

  ) AS i(issue_code, issue_title, issue_desc, issue_type, issue_category,
         priority, severity, impact_desc, cause_desc, status,
         days_ago, due_in, cost_impact, schedule_days, affects_baseline)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.issues
    WHERE issue_register_id = v_reg_id AND issue_code = i.issue_code
  );

  RAISE NOTICE 'v698: Issue register seed complete for project %.', v_project_id;

END $$;
