# PRD: Project Actual Data — Register, Explicit Capture, Full CRUD — v849

## a) Problem statement

The tier cascade (Global Templates → PMO Templates → Portfolio/Programme/Project, each level
able to inherit and customise with local fields) is fully built and working for **template
configuration**. What's missing is the terminal step every cascade path is supposed to end in:
the Project Manager actually creating and managing **their project's real data records** against
those templates.

Two domains carry real project data today, and both fall short of a proper create/list/CRUD
register:

- **`process_template`** (the 24 PMBOK documents — Project Charter, PID, Risk Management Plan,
  etc.): a project gets exactly **one silently auto-created row** the moment a PM copies the
  template down (no explicit "create a record" action), and there is no dedicated list of
  "which of our org's documents are captured for this project vs. not yet captured" — only the
  generic Project Templates catalog, which mixes every template domain together. Retiring a
  captured document only soft-deletes the template pointer; the underlying data row is left
  orphaned in the database, untouched and unreachable through normal navigation.
- **`form_template`** (dynamic forms built via Form Template Builder): creation and update
  already work properly (`FormNew.jsx`, `FormEdit.jsx`), and the DB already supports multiple
  instances per project per template. But the list page (`FormsGallery.jsx`) only ever renders
  **draft** instances — submitted/approved/rejected instances are fetched but never shown — and
  there is no working Delete anywhere (`archiveForm()` exists in the service layer but is called
  from nowhere in the UI).

**Architecture note (confirmed by code research, decided with the user):** Templates and Forms
already customise per tier through two different, both-working, both-already-shipped
mechanisms — Templates via **node-forking** (`pm_template_nodes`, one row per tier,
`copyTemplateNodeForAccount`), Forms via a **flat override-table** layered on one shared schema
(`form_template_field_overrides`/`additions`, v808/v812/v815/v847, resolved per read via
`resolveEntityPolicyChain` + `applyTieredSchemaFieldOverrides`). Both give every tier
(Org/Portfolio/Programme/Project) the ability to inherit, customise, and add local fields — they
just store it differently. **Decision: do not unify these into one architecture** — that would
mean rebuilding a working, tested system (v808–v847) for no functional gain. Forms keep their
existing customisation layer untouched; only the missing terminal "actual data" register is
built, on Forms' actual data model:
- **Templates capture "defaulted" data** — copying a template down carries the org's/ancestor's
  `document_data` into the new row as a starting point (`duplicateProcessTemplateRow` copies
  `...rest` including `document_data`) — the PM edits from there.
- **Forms capture blank data** — `FormNew.jsx` always starts empty; any "starting point" content
  is opt-in via a separately-authored "completed example," never automatic.
- **Templates stay singleton per project** (decision above). **Forms already allow, and keep
  allowing, multiple instances** of the same template per project (e.g. a Lessons Log filled out
  many times) — no cap exists today and none is being added.

## b) Solution

1. **New "Project Documents" register** (process_template domain only) — a dedicated page,
   separate from the template-configuration "Project Templates" page, listing every process
   document the tier cascade makes available to this project: **Captured** (view/edit/retire,
   opens the existing detail page) vs. **Not yet captured** (one-click **Capture**, which runs
   the existing copy-down logic and lands the PM on the fill-in form). Built entirely on the
   existing, already-correct cascade-resolution service
   (`pmTemplateInheritanceService.js`) — no new resolution logic, no duplicate copy mechanism.
2. **Archive flag on the 24 process_template catalog tables** — a nullable `is_deleted` column
   (matching the convention already used by sibling data tables like
   `risk_management_strategies`), set on Retire. Retired documents disappear from the register
   and the effective cascade view but keep their data for audit; re-Capturing after a retire is
   handled explicitly (blocked with a clear message, or offered as **Restore**) instead of
   silently creating an orphaned duplicate.
3. **Upgrade `FormsGallery.jsx` into a proper Project Forms Register** — same list standard as
   the new Project Documents Register (sortable columns, row numbers, Card/Table toggle, search,
   export), showing every instance across every form template used in this project (not just
   drafts), with working View/Edit links and a real Delete/Archive action wired to the
   already-written `archiveForm()`, disabled once a record reaches `approved`. The existing
   template-picker grid (`FormTemplateGallery`) stays as the "start a new one" entry point — no
   new page or menu item needed, since this route is already the correct, already-linked home
   for Forms data (unlike Templates, which needed a new page because its existing page conflated
   template config with data).

## c) User stories

1. As a PM, I open a single "Project Documents" page and immediately see which of my
   organisation's process documents are captured for my project and which aren't — regardless
   of whether the applicable template came from Global, PMO, my Portfolio, or my Programme.
2. As a PM, I click **Capture** on a not-yet-captured document and land directly on its fill-in
   form (existing Project Templates detail page), with the row already created — one click, no
   separate "new" screen.
3. As a PM, I click a captured document's row to open it, edit its Document Data, and save
   (existing v848 behaviour, unchanged).
4. As a PM, I retire a captured document I no longer need; it disappears from my active
   register but the data is preserved for audit, not silently orphaned.
5. As a PM who retired a document and later needs it again, I get a clear message (not a silent
   duplicate row) — either blocked with an explanation, or an explicit Restore action.
6. As a PM, my project sees the **nearest tier's** customisation of a document (Programme's
   fork if my project is under that Programme, otherwise Portfolio's, otherwise PMO's,
   otherwise Global) as the thing to capture — never a stale or wrong-tier version.
7. As a PM filling out dynamic forms, I can see and reopen forms I've already submitted or that
   have been approved/rejected, not just my current drafts.
8. As a PM, I can delete a form instance I no longer need (draft, submitted, or rejected) — it's
   archived, not hard-deleted, and I can no longer delete it once it's been approved.
9. Simulator has the same "Project Documents" register and the same Forms Gallery fix
   (parity).

## d) Implementation decisions (agreed)

| # | Decision |
|---|----------|
| 1 | Scope: `process_template` (new register + archive flag) and `form_template` (fix existing gallery) — no other domain (fields/opa/portfolio·programme·project_template have no data payload, per v805). |
| 2 | `process_template` stays **singleton per project per template** (v822's one-copy cap is kept, not reversed). "Create a new record" means an explicit Capture action, not multiple instances. |
| 3 | New dedicated **"Project Documents"** page/menu item, top-level in the PM sidebar next to Project Templates — not folded into the existing Project Templates page, not a re-use of the retired Process Templates Hub's UI or its independent copy mechanism. |
| 4 | Capture action reuses `copyTemplateNodeForAccount` (the same function Project/Organisational Templates already use) against the nearest-tier row resolved by `resolveOrgTemplatesForProject` — never a new/duplicate copy path. |
| 5 | Retire adds a nullable `is_deleted BOOLEAN NOT NULL DEFAULT FALSE` to all 24 process_template catalog tables, set true on Retire; excluded from register + effective-cascade reads; re-Capture on a retired document is handled explicitly, not silently duplicated. |
| 6 | `form_template`: fix `FormsGallery.jsx` to list all statuses; wire `archiveForm()` to a real Delete action, allowed for any status except `approved`. |
| 7 | Platform + Simulator parity for both work-streams. |

## e) Testing decisions

- Manual: Project Documents register shows correct Captured/Not-yet-captured split for a project
  under a Programme with a Programme-level template fork (confirms nearest-tier resolution).
- Manual: Capture → lands on fill-in form → Save persists (regression on v848 behaviour).
- Manual: Retire → document disappears from register, underlying row confirmed `is_deleted=true`
  in DB, not deleted; re-Capture attempt shows the explicit handling (block/restore) rather than
  creating a second row.
- Manual: FormsGallery shows a submitted and an approved instance alongside drafts; Delete
  available on draft/submitted/rejected, absent/disabled on approved.
- Manual: Simulator parity pass for both.
- No new automated test suite required beyond what each implementation plan calls for — this
  PRD splits into two implementation plans with their own scoped testing sections.

## f) Out of scope

- Removing the singleton cap for `process_template` (explicitly rejected — see decision 2).
- Hard-deleting any data row anywhere in this PRD.
- Rebuilding `fields`/`opa`/`portfolio_template`/`programme_template`/`project_template`
  domains — no data payload exists for these (v805 decision, unchanged).
- Any change to the Global/PMO/Portfolio/Programme template **configuration** UI itself — this
  PRD is entirely about the terminal "actual data" step.
- Migrating or reconciling any orphaned rows from the already-retired Process Templates Hub
  (flagged separately in [[v848]] as a manual DB check).

## g) Further notes

- This work splits into two implementation plans:
  - `projectplan/v849_project_documents_register_plan.md` — the new register page + archive
    flag (the larger piece, includes a SQL migration across 24 tables).
  - `projectplan/v850_form_instances_gallery_fix_plan.md` — the FormsGallery list/delete fix
    (smaller, no schema change).
- Related: [[v848]] (relabelled the existing capture UI this register now fronts), [[v822]]
  (singleton-copy rule being preserved, not reversed), [[v805]] (generic content editor —
  unchanged), [[v502]] (`form_instances` schema).
- SQL version: `v849_process_template_tables_is_deleted.sql` (after v847 — v848 had no SQL).
