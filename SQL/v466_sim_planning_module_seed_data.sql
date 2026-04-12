-- =============================================================================
-- v466_sim_planning_module_seed_data.sql
-- Simulator (sim) parity seed for Planning Intelligence + micro-plans.
-- Mirrors logical shape of v465_planning_module_seed_data.sql (Platform).
-- Prerequisites: v461_sim_planning_tables.sql, v463_sim_micro_plans.sql,
--                sim.plan_intelligence_rules + sim.plan_governance_rules (seeded in v461 from public).
-- Idempotent markers: "SEED466:" / "SEED466 " in names and text fields.
-- PostgreSQL 15+ / Supabase — run as migration role (RLS bypass) or as practice project owner.
-- =============================================================================

DO $$
DECLARE
  v_pp1                UUID;
  v_pp2                UUID;
  v_uid                UUID;
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
  SELECT pp.id, pp.user_id
  INTO v_pp1, v_uid
  FROM sim.practice_projects pp
  ORDER BY pp.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_pp1 IS NULL THEN
    RAISE NOTICE 'v466: No sim.practice_projects row — skip sim planning seed.';
    RETURN;
  END IF;

  IF v_uid IS NULL THEN
    RAISE NOTICE 'v466: Practice project has no user_id — skip sim planning seed.';
    RETURN;
  END IF;

  SELECT pp.id
  INTO v_pp2
  FROM sim.practice_projects pp
  WHERE pp.id <> v_pp1
  ORDER BY pp.created_at ASC NULLS LAST
  LIMIT 1;

  SELECT r.id INTO r_missing FROM sim.plan_intelligence_rules r WHERE r.rule_code = 'missing_predecessor' LIMIT 1;
  SELECT r.id INTO r_overdue FROM sim.plan_intelligence_rules r WHERE r.rule_code = 'overdue_critical_task' LIMIT 1;
  SELECT r.id INTO r_nobase FROM sim.plan_intelligence_rules r WHERE r.rule_code = 'no_baseline_set' LIMIT 1;
  SELECT r.id INTO r_stale FROM sim.plan_intelligence_rules r WHERE r.rule_code = 'micro_plan_activity_stale' LIMIT 1;

  SELECT g.id INTO g_rule_baseline FROM sim.plan_governance_rules g WHERE g.gate_name = 'Baseline Approval' LIMIT 1;
  SELECT g.id INTO g_rule_risk FROM sim.plan_governance_rules g WHERE g.gate_name = 'Risk Review Before Execution' LIMIT 1;
  SELECT g.id INTO g_rule_milestone FROM sim.plan_governance_rules g WHERE g.gate_name = 'Mandatory Milestone Set' LIMIT 1;
  SELECT g.id INTO g_rule_fin FROM sim.plan_governance_rules g WHERE g.gate_name = 'Financial Approval Gate' LIMIT 1;

  -- ─── Scenarios (3) + snapshots (6) — sim snapshots have no source_task_id ──
  INSERT INTO sim.plan_scenarios (
    practice_project_id, name, scenario_type, description, status,
    is_baseline, milestone_delta_days, cost_delta, is_draft, created_by
  ) VALUES
    (v_pp1, 'SEED466: Baseline reference', 'most_likely',
     'Approved baseline snapshot for variance comparison.', 'active', TRUE, 0, 0::numeric, FALSE, v_uid),
    (v_pp1, 'SEED466: Vendor slip +3 weeks', 'worst_case',
     'Key supplier slips three weeks; downstream tasks compressed.', 'active', FALSE, 3, 12500::numeric, FALSE, v_uid),
    (v_pp1, 'SEED466: Recovery sprint', 'recovery',
     'Crash option: overlap design and build with added QA.', 'draft', FALSE, -5, -3200::numeric, FALSE, v_uid)
  ON CONFLICT (practice_project_id, name) DO NOTHING;

  SELECT s.id INTO v_sc1 FROM sim.plan_scenarios s WHERE s.practice_project_id = v_pp1 AND s.name = 'SEED466: Baseline reference' LIMIT 1;
  SELECT s.id INTO v_sc2 FROM sim.plan_scenarios s WHERE s.practice_project_id = v_pp1 AND s.name = 'SEED466: Vendor slip +3 weeks' LIMIT 1;
  SELECT s.id INTO v_sc3 FROM sim.plan_scenarios s WHERE s.practice_project_id = v_pp1 AND s.name = 'SEED466: Recovery sprint' LIMIT 1;

  IF v_sc1 IS NOT NULL THEN
    INSERT INTO sim.plan_scenario_task_snapshots (
      scenario_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc1, 'Snapshot A — baseline', CURRENT_DATE, CURRENT_DATE + 14, 14, 40, FALSE, TRUE, 72, 'SEED466'
    WHERE NOT EXISTS (SELECT 1 FROM sim.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc1 AND z.task_name = 'Snapshot A — baseline');

    INSERT INTO sim.plan_scenario_task_snapshots (
      scenario_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc1, 'Snapshot B — baseline', CURRENT_DATE + 15, CURRENT_DATE + 35, 20, 10, FALSE, FALSE, 65, 'SEED466'
    WHERE NOT EXISTS (SELECT 1 FROM sim.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc1 AND z.task_name = 'Snapshot B — baseline');
  END IF;

  IF v_sc2 IS NOT NULL THEN
    INSERT INTO sim.plan_scenario_task_snapshots (
      scenario_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc2, 'Snapshot A — slipped', CURRENT_DATE + 21, CURRENT_DATE + 35, 14, 25, FALSE, TRUE, 55, 'SEED466'
    WHERE NOT EXISTS (SELECT 1 FROM sim.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc2 AND z.task_name = 'Snapshot A — slipped');

    INSERT INTO sim.plan_scenario_task_snapshots (
      scenario_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc2, 'Snapshot B — slipped', CURRENT_DATE + 36, CURRENT_DATE + 60, 24, 5, FALSE, FALSE, 48, 'SEED466'
    WHERE NOT EXISTS (SELECT 1 FROM sim.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc2 AND z.task_name = 'Snapshot B — slipped');
  END IF;

  IF v_sc3 IS NOT NULL THEN
    INSERT INTO sim.plan_scenario_task_snapshots (
      scenario_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc3, 'Recovery overlap window', CURRENT_DATE, CURRENT_DATE + 10, 10, 0, FALSE, TRUE, 60, 'SEED466'
    WHERE NOT EXISTS (SELECT 1 FROM sim.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc3 AND z.task_name = 'Recovery overlap window');

    INSERT INTO sim.plan_scenario_task_snapshots (
      scenario_id, task_name, start_date, end_date, duration_days,
      progress_percentage, is_milestone, is_critical_path, confidence_level, notes
    )
    SELECT v_sc3, 'Parallel QA buffer', CURRENT_DATE + 8, CURRENT_DATE + 18, 10, 0, FALSE, FALSE, 58, 'SEED466'
    WHERE NOT EXISTS (SELECT 1 FROM sim.plan_scenario_task_snapshots z WHERE z.scenario_id = v_sc3 AND z.task_name = 'Parallel QA buffer');
  END IF;

  -- ─── Health scores (2) — sim table has no created_by ───────────────────────
  INSERT INTO sim.plan_health_scores (
    practice_project_id, scored_at, overall_score, logic_quality, dependency_completeness,
    milestone_realism, critical_path_stability, baseline_discipline, resource_feasibility,
    scope_traceability, risk_exposure, change_pressure, governance_readiness,
    score_delta, summary_notes, findings_count
  )
  SELECT
    v_pp1, NOW() - INTERVAL '7 days', 68, 70, 62, 75, 71, 55, 66, 60, 58, 52, 64, 0,
    'SEED466: prior week baseline.', 2
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.plan_health_scores h
    WHERE h.practice_project_id = v_pp1 AND h.summary_notes = 'SEED466: prior week baseline.'
  );

  INSERT INTO sim.plan_health_scores (
    practice_project_id, scored_at, overall_score, logic_quality, dependency_completeness,
    milestone_realism, critical_path_stability, baseline_discipline, resource_feasibility,
    scope_traceability, risk_exposure, change_pressure, governance_readiness,
    score_delta, summary_notes, findings_count
  )
  SELECT
    v_pp1, NOW(), 72, 72, 68, 76, 73, 58, 68, 62, 55, 48, 66, 4,
    'SEED466: current week — improved dependency logging.', 1
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.plan_health_scores h
    WHERE h.practice_project_id = v_pp1 AND h.summary_notes = 'SEED466: current week — improved dependency logging.'
  );

  -- ─── Intelligence findings (4) — sim has no task_id column ─────────────────
  IF r_missing IS NOT NULL THEN
    INSERT INTO sim.plan_intelligence_findings (
      practice_project_id, rule_id, finding_text, severity, status, scanned_at
    )
    SELECT v_pp1, r_missing, 'SEED466: Missing predecessor on early work package task.', 'warning', 'open', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM sim.plan_intelligence_findings f
      WHERE f.practice_project_id = v_pp1 AND f.rule_id = r_missing
        AND f.finding_text = 'SEED466: Missing predecessor on early work package task.'
    );
  END IF;

  IF r_overdue IS NOT NULL THEN
    INSERT INTO sim.plan_intelligence_findings (
      practice_project_id, rule_id, finding_text, severity, status, scanned_at
    )
    SELECT v_pp1, r_overdue, 'SEED466: Critical path item tracking behind planned finish.', 'error', 'open', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM sim.plan_intelligence_findings f
      WHERE f.practice_project_id = v_pp1 AND f.rule_id = r_overdue
        AND f.finding_text = 'SEED466: Critical path item tracking behind planned finish.'
    );
  END IF;

  IF r_nobase IS NOT NULL THEN
    INSERT INTO sim.plan_intelligence_findings (
      practice_project_id, rule_id, finding_text, severity, status, scanned_at
    )
    SELECT v_pp1, r_nobase, 'SEED466: Schedule line active without approved baseline.', 'warning', 'acknowledged', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM sim.plan_intelligence_findings f
      WHERE f.practice_project_id = v_pp1 AND f.rule_id = r_nobase
        AND f.finding_text = 'SEED466: Schedule line active without approved baseline.'
    );
  END IF;

  IF r_stale IS NOT NULL THEN
    INSERT INTO sim.plan_intelligence_findings (
      practice_project_id, rule_id, finding_text, severity, status, scanned_at
    )
    SELECT v_pp1, r_stale, 'SEED466: Micro-plan activity hygiene — stale overdue (demo).', 'warning', 'open', NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM sim.plan_intelligence_findings f
      WHERE f.practice_project_id = v_pp1 AND f.rule_id = r_stale
        AND f.finding_text = 'SEED466: Micro-plan activity hygiene — stale overdue (demo).'
    );
  END IF;

  -- ─── Confidence forecasts (4) — sim has no task_id ─────────────────────────
  INSERT INTO sim.plan_confidence_forecasts (
    practice_project_id, confidence_pct, optimistic_date, likely_date, pessimistic_date,
    uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_pp1, 68, CURRENT_DATE + 5, CURRENT_DATE + 12, CURRENT_DATE + 22, 10,
    'SEED466: three-point estimate for integration milestone.', v_uid
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.plan_confidence_forecasts c
    WHERE c.practice_project_id = v_pp1 AND c.basis_notes = 'SEED466: three-point estimate for integration milestone.'
  );

  INSERT INTO sim.plan_confidence_forecasts (
    practice_project_id, confidence_pct, optimistic_date, likely_date, pessimistic_date,
    uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_pp1, 55, CURRENT_DATE + 8, CURRENT_DATE + 18, CURRENT_DATE + 30, 12,
    'SEED466: vendor-dependent path.', v_uid
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.plan_confidence_forecasts c
    WHERE c.practice_project_id = v_pp1 AND c.basis_notes = 'SEED466: vendor-dependent path.'
  );

  INSERT INTO sim.plan_confidence_forecasts (
    practice_project_id, confidence_pct, likely_date, uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_pp1, 62, CURRENT_DATE + 45, 14, 'SEED466: project-level go-live window.', v_uid
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.plan_confidence_forecasts c
    WHERE c.practice_project_id = v_pp1 AND c.basis_notes = 'SEED466: project-level go-live window.'
  );

  INSERT INTO sim.plan_confidence_forecasts (
    practice_project_id, confidence_pct, likely_date, uncertainty_band_days, basis_notes, created_by
  )
  SELECT v_pp1, 74, CURRENT_DATE + 25, 7, 'SEED466: test exit criteria confidence.', v_uid
  WHERE NOT EXISTS (
    SELECT 1 FROM sim.plan_confidence_forecasts c
    WHERE c.practice_project_id = v_pp1 AND c.basis_notes = 'SEED466: test exit criteria confidence.'
  );

  -- ─── Recovery options (4) — no trigger_source_id / requires_approval in sim ─
  DELETE FROM sim.plan_recovery_options o
  WHERE o.practice_project_id = v_pp1 AND o.strategy_description LIKE 'SEED466:%';

  INSERT INTO sim.plan_recovery_options (
    practice_project_id, trigger_type, strategy, strategy_description,
    schedule_saving_days, cost_impact, risk_impact, status, generated_by_ai, created_by
  ) VALUES
    (v_pp1, 'milestone_slippage', 'fast_track',
     'SEED466: Overlap design review with procurement to recover one week.', 5, 2400::numeric,
     'Increased rework risk if specs change.', 'suggested', FALSE, v_uid),
    (v_pp1, 'risk_materialised', 'scope_defer',
     'SEED466: Defer non-critical reports to phase 2 to protect milestone.', 8, -1500::numeric,
     'Stakeholder comms required.', 'under_review', TRUE, v_uid),
    (v_pp1, 'resource_overload', 'crash',
     'SEED466: Add second tester for two sprints.', 4, 8000::numeric, 'Budget pressure.', 'suggested', FALSE, v_uid),
    (v_pp1, 'budget_overrun', 'resequence',
     'SEED466: Shift low-value enhancements after go-live.', 3, -4000::numeric, 'Scope trade-off documented.', 'approved', FALSE, v_uid);

  -- ─── AI sessions (2) — no organisation_id in sim ───────────────────────────
  DELETE FROM sim.plan_ai_sessions s
  WHERE s.practice_project_id = v_pp1 AND s.prompt_text LIKE 'SEED466:%';

  INSERT INTO sim.plan_ai_sessions (
    practice_project_id, prompt_text, industry_template,
    generated_phases, generated_milestones, generated_tasks, generated_risks,
    ai_assumptions, ai_explanation, status, created_by
  ) VALUES
    (
      v_pp1,
      'SEED466: Generate a phased cutover for the payments workstream.',
      'financial_services',
      '[{"name":"Discovery","duration_weeks":2},{"name":"Build","duration_weeks":6}]'::jsonb,
      '[{"name":"UAT sign-off","week_offset":7}]'::jsonb,
      '[{"name":"Data migration dry-run","duration_days":3,"phase":"Build"}]'::jsonb,
      '[{"title":"Cutover rollback","probability":"medium","impact":"high"}]'::jsonb,
      'SEED466: Assumes freeze window of 48h.',
      'SEED466: Draft structure only — review with PMO.',
      'generated', v_uid
    ),
    (
      v_pp1,
      'SEED466: Summarise risks for executive read-out.',
      NULL,
      '[]'::jsonb,
      '[{"name":"Exec read-out","week_offset":3}]'::jsonb,
      '[]'::jsonb,
      '[{"title":"Regulatory filing delay","probability":"low","impact":"high"}]'::jsonb,
      'SEED466: Uses public milestones only.',
      'SEED466: Stub AI session row for UI testing.',
      'modified', v_uid
    );

  -- ─── Governance findings (4) ─────────────────────────────────────────────
  IF g_rule_baseline IS NOT NULL THEN
    INSERT INTO sim.plan_governance_findings (practice_project_id, rule_id, status, last_checked_at)
    VALUES (v_pp1, g_rule_baseline, 'compliant', NOW())
    ON CONFLICT (practice_project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  IF g_rule_risk IS NOT NULL THEN
    INSERT INTO sim.plan_governance_findings (practice_project_id, rule_id, status, last_checked_at)
    VALUES (v_pp1, g_rule_risk, 'pending', NOW())
    ON CONFLICT (practice_project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  IF g_rule_milestone IS NOT NULL THEN
    INSERT INTO sim.plan_governance_findings (practice_project_id, rule_id, status, last_checked_at)
    VALUES (v_pp1, g_rule_milestone, 'compliant', NOW())
    ON CONFLICT (practice_project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  IF g_rule_fin IS NOT NULL THEN
    INSERT INTO sim.plan_governance_findings (practice_project_id, rule_id, status, last_checked_at)
    VALUES (v_pp1, g_rule_fin, 'non_compliant', NOW())
    ON CONFLICT (practice_project_id, rule_id) DO UPDATE SET status = EXCLUDED.status, last_checked_at = EXCLUDED.last_checked_at;
  END IF;

  -- ─── Collision alerts (3) — no organisation_id / resource_id in sim ────────
  DELETE FROM sim.plan_collision_alerts c
  WHERE c.practice_project_a_id = v_pp1 AND c.description LIKE 'SEED466:%';

  INSERT INTO sim.plan_collision_alerts (
    collision_type, practice_project_a_id, practice_project_b_id,
    conflict_start_date, conflict_end_date, description, severity, status
  ) VALUES
    ('resource_overlap', v_pp1, COALESCE(v_pp2, v_pp1),
     CURRENT_DATE, CURRENT_DATE + 7,
     'SEED466: Same lead engaged on overlapping windows (demo).', 'warning', 'open'),
    ('milestone_clash', v_pp1, COALESCE(v_pp2, v_pp1),
     CURRENT_DATE + 14, CURRENT_DATE + 14,
     'SEED466: Stakeholder review clashes with release rehearsal.', 'info', 'open'),
    ('budget_concentration', v_pp1, COALESCE(v_pp2, v_pp1),
     CURRENT_DATE, CURRENT_DATE + 30,
     'SEED466: Capex spike in same quarter across related projects.', 'critical', 'acknowledged');

  -- ─── PBS nodes (4) + PFD edges (3) ───────────────────────────────────────
  DELETE FROM sim.plan_pfd_edges e
  WHERE e.practice_project_id = v_pp1 AND e.notes LIKE 'SEED466:%';

  DELETE FROM sim.plan_pbs_nodes n
  WHERE n.practice_project_id = v_pp1 AND n.name LIKE 'SEED466 %';

  INSERT INTO sim.plan_pbs_nodes (
    practice_project_id, parent_id, node_code, name, description, product_type, status, sort_order, created_by
  ) VALUES
    (v_pp1, NULL, 'P-SIM-SEED1', 'SEED466 Integrated service', 'Top-level product.', 'product', 'in_progress', 1, v_uid)
  RETURNING id INTO v_pbs_root;

  INSERT INTO sim.plan_pbs_nodes (
    practice_project_id, parent_id, node_code, name, description, product_type, status, sort_order, created_by
  ) VALUES
    (v_pp1, v_pbs_root, 'P-SIM-SEED1.1', 'SEED466 API layer', 'REST + events.', 'sub-product', 'in_progress', 1, v_uid),
    (v_pp1, v_pbs_root, 'P-SIM-SEED1.2', 'SEED466 Admin portal', 'Ops configuration UI.', 'sub-product', 'not_started', 2, v_uid);

  SELECT id INTO v_pbs_a FROM sim.plan_pbs_nodes WHERE practice_project_id = v_pp1 AND name = 'SEED466 API layer' LIMIT 1;
  SELECT id INTO v_pbs_b FROM sim.plan_pbs_nodes WHERE practice_project_id = v_pp1 AND name = 'SEED466 Admin portal' LIMIT 1;

  INSERT INTO sim.plan_pbs_nodes (
    practice_project_id, parent_id, node_code, name, product_type, status, sort_order, created_by
  ) VALUES
    (v_pp1, v_pbs_a, 'P-SIM-SEED1.1.1', 'SEED466 Auth module', 'component', 'under_review', 1, v_uid);

  SELECT id INTO v_pbs_c FROM sim.plan_pbs_nodes WHERE practice_project_id = v_pp1 AND name = 'SEED466 Auth module' LIMIT 1;

  IF v_pbs_root IS NOT NULL AND v_pbs_a IS NOT NULL THEN
    INSERT INTO sim.plan_pfd_edges (practice_project_id, from_node_id, to_node_id, relationship_type, notes)
    VALUES (v_pp1, v_pbs_root, v_pbs_a, 'produces', 'SEED466: service exposes APIs')
    ON CONFLICT (from_node_id, to_node_id, relationship_type) DO NOTHING;
  END IF;

  IF v_pbs_a IS NOT NULL AND v_pbs_c IS NOT NULL THEN
    INSERT INTO sim.plan_pfd_edges (practice_project_id, from_node_id, to_node_id, relationship_type, notes)
    VALUES (v_pp1, v_pbs_a, v_pbs_c, 'requires', 'SEED466: auth dependency')
    ON CONFLICT (from_node_id, to_node_id, relationship_type) DO NOTHING;
  END IF;

  IF v_pbs_a IS NOT NULL AND v_pbs_b IS NOT NULL THEN
    INSERT INTO sim.plan_pfd_edges (practice_project_id, from_node_id, to_node_id, relationship_type, notes)
    VALUES (v_pp1, v_pbs_a, v_pbs_b, 'feeds_into', 'SEED466: shared components')
    ON CONFLICT (from_node_id, to_node_id, relationship_type) DO NOTHING;
  END IF;

  -- ─── Micro-plans (2) + activities (4) — plan_reference required (unique) ─
  DELETE FROM sim.micro_plan_activities a
  USING sim.project_micro_plans p
  WHERE p.id = a.micro_plan_id AND p.practice_project_id = v_pp1 AND p.plan_name LIKE 'SEED466 %';

  DELETE FROM sim.project_micro_plans p
  WHERE p.practice_project_id = v_pp1 AND p.plan_name LIKE 'SEED466 %';

  INSERT INTO sim.project_micro_plans (
    practice_project_id, plan_reference, plan_name, plan_type, description, owner_id,
    status, overall_rag, is_draft, created_by
  ) VALUES
    (v_pp1, 'SEED466-MPL-INT', 'SEED466 Team delivery — integration', 'team_delivery',
     'Coordination plan for integration window.', v_uid, 'under_review', 'amber', FALSE, v_uid),
    (v_pp1, 'SEED466-MPL-QA', 'SEED466 Quality gate checklist', 'quality',
     'Entry/exit criteria for test phases.', v_uid, 'draft', 'green', TRUE, v_uid);

  SELECT id INTO v_mp1 FROM sim.project_micro_plans WHERE practice_project_id = v_pp1 AND plan_reference = 'SEED466-MPL-INT' LIMIT 1;
  SELECT id INTO v_mp2 FROM sim.project_micro_plans WHERE practice_project_id = v_pp1 AND plan_reference = 'SEED466-MPL-QA' LIMIT 1;

  IF v_mp1 IS NOT NULL THEN
    INSERT INTO sim.micro_plan_activities (
      micro_plan_id, practice_project_id, activity_reference, activity_name, category, status,
      planned_start_date, planned_end_date, progress_pct, rag_status, owner_id, created_by
    ) VALUES
      (v_mp1, v_pp1, 'MPA-SEED466-01', 'SEED466 Dry-run rehearsal', 'execution', 'in_progress',
       CURRENT_DATE, CURRENT_DATE + 3, 40, 'amber', v_uid, v_uid),
      (v_mp1, v_pp1, 'MPA-SEED466-02', 'SEED466 Sign-off workshop', 'sign_off', 'not_started',
       CURRENT_DATE + 4, CURRENT_DATE + 5, 0, 'green', v_uid, v_uid);
  END IF;

  IF v_mp2 IS NOT NULL THEN
    INSERT INTO sim.micro_plan_activities (
      micro_plan_id, practice_project_id, activity_reference, activity_name, category, status,
      planned_start_date, planned_end_date, progress_pct, rag_status, owner_id, created_by
    ) VALUES
      (v_mp2, v_pp1, 'MPA-SEED466-03', 'SEED466 Entry criteria review', 'quality_check', 'not_started',
       CURRENT_DATE + 7, CURRENT_DATE + 8, 0, 'green', v_uid, v_uid),
      (v_mp2, v_pp1, 'MPA-SEED466-04', 'SEED466 Exit evidence pack', 'reporting', 'not_started',
       CURRENT_DATE + 9, CURRENT_DATE + 12, 0, 'green', v_uid, v_uid);
  END IF;

  RAISE NOTICE 'v466: Sim planning module seed applied for practice_project % (user %).', v_pp1, v_uid;
END $$;
