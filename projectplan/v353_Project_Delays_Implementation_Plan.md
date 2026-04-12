# v353 — Project Delays Management

**Date:** 2026-04-11  
**SQL start version:** v444  
**Systems:** Platform (public schema) + Simulator (sim schema)

---

## Current State

No dedicated delay capture module exists. Delays are **partially scattered** across:

| Feature | Partial Delay Coverage |
|---------|----------------------|
| Issue Register | `schedule_impact_days` field |
| Exception Reports | `estimated_delay_days` field |
| Work Packages | `schedule_variance_days`, `progress_indicator = 'delayed'` |
| Product Status Account | `schedule_variance_days`, `'delayed'` status |
| Inter-project Dependencies | `schedule_impact_days` |

**Gap:** No dedicated Delay Register, no centralized delay log, no delay categorisation, no delay resolution tracking, no cross-project PMO delay dashboard.

---

## Overview

Implement a **Project Delay Register** as a first-class feature:

1. **PMO creates Delay Templates** — org-level reusable delay definitions (category, cause, resolution plan starters)
2. **Project team copies & tailors templates** — project-specific delay records pre-filled from a template and customised to the actual event
3. **Standalone delay creation** — project team can also log delays from scratch without a template
4. **Auto-link** — DB triggers automatically create/update delay records when Issues, Risks, or Defects become overdue
5. **All roles can view** delays and templates for their project, with PMO having cross-project oversight
6. **Both systems** — Platform and Simulator at parity

---

## Data Model

### Platform (public schema)

#### `delay_templates` — org-level templates created and managed by PMO

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organisation_id | uuid FK | |
| name | text | Template name e.g. "Vendor Late Delivery" |
| delay_category | text | Pre-set category |
| delay_cause | text | Typical root cause narrative |
| responsible_party | text | Typical responsible party |
| default_severity | text | Suggested severity level |
| resolution_plan_template | text | Standard resolution approach text — tailorable by project team |
| tags | text[] | Searchable tags |
| status | text | `draft` / `active` / `archived` |
| is_draft | boolean | On-hold/draft queue |
| draft_expires_at | timestamptz | |
| created_by | uuid FK → profiles | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `project_delays` — main delay register table (project-specific, tailored from template or standalone)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| organisation_id | uuid FK | |
| delay_reference | text | Auto-generated e.g. DLY-001 |
| title | text | Short description of the delay |
| description | text | Full details |
| delay_category | text | See categories below |
| delay_cause | text | Root cause narrative |
| responsible_party | text | Who/what caused the delay (internal/external/vendor/weather etc.) |
| impact_schedule_days | integer | Estimated schedule slippage in days |
| impact_cost | numeric | Estimated cost impact |
| impact_scope | text | Description of scope impact if any |
| severity | text | low / medium / high / critical |
| status | text | identified / under_review / approved / resolved / closed |
| identified_date | date | When the delay was first identified |
| original_baseline_date | date | Original planned completion/milestone date |
| revised_forecast_date | date | New expected date after delay |
| resolution_plan | text | How the delay will be addressed |
| resolution_owner_id | uuid FK → profiles | Person responsible for resolution |
| resolution_target_date | date | When resolution is expected |
| resolved_date | date | Actual resolution date (nullable) |
| linked_issue_id | uuid FK → issues (nullable) | Manual or auto-linked issue |
| linked_risk_id | uuid FK → risks (nullable) | Manual or auto-linked risk |
| linked_defect_id | uuid FK → defects (nullable) | Manual or auto-linked defect |
| linked_work_package_id | uuid FK → work_packages (nullable) | |
| linked_change_request_id | uuid FK → change_requests (nullable) | |
| **template_id** | uuid FK → delay_templates (nullable) | Set when copied from a template; NULL for standalone or auto-linked |
| **tailoring_notes** | text | Notes on what was changed from the template |
| **source_type** | text | `manual` / `from_template` / `auto_issue` / `auto_risk` / `auto_defect` |
| **is_auto_linked** | boolean | TRUE = created by trigger; FALSE = manually created |
| **auto_link_notes** | text | System-generated note describing why auto-linked (e.g. "Issue ISS-004 overdue by 3 days") |
| is_draft | boolean | On-hold/draft queue |
| draft_expires_at | timestamptz | |
| created_by | uuid FK → profiles | NULL when auto-created by trigger |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> **Unique constraint:** `UNIQUE(project_id, source_type, linked_issue_id)`, `UNIQUE(project_id, source_type, linked_risk_id)`, `UNIQUE(project_id, source_type, linked_defect_id)` — prevents duplicate auto-linked records for the same source.

#### Delay Categories (enum / check constraint)
- `weather` — Weather / natural event
- `resource` — Resource unavailability (people, equipment)
- `technical` — Technical / system issues
- `external_dependency` — External vendor or partner delay
- `change_request` — Approved change to scope/schedule
- `regulatory` — Regulatory or compliance requirement
- `financial` — Budget or funding hold
- `risk_materialised` — A risk that materialised
- `stakeholder` — Stakeholder decision or approval delay
- `other` — Other

### Auto-link Source Tables

| Source | Table | Overdue Condition | Status values that count as "unresolved" |
|--------|-------|-------------------|------------------------------------------|
| Issue | `issues` | `due_date < CURRENT_DATE` | `new`, `assigned`, `in_progress`, `reopened` |
| Risk | `risks` | `target_mitigation_date < CURRENT_DATE` | `identified`, `assessed`, `monitored` |
| Defect | `defects` | `due_date < CURRENT_DATE` | `new`, `open`, `in_progress`, `reopened`, `deferred` |

### Auto-link Behaviour
- **Create** — when a source record becomes overdue (trigger fires on UPDATE, or sync function scans on page load), a delay record is auto-inserted with `is_auto_linked = TRUE`, `source_type = 'auto_issue'/'auto_risk'/'auto_defect'`, and a system-generated title e.g. `"[AUTO] Issue ISS-004 overdue by 3 days"`.
- **Update** — if the linked source record's due date or status changes while still overdue, the auto-linked delay's `impact_schedule_days` and `auto_link_notes` are updated.
- **Resolve** — when the source record moves to `resolved` / `closed` / `mitigated`, the auto-linked delay's `status` is updated to `resolved` and `resolved_date` is stamped with the date the source record was resolved. The delay record is **never deleted** — it is retained permanently as a living document and historical audit trail of the delay event.
- **No duplicate** — unique constraints prevent a second auto-linked delay for the same source record.
- **Manual facility preserved** — users can still manually create delays and manually link them to any issue/risk/defect/work package; `is_auto_linked = FALSE` for all manually created records.
- **Editable after auto-creation** — PM / Team Manager can edit the title, description, category, severity, and resolution fields of auto-linked delays. The system-managed fields (`source_type`, `is_auto_linked`, link FKs) are read-only in the UI for auto-linked records.

#### `project_delay_owner_history` — audit trail of ownership changes

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| delay_id | uuid FK → project_delays | |
| project_id | uuid FK → projects | Denormalised for easy querying |
| previous_owner_id | uuid FK → profiles (nullable) | NULL on first assignment |
| new_owner_id | uuid FK → profiles | The incoming owner |
| changed_by_id | uuid FK → profiles (nullable) | Who made the change; NULL if auto-triggered |
| change_reason | text | Optional note explaining the handover |
| changed_at | timestamptz DEFAULT NOW() | When the change occurred |
| source_event | text | `manual_edit` / `auto_link_created` / `auto_resolved` / `status_change` — what triggered this entry |
| delay_status_at_change | text | Snapshot of the delay status at the time of this ownership change |

> A trigger on `project_delays` fires `AFTER UPDATE OF resolution_owner_id` and inserts a row into this table automatically. The table is **append-only** — no rows are ever updated or deleted, ensuring a full immutable audit log.

### Simulator (sim schema)
Mirror tables: `sim.delay_templates` + `sim.project_delays` + `sim.project_delay_owner_history` — same structure, FK to `sim.practice_projects`.  
Mirror triggers on `sim.issues`, `sim.risks`, `sim.defects` (if they exist) — otherwise sim delays are manual/template-based only.

---

## SQL Files

| File | Contents |
|------|----------|
| `v444_project_delays.sql` | Platform `delay_templates` + `project_delays` + `project_delay_owner_history` tables + RLS + indexes + DB registry |
| `v445_sim_project_delays.sql` | Simulator `sim.delay_templates` + `sim.project_delays` + `sim.project_delay_owner_history` + RLS + DB registry |
| `v446_project_delays_menu_items.sql` | Permissions + menu items + role assignments for all roles |
| `v447_delay_auto_link_triggers.sql` | Auto-link triggers + owner-change audit trigger + sync function for Platform |
| `v448_sim_delay_auto_link_triggers.sql` | Simulator equivalents of auto-link + owner-change audit triggers |

---

## Role Access Matrix

| Role | Access |
|------|--------|
| System Admin | Full CRUD + Copy |
| PMO Admin | Read-only all projects + Full CRUD on delay templates |
| Portfolio / Programme Manager | Read-only (all projects) + Copy |
| Project Manager | Full CRUD + Copy (own projects) |
| Team Manager / Team Lead | Read + Create + Edit + Copy (own project) |
| Project Assurance | Read-only (own project) |
| Quality Assurance | Read-only (own project) |
| Team Member | Read-only (own project) |
| Stakeholder | Read-only (own project) |

### Permissions to create
| Permission Code | Description |
|-----------------|-------------|
| `delay.view` | View delay register entries |
| `delay.create` | Log a new delay |
| `delay.edit` | Edit an existing delay |
| `delay.delete` | Delete / archive a delay |
| `delay.copy` | Copy a delay template into a project delay |
| `delay_template.view` | View PMO delay templates |
| `delay_template.create` | Create PMO delay templates |
| `delay_template.edit` | Edit PMO delay templates |
| `delay_template.delete` | Delete / archive PMO delay templates |

---

## Frontend File Structure

```
src/
  pages/
    delays/
      DelayRegister.jsx         # List view — PM full CRUD, others read-only
      DelayForm.jsx             # Create / edit modal (multi-step)
    pmo/
      DelayTemplates.jsx        # PMO: org-level delay template list (CRUD)
      DelayTemplateForm.jsx     # PMO: create / edit delay template modal
  services/
    delayService.js             # Platform CRUD (delays + templates)
  components/
    delays/
      DelayCard.jsx             # Card view for a single delay
      DelaySeverityBadge.jsx    # Coloured badge (Low/Medium/High/Critical)
      DelaySummaryStats.jsx     # Stats bar (total, open, resolved, total days lost)
      DelayOwnerHistory.jsx     # Ownership audit timeline

  # Simulator mirrors
  pages/
    sim/
      delays/
        SimDelayRegister.jsx
        SimDelayForm.jsx
      pmo/
        SimDelayTemplates.jsx   # Sim PMO: delay template list (CRUD)
        SimDelayTemplateForm.jsx
  services/
    sim/
      simDelayService.js
```

---

## Todo List

### Phase 1 — Database

- [x] **1.1** Create `v444_project_delays.sql`
  - `project_delays` table with all columns (including `resolution_owner_id`)
  - `project_delay_owner_history` table — append-only audit log
  - Auto-generate `delay_reference` via trigger (DLY-001, DLY-002…)
  - Trigger `trg_delay_owner_audit` — fires `AFTER INSERT OR UPDATE OF resolution_owner_id` on `project_delays`; inserts a row into `project_delay_owner_history` capturing previous owner, new owner, changed_by, timestamp, delay status at that moment
  - RLS on `project_delays`: PM/Team Manager — INSERT/UPDATE/DELETE own project; all project members — SELECT; PMO/Programme/Portfolio — SELECT all
  - RLS on `project_delay_owner_history`: all project members — SELECT; no direct INSERT/UPDATE/DELETE (append-only via trigger only)
  - Indexes on `project_delays`: `project_id`, `status`, `severity`, `created_at`
  - Index on `project_delay_owner_history`: `delay_id`, `changed_at`
  - DB registry entries for both tables

- [x] **1.2** Create `v445_sim_project_delays.sql`
  - Mirror `sim.project_delays` + `sim.project_delay_owner_history` in `sim` schema
  - Mirror owner-audit trigger in sim schema
  - RLS for sim roles on both tables
  - DB registry entries

- [x] **1.3** Create `v446_project_delays_menu_items.sql`
  - Insert `delay.view`, `delay.create`, `delay.edit`, `delay.delete`, `delay.copy` permissions
  - Insert `delay_template.view`, `delay_template.create`, `delay_template.edit`, `delay_template.delete` permissions (PMO only)
  - Assign permissions to roles:
    - `system_admin`, `pmo_admin`: all permissions
    - `portfolio_manager`, `programme_manager`, `project_manager`: `delay.view`, `delay.create`, `delay.edit`, `delay.delete`, `delay.copy`
    - `pm_team_manager`, `team_manager`, `team_lead`: `delay.view`, `delay.copy`, `delay.create` (enforced via RLS)
    - `pm_project_assurance`, `project_assurance`, `pm_quality_assurance`, `quality_assurance`: `delay.view`
    - `pm_team_member`, `team_member`, `stakeholder`: `delay.view`
  - Insert menu items into `menu_items` — including "Delay Templates" under PMO menu
  - Assign menu items via `role_menu_items`

- [x] **1.4** Create `v447_delay_auto_link_triggers.sql`
  - PostgreSQL function `auto_link_delay_from_issue()` — fires AFTER UPDATE on `issues`; if `due_date < CURRENT_DATE` and status is unresolved, upsert a delay record; if status moves to resolved/closed, resolve the linked delay and stamp `resolved_date`; when `assigned_to` / owner changes on the issue, also insert a row into `project_delay_owner_history` with `source_event = 'auto_link_owner_sync'`
  - PostgreSQL function `auto_link_delay_from_risk()` — same logic using `target_mitigation_date`; syncs risk owner changes to owner history
  - PostgreSQL function `auto_link_delay_from_defect()` — same logic using `due_date`; syncs defect assignee changes to owner history
  - Trigger `trg_issue_auto_delay` on `issues` (AFTER INSERT OR UPDATE OF due_date, status, assigned_to)
  - Trigger `trg_risk_auto_delay` on `risks` (AFTER INSERT OR UPDATE OF target_mitigation_date, status, risk_owner_id)
  - Trigger `trg_defect_auto_delay` on `defects` (AFTER INSERT OR UPDATE OF due_date, status, assigned_to)
  - Batch sync function `sync_overdue_delays(p_project_id UUID DEFAULT NULL)` — scans all three tables for overdue records and upserts delays; callable on demand or for a specific project; used by the "Sync Overdue" UI button

- [x] **1.5** Create `v448_sim_delay_auto_link_triggers.sql`
  - Mirror triggers and sync function in `sim` schema for `sim.issues`, `sim.risks`, `sim.defects` (add gracefully — skip if source tables don't exist in sim)

### Phase 2 — Service Layer

- [x] **2.1** Create `src/services/delayService.js`
  - `getDelaysByProject(projectId)` — all delays for a project
  - `getAllDelays(orgId)` — PMO: cross-project view
  - `createDelay(data)` — log new delay (sets `is_auto_linked = false`)
  - `updateDelay(id, data)` — edit delay (guards: cannot change `source_type` / `is_auto_linked` / link FKs on auto-linked records)
  - `deleteDelay(id)` — soft delete
  - `resolveDelay(id, resolvedDate)` — mark as resolved
  - `getDraftDelays(userId)` — draft queue
  - `getDelaySummary(projectId)` — stats: count, total days lost, by category, auto vs manual split
  - `syncOverdueDelays(projectId)` — calls `sync_overdue_delays(projectId)` DB function; returns count of newly created/updated delays
  - `getOwnerHistory(delayId)` — fetches all rows from `project_delay_owner_history` for a delay, ordered by `changed_at` ascending; used to render the ownership timeline
  - **Template CRUD (PMO only):**
  - `getDelayTemplates(orgId)` — list all org-level templates
  - `getDelayTemplate(id)` — single template
  - `createDelayTemplate(data)` — PMO creates new template
  - `updateDelayTemplate(id, data)` — PMO edits template
  - `deleteDelayTemplate(id)` — archive/delete template
  - `copyTemplateToDelay(templateId, projectId)` — returns pre-filled delay object (source_type = 'from_template'); project team calls this when selecting "Use Template"

- [x] **2.2** Create `src/services/sim/simDelayService.js` (mirrors above using simDb)

### Phase 3 — Platform Pages & Components

- [x] **3.1** Create `src/pages/delays/DelayRegister.jsx`
  - Project selector (scoped to user's projects; PMO sees all)
  - Summary stats bar: Total Delays | Open | Resolved | Total Days Lost | Auto-linked
  - Card + Table toggle with localStorage persistence
  - Sortable column headers (↑ ↓ ⇅) on: Reference, Title, Category, Severity, Impact Days, Status, Source, Date
  - Search bar + filters: status (including `resolved` — resolved records are always visible, never hidden), category, severity, **source (Manual / Auto-Issue / Auto-Risk / Auto-Defect)**
  - **"Use Template" button** (PM / Team Manager / Team Lead — `delay.copy` permission) — opens a searchable template picker modal (card list of active `delay_templates` for the org); on select, pre-fills `DelayForm` with template values and sets `source_type = 'from_template'` and `template_id`; consistent pattern with v352 ITTO "Copy from Template" flow
  - "Log Delay" button (PM / Team Manager only — standalone, no template)
  - **"Sync Overdue" button** (PM / Team Manager only) — calls `syncOverdueDelays(projectId)` and shows a toast: "3 new delays auto-linked from overdue issues/risks/defects"
  - Auto-linked rows show a distinct badge/icon (e.g. robot icon + source label "Auto: Issue ISS-004")
  - Export dropdown: Excel, Word, CSV, JSON, Print
  - Edit / Delete per row (PM / Team Manager only; auto-linked records show restricted edit — only user-editable fields)
  - Role-aware: read-only view for QA, Assurance, Team Member, Stakeholder

- [x] **3.2** Create `src/pages/delays/DelayForm.jsx` (modal)
  - **Step 1 — Basic Info:** Title, Category, Responsible Party, Identified Date, Severity
  - **Step 2 — Impact:** Schedule Days, Cost Impact, Scope Impact, Original Baseline Date, Revised Forecast Date
  - **Step 3 — Resolution:** Resolution Plan, Owner, Target Date, Status
  - **Step 4 — Links (optional):** Link to Issue / Risk / Defect / Work Package / Change Request
  - For auto-linked records: Steps 1–3 are editable; Step 4 link fields are read-only (show the auto-linked source with a lock icon and "Auto-managed" label)
  - On-hold / Save as Draft with expiry
  - Success confirmation showing delay reference (e.g. DLY-003)

- [x] **3.3** Create `src/pages/pmo/DelayTemplates.jsx`
  - PMO-only page at `/pmo/delays/templates`
  - Card + Table toggle with localStorage persistence
  - Sortable columns: Name, Category, Severity, Status, Tags, Created
  - Search + filter by category / status (draft / active / archived)
  - "New Template" button → opens `DelayTemplateForm.jsx`
  - Edit / Archive / Delete per row (PMO only)
  - Export dropdown: Excel, Word, CSV, JSON, Print
  - Shows usage count: how many project delays were derived from each template

- [x] **3.4** Create `src/pages/pmo/DelayTemplateForm.jsx` (modal)
  - **Step 1 — Template Info:** Name, Category, Default Severity, Tags, Status
  - **Step 2 — Content:** Delay Cause (typical root cause), Responsible Party, Resolution Plan Template
  - On-hold / Save as Draft with expiry
  - Success confirmation showing template name

- [x] **3.5** Add template picker modal to `src/pages/delays/DelayRegister.jsx`
  - Reusable `DelayTemplatePicker` modal (searchable card list of active org templates, with category + severity filters)
  - Triggered by the **"Use Template"** button on the list page
  - On select, opens `DelayForm` pre-filled from the chosen template; `template_id` and `source_type = 'from_template'` are set automatically; `tailoring_notes` field is shown so the project team can note what they changed from the template
  - `DelayForm` also retains a "Switch Template" link at the top of Step 1 so the user can swap to a different template before saving
  - Project team can override any pre-filled field in all steps
  - Mirrors v352 ITTO "Copy from Template" pattern for consistency

- [x] **3.6** Create `src/components/delays/DelayCard.jsx`
- [x] **3.7** Create `src/components/delays/DelaySeverityBadge.jsx`
- [x] **3.8** Create `src/components/delays/DelaySummaryStats.jsx`
- [x] **3.9** Create `src/components/delays/DelayOwnerHistory.jsx` — ownership audit timeline component
  - Rendered inside the delay detail / edit modal as a collapsible "Ownership History" section
  - Shows a vertical timeline: each entry displays previous owner → new owner, changed by, date/time, status at the time, change reason, and source event label (Manual Edit / Auto-Sync / Auto-Resolved)
  - All roles can view this timeline (read-only); it is always visible so any stakeholder can trace the full ownership chain over the delay lifecycle

### Phase 4 — Simulator Parity

- [x] **4.1** Create `src/pages/sim/delays/SimDelayRegister.jsx`
- [x] **4.2** Create `src/pages/sim/delays/SimDelayForm.jsx` (includes "Use Template" flow)
- [x] **4.3** `src/services/sim/simDelayService.js` (created in Phase 2)
- [x] **4.4** Create `src/pages/sim/pmo/SimDelayTemplates.jsx` — Simulator PMO delay template management
- [x] **4.5** Create `src/pages/sim/pmo/SimDelayTemplateForm.jsx`

### Phase 5 — Menu Config & Routes

- [x] **5.1** Add "Delay Register" to `src/config/pmDashboardMenuConfig.js`
  - "Delay Register" → `/pm/delays`
  - "Delay Drafts" → `/pm/delays/drafts`

- [x] **5.2** Add to `src/config/pmoMenuConfig.js` (under Project Oversight)
  - "Delay Register" → `/pmo/oversight/delays` (read-only, cross-project)
  - "Delay Templates" → `/pmo/delays/templates` (PMO full CRUD)

- [x] **5.3** Add "Delay Register" to `src/config/pmMenuConfig.js` (all other roles)
  - `permission: 'delay.view'` → `/platform/delays`

- [x] **5.4** Add to `src/config/simulatorPMMenuConfig.js`
- [x] **5.5** Add to `src/config/simulatorPMOMenuConfig.js`
- [x] **5.6** Add to `src/config/simulatorMenuConfig.js`

- [x] **5.7** Add routes in `src/App.jsx`
  - `/pm/delays` → DelayRegister
  - `/pm/delays/drafts` → DelayRegister (draft filter)
  - `/pmo/oversight/delays` → DelayRegister (read-only PMO view)
  - `/pmo/delays/templates` → DelayTemplates (PMO full CRUD)
  - `/platform/delays` → DelayRegister (read-only for other roles)
  - Simulator: `/simulator/pm/delays`, `/simulator/pmo/oversight/delays`, `/simulator/delays`
  - Simulator: `/simulator/pmo/delays/templates` → SimDelayTemplates

### Phase 6 — Unit Tests

- [x] **6.1** Create `src/services/__tests__/delayService.test.js`
- [x] **6.2** Create `src/services/__tests__/simDelayService.test.js`

### Phase 7 — Documentation

- [x] **7.1** Create `Documentation/v353_Project_Delays_Management_Guide.md`

---

## Key Design Decisions

1. **Dedicated register** — not an extension of issues or exceptions; delays are a first-class entity
2. **Links, not merges** — delays can optionally reference an issue/risk/defect/work package but remain independent records; existing tables are not altered
3. **Auto-reference** — `delay_reference` is auto-generated per project (DLY-001, DLY-002…) via a DB trigger for traceability
4. **PMO oversight** — PMO sees all delays across projects in a read-only aggregated view (same pattern as Risk/Issue oversight)
5. **Four-step form** — breaks down the complex data capture into Basic Info → Impact → Resolution → Links, using the existing multi-step pattern
6. **Draft queue** — delays can be saved on-hold and resumed later
7. **Amount field shorthand** — cost impact fields support shorthand input (e.g. `10k` → 10,000, `2m` → 2,000,000)
8. **Export** — full export on list and detail views using existing `exportUtils`
9. **Auto-link via DB triggers** — AFTER INSERT OR UPDATE triggers on `issues`, `risks`, `defects` fire when a due/target date passes without resolution; uses the same pattern as `v351_sim_practice_auto_defect_trigger.sql`; no application-layer polling needed
10. **Idempotent upsert** — unique constraints on `(project_id, source_type, linked_*_id)` ensure triggers never create duplicate delay entries for the same source record
11. **Auto-resolve stamping** — when a source issue/risk/defect moves to `resolved`/`closed`/`mitigated`, the trigger updates the linked delay's `status` to `resolved` and stamps `resolved_date` with the actual resolution date of the source record. The delay record is **never deleted or hidden** — it remains a permanent, living document in the register for future reference, lessons learned, and audit purposes. PMs can still manually update the `resolved_date` or override the status if the actual resolution date differs.
12. **Manual facility preserved** — `is_auto_linked = FALSE` for manually created delays; users can manually link any delay to any source record; auto-linked records show a lock icon on link fields to prevent accidental unlinking
13. **On-demand sync button** — "Sync Overdue" button in the UI calls `sync_overdue_delays()` for cases where triggers may have been bypassed (e.g. bulk imports, direct DB edits) or for the initial scan after feature deployment
14. **Defect module covered** — auto-link applies to the separate `defects` table (v340) in addition to `issues` and `risks`; all three sources are surfaced in the delay register with distinct `source_type` labels
15. **Owner audit trail** — a dedicated `project_delay_owner_history` table records every ownership change as an immutable append-only log; captures previous owner, new owner, who made the change, when, the delay status at that moment, and the source event (manual edit, auto-sync from source record, auto-resolved); no rows in this table are ever updated or deleted
16. **Owner sync from source records** — when the assignee/owner changes on a linked issue, risk, or defect, the auto-link triggers also append a row to `project_delay_owner_history` so that handovers on the source record are reflected in the delay's ownership audit trail, giving a complete picture even when ownership changed indirectly
17. **Ownership timeline in UI** — the `DelayOwnerHistory` component renders a full vertical timeline visible to all roles inside the delay detail view; this makes the delay register a true living document capturing the who, when, and why of every ownership handover throughout the resolution cycle

---

## Review

**Implementation summary (2026-04-11)**

- Added SQL migrations `v444`–`v448`: platform and simulator delay tables, RLS, menu/permissions, and auto-link triggers with `sync_overdue_delays` RPCs.
- Implemented `delayService.js` / `simDelayService.js`, `useDelayPermissions`, shared UI (`DelayRegister`, `DelayForm`, PMO template pages, `components/delays/*`), and wired routes plus static menu configs (PM, PMO, platform, simulator).
- Added unit tests for both services and `Documentation/v353_Project_Delays_Management_Guide.md`.
- **Deploy:** run SQL files in order on Supabase before using the UI. Ownership history shows user UUIDs until a future enhancement joins `users` for display names.
