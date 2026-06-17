-- =============================================================================
-- v700: Seed Data â€“ Lessons Log (8 lessons for EDP-2024)
-- Prerequisites: v696 (demo project + lessons_logs register must exist).
-- Column mapping from v169_lessons_log_tables.sql schema:
--   Table: lessons (not lessons_learned)
--   lesson_code     â†’ lesson_reference (UNIQUE NOT NULL)
--   lesson_title    â†’ title (NOT NULL)
--   what_happened   â†’ event_description (NOT NULL)
--   root_cause      â†’ cause_description
--   effect_type     â†’ effect_type  enum: positive|negative|neutral
--   lesson_category â†’ category     enum: process|technical|resource|communication|
--                                        stakeholder|quality|schedule|cost|risk|
--                                        procurement|other
--   status          â†’ status       enum: logged|under_review|action_required|
--                                        action_taken|closed|rejected
--   priority        â†’ priority     enum: low|medium|high|critical
--   lesson_date     â†’ date_logged  (NOT NULL, default CURRENT_DATE)
--   created_by      â†’ logged_by_id (NOT NULL) + created_by (NOT NULL)
--   project_id      â†’ NOT on lessons; resolved via lessons_log_id
--   lesson_number   â†’ sequential integer within the log (NOT NULL)
-- =============================================================================

DO $$
DECLARE
  v_project_id   UUID;
  v_log_id       UUID;
  v_user_id      UUID;
  v_next_num     INTEGER := 1;
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v700: Demo project not found â€“ run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_log_id
  FROM public.lessons_logs
  WHERE project_id = v_project_id AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_log_id IS NULL THEN
    RAISE NOTICE 'v700: Lessons log not found â€“ run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id
  FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;

  -- Set auth.uid() so audit triggers get a real user ID
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (
      SELECT auth_user_id::text FROM public.users WHERE id = v_user_id AND auth_user_id IS NOT NULL LIMIT 1
    ))::text, true);


  -- Determine next available lesson_number for this log
  SELECT COALESCE(MAX(lesson_number), 0) + 1 INTO v_next_num
  FROM public.lessons WHERE lessons_log_id = v_log_id;

  INSERT INTO public.lessons (
    id, lessons_log_id,
    lesson_reference, lesson_number, lesson_scope,
    title, event_description, cause_description,
    effect_description, effect_type,
    recommendations,
    category, priority, status,
    date_logged,
    logged_by_id, actioned_by_id,
    created_by, is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_log_id,
    l.ref,
    v_next_num + (ROW_NUMBER() OVER (ORDER BY l.ref) - 1),
    'project',
    l.title, l.event_desc, l.cause_desc,
    l.effect_desc,
    l.effect_type::effect_type_enum,
    l.recommendations,
    l.category::lesson_category_enum,
    l.priority::lesson_priority_enum,
    l.status::lesson_status_enum,
    CURRENT_DATE - (l.days_ago || ' days')::interval,
    v_user_id, v_user_id,
    v_user_id, false, NOW(), NOW()
  FROM (VALUES
    -- (ref, title, event_desc, cause_desc, effect_desc, effect_type,
    --  recommendations, category, priority, status, days_ago)
    ('LES-001',
     'Early Stakeholder Workshops Prevented Major Scope Gaps',
     'Two structured stakeholder discovery workshops in Stage 1 identified 14 requirements absent from the initial scope brief. These were incorporated at zero change cost.',
     'Discovery workshops were not originally planned; added at the suggestion of the Lead BA who had experienced scope gaps on a previous programme.',
     'Stage 1 completeness significantly improved; no change requests raised for the discovered requirements; estimated saving of Â£85K in rework avoided.',
     'positive',
     'Schedule and budget discovery workshops as a mandatory Stage 1 activity in all future programme PIDs. Allocate minimum 3 days of senior stakeholder time per workshop. Use structured facilitation with pre-read materials.',
     'process', 'high', 'action_taken', 90),

    ('LES-002',
     'Lack of Sprint Review Attendance Eroded Product Quality',
     'Sprint reviews for Sprints 4â€“7 had an average attendance of 2 out of 8 invited stakeholders. Defects that would have been caught during review were instead identified in UAT, requiring 3 additional weeks of rework.',
     'Stakeholders treated sprint reviews as optional. No mandatory attendance policy was in place and no escalation occurred when quorum was not met.',
     'Defect detection moved from sprint review to UAT; 3 weeks of rework added to schedule; estimated cost of rework Â£28K.',
     'negative',
     'Establish minimum quorum of 4 stakeholders for sprint reviews to be valid. Reschedule immediately if quorum is not met. Add sprint review attendance rate to programme health dashboard.',
     'process', 'medium', 'action_taken', 60),

    ('LES-003',
     'Vendor Brought On Without Full Contractual Security Clauses',
     'The mobile platform vendor was contracted without the standard security addendum because procurement was expedited to meet a Board deadline. A security audit 6 weeks later identified 3 non-compliances requiring contract renegotiation.',
     'Time pressure led to procurement cutting corners on the contract review process. Legal and Security functions were not given adequate review time.',
     'Contract renegotiation took 3 weeks; security remediation cost Â£12K; reputational risk to the programme from non-compliance.',
     'negative',
     'No vendor contract to be executed without sign-off from Legal and Information Security, regardless of timeline pressure. Build 5-day review SLA into procurement process templates.',
     'procurement', 'high', 'logged', 75),

    ('LES-004',
     'Shared Component Library Saved Significant Rework Across Workstreams',
     'Building a shared UI component library in Stage 2 saved an estimated 340 development hours across three portal workstreams. Components were reused 28 times.',
     'Senior developer proposed the shared library approach as an alternative to workstream-specific development. Adopted after a 2-hour architecture review.',
     'Estimated 340 developer-hours saved; consistency across all portal screens improved; onboarding time for new developers reduced.',
     'positive',
     'Evaluate shared component opportunities at the start of every stage with parallel workstreams. Include reuse assessment as a standing agenda item at Stage Gate reviews.',
     'technical', 'medium', 'action_taken', 50),

    ('LES-005',
     'Insufficient Test Data Caused 2-Week Delay to System Testing',
     'System testing was delayed 2 weeks because anonymised test data was not available at the start of the testing window. Data anonymisation was not scheduled or resourced.',
     'Test data preparation was assumed to be a minor task and was not formally scheduled. The dependency between data anonymisation and test execution was not captured.',
     '2-week delay to system testing start; knock-on impact to UAT schedule; estimated cost of delay Â£16K.',
     'negative',
     'Include test data preparation as a named task with a minimum 3-week lead time before first test execution. Assign a named test data manager. Treat data readiness as a mandatory Stage Gate entry criterion.',
     'schedule', 'high', 'action_taken', 40),

    ('LES-006',
     'Cross-Team Daily Stand-Ups Improved Dependency Visibility',
     'A cross-team daily stand-up introduced in Stage 3 reduced dependency-related blockers by an estimated 60% compared to Stage 2. Two critical path conflicts were identified and resolved before they caused delay.',
     'Stage 2 used separate workstream stand-ups with no cross-team forum. The Programme Manager introduced the cross-team stand-up after receiving feedback from team leads.',
     'Dependency blockers reduced; critical path conflicts identified earlier; team cohesion improved.',
     'positive',
     'Introduce cross-workstream stand-up as a standard governance event from programme inception. Limit to 15 minutes with a structured format. Track dependency resolution as a programme metric.',
     'communication', 'medium', 'action_taken', 30),

    ('LES-007',
     'Change Requests Submitted Informally Caused Unauthorised Scope Creep',
     'Over 3 stages, 23 informal change requests were submitted via email directly to the Project Manager, bypassing the formal change log. Several were verbally approved without CCB review, leading to approximately 6 weeks of unauthorised scope work.',
     'The change control process was documented but not communicated effectively. There was no automated routing or acknowledgement system.',
     'Approximately 6 weeks of unauthorised work; schedule delayed; budget impact estimated at Â£42K; change log integrity compromised.',
     'negative',
     'Publish the change request form link on the project SharePoint homepage. Automatically acknowledge all change requests. Brief all senior stakeholders on the change control process at each Stage Kick-off.',
     'process', 'high', 'logged', 20),

    ('LES-008',
     'Pair Programming Reduced Defect Rate by 35% in API Layer',
     'A 4-week trial of pair programming for the API development workstream reduced the defect count in code reviews from an average of 14 per sprint to 9 per sprint â€“ a 35% reduction.',
     'Pair programming was introduced as an experiment following a retrospective where developers identified knowledge silos as a key issue.',
     '35% defect reduction in API layer; knowledge sharing improved; developer satisfaction scores increased.',
     'positive',
     'Adopt pair programming as a standard practice for all complex API and integration work. Schedule pairing sessions in sprint planning. Include pairing effectiveness in sprint retrospective metrics.',
     'technical', 'low', 'action_taken', 15)

  ) AS l(ref, title, event_desc, cause_desc, effect_desc, effect_type,
         recommendations, category, priority, status, days_ago)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.lessons
    WHERE lessons_log_id = v_log_id AND lesson_reference = l.ref
  );

  RAISE NOTICE 'v700: Lessons seed complete for log % (project %).', v_log_id, v_project_id;

END $$;
