# v1100 — Constraints Register & Assumptions Register Enrichment PRD

**Status:** Approved for planning (interview complete via AskUserQuestion in-session, 2026-09-20)
**Related:** `projectplan/v1100_constraints_register_and_assumptions_enrichment_plan.md`
**Touches:** Platform (`apps/platform`), Simulator (`apps/simulator`), `public`/`sim` schemas.

## a) Problem statement

The Scope Statement page's "Assumptions" and "Constraints" tabs (added this session) currently
store each item as a single flat line of text (`scope_statements.assumptions` /
`scope_statements.constraints`, `TEXT[]`, rendered via `MultiLineListInput`). The user asked for
these items to carry real PM metadata — an **Owner**, a **Due date**, an **Impact**, and a
**Status** — the way any properly tracked RAID item does. A flat text line can't hold that.

Investigating the codebase surfaced two more facts that reshape the fix:

1. **Assumptions already have a real register elsewhere** — `apps/platform/src/pages/assumptions/*`
   (List/Detail/Form) and `apps/simulator/src/pages/assumptions/*`, backed by `public.assumptions`
   (pre-existing from `SQL/v26_risk_management.sql`, the original RAID log feature) and
   `sim.assumptions` (`SQL/v963b`). `public.assumptions` **already has** `owner_user_id`,
   `next_review_date`, and `impact_severity` columns — they were simply never exposed in the v963
   simplified UI (deliberately, per that file's own comments, to keep the form small). Building a
   second, disconnected "assumptions" concept inside the Scope Statement page would duplicate a
   register that already exists and fragment the data.
2. **Constraints have no equivalent register anywhere.** They only ever existed as free text inside
   Mandate/Brief forms and now the Scope Statement's flat list.

So this PRD is really two related pieces of work:

- **Enrich the existing Assumptions Register** to expose the metadata its own table already has
  (Owner, Impact, Next review date), and the real 4-state status the DB already stores.
- **Build a new, standalone Constraints Register**, mirroring the Assumptions Register's shape and
  conventions, since none exists.
- **Rewire the Scope Statement's Assumptions/Constraints tabs** to be live, filtered views into
  these two registers instead of their own disconnected data.

## b) Solution

- Extend `public.assumptions`'s consuming service/pages (Platform) to read/write `owner_user_id`,
  `impact_severity`, `next_review_date`, and the real `status` column (4 values: `active` /
  `validated` / `invalidated` / `closed`) instead of the current simplified 3-value mapping.
- Alter `sim.assumptions` (Simulator) to add matching `next_review_date` and `impact_severity`
  columns, and widen its status CHECK constraint to the same 4-value vocabulary (migrating any
  existing `unvalidated` rows to `active`), so both apps stay at parity (rule 34.1).
- Create a new **Constraints Register**: `public.constraints_register` (Platform) and
  `sim.practice_constraints` (Simulator), with their own List/Detail/Form pages mirroring the
  Assumptions Register's structure exactly (routes, sidebar entry, audit tab, export, sort,
  row numbers, Card/Table toggle, icon-only row actions).
- Rewire the Scope Statement's "Assumptions" and "Constraints" tabs (both apps, from this session's
  earlier change) to show a live table of that project's rows from the real registers
  (`listAssumptions(projectId)` / `listConstraints(projectId)`), with "+ Add" and the edit action
  navigating to the register's own existing Create/Edit routed pages — no new form logic is built
  inside the Scope Statement page.
- One-time SQL migration copies any existing `scope_statements.assumptions` / `.constraints` text
  lines into the new registers (Owner unassigned, default status), so nothing already captured by a
  user this session disappears from view. The old `scope_statements.assumptions` / `.constraints`
  columns are left in place, unused, going forward (no destructive drop).

## c) User stories

1. As a Project Manager, when I open an assumption's create/edit form, I can pick an **Owner**
   from the project's team members (not just have it silently default to me).
2. As a Project Manager, I can set a **Next review date** on an assumption.
3. As a Project Manager, I can set an **Impact** (Low / Medium / High / Critical) on an assumption.
4. As a Project Manager, I can set an assumption's **Status** to one of Active, Validated,
   Invalidated, or Closed (the real lifecycle the DB already tracks), not just the previous
   3-value simplification.
5. As a Project Manager, the Assumptions Register's list page shows Owner, Impact, and Next review
   date as sortable, exportable columns alongside the existing Status/Created columns.
6. As a Project Manager, I can open a new **Constraints Register** from the sidebar (under RAID,
   next to Risks/Assumptions/Issues/Dependencies) scoped to my current project.
7. As a Project Manager, I can create a constraint with: Description, **Category** (Budget /
   Schedule / Resource / Regulatory / Technical / Other), **Owner**, **Due date**, **Impact**
   (Low/Medium/High/Critical), **Status** (Open / Managed / Resolved), and free-text notes.
8. As a Project Manager, I can view, edit, and (soft) delete a constraint from its own detail/edit
   pages, each with an Audit details tab (rule 63.1) showing who created/last changed it.
9. As a Project Manager, the Constraints Register's list page supports the same Card/Table toggle,
   sortable columns, row numbers, search, and multi-format export (rule 38) as every other register
   in the app.
10. As a Project Manager, when I open a project's Scope Statement and switch to the **Assumptions**
    tab, I see that project's real assumptions (Description/Owner/Next review date/Impact/Status)
    pulled live from the Assumptions Register — not a separate copy.
11. As a Project Manager, clicking **+ Add assumption** on the Scope Statement's Assumptions tab
    takes me to the Assumptions Register's existing Create page (project context preserved),
    exactly as if I'd navigated there from the sidebar.
12. As a Project Manager, clicking the edit icon on a row in the Scope Statement's Assumptions tab
    takes me to that assumption's existing Edit page.
13. As a Project Manager, the same three behaviours (10–12) apply to the Scope Statement's
    **Constraints** tab against the new Constraints Register.
14. As a Project Manager, any assumption or constraint text I had already typed into the (now
    superseded) flat Scope Statement fields before this change shipped shows up as a real row in
    the corresponding register after the migration runs — I don't lose anything I already captured.
15. As a Project Manager using the Simulator (practice projects), I get the same Assumptions
    enrichment and the same new Constraints Register, scoped to `sim.practice_projects`, matching
    Platform functionality (rule 34.1 parity).

## d) Implementation decisions

Resolved during the in-session interview (recommended option chosen unless noted):

- **Assumptions Register reuse**: the Scope Statement's Assumptions tab reuses the existing
  register rather than maintaining a separate local list. *(User confirmed.)*
- **Constraints Register**: built as a full standalone register (own table, own List/Detail/Form
  pages, own sidebar entry) rather than a list local only to the Scope Statement. *(User confirmed.)*
- **Scope Statement tab UX**: embedded live table linking out to the register's existing
  Create/Edit pages, not a new inline mini-CRUD form. *(User confirmed — avoids duplicating
  `AssumptionForm.jsx`'s logic.)*
- **Assumptions status vocabulary**: expose the real 4-state DB status (`active` / `validated` /
  `invalidated` / `closed`) instead of the current simplified 3-state UI mapping. *(User confirmed
  — Simulator's `sim.assumptions` CHECK constraint is widened to match, with existing
  `unvalidated` rows migrated to `active`.)*
- **Constraints status vocabulary**: `open` / `managed` / `resolved` — no Convert-to-Risk/Issue
  action (that's an Assumptions-specific concept: an assumption can turn out false; a constraint
  doesn't). *(User confirmed.)*
- **Constraints Category field**: included, mirroring Assumptions' category vocabulary style
  (`budget` / `schedule` / `resource` / `regulatory` / `technical` / `other`). *(User confirmed —
  adds one field beyond the original Owner/Due date/Impact/Status ask.)*
- **Sidebar placement**: Constraints Register sits under RAID (technically the "Core Controls"
  menu category, `plat_pm_ctrl_core` / `sim_pm_ctrl_core`, same parent as the existing Assumptions
  Register leaf), not under Scope & Deliverables. *(User confirmed.)*
- **Old Scope Statement data**: one-time migration copies existing
  `scope_statements.assumptions`/`.constraints` text lines into new register rows (owner
  unassigned, default status); the old columns are left in the DB afterwards, unused. *(User
  confirmed.)*
- **"Due date" vs "Next review date" labeling** (my call, not re-asked): Assumptions keeps its
  existing DB column name `next_review_date` and that UI label — it already carries that specific
  meaning (when to revisit whether the assumption still holds) and renaming a live column adds
  migration risk for no user-visible benefit. Constraints, being a fresh table, gets a genuinely
  named `due_date` column and "Due date" label — a real deadline concept, distinct in both name
  and semantics from a review cadence.
- **No `display_id`** on `constraints_register` — same reasoning already applied to
  `public.assumptions` (v963b, rule 16.3 exception): no natural human-readable reference column
  exists for free-text constraint descriptions, so the UUID is used directly in the URL.
- **RLS**: `public.constraints_register` gets full RLS via the existing
  `public.auth_user_can_access_project(project_id)` SECURITY DEFINER helper (SELECT/INSERT/UPDATE,
  soft delete, no DELETE policy) — the same pattern used by `SQL/v1025_control_accounts_and_
  deliverable_register.sql` and `SQL/v1084_project_functional_roles.sql`.
  `sim.practice_constraints` gets RLS mirroring `sim.assumptions`' existing policy shape
  (`practice_projects` ownership/membership check).
- **Owner picker**: sourced via the existing `getProjectMembers(projectId)` export from
  `apps/platform/src/services/projectMembershipService.js` (Simulator: its equivalent membership
  service) rather than a new one-off query, and rendered with `@nidus/ui`'s `SelectField` (rule 69).

## e) Testing decisions

- Unit tests for the new `constraintService.js` (Platform) and its Simulator equivalent (CRUD +
  list/filter), mirroring the existing `assumptionService.js` test coverage style if one exists,
  else a new lightweight suite (rule 23).
- Manual verification (both apps): create/edit/delete a constraint end to end; edit an assumption's
  new Owner/Impact/Next review date/Status fields end to end; confirm the Scope Statement's
  Assumptions/Constraints tabs reflect register changes live and that "+ Add"/edit navigation lands
  on the correct pre-filled project context.
- Verify the one-time migration script is idempotent (running it twice does not duplicate rows) —
  test against a project with existing `scope_statements.assumptions`/`.constraints` text.
- Verify RLS: a user without project access cannot see/insert/update another project's constraints
  or assumptions (spot-check via a second test account, matching how existing RAID registers are
  verified).

## f) Out-of-scope

- Convert-to-Risk/Issue for Constraints (Assumptions-only concept, per decision above).
- A Category field on Assumptions (out of scope — Assumptions already has `assumption_category` in
  the DB from v26, but exposing it wasn't asked for and isn't part of this PRD; a future PRD can
  pick it up).
- Dropping or renaming `scope_statements.assumptions`/`.constraints` columns — they stay, unused.
- Any change to Risks/Issues/Dependencies registers.
- Admin app changes (no Admin-side equivalent of Assumptions/Constraints exists or is implied).
- Retrofitting the Convert-to-Risk/Issue pattern, category filters, or any other Assumptions-only
  capability onto Constraints beyond what's listed in the user stories above.

## g) Further notes

- This PRD supersedes the ad-hoc `MultiLineListInput`-based Assumptions/Constraints tabs added to
  the Scope Statement page earlier in this same session — those two tabs get rewired, not removed;
  the other five Scope Statement tabs (In scope, Out of scope, Key deliverables, Acceptance
  criteria, Boundaries) are untouched and keep using `MultiLineListInput` as-is, since those don't
  have a real register to point to and weren't part of this decision.
- `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` needs a new "Constraints" leaf added under
  RAID (rule 70), in the same change that adds the sidebar entry.
- `ROADMAP.md`'s R4 strategic-areas bullet list gets "constraints" added alongside "assumptions"
  (a factual addition, not a status change, so no other R4 edits are implied).
