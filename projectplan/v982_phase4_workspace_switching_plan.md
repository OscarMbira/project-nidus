# v982 Implementation Plan — Phase 4: Workspace Switching

Implements Phase 4 of `projectprd/v982_saas_user_journey_account_pmo_delivery_PRD.md` (brief §3,
§19). Depends on Phase 1 (clean registration branching) being live; independent of Phases 2-3.

## Facts established during investigation (grounds every task below)

- **No dedicated user↔organisation membership table exists.** `accounts.owner_user_id` is a
  single FK (`SQL/v84_accounts_and_extensions.sql:34`); `users` has no `account_id` column at all.
  "Membership" is inferred transitively from `organisation_invitations` (accepted),
  `project_memberships`/`user_projects`, and `account_billing_delegates`.
- **The data model already tolerates multi-org membership at the query level** —
  `get_user_accounts()` (`SQL/v87_unified_auth_functions.sql:262-330`, extended in
  `SQL/v94_fix_get_user_accounts_ambiguous.sql:80-188`) already `UNION`s owned / invited-org /
  project-role accounts and can return multiple rows for one user. **This is the function to
  build on** — it already answers "what orgs can this user access," just isn't surfaced as a
  switcher.
- **No "active org" concept exists anywhere** — zero hits for `activeOrgId`/`currentOrgId`/
  `switchOrganisation`-style code. Every resolution
  (`packages/shared/src/utils/accountResolution.js`'s `getCurrentUserAccountId` →
  `resolveAccountIdForAuthUser`, lines 154-229; `billingAccessService.js`'s
  `resolveAccountIdForUser`, lines 38-73) runs an ordered waterfall and **takes the first match**,
  caching it in `sessionStorage` (`ACCOUNT_CACHE_PREFIX`). **This is structurally single-account
  today** — a user in 2+ orgs gets whichever the waterfall hits first, silently, every session.
  This is the real gap Phase 4 fills — not a bug to patch, a missing selection mechanism to add.

## What Phase 4 actually needs to build

1. A genuine "active workspace" concept: which of the orgs `get_user_accounts()` returns is
   currently selected, persisted per-session (and remembered across sessions as a default, similar
   to how `useViewMode` remembers view choice per rule 41).
2. A workspace switcher UI (header-level, reachable from anywhere) listing the user's accessible
   orgs from `get_user_accounts()`, with the current one indicated.
3. On switch: recompute everything that today assumes a single resolved account —
   entitlements/industry packs, role/menu resolution (`useMenu.js`), and any cached sidebar state
   (`SIDEBAR_CACHE_VERSION`-style invalidation, but per-switch, not per-deploy) — a full, clean
   recomputation, not a partial patch that could leave stale data from the previous workspace
   visible (this exact failure mode has already bitten this project for ordinary role changes this
   session, per prior sidebar-cache work — workspace switching raises the stakes considerably,
   since it changes the account_id itself, not just the role within one account).

## Decisions — accepted by default per user authorization

Neither decision touches live authorization/RLS (unlike Phase 3) — both are implementation-shape
calls proceeded on directly, per the coordinator's explicit instruction, no further sign-off asked.

1. **Where does the "active workspace" selection live?** Accepted: a DB column
   (`users.last_active_account_id`) — persists across devices/sessions. Implemented as
   recommended, plus overwriting the existing in-session `ACCOUNT_CACHE_PREFIX` cache immediately
   on switch (not a separate new sessionStorage concept — that cache already serves the "took
   effect this session" role, see task B).
2. **Owned vs. invited/member orgs in the switcher?** Accepted: visually distinct, owned orgs
   shown first (a separate "Owned by you" section above "Member of", plus a crown icon per row).
   `get_user_accounts()` already returns `is_owner` per row — no function change needed.

## Todo list

### A. Database
- [x] `SQL/v995_active_workspace_selection.sql` — adds `users.last_active_account_id` (nullable
  FK to `accounts.id`), per decision 1. No new table, no `database_tables` registry row (single
  column addition, per this phase's own ground rule 6).
- [x] Confirmed `get_user_accounts()` already returns enough per-row detail for a switcher UI —
  `account_id`, `account_name`, `is_owner`, `project_count`, `total_members`,
  `subscription_status`, `created_at` (v87/v94, unchanged this phase). No function change needed.

### B. Backend/services
- [x] Extended `accountResolution.js` directly (not a new `workspaceService.js`), per the plan's
  own recommended alternative — `getAccessibleWorkspaces()` wrapping `get_user_accounts()`,
  `setActiveWorkspace(accountId)` writing `users.last_active_account_id`, overwriting the
  in-session `ACCOUNT_CACHE_PREFIX` cache entry to the new value immediately, and calling
  `clearSidebarCache(authUserId)` (all layout scopes) — the exact mechanism this phase's ground
  rules named. No separate industry-pack/entitlement cache was found to exist yet (v918's
  entitlement model doesn't currently cache per-account client-side beyond the sidebar itself).
- [x] `resolveAccountIdForAuthUser` now checks `users.last_active_account_id` FIRST (after the
  existing session-cache check, which still wins fastest-path exactly as before), before falling
  through to the untouched pre-v995 owner/invite/project waterfall. For a user who has never
  switched (`last_active_account_id` NULL — the default for every existing user), this adds one
  extra indexed single-column read but changes NO result — proven by the single-org regression
  test (task D).
- [x] Simulator mirror — confirmed via Phase 1's own finding (re-verified here): Simulator's
  "organisation" concept IS `public.accounts`, the same rows Platform sees (both apps'
  `organisationService.js`/invitation flows already resolve through `platformDb`/public schema
  regardless of which app is running). `accountResolution.js` was already a byte-identical shadow
  copy in both apps pre-this-phase (confirmed via diff) — edited identically in both, not a
  documented gap this time (unlike Phase 3's portfolio/programme entities, which genuinely don't
  exist in Simulator's UI).

### C. Frontend
- [x] `WorkspaceSwitcher.jsx` (new, both apps) mounted in `SystemHeader.jsx` next to the existing
  "roles menu"/"User Profile Menu" dropdowns (same interaction idiom: button + absolutely-
  positioned dropdown, click-outside-to-close) — lists accessible workspaces from
  `getAccessibleWorkspaces()`, owned orgs in a separate "Owned by you" section above "Member of"
  (decision 2), current workspace checkmarked.
- [x] On switch: `setActiveWorkspace()` persists + wipes the sidebar cache, then the component
  forces `window.location.href = landingRoute` (a full browser navigation/reload, never a soft
  client-side re-render) — this is the deliberate "bypass the stale-while-revalidate cache
  entirely" mechanism: a full reload wipes every module-level cache, every React component's
  state, and every in-flight resolution, guaranteeing zero possibility of a stale-workspace
  component tree surviving the switch. Lands on `/platform/dashboard` (Platform) /
  `/simulator/dashboard` (Simulator) — a route guaranteed valid in any workspace, not wherever the
  user happened to be.
- [x] Empty-state handling (PRD open decision 7): `WorkspaceSwitcher` renders a compact "Create or
  join a workspace" prompt (linking to `/onboarding/organisation-setup`) in place of the switcher
  when `getAccessibleWorkspaces()` returns zero rows — not an error page, not a broken dropdown.
- [x] Renders `null` entirely for a 1-workspace user (zero switcher friction for the common case,
  matches task D's regression test) and only becomes visible once 2+ workspaces exist.
- [x] Theme-aware (every class has a `dark:` pair, inherited via props from `SystemHeader.jsx`'s
  own theme prop system) and mobile-responsive (`max-w-[90vw]` dropdown, `max-w-[10rem]
  sm:max-w-[14rem]` truncating button label, `hidden sm:flex` on the empty-state prompt to avoid
  crowding the smallest viewports).

### D. Tests
- [x] **Zero-stale-cache-leakage test** (`setActiveWorkspace` describe block, "the single most
  important assertion in this phase") — proves: (a) the in-session account cache is overwritten
  to the NEW workspace's id, with an explicit assertion that the OLD workspace A's id is no longer
  present; (b) `clearSidebarCache(authUserId)` is called exactly once; (c) a `resolveAccountId
  ForAuthUser` call made immediately after switching returns the NEW workspace — never the old
  one — without hitting the database again (proving the cache overwrite, not just a clear, is
  what makes the transition immediate and correct).
- [x] **Single-org regression test** — a user with `last_active_account_id` NULL resolves via the
  exact same owner-table lookup as before v995, landing on the identical account; a session-cache
  hit still short-circuits with zero DB calls, exactly as pre-v995.
- [x] **Multi-org test** (`getAccessibleWorkspaces`) — confirms all 3 rows of a mocked multi-org
  `get_user_accounts()` result surface, in order, not just the first — the literal fix for the
  "structurally single-account today" gap the plan's own facts section named.

### E. Verification
- [x] `npx vitest run` clean, both apps — see review section.
- [ ] Manual walkthrough with a real multi-org test account, dark + light mode, mobile viewport.
  **Not performed** — no dev server/browser session this session, same class of gap as every
  prior phase's manual-verification step. Recommend before treating this phase as fully verified.
- [x] REVIEW.md applicable checks — see review section.

## Review section

Phase 4 is implemented. Summary below; see the inline `[x]` notes above for task-by-task detail.

### Decisions accepted by default per user authorization

Both flagged decisions were accepted on the plan's own recommendation, per the coordinator's
explicit instruction — noted here for the record, not re-litigated:
1. Active-workspace selection lives in `users.last_active_account_id` (DB column, not
   sessionStorage-only) — persists across devices/sessions.
2. The switcher visually distinguishes owned orgs from invited/member orgs (owned shown first,
   in their own section, with a crown icon).

No genuinely new product/security decision was hit beyond these two — this phase's scope matched
the plan's own investigation closely, unlike Phase 3's unanticipated `account_id`-column gap.

### The stale-cache mechanism, explained (why this design closes the exact bug class named)

The sidebar cache key (`menuCacheUtils.js`) is `nidus_sidebar_v7_${authUserId}_${layoutScope}` —
partitioned by auth user id and layout scope, but **not by account_id**. Before this phase, an
auth user switching which account they're resolved into (not yet possible, since no switcher
existed) would have kept hitting the SAME cache key, meaning a still-"fresh" (<10 min TTL) entry
from the old workspace would be served as-is with no re-fetch — the exact stale-while-revalidate
failure mode already confirmed to have bitten this codebase for ordinary role changes. This phase
closes it two ways, not one: (a) `setActiveWorkspace()` explicitly calls `clearSidebarCache
(authUserId)` for every layout scope, synchronously, before any UI reacts to the switch; (b) the
switcher then forces a full browser reload rather than a soft re-render, which independently
guarantees a clean slate regardless of any other, not-yet-discovered cache this codebase might
have kicking around. Belt and suspenders, deliberately — a single mechanism failing silently was
judged not acceptable given this phase's explicit rigor requirement.

### Files created

SQL (run this one file — no dependency on anything else):
1. `SQL/v995_active_workspace_selection.sql` — `ALTER TABLE public.users ADD COLUMN
   last_active_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL` + comment +
   index. Standalone, no FK dependency on any other new file this phase (or a prior phase).

Platform app:
- `apps/platform/src/components/headers/WorkspaceSwitcher.jsx`

Simulator app:
- `apps/simulator/src/components/headers/WorkspaceSwitcher.jsx` (route-adjusted: default
  `landingRoute` is `/simulator/dashboard` instead of `/platform/dashboard`, otherwise identical)

### Files changed

- `packages/shared/src/utils/accountResolution.js`, `apps/platform/src/utils/accountResolution.js`,
  `apps/simulator/src/utils/accountResolution.js` (all three kept in sync, confirmed byte-identical
  pre-edit) — added `getAccessibleWorkspaces()`, `setActiveWorkspace()`; modified
  `resolveAccountIdForAuthUser()` to check `last_active_account_id` first.
- `apps/platform/src/components/headers/SystemHeader.jsx`, `apps/simulator/src/components/headers/
  SystemHeader.jsx` (confirmed byte-identical pre-edit) — mounted `<WorkspaceSwitcher />` next to
  the existing roles-menu/profile-menu dropdowns.
- `apps/platform/src/utils/__tests__/accountResolution.test.js`, `apps/simulator/src/utils/
  __tests__/accountResolution.test.js` (confirmed byte-identical pre-edit) — extended with the
  Phase 4 test blocks described in task D (9 new tests each).

### Test results

New tests: 9 assertions added to the existing `accountResolution.test.js` in **both** apps (not
new files — file count unchanged, test count +9 each) — all passing, verified with a targeted run
before the full-suite run.

Full-suite `npx vitest run`:
- Platform: 221 files / 1478 tests passed, 61 files / 182 tests failed.
- Simulator: 221 files / 1397 tests passed, 62 files / 101 tests failed.

**Exact match to Phase 3's own recorded baseline** (Platform: 61 failed files/182 failed tests;
Simulator: 62 failed files/101 failed tests — unchanged across every phase this session) — both
apps' passing test counts increased by exactly +9 (this phase's own new tests added to an existing
file), file counts unchanged (no new test files this phase). Nothing this phase touched appears in
either app's failing-file list.

### Manual verification not performed

No dev server, browser session, or live database was used this session. Recommend a manual pass
with a real multi-org test account before treating this phase as fully verified: create/borrow a
user who owns one account and is a member of another, confirm the switcher lists both correctly
sectioned, switch between them and confirm the sidebar/dashboard/entitlements immediately reflect
the new workspace with nothing from the old one visible, and confirm a single-org user never sees
the switcher at all. Also worth confirming in-browser: the zero-workspace "Create or join a
workspace" prompt actually renders for a user manually stripped of all account access.

### Nothing else flagged as needing a product/security decision

Both decision points were pre-resolved by the coordinator's authorization. No further ambiguity
was hit during implementation — `get_user_accounts()` already had everything needed, and the
sidebar cache's existing key shape (not partitioned by account_id) was already fully understood
from this session's own prior sidebar-cache work, so no new investigation surprises arose here the
way Phase 3's missing `account_id` column did.
