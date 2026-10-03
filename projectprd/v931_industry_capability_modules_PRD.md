# v931 — Local Register Engine & Industry Capability Modules PRD

## a) Problem statement

v930 made the sidebar visually reflect which industry pack(s) an organisation has selected, but
the actual *content* behind each industry section is still just the generic set of menu items
that industry-tagged built-in roles already had access to (v921) — nothing genuinely
industry-specific exists yet. `Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md`
§10–11 sketches what real industry-specific capability content could look like for Banking,
Construction, and IT/Technology, but explicitly frames those sketches as illustrative examples
requiring their own approved PRD before implementation — and the other 6 selectable industries
(Healthcare & Life Sciences, Manufacturing & Operations, Government & Public Sector, Marketing &
Creative, Energy & Utilities, Education) have no content sketched anywhere at all.

Building ~28 industry-specific capability registers the same way every existing register (Risk,
Issue, Change, etc.) was built — a fully bespoke page + dedicated table + service + RLS + route +
menu entry per item — would be a very large, slow, repetitive build. Worse, it would still be a
**closed, fixed set**: an organisation that needs one more register of its own (something outside
any of the 9 industries' pre-defined lists — a genuinely local, org-specific tracking need) would
have no way to get one without a developer shipping new code. Neither of the two existing
config-driven mechanisms investigated (Local Data Extensions, the Form Templates/Local Forms
system) can register a brand-new standing CRUD entity — LDE only adds fields to an already-fixed
set of screens, and Form Templates produce one-off submission instances, not an ongoing managed
list with a status workflow.

## b) Solution

Build one **generic, no-code Local Register Engine** — an admin capability (natural sibling of
Local Data Extensions, same `pmo-cat-admin` area) where a PMO Admin defines a new register
(name, icon, scope, fields, status workflow) entirely through configuration, and the system
immediately provides a working list view, create/edit form, detail view, RLS-scoped access, and
(for system-defined registers) a menu item — with **zero new code per register**.

The 28 industry-specific capability registers designed in section h below (Core Banking,
Permits, Bill of Materials, etc.) are **not built as bespoke pages**. They are the engine's first
content: **system-defined register definitions**, seeded once and tagged to their industry
pack(s), read-only to org admins (can't be deleted/renamed, since they're part of the shipped
product), rendered by the exact same generic components a PMO Admin's own custom "local"
register uses. An organisation can *additionally* define its own fully custom local registers
for needs outside any of the 9 industries' pre-defined lists, using the identical mechanism.

Every item from the brief's sketches and this PRD's drafts was still filtered through an
"extend-first" policy (per the brief's own §8–10 instruction: "do not create isolated
banking-only versions of generic PM registers where configuration or relationships are
sufficient") before being accepted as a new register definition — see decision 2's table below.
That filtering logic is unchanged by the engine-first pivot; only *how* the surviving items get
built changed (config, not code).

## c) User stories

1. As a PMO Admin, I can define a brand-new register (name, fields, status workflow, scope)
   entirely through an admin UI, with no developer involved, and it immediately behaves like any
   other register in the app — list, create, edit, view, filtered by role.
2. As an organisation with Banking selected as an industry, I see genuinely Banking-specific
   registers (Core Banking, Product Configuration, Parameterisation, Cutover, Go-Live, plus the
   shared Readiness Checklist and Data Migration registers) — these are system-defined register
   definitions I can use but not edit/delete the structure of.
3. As an organisation with Construction & Engineering selected, I see Sites, Permits, and
   Materials as dedicated registers; RFIs shows up as a category on the existing Issue Register
   rather than a duplicate register.
4. As an organisation with both Construction and Energy & Utilities selected, the Permits
   register is the same underlying register definition surfaced to both packs, not two separate
   ones.
5. As a PMO Admin whose organisation needs a register outside any of the 9 industries' lists
   (e.g. a purely internal tracking need), I create my own local register the same way I'd use
   any admin config screen — no developer, no waiting for a future PRD.
6. As a developer, adding a 29th system-defined register later (a new industry, or a missed item
   in an existing one) means seeding one register definition row, not writing a new page.
7. As a user of any existing register (Risk, Issue, Change, etc.), nothing about my experience
   changes — this PRD does not migrate or touch existing registers; they keep their dedicated
   tables and bespoke pages exactly as today (confirmed scope boundary — see decision 8).

## d) Implementation decisions

1. **Build approach — reversed from the original draft of this PRD**: one generic, config-driven
   Local Register Engine (admin UI + generic list/form/detail rendering + one shared schema +
   RLS applied once), not a per-register dedicated-table factory. *(User decision, explicitly
   reversing the earlier "dedicated table per register" choice — the deciding factor was needing
   org admins to create genuinely new local registers at runtime, which a dedicated-table
   approach can never support without a live DDL migration per user action.)*
2. **Extend-first filtering policy** (applies to all 9 industries): an item only becomes a new
   register definition if it has no meaningful existing equivalent. EXISTING/PARTIAL items get a
   category value, new field, or light extension on an existing register/module instead.
   *(User decision, matches the brief's explicit instruction — unchanged by the engine pivot.)*
3. **Cross-industry consolidation** (user decision): items with near-identical shape across
   industries merge into one shared register definition rather than being defined once per
   industry —
   - **Readiness Checklist** — was Banking's "Operational Readiness", IT's "Production
     Readiness", Education's "Facility/Campus Readiness" (3 → 1).
   - **Data Migration** — was Banking's "Data Migration", Education's "Student Information
     System Migration" (2 → 1).
   - **Commissioning** — was Manufacturing's "Production Line Commissioning", Energy &
     Utilities' "Commissioning & Energisation" (2 → 1).
   - **Hypercare** (Banking) reclassified from a standalone register to an Issue Register
     category/tag (time-boxed post-launch period) — removed from the NOVEL list entirely.
   - **Permits** (Construction & Engineering, Energy & Utilities) was already identified as one
     shared register serving two industries before this consolidation pass.
   Final NOVEL register list by industry (field-level schemas in section h):
   - **Banking**: Core Banking, Product Configuration, Parameterisation, Cutover, Go-Live
     (5 dedicated) + shares Readiness Checklist + shares Data Migration.
   - **Construction & Engineering**: Sites, Materials (2 dedicated) + shares Permits (with
     Energy & Utilities).
   - **IT & Software**: Releases, Deployments (2 dedicated) + shares Readiness Checklist.
   - **Healthcare & Life Sciences**: Clinical Trials/Studies, Regulatory Submissions, Patient
     Safety Events, Clinical Site Activation (4 dedicated).
   - **Manufacturing & Operations**: Bill of Materials, Equipment/Asset Qualification, Process
     Validation, Safety Incidents (4 dedicated) + shares Commissioning (with Energy & Utilities).
   - **Government & Public Sector**: Freedom of Information Requests, Policy/Legislative
     Milestones (2 dedicated).
   - **Marketing & Creative**: Media Placements/Channel Scheduling (1 dedicated). Accepted as a
     deliberately thin industry — most needs already served by Core + light extensions, not
     padded out with invented scope.
   - **Energy & Utilities**: Asset/Infrastructure Register, Outage Management, Environmental
     Impact Assessments (3 dedicated) + shares Permits (with Construction) + shares
     Commissioning (with Manufacturing).
   - **Education**: Curriculum Development/Rollout (1 dedicated) + shares Readiness Checklist +
     shares Data Migration.
   - **3 shared cross-industry registers**: Readiness Checklist, Data Migration, Commissioning
     (plus Permits, already cross-industry before this pass).
   - **Total: 24 industry-dedicated registers + 4 shared registers = 28 unique registers.**
4. **Schema shape (proposed, needs your confirmation)**: mirrors — and generalizes — Local Data
   Extensions' own existing table shape rather than inventing an unrelated pattern. Updated for
   decision 6's four-tier scoping (below):
   - `local_registers` — one row per register definition: `register_key`, `label`, `icon`,
     `scope_level` (`pmo` | `portfolio` | `programme` | `project`), `is_system_defined` (true for
     the 28, false for member-created ones), `industry_pack_id` (nullable — links system-defined
     registers to the pack(s) that grant them; null for member-created local registers),
     `account_id` (the owning organisation — always set, system-defined registers are still
     scoped to whichever org is using them), `scope_entity_id` (nullable — the specific
     portfolio_id/programme_id/project_id this register was created against, when `scope_level`
     is narrower than `pmo`; null for `pmo`-level and for system-defined registers, which apply
     org-wide within whichever entities their industry pack reaches), `status_workflow` (ordered
     list of states), `created_by` (the member who created it, for member-created registers),
     audit columns.
   - `local_register_fields` — one row per field on a register: `register_id`, `field_key`,
     `field_label`, `field_type` (text/number/date/dropdown/boolean/user_picker/currency),
     `is_required`, `display_order`, `dropdown_options` (for dropdown type).
   - `local_register_records` — the actual data rows: `register_id`, plus whichever of
     `portfolio_id`/`programme_id`/`project_id` matches the register's `scope_level`,
     `display_id` (Admin ID Generation, rule 16.2), `title`, `status`, `owner_user_id`,
     `record_status` (unauthorised/authorised, only meaningful where a register opts into
     approval gating), `field_values` (JSONB — the register's custom field values), audit
     columns.
   - **One RLS policy set on `local_register_records`** (and on `local_registers` for
     create/edit), keyed off the SAME existing membership checks the rest of the app already
     uses for that scope level (`project_memberships` for project, existing portfolio/programme
     manager-assignment tables for those levels, PMO-admin-tier role check for `pmo`) — applied
     once regardless of how many registers exist, not one policy per register.
5. **Admin/management UI**: creating a register is **not** confined to a PMO Admin settings
   screen — per decision 6, any member creates one from within whatever PMO/Portfolio/Programme/
   Project context they're already working in (e.g. a "+ New Local Register" action from a
   project's own space, not only from `pmo-cat-admin`). A `pmo-cat-admin`-level "Manage Local
   Registers" page still exists as an org-wide oversight view (list every local register across
   every scope, for admins to audit/deactivate), mirroring Local Data Extensions' existing admin
   screen — but it is not the only place a register can be created. System-defined registers (the
   28) appear in that oversight list but are read-only at the structure level (can't be
   renamed/deleted/refielded — only used).
6. **Who can create local registers**: any organisation member, for whatever
   PMO/Portfolio/Programme/Project scope they're already assigned to — not gated to PMO Admins.
   *(User decision, reversing the earlier "PMO Admins only" default.)* Concretely, at project
   scope: any project member — Team Manager/Lead and Team Member roles explicitly included, not
   just Project Manager — can create a project-scoped register for their own project. Likewise
   a Programme Manager creates programme-scoped registers for their programme; a Portfolio
   Manager at portfolio level; PMO-tier roles create `pmo`-level (org-wide) registers. Creation
   rights at each level follow the SAME existing membership/assignment checks that already gate
   other actions at that level (e.g. project membership already governs who can create a Risk
   Register entry for that project, and already distinguishes Team Manager/Lead and Team Member
   from other project roles) — this is not a new, separate permission system, and does not grant
   Team Managers/Leads or Team Members any authority beyond their existing project-membership
   scope (they cannot create programme-, portfolio-, or pmo-level registers).
7. **Menu integration differs by register type**: system-defined registers (the 28) get real
   `menu_items` rows wired through `industry_pack_menu_items`, exactly like any other menu item —
   so v930's pack-grouped sidebar surfaces them correctly. Member-created local registers do
   **not** each get their own `menu_items` row (that would mean writing to the shared,
   broadly-readable `menu_items` table on every member's custom action) — instead, one generic
   "Local Registers" entry point, **context-aware to whatever PMO/Portfolio/Programme/Project the
   user is currently viewing**, lists the registers visible at that level and above (e.g. viewing
   a project shows that project's own local registers plus any programme-/portfolio-/pmo-level
   ones reaching down to it). *(Recommended default, not yet explicitly confirmed — flag if this
   is wrong.)*
8. **No migration of existing registers** — Risk Register, Issue Register, Change Register, etc.
   keep their dedicated tables and bespoke pages exactly as today; this PRD does not touch them.
   *(User-confirmed scope boundary — see the "migration meaning" clarification.)*
9. **Approval/status workflows reuse the existing record-lifecycle module** (the generic
   approve/reject/authorisation-queue mechanism already used across other record types) for any
   register that opts into approval gating, rather than each register inventing its own state
   machine. *(Recommended default, not yet explicitly confirmed by the user — flag if this is
   wrong.)*
10. **Platform–Simulator parity** (rule 34.1) applies to the engine itself (admin UI + generic
    rendering built once, shared) — not yet discussed whether Simulator needs the exact same
    admin capability or a narrower read-only version.
11. **System-defined registers (the 28) default to `scope_level: 'project'`**, matching every
    existing register's convention (Risk Register, Issue Register, etc. are all project-scoped) —
    the creator of a member-created local register instead picks the scope level explicitly at
    creation time (`pmo`/`portfolio`/`programme`/`project`), constrained to whatever level(s) they
    have creation rights at per decision 6. Flag any of the 28 that should default to a broader
    scope instead of `project` — e.g. Government's FOI Requests might arguably be
    `pmo`/organisation-level if it's not naturally tied to one specific project.

## e) Testing decisions

Not yet defined — depends on the engine's final component/schema shape (the implementation plan,
written once this PRD is confirmed).

## f) Out-of-scope

- Any EXISTING/PARTIAL item's "light extension" work is out of scope for *this* PRD's
  register-definition build — those are smaller, separate, per-item tasks (add a category value,
  add a field) that can be picked up opportunistically per rule adoption conventions, not part of
  the 28-register-definition seed.
- Migrating any existing register (Risk, Issue, Change, etc.) onto the new engine — confirmed
  narrow scope, see decision 8.
- Optional Feature Packs (still no backing data model, per v930's own PRD).
- Advanced field types beyond the list in decision 4 (e.g. formula fields, cross-register
  lookups/relationships, file attachments as a field type) — first version ships with the field
  types listed; richer types are a future extension if needed.

## g) Further notes

- The engine's component-level API (exact prop shapes, how `CustomFieldRenderer`-style rendering
  extends to a full register, how `field_values` JSONB round-trips through forms) has not been
  designed at the code level — this PRD establishes the *approach*, not the *interface*. That
  belongs in the implementation plan, written once this PRD's decisions are confirmed.
- Decisions 6, 7, 9, and 11 above are my recommended defaults, stated here for visibility, not yet
  put to you as explicit questions — flag any of them if you disagree before the plan is written.
- Field lists below are first-draft, directional, and deliberately lean (rule 62 — avoid
  maximalist forms). Expect them to be edited; they are not final until you've reviewed them.

## h) System-defined register definitions (draft — needs your review before the plan is written)

These 28 are no longer bespoke table schemas — they are **seed data**: rows in `local_registers`
+ `local_register_fields` (decision 4), marked `is_system_defined = true` and linked to their
industry pack(s) via `industry_pack_id`. Every register automatically gets these engine-provided
columns via `local_register_records`, not repeated per register below: `id`, `project_id` or
`account_id` (per its `scope`), `display_id` (Admin ID Generation, rule 16.2), `title`,
`description`, `status` (register-specific workflow, listed per register), `owner_user_id`,
`record_status` (unauthorised/authorised — only meaningfully used on registers with an approval
gate; noted per register), `created_at`/`created_by`/`updated_at`/`updated_by`. Only the
distinctive fields below become rows in `local_register_fields` (stored inside
`field_values` JSONB per record).

### Shared cross-industry registers (used by more than one industry pack)

**Readiness Checklist** (Banking, IT & Software, Education)
Fields: `readiness_area` (text, e.g. Security/Support/Training/Compliance — free text so it
adapts per industry), `checklist_item`, `responsible_team`, `target_date`, `evidence_link`.
Status: Not Started → In Progress → Complete → Verified.

**Data Migration** (Banking, Education)
Fields: `data_object` (e.g. "Customer Master", "Student Records"), `source_system`,
`target_system`, `migration_wave`, `record_count_estimate`, `reconciliation_status`.
Status: Planned → Extracted → Transformed → Loaded → Reconciled → Signed Off.

**Commissioning** (Manufacturing & Operations, Energy & Utilities)
Fields: `asset_or_line_name`, `commissioning_stage`, `responsible_engineer`, `planned_date`,
`actual_date`, `test_result`.
Status: Planned → In Progress → Tested → Commissioned → Failed.

**Permits** (Construction & Engineering, Energy & Utilities — already identified pre-consolidation)
Fields: `permit_type`, `permit_number`, `issuing_authority`, `application_date`,
`approval_date`, `expiry_date`.
Status: Not Applied → Applied → Under Review → Approved → Expired → Rejected.

### Banking (5 dedicated + Readiness Checklist + Data Migration)

**Core Banking** — tracks core banking system configuration items being implemented/migrated.
Fields: `module_name` (e.g. Deposits/Loans/Payments), `configuration_area`,
`target_go_live_date`, `complexity` (Low/Med/High), `completion_pct`.
Status: Not Started → In Progress → Configured → Tested → Signed Off.

**Product Configuration** — tracks specific banking product setups being configured.
Fields: `product_name`, `product_type` (Deposit/Loan/Card/Investment), `configuration_owner`,
`target_date`, `validation_status`.
Status: Draft → In Configuration → In Review → Approved → Live. `record_status` gate at Approved.

**Parameterisation** — tracks system parameter sets (fees, rates, limits, rules).
Fields: `parameter_group`, `parameter_name`, `current_value`, `proposed_value`,
`effective_date`.
Status: Draft → Pending Approval → Approved → Applied. `record_status` gate at Approved.

**Cutover** — tracks cutover run-sheet tasks for the go-live weekend/window.
Fields: `task_sequence` (int), `task_name`, `responsible_team`, `planned_start`, `planned_end`,
`actual_start`, `actual_end`, `rollback_trigger`.
Status: Scheduled → In Progress → Complete → Failed/Rolled Back.

**Go-Live** — tracks go-live decision-gate criteria and sign-offs (one row per criterion).
Fields: `criterion_name`, `criterion_owner`, `evidence`, `sign_off_date`.
Status: Pending → Met → Waived → Not Met. `record_status` gate at Met/Waived.

### Construction & Engineering (2 dedicated + Permits)

**Sites** — physical construction sites/locations under a project.
Fields: `site_name`, `site_address`, `site_manager`, `start_date`, `planned_completion_date`.
Status: Planned → Active → Suspended → Complete.

**Materials** — material procurement/delivery/usage tracking.
Fields: `material_name`, `quantity_ordered`, `quantity_delivered`, `quantity_used`, `supplier`,
`delivery_date`, `unit_cost`.
Status: Ordered → Partially Delivered → Delivered → In Use → Depleted.

### IT & Software (2 dedicated + Readiness Checklist)

**Releases** — software release packages/versions.
Fields: `release_version`, `release_type` (Major/Minor/Patch/Hotfix), `target_date`,
`scope_summary`, `release_manager`.
Status: Planned → In Development → In Testing → Ready → Released → Rolled Back.

**Deployments** — individual deployment events (a release can have multiple).
Fields: `linked_release` (FK to Releases), `target_environment`, `deployment_date`,
`deployed_by`, `deployment_method`, `rollback_plan_link`.
Status: Scheduled → In Progress → Success → Failed → Rolled Back.

### Healthcare & Life Sciences (4 dedicated)

**Clinical Trials/Studies** — individual trial/study records.
Fields: `study_name`, `study_phase` (I/II/III/IV), `sponsor`, `principal_investigator`,
`target_enrollment`, `actual_enrollment`, `study_start_date`, `study_end_date`.
Status: Planned → Recruiting → Active → Closed → Completed.

**Regulatory Submissions** — regulatory body submissions (FDA/EMA/etc.).
Fields: `submission_type`, `regulatory_body`, `submission_date`, `decision_date`,
`decision_outcome`, `reference_number`.
Status: Preparing → Submitted → Under Review → Approved → Rejected → Withdrawn.

**Patient Safety Events** — adverse events/safety incidents.
Fields: `event_type`, `severity`, `date_occurred`, `date_reported`, `reporter`,
`causality_assessment`, `outcome`.
Status: Reported → Under Investigation → Assessed → Closed.

**Clinical Site Activation** — activation status of individual trial sites.
Fields: `site_name`, `site_country`, `activation_milestone_date`, `irb_approval_status`,
`staff_trained` (boolean).
Status: Identified → Contracted → IRB Pending → IRB Approved → Activated → Closed.

### Manufacturing & Operations (4 dedicated + Commissioning)

**Bill of Materials** — BOM line items for a manufacturing project.
Fields: `component_name`, `component_code`, `quantity_required`, `unit_of_measure`, `supplier`,
`unit_cost`, `lead_time_days`.
Status: Draft → Approved → Sourced → Obsolete. `record_status` gate at Approved.

**Equipment/Asset Qualification** — IQ/OQ/PQ-style equipment qualification records.
Fields: `asset_name`, `asset_tag`, `qualification_type` (IQ/OQ/PQ), `qualified_by`,
`qualification_date`, `next_requalification_date`.
Status: Scheduled → In Progress → Passed → Failed → Requalification Due.

**Process Validation** — process validation runs/protocols.
Fields: `process_name`, `validation_protocol_ref`, `run_number`, `validated_by`,
`validation_date`, `result`.
Status: Planned → In Progress → Passed → Failed.

**Safety Incidents** — workplace safety incidents (kept separate from Risk Register given
regulatory incident-report requirements — distinct enough from a generic risk to warrant its own
form, pending your confirmation).
Fields: `incident_type`, `severity`, `date_occurred`, `location`, `injured_party`,
`reported_by`, `corrective_action`, `regulatory_notification_required` (boolean).
Status: Reported → Under Investigation → Corrective Action Assigned → Closed.

### Government & Public Sector (2 dedicated)

**Freedom of Information Requests**
Fields: `requester_name`, `request_date`, `request_summary`, `due_date` (statutory),
`response_date`, `outcome` (Granted/Partial/Denied/Redirected).
Status: Received → Under Review → Response Drafted → Responded → Closed.

**Policy/Legislative Milestones**
Fields: `milestone_name`, `related_legislation`, `target_date`, `actual_date`,
`dependency_notes`, `responsible_body`.
Status: Upcoming → In Progress → Achieved → Delayed → Missed.

### Marketing & Creative (1 dedicated)

**Media Placements/Channel Scheduling**
Fields: `channel` (TV/Digital/Print/OOH/Social), `placement_name`, `booking_date`,
`flight_start_date`, `flight_end_date`, `budget`, `actual_spend`.
Status: Proposed → Booked → Live → Completed → Cancelled.

### Energy & Utilities (3 dedicated + Permits + Commissioning)

**Asset/Infrastructure Register** — physical energy/utility assets under the project.
Fields: `asset_name`, `asset_type`, `asset_location`, `install_date`, `condition_rating`,
`next_inspection_date`.
Status: Planned → Installed → Operational → Decommissioned.

**Outage Management** — planned/unplanned outages.
Fields: `outage_type` (Planned/Unplanned), `affected_area`, `start_time`, `end_time`,
`customers_affected_estimate`, `cause`.
Status: Scheduled → In Progress → Restored → Closed.

**Environmental Impact Assessments**
Fields: `assessment_scope`, `assessing_body`, `submission_date`, `decision_date`, `outcome`,
`mitigation_measures`.
Status: Scoping → Submitted → Under Review → Approved → Conditional Approval → Rejected.

### Education (1 dedicated + Readiness Checklist + Data Migration)

**Curriculum Development/Rollout**
Fields: `curriculum_name`, `subject_area`, `target_grade_level`, `development_stage`,
`rollout_date`, `responsible_lead`.
Status: Planning → In Development → Piloting → Approved → Rolled Out.
