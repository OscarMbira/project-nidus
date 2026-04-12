# v352 — ITTO Management (Inputs, Tools & Techniques, Outputs)

**Date:** 2026-04-11  
**Branch:** feature/platform-terminology  
**SQL start version:** v439  
**Systems:** Platform (public schema) + Simulator (sim schema)

---

## Overview

Implement a full ITTO (Inputs, Tools & Techniques, Outputs) management system:

1. **PMO creates ITTO Templates** — org-level reusable definitions
2. **PMs copy & tailor templates** — project-specific ITTO instances
3. **ITTO instances attach to projects** — visible in project context
4. **Sidebar access for all roles** — full role coverage (see Role Access Matrix below)

---

## Role Access Matrix

### Platform Roles

| Role | Role Code | Templates | Project ITTOs | Notes |
|------|-----------|-----------|---------------|-------|
| System Admin | `system_admin` | Full CRUD | Full CRUD | Superuser |
| PMO Admin | `pmo_admin` | Full CRUD | Read-only (all projects) | Creates/manages org templates |
| Portfolio Manager | `portfolio_manager` | Read + Copy | Read-only (all projects) | Cross-project visibility |
| Programme Manager | `programme_manager` | Read + Copy | Read-only (all projects) | Cross-project visibility |
| Project Manager | `project_manager` | Read + Copy | Full CRUD (own projects) | Creates project-specific ITTOs |
| Team Manager | `pm_team_manager` / `team_manager` | Read + Copy | Read + Comment (own project) | Uses `pmMenuConfig.js` permission `itto.view`, `itto.copy` |
| Project Assurance | `pm_project_assurance` / `project_assurance` | Read-only | Read-only (own project) | Oversight role |
| Quality Assurance | `pm_quality_assurance` / `quality_assurance` | Read-only | Read-only (own project) | QA oversight |
| Team Member | `pm_team_member` / `team_member` | Read-only | Read-only (own project) | Basic visibility |
| Team Lead | `team_lead` | Read + Copy | Read-only (own project) | Same access as Team Manager for templates |
| Stakeholder | `stakeholder` | Read-only | Read-only (own project) | View only |

### Simulator Roles (mirrors above in sim schema)
All roles listed above have equivalent access in the Simulator system under `/simulator/*` routes.

### Permissions to create
| Permission Code | Description |
|-----------------|-------------|
| `itto.view` | View ITTO templates and project ITTOs |
| `itto.create` | Create ITTO templates (PMO) or project ITTOs (PM) |
| `itto.edit` | Edit ITTO templates or project ITTOs |
| `itto.delete` | Delete/archive ITTO templates or project ITTOs |
| `itto.copy` | Copy an ITTO template into a project |

### Menu Config Mapping
| Role | Menu Config File | ITTO Route |
|------|-----------------|------------|
| PMO Admin | `pmoMenuConfig.js` | `/pmo/itto/templates` |
| Project Manager | `pmDashboardMenuConfig.js` | `/pm/itto/templates`, `/pm/itto/project` |
| All other roles | `pmMenuConfig.js` (permission: `itto.view`) | `/platform/itto/templates`, `/platform/itto/project` |
| Sim PMO | `simulatorPMOMenuConfig.js` | `/simulator/pmo/itto/templates` |
| Sim PM | `simulatorPMMenuConfig.js` | `/simulator/pm/itto/templates`, `/simulator/pm/itto/project` |
| All other Sim roles | `simulatorMenuConfig.js` | `/simulator/itto/templates`, `/simulator/itto/project` |

---

## Data Model

### Platform (public schema)

#### `itto_templates` — org-level templates created/managed by PMO
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| organisation_id | uuid FK | |
| name | text | Template name |
| process_group | text | Initiating / Planning / Executing / M&C / Closing |
| knowledge_area | text | e.g. Scope, Time, Cost, Risk, etc. |
| description | text | |
| inputs | jsonb | Array of { id, name, description, source } |
| tools_techniques | jsonb | Array of { id, name, type, description } |
| outputs | jsonb | Array of { id, name, description, destination } |
| tags | text[] | Searchable tags |
| status | text | draft / active / archived |
| is_draft | boolean | On-hold/draft queue |
| draft_expires_at | timestamptz | Auto-expire drafts |
| created_by | uuid FK → profiles |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `project_ittos` — project-specific copies/tailored versions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| project_id | uuid FK → projects |
| template_id | uuid FK → itto_templates (nullable — standalone) |
| name | text | Can differ from template |
| process_group | text | |
| knowledge_area | text | |
| description | text | |
| inputs | jsonb | Tailored copy |
| tools_techniques | jsonb | Tailored copy |
| outputs | jsonb | Tailored copy |
| tags | text[] | |
| status | text | draft / active / archived |
| is_draft | boolean | |
| draft_expires_at | timestamptz | |
| tailoring_notes | text | Notes on what was changed from template |
| created_by | uuid FK → profiles |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Simulator (sim schema)
Mirror tables: `sim.itto_templates` and `sim.project_ittos`  
Same structure but pointing to `sim.practice_projects`.

---

## SQL Files

| File | Contents |
|------|----------|
| `v439_itto_templates.sql` | Platform `itto_templates` table + RLS + indexes + DB registry |
| `v440_project_ittos.sql` | Platform `project_ittos` table + RLS + indexes + DB registry |
| `v441_sim_itto_tables.sql` | Simulator `sim.itto_templates` + `sim.project_ittos` + RLS |
| `v442_itto_menu_items.sql` | Menu/nav DB records (if applicable) |
| `v443_itto_seed_templates.sql` | 5–10 standard ITTO template seeds (PMBoK-style, copyright-free) |

---

## Frontend File Structure

```
src/
  pages/
    itto/
      ITTOTemplateList.jsx       # PMO: list of org-level templates
      ITTOTemplateForm.jsx       # PMO: create/edit template (modal)
      ProjectITTOList.jsx        # PM: list of project-specific ITTOs
      ProjectITTOForm.jsx        # PM: create/copy/edit project ITTO (modal)
  services/
    ittoService.js               # Platform CRUD + copy-from-template
  components/
    itto/
      ITTOCard.jsx               # Card view for a single ITTO
      ITTODetailView.jsx         # Read-only expanded view
      ITTOProcessGroupBadge.jsx  # Coloured badge (Initiating, Planning…)

  # Simulator mirrors
  pages/
    sim/
      itto/
        SimITTOTemplateList.jsx
        SimProjectITTOList.jsx
  services/
    sim/
      simIttoService.js
```

---

## Todo List

### Phase 1 — Database

- [x] **1.1** Create `v439_itto_templates.sql` (Platform templates table, RLS, indexes, DB registry)
- [x] **1.2** Create `v440_project_ittos.sql` (Platform project ITTO table, RLS, indexes, DB registry)
- [x] **1.3** Create `v441_sim_itto_tables.sql` (Simulator mirrors in sim schema)
- [x] **1.4** Create `v443_itto_seed_templates.sql` (seed data — standard ITTO templates)

### Phase 2 — Service Layer (Platform)

- [x] **2.1** Create `src/services/ittoService.js`
  - `getITTOTemplates(orgId)` — PMO: all templates for org
  - `createITTOTemplate(data)` — PMO: create template
  - `updateITTOTemplate(id, data)` — PMO: edit template
  - `deleteITTOTemplate(id)` — PMO: soft delete / archive
  - `getProjectITTOs(projectId)` — PM: ITTOs for a project
  - `createProjectITTO(data)` — PM: standalone or from template copy
  - `copyFromTemplate(templateId, projectId, tailoringNotes)` — deep copy
  - `updateProjectITTO(id, data)` — PM: save tailored version
  - `deleteProjectITTO(id)` — PM: remove from project
  - `getDraftITTOs(userId)` — on-hold queue

### Phase 3 — Platform Pages & Components

- [x] **3.1** Create `src/pages/itto/ITTOTemplateList.jsx`
  - Card + Table toggle, search, filter by process group / knowledge area
  - Sort by name / process group / created date
  - Export dropdown (Excel, Word, CSV, JSON, Print)
  - Create button (opens ITTOTemplateForm modal)
  - PMO role: full CRUD; PM role: read + copy

- [x] **3.2** Create `src/pages/itto/ITTOTemplateForm.jsx` (modal)
  - Multi-step: Step 1 = Basic info, Step 2 = Inputs, Step 3 = Tools & Techniques, Step 4 = Outputs
  - Dynamic add/remove rows for each ITTO section
  - On-hold/save as draft with expiry
  - Success confirmation on save

- [x] **3.3** Create `src/pages/itto/ProjectITTOList.jsx`
  - Scoped to selected project
  - Card + Table toggle, search, filter by status / process group
  - "Copy from Template" button — opens template picker modal
  - Export dropdown
  - Full CRUD for PM

- [x] **3.4** Create `src/pages/itto/ProjectITTOForm.jsx` (modal)
  - Pre-fills from template if copy-flow
  - Tailoring notes field
  - On-hold/draft queue
  - Success confirmation

- [x] **3.5** Create `src/components/itto/ITTOCard.jsx` — card view component
- [x] **3.6** Create `src/components/itto/ITTODetailView.jsx` — expandable detail read view
- [x] **3.7** Create `src/components/itto/ITTOProcessGroupBadge.jsx` — badge component

### Phase 4 — Simulator Parity

- [x] **4.1** Create `src/services/simIttoService.js` (mirrors ittoService using simDb; path `src/services/simIttoService.js` — same folder as other sim services)
- [x] **4.2** Create `src/pages/sim/itto/SimITTOTemplateList.jsx`
- [x] **4.3** Create `src/pages/sim/itto/SimITTOTemplateForm.jsx`
- [x] **4.4** Create `src/pages/sim/itto/SimProjectITTOList.jsx`
- [x] **4.5** Create `src/pages/sim/itto/SimProjectITTOForm.jsx`

### Phase 5 — Menu Config & Routes

- [x] **5.1** Add ITTO section to `src/config/pmoMenuConfig.js`
  - "ITTO Templates" → `/pmo/itto/templates`
  - "ITTO Drafts" → `/pmo/itto/drafts` (PMO admin only)

- [x] **5.2** Add ITTO section to `src/config/pmDashboardMenuConfig.js`
  - "ITTO Templates" (read + copy) → `/pm/itto/templates`
  - "Project ITTOs" → `/pm/itto/project`
  - "ITTO Drafts" → `/pm/itto/drafts`

- [x] **5.3** Add ITTO section to `src/config/pmMenuConfig.js` (covers Team Managers, Team Members, QA, Project Assurance, Team Lead, Stakeholder, Programme/Portfolio Managers)
  - "ITTO Templates" with `permission: 'itto.view'` → `/platform/itto/templates`
  - "Project ITTOs" with `permission: 'itto.view'` → `/platform/itto/project`
  - "ITTO Drafts" with `permission: 'itto.create'` → `/platform/itto/drafts`

- [x] **5.4** Add ITTO section to `src/config/simulatorPMOMenuConfig.js`
- [x] **5.5** Add ITTO section to `src/config/simulatorPMMenuConfig.js`
- [x] **5.6** Add ITTO section to `src/config/simulatorMenuConfig.js` (covers Sim Team Managers, Team Members, QA, Project Assurance)

- [x] **5.7** Add ITTO permissions to DB via `v442_itto_menu_items.sql`:
  - Insert `itto.view`, `itto.create`, `itto.edit`, `itto.delete`, `itto.copy` into `permissions`
  - Assign permissions to roles:
    - `system_admin`, `pmo_admin`: all 5 permissions
    - `portfolio_manager`, `programme_manager`, `project_manager`: `itto.view`, `itto.create`, `itto.edit`, `itto.delete`, `itto.copy`
    - `pm_team_manager`, `team_manager`, `team_lead`: `itto.view`, `itto.copy`, `itto.create` (project ITTOs only, enforced via RLS)
    - `pm_project_assurance`, `project_assurance`, `pm_quality_assurance`, `quality_assurance`: `itto.view`
    - `pm_team_member`, `team_member`, `stakeholder`: `itto.view`
  - Insert menu items into `menu_items` table
  - Assign menu items to all roles via `role_menu_items`

- [x] **5.8** Add routes in `src/App.jsx`
  - `/pmo/itto/templates` → ITTOTemplateList (PMO view, full CRUD)
  - `/pm/itto/templates` → ITTOTemplateList (PM view, read + copy)
  - `/pm/itto/project` → ProjectITTOList (PM full CRUD)
  - `/pm/itto/drafts` → **ITTODraftsQueue** (drafts for current user; not only project-scoped list)
  - `/platform/itto/templates` → ITTOTemplateList (read-only for all other roles)
  - `/platform/itto/project` → ProjectITTOList (read-only for Team Manager/Member/QA/Assurance)
  - `/platform/itto/drafts` → **ITTODraftsQueue**
  - Simulator equivalents: `/simulator/pmo/itto/*`, `/simulator/pm/itto/*`, `/simulator/itto/*`

### Phase 6 — Unit Tests

- [x] **6.1** Create `src/services/__tests__/ittoService.test.js`
- [x] **6.2** Create `src/services/__tests__/simIttoService.test.js`

### Phase 7 — Documentation

- [x] **7.1** Create `Documentation/v352_ITTO_Management_Guide.md`

---

## Key Design Decisions

1. **PMO owns templates** — only PMO (and above) can create/edit/delete org-level templates
2. **Copy-on-use** — PMs, Team Managers, and Team Leads can copy templates into projects; templates are never mutated by non-PMO roles
3. **Standalone allowed** — PMs can also create project ITTOs from scratch (no template required)
4. **jsonb for arrays** — inputs/tools/outputs stored as jsonb arrays for flexible schema
5. **Process groups** — aligned to standard PM process groups (Initiating, Planning, Executing, Monitoring & Controlling, Closing)
6. **Knowledge areas** — Integration, Scope, Schedule, Cost, Quality, Resource, Communications, Risk, Procurement, Stakeholder
7. **Draft queue** — both templates and project ITTOs support on-hold with auto-expiry
8. **Export** — full export capability (Excel, Word, PPT, CSV, JSON, Print) using existing exportUtils
9. **Role-gating in UI** — pages detect user role and show/hide Create/Edit/Delete buttons accordingly; read-only roles see view-only interface
10. **RLS enforces access at DB level** — even if UI buttons are bypassed, RLS policies ensure Team Members/QA/Assurance can only SELECT, not INSERT/UPDATE/DELETE
11. **Three menu entry points** — `/pmo/itto/*` (PMO Admin), `/pm/itto/*` (PM Dashboard), `/platform/itto/*` (all other roles via pmMenuConfig permission gating)

---

## Review

**Status:** Implemented (2026-04-11).

**Summary**

- Added SQL migrations `v439`–`v443`: `itto_templates`, `project_ittos`, simulator mirrors, permissions/menu seed, optional seed templates per account (and copy into `sim.itto_templates` when present).
- **Platform:** `ittoService.js`, ITTO list/form pages, shared components (`ITTOCard`, `ITTODetailView`, `ITTOProcessGroupBadge`), `ITTODraftsQueue` for `/pmo/itto/drafts`, `/pm/itto/drafts`, `/platform/itto/drafts`, `useIttoPermissions` for UI gating.
- **Simulator:** `simIttoService.js` at `src/services/simIttoService.js` (parity with other `sim*` services), thin `Sim*` pages under `src/pages/sim/itto/`.
- **Menus:** `pmoMenuConfig`, `pmDashboardMenuConfig`, `pmMenuConfig`, `simulatorPMOMenuConfig`, `simulatorPMMenuConfig`, `simulatorMenuConfig`.
- **Routes:** `App.jsx` — platform `/platform/itto/*`, PM `/pm/itto/*`, PMO `/pmo/itto/*`, simulator `/simulator/itto/*`, `/simulator/pm/itto/*`, `/simulator/pmo/itto/*`.
- **Tests:** `ittoService.test.js`, `simIttoService.test.js` (Vitest + mocked clients).
- **Docs:** `Documentation/v352_ITTO_Management_Guide.md`.

**Notes**

- Organisation key is `organisation_id` → `accounts.id` (aligned with existing `rfp_documents` naming).
- Draft routes use `ITTODraftsQueue` (lists template drafts + project ITTO drafts for the user) instead of reusing `ProjectITTOList` alone.
- Apply SQL migrations in order before using the feature in Supabase.
- **UI completeness (post-review):** Template list includes filters for process group, **knowledge area**, and **status**; project ITTO list includes **process group** and **status**; both table views include sortable **Created** and **Updated** columns for created-date sorting.
