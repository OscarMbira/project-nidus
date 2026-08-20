-- =============================================================================
-- v822: Seed Data – Risk Register (10-20 risks per project, all Platform projects)
-- Purpose: Populate the Risk Register (public.risks / public.risk_registers) with
--          realistic demo data for every active project that currently has an
--          empty register. Projects that already have risk data (e.g. EDP-2024,
--          seeded by v697) are left untouched.
-- Prerequisites: v172_risk_register_enhancement.sql, v706_fix_generate_risk_identifier.sql
-- Idempotent: safe to re-run. Projects with >=1 non-deleted risk are skipped.
-- =============================================================================

DO $$
DECLARE
  v_project        RECORD;
  v_reg_id         UUID;
  v_seed_user_id   UUID;
  v_existing_count INTEGER;
  v_target_count   INTEGER;
  v_seeded_count   INTEGER;
  v_projects_done  INTEGER := 0;
BEGIN

  FOR v_project IN
    SELECT id, project_code, owner_user_id
    FROM public.projects
    WHERE COALESCE(is_deleted, false) = false
  LOOP

    v_reg_id := NULL;
    SELECT id INTO v_reg_id
    FROM public.risk_registers
    WHERE project_id = v_project.id AND COALESCE(is_deleted, false) = false
    LIMIT 1;

    IF v_reg_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_existing_count
      FROM public.risks
      WHERE risk_register_id = v_reg_id AND COALESCE(is_deleted, false) = false;

      IF v_existing_count > 0 THEN
        RAISE NOTICE 'v822: Project % already has % risk(s) - skipping.', v_project.project_code, v_existing_count;
        CONTINUE;
      END IF;
    END IF;

    -- Resolve a user to attribute the seeded records to: owner -> a project member -> any user
    v_seed_user_id := v_project.owner_user_id;

    IF v_seed_user_id IS NULL THEN
      SELECT up.user_id INTO v_seed_user_id
      FROM public.user_projects up
      WHERE up.project_id = v_project.id AND COALESCE(up.is_active, true) = true
      LIMIT 1;
    END IF;

    IF v_seed_user_id IS NULL THEN
      SELECT u.id INTO v_seed_user_id
      FROM public.users u
      WHERE COALESCE(u.is_deleted, false) = false
      LIMIT 1;
    END IF;

    IF v_seed_user_id IS NULL THEN
      RAISE NOTICE 'v822: No user available to attribute seed risks for project % - skipping.', v_project.project_code;
      CONTINUE;
    END IF;

    IF v_reg_id IS NULL THEN
      v_reg_id := public.create_risk_register_for_project(v_project.id, v_seed_user_id);
    END IF;

    v_target_count := 10 + floor(random() * 11)::int; -- random 10-20 inclusive

    WITH pool(risk_title, risk_type, risk_category, cause, event, effect,
              prob, impact, response, contingency, status, proximity, days_ago) AS (
      VALUES
        ('Budget Overrun Due to Scope Creep',
         'threat', 'cost',
         'Stakeholders requesting additional features mid-delivery without formal change control',
         'Project budget is exceeded by more than 15% during execution phase',
         'Delivery stalls; additional funding request requires board approval, delaying go-live by 3-6 months',
         4, 4, 'mitigate',
         'Enforce formal change control board (CCB) process; freeze scope at stage gate; maintain 10% contingency reserve',
         'identified', 'within_stage', 30),

        ('Key Resource Attrition Mid-Delivery',
         'threat', 'resource',
         'Single point of dependency on one specialist with no named backup',
         'Lead specialist becomes unavailable (illness, resignation, competing priority) during critical phase',
         'Design decisions delayed; downstream workstreams blocked; potential schedule slip',
         3, 5, 'mitigate',
         'Cross-train a second team member; document all key decisions in shared repository',
         'identified', 'within_project', 14),

        ('Legacy System Integration Failure',
         'threat', 'technical',
         'Undocumented APIs and data structures in an ageing legacy system',
         'Integration between legacy system and new platform fails during system testing',
         'Downstream processing cannot proceed; phased go-live plan collapses',
         3, 4, 'mitigate',
         'Engage vendor for API documentation audit; build integration spike early in delivery',
         'identified', 'within_project', 21),

        ('Data Migration Integrity Risk',
         'threat', 'technical',
         'Historical records in source system have inconsistent data formats and missing mandatory fields',
         'Corrupted or incomplete data is migrated, invalidating downstream reporting',
         'Management reporting compromised; audit risk; remediation cost and rework required',
         4, 4, 'mitigate',
         'Run a data cleansing pass; define data quality acceptance criteria before cutover',
         'assessing', 'within_project', 45),

        ('Third-Party Vendor Delivery Delay',
         'threat', 'commercial',
         'Vendor has a history of delayed releases and limited support responsiveness',
         'Vendor delivers a required module several weeks late, disrupting the go-live plan',
         'Teams continue on manual/interim processes; productivity targets missed',
         3, 3, 'transfer',
         'Include contractual SLA penalties and milestone-based payments; identify an alternate vendor as contingency',
         'identified', 'within_stage', 10),

        ('Regulatory Non-Compliance on Data Residency',
         'threat', 'regulatory',
         'Cloud provider default configuration may store certain data outside required jurisdiction',
         'Personal or regulated data is processed or stored in a non-compliant jurisdiction',
         'Regulatory fine and enforcement action; reputational damage',
         2, 5, 'avoid',
         'Mandate region-locked deployment; legal sign-off on data processing agreements before go-live',
         'identified', 'within_project', 60),

        ('User Adoption Resistance',
         'threat', 'organisational',
         'Organisation has undergone several change initiatives recently; staff appetite for change is low',
         'End-user resistance to the new system leads to a low adoption rate post go-live',
         'Benefits realisation targets not met; workarounds persist; return on investment delayed',
         4, 3, 'mitigate',
         'Commission a change management workstream; appoint department champions; phased rollout',
         'identified', 'within_project', 5),

        ('API Security Vulnerability',
         'threat', 'technical',
         'New externally facing APIs have not yet completed penetration testing',
         'A security vulnerability is exploited before hardening is complete, resulting in a data exposure',
         'Data compromised; regulatory notification required; costly remediation',
         2, 5, 'mitigate',
         'Mandatory security testing before UAT; firewall and gateway rules applied from environment build',
         'identified', 'within_project', 7),

        ('Cloud Cost Optimisation Opportunity',
         'opportunity', 'cost',
         'Cloud-first architecture removes need for a planned on-premises hardware refresh',
         'Delivery completes ahead of the scheduled hardware refresh cycle',
         'Capital expenditure avoided; ongoing operating costs reduced',
         3, 4, 'exploit',
         'Accelerate the cloud workstream; communicate savings to Finance to secure continued investment',
         'identified', 'beyond_project', 20),

        ('Reusable Component Library Opportunity',
         'opportunity', 'technical',
         'Component library built for this project is reusable across other initiatives',
         'Other teams adopt the shared component library, reducing their development costs',
         'Development cost savings across the wider portfolio; improved consistency',
         4, 3, 'enhance',
         'Document the library as an organisational asset; present at the technology forum',
         'identified', 'beyond_project', 15),

        ('Schedule Slippage from Dependency Delays',
         'threat', 'schedule',
         'Delivery depends on outputs from another team/programme with a tight timeline',
         'Upstream deliverable is delayed, pushing back the dependent milestone',
         'Critical path milestone missed; knock-on delay to subsequent stages',
         3, 4, 'mitigate',
         'Agree an early-warning checkpoint with the dependency owner; build float into the plan',
         'monitoring', 'within_stage', 12),

        ('Scope Creep from Unclear Requirements',
         'threat', 'scope',
         'Business requirements were not fully baselined before design commenced',
         'Additional requirements surface during build, expanding scope beyond baseline',
         'Rework required; schedule and cost pressure increases',
         3, 3, 'mitigate',
         'Baseline requirements formally; route all additions through change control',
         'identified', 'within_stage', 18),

        ('Quality Defects from Rushed Testing',
         'threat', 'quality',
         'Test phase has been compressed to protect the go-live date',
         'Insufficient test coverage allows defects through to production',
         'Post go-live incidents increase; support costs rise; user confidence affected',
         3, 3, 'mitigate',
         'Protect a minimum test window; prioritise risk-based test coverage for critical paths',
         'identified', 'within_stage', 9),

        ('Contractual Dispute with Supplier',
         'threat', 'legal',
         'Contract terms are ambiguous on deliverable acceptance criteria',
         'Supplier and project disagree on whether a deliverable meets acceptance criteria',
         'Delivery delayed pending resolution; potential legal cost',
         2, 4, 'mitigate',
         'Clarify acceptance criteria in writing; escalate early via commercial governance',
         'identified', 'within_project', 25),

        ('Currency Exchange Rate Fluctuation',
         'threat', 'commercial',
         'A portion of costs are denominated in a foreign currency',
         'Adverse currency movement increases the cost of foreign-currency purchases',
         'Budget pressure on procurement lines; contingency reserve drawn down',
         2, 3, 'accept',
         'Monitor exchange rates monthly; consider forward contracts for large purchases',
         'identified', 'beyond_project', 40),

        ('Single Point of Failure in Infrastructure',
         'threat', 'technical',
         'A core service currently runs on a single instance with no failover',
         'The service becomes unavailable due to hardware or configuration failure',
         'Extended outage; delivery and operational activity halted until restored',
         2, 4, 'mitigate',
         'Introduce redundancy/failover for the core service before go-live',
         'identified', 'within_project', 22),

        ('Stakeholder Misalignment on Priorities',
         'threat', 'strategic',
         'Sponsors across business units have differing views on delivery priorities',
         'Conflicting direction from stakeholders causes rework or delayed decisions',
         'Decision-making slows; delivery momentum lost',
         3, 3, 'mitigate',
         'Establish a single decision-making forum with clear escalation route',
         'responding', 'within_stage', 16),

        ('Market Shift Enabling Early Launch',
         'opportunity', 'strategic',
         'A competitor delay has created a market window earlier than planned',
         'Project can launch ahead of the original schedule to capture market opportunity',
         'First-mover advantage; increased revenue or adoption potential',
         2, 4, 'exploit',
         'Assess feasibility of accelerating the critical path; align sponsor and marketing plans',
         'identified', 'within_project', 28),

        ('Extreme Weather Disrupting Field Work',
         'threat', 'external',
         'Field activities are scheduled during a season with historically severe weather',
         'Severe weather prevents planned field or site work from proceeding',
         'Field milestones slip; remobilisation cost incurred',
         2, 3, 'accept',
         'Build weather contingency days into the field schedule; monitor forecasts closely',
         'identified', 'imminent', 3),

        ('Training Programme Reducing Support Tickets',
         'opportunity', 'operational',
         'A structured end-user training programme is being piloted ahead of go-live',
         'Well-trained users raise fewer post go-live support tickets than typical baseline',
         'Reduced support desk load; faster realisation of productivity benefits',
         3, 3, 'enhance',
         'Expand the pilot training programme to all user groups before go-live',
         'identified', 'within_stage', 11),

        ('Third-Party License Expiry',
         'threat', 'legal',
         'A critical third-party software licence is due for renewal during the delivery window',
         'Licence renewal is delayed or terms change unfavourably',
         'Development or testing activity is blocked until the licence is renewed',
         2, 4, 'mitigate',
         'Track licence renewal dates centrally; initiate renewal discussions early',
         'identified', 'within_project', 33),

        ('Data Privacy Breach Risk',
         'threat', 'regulatory',
         'Test environments currently use a copy of production data without full masking',
         'Personal data in a non-production environment is accessed inappropriately',
         'Regulatory breach notification required; reputational and financial impact',
         2, 5, 'mitigate',
         'Apply data masking/anonymisation to all non-production environments',
         'identified', 'within_project', 19),

        ('Team Productivity Gains from New Tooling',
         'opportunity', 'resource',
         'A new collaboration/automation tool has been adopted ahead of schedule',
         'The team completes planned work faster than baseline estimates assumed',
         'Capacity freed for additional scope or earlier delivery',
         3, 3, 'enhance',
         'Capture the productivity gain in the plan; consider reallocating freed capacity',
         'identified', 'beyond_project', 8),

        ('Business Continuity Risk from Single Data Centre',
         'threat', 'business',
         'The solution is currently hosted from a single physical data centre',
         'A data centre outage (power, network, environmental) takes the solution offline',
         'Extended service disruption; potential breach of availability commitments',
         2, 5, 'mitigate',
         'Introduce a secondary site or region for disaster recovery before go-live',
         'identified', 'within_project', 27)
    ),
    picked AS (
      SELECT row_number() OVER () AS seq, p.*
      FROM (
        SELECT * FROM pool ORDER BY random() LIMIT v_target_count
      ) p
    )
    INSERT INTO public.risks (
      id, risk_register_id, project_id,
      risk_code, risk_number, risk_title, risk_description,
      risk_type, risk_category,
      cause_description, event_description, effect_description,
      probability, impact,
      pre_probability, pre_impact,
      response_strategy, contingency_plan,
      status_enum, proximity,
      identified_date,
      identified_by_user_id, risk_owner_user_id,
      risk_author_id, risk_owner_id,
      is_deleted, created_at, updated_at
    )
    SELECT
      gen_random_uuid(), v_reg_id, v_project.id,
      'RSK-' || LPAD(picked.seq::text, 3, '0'), picked.seq,
      picked.risk_title, picked.event,
      picked.risk_type, picked.risk_category,
      picked.cause, picked.event, picked.effect,
      picked.prob, picked.impact,
      picked.prob, picked.impact,
      picked.response, picked.contingency,
      picked.status::risk_status_enum, picked.proximity::risk_proximity_enum,
      CURRENT_DATE - (picked.days_ago || ' days')::interval,
      v_seed_user_id, v_seed_user_id,
      v_seed_user_id, v_seed_user_id,
      false, NOW(), NOW()
    FROM picked
    WHERE NOT EXISTS (
      SELECT 1 FROM public.risks r2
      WHERE r2.risk_register_id = v_reg_id
        AND r2.risk_code = 'RSK-' || LPAD(picked.seq::text, 3, '0')
    );

    GET DIAGNOSTICS v_seeded_count = ROW_COUNT;
    v_projects_done := v_projects_done + 1;
    RAISE NOTICE 'v822: Seeded % risk(s) for project % (target %).', v_seeded_count, v_project.project_code, v_target_count;

  END LOOP;

  RAISE NOTICE 'v822: Risk register seed complete - % project(s) processed.', v_projects_done;

END $$;
