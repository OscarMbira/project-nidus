-- =============================================================================
-- v829: Demo seed data for the PM Dashboard "Quick Actions" registers
-- Plan: projectplan/v829_pm_quick_actions_demo_seed_plan.md
--
-- Companion seed file per CLAUDE.md rule 18.2 - created on explicit user request,
-- not auto-inserted. Platform (public) schema only: the sim schema has no
-- daily_logs / issue_registers / quality_register / highlight_reports tables.
--
-- The Quick Actions panel on /pm/dashboard links to six pages. v819 (dashboard
-- stat cards) and v822 (risk register) already cover Work Packages, Risk Register
-- and Checkpoint Reports. This file fills the four that still open blank:
--
--   1. Daily Log         - daily_logs (parent) + daily_log_entries. Never seeded.
--   2. Issue Register    - the page filters issues by issue_register_id, but v819
--                          set project_id only. The 10 existing issues are real,
--                          just unlinked, so we create the register and BACKFILL
--                          issue_register_id before topping up. No duplicates.
--   3. Quality Register  - the Register tab reads quality_register (products /
--                          deliverables). v819 seeded quality_reviews +
--                          quality_inspections, which only feed the Activities
--                          tab and the dashboard's "Quality Activities" card.
--   4. Highlight Reports - highlight_reports. Never seeded.
--
-- Work Packages and Checkpoint Reports are topped up to 12 only when the project
-- holds fewer than 6, so environments where v819 never ran still land inside the
-- 6-20 range while environments where it did run are left untouched.
--
-- PREREQUISITE: run SQL/v830_fix_create_issue_register_for_project_display_id.sql
-- FIRST. Until it is applied, create_issue_register_for_project() still calls
-- generate_issue_register_reference(), which v756b dropped, so the Issue Register
-- section below logs FAILED and the page keeps rendering empty.
--
-- Idempotent: every row id is a deterministic uuid_generate_v5(project_id, label)
-- inserted with ON CONFLICT (id) DO NOTHING. Re-running this file is a no-op.
--
-- Rows are inserted ONE STATEMENT PER ROW rather than as a single multi-row
-- INSERT. Several of these tables carry BEFORE INSERT triggers that derive a
-- sequence number via SELECT MAX(...) + 1 on the same table (issues.issue_number,
-- work_packages.wp_reference, checkpoint_reports.document_ref,
-- highlight_reports.report_reference). Rows written by a single command are not
-- visible to that command, so a multi-row INSERT would hand every row the same
-- number and trip the unique index - most sharply on issues, whose trigger
-- overwrites issue_number unconditionally. A per-row loop gives each trigger a
-- fresh view of the rows already committed by the previous iteration.
--
-- Diagnostics: the Supabase SQL Editor Results panel does not surface RAISE
-- NOTICE output, so every category logs its outcome into a temp table which is
-- SELECTed at the end. Each category runs in its own BEGIN/EXCEPTION block so a
-- single failure cannot block the others. (Both patterns carried over from v819.)
-- =============================================================================

CREATE TEMP TABLE IF NOT EXISTS v829_seed_log (
  project_name TEXT,
  category     TEXT,
  outcome      TEXT,
  detail       TEXT
);

DO $$
DECLARE
  proj          RECORD;
  t             RECORD;
  seed_user_id  UUID;
  v_log_id      UUID;
  v_reg_id      UUID;
  v_existing    INT;
  v_inserted    INT;
  v_linked      INT;
  v_max_num     INT;
  v_limit       INT;
  v_target      CONSTANT INT := 12;  -- records per category (inside the 6-20 range)
  v_floor       CONSTANT INT := 6;   -- top-up threshold for already-seeded categories
BEGIN

FOR proj IN SELECT id, project_name FROM projects WHERE COALESCE(is_deleted, FALSE) = FALSE LOOP

  -- Resolve who the seeded records are attributed to.
  SELECT COALESCE(
    p.project_manager_user_id,
    p.owner_user_id,
    (SELECT up.user_id FROM user_projects up
       WHERE up.project_id = proj.id AND COALESCE(up.is_deleted, FALSE) = FALSE
       ORDER BY CASE up.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
       LIMIT 1),
    (SELECT u.id FROM users u
       WHERE COALESCE(u.is_active, TRUE) = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
       LIMIT 1)
  )
  INTO seed_user_id
  FROM projects p
  WHERE p.id = proj.id;

  IF seed_user_id IS NULL THEN
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'ALL', 'SKIPPED', 'no resolvable seed user for this project');
    CONTINUE;
  END IF;

  -- ===========================================================================
  -- 1. DAILY LOG - parent log + 12 entries
  -- ===========================================================================
  BEGIN
    v_log_id := create_daily_log_for_project(proj.id, seed_user_id);

    IF v_log_id IS NULL THEN
      INSERT INTO v829_seed_log VALUES (proj.project_name, 'daily_log_entries', 'SKIPPED', 'create_daily_log_for_project returned NULL');
    ELSE
      SELECT COUNT(*) INTO v_existing
      FROM daily_log_entries
      WHERE daily_log_id = v_log_id AND COALESCE(is_deleted, FALSE) = FALSE;

      IF v_existing >= v_floor THEN
        INSERT INTO v829_seed_log VALUES (proj.project_name, 'daily_log_entries', 'SKIPPED', v_existing || ' entries already present');
      ELSE
        v_limit := v_target - v_existing;
        v_inserted := 0;

        -- entry_number is offset past anything already in the log: the auto-number
        -- trigger only fires when it is NULL/0, and (daily_log_id, entry_number)
        -- is unique.
        SELECT COALESCE(MAX(entry_number), 0) INTO v_max_num
        FROM daily_log_entries WHERE daily_log_id = v_log_id;

        FOR t IN
          SELECT * FROM (VALUES
            (1,  'problem',     'Site network outage blocked the scheduled integration test window; only 3 of the 8 planned test cases were executed.',
                 NULL, 'open',        'high',   ARRAY['infrastructure','testing'],  2),
            (2,  'action',      'Chase the integration vendor for the updated API specification and confirm the sandbox refresh date.',
                 NULL, 'in_progress', 'high',   ARRAY['vendor','integration'],      3),
            (3,  'event',       'Stage gate review held with the project board. Continuation approved subject to a refreshed cost forecast.',
                 'Board approved continuation to the next stage.',
                 'completed',   'medium', ARRAY['governance','stage-gate'],  NULL),
            (4,  'comment',     'Sponsor confirmed the revised go-live date is acceptable provided the training programme starts on time.',
                 NULL, 'open',        'low',    ARRAY['sponsor','schedule'],        NULL),
            (5,  'observation', 'Test environment response times are degrading under concurrent load; worth watching closely before UAT begins.',
                 NULL, 'open',        'medium', ARRAY['performance','environment'], 7),
            (6,  'decision',    'Agreed to phase the rollout by department rather than a single big-bang cutover, to contain support demand.',
                 'Phased rollout plan adopted and circulated to the delivery team.',
                 'completed',   'high',   ARRAY['rollout','decision'],       NULL),
            (7,  'problem',     'Two team members are double-booked against another programme for the next sprint, reducing available capacity.',
                 NULL, 'in_progress', 'medium', ARRAY['resourcing','capacity'],     1),
            (8,  'action',      'Prepare the data migration dry-run pack and circulate it to the data owners for review before the rehearsal.',
                 NULL, 'open',        'medium', ARRAY['data-migration'],            5),
            (9,  'event',       'Supplier onboarding workshop completed. Access, security clearance and ways of working are all confirmed.',
                 'All supplier staff onboarded and granted environment access.',
                 'completed',   'low',    ARRAY['supplier','onboarding'],    NULL),
            (10, 'observation', 'Training attendance for the finance team is below target at 42%; adoption risk if this does not improve.',
                 NULL, 'open',        'medium', ARRAY['training','adoption'],       -3),
            (11, 'action',      'Update the risk register following the technical spike outcome and re-score the integration risks.',
                 'Risk register updated; two integration risks downgraded.',
                 'completed',   'low',    ARRAY['risk','follow-up'],         NULL),
            (12, 'comment',     'Weekly checkpoint moved to Thursday mornings at the team''s request, to avoid the Monday planning clash.',
                 NULL, 'open',        'low',    ARRAY['ways-of-working'],           NULL)
          ) AS v(seq, entry_type, description, results, status, priority, tags, target_offset)
          WHERE v.seq <= v_limit
          ORDER BY v.seq
        LOOP
          INSERT INTO daily_log_entries (
            id, daily_log_id, entry_number, entry_date, entry_type, description,
            person_responsible_id, target_date, results, status, priority,
            tags, is_private, completed_at, created_by
          ) VALUES (
            uuid_generate_v5(proj.id, 'v829-dl-' || t.seq),
            v_log_id,
            v_max_num + t.seq,
            CURRENT_DATE - t.seq,
            t.entry_type,
            t.description,
            seed_user_id,
            CASE WHEN t.target_offset IS NULL THEN NULL ELSE CURRENT_DATE + t.target_offset END,
            t.results,
            t.status,
            t.priority,
            t.tags::TEXT[],
            FALSE,
            CASE WHEN t.status = 'completed' THEN NOW() - (t.seq || ' days')::interval ELSE NULL END,
            seed_user_id
          )
          ON CONFLICT (id) DO NOTHING;

          v_inserted := v_inserted + 1;
        END LOOP;

        INSERT INTO v829_seed_log VALUES (proj.project_name, 'daily_log_entries', 'OK', v_inserted || ' attempted (' || v_existing || ' pre-existing)');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'daily_log_entries', 'FAILED', SQLERRM);
  END;

  -- ===========================================================================
  -- 2a. ISSUE REGISTER - create the register and link the existing v819 issues
  --     Kept in its own block so a later top-up failure cannot roll the link back.
  -- ===========================================================================
  BEGIN
    v_reg_id := NULL;
    SELECT id INTO v_reg_id
    FROM issue_registers
    WHERE project_id = proj.id AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1;

    IF v_reg_id IS NULL THEN
      v_reg_id := create_issue_register_for_project(proj.id, seed_user_id);
    END IF;

    SELECT COALESCE(MAX(issue_number), 0) INTO v_max_num
    FROM issues
    WHERE issue_register_id = v_reg_id AND COALESCE(is_deleted, FALSE) = FALSE;

    -- The v819 issues are genuine rows that are simply invisible on the register
    -- page because they carry project_id only. Link and number them rather than
    -- inserting duplicates. The numbering trigger is BEFORE INSERT only, so
    -- issue_number has to be assigned here.
    --
    -- issue_identifier is deliberately left as-is (NULL on these rows). It carries
    -- a partial UNIQUE index across the whole table and is owned by the admin
    -- display-ID generator (trg_issues_admin_display_id, v756b). Hand-minting
    -- ISS-YYYY-NNN values here would sit directly in that generator's next
    -- sequence positions and break the following genuine insert. Every list and
    -- export falls back to "Issue #<issue_number>" when the identifier is absent.
    WITH unlinked AS (
      SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id) AS rn
      FROM issues
      WHERE project_id = proj.id
        AND issue_register_id IS NULL
        AND COALESCE(is_deleted, FALSE) = FALSE
    )
    UPDATE issues i
    SET issue_register_id = v_reg_id,
        issue_number      = v_max_num + u.rn
    FROM unlinked u
    WHERE i.id = u.id;

    GET DIAGNOSTICS v_linked = ROW_COUNT;
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'issues (link existing)', 'OK', v_linked || ' existing issue(s) linked to the register');
  EXCEPTION WHEN OTHERS THEN
    v_reg_id := NULL;
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'issues (link existing)', 'FAILED', SQLERRM);
  END;

  -- ===========================================================================
  -- 2b. ISSUE REGISTER - top up to 12
  -- ===========================================================================
  BEGIN
    IF v_reg_id IS NULL THEN
      INSERT INTO v829_seed_log VALUES (proj.project_name, 'issues (top-up)', 'SKIPPED', 'no issue register available');
    ELSE
      SELECT COUNT(*) INTO v_existing
      FROM issues
      WHERE issue_register_id = v_reg_id AND COALESCE(is_deleted, FALSE) = FALSE;

      IF v_existing >= v_target THEN
        INSERT INTO v829_seed_log VALUES (proj.project_name, 'issues (top-up)', 'SKIPPED', v_existing || ' issues already on the register');
      ELSE
        v_limit := v_target - v_existing;
        v_inserted := 0;

        FOR t IN
          SELECT * FROM (VALUES
            (1,  'Additional reporting fields requested by Finance',
                 'Finance have asked for three additional fields on the monthly reconciliation report. Raised as a change request for board consideration at the next checkpoint.',
                 'request_for_change', 'medium',   'medium',   'new',         'this_stage'),
            (2,  'Login page does not meet the accessibility contrast standard',
                 'The automated accessibility scan flagged the login page as below the required colour-contrast ratio. Off-specification against the agreed non-functional requirements.',
                 'off_specification',  'high',     'high',     'assigned',    'this_week'),
            (3,  'Reconciliation batch job intermittently times out',
                 'The overnight reconciliation batch has timed out on three of the last ten runs. Root cause is not yet confirmed; lock contention on the staging tables is suspected.',
                 'problem_concern',    'high',     'critical', 'in_progress', 'immediate'),
            (4,  'Historic records missing mandatory reference codes',
                 'Approximately 4% of migrated historic records have no reference code in the source extract, so they cannot be matched downstream.',
                 'problem_concern',    'medium',   'high',     'in_progress', 'this_week'),
            (5,  'Request to extend the pilot to a second department',
                 'Operations have asked to join the pilot ahead of the planned wave 2 rollout. This requires additional licences and training capacity.',
                 'request_for_change', 'low',      'medium',   'new',         'this_stage'),
            (6,  'Export file format differs from the agreed specification',
                 'The generated export uses a comma delimiter where the interface specification requires pipe-delimited output. The downstream system rejects the file.',
                 'off_specification',  'high',     'high',     'assigned',    'this_week'),
            (7,  'Third-party sandbox unavailable during the test window',
                 'The vendor sandbox was offline for two days during the planned integration test window, compressing the remaining test schedule.',
                 'problem_concern',    'medium',   'medium',   'in_progress', 'this_week'),
            (8,  'Additional approval step requested in the workflow',
                 'Compliance have asked for a second approval step on transactions above the delegated authority threshold.',
                 'request_for_change', 'medium',   'medium',   'new',         'this_stage'),
            (9,  'Audit log retention shorter than policy requires',
                 'The current configuration retains audit logs for 90 days; the information governance policy requires seven years. Off-specification and must be corrected before go-live.',
                 'off_specification',  'critical', 'critical', 'assigned',    'immediate'),
            (10, 'Training environment data refresh failing',
                 'The weekly refresh of the training environment has failed twice, leaving trainers working against stale data.',
                 'problem_concern',    'medium',   'medium',   'new',         'this_week'),
            (11, 'Request to add a mobile-optimised approval view',
                 'Approvers travelling between sites have asked for a mobile-friendly approval screen. It would improve turnaround but sits outside the current baseline.',
                 'request_for_change', 'low',      'low',      'new',         'can_wait'),
            (12, 'Report totals do not reconcile to the source ledger',
                 'The summary report totals differ from the source ledger by a small margin on two cost centres. Under investigation with the finance data owner.',
                 'problem_concern',    'high',     'high',     'in_progress', 'immediate')
          ) AS v(seq, title, descr, issue_type, priority, severity, status, urgency)
          WHERE v.seq <= v_limit
          ORDER BY v.seq
        LOOP
          INSERT INTO issues (
            id, issue_register_id, project_id,
            issue_title, issue_description, issue_type,
            priority, severity, status, urgency,
            reported_by_user_id, created_by
          ) VALUES (
            uuid_generate_v5(proj.id, 'v829-issue-' || t.seq),
            v_reg_id, proj.id,
            t.title, t.descr, t.issue_type,
            t.priority, t.severity, t.status, t.urgency,
            seed_user_id, seed_user_id
          )
          ON CONFLICT (id) DO NOTHING;

          v_inserted := v_inserted + 1;
        END LOOP;

        INSERT INTO v829_seed_log VALUES (proj.project_name, 'issues (top-up)', 'OK', v_inserted || ' attempted (' || v_existing || ' pre-existing)');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'issues (top-up)', 'FAILED', SQLERRM);
  END;

  -- ===========================================================================
  -- 3. QUALITY REGISTER - 12 products / deliverables
  -- ===========================================================================
  BEGIN
    SELECT COUNT(*) INTO v_existing
    FROM quality_register
    WHERE project_id = proj.id AND COALESCE(is_deleted, FALSE) = FALSE;

    IF v_existing >= v_floor THEN
      INSERT INTO v829_seed_log VALUES (proj.project_name, 'quality_register', 'SKIPPED', v_existing || ' products already present');
    ELSE
      v_limit := v_target - v_existing;
      v_inserted := 0;

      FOR t IN
        SELECT * FROM (VALUES
          (1,  'Project Initiation Document',
               'Baseline governance document defining the scope, approach, controls and tolerances for the project.',
               'document', 'governance', 'approval',
               'Complete against the organisational PID template; all sections populated and internally consistent.',
               'Signed off by the project board with no outstanding major comments.',
               'approved',  0),
          (2,  'Business Requirements Specification',
               'Consolidated statement of business requirements agreed with all affected business areas.',
               'document', 'requirements', 'review',
               'Every requirement uniquely identified, testable, and traceable to a business objective.',
               'Reviewed and accepted by the business owner of each contributing area.',
               'approved',  0),
          (3,  'Solution Architecture Design',
               'Target-state architecture covering the application, integration, data and infrastructure layers.',
               'document', 'technical', 'review',
               'Conforms to the organisational architecture standards; all integration points documented.',
               'Endorsed by the design authority, with any conditions recorded and scheduled.',
               'passed',    1),
          (4,  'Data Migration Plan',
               'Approach, sequencing, cleansing rules and fallback position for migrating data from the source systems.',
               'document', 'data', 'approval',
               'Covers extraction, cleansing, transformation, load, reconciliation and rollback for every in-scope entity.',
               'Approved by the data owners and the technical lead ahead of the first dry run.',
               'in-review', 0),
          (5,  'Integration Test Report',
               'Evidence pack recording the execution and outcome of end-to-end integration testing.',
               'report', 'testing', 'testing',
               'All planned integration test cases executed, with results and defects recorded against each case.',
               'No outstanding severity 1 or 2 defects; all others triaged with an agreed remediation plan.',
               'in-review', 2),
          (6,  'User Acceptance Test Pack',
               'Scenarios, scripts and entry/exit criteria for business-led user acceptance testing.',
               'document', 'testing', 'review',
               'Scenarios cover every critical business process and each documented exception path.',
               'Signed off by the business test lead before the UAT window opens.',
               'passed',    1),
          (7,  'Security Assessment Report',
               'Findings from penetration testing and the security configuration review.',
               'report', 'security', 'audit',
               'Assessment performed against the current organisational security baseline by an independent assessor.',
               'No high or critical findings remain open at the point of go-live approval.',
               'pending',   0),
          (8,  'Training Materials Pack',
               'Role-based user guides, quick reference cards and trainer notes for end-user training.',
               'document', 'training', 'review',
               'Materials produced for every affected role and validated against the delivered solution.',
               'Reviewed by the change lead and piloted with a representative user group.',
               'in-review', 2),
          (9,  'Deployment Runbook',
               'Step-by-step cutover procedure including timings, owners, verification checks and rollback triggers.',
               'document', 'deployment', 'inspection',
               'Every deployment step has a named owner, an expected duration and a verification check.',
               'Successfully rehearsed end to end in a non-production environment.',
               'in-review', 0),
          (10, 'Configured Application Release',
               'The built and configured application release promoted through the environment path to production.',
               'software', 'build', 'testing',
               'Built from a tagged source revision with all automated quality gates passed.',
               'Release notes published and the build promoted through every environment without regression.',
               'pending',   3),
          (11, 'Service Transition Handover Pack',
               'Operational documentation transferring the solution into business-as-usual support.',
               'document', 'transition', 'approval',
               'Includes the support model, escalation routes, known issues, monitoring and licence details.',
               'Accepted by the service owner at the transition readiness review.',
               'pending',   0),
          (12, 'Post-Implementation Review Report',
               'Assessment of delivered benefits, lessons learned and outstanding follow-up actions.',
               'report', 'closure', 'review',
               'Evidence-based against the benefits stated in the business case, with lessons captured.',
               'Presented to and accepted by the project board at closure.',
               'pending',   0)
        ) AS v(seq, product_name, product_description, product_type, product_category,
               quality_method, quality_criteria, acceptance_criteria, quality_status, defect_tolerance)
        WHERE v.seq <= v_limit
        ORDER BY v.seq
      LOOP
        INSERT INTO quality_register (
          id, project_id, product_reference, product_name, product_description,
          product_type, product_category, quality_method, quality_criteria,
          acceptance_criteria, quality_owner_user_id, sign_off_required,
          quality_status, quality_review_planned_date, defect_tolerance, created_by
        ) VALUES (
          uuid_generate_v5(proj.id, 'v829-qreg-' || t.seq),
          proj.id,
          'QR-' || LPAD(t.seq::TEXT, 3, '0'),
          t.product_name,
          t.product_description,
          t.product_type,
          t.product_category,
          t.quality_method,
          t.quality_criteria,
          t.acceptance_criteria,
          seed_user_id,
          TRUE,
          t.quality_status,
          CURRENT_DATE + (t.seq * 5) - 20,
          t.defect_tolerance,
          seed_user_id
        )
        ON CONFLICT (id) DO NOTHING;

        v_inserted := v_inserted + 1;
      END LOOP;

      INSERT INTO v829_seed_log VALUES (proj.project_name, 'quality_register', 'OK', v_inserted || ' attempted (' || v_existing || ' pre-existing)');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'quality_register', 'FAILED', SQLERRM);
  END;

  -- ===========================================================================
  -- 4. HIGHLIGHT REPORTS - 12 weekly reports, most recent first
  -- ===========================================================================
  BEGIN
    SELECT COUNT(*) INTO v_existing
    FROM highlight_reports
    WHERE project_id = proj.id AND COALESCE(is_deleted, FALSE) = FALSE;

    IF v_existing >= v_floor THEN
      INSERT INTO v829_seed_log VALUES (proj.project_name, 'highlight_reports', 'SKIPPED', v_existing || ' reports already present');
    ELSE
      v_limit := v_target - v_existing;
      v_inserted := 0;

      FOR t IN
        SELECT * FROM (VALUES
          (1,  'Delivery is progressing to plan. Integration testing has started and the first cutover rehearsal is scheduled.',
               'on_track',  'All six tolerance areas are within their agreed limits.',
               'Build is complete for the in-scope modules; integration testing is 40% executed.',
               'Completed the build phase sign-off and opened the integration test window.',
               'Complete integration testing and hold the first cutover rehearsal.',
               'Spend is tracking at 96% of the phased budget.', 'On schedule against the baselined plan.',
               'No open severity 1 defects.',
               'Two integration risks were downgraded after the technical spike.',
               'One high-priority issue on batch timeouts is under active investigation.',
               'None this period.', 'Continue as planned; no board intervention required.', 'distributed'),
          (2,  'Progress is steady, but the compressed test window is creating pressure on the quality plan.',
               'at_risk',   'The time tolerance is approaching its limit; other areas remain within tolerance.',
               'Integration testing is 25% executed against a 35% planned position.',
               'Closed the remaining build defects and refreshed the test environment.',
               'Recover the test schedule and confirm the UAT entry criteria.',
               'Spend is within tolerance at 93% of the phased budget.', 'Three days behind the baselined plan.',
               'The defect rate is slightly above the expected profile.',
               'Schedule risk raised to the board for visibility.',
               'Vendor sandbox downtime cost two days of test execution.',
               'The board is asked to note the compressed test window.',
               'Protect the minimum test window; do not compress it further.', 'distributed'),
          (3,  'A stable period. The stage gate review was passed and continuation to the next stage was approved.',
               'on_track',  'All tolerance areas are within their limits following the stage gate.',
               'Stage exit criteria met; the next stage plan has been baselined.',
               'Held the stage gate review and baselined the next stage plan.',
               'Mobilise the next stage team and begin the data migration dry run.',
               'The stage completed 2% under the approved budget.', 'The stage completed on the planned date.',
               'All stage deliverables passed quality review.',
               'The risk profile reduced following stage closure.',
               'No new issues were raised this period.',
               'None this period.', 'Proceed to the next stage as approved.', 'distributed'),
          (4,  'Resource availability is the main pressure this period; two team members are shared with another programme.',
               'at_risk',   'The resource constraint is putting pressure on the time tolerance.',
               'Delivery is broadly to plan, but capacity for the next sprint is reduced.',
               'Completed the data cleansing pass and agreed the migration acceptance criteria.',
               'Run the first data migration dry run and report on the reconciliation results.',
               'Spend is tracking to plan.', 'One day behind plan; recoverable within the stage.',
               'No quality concerns were raised.',
               'Resource risk escalated for portfolio-level resolution.',
               'Double-booking of two specialists across programmes.',
               'The board is asked to confirm resource priority between the two programmes.',
               'Escalate the resourcing conflict to the portfolio office.', 'submitted'),
          (5,  'Good progress on integration; the accessibility finding is being remediated ahead of UAT.',
               'on_track',  'All tolerance areas are within their limits.',
               'Integration testing is 70% executed with a falling defect rate.',
               'Remediated the accessibility finding and re-ran the automated scan.',
               'Complete integration testing and publish the integration test report.',
               'Spend is at 95% of the phased budget.', 'On schedule.',
               'The accessibility scan is now passing.',
               'No change to the risk profile.',
               'The accessibility off-specification issue has been closed.',
               'None this period.', 'Continue as planned.', 'submitted'),
          (6,  'Cutover planning is now the critical path. The runbook has been rehearsed once, with minor corrections.',
               'on_track',  'All tolerance areas are within their limits; cutover is the focus of attention.',
               'The cutover runbook was rehearsed end to end in the pre-production environment.',
               'Completed the first cutover rehearsal and updated the runbook.',
               'Hold the second rehearsal and confirm the go/no-go criteria with the board.',
               'Spend is at 97% of the phased budget.', 'On schedule.',
               'All runbook verification checks passed.',
               'Cutover risk assessed and mitigations agreed.',
               'Minor corrections to the runbook, all now closed.',
               'The board is asked to agree the go/no-go decision criteria.',
               'Approve the proposed go/no-go criteria.', 'submitted'),
          (7,  'Audit log retention was found to be below policy. This is a must-fix before go-live and is being tracked daily.',
               'exception', 'The quality tolerance has been breached by the audit retention finding; a recovery plan is submitted.',
               'Delivery continues, but go-live is conditional on closing the retention finding.',
               'Identified and scoped the audit log retention gap.',
               'Implement and verify the corrected retention configuration.',
               'Remediation absorbed within the contingency reserve.', 'No schedule impact expected if closed this period.',
               'One critical off-specification finding is open.',
               'Compliance risk raised to critical pending remediation.',
               'Audit log retention is set to 90 days against a seven-year policy requirement.',
               'The board is asked to note the exception and approve the recovery plan.',
               'Approve the recovery plan; retain the go-live date subject to closure.', 'submitted'),
          (8,  'Recovery from the retention exception is complete and the project has returned to a stable position.',
               'on_track',  'All tolerance areas are back within their limits following remediation.',
               'The retention configuration has been corrected and independently verified.',
               'Closed the audit retention finding and completed the security re-test.',
               'Begin user acceptance testing with the business test team.',
               'A contingency drawdown of 2% has been recorded.', 'Recovered to the baselined plan.',
               'The security re-test passed with no high or critical findings.',
               'The compliance risk has been closed.',
               'The audit retention issue has been closed.',
               'None this period.', 'Note the successful recovery; no further action required.', 'draft'),
          (9,  'User acceptance testing is underway with good business engagement and a low defect rate.',
               'on_track',  'All tolerance areas are within their limits.',
               'UAT is 45% executed, with 92% of executed cases passing first time.',
               'Opened UAT and completed the first week of business testing.',
               'Complete UAT execution and prepare the acceptance recommendation.',
               'Spend is at 98% of the phased budget.', 'On schedule.',
               'The defect rate is below the expected profile.',
               'Adoption risk remains under active management.',
               'Training attendance in finance remains below target.',
               'None this period.', 'Continue as planned; reinforce finance training attendance.', 'draft'),
          (10, 'Training attendance remains the principal adoption concern ahead of the phased rollout.',
               'at_risk',   'Benefit realisation is at risk if training attendance does not improve.',
               'UAT is complete; rollout readiness is being assessed department by department.',
               'Completed UAT and issued the acceptance recommendation.',
               'Confirm rollout readiness for wave 1 and re-run the finance training sessions.',
               'Spend is within tolerance.', 'On schedule.',
               'The UAT acceptance criteria have been met.',
               'Adoption risk raised following low training attendance.',
               'Finance training attendance is at 42% against a 90% target.',
               'The board is asked to confirm whether wave 1 proceeds with finance included.',
               'Proceed with wave 1 excluding finance until attendance targets are met.', 'draft'),
          (11, 'Wave 1 rollout completed successfully, with support demand below the forecast level.',
               'on_track',  'All tolerance areas are within their limits.',
               'Wave 1 departments are live and operating on the new solution.',
               'Completed the wave 1 cutover and the first week of hypercare.',
               'Begin the wave 2 rollout and continue hypercare for wave 1.',
               'Spend is at 99% of the phased budget.', 'On schedule.',
               'No post go-live severity 1 incidents.',
               'Adoption risk is reducing as usage grows.',
               'A small number of low-severity support tickets, all resolved within SLA.',
               'None this period.', 'Proceed with wave 2 as planned.', 'draft'),
          (12, 'The project is approaching closure. Service transition is complete and the review is being prepared.',
               'on_track',  'All tolerance areas are within their limits at the point of closure.',
               'All waves are live; the solution has transitioned into business-as-usual support.',
               'Completed service transition and handed over to the service owner.',
               'Complete the post-implementation review and formally close the project.',
               'The forecast final outturn is 1% under the approved budget.', 'Delivered on the baselined date.',
               'All quality register products have been signed off.',
               'Residual risks transferred to the service owner.',
               'No open issues at closure.',
               'The board is asked to approve project closure.',
               'Approve closure and schedule the benefits review at six months.', 'draft')
        ) AS v(seq, executive_summary, stage_status, overall_status_summary, progress_summary,
               completed_this_period, planned_next_period, budget_status, schedule_status,
               quality_status, risks_summary, issues_summary, decisions_required,
               recommendations, status)
        WHERE v.seq <= v_limit
        ORDER BY v.seq
      LOOP
        INSERT INTO highlight_reports (
          id, project_id, prepared_by_user_id,
          report_date, reporting_period_start, reporting_period_end,
          report_title, executive_summary, stage_status, overall_status_summary,
          progress_summary, completed_this_period, planned_next_period,
          budget_status, schedule_status, quality_status,
          risks_summary, issues_summary, decisions_required, recommendations,
          status, created_by
        ) VALUES (
          uuid_generate_v5(proj.id, 'v829-hlr-' || t.seq),
          proj.id,
          seed_user_id,
          CURRENT_DATE - (t.seq * 7),
          CURRENT_DATE - (t.seq * 7) - 6,
          CURRENT_DATE - (t.seq * 7),
          'Highlight Report ' || LPAD(t.seq::TEXT, 2, '0') || ' - week ending ' || TO_CHAR(CURRENT_DATE - (t.seq * 7), 'DD Mon YYYY'),
          t.executive_summary,
          t.stage_status,
          t.overall_status_summary,
          t.progress_summary,
          t.completed_this_period,
          t.planned_next_period,
          t.budget_status,
          t.schedule_status,
          t.quality_status,
          t.risks_summary,
          t.issues_summary,
          t.decisions_required,
          t.recommendations,
          t.status,
          seed_user_id
        )
        ON CONFLICT (id) DO NOTHING;

        v_inserted := v_inserted + 1;
      END LOOP;

      INSERT INTO v829_seed_log VALUES (proj.project_name, 'highlight_reports', 'OK', v_inserted || ' attempted (' || v_existing || ' pre-existing)');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'highlight_reports', 'FAILED', SQLERRM);
  END;

  -- ===========================================================================
  -- 5. WORK PACKAGES - top up only if below the floor (v819 normally covers this)
  -- ===========================================================================
  BEGIN
    SELECT COUNT(*) INTO v_existing
    FROM work_packages
    WHERE project_id = proj.id AND COALESCE(is_deleted, FALSE) = FALSE;

    IF v_existing >= v_floor THEN
      INSERT INTO v829_seed_log VALUES (proj.project_name, 'work_packages', 'SKIPPED', v_existing || ' already present (v819)');
    ELSE
      v_limit := v_target - v_existing;
      v_inserted := 0;

      FOR t IN
        SELECT * FROM (VALUES
          (1,  'Requirements Elaboration',       'Elaborate and baseline the detailed business requirements with each affected business area.', 'accepted',    100),
          (2,  'Solution Design',                'Produce the target-state solution design covering the application, integration and data layers.', 'accepted',   100),
          (3,  'Environment Build',              'Provision and configure the development, test and pre-production environments.',              'accepted',    100),
          (4,  'Core Application Configuration', 'Configure the core application modules against the agreed design.',                           'in_progress',  70),
          (5,  'Integration Development',        'Build and unit test the interfaces between the new solution and the upstream systems.',       'in_progress',  55),
          (6,  'Data Migration Build',           'Develop the extraction, cleansing, transformation and load routines for the migration.',      'in_progress',  45),
          (7,  'Reporting and Analytics',        'Build the operational and management reporting suite defined in the requirements.',           'in_progress',  30),
          (8,  'Security Hardening',             'Apply the security baseline and complete penetration testing and remediation.',               'authorized',   10),
          (9,  'User Acceptance Testing',        'Plan and execute business-led user acceptance testing against the agreed scenarios.',         'authorized',    0),
          (10, 'Training Delivery',              'Deliver role-based training to all affected user groups ahead of their rollout wave.',        'authorized',    0),
          (11, 'Cutover and Go-Live',            'Execute the cutover runbook and transition users onto the new solution.',                     'authorized',    0),
          (12, 'Service Transition',             'Hand the solution over to business-as-usual support and complete the closure activities.',    'authorized',    0)
        ) AS v(seq, wp_name, wp_description, status, progress)
        WHERE v.seq <= v_limit
        ORDER BY v.seq
      LOOP
        INSERT INTO work_packages (
          id, project_id, work_package_name, work_package_description, work_description,
          status, assigned_to_user_id, planned_start_date, planned_end_date,
          progress_percentage, created_by
        ) VALUES (
          uuid_generate_v5(proj.id, 'v829-wp-' || t.seq),
          proj.id,
          t.wp_name,
          t.wp_description,
          t.wp_description,
          t.status,
          seed_user_id,
          CURRENT_DATE - (t.seq * 4),
          CURRENT_DATE + (40 - t.seq * 3),
          t.progress,
          seed_user_id
        )
        ON CONFLICT (id) DO NOTHING;

        v_inserted := v_inserted + 1;
      END LOOP;

      INSERT INTO v829_seed_log VALUES (proj.project_name, 'work_packages', 'OK', v_inserted || ' attempted (' || v_existing || ' pre-existing)');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'work_packages', 'FAILED', SQLERRM);
  END;

  -- ===========================================================================
  -- 6. CHECKPOINT REPORTS - top up only if below the floor (v819 normally covers)
  -- ===========================================================================
  BEGIN
    SELECT COUNT(*) INTO v_existing
    FROM checkpoint_reports
    WHERE project_id = proj.id AND COALESCE(is_deleted, FALSE) = FALSE;

    IF v_existing >= v_floor THEN
      INSERT INTO v829_seed_log VALUES (proj.project_name, 'checkpoint_reports', 'SKIPPED', v_existing || ' already present (v819)');
    ELSE
      v_limit := v_target - v_existing;
      v_inserted := 0;

      FOR t IN
        SELECT * FROM (VALUES
          (1,  'The team delivered to the sprint commitment with no carry-over.',
               'Closed all committed sprint items.', 'Integration test execution.', 'Complete integration testing.',
               'No open severity 1 defects.', 'On schedule.', 'submitted'),
          (2,  'Minor slippage absorbed within the team float.',
               'Completed build defect closure.', 'Test environment refresh.', 'Recover the test schedule.',
               'The defect rate is slightly above profile.', 'Three days behind, recoverable.', 'submitted'),
          (3,  'Stage exit criteria met and evidenced.',
               'Stage gate evidence pack completed.', 'Next stage mobilisation.', 'Begin the data migration dry run.',
               'All stage deliverables passed review.', 'On schedule.', 'approved'),
          (4,  'Capacity reduced by shared resource commitments.',
               'Data cleansing pass completed.', 'Migration acceptance criteria.', 'Run the first migration dry run.',
               'No quality concerns.', 'One day behind plan.', 'submitted'),
          (5,  'Accessibility remediation completed and verified.',
               'Accessibility finding remediated.', 'Integration test execution.', 'Publish the integration test report.',
               'The accessibility scan is passing.', 'On schedule.', 'submitted'),
          (6,  'Cutover rehearsal completed with minor runbook corrections.',
               'First cutover rehearsal completed.', 'Runbook corrections.', 'Hold the second rehearsal.',
               'All runbook verification checks passed.', 'On schedule.', 'reviewed'),
          (7,  'Audit retention finding identified and scoped.',
               'Retention gap analysis completed.', 'Retention remediation build.', 'Verify the corrected configuration.',
               'One critical off-specification finding is open.', 'No impact if closed this period.', 'submitted'),
          (8,  'Retention finding closed and the security re-test passed.',
               'Audit retention finding closed.', 'UAT preparation.', 'Open user acceptance testing.',
               'The security re-test passed.', 'Recovered to plan.', 'draft'),
          (9,  'UAT is underway with strong business engagement.',
               'First week of UAT completed.', 'UAT execution.', 'Complete UAT and issue the recommendation.',
               'A 92% first-time pass rate.', 'On schedule.', 'draft'),
          (10, 'Rollout readiness assessment in progress.',
               'UAT completed and accepted.', 'Wave 1 readiness assessment.', 'Confirm wave 1 readiness.',
               'The UAT acceptance criteria have been met.', 'On schedule.', 'draft'),
          (11, 'Wave 1 is live with support demand below forecast.',
               'Wave 1 cutover completed.', 'Hypercare support.', 'Begin the wave 2 rollout.',
               'No post go-live severity 1 incidents.', 'On schedule.', 'draft'),
          (12, 'Service transition complete; closure activities are under way.',
               'Service transition completed.', 'Post-implementation review.', 'Complete the review and close.',
               'All quality products have been signed off.', 'Delivered on the baselined date.', 'draft')
        ) AS v(seq, summary, completed_work, work_in_progress, planned_work,
               quality_status, schedule_status, status)
        WHERE v.seq <= v_limit
        ORDER BY v.seq
      LOOP
        INSERT INTO checkpoint_reports (
          id, project_id, reported_by_user_id, report_date, checkpoint_date,
          report_title, report_summary, progress_summary,
          completed_work, work_in_progress, planned_work,
          quality_status, budget_status, schedule_status, status, created_by
        ) VALUES (
          uuid_generate_v5(proj.id, 'v829-cpr-' || t.seq),
          proj.id,
          seed_user_id,
          CURRENT_DATE - (t.seq * 7),
          CURRENT_DATE - (t.seq * 7),
          'Checkpoint Report ' || LPAD(t.seq::TEXT, 2, '0') || ' - week ending ' || TO_CHAR(CURRENT_DATE - (t.seq * 7), 'DD Mon YYYY'),
          t.summary,
          t.summary,
          t.completed_work,
          t.work_in_progress,
          t.planned_work,
          t.quality_status,
          'Within the phased budget for the period.',
          t.schedule_status,
          t.status,
          seed_user_id
        )
        ON CONFLICT (id) DO NOTHING;

        v_inserted := v_inserted + 1;
      END LOOP;

      INSERT INTO v829_seed_log VALUES (proj.project_name, 'checkpoint_reports', 'OK', v_inserted || ' attempted (' || v_existing || ' pre-existing)');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO v829_seed_log VALUES (proj.project_name, 'checkpoint_reports', 'FAILED', SQLERRM);
  END;

END LOOP;
END $$;

-- This SELECT is what shows up in the Supabase Results grid. Look for any FAILED
-- rows and share them back.
SELECT * FROM v829_seed_log ORDER BY project_name, category;
