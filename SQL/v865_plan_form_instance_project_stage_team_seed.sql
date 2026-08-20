-- =============================================================================
-- v865: Seed sample Plan form instances (Project / Stage / Team)
-- Companion seed per CLAUDE.md rule 18.2 — explicit user request.
--
-- Populates public.form_instances (+ values) for every project-scoped
-- "Plan — Project / Stage / Team …" form template copy (Structured,
-- Standards-Based, or (custom) project copies such as FT-*), with one
-- draft/in_review/approved sample per plan_type (project, stage, team).
--
-- Also seeds sim.form_instances the same way for practice projects that have
-- a matching project-scoped Plan form template.
--
-- Idempotent: instance ids are deterministic uuid_generate_v5(project_id,
-- 'v865-plan-' || template_id || '-' || plan_type); ON CONFLICT (id) DO NOTHING.
-- instance_reference is inserted as '' so trg_apply_admin_display_id assigns
-- the Admin ID Generation value (rule 16.2).
--
-- Prerequisites: v502/v503 form engine, v756d display ids, v764/v764c
-- pm_template_nodes, v786 Plan template schema (plan_type field).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TEMP TABLE IF NOT EXISTS v865_seed_log (
  schema_name TEXT,
  project_label TEXT,
  template_code TEXT,
  plan_type TEXT,
  outcome TEXT,
  detail TEXT
);

-- ---------------------------------------------------------------------------
-- Platform (public)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  seed_user_id UUID;
  v_version_id UUID;
  v_instance_id UUID;
  v_status TEXT;
  v_desc TEXT;
  v_pbs TEXT;
  v_products TEXT;
  v_flow TEXT;
  v_schedule TEXT;
  v_milestones TEXT;
  v_resources TEXT;
  v_deps TEXT;
  v_monitor TEXT;
  plan_types TEXT[] := ARRAY['project', 'stage', 'team'];
  pt TEXT;
BEGIN
  FOR rec IN
    SELECT
      p.id AS project_id,
      p.project_code,
      p.project_name,
      p.owner_user_id,
      f.id AS template_id,
      f.template_code,
      f.name AS template_name
    FROM public.projects p
    JOIN public.pm_template_nodes n
      ON n.scope_entity_type = 'project'
     AND n.scope_entity_id = p.id
     AND n.domain = 'form_template'
     AND COALESCE(n.is_current, TRUE) = TRUE
     AND n.status <> 'deprecated'
    JOIN public.form_templates f
      ON f.id = n.domain_ref_id
     AND COALESCE(f.is_active, TRUE) = TRUE
     AND f.name ILIKE 'Plan — Project / Stage / Team%'
    WHERE COALESCE(p.is_deleted, FALSE) = FALSE
      AND p.project_code LIKE 'SEED334-PRJ-%'
    ORDER BY p.project_code, f.template_code
  LOOP
    SELECT COALESCE(
      rec.owner_user_id,
      (SELECT up.user_id FROM public.user_projects up
         WHERE up.project_id = rec.project_id AND COALESCE(up.is_deleted, FALSE) = FALSE
         ORDER BY CASE up.access_level WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END
         LIMIT 1),
      (SELECT u.id FROM public.users u
         WHERE COALESCE(u.is_active, TRUE) = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
         LIMIT 1)
    )
    INTO seed_user_id;

    SELECT id INTO v_version_id
    FROM public.form_template_versions
    WHERE template_id = rec.template_id AND is_current = TRUE
    LIMIT 1;

    IF v_version_id IS NULL THEN
      INSERT INTO v865_seed_log
      VALUES ('public', rec.project_code, rec.template_code, NULL, 'SKIPPED', 'no current template version');
      CONTINUE;
    END IF;

    FOREACH pt IN ARRAY plan_types LOOP
      v_instance_id := uuid_generate_v5(rec.project_id, 'v865-plan-' || rec.template_id::text || '-' || pt);

      IF EXISTS (SELECT 1 FROM public.form_instances WHERE id = v_instance_id) THEN
        INSERT INTO v865_seed_log
        VALUES ('public', rec.project_code, rec.template_code, pt, 'EXISTS', v_instance_id::text);
        CONTINUE;
      END IF;

      IF pt = 'project' THEN
        v_status := 'approved';
        v_desc := 'Project plan for ' || rec.project_name || ' — overall delivery approach, PBS, schedule baselines and control approach.';
        v_pbs := E'1.0 Integration programme\n1.1 LMS platform\n1.2 SIS platform\n1.3 Data migration & SSO\n1.4 Training & change';
        v_products := E'LMS tenant configured\nSIS tenant configured\nIdentity federation live\nMigration cutover runbook\nStaff training pack';
        v_flow := 'Mandate → Architecture baseline → LMS build → SIS build → Integration → UAT → Cutover → Hypercare';
        v_schedule := '12-month delivery: Initiation (M1–M2), Build (M3–M8), Integration/UAT (M9–M10), Cutover (M11), Hypercare (M12).';
        v_milestones := E'M1 Architecture approved\nM2 Environments ready\nM8 Feature complete\nM10 UAT exit\nM11 Go-live';
        v_resources := 'PM, solution architect, LMS specialist, SIS specialist, integration engineer, data migration lead, change lead, UAT cohort.';
        v_deps := 'Vendor contracts; school calendar blackout windows; identity provider readiness; network/firewall changes.';
        v_monitor := 'Weekly progress against baseline; fortnightly risk/issue review; stage-end quality gate before cutover.';
      ELSIF pt = 'stage' THEN
        v_status := 'in_review';
        v_desc := 'Stage plan — Integration & UAT stage for ' || rec.project_name || '.';
        v_pbs := E'3.0 Integration & UAT\n3.1 Interface packs\n3.2 End-to-end scenarios\n3.3 Defect triage\n3.4 UAT exit evidence';
        v_products := E'Interface test evidence pack\nUAT script library\nDefect burn-down board\nStage end report';
        v_flow := 'Interface freeze → Scenario execution → Defect fix cycles → Exit criteria review → Stage gate';
        v_schedule := '8 weeks: weeks 1–2 freeze & prep; weeks 3–6 execution; weeks 7–8 exit & gate.';
        v_milestones := E'W2 Interface freeze\nW4 Mid-stage review\nW8 UAT exit / stage gate';
        v_resources := 'Integration engineer, QA lead, school UAT champions, vendor SMEs (on-call).';
        v_deps := 'Feature-complete builds from LMS/SIS workstreams; test data refresh; environment stability.';
        v_monitor := 'Daily standup during UAT; defect SLA (P1 same day); stage tolerance on schedule/cost.';
      ELSE
        v_status := 'draft';
        v_desc := 'Team plan — Data migration & SSO work package for ' || rec.project_name || '.';
        v_pbs := E'1.3 Data migration & SSO\n1.3.1 Source extracts\n1.3.2 Transform/load\n1.3.3 SSO federation\n1.3.4 Reconciliation';
        v_products := E'Extract specs\nMapping workbook\nSSO config checklist\nReconciliation report';
        v_flow := 'Extract → Map → Dry-run load → SSO pilot → Full reconciliation → Handover to UAT';
        v_schedule := '6 weeks aligned to Build mid-point; dry-run before Integration stage start.';
        v_milestones := E'Week 2 mapping signed off\nWeek 4 dry-run complete\nWeek 6 SSO pilot accepted';
        v_resources := 'Data migration lead, 2 data analysts, IdP engineer, school data steward.';
        v_deps := 'Source system access; IdP app registration; anonymised sample extracts.';
        v_monitor := 'Twice-weekly team board; migration KPI (row match %); escalate blockers within 24h.';
      END IF;

      BEGIN
        INSERT INTO public.form_instances (
          id, project_id, template_id, template_version_id, owner_id, status, instance_reference
        ) VALUES (
          v_instance_id,
          rec.project_id,
          rec.template_id,
          v_version_id,
          seed_user_id,
          v_status,
          '' -- Admin display-id trigger
        );

        INSERT INTO public.form_instance_values (form_instance_id, field_key, field_value)
        VALUES
          (v_instance_id, 'plan_type', to_jsonb(pt::text)),
          (v_instance_id, 'plan_description', to_jsonb(v_desc)),
          (v_instance_id, 'product_breakdown_structure', to_jsonb(v_pbs)),
          (v_instance_id, 'product_descriptions', to_jsonb(v_products)),
          (v_instance_id, 'product_flow_diagram', to_jsonb(v_flow)),
          (v_instance_id, 'schedule', to_jsonb(v_schedule)),
          (v_instance_id, 'milestones', to_jsonb(v_milestones)),
          (v_instance_id, 'resources', to_jsonb(v_resources)),
          (v_instance_id, 'dependencies', to_jsonb(v_deps)),
          (v_instance_id, 'monitoring_and_control', to_jsonb(v_monitor))
        ON CONFLICT (form_instance_id, field_key) DO NOTHING;

        INSERT INTO v865_seed_log
        VALUES ('public', rec.project_code, rec.template_code, pt, 'INSERTED', v_status);
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO v865_seed_log
        VALUES ('public', rec.project_code, rec.template_code, pt, 'ERROR', SQLERRM);
      END;
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Simulator (sim) — practice projects with a project-scoped Plan form copy
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  rec RECORD;
  seed_user_id UUID;
  v_version_id UUID;
  v_instance_id UUID;
  v_status TEXT;
  v_desc TEXT;
  v_pbs TEXT;
  v_products TEXT;
  v_flow TEXT;
  v_schedule TEXT;
  v_milestones TEXT;
  v_resources TEXT;
  v_deps TEXT;
  v_monitor TEXT;
  plan_types TEXT[] := ARRAY['project', 'stage', 'team'];
  pt TEXT;
  v_proj_label TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'sim' AND table_name = 'form_instances'
  ) THEN
    INSERT INTO v865_seed_log VALUES ('sim', NULL, NULL, NULL, 'SKIPPED', 'sim.form_instances missing');
    RETURN;
  END IF;

  FOR rec IN
    SELECT
      p.id AS project_id,
      COALESCE(p.practice_code, p.id::text) AS project_code,
      COALESCE(p.project_name, p.practice_code, 'Practice project') AS project_name,
      f.id AS template_id,
      f.template_code
    FROM sim.practice_projects p
    JOIN sim.pm_template_nodes n
      ON n.scope_entity_type = 'project'
     AND n.scope_entity_id = p.id
     AND n.domain = 'form_template'
     AND COALESCE(n.is_current, TRUE) = TRUE
     AND n.status <> 'deprecated'
    JOIN sim.form_templates f
      ON f.id = n.domain_ref_id
     AND COALESCE(f.is_active, TRUE) = TRUE
     AND f.name ILIKE 'Plan — Project / Stage / Team%'
    WHERE COALESCE(p.is_deleted, FALSE) = FALSE
    ORDER BY 2, f.template_code
  LOOP
    v_proj_label := rec.project_code;

    SELECT COALESCE(
      (SELECT u.id FROM public.users u
         WHERE COALESCE(u.is_active, TRUE) = TRUE AND COALESCE(u.is_deleted, FALSE) = FALSE
         LIMIT 1)
    )
    INTO seed_user_id;

    SELECT id INTO v_version_id
    FROM sim.form_template_versions
    WHERE template_id = rec.template_id AND is_current = TRUE
    LIMIT 1;

    IF v_version_id IS NULL THEN
      INSERT INTO v865_seed_log
      VALUES ('sim', v_proj_label, rec.template_code, NULL, 'SKIPPED', 'no current template version');
      CONTINUE;
    END IF;

    FOREACH pt IN ARRAY plan_types LOOP
      v_instance_id := uuid_generate_v5(rec.project_id, 'v865-plan-' || rec.template_id::text || '-' || pt);

      IF EXISTS (SELECT 1 FROM sim.form_instances WHERE id = v_instance_id) THEN
        INSERT INTO v865_seed_log
        VALUES ('sim', v_proj_label, rec.template_code, pt, 'EXISTS', v_instance_id::text);
        CONTINUE;
      END IF;

      IF pt = 'project' THEN
        v_status := 'approved';
        v_desc := 'Practice project plan for ' || rec.project_name || '.';
        v_pbs := E'1.0 Practice delivery\n1.1 Core product\n1.2 Integration\n1.3 Handover';
        v_products := E'Core product baseline\nIntegration pack\nHandover checklist';
        v_flow := 'Plan → Build → Integrate → Accept → Close';
        v_schedule := 'Practice timeline spanning initiation through close.';
        v_milestones := E'Plan approved\nBuild complete\nAcceptance signed';
        v_resources := 'Practice PM and delivery team.';
        v_deps := 'Practice environment and sample data access.';
        v_monitor := 'Weekly practice checkpoint.';
      ELSIF pt = 'stage' THEN
        v_status := 'in_review';
        v_desc := 'Practice stage plan — integration stage for ' || rec.project_name || '.';
        v_pbs := E'2.0 Integration stage\n2.1 Interfaces\n2.2 UAT';
        v_products := E'Interface evidence\nUAT pack';
        v_flow := 'Freeze → Test → Gate';
        v_schedule := '4-week practice stage.';
        v_milestones := E'Freeze\nGate review';
        v_resources := 'Practice QA and integrators.';
        v_deps := 'Upstream build complete.';
        v_monitor := 'Daily practice standup.';
      ELSE
        v_status := 'draft';
        v_desc := 'Practice team plan — work package for ' || rec.project_name || '.';
        v_pbs := E'1.2 Work package\n1.2.1 Tasks\n1.2.2 Outputs';
        v_products := E'Task board\nWork package outputs';
        v_flow := 'Assign → Deliver → Hand over';
        v_schedule := '2-week practice team window.';
        v_milestones := E'Kickoff\nHandover';
        v_resources := 'Practice team leads.';
        v_deps := 'Prior stage outputs.';
        v_monitor := 'Board review twice weekly.';
      END IF;

      BEGIN
        INSERT INTO sim.form_instances (
          id, project_id, template_id, template_version_id, owner_id, status, instance_reference
        ) VALUES (
          v_instance_id,
          rec.project_id,
          rec.template_id,
          v_version_id,
          seed_user_id,
          v_status,
          ''
        );

        INSERT INTO sim.form_instance_values (form_instance_id, field_key, field_value)
        VALUES
          (v_instance_id, 'plan_type', to_jsonb(pt::text)),
          (v_instance_id, 'plan_description', to_jsonb(v_desc)),
          (v_instance_id, 'product_breakdown_structure', to_jsonb(v_pbs)),
          (v_instance_id, 'product_descriptions', to_jsonb(v_products)),
          (v_instance_id, 'product_flow_diagram', to_jsonb(v_flow)),
          (v_instance_id, 'schedule', to_jsonb(v_schedule)),
          (v_instance_id, 'milestones', to_jsonb(v_milestones)),
          (v_instance_id, 'resources', to_jsonb(v_resources)),
          (v_instance_id, 'dependencies', to_jsonb(v_deps)),
          (v_instance_id, 'monitoring_and_control', to_jsonb(v_monitor))
        ON CONFLICT (form_instance_id, field_key) DO NOTHING;

        INSERT INTO v865_seed_log
        VALUES ('sim', v_proj_label, rec.template_code, pt, 'INSERTED', v_status);
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO v865_seed_log
        VALUES ('sim', v_proj_label, rec.template_code, pt, 'ERROR', SQLERRM);
      END;
    END LOOP;
  END LOOP;
END $$;

SELECT * FROM v865_seed_log ORDER BY schema_name, project_label, template_code, plan_type NULLS FIRST;
