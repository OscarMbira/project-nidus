-- =============================================================================
-- v465_planning_module_seed_data.sql
-- Logical seed data for v354 Planning Intelligence module (Platform public schema).
-- Simulator parity: v466_sim_planning_module_seed_data.sql (sim schema).
-- Prerequisites: accounts, users, projects (account_id), tasks (optional FK targets),
--                plan_intelligence_rules (v452; optional v464 adds micro_plan_activity_stale),
--                plan_governance_rules (v458).
-- Idempotent markers: scenario names prefixed "SEED465:", micro-plans "SEED465 ".
-- PostgreSQL 15+ / Supabase
-- =============================================================================

DO $$
DECLARE
  v_org                UUID;
  v_user               UUID;
  v_p1                 UUID;
  v_p2                 UUID;
  v_t1                 UUID;
  v_t2                 UUID;
  v_t3                 UUID;
  v_sc1                UUID;
  v_sc2                UUID;
  v_sc3                UUID;
  r_missing            UUID;
  r_overdue            UUID;
  r_nobase             UUID;
  r_stale              UUID;
  g_rule_baseline      UUID;
  g_rule_risk          UUID;
  g_rule_milestone     UUID;
  g_rule_fin           UUID;
  v_mp1                UUID;
  v_mp2                UUID;
  v_pbs_root           UUID;
  v_pbs_a              UUID;
  v_pbs_b              UUID;
  v_pbs_c              UUID;
BEGIN
  SELECT a.id
  INTO v_org
  FROM public.accounts a
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
  ORDER BY a.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE NOTICE 'v465: No account — skip planning seed.';
    RETURN;
  END IF;

  SELECT u.id
  INTO v_user
  FROM public.users u
  WHERE COALESCE(u.is_deleted, FALSE) = FALSE
  ORDER BY u.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_user IS NULL THEN
    RAISE NOTICE 'v465: No user — skip planning seed.';
    RETURN;
  END IF;

  SELECT p.id
  INTO v_p1
  FROM public.projects p
  WHERE p.account_id = v_org
    AND COALESCE(p.is_deleted, FALSE) = FALSE
  ORDER BY p.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_p1 IS NULL THEN
    RAISE NOTICE 'v465: No project for org — skip planning seed.';
    RETURN;
  END IF;

  SELECT p.id
  INTO v_p2
  FROM public.projects p
  WHERE p.account_id = v_org
    AND COALESCE(p.is_deleted, FALSE) = FALSE
    AND p.id <> v_p1
  ORDER BY p.created_at ASC NULLS LAST
  LIMIT 1;

  SELECT t.id INTO v_t1 FROM public.tasks t WHERE t.project_id = v_p1 AND COALESCE(t.is_deleted, FALSE) = FALSE ORDER BY t.created_at LIMIT 1 OFFSET 0;
  SELECT t.id INTO v_t2 FROM public.tasks t WHERE t.project_id = v_p1 AND COALESCE(t.is_deleted, FALSE) = FALSE ORDER BY t.created_at LIMIT 1 OFFSET 1;
  SELECT t.id INTO v_t3 FROM public.tasks t WHERE t.project_id = v_p1 AND COALESCE(t.is_deleted, FALSE) = FALSE ORDER BY t.created_at LIMIT 1 OFFSET 2;

  SELECT r.id INTO r_missing FROM public.plan_intelligence_rules r WHERE r.organisation_id IS NULL AND r.rule_code = 'missing_predecessor' LIMIT 1;
  SELECT r.id INTO r_overdue FROM public.plan_intelligence_rules r WHERE r.organisation_id IS NULL AND r.rule_code = 'overdue_critical_task' LIMIT 1;
  SELECT r.id INTO r_nobase FROM public.plan_intelligence_rules r WHERE r.organisation_id IS NULL AND r.rule_code = 'no_baseline_set' LIMIT 1;
  SELECT r.id INTO r_stale FROM public.plan_intelligence_rules r WHERE r.organisation_id IS NULL AND r.rule_code = 'micro_plan_activity_stale' LIMIT 1;

  SELECT g.id INTO g_rule_baseline FROM public.plan_governance_rules g WHERE g.gate_name = 'Baseline Approval' LIMIT 1;
  SELECT g.id INTO g_rule_risk FROM public.plan_governance_rules g WHERE g.gate_name = 'Risk Review Before Execution' LIMIT 1;
  SELECT g.id INTO g_rule_milestone FROM public.plan_governance_rules g WHERE g.gate_name = 'Mandatory Milestone Set' LIMIT 1;
  SELECT g.id INTO g_rule_fin FROM public.plan_governance_rules g WHERE g.gate_name = 'Financial Approval Gate' LIMIT 1;

  -- ─── Scenarios (3) + snapshots (6) = 9 rows ─────────────────────────────
  INSERT INTO public.plan_scenarios (
    project_id, organisation_id, name, scenario_type, description, status,
    is_baseline, milestone_delta_days, cost_delta, is_draft
  ) VALUES
    (v_p1, v_org, 'SEED465: Baseline reference', 'most_likely',
     'Approved baseline snapshot for variance comparison.', 'active', TRUE, 0, 0::numeric, FALSE),
    (v_p1, v_org, 'SEED465: Vendor slip +3 weeks', 'worst_case',
     'Key supplier slips three weeks; downstream tasks compressed.', 'active', FALSE, 3, 12500::numeric, FALSE),
    (v_p1, v_org, 'SEED465: Recovery sprint', 'recovery',
     'Crash option: overlap design and build with added QA.', 'draft', FALSE, -5, -3200::numeric, FALSE)
  ON CONFLICT (project_id, name) DO NOTHING;

  SELECT s.id INTO v_sc1 FROM public.plan_scenarios s WHERE s.project_id = v_p1 AND s.name = 'SEED465: Baseline reference' LIMIT 1;
  SELECT s.id INTO v_sc2 FROM public.plan_scenarios s WHERE s.project_id = v_p1 AND s.name = 'SEED465: Vendor slip +3 weeks' LIMIT 1;
  SELECT s.id INTO v_sc3 FROM public.plan_scenarios s WHERE s.project_id = v_p1 AND s.name = 'SEED465: Recovery sprint' LIMIT 1;

  IF v_sc1 IS NOT NULL THEN
    INSERT INTO public.plan_scenario_task_snapshots (
      scenario_id, source_task_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc1, v_t1, 'Snapshot A — baseline', CURRENT_DATE, CURRENT_DATE + 14, 14, 40, FALSE, TRUE, 72, 'SEED465'
    WHERE NOT EXISTS (SELECT 1 FROM public.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc1 AND z.task_name = 'Snapshot A — baseline');

    INSERT INTO public.plan_scenario_task_snapshots (
      scenario_id, source_task_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc1, v_t2, 'Snapshot B — baseline', CURRENT_DATE + 15, CURRENT_DATE + 35, 20, 10, FALSE, FALSE, 65, 'SEED465'
    WHERE v_t2 IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc1 AND z.task_name = 'Snapshot B — baseline');
  END IF;

  IF v_sc2 IS NOT NULL THEN
    INSERT INTO public.plan_scenario_task_snapshots (
      scenario_id, source_task_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc2, v_t1, 'Snapshot A — slipped', CURRENT_DATE + 21, CURRENT_DATE + 35, 14, 25, FALSE, TRUE, 55, 'SEED465'
    WHERE NOT EXISTS (SELECT 1 FROM public.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc2 AND z.task_name = 'Snapshot A — slipped');

    INSERT INTO public.plan_scenario_task_snapshots (
      scenario_id, source_task_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc2, v_t2, 'Snapshot B — slipped', CURRENT_DATE + 36, CURRENT_DATE + 60, 24, 5, FALSE, FALSE, 48, 'SEED465'
    WHERE v_t2 IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc2 AND z.task_name = 'Snapshot B — slipped');
  END IF;

  IF v_sc3 IS NOT NULL THEN
    INSERT INTO public.plan_scenario_task_snapshots (
      scenario_id, source_task_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc3, v_t3, 'Recovery overlap window', CURRENT_DATE, CURRENT_DATE + 10, 10, 0, FALSE, TRUE, 60, 'SEED465'
    WHERE v_t3 IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc3 AND z.task_name = 'Recovery overlap window');

    INSERT INTO public.plan_scenario_task_snapshots (
      scenario_id, source_task_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc3, v_t1, 'Parallel QA buffer', CURRENT_DATE + 8, CURRENT_DATE + 18, 10, 0, FALSE, FALSE, 58, 'SEED465'
    WHERE NOT EXISTS (SELECT 1 FROM public.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc3 AND z.task_name = 'Parallel QA buffer');
  END IF;

  -- ─── Health scores (2) ─────────────────────────────────────────────────────
  INSERT INTO public.plan_health_scores (
    project_id, scored_at, overall_score, logic_quality, dependency_completeness,
    milestone_realism, critical_path_stability, baseline_discipline, resource_feasibility,
    scope_traceability, risk_exposure, change_pressure, governance_readiness,
    score_delta, summary_notes, findings_count, created_by
  )
  SELECT
    v_p1, NOW() - INTERVAL '7 days', 68, 70, 62, 75, 71, 55, 66, 60, 58, 52, 64, 0,
    'SEED465: prior week baseline.', 2, v_user
  WHERE NOT EXISTS (
    SELECT 1 FROM public.plan_health_scores h
    WHERE h.project_id = v_p1 AND h.summary_notes = 'SEED465: prior week baseline.'
  );

  INSERT INTO public.plan_health_scores (
    project_id, scored_at, overall_score, logic_quality, dependency_completeness,
    milestone_realism, critical_path_stability, baseline_discipline, resource_feasibility,
    scope_traceability, risk_exposure, change_pressure, governance_readiness,
    score_delta, summary_notes, findings_count, created_by
  )
  SELECT
    v_p1, NOW(), 72, 72, 68, 76, 73, 58, 68, 62, 55, 48, 66, 4,
    'SEED465: current week — improved dependency logging.', 1, v_user
  WHERE NOT EXISTS (
    SELECT 1 FROM public.plan_health_scores h
    WHERE h.project_id = v_p1 AND h.summary_notes = 'SEED465: current week — improved dependency logging.'
  );

  -- ─── Intelligence findings (4) ────────────────────────────────────────────
  IF r_missing IS NOT NULL AND v_t1 IS NOT NULL THEN
    INSERT INTO public.plan_intelligence_findings (
      project_id, rule_id, task_id, finding_text, severity, status, scanned_at
    )
    SELECT v_p1, r_missing, v_t1, 'SEED465: Missing predecessor on early work package task.', 'warning', 'open', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.plan_intelligence_findings f
      WHERE f.project_id = v_p1 AND f.task_id = v_t1 AND f.finding_text LIKE 'SEED465:%'
    );
  END IF;

  IF r_overdue IS NOT NULL AND v_t2 IS NOT NULL THEN
    INSERT INTO public.plan_intelligence_findings (
      project_id, rule_id, task_id, finding_text, severity, status, scanned_at
    )
    SELECT v_p1, r_overdue, v_t2, 'SEED465: Critical path item tracking behind planned finish.', 'error', 'open', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.plan_intelligence_findings f
      WHERE f.project_id = v_p1 AND f.rule_id = r_overdue AND f.finding_text LIKE 'SEED465:%'
    );
  END IF;

  IF r_nobase IS NOT NULL AND v_t3 IS NOT NULL THEN
    INSERT INTO public.plan_intelligence_findings (
      project_id, rule_id, task_id, finding_text, severity, status, scanned_at
    )
    SELECT v_p1, r_nobase, v_t3, 'SEED465: Schedule line active without approved baseline.', 'warning', 'acknowledged', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.plan_intelligence_findings f
      WHERE f.project_id = v_p1 AND f.rule_id = r_nobase AND f.finding_text LIKE 'SEED465:%'
    );
  END IF;

  IF r_stale IS NOT NULL THEN
    INSERT INTO public.plan_intelligence_findings (
      project_id, rule_id, task_id, finding_text, severity, status, scanned_at
    )
    SELECT v_p1, r_stale, NULL, 'SEED465: Micro-plan activity hygiene — stale overdue (demo).', 'warning', 'open', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.plan_intelligence_findings f
      WHERE f.project_id = v_p1 AND f.rule_id = r_stale AND f.finding_text LIKE 'SEED465:%'
    );
  END IF;

  -- ─── Confidence forecasts (4) ─────────────────────────────────────────────
  INSERT INTO public.plan_confidence_forecasts (
    project_id, task_id, confidence_pct, optimistic_date, likely_date, pessimistic_date,
    uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_p1, v_t1, 68, CURRENT_DATE + 5, CURRENT_DATE + 12, CURRENT_DATE + 22, 10,
    'SEED465: three-point estimate for integration milestone.', v_user
  WHERE v_t1 IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.plan_confidence_forecasts c WHERE c.project_id = v_p1 AND c.basis_notes LIKE 'SEED465:%' AND c.task_id IS NOT DISTINCT FROM v_t1);

  INSERT INTO public.plan_confidence_forecasts (
    project_id, task_id, confidence_pct, optimistic_date, likely_date, pessimistic_date,
    uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_p1, v_t2, 55, CURRENT_DATE + 8, CURRENT_DATE + 18, CURRENT_DATE + 30, 12,
    'SEED465: vendor-dependent path.', v_user
  WHERE v_t2 IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.plan_confidence_forecasts c WHERE c.project_id = v_p1 AND c.task_id IS NOT DISTINCT FROM v_t2 AND c.basis_notes LIKE 'SEED465:%');

  INSERT INTO public.plan_confidence_forecasts (
    project_id, task_id, confidence_pct, likely_date, uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_p1, NULL, 62, CURRENT_DATE + 45, 14, 'SEED465: project-level go-live window.', v_user
  WHERE NOT EXISTS (SELECT 1 FROM public.plan_confidence_forecasts c WHERE c.project_id = v_p1 AND c.task_id IS NULL AND c.basis_notes = 'SEED465: project-level go-live window.');

  INSERT INTO public.plan_confidence_forecasts (
    project_id, task_id, confidence_pct, likely_date, uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_p1, v_t3, 74, CURRENT_DATE + 25, 7, 'SEED465: test exit criteria confidence.', v_user
  WHERE v_t3 IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.plan_confidence_forecasts c WHERE c.project_id = v_p1 AND c.task_id IS NOT DISTINCT FROM v_t3 AND c.basis_notes LIKE 'SEED465:%');

  -- ─── Recovery options (4) ─────────────────────────────────────────────────
  DELETE FROM public.plan_recovery_options o
  WHERE o.project_id = v_p1 AND o.strategy_description LIKE 'SEED465:%';

  INSERT INTO public.plan_recovery_options (
    project_id, trigger_type, trigger_source_id, strategy, strategy_description,
    schedule_saving_days, cost_impact, risk_impact, requires_approval, status,
    generated_by_ai, created_by
  ) VALUES
    (v_p1, 'milestone_slippage', v_t1, 'fast_track',
     'SEED465: Overlap design review with procurement to recover one week.', 5, 2400::numeric,
     'Increased rework risk if specs change.', TRUE, 'suggested', FALSE, v_user),
    (v_p1, 'risk_materialised', v_t2, 'scope_defer',
     'SEED465: Defer non-critical reports to phase 2 to protect milestone.', 8, -1500::numeric,
     'Stakeholder comms required.', FALSE, 'under_review', TRUE, v_user),
    (v_p1, 'resource_overload', NULL, 'crash',
     'SEED465: Add second tester for two sprints.', 4, 8000::numeric, 'Budget pressure.', TRUE, 'suggested', FALSE, v_user),
    (v_p1, 'budget_overrun', NULL, 'resequence',
     'SEED465: Shift low-value enhancements after go-live.', 3, -4000::numeric, 'Scope trade-off documented.', TRUE, 'approved', FALSE, v_user);

  -- ─── AI sessions (2) ─────────────────────────────────────────────────────
  DELETE FROM public.plan_ai_sessions s
  WHERE s.project_id = v_p1 AND s.prompt_text LIKE 'SEED465:%';

  INSERT INTO public.plan_ai_sessions (
    project_id, organisation_id, prompt_text, industry_template,
    generated_phases, generated_milestones, generated_tasks, generated_risks,
    ai_assumptions, ai_explanation, status, created_by
  ) VALUES
    (
      v_p1, v_org,
      'SEED465: Generate a phased cutover for the payments workstream.',
      'financial_services',
      '[{"name":"Discovery","duration_weeks":2},{"name":"Build","duration_weeks":6}]'::jsonb,
      '[{"name":"UAT sign-off","week_offset":7}]'::jsonb,
      '[{"name":"Data migration dry-run","duration_days":3,"phase":"Build"}]'::jsonb,
      '[{"title":"Cutover rollback","probability":"medium","impact":"high"}]'::jsonb,
      'SEED465: Assumes freeze window of 48h.',
      'SEED465: Draft structure only — review with PMO.',
      'generated', v_user
    ),
    (
      v_p1, v_org,
      'SEED465: Summarise risks for executive read-out.',
      NULL,
      '[]'::jsonb,
      '[{"name":"Exec read-out","week_offset":3}]'::jsonb,
      '[]'::jsonb,
      '[{"title":"Regulatory filing delay","probability":"low","impact":"high"}]'::jsonb,
      'SEED465: Uses public milestones only.',
      'SEED465: Stub AI session row for UI testing.',
      'modified', v_user
    );

  -- ─── Governance findings (4) ─────────────────────────────────────────────
  IF g_rule_baseline IS NOT NULL THEN
    INSERT INTO public.plan_governance_findings (project_id, rule_id, status, last_checked_at)
    VALUES (v_p1, g_rule_baseline, 'compliant', NOW())
    ON CONFLICT (project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  IF g_rule_risk IS NOT NULL THEN
    INSERT INTO public.plan_governance_findings (project_id, rule_id, status, last_checked_at)
    VALUES (v_p1, g_rule_risk, 'pending', NOW())
    ON CONFLICT (project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  IF g_rule_milestone IS NOT NULL THEN
    INSERT INTO public.plan_governance_findings (project_id, rule_id, status, last_checked_at)
    VALUES (v_p1, g_rule_milestone, 'compliant', NOW())
    ON CONFLICT (project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  IF g_rule_fin IS NOT NULL THEN
    INSERT INTO public.plan_governance_findings (project_id, rule_id, status, last_checked_at)
    VALUES (v_p1, g_rule_fin, 'non_compliant', NOW())
    ON CONFLICT (project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  -- ─── Collision alerts (3) ─────────────────────────────────────────────────
  DELETE FROM public.plan_collision_alerts c
  WHERE c.organisation_id = v_org AND c.description LIKE 'SEED465:%';

  INSERT INTO public.plan_collision_alerts (
    organisation_id, collision_type, project_a_id, project_b_id, resource_id,
    conflict_start_date, conflict_end_date, description, severity, status
  ) VALUES
    (v_org, 'resource_overlap', v_p1, COALESCE(v_p2, v_p1), v_user,
     CURRENT_DATE, CURRENT_DATE + 7,
     'SEED465: Same lead engaged on overlapping windows (demo).', 'warning', 'open'),
    (v_org, 'milestone_clash', v_p1, COALESCE(v_p2, v_p1), NULL,
     CURRENT_DATE + 14, CURRENT_DATE + 14,
     'SEED465: Stakeholder review clashes with release rehearsal.', 'info', 'open'),
    (v_org, 'budget_concentration', v_p1, COALESCE(v_p2, v_p1), NULL,
     CURRENT_DATE, CURRENT_DATE + 30,
     'SEED465: Capex spike in same quarter across related projects.', 'critical', 'acknowledged');

  -- ─── PBS nodes (4) + PFD edges (3) ───────────────────────────────────────
  DELETE FROM public.plan_pfd_edges e
  WHERE e.project_id = v_p1 AND e.notes LIKE 'SEED465:%';

  DELETE FROM public.plan_pbs_nodes n
  WHERE n.project_id = v_p1 AND n.name LIKE 'SEED465 %';

  INSERT INTO public.plan_pbs_nodes (
    project_id, parent_id, node_code, name, description, product_type, status, sort_order, created_by
  ) VALUES
    (v_p1, NULL, 'P-SEED1', 'SEED465 Integrated service', 'Top-level product.', 'product', 'in_progress', 1, v_user)
  RETURNING id INTO v_pbs_root;

  INSERT INTO public.plan_pbs_nodes (
    project_id, parent_id, node_code, name, description, product_type, status, sort_order, created_by
  ) VALUES
    (v_p1, v_pbs_root, 'P-SEED1.1', 'SEED465 API layer', 'REST + events.', 'sub-product', 'in_progress', 1, v_user),
    (v_p1, v_pbs_root, 'P-SEED1.2', 'SEED465 Admin portal', 'Ops configuration UI.', 'sub-product', 'not_started', 2, v_user);

  SELECT id INTO v_pbs_a FROM public.plan_pbs_nodes WHERE project_id = v_p1 AND name = 'SEED465 API layer' LIMIT 1;
  SELECT id INTO v_pbs_b FROM public.plan_pbs_nodes WHERE project_id = v_p1 AND name = 'SEED465 Admin portal' LIMIT 1;

  INSERT INTO public.plan_pbs_nodes (
    project_id, parent_id, node_code, name, product_type, status, sort_order, created_by
  ) VALUES
    (v_p1, v_pbs_a, 'P-SEED1.1.1', 'SEED465 Auth module', 'component', 'under_review', 1, v_user);

  SELECT id INTO v_pbs_c FROM public.plan_pbs_nodes WHERE project_id = v_p1 AND name = 'SEED465 Auth module' LIMIT 1;

  IF v_pbs_root IS NOT NULL AND v_pbs_a IS NOT NULL THEN
    INSERT INTO public.plan_pfd_edges (project_id, from_node_id, to_node_id, relationship_type, notes)
    VALUES (v_p1, v_pbs_root, v_pbs_a, 'produces', 'SEED465: service exposes APIs')
    ON CONFLICT (from_node_id, to_node_id, relationship_type) DO NOTHING;
  END IF;

  IF v_pbs_a IS NOT NULL AND v_pbs_c IS NOT NULL THEN
    INSERT INTO public.plan_pfd_edges (project_id, from_node_id, to_node_id, relationship_type, notes)
    VALUES (v_p1, v_pbs_a, v_pbs_c, 'requires', 'SEED465: auth dependency')
    ON CONFLICT (from_node_id, to_node_id, relationship_type) DO NOTHING;
  END IF;

  IF v_pbs_a IS NOT NULL AND v_pbs_b IS NOT NULL THEN
    INSERT INTO public.plan_pfd_edges (project_id, from_node_id, to_node_id, relationship_type, notes)
    VALUES (v_p1, v_pbs_a, v_pbs_b, 'feeds_into', 'SEED465: shared components')
    ON CONFLICT (from_node_id, to_node_id, relationship_type) DO NOTHING;
  END IF;

  -- ─── Micro-plans (2) + activities (4) ───────────────────────────────────────
  DELETE FROM public.micro_plan_activities a
  USING public.project_micro_plans p
  WHERE p.id = a.micro_plan_id AND p.project_id = v_p1 AND p.plan_name LIKE 'SEED465 %';

  DELETE FROM public.project_micro_plans p
  WHERE p.project_id = v_p1 AND p.plan_name LIKE 'SEED465 %';

  INSERT INTO public.project_micro_plans (
    project_id, organisation_id, plan_name, plan_type, description, owner_id,
    status, overall_rag, is_draft, created_by
  ) VALUES
    (v_p1, v_org, 'SEED465 Team delivery — integration', 'team_delivery',
     'Coordination plan for integration window.', v_user, 'under_review', 'amber', FALSE, v_user),
    (v_p1, v_org, 'SEED465 Quality gate checklist', 'quality',
     'Entry/exit criteria for test phases.', v_user, 'draft', 'green', TRUE, v_user);

  SELECT id INTO v_mp1 FROM public.project_micro_plans WHERE project_id = v_p1 AND plan_name = 'SEED465 Team delivery — integration' LIMIT 1;
  SELECT id INTO v_mp2 FROM public.project_micro_plans WHERE project_id = v_p1 AND plan_name = 'SEED465 Quality gate checklist' LIMIT 1;

  IF v_mp1 IS NOT NULL THEN
    INSERT INTO public.micro_plan_activities (
      micro_plan_id, project_id, activity_reference, activity_name, category, status,
      planned_start_date, planned_end_date, progress_pct, rag_status, owner_id
    ) VALUES
      (v_mp1, v_p1, 'MPA-SEED-01', 'SEED465 Dry-run rehearsal', 'execution', 'in_progress',
       CURRENT_DATE, CURRENT_DATE + 3, 40, 'amber', v_user),
      (v_mp1, v_p1, 'MPA-SEED-02', 'SEED465 Sign-off workshop', 'sign_off', 'not_started',
       CURRENT_DATE + 4, CURRENT_DATE + 5, 0, 'green', v_user);
  END IF;

  IF v_mp2 IS NOT NULL THEN
    INSERT INTO public.micro_plan_activities (
      micro_plan_id, project_id, activity_reference, activity_name, category, status,
      planned_start_date, planned_end_date, progress_pct, rag_status, owner_id
    ) VALUES
      (v_mp2, v_p1, 'MPA-SEED-03', 'SEED465 Entry criteria review', 'quality_check', 'not_started',
       CURRENT_DATE + 7, CURRENT_DATE + 8, 0, 'green', v_user),
      (v_mp2, v_p1, 'MPA-SEED-04', 'SEED465 Exit evidence pack', 'reporting', 'not_started',
       CURRENT_DATE + 9, CURRENT_DATE + 12, 0, 'green', v_user);
  END IF;

  RAISE NOTICE 'v465: Planning module seed applied for project % (org %).', v_p1, v_org;
END $$;
