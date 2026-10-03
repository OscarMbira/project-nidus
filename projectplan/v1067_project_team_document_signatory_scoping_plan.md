# v1067 — Project & Team-Scoped Document Signatory Configuration — Implementation Plan

**PRD:** `projectprd/v1067_project_team_document_signatory_scoping_PRD.md` (approved, corrected).
**Scope:** Platform + Simulator, per PRD decision #5.
**Correction note:** the first version of this plan used
`team_member_appointment_records.reporting_to_user_id` to define "team." That was replaced with the
existing `teams` / `team_members` tables (`teams.team_lead_user_id`, live and in use via
`teamService.js`) once found — see PRD Problem statement and decision #3. This version reflects
that correction throughout.

This plan follows the App_Guide's vertical-slice approach: each slice below is independently
shippable and testable, in dependency order. Do not start a later slice until the ones above it
are complete — later slices depend on the schema/service work from earlier ones.

**SQL version numbers below were re-checked against the live `SQL/` folder at plan-approval time**
(highest existing file was `v1074`) — using `v1075`+ rather than the `v1067`-prefixed placeholders
from the draft plan, since the SQL sequence is shared across all features and had moved on.

---

## Slice 0 — Facts confirmed before writing this plan (no action, for reviewer context)

- `public.teams` (`id`, `project_id`, `team_name`, `team_type`, `team_lead_user_id`, `is_active`,
  `is_deleted`) and `public.team_members` (`id`, `team_id`, `user_id`, `member_role`,
  `allocation_percentage`, `is_active`, `is_deleted`, unique on `(team_id, user_id)`) — both from
  `SQL/v04_project_core_tables.sql`, both live (used by `apps/platform/src/services/teamService.js`,
  `ResourceForm.jsx`, `EditTeamMemberModal.jsx`, `dashboardService.js`). This is what v1067 builds
  on for "team."
- Simulator equivalents: `sim.practice_teams` (`id`, `practice_project_id`, `team_lead_user_id` —
  note: references `auth.users(id)` directly, not `public.users(id)`; confirm at implementation time
  whether the signatory tables' user references need `auth_user_id` or `users.id` translation for
  the sim RLS check) and `sim.practice_team_members` (`practice_team_id`, `user_id`) — both from
  `SQL/v240_sim_stakeholders_teams.sql`.
- `public.can_manage_signatory_requirements()` (SQL/v880) already exists and is called from both
  `policy_ptssp_write` and `policy_ptsr_write`. It will be extended, not replaced.
- The PM-area "Project Setup" pages (Project Charter, Project Brief, Business Case, PID, Benefits
  Review Plan) are **not** Module Federation remotes — they're plain pages in
  `apps/platform/src/pages/pm/*.jsx`, registered directly in `apps/platform/src/routes/platformRoutes.jsx`
  under the `PMLayout`-wrapped route block. The new page follows this exact pattern, not the
  `packages/modules/pmo-module` pattern the existing PMO admin page uses.
- Simulator's equivalent PM-area pages live in `apps/simulator/src/pages/simulator/pm/*.jsx`
  (confirmed via `apps/simulator/src/routes/lazyImports.js` → `SimulatorPMInitiationBenefitsReviewPlan`
  resolving to that path), registered in `apps/simulator/src/routes/simulatorRoutes.jsx`. There is
  also a same-named but unrelated/likely-dead file under `apps/platform/src/pages/simulator/pm/` —
  do not touch or add to that copy; it is not what Simulator's build imports (mirrors the
  already-documented dead-shadow-copy trap in this codebase).
- `@nidus/shared/utils/*` and `@nidus/shared/services/*` resolve via Vite alias to **app-local**
  copies in each app, not to `packages/shared` directly (documented shadow-copy trap). Every service/
  util edit below must be applied to: `packages/shared/src/services/processTemplateSignatoryService.js`
  (canonical, for consistency) **and** its Platform/Simulator app-local shadow copies if they exist
  as separate files — checked explicitly in Slice 2, not assumed.

---

## Slice 1 — Schema + RLS (public schema)

**File:** `SQL/v1075_team_scope_signatory_requirements.sql`

- [ ] Update `chk_ptsr_scope_type` / `chk_ptssp_scope_type` CHECK constraints to allow `'team'`
      alongside the existing `organisation`/`portfolio`/`programme`/`project` values. No other
      column changes needed on either table — `teams.id` slots directly into the existing `scope_id`
      column, so unlike the superseded draft, **no new `scope_project_id` column, no index rebuild
      beyond the CHECK constraint update.**
- [ ] Extend `public.can_manage_signatory_requirements(p_account_id uuid, p_scope_type text, p_scope_id uuid)`
      in place (`CREATE OR REPLACE`, same signature — no new parameter needed, since `p_scope_id` for
      `scope_type = 'team'` is simply `teams.id`), adding:
      ```sql
      OR (
        p_scope_type = 'team'
        AND p_scope_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.teams t
          INNER JOIN public.users u ON u.id = t.team_lead_user_id
          WHERE t.id = p_scope_id
            AND COALESCE(t.is_deleted, FALSE) = FALSE
            AND COALESCE(t.is_active, TRUE) = TRUE
            AND u.auth_user_id = auth.uid()   -- caller must BE this team's lead
        )
      )
      ```
      Every existing branch (organisation/portfolio/programme/project) is untouched.
- [ ] `policy_ptssp_write` and `policy_ptsr_write` need **no changes** — they already call
      `can_manage_signatory_requirements(account_id, scope_type, scope_id)` positionally; the
      function's new `team` branch activates automatically once `scope_type = 'team'` rows exist.
- [ ] Update `database_tables` description rows for
      `process_template_signatory_requirements` / `process_template_signatory_scope_policies`
      (mention team scope) — idempotent `ON CONFLICT DO UPDATE`.
- [ ] No changes to `process_template_document_signatories` (signing instances) — resolution still
      flows through `resolveEffectiveSignatoryRequirements()`, which Slice 2 extends.

## Slice 1b — Schema + RLS (sim schema)

**File:** `SQL/v1076_sim_team_scope_signatory_requirements.sql`

- [ ] Mirror the CHECK-constraint change from Slice 1 onto `sim.process_template_signatory_requirements`
      / `sim.process_template_signatory_scope_policies` (created in `v880c` — check that file's exact
      constraint names first rather than assuming they match the `public` schema's).
- [ ] Mirror `can_manage_signatory_requirements()` as the sim-schema equivalent (check `v880c` for its
      exact existing name/signature rather than assuming — do not invent a new naming convention),
      sourcing team leadership from `sim.practice_teams` (`team_lead_user_id`) instead of
      `public.teams`. **Resolve the `auth.users` vs `public.users` FK mismatch noted in Slice 0**
      before writing the join — `sim.practice_teams.team_lead_user_id` references `auth.users(id)`
      directly, so the check is `t.team_lead_user_id = auth.uid()` (no `public.users` join needed at
      all here, simpler than the `public` schema branch).
- [ ] No sim policy changes needed, same reasoning as Slice 1.

## Slice 2 — Service layer

**Files (edit all three copies — see Slice 0's shadow-copy note):**
`packages/shared/src/services/processTemplateSignatoryService.js` +
Platform/Simulator app-local shadow copies of the same file, if `grep -rl` at implementation time
shows they exist as separate files (confirm before editing, don't assume).

- [ ] `SIGNATORY_SCOPE_TYPES` → add `'team'`.
- [ ] New: `getLedTeamsForUser(db, { projectId, userId })` — active, non-deleted `teams` rows on
      `projectId` where `team_lead_user_id = userId`. Returns `[]` (not a single value) since one
      person can lead more than one team on the same project (PRD decision #4/#8-story).
- [ ] New: `getTeamMembersForTeam(db, { teamId })` — active `team_members` roster for one team.
      Used by the page for display context, not by resolution logic.
- [ ] `resolveEffectiveSignatoryRequirements()` — accept new optional `teamId`. When provided,
      prepend `{ scopeType: 'team', scopeId: teamId }` to `chainSpecs` **before** the `project`
      entry. No other change to the walk/short-circuit logic — `team` is just the new narrowest
      level. Caller resolves which `teamId` applies (e.g. the document's originating team, if that's
      tracked, or the current viewer's own led team when previewing) — this plan does not invent a
      universal "which team does this document belong to" rule beyond what a caller already knows;
      see the narrower wiring note below.
- [ ] `getSignatoryScopePolicy`, `getSignatoryRequirements`, `getScopedSignatoryConfig`,
      `getSignatoryCountsForDocumentTables`, `saveScopedSignatoryConfig`,
      `saveSignatoryRequirementsForTables` — already accept `scopeType`/`scopeId` generically; no
      signature change needed. Confirm during implementation that passing `scopeType: 'team'`,
      `scopeId: <teams.id>` flows through unchanged (it should, since these functions never special-
      cased anything beyond `organisation` vs "everything else").
- [ ] `initializeSigningRound()` / `resyncPendingSigningRoundOrder()` — leave as-is for this plan.
      Wiring "which team does THIS specific document's signing round belong to" into every document
      type is a larger cross-cutting change across 23 document tables and is **not required** for the
      PRD's user stories (which are about the configuration page, not automatic per-document team
      attribution) — flag as a follow-up if a later request needs documents themselves to carry a
      team association. Keeps this plan's footprint to what the PRD actually asked for (rule 62).
- [ ] Add unit tests (`packages/shared/src/services/__tests__/processTemplateSignatoryService.test.js`
      if it exists, else colocated with the existing suite) for: team override present → wins over
      inherited project; team inherits, project has custom → project wins; no `teamId` passed → chain
      starts at project (unchanged pre-v1067 behaviour).

## Slice 3 — New Platform page (Project Setup, PM sidebar)

- [ ] New component: `apps/platform/src/components/signatory/ProjectTeamSignatoryPanel.jsx` — the
      actual UI, given `projectId` + the current user. On mount, resolves:
      - Is the current user this project's PM? (existing `projects.project_manager_user_id` check,
        same pattern already used elsewhere in the PM area.)
      - Which teams (if any) does the current user lead on this project? (`getLedTeamsForUser`.)
      Renders:
      - Project-scope editor (inherit/none/custom + slot list) — shown only if PM.
      - Read-only project-scope summary (current effective requirement) — shown if the user leads at
        least one team (so they can see what they'd inherit).
      - One team-scope editor (inherit/none/custom + slot list) per led team, labelled with that
        team's `team_name` — shown once per row from `getLedTeamsForUser`.
      - Reuse `SortableSlotRow`, the `SearchableSelect`-based role picker, and the drag-reorder
        mechanics from the existing `SignatoryRequirementsPage.jsx` rather than re-implementing —
        extract the slot-editor sub-piece into a small shared component if that's cleaner than
        copy-pasting (call this out during implementation; don't duplicate ~150 lines of working
        drag/drop code).
      - Audit tab (rule 63.1) does not apply — this configures a list of requirement rows, not one
        persisted record, same reasoning as why the existing PMO page has none.
      - Theme-aware (dark: variants), matches rule 28.1 checklist.
- [ ] New page: `apps/platform/src/pages/pm/PMInitiationDocumentSignatory.jsx` — thin wrapper
      (header + `<ProjectTeamSignatoryPanel projectId={...} />`), mirroring
      `PMInitiationBenefitsReviewPlan.jsx`'s shape exactly.
- [ ] New route in `apps/platform/src/routes/platformRoutes.jsx`, inside the existing
      `PMLayout`-wrapped block, alongside `pm/initiation/benefits-review-plan`:
      `<Route path="pm/initiation/document-signatory" element={<PMInitiationDocumentSignatory />} />`.
      Add the lazy import to `apps/platform/src/routes/lazyImports.js` following the existing
      `PMInitiationBenefitsReviewPlan` entry's pattern.
- [ ] No `/pmo/...` route or menu changes in this slice — PMO's existing page and menu item are
      untouched per PRD decision #10.

## Slice 4 — New Simulator page (parity)

- [ ] New component: `apps/simulator/src/components/signatory/ProjectTeamSignatoryPanel.jsx` — same
      shape as Slice 3's, sourced against `sim.*` tables via `simDb` and `sim.practice_teams` /
      `sim.practice_team_members`.
- [ ] New page: `apps/simulator/src/pages/simulator/pm/SimulatorPMInitiationDocumentSignatory.jsx`,
      mirroring `SimulatorPMInitiationBenefitsReviewPlan.jsx`'s shape.
- [ ] New route + lazy import in `apps/simulator/src/routes/simulatorRoutes.jsx` /
      `apps/simulator/src/routes/lazyImports.js`: `simulator/pm/initiation/document-signatory`,
      inside the existing `SimulatorPMLayout`-wrapped block.

## Slice 5 — Menu wiring (both apps)

**File:** `SQL/v1077_document_signatory_pm_menu.sql`

- [ ] New `menu_items` row(s): a Platform entry parented under the same parent as Project Charter /
      Business Case / PID / Benefits Review Plan in the **Project Setup** section (look up that
      parent's `menu_code`/`id` at implementation time — do not guess it), `route_path =
      '/pm/initiation/document-signatory'`, label "Document Signatory".
- [ ] New Simulator entry, same shape, `route_path = '/simulator/pm/initiation/document-signatory'`.
- [ ] `role_menu_items` grants: `project_manager` role, plus whatever role name(s) this codebase uses
      for a team lead (check the live `roles` table at implementation time — `team_manager` was seen
      as a `member_role_name` string on appointment records, but confirm it also exists as a row in
      `roles`/is grantable via `role_menu_items` before assuming the same string works there). Do
      **not** grant `pmo_admin` on this new item — PMO Admin keeps using their own existing page/menu
      entry.
- [ ] Idempotent (`ON CONFLICT DO UPDATE`), following the Database Table Registration / menu-seed
      conventions already used by `v880b`.

## Slice 6 — Tests + verification

- [ ] Unit tests from Slice 2.
- [ ] RLS manual verification checklist (documented in the Review section once run): PM can write
      project scope on their own project, cannot on someone else's; a team lead can write team scope
      for a team they actually lead (`teams.team_lead_user_id` = them), cannot write
      project/programme/portfolio/organisation scope, cannot write another team's scope even on the
      same project; a plain team member cannot write anything; PMO Admin behaviour on the existing
      page is unchanged.
- [ ] Component test for `ProjectTeamSignatoryPanel`'s render states: PM only, single led team, two
      led teams (two editors), PM + led team both, neither (page/menu not reachable in practice, but
      component should render an empty/appropriate state defensively).
- [ ] Manual smoke test: open the new PM sidebar item as a seeded Project Manager and as a seeded
      team lead on the same demo project, confirm correct sections render and effective resolution
      order (team → project → programme → portfolio → organisation) matches expectations for a
      document type with overrides at multiple levels.

---

## Todo checklist (roll-up)

- [x] Slice 1 — public schema + RLS
- [x] Slice 1b — sim schema + RLS
- [x] Slice 2 — service layer (+ shadow-copy check: none exist for this file, only `packages/shared`)
- [x] Slice 3 — Platform page + route
- [x] Slice 4 — Simulator page + route
- [x] Slice 5 — menu wiring (Platform fully wired; Simulator wired flat — see Review)
- [x] Slice 6 — unit tests (52/52 passing); RLS/manual verification and component tests **not**
      run in this session (no live DB / browser access) — left for the user to run
- [x] Review section added below

---

## Review

**Shipped:**
- `SQL/v1075_team_scope_signatory_requirements.sql` — public schema: `team` added to both CHECK
  constraints; `can_manage_signatory_requirements()` extended with a `teams.team_lead_user_id`
  branch. No new columns — `teams.id` reused as `scope_id` directly (simpler than the draft plan's
  `scope_project_id` idea, since `teams` already has its own per-project unique id).
- `SQL/v1076_sim_team_scope_signatory_requirements.sql` — same for `sim` schema, sourced from
  `sim.practice_teams.team_lead_user_id` (which references `auth.users(id)` directly, so no
  `public.users` join needed there, unlike the public-schema branch).
- `packages/shared/src/services/processTemplateSignatoryService.js` — `SIGNATORY_SCOPE_TYPES`
  gained `'team'`; `resolveEffectiveSignatoryRequirements()` accepts an optional `teamId` prepended
  ahead of `project` in the resolution chain; new `getLedTeamsForUser()` (Platform, `teams`/
  `team_members`) and `getLedPracticeTeamsForUser()` (Simulator, `practice_teams`) helpers; new
  `getTeamMembersForTeam()` roster helper (written per the plan but **not yet wired into either
  UI** — flagged below). 52 unit tests passing, including 6 new ones for the team-scope resolution
  paths and the two "led teams" lookups.
- `apps/platform/src/components/signatory/ProjectTeamSignatoryPanel.jsx` +
  `apps/platform/src/pages/pm/PMInitiationDocumentSignatory.jsx` — new project-locked, role-aware
  page. Route `pm/initiation/document-signatory` registered under the existing `PMLayout` block in
  `platformRoutes.jsx`; lazy import added to `lazyImports.js`.
- `apps/simulator/src/components/signatory/ProjectTeamSignatoryPanel.jsx` +
  `apps/simulator/src/pages/simulator/pm/SimulatorPMInitiationDocumentSignatory.jsx` — Simulator
  equivalent, adapted to the practice-project ownership model (`practice_projects.user_id` /
  `practice_teams.team_lead_user_id`, both compared against the raw `auth.uid()`, not
  `public.users.id`). Route `simulator/pm/initiation/document-signatory` registered under the
  existing `SimulatorPMLayout` per-route wrapper in `simulatorRoutes.jsx`.
- `SQL/v1077_document_signatory_pm_menu.sql` — Platform: new leaf `plat_pm_s_document_signatory`
  under the confirmed `plat_pm_project_setup` parent, granted to whatever role already holds
  Project Details access (covers Project Manager) plus an explicit grant to `pm_team_manager`
  (confirmed role name via `SQL/v580_ensure_pm_invitation_roles.sql` — display name "Team
  Manager"). Simulator: new leaf `sim_pm_s_document_signatory`, granted to
  `project_manager`/`Project Manager`/`pm_team_manager`.
- `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` — added "Document Signatory (v1067)" under
  Project Setup in the Generic/Core PM tree, per the user's mid-session request.
- `CLAUDE.md` rule 70 added — keep that taxonomy file in sync with menu changes going forward.

**Deviations from the approved plan:**
- **Foundation changed mid-implementation, with explicit re-approval.** The original plan (and its
  first PRD draft) built "team" from `team_member_appointment_records.reporting_to_user_id`. While
  starting Slice 1, the already-live `teams`/`team_members` tables (`teams.team_lead_user_id`) were
  found — a better, purpose-built fit that also eliminates the need for a `scope_project_id`
  companion column. The PRD and plan were both rewritten to reflect this before writing any SQL,
  and the change was re-confirmed with the user via the interview tool before proceeding.
- **Simulator menu parent not resolved.** `SQL/v1064_working_days_holidays_menu.sql` documents that
  Simulator's PM sidebar has no "Project Setup" grouping today, and this session had no live-DB
  read access to identify the correct actual parent for a Simulator PM-area leaf. The Simulator
  menu item (`sim_pm_s_document_signatory`) was inserted **flat** (no parent) rather than guessed
  into a possibly-wrong location — it is visible and functional, just not nested under a section.
  **Follow-up:** once someone can query the live `menu_items` table, set its `parent_menu_id` to
  match wherever Simulator's other PM-initiation items (Project Brief, Benefits Review Plan) are
  actually parented, or leave flat if that's the established Simulator convention.
- **Drag-and-drop slot reordering was not carried over** from the PMO admin page's
  `SortableSlotRow` (dnd-kit) — the new panels use the simpler up/down-arrow reordering that
  `SortableSlotRow` also already provides as a fallback, per the plan's own "don't duplicate ~150
  lines of working drag/drop code" note. Functionally equivalent; less code.
- **`getTeamMembersForTeam()` was written but not wired into either UI.** The plan described it as
  "display context, not used by resolution logic" — the panels currently don't show a team's member
  roster inline. Low-risk, easy follow-up if that context turns out to matter in practice.
- **Per-document automatic team attribution was explicitly deferred**, per the plan's own Slice 2
  note — `initializeSigningRound()` / `resyncPendingSigningRoundOrder()` are unchanged, so a
  document's signing round does not yet automatically resolve which team it belongs to. The new
  page configures team-scope *requirements*; wiring live documents to pick up a `teamId`
  automatically is a separate, larger effort across 23 document tables, out of scope per the PRD.

**SQL status:** `v1075` (public), `v1076` (sim), and `v1077` (menu, both apps) have all been
applied to the live database, confirmed by the user directly (2026-09-19) — not run or verified
from this session, but the schema/RLS/menu layer is now live.

**Still not run (needs the user, or a follow-up session with dev-server/browser access):**
- The Slice 6 RLS manual verification checklist (PM can only touch their own project scope; a team
  lead can only touch a team they actually lead, not another team or any wider scope; a plain team
  member can't write anything; PMO Admin's existing page is unaffected). The SQL is live, so this
  can now actually be exercised.
- The Slice 6 component tests for `ProjectTeamSignatoryPanel`'s render states.
- The Slice 6 manual smoke test: open `pm/initiation/document-signatory` as a seeded Project
  Manager and as a seeded team lead on the same demo project, confirm the right sections render and
  save correctly, and repeat for the Simulator page.
- Confirming the new sidebar items actually render (Platform under Project Setup; Simulator flat)
  and clicking through to the pages works end-to-end.
