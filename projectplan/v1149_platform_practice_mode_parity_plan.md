# v1149 — Platform Practice-Mode Parity (Audit tabs, row actions, Teams feature, routing)

## Background

While verifying the v1148 back-button remediation, a subagent noted that
`apps/platform/src/pages/simulator/Practice*.jsx` (Platform app's own in-app practice-mode
pages) had drifted behind their true counterparts at
`apps/simulator/src/pages/simulator/Practice*.jsx`. The user asked to fix this, plus two
infra issues the same verification pass surfaced (a stale ESLint config, ~30 dead `Link`
imports), as a continuation of the same working session.

## Scope delivered

1. **ESLint config fix** — `eslint.config.js` at repo root still used pre-v730 monolith
   paths (`src/pages/...`) that never matched the post-v730 monorepo layout
   (`apps/platform/src/...`, `apps/simulator/src/...`). `npm run lint` in either app was
   silently falling back to bare `js.configs.recommended` with no JSX parsing — producing
   ~4000 false "Unexpected token <" errors and providing zero real coverage. Fixed the
   `files`/`ignores` globs to match the actual monorepo paths; verified working (ESLint now
   correctly parses JSX and surfaces real `react-hooks` rule violations instead of parse
   noise).
2. **Dead `Link` import cleanup** — 32 files (16 pairs × 2 apps) left over from the v1148
   back-button conversions had an unused `Link` import from `react-router-dom` after their
   only `<Link>` usage was converted to a `navigate(-1)` button. Removed.
3. **Practice* Audit-tab / row-action port (rules 61, 63.1)** — investigation found 125
   Platform↔Simulator `Practice*.jsx` pairs: 72 identical, 48 where Simulator had an
   Audit-details tab and/or icon-only `RowActionButton` row actions that Platform's copy
   lacked, 5 "other" (see below). Ported the missing Audit tab / row actions into Platform's
   copy for 45 of the 48 files (3 deliberately skipped — see Known gaps).
4. **Stakeholder photo feature parity** — Platform's 4 Practice-mode stakeholder pages
   (`PracticeStakeholders.jsx`, `PracticeStakeholderCreatePage.jsx`,
   `PracticeStakeholderAnalysis.jsx`, `PracticeStakeholderRegisterPage.jsx`) were wired up to
   the already-existing, already-shared `StakeholderAvatar`/`StakeholderPhotoField`
   components and `packages/shared/src/services/stakeholderPhotoService.js` (built on the
   proven v894 upload pattern) — not a new feature, just finishing a wiring job Simulator's
   equivalents already had done.
5. **Teams feature port** — Platform's Practice-mode Teams page was a bare 2.4KB roster list;
   Platform's own REAL app already has the full feature at
   `apps/platform/src/pages/platform-app/Teams.jsx` (Skill Matrix / Capacity Planning / Leave
   Calendar, 1378 lines) plus a functional-role-library flow, and Simulator's Practice-mode
   mirror was already complete. Ported Simulator's practice-mode version into Platform:
   - New pages: `PracticeTeamCreate.jsx`, `PracticeProjectFunctionalRolesPage.jsx`,
     `PracticeProjectFunctionalRoleFromLibrary.jsx` (plus `PracticeTeams.jsx` expanded from
     stub to full 4-tab page).
   - New services (ported verbatim from Simulator's `services/sim/` equivalents):
     `simTeamSkillsService.js`, `simTeamCapacityService.js`, `simTeamLeaveService.js`,
     `projectRoleLibraryService.js`, `simProjectIndustryService.js` under
     `apps/platform/src/services/sim/`.
   - Confirmed architecture: Platform's practice-mode subsystem already uses `simDb`
     directly against the `sim` schema (same as Simulator) — this is the existing, working
     pattern for every other Practice entity, not a new design choice.
6. **Major routing gap discovered and fixed** — while porting Teams, found that essentially
   **none** of Platform's ~150 `Practice*.jsx`/`Sim*.jsx` pages were ever registered as
   `<Route>` elements in `platformRoutes.jsx`, despite being correctly imported via
   `lazyImports.js`/`routeCommon.jsx`. They were dead, unreachable code — which also explains
   why they'd drifted behind Simulator's maintained copies (nobody could hit them to notice).
   Registered **132 new routes** mirroring Simulator's exact path strings, inside the same
   `requiredPlatform="simulator"` + `<Layout>` wrapper block already used for the 4
   Teams-family routes added moments earlier. Verified zero duplicate paths and a clean
   `esbuild` compile.
7. **Three stray pre-existing bugs fixed** (unrelated to anything built this session, found
   as a byproduct):
   - Missing `RowNumberBadge` import in `PracticeStakeholders.jsx` (both apps) — would have
     thrown `ReferenceError` on grid-view render.
   - Undeclared `index` param in `PracticeStakeholderAnalysis.jsx`'s `.map()` callback (both
     apps) — same failure class as a similar bug caught during the v1148 verification pass.
   - `SimMyTeam.jsx` ("my-team") page — confirmed it already existed in Platform (no copy
     needed); the new route registration (item 6) makes it reachable.

## Known gaps / deliberately out of scope

- **3 of the 48 Audit-tab/row-action pairs were skipped**, not ported, because they turned
  out to have genuinely unrelated feature differences beyond the audit tab — forcing a merge
  would have been guesswork, not a mechanical port:
  - `PracticeProjectCreate.jsx` / `PracticeProjectDetail.jsx` — Simulator's copies include an
    unrelated v1106 multi-industry feature (`replacePracticeProjectIndustries`, industry
    checkboxes) Platform's copies entirely lack.
  - `PracticeWorkPackageEdit.jsx` — Simulator's copy wires `InheritedWorkPackageFields` +
    `TierFieldCustomisationPanel`, also absent from Platform's copy.
- **2 components could not be routed** in the routing fix: `PracticeChangeManagement` and
  `PracticeChangeRequestDetail` are routed in Simulator (`simulator/practice-change-requests`)
  but were never even imported in Platform's `lazyImports.js` — a page-file-level gap, not
  just a routing gap. No Platform page exists for these at all.
- **2 components skipped as unroutable-in-source**: `PracticeStakeholders.jsx` and
  `PracticeStakeholderSEAM.jsx` exist as files in Platform but Simulator itself never routes
  either as a real `<Route>` (Simulator's own bare `practice-stakeholders` path is just a
  redirect to `.../register`) — no ground-truth path existed to copy, so left unrouted rather
  than guessed.
- **The Platform-vs-Simulator `Practice*.jsx` drift pattern itself** (noted in v1148's review)
  is now understood to be a direct consequence of the routing gap in item 6, not a separate
  maintenance failure — now that the pages are reachable, future drift should surface faster
  through normal use.
- The "5 other difference" files from the original investigation were explicitly NOT
  addressed by this plan (confirmed separate scope, needing their own PRD if pursued):
  `PracticeTeams.jsx`'s own larger scope gap is resolved by item 5 above, but the 4
  stakeholder-photo-adjacent files with *additional* unrelated differences beyond photos were
  not re-investigated here.

## Review

All items executed via parallel background subagents in one continuous session, per the
user's standing preference established during the v1148 work (do the full scope, don't pause
to check in at each step) — confirmed explicitly for each major decision point via
AskUserQuestion before starting (process choice for the Teams/photo work; go-ahead for the
routing fix and stray-bug fixes).

**Verification performed:** ESLint config fix manually tested against a known file;
`esbuild --jsx=automatic` syntax-checked the full routing change; each porting/fix agent was
instructed to verify its own diff assumptions before editing (several correctly skipped files
with unexpected additional differences rather than forcing a merge) and to sanity-check
balanced JSX after editing. No end-to-end browser/runtime testing was performed in this
session — recommend the user manually smoke-test a few of the newly-reachable
`/simulator/practice-*` routes in Platform (e.g. `/simulator/practice-teams`,
`/simulator/practice-risk-register`) before relying on them.

**Outstanding follow-ups (not part of this plan, flagged for future scoping):**
1. `PracticeChangeManagement`/`PracticeChangeRequestDetail` — missing entirely from Platform,
   would need a full port (page + route) if Change Management practice-mode parity is wanted.
2. The 3 skipped Audit-tab/row-action files (v1106 multi-industry, work-package tier-field
   inheritance) — separate, larger porting tasks.
3. No new SQL/schema work was needed anywhere in this plan — confirmed all backend tables
   (`sim.*`) already existed; this was purely a frontend/routing remediation.
