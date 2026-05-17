-- =============================================================================
-- v577: Backfill empty sample fields on existing portfolios, programmes, projects
-- Description:
--   Populates description (tailored per record), type/classification, methodology
--   (projects only), and start/end dates where NULL or blank — no new rows.
--   Priority: (1) v334 SEED334 code/name map, (2) keyword rules from title,
--   (3) sensible defaults (no random hash for type/methodology/status).
--   Methodology: fills project_methodologies (UI dropdown) + delivery_methodology.
--   Status: projects.status_id -> Active when Draft/null; portfolio/programme -> active.
-- Database: PostgreSQL 15+ (Supabase public schema)
-- Prerequisites: v04, v36, v37; v334 seed optional but descriptions align with it
-- Safe to re-run: only fills empty fields.
-- =============================================================================

-- =============================================================================
-- TAILORED DESCRIPTIONS — projects (v334 catalogue + keyword rules)
-- =============================================================================
WITH project_desc_seed (project_code, project_name, project_description) AS (
  VALUES
    ('SEED334-PRJ-01', 'Meridian Payments - PCI-DSS Remediation Wave 2',
     'Close critical PCI gaps for card-present and e-commerce channels; coordinate QSA evidence and penetration retest.'),
    ('SEED334-PRJ-02', 'Aurora Mobile - Field Technician App MVP',
     'Offline-first Android app for work orders, parts usage, and customer sign-off with sync conflict handling.'),
    ('SEED334-PRJ-03', 'GreenGrid - Edge Analytics for Solar Assets',
     'Ingest inverter telemetry and weather feeds to forecast production anomalies and warranty claims.'),
    ('SEED334-PRJ-04', 'Harbor Health - Ambulatory Intake Digitization',
     'Replace paper triage with tablet flows, HL7/FHIR interfaces, and waiting-room analytics for clinics.'),
    ('SEED334-PRJ-05', 'Summit ERP - Finance Module Cutover',
     'Parallel run general ledger, AP, and fixed assets; cutover weekend with rollback checkpoints.'),
    ('SEED334-PRJ-06', 'Nexus Platform - API Gateway and Rate Limiting',
     'Centralise partner traffic behind OAuth2, mTLS for internal services, and burst protection policies.'),
    ('SEED334-PRJ-07', 'Cedar Trust Schools - LMS and SIS Integration',
     'Single sign-on for teachers, grade pass-back, and parent portal with regional data residency.'),
    ('SEED334-PRJ-08', 'Velocity Freight - Dynamic Route Optimization Pilot',
     'Machine-learning assisted routing for refrigerated loads; KPIs on miles, fuel, and on-time delivery.'),
    ('SEED334-PRJ-09', 'Orion Defense - SOC Playbook Automation',
     'Codify detection rules into runbooks; integrate SOAR for tier-1 triage and executive dashboards.'),
    ('SEED334-PRJ-10', 'Apex Mutual - Claims Straight-Through Processing',
     'Rules engine for low-value claims; human-in-the-loop for fraud signals and regulatory letters.'),
    ('SEED334-PRJ-11', 'Redwood Retail - Omnichannel Loyalty Redesign',
     'Unified customer ID across web, app, and stores; pilot in two regions before global rollout.'),
    ('SEED334-PRJ-12', 'Cobalt Manufacturing - MES Line Monitoring',
     'Real-time OEE, downtime reasons, and quality holds from PLCs into operations war room.'),
    ('SEED334-PRJ-13', 'Silverline Banking - Open Banking Developer Portal',
     'Developer sandbox, consent management hooks, and partner onboarding workflow for PSD2-style APIs.'),
    ('SEED334-PRJ-14', 'Granite Public Works - Asset Inspection Mobile Workflow',
     'GIS-linked inspections with photo evidence, defect scoring, and contractor work orders.'),
    ('SEED334-PRJ-15', 'Ivory BioPharm - Serialization and Track-and-Trace',
     'Serialization events to national hubs; reconcile exceptions at packaging and 3PL handoff.'),
    ('SEED334-PRJ-16', 'Atlas Airlines - Crew Rostering Optimisation',
     'Crew pairing and bidding constraints; union rule packs and fatigue limit validation.'),
    ('SEED334-PRJ-17', 'Compass Telecom - 5G Small Cell Deployment Tracker',
     'Permit tracking, contractor milestones, and RF interference mitigation checklist per site.'),
    ('SEED334-PRJ-18', 'Lumen Utilities - AMI Head-End Upgrade',
     'Migrate metering collection; dual-run validation against legacy head-end for six weeks.'),
    ('SEED334-PRJ-19', 'Falcon Insurance - Underwriting Workbench',
     'Configurable risk appetite, referral queues, and document AI assist for underwriters.'),
    ('SEED334-PRJ-20', 'Polaris Energy - Battery Storage Commissioning',
     'Battery farm FAT/SAT, grid code compliance tests, and operations handover documentation.'),
    ('SEED334-PRJ-21', 'Sierra Mining - Environmental Monitoring Dashboard',
     'Air and water quality sensors with threshold alerting and regulator export formats.'),
    ('SEED334-PRJ-22', 'Titan Logistics - Port Dwell Time Reduction',
     'Berth planning integration, customs pre-clearance status, and chassis pool utilisation.'),
    ('SEED334-PRJ-23', 'Nova EdTech - Accessibility Audit Remediation',
     'WCAG 2.2 AA fixes across student portal, CMS templates, and legacy PDF syllabi.'),
    ('SEED334-PRJ-24', 'Helix Robotics - Warehouse AMR Safety Envelope',
     'Safety zones for AMRs, LiDAR calibration, and incident stop-line testing with EHS sign-off.'),
    ('SEED334-PRJ-25', 'Zephyr Hospitality - PMS Cloud Migration',
     'Chain-wide PMS cutover, night-audit reconciliation, and OTA channel mapping.'),
    ('SEED334-PRJ-26', 'Quanta Research - Data Lake Cost Governance',
     'Tagging policy, lifecycle rules, and chargeback dashboards for research datasets.'),
    ('SEED334-PRJ-27', 'Bloom Agronomy - IoT Soil Moisture Network',
     'LoRaWAN moisture probes, irrigation recommendations, and farmer mobile alerts.'),
    ('SEED334-PRJ-28', 'Keystone Housing - Retrofit Works Programme',
     'Whole-house retrofit scheduling, resident comms, and grant compliance reporting.'),
    ('SEED334-PRJ-29', 'Mariner Shipping - Vessel Maintenance Scheduler',
     'Dry-dock work packages, spare parts forecasting, and class society document packs.'),
    ('SEED334-PRJ-30', 'Catalyst NGO - Grants Outcomes Reporting Portal',
     'Outcome metrics, beneficiary stories, and donor transparency portal for multi-year grants.')
)

-- 1a. Exact v334 catalogue (code or name)
UPDATE public.projects AS p
SET
  project_description = s.project_description,
  updated_at = NOW()
FROM project_desc_seed AS s
WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  AND COALESCE(BTRIM(p.project_description), '') = ''
  AND (p.project_code = s.project_code OR p.project_name = s.project_name);

-- 1b. Keyword-tailored descriptions for remaining projects
UPDATE public.projects AS p
SET
  project_description = CASE
    WHEN lower(p.project_name) ~ '(pci|payment|banking|open banking|claims|insurance|underwriting|mutual)' THEN
      'Strengthen payment and financial controls; automate straight-through processing with audit-ready evidence.'
    WHEN lower(p.project_name) ~ '(solar|greengrid|grid|energy|battery|polaris|utilities|ami|metering|lumen)' THEN
      'Ingest operational telemetry and grid data to improve forecasting, compliance, and asset performance.'
    WHEN lower(p.project_name) ~ '(mobile|app|mvp|android|field technician|portal)' THEN
      'Deliver a mobile-first experience with offline tolerance, role-based workflows, and secure sync.'
    WHEN lower(p.project_name) ~ '(health|clinic|ambulatory|hl7|fhir|harbor)' THEN
      'Digitise clinical intake and care pathways with standards-based interfaces and operational analytics.'
    WHEN lower(p.project_name) ~ '(erp|finance|ledger|cutover|summit)' THEN
      'Execute finance module migration with parallel run, reconciliation, and controlled cutover checkpoints.'
    WHEN lower(p.project_name) ~ '(api|gateway|oauth|nexus|rate limit)' THEN
      'Harden partner and internal API traffic with identity, throttling, and observability baselines.'
    WHEN lower(p.project_name) ~ '(school|lms|sis|edtech|accessibility|wcag|student)' THEN
      'Improve learner and staff digital services with integrated platforms and inclusive design remediation.'
    WHEN lower(p.project_name) ~ '(freight|route|logistics|port|shipping|vessel|mariner|titan)' THEN
      'Optimise movement of goods and assets through planning, dwell reduction, and maintenance scheduling.'
    WHEN lower(p.project_name) ~ '(defense|soc|security|orion|playbook)' THEN
      'Operationalise security detection and response with codified runbooks and tiered escalation.'
    WHEN lower(p.project_name) ~ '(retail|loyalty|omnichannel|redwood)' THEN
      'Unify customer identity and loyalty journeys across digital and store channels in phased rollout.'
    WHEN lower(p.project_name) ~ '(manufacturing|mes|oee|plc|cobalt)' THEN
      'Connect shop-floor signals to operations dashboards for throughput, quality, and downtime insight.'
    WHEN lower(p.project_name) ~ '(gis|inspection|public works|granite)' THEN
      'Support field inspections with geospatial evidence, scoring, and contractor work-order handoff.'
    WHEN lower(p.project_name) ~ '(pharma|serialization|bio|track-and-trace|ivory)' THEN
      'Track serialised packs through packaging and logistics with hub reconciliation and exception handling.'
    WHEN lower(p.project_name) ~ '(airline|crew|roster|atlas)' THEN
      'Optimise crew planning within union rules, fatigue limits, and operational bidding constraints.'
    WHEN lower(p.project_name) ~ '(telecom|5g|rf|compass|small cell)' THEN
      'Manage rollout permits, contractor milestones, and interference mitigation per network site.'
    WHEN lower(p.project_name) ~ '(robotics|amr|warehouse|helix|lidar)' THEN
      'Define safety envelopes and test protocols for autonomous movement in warehouse environments.'
    WHEN lower(p.project_name) ~ '(hospitality|pms|hotel|zephyr)' THEN
      'Migrate property-management systems with reconciliation, channel mapping, and hypercare.'
    WHEN lower(p.project_name) ~ '(data lake|research|quanta|governance)' THEN
      'Apply tagging, lifecycle, and chargeback policies to research and analytics data platforms.'
    WHEN lower(p.project_name) ~ '(agronomy|iot|soil|moisture|bloom|lorawan)' THEN
      'Deploy field sensors and alerts to support irrigation decisions and farmer-facing insights.'
    WHEN lower(p.project_name) ~ '(housing|retrofit|keystone|resident)' THEN
      'Schedule retrofit works, resident communications, and grant compliance for housing upgrades.'
    WHEN lower(p.project_name) ~ '(ngo|grants|donor|catalyst|beneficiar)' THEN
      'Report programme outcomes and beneficiary impact for donors and multi-year grant compliance.'
    WHEN lower(p.project_name) ~ '(mining|environmental|sierra|monitoring)' THEN
      'Monitor environmental indicators with threshold alerting and regulator-ready export formats.'
    ELSE NULL
  END,
  updated_at = NOW()
WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  AND COALESCE(BTRIM(p.project_description), '') = ''
  AND CASE
    WHEN lower(p.project_name) ~ '(pci|payment|banking|open banking|claims|insurance|underwriting|mutual)' THEN TRUE
    WHEN lower(p.project_name) ~ '(solar|greengrid|grid|energy|battery|polaris|utilities|ami|metering|lumen)' THEN TRUE
    WHEN lower(p.project_name) ~ '(mobile|app|mvp|android|field technician|portal)' THEN TRUE
    WHEN lower(p.project_name) ~ '(health|clinic|ambulatory|hl7|fhir|harbor)' THEN TRUE
    WHEN lower(p.project_name) ~ '(erp|finance|ledger|cutover|summit)' THEN TRUE
    WHEN lower(p.project_name) ~ '(api|gateway|oauth|nexus|rate limit)' THEN TRUE
    WHEN lower(p.project_name) ~ '(school|lms|sis|edtech|accessibility|wcag|student)' THEN TRUE
    WHEN lower(p.project_name) ~ '(freight|route|logistics|port|shipping|vessel|mariner|titan)' THEN TRUE
    WHEN lower(p.project_name) ~ '(defense|soc|security|orion|playbook)' THEN TRUE
    WHEN lower(p.project_name) ~ '(retail|loyalty|omnichannel|redwood)' THEN TRUE
    WHEN lower(p.project_name) ~ '(manufacturing|mes|oee|plc|cobalt)' THEN TRUE
    WHEN lower(p.project_name) ~ '(gis|inspection|public works|granite)' THEN TRUE
    WHEN lower(p.project_name) ~ '(pharma|serialization|bio|track-and-trace|ivory)' THEN TRUE
    WHEN lower(p.project_name) ~ '(airline|crew|roster|atlas)' THEN TRUE
    WHEN lower(p.project_name) ~ '(telecom|5g|rf|compass|small cell)' THEN TRUE
    WHEN lower(p.project_name) ~ '(robotics|amr|warehouse|helix|lidar)' THEN TRUE
    WHEN lower(p.project_name) ~ '(hospitality|pms|hotel|zephyr)' THEN TRUE
    WHEN lower(p.project_name) ~ '(data lake|research|quanta|governance)' THEN TRUE
    WHEN lower(p.project_name) ~ '(agronomy|iot|soil|moisture|bloom|lorawan)' THEN TRUE
    WHEN lower(p.project_name) ~ '(housing|retrofit|keystone|resident)' THEN TRUE
    WHEN lower(p.project_name) ~ '(ngo|grants|donor|catalyst|beneficiar)' THEN TRUE
    WHEN lower(p.project_name) ~ '(mining|environmental|sierra|monitoring)' THEN TRUE
    ELSE FALSE
  END;

-- 1c. Hash fallback only if still empty
UPDATE public.projects AS p
SET
  project_description = format(
    (ARRAY[
      'Deliver %s through phased releases with defined benefits, tolerances, and stage-gate reviews.',
      'Coordinate vendors and internal teams to implement %s; track milestones, RAID, and spend.',
      'Establish the delivery roadmap, governance model, and benefit measures for %s.',
      'Run discovery, design, build, and transition for %s with clear acceptance criteria.',
      'Execute %s with integrated change, training, and hypercare to stabilise operations.'
    ])[1 + (abs(hashtext(p.id::text)) % 5)],
    p.project_name
  ),
  updated_at = NOW()
WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  AND COALESCE(BTRIM(p.project_description), '') = '';

-- =============================================================================
-- TAILORED DESCRIPTIONS — portfolios
-- =============================================================================
WITH portfolio_desc_seed (portfolio_code, portfolio_name, portfolio_description) AS (
  VALUES
    ('SEED334-PORT-01', 'North America Digital & Payments',
     'Customer-facing digital channels, payments compliance, and retail technology initiatives.'),
    ('SEED334-PORT-02', 'Infrastructure & Regulated Operations',
     'Utilities, telecom, transport, and public-sector asset programmes with heavy compliance.'),
    ('SEED334-PORT-03', 'Innovation & Sustainability Lab',
     'Pilot and scale-up projects: IoT, energy transition, robotics, and agritech experiments.')
)
UPDATE public.portfolios AS pf
SET
  portfolio_description = s.portfolio_description,
  updated_at = NOW()
FROM portfolio_desc_seed AS s
WHERE COALESCE(pf.is_deleted, FALSE) = FALSE
  AND COALESCE(BTRIM(pf.portfolio_description), '') = ''
  AND (pf.portfolio_code = s.portfolio_code OR pf.portfolio_name = s.portfolio_name);

UPDATE public.portfolios AS pf
SET
  portfolio_description = CASE
    WHEN lower(pf.portfolio_name) ~ '(digital|payment|customer|channel)' THEN
      'Customer-facing digital channels, payments compliance, and retail technology initiatives.'
    WHEN lower(pf.portfolio_name) ~ '(infrastructure|regulated|utility|telecom|transport|public)' THEN
      'Utilities, telecom, transport, and public-sector asset programmes with heavy compliance.'
    WHEN lower(pf.portfolio_name) ~ '(innovation|sustainability|lab|pilot|iot|energy)' THEN
      'Pilot and scale-up projects: IoT, energy transition, robotics, and agritech experiments.'
    WHEN lower(pf.portfolio_name) ~ '(transformation|change|programme)' THEN
      'Enterprise transformation portfolio aligning funding, benefits, and inter-programme dependencies.'
    WHEN lower(pf.portfolio_name) ~ '(it|technology|platform)' THEN
      'Technology and platform investments with shared architecture, security, and delivery standards.'
    ELSE format(
      'Strategic portfolio for %s — prioritise initiatives, balance capacity, and report aggregated benefits.',
      pf.portfolio_name
    )
  END,
  updated_at = NOW()
WHERE COALESCE(pf.is_deleted, FALSE) = FALSE
  AND COALESCE(BTRIM(pf.portfolio_description), '') = '';

-- =============================================================================
-- TAILORED DESCRIPTIONS — programmes (incl. standalone)
-- =============================================================================
WITH programme_desc_seed (programme_code, programme_name, programme_description) AS (
  VALUES
    ('SEED334-PROG-01', 'Digital Customer & Payments Transformation',
     'End-to-end modernization of acquisition, servicing, and payment security under portfolio North America Digital & Payments.'),
    ('SEED334-PROG-02', 'Critical Infrastructure Renewal',
     'Coordinated delivery of regulated network, grid, and mobility upgrades under Infrastructure & Regulated Operations.'),
    ('SEED334-PROG-03', 'Cross-Portfolio Innovation Delivery',
     'Horizon projects not tied to a single portfolio: pilots spanning robotics, sustainability, and research platforms.')
)
UPDATE public.programmes AS pg
SET
  programme_description = s.programme_description,
  updated_at = NOW()
FROM programme_desc_seed AS s
WHERE COALESCE(pg.is_deleted, FALSE) = FALSE
  AND COALESCE(BTRIM(pg.programme_description), '') = ''
  AND (pg.programme_code = s.programme_code OR pg.programme_name = s.programme_name);

UPDATE public.programmes AS pg
SET
  programme_description = CASE
    WHEN pg.portfolio_id IS NULL AND lower(pg.programme_name) ~ '(innovation|cross|horizon|pilot)' THEN
      'Horizon programme spanning multiple domains: pilots in robotics, sustainability, and research platforms.'
    WHEN lower(pg.programme_name) ~ '(digital|payment|customer)' THEN
      'Modernise acquisition, servicing, and payment security with coordinated project tranches and benefits tracking.'
    WHEN lower(pg.programme_name) ~ '(infrastructure|renewal|regulated|grid|network)' THEN
      'Deliver regulated network, grid, and mobility upgrades with shared governance and dependency management.'
    WHEN lower(pg.programme_name) ~ '(transformation|change)' THEN
      'Integrated business transformation coordinating people, process, and technology change across projects.'
    WHEN lower(pg.programme_name) ~ '(housing|retrofit|social)' THEN
      'Coordinate housing retrofit works, resident engagement, and grant compliance across delivery partners.'
    ELSE format(
      'Programme of work for %s: shared benefits, dependencies, and tranche planning across constituent projects.',
      pg.programme_name
    )
  END,
  updated_at = NOW()
WHERE COALESCE(pg.is_deleted, FALSE) = FALSE
  AND COALESCE(BTRIM(pg.programme_description), '') = '';

-- =============================================================================
-- PROJECTS — logical methodology (UI uses project_methodologies + delivery_methodology)
-- =============================================================================
DROP TABLE IF EXISTS _v577_project_meth;
CREATE TEMP TABLE _v577_project_meth ON COMMIT DROP AS
WITH project_meth_pick AS (
  SELECT
    p.id AS project_id,
    CASE
      WHEN lower(p.project_name) ~ '(mobile|app|mvp|portal|api|gateway|developer|edtech|scrum)' THEN 'scrum'
      WHEN lower(p.project_name) ~ '(erp|cutover|pms|migration|waterfall|finance module)' THEN 'structured_pm'
      WHEN lower(p.project_name) ~ '(kanban|continuous|flow|support desk)' THEN 'kanban'
      WHEN lower(p.project_name) ~ '(solar|greengrid|grid|energy|battery|utilities|ami|mining|manufacturing|mes|iot|robotics|polaris|lumen)' THEN 'hybrid_pm'
      WHEN lower(p.project_name) ~ '(pci|payment|banking|insurance|serialization|pharma|defense|regulated|compliance|orion)' THEN 'structured_pm'
      WHEN lower(p.project_name) ~ '(health|clinic|programme|housing|retrofit|public works)' THEN 'hybrid_pm'
      WHEN lower(p.project_name) ~ '(retail|loyalty|omnichannel|customer)' THEN 'agile_hybrid'
      ELSE 'hybrid_pm'
    END AS methodology_code,
    CASE
      WHEN lower(p.project_name) ~ '(mobile|app|mvp|portal|api|gateway|developer|edtech|scrum|kanban|retail|loyalty)' THEN 'Agile'
      WHEN lower(p.project_name) ~ '(erp|cutover|pms|migration|waterfall|finance module)' THEN 'Waterfall'
      WHEN lower(p.project_name) ~ '(pci|payment|banking|insurance|serialization|pharma|defense|regulated|compliance)' THEN 'Structured'
      ELSE 'Hybrid'
    END AS delivery_methodology
  FROM public.projects AS p
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
)
SELECT
  pick.project_id,
  pick.methodology_code,
  pick.delivery_methodology,
  m.id AS methodology_id
FROM project_meth_pick AS pick
LEFT JOIN public.methodologies AS m
  ON m.methodology_code = pick.methodology_code
 AND COALESCE(m.is_active, TRUE) = TRUE
 AND COALESCE(m.is_deleted, FALSE) = FALSE;

UPDATE public.projects AS p
SET
  delivery_methodology = r.delivery_methodology,
  updated_at = NOW()
FROM _v577_project_meth AS r
WHERE p.id = r.project_id
  AND r.methodology_id IS NOT NULL
  AND (
    COALESCE(BTRIM(p.delivery_methodology), '') = ''
    OR NOT EXISTS (
      SELECT 1
      FROM public.project_methodologies AS pm
      WHERE pm.project_id = p.id
        AND COALESCE(pm.is_deleted, FALSE) = FALSE
    )
  );

INSERT INTO public.project_methodologies (project_id, methodology_id, is_active, is_deleted)
SELECT r.project_id, r.methodology_id, TRUE, FALSE
FROM _v577_project_meth AS r
WHERE r.methodology_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.project_methodologies AS pm
    WHERE pm.project_id = r.project_id
      AND COALESCE(pm.is_deleted, FALSE) = FALSE
  );

-- =============================================================================
-- PROJECTS — type, dates, status (Active replaces Draft/null)
-- =============================================================================
UPDATE public.projects AS p
SET
  project_type_id = COALESCE(
    p.project_type_id,
    (
      SELECT pt.id
      FROM public.project_types AS pt
      WHERE COALESCE(pt.is_deleted, FALSE) = FALSE
        AND COALESCE(pt.is_active, TRUE) = TRUE
        AND pt.type_code = CASE
          WHEN lower(p.project_name) ~ '(pci|payment|banking|insurance|claims|mutual)' THEN 'strategic'
          WHEN lower(p.project_name) ~ '(mobile|app|mvp|product|portal|loyalty|retail)' THEN 'product'
          WHEN lower(p.project_name) ~ '(solar|greengrid|grid|energy|utilities|ami|mining|environmental|battery)' THEN 'infrastructure'
          WHEN lower(p.project_name) ~ '(erp|process|manufacturing|mes|logistics|freight)' THEN 'process'
          WHEN lower(p.project_name) ~ '(research|data lake|quanta|innovation)' THEN 'research'
          WHEN lower(p.project_name) ~ '(health|clinic|pharma|serialization)' THEN 'client'
          WHEN lower(p.project_name) ~ '(school|edtech|training|accessibility)' THEN 'training'
          WHEN lower(p.project_name) ~ '(defense|soc|security)' THEN 'infrastructure'
          WHEN lower(p.project_name) ~ '(ngo|grants|housing|public)' THEN 'strategic'
          ELSE 'strategic'
        END
      LIMIT 1
    ),
    (
      SELECT pt.id FROM public.project_types AS pt
      WHERE COALESCE(pt.is_deleted, FALSE) = FALSE AND COALESCE(pt.is_active, TRUE) = TRUE
      ORDER BY pt.type_code LIMIT 1
    )
  ),
  planned_start_date = COALESCE(
    p.planned_start_date,
    DATE '2024-05-01' + (abs(hashtext(p.id::text || 'start')) % 365)::int
  ),
  planned_end_date = COALESCE(
    p.planned_end_date,
    (
      COALESCE(
        p.planned_start_date,
        DATE '2024-05-01' + (abs(hashtext(p.id::text || 'start')) % 365)::int
      )
      + ((abs(hashtext(p.id::text || 'end')) % 30) + 12) * 30
    )::date
  ),
  status_id = COALESCE(
    (
      SELECT ps.id
      FROM public.project_statuses AS ps
      WHERE ps.status_code = 'active'
        AND COALESCE(ps.is_deleted, FALSE) = FALSE
        AND COALESCE(ps.is_active, TRUE) = TRUE
      LIMIT 1
    ),
    p.status_id
  ),
  updated_at = NOW()
WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  AND (
    p.project_type_id IS NULL
    OR p.planned_start_date IS NULL
    OR p.planned_end_date IS NULL
    OR p.status_id IS NULL
    OR p.status_id IN (
      SELECT ps.id
      FROM public.project_statuses AS ps
      WHERE ps.status_code = 'draft'
        AND COALESCE(ps.is_deleted, FALSE) = FALSE
    )
  );

-- =============================================================================
-- PORTFOLIOS — type, category, dates
-- =============================================================================
UPDATE public.portfolios AS pf
SET
  portfolio_type = CASE
    WHEN COALESCE(BTRIM(pf.portfolio_type), '') <> '' THEN pf.portfolio_type
    WHEN lower(pf.portfolio_name) ~ '(innovation|sustainability|lab|pilot)' THEN 'innovation'
    WHEN lower(pf.portfolio_name) ~ '(compliance|regulated|risk)' THEN 'compliance'
    WHEN lower(pf.portfolio_name) ~ '(operational|run|maintain)' THEN 'operational'
    WHEN lower(pf.portfolio_name) ~ '(mixed|enterprise)' THEN 'mixed'
    ELSE 'strategic'
  END,
  portfolio_category = CASE
    WHEN COALESCE(BTRIM(pf.portfolio_category), '') <> '' THEN pf.portfolio_category
    WHEN lower(pf.portfolio_name) ~ '(digital|payment|it|technology|api)' THEN 'it'
    WHEN lower(pf.portfolio_name) ~ '(infrastructure|utility|transport|telecom)' THEN 'infrastructure'
    WHEN lower(pf.portfolio_name) ~ '(product|retail|customer)' THEN 'product'
    WHEN lower(pf.portfolio_name) ~ '(research|innovation|lab)' THEN 'research'
    ELSE 'business'
  END,
  portfolio_start_date = COALESCE(
    pf.portfolio_start_date,
    DATE '2023-01-01' + (abs(hashtext(pf.id::text || 'pstart')) % 548)::int
  ),
  portfolio_end_date = COALESCE(
    pf.portfolio_end_date,
    (
      COALESCE(
        pf.portfolio_start_date,
        DATE '2023-01-01' + (abs(hashtext(pf.id::text || 'pstart')) % 548)::int
      )
      + ((abs(hashtext(pf.id::text || 'pend')) % 24) + 36) * 30
    )::date
  ),
  portfolio_status = CASE
    WHEN COALESCE(BTRIM(pf.portfolio_status), '') IN ('', 'planning', 'draft') THEN 'active'
    ELSE pf.portfolio_status
  END,
  updated_at = NOW()
WHERE COALESCE(pf.is_deleted, FALSE) = FALSE
  AND (
    COALESCE(BTRIM(pf.portfolio_type), '') = ''
    OR COALESCE(BTRIM(pf.portfolio_category), '') = ''
    OR pf.portfolio_start_date IS NULL
    OR pf.portfolio_end_date IS NULL
    OR COALESCE(BTRIM(pf.portfolio_status), '') IN ('', 'planning', 'draft')
  );

-- =============================================================================
-- PROGRAMMES — type, category, dates, status
-- =============================================================================
UPDATE public.programmes AS pg
SET
  programme_type = CASE
    WHEN COALESCE(BTRIM(pg.programme_type), '') <> '' THEN pg.programme_type
    WHEN lower(pg.programme_name) ~ '(digital|payment|technology|api|platform)' THEN 'technology'
    WHEN lower(pg.programme_name) ~ '(infrastructure|renewal|grid|network|utility)' THEN 'infrastructure'
    WHEN lower(pg.programme_name) ~ '(product|retail|customer)' THEN 'product'
    WHEN lower(pg.programme_name) ~ '(regulatory|compliance|regulated)' THEN 'regulatory'
    WHEN lower(pg.programme_name) ~ '(innovation|cross|pilot|horizon)' THEN 'mixed'
    WHEN pg.portfolio_id IS NULL THEN 'mixed'
    ELSE 'business_transformation'
  END,
  programme_category = CASE
    WHEN COALESCE(BTRIM(pg.programme_category), '') <> '' THEN pg.programme_category
    WHEN lower(pg.programme_name) ~ '(digital|it|technology|payment)' THEN 'it'
    WHEN lower(pg.programme_name) ~ '(infrastructure|grid|transport)' THEN 'infrastructure'
    WHEN lower(pg.programme_name) ~ '(product|retail)' THEN 'product'
    WHEN lower(pg.programme_name) ~ '(compliance|regulated)' THEN 'compliance'
    ELSE 'business'
  END,
  programme_start_date = COALESCE(
    pg.programme_start_date,
    DATE '2023-06-01' + (abs(hashtext(pg.id::text || 'pgstart')) % 640)::int
  ),
  programme_end_date = COALESCE(
    pg.programme_end_date,
    (
      COALESCE(
        pg.programme_start_date,
        DATE '2023-06-01' + (abs(hashtext(pg.id::text || 'pgstart')) % 640)::int
      )
      + ((abs(hashtext(pg.id::text || 'pgend')) % 30) + 18) * 30
    )::date
  ),
  programme_status = CASE
    WHEN COALESCE(BTRIM(pg.programme_status), '') IN ('', 'planning', 'draft') THEN 'active'
    ELSE pg.programme_status
  END,
  updated_at = NOW()
WHERE COALESCE(pg.is_deleted, FALSE) = FALSE
  AND (
    COALESCE(BTRIM(pg.programme_type), '') = ''
    OR COALESCE(BTRIM(pg.programme_category), '') = ''
    OR pg.programme_start_date IS NULL
    OR pg.programme_end_date IS NULL
    OR COALESCE(BTRIM(pg.programme_status), '') IN ('', 'planning', 'draft')
  );

-- =============================================================================
-- Verification
-- =============================================================================
DO $$
DECLARE
  v_proj_missing   INT;
  v_proj_no_meth   INT;
  v_proj_draft     INT;
  v_port_missing   INT;
  v_prog_missing   INT;
  v_prog_standalone INT;
BEGIN
  SELECT COUNT(*) INTO v_proj_missing
  FROM public.projects p
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
    AND (
      COALESCE(BTRIM(p.project_description), '') = ''
      OR p.project_type_id IS NULL
      OR COALESCE(BTRIM(p.delivery_methodology), '') = ''
      OR p.planned_start_date IS NULL
      OR p.planned_end_date IS NULL
    );

  SELECT COUNT(*) INTO v_proj_no_meth
  FROM public.projects p
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
    AND NOT EXISTS (
      SELECT 1
      FROM public.project_methodologies pm
      WHERE pm.project_id = p.id
        AND COALESCE(pm.is_deleted, FALSE) = FALSE
    );

  SELECT COUNT(*) INTO v_proj_draft
  FROM public.projects p
  JOIN public.project_statuses ps ON ps.id = p.status_id
  WHERE COALESCE(p.is_deleted, FALSE) = FALSE
    AND ps.status_code = 'draft';

  SELECT COUNT(*) INTO v_port_missing
  FROM public.portfolios pf
  WHERE COALESCE(pf.is_deleted, FALSE) = FALSE
    AND (
      COALESCE(BTRIM(pf.portfolio_description), '') = ''
      OR COALESCE(BTRIM(pf.portfolio_type), '') = ''
      OR pf.portfolio_start_date IS NULL
      OR pf.portfolio_end_date IS NULL
    );

  SELECT COUNT(*) INTO v_prog_missing
  FROM public.programmes pg
  WHERE COALESCE(pg.is_deleted, FALSE) = FALSE
    AND (
      COALESCE(BTRIM(pg.programme_description), '') = ''
      OR COALESCE(BTRIM(pg.programme_type), '') = ''
      OR pg.programme_start_date IS NULL
      OR pg.programme_end_date IS NULL
    );

  SELECT COUNT(*) INTO v_prog_standalone
  FROM public.programmes pg
  WHERE COALESCE(pg.is_deleted, FALSE) = FALSE
    AND pg.portfolio_id IS NULL;

  RAISE NOTICE 'v577 backfill complete (tailored descriptions).';
  RAISE NOTICE '  Projects still missing description/type/delivery/dates: %', v_proj_missing;
  RAISE NOTICE '  Projects without project_methodologies row (UI Methodology): %', v_proj_no_meth;
  RAISE NOTICE '  Projects still on Draft status: %', v_proj_draft;
  RAISE NOTICE '  Portfolios still missing description/type/dates/status: %', v_port_missing;
  RAISE NOTICE '  Programmes still missing description/type/dates/status: %', v_prog_missing;
  RAISE NOTICE '  Standalone programmes (portfolio_id IS NULL): %', v_prog_standalone;
END $$;
