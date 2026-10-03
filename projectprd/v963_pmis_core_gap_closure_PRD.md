# v963 — PMIS Core Gap Closure PRD

## a. Problem statement

This PRD originated from a user report that the sidebar's "Core Project Management" section
didn't match `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` Section 3 (the Generic/Core PM
menu). An audit of the codebase against that document found the opposite of what was assumed:
15 of 17 Section 3 areas already exist as real, DB-backed features, just organised under
different labels than the document's literal tree. The genuine gaps are narrower and more
concrete than "rebuild Core PM":

1. **Procurement is explicitly out of scope.** Vendor/Purchase Order/Contract/Invoice management
   belongs to a dedicated procurement or ERP system, not this PMIS — the user made this call
   explicitly and it overrides the initial framing below. The sidebar's existing "Procurement"
   section (Vendor Register, Purchase Requests, Purchase Orders, Contracts, Invoice Tracking —
   `/pmo/procurement/vendors|requests|orders|contracts|invoices`) still exists and is still a
   live bug today (all five routes render the same generic stub pointed at the `vendors` table —
   a user clicking "Purchase Orders" sees vendor data, not orders) but this PRD does not build the
   underlying feature. See decision d.2 for what happens to the existing broken sidebar entries.

2. **Five smaller Section 3 sub-items have no real feature behind them anywhere**: a standalone
   Assumptions Register (assumptions are only implicit inside Risk/Issue conversion dialogs
   today), a Project Calendar, a unified cross-entity Approvals register (approvals today are
   per-document-type — Mandate, Reports, Change), a transaction-style Cost Actuals ledger (cost
   tracking today is EVM-snapshot-based, not a ledger of actual costs/commitments), and an
   explicit Benefits Transition/Archive step at project closure.

3. **The investigation into the Procurement stub surfaced a systemic pattern**, not an isolated
   bug, once traced back to its source module. There
   is a whole module, `apps/platform/src/modules/pmis-gaps/` (mirrored in `apps/simulator/`),
   built entirely from one factory function (`createGapListPage()` →
   `apps/platform/src/modules/pmis-gaps/pages/gapPageFactory.jsx`) that produces a **read-only**
   list view — no create, no edit, no delete, no detail page — for whatever table it's pointed
   at. It currently covers 15 distinct features beyond Procurement (Automation
   Templates/Log, OKR, Custom Fields, Intake Forms, Client Portal, Recurring Tasks, RACI Matrix,
   Skills Matrix, Timesheet Approvals, Guest Access, Training Tracker, Notification Preferences,
   Project Clone, Scheduled Health Reports, Integrations Marketplace). Every one of these has a
   live sidebar entry and a live route today. A full codebase audit (see §g) found:
   - 9 of the 15 have **no real implementation anywhere** — the stub is the only thing that
     exists.
   - 5 of the 15 **overlap with a real, more complete feature that already exists elsewhere**, on
     a differently-shaped table (e.g. Custom Fields' stub duplicates the fully-built Local Data
     Extensions module; Timesheet Approvals' stub targets a period-level approval workflow while
     a real entry-level approval flow already exists).
   - 1 (Automation Log) points at a **table that doesn't exist at all**
     (`automation_rule_executions` — the real table is `automation_executions`) and errors at
     runtime.
   - Nearly every **Simulator-side route** for these features queries a `sim.*` table that was
     never created — the routes exist and are wired, but the underlying schema is missing.
   - The generic service layer (`gapDataService.js`) already ships `createGapRecord`/
     `updateGapRecord`/`deleteGapRecord`/`getGapRecord` helpers, generically, for any table — none
     of them are called by any UI. The read/write plumbing exists; only the UI wiring is missing.

## b. Solution

Close all of the above in one coordinated initiative, at the same standard the rest of the
Platform already holds new record-CRUD features to (rule 65 dedicated routed pages, rule 61
icon-only row actions, rules 40/41 sortable columns + Card/Table toggle, rule 63.1 Audit tab,
rule 16 success-confirmation modal, rule 52 unsaved-changes guard, rule 16.2 Admin ID Generation
for reference columns, rule 38 export menu, rule 28.1 theme-aware, rule 29/39 PWA, rule 34
Platform–Simulator parity):

1. **Procurement's broken stub is removed, not built out** — see decision d.2. Vendor/PO/
   Contract/Invoice management is left to a dedicated system outside this PMIS.
2. **The five smaller Core PM gaps**: Assumptions Register, Project Calendar, unified Approvals
   register, Cost Actuals ledger, Benefits Transition/Archive.
3. **The pmis-gaps module**: for each of the 14 remaining gap features (GAP-12 Procurement
   excluded per decision 1 above), either (a) build real CRUD on the existing schema, (b) remove
   the stub and redirect its sidebar link to the real feature that already covers the same ground,
   or (c) extend an existing real feature to also cover the gap's distinct angle — decided
   case-by-case below, per the user's explicit instruction not to apply one blanket rule.
4. **Platform–Simulator parity throughout**: every `sim.*` table gap identified in the audit gets
   built alongside its Platform counterpart, not as a fast-follow.

## c. User stories

### Five smaller Core PM gaps
1. As a Risk/Issue owner, I can maintain a standalone Assumptions Register per project
   (assumption, validation status, owner), separate from the existing risk/issue-conversion
   dialogs.
2. As a Project Manager, I can view/manage a Project Calendar (working days, holidays,
   exceptions) per project.
3. As an approver, I can see a unified Approvals register across entity types (not just
   per-document-type) showing pending/approved/rejected/history in one place.
4. As a PMO Admin, I can record Cost Actuals (actual costs, commitments, accruals) as a ledger
   of transactions per project, distinct from the existing EVM snapshot mechanism.
5. As a Project Manager closing a project, I can record a Benefits Transition step and mark the
   project Archived, both currently missing from the closure flow.

### pmis-gaps module — build real CRUD (9 pure stubs)
6–14. As a PMO Admin/Project Manager, I get real create/edit/delete/detail functionality
    (replacing the current read-only dump) for: OKR (Objectives, Key Results, Cycles), Intake
    Forms, Client Portal, Recurring Tasks, RACI Matrix, Guest Access, Training Tracker,
    Notification Preferences, and Project Clone — each on its existing `SQL/v643`–`v645` schema,
    with matching `sim.*` tables built where missing.

### pmis-gaps module — case-by-case (5 overlapping features)
15. Custom Fields: the sidebar stub is removed; its link redirects to the existing, fully-built
    Local Data Extensions module (`apps/platform/src/features/local-data-extensions/`) — no new
    build, this is pure redundancy removal.
16. Skills Matrix: the existing `resource_skills`/`ResourceSkills.jsx` feature (free-text,
    per-resource skill list) is a genuinely different data model from GAP-11's org-wide skill
    catalog + 1–5 competency matrix (`skill_catalog`/`member_skills`/`skill_requirements`/
    `skill_endorsements`). Build the org-wide catalog+matrix as a distinct feature; leave the
    existing per-resource list untouched.
17. Timesheet Approvals: the existing entry-level approve/reject flow
    (`TeamTimesheetsPage.jsx`/`timesheetService.js` on `timesheet_entries`) stays as-is. Build the
    period-level `timesheets`/`timesheet_approvals`/`timesheet_approval_settings` schema as a
    distinct, additional weekly-submission-and-approval workflow that sits above entry-level
    approval (per the schema's own design — v644 adds a `timesheet_id` FK on
    `timesheet_entries`).
18. Scheduled Health Reports: the existing `ScheduledReports.jsx`/`scheduled_reports` generic
    report-template scheduler stays as-is. Build `scheduled_health_reports` as its own, narrower
    project-health-specific scheduler, since it is a materially different table/scope (not a
    superset or subset of the generic one).
19. Integrations Marketplace: the existing `Integrations.jsx`/`integrations` "configured
    connectors" feature stays as-is. Build `integration_catalog`/`integration_connections` as a
    complementary marketplace/discovery layer users browse *before* configuring a connector via
    the existing feature — not a replacement.

### Fix broken references
20. GAP-01's Automation Execution Log stub is repointed from the nonexistent
    `automation_rule_executions` to the real `automation_executions` table (or built out properly
    against it), so the page stops erroring at runtime.
21. Every Simulator route currently querying a `sim.*` table that doesn't exist gets that table
    built (see item d.4 — full list in §g).

### Procurement stub removal
22. As a user, I no longer see "Procurement" sidebar entries that lead to broken/misleading pages
    (see decision d.2 for the exact removal mechanics).

## d. Implementation decisions (already settled)

1. **Section 3 of the taxonomy doc was reference material for v946, not a build target** — this
   PRD is scoped to concrete, audited gaps only, not a literal rebuild of the generic PM menu
   tree.
2. **Procurement is removed, not built** — explicit user decision: "Remove all the Procurement
   features. That should be done outside the PMIS system." The existing broken sidebar section
   (`pmo_section_procurement_mgmt` parent + `pmo_procurement_vendors/requests/orders/contracts/
   invoices` children, all currently rendering the same wrong-table stub) is deactivated
   (`is_visible = FALSE`/`is_active = FALSE`, not hard-deleted, consistent with how other
   sidebar rows are retired elsewhere in this codebase) so users stop encountering a link that
   silently shows wrong data. The five `VendorsPage`/route entries in `PmisGapRoutes.jsx` for
   `pmo/procurement/*` and `pm/procurement/*` are removed. The `vendors`, `purchase_requests`,
   `purchase_orders`, `purchase_order_lines`, `contracts`, `contract_milestones`,
   `vendor_ratings`, and `invoices` tables are left in place (no data-destructive migration) but
   unused by the frontend — a future, separate initiative can pick them up if procurement is ever
   brought in-scope. The existing standalone RFP feature is untouched either way.
3. **Cost Actuals is its own transaction ledger**, unrelated to vendor invoicing (which no longer
   exists in this PRD's scope) — it covers actual costs/commitments/accruals against a project's
   budget, vendor or not.
4. **Platform–Simulator parity is built together, not phased**, for every remaining item in this
   PRD — matching `sim.*` tables and Simulator UI ship alongside Platform in the same plan.
5. **The five smaller Core PM gaps build in one continuous pass** alongside the pmis-gaps work,
   not phased — consistent with how v946's 14 industries were built.
6. **The 9 pure-stub pmis-gaps features all get full CRUD built**, none deferred to a future PRD.
7. **The 5 overlapping pmis-gaps features are judged case-by-case** (see user stories 15–19), not
   under one blanket "always redirect" or "always build separately" rule.
8. **Existing `gapDataService.js` generic CRUD helpers are reused** where their generic shape
   fits, rather than writing bespoke per-table service functions from scratch — reduces
   duplicated boilerplate, consistent with the DB-driven, non-hardcoded approach already
   established in this codebase's recent work.

## e. Testing decisions

- Unit tests for every new/amended service function (create/update/delete/list), per rule 23.
- Each new table's RLS policies verified with a positive (same-account) and negative
  (cross-account) access check.
- Each fixed/rebuilt route manually verified to render the correct data (not another table's
  stub) before being marked complete — this is exactly the class of bug this PRD exists to fix,
  so regression here would be a direct contradiction of its own purpose.
- Simulator parity verified by loading the same feature in both apps side-by-side against
  seeded `sim` data.

## f. Out-of-scope items

- **Procurement in full** (Vendors, Purchase Requests, Purchase Orders, Contracts, Vendor
  Ratings, Invoices) — explicit user decision, belongs outside this PMIS (decision d.2). Only the
  removal of the existing broken stub/sidebar entries is in scope, not any replacement feature.
- RFP↔Vendor/Contract integration — moot now that Procurement itself is out of scope.
- Rebuilding "Core Project Management" to literally mirror Section 3's full tree structure
  (decision d.1) — only the concretely-audited gaps are in scope.
- GAP-26 through GAP-29 (unrelated Simulator-specific gaps already covered by
  `SQL/v646_pmis_gap_tables_simulator.sql`) — not touched by this PRD.
- Any admin/system-level "field-level change log" (old value → new value) — same exclusion as
  rule 63.1's Audit tab scope; metadata only.

## g. Further notes

**Full audit findings** (source of truth for the plan's phase breakdown):

| Gap | Table(s) | Verdict |
|---|---|---|
| Procurement (GAP-12) | vendors, purchase_requests, purchase_orders(+lines), contracts(+milestones), vendor_ratings, invoices | Out of scope — stub and sidebar entries removed, tables left unused, no replacement built |
| GAP-01 Automation Templates/Log | automation_rule_templates, automation_executions (was: nonexistent automation_rule_executions) | Rule CRUD real elsewhere (`Automation.jsx`); Templates/Log unbuilt, Log additionally broken |
| GAP-03 OKR | objectives, key_results, okr_cycles | Pure stub, no real impl anywhere |
| GAP-04 Custom Fields | custom_field_definitions | 100% redundant — real full-CRUD Local Data Extensions module exists, Platform+Simulator |
| GAP-06 Intake Forms | intake_forms(+fields/submissions) | Pure stub |
| GAP-07 Client Portal | client_portal_configs(+sections/guests/sessions) | Pure stub |
| GAP-08 Recurring Tasks | recurring_task_templates(+schedules/instances) | Pure stub; Sim routes point at nonexistent sim table |
| GAP-10 RACI Matrix | raci_matrices(+rows/assignments) | Pure stub; Sim routes (4) point at nonexistent sim table |
| GAP-11 Skills Matrix | skill_catalog, member_skills(+requirements/endorsements) | Partial — different `resource_skills` feature exists; this table's catalog+matrix concept unbuilt |
| GAP-13 Timesheet Approvals | timesheets, timesheet_approvals, timesheet_approval_settings | Partial — real entry-level approval exists on a different table/grain; period-level unbuilt |
| GAP-19 Guest Access | guest_collaborators(+tokens) | Pure stub |
| GAP-20 Training Tracker | training_certifications, member_training_records | Pure stub; Sim route points at nonexistent sim table |
| GAP-21 Notification Preferences | notification_preferences(+templates) | Pure stub; adjacent inbox/rules features don't cover this; Sim routes (5) broken |
| GAP-22 Project Clone | project_clone_jobs | Pure stub |
| GAP-23 Scheduled Health Reports | scheduled_health_reports(+runs) | Partial — different generic `scheduled_reports` feature exists; this table's project-health scope unbuilt |
| GAP-25 Integrations Marketplace | integration_catalog, integration_connections | Partial — different `integrations` "configured connectors" feature exists; catalog/marketplace concept unbuilt |

**Section g count for the five Core PM items**: Assumptions Register (1 new table) + Project
Calendar (1 new table) + unified Approvals register (1 new table) + Cost Actuals ledger (1 new
table, schema not yet designed) + Benefits Transition/Archive (extends existing closure tables,
not a new table).

**Scale note**: this PRD's total surface area (5 Core PM gaps + 14 pmis-gaps items, each needing
full CRUD, Audit tabs, Simulator parity, and in several cases new `sim` schema work) remains
substantial even with Procurement removed. The implementation plan should reflect this with
proportionate phasing and version numbering.
