-- ============================================================================
-- v1363: Sample data for the Technology Milestones form
-- ============================================================================
-- Fills the fields added in v1362 on the ten Northbridge milestones from v1355.
-- Dates and owners follow the descriptions already on those records and the
-- matching workstream sample. Existing keys win, so a value already entered
-- on a record is left as it is.
-- Access recertification moves from Upcoming to At Risk only while it is still
-- the untouched sample status: the security workstream is on hold and no
-- recertification date is agreed. Linked registers stay empty.
-- Idempotent. Prerequisite: v1355, v1362.
-- ============================================================================

UPDATE public.local_register_records AS r
SET field_values = v.seed::jsonb || COALESCE(r.field_values, '{}'::jsonb),
    status = CASE
      WHEN r.status = v.original_status AND v.new_status IS DISTINCT FROM v.original_status THEN v.new_status
      ELSE r.status
    END,
    updated_at = NOW()
FROM (VALUES
  ('00000000-0000-4000-a019-000000000001', 'met', 'met', $j${
    "planned_date": "2026-01-20",
    "owner": "Grace Moyo",
    "milestone_type": "decision",
    "workstream": "Programme",
    "forecast_date": "2026-01-20",
    "actual_date": "2026-01-20",
    "on_critical_path": true,
    "entry_criteria": "Programme scope is written\nCost and benefit are stated\nThe sponsor is named",
    "success_criteria": "The sponsor approves the business case\nFunding for the technology programme is confirmed\nThe decision is recorded",
    "evidence": "Business case approved on 20 January 2026\nSponsor: Grace Moyo",
    "dependencies": "Programme cost and benefit\tFinance\t2026-01-16\nSponsor review\tExecutive office\t2026-01-20",
    "impact_if_missed": "critical",
    "rag_status": "green"
  }$j$),
  ('00000000-0000-4000-a019-000000000002', 'met', 'met', $j${
    "planned_date": "2026-03-16",
    "owner": "Priya Naidoo",
    "milestone_type": "scope_baseline",
    "workstream": "Data migration and quality",
    "forecast_date": "2026-03-16",
    "actual_date": "2026-03-16",
    "on_critical_path": true,
    "entry_criteria": "Both legacy populations are listed\nThe file layout is drafted\nData owners are named",
    "success_criteria": "In-scope populations are signed\nThe file layout is signed\nOut-of-scope items are written down",
    "evidence": "Populations and the file layout were signed on 16 March 2026",
    "dependencies": "Population list from both legacy instances\tData migration and quality\t2026-03-09\nFile layout draft\tData migration and quality\t2026-03-13",
    "impact_if_missed": "critical",
    "rag_status": "green"
  }$j$),
  ('00000000-0000-4000-a019-000000000003', 'met', 'met', $j${
    "planned_date": "2026-09-12",
    "owner": "Priya Naidoo",
    "milestone_type": "test_exit",
    "workstream": "Data migration and quality",
    "forecast_date": "2026-10-04",
    "actual_date": "2026-10-04",
    "on_critical_path": true,
    "entry_criteria": "Extracts are taken after close of business\nTake-over accounts are open\nThe mock window is booked",
    "success_criteria": "Static and financial data both run\nThe rerun finishes\nDefects are logged",
    "evidence": "Mock 1 ran on 12–13 September 2026\nThe run overran by 9 hours\nIt was rerun on 3–4 October 2026",
    "dependencies": "Source extracts\tData migration and quality\t2026-09-11\nTake-over accounts opened\tFinance\t2026-09-11",
    "impact_if_missed": "critical",
    "rag_status": "green"
  }$j$),
  ('00000000-0000-4000-a019-000000000004', 'met', 'met', $j${
    "planned_date": "2026-09-28",
    "owner": "Olivia Banda",
    "milestone_type": "regulatory",
    "workstream": "Regulatory reporting",
    "forecast_date": "2026-09-28",
    "actual_date": "2026-09-28",
    "on_critical_path": false,
    "entry_criteria": "Report lines used in the last year are listed\nCurrency and company codes are mapped\nThe difference account is agreed",
    "success_criteria": "The financial controller signs version 1.1\nThe reporting workstream is closed\nThe reopen rule is in the pack",
    "evidence": "The financial controller signed mapping version 1.1 on 28 September 2026\nThe reporting workstream is closed",
    "dependencies": "Report-line list\tRegulatory reporting\t2026-09-14\nDifference account 14918\tFinance\t2026-09-21",
    "impact_if_missed": "medium",
    "rag_status": "green"
  }$j$),
  ('00000000-0000-4000-a019-000000000005', 'upcoming', 'upcoming', $j${
    "planned_date": "2026-11-14",
    "owner": "Priya Naidoo",
    "milestone_type": "test_entry",
    "workstream": "Data migration and quality",
    "forecast_date": "2026-11-21",
    "on_critical_path": true,
    "entry_criteria": "The open data-owner sign-off forms are issued\nCustomer and account extracts are ready\nMock 1 defects that block static data are closed",
    "success_criteria": "Static data, including customers and accounts, loads inside the window\nControl totals are taken\nThe data owners can review the result",
    "evidence": "Not yet run. Planned for 14 November 2026",
    "dependencies": "Data-owner sign-off forms issued\tData migration and quality\t2026-11-13\nCustomer and account extracts\tCustomer and digital channels\t2026-11-13",
    "impact_if_missed": "critical",
    "rag_status": "amber"
  }$j$),
  ('00000000-0000-4000-a019-000000000006', 'upcoming', 'upcoming', $j${
    "planned_date": "2027-02-02",
    "owner": "Brian Otieno",
    "milestone_type": "test_entry",
    "workstream": "Integration and interfaces",
    "forecast_date": "2027-02-16",
    "on_critical_path": true,
    "entry_criteria": "A test slot is booked for every in-scope interface\nCard status and the trial-balance file have slots\nInterface contracts are approved",
    "success_criteria": "All twelve interfaces enter system integration\nFailed messages are visible\nEach interface has a named owner",
    "evidence": "Not yet entered. Card status and the trial-balance file still have no test slot",
    "dependencies": "Test slot for card status\tEnvironments and release\t2027-01-18\nTest slot for the trial-balance file\tEnvironments and release\t2027-01-18",
    "impact_if_missed": "high",
    "rag_status": "amber"
  }$j$),
  ('00000000-0000-4000-a019-000000000007', 'upcoming', 'at_risk', $j${
    "planned_date": "2027-02-27",
    "owner": "Nadia Rahman",
    "milestone_type": "decision",
    "workstream": "Cybersecurity and access",
    "forecast_date": "2027-03-20",
    "on_critical_path": true,
    "entry_criteria": "A recertification date is agreed\nLine managers are named\nThe privileged-access list replaces the legacy draft",
    "success_criteria": "Every user to be loaded has a recertified entitlement\nLeavers are absent from the load\nThe security owner signs the result",
    "evidence": "No recertification date is in the plan. The security workstream stays on hold until a date is set",
    "dependencies": "Recertification date agreed\tCybersecurity and access\t2027-01-30\nLine-manager list confirmed\tCybersecurity and access\t2027-02-13",
    "impact_if_missed": "critical",
    "rag_status": "red"
  }$j$),
  ('00000000-0000-4000-a019-000000000008', 'upcoming', 'upcoming', $j${
    "planned_date": "2027-01-16",
    "owner": "Priya Naidoo",
    "milestone_type": "test_exit",
    "workstream": "Data migration and quality",
    "forecast_date": "2027-01-30",
    "on_critical_path": true,
    "entry_criteria": "Mock 2 static data is accepted\nTake-over and suspense accounts are open\nThe trial balance owner is named",
    "success_criteria": "Financial data reconciles\nTake-over and suspense accounts finish at zero\nControl totals tie to the trial balance",
    "evidence": "Not yet run. Mock 1 left the take-over accounts above zero",
    "dependencies": "Mock 2 static data accepted\tData migration and quality\t2026-11-21\nTake-over accounts at zero\tFinance\t2027-01-15",
    "impact_if_missed": "critical",
    "rag_status": "amber"
  }$j$),
  ('00000000-0000-4000-a019-000000000009', 'upcoming', 'upcoming', $j${
    "planned_date": "2027-03-06",
    "owner": "Priya Naidoo",
    "milestone_type": "rehearsal",
    "workstream": "Data migration and quality",
    "forecast_date": "2027-03-20",
    "on_critical_path": true,
    "entry_criteria": "The dress rehearsal environment is booked\nRollback is written as steps\nThe production runbook is ready to walk through",
    "success_criteria": "Freeze, load, reconciliation and rollback are rehearsed\nNo severity-1 defect stays open\nThe go/no-go pack can be assembled",
    "evidence": "Not yet run. The dress rehearsal environment is not booked",
    "dependencies": "Dress rehearsal environment booked\tEnvironments and release\t2027-02-13\nRollback steps written\tData migration and quality\t2027-02-20",
    "impact_if_missed": "critical",
    "rag_status": "amber"
  }$j$),
  ('00000000-0000-4000-a019-00000000000a', 'upcoming', 'upcoming', $j${
    "planned_date": "2027-05-10",
    "owner": "Linda Zhou",
    "milestone_type": "go_live",
    "workstream": "Operational readiness and hypercare",
    "forecast_date": "2027-05-24",
    "on_critical_path": true,
    "entry_criteria": "Cutover runs on the weekend of 10–12 April 2027\nNight-shift leads are named for week one of hypercare\nThe support model and runbooks have been walked through",
    "success_criteria": "Hypercare runs for four weeks\nExit criteria are met\nThe sponsor agrees the exit to business as usual",
    "evidence": "Not yet started. Support model, runbooks and the hypercare roster are not yet drafted",
    "dependencies": "Cutover weekend\tData migration and quality\t2027-04-12\nNight-shift leads for week one\tOperational readiness and hypercare\t2027-03-27",
    "impact_if_missed": "critical",
    "rag_status": "amber"
  }$j$)
) AS v(id, original_status, new_status, seed)
WHERE r.id = v.id::uuid;

NOTIFY pgrst, 'reload schema';
