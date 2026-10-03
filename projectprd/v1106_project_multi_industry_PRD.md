# v1106 — Project Multi-Industry Classification PRD

**Status:** Draft — decisions settled in-session (interview 2026-09-26); awaiting user approval of
PRD + plan.
**Related plan:** `projectplan/v1106_project_multi_industry_plan.md`
**Touches:** Platform (`apps/platform`), Simulator (`apps/simulator`), `public` + `sim` schemas.

## a) Problem statement

A project today can be tagged with exactly one industry (`projects.industry_category_id`, Platform
only — Simulator's `sim.practice_projects` has no industry field at all). That single tag drives
two things: which industry's menu sections show in the pm/tm sidebar, and which industry the new
"Add from Built-in Roles" picker (v1105) defaults its filter to.

One tag breaks down the moment a project is *delivery work in one domain, for a client in
another* — a software team implementing a core banking system, a construction-management
platform for an energy company, a clinical-trial system for a hospital network. Tagging the
project "Banking & Financial Services" surfaces the wrong default role set (Actuary, Underwriter)
and the wrong sidebar sections; tagging it "IT & Software" loses the domain-specific roles
(Risk & Compliance Manager, Regulatory Affairs Specialist) that a real delivery team still needs
for sign-off.

## b) Solution

Let a project carry **several** industries, one marked primary — mirroring how an organisation's
own industries already work (`account_industries`: pick several, tick one primary). This is a
genuine "shape" change (multi-select instead of single-select), not two fixed named slots — a
project isn't limited to exactly "client industry + delivery industry"; it can carry as many
relevant industries as it actually spans.

Built for **both** Platform and Simulator, since a practice project should behave the same way a
real one does. Because Platform (`public` schema) and Simulator (`sim` schema) are never allowed
to share tables (see CLAUDE.md's Domain Separation rules), this means two tables and two sets of
UI wiring — but both read the *same* shared `industry_categories` catalog, so the industry list
itself, and what each industry means, never diverges between the two apps.

## c) User stories

1. As a Project Manager, on Project Details / Create Project I can tick **several** industries for
   my project instead of picking just one.
2. I can mark exactly one of my ticked industries as **primary**.
3. Ticking or unticking an industry, or changing the primary, takes effect immediately (no
   separate "confirm" step beyond the existing form save) and is visible the next time I open the
   project.
4. The pm/tm sidebar shows the menu sections for **every** industry I've ticked on the currently
   open project (not just the primary one) — unchanged from today's single-tag behaviour except
   for having more than one section possible.
5. On the "Add from Built-in Roles" picker, the industry filter defaults to showing roles from
   **all** of the project's ticked industries at once (not just the primary), and I can still
   narrow to one specific industry or widen to "All industries."
6. A project with only one industry ticked (the common case, and every existing project today)
   behaves exactly as before — one section in the sidebar, one industry pre-filtered in the role
   picker.
7. A project's Industry summary (wherever it's currently shown read-only, e.g. Project Details)
   lists all of its ticked industries, with the primary one visually distinguished.
8. Everything above also exists for **practice projects** in the Simulator, scoped to `sim`.
9. An existing project that had a single industry before this ships keeps that same industry,
   now marked primary, after the migration — no re-tagging required.
10. A project with **no** industry ticked behaves exactly as an unclassified project does today
    (org-wide roles unaffected; pm/tm sidebar shows no industry-pack sections; role picker filter
    defaults to "All industries").

## d) Implementation decisions (settled with the user)

- **Data shape**: simple multi-select with one primary flag, mirroring `account_industries`
  exactly — not two separately-named fields ("client industry" / "delivery industry"). Rejected
  the two-field alternative because it's a new concept with no reusable pattern, and doesn't
  generalise past exactly two industries.
- **Scope**: built for **both** Platform and Simulator in this same change, even though Simulator
  currently has no industry concept at all for practice projects (this is a from-scratch addition
  there, not "upgrading shared functionality").
- **Write path**: direct RLS-gated writes to a new table per schema (`public.project_industries`,
  `sim.practice_project_industries`) — the same lightweight pattern already used for
  `project_functional_roles` / `constraints_register` in this codebase. No new SECURITY DEFINER
  RPC (rejected as more code to duplicate per schema than a matching pair of RLS policy sets, for
  a low-stakes project-scoped edit).
- **Role picker default** (both apps' "Add from Built-in Roles"): shows roles from **all** of the
  project's ticked industries by default. The picker's industry filter therefore changes from a
  single-select dropdown to a **multi-select** (checkboxes / multi-value control), pre-checked to
  the project's own industries, still adjustable.
- **Backward compatibility (my call, not re-asked — stated here so it can be corrected)**:
  `projects.industry_category_id` (Platform) is **kept** as a denormalized pointer to whichever
  industry is marked primary, kept in sync by the same client write that updates
  `project_industries` — this avoids touching every existing read site (`projectDetailsService.js`,
  exports, etc.) that still selects the single column directly. Simulator has no equivalent legacy
  column to preserve.
- **Segments (sub-industry)**: **not** carried at the project level. Both consumers this feature
  touches (sidebar industry-pack scoping, role-picker filter) only ever operate at the
  `industry_category_id` granularity — segments exist at the account level for a different purpose
  (registration/org context) and adding them here would be unused precision (rule 62).
- **Migration**: every existing Platform project's current `industry_category_id` value is
  backfilled into `project_industries` as `is_primary = TRUE`. Nothing to backfill for Simulator
  (no existing field).
- **UI**: the multi-select-with-primary interaction mirrors `IndustrySelectionStep.jsx` (the
  registration wizard's existing org-level industry picker) — reused as the visual/interaction
  pattern, not literally the same component (that step is registration-flow-specific). Wired into
  `ProjectWizardPanels.jsx` (Platform — already shared by Create and Edit) and into
  `PracticeProjectCreate.jsx` / `PracticeProjectDetail.jsx` (Simulator — Simulator has no shared
  wizard-panel component to extend, so this is new there).

## e) Testing decisions

- Unit tests for the new industry read/write service functions (Platform + Simulator): list, add,
  remove, change-primary, and the "at most one primary" / "at least one row implies exactly one
  primary" invariants enforced client-side.
- Manual verification: tag a project with 2+ industries, confirm the sidebar shows both packs;
  confirm the role picker pre-checks both; confirm removing down to zero industries returns the
  project/practice project to today's unclassified behaviour; confirm an existing project's single
  industry survived the migration as primary; repeat in Simulator with a practice project that
  never had an industry before.
- RLS spot-check: a user without access to a project cannot see/insert/update that project's
  `project_industries` rows via a second test account.
- Retest suite after each phase (rule 43).

## f) Out of scope

- Industry segments (sub-industry) at the project level.
- A dedicated SECURITY DEFINER RPC for the write path.
- Any change to how `account_industries` (organisation-level) works.
- Retrofitting multi-industry onto any other entity (Portfolios, Programmes) — projects only.

## g) Further notes

- Highest existing versions when written: SQL v1111, plan/PRD v1105 → this work uses PRD/plan
  **v1106** and SQL **v1112+**.
- `useSimMenu.js` currently has **no** per-project industry restriction at all (it always shows
  every one of the organisation's enabled industries' sections, unlike Platform's pm/tm layout,
  which already restricts to the open project's industry/industries). This feature is what
  introduces that restriction to Simulator for the first time — a genuinely new capability there,
  not a port of existing behaviour.
- Documentation: `Documentation/Project_Multi_Industry_v1106_Guide.md` (user guide + SQL run
  order).
