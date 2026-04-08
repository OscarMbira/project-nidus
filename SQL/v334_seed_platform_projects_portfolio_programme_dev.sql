-- =============================================================================
-- v334: Dev seed — up to 30 projects (portfolio / programme / standalone mix)
-- Description: Meaningful sample portfolios, programmes, and projects for the
--              first active organisation (accounts), then links:
--                • PRJ 01–09  → portfolio only (rotates across 3 portfolios)
--                • PRJ 10–18 → programme only (rotates across 3 programmes)
--                • PRJ 19–22 → both portfolio + programme
--                • PRJ 23–30 → standalone (no portfolio/programme links)
--              Re-run refreshes names/descriptions and resets portfolio/programme
--              links for SEED334 project codes (user_projects preserved if present).
-- Database: PostgreSQL 15+ (Supabase public schema)
-- Prerequisites: v04 (projects), v36 (portfolios, portfolio_projects),
--                 v37 (programmes, programme_projects), v84 (accounts, projects.account_id),
--                 v03 (users, user_projects), project_statuses seeded
-- Note: projects.project_code is globally UNIQUE — existing SEED334 rows are
--       updated in place; new environments still get INSERTs.
-- Note: If DB enforces one trial project per org, 30 inserts may fail after
--       the first project — use a paid/test org or adjust enforcement for seeding.
-- =============================================================================

DO $$
DECLARE
  v_account_id   UUID;
  v_user_id      UUID;
  v_status_id    UUID;
  p1 UUID;
  p2 UUID;
  p3 UUID;
  pg1 UUID;
  pg2 UUID;
  pg3 UUID;
  i              INT;
  v_code         TEXT;
  v_proj_id      UUID;
  v_portfolio_id UUID;
  v_programme_id UUID;
  v_row_count    INT;
  -- 30 realistic titles (index 1..30)
  v_names TEXT[] := ARRAY[
    'Meridian Payments - PCI-DSS Remediation Wave 2',
    'Aurora Mobile - Field Technician App MVP',
    'GreenGrid - Edge Analytics for Solar Assets',
    'Harbor Health - Ambulatory Intake Digitization',
    'Summit ERP - Finance Module Cutover',
    'Nexus Platform - API Gateway and Rate Limiting',
    'Cedar Trust Schools - LMS and SIS Integration',
    'Velocity Freight - Dynamic Route Optimization Pilot',
    'Orion Defense - SOC Playbook Automation',
    'Apex Mutual - Claims Straight-Through Processing',
    'Redwood Retail - Omnichannel Loyalty Redesign',
    'Cobalt Manufacturing - MES Line Monitoring',
    'Silverline Banking - Open Banking Developer Portal',
    'Granite Public Works - Asset Inspection Mobile Workflow',
    'Ivory BioPharm - Serialization and Track-and-Trace',
    'Atlas Airlines - Crew Rostering Optimisation',
    'Compass Telecom - 5G Small Cell Deployment Tracker',
    'Lumen Utilities - AMI Head-End Upgrade',
    'Falcon Insurance - Underwriting Workbench',
    'Polaris Energy - Battery Storage Commissioning',
    'Sierra Mining - Environmental Monitoring Dashboard',
    'Titan Logistics - Port Dwell Time Reduction',
    'Nova EdTech - Accessibility Audit Remediation',
    'Helix Robotics - Warehouse AMR Safety Envelope',
    'Zephyr Hospitality - PMS Cloud Migration',
    'Quanta Research - Data Lake Cost Governance',
    'Bloom Agronomy - IoT Soil Moisture Network',
    'Keystone Housing - Retrofit Works Programme',
    'Mariner Shipping - Vessel Maintenance Scheduler',
    'Catalyst NGO - Grants Outcomes Reporting Portal'
  ];
  v_descs TEXT[] := ARRAY[
    'Close critical PCI gaps for card-present and e-commerce channels; coordinate QSA evidence and penetration retest.',
    'Offline-first Android app for work orders, parts usage, and customer sign-off with sync conflict handling.',
    'Ingest inverter telemetry and weather feeds to forecast production anomalies and warranty claims.',
    'Replace paper triage with tablet flows, HL7/FHIR interfaces, and waiting-room analytics for clinics.',
    'Parallel run general ledger, AP, and fixed assets; cutover weekend with rollback checkpoints.',
    'Centralise partner traffic behind OAuth2, mTLS for internal services, and burst protection policies.',
    'Single sign-on for teachers, grade pass-back, and parent portal with regional data residency.',
    'Machine-learning assisted routing for refrigerated loads; KPIs on miles, fuel, and on-time delivery.',
    'Codify detection rules into runbooks; integrate SOAR for tier-1 triage and executive dashboards.',
    'Rules engine for low-value claims; human-in-the-loop for fraud signals and regulatory letters.',
    'Unified customer ID across web, app, and stores; pilot in two regions before global rollout.',
    'Real-time OEE, downtime reasons, and quality holds from PLCs into operations war room.',
    'Developer sandbox, consent management hooks, and partner onboarding workflow for PSD2-style APIs.',
    'GIS-linked inspections with photo evidence, defect scoring, and contractor work orders.',
    'Serialization events to national hubs; reconcile exceptions at packaging and 3PL handoff.',
    'Crew pairing and bidding constraints; union rule packs and fatigue limit validation.',
    'Permit tracking, contractor milestones, and RF interference mitigation checklist per site.',
    'Migrate metering collection; dual-run validation against legacy head-end for six weeks.',
    'Configurable risk appetite, referral queues, and document AI assist for underwriters.',
    'Battery farm FAT/SAT, grid code compliance tests, and operations handover documentation.',
    'Air and water quality sensors with threshold alerting and regulator export formats.',
    'Berth planning integration, customs pre-clearance status, and chassis pool utilisation.',
    'WCAG 2.2 AA fixes across student portal, CMS templates, and legacy PDF syllabi.',
    'Safety zones for AMRs, LiDAR calibration, and incident stop-line testing with EHS sign-off.',
    'Chain-wide PMS cutover, night-audit reconciliation, and OTA channel mapping.',
    'Tagging policy, lifecycle rules, and chargeback dashboards for research datasets.',
    'LoRaWAN moisture probes, irrigation recommendations, and farmer mobile alerts.',
    'Whole-house retrofit scheduling, resident comms, and grant compliance reporting.',
    'Dry-dock work packages, spare parts forecasting, and class society document packs.',
    'Outcome metrics, beneficiary stories, and donor transparency portal for multi-year grants.'
  ];
BEGIN
  IF array_length(v_names, 1) IS DISTINCT FROM 30 OR array_length(v_descs, 1) IS DISTINCT FROM 30 THEN
    RAISE EXCEPTION 'v334: internal seed arrays must have exactly 30 entries';
  END IF;

  SELECT a.id, a.owner_user_id
  INTO v_account_id, v_user_id
  FROM public.accounts a
  WHERE COALESCE(a.is_deleted, FALSE) = FALSE
    AND COALESCE(a.is_active, TRUE) = TRUE
  ORDER BY a.created_at ASC NULLS LAST
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE NOTICE 'v334: No active account in public.accounts — complete organisation setup first. Skipping.';
    RETURN;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT u.id
    INTO v_user_id
    FROM public.users u
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY u.created_at ASC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v334: No user found — skipping.';
    RETURN;
  END IF;

  SELECT ps.id
  INTO v_status_id
  FROM public.project_statuses ps
  WHERE COALESCE(ps.is_deleted, FALSE) = FALSE
  ORDER BY COALESCE(ps.status_order, 0), ps.status_code NULLS LAST
  LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Portfolios (3) — upsert so re-run refreshes copy
  -- -------------------------------------------------------------------------
  INSERT INTO public.portfolios (
    portfolio_code, portfolio_name, portfolio_description,
    portfolio_type, portfolio_status, portfolio_level, is_deleted
  )
  VALUES
    (
      'SEED334-PORT-01', 'North America Digital & Payments',
      'Customer-facing digital channels, payments compliance, and retail technology initiatives.',
      'strategic', 'active', 1, FALSE
    ),
    (
      'SEED334-PORT-02', 'Infrastructure & Regulated Operations',
      'Utilities, telecom, transport, and public-sector asset programmes with heavy compliance.',
      'strategic', 'active', 1, FALSE
    ),
    (
      'SEED334-PORT-03', 'Innovation & Sustainability Lab',
      'Pilot and scale-up projects: IoT, energy transition, robotics, and agritech experiments.',
      'operational', 'active', 1, FALSE
    )
  ON CONFLICT (portfolio_code) DO UPDATE SET
    portfolio_name = EXCLUDED.portfolio_name,
    portfolio_description = EXCLUDED.portfolio_description,
    portfolio_type = EXCLUDED.portfolio_type,
    portfolio_status = EXCLUDED.portfolio_status,
    portfolio_level = EXCLUDED.portfolio_level,
    is_deleted = FALSE;

  SELECT id INTO p1 FROM public.portfolios WHERE portfolio_code = 'SEED334-PORT-01' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO p2 FROM public.portfolios WHERE portfolio_code = 'SEED334-PORT-02' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO p3 FROM public.portfolios WHERE portfolio_code = 'SEED334-PORT-03' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Programmes (3): two under portfolios, one standalone (no portfolio)
  -- -------------------------------------------------------------------------
  IF p1 IS NOT NULL THEN
    INSERT INTO public.programmes (
      programme_code, programme_name, programme_description,
      programme_type, programme_status, portfolio_id, is_deleted
    )
    VALUES (
      'SEED334-PROG-01', 'Digital Customer & Payments Transformation',
      'End-to-end modernization of acquisition, servicing, and payment security under portfolio North America Digital & Payments.',
      'technology', 'active', p1, FALSE
    )
    ON CONFLICT (programme_code) DO UPDATE SET
      programme_name = EXCLUDED.programme_name,
      programme_description = EXCLUDED.programme_description,
      programme_type = EXCLUDED.programme_type,
      programme_status = EXCLUDED.programme_status,
      portfolio_id = EXCLUDED.portfolio_id,
      is_deleted = FALSE;
  END IF;

  IF p2 IS NOT NULL THEN
    INSERT INTO public.programmes (
      programme_code, programme_name, programme_description,
      programme_type, programme_status, portfolio_id, is_deleted
    )
    VALUES (
      'SEED334-PROG-02', 'Critical Infrastructure Renewal',
      'Coordinated delivery of regulated network, grid, and mobility upgrades under Infrastructure & Regulated Operations.',
      'business_transformation', 'active', p2, FALSE
    )
    ON CONFLICT (programme_code) DO UPDATE SET
      programme_name = EXCLUDED.programme_name,
      programme_description = EXCLUDED.programme_description,
      programme_type = EXCLUDED.programme_type,
      programme_status = EXCLUDED.programme_status,
      portfolio_id = EXCLUDED.portfolio_id,
      is_deleted = FALSE;
  END IF;

  INSERT INTO public.programmes (
    programme_code, programme_name, programme_description,
    programme_type, programme_status, portfolio_id, is_deleted
  )
  VALUES (
    'SEED334-PROG-03', 'Cross-Portfolio Innovation Delivery',
    'Horizon projects not tied to a single portfolio: pilots spanning robotics, sustainability, and research platforms.',
    'technology', 'active', NULL, FALSE
  )
  ON CONFLICT (programme_code) DO UPDATE SET
    programme_name = EXCLUDED.programme_name,
    programme_description = EXCLUDED.programme_description,
    programme_type = EXCLUDED.programme_type,
    programme_status = EXCLUDED.programme_status,
    portfolio_id = EXCLUDED.portfolio_id,
    is_deleted = FALSE;

  SELECT id INTO pg1 FROM public.programmes WHERE programme_code = 'SEED334-PROG-01' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO pg2 FROM public.programmes WHERE programme_code = 'SEED334-PROG-02' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
  SELECT id INTO pg3 FROM public.programmes WHERE programme_code = 'SEED334-PROG-03' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Projects (30): UPDATE existing SEED334 rows in place, else INSERT
  -- -------------------------------------------------------------------------
  FOR i IN 1..30 LOOP
    v_code := 'SEED334-PRJ-' || LPAD(i::TEXT, 2, '0');

    UPDATE public.projects SET
      project_name = v_names[i],
      project_description = v_descs[i],
      account_id = v_account_id,
      owner_user_id = v_user_id,
      status_id = v_status_id,
      is_deleted = FALSE,
      deleted_at = NULL,
      deleted_by = NULL
    WHERE project_code = v_code;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;

    IF v_row_count = 0 THEN
      INSERT INTO public.projects (
        project_code, project_name, project_description,
        account_id, owner_user_id, status_id, is_deleted
      )
      VALUES (
        v_code,
        v_names[i],
        v_descs[i],
        v_account_id,
        v_user_id,
        v_status_id,
        FALSE
      );
    END IF;
  END LOOP;

  -- Reset links for seed projects so re-run matches the intended pattern
  DELETE FROM public.programme_projects pr
  USING public.projects p
  WHERE pr.project_id = p.id
    AND p.project_code LIKE 'SEED334-PRJ-%';

  DELETE FROM public.portfolio_projects pp
  USING public.projects p
  WHERE pp.project_id = p.id
    AND p.project_code LIKE 'SEED334-PRJ-%';

  -- -------------------------------------------------------------------------
  -- Portfolio links: 01–09 only
  -- -------------------------------------------------------------------------
  FOR i IN 1..9 LOOP
    v_code := 'SEED334-PRJ-' || LPAD(i::TEXT, 2, '0');
    SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
    IF v_proj_id IS NULL THEN CONTINUE; END IF;

    v_portfolio_id := CASE (i - 1) % 3 WHEN 0 THEN p1 WHEN 1 THEN p2 ELSE p3 END;
    IF v_portfolio_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.portfolio_projects (
      portfolio_id, project_id, assignment_status, portfolio_priority, is_deleted
    )
    VALUES (v_portfolio_id, v_proj_id, 'active', 'high', FALSE);
  END LOOP;

  -- -------------------------------------------------------------------------
  -- Programme links: 10–18 only (programme-only)
  -- -------------------------------------------------------------------------
  FOR i IN 10..18 LOOP
    v_code := 'SEED334-PRJ-' || LPAD(i::TEXT, 2, '0');
    SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
    IF v_proj_id IS NULL THEN CONTINUE; END IF;

    v_programme_id := CASE (i - 1) % 3 WHEN 0 THEN pg1 WHEN 1 THEN pg2 ELSE pg3 END;
    IF v_programme_id IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.programme_projects (
      programme_id, project_id, assignment_status, programme_priority, is_deleted
    )
    VALUES (v_programme_id, v_proj_id, 'active', 'high', FALSE);
  END LOOP;

  -- -------------------------------------------------------------------------
  -- Both portfolio + programme: 19–22
  -- -------------------------------------------------------------------------
  FOR i IN 19..22 LOOP
    v_code := 'SEED334-PRJ-' || LPAD(i::TEXT, 2, '0');
    SELECT id INTO v_proj_id FROM public.projects WHERE project_code = v_code AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1;
    IF v_proj_id IS NULL THEN CONTINUE; END IF;

    v_portfolio_id := CASE (i - 19) % 3 WHEN 0 THEN p1 WHEN 1 THEN p2 ELSE p3 END;
    v_programme_id := CASE (i - 19) % 3 WHEN 0 THEN pg1 WHEN 1 THEN pg2 ELSE pg3 END;

    IF v_portfolio_id IS NOT NULL THEN
      INSERT INTO public.portfolio_projects (
        portfolio_id, project_id, assignment_status, portfolio_priority, is_deleted
      )
      VALUES (v_portfolio_id, v_proj_id, 'active', 'medium', FALSE);
    END IF;

    IF v_programme_id IS NOT NULL THEN
      INSERT INTO public.programme_projects (
        programme_id, project_id, assignment_status, programme_priority, is_deleted
      )
      VALUES (v_programme_id, v_proj_id, 'active', 'medium', FALSE);
    END IF;
  END LOOP;

  -- 23–30: intentionally no portfolio_projects / programme_projects rows

  -- -------------------------------------------------------------------------
  -- My Projects: assign account owner to all v334 seed projects
  -- -------------------------------------------------------------------------
  INSERT INTO public.user_projects (
    user_id, project_id, project_role, access_level, is_active, is_deleted
  )
  SELECT v_user_id, p.id, 'Project Manager', 'member', TRUE, FALSE
  FROM public.projects p
  WHERE p.project_code LIKE 'SEED334-PRJ-%'
    AND COALESCE(p.is_deleted, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.user_id = v_user_id
        AND up.project_id = p.id
        AND COALESCE(up.is_deleted, FALSE) = FALSE
    );

  RAISE NOTICE 'v334: Seed complete — portfolios/programmes/projects (max 30) for account %.', v_account_id;
END $$;
