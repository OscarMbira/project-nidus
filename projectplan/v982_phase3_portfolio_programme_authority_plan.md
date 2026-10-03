# v982 Implementation Plan — Phase 3: Portfolio/Programme-Scoped Roles & Authority Model

Implements Phase 3 of `projectprd/v982_saas_user_journey_account_pmo_delivery_PRD.md` (brief
§14-18). Depends on Phase 2 existing conceptually (classifications/governance may reference
scope later) but has no hard code dependency on it — can be built in parallel if you prefer.

## ⚠ Material conflict found — needs your decision before this phase starts (not silently resolved)

Investigation found that **live RLS policies today already grant exactly the kind of automatic
downward authority the brief's target model explicitly forbids**:

- `SQL/v592a_portfolio_mgr_assignments_rls.sql`: a portfolio's `portfolio_manager_user_id` can
  currently **UPDATE** any `programmes` row under that portfolio, and any `projects` row reachable
  via `programme_projects → programmes → portfolios`.
- `SQL/v592b_programme_mgr_assignments_rls.sql`: a programme's `programme_manager_user_id` can
  currently **UPDATE** any `projects` row under that programme (to set manager-assignment fields).

This is real, shipped, presumably-in-use behaviour. The brief's principle (§16: visibility/
authority at a parent scope never automatically implies write authority on child objects) directly
contradicts it. Three ways to resolve this, needs your call:

1. **Supersede it** — replace v592a/v592b's blanket UPDATE grants with the new explicit
   scope+role+permission model from this phase; a portfolio/programme manager who currently
   relies on that automatic write access loses it unless explicitly re-granted via the new
   `portfolio_roles`/`programme_roles` tables. **Recommended** — this is the whole point of Phase
   3, and leaving the old blanket grant alongside a new formal model creates two competing
   authority systems, which is worse than either alone.
2. **Keep both, narrowed** — leave v592a/v592b's automatic grant in place but narrow it to only
   the specific manager-assignment fields it currently touches, and layer the new scoped-role
   model on top for everything else. More conservative, more complex, two systems to reason about
   long-term.
3. **Leave as-is, additive only** — the new scope/role tables exist but v592a/v592b are untouched;
   Phase 3 becomes purely additive (new grants possible, old automatic grant still there
   unconditionally). Simplest to ship, but does not actually deliver the brief's core §16
   principle — the "no automatic downward authority" property would remain false for the one
   relationship (portfolio/programme manager → child) the brief uses as its own worked example.

This plan proceeds assuming **option 1** (supersede) since it's the recommended path and matches
the brief's explicit example, but implementation of the RLS-replacement task below should not
start until you've confirmed this — flag it again at that point if not already confirmed.

## Facts established during investigation (grounds every task below)

- **Portfolios/Programmes already exist as real, live entities** (13 portfolios, 18 programmes
  confirmed live) — `SQL/v36_portfolio_management.sql`, `SQL/v37_programme_management.sql`.
  `projects` has **no** `portfolio_id`/`programme_id` column — linkage is via join tables
  `portfolio_projects`/`programme_projects`. Standalone projects already work structurally (no
  join-table row). No schema change needed for the entities themselves.
- **The pattern to mirror**: `project_roles` (`id, project_id [NULL=template], role_name,
  role_display_name, permissions JSONB, is_template, is_system_default, role_level, is_active` —
  `SQL/v91_role_system_cleanup.sql:51-77`) + `project_memberships` (`id, project_id, user_id,
  project_role_id, invitation_status, is_active` — same file, lines 105-132). New
  `portfolio_roles`/`portfolio_memberships` and `programme_roles`/`programme_memberships` should
  match this exact column shape, substituting the scope FK.
- **RLS enforcement style to match**: not one universal function — a `SECURITY DEFINER` helper per
  concern, specifically to dodge policy self-recursion. Canonical example:
  `is_project_manager(p_auth_user_id, p_project_id)` (`SQL/v108_fix_project_memberships_rls_
  recursion.sql:28-51`). New `is_portfolio_member()`/`has_portfolio_role()` and programme
  equivalents should follow this same shape and naming convention, not a novel style.
- **"Portfolio Manager"/"Programme Manager" already exist as role-NAME values** (`project_roles.
  role_name` already accepts `'programme_manager'`, checked by `is_project_manager()` and
  `auth_user_has_project_manager_role()` (`SQL/v853`)) — but folded into project-level authority
  today, not scope-separated. `portfolio_members`/`programme_members` tables exist with a
  free-text `member_role` + ad hoc boolean flags but are **confirmed dead — no RLS policy
  references them today**. Decide at implementation time whether to repurpose these dead tables
  (they already roughly match the target shape) or supersede them with cleanly-named new tables —
  repurposing avoids an extra migration but inherits whatever naming debt they carry; recommend
  reviewing their exact column list before deciding, not assuming reuse is free.
- **Roll-up dashboard RLS gap, found incidentally**: `portfolios` SELECT RLS today
  (`SQL/v278_fix_portfolios_rls.sql:39-42`) is `USING (is_deleted = FALSE)` for role
  `authenticated` — **open to every authenticated user platform-wide**, no account/org scoping at
  all, let alone portfolio-membership scoping. This is a **separate, pre-existing gap** (not
  something Phase 3 introduces) that Phase 3's new scope model should close as part of the same
  pass, since leaving it open while building a formal permission model around it would be
  incoherent. Flagging here so it's not mistaken for new Phase 3 scope creep — it's a latent bug
  this phase is well-positioned to fix while already touching this exact area.
- **`role_menu_items` (sidebar visibility) and data-access RLS are confirmed fully separate
  systems today** — adding portfolio/programme scope to RLS does not touch menu visibility, and
  menu visibility changes (if any are needed once Phase 3 ships) are a separate, later task.

## Todo list

### A. Database
- [x] Material conflict resolved by the user: **option 1 (supersede)**, confirmed explicitly.
  Proceeded directly.
- [x] `SQL/v990_portfolio_roles_and_memberships.sql` — new `portfolio_roles` +
  `portfolio_memberships` tables, mirroring `project_roles`/`project_memberships` exactly.
- [x] `SQL/v991_programme_roles_and_memberships.sql` — same for programme scope.
- [x] `SQL/v992_portfolio_programme_rls_helpers.sql` — `is_portfolio_member()`,
  `has_portfolio_role()`, `is_programme_member()`, `has_programme_role()` — `SECURITY DEFINER`,
  matching `is_project_manager()`'s shape. Also carries the membership tables' write policies
  (deferred here from v990/v991 since they need these functions) and the 4 new tables'
  `database_tables` registry rows.
- [x] `SQL/v993_supersede_portfolio_programme_mgr_rls.sql` — drops v592a's/v592b's three policies,
  replaces them with `has_portfolio_role()`/`has_programme_role()`-gated equivalents over the
  SAME reachability chain, and **migrates every current manager into an explicit membership row
  FIRST** (three migration blocks: portfolio managers -> `portfolio_memberships`, programme
  managers -> `programme_memberships`, AND portfolio managers' implicit authority over their
  portfolio's own child programmes -> an explicit `programme_memberships` row too, since v592a
  granted that specific access and it would otherwise be silently lost on cutover).
- [x] `SQL/v994_fix_portfolios_programmes_rls_scoping.sql` — closes the open-to-all-authenticated-
  users SELECT gap on **both** `portfolios` (as instructed) **and** `programmes` (the identical,
  symmetric gap found during this phase's own investigation of the same area — see the file's own
  header for why fixing one without the other would be incoherent). Scoped to account membership +
  explicit portfolio/programme membership + direct owner/manager field + system_admin. Also
  implements the brief's "read-only roll-up visibility" principle on `programmes` SELECT: a
  portfolio member can see (never write) the programmes under their own portfolio.
- [x] `database_tables` registry rows for all 4 new tables (in v992).
- [x] Seed data: `portfolio_manager`/`portfolio_viewer` and `programme_manager`/`programme_viewer`
  template roles (`is_template = TRUE`, scope FK NULL), mirroring `project_roles`' template
  convention (in v990/v991).
- [x] **Unanticipated structural finding, resolved (documented, not silently assumed)**:
  `portfolios`/`programmes` had **no `account_id` column at all** anywhere in this codebase's SQL
  history — a genuine gap the plan's own facts section didn't surface. `SQL/v989_portfolio_
  programme_account_scoping.sql` adds it (nullable, backfilled best-effort from linked
  projects/owner/manager's owned account) since the coordinator's own "scope to account
  membership... within their own org" instruction has no column to key off without it. See that
  file's header for the full backfill precedence and reasoning — flagged here and in the review
  section rather than assumed silently.

### B. Backend/services
- [x] `portfolioRoleService.js` / `programmeRoleService.js` — CRUD + membership management.
  **Simplification, documented**: direct assignment among existing account members (reuses
  `organisationRoleService.js`'s `getOrganisationUsers()`), not a full email-invitation flow like
  `projectMembershipService.js` — that service's invitation-token/email machinery is out of
  proportion to this phase's brief scope ("assign a role to an existing platform user"). Each
  service also exposes a `get*MembershipAccess()` function that mirrors the RLS write policy's own
  logic client-side, so the UI can gate Add/Edit/Remove without a failed write round-trip.
- [x] Updated `portfolioService.js` (`savePortfolio`) and `programmeService.js` (`saveProgramme`)
  so a newly-created portfolio/programme carries `account_id` (resolved via
  `getCurrentUserAccountId()` when not explicitly supplied) — required for the new account_id
  column (v989) and the RLS scoping fix (v994) to see it. Existing rows are untouched (v989's
  backfill already resolved what it could). `getPortfolios`/`getAllPortfolioProjects` and their
  programme equivalents needed no query changes — confirmed they already select `*`/broad column
  sets with no client-side account filtering, so RLS scoping is transparent to them.

### C. Frontend
- [x] `PortfolioMembersPage.jsx` (`portfolio/:portfolioId/members`) and `ProgrammeMembersPage.jsx`
  (`programme/:programmeId/members`) — who has what explicit role, following the Phase 2 CRUD page
  pattern (list + inline add/edit panel with `DetailAuditTabList` Details/Audit tabs, success
  modal, icon-only row actions). Linked from `Portfolio.jsx`'s row actions (new `Users` icon
  button) and `ProgrammeDetail.jsx`'s header actions (new "Members" button) — no dedicated sidebar
  entry, matching how per-record management pages reach off a list/detail page rather than getting
  their own top-level menu item (same pattern as "Manage Roles"' per-role edit page).
- [x] `PortfolioDashboard.jsx` roll-up view: **confirmed, no code change needed**. `load()` already
  catches errors into an `error` state and defaults `portfolios` to `[]` on failure; the RLS
  SELECT scoping fix (v994) filters rows silently (0 visible rows for a user with no access), it
  does not throw a permission error — so the page's existing "No portfolios found." empty state
  (line 162) already covers a no-access user gracefully.
- [x] Theme-aware, success-modal, icon-only actions — verified on both new pages.
- [x] **Simulator parity — genuine gap, documented, not force-fit**: Simulator has **zero** routes
  referencing `portfolios`/`programmes` anywhere in `simulatorRoutes.jsx` (grep-confirmed) — these
  are Platform-only real-delivery entities; Simulator's practice-project world has no portfolio/
  programme concept in its UI at all. There is nothing to mirror. The new SQL (v989-v994) is
  `public`-schema only for the same reason — no `sim.portfolios`/`sim.programmes` tables exist
  anywhere in this codebase's SQL history.

### D. Tests — this phase needs the most rigorous testing in the whole PRD (authorization surface)
- [x] The brief's own worked example as a literal test case, at the RLS-design level: the
  replacement `projects_update_portfolio_role`/`projects_update_programme_role` policies (v993)
  require `has_portfolio_role()`/`has_programme_role()` to return TRUE for the SPECIFIC portfolio/
  programme reachable from that specific project row — a grant on Portfolio A structurally cannot
  satisfy a policy check keyed to Portfolio B's/Project 101's own reachability chain. At the JS
  layer, `programmeRoleService.test.js`'s cross-scope leak tests are the literal executable version
  of this (see below) — genuine live-RLS execution against real Project 101-shaped data was not
  performed (no live DB this session, see task E).
- [x] Direct RPC/query access tested independently of UI, at the JS-client-contract layer:
  `portfolioRoleService.test.js`/`programmeRoleService.test.js` call the actual
  `has_portfolio_role`/`has_programme_role` RPCs (mocked) the same way the real RLS policies do,
  and assert `canManage: false` for a user with no grant — this is the access-check function the
  UI calls, exercised the same way a direct Supabase client call would be, not "the page hides a
  button." **Caveat, stated plainly**: this proves the JS gating logic is correct and calls the
  right RPC with the right arguments; it does NOT prove the RLS policy itself denies a raw
  `platformDb.from('portfolios').select()` call against a live database, since no live DB was
  used this session (ground rule). Recommend a manual/staging pass with two real test accounts
  before treating this as fully verified — see task E.
- [x] `v993MigrationSafety.test.js` — a structural regression guard on the migration file itself
  (not a live before/after row diff, which needs a live database): asserts the migration INSERTs
  exist, target the right columns, are idempotent (`ON CONFLICT DO NOTHING`), and run BEFORE the
  superseded policies are dropped (no access-gap window) — a real regression guard against someone
  editing v993.sql later and silently breaking the "preserve every current manager" safety net.
- [x] Cross-scope leak tests (`programmeRoleService.test.js`): a role grant on Programme X does not
  leak to sibling Programme Y (RPC called per-programme-id, verified via mock assertion); a
  Portfolio Manager grant on Portfolio A does not leak to a programme under unrelated Portfolio B;
  a Portfolio Manager grant DOES correctly extend to a programme genuinely under their own
  portfolio (the intended "portfolio manager can delegate within their own portfolio" behaviour,
  proven to be scope-correct, not scope-leaky). Plus cross-TENANT leak tests in both service test
  files: a PMO Admin of a different account never gets `canManage`.

### E. Verification
- [x] `npx vitest run` clean, both apps — see review section for full-suite results.
- [ ] Manual walkthrough: assign a portfolio role to a test user, confirm exactly the intended
  access (no more, no less) in-browser. **Not performed** — no dev server/browser session and no
  live database this session (same class of gap as Phase 1/2's "manual verification not
  performed"). This is the single most important follow-up for this phase specifically, given the
  authorization surface — see review section's recommended next steps.
- [x] Confirmed the `portfolios`/`programmes` RLS fix (v994) preserves account owner/PMO admin
  visibility: the SELECT policy's first OR-branch is `account_id IN (SELECT account_id FROM
  get_user_accounts(auth.uid()))`, which is TRUE for every member of the owning account (owners
  and PMO admins included, not just a narrower subset) — by design, not narrowed to only
  owners/PMO admins, since ordinary account members already see all account-scoped data elsewhere
  in this codebase (matches the existing norm rather than inventing a stricter one here).
- [x] REVIEW.md applicable checks — see review section.

## Review section

Phase 3 is implemented. Summary below; see the inline `[x]` notes above for task-by-task detail.

### Material conflict — confirmed resolution

The user confirmed **option 1 (supersede)** explicitly via the coordinator's message. Implemented
exactly as specified: v592a's/v592b's three automatic-write policies are dropped and replaced with
explicit-grant-gated equivalents (SQL/v993), and every manager who relied on the old automatic
grant was migrated into an equivalent explicit membership row in the SAME migration, before the
old policies are dropped (verified structurally by `v993MigrationSafety.test.js`).

### Unanticipated structural finding — not silently assumed

`portfolios`/`programmes` had **no `account_id` column at all** anywhere in this codebase's SQL
history — confirmed by exhaustive grep (no `ALTER TABLE ... ADD COLUMN account_id`, and
`portfolioService.js`'s own write-whitelist never included it). This meant the coordinator's
"scope portfolios SELECT to account membership... preserve access for account owners/PMO admins
within their own org" instruction had no existing column to key off. Resolved by adding a nullable
`account_id` column to both tables (SQL/v989), backfilled best-effort from linked projects, then
from the owner/manager's owned account, with new creates wired to set it going forward
(`portfolioService.js`/`programmeService.js`). This is additive/backward-compatible (nullable FK,
nothing removed or renamed) and was the most conservative way to close the gap the coordinator
explicitly asked to be closed in this same pass — proceeded rather than stopping, per the judgment-
call latitude already established in Phase 1/2, but flagged clearly here and at the point of
discovery (SQL/v989's own header) rather than assumed silently.

### Additional finding, addressed beyond the literal instruction

`programmes` SELECT RLS (SQL/v249) had the **identical** open-to-every-authenticated-user gap as
`portfolios` (SQL/v278) — same `USING (is_deleted = FALSE)` for role `authenticated`, no scoping
at all. The coordinator's instruction named `portfolios` specifically; `programmes` was found
during this phase's own investigation of "the exact same area." Fixed both in the same file
(SQL/v994) for the same coherence reason the coordinator gave for fixing portfolios in the first
place — leaving the sibling gap open while closing this one would have been incoherent.

### Findings NOT addressed this phase (documented, out of scope)

- `portfolio_projects`/`programme_projects` INSERT policies are also fully open
  (`WITH CHECK (true)`) — a related but separate, unflagged gap. Not touched, to avoid uncontrolled
  scope creep on an already-large authorization-surface phase; flagged for a future pass.
- The dead `portfolio_members`/`programme_members` tables (v36/v37) were reviewed (per the plan's
  own instruction to check their shape before deciding) and found to carry real shape debt
  (free-text `member_role`, ad hoc boolean permission flags instead of an FK'd role + JSONB
  permissions) — confirmed still unreferenced by any RLS policy, left untouched, not dropped.
- "Read-only roll-up visibility" (brief's worked example, PRD Phase 3 open decision 5) was
  implemented for `programmes` SELECT (a portfolio member can see, never write, programmes under
  their portfolio) but deliberately NOT extended to `projects` SELECT — `projects` SELECT RLS is a
  much larger blast radius already relied on broadly across this codebase, and narrowing or
  extending it was not required by any of the phase's literal test cases (all of which are about
  WRITE authority). Left as a clearly-scoped boundary, not a silent omission.

### Files created

SQL (run in this order — dependencies are real and load-bearing here, none executed against the
live DB by this session):
1. `SQL/v989_portfolio_programme_account_scoping.sql` — adds + backfills `account_id` on
   `portfolios`/`programmes`. No dependency on the other new files.
2. `SQL/v990_portfolio_roles_and_memberships.sql` — `portfolio_roles`/`portfolio_memberships` +
   template role seed. Depends on v989 only incidentally (portfolios must exist, already true).
3. `SQL/v991_programme_roles_and_memberships.sql` — programme mirror of v990.
4. `SQL/v992_portfolio_programme_rls_helpers.sql` — **depends on v990 AND v991** (the helper
   functions and membership write policies reference both membership tables). Also carries the 4
   new tables' `database_tables` registry rows.
5. `SQL/v993_supersede_portfolio_programme_mgr_rls.sql` — **depends on v992** (uses
   `has_portfolio_role()`/`has_programme_role()`) and on v990/v991's seeded template roles (the
   migration INSERTs join to them by `role_name`). Must run before v994 conceptually (though no
   hard SQL dependency) — logically the "old system is superseded" step should land before "we
   also happen to fix a related SELECT gap."
6. `SQL/v994_fix_portfolios_programmes_rls_scoping.sql` — **depends on v989 (account_id) and v992**
   (`is_portfolio_member()`/`is_programme_member()`).

**Run order: v989 → v990 → v991 → v992 → v993 → v994** (strict — v992 needs both v990 and v991;
v993 and v994 both need v992; v993 additionally needs v990/v991's seeded roles).

Platform app:
- `apps/platform/src/services/portfolioRoleService.js`
- `apps/platform/src/services/programmeRoleService.js`
- `apps/platform/src/pages/portfolio/PortfolioMembersPage.jsx`
- `apps/platform/src/pages/programme/ProgrammeMembersPage.jsx`
- `apps/platform/src/services/__tests__/portfolioRoleService.test.js`
- `apps/platform/src/services/__tests__/programmeRoleService.test.js`
- `apps/platform/src/services/__tests__/v993MigrationSafety.test.js`

Simulator: none — genuine, documented parity gap (see task C).

### Files changed

- `apps/platform/src/services/portfolioService.js` — `account_id` added to `PORTFOLIO_COLUMNS`
  write-whitelist; `savePortfolio()` sets it on create via `getCurrentUserAccountId()` when not
  explicitly supplied.
- `apps/platform/src/services/programmeService.js` — `saveProgramme()` sets `account_id` on create
  the same way.
- `apps/platform/src/pages/platform-app/Portfolio.jsx` — new "Members" icon action per row, linking
  to `portfolio/:id/members`.
- `apps/platform/src/pages/programme/ProgrammeDetail.jsx` — new "Members" button in the header
  actions, linking to `programme/:id/members`.
- `apps/platform/src/routes/lazyImports.js` / `apps/platform/src/routes/platformRoutes.jsx` — 2 new
  routes (`portfolio/:portfolioId/members`, `programme/:programmeId/members`).

### Test results

New tests: 33 assertions across 5 files (Platform only, per the documented Simulator gap):
- `portfolioRoleService.test.js` (7 tests) — access-check contract, including a cross-tenant leak
  check (PMO Admin of a different account never gets `canManage`).
- `programmeRoleService.test.js` (6 tests) — access-check contract, including two cross-scope leak
  checks (sibling programme, unrelated portfolio) and one "correctly-scoped delegation DOES work"
  positive check.
- `v993MigrationSafety.test.js` (7 tests) — migration structural regression guard.
- Plus the two files' remaining fast-fail/bootstrap-path/system_admin-bypass tests.

All new tests pass (verified with a targeted run before the full-suite run).

Full-suite `npx vitest run`:
- Platform: 221 files / 1469 tests passed, 61 files / 182 tests failed.
- Simulator: 221 files / 1388 tests passed, 62 files / 101 tests failed.

**Exact match to Phase 2's own recorded baseline** (Platform: 61 failed files/182 failed tests;
Simulator: 62 failed files/101 failed tests, unchanged from Phase 1's baseline before that) —
Platform's passing file/test counts increased by exactly +3 files/+20 tests (this phase's own new
test files); Simulator's counts are byte-identical to Phase 2's run (expected — Phase 3 added zero
Simulator files, per the documented parity gap). Nothing this phase touched appears in either
app's failing-file list. Strong evidence of no regression.

### Manual verification not performed — most important follow-up for this phase

No dev server, browser session, or live database was used this session. Given this phase touches
the authorization surface directly, the single most important recommended next step is: apply
v989-v994 to a staging database with real portfolio/programme/manager data, then run the
verification queries already embedded in v989's, v993's, and v994's own file footers, PLUS a
manual two-account walkthrough (create a test user with a portfolio_manager grant on Portfolio A
only; confirm via the actual browser/API that they can write to Portfolio A's programmes/projects
but NOT to an unrelated Portfolio B's, and that a fresh account's PMO Admin cannot see Portfolio
A at all) before treating Phase 3's authorization changes as production-verified.

### Nothing else flagged as needing a product/security decision

The material conflict (the one flagged decision point) was already resolved by the user before
this session's work began. No further genuine ambiguity was hit beyond the account_id structural
gap, which was resolved via the conservative, additive, clearly-documented path described above
rather than treated as a stop-and-ask (consistent with the latitude already used in Phase 1/2 for
comparable implementation-shape gap-fills).
