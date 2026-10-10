-- =============================================================================
-- v1206: Sample benefits and OKR rows for SEED334-PRJ-08 (Velocity Freight)
-- Covers the Benefits sidebar leaves:
--   Benefits Register (benefits) — 12
--   Measures (benefit_measures + benefit_measurements) — 12 each
--   Realisation Tracking (uses those benefits and measurements)
--   Post-Implementation Review (benefit_realization_reports) — 12
--   Strategy & OKRs (okr_cycles, objectives, key_results) — 2 cycles, 12 objectives, 12 key results
-- Idempotent: fixed UUIDs + ON CONFLICT (id) DO NOTHING.
-- benefits.benefit_code has no Admin ID trigger (see v967) — codes are VF-BEN-01 … VF-BEN-12.
-- No other projects are seeded.
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_account_id UUID;
  v_user_id    UUID;
  v_auth_id    UUID;
  i            INT;
  v_benefit_id UUID;
  v_cycle_id   UUID;
  v_obj_id     UUID;

  v_names TEXT[] := ARRAY[
    'Lower fuel cost per delivery',
    'Fewer empty return miles',
    'Higher on-time delivery rate',
    'Shorter warehouse dwell time',
    'Fewer delivery claims',
    'Better driver utilisation',
    'Faster customer invoice cycle',
    'Lower carbon per tonne-km',
    'Improved shipper satisfaction',
    'Fewer safety incidents',
    'Reduced overtime on night routes',
    'Faster proof-of-delivery capture'
  ];
  v_categories TEXT[] := ARRAY[
    'financial','operational','customer','operational','financial','employee',
    'financial','environmental','customer','compliance','employee','technology'
  ];
  v_types TEXT[] := ARRAY[
    'quantifiable','quantifiable','quantifiable','quantifiable','quantifiable','quantifiable',
    'quantifiable','quantifiable','qualitative','quantifiable','quantifiable','quantifiable'
  ];
  v_statuses TEXT[] := ARRAY[
    'realized','in_progress','in_progress','partially_realized','realized','in_progress',
    'planned','in_progress','identified','realized','planned','identified'
  ];
  v_units TEXT[] := ARRAY[
    'currency','percentage','percentage','hours','count','percentage',
    'hours','percentage','score','count','hours','percentage'
  ];
  v_baselines NUMERIC[] := ARRAY[4.80, 28, 86, 14, 42, 71, 9, 118, 6.2, 11, 6.5, 64];
  v_targets   NUMERIC[] := ARRAY[3.90, 12, 96, 6, 15, 85, 4, 90, 8.5, 4, 3.0, 95];
  v_currents  NUMERIC[] := ARRAY[3.85, 18, 92, 9, 16, 79, 7, 101, 6.8, 4, 5.1, 78];
  v_estimated NUMERIC[] := ARRAY[180000, 95000, 140000, 72000, 60000, 48000, 55000, 40000, 35000, 80000, 42000, 28000];
  v_realized  NUMERIC[] := ARRAY[175000, 40000, 60000, 25000, 58000, 18000, 0, 12000, 0, 80000, 0, 0];
  v_probs     NUMERIC[] := ARRAY[95, 70, 80, 65, 90, 75, 55, 60, 50, 92, 45, 40];
BEGIN
  SELECT id, account_id, owner_user_id
    INTO v_project_id, v_account_id, v_user_id
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-08'
    AND COALESCE(is_deleted, FALSE) = FALSE
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'v1206: project SEED334-PRJ-08 not found';
  END IF;

  IF v_user_id IS NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.project_memberships
    WHERE project_id = v_project_id
      AND COALESCE(is_active, TRUE) = TRUE
    LIMIT 1;
  END IF;

  IF v_user_id IS NOT NULL THEN
    SELECT auth_user_id INTO v_auth_id FROM public.users WHERE id = v_user_id;
  END IF;

  FOR i IN 1..12 LOOP
    v_benefit_id := ('12060001-b101-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid;

    INSERT INTO public.benefits (
      id, benefit_code, benefit_name, benefit_description,
      project_id, benefit_category, benefit_type, benefit_owner_user_id,
      measurement_unit, baseline_value, target_value, current_value, realized_value,
      benefit_status, expected_realization_date, actual_realization_date,
      tracking_frequency, estimated_value, realized_value_currency, value_currency,
      attribution_percentage, realization_probability, notes,
      is_deleted, created_by, updated_by
    ) VALUES (
      v_benefit_id,
      'VF-BEN-' || lpad(i::text, 2, '0'),
      v_names[i],
      'Velocity Freight pilot benefit for the dynamic route optimisation project.',
      v_project_id,
      v_categories[i],
      v_types[i],
      v_user_id,
      v_units[i],
      v_baselines[i],
      v_targets[i],
      v_currents[i],
      CASE WHEN v_statuses[i] IN ('realized', 'partially_realized') THEN v_currents[i] ELSE NULL END,
      v_statuses[i],
      CURRENT_DATE + ((i * 21) - 40),
      CASE WHEN v_statuses[i] = 'realized' THEN CURRENT_DATE - (i * 7) ELSE NULL END,
      'monthly',
      v_estimated[i],
      v_realized[i],
      'USD',
      100,
      v_probs[i],
      'Sample row for SEED334-PRJ-08. Safe to delete.',
      FALSE,
      v_user_id,
      v_user_id
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.benefit_measures (
      id, benefit_id, measure_name, measure_description, measure_unit, measure_type,
      calculation_method, collection_method, collection_frequency, data_source,
      measure_owner_user_id, notes, is_deleted, created_by
    ) VALUES (
      ('12060002-a101-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      v_benefit_id,
      v_names[i] || ' — monthly measure',
      'Primary measure used to track this benefit on the Velocity Freight pilot.',
      v_units[i],
      'direct',
      'average',
      'system',
      'monthly',
      'Route optimisation operations extract',
      v_user_id,
      'Sample measure for SEED334-PRJ-08.',
      FALSE,
      v_user_id
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.benefit_measurements (
      id, benefit_id, measure_id, measurement_date, measurement_value, measurement_unit,
      measurement_period, measurement_type, data_quality, data_source, verified, notes,
      is_deleted, created_by
    ) VALUES (
      ('12060003-e101-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      v_benefit_id,
      ('12060002-a101-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      CURRENT_DATE - (i * 15),
      v_currents[i],
      v_units[i],
      'monthly',
      'actual',
      'good',
      'Route optimisation operations extract',
      TRUE,
      'Latest recorded actual for this benefit.',
      FALSE,
      v_user_id
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.benefit_realization_reports (
      id, project_id, report_name, report_description, report_type,
      report_start_date, report_end_date, report_date, report_status,
      report_owner_user_id, generated_by_user_id, notes,
      is_deleted, created_by
    ) VALUES (
      ('12060004-d101-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      v_project_id,
      'PIR ' || lpad(i::text, 2, '0') || ' — ' || v_names[i],
      'Post-implementation review of whether this benefit is on track for the freight pilot.',
      (ARRAY['benefits_realization','benefits_vs_costs','benefits_forecast','benefits_attribution','comprehensive'])[1 + ((i - 1) % 5)],
      CURRENT_DATE - 90,
      CURRENT_DATE,
      CURRENT_DATE - (i * 5),
      (ARRAY['final','draft','archived'])[1 + ((i - 1) % 3)],
      v_user_id,
      v_user_id,
      'Sample post-implementation review for SEED334-PRJ-08.',
      FALSE,
      v_user_id
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- Twelve monthly readings on the first benefit so Measures shows a history, not one row.
  FOR i IN 1..12 LOOP
    INSERT INTO public.benefit_measurements (
      id, benefit_id, measure_id, measurement_date, measurement_value, measurement_unit,
      measurement_period, measurement_type, data_quality, data_source, verified, notes,
      is_deleted, created_by
    ) VALUES (
      ('12060009-e201-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      '12060001-b101-4a01-9c01-534433340001'::uuid,
      '12060002-a101-4a01-9c01-534433340001'::uuid,
      CURRENT_DATE - ((13 - i) * 30),
      ROUND((4.80 - ((4.80 - 3.85) * i / 12.0))::numeric, 2),
      'currency',
      'monthly',
      'actual',
      'good',
      'Fuel cost extract',
      TRUE,
      'Monthly fuel-cost reading for VF-BEN-01.',
      FALSE,
      v_user_id
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  IF v_account_id IS NULL OR v_auth_id IS NULL THEN
    RAISE NOTICE 'v1206: benefits seeded; OKR skipped because the project has no account or the owner has no auth user.';
    RETURN;
  END IF;

  BEGIN
  INSERT INTO public.okr_cycles (
    id, account_id, cycle_name, cycle_code, period_type, start_date, end_date, status, created_by, is_deleted
  ) VALUES
    ('12060005-c101-4a01-9c01-534433340001', v_account_id, 'FY2026 H1 — Network efficiency', 'VF-OKR-2026-H1', 'half_year', DATE '2026-01-01', DATE '2026-06-30', 'closed', v_auth_id, FALSE),
    ('12060005-c101-4a01-9c01-534433340002', v_account_id, 'FY2026 H2 — Service and safety', 'VF-OKR-2026-H2', 'half_year', DATE '2026-07-01', DATE '2026-12-31', 'active', v_auth_id, FALSE)
  ON CONFLICT (id) DO NOTHING;

  FOR i IN 1..12 LOOP
    v_cycle_id := CASE WHEN i <= 6
      THEN '12060005-c101-4a01-9c01-534433340001'::uuid
      ELSE '12060005-c101-4a01-9c01-534433340002'::uuid
    END;
    v_obj_id := ('12060006-f101-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid;

    INSERT INTO public.objectives (
      id, account_id, cycle_id, owner_user_id, objective_title, objective_description,
      scope_level, health_status, progress_pct, created_by, is_deleted
    ) VALUES (
      v_obj_id,
      v_account_id,
      v_cycle_id,
      v_auth_id,
      v_names[i],
      'Objective linked to the Velocity Freight route-optimisation pilot.',
      'team',
      (ARRAY['on_track','at_risk','behind','completed'])[1 + ((i - 1) % 4)],
      (ARRAY[88, 62, 35, 100, 74, 51, 40, 67, 22, 96, 45, 30])[i],
      v_auth_id,
      FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.key_results (
      id, objective_id, kr_title, target_value, current_value, baseline_value,
      unit_label, health_status, progress_pct, sort_order, is_deleted
    ) VALUES (
      ('12060007-a701-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      v_obj_id,
      'Move ' || v_names[i] || ' from baseline toward target',
      v_targets[i],
      v_currents[i],
      v_baselines[i],
      v_units[i],
      (ARRAY['on_track','at_risk','behind','completed'])[1 + ((i - 1) % 4)],
      (ARRAY[88, 62, 35, 100, 74, 51, 40, 67, 22, 96, 45, 30])[i],
      1,
      FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.okr_initiatives (
      id, key_result_id, project_id, initiative_label, contribution_weight, is_deleted
    ) VALUES (
      ('12060008-a801-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      ('12060007-a701-4a01-9c01-53443334' || lpad(i::text, 4, '0'))::uuid,
      v_project_id,
      'Velocity Freight pilot contribution',
      100,
      FALSE
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'v1206: benefits seeded; OKR seed skipped: %', SQLERRM;
  END;
END $$;

-- These tables had RLS enabled (v40, v643) with no authenticated policies, so the app
-- would keep showing an empty dashboard after the inserts. Members of the linked
-- project, the row owner, and PMO admins can read and maintain the rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits, public.benefit_measures,
  public.benefit_measurements, public.benefit_realization_reports,
  public.okr_cycles, public.objectives, public.key_results, public.okr_initiatives
  TO authenticated;

DROP POLICY IF EXISTS policy_v1206_benefits_access ON public.benefits;
CREATE POLICY policy_v1206_benefits_access ON public.benefits
  FOR ALL TO authenticated
  USING (
    public.is_user_pmo_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND (
          u.id = benefits.benefit_owner_user_id
          OR u.id = benefits.created_by
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = benefits.project_id AND p.owner_user_id = u.id
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = benefits.project_id
              AND pm.user_id = u.id
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
        )
    )
  )
  WITH CHECK (
    public.is_user_pmo_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND (
          u.id = benefits.benefit_owner_user_id
          OR u.id = benefits.created_by
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = benefits.project_id AND p.owner_user_id = u.id
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = benefits.project_id
              AND pm.user_id = u.id
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS policy_v1206_benefit_measures_access ON public.benefit_measures;
CREATE POLICY policy_v1206_benefit_measures_access ON public.benefit_measures
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.benefits b WHERE b.id = benefit_measures.benefit_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.benefits b WHERE b.id = benefit_measures.benefit_id));

DROP POLICY IF EXISTS policy_v1206_benefit_measurements_access ON public.benefit_measurements;
CREATE POLICY policy_v1206_benefit_measurements_access ON public.benefit_measurements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.benefits b WHERE b.id = benefit_measurements.benefit_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.benefits b WHERE b.id = benefit_measurements.benefit_id));

DROP POLICY IF EXISTS policy_v1206_benefit_reports_access ON public.benefit_realization_reports;
CREATE POLICY policy_v1206_benefit_reports_access ON public.benefit_realization_reports
  FOR ALL TO authenticated
  USING (
    public.is_user_pmo_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = benefit_realization_reports.project_id AND p.owner_user_id = u.id
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = benefit_realization_reports.project_id
              AND pm.user_id = u.id
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
        )
    )
  )
  WITH CHECK (
    public.is_user_pmo_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = benefit_realization_reports.project_id AND p.owner_user_id = u.id
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            WHERE pm.project_id = benefit_realization_reports.project_id
              AND pm.user_id = u.id
              AND COALESCE(pm.is_active, TRUE) = TRUE
          )
        )
    )
  );

DROP POLICY IF EXISTS policy_v1206_okr_cycles_access ON public.okr_cycles;
CREATE POLICY policy_v1206_okr_cycles_access ON public.okr_cycles
  FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_user_pmo_admin(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS policy_v1206_objectives_access ON public.objectives;
CREATE POLICY policy_v1206_objectives_access ON public.objectives
  FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()) OR owner_user_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (public.is_user_pmo_admin(auth.uid()) OR owner_user_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS policy_v1206_key_results_access ON public.key_results;
CREATE POLICY policy_v1206_key_results_access ON public.key_results
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = key_results.objective_id
      AND (public.is_user_pmo_admin(auth.uid()) OR o.owner_user_id = auth.uid() OR o.created_by = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = key_results.objective_id
      AND (public.is_user_pmo_admin(auth.uid()) OR o.owner_user_id = auth.uid() OR o.created_by = auth.uid())
  ));

DROP POLICY IF EXISTS policy_v1206_okr_initiatives_access ON public.okr_initiatives;
CREATE POLICY policy_v1206_okr_initiatives_access ON public.okr_initiatives
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.key_results kr
    JOIN public.objectives o ON o.id = kr.objective_id
    WHERE kr.id = okr_initiatives.key_result_id
      AND (public.is_user_pmo_admin(auth.uid()) OR o.owner_user_id = auth.uid() OR o.created_by = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.key_results kr
    JOIN public.objectives o ON o.id = kr.objective_id
    WHERE kr.id = okr_initiatives.key_result_id
      AND (public.is_user_pmo_admin(auth.uid()) OR o.owner_user_id = auth.uid() OR o.created_by = auth.uid())
  ));
