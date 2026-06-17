-- =============================================================================
-- v702: Seed Data â€“ Change Register (6 change requests for EDP-2024)
-- Prerequisites: v696 (demo project must exist).
-- Covers: Scope changes, budget changes, schedule changes, off-specification fixes.
-- Roles served: pmo_admin, project_manager, project_sponsor, project_board_member
-- =============================================================================

DO $$
DECLARE
  v_project_id UUID;
  v_user_id    UUID;
BEGIN

  SELECT id INTO v_project_id
  FROM public.projects
  WHERE project_code = 'EDP-2024' AND COALESCE(is_deleted, false) = false LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v702: Demo project not found â€“ run v696 first. Skipping.';
    RETURN;
  END IF;

  SELECT id INTO v_user_id
  FROM public.users WHERE COALESCE(is_deleted, false) = false LIMIT 1;

  -- Set auth.uid() so audit triggers get a real user ID
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', (
      SELECT auth_user_id::text FROM public.users WHERE id = v_user_id AND auth_user_id IS NOT NULL LIMIT 1
    ))::text, true);


  INSERT INTO public.change_requests (
    id, project_id,
    change_reference, change_title, change_description,
    change_category, change_type,
    reason_for_change, current_situation, proposed_solution,
    priority, urgency, business_criticality,
    status,
    submission_date,
    requestor_name, requestor_organization,
    alternative_solutions, notes,
    submitted_by,
    is_deleted, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), v_project_id,
    c.ref, c.title, c.description,
    c.category, c.change_type,
    c.reason, c.current_situation, c.proposed_solution,
    c.priority, c.urgency, c.criticality,
    c.status,
    CURRENT_DATE - (c.submitted_days_ago || ' days')::interval,
    c.requestor_name, c.requestor_org,
    c.alternatives, c.notes,
    v_user_id,
    false, NOW(), NOW()
  FROM (VALUES
    ('EDP-CR-001',
     'Add Self-Service HR Portal to Programme Scope',
     'Request to include a self-service HR portal within the EDP-2024 programme scope. The portal would allow employees to view payslips, request leave, update personal details, and access the company handbook without requiring HR team intervention.',
     'scope', 'enhancement',
     'Group CEO announced an employee experience improvement initiative following the annual staff survey which rated HR service accessibility at 4.2/10. The HR Director has identified the portal as the highest-impact quick win.',
     'HR processes are entirely manual. Staff must email HR@company.com for all HR queries. Average response time is 3.2 days. HR team processes approximately 1,400 routine requests per month.',
     'Build a self-service HR portal integrated with the existing Workday HRIS system as a new workstream within EDP-2024. Deliver in Stage 4, running in parallel with field mobile deployment.',
     'medium', 'medium', 'medium',
     'pending_review',
     14,
     'Sarah Okonkwo', 'Human Resources Directorate',
     'Option B: Procure an off-the-shelf HR portal product (e.g. HiBob, Personio) with Workday integration â€“ estimated Â£65K, 6-week implementation. Option C: Defer to a standalone programme in next financial year.',
     'Requires Change Board review. Initial assessment: adds 14 weeks and Â£85K. Finance has indicated contingency headroom exists if Options B or C are rejected.'),

    ('EDP-CR-002',
     'Increase Project Contingency Reserve by Â£150,000',
     'Request to release an additional Â£150,000 contingency reserve to cover identified risks and current overspend on cloud infrastructure and vendor delays that have consumed the original Â£200K reserve.',
     'budget', 'remediation',
     'Original contingency of Â£200K is now 78% consumed following cloud provisioning delays, vendor SLA penalties, and test environment overspend. Remaining Â£44K is insufficient to cover RSK-001 (budget overrun risk, residual Â£80K exposure) and DEL-005 rework (Â£28K).',
     'Contingency reserve stands at Â£44K against an identified remaining risk exposure of Â£108K. Two active issues (ISS-002, ISS-008) add further financial risk.',
     'Release Â£150K additional contingency from the programme-level reserve, subject to Programme Board approval. Implement fortnightly financial reporting to Finance Director.',
     'high', 'high', 'high',
     'approved',
     30,
     'David Weatherspoon', 'Programme Management Office',
     'Option B: Reduce scope by deprioritising lower-priority features to stay within original budget. Option C: Request emergency supplementary budget from Board.',
     'Approved by Programme Board on Day -18. Conditions: fortnightly finance report to Finance Director; formal financial review at Stage 3 Gate.'),

    ('EDP-CR-003',
     'Extend Stage 3 Completion Date by 6 Weeks',
     'Request to extend the Stage 3 completion milestone by 6 weeks from the original date to accommodate the cumulative impact of DEL-001, DEL-004, and DEL-005. The revised Stage 3 completion date would be pushed back by 6 weeks.',
     'schedule', 'remediation',
     'Cumulative delays from cloud provisioning (DEL-001, 18 days), internal approval bottleneck (DEL-004, 14 days), and requirements rework (DEL-005, 20 days) total 52 working days â€“ equivalent to 10.5 weeks. The team has compressed the schedule by 4.5 weeks through parallel working.',
     'Stage 3 completion is 6 weeks behind baseline with no viable compression options remaining without unacceptable quality risk.',
     'Formally revise the Stage 3 completion milestone by 6 weeks. Update the integrated programme plan, re-assess Stage 4 start dependencies, and notify client stakeholders of the revised delivery timeline.',
     'high', 'medium', 'high',
     'approved',
     21,
     'Marcus Briggs', 'Programme Management',
     'Option B: Accept quality risk by skipping selected integration test scenarios to compress by 3 weeks (not recommended â€“ creates go-live risk).',
     'Approved by Programme Board. Client notified. SLA penalty review in progress â€“ contractual milestone missed; legal team assessing liability (estimate Â£25K-Â£40K penalty).'),

    ('EDP-CR-004',
     'Replace Legacy Report Builder with Power BI Embedded',
     'Request to replace the bespoke report builder module (originally scoped) with Power BI Embedded licences. The bespoke solution has been descoped internally due to Microsoft publishing a native Power BI Embedded integration that delivers 90% of required functionality.',
     'scope', 'simplification',
     'During Stage 2, Microsoft released a Power BI Embedded update that natively supports the real-time data refresh and drill-through requirements originally requiring a bespoke build. Building the bespoke module would cost Â£65K and take 10 weeks.',
     'Original scope includes a 10-week bespoke report builder development stream. The Power BI Embedded alternative delivers equivalent functionality in 3 weeks at Â£18K per annum licensing cost (vs Â£65K one-off build cost).',
     'Replace bespoke report builder module with Power BI Embedded integration. Save Â£47K in one-off development cost. Accept Â£18K per annum ongoing licence cost. Net saving over 3-year horizon: Â£47K - (Â£18K Ã— 3) = -Â£7K (break-even at 2.6 years). Time saving: 7 weeks.',
     'medium', 'low', 'medium',
     'approved',
     45,
     'Wei Zhang', 'Technical Architecture',
     'Option B: Proceed with bespoke report builder as originally scoped.',
     'Approved. One-off saving of Â£47K realised. Power BI licence added to operational cost register. 7-week schedule saving partially offsets DEL-005 impact.'),

    ('EDP-CR-005',
     'Add Two-Factor Authentication for Customer Portal Login',
     'Request to add mandatory two-factor authentication (2FA) for all customer portal logins. This was not in the original scope but has been identified as a requirement by the Information Security team following a revised cyber threat assessment.',
     'scope', 'compliance',
     'Information Security conducted a revised threat assessment in Stage 2 and identified that the customer portal login flow does not meet the updated internal security standard ISS-2024-03, which now requires 2FA for all customer-facing systems handling financial data.',
     'Customer portal login currently uses username/password only. Internal security policy ISS-2024-03 (updated 3 months ago) requires 2FA for financial data systems. Without 2FA, the portal will not pass internal security sign-off at Stage Gate 3.',
     'Implement TOTP-based 2FA using Auth0 MFA add-on (already licenced). Estimated effort: 3 weeks development, 1 week testing. Cost: zero additional licencing cost.',
     'high', 'high', 'critical',
     'approved',
     10,
     'Priya Nair', 'Information Security',
     'No viable alternatives â€“ security policy compliance is mandatory.',
     'Fast-tracked to Change Board emergency review. Approved in 3 days. Work commenced immediately. Delivery within current sprint cycle confirmed by Tech Lead.'),

    ('EDP-CR-006',
     'Remove Field Map Visualisation Module from Stage 3 Scope',
     'Request to defer the interactive field operations map visualisation module from Stage 3 to Stage 4, or potentially to a future programme. User research conducted in Stage 2 indicates low demand for this feature among field operatives.',
     'scope', 'descope',
     'UX research with 22 field operatives in Stage 2 found that only 3 of 22 (14%) would use the interactive map feature regularly. The feature was added to scope based on senior management assumption rather than user research. Development effort estimate is 8 weeks.',
     'Interactive map module is in Stage 3 scope. 8 weeks of development effort has been planned. User research indicates low adoption likelihood. Removing from scope would recover 8 developer-weeks for higher-priority rework.',
     'Remove interactive field map module from Stage 3 scope. Carry forward to a future programme backlog. Redeploy the 8 developer-weeks to complete DEL-005 rework and add buffer for integration testing.',
     'medium', 'medium', 'low',
     'approved',
     7,
     'Programme Manager', 'Programme Management Office',
     'Option B: Retain in scope and accept the UAT quality risk from compressed schedule.',
     'Approved. 8 developer-weeks recovered. Field operations team notified. Feature added to future programme backlog. Business case for future inclusion to be prepared by Operations team.')

  ) AS c(ref, title, description, category, change_type,
         reason, current_situation, proposed_solution,
         priority, urgency, criticality, status, submitted_days_ago,
         requestor_name, requestor_org, alternatives, notes)
  ON CONFLICT (change_reference) DO NOTHING;

  RAISE NOTICE 'v702: Change register seed complete for project %.', v_project_id;

END $$;
