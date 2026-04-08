# v347 — Project Template Library & Per-Project Tailoring System
## Implementation Plan

**Date:** 2026-04-07  
**Author:** Project Nidus Team  
**Scope:** Platform (public schema) + Simulator (sim schema)  
**SQL Versions:** `v406_template_library_tables.sql` (core tables), `v407_template_library_menu_seed.sql` (menu seed) — sequenced after existing migrations in `SQL/`.  

---

## Problem Statement

The system currently has isolated, domain-specific templates (e.g., `rms_organization_templates`, `qms_organization_templates`, `lifecycle_templates`). There is no:
- Unified template library across document types
- Mechanism for PMs / Team Leads to browse master templates and create project-specific tailored copies
- Change history/audit trail on tailored copies
- Governance boundary (PMO owns originals; PM/TL own project copies)

---

## Solution Overview

A **three-layer template architecture**:

```
┌────────────────────────────────────────┐
│  LAYER 1: Master Template Library      │  ← PMO/Admin only (create/edit/publish)
│  (template_library)                    │
└───────────────────┬────────────────────┘
                    │ "Create a copy for my project"
                    ▼
┌────────────────────────────────────────┐
│  LAYER 2: Project Template Copies      │  ← PM / Team Lead (tailor per project)
│  (project_template_copies)             │
└───────────────────┬────────────────────┘
                    │ every save creates a snapshot
                    ▼
┌────────────────────────────────────────┐
│  LAYER 3: Change History / Versions    │  ← Auto-generated, read-only audit
│  (template_copy_versions)              │
└────────────────────────────────────────┘
```

The master templates are **never modified** by anyone below PMO level. Each project copy is independent; changes to the master after a copy is taken do NOT propagate automatically (PMO can optionally push an update notification).

---

## Template Types in Scope

| template_type_code | Display Name | Linked Module |
|--------------------|--------------|---------------|
| `risk_register` | Risk Register | Risks |
| `project_mandate` | Project Mandate / Charter | Mandates |
| `project_brief` | Project Brief | Briefs |
| `business_case` | Business Case | Business Case |
| `benefits_review_plan` | Benefits Review Plan | Benefits |
| `issue_log` | Issue Log | Issues |
| `quality_register` | Quality Register | Quality |
| `change_management` | Change Management System | Changes |
| `config_management` | Configuration Management System | Config |
| `stakeholder_register` | Stakeholder Register | Stakeholders |
| `communication_plan` | Communication Management Plan | Communications |
| `lessons_learned` | Lessons Learned Log | Lessons |
| `work_package` | Work Package | Work Packages |
| `highlight_report` | Highlight Report | Reports |
| `checkpoint_report` | Checkpoint Report | Reports |
| `test_plan` | Test Plan | Testing |
| `generic` | Generic / Custom | — |

---

## Roles & Access

### Master Template Library
| Role | Permissions |
|------|-------------|
| system_admin | Full CRUD on master templates + publish/archive/delete |
| pmo_admin | Full CRUD on master templates + publish/archive |
| project_manager | Read published templates only |
| team_lead | Read published templates only |
| team_member | Read published templates only |
| stakeholder | Read published templates only |
| viewer | Read published templates only |

### Project Template Copies
| Role | Permissions |
|------|-------------|
| system_admin | Full CRUD on all project copies |
| pmo_admin | Full CRUD on all project copies |
| project_manager | Create copies for own projects; full CRUD on own project copies |
| team_lead | Create copies for assigned projects; CRUD on own copies |
| team_member | Read project copies in their project |
| stakeholder | Read project copies in their project |
| viewer | Read project copies |

---

## Database Schema

### SQL File: `v406_template_library_tables.sql` (implemented; original plan referenced v102)

---

#### Table 1: `template_categories` (Platform — public schema)
Lookup table for grouping templates.

```
id              UUID PK
category_code   VARCHAR(50) UNIQUE NOT NULL
category_name   VARCHAR(100) NOT NULL
description     TEXT
sort_order      INT DEFAULT 0
is_active       BOOLEAN DEFAULT true
created_at, updated_at
```

**Seeded categories:**
- Initiation (project_mandate, project_brief, business_case)
- Planning (benefits_review_plan, communication_plan, stakeholder_register)
- Control (risk_register, issue_log, quality_register, change_management, config_management)
- Delivery (work_package, checkpoint_report, highlight_report, lessons_learned)
- Closure (lessons_learned, highlight_report)
- Testing (test_plan)
- Generic

---

#### Table 2: `template_library` (Platform — public schema)
Master templates, PMO-managed.

```
id                  UUID PK
account_id          UUID → accounts (org scope)
category_id         UUID → template_categories
template_type_code  VARCHAR(50) NOT NULL  -- from the type list above
title               VARCHAR(200) NOT NULL
description         TEXT
purpose             TEXT
content             JSONB NOT NULL DEFAULT '{}'  -- structured template content
content_schema      JSONB  -- optional: describes expected fields per type
version             VARCHAR(20) DEFAULT '1.0'
status              VARCHAR(20) DEFAULT 'draft'  -- draft | published | archived | deprecated
is_default          BOOLEAN DEFAULT false  -- one default per type per org
tags                TEXT[]
notes               TEXT
published_at        TIMESTAMPTZ
published_by        UUID → users
archived_at         TIMESTAMPTZ
archived_by         UUID → users
created_by          UUID → users
updated_by          UUID → users
created_at, updated_at
is_deleted          BOOLEAN DEFAULT false
```

**Indexes:** account_id, template_type_code, status, category_id, is_default

---

#### Table 3: `template_library_versions` (Platform — public schema)
Auto-snapshot whenever a master template is saved/published — immutable audit trail.

```
id                  UUID PK
template_id         UUID → template_library ON DELETE CASCADE
version_number      VARCHAR(20) NOT NULL
content_snapshot    JSONB NOT NULL  -- full copy of content at that version
change_description  TEXT
changed_by          UUID → users
changed_at          TIMESTAMPTZ DEFAULT NOW()
is_published        BOOLEAN DEFAULT false
```

---

#### Table 4: `project_template_copies` (Platform — public schema)
Per-project tailored copy of a master template.

```
id                  UUID PK
template_id         UUID → template_library  -- source master
project_id          UUID → projects ON DELETE CASCADE
account_id          UUID → accounts
title               VARCHAR(200) NOT NULL  -- can differ from master
description         TEXT
content             JSONB NOT NULL DEFAULT '{}'  -- tailored content
current_version     INT DEFAULT 1  -- increments on each save
status              VARCHAR(20) DEFAULT 'draft'  -- draft | active | archived
copied_from_version VARCHAR(20)  -- master version at time of copy
notes               TEXT
is_on_hold          BOOLEAN DEFAULT false
on_hold_reason      TEXT
created_by          UUID → users
updated_by          UUID → users
created_at, updated_at
```

**Constraints:**
- UNIQUE (template_id, project_id) — one tailored copy per template per project

**Indexes:** project_id, template_id, account_id, status

---

#### Table 5: `template_copy_versions` (Platform — public schema)
Auto-snapshot on every save of a project template copy — full history.

```
id                  UUID PK
copy_id             UUID → project_template_copies ON DELETE CASCADE
version_number      INT NOT NULL
content_snapshot    JSONB NOT NULL
change_description  TEXT  -- user enters optional note
changed_by          UUID → users
changed_at          TIMESTAMPTZ DEFAULT NOW()
```

**Indexes:** copy_id, changed_at

---

#### Table 6: `template_update_notifications` (Platform — public schema)
When PMO updates a master template, notify project owners who have copies.

```
id                  UUID PK
template_id         UUID → template_library
copy_id             UUID → project_template_copies
notification_type   VARCHAR(50) DEFAULT 'master_updated'
message             TEXT
is_read             BOOLEAN DEFAULT false
notified_user_id    UUID → users
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### Simulator Mirror Tables (sim schema)

All 6 tables above are mirrored in the `sim` schema:
- `sim.template_categories`
- `sim.template_library`
- `sim.template_library_versions`
- `sim.project_template_copies` (project_id → sim.simulation_runs)
- `sim.template_copy_versions`
- `sim.template_update_notifications`

---

### RLS Policies

**`template_library`:**
- SELECT: authenticated users in same org (status = 'published') OR role IN (system_admin, pmo_admin) for all statuses
- INSERT/UPDATE/DELETE: role IN (system_admin, pmo_admin) only

**`project_template_copies`:**
- SELECT: users who are members of the project OR system_admin/pmo_admin
- INSERT: system_admin, pmo_admin, project_manager, team_lead
- UPDATE: created_by = current user OR system_admin/pmo_admin
- DELETE: system_admin, pmo_admin only

**`template_copy_versions` / `template_library_versions`:**
- SELECT: same as parent copy/template
- INSERT: system (trigger-based auto-insert on parent update)
- NO UPDATE/DELETE (immutable)

---

### DB Triggers

1. **`trg_snapshot_template_on_save`** — fires AFTER UPDATE on `template_library`, inserts a row into `template_library_versions`
2. **`trg_snapshot_copy_on_save`** — fires AFTER UPDATE on `project_template_copies`, increments `current_version`, inserts a row into `template_copy_versions`
3. **`trg_notify_copy_owners`** — fires AFTER UPDATE on `template_library` when status becomes 'published', inserts notification rows for all active project_template_copies of that template

---

### Permissions to add in `v102_template_library_tables.sql`

```
template_library.create, template_library.read, template_library.update,
template_library.delete, template_library.publish, template_library.archive,
template_copy.create, template_copy.read, template_copy.update,
template_copy.delete, template_copy.export, template_copy.view_history
```

---

## Menu Structure — `v407_template_library_menu_seed.sql`

New top-level menu: **"Template Library"** (icon: `file-text`, colour: `#7C3AED`)

| menu_code | Label | Route | Who sees it |
|-----------|-------|-------|-------------|
| `template_library` | Template Library | /platform/templates | All roles |
| `template_library_browse` | Browse Templates | /platform/templates | All roles |
| `template_library_manage` | Manage Templates | /platform/templates/manage | system_admin, pmo_admin |
| `template_library_new` | New Template | /platform/templates/new | system_admin, pmo_admin |
| `template_library_categories` | Categories | /platform/templates/categories | system_admin, pmo_admin |
| `template_library_project_copies` | My Project Templates | /platform/templates/project-copies | PM, TL, TM, stakeholder, viewer |
| `template_library_notifications` | Update Notifications | /platform/templates/notifications | All roles |

Simulator routes mirror under `/simulator/templates/...`.

---

## Frontend — Platform

### Services
- `src/services/templateLibraryService.js` — CRUD on master templates, publish, archive, search by type/category
- `src/services/projectTemplateCopyService.js` — create copy from master, tailor, save (auto-snapshots), compare versions, restore version

### Pages — `src/pages/templates/`

| File | Purpose | Access |
|------|---------|--------|
| `TemplateLibraryList.jsx` | Browse all published templates (card/table toggle, filter by type/category/tag, search, export list) | All roles |
| `TemplateLibraryManage.jsx` | PMO management view — all statuses, CRUD actions | PMO/Admin |
| `TemplateCreate.jsx` | Multi-step wizard: category → type → content → publish | PMO/Admin |
| `TemplateEdit.jsx` | Edit master template with version note prompt on save | PMO/Admin |
| `TemplateDetail.jsx` | Read-only view with version history timeline, "Create Project Copy" button | All roles |
| `TemplateMasterVersionHistory.jsx` | Full version history of master with diff viewer | PMO/Admin |
| `TemplateCategories.jsx` | CRUD for template categories | PMO/Admin |
| `ProjectTemplateCopyList.jsx` | List of all project template copies for a project | PM/TL/TM |
| `ProjectTemplateCopyCreate.jsx` | Select a master → auto-populate fields → tailor & save | PM/TL |
| `ProjectTemplateCopyEdit.jsx` | Edit a tailored copy; prompts for optional change note on save | PM/TL |
| `ProjectTemplateCopyDetail.jsx` | Read-only view of tailored copy with full version history timeline | All project members |
| `ProjectTemplateCopyVersionHistory.jsx` | All versions with diff viewer, restore-to-version action | PM/TL |
| `TemplateOnHold.jsx` | Draft/on-hold queue for in-progress template copies | PM/TL |
| `TemplateBulkUpload.jsx` | Bulk upload templates via CSV/Excel | PMO/Admin |
| `TemplateUpdateNotifications.jsx` | Inbox: master template updated → review diff, dismiss | All roles |

---

## Key UX Flows

### Flow 1: PMO Creates a Master Template
1. PMO navigates to **Template Library → New Template**
2. Multi-step wizard:
   - Step 1: Select category + template type
   - Step 2: Fill in title, description, purpose, tags
   - Step 3: Fill structured content (fields depend on `template_type_code`)
   - Step 4: Preview & save as draft or publish
3. On save: version snapshot auto-created (v1.0), status = draft
4. On publish: status = published, notifies no one (first publish)
5. On edit after publish: version increments, all project copy owners notified

### Flow 2: PM Creates a Project Template Copy
1. PM navigates to **Template Library → Browse Templates**
2. Finds the relevant template (e.g., Risk Register)
3. Clicks **"Create a Project Copy"**
4. Selects target project from dropdown (only their projects)
5. System pre-populates form with master template content
6. PM tailors: edits fields, adds project-specific content
7. Saves — system auto-saves version snapshot (v1)
8. Template copy appears under the project's template list

### Flow 3: PM Edits a Tailored Copy
1. PM opens project template copy
2. Edits fields freely
3. On save: optional prompt "Describe this change (optional)"
4. System auto-increments version, stores snapshot
5. History tab shows all versions with who changed what and when

### Flow 4: PMO Updates a Master Template
1. PMO edits and republishes a master template
2. System triggers notifications to all users with active project copies of that template
3. Users see a notification badge on "Template Library → Update Notifications"
4. User can open notification, view a diff (what changed in the master)
5. User decides whether to manually merge changes into their project copy

### Flow 5: Restore a Previous Version
1. PM opens version history of their project copy
2. Selects any historical version
3. Clicks "Restore this version"
4. Confirmation dialog: "This will create a new version based on v3. Current version is v7."
5. System creates a new snapshot (v8) with restored content + note "Restored from v3"

---

## Content Structure (JSONB) by Template Type

The `content` JSONB field is flexible. Each `template_type_code` has a defined schema stored in `content_schema`. Example:

**`risk_register` content schema:**
```json
{
  "sections": [
    { "key": "purpose", "label": "Purpose", "type": "richtext" },
    { "key": "scope", "label": "Scope", "type": "richtext" },
    { "key": "risk_categories", "label": "Risk Categories", "type": "list" },
    { "key": "probability_scale", "label": "Probability Scale", "type": "table" },
    { "key": "impact_scale", "label": "Impact Scale", "type": "table" },
    { "key": "risk_matrix", "label": "Risk Matrix", "type": "matrix" },
    { "key": "roles_responsibilities", "label": "Roles & Responsibilities", "type": "richtext" }
  ]
}
```

The form builder renders input fields based on the schema. This keeps the create/edit forms structured per type while remaining flexible for new types.

---

## Frontend — Simulator

### Services
- `src/services/sim/simTemplateLibraryService.js`
- `src/services/sim/simProjectTemplateCopyService.js`

### Pages — `src/pages/simulator/templates/`

Mirror of all Platform pages, prefixed `Sim`:
- `SimTemplateLibraryList.jsx`
- `SimTemplateLibraryManage.jsx`
- `SimTemplateCreate.jsx`
- `SimTemplateEdit.jsx`
- `SimTemplateDetail.jsx`
- `SimTemplateMasterVersionHistory.jsx`
- `SimTemplateCategories.jsx`
- `SimProjectTemplateCopyList.jsx`
- `SimProjectTemplateCopyCreate.jsx`
- `SimProjectTemplateCopyEdit.jsx`
- `SimProjectTemplateCopyDetail.jsx`
- `SimProjectTemplateCopyVersionHistory.jsx`
- `SimTemplateOnHold.jsx`
- `SimTemplateBulkUpload.jsx`
- `SimTemplateUpdateNotifications.jsx`

---

## Routes — `src/App.jsx`

### Platform
```
/platform/templates                          → TemplateLibraryList
/platform/templates/manage                   → TemplateLibraryManage
/platform/templates/new                      → TemplateCreate
/platform/templates/categories               → TemplateCategories
/platform/templates/on-hold                  → TemplateOnHold
/platform/templates/bulk-upload              → TemplateBulkUpload
/platform/templates/notifications            → TemplateUpdateNotifications
/platform/templates/project-copies           → ProjectTemplateCopyList
/platform/templates/:id                      → TemplateDetail
/platform/templates/:id/edit                 → TemplateEdit
/platform/templates/:id/versions             → TemplateMasterVersionHistory
/platform/templates/copies/:copyId           → ProjectTemplateCopyDetail
/platform/templates/copies/:copyId/edit      → ProjectTemplateCopyEdit
/platform/templates/copies/:copyId/versions  → ProjectTemplateCopyVersionHistory
/platform/templates/copies/new               → ProjectTemplateCopyCreate
```

### Simulator
Same paths prefixed with `/simulator` (e.g. `/simulator/templates`).

---

## UI Feature Checklist (per CLAUDE.md rules)

- [x] Dark theme default
- [x] Card ⊞ / Table ≡ toggle (localStorage per page)
- [x] Sortable column headers (↑ ↓ ⇅)
- [x] Search bar in both views
- [x] Export dropdown on list pages (Excel, Word, PPT, CSV, XML, JSON, Print)
- [x] Export on detail/view pages (PPT, Word, Excel)
- [x] On-hold/draft queue
- [x] Bulk upload (CSV template downloadable)
- [x] Success confirmation modal (record ID + operation)
- [x] PWA-optimised
- [x] Theme-aware (dark/light)
- [x] Version diff viewer (side-by-side or highlighted changes)
- [x] Restore-to-version with confirmation dialog

---

## Unit Tests

- `src/__tests__/templateLibraryService.test.js`
- `src/__tests__/projectTemplateCopyService.test.js`
- `src/__tests__/sim/simTemplateLibraryService.test.js`
- `src/__tests__/sim/simProjectTemplateCopyService.test.js`

---

## Documentation

- `Documentation/Template_Library_User_Guide.md`
- `Documentation/Template_Library_Blog_Post.md`

---

## TODO Checklist

### Phase 1 — Database
- [x] Create `SQL/v406_template_library_tables.sql`
  - [x] `template_categories` (Platform + seed data)
  - [x] `template_library` table
  - [x] `template_library_versions` table
  - [x] `project_template_copies` table
  - [x] `template_copy_versions` table
  - [x] `template_update_notifications` table
  - [x] DB triggers (snapshot on save, notify on master publish)
  - [x] RLS policies for all tables
  - [x] Mirror all tables in `sim` schema with same structure
  - [x] RLS for sim tables
  - [x] Insert permissions for new module
  - [x] Assign permissions to roles
  - [x] Register all tables in `database_tables`
- [x] Create `SQL/v407_template_library_menu_seed.sql`
  - [x] Insert "Template Library" parent menu
  - [x] Insert all sub-menu items
  - [x] Assign to all 7 roles (filtered by what each role can see)

### Phase 2 — Platform Services
- [x] `src/services/templateLibraryService.js`
  - [x] getAll, getById, getByType, getPublished
  - [x] create, update, publish, archive, delete
  - [x] getVersionHistory
- [x] `src/services/projectTemplateCopyService.js`
  - [x] createCopy (from master), getByProject, getById
  - [x] update (with auto-snapshot), getVersionHistory
  - [x] restoreVersion, putOnHold, resumeFromHold
  - [x] export (Excel, Word, PPT)

### Phase 3 — Platform Pages (Master Library)
- [x] `src/pages/templates/TemplateLibraryList.jsx`
- [x] `src/pages/templates/TemplateLibraryManage.jsx`
- [x] `src/pages/templates/TemplateCreate.jsx` (multi-step wizard)
- [x] `src/pages/templates/TemplateEdit.jsx`
- [x] `src/pages/templates/TemplateDetail.jsx`
- [x] `src/pages/templates/TemplateMasterVersionHistory.jsx`
- [x] `src/pages/templates/TemplateCategories.jsx`
- [x] `src/pages/templates/TemplateBulkUpload.jsx`
- [x] `src/pages/templates/TemplateUpdateNotifications.jsx`

### Phase 4 — Platform Pages (Project Copies)
- [x] `src/pages/templates/ProjectTemplateCopyList.jsx`
- [x] `src/pages/templates/ProjectTemplateCopyCreate.jsx`
- [x] `src/pages/templates/ProjectTemplateCopyEdit.jsx`
- [x] `src/pages/templates/ProjectTemplateCopyDetail.jsx`
- [x] `src/pages/templates/ProjectTemplateCopyVersionHistory.jsx`
- [x] `src/pages/templates/TemplateOnHold.jsx`

### Phase 5 — Simulator Services
- [x] `src/services/sim/simTemplateLibraryService.js`
- [x] `src/services/sim/simProjectTemplateCopyService.js`

### Phase 6 — Simulator Pages (Master Library)
- [x] `src/pages/simulator/templates/SimTemplateLibraryList.jsx`
- [x] `src/pages/simulator/templates/SimTemplateLibraryManage.jsx`
- [x] `src/pages/simulator/templates/SimTemplateCreate.jsx`
- [x] `src/pages/simulator/templates/SimTemplateEdit.jsx`
- [x] `src/pages/simulator/templates/SimTemplateDetail.jsx`
- [x] `src/pages/simulator/templates/SimTemplateMasterVersionHistory.jsx`
- [x] `src/pages/simulator/templates/SimTemplateCategories.jsx`
- [x] `src/pages/simulator/templates/SimTemplateBulkUpload.jsx`
- [x] `src/pages/simulator/templates/SimTemplateUpdateNotifications.jsx`

### Phase 7 — Simulator Pages (Project Copies)
- [x] `src/pages/simulator/templates/SimProjectTemplateCopyList.jsx`
- [x] `src/pages/simulator/templates/SimProjectTemplateCopyCreate.jsx`
- [x] `src/pages/simulator/templates/SimProjectTemplateCopyEdit.jsx`
- [x] `src/pages/simulator/templates/SimProjectTemplateCopyDetail.jsx`
- [x] `src/pages/simulator/templates/SimProjectTemplateCopyVersionHistory.jsx`
- [x] `src/pages/simulator/templates/SimTemplateOnHold.jsx`

### Phase 8 — Routing
- [x] Add all Platform template lazy imports + routes to `src/App.jsx`
- [x] Add all Simulator template lazy imports + routes to `src/App.jsx`

### Phase 9 — Tests & Docs
- [x] `src/__tests__/templateLibraryService.test.js`
- [x] `src/__tests__/projectTemplateCopyService.test.js`
- [x] `src/__tests__/sim/simTemplateLibraryService.test.js`
- [x] `src/__tests__/sim/simProjectTemplateCopyService.test.js`
- [x] `Documentation/Template_Library_User_Guide.md`
- [x] `Documentation/Template_Library_Blog_Post.md`

---

## Review

**Completed:** 2026-04-08

**Summary**

- **Database:** Added `v406_template_library_tables.sql` (public + `sim` mirror, RLS, triggers for master/project snapshots and master-update notifications, permissions, `database_tables` registration) and `v407_template_library_menu_seed.sql` (sidebar menu + `role_menu_items`). Sequencing uses **v406/v407** to follow the existing `SQL/` numbering (plan originally cited v102/v103).
- **Services:** `templateLibraryService.js`, `projectTemplateCopyService.js`, `sim/simTemplateLibraryService.js`, `sim/simProjectTemplateCopyService.js`, plus `templateLibraryConstants.js` for type codes and default content schema.
- **UI:** All Platform pages under `src/pages/templates/` and Simulator under `src/pages/simulator/templates/`; routes `/platform/templates/...` and `/simulator/templates/...` registered in `App.jsx`. Simulator sidebar entries added in `simulatorMenuConfig.js`.
- **Tests:** Vitest smoke tests for the four services.
- **Docs:** `Documentation/Template_Library_User_Guide.md`, `Documentation/Template_Library_Blog_Post.md`.

**Notes**

- Production `npm run build` still hits the existing **vite-plugin-pwa** precache size limit on the large `project-*.js` chunk (unchanged by this feature); JS compile completed before that step.
- Apply **v406** then **v407** on Supabase before relying on menus/RLS in production.
- **On-hold list pages** (`TemplateOnHold` / `SimTemplateOnHold`) now include **card/table toggle**, **search**, and **ExportListMenu** (parity with CLAUDE.md list-page rules). Master version “diff” is **side-by-side JSON** snapshots (not a semantic text diff engine).
