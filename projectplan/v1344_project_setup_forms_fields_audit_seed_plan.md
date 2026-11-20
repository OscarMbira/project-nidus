# v1344 — Project Setup forms: fields, Audit, seeds — Implementation plan

**PRD:** `projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md` (decisions + amendments A1–A10, confirmed 2026-11-15)
**Status:** Rewritten after the audit (2026-11-15) — awaiting owner approval before coding.
**Apps:** Platform + Simulator practice pages (rule 34.1). Admin: an ID Generation rule only if a new identifiable column appears (rule 16.2; none expected).
**SQL:** list `SQL/` and take max + 1 before every new file (rule 18.0). The next free number at rewrite is **v1477** (v1471–v1476 are used by v1343). The owner runs all SQL.

---

## 1. Audit findings (2026-11-15) and how they are resolved

| # | Gap | Resolution |
|---|---|---|
| 1 | SQL numbers v1471+ taken (v1343) | Numbering restarts at v1477 (A10) |
| 2 | Project Details would duplicate the project wizard (dates, Executive, authorities, methodology, tolerances, budget, ratings) | Read-only summary + Edit into the wizard (A1) |
| 3 | Changing the PM grants full PM rights (v1472) | PM editable in the wizard by PMO / org admins only, enforced in SQL (A2) |
| 4 | No SEED334 project has an industry, so Delivery Overview / industry samples are invisible (D18) | The seed tags PRJ-01…10, PRJ-08 = IT (A6) |
| 5 | Sponsor ambiguous (`sponsor_user_id` unused vs `executive_user_id`) | Sponsor = Executive (A3) |
| 6 | Brief milestones would duplicate the Business Case list / Milestones register | Brief lists the Milestones register (A5) |
| 7 | Simulator seeding undefined | One demo practice project, owned by the demo org's Account Owner (A8) |
| 8 | PRD decisions unconfirmed | Interview done (A1–A10) |
| 9 | Rules 52 / 16.1 / 69 / 53 / 66 / 37 missing from slices | Added to every form slice (A9) |
| 10 | Seed approval status undefined | Realistic mix (A7) |
| 11 | Health edit / read unclear | Read-only (A4) |
| 12 | Slice 7 out of date (PA role, invite rules) | Updated (A10) |
| 13 | Mandate ↔ project link | Verified: `project_mandates.project_id` (v1436 uses it). No decision needed |
| 14 | Projects UPDATE needs owner / admin access (v1059) | Unchanged. Project Details is read-only; the wizard keeps its existing save path |

## 2. Facts from the codebase

- **Project wizard** (`ProjectsEdit.jsx` + `@nidus/shared/utils/projectWizardFormUtils`) writes: `planned_start_date`, `planned_end_date`, `executive_user_id`/name, funding / approving authority, benefit owner, delivery methodology / track, lifecycle template, stage model, tolerances (time, cost, scope, quality, risk, benefits), budget (currency, type, amount, approval status), ratings (risk, complexity, delivery complexity, regulatory impact, data sensitivity), effort, skills, vendors, status, type, industries.
  - Not in the wizard: `priority`, `project_manager_user_id`, `health_status` (read-only, A4).
  - The wizard has no tab deep link (`activeTab` is local state).
- **Project Details** (`apps/platform/src/pages/projectSetup/ProjectDetailsPage.jsx`, `projectDetailsService.FIELDS`): name, code, description, objectives, success criteria, classification, delivery methodology, billing type, status, currency. Platform only.
- **Brief:** `project_briefs` has no milestones. The Business Case has `key_milestones` (multi-line). The Milestones register is `project_milestones` (also captured in the wizard, v1009).
- **BRP view** has no Audit tab: Platform `components/benefits/BenefitsReviewPlanView.jsx`, Simulator `PracticeBenefitsReviewPlanViewPage.jsx`.
- **Simulator routed pages:**
  - `simulator/mandates/*`
  - `simulator/pm/initiation/{project-brief, project-charter, business-case, pid, benefits-review-plan}`
  - `simulator/practice-briefs/*`
  - `simulator/practice-benefits-review-plans/*`

  Confirm each component is mounted in `simulatorRoutes.jsx` before editing (dead-tree lesson).
- **Seeds:**
  - `v1436` rich set on PRJ-08 only (mandate, deliverables / dependencies, brief, business case + options / benefits, 10 contacts);
  - `v834` thin documents, one per project;
  - `v1355` 10 ICT Delivery Overview rows on PRJ-08;
  - `v1079` 2 teams, `v1089` RACI on PRJ-08;
  - `v334` 30 SEED334 projects.

## 3. Slices (tracer bullets)

### Slice 0 — Seed foundations (SQL)
- [x] `v1477` (written as **v1479**): tag SEED334-PRJ-01…10 with industries (`project_industries` + primary on `projects.industry_category_id`), drawn from the owning organisation's `account_industries`. PRJ-08 = Information Technology; the others are spread over the organisation's industries. Idempotent; projects outside the ten are untouched.
- [x] A check query: the ten projects, their industries, and current document counts per type (baseline for the seeds).

### Slice 1 — Project Details summary + wizard (Platform)
- [x] `ProjectDetailsPage.jsx` becomes **read-only tabs**: Overview · Objectives & Success · Classification & Delivery · Dates & People · Audit details (`DetailAuditTabList` `tabs`).
  - Fields: the wizard's fields above, plus Priority, Project Manager, "Executive (Sponsor)", Health (read-only), Status, Industries.
- [x] An **Edit** button per tab opens `/platform/projects/<project_code>/edit?tab=<wizard tab>` (rule 16.1 friendly key).
- [x] Wizard: honours `?tab=`. Gains **Priority** (existing column; options from the existing priority lookup, no hard-coded list — check `priority` values in use first). Gains **Project Manager** (searchable person picker, rule 69), shown read-only unless the user is PMO / org admin.
- [x] SQL `v1478` (written as **v1480**, with the `project_attribute_options` lookup): a guard trigger on `projects` refuses a change of `project_manager_user_id` unless the caller is an organisation admin (`project_user_is_org_admin`, v1472) or the service role. The change is written to the existing project audit trail.
- [x] The Objectives / Success Criteria inline editing currently on Project Details moves to the wizard's matching tab (the wizard already has them — confirm and remove the duplicate).
- [x] Rules: theme, unsaved guard (52, the wizard), performance (66: one parallel load). Success modal on the wizard save not adopted this time (opportunistic, existing save flow kept).
- [x] Tests: summary renders each tab from a fixture; Edit links carry the right `tab`; wizard opens on `?tab=`; PM picker disabled for non-admins.
- [x] No Simulator Project Details page (D9 / A8).

### Slice 2 — Project Mandate (Platform + Simulator)
- [x] Census edit vs view vs columns. Edit form tabs: Purpose · Scope · People · Outline Case · Deliverables & Dependencies · Approval · Audit, using existing columns (`purpose`, `background`, `outline_business_case`, `scope_exclusions`, `interfaces`, quality fields, proposed executive / PM).
- [x] ALTER only for a proven gap (D7).
- [x] Person pickers searchable (69), unsaved guard (52), Display IDs in URLs (16.1). Rule 53 field lock: not applicable (mandates use `document_status`, not the record lifecycle). No hold / draft queue exists for mandates.
- [x] Simulator mandate pages: same tabs / Audit.
- [x] Seed `v1482_seed334_rich_mandates` (+ `v1481` assumptions / outline risks columns, both schemas): PRJ-01…10 (fill / upsert; v1436's PRJ-08 row kept), with deliverables and dependencies. Status mix (A7). Blank display IDs (16.2).
- [x] Tests: field round-trip in the service (if extracted), tab presence, Audit placeholder on create.

### Slice 3 — Brief / Charter (Platform + Simulator)
- [x] Confirm the Charter alias (v1070), no second table.
- [x] **Milestones tab** = read-only list from the Milestones register (`milestones`, not `project_milestones`) for the project, with a "Manage milestones" link (A5). Included in the Brief export (38.1 table).
- [x] Surface hidden low-risk schema fields (census).
- [x] Rules 52 / 53 / 69 / 16.1 / 66.
- [x] Simulator: the practice brief pages get the same tabs; milestones from the practice milestones table.
- [x] Seed: rich Briefs for PRJ-01…10, plus milestones for those projects where the register is empty. Status mix.

### Slice 4 — Business Case (Platform + Simulator)
- [x] Gap-fill unused cost / funding columns that matter (census). Keep tabs. Verify Audit on view and form.
- [x] Rules as above.
- [x] Seed: rich BCs + options / benefits for PRJ-01…10. Status mix. Simulator parity.

### Slice 5 — PID (Platform + Simulator)
- [x] Expose missing approach / board-role fields if the columns exist.
- [x] Rules as above.
- [x] Seed: PIDs for PRJ-01…10 with non-empty child sections. Status mix.
- [x] Simulator PID view parity done. No Simulator PID edit page added (not blocking); the practice PID view's existing Edit button points at a route that does not exist yet — logged as a follow-up.

### Slice 6 — Benefits Review Plan (Platform + Simulator)
- [x] **Audit tab on the BRP view**, both apps (Identity / Classification / Record history).
- [x] Gap-fill form fields (Business Case link, governance) if the columns exist.
- [x] Rules as above.
- [x] Seed: BRP + schedule / coverage children for PRJ-01…10. Status mix.

### Slice 7 — Project Team (targeted)
- [x] Contacts: ≥ 10 on at least one more of the ten projects (PRJ-08 already has 10).
- [x] Teams / members: ≥ 3 teams with members across the ten. Memberships seeded with roles a PM could assign (v1472 rules), no governance roles from non-admins.
- [x] RACI: ≥ 10 rows or one complete matrix (extend v1089).
- [x] Project Administrator functional role: **dropped** (exists since v1343).
- [x] Audit tabs on any team record form amended here: none amended (seed-only slice).

### Slice 8 — Delivery Overview (register)
- [x] After slice 0 tagging, confirm PRJ-08's 10 ICT rows show (to verify once `v1479` is run; no code change needed). Add samples for other tagged industries' Delivery Overview registers only if a demo project needs them (≥ 10 total is already met).
- [x] Field gap-fill via register SQL only for a clear best-practice gap; no Core duplicate page. None needed.

### Slice 9 — Simulator demo practice project (A8)
- [x] Seed one practice project ("Demo practice project — initiation pack") owned by the Account Owner of the organisation that owns SEED334. Looked up in SQL, no names or emails in files.
- [x] Full rich Mandate, Brief, Business Case, PID and BRP (+ children) in `sim.*`. Status mix. Idempotent (fixed hex UUIDs, checked free first).

### Slice 10 — Docs, audit refresh, review
- [x] Update `Documentation/Core_PM_Fields_and_Sample_Data_Audit.md` (stale lines: Brief / BC Audit, Mandate samples).
- [x] Guide `Documentation/Project_Setup_Forms_Enrichment_v1344_Guide.md` (per form: tabs, where to edit, seeds, statuses).
- [x] REVIEW.md checks; retests (rule 43); Review section here.

## 4. SQL files (renumbered at write time from v1477)

| Purpose | Expected |
|---|---|
| Industry tagging of PRJ-01…10 + baseline counts | v1477 → **v1479** |
| Attribute options + PM-change guard on `projects` | v1478 → **v1480** |
| Mandate assumptions / outline risks columns (public + sim) | **v1481** |
| Rich mandates | **v1482** |
| Rich briefs + milestones | **v1483** |
| Rich business cases | **v1484** |
| Rich PIDs | **v1485** |
| Rich benefits review plans | **v1486** |
| Team / contacts / RACI top-up | **v1487** |
| Simulator demo practice project | **v1488** |

(v1477, v1478 and v1470 were taken by parallel sessions.)

## 5. Risks

| Risk | Mitigation |
|---|---|
| Moving Objectives / Success editing off Project Details surprises users | The Edit button sits on the same tab and opens the wizard on it; the guide explains |
| PM guard blocks a legitimate flow (project creation sets the PM) | The trigger allows INSERT and service-role / admin updates; the creation flow is tested |
| Industry tagging changes the demo sidebar | Only the ten SEED334 projects; documented; reversible (delete their `project_industries` rows) |
| Seeds collide with the owner's own edits on SEED334 | Upsert by project and fill nulls only; fixed UUID ranges checked free first |
| Awaiting-approval seeds lock forms during demos | Only one or two per type (A7) |
| Large scope | Slice-by-slice delivery with the owner running SQL per slice |

## Approval gate

**Do not start Slice 0 until the owner approves this plan.**

## Review

**Status:** code complete 15 Nov 2026. All SQL v1479–v1489 run successfully by the owner on 19 Nov 2026. Nothing committed yet.

### What changed
- **Project Details** is a read-only summary in five tabs (Overview, Objectives & Success, Classification & Delivery, Dates & People, Audit details), with an Edit button that opens the wizard on the matching tab (`?tab=`).
- **Project wizard** gains Objectives, Priority, Billing Type and Project Manager. Options come from the new `project_attribute_options` lookup (cached in sessionStorage, rule 66). Only PMO / organisation admins can change the PM; a database trigger enforces this and writes to the audit log.
- **Mandate:** tabbed edit form with Audit details, deliverables and dependencies, assumptions and outline risks (new columns in both schemas), quality priority as a list. Simulator mandate edit page mounted. Export includes the new sections.
- **Brief:** Milestones tab (Milestones register, read-only) in both apps, and in the brief export as a table (rule 38.1). Simulator practice brief edit page in tabs, view shows every field.
- **PID:** approach, monitoring and plan summary fields on the form; the Controls and Plans tabs show them. Simulator practice PID view shows every filled section.
- **Benefits Review Plan:** Details / Audit details tabs on the view, both apps.
- **Business Case:** no UI change needed.
- **Seeds:** industry tags and rich Mandate / Brief / BC / PID / BRP for SEED334-PRJ-01…10 with a realistic status mix; contacts, two teams and a RACI matrix; a Simulator demo practice project with a full initiation pack owned by the demo organisation's Account Owner.

### Tests (rule 43)
- New: `projectAttributeOptionsService` (3), `projectWizardFormUtils.v1344` (3), mandate export (+1), brief milestones export (+1), `MandateFieldTabs` (6), `ProjectMilestonesSummary` (2), `ProjectDetailsPage` (1). All pass.
- Suites: `@nidus/ui` 291/291, `@nidus/config` 160/160, `@nidus/shared` 1226/1232 — the 6 failures are pre-existing and unrelated (checkpointReportExport ×4, ianaTimezoneOptions, queryRouter).
- Lint: new and changed code clean; remaining errors in touched pages are pre-existing (checked against HEAD).

### REVIEW.md checks
- Theme-aware classes on all new UI (28.1); Platform–Simulator parity (34.1); no hard-coded option lists (25.1 — options from `project_attribute_options`); Display IDs left blank in seeds (16.2); no RLS bypass (42) — the PM guard is a trigger, seeds run as the owner in the SQL editor; no SELECT INTO / "into" wording in SQL (editor trap).
- New table `project_attribute_options` is registered in `database_tables`; re-run `SQL/v1251_planner_table_wall.sql` after `v1480`.

### Known limits / follow-ups
- ~~Simulator practice PID: no edit page.~~ **Done (follow-up, 19 Nov 2026):** `PracticePIDEdit.jsx` (Platform + Simulator copies) at `simulator/practice-pids/:id/edit`; helpers `@nidus/shared/utils/practicePidForm` (TEXT[] lists, JSONB plan summaries and tolerances); `practicePIDService` now writes the sign-in id to `created_by` / `updated_by` / `deleted_by` (they reference `auth.users`, v230) and leaves owner access to the v242 rule; the practice PID view no longer crashes on JSON plan summaries and its Edit button is relative. Tests: `practicePidForm` (4), `PracticePIDEdit` (3).
- Brief milestones are maintained in the Milestones register, not on the brief.
- Wizard save still uses its existing confirmation (success modal not adopted this time).
- Approvals History rows don't link, Simulator meeting follow-ups aren't project-filtered (from v1343, unchanged).

### SQL run order
v1479 → v1480 → re-run v1251 → v1481 → v1482 → v1483 → v1484 → v1485 → v1486 → v1487 → v1488 → v1489. Each ends with a check query.

### Fixes during the SQL run (19 Nov 2026)
- v1483: new briefs now insert a blank `brief_reference` (column is NOT NULL; the Admin trigger fills it).
- v1485: plan summaries are JSONB — written as JSON text; form, view (both apps) and PID export now show only text, so the `{}` column default no longer crashes the Plans tab.
- v1488: `sim.practice_projects` has no `created_by` / `updated_by`; removed.
- v1489 (new): `sim.practice_business_cases.case_reference` was missing in the live database (v262 never ran) although v756c's display-ID trigger needs it, so every Simulator business case save failed. Column restored, references filled, and a check for the same fault on other tables.
