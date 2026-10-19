-- ============================================================================
-- v1275: Ask Nidus data catalogue rows (required configuration, not demo data)
-- PRD D9 (12 registers) + D16 (Planner: schedule, resources, dependencies); plan SQL #4.
--
-- Entities point at the curated views from v1274. Field flags: f = filterable, g = groupable,
-- s = summable, d = shown by default. Each entity has a hidden-by-default 'project_id' link to
-- projects so questions can combine registers ("risks by project budget").
-- Delay log is seeded INACTIVE (not in D9) so Admin can switch it on without a code change.
-- ON CONFLICT DO NOTHING keeps Admin edits when this file is re-run.
-- Prerequisite: v1274. Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.ai_cat(
  p_schema TEXT, p_entity TEXT, p_label TEXT, p_singular TEXT, p_description TEXT,
  p_display_field TEXT, p_display_id_field TEXT, p_route TEXT, p_editions TEXT[], p_sort INT,
  p_fields JSONB, p_active BOOLEAN DEFAULT TRUE
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE f JSONB; i INT := 0;
BEGIN
  EXECUTE format($q$
    INSERT INTO %1$I.ai_catalogue_entities (entity_key, view_name, label, label_singular, description, display_field,
                                            display_id_field, route_template, editions, is_active, sort_order)
    VALUES ($1, 'ai_v_' || $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (entity_key) DO NOTHING$q$, p_schema)
  USING p_entity, p_label, p_singular, p_description, p_display_field, p_display_id_field, p_route, p_editions, p_active, p_sort;

  FOR f IN SELECT * FROM jsonb_array_elements(p_fields) LOOP
    i := i + 1;
    EXECUTE format($q$
      INSERT INTO %1$I.ai_catalogue_fields (entity_key, field_key, label, data_type, is_filterable, is_groupable, is_summable,
                                            is_default, description, allowed_values, link_entity_key, sort_order)
      VALUES ($1, $2, $3, $4, position('f' in $5) > 0, position('g' in $5) > 0, position('s' in $5) > 0, position('d' in $5) > 0,
              $6, $7, $8, $9)
      ON CONFLICT (entity_key, field_key) DO NOTHING$q$, p_schema)
    USING p_entity, f->>0, f->>1, f->>2, COALESCE(f->>3, ''), f->>4,
          CASE WHEN jsonb_typeof(f->5) = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(f->5)) END,
          NULLIF(f->>6, ''), i * 10;
  END LOOP;
END $$;

DO $$
DECLARE
  s TEXT;
  pub BOOLEAN;
  risk_status JSONB;
  lesson_status JSONB;
  lesson_priority JSONB;
BEGIN
  -- Projects first: other entities link to it.
  FOREACH s IN ARRAY ARRAY['public', 'sim'] LOOP
    pub := s = 'public';
    risk_status := CASE WHEN pub THEN '["identified","assessing","responding","monitoring","occurred","closed","expired"]' ELSE 'null' END;
    lesson_status := CASE WHEN pub THEN '["logged","under_review","action_required","action_taken","closed","rejected"]' ELSE 'null' END;
    lesson_priority := CASE WHEN pub THEN '["low","medium","high","critical"]' ELSE 'null' END;

    PERFORM pg_temp.ai_cat(s, 'projects', 'Projects', 'Project',
      'Projects in the organisation with status, health, dates, progress, budget and project manager. One row per project.',
      'project_name', 'display_id', CASE WHEN pub THEN '/platform/projects/{id}' ELSE '/simulator/practice-projects/{id}' END,
      CASE WHEN pub THEN ARRAY['platform', 'planner'] ELSE ARRAY['platform'] END, 10,
      '[["display_id","Project code","text","fd"],
        ["project_name","Project name","text","fgd"],
        ["status","Status","text","fgd"],
        ["health_status","Health","text","fgd","RAG health (e.g. green, amber, red)."],
        ["priority","Priority","text","fg"],
        ["methodology","Delivery methodology","text","fg"],
        ["planned_start_date","Planned start","date","fd"],
        ["planned_end_date","Planned finish","date","fd"],
        ["actual_start_date","Actual start","date","f"],
        ["actual_end_date","Actual finish","date","f"],
        ["percentage_complete","% complete","number","fsd"],
        ["budget_amount","Budget","number","fs"],
        ["actual_cost","Actual cost","number","fs"],
        ["budget_currency","Currency","text","fg"],
        ["project_manager","Project manager","text","fgd"],
        ["is_archived","Archived","boolean","f","Archived projects are usually excluded unless asked for."],
        ["created_at","Created","datetime","f"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'tasks', 'Tasks', 'Task',
      'Schedule tasks (plan rows) with dates, baseline, progress, critical path, slack and assignee. Summary rows group sub-tasks; milestones are tasks with is_milestone.',
      'task_name', 'display_id', NULL,
      CASE WHEN pub THEN ARRAY['platform', 'planner'] ELSE ARRAY['platform'] END, 20,
      '[["display_id","Task code","text","fd"],
        ["task_name","Task","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f","Link to the project; use project_id.<field> for project fields.",null,"projects"],
        ["wbs_code","WBS code","text","f"],
        ["status","Status","text","fg"],
        ["priority","Priority","text","fg"],
        ["planned_start_date","Start","date","fd"],
        ["planned_end_date","Finish","date","fd"],
        ["actual_start_date","Actual start","date","f"],
        ["actual_end_date","Actual finish","date","f"],
        ["due_date","Due date","date","f"],
        ["baseline_start_date","Baseline start","date","f"],
        ["baseline_end_date","Baseline finish","date","f"],
        ["finish_variance_days","Finish variance (days)","number","fs","Planned finish minus baseline finish; positive = later than baseline."],
        ["percentage_complete","% complete","number","fsd"],
        ["estimated_hours","Estimated hours","number","fs"],
        ["actual_hours","Actual hours","number","fs"],
        ["is_milestone","Milestone","boolean","fg"],
        ["is_critical","Critical path","boolean","fgd","True when the task is on the critical path (drives the finish date)."],
        ["is_blocked","Blocked","boolean","fg"],
        ["slack_days","Slack (days)","number","fs","Total float; 0 = critical."],
        ["is_summary","Summary row","boolean","fg","Summary rows roll up their sub-tasks; exclude them when counting work."],
        ["is_late","Late","boolean","fgd","Planned finish is in the past and the task is not 100% complete."],
        ["assigned_to","Assigned to","text","fgd"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'milestones', 'Milestones', 'Milestone',
      'Project milestones with target, forecast and actual dates and slip.',
      'milestone_name', NULL, CASE WHEN pub THEN '/platform/milestones/{id}' ELSE '/simulator/practice-projects/{project_id}/milestones/{id}' END,
      ARRAY['platform'], 30,
      '[["milestone_name","Milestone","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd"],
        ["target_date","Target date","date","fd"],
        ["forecast_date","Forecast date","date","fd"],
        ["actual_date","Actual date","date","f"],
        ["slip_days","Slip (days)","number","fs","Forecast (or actual) minus target; positive = late."],
        ["owner","Owner","text","fg"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'risks', 'Risks', 'Risk',
      'Risk register entries with status, level, score, owner, response and review dates. Open risks are those whose status is not closed, expired or occurred.',
      'title', 'display_id', CASE WHEN pub THEN '/platform/risks/{id}' ELSE '/simulator/practice-risk-register/{id}' END,
      ARRAY['platform'], 40,
      ('[["display_id","Risk ID","text","fd"],
        ["title","Title","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd",null,' || risk_status::text || '],
        ["level","Risk level","text","fgd","e.g. low, medium, high, very high / critical."],
        ["category","Category","text","fg"],
        ["probability","Probability","number","fs"],
        ["impact","Impact","number","fs"],
        ["risk_score","Score","number","fsd"],
        ["owner","Owner","text","fgd"],
        ["response","Response","text","fg"],
        ["identified_date","Identified","date","f"],
        ["target_mitigation_date","Target mitigation date","date","f"],
        ["next_review_date","Next review","date","f"],
        ["proximity_date","Proximity date","date","f"],
        ["closed_date","Closed","date","f"],
        ["is_escalated","Escalated","boolean","fg"],
        ["description","Description","text","f"],
        ["created_at","Created","datetime","f"]]')::jsonb);

    PERFORM pg_temp.ai_cat(s, 'issues', 'Issues', 'Issue',
      'Issue register entries with type, priority, severity, status, owner, dates and impact. Open issues are those whose status is not closed or resolved.',
      'title', 'display_id', CASE WHEN pub THEN '/platform/issues/{id}' ELSE '/simulator/practice-issue-register/{id}' END,
      ARRAY['platform'], 50,
      '[["display_id","Issue ID","text","fd"],
        ["title","Title","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd"],
        ["issue_type","Type","text","fg","e.g. problem/concern, request for change, off-specification."],
        ["category","Category","text","fg"],
        ["priority","Priority","text","fgd"],
        ["severity","Severity","text","fg"],
        ["owner","Owner","text","fgd"],
        ["date_raised","Raised","date","fd"],
        ["due_date","Due date","date","f"],
        ["closed_date","Closed","date","f"],
        ["cost_impact","Cost impact","number","fs"],
        ["schedule_impact_days","Schedule impact (days)","number","fs"],
        ["is_escalated","Escalated","boolean","fg"],
        ["description","Description","text","f"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'change_requests', 'Change requests', 'Change request',
      'Change requests with type, priority, urgency, status, requestor and impact summary.',
      'title', 'display_id', CASE WHEN pub THEN '/platform/change-requests/{id}' ELSE '/simulator/practice-change-requests/{id}' END,
      ARRAY['platform'], 60,
      '[["display_id","Change ID","text","fd"],
        ["title","Title","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd"],
        ["change_type","Type","text","fg"],
        ["category","Category","text","fg"],
        ["priority","Priority","text","fgd"],
        ["urgency","Urgency","text","fg"],
        ["requestor_name","Requested by","text","fg"],
        ["submission_date","Submitted","date","fd"],
        ["approval_required_by_date","Decision needed by","date","f"],
        ["impact_summary","Impact summary","text","f"],
        ["description","Description","text","f"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'actions', 'Actions', 'Action',
      'Actions recorded in project daily logs, with owner, due date and status.',
      'title', 'display_id', NULL, ARRAY['platform'], 70,
      '[["display_id","Action ID","text","fd"],
        ["title","Action","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd"],
        ["priority","Priority","text","fg"],
        ["owner","Owner","text","fgd"],
        ["entry_date","Logged","date","f"],
        ["target_date","Due","date","fd"],
        ["completed_at","Completed","datetime","f"],
        ["is_overdue","Overdue","boolean","fgd"],
        ["description","Description","text","f"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'decisions', 'Decisions', 'Decision',
      'Project decisions with category, status, decision date, decision maker, rationale and impact.',
      'title', 'display_id', CASE WHEN pub THEN '/platform/governance/decisions/{id}' ELSE '/simulator/governance/decisions/{id}' END,
      ARRAY['platform'], 80,
      '[["display_id","Decision ID","text","fd"],
        ["title","Decision","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd"],
        ["category","Category","text","fg"],
        ["priority","Priority","text","fg"],
        ["decision_date","Decided on","date","fd"],
        ["decided_by","Decided by","text","fgd"],
        ["review_date","Review date","date","f"],
        ["rationale","Rationale","text","f"],
        ["impact","Impact","text","f"],
        ["description","Description","text","f"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'lessons', 'Lessons', 'Lesson',
      'Lessons learned with category, effect (positive/negative), status, stage, description and recommendation.',
      'title', 'display_id', NULL, ARRAY['platform'], 90,
      ('[["display_id","Lesson ID","text","fd"],
        ["title","Lesson","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd",null,' || lesson_status::text || '],
        ["priority","Priority","text","fg",null,' || lesson_priority::text || '],
        ["category","Category","text","fgd"],
        ["lesson_type","Type","text","fg"],
        ["effect","Effect","text","fg","positive, negative or neutral"],
        ["impact_level","Impact level","text","fg"],
        ["stage","Stage","text","fg"],
        ["lesson_date","Date","date","fd"],
        ["is_corporate","Corporate lesson","boolean","fg"],
        ["description","What happened","text","f"],
        ["recommendation","Recommendation","text","f"]]')::jsonb);

    PERFORM pg_temp.ai_cat(s, 'stakeholders', 'Stakeholders', 'Stakeholder',
      'Stakeholder register: people and groups, their organisation, role, interest, influence and power.',
      'name', 'display_id', NULL, ARRAY['platform'], 100,
      '[["display_id","Stakeholder ID","text","fd"],
        ["name","Name","text","fd"],
        ["job_title","Job title","text","f"],
        ["organisation","Organisation","text","fgd"],
        ["stakeholder_type","Type","text","fg"],
        ["category","Category","text","fg"],
        ["role","Role","text","fgd"],
        ["interest_level","Interest","text","fg"],
        ["is_decision_maker","Decision maker","boolean","fg"],
        ["is_influencer","Influencer","boolean","fg"],
        ["is_powerful","High power","boolean","fg"],
        ["status","Status","text","fg"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["expectations","Expectations","text","f"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'budget_summary', 'Budget summary', 'Project budget',
      'Budget summary per project: budget, planned, committed, forecast, actual cost, remaining budget and % spent. One row per project.',
      'project_name', 'display_id', CASE WHEN pub THEN '/platform/projects/{id}/budget' END,
      ARRAY['platform'], 110,
      '[["display_id","Project code","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["currency","Currency","text","fg"],
        ["budget_amount","Budget","number","fsd"],
        ["planned_total","Planned (budget lines)","number","fs"],
        ["committed_total","Committed","number","fs"],
        ["forecast_total","Forecast","number","fs"],
        ["actual_cost","Actual cost","number","fsd"],
        ["remaining_budget","Remaining budget","number","fsd"],
        ["percent_spent","% spent","number","fsd"],
        ["forecast_variance","Forecast variance","number","fs","Forecast minus budget; positive = forecast overspend."]]'::jsonb);

    IF pub THEN
      PERFORM pg_temp.ai_cat(s, 'resource_assignments', 'Resource assignments', 'Resource assignment',
        'Resources (people, equipment, materials) allocated to projects and tasks, with dates, allocation % and hours. Use to find over-allocation.',
        'resource_name', 'display_id', NULL, ARRAY['platform', 'planner'], 120,
        '[["display_id","Resource code","text","f"],
          ["resource_name","Resource","text","fgd"],
          ["resource_type","Resource type","text","fg"],
          ["resource_category","Category","text","fg"],
          ["project_name","Project","text","fgd"],
          ["project_id","Project (link)","uuid","f",null,null,"projects"],
          ["task_name","Task","text","fd"],
          ["assignment_type","Assigned to (project/task)","text","fg"],
          ["role","Role","text","fg"],
          ["start_date","From","date","fd"],
          ["end_date","To","date","fd"],
          ["allocation_percentage","Allocation %","number","fsd","Sum per resource over overlapping dates above 100 means over-allocated."],
          ["allocated_hours_per_day","Hours per day","number","fs"],
          ["total_allocated_hours","Total allocated hours","number","fs"],
          ["actual_hours_worked","Actual hours worked","number","fs"],
          ["status","Status","text","fg"],
          ["capacity_hours_per_day","Capacity (hours/day)","number","fs"]]'::jsonb);
    END IF;

    PERFORM pg_temp.ai_cat(s, 'task_assignments', 'Task assignments', 'Task assignment',
      'Who is assigned to which tasks, with the task dates, estimated hours and progress. Use to see each person''s workload.',
      'task_name', 'display_id', NULL,
      CASE WHEN pub THEN ARRAY['platform', 'planner'] ELSE ARRAY['platform'] END, 130,
      '[["display_id","Task code","text","f"],
        ["task_name","Task","text","fd"],
        ["person","Person","text","fgd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["planned_start_date","Start","date","fd"],
        ["planned_end_date","Finish","date","fd"],
        ["percentage_complete","% complete","number","fsd"],
        ["estimated_hours","Estimated hours","number","fs"],
        ["is_late","Late","boolean","fg"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'task_dependencies', 'Task dependencies', 'Task dependency',
      'Links between tasks: predecessor, successor, type (FS finish-to-start, SS, FF, SF) and lag in days.',
      'successor_task', NULL, NULL,
      CASE WHEN pub THEN ARRAY['platform', 'planner'] ELSE ARRAY['platform'] END, 140,
      '[["predecessor_task","Predecessor","text","fgd"],
        ["successor_task","Successor","text","fgd"],
        ["dependency_type","Type","text","fgd",null,["FS","SS","FF","SF"]],
        ["lag_days","Lag (days)","number","fsd"],
        ["is_critical","Critical","boolean","fg"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'baselines', 'Baselines', 'Baseline',
      'Saved schedule baselines per project: number, name, date, approval and whether it is the active baseline.',
      'baseline_name', 'display_id', NULL,
      CASE WHEN pub THEN ARRAY['platform', 'planner'] ELSE ARRAY['platform'] END, 150,
      '[["display_id","Baseline","text","fd"],
        ["baseline_name","Name","text","fd"],
        ["baseline_number","Number","number","f"],
        ["baseline_type","Type","text","fg"],
        ["baseline_date","Date","date","fd"],
        ["is_active_baseline","Active baseline","boolean","fgd"],
        ["is_approved","Approved","boolean","fg"],
        ["approval_date","Approved on","datetime","f"],
        ["reason","Reason","text","f"],
        ["change_request_ref","Change request","text","f"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"]]'::jsonb);

    PERFORM pg_temp.ai_cat(s, 'delays', 'Delay log', 'Delay',
      'Delay log: schedule delays with cause, responsible party, impact in days and cost, and resolution dates.',
      'title', 'display_id', NULL, ARRAY['platform'], 160,
      '[["display_id","Delay ID","text","fd"],
        ["title","Title","text","fd"],
        ["project_name","Project","text","fgd"],
        ["project_id","Project (link)","uuid","f",null,null,"projects"],
        ["status","Status","text","fgd"],
        ["severity","Severity","text","fgd"],
        ["category","Category","text","fg"],
        ["cause","Cause","text","fg"],
        ["responsible_party","Responsible party","text","fg"],
        ["impact_schedule_days","Schedule impact (days)","number","fsd"],
        ["impact_cost","Cost impact","number","fs"],
        ["identified_date","Identified","date","f"],
        ["revised_forecast_date","Revised forecast","date","f"],
        ["resolution_target_date","Resolution target","date","f"],
        ["resolved_date","Resolved","date","f"],
        ["description","Description","text","f"]]'::jsonb, FALSE);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1275_ai_catalogue_seed.sql completed'; END $$;
