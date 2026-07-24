## Repo-scoped SQL & plans

Use the **current repo’s** folders — do not put admin SQL/plans in the monorepo or platform SQL/plans in the admin repo.

| Repo | SQL | Plans |
|------|-----|-------|
| **`E:\project-nidus`** (Platform/Simulator monorepo) | `E:\project-nidus\SQL\` — versioned `v{N}_*.sql` for **`public`** and **`sim`** schemas | `E:\project-nidus\projectplan\` — versioned plan files |
| **`E:\project-nidus-admin`** (Admin app) | `E:\project-nidus-admin\SQL\` — versioned `v{N}_*.sql` for **`admin`** schema | `E:\project-nidus-admin\projectplans\` — versioned plan files |

- **When working in `project-nidus`:** create SQL under `SQL/` and plans under `projectplan/` in this repo only.
- **When working in `project-nidus-admin`:** create SQL under `SQL/` and plans under `projectplans/` in that repo only (see its `CLAUDE.md`).
- **Cross-repo features:** may need SQL and/or plans in **both** repos; each artifact stays in the repo where that work is done. Link paths across repos in the plan text — do not merge into one folder.

## Standard Workflow
1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md. Where it is necessary, you can create a new file for the plan in order to maitain different plans for different features/functionality and to avoid the projectplan.md file growing so big or overwriting the previous content. Make a logical judgement to create additional and separate planning files.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information.
8. When creating a new page/component/form/visualisation items etc, always make them theme aware to toggle between dark and light mode depending on the user preferences. **See rule 28.1 (mandatory theme-aware checklist).**
9. Always create all SQL command files (*.sql) under the SQL folder in the root
10. Always create all documentation files (*.md) under the Documentation folder in the root, except for this CLAUDE.md file which should remain in the root directory
11. Always create all CSV data files (*.csv) under the "CSV Files" folder in the root
12. Do not insert any sample/dummy data unless I specify *(exception: companion seed SQL files per rule 18.2 when implementing new features)*
13. After creation any new features, always create and attach to the role-based sidebar menu and sublinks
14. When creating any SQL files(*.sql), recall that I am using supabase as the backend and it requires 15. PostgreSQL. So make sure the SQL syntax is aligned accordingly.
15. The countries field on any page(system-wide) should only show the DB table "countries" details where the is_active field is true. This always applies to all dropdown list for the country field.
16. Make sure after successfully creating/updating any application record/table, there is a succesful form displayed to show the user that the update was successful with record specific information like record id, CRUD operation that was performed.
16.1 **Display ID in URLs (mandatory when ID Generation exists).** If a table has a human-readable `display_id` (from Admin ID Generation / `admin.generate_display_id`), deep links for view/edit/detail **must put that display ID in the URL** (e.g. `?id=GTL-0001` or path segment), not the UUID primary key. Loaders must resolve by `display_id` **or** UUID (backward compatible). Mutations still use the UUID after the row is loaded. Prefer `display_id` in success toasts. Applies to Platform, Simulator, and Admin. Adopt when creating or next amending a record flow.
17. All SQL files(*.sql) should be created in the folder SQL for easy access. This SQL folder should be created on the root if it doesn't exist
18. When creating any SQL files, make sure to give some version name that shows the sequence and rpecedence by which the files are created and for future refence. 
18.1 Can you apply the same sequencing logic when creating implementation plans in projectplan folder. Versions for easy of knowing the sequence.
18.2 **Seed data (Platform, Simulator, and Admin):** Whenever a new feature introduces new database tables or demo-worthy reference data, create a **companion seed SQL file** in the **same repo’s** `SQL/` folder as the infrastructure migration — separate from the migration file. **Platform** seeds: `public` schema in `E:\project-nidus\SQL\`. **Simulator** seeds: `sim` schema in `E:\project-nidus\SQL\`. **Admin** seeds: `admin` schema in `E:\project-nidus-admin\SQL\`. Infrastructure migrations may include required system defaults; demo/sample rows belong in seed files. Seed files must be **idempotent** (`ON CONFLICT DO NOTHING/UPDATE`, fixed hex-only UUIDs where practical). When both Platform and Simulator share a feature (rule 34), create seed data for **both** schemas unless app-specific.
19. All documentation files (*.md) should be created under the Documentation folder and folder should be created on the root if it doesn't exist
20. Always push the code to the github after a major change has been done to the codebase or every 3 days, whichever comes first.
21. I will be creating a massive documentaion of this system and therefore do not override any planning files all planning files should be placed in in root folder "projectplan". Always document in a separate file for any changes you make and and guides for documentation for each topic or functionality/feature.
22. I will be creating a blog for the application features, hence you should always document any change by using a separate file where applicable.
23. For each new feature/functionality, always create unit tests for automated testing purposes
24. Make sure to have a distinct and separate folder strutures for a) Frontend and b) Backend. If they do not exist, created them and be updating/creating project files by following this folder structure religiously for easy future maintainability of the application. Any future updates to any functionality should not have a side effect of affecting any working functionality.
25. All data should be fetched from the DB tables and do not use mock or dummy data until I have confirmed the same.
26. **NEVER use fallback data, mock data, or default static data unless explicitly requested by the user.** All data must come from the database. If database queries fail, handle the error appropriately but do not substitute with fallback data.
26. For all features that may require to upload bulk data from other existing project management tools or data, create a feature for both a) Single record capture and b) Bulk record upload/capture with all CRUD and user confirmation flows and where applicable, user the multi-step flows.
26. When creating new and named components/folders always avoid Copyright/Trademark names for compliance with international laws and avoiding lawsuits.
27. Do not use or name any component with the word PRINCE2 due to copyright sensitivity. Use other non-copyright/trademark text, e.g. structured/traditional
28. The default them for all components/pages/forms/tables/dropdowns etc, should be dark during creation and setup.
28.1) **Theme-aware UI (mandatory for all NEW and AMENDED components).** Every page, form, card, table, modal, panel, dropdown, and visualisation must support both light and dark modes via Tailwind `dark:` variants (class strategy). Do **not** ship dark-only shells.
   - **Required pairs (examples):** `bg-white dark:bg-gray-900` · `text-gray-900 dark:text-gray-100` · `border-gray-200 dark:border-gray-700` · `bg-gray-50 dark:bg-gray-800` · `text-gray-500 dark:text-gray-400`
   - **Forbidden (unless intentional always-on brand chrome / solid CTAs):** lone `bg-gray-900`, `bg-gray-950`, `text-gray-100`, `border-gray-700` with no light counterpart on surfaces that sit inside the app chrome
   - **Solid CTAs OK:** `bg-blue-600 text-white` (and similar action buttons) may stay single-tone
   - **Parity:** apply the same theme classes in Platform and Simulator (rule 34.1). When touching Admin UI that mirrors the same pattern, apply there too (rule 34.2)
   - **Amend rule:** when you edit an existing component for any reason, fix any dark-only classes in that component in the same change
   - **Verify:** toggle light/dark in the app header and confirm cards, inputs, labels, and panels remain readable
29. For frontend components, always optimise for progressive web app(PWA) for mobile responsivenes.
30. All created images should be stored under the root folder "Design Images". Create it if it doesn't exist.
31) Provide clear code patches (full files or diffs) and explain changes.
32) Do NOT refactor unrelated modules
33) Always create a todo-list when working on a large or complex features/functionalities.
34) If you create any new features/functionalities/components in the Platform system/folder, always check if the same is applicable to the Simulator System. If applicable, then create the same functionality to cater for the Simulator System, else not. This includes validations rules, tables, fields, modifications etc. This makes sure that the Platform and Simulator systems are at par interms of applicable features/functionalities and components/tables/fields/RLS etc. the intention is to complete the system at the same time and fully deploy at the same time with similar features/functionalities.
34.1) **Platform–Simulator parity (compliance):** Any change to a common functionality that exists in both Platform and Simulator MUST be applied to both systems. When you change, optimise, or fix a feature on one system (e.g. Programme Dashboard, list pages, forms, services), apply the same change—or the equivalent for the Simulator schema and routes—on the other. Do not leave the Simulator behind when updating shared behaviour; both systems must remain at par for that functionality.
34.2) **Three-App Parity (Platform + Simulator + Admin).** The system has three applications:
   - **Platform:** `apps/platform/` in `E:\project-nidus` monorepo (port 5173)
   - **Simulator:** `apps/simulator/` in `E:\project-nidus` monorepo (port 5174)
   - **Admin:** Separate codebase at `E:\project-nidus-admin` (port 5175)

   Platform and Simulator share code automatically via `packages/*` in the monorepo. The Admin app is a separate codebase and must manually sync shared patterns. When creating or modifying shared functionality, apply the change to ALL applicable apps.

34.3) **`packages/*` is the single source of truth for shared code.** All shared UI components, utilities, hooks, and constants live in the monorepo's `packages/` directory and are consumed via `@nidus/*` imports. The Admin app should replicate the same patterns during development, and will consume published `@nidus/*` packages once GitHub Packages publishing is set up for production.

   **Shared packages and what they contain:**
   - `packages/ui/` (`@nidus/ui`) — Table components (sortable headers, pagination, row numbers, card/table toggle), export menus, form components, modals, badges, search bars, loading/empty states, toast/notifications
   - `packages/shared/` (`@nidus/shared`) — Date/time/currency/number formatters, validation utilities, table row number utilities, pagination utilities, search/filter utilities, amount shorthand conversion (rule 36)
   - `packages/supabase/` (`@nidus/supabase`) — Supabase client configuration (`platformDb`, `simDb`)
   - `packages/config/` (`@nidus/config`) — Menu registries, constants

   **When you modify any `packages/*` component or utility:**
   1. The change is automatically available to Platform and Simulator (monorepo workspace)
   2. Check if the Admin app uses the same pattern — if yes, apply the equivalent change there too
   3. Note in the commit message: "Also applicable to Admin app" if Admin needs the same update

34.4) **Admin app shared patterns.** During development, the Admin app replicates these patterns from `packages/*` rather than importing directly:
   - Same Tailwind theme configuration (colours, fonts, spacing, dark mode via `class` strategy)
   - Same table component behaviour (sortable headers, card/table toggle, row numbers, export)
   - Same form validation patterns and success/error messages
   - Same dark theme default (rule 28)
   - Same export functionality patterns (Excel, CSV, JSON, Word, PowerPoint, XML, Print)
   - Same PWA/mobile responsiveness approach (rule 29, 39)

   **NOT shared with Admin (app-specific):**
   - Auth flows — Admin uses 2FA + invite-only + two-checkpoint activation; Platform/Simulator use standard auth
   - Sidebar menus — each app has its own menu config
   - Route structures — each app has its own routes
   - Business logic and services — domain-specific
   - Database schemas — `public` for Platform, `sim` for Simulator, `admin` for Admin

34.5) **Admin-specific codebase rules (separate mini-monorepo at `E:\project-nidus-admin`):**
   - Admin uses **Module Federation** (same pattern as v731). The shell (`shell/`) is the host app; each admin section is a federated module (`modules/<name>/`).
   - Admin has its own `CLAUDE.md` with admin-specific instructions
   - **Admin SQL** → `E:\project-nidus-admin\SQL\` only. **Platform/Simulator SQL** → `E:\project-nidus\SQL\` only (see **Repo-scoped SQL & plans** above).
   - Admin documentation → `E:\project-nidus-admin\Documentation\`. Monorepo documentation → `E:\project-nidus\Documentation\`.
   - **Admin plans** → `E:\project-nidus-admin\projectplans\`. **Monorepo plans** → `E:\project-nidus\projectplan\`.
   - Admin uses the `admin` Supabase schema — Platform and Simulator must NEVER read/write to `admin` schema (except `admin.feature_flags` via a read-only shared util)
   - **Narrow write exception (v765 / Admin v164):** Admin may call `public.sync_global_template_node` / `sim.sync_global_template_node` (via `admin.publish_global_template`) to upsert system-synced `pm_template_nodes` (+ field links) from `admin.global_template_library`. No other admin→public/sim writes are implied by this exception.
   - **Narrow read exception (v779 / Admin v177):** Admin may call `public.list_form_instances_for_template` / `public.get_form_instance_export_data` and the matching `sim.*` functions (via `admin.list_completed_form_instances` / `admin.get_completed_form_instance`) for **read-only** export of submitted form instance values. No other admin→public/sim reads are implied by this exception.
   - Platform and Simulator must NEVER import from the Admin codebase and vice versa
   - Admin shell dev server on port 5175; modules on ports 5180-5192. Use `dev-start-all.bat` at `E:\hifo\` to launch all systems
   - **Build commands:** `pnpm turbo build --filter=@nidus-admin/shell` for shell only · `pnpm turbo build --filter=@nidus-admin/<module>` for a single module · `pnpm turbo build` for all. Modules deploy independently — shell does NOT need redeployment when a module changes.
   - **New admin module:** Copy `modules/_template/`, configure `vite.config.js` with Module Federation remote, create CI/CD workflow at `.github/workflows/admin-<name>.yml`, register in `shell/src/moduleConfig.js`, wrap route in `<ModuleErrorBoundary>`

34.6) **Cross-codebase change checklist.** When modifying shared functionality, follow this protocol:
   1. Make the change in the PRIMARY app (where the task originated)
   2. If the change is in `packages/*`, Platform and Simulator get it automatically
   3. Check if Admin uses the same pattern — if yes, apply the equivalent change in the Admin codebase
   4. Note in the commit message which apps were updated: e.g., "fix: table sort — applied to monorepo + Admin"
   5. If Admin app doesn't exist yet (v735 not started), add a TODO comment: `// TODO(v735): Apply to Admin app`

35) Always check and fix the duplicate import errors each time a new feature/functionality is created.
36) Whenever you are creating a new amount/numeric field type, implement a feature/functionality that allows the user to enter some values/figures like 10t/T and convert 10,000(thousand) or 3m/M as 3,000,000(million) etc after pressing the Enter Key. Use any best practice applicable conversions for these amounts.
37) When creating a new feature that involves capturing new record or amend/edit existing record, always simultenously create a feature (or use existing) for the user to be able to put the record on hold and come back later to continue by selecting the record from the hold/draft queue instead of restarting recapturing the record data again.
38) Always add a feature/function(for both Plaform and Simulator systems) for each table/list and record viewing/reading as follows: 1) If it is a table/list, add a features/functionality to export to excel/powerpoint/word/csv/xml/json/print for the list of all the records that satisfied the selection criteria for these table records. If it is powerpoint/word, the default maximum number of exportable fields is 5, however, there should be some flexibility for the user to choose the fields to export upto a maximum of 10 fields/attributes.  2) If it is a record view/read/see mode, add feature/function to export a) Powerpoint and can be multiple pages based on the record data, b) MS Word with each field/attribute being a header, 3) Excel with fields/attribute being the column headers. The user should choose the right button based on the preferences. 4) For numbered or bulletted items, make sure that they are exported as such based on the what document type the user choose(ppt, docx, xls, csv, XML, JSon, Print). This makes it easy for human reading.5) For excel, show the bulleted multivalues one per each line, the same way a user will manually press alt+enter to enter values on a separate line. 6) The export functionality should show as a dropdown the list of export formats(excel/word/powerpoint/csv/xml/JSon/Print). 7) Utilise the existing exporting functionality/features to avoid redundant or duplicated code.
39) Always make sure to implement the Progressive Web App (PWA) functionality which will be used by users to access the system, especially through their mobile devices. This has to be done for ALL NEW/Amended/Updated funtionalities/Features added in the system(both Platform and Simulation).
40) For any NEW table/list, add clickable, sortable column headers to every table and list view across the Platform, Simulator, and Admin systems. Clicking a column heading cycles through: **unsorted → ascending → descending → unsorted**. Visual indicators (↑ ↓ ⇅) show the current sort state. This applies consistently to both HTML `<table>` pages and card/list-view pages (via a sort toolbar). The **`#` row-number column is never sortable.**
41) For NEW tables/lists, add a consistent **Card ⊞ / Table-List ≡ view toggle** to every table and list page across the Platform, Simulator, and Admin systems (show all CRUD operation button for each record). Both views always include a **search bar**. The user's last-chosen view is remembered per page via `localStorage`.
42) Do NOT bypass RLS policies as a workaround.
43) Run the retest suite after each fix to confirm no regressions
44) For any **NEW or amended table/list view** (Platform and Simulator), show row numbers in **both** view modes when a Card ⊞ / Table-List ≡ toggle exists (rule 41):
   - **Table-list mode:** `#` as the **first column** via `TableRowNumberHeader`, `TableRowNumberCell`, and `getDisplayRowNumber()` from `src/utils/tableRowNumberUtils.js` — never inline `{index + 1}`. The `#` column is **never sortable** (rule 40).
   - **Card/grid mode:** `#N` badge via `RowNumberBadge` from `src/components/ui/RowNumberBadge.jsx`, using the **same** `getDisplayRowNumber(index, { page, pageSize })` values as the table view on that page.
   - Numbers reflect the **current visible order** (after search, sort, and pagination). For paginated lists, pass `{ page, pageSize }` into `getDisplayRowNumber()`.
   - Include `#` in list exports via `ExportListMenu` / `withExportRowNumbers()` (rule 38).
   - **Platform–Simulator parity applies** (rule 34.1). See `Documentation/Table_Row_Numbers_Guide.md`.

45) **App.jsx / route conventions — follow the active architecture phase.**

   **Phase: Monolith (✔ Complete — pre v729)** — no longer applicable.

   **Phase: Option B (✔ Complete — v729)** — no longer applicable.

   **Phase: Option A (✔ Complete — v730 — Turborepo monorepo)**
   - Each app has its own App.jsx: `apps/platform/src/App.jsx` and `apps/simulator/src/App.jsx`.
   - New Platform pages → add to `apps/platform/src/routes/platformRoutes.jsx`.
   - New Simulator pages → add to `apps/simulator/src/routes/simulatorRoutes.jsx`.

   **Phase: Module Federation (✅ Active — v731)**
   - Shell route files use `lazy(() => import('module_name/routes'))` — a remote import, not a file path.
   - New domain modules are registered in `packages/modules/<module-name>/` and declared in the shell's `moduleConfig.js`.
   - **Never bundle a module's pages into the shell.** All domain code lives in its own remote package.

   **Admin App (v735 — separate codebase)**
   - Admin has its own `src/App.jsx` at `E:\project-nidus-admin/src/App.jsx`.
   - Admin routes in `src/routes/adminRoutes.jsx` with role guards.
   - Admin uses standard `React.lazy()` — no Module Federation (it's a standalone app).

46) **Cross-domain import ban — Platform, Simulator, and Admin code must never import from each other.**
   - **Option A+:** `apps/platform/**` must not import from `apps/simulator/**` and vice versa. Shared code belongs in `packages/*` only.
   - **Module Federation (v731):** Platform modules must not import from Simulator modules and vice versa. Cross-domain shared logic must be promoted to `packages/shared/`.
   - **Admin app:** The Admin codebase (`E:\project-nidus-admin`) must never import from the monorepo and vice versa. Shared patterns are replicated, not imported cross-codebase (see rule 34.4).
   - ESLint `no-restricted-imports` rules enforce this boundary automatically — do not bypass them.

47) **Build script conventions — always use the scope-appropriate build command.**
   - **Option A (v730):** `pnpm turbo build --filter=@nidus/platform-app` · `pnpm turbo build --filter=@nidus/simulator-app` · `pnpm turbo build` for all. Turborepo caches unchanged packages automatically.
   - **Module Federation (v731):** `pnpm turbo build --filter=@nidus/<module-name>` to build and deploy a single module. The shell does NOT need to be rebuilt when a module changes.
   - **Admin app (v735):** `cd "E:\project-nidus-admin" && npm run build` — built independently from the monorepo. Admin builds do NOT trigger Platform or Simulator builds and vice versa.
   - **Never run a broader build than necessary** — it defeats the purpose of independent deployments.

48) **New file placement — always create files in the location matching the active architecture phase.**
   - The active phase is **Module Federation (v731)** in the monorepo + **Admin (v735)** as a separate app.
   - **Option A (v730 — base structure):** Platform pages → `apps/platform/src/pages/` · Simulator pages → `apps/simulator/src/pages/` · Shared components → `packages/ui/src/` · Shared utils → `packages/shared/src/utils/`.
   - **Module Federation (v731):** New domain module → `packages/modules/<module-name>/` with its own `package.json` and `vite.config.js`. Register it in both shell `moduleConfig.js` files and create a dedicated CI/CD workflow file.
   - **Admin app (v735):** All Admin pages → `E:\project-nidus-admin/src/pages/` · Admin services → `src/services/` · Admin components → `src/components/`. Admin files are NEVER created inside the monorepo.
   - **Never create Platform-specific files inside the Simulator app folder or vice versa.** Never create Admin files inside the monorepo or monorepo files inside the Admin codebase.

49) **Shared package import convention — use `@nidus/*` package names in the monorepo.**
   - All imports of shared code within the monorepo must use package names: `import { Button } from '@nidus/ui'` · `import { formatCurrency } from '@nidus/shared/utils/formatCurrency'` · `import { platformDb } from '@nidus/supabase'`. Relative paths that cross app or package boundaries will break builds.
   - **Never use a relative path (`../../../packages/...`) to reach a workspace package.** Always use the registered package name.
   - When adding a new export to a shared package, update that package's `index.js` exports and bump its version if it introduces a breaking change.
   - **Admin app:** During development, Admin uses its own local copies of shared patterns (not `@nidus/*` imports). Once GitHub Packages publishing is set up, Admin will install `@nidus/ui` and `@nidus/shared` as regular npm dependencies.

50) **Module Federation registration — every new domain module must be fully registered.**
   When creating a new domain module under `packages/modules/` (v731+):
   - Copy `packages/modules/_template/` as the starting point.
   - Add the module's remote URL env var to both `apps/platform/.env` and `apps/simulator/.env` (or whichever shell loads it).
   - Register the remote in the relevant shell's `vite.config.js` `remotes` block.
   - Add the lazy remote import to the shell's route file (`platformRoutes.jsx` or `simulatorRoutes.jsx`).
   - Wrap the route in `<ModuleErrorBoundary>` — a broken module must never crash the shell.
   - Create a dedicated CI/CD workflow file: `.github/workflows/module-<name>.yml`.
   - Assign the module a unique local dev server port (see v731 plan for the port registry).
   - If the new module is a Platform module, check rule 34 — create the Simulator equivalent if applicable.

51) **Keep `DEV_MODULES.md` in sync with the module registry.** Each app has a module dev-start reference:
   - Platform: `E:\project-nidus\apps\platform\DEV_MODULES.md`
   - Simulator: `E:\project-nidus\apps\simulator\DEV_MODULES.md`
   - Admin (separate codebase): `E:\project-nidus-admin\DEV_MODULES.md`

   Whenever a module is added to `packages/modules/registry.js` (`PLATFORM_MODULES` or `SIMULATOR_MODULES`), add its row (module, folder, port, `turbo dev --filter` command) to the matching `DEV_MODULES.md`. Whenever a module is completely removed, delete its row and its `registry.js` entry. Do this as part of the same change that adds/removes the module — do not leave it for a follow-up.

52) For any **NEW or amended create/edit form** (Platform and Simulator), wire the shared unsaved-changes guard via `useUnsavedChangesGuard(isDirty, message?)` from `@nidus/shared/context/UnsavedChangesContext`. Mount `UnsavedChangesProvider` once inside `<BrowserRouter>` in each app's `App.jsx` (already done). Each form computes its own `isDirty` (e.g. diff loaded snapshot vs current state) and uses `confirmDiscard()` for Cancel/close actions and `requestNavigation()` for programmatic navigation. **Platform–Simulator parity applies** (rule 34.1). Existing forms adopt opportunistically when next touched — no one-pass retrofit.

53) **Approval justification & field lock (Record Lifecycle, Platform + Simulator).** Every decision surface for a governed record (`AuthorisationRequestModal` in decide mode, or any per-record lifecycle panel) must require a mandatory justification/comments field before Approve or Reject can be confirmed — disable the action buttons while the notes field is empty/whitespace-only; never allow a silent optional-notes decision. While a record's `record_status === 'unauthorised'`, its edit/detail form must render read-only (e.g. wrap the field block in `<fieldset disabled>`) so the approver can review the pending change but not alter the underlying data. **Platform–Simulator parity applies** (rule 34.1) — apply identically to both apps. See `projectplan/v751_approval_justification_and_field_lock_plan.md` and `v752_record_lifecycle_defer_apply_plan.md`.

## Simulator Module Architecture Rules

The platform contains ONE unified application with TWO major domains that must be kept strictly separate. **The folder paths below reflect the current active phase — see the Architecture Roadmap section for how these paths evolve.**

### Domain Separation
1. **Platform (Project Management Application)**
   - Real projects, tasks, and schedules
   - Uses **Supabase `public` schema**
   - Uses **`platformDb` client** (legacy: `appDb` for backward compatibility)
   - UI routes start with: `/app/...`
   - **Monolith/Option B:** Components in `src/components/app/` · Modules in `src/modules/platform/`
   - **Option A+:** Components in `apps/platform/src/components/` · Modules in `apps/platform/src/modules/`

2. **Simulator (Project Management Simulator)**
   - Simulation scenarios, runs, and AI events
   - Uses **Supabase `sim` schema**
   - Uses **`simDb` client**
   - UI routes start with: `/simulator/...`
   - **Monolith/Option B:** Components in `src/components/sim/` · Modules in `src/modules/sim/`
   - **Option A+:** Components in `apps/simulator/src/components/` · Modules in `apps/simulator/src/modules/`

### Critical Rules for Simulator Development
- **NEVER mix Platform and Simulator components, modules, or database calls**
- **NEVER write simulation data to `public` schema**
- **NEVER write real project data to `sim` schema**
- Always use `simDb` for simulation operations
- Always use `platformDb` for real project operations
- Always place simulation logic in `modules/sim`
- Always generate RLS-enabled SQL for new sim tables

### Folder Structure by Phase

**Phase: Monolith / Option B (current — pre v730)**
```
src/
  routes/
    lazyImports.js          # All lazy page imports
    platformRoutes.jsx      # Platform-only routes  [Option B: extracted here]
    simulatorRoutes.jsx     # Simulator-only routes [Option B: extracted here]
    authRoutes.jsx          # Auth/onboarding routes
    publicRoutes.jsx        # Public/homepage routes
  pages/
    platform-app/           # Platform pages
    app/                    # Platform app pages
    simulator/              # Simulator pages
    sim/                    # Simulator pages
  components/
    ui/                     # Shared UI components
    app/                    # Platform-specific components
    sim/                    # Simulator-specific components
  modules/
    platform/               # Platform logic (public schema)
    sim/                    # Simulator logic (sim schema)
  services/
    supabase/
      supabaseClient.js     # Exports platformDb and simDb
    sim/                    # Simulator-specific services
```

**Phase: Option A — Turborepo Monorepo (v730+)**
```
apps/
  platform/                 # Deployable: platform.nidus.com
    src/
      App.jsx               # Platform router only
      moduleConfig.js       # Remote module URL registry [v731]
      pages/                # Platform-only pages
      components/           # Platform-only components
      modules/              # Platform-only modules
      routes/
        platformRoutes.jsx
      services/             # Platform-only services
  simulator/                # Deployable: simulator.nidus.com
    src/
      App.jsx               # Simulator router only
      moduleConfig.js       # Remote module URL registry [v731]
      pages/                # Simulator-only pages
      components/           # Simulator-only components
      modules/              # Simulator-only modules
      routes/
        simulatorRoutes.jsx
      services/             # Simulator-only services
packages/
  supabase/                 # @nidus/supabase — platformDb + simDb clients
  ui/                       # @nidus/ui — shared UI components
  shared/                   # @nidus/shared — utils, hooks, contexts, constants
  config/                   # @nidus/config — menu registries
  modules/                  # Domain modules [v731 Module Federation]
    _template/              # Scaffold template for new modules
    planning-hub/           # @nidus/planning-hub
    risk-module/            # @nidus/risk-module
    quality-module/         # @nidus/quality-module
    financial-module/       # @nidus/financial-module
    change-module/          # @nidus/change-module
    stakeholder-module/     # @nidus/stakeholder-module
    delays-module/          # @nidus/delays-module
    stage-gates-module/     # @nidus/stage-gates-module
    pmo-module/             # @nidus/pmo-module
    portfolio-module/       # @nidus/portfolio-module
    programme-module/       # @nidus/programme-module
    sim-planning-module/    # @nidus/sim-planning-module
    sim-risk-module/        # @nidus/sim-risk-module
    sim-pmo-module/         # @nidus/sim-pmo-module
    sim-scenarios-module/   # @nidus/sim-scenarios-module
    ... (all domain modules follow this pattern)
```

### Supabase Client Configuration
```typescript
// platformDb — public schema (Platform)
export const platformDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'public' },
});

// Legacy export for backward compatibility
export const appDb = platformDb;

// simDb — sim schema (Simulator)
export const simDb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'sim' },
});
```

### Simulator Database Tables (sim schema)
All simulation tables MUST live inside the `sim` schema:
- `sim.scenarios` - Pre-built and custom scenarios
- `sim.simulation_runs` - User simulation sessions
- `sim.module_scores` - Scoring per module
- `sim.user_progress` - Learning progress tracking
- `sim.ai_events` - Dynamic AI-generated events
- `sim.certificates` - Completion certificates
- `sim.leaderboards` - User rankings

### Simulator Routing Conventions
```
/simulator                    # Simulator dashboard
/simulator/scenarios          # Scenario library
/simulator/runs               # Active/completed runs
/simulator/modules            # Module-specific simulations
/simulator/custom-scenarios   # User-uploaded scenarios
/simulator/certificates       # User certificates
/simulator/leaderboard        # Rankings
```

### Monetization Integration
The SIM module integrates with existing PM monetization and must support:
- Free Tier (limited access)
- Premium subscriptions (monthly/yearly)
- Lifetime Access (one-time payment)
- Scenario Packs (industry-specific)
- Certificate sales
- Corporate licensing

## Architecture Roadmap & Active Phase

The codebase is migrating from a monolith to a modular architecture in three sequential phases. **Always check which phase is currently active before creating new files, imports, or build commands.** Each phase's plan file is in `projectplan/`.

### Phase Status

| Phase | Plan | Status | Description |
|-------|------|--------|-------------|
| **Monolith** | (pre-v729) | ✔ Complete | Single `src/`, single build, single deploy |
| **Option B** | v729 | ✔ Complete | Multi-entry Vite + CI/CD pipelines. Zero file moves. |
| **Option A** | v730 | ✔ Complete | Turborepo monorepo. `apps/` + `packages/`. Independent builds. |
| **Module Federation** | v731 | ✅ Active | `packages/modules/*` federation remotes; independent module CI/CD |
| **Admin System** | v735 | ⏳ Pending | Separate admin app at `E:\project-nidus-admin` |

> **Update this table** when a phase completes — change ⏳ Pending to ✅ Active or ✔ Complete.
> **Current active phase is Module Federation (v731).** All new file placement, imports, and build commands must follow v731 conventions.

### What Each Phase Unlocks

- **Option B (v729):** `npm run build:platform` and `npm run build:simulator` build independently. CI/CD deploys Platform without touching Simulator and vice versa.
- **Option A (v730):** `pnpm turbo build --filter=@nidus/platform-app` builds Platform only. All shared code lives in `packages/*` and is imported via `@nidus/*` package names. No relative imports across app boundaries.
- **Module Federation (v731):** `pnpm turbo build --filter=@nidus/planning-hub` deploys only the Planning Hub module. Shell picks up the new version at runtime — no shell redeploy needed. Roll back any module in under 60 seconds by updating its CDN URL.

### Rules That Change Per Phase

| Rule | v731 (Active — Monorepo) | Admin (v735 — Separate) |
|------|--------------------------|-------------------------|
| New Platform page | `packages/modules/<name>/src/pages/` | N/A |
| New Simulator page | `packages/modules/sim-<name>/src/pages/` | N/A |
| New Admin page | N/A | `src/pages/` in Admin codebase |
| Lazy imports | `lazy(() => import('module_name/routes'))` | Standard `React.lazy()` |
| Shared code location | `packages/shared/`, `packages/ui/` | Local `src/components/ui/`, `src/utils/` (replicate from packages) |
| Import style | `@nidus/shared`, `@nidus/ui` | Local relative imports (future: `@nidus/*` via npm) |
| Build command | `pnpm turbo build --filter=@nidus/<module>` | `npm run build` in Admin project |
| Dev server | `pnpm run dev` → ports 5173, 5174 | `npm run dev` → port 5175 |
| DB schema | `public` (Platform), `sim` (Simulator) | `admin` |

## Database Table Registration Rule
Whenever a new database table is created in the system, you MUST register it in the database_tables table for the ID Generation Rules system:

1. Add an entry to the `database_tables` table with:
   - table_name: The actual table name (must be unique)
   - table_description: A clear, human-readable description of what the table stores
   - is_system_table: TRUE if it's a system/audit table, FALSE for application tables
   - is_active: TRUE by default

2. SQL Template for new table registration (add at the end of your table creation SQL file):
```sql
-- Register new table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('your_new_table_name', 'Clear description of what this table stores', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();
```

3. Always include this INSERT statement at the end of any SQL file that creates new tables.

4. Examples:
   - Application table: `('customer_orders', 'Customer purchase orders and transaction history', false, true)`
   - System table: `('audit_trail', 'System-wide audit log for all table changes', true, true)`
- The **Admin application** is a separate codebase at `E:\project-nidus-admin` (see v735 plan). It is NOT part of the monorepo at `E:\project-nidus`. It connects to the same Supabase instance but uses the `admin` schema. See rules 34.2–34.6 for three-app parity and cross-codebase change protocol.

## Registration Flow Revamp Conventions

### Organisation-First Registration
31. **Organisation Creation is Mandatory**: All users must create an organisation before accessing the platform. This is enforced at the database level (one email = one organisation).
32. **Organisation Verification Required**: Organisations must be verified via email before users can create projects. The verification link expires in 24 hours.
33. **Protected Routes Check**: All protected routes for Platform (`requiredPlatform === 'platform'`) must check for organisation existence and verification. Users without organisations are redirected to `/onboarding/organisation-setup`. Users with unverified organisations are redirected to `/onboarding/organisation-verification-notice`.
34. **Trial Eligibility**: Each organisation can only create ONE free trial project. This is enforced by the `check_trial_eligibility` database function. Subsequent projects must be paid subscriptions.

### Trial Management
35. **Trial Duration**: Free trials last 14 days from project creation date. This is tracked in the `trial_project_tracking` table.
36. **Trial Limitations**: Trial projects have a 5-member limit and access to basic features only. Advanced features are locked.
37. **Trial Expiry**: Expired trials are automatically locked (read-only). Users can upgrade at any time to unlock. All trial data is preserved during upgrade.
38. **Trial Automation**: The system runs daily cron jobs to check for expiring trials, send reminders (3 days, 1 day), and lock expired projects.

### Payment Integration (Paynow)
39. **Payment Gateway**: The system uses Paynow (not Stripe) for all payment processing. All payment-related code should reference Paynow.
40. **Payment Flow**: Payment initiation → Paynow redirect → Payment verification → Subscription creation → Project unlock.
41. **Webhook Processing**: Paynow webhooks are handled by Supabase Edge Functions. All webhooks must verify hash before processing.
42. **Payment Transactions**: All payments are logged in the `payment_transactions` table for audit and tracking.

### Service Conventions
43. **Organisation Service**: Use `organisationService.js` for all organisation-related operations (create, verify, get, check eligibility).
44. **Trial Service**: Use `trialService.js` for all trial-related operations (create trial project, get status, upgrade, lock expired).
45. **Subscription Plan Service**: Use `subscriptionPlanService.js` for plan retrieval and pricing calculations.
46. **Database Functions**: Use database functions for complex operations (e.g., `check_trial_eligibility`, `get_expiring_trials`) to ensure consistency and performance.

### Testing Conventions
47. **Unit Tests**: All new services must have unit tests in `src/services/__tests__/`.
48. **Integration Tests**: Integration tests for complete flows should be in `src/test/integration/`.
49. **Test Structure**: Use Vitest with React Testing Library. Mock Supabase client in test setup.
50. **Test Coverage**: Target 70%+ overall coverage, 100% for critical paths (registration, payment, trial expiry).

### Documentation Conventions
51. **User Guides**: All user-facing documentation goes in `Documentation/` folder (e.g., `Registration_Flow_User_Guide.md`).
52. **API Documentation**: Document all API endpoints, Edge Functions, and database functions.
53. **Setup Guides**: Create setup guides for external services (Paynow, email service, cron jobs).
54. **Deployment Documentation**: Always include deployment checklists and rollback procedures.