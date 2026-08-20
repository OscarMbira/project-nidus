## Project Control Document Hierarchy

This `CLAUDE.md` is the **authoritative repository operating rulebook** for Claude, Cursor, and other AI-assisted development in Project Nidus.

### Root-level Markdown exceptions

The only Markdown files permitted in the repository root are:

- `CLAUDE.md`
- `ROADMAP.md`
- `REVIEW.md`

All other Markdown files must follow the existing placement rules in this file, including:

- general documentation → `Documentation/`
- feature PRDs → `projectprd/`
- implementation plans → `projectplan/`
- plan guidance → `projectplan/App_Guide.md`

### Control documents

| Document | Location | Purpose | May Override `CLAUDE.md`? |
|---|---|---|---|
| `CLAUDE.md` | Repository root | Mandatory engineering, architecture, repository, UX, database, planning, parity, and coding rules | N/A — authoritative operating rules |
| `ROADMAP.md` | Repository root | Strategic product direction, active priorities, delivery phases, dependencies, risks, and milestone status | **No** |
| `REVIEW.md` | Repository root | Review procedure, evidence requirements, severity model, regression/security/release gates | **No** |
| Feature PRD | `projectprd/v{N}_*_PRD.md` | Approved feature-specific requirements and scope | Only within its approved feature scope; cannot waive `CLAUDE.md` controls |
| Implementation Plan | `projectplan/v{N}_*_plan.md` | Approved implementation steps for one feature/change | No |
| `App_Guide.md` | `projectplan/App_Guide.md` | Rules for preparing implementation plans | No |

### Instruction precedence

When instructions appear to conflict, use this order:

1. The user's explicit current instruction.
2. This `CLAUDE.md`.
3. The approved feature PRD.
4. The approved implementation plan.
5. `ROADMAP.md`.
6. `REVIEW.md`.
7. Existing implementation patterns.

**Do not silently resolve a material conflict.** Stop before implementation and identify the conflicting instructions, affected scope, and recommended resolution.

### Required document workflow

For a **new feature or material functional change**:

1. Read `CLAUDE.md`.
2. Read the relevant sections of `ROADMAP.md`.
3. Read `projectplan/App_Guide.md`.
4. Inspect the codebase/database for facts rather than asking the user for discoverable information.
5. Create the feature PRD under `projectprd/`.
6. Complete the required decision interview described later in this file.
7. Create the versioned implementation plan under `projectplan/`.
8. Obtain user approval before implementation.
9. Implement the smallest safe vertical slices.
10. Review the completed change using `REVIEW.md`.
11. Add the implementation review/result section to the feature plan as already required by the Standard Workflow.
12. Update `ROADMAP.md` only when strategic status, dependency, risk, milestone, or roadmap priority materially changes.

For a **small bug fix or low-risk amendment** that does not require a new PRD/plan under the user's instruction:

1. Read `CLAUDE.md`.
2. Inspect the affected implementation and dependencies.
3. Make the smallest safe change.
4. Run the applicable tests/retest suite.
5. Apply the relevant checks in `REVIEW.md`.
6. Report changed files, validation performed, and remaining risks.

### Anti-duplication rule for project-control documents

Do **not** copy detailed rules from `CLAUDE.md` into `ROADMAP.md` or `REVIEW.md`.

- `CLAUDE.md` owns **how development must be performed**.
- `ROADMAP.md` owns **what Project Nidus is prioritising and where delivery stands**.
- `REVIEW.md` owns **how completed changes are independently verified**.
- Feature PRDs own **what a specific feature must achieve**.
- Feature plans own **how that approved feature will be implemented**.

When `ROADMAP.md` or `REVIEW.md` needs an engineering rule, it should reference `CLAUDE.md` rather than restating the rule.

---

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
0. Read the /projectplan/App_Guide.md file whenever you are creating a new implementation plan(i.e, new feature plan in general) and follow the rules in this markdown file.
1. First think through the problem, read the codebase for relevant files, and write a plan to projectplan.md. Where it is necessary, you can create a new file for the plan in order to maitain different plans for different features/functionality and to avoid the projectplan.md file growing so big or overwriting the previous content. Make a logical judgement to create additional and separate planning files.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the projectplan.md file with a summary of the changes you made and any other relevant information.
8. When creating a new page/component/form/visualisation items etc, always make them theme aware to toggle between dark and light mode depending on the user preferences. **See rule 28.1 (mandatory theme-aware checklist).**
9. Always create all SQL command files (*.sql) under the SQL folder in the root
10. Always create all documentation files (*.md) under the Documentation folder in the root, except for the three root control files `CLAUDE.md`, `ROADMAP.md`, and `REVIEW.md`, which must remain in the root directory
11. Always create all CSV data files (*.csv) under the "CSV Files" folder in the root
12. Do not insert any sample/dummy data unless I specify *(exception: companion seed SQL files per rule 18.2 when implementing new features)*
13. After creation any new features, always create and attach to the role-based sidebar menu and sublinks
14. When creating any SQL files(*.sql), recall that I am using supabase as the backend and it requires 15. PostgreSQL. So make sure the SQL syntax is aligned accordingly.
15. The countries field on any page(system-wide) should only show the DB table "countries" details where the is_active field is true. This always applies to all dropdown list for the country field.
16. Make sure after successfully creating/updating any application record/table, there is a succesful form displayed to show the user that the update was successful with record specific information like record id, CRUD operation that was performed. **Implementation (mandatory for NEW and AMENDED create/update/delete flows, v861):** use the shared blocking success-confirmation modal — `useSuccessModal()` from `@nidus/shared/hooks/useSuccessModal` (Platform/Simulator; `packages/ui/src/SuccessConfirmationModal.jsx`) or the Admin-app equivalent — not `toast.success()`/`showSuccess()` (Admin toast), not `window.alert()`, not a page-local inline banner component. Call `showSuccess({ recordId, operation: 'created'|'updated'|'deleted', message, onOk? })` after the mutation succeeds and render the returned `modal` in JSX; `recordId` should be the record's display ID (rule 16.1), not the raw UUID. `onOk` is optional and per-flow: pass it only when this specific save is a terminal action that should navigate the user elsewhere (e.g. "Create" → the new record); omit it for iterative multi-save pages (e.g. a template/form builder) so OK just closes the modal and the user keeps working — never assume navigation by default. Toast remains correct for errors, warnings, and non-CRUD info messages; this rule only concerns create/update/delete success. **Adopt opportunistically:** this does not retroactively convert every existing `toast.success()`/`alert()` CRUD confirmation — migrate a page's existing pattern to `useSuccessModal()` whenever you next touch that page's save flow (same adoption pattern as rule 52's unsaved-changes guard), not as a batch backlog. See `projectprd/v861_success_confirmation_modal_PRD.md` / `projectplan/v861_success_confirmation_modal_plan.md`.
16.1 **Display ID in URLs (mandatory when ID Generation exists).** If a table has a human-readable `display_id` (from Admin ID Generation / `admin.generate_display_id`), deep links for view/edit/detail **must put that display ID in the URL** (e.g. `?id=GTL-0001` or path segment), not the UUID primary key. Loaders must resolve by `display_id` **or** UUID (backward compatible). Mutations still use the UUID after the row is loaded. Prefer `display_id` in success toasts. Applies to Platform, Simulator, and Admin. Adopt when creating or next amending a record flow. **Query-param "current entity" scoping (v872):** the same principle applies to context/scoping query params, not just a page's own record id — e.g. `/pm/*` pages carry `?projectId=<uuid-or-project_code>` because that route tree has no project path segment. Any **new** `/pm/*`-style page must resolve its scoping id via `usePlatformProjectId()` (`packages/shared/src/hooks/usePlatformProjectId.js`, also duplicated in `apps/platform`/`apps/simulator` — keep the three copies in sync) rather than reading `useSearchParams()` directly — the hook both resolves the id for API calls **and** self-corrects a raw-UUID `?projectId=` in the address bar to the friendly `project_code` once resolvable. Do not build a page-local query-param resolver for this.
16.2 **Admin ID Generation for new tables and seed/sample data (mandatory).** Every new application table that exposes a human-readable reference/identifier column (e.g. `*_reference`, `*_identifier`, `display_id`, `*_code`) **must** use the Admin ID Generation engine — do not invent local generators, UUID-hex suffixes, or hand-minted `PREFIX-YYYY-<uuid>` values.
   - **Register the table** in `database_tables` (see **Database Table Registration Rule** below).
   - **Ensure an Admin ID Generation rule exists** in `admin.id_generation_rules` for the qualified target (e.g. `public.your_table`, `sim.your_table`). If the table is new and **does not** already have a rule, create a companion seed SQL file under **`E:\project-nidus-admin\SQL\`** (versioned `v{N}_*.sql`) that inserts the rule — follow the pattern in `v156_id_generation_sequential_entity_rules_seed.sql` (abbreviation, description, sequential/date/scope/pad settings). Do **not** put Admin `id_generation_rules` seeds in the monorepo `SQL/` folder.
   - **Wire the column** with the shared AFTER INSERT trigger helper (`public.trg_apply_admin_display_id` / `sim.trg_apply_admin_display_id` from `v756*`) so inserts with a blank reference get `admin.generate_display_id('<schema>.<table>', id)`.
   - **Seed / sample / demo data** (rule 18.2): insert the display-ID column as `''` (or omit it only if a DEFAULT + trigger path exists) and let the admin trigger assign the real ID. **Forbidden in seeds:** concatenating project/record UUIDs, random hex, or any non-rule format into reference columns. Hand-minted non-empty values skip the trigger and violate Admin ID Generation (see v838 governance strategy fix).
   - **RPCs / create helpers** (`create_*_for_project`, etc.): insert `''` for the reference column; never call dropped local `generate_*_reference()` functions. Prefer the v823/v830/v838 pattern (blank insert + admin trigger + optional sequential fallback if no rule is configured).
   - **Platform–Simulator parity:** if the table exists in both schemas, seed **both** `public.*` and `sim.*` ID Generation rules in Admin and wire triggers in both schemas.
16.3 **Friendly URLs even without Admin ID Generation (mandatory, v910).** Rule 16.1 covers
tables with a `display_id` from Admin ID Generation. Plenty of records don't have one and
never will (e.g. a role's internal `role_name` slug, a lookup table's `code` column) but still
have *some* other column that's unique, stable, and human-readable. When one exists, deep
links for view/edit/detail **must use it in the URL** instead of the raw UUID — same principle
as 16.1, just a different source column. Concretely:
   - The loader must resolve by that friendly key **or** the UUID (same backward-compat
     requirement as 16.1) — detect which one arrived (e.g. a UUID-format regex check) rather
     than requiring two different routes.
   - If the friendly column is only unique within a scope narrower than global (e.g. a custom
     role's `role_name` is unique per-organisation, not platform-wide), the loader must resolve
     it within the caller's own scope — do not silently return another tenant's record on a
     name collision.
   - Mutations still use the UUID after the row is loaded, same as 16.1.
   - If genuinely no human-readable unique column exists on a record (rare), the UUID in the
     URL is acceptable — don't invent one just to satisfy this rule.
   - **Adopt when creating or next amending a record flow** — not a mandatory retrofit of every
     existing UUID-in-URL page, same adoption cadence as 16.1.
   - First applied to: Manage Roles / System Role Catalog's view/edit URLs
     (`admin/manage-roles/:id` etc. now carry the role's `role_name`, e.g.
     `admin/manage-roles/qa_test_lead`, not its UUID).
17. All SQL files(*.sql) should be created in the folder SQL for easy access. This SQL folder should be created on the root if it doesn't exist
17.1 Create a corresponding PRD file before creating the implementation plan. Create it in the folder /projectprd
17.2 Break a PRD into independently-grabbable GitHub issues using vertical slices (tracer bullets). Break the PRD into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.
18. When creating any SQL files, make sure to give some version name that shows the sequence and rpecedence by which the files are created and for future refence. 
18.1 Can you apply the same sequencing logic when creating implementation plans in projectplan folder. Versions for easy of knowing the sequence.
18.2 **Seed data (Platform, Simulator, and Admin):** Whenever a new feature introduces new database tables or demo-worthy reference data, create a **companion seed SQL file** in the **same repo’s** `SQL/` folder as the infrastructure migration — separate from the migration file. **Platform** seeds: `public` schema in `E:\project-nidus\SQL\`. **Simulator** seeds: `sim` schema in `E:\project-nidus\SQL\`. **Admin** seeds: `admin` schema in `E:\project-nidus-admin\SQL\`. Infrastructure migrations may include required system defaults; demo/sample rows belong in seed files. Seed files must be **idempotent** (`ON CONFLICT DO NOTHING/UPDATE`, fixed hex-only UUIDs where practical). When both Platform and Simulator share a feature (rule 34), create seed data for **both** schemas unless app-specific. **Display IDs in seed rows must follow rule 16.2** (blank reference + Admin `generate_display_id` / trigger — never hand-mint UUID-based references). If the new table has no row yet in `admin.id_generation_rules`, also add the Admin rule-seed SQL in `E:\project-nidus-admin\SQL\` before relying on seeded demo data.
19. All documentation files (*.md) should be created under the Documentation folder and the folder should be created on the root if it doesn't exist. The only root-level Markdown exceptions are `CLAUDE.md`, `ROADMAP.md`, and `REVIEW.md`.
20. Always push the code to the github after a major change has been done to the codebase or every 3 days, whichever comes first.
21. I will be creating a massive documentaion of this system and therefore do not override any planning files all planning files should be placed in in root folder "projectplan". Always document in a separate file for any changes you make and and guides for documentation for each topic or functionality/feature.
22. I will be creating a blog for the application features, hence you should always document any change by using a separate file where applicable.
23. For each new feature/functionality, always create unit tests for automated testing purposes
24. Make sure to have a distinct and separate folder strutures for a) Frontend and b) Backend. If they do not exist, created them and be updating/creating project files by following this folder structure religiously for easy future maintainability of the application. Any future updates to any functionality should not have a side effect of affecting any working functionality.
25. All data should be fetched from the DB tables and do not use mock or dummy data until I have confirmed the same.
25.1 **No hardcoding unless I explicitly say so (Platform, Simulator, and shared packages).** User-facing and configuration content must be loaded from the database — not baked into React/JS/config as the live source of truth. This includes (non-exhaustive): sidebar/menu labels and hierarchy (`menu_items` / role grants), page titles tied to menu rows, dropdown/select options and lookup lists, status/type enumerations that exist as tables or reference data, feature flags, organisation/project settings, and any copy or structure that operators may change without a code deploy. Prefer SQL migrations/seeds to create or update that data; the UI/services only query and render it. **Allowed without asking:** true UI chrome (layout, icons as presentation, Tailwind theme classes), route path constants that match registered routes, validation regexes, and temporary empty-shell labels only when a DB label is missing/equals `menu_code` (never override a real DB value). **Forbidden unless I explicitly request it:** hardcoded menu labels, static nav trees used instead of DB menus, client “force label” overrides, mock/dummy rows, and silent fallback datasets when a query fails — show an error/empty state instead. Same rule applies when amending existing code: do not introduce new hardcoding; prefer fixing the DB row or fetch path. **Admin parity:** see `E:\project-nidus-admin\CLAUDE.md` (same policy for `admin.*` data).
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
40.1) **Default list sort (mandatory for NEW and AMENDED tables/lists — Platform, Simulator, and Admin).** Until I explicitly override it for a named table/list, the **initial / default** row order (before the user clicks a column header) must be:
   1. **Alphabetically** (A→Z, case-insensitive) on the primary display label for that list (e.g. name, title, `display_title`, label, or the main human-readable column shown in the first data column — not the `#` row number and not a raw UUID).
   2. **Then by date created** (`created_at` ascending = oldest first) as the tie-breaker when labels match or the primary label is blank.
   - Prefer applying this in the query/`ORDER BY` when possible; otherwise apply the same multi-key sort in the client after fetch (and keep it consistent with Card and Table-List views).
   - User-driven column sorts (rule 40) still override this default for the session; clearing sort (back to unsorted) returns to this alphabet-then-created default — not to an arbitrary insertion or `updated_at`-only order.
   - **Exceptions only when I say so** for a specific table/list (document that exception in the feature plan/PRD). Do not invent alternate defaults (e.g. newest-first only) without that instruction.
   - **Admin parity:** same rule in `E:\project-nidus-admin\CLAUDE.md` (rule 12.1). Adopt opportunistically when amending an existing list.
41) For NEW tables/lists, add a consistent **Card ⊞ / Table-List ≡ view toggle** to every table and list page across the Platform, Simulator, and Admin systems (show all CRUD operation button for each record). Both views always include a **search bar**. **Default to Table-List ≡, not Card ⊞, where applicable** (registers/lists read better as a table on first visit — row-dense, scannable columns beat a stack of cards for most PM data). Card view stays available via the toggle; use `useViewMode(pageId, 'list')` (not `'grid'`) when wiring a new page unless the content is genuinely card-first (e.g. a visual/media-heavy gallery). The user's last-chosen view is remembered per page via `localStorage` and overrides this default on return visits.
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

54) Explore a codebase to find opportunities for architectural improvement, focusing on making the codebase more testable by deepening shallow modules, to improve architecture, find refactoring opportunities, consolidate tightly-coupled modules, or make a codebase more AI-navigable, urface architectural friction, discover opportunities for improving testability, and propose module-deepening refactors as GitHub issue RFCs.

55) What the PRD specification should include:

    a) Problem statement — what is broken or missing, and why it's worth solving, in the project's own vocabulary.
    b) Solution — the shape of the fix at a high level, before any implementation detail.
    c) User stories — an extensive, numbered list of the concrete behaviours the change must support, each one independently checkable.
    d) Implementation decisions — the choices already settled during the conversation, so they aren't relitigated later.
    e) Testing decisions — the seams the feature will be tested at, and what "done" looks like.
    f) Out-of-scope items — what this change deliberately does not cover, to keep the ticket bounded.
    g) Further notes — anything else worth carrying forward that doesn't fit the sections above.

56) When creating a new PRD/Plan Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

57) Interview me relentlessly about every aspect of this plan until
we reach a shared understanding. Walk down each branch of the
design tree, resolving dependencies between decisions
one-by-one. For each question, provide your recommended answer.

58) Ask the questions one at a time, waiting for feedback on each
question before continuing. Asking multiple questions at once is
bewildering.

59) If a *fact* can be found by exploring the codebase, look it up
rather than asking me. The *decisions*, though, are mine — put
each one to me and wait for my answer.

60) Do not enact the plan until I confirm we have reached a shared
understanding.

61) **Icon-only row/detail-bar actions for View/Edit/Delete (mandatory for NEW and AMENDED list/detail pages).** Every table/card row-actions column and every record-detail top action bar must render View/Edit/Delete as icon-only buttons — no visible text label — via `RowActionButton` from `@nidus/ui` (`variant="view"|"edit"|"delete"`, blue/amber/red respectively, `Eye`/`Pencil`/`Trash2` from `lucide-react`). Each button carries a `title`/`aria-label` (the `label` prop) and shows a themed hover/focus tooltip via the paired `Tooltip` component — never ship an icon button with no accessible name. This does **not** apply to Export format dropdown menus (PDF/Word/Excel/etc. keep icon+text) or to other action types (Assign, Approve, Reject, Duplicate, Archive, Cancel, Print, Hold/Draft — these stay text-labeled unless a future rule says otherwise). Existing pages retrofit opportunistically when next touched, per the batched migration in `projectplan/v840_icon_only_row_actions_plan.md`. **Admin app:** use `AdminIconActionButton`/`AdminTooltip` from the Admin app's own `packages/ui` (see Admin rule 15) — same contract, no cross-repo import.

62) Since this system is going to be a SaaS system where there won't be too much training, hence the system should be simplified. Always make all created components(forms, pages, tables, lists, dropdowns etc) are simplified as much as possible and as user-firendly as possible, do not complicate the UX where it is applicable.

63) **Audit details tab on Template / Form detail surfaces (mandatory for NEW and AMENDED).** Any **new or amended** Template or Form **detail / view / builder** page (Platform and Simulator) that shows a single template definition, form template, or form instance must expose a tabbed chrome:
 - Primary tab: **Details** / **Document details** / **Form details** (content) — **default selected**.
 - Secondary tab: **Audit details** — card layout matching the shared pattern: **Identity**, **Classification**, **Record history**, and optional **content/version history** when a linked row exists.
 - Use shared UI from `@nidus/ui` (`AuditField`, `AuditCard`, `AuditDetailsPanel`, `DetailAuditTabList` or successors) — do not invent a one-off audit layout.
 - **Never** show a Technical reference card (internal UUID, content row id, storage table name) on user-facing Audit details.
 - **Scope reference** (and similar foreign keys): show a **friendly label** (e.g. `project_code`) when resolvable; UUID only as fallback. Prefer `resolveScopeReferenceLabel` from `@nidus/shared/utils/auditDisplayUtils.js`.
 - Form **instances**: keep any existing activity timeline (e.g. `FormAuditTimeline`) on the **Audit details** tab beneath the cards.
 - Form **templates**: include the Audit tab on the builder in **view and edit**.
 - **Platform–Simulator parity** (rule 34.1). When the same surface exists in Admin, apply the equivalent pattern with Admin-local UI copies (rule 34.2).
 - Adopt opportunistically when amending an existing detail page that still lacks the tab. See `projectplan/v866_template_form_audit_details_tab_plan.md` / `Documentation/Template_Form_Audit_Details_Tab_v866_Guide.md`.

63.1) **Audit tab is mandatory on every record-CRUD form, not just Template/Form surfaces (system-wide, Platform + Simulator + Admin — v871).** Rule 63's requirement extends to **any new or amended component that creates, edits, or views a single persisted database record** — Risks, Issues, Changes, Projects, Stakeholders, PID/PRINCE2 documents, resource/appointment records, and simple reference/lookup/config-data admin forms alike. Not just substantive business records — a "manage project statuses"-style admin CRUD form needs the tab too.
 - **Same fixed 3-card structure as rule 63**: Identity / Classification / Record history, with each card's individual fields adapted to whatever that record type actually has — do not invent a per-form-type card layout.
 - **Tab is always visible, even for a brand-new unsaved record** — show "Audit details appear after this record is saved" as a placeholder until the record has been saved once. Never hide the tab entirely between create and edit modes of the same form.
 - **Use `DetailAuditTabList`'s generalised `tabs` prop** (an explicit `{ value, label }[]` array) for any form with more than two content tabs — do not hand-roll a separate tab-switching mechanism just because a form has more sections than a simple Details/Audit pair. The component is fully backward compatible with the simpler `detailsLabel`/`auditLabel`/`extraTab` shape for 2-3 tab forms.
 - **Excluded**: filter/search panels, export/print/download dialogs, confirmation-only prompts with no field data, generic UI utility modals (image viewers, help popups), in-form picker/selector widgets, and bulk-action modals operating on multiple records at once. None of these edit a single record's own fields.
 - **Metadata only** — this rule does not require a field-level change log (old value → new value per edit). That is a deliberately separate, larger effort; do not attempt to backfill it as part of adopting this rule.
 - **Admin parity**: same rule in `E:\project-nidus-admin\CLAUDE.md` (rule 16.1) — use `@nidus-admin/ui`'s equivalent components.
 - **Adopt opportunistically**: existing forms not yet covered are tracked in `projectplan/v871_system_wide_audit_tab_plan.md` (full census by domain) — pick them up progressively as each is next touched, in addition to any dedicated rollout pass. **Every genuinely new record-CRUD form from this point forward must ship with the Audit tab from day one** — this is not an opportunistic-only rule for new forms, only for the existing backlog.

64) **Clickable dashboard summary cards (mandatory for NEW and AMENDED dashboard/summary
cards — Platform, Simulator, and Admin, v893).** Any card on a Dashboard tab or rollup
dashboard whose number is a **COUNT or SUM of individually-identifiable records matching an
expressible filter** (status, category, level, date range, etc.) must be clickable: clicking
navigates to that filtered subset on the record's list/register page, using each register's
own existing filter state where the page's Dashboard and Register views live together
(`setFilters(...)` + switch tab), or a URL query parameter when the card links to a
different page (e.g. `?filter=open`, read on mount via `useInitialFilterFromQuery` from
`@nidus/shared/hooks/` and folded into the target's own filter state). Use `DashboardStatCard`
(`@nidus/ui`, Platform/Simulator) or `AdminCard`'s `onClick`/`to` props (Admin) — do not
hand-roll a new static `<div>` tile. `MetricCard` (`components/analytics/MetricCard.jsx`)
already supports `onClick` for the same purpose where it's the established pattern in a file.
**Do not make a card clickable** when its number is an **average, percentage/ratio, or
blends multiple distinct entity types** into one figure (e.g. "Avg Health Score", "%
realized", a budget sum spanning heterogeneous cost lines) — these have no single coherent
list of records behind them; leave them static, no hover affordance, no tooltip explaining
the exclusion. If a card's implied filter doesn't exist yet on the target list page, add the
filter capability — do not link to an unfiltered list as a substitute, and do not silently
leave the card non-clickable instead. If wiring a card would require building an entirely new
list/register page that doesn't exist anywhere in the codebase (not just adding a filter to
an existing one), leave it static and note the gap in the plan/PRD rather than either building
the new page as a side effect or quietly skipping it. A single-page widget with only one
always-visible list may satisfy this rule via scroll-into-view instead of a tab/filter switch
when there's no separate register view to navigate to. **Platform–Simulator parity applies**
(rule 34.1) — but where Simulator's equivalent dashboard is built on a genuinely different data
model or component tree (not a mirror of the Platform file), do not force-fit a parity change
across that boundary; document the gap and recommend it as separate, scoped work instead (see
`projectplan/v893_clickable_dashboard_summary_cards_plan.md` for a worked example — Simulator's
PM/PMO/Portfolio "Practice" module dashboards). **Adopt opportunistically** for any dashboard
card not yet covered by the v893 rollout when next touched. See `projectprd/v893_clickable_
dashboard_summary_cards_PRD.md` / `projectplan/v893_clickable_dashboard_summary_cards_plan.md`.

65) **Non-modal forms by default (mandatory for NEW pages/forms, Platform + Simulator +
Admin, v910) — until I explicitly say otherwise.** Any new create/edit/view surface for a
record — the kind of thing that would previously have been built as a popup/dialog/modal
form — must be implemented as its own dedicated routed page with its own URL, not a modal
overlay. This matches the pattern most record-detail pages in this codebase already use
(e.g. `risks/:id`, a full page with its own back button, not a popup) and pairs naturally
with rule 16.1's URL/display-ID conventions. Mode (create/view/edit) is expressed by the
route (e.g. `entity/create`, `entity/:id`, `entity/:id/edit`), not by a prop toggling a
modal's `isOpen`/`readOnly` state.
- **Excluded from this rule** — these stay as modals/dialogs, same as before, because they
  aren't a record-CRUD form: confirmation prompts (Approve/Reject/Delete confirm), small
  action dialogs that don't edit a full record's fields, filter/search panels, image/file
  viewers, generic help/info popups, and bulk-action modals operating on multiple records at
  once — same exclusion list as rule 63.1.
- **Adopt opportunistically** for existing modal-based forms — convert one the next time I
  ask you to touch it, not as a mandatory retrofit pass across the whole app.
- **Platform–Simulator parity applies** (rule 34.1): build the routed page for both apps in
  the same change. **Admin parity**: see `E:\project-nidus-admin\CLAUDE.md` rule 18.
- First converted under this rule: Manage Roles' Create/View/Edit Role surface
  (`OrgRoleEditorModal` → `OrgRoleDetail.jsx` at `admin/manage-roles/create` ·
  `admin/manage-roles/:id` · `admin/manage-roles/:id/edit`, both apps).

66) **Performance pass on every NEW or AMENDED component (mandatory, Platform + Simulator +
Admin, v914).** Whenever you create a page/component, or touch an existing one for any reason,
check its data-loading path for the specific classes of waste this rule exists because of
(real incidents: Create Role / Create Menu Bundle loading noticeably slowly):
   - **Sequential awaits that don't need to be sequential.** If two fetches don't depend on
     each other's result, fire them together (`Promise.all`) instead of one after another. If a
     third fetch only needs one field from an earlier result (e.g. an account id), chain it off
     that specific promise (`somePromise.then(...)`) so it starts the moment that value is
     ready — not after the entire unrelated batch finishes.
   - **Redundant duplicate resolution.** Don't let two different functions each independently
     resolve the same expensive lookup (e.g. the current user's organisation, which itself can
     be several sequential queries deep on a cold cache) when the result is already available,
     or already in flight, from a sibling call — pass it through instead of re-deriving it.
   - **Repeated fetches of data that barely changes.** If a component reloads the same,
     largely-static reference data on every mount (e.g. a shared picker's option list), add a
     short-lived cache with a sensible invalidation trigger (cleared wherever that data actually
     gets written). Prefer `sessionStorage` over a plain in-memory module variable when the
     value should survive a hard reload — a hard reload wipes all JS module state, and is a
     normal part of how a page gets exercised, not just in-app SPA navigation. Mirror the
     `nidus:acct:*` / `nidus:grantableMenuItems:*` sessionStorage patterns in
     `accountResolution.js` / `organisationCustomRoleService.js` rather than inventing a new
     caching shape.
   - **Don't over-apply this.** A simple page with one query, or a component with no data
     fetching at all, needs none of the above — this rule is about removing waste that's
     actually present in a *waterfall* of dependent-looking-but-independent calls, not about
     adding caching/parallelization ceremony to code that has no such problem (rule 62:
     simplicity still wins over speculative optimization).
   - **Platform–Simulator parity applies** (rule 34.1) — apply the same fix to both apps' copy
     of a file. **Admin parity**: see `E:\project-nidus-admin\CLAUDE.md` rule 19.
   - First applied under this rule: `getManageRolesAccess()` / `getGrantableMenuItems()` /
     `getMenuBundleById()` in `organisationCustomRoleService.js` /
     `organisationMenuBundleService.js`, and the `loadRole()` / `loadBundle()` waterfalls in
     `OrgRoleDetail.jsx` / `MenuBundleDetail.jsx`.

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
| **Admin System** | v735 | ✅ Active | Separate admin app at `E:\project-nidus-admin` |

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

5. **Admin `id_generation_rules` (mandatory when the table has a human-readable reference column — rule 16.2):**
   - Check whether `admin.id_generation_rules` already has an active rule for the qualified target table (`public.<table>` and/or `sim.<table>`).
   - If **missing**, create a versioned seed in **`E:\project-nidus-admin\SQL\`** (not the monorepo) that inserts the rule — mirror `v156_id_generation_sequential_entity_rules_seed.sql` (abbreviation ≤ 4 chars where sequential family expects it, description, `include_date` / `date_format`, `scope_column`, `num_digits`, `separator`, `generation_mode`).
   - In the monorepo migration, attach `trg_apply_admin_display_id` (or `sim.trg_apply_admin_display_id`) on the reference column; seed/demo inserts must leave that column blank so Admin assigns the ID.
   - Checklist for a new identifiable table: (a) table DDL + RLS, (b) `database_tables` registry row, (c) Admin `id_generation_rules` seed if absent, (d) display-ID trigger wiring, (e) companion demo seed with blank references (rule 18.2), (f) URLs/toasts use display ID (rule 16.1).

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