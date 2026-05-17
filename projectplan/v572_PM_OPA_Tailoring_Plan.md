# v572 — PM OPA Copy / Customise (Project Template Tailoring)

**Objective:** Allow a Project Manager to browse PMO-defined OPA templates, copy one into their project workspace, hide/show fields to suit the project's tailoring decisions, and save a reusable project-specific version. Both Platform and Simulator must be updated (parity rule).

**Constraint:** Original `organisational_process_assets` rows are PMO-owned and must never be mutated by a PM.

**Status:** Implemented (2026-05-17). Run `SQL/v572_project_opa_tailoring_tables.sql` then `SQL/v573_project_opa_tailoring_menu_seed.sql` on Supabase (or apply migrations `20260517150000` + `20260517150100`).

---

## 1. Scope

A PM wants to take a PMO OPA of `opa_type = 'template'` (e.g. Risk Register Template, Work Package Template, WBS) and:

1. **Copy** it into their project context (snapshot of the OPA at the time of copy).
2. **Customise** its field visibility — mark each standard field as *shown* or *hidden* for this project's tailored process.
3. **Save** the customised version as a project-specific template they can revisit and update.
4. **Rename / version** it independently from the source OPA.

---

## 2. New Database Tables

### 2a. `project_opa_customisations` (Platform — `public` schema)

Stores one row per PM copy of an OPA template, linked to both the source OPA and the project.

```sql
CREATE TABLE public.project_opa_customisations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_opa_id        UUID NOT NULL REFERENCES public.organisational_process_assets(id),
  created_by           UUID NOT NULL REFERENCES auth.users(id),
  custom_title         TEXT NOT NULL,
  custom_description   TEXT,
  version              TEXT DEFAULT '1.0',
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  notes                TEXT,
  is_on_hold           BOOLEAN DEFAULT FALSE,
  on_hold_reason       TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  is_deleted           BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

### 2b. `project_template_field_config` (Platform — `public` schema)

Stores per-field visibility rules for a customisation. One row per field per customisation.

```sql
CREATE TABLE public.project_template_field_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customisation_id        UUID NOT NULL REFERENCES public.project_opa_customisations(id) ON DELETE CASCADE,
  field_key               TEXT NOT NULL,           -- e.g. 'title', 'description', 'effective_date'
  field_label             TEXT NOT NULL,           -- display label (may be overridden by PM)
  is_visible              BOOLEAN NOT NULL DEFAULT TRUE,
  is_required             BOOLEAN NOT NULL DEFAULT FALSE,
  custom_label            TEXT,                    -- PM can rename the field label
  sort_order              INT DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customisation_id, field_key)
);
```

### 2c. RLS Policies

```sql
-- project_opa_customisations: PM can CRUD their own project's customisations
-- PMO can view all (oversight)

-- project_template_field_config: access mirrors parent customisation
```

Full RLS SQL in v572 migration file.

### 2d. Simulator parity tables

Identical tables in `sim` schema:
- `sim.project_opa_customisations`
- `sim.project_template_field_config`

---

## 3. Canonical OPA Field Registry

The field visibility UI needs a fixed list of fields that map to the OPA record. This is defined in the frontend service (not DB) to keep it simple:

```js
export const OPA_FIELD_REGISTRY = [
  { key: 'title',              label: 'Title',              required: true  },
  { key: 'description',        label: 'Description',        required: false },
  { key: 'opa_type',           label: 'OPA Type',           required: false },
  { key: 'status',             label: 'Status',             required: false },
  { key: 'version',            label: 'Version',            required: false },
  { key: 'document_reference', label: 'Document Reference', required: false },
  { key: 'effective_date',     label: 'Effective Date',     required: false },
  { key: 'expiry_date',        label: 'Expiry Date',        required: false },
  { key: 'tags',               label: 'Tags',               required: false },
  { key: 'notes',              label: 'Notes',              required: false },
]
```

On first copy, all fields default to `is_visible = true`. PM can then toggle individual fields off.

---

## 4. New Frontend Pages

### Page A — OPA Template Browser (`/platform/opa?type=template`)

**File:** `src/pages/opa/OPAList.jsx` already exists — add a filter for `opa_type = 'template'` when accessed with `?type=template` query param. No new page needed, just a conditional filter.

Each template card gains a **"Use in Project →"** action button that routes to Page B.

### Page B — Project Template Library (`/platform/projects/:projectId/opa-templates`)

**File:** `src/pages/app/ProjectOPATemplates.jsx` (new)

Lists all `project_opa_customisations` for the current project. Actions:
- View customisation
- Edit (re-open field config)
- Archive
- **"Browse PMO Templates"** → links to Page A

Card / table toggle. Sort by `updated_at`, `custom_title`, `status`. Search bar.

### Page C — Copy & Customise OPA (`/platform/projects/:projectId/opa-templates/new?from_opa=:opaId`)

**File:** `src/pages/app/ProjectOPACopy.jsx` (new)

Multi-step form:

**Step 1 — Name & Describe**
- `custom_title` (pre-filled from source OPA title)
- `custom_description`
- `version`
- `status` (draft / active)
- `notes`
- Shows a read-only preview panel of the source OPA

**Step 2 — Field Visibility Configuration**
- Table listing all fields from `OPA_FIELD_REGISTRY`
- Per-field row: Toggle (show/hide), custom label input, required checkbox
- `title` is always visible and required (locked)
- Live preview panel on the right showing how the template looks

**Step 3 — Review & Save**
- Summary of customisation
- Preview of visible fields only
- Save → creates `project_opa_customisations` row + `project_template_field_config` rows (one per field)
- On-hold option available

### Page D — Customised Template Detail (`/platform/projects/:projectId/opa-templates/:customisationId`)

**File:** `src/pages/app/ProjectOPACustomisationDetail.jsx` (new)

Read-only view of the customised template. Shows:
- Custom title, description, version, status
- Source OPA reference (link back to original)
- Field configuration table (which fields are shown/hidden, custom labels)
- Export button (Word/PDF)
- Edit → back to Page C in edit mode
- Archive action

---

## 5. Service Layer

**File:** `src/services/projectOPATailoringService.js` (new)

```js
listProjectCustomisations(projectId)
getCustomisationById(id)
createCustomisation(payload, fieldConfigs)  // transactional: both tables
updateCustomisation(id, payload, fieldConfigs)
archiveCustomisation(id)
deleteCustomisation(id)          // soft delete
getFieldConfigs(customisationId)
```

**File:** `src/services/sim/simProjectOPATailoringService.js` (new, same interface using `simDb`)

---

## 6. PM Sidebar — §12 Additions

Under the existing `§12 Org Knowledge — EEF & OPA` section in the PM sidebar, add two new items:

| Menu Code | Label | Route | Access |
|---|---|---|---|
| `pm_opa_templates_browse` | Browse OPA Templates | `/platform/opa?type=template` | View |
| `pm_project_opa_templates` | My Project Templates | `/platform/projects/:id/opa-templates` | Full |

These are added via `v572_sql` (see §8).

---

## 7. Routing

Add to `App.jsx` inside the Platform protected routes:

```jsx
<Route path="/platform/projects/:projectId/opa-templates" element={<ProjectOPATemplates />} />
<Route path="/platform/projects/:projectId/opa-templates/new" element={<ProjectOPACopy />} />
<Route path="/platform/projects/:projectId/opa-templates/:customisationId" element={<ProjectOPACustomisationDetail />} />
```

Simulator equivalents under `/simulator/practice-projects/:projectId/opa-templates/*`.

---

## 8. SQL Files

| File | Purpose |
|---|---|
| `SQL/v572_project_opa_tailoring_tables.sql` | Create `project_opa_customisations` + `project_template_field_config` tables (Platform + Simulator), RLS, DB registry entries |
| `SQL/v573_project_opa_tailoring_menu_seed.sql` | Add two new menu items + grant to `project_manager` role |

---

## 9. Implementation Todo List

### Phase 1 — Database

- [x] Write `SQL/v572_project_opa_tailoring_tables.sql`
  - [x] Create `public.project_opa_customisations`
  - [x] Create `public.project_template_field_config`
  - [x] RLS: PM can CRUD own project rows; PMO can read all (Platform tables)
  - [x] Create `sim.project_opa_customisations` (parity — RLS: user_id-scoped, same pattern as other sim tables)
  - [x] Create `sim.project_template_field_config` (parity — RLS: access mirrors parent sim customisation)
  - [x] Register **all 4 tables** in `database_tables`:
    - `public.project_opa_customisations`
    - `public.project_template_field_config`
    - `sim.project_opa_customisations`
    - `sim.project_template_field_config`
- [x] Write `SQL/v573_project_opa_tailoring_menu_seed.sql`
  - [x] Platform: Insert `pm_opa_templates_browse` menu item → `/platform/opa?type=template`
  - [x] Platform: Insert `pm_project_opa_templates` menu item → `/app/projects/:id/opa-templates`
  - [x] Platform: Assign both to `project_manager` in `role_menu_items` (`pm_opa_templates_browse` View-only; `pm_project_opa_templates` Full)
  - [x] Simulator parity (included in v573 alongside Platform seed):
    - Insert `sim_pm_opa_templates_browse` → `/simulator/opa?type=template` [View]
    - Insert `sim_pm_project_opa_templates` → `/simulator/practice-projects/:id/opa-templates` [Full]
    - Assign both to `project_manager` in `role_menu_items`
  NOTE: v573 covers both Platform and Simulator OPA tailoring menu seeds. v571 does NOT need to duplicate these items.

### Phase 2 — Service Layer

- [x] Create `src/services/projectOPATailoringService.js` with CRUD functions
- [x] Create `src/services/sim/simProjectOPATailoringService.js`
- [x] Define `OPA_FIELD_REGISTRY` constant (export from service or shared constants file)

### Phase 3 — Frontend Pages

- [x] **`OPAList.jsx`** — add `?type=template` filter + "Use in Project →" card action
- [x] **`ProjectOPATemplates.jsx`** — project template library list page (card + table toggle, search, sort)
- [x] **`ProjectOPACopy.jsx`** — 3-step copy & customise form
  - Step 1: name/describe
  - Step 2: field visibility configurator (toggle + custom label per field)
  - Step 3: review & save
- [x] **`ProjectOPACustomisationDetail.jsx`** — read-only detail with export
- [x] Wire on-hold flow into ProjectOPACopy (put record on hold, retrieve from draft queue)

### Phase 4 — Routing

- [x] Add Platform routes to `App.jsx`
- [x] Add Simulator routes to `App.jsx` (sim equivalents)

### Phase 5 — Testing

- [x] Unit tests: `projectOPATailoringService.test.js`
- [x] Manual test: Browse PMO template → copy → configure fields → save → view in project template library

### Phase 6 — Verification

- [x] PM can see "Browse OPA Templates" in sidebar (§12)
- [x] PM can see "My Project Templates" in sidebar (§12)
- [x] PM can copy a template from the OPA list
- [x] Field visibility toggle works; title cannot be hidden
- [x] Customisation is scoped to project (other projects cannot see it)
- [x] PMO cannot mutate the source OPA via this flow
- [x] Simulator PM has the same capability under sim routes

---

## 10. Key Design Decisions

1. **Non-destructive copy**: The `source_opa_id` FK preserves traceability back to the PMO template. The source OPA is never modified.

2. **Field registry is code-defined**: Keeping `OPA_FIELD_REGISTRY` in JS (not DB) avoids a schema migration every time a field is added to OPAs. The field_config table stores per-field overrides; missing rows default to `is_visible = true`.

3. **`title` is always required / visible**: Enforced in both UI (disabled toggle) and DB (`CHECK` or app-level guard).

4. **Scoped to project**: `project_opa_customisations.project_id` means the customised template is visible only within that project. PMs from Project A cannot see Project B's customisations.

5. **Simulator parity via `sim` schema tables**: Sim pages use `simProjectOPATailoringService` which points to `simDb`. The UI components are shared where possible (props-driven) to avoid duplication.

---

## Review Notes

- **Delivered:** `SQL/v572_project_opa_tailoring_tables.sql`, `SQL/v573_project_opa_tailoring_menu_seed.sql`, Supabase migrations `20260517150000` + `20260517150100`, `projectOPATailoringService.js`, `simProjectOPATailoringService.js`, `useOPATailoringContext.js`, pages under `src/pages/app/`, `OPAList` / `SimOPAList` template mode, routes in `App.jsx`.
- **Routes:** Platform uses `/platform/projects/:projectId/opa-templates/*` (legacy `/app/*` redirects to `/platform/*`). Simulator uses `/simulator/practice-projects/:projectId/opa-templates/*`.
- **RLS:** Reuses `user_can_insert_project_template_copy` / `user_can_update_project_template_copy` and `auth_user_can_access_project` / `sim_auth_user_owns_run` from template library patterns.
- **Operator:** After deploy, run v572 then v573 SQL on Supabase; clear menu cache or re-login for sidebar items.
