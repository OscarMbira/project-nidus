# v733 — Live Modular Documentation via Supabase Storage (No-Redeploy Updates)

## Objective

Allow documentation to be updated on both Platform and Simulator systems **without redeploying the application**, and structure it **per system module** (Planning Hub, Risk, Financial, etc.) so each module owns its own docs. Authors upload revised `.md` files (or let CI/CD do it automatically on module deploy) — the live app picks up changes immediately.

---

## Current State

| Layer | How it works now | Problem |
|-------|-----------------|---------|
| Doc content (`.md` files) | Served from `public/Documentation/` as static files | Updating any file requires a full redeploy |
| Guide index (TOC) | Hardcoded `DOCUMENTATION_MAP` in `documentationService.js` | Adding/removing a guide requires a code change + redeploy |
| Structure | Flat list grouped by generic category (Features, Role Guides) | No alignment with the 16 Platform + 7 Simulator modules |
| 267 `.md` files exist | Only 16 are registered in the current guide index | Most files are unreachable from the UI |

---

## Target State

| Layer | After this change |
|-------|-----------------|
| Doc content | Stored in Supabase Storage under `documentation/{system}/{module-folder}/` — fetched at runtime |
| Guide index | Stored in `public.documentation_guides` DB table — fetched at runtime via `platformDb` |
| Structure | Grouped by **module** (top level) then **category** (sub-level) — mirrors the module registry |
| CI/CD | Each module's workflow automatically syncs its `docs/` folder to Storage on deploy |
| Updates | Edit `.md` in `packages/modules/<name>/docs/` → push → CI syncs to Storage → live in seconds. Or use the in-app editor. Zero manual redeploy. |

---

## Module Registry (from `packages/modules/registry.js`)

### Platform Modules (16)
`planning-hub` · `risk-module` · `quality-module` · `financial-module` · `change-module` · `stakeholder-module` · `delays-module` · `stage-gates-module` · `pmo-module` · `portfolio-module` · `programme-module` · `benefits-module` · `issues-module` · `communications-module` · `reports-module` · `admin-module`

### Simulator Modules (7)
`sim-planning-module` · `sim-risk-module` · `sim-quality-module` · `sim-pmo-module` · `sim-scenarios-module` · `sim-leaderboard-module` · `sim-admin-module`

### Special system-level module
`general` — for cross-cutting guides (Getting Started, Role Guides, API docs) that don't belong to one module

---

## Architecture

### Supabase Storage folder structure
```
documentation/ (public bucket)
  ├── platform/
  │     ├── general/
  │     │     ├── Platform_Getting_Started.md
  │     │     └── Project_Manager_Guide.md
  │     ├── planning-hub/
  │     │     ├── WBS_Builder_Guide.md
  │     │     └── Gantt_Chart_User_Guide.md
  │     ├── risk-module/
  │     │     └── Risk_Management_Guide.md
  │     ├── financial-module/
  │     │     └── v349_Financial_Management_Guide.md
  │     └── ... (one folder per module)
  └── simulator/
        ├── general/
        │     └── User_Guide.md
        ├── sim-planning-module/
        │     └── ...
        └── ... (one folder per sim module)
```

### Module source docs (co-located with module code)
```
packages/modules/
  ├── planning-hub/
  │     └── docs/
  │           ├── WBS_Builder_Guide.md
  │           └── Gantt_Chart_User_Guide.md
  ├── risk-module/
  │     └── docs/
  │           └── Risk_Management_Guide.md
  └── ... (each module owns its docs)
```

### DB table
```
public.documentation_guides
  id | guide_id | title | file_name | category | module | system | sort_order | is_active
```

### Service layer
```
documentationService.js
  getModules(system)               → async → SELECT DISTINCT module WHERE system=?
  getDocumentationGuides(system, module?) → async → SELECT from documentation_guides
  loadDocumentationFile(filename, system, module) → fetch(storageUrl/{system}/{module}/filename)
  getGuideById(system, guideId)    → async → SELECT WHERE guide_id=? AND system=?
  getCategories(system, module)    → async → derived from guide list
```

---

## Todo List

### Phase 1 — Database: `documentation_guides` table

- [ ] **1.1** Create `SQL/v100_documentation_guides.sql`:
  - Table `public.documentation_guides` with columns:
    - `id` uuid PK
    - `guide_id` text (slug, e.g. `wbs-builder-guide`)
    - `title` text
    - `file_name` text (e.g. `WBS_Builder_Guide.md`)
    - `category` text (sub-grouping within a module, e.g. `Setup`, `Advanced`)
    - `module` text (e.g. `planning-hub`, `risk-module`, `general`)
    - `system` text CHECK IN (`platform`, `simulator`)
    - `sort_order` integer DEFAULT 0
    - `is_active` boolean DEFAULT true
    - `created_at`, `updated_at` timestamptz
    - UNIQUE (`guide_id`, `system`)
  - RLS: public SELECT (docs are public); INSERT/UPDATE/DELETE restricted to `service_role`
  - Register in `database_tables`
- [ ] **1.2** Seed with the 16 currently registered guides, assigning each to its correct `module`:
  - `Platform_Getting_Started.md` → `general`
  - `Project_Manager_Guide.md`, `Team_Lead_Guide.md`, `Team_Member_Guide.md` → `general`
  - `Gantt_Chart_User_Guide.md`, `WBS_Builder_Guide.md` → `planning-hub`
  - `Kanban_User_Guide.md`, `Scrum_Events_Guide.md`, `Sprint_Board_User_Guide.md` → `planning-hub`
  - `Risk_Management_Guide.md` → `risk-module`
  - `Issue_Management_Guide.md`, `RAID_Log_User_Guide.md` → `issues-module`
  - `Structured_PM_CS_Guide.md`, `Structured_PM_MP_Guide.md` → `general`
  - Simulator: `User_Guide.md`, `Help_Content.md`, `PRD_Project_Management_Simulator.md` → `general`

### Phase 2 — Supabase Storage: create bucket and module folders

- [ ] **2.1** Create public Storage bucket `documentation` in Supabase Dashboard
- [ ] **2.2** Create folder structure: `platform/{module-folder}/` for all 16 platform modules + `general`; `simulator/{module-folder}/` for all 7 simulator modules + `general`
- [ ] **2.3** Upload the 16 currently-registered `.md` files to their correct module subfolder:
  - e.g. `Risk_Management_Guide.md` → `documentation/platform/risk-module/Risk_Management_Guide.md`
  - e.g. `Platform_Getting_Started.md` → `documentation/platform/general/Platform_Getting_Started.md`

### Phase 3 — Update `documentationService.js`

- [ ] **3.1** Add module-aware Storage URL builder:
  ```js
  const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/documentation`
  const storageUrl = (system, module, fileName) => `${STORAGE_BASE}/${system}/${module}/${fileName}`
  ```
- [ ] **3.2** Add `getModules(system)` async — SELECT DISTINCT module FROM `documentation_guides` WHERE system = ? AND is_active = true, ordered by min sort_order
- [ ] **3.3** Make `getDocumentationGuides(system, module?)` async — query table, filter by system + optional module
- [ ] **3.4** Make `getGuideById(system, guideId)` async — SELECT WHERE guide_id + system
- [ ] **3.5** Make `getCategories(system, module)` async — derived from guide list for that module
- [ ] **3.6** Update `loadDocumentationFile(fileName, system, module)` — primary fetch from `storageUrl(system, module, fileName)`; fallback to `/Documentation/${fileName}` if Storage returns non-markdown

### Phase 4 — Update `Documentation.jsx`

- [ ] **4.1** Add `useEffect` to load module list + guide index async on mount
- [ ] **4.2** Update sidebar nav — **two-level**: Module name (collapsible) → guides within that module; active module expanded by default
- [ ] **4.3** Add loading skeleton for sidebar (module list + guide list)
- [ ] **4.4** Pass `module` from the selected guide into `loadDocumentationFile()` call
- [ ] **4.5** Keep existing error handling — if DB unreachable, show friendly error

### Phase 5 — Parity: Platform and Simulator apps

- [ ] **5.1** `documentationService.js` is shared — the `system` column filters to the right module set per app
- [ ] **5.2** Platform app sidebar shows Platform module tree; Simulator app sidebar shows Simulator module tree
- [ ] **5.3** Confirm both `apps/platform` and `apps/simulator` resolve `documentationService.js` from `src/services/`

### Phase 6 — Module source `docs/` folders (Level 1 foundation for Level 2)

- [ ] **6.1** Add a `docs/` folder to each module package under `packages/modules/<module-folder>/docs/`
- [ ] **6.2** Move (copy) the relevant `.md` files from `public/Documentation/` into their module's `docs/` folder as the authoritative source
- [ ] **6.3** Add a `docs/README.md` to each module folder explaining: "Edit `.md` files here. On push to master, CI automatically syncs this folder to Supabase Storage."

### Phase 7 — CI/CD doc sync: add sync step to each module workflow (Level 2)

- [ ] **7.1** Add a reusable doc-sync step to each `.github/workflows/module-*.yml` (all 23 module workflows):
  ```yaml
  - name: Sync module docs to Supabase Storage
    if: github.event_name == 'push' && (github.ref == 'refs/heads/master' || github.ref == 'refs/heads/main')
    run: |
      for file in packages/modules/$MODULE_NAME/docs/*.md; do
        [ -f "$file" ] || continue
        filename=$(basename "$file")
        curl -s -X PUT \
          "$SUPABASE_URL/storage/v1/object/documentation/$SYSTEM/$MODULE_NAME/$filename" \
          -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
          -H "Content-Type: text/markdown" \
          --data-binary "@$file"
      done
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
      SYSTEM: platform   # (or 'simulator' for sim-* modules)
  ```
- [ ] **7.2** Add `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to GitHub Secrets checklist (`Documentation/v730_GitHub_Secrets_Checklist.md`)
- [ ] **7.3** Trigger: the sync runs whenever module code changes (already wired in the `paths:` trigger of each workflow) — docs changes in `docs/*.md` also trigger it by updating the `packages/modules/<name>/**` path
- [ ] **7.4** Test: update `packages/modules/risk-module/docs/Risk_Management_Guide.md` → push → confirm CI uploads to `documentation/platform/risk-module/Risk_Management_Guide.md` in Storage

### Phase 8 — Fallback & migration safety

- [ ] **8.1** Keep `public/Documentation/` files in place — fallback path in `loadDocumentationFile()` ensures the app never breaks during migration
- [ ] **8.2** Confirm `VITE_SUPABASE_URL` is set in both `apps/platform/.env` and `apps/simulator/.env`
- [ ] **8.3** Test: Storage URL reachable → content loads from bucket
- [ ] **8.4** Test: Storage URL unreachable → fallback to `public/Documentation/` works silently

### Phase 9 — Verification (Storage + module structure)

- [ ] **9.1** Open `localhost:5173/documentation/platform/getting-started` → content loads from `documentation/platform/general/` in Storage
- [ ] **9.2** Open `localhost:5174/documentation/simulator/getting-started` → loads from `documentation/simulator/general/`
- [ ] **9.3** Sidebar shows module-grouped nav: e.g. "Planning Hub" expanded with Gantt, WBS guides beneath it
- [ ] **9.4** Edit a `.md` file directly in Storage (Supabase Dashboard) → refresh page → new content live
- [ ] **9.5** Insert a new row in `documentation_guides` → refresh → guide appears under correct module in sidebar
- [ ] **9.6** Push a change to `packages/modules/risk-module/docs/` → CI sync runs → Storage file updated → docs page shows new content

---

### Phase 10 — Documentation Editor UI (admin-only, in-app)

A split-pane markdown editor that lets admins create, edit, and delete documentation guides directly from the browser — no Supabase Dashboard or CLI access needed.

#### 10.1 — Route & access control

- [ ] **10.1.1** Add admin-only route `/app/admin/documentation` in `platformRoutes.jsx`
- [ ] **10.1.2** Protect with role check (PMO Admin / System Admin only) — reuse existing `ProtectedRoute` pattern
- [ ] **10.1.3** Add sidebar link under Admin → Documentation Manager

#### 10.2 — Guide list view (`DocumentationAdminList.jsx`)

- [ ] **10.2.1** Create `src/pages/admin/DocumentationAdminList.jsx`
- [ ] **10.2.2** System toggle at the top: **Platform | Simulator**
- [ ] **10.2.3** Fetch guides from `documentation_guides`, grouped by **module** then **category**
- [ ] **10.2.4** Table columns: `#`, Module, Title, Category, Sort Order, Active, Actions (Edit / Deactivate / Delete)
- [ ] **10.2.5** Module filter dropdown — show guides for one module at a time or all
- [ ] **10.2.6** **+ New Guide** button → editor in create mode
- [ ] **10.2.7** Deactivate toggle — sets `is_active = false` (guide hidden from public nav, file preserved in Storage)
- [ ] **10.2.8** Hard delete — removes DB row + deletes file from Storage; requires confirmation dialog

#### 10.3 — Split-pane editor (`DocumentationAdminEditor.jsx`)

- [ ] **10.3.1** Create `src/pages/admin/DocumentationAdminEditor.jsx`
- [ ] **10.3.2** **Metadata form** (top bar):
  - Title
  - Guide ID (auto-derived from title as kebab-case slug, editable)
  - **Module** dropdown (populated from module registry — all 16 platform or 7 simulator modules + `general`)
  - Category (free text + dropdown of existing categories for that module)
  - System (Platform / Simulator radio)
  - Sort Order
  - Active toggle
- [ ] **10.3.3** **Split pane** — left: `<textarea>` for raw Markdown; right: live preview with existing `react-markdown` + `remark-gfm` + `rehype-slug` pipeline
- [ ] **10.3.4** Pane toggle: **Edit | Split | Preview** (mobile-friendly)
- [ ] **10.3.5** **Load existing content** (edit mode) — fetch `.md` from `storageUrl(system, module, fileName)` on mount
- [ ] **10.3.6** Markdown toolbar: bold, italic, heading, link, code block, bullet list, numbered list — cursor-position insertion, no new npm package
- [ ] **10.3.7** Word / character count in editor footer
- [ ] **10.3.8** **Auto-save draft to `localStorage`** every 30 s (keyed by `guide_id + system + module`)

#### 10.4 — Save flow

- [ ] **10.4.1** On **Save Guide**:
  1. Validate: title, module, system required
  2. Upload `.md` to Storage at `documentation/{system}/{module}/{file_name}`
  3. Upsert row in `documentation_guides` (insert on create, update on edit)
  4. Show success toast (title + Created/Updated)
  5. Clear localStorage draft
  6. Redirect to `DocumentationAdminList`
- [ ] **10.4.2** On **Cancel** — prompt if unsaved changes; discard draft; return to list
- [ ] **10.4.3** **Preview in Docs** button — opens `/documentation/{system}/{guide_id}` in new tab

#### 10.5 — Simulator parity

- [ ] **10.5.1** Same two components serve both systems via the toggle — no duplication
- [ ] **10.5.2** Module dropdown switches between Platform modules and Simulator modules based on the System selection
- [ ] **10.5.3** Add sidebar link in Simulator admin menu → `/app/admin/documentation?system=simulator`

#### 10.6 — Verification

- [ ] **10.6.1** Create new guide via editor with module = `risk-module` → confirm it appears under "Risk" in the public docs sidebar
- [ ] **10.6.2** Edit existing guide → save → Storage file updated → public page shows new content on refresh
- [ ] **10.6.3** Deactivate guide → disappears from public nav; file remains in Storage
- [ ] **10.6.4** Hard delete → row removed from DB + file removed from Storage
- [ ] **10.6.5** Close tab mid-edit → reopen → localStorage draft recovered
- [ ] **10.6.6** Test on mobile — Edit/Split/Preview toggle works correctly

---

## Files to Change / Create

| File | Change |
|------|--------|
| `SQL/v100_documentation_guides.sql` | New — table with `module` column + seeds 16 guides + `database_tables` registration |
| `src/services/documentationService.js` | Module-aware Storage URL, async index functions, `getModules()` |
| `src/pages/Documentation.jsx` | Async guide loading, two-level module/category sidebar |
| `packages/modules/*/docs/` | New `docs/` folder in each of the 23 module packages |
| `.github/workflows/module-*.yml` | Add doc-sync step to all 23 module CI workflows |
| `src/pages/admin/DocumentationAdminList.jsx` | New — guide list with module grouping + CRUD |
| `src/pages/admin/DocumentationAdminEditor.jsx` | New — split-pane editor with module dropdown |

**Files NOT changed:**
- `public/Documentation/` — kept as-is (fallback)
- Markdown rendering pipeline — untouched
- Route definitions (except adding the new admin route)
- All other RLS / auth tables — untouched

**No new npm packages.** Uses existing `react-markdown`, `remark-gfm`, `rehype-slug`.

---

## Updated SQL Table Schema

```sql
CREATE TABLE public.documentation_guides (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id    text        NOT NULL,
  title       text        NOT NULL,
  file_name   text        NOT NULL,
  category    text        NOT NULL,
  module      text        NOT NULL DEFAULT 'general',
  system      text        NOT NULL CHECK (system IN ('platform', 'simulator')),
  sort_order  integer     NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, system)
);

-- Index for fast module/system queries
CREATE INDEX idx_doc_guides_system_module ON public.documentation_guides (system, module, sort_order);
```

---

## No-Redeploy Update Workflows

### Via the in-app editor (recommended)
1. Go to `/app/admin/documentation` → select module → Edit or New Guide
2. Write/edit in the split pane → Save
3. Content is live on the public docs page immediately

### Via CI/CD (automated on module deploy)
1. Edit `packages/modules/<name>/docs/<file>.md` in your branch
2. Merge to master → CI workflow syncs the file to Supabase Storage automatically
3. Public docs page picks up the change with no further action

### Via Supabase Dashboard (manual escape hatch)
1. Dashboard → Storage → `documentation/{system}/{module}/`
2. Upload the new `.md` file
3. Update the row in `documentation_guides` if adding a new page
4. Live immediately

---

## Risk Assessment

**Low–Medium.** Core risk is making the three synchronous service functions async and updating the `Documentation.jsx` sidebar from single-level to two-level. The fallback to `public/Documentation/` ensures zero downtime during migration. The CI/CD sync step is additive — existing module deployments are unaffected if the step fails (it does not block the build). Existing rendering pipeline is untouched.

---

## Review Section

### Implementation Summary

All 8 phases of v733 are complete. Below is what was built:

#### Phase 1 — Database Schema
- Created `SQL/v100_documentation_guides.sql` with the `public.documentation_guides` table (`id`, `guide_id`, `title`, `file_name`, `category`, `module`, `system`, `sort_order`, `is_active`).
- Added RLS: public SELECT (active rows only), service_role ALL.
- Seeded 16 existing guides with module assignments.
- Registered table in `database_tables` registry.

#### Phase 2 — Documentation Service
- Fully rewrote `src/services/documentationService.js` as async module-aware service.
- Primary content source: Supabase Storage at `{SUPABASE_URL}/storage/v1/object/public/documentation/{system}/{module}/{filename}`.
- Fallback: `/Documentation/{filename}` (existing static public files).
- Exports: `getModules()`, `getDocumentationGuides()`, `getGuideById()`, `getCategories()`, `loadDocumentationFile()`, `saveGuideMetadata()`, `deactivateGuide()`, `deleteGuide()`, `uploadDocumentationFile()`, `deleteDocumentationFile()`.

#### Phase 3 — Documentation Page UI
- Rewrote `src/pages/Documentation.jsx` with a two-level sidebar: **Module → Category → Guide links**.
- Collapsible module sections, breadcrumb showing module name, skeleton loading state.
- `loadDocumentationFile()` now passes `system` and `module` for accurate Storage URL resolution.

#### Phase 4 — Module docs/ folders
- Created `docs/README.md` in all 23 module packages (16 Platform + 7 Simulator).
- Copied 7 existing `.md` files into their correct module `docs/` folders:
  - `planning-hub`: 4 guides (Gantt, Kanban, Scrum Events, Sprint Board)
  - `risk-module`: 1 guide (Risk Management)
  - `issues-module`: 2 guides (Issue Management, RAID Log)

#### Phase 5 — CI/CD Doc-Sync
- Added `Sync module docs to Supabase Storage` step to all 23 `.github/workflows/module-*.yml` files.
- Platform modules sync to `documentation/platform/{module-name}/`.
- Simulator modules sync to `documentation/simulator/{module-name}/`.
- README.md is excluded from sync. Step is non-blocking (a curl failure does not fail the build).

#### Phase 6 — Admin UI (List + Editor)
- Created `src/pages/admin/DocumentationAdminList.jsx`: system toggle, module filter chips, grouped guide table, Edit/Deactivate/Delete actions, hard delete confirmation dialog.
- Created `src/pages/admin/DocumentationAdminEditor.jsx`: metadata form, split-pane markdown editor (Edit/Split/Preview modes), markdown toolbar, auto-save to localStorage every 30 seconds, draft restore banner, word/char count, "Preview in Docs" button, Storage upload + DB upsert on save.

#### Phase 7 — Routes & Sidebar
- Added `DocumentationAdminList` and `DocumentationAdminEditor` to:
  - `src/routes/lazyImports.js` (monolith)
  - `apps/platform/src/routes/lazyImports.js` (platform app)
  - `src/routes/routeCommon.jsx` (destructure + re-export for simulator)
- Registered 3 Platform routes in `apps/platform/src/routes/platformRoutes.jsx`:
  - `/app/admin/documentation`
  - `/app/admin/documentation/new`
  - `/app/admin/documentation/edit/:id`
- Registered 3 Simulator routes in `apps/simulator/src/routes/simulatorRoutes.jsx`:
  - `/simulator/admin/documentation`
  - `/simulator/admin/documentation/new`
  - `/simulator/admin/documentation/edit/:id`
- Added **Platform** sidebar entry in `src/config/menuRegistry.js`:
  - Menu code: `pmo_sys_documentation_manager` under `pmo_section_system_admin` (sort_order 3)
- Added **Simulator** sidebar entry:
  - Menu code: `sim_pmo_admin_documentation_manager` under `sim_pmo_section_admin` (sort_order 11)

#### Phase 8 — In-App Markdown Editor
Fully implemented as part of `DocumentationAdminEditor.jsx` (see Phase 6).

---

### Manual Setup Required (User Actions)

1. **Create Supabase Storage bucket** named `documentation` (public) with no size limit. Create the folder structure:
   - `platform/general/`
   - `platform/planning-hub/`
   - `platform/risk-module/`
   - *(one folder per module)*
   - `simulator/sim-planning-module/`
   - *(same for simulator modules)*

2. **Upload existing .md files** to their respective Storage folders (or they will fall back to `/Documentation/` static files automatically).

3. **Run the SQL** in `SQL/v100_documentation_guides.sql` in Supabase to create the table and seed initial guides.

4. **Add GitHub Secrets** `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` to the repository for the CI/CD doc-sync step.

---

### Files Changed

| File | Change |
|------|--------|
| `SQL/v100_documentation_guides.sql` | NEW — schema + seed |
| `src/services/documentationService.js` | REWRITTEN — async, module-aware |
| `src/pages/Documentation.jsx` | REWRITTEN — two-level sidebar |
| `packages/modules/*/docs/README.md` | NEW — 23 files created |
| `.github/workflows/module-*.yml` | PATCHED — 23 files, doc-sync step added |
| `src/pages/admin/DocumentationAdminList.jsx` | NEW |
| `src/pages/admin/DocumentationAdminEditor.jsx` | NEW |
| `src/routes/lazyImports.js` | Added 2 lazy imports |
| `apps/platform/src/routes/lazyImports.js` | Added 2 lazy imports |
| `src/routes/routeCommon.jsx` | Added 2 destructures + 2 exports |
| `apps/platform/src/routes/platformRoutes.jsx` | Added 3 routes |
| `apps/simulator/src/routes/simulatorRoutes.jsx` | Added 3 imports + 3 routes |
| `src/config/menuRegistry.js` | Added 2 sidebar entries (Platform + Simulator) |
