# v982 Implementation Plan — Phase 2: Full PMO/Organisation Admin Configuration Zone

Implements Phase 2 of `projectprd/v982_saas_user_journey_account_pmo_delivery_PRD.md` (brief §10,
§13 Stage 2, §23-24). Depends on Phase 1 (registration branching + conditional PMO Admin grant)
being live — Phase 2 is where a PMO Admin, once they exist, actually configures something.

## Facts established during investigation (grounds every task below)

- **Methodology is already a real, working org-level setting** — `accounts.default_methodology`
  (`hybrid | structured | standards_based | agile`) + `allow_project_methodology_override`, admin
  UI `apps/platform/src/components/platform/OrganisationMethodologySettings.jsx`, consumed by
  `methodologyMenuUtils.js` / `MethodologySwitcher.jsx`. **Do not rebuild this** — brief §10's
  "Delivery Methodologies" sub-area is already delivered. This plan only needs to ensure it's
  reachable from the Phase 2 configuration landing page, not re-implemented.
- **Project templates already store phases/activities/deliverables/risks/milestones/roles**
  (`pmo_industry_templates` + 6 child tables, `SQL/v575_industry_template_tables.sql`), already
  read at project-creation time via `resolveEffectiveIndustryTemplate()`
  (`industryTemplateService.js:55-69`, PM Template Hierarchy: project → programme/portfolio →
  PMO/Global). Brief §23 ("templates as governance engines") is **largely already true** for
  content (what gets created); the genuine gap is **governance behaviour** — a template doesn't
  yet declare required approval gates or auto-provision them.
- **Stage gates are fully built and wired**, not dead data: `stage_gates` table,
  `stageGateService.js`, `StageGateList/View/Form.jsx`, dashboard widget
  `StageGateOversight.jsx`. (The earlier v966 sidebar-rationalisation decision to leave Stage
  Gates *out of the rationalised sidebar* was a menu-placement decision, not a
  build/deprecate decision — the feature is live and reachable via its existing route today.)
  Phase 2 should surface stage-gate CONFIGURATION (which gates a methodology/classification
  requires) as PMO-level setup, not touch the existing per-project stage-gate CRUD.
- **A generic per-record approval-chain mechanism already exists**:
  `record_lifecycle_config` + `record_authorisers` (keyed `account_id, project_id, table_name`),
  service `recordLifecycleService.js`, UI `AuthorisationRequestModal.jsx` /
  `ApprovalChainDisplay.jsx`. This is the right foundation for brief §10's "Workflows" sub-area —
  extend it to be configurable from a PMO Admin surface rather than only per-record/per-table.
  **Separately**, module-specific approval thresholds still exist ad hoc (e.g.
  `expenseClaimService.js` + `pmo-admin/expense-thresholds`) — brief §10's "Authorities"
  (delegated authority / approval thresholds / escalation) has no unified home yet; this is a
  real gap, not a duplicate-avoidance case.
- **The closest existing "PMO Admin defines an org-wide construct" pattern** is Custom
  Roles/Menu Bundles (`organisationCustomRoleService.js`, `OrgRoleDetail.jsx`,
  `MenuItemPicker.jsx`) — picker + save, `DetailAuditTabList` for the mandatory audit tab (CLAUDE.md
  rule 63.1). New Phase 2 config pages should follow this visual/interaction pattern, not invent a
  new one.
- **No generic reference-data engine exists** — each lookup (`ProjectTypes.jsx`,
  `ProjectStatuses.jsx`, `PortfolioCategories.jsx`, `FundingSources.jsx`, `BudgetCategories.jsx`,
  `LifecycleTemplates.jsx`, etc.) is its own dedicated CRUD page under `pmo-admin/*`, sharing only
  the audit-tab/detail visual pattern. Phase 2 follows this same per-area-page convention for any
  genuinely new reference-data area rather than building a generic engine (rule 62: simplicity —
  a generic config-table-of-config-tables engine would be over-engineering for what's needed).
- **All current PMO Admin routes live under `pmo-admin/*`** (`platformRoutes.jsx:1968-2100+`).
  Phase 2's new areas should extend this same prefix, not introduce a second admin namespace.

## What Phase 2 actually needs to build (the real gaps)

1. **PMO Configuration landing page** — a single guided entry point (this is also what Phase 1's
   "Getting Started as PMO Admin" CTA links to) that surfaces: Delivery Methodology (link to
   existing `OrganisationMethodologySettings.jsx`), Project Classifications, Templates, Workflows
   & Approval Chains, Authorities, Roles & Responsibilities (link to existing Custom Roles),
   Reference Data (links to existing per-area pages). Mostly a navigation/aggregation surface —
   low build cost, high clarity value (directly closes the brief's "PMO configuration exists only
   as scattered settings with no guided entry point" gap named in the PRD problem statement).
2. **Project Classifications / Complexity Levels** — genuinely new: a `project_classifications`
   reference table (name, complexity level, description, is_active) an admin manages via the
   established per-area CRUD page pattern, plus a nullable `projects.classification_id` FK.
3. **Template governance extension** — add `required_stage_gates` / `required_approval_workflow_id`
   -style fields to `pmo_industry_templates` (or a new child table
   `pmo_industry_template_governance` if that reads cleaner — decide at implementation time based
   on whether one template needs one or many governance profiles). Project creation from a
   classified template auto-provisions the declared stage gates via the existing
   `stageGateService.js` create path — no new stage-gate engine, just an auto-trigger.
4. **Workflows / Approval Chains as PMO-configurable** — extend `record_lifecycle_config` /
   `record_authorisers` with an admin page that lets a PMO Admin define reusable approval-chain
   templates (not just per-record instances), selectable from the template governance extension
   in item 3.
5. **Authorities (delegated authority, thresholds, escalation)** — new, genuinely absent. New
   table(s) modeling: role/scope → approval threshold (currency amount or record-type-specific
   unit) → escalation target. Reuse the `expense-thresholds` page's shape as the starting pattern
   (it's the closest existing analogue) but generalize it beyond expenses.
6. **Roles & Responsibilities** — mostly a landing/aggregation page linking to the existing Custom
   Roles admin (`OrgRoleDetail.jsx`) plus (once Phase 3 exists) portfolio/programme role
   definitions. Default RACI per role/record-type is a genuinely new, smaller addition — a simple
   reference table, not a new engine.

## Decisions requiring your sign-off before implementation (flag, don't silently decide)

1. **Template governance shape**: extend `pmo_industry_templates` directly vs. a new
   `pmo_industry_template_governance` child table. Recommended: new child table — keeps the
   existing, already-stable template tables untouched and matches this table family's existing
   one-concern-per-child-table pattern (phases/activities/deliverables/risks/milestones/roles are
   already separate child tables).
2. **Where do "Authorities" (thresholds/escalation) live relative to the existing
   `expense-thresholds` page?** Recommended: keep `expense-thresholds` as-is (don't disturb a
   working, live feature) and build the new generalized Authorities config as a parallel, broader
   construct that expense thresholds could migrate onto **later**, opportunistically — not a
   forced Phase 2 migration.
3. **Scope of "Project Classifications"**: is this purely descriptive metadata on a project, or
   does it drive real behaviour (which template governance applies, which approval thresholds
   apply)? Recommended: descriptive + governance-linking (drives which template governance a
   project inherits), consistent with brief §10's framing — purely descriptive would waste the
   concept's actual value.

## Todo list

### A. Database
- [x] `SQL/v983_project_classifications.sql` — new reference table + `projects.classification_id`
  FK + `sim.practice_projects.classification_id` FK (schema parity) + `database_tables` registry
  row + idempotent per-account seed (4 generic complexity tiers). No Admin ID Generation (code is
  free-text like `project_types.type_code`, same precedent, no rule 16.2 trigger).
- [x] `SQL/v984_pmo_industry_template_governance.sql` — new child table per decision 1, FK to
  `pmo_industry_templates` + `project_classifications`, `required_stage_gate_names TEXT[]` +
  `required_approval_chain_template_id` FK (added after v985 creates that table).
- [x] `SQL/v986_organisation_authorities.sql` — new table for delegated authority /
  approval thresholds / escalation, scoped by authority type + account (parallel to
  `expense_approval_thresholds`, decision 2).
- [x] `SQL/v987_pmo_role_responsibilities_raci.sql` — default RACI reference table, role × record-type.
- [x] `SQL/v985_pmo_approval_chain_templates.sql` — reusable named approval-chain templates +
  ordered steps (supports item 4/Workflows, selectable from template governance).
- [x] Seed data: only `project_classifications` got companion seed content (rule 18.2) — a
  small, idempotent, industry-neutral 4-tier default set per existing account. The other three
  tables (governance, authorities, chains, RACI) have no natural universal default — same as
  `expense_approval_thresholds` (v420), which also ships with zero seed rows — so none were
  invented. **Simulator scope, confirmed by investigation, not assumed**: PMO/organisation
  configuration in this codebase already lives exclusively in `public` regardless of which app
  edits it (v982 Phase 1's own finding: `organisationService.js`/`invitationService.js` resolve
  to `platformDb`/public from both apps; v914 `org_menu_bundles` is public-only, edited from both
  Platform's and Simulator's `pmo/manage-menu-bundles` routes). All five new tables therefore
  live in `public` only — no `sim.*` duplicates — except the one schema-parity column added to
  `sim.practice_projects.classification_id` (v983) referencing the shared public table.

### B. Backend/services
- [x] `projectClassificationService.js` (CRUD, follows the established per-area service pattern).
- [x] Extended `industryTemplateService.js` with governance-read/write functions
  (`getTemplateGovernanceProfiles`, `saveTemplateGovernanceProfile`,
  `deleteTemplateGovernanceProfile`) and the auto-provisioning trigger
  (`provisionTemplateGovernanceForProject`). **Deviation from the plan's literal wording**: hooked
  into `IndustryPlanCopyWizard.jsx`'s `save()` (the actual "copy a template into a project" flow)
  instead of `ProjectsCreate.jsx` — investigation found `ProjectsCreate.jsx` has no template/
  industry-plan concept at all; templates are applied to a project via a separate, already-existing
  wizard (`pages/app/IndustryPlanCopyWizard.jsx`, reached from `IndustryTemplateBrowser.jsx`'s "Use
  for my project"), which is the real, only call site where a project + a chosen template are both
  known together. Also used `stage_gate_reviews` (not `stage_gates`/`stageGateService.js`) as the
  provisioning target — see v984's SQL header for the investigation finding.
- [x] `organisationAuthorityService.js` (new) for thresholds/escalation CRUD.
- [x] `organisationRaciService.js` (new, small) for default RACI CRUD.
- [x] `organisationApprovalChainService.js` (new, not explicitly named in the plan's own B-list but
  required to back item 4/Workflows — see task C's Approval Chain Templates page).
- [x] Simulator mirrors: all 5 services + the `industryTemplateService.js` extension copied
  byte-for-byte (confirmed pre-edit identical, diffed against git HEAD before copying) — these are
  `public`-schema services usable identically from either app, per the scope finding in task A.

### C. Frontend
- [x] `pages/pmo-admin/PmoConfigurationHome.jsx` — the guided landing page (item 1 above), routed
  at `pmo-admin/configuration` (confirmed no collision — existing `pmo-admin` route is the
  unrelated `PMOAdmin.jsx` tabbed admin page, `pmo-admin/configuration` is new).
- [x] `pages/pmo-admin/ProjectClassifications.jsx` — CRUD page, same visual/interaction pattern as
  `ManageRoles.jsx`/`OrgRoleDetail.jsx` (rule 65-compliant precedent) rather than the older
  `ProjectTypes.jsx` inline-form pattern the plan suggested — see the "list+detail vs inline panel"
  simplification note below.
- [x] Template governance fields added to `pages/pmo/IndustryTemplateDetail.jsx` (confirmed exact
  file via investigation — a new self-contained "Governance" tab alongside the existing Phases/
  Activities/.../Audit tabs, using the file's already-rule-63.1-compliant `DetailAuditTabList`
  `tabs` prop; the existing content tabs/rendering were not touched beyond excluding the new tab
  from the generic phases/activities list-render branch).
- [x] `pages/pmo-admin/OrganisationAuthorities.jsx` — thresholds/escalation config.
- [x] `pages/pmo-admin/OrganisationApprovalChains.jsx` — reusable named approval-chain templates
  with an ordered step editor (add/remove/reorder-by-index), selectable by id from the Governance
  tab above. Not explicitly listed in the plan's C bullets but required by item 4/task A's chain-
  templates table.
- [x] `pages/pmo-admin/RolesAndResponsibilities.jsx` — landing page linking Custom Roles +
  default RACI CRUD.
- [x] **Simplification, documented**: all four CRUD areas (Classifications, Authorities, Approval
  Chains, RACI) are each a single page (list + inline create/edit panel on the same page, not a
  separate routed detail page) rather than a `ManageRoles.jsx` + `OrgRoleDetail.jsx` pair each.
  Chosen for time/scope reasons given four areas — these are lightweight reference-data forms (3-6
  fields, no multi-step picker like the role/menu-grant UI), the same class of surface
  `ProjectTypes.jsx`/`ProjectStatuses.jsx` already handle inline without being flagged for rule 65
  conversion. Every page still satisfies rule 65's spirit (no modal/dialog overlay — the form is
  inline in the page flow, not a popup) plus rules 16/28.1/41/44/61/63.1 in full.
- [x] All new pages: dark/light theme-aware (rule 28.1), `DetailAuditTabList` Audit tab (rule
  63.1), success-confirmation modal (rule 16, `useSuccessModal`), icon-only row actions (rule 61,
  `RowActionButton`), Card/Table-list toggle (rule 41, `useViewMode`) on the two list-shaped pages
  (Project Classifications, Authorities); Approval Chains and RACI are table-only (row-dense
  reference data, no card-view value — same judgment call the codebase already makes for similar
  small reference tables).
- [x] Wired all 5 new pages into the sidebar under the existing `pmo-admin` route prefix (Platform)
  — see task A/database for the Simulator-sidebar-deferred precedent this follows.

### D. Tests
- [x] Unit tests for each new service: `projectClassificationService.test.js`,
  `organisationAuthorityService.test.js`, `organisationRaciService.test.js`,
  `organisationApprovalChainService.test.js` — both apps.
- [x] Integration-style test (`industryTemplateGovernance.test.js`): creating a project from a
  classified template with governance provisions the exact declared stage gates, no more/fewer;
  idempotent re-run skips already-provisioned gates; a classification-specific profile overrides
  the account default; no profile defined provisions nothing — both apps.
- [x] Cross-tenant isolation test (inside `projectClassificationService.test.js`): asserts every
  read query is scoped by `account_id`, and that two independent calls for two different accounts
  each use only their own `account_id` (never the other's). This is a client-service-layer
  contract test, not a live-DB RLS test — the actual tenant-isolation enforcement lives in each new
  table's RLS policy (SQL/v983-v987, `account_id IN (SELECT account_id FROM
  get_user_accounts(auth.uid()))`), which this session did not execute against a live database per
  the task's ground rules. Documented as a verification gap: recommend a manual/staging check that
  a PMO Admin in Org A genuinely cannot read or write Org B's classifications/authorities/chains/
  RACI rows before treating Phase 2 as fully verified.

### E. Verification
- [x] `npx vitest run` clean, both apps — see review section for full-suite results (identical
  pre-existing failure counts to Phase 1's own baseline, confirming no regression from this change).
- [ ] Manual walkthrough of the full configuration landing page and each linked sub-page, dark +
  light mode. **Not performed** — this session did not start a dev server / browser session, same
  as Phase 1. Recommend the user do a manual pass before treating Phase 2 as fully verified.
- [x] Confirmed existing methodology settings (`OrganisationMethodologySettings.jsx`,
  `PMOAdmin.jsx`), stage gates (`StageGateList/Form.jsx`, `stageGateService.js`), and the
  expense-threshold page (`ExpenseApprovalThresholds.jsx`, `expenseClaimService.js`) were not
  edited by this phase — grep-confirmed zero references to Phase 2 files in any of those.
- [x] REVIEW.md applicable checks — see review section.

## Review section

Phase 2 is implemented. Summary below; see the inline `[x]` notes above for task-by-task detail.

### Decisions accepted by default per user authorization

Per the task instructions, all three plan-flagged decisions were accepted on the plan's own
recommendation, with no further sign-off sought:
1. Template governance as a new child table `pmo_industry_template_governance` (not touching the
   existing stable template tables directly). Implemented as-is, plus a further implementation
   decision (see below) to make it `account_id`-scoped rather than global.
2. `expense-thresholds` left untouched; the new `organisation_authorities` table is a parallel,
   broader construct. Implemented as-is.
3. Project Classifications are descriptive + governance-linking (drive which template governance a
   project inherits via `pmo_industry_template_governance.classification_id`). Implemented as-is.

No large invented content list was hit — the only seed content created (`project_classifications`'
4 default tiers: Low/Standard/Complex/Strategic) is a short, standard, industry-neutral set,
flagged in SQL/v983's own comment out of caution per the task's instruction, but not treated as
needing a stop-and-ask (it is definitional domain content for the `complexity_level` column, not an
invented business content list).

### New product/implementation judgment calls made during investigation (not plan-anticipated)

These were investigation findings requiring an implementation-shape decision, not product
decisions needing the user's input — each is documented in-place above and in the SQL file headers:

1. **`stage_gates` vs `stage_gate_reviews`**: the plan's facts section named `stage_gates` /
   `stageGateService.js` as "fully built and wired". Investigation for this phase found no
   `CREATE TABLE` for `stage_gates` anywhere in `SQL/` history — only `stageGateService.js` (used
   solely by the `StageGateOversight.jsx` dashboard widget) references it. The actual routed,
   menu-wired, DDL-backed stage gate CRUD (`StageGateList.jsx`/`StageGateForm.jsx` at
   `/platform/stage-gates`) reads/writes `stage_gate_reviews` (`SQL/v685`). This phase's
   auto-provisioning trigger targets `stage_gate_reviews`. **Flagged, not fixed**: `stage_gates`/
   `stageGateService.js` look like an orphaned earlier iteration; out of scope to remove/reconcile
   here per ground rule 8 (don't touch/break existing stage-gate functionality).
2. **Template governance is `account_id`-scoped, not global**: `pmo_industry_templates` itself has
   no `account_id` (confirmed — it's a global content library, industry_code UNIQUE). A governance
   *profile* for a template is organisation-specific (two orgs using the same template may want
   different required gates), so `pmo_industry_template_governance` has `account_id NOT NULL`, one
   row per `(account_id, template_id, classification_id)` — `classification_id IS NULL` is that
   org's default profile for the template; non-null overrides it for that classification.
3. **RLS shape stricter than the closest existing precedents**: the plan pointed to
   `org_menu_bundles` (v914, broad authenticated SELECT with no `account_id` filter at the RLS
   layer, filtering left to the JS service) and `expense_approval_thresholds` (v420, write policy
   checks `is_pmo_admin_user()` with no `account_id` match at all) as the closest analogues. Both
   would fail this phase's own mandatory cross-tenant isolation requirement, so all 5 new tables
   instead use `account_id IN (SELECT account_id FROM get_user_accounts(auth.uid()))` on every
   policy (read and write), plus `is_pmo_admin_user()` for write — genuinely stricter than either
   precedent. Not a retrofit of the older tables (out of scope, ground rule 8), just a deliberately
   different choice for the new ones.
4. **Auto-provisioning hook point**: `IndustryPlanCopyWizard.jsx`'s `save()`, not
   `ProjectsCreate.jsx` — see task B's note. `ProjectsCreate.jsx` has no template concept at all;
   templates are applied to an already-created project via a separate wizard.
5. **CRUD page shape simplified to one page per area** (list + inline panel) instead of a
   `ManageRoles.jsx` + `OrgRoleDetail.jsx` two-page pair per area — see task C's note. Time/scope
   trade-off for four new areas in one phase; every mandatory CLAUDE.md rule is still met.
6. **Simulator sidebar menu wiring deferred**, pages built for parity — see SQL/v988's header. This
   follows an already-repeated, explicit precedent in this session's own recent history (v981,
   v966* series), not an invented gap.
7. **`sim.stage_gate_reviews` auto-provisioning gap, documented not built**: it's `run_id`-scoped
   (simulation-run data model), not `project_id`-scoped like `public.stage_gate_reviews` — a
   materially different shape, same class of divergence as v893's Simulator Practice-module
   carve-out precedent that the task instructions explicitly permitted checking for. The schema
   column (`sim.practice_projects.classification_id`) was still added for forward-compatibility.

### Files created

SQL (run in this order — dependencies noted, none executed against the live DB by this session):
1. `SQL/v983_project_classifications.sql` — `public.project_classifications` +
   `public.projects.classification_id` + `sim.practice_projects.classification_id` + RLS +
   `database_tables` registry + idempotent per-account seed (4 default tiers). No dependencies on
   the other new files.
2. `SQL/v984_pmo_industry_template_governance.sql` — `public.pmo_industry_template_governance`.
   **Depends on v983** (FK to `project_classifications`) and on the pre-existing
   `public.pmo_industry_templates` (v575). Leaves `required_approval_chain_template_id` unFKed
   (column exists, no constraint yet) because `pmo_approval_chain_templates` doesn't exist until
   v985.
3. `SQL/v985_pmo_approval_chain_templates.sql` — `public.pmo_approval_chain_templates` +
   `public.pmo_approval_chain_steps`. **Depends on v984** (attaches the deferred FK from
   `pmo_industry_template_governance.required_approval_chain_template_id` onto this file's new
   table once it exists).
4. `SQL/v986_organisation_authorities.sql` — `public.organisation_authorities`. No dependencies on
   v983-v985.
5. `SQL/v987_pmo_role_responsibilities_raci.sql` — `public.pmo_role_responsibilities`. No
   dependencies on v983-v986.
6. `SQL/v988_phase2_pmo_configuration_menu_items.sql` — 5 new `menu_items` + `role_menu_items`
   rows (Platform only). No table dependencies beyond `menu_items`/`roles`/`role_menu_items`
   existing (they do). Should run last, after the pages it links to exist in the deployed app, but
   has no SQL-level ordering dependency on v983-v987.

**Run order: v983 → v984 → v985 → v986 → v987 → v988** (984 and 985 have a real FK dependency on
each other in that order; 986-988 are independent of everything but menu_items/roles and can in
practice run anywhere after v983-v985, but keeping them last preserves a single clean linear order).

Platform app:
- `apps/platform/src/services/projectClassificationService.js`
- `apps/platform/src/services/organisationAuthorityService.js`
- `apps/platform/src/services/organisationRaciService.js`
- `apps/platform/src/services/organisationApprovalChainService.js`
- `apps/platform/src/pages/pmo-admin/PmoConfigurationHome.jsx`
- `apps/platform/src/pages/pmo-admin/ProjectClassifications.jsx`
- `apps/platform/src/pages/pmo-admin/OrganisationAuthorities.jsx`
- `apps/platform/src/pages/pmo-admin/OrganisationApprovalChains.jsx`
- `apps/platform/src/pages/pmo-admin/RolesAndResponsibilities.jsx`
- `apps/platform/src/services/__tests__/projectClassificationService.test.js`
- `apps/platform/src/services/__tests__/organisationAuthorityService.test.js`
- `apps/platform/src/services/__tests__/organisationRaciService.test.js`
- `apps/platform/src/services/__tests__/organisationApprovalChainService.test.js`
- `apps/platform/src/services/__tests__/industryTemplateGovernance.test.js`

Simulator app (mirrors of the above, all confirmed either byte-identical pre-edit copies or
route-path-adjusted per app):
- `apps/simulator/src/services/projectClassificationService.js`
- `apps/simulator/src/services/organisationAuthorityService.js`
- `apps/simulator/src/services/organisationRaciService.js`
- `apps/simulator/src/services/organisationApprovalChainService.js`
- `apps/simulator/src/pages/pmo-admin/PmoConfigurationHome.jsx`
- `apps/simulator/src/pages/pmo-admin/ProjectClassifications.jsx`
- `apps/simulator/src/pages/pmo-admin/OrganisationAuthorities.jsx`
- `apps/simulator/src/pages/pmo-admin/OrganisationApprovalChains.jsx`
- `apps/simulator/src/pages/pmo-admin/RolesAndResponsibilities.jsx`
- `apps/simulator/src/services/__tests__/*.test.js` (5 files, same names as Platform)

### Files changed

Platform:
- `apps/platform/src/services/industryTemplateService.js` — added
  `getTemplateGovernanceProfiles`/`saveTemplateGovernanceProfile`/
  `deleteTemplateGovernanceProfile`/`provisionTemplateGovernanceForProject`.
- `apps/platform/src/pages/app/IndustryPlanCopyWizard.jsx` — calls
  `provisionTemplateGovernanceForProject` after a fresh (non-draft, non-update) plan save; best-
  effort, never blocks the plan save itself.
- `apps/platform/src/pages/pmo/IndustryTemplateDetail.jsx` — new "Governance" tab
  (`TemplateGovernancePanel`), self-contained, does not alter the existing Phases/Activities/.../
  Audit tabs' behaviour.
- `apps/platform/src/routes/lazyImports.js` — 5 new lazy imports.
- `apps/platform/src/routes/platformRoutes.jsx` — 5 new routes under `pmo-admin/*`.

Simulator: identical edits to `industryTemplateService.js` and `IndustryPlanCopyWizard.jsx`
(confirmed byte-identical pre-edit, copied directly) and `IndustryTemplateDetail.jsx` (same), plus
`apps/simulator/src/routes/lazyImports.js` and `apps/simulator/src/routes/simulatorRoutes.jsx` (5
new routes under `simulator/pmo/*`, route paths rewritten from the Platform originals).

### Test results

New tests: 28 assertions across 5 files, run in **both** apps — all passing (verified with a
targeted `npx vitest run` pass on just the 5 new files before the full-suite run).

Full-suite `npx vitest run`:
- Platform: 218 files / 1449 tests passed, 61 files / 182 tests failed.
- Simulator: 221 files / 1388 tests passed, 62 files / 101 tests failed.

**Exact match to Phase 1's own recorded baseline** (Platform: 61 failed files / 182 failed tests;
Simulator: 62 failed files / 101 failed tests) — the file-count and test-count deltas are precisely
+5 files / +28 tests in each app (this phase's own new test files), with the pre-existing failing
file/test counts unchanged to the digit. This is strong evidence nothing this phase touched
introduced a regression — none of Phase 2's changed files appear in the failing set, and the
failure counts didn't shift at all from the pre-existing baseline.

### Manual verification not performed

Same as Phase 1: no dev server/browser session was started this session. Recommend the user
manually walk the PMO Configuration landing page and each of its 5 linked sub-pages (both apps,
dark + light mode) — in particular the Governance tab's classification/approval-chain dropdowns
populate correctly, and the stage-gate auto-provisioning fires when saving a fresh industry plan
from a template that has a governance profile with declared gate names.

### Recommended follow-up (not built this phase, out of scope)

- A live-DB check that the new RLS policies actually block cross-tenant reads/writes (this
  session's cross-tenant test is a service-layer contract test, not a live-RLS test — see task D).
- Reconciling or removing the apparently-orphaned `stage_gates` table reference in
  `stageGateService.js`/`StageGateOversight.jsx` (flagged, not touched).
- Wiring `pmo_approval_chain_templates` onto the live `record_lifecycle_config`/`record_authorisers`
  enforcement path (currently reference-only, per the ground rule against touching live
  authorization this phase) — a natural Phase 2b/3 addition once a concrete "apply this chain to
  project X" UX is designed.
- Simulator sidebar menu wiring for the 5 new pages (deferred per the established precedent, not
  built this phase).
