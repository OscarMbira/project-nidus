-- =============================================================================
-- v772: Industry template content enrichment (Phase 1)
-- Plan: projectplan/v772_industry_template_springboard_content_plan.md
-- Targets: software_development, construction, financial_services
-- Idempotent UPDATEs + banking-oriented INSERTs for financial_services
-- Prerequisites: v576 industry seeds applied
-- =============================================================================

-- -----------------------------------------------------------------------------
-- software_development â€” narrative phases / risks / milestones / roles
-- -----------------------------------------------------------------------------
UPDATE public.pmo_industry_template_phases p
SET phase_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('software_development', 'Discovery', $t$Confirm business problem, target users, and success metrics. Assess technical feasibility, competitor landscape, and delivery constraints before committing to a build.$t$),
  ('software_development', 'Requirements', $t$Elicit and prioritise user stories with clear acceptance criteria. Establish non-functional requirements (performance, security, accessibility) and traceability to business outcomes.$t$),
  ('software_development', 'Design', $t$Produce solution architecture, UX flows, and data model decisions. Agree integration boundaries, environments, and definition of done with Tech Lead and Product Owner.$t$),
  ('software_development', 'Development', $t$Implement features in iterative increments with code review, CI, and automated tests. Manage technical debt and keep the backlog refined against the MVP baseline.$t$),
  ('software_development', 'Testing', $t$Execute system, integration, and regression testing against agreed coverage. Log defects with severity, verify fixes, and gate exit on critical defect thresholds.$t$),
  ('software_development', 'UAT', $t$Business users validate end-to-end scenarios in a production-like environment. Capture sign-off evidence and residual issues with agreed workarounds.$t$),
  ('software_development', 'Deployment', $t$Release through controlled change management with rollback plan, monitoring, and communication. Confirm production health checks and support handover.$t$),
  ('software_development', 'Hypercare', $t$Provide intensified post-go-live support, triage incidents, and stabilise operations. Close hypercare when SLAs are met and ownership transfers to BAU.$t$)
) AS v(code, phase_name, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE p.template_id = t.id AND p.phase_name = v.phase_name;

UPDATE public.pmo_industry_template_risks r
SET risk_description = v.descr, risk_category = v.cat, updated_at = NOW()
FROM (VALUES
  ('software_development', 'Scope creep', 'Delivery', $t$Uncontrolled addition of features after baseline will delay release and inflate cost. Mitigate with change control, MVP freeze, and backlog prioritisation by Product Owner.$t$),
  ('software_development', 'Technical debt', 'Technical', $t$Shortcuts taken under schedule pressure degrade maintainability and raise future defect rates. Budget refactoring capacity each sprint and track debt items explicitly.$t$),
  ('software_development', 'Key developer dependency', 'Resource', $t$Loss of a critical specialist can stall architecture or integrations. Cross-train, document design decisions, and avoid single points of knowledge.$t$),
  ('software_development', 'Integration failures', 'Technical', $t$External APIs or legacy systems may not behave as assumed. Use contract tests, sandboxes, and early spike integrations with clear fallback designs.$t$),
  ('software_development', 'Security vulnerability', 'Security', $t$An exploitable flaw in auth, data handling, or dependencies can block go-live or cause breach. Include threat modelling, dependency scanning, and security sign-off.$t$)
) AS v(code, title, cat, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE r.template_id = t.id AND r.risk_title = v.title;

UPDATE public.pmo_industry_template_milestones m
SET milestone_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('software_development', 'MVP Approval', $t$Sponsors approve the minimum viable scope, success metrics, and release window. Development proceeds against a frozen MVP backlog.$t$),
  ('software_development', 'Beta Release', $t$A production-candidate build is available to a controlled user group with monitoring enabled and known limitations documented.$t$),
  ('software_development', 'User Acceptance', $t$Business representatives confirm acceptance criteria are met (or formally waived). Remaining defects are prioritised for go-live or hypercare.$t$),
  ('software_development', 'Go-Live', $t$Solution is live in production with rollback available, support rota active, and stakeholders notified.$t$),
  ('software_development', 'Hypercare Sign-Off', $t$Operations accepts ownership after stability criteria and open critical incidents are resolved or formally accepted.$t$)
) AS v(code, name, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE m.template_id = t.id AND m.milestone_name = v.name;

UPDATE public.pmo_industry_template_roles r
SET role_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('software_development', 'Product Owner', $t$Owns the product backlog, prioritises value, and accepts increments against business outcomes.$t$),
  ('software_development', 'Tech Lead', $t$Guides architecture, code quality, and technical risk decisions; mentors the delivery team.$t$),
  ('software_development', 'Software Developers', $t$Implement features, tests, and integrations according to the agreed definition of done.$t$),
  ('software_development', 'QA Engineers', $t$Design and execute test strategies, automate regression where practical, and report quality risk.$t$),
  ('software_development', 'DevOps Engineer', $t$Owns CI/CD, environments, observability, and release automation.$t$),
  ('software_development', 'Business Analyst', $t$Elicits requirements, writes stories/acceptance criteria, and maintains traceability.$t$),
  ('software_development', 'Scrum Master', $t$Facilitates agile ceremonies, removes impediments, and protects sustainable delivery cadence.$t$)
) AS v(code, title, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE r.template_id = t.id AND r.role_title = v.title;

-- -----------------------------------------------------------------------------
-- construction
-- -----------------------------------------------------------------------------
UPDATE public.pmo_industry_template_phases p
SET phase_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('construction', 'Pre-Construction', $t$Secure site access, surveys, planning permissions, and procurement strategy. Align budget, programme, and risk register before design freeze.$t$),
  ('construction', 'Design', $t$Develop architectural, structural, and MEP designs to the agreed stage. Coordinate clash detection and client design reviews.$t$),
  ('construction', 'Procurement', $t$Tender packages, evaluate contractors/suppliers, and place long-lead orders. Confirm contracts, bonds, and insurance.$t$),
  ('construction', 'Foundation', $t$Execute groundworks and foundations per geotechnical recommendations. Inspect hold points and manage weather/access constraints.$t$),
  ('construction', 'Structure', $t$Erect primary structure to topping-out. Maintain quality inspections, temporary works control, and programme critical path.$t$),
  ('construction', 'MEP & Fit-Out', $t$Install mechanical, electrical, plumbing, and fit-out packages. Coordinate first/second fix and commissioning readiness.$t$),
  ('construction', 'Finishing', $t$Complete finishes, snagging, and soft landings. Prepare O&M manuals and training for facilities teams.$t$),
  ('construction', 'Handover', $t$Achieve practical completion, certify works, and transfer keys/as-builts. Close defects liability punch-list ownership.$t$)
) AS v(code, phase_name, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE p.template_id = t.id AND p.phase_name = v.phase_name;

UPDATE public.pmo_industry_template_risks r
SET risk_description = v.descr, risk_category = v.cat, updated_at = NOW()
FROM (VALUES
  ('construction', 'Weather delays', 'External', $t$Adverse weather can stop outdoor works and cascade the critical path. Build weather float, winter working plans, and early enclosure strategies.$t$),
  ('construction', 'Material shortages', 'Supply', $t$Long-lead or scarce materials threaten programme and cost. Dual-source critical items and place orders early with confirmed lead times.$t$),
  ('construction', 'Safety incident', 'HSE', $t$A serious injury stops the site and invites regulatory action. Enforce method statements, permits-to-work, and daily briefings.$t$),
  ('construction', 'Regulatory approval delay', 'Regulatory', $t$Planning or building-control lag can idle teams. Front-load submissions, track conditions, and escalate blockers early.$t$),
  ('construction', 'Ground condition surprises', 'Technical', $t$Unexpected ground can force redesign of foundations. Commission adequate SI, contingency allowances, and early contractor involvement.$t$)
) AS v(code, title, cat, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE r.template_id = t.id AND r.risk_title = v.title;

UPDATE public.pmo_industry_template_milestones m
SET milestone_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('construction', 'Planning Permission Granted', $t$Statutory planning consent (or equivalent) is obtained with conditions understood and programmed.$t$),
  ('construction', 'Ground Breaking', $t$Site mobilisation complete and first permanent works commence under approved method statements.$t$),
  ('construction', 'Topping Out', $t$Primary structure reaches its highest point; weatherproofing and follow-on trades can accelerate.$t$),
  ('construction', 'Practical Completion', $t$Works are complete enough for beneficial use; snagging list agreed and certificates issued.$t$),
  ('construction', 'Final Handover', $t$Client takes full possession with as-builts, warranties, and training delivered.$t$)
) AS v(code, name, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE m.template_id = t.id AND m.milestone_name = v.name;

UPDATE public.pmo_industry_template_roles r
SET role_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('construction', 'Project Manager', $t$Owns programme, cost, and stakeholder coordination across the construction lifecycle.$t$),
  ('construction', 'Site Manager', $t$Runs day-to-day site logistics, HSE compliance, and trade coordination.$t$),
  ('construction', 'Architect', $t$Leads design intent, aesthetics, and design-stage statutory compliance.$t$),
  ('construction', 'Structural Engineer', $t$Designs and certifies structural systems; responds to site queries and variations.$t$),
  ('construction', 'MEP Engineer', $t$Designs and coordinates mechanical, electrical, and plumbing systems.$t$),
  ('construction', 'HSE Officer', $t$Ensures health, safety, and environmental controls are planned and audited.$t$),
  ('construction', 'Quantity Surveyor', $t$Controls cost, valuations, variations, and commercial claims.$t$),
  ('construction', 'Main Contractor', $t$Delivers construction works package to programme, quality, and HSE standards.$t$)
) AS v(code, title, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE r.template_id = t.id AND r.role_title = v.title;

-- -----------------------------------------------------------------------------
-- financial_services (+ banking coverage)
-- -----------------------------------------------------------------------------
UPDATE public.pmo_industry_templates
SET description = $t$Financial services & transformation blueprint covering core banking systems, KYC/AML compliance gates, branch/channel rollout, payment rail integration, and regulatory reporting â€” phases, activities, deliverables, risks, milestones, and roles.$t$,
    updated_at = NOW()
WHERE industry_code = 'financial_services';

UPDATE public.pmo_industry_template_phases p
SET phase_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('financial_services', 'Scoping', $t$Define transformation outcomes across products, channels, and risk appetite. Include core banking, payments, and compliance scope boundaries with executive sponsors.$t$),
  ('financial_services', 'Requirements Analysis', $t$Capture functional and regulatory requirements (KYC/AML, reporting, data residency). Prioritise epics for core banking, channels, and payment rails.$t$),
  ('financial_services', 'Solution Design', $t$Design target architecture for CBS, middleware, channels, and data warehouses. Agree security, resilience, and auditability patterns with Risk and IT Architecture.$t$),
  ('financial_services', 'Development', $t$Configure/build CBS modules, interfaces, and channel journeys. Implement KYC/AML rules engines and payment scheme connectors under change control.$t$),
  ('financial_services', 'Integration Testing', $t$Test end-to-end flows across CBS, payments, CRM, and reporting. Include negative tests for fraud, limit breaches, and reconciliation breaks.$t$),
  ('financial_services', 'Regulatory Review', $t$Complete compliance assessments, model/validation reviews, and regulator/file readiness. Obtain formal go/no-go from Compliance and Risk.$t$),
  ('financial_services', 'Parallel Run', $t$Run new and legacy processes in parallel with reconciliation and cutover rehearsals. Prove branch/channel readiness and support staffing.$t$),
  ('financial_services', 'Go-Live', $t$Execute cutover to production with command-centre support. Activate monitoring for payments, KYC queues, and critical CBS batches.$t$),
  ('financial_services', 'Post-Implementation Review', $t$Assess benefits, residual risks, and lessons. Hand over to BAU with PIR actions tracked to closure.$t$)
) AS v(code, phase_name, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE p.template_id = t.id AND p.phase_name = v.phase_name;

UPDATE public.pmo_industry_template_risks r
SET risk_description = v.descr, risk_category = v.cat, updated_at = NOW()
FROM (VALUES
  ('financial_services', 'Regulatory non-compliance', 'Regulatory', $t$Failure to meet licensing, KYC/AML, or reporting obligations can halt go-live. Engage Compliance early and evidence control effectiveness before cutover.$t$),
  ('financial_services', 'Data security breach', 'Security', $t$Customer or payment data exposure creates severe regulatory and reputational harm. Enforce encryption, access reviews, and penetration testing.$t$),
  ('financial_services', 'System integration failure', 'Technical', $t$Breaks between CBS, payments, and channels disrupt settlements. Use contract tests, reconciliation controls, and rollback runbooks.$t$),
  ('financial_services', 'Change resistance', 'Organisational', $t$Branch and operations staff may reject new processes. Fund training, floor-walkers, and clear SOP cutover communications.$t$),
  ('financial_services', 'Market / rate change during build', 'External', $t$Product or rate changes mid-build force rework. Freeze product parameters for release trains and manage exceptions via change board.$t$)
) AS v(code, title, cat, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE r.template_id = t.id AND r.risk_title = v.title;

UPDATE public.pmo_industry_template_milestones m
SET milestone_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('financial_services', 'Requirements Sign-Off', $t$Business, Risk, and Compliance accept the requirements baseline including KYC/AML and reporting obligations.$t$),
  ('financial_services', 'Regulatory Pre-Approval', $t$Regulator/internal compliance preconditions for the release are satisfied or formally deferred with controls.$t$),
  ('financial_services', 'UAT Complete', $t$Business UAT for core journeys (onboarding, payments, branch) is signed off with residual defects accepted.$t$),
  ('financial_services', 'Regulatory Sign-Off', $t$Final compliance/risk go-live approval obtained with evidence pack archived.$t$),
  ('financial_services', 'Go-Live', $t$Production cutover complete; payments and CBS batches confirmed healthy.$t$),
  ('financial_services', 'Post-Implementation Review', $t$PIR completed with benefit tracking and open actions assigned to BAU owners.$t$)
) AS v(code, name, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE m.template_id = t.id AND m.milestone_name = v.name;

UPDATE public.pmo_industry_template_roles r
SET role_description = v.descr, updated_at = NOW()
FROM (VALUES
  ('financial_services', 'Programme Manager', $t$Owns end-to-end delivery across technology, risk, compliance, and business change.$t$),
  ('financial_services', 'Business Analyst', $t$Documents product, KYC, and channel requirements with testable acceptance criteria.$t$),
  ('financial_services', 'Compliance Officer', $t$Interprets regulatory obligations, approves control design, and gates go-live readiness.$t$),
  ('financial_services', 'IT Architect', $t$Designs CBS, integration, and data architecture for resilience and auditability.$t$),
  ('financial_services', 'Risk Manager', $t$Assesses operational and conduct risk; ensures residual risk is within appetite.$t$),
  ('financial_services', 'Change Manager', $t$Plans training, communications, and branch/channel adoption.$t$),
  ('financial_services', 'Test Manager', $t$Owns test strategy including payments reconciliation and regulatory scenario packs.$t$)
) AS v(code, title, descr)
JOIN public.pmo_industry_templates t ON t.industry_code = v.code
WHERE r.template_id = t.id AND r.role_title = v.title;

-- Banking-specific risks (insert if missing)
INSERT INTO public.pmo_industry_template_risks (
  template_id, risk_title, risk_description, risk_category, likelihood, impact, sort_order
)
SELECT t.id, v.title, v.descr, v.cat, v.likelihood, v.impact, v.sort_order
FROM public.pmo_industry_templates t
CROSS JOIN (VALUES
  ('KYC/AML control failure', 'Compliance', 'high', 'high', 10,
   $t$Weak onboarding or monitoring controls can trigger regulatory sanctions. Validate rule coverage, case management SLAs, and SAR pathways before go-live.$t$),
  ('Payment rail outage at cutover', 'Technical', 'medium', 'high', 11,
   $t$Scheme or connector failure blocks customer payments. Rehearse cutover with scheme partners and keep fallback routing ready.$t$),
  ('Branch rollout readiness gap', 'Organisational', 'medium', 'medium', 12,
   $t$Branches lack trained staff or devices for the new journey. Use phased rollout with readiness checklists and floor support.$t$),
  ('Core banking data migration defect', 'Technical', 'medium', 'high', 13,
   $t$Incorrect balances or account mappings destroy trust. Run parallel reconciliations and dual-control sign-off on migration waves.$t$)
) AS v(title, cat, likelihood, impact, sort_order, descr)
WHERE t.industry_code = 'financial_services'
  AND NOT EXISTS (
    SELECT 1 FROM public.pmo_industry_template_risks r
    WHERE r.template_id = t.id AND r.risk_title = v.title
  );

-- Banking-oriented activities (append to existing phases)
INSERT INTO public.pmo_industry_template_activities (
  template_id, phase_id, activity_name, activity_description, activity_type,
  typical_duration, typical_effort, resource_type, predecessor_notes, constraints, sort_order
)
SELECT t.id, p.id, v.aname, v.adesc, v.atype, v.dur, v.effort, v.resource, '', '', v.sort_order
FROM public.pmo_industry_templates t
CROSS JOIN (VALUES
  (2, 'KYC/AML requirements workshop', 'Define onboarding, screening, and ongoing monitoring requirements with Compliance.', 'meeting', '2d', '12h', 'Compliance Officer', 50),
  (3, 'Core banking solution blueprint', 'Document CBS module design, product parameterisation, and integration map.', 'deliverable', '10d', '40h', 'IT Architect', 51),
  (4, 'Payment rail connector build', 'Implement and unit-test scheme/payment connectors with sandbox credentials.', 'task', '15d', '80h', 'Integration Eng', 52),
  (5, 'KYC case-management UAT scenarios', 'Execute AML alert and case lifecycle scenarios with Compliance testers.', 'task', '5d', '24h', 'Test Manager', 53),
  (6, 'Regulatory evidence pack assembly', 'Compile control evidence, test results, and policy attestations for go-live.', 'deliverable', '5d', '24h', 'Compliance Officer', 54),
  (7, 'Branch channel pilot readiness review', 'Confirm devices, SOPs, and trained staff for pilot branches.', 'review', '2d', '8h', 'Change Manager', 55)
) AS v(phase_num, aname, adesc, atype, dur, effort, resource, sort_order)
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = v.phase_num
WHERE t.industry_code = 'financial_services'
  AND NOT EXISTS (
    SELECT 1 FROM public.pmo_industry_template_activities a
    WHERE a.template_id = t.id AND a.activity_name = v.aname
  );

INSERT INTO public.pmo_industry_template_deliverables (
  template_id, phase_id, deliverable_name, deliverable_type, is_mandatory, sort_order
)
SELECT t.id, p.id, v.dname, 'document', true, v.sort_order
FROM public.pmo_industry_templates t
CROSS JOIN (VALUES
  (2, 'KYC/AML Requirements Specification', 20),
  (3, 'Core Banking Blueprint', 21),
  (6, 'Regulatory Go-Live Evidence Pack', 22),
  (7, 'Branch Rollout Readiness Checklist', 23)
) AS v(phase_num, dname, sort_order)
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = v.phase_num
WHERE t.industry_code = 'financial_services'
  AND NOT EXISTS (
    SELECT 1 FROM public.pmo_industry_template_deliverables d
    WHERE d.template_id = t.id AND d.deliverable_name = v.dname
  );

INSERT INTO public.pmo_industry_template_milestones (
  template_id, phase_id, milestone_name, milestone_description, sort_order
)
SELECT t.id, p.id, v.mname, v.mdesc, v.sort_order
FROM public.pmo_industry_templates t
CROSS JOIN (VALUES
  (4, 'CBS Configuration Baseline', $t$Core banking product parameters and environments are baselined for integration testing.$t$, 10),
  (7, 'Branch Pilot Complete', $t$Pilot branches successfully process live-like journeys with support metrics in tolerance.$t$, 11)
) AS v(phase_num, mname, mdesc, sort_order)
JOIN public.pmo_industry_template_phases p ON p.template_id = t.id AND p.phase_number = v.phase_num
WHERE t.industry_code = 'financial_services'
  AND NOT EXISTS (
    SELECT 1 FROM public.pmo_industry_template_milestones m
    WHERE m.template_id = t.id AND m.milestone_name = v.mname
  );

DO $$
BEGIN
  RAISE NOTICE 'v772_industry_template_content_enrichment.sql applied';
END $$;
