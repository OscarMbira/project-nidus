-- ============================================================================
-- v1482: Rich Project Mandates for SEED334-PRJ-01…10 (v1344, slice 2 seed)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md D6, A6, A7.
-- PRJ-08 already has a rich mandate (v1436). This adds one for each of the other nine, with
-- assumptions / known risks (v1481), three key deliverables and two dependencies each.
-- Status mix (A7): approved ×6 (01, 02, 03, 04, 05, 09), draft ×2 (06, 10), submitted ×1 (07).
-- Lists are JSON arrays (the edit form's format). mandate_reference is left blank so the
-- reference trigger assigns MAN-YYYY-NNN (rule 16.2); one INSERT per mandate (loop) so each row
-- gets its own number. A project that already has a mandate is skipped (one per project).
-- Created by the project's manager / owner. Fixed ids (prefix c1344a0…) keep it idempotent.
-- Prerequisites: v160, v1447 (mandate_dependencies), v1481.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT v.*, p.id AS project_id, p.project_name,
           COALESCE(p.project_manager_user_id, p.owner_user_id) AS author
    FROM (VALUES
      (1, 'SEED334-PRJ-01', 'approved', 'Close the remaining PCI-DSS gaps across card channels',
       'Make card-present and e-commerce channels fully PCI-DSS compliant before the next QSA assessment.',
       'Chief Risk Officer, under the Board Risk Committee',
       'The last QSA review left 14 open findings across tokenisation, logging and segmentation. Card schemes can fine the bank and restrict acquiring if they stay open past the deadline.',
       'Close all 14 QSA findings|Pass the retest with no new high findings|Cut cardholder-data scope by 40%',
       'Tokenisation for e-commerce|Network segmentation of the card zone|Central security logging|Evidence pack for the QSA',
       'Replacing the card switch|ATM fleet upgrade',
       'Must pass the QSA retest by 30 September 2026|Budget of 610,000|No outage of card authorisation',
       'The QSA retest date does not move|The tokenisation vendor contract is renewed',
       'Logging tool cannot cover legacy terminals|Change freeze over the festive peak',
       'Card switch|Payment gateway|Security operations centre',
       'Zero cardholder data in clear text outside the card zone; every control evidenced.',
       'balanced',
       'Avoids scheme fines of up to 1.2m a year and protects acquiring income; one-off cost 610,000.',
       'Farai Ndlovu', 'Grace Chikore',
       'Tokenisation service~Replace stored card numbers with tokens~June 2026|Segmented card network~Firewall zones around card systems~July 2026|QSA evidence pack~Evidence for each requirement~September 2026',
       'external~QSA availability for the retest window|internal~Network team firewall upgrade'),
      (2, 'SEED334-PRJ-02', 'approved', 'Field technician app MVP',
       'Give field technicians an offline app for work orders, parts and customer sign-off.',
       'Operations Director, Field Services',
       'Technicians still print work orders and re-key them at the depot. Jobs close two days late on average and parts usage is under-recorded.',
       'Close jobs the same day|Record 95% of parts used|Remove paper work orders',
       'Android app with offline sync|Work order and parts screens|Customer e-signature|Back-office sync service',
       'iOS version|Scheduling changes',
       'MVP live by 31 August 2026|Budget of 380,000|Works with no signal for a full shift',
       'Technicians keep company Android phones|The work order API is stable',
       'Sync conflicts when two people edit a job|Poor coverage in rural areas',
       'Work order system|Inventory system|Customer portal',
       'App opens in under 3 seconds; no lost jobs after sync.',
       'quality',
       'Saves about 2,800 technician hours a year and improves billing of parts.',
       'Tendai Moyo', 'Ruth Banda',
       'Technician app~Offline work orders and parts~July 2026|Sync service~Two-way sync with conflict rules~July 2026|Pilot report~Results from two depots~August 2026',
       'internal~Work order API version 2|external~Mobile device management vendor'),
      (3, 'SEED334-PRJ-03', 'approved', 'Edge analytics for solar assets',
       'Forecast production dips and warranty claims from inverter and weather data.',
       'Head of Renewable Assets',
       'Solar sites lose about 4% of output to faults that are found late. Warranty claims are missed because evidence is not kept.',
       'Spot faults within 24 hours|Recover 2% lost output|File every eligible warranty claim',
       'Edge data collection on 12 sites|Forecast model|Alerts to site technicians|Warranty evidence store',
       'New panels or inverters|Wind sites',
       'Budget of 520,000|Must use existing site connectivity|Pilot on 12 sites first',
       'Inverter vendors share data formats|Weather feed contract is renewed',
       'Patchy site connectivity|Model accuracy in the rainy season',
       'Inverter monitoring|Weather data provider|Maintenance system',
       'Forecast error under 8%; alerts reach technicians within 15 minutes.',
       'balanced',
       'Recovered output worth about 900,000 a year at full rollout.',
       'Chipo Mutasa', 'Peter Nkomo',
       'Edge collectors~Data collection boxes on 12 sites~May 2026|Forecast model~Production and fault forecasting~July 2026|Alert service~Alerts to site technicians~August 2026',
       'external~Inverter vendor data access agreement|internal~Maintenance system interface'),
      (4, 'SEED334-PRJ-04', 'approved', 'Ambulatory intake digitisation',
       'Replace paper triage in outpatient clinics with tablet intake and digital records.',
       'Chief Medical Officer',
       'Clinics triage on paper and re-key forms later. Waiting times average 54 minutes and records arrive in the system a day late.',
       'Cut average waiting time by 20 minutes|Records available within 5 minutes|Remove paper triage forms',
       'Tablet intake app|Triage workflow|FHIR interface to the patient record|Waiting room dashboard',
       'Inpatient wards|Billing changes',
       'Must meet patient-data rules|Budget of 450,000|Clinics stay open during rollout',
       'Clinics get Wi-Fi upgrades on time|Nurses are released for training',
       'Clinical staff resistance|Interface delays from the record vendor',
       'Patient record system|Appointment booking|Clinic Wi-Fi',
       'No lost patient data; triage screens usable with gloves.',
       'quality',
       'Saves about 6,000 nurse hours a year and improves patient experience scores.',
       'Dr. Nyasha Gumbo', 'Linda Chari',
       'Intake app~Tablet triage for clinics~June 2026|FHIR interface~Link to the patient record~July 2026|Waiting room dashboard~Live queue for clinic managers~August 2026',
       'external~Patient record vendor interface work|internal~Clinic Wi-Fi upgrade'),
      (5, 'SEED334-PRJ-05', 'approved', 'Finance ERP cutover',
       'Move general ledger, payables and fixed assets to the new ERP with a safe cutover.',
       'Chief Financial Officer',
       'The old finance system is out of support from next year. Month-end close takes eight working days.',
       'Close the month in five days|Retire the old finance system|Clean audit trail from day one',
       'General ledger|Accounts payable|Fixed assets|Parallel run and cutover weekend',
       'Payroll|Procurement module',
       'Cutover over a quarter-end weekend|Budget of 980,000|Auditors must sign off the trial balance',
       'Chart of accounts is approved by March|Vendor consultants available as booked',
       'Data quality of supplier records|Key finance staff also on year-end',
       'Banking platform|Payroll|Reporting warehouse',
       'Trial balance matches to the cent after migration.',
       'quality',
       'Removes 300,000 a year of support costs and speeds up month-end close.',
       'Simbarashe Dube', 'Agnes Phiri',
       'Migrated ledger~Opening balances and history~September 2026|Payables module~Supplier invoices and payments~September 2026|Cutover runbook~Step-by-step cutover plan~August 2026',
       'external~ERP vendor implementation partner|internal~Bank statement interface'),
      (6, 'SEED334-PRJ-06', 'draft', 'API gateway and rate limiting',
       'Put partner traffic behind one gateway with OAuth2, mutual TLS and burst protection.',
       'Chief Technology Officer',
       'Partners call 40 services directly. A traffic spike last year took the payments API down for two hours.',
       'All partner traffic through the gateway|No outage from traffic spikes|Partner onboarding in one week',
       'API gateway|OAuth2 authorisation server|Rate-limit policies|Developer portal',
       'Internal service mesh|Legacy batch interfaces',
       'Budget of 340,000|No partner downtime during migration',
       'Partners accept new credentials|Gateway licences approved',
       'Partners slow to migrate|Certificate management gaps',
       'Payments API|Customer API|Identity provider',
       'Gateway adds less than 20 ms; 99.95% availability.',
       'time',
       'Avoids outage costs and halves partner onboarding effort.',
       'Kudakwashe Sibanda', 'Brian Mlambo',
       'API gateway~Managed gateway for partner traffic~July 2026|Developer portal~Self-service partner onboarding~September 2026|Rate-limit policies~Protection per partner and API~July 2026',
       'external~Partner credential migration|internal~Identity provider upgrade'),
      (7, 'SEED334-PRJ-07', 'submitted', 'LMS and SIS integration for Cedar Trust schools',
       'Single sign-on for teachers, grade pass-back and a parent portal across the trust.',
       'Trust Director of Education',
       'Teachers keep marks in two systems and parents get reports by email. Data sits in three regions.',
       'One login for teachers|Grades flow to the SIS automatically|Parents see progress online',
       'Single sign-on|Grade pass-back|Parent portal|Regional data residency',
       'New timetabling system|Exam board submissions',
       'Live before the September term|Budget of 260,000|Data stays in its region',
       'Schools release teachers for training|SIS vendor supports the API',
       'Term-start load on systems|Parent sign-up rates',
       'Learning platform|Student information system|Identity service',
       'Grade sync within 15 minutes; no data leaves its region.',
       'balanced',
       'Saves about 3 hours a week per teacher and improves parent engagement.',
       'Mrs. Rudo Marufu', 'Thomas Gwatidzo',
       'Single sign-on~One login for all teachers~June 2026|Grade pass-back~Marks sync to the SIS~August 2026|Parent portal~Progress and reports online~August 2026',
       'external~SIS vendor API access|internal~Regional identity tenants'),
      (9, 'SEED334-PRJ-09', 'approved', 'SOC playbook automation',
       'Convert detection rules to automated playbooks for tier-1 triage.',
       'Chief Information Security Officer',
       'Tier-1 analysts handle 1,200 alerts a day by hand; mean time to respond is 4 hours.',
       'Cut mean time to respond to under 1 hour|Automate 60% of tier-1 alerts|Executive dashboard for incidents',
       'SOAR platform|20 core playbooks|Case management integration|Executive dashboard',
       'Threat hunting service|Endpoint replacement',
       'Budget of 470,000|Meets government security rules|24x7 service kept during rollout',
       'SIEM rules are current|Analysts available for playbook design',
       'False positives automated by mistake|Skills gap in automation',
       'SIEM|Ticketing system|Identity provider',
       'Every automated action logged and reversible.',
       'quality',
       'Equivalent of 6 analyst posts freed for higher-value work.',
       'Col. (Rtd) James Mutizwa', 'Esther Nyoni',
       'SOAR platform~Automation and orchestration~June 2026|Core playbooks~20 tier-1 playbooks~August 2026|Incident dashboard~Executive view of incidents~September 2026',
       'internal~SIEM rule clean-up|external~SOAR vendor professional services'),
      (10, 'SEED334-PRJ-10', 'draft', 'Claims straight-through processing',
       'Automate low-value claims with a rules engine and human review for fraud signals.',
       'Chief Operating Officer, Claims',
       'Every claim is reviewed by hand. Low-value claims take 9 days to pay and complaints are rising.',
       'Pay 70% of low-value claims within 24 hours|Keep fraud losses flat|Cut complaints by 30%',
       'Rules engine|Fraud scoring|Claimant notifications|Regulatory letter templates',
       'Large and complex claims|Policy administration changes',
       'Must meet insurance regulator rules|Budget of 560,000|Phased by claim type',
       'Fraud model is approved by risk|Policy data is complete',
       'Fraud slipping through automation|Regulator review of automated decisions',
       'Policy system|Payments|Fraud scoring service',
       'Every automated decision explainable to the regulator.',
       'balanced',
       'Saves about 1.1m a year in handling cost and improves retention.',
       'Mr. Tafadzwa Chirwa', 'Memory Zulu',
       'Rules engine~Automated decisions for low-value claims~August 2026|Fraud scoring~Risk score on every claim~August 2026|Notifications~Claimant updates by SMS and email~September 2026',
       'internal~Policy data clean-up|external~Regulator notification of automated decisions')
    ) AS v(idx, project_code, status, title, purpose, authority, background, objectives, scope, exclusions,
           constraints_list, assumptions_list, risks_list, interfaces, quality, quality_priority, outline_case,
           exec_name, pm_name, deliverables, dependencies)
    JOIN public.projects p ON p.project_code = v.project_code AND COALESCE(p.is_deleted, FALSE) = FALSE
    WHERE NOT EXISTS (SELECT 1 FROM public.project_mandates m WHERE m.project_id = p.id AND COALESCE(m.is_deleted, FALSE) = FALSE)
      AND NOT EXISTS (SELECT 1 FROM public.project_mandates m
                      WHERE m.id = ('c1344a01-0000-4000-8000-' || lpad(v.idx::text, 12, '0'))::uuid)
  LOOP
    INSERT INTO public.project_mandates (
      id, project_id, mandate_reference, mandate_title, document_status, version_number, created_date,
      purpose, authority_responsible, background, is_standalone, project_objectives, scope, scope_exclusions,
      constraints, assumptions, outline_risks, interfaces, quality_expectations, quality_priority, outline_business_case,
      proposed_executive_name, proposed_pm_name, project_code, project_name, created_by, updated_by)
    VALUES (
      ('c1344a01-0000-4000-8000-' || lpad(r.idx::text, 12, '0'))::uuid, r.project_id, '', r.title, r.status, '1.0', CURRENT_DATE - 120,
      r.purpose, to_jsonb(ARRAY[r.authority])::text, r.background, TRUE,
      to_jsonb(string_to_array(r.objectives, '|'))::text, to_jsonb(string_to_array(r.scope, '|'))::text,
      to_jsonb(string_to_array(r.exclusions, '|'))::text, to_jsonb(string_to_array(r.constraints_list, '|'))::text,
      to_jsonb(string_to_array(r.assumptions_list, '|'))::text, to_jsonb(string_to_array(r.risks_list, '|'))::text,
      to_jsonb(string_to_array(r.interfaces, '|'))::text, to_jsonb(ARRAY[r.quality])::text, r.quality_priority, r.outline_case,
      r.exec_name, r.pm_name, r.project_code, r.project_name, r.author, r.author);

    INSERT INTO public.mandate_deliverables (id, mandate_id, deliverable_name, deliverable_description, is_in_scope, is_major_deliverable, estimated_completion, display_order, created_by)
    SELECT ('c1344a02-0000-4000-8000-' || lpad((r.idx * 10 + d.ord)::text, 12, '0'))::uuid,
           ('c1344a01-0000-4000-8000-' || lpad(r.idx::text, 12, '0'))::uuid,
           split_part(d.item, '~', 1), split_part(d.item, '~', 2), TRUE, TRUE, split_part(d.item, '~', 3), d.ord::int, r.author
    FROM unnest(string_to_array(r.deliverables, '|')) WITH ORDINALITY AS d(item, ord)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.mandate_dependencies (id, mandate_id, dependency_type, dependency_description, impact_during_project, impact_after_implementation, dependency_status, display_order, created_by)
    SELECT ('c1344a03-0000-4000-8000-' || lpad((r.idx * 10 + d.ord)::text, 12, '0'))::uuid,
           ('c1344a01-0000-4000-8000-' || lpad(r.idx::text, 12, '0'))::uuid,
           split_part(d.item, '~', 1), split_part(d.item, '~', 2), TRUE, d.ord = 1, CASE WHEN d.ord = 1 THEN 'managed' ELSE 'analysed' END,
           d.ord::int, r.author
    FROM unnest(string_to_array(r.dependencies, '|')) WITH ORDINALITY AS d(item, ord)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;

-- PRJ-08 (v1436) gets assumptions and known risks too.
UPDATE public.project_mandates
SET assumptions = COALESCE(assumptions, '["The order system API upgrade lands in March","Drivers keep company phones"]'),
    outline_risks = COALESCE(outline_risks, '["Tracker feed gaps on rural routes","Driver pushback on new route sequences"]')
WHERE id = 'c1436001-0000-4000-8000-000000000001';

-- Check: one mandate per demo project, with children.
SELECT p.project_code, m.mandate_reference, m.document_status,
       (SELECT count(*) FROM public.mandate_deliverables d WHERE d.mandate_id = m.id AND COALESCE(d.is_deleted, FALSE) = FALSE) AS deliverables,
       (SELECT count(*) FROM public.mandate_dependencies x WHERE x.mandate_id = m.id) AS dependencies
FROM public.projects p
LEFT JOIN public.project_mandates m ON m.project_id = p.id AND COALESCE(m.is_deleted, FALSE) = FALSE
WHERE p.project_code LIKE 'SEED334-PRJ-%' AND p.project_code <= 'SEED334-PRJ-10'
ORDER BY p.project_code;
