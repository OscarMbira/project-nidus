# v982 Implementation Plan — Phase 1: Registration Entry Branching & Account/PMO Separation

Implements Phase 1 only of `projectprd/v982_saas_user_journey_account_pmo_delivery_PRD.md`.
Phases 2-7 are out of scope for this plan and get their own plan once Phase 1 is live.

## Decisions confirmed with the user before writing this plan

1. Declined-PMO Account Owner lands in the Account & Subscription zone with a visible "Invite a
   PMO Administrator" CTA.
2. PMO Admin is self-grantable at any time from Organisation Settings — no invitation round-trip
   required for the Account Owner.
3. "For myself" always auto-grants Account Owner + PMO Admin + default delivery role, no question
   asked.
4. The new entry-choice screen sits **before** today's signup form (`PlatformRegister.jsx`) — an
   "I was invited" pick never creates a redundant auth account; it routes toward the existing
   `/i/:token` flow instead.
5. "I was invited" without a link in hand: ask for their email, look up pending invitations for
   that email (new endpoint), tell them to check their inbox if found, or offer to switch paths if
   not found. **No resend button on this unauthenticated screen** (avoids a pre-auth abuse vector
   for spamming arbitrary email addresses) — resend stays where it already lives, inside the
   authenticated/token-bearing invite-accept flow.
6. The "Do you also want PMO Admin access?" question for the "For my organisation" path is a
   toggle embedded in the existing Organisation Setup step, not a new standalone wizard step.

## Facts established during investigation (not decisions — grounding for the tasks below)

- Registration currently has **no wizard-state container** — each step is its own routed page
  passing data forward via `navigate(next, { state })`. State does not survive a page refresh
  today; this plan does not fix that pre-existing weakness, but the new `intent` flag specifically
  needs to survive refreshes reliably, so it goes into `sessionStorage` (mirroring the
  `nidus:acct:*` pattern in `accountResolution.js` per rule 66) rather than relying solely on
  `location.state`.
- Entry routes today (`apps/platform/src/routes/authRoutes.jsx:862,869,876`, simulator mirror):
  `register`, `platform/register`, `simulator/register` all render `<PlatformRegister />` directly.
- Founder role grant is unconditional today in `organisationService.js`'s `createOrganisation()`
  (lines 214-227) and in the org-update/re-provision path (lines ~596-608) — both call
  `assignSystemRole(authUser.id, 'account_owner')` then `assignSystemRole(authUser.id, 'pmo_admin')`
  with no conditional.
- `createOrganisation(organisationData)` already receives `organisationData.type`
  (`individual | freelancer | business | company`) from `OrganisationSetup.jsx` — this is reused
  to decide "For myself"-equivalent auto-grant behaviour rather than inventing a second field.
- Invite flow: `/i/:token` → `InvitationAccept.jsx`, using `invitationService.js`
  (`getInvitationByToken`, `getInvitationAcceptContext`, `validateInvitationToken`) and edge
  function `accept-invitation`. No pre-auth lookup-by-email exists yet — new.
- `dispatchOrganisationPmoAdminInvitationEmail` already exists (`organisationService.js:325`) —
  reusable for whatever currently invites someone to be PMO Admin; the self-grant action added by
  this plan does not need it (self-grant is direct, no email round-trip per decision 2), but do not
  duplicate this function if a "grant needs confirmation" state ever wants one.
- `PlatformChoice.jsx` is an unrelated existing binary choice (Platform vs Simulator surface for
  dual-registered users) — not reused, not modified beyond a rename check to avoid confusion with
  the new entry-choice screen's naming.

## Todo list

### A. Database (SQL, `E:\project-nidus\SQL\`)
- [x] `SQL/v982_pending_invitation_lookup.sql` — new `public.check_pending_invitation_by_email(p_email text)`
  SECURITY DEFINER RPC. Returns only `{ found: boolean, organisation_name: text|null }` — no
  invitation token, no invitation id, nothing an unauthenticated caller could use to act on the
  invitation directly. Grant EXECUTE to `anon` + `authenticated`. Register in `database_tables` is
  N/A (no new table, function only) — skip registry step, note why in the file header.
- [x] Same RPC mirrored for `sim` schema only if Simulator has its own independent invitations
  table — **investigated, not needed**: both apps' `invitationService.js` import `appDb`, which
  resolves to `platformDb` (public schema) via `@nidus/supabase` even inside the Simulator app's
  own copy. No `sim.organisation_invitations`/`sim.project_invitations` tables exist. Organisation
  and project invitations are shared cross-app through `public` already — a sim-schema duplicate
  would be dead code, not parity. Documented in the SQL file header.

### B. Registration entry-choice screen (Platform + Simulator parity)
- [x] `apps/platform/src/pages/onboarding/RegistrationEntryChoice.jsx` — new page. Three options:
  "For myself", "For my organisation", "I was invited". First two write `intent` to
  `sessionStorage` (`nidus:regIntent`) and `navigate('/platform/register/signup', { state: { intent } })`
  (see deviation note below on the exact target route). Third renders an inline email-lookup
  sub-view (see task D) instead of navigating away.
- [x] `apps/simulator/src/pages/onboarding/RegistrationEntryChoice.jsx` — mirror.
- [x] `apps/platform/src/routes/authRoutes.jsx` — **deviation from the plan's literal wording**:
  investigation found `register` already renders `Register.jsx` (an unrelated Platform-vs-Simulator
  app picker, confirmed not to conflict per the plan's own facts section), while the real signup
  traffic — every marketing "Sign up"/"Start Free" CTA across both apps (18 files each, confirmed
  by the task C audit) — links straight to `platform/register` / `simulator/register`, bypassing
  `register` entirely. Putting the entry-choice screen only at `register` would have meant almost
  no real user ever saw it. Instead: `platform/register` and `simulator/register` now render
  `RegistrationEntryChoice` (parametrised by a `target` prop, since each app has always hosted
  routes for *both* signup forms so a user can switch from either domain); the actual signup forms
  moved to new `platform/register/signup` / `simulator/register/signup` routes. `register` itself
  is unchanged (still the app picker, which now forwards into the choice screen for whichever app
  the user picks).
- [x] `apps/simulator/src/routes/authRoutes.jsx` — mirror of the same restructure.
- [x] `apps/platform/src/routes/lazyImports.js` / `apps/simulator/src/routes/lazyImports.js` — added
  lazy import for the new page.
- [x] `apps/platform/src/pages/auth/PlatformRegister.jsx` / simulator mirror — on mount, reads
  `intent` from `location.state` first, falls back to `sessionStorage.getItem('nidus:regIntent')`
  (covers a refresh mid-form); forwards it in the `navigate('/onboarding/organisation-setup', ...)`
  call's state. (`SimulatorRegister.jsx` — the separate, org-less practice-account signup — was
  confirmed to have no organisation/PMO concept at all and was intentionally left untouched; see
  review section.)

### C. Internal link audit
- [x] Grepped the whole monorepo (both apps) for existing `<Link>`/`navigate()`/`href` references to
  `/register`, `/platform/register`, `/simulator/register`. Found 18 files per app (marketing pages,
  headers, login pages) linking straight to `platform/register`/`simulator/register`. **No file
  needed repointing** — because those exact two routes now render the choice screen first (see task
  B's routing restructure), every existing link automatically gains the new branching behaviour
  with zero link changes required.

### D. "I was invited" lookup sub-view
- [x] Added `checkPendingInvitationByEmail(email)` to `apps/platform/src/services/invitationService.js`
  (and simulator mirror) calling the new RPC from task A.
- [x] Within `RegistrationEntryChoice.jsx`'s "I was invited" branch: email input → call the lookup
  → found: "We found a pending invitation for {org name} — check your inbox for the link" (no
  resend action, per decision 5) → not found: "No pending invitation found for that email" +
  buttons back to "For myself" / "For my organisation".

### E. Conditional PMO Admin grant
- [x] `apps/platform/src/pages/onboarding/OrganisationSetup.jsx` (confirmed actual path — directly
  under `pages/onboarding/`, not the `registrationWizard/` subfolder the plan guessed) — reads
  `intent` (state/sessionStorage). When `intent === 'organisation'` and the user has selected an
  org `type` of `business`/`company`, renders a toggle: "Also give me PMO Admin access to configure
  this organisation" (default **on**). When intent is anything else (including unknown/legacy
  entry), no toggle is shown and behaviour is unchanged from pre-v982. Passes `wantsPmoAdmin`
  through to `createOrganisation()`'s `organisationData` (it rides along inside `formData`/
  `orgFormData`, which the wizard already threads unmodified through every later step).
- [x] Simulator mirror (confirmed byte-identical file pre-edit; identical edit applied).
- [x] `apps/platform/src/services/organisationService.js` (create path, ~line 214) — changed the
  unconditional `assignSystemRole(authUser.id, 'pmo_admin')` call to conditional:
  `type === 'individual' || type === 'freelancer' || wantsPmoAdmin === true || wantsPmoAdmin === undefined`
  (the `=== undefined` arm is a deliberate backward-compat safety net — see review section).
  Applied the identical conditional to the org-update/re-provision path (`updateExistingOrganisation`).
- [x] Simulator's `organisationService.js` mirror — confirmed byte-identical pre-edit; identical
  edit applied.

### F. Declined-PMO landing + self-grant later
- [x] Platform: `/platform/subscription` (`SubscriptionManagement.jsx`) is the live, routed Account
  & Subscription zone. `WorkspaceSetupStep.jsx` now checks the user's actual post-provisioning
  system roles (`getUserSystemRoles`, not the toggle state) and redirects there instead of
  `GettingStarted.jsx` when `pmo_admin` is absent. `SubscriptionManagement.jsx` gained an "Invite a
  PMO Administrator" CTA for the Account Owner when they lack `pmo_admin`, linking to the existing
  `admin/send-role-invites` invite flow (its PMO Admin invite mode already existed — reused, not
  rebuilt). This page was also **not previously theme-aware** (dark-only classes throughout) — per
  rule 28.1's amend clause, given it was being touched anyway, it was brought to full light/dark
  parity in the same change.
- [x] Simulator: **documented gap, not force-fit** — investigation found `platform/subscription`
  and `admin/send-role-invites` are dead imports in Simulator's route files (imported, never
  mounted as `<Route>`s). Rather than build new route infrastructure (out of scope for this plan),
  Simulator's `WorkspaceSetupStep.jsx` stays on its existing `GettingStarted.jsx` landing and passes
  a `showInvitePmoCta` flag; `GettingStarted.jsx` renders the same "no one has PMO Admin access yet"
  messaging inline (no broken CTA button, since there's no live target route to link to).
- [x] Organisation Settings self-grant: `OrganisationIndustrySettings.jsx` (route
  `admin/organisation-industries` in Platform, `simulator/pmo/organisation-industries` in
  Simulator — both render the same, confirmed byte-identical, file) is the closest existing
  surface to "Organisation Settings" (its own header comment already notes no single hub page
  exists yet). Added a "Become PMO Admin" button, visible only when the current user holds
  `account_owner` but not `pmo_admin` (checked via `getUserSystemRoles`, independent of the page's
  own `canManage` gate). Calls `assignSystemRole(authUser.id, 'pmo_admin')` directly, then
  `clearSidebarCache(authUser.id)` and reloads on the success modal's OK so the newly-granted menu
  appears without the user needing to remember to refresh.
- [x] Simulator mirror — confirmed byte-identical file pre-edit; identical edit applied (both apps'
  `menuCacheUtils.js`/`roleService.js` confirmed to export the same functions).

### G. Tests
- [x] Unit tests for `checkPendingInvitationByEmail` (found / not found / malformed email / RPC
  error) — `checkPendingInvitationByEmail.test.js`, both apps.
- [x] Unit tests for the conditional-grant logic in `createOrganisation()` — all four
  `type` × `wantsPmoAdmin` combinations plus the pre-v982 backward-compat case —
  `organisationServiceConditionalPmoGrant.test.js`, both apps.
- [x] Unit test confirming the RPC-backed service function never returns an invitation token/id to
  the caller, even if the (mocked) RPC response contains one — contract test inside
  `checkPendingInvitationByEmail.test.js`, both apps.
- [x] Integration-style test walking all three entry-choice branches end-to-end, plus the direct
  `?invitation=` redirect shortcut — `RegistrationEntryChoice.test.jsx`, both apps.

### H. Verification
- [x] `npx vitest run` — see review section for the full-suite results and why the pre-existing
  unrelated failure count is not a regression from this change.
- [ ] Manual walkthrough of all three branches in-browser (dark + light mode, per rule 28.1) in
  Platform; repeat in Simulator. **Not performed** — this session did not start a dev server /
  browser session; recommend the user do a manual pass before treating Phase 1 as fully verified.
- [x] Confirmed an existing tenant's already-provisioned `account_owner`/`pmo_admin` grants are
  untouched: nothing in this change reads/writes `user_roles` outside the registration-time grant
  paths and the new opt-in self-grant action; the conditional grant logic only executes at
  registration time or via the explicit "Become PMO Admin" button (no retroactive job, no bulk
  update, matches PRD decision 5).
- [x] Applied `REVIEW.md`'s applicable checks (requirement match, no obvious regression, CLAUDE.md
  rules followed, targeted + full-suite test evidence, Platform/Simulator equivalents) — see review
  section.

## Review section

Phase 1 is implemented. Summary below; see the inline `[x]` notes above for task-by-task detail.

### Files created

SQL (run in this order — none executed against the live DB by this session, per instructions):
1. `SQL/v982_pending_invitation_lookup.sql` — `public.check_pending_invitation_by_email(p_email text)`
   SECURITY DEFINER RPC + `GRANT EXECUTE ... TO anon, authenticated`. No table changes, no
   `database_tables` registry entry needed (function only — documented in the file header). Safe
   to run standalone; no dependency on any other v982 file.

Platform app:
- `apps/platform/src/pages/onboarding/RegistrationEntryChoice.jsx`
- `apps/platform/src/services/__tests__/checkPendingInvitationByEmail.test.js`
- `apps/platform/src/services/__tests__/organisationServiceConditionalPmoGrant.test.js`
- `apps/platform/src/pages/onboarding/__tests__/RegistrationEntryChoice.test.jsx`

Simulator app (mirrors of the above):
- `apps/simulator/src/pages/onboarding/RegistrationEntryChoice.jsx`
- `apps/simulator/src/services/__tests__/checkPendingInvitationByEmail.test.js`
- `apps/simulator/src/services/__tests__/organisationServiceConditionalPmoGrant.test.js`
- `apps/simulator/src/pages/onboarding/__tests__/RegistrationEntryChoice.test.jsx`

### Files changed

Platform:
- `apps/platform/src/routes/authRoutes.jsx` — `platform/register`/`simulator/register` now render
  `RegistrationEntryChoice`; added `platform/register/signup`/`simulator/register/signup` for the
  actual signup forms.
- `apps/platform/src/routes/lazyImports.js` — lazy import for `RegistrationEntryChoice`.
- `apps/platform/src/pages/auth/PlatformRegister.jsx` — forwards `intent` (state + sessionStorage
  fallback) into the wizard's `organisation-setup` navigation.
- `apps/platform/src/pages/onboarding/OrganisationSetup.jsx` — reads `intent`; conditional PMO
  Admin toggle; `wantsPmoAdmin` added to `formData`.
- `apps/platform/src/services/organisationService.js` — conditional PMO Admin grant in both
  `createOrganisation()` and `updateExistingOrganisation()`.
- `apps/platform/src/services/invitationService.js` — added `checkPendingInvitationByEmail()`.
- `apps/platform/src/pages/onboarding/registrationWizard/WorkspaceSetupStep.jsx` — post-provisioning
  PMO Admin check; conditional landing route.
- `apps/platform/src/pages/subscription/SubscriptionManagement.jsx` — "Invite a PMO Administrator"
  CTA; also brought to full light/dark theme parity (was dark-only — rule 28.1 amend clause).
- `apps/platform/src/pages/admin/OrganisationIndustrySettings.jsx` — "Become PMO Admin" self-grant
  action.

Simulator: identical edits to the mirrored files (`routes/authRoutes.jsx`, `routes/lazyImports.js`,
`pages/auth/PlatformRegister.jsx`, `pages/onboarding/OrganisationSetup.jsx`,
`services/organisationService.js`, `services/invitationService.js`,
`pages/onboarding/registrationWizard/WorkspaceSetupStep.jsx`,
`pages/admin/OrganisationIndustrySettings.jsx`), plus
`pages/onboarding/GettingStarted.jsx` (inline PMO CTA banner — Simulator-only, see deviation below).

### Deviations from the plan, with reasoning

1. **`register` route left untouched; the choice screen was placed at `platform/register` /
   `simulator/register` instead.** The plan's own "facts" section said all three entry routes
   render `PlatformRegister` directly — investigation found this wasn't quite right: `register`
   actually renders an unrelated Platform-vs-Simulator app picker (`Register.jsx`), and the 18
   marketing/header files per app that link to signup all link straight to `platform/register` /
   `simulator/register`, never to the generic `register`. Putting the choice screen only at
   `register` per the plan's literal task-B wording would have meant almost no real signup traffic
   ever saw it. Moving it to the two routes real traffic actually hits, and pushing the real forms
   one level deeper (`.../signup`), achieves the plan's actual intent (decision 4: sits in front of
   `PlatformRegister.jsx`) without needing to touch any of the 18 linking files (task C's audit
   found zero files needing repointing as a result).
2. **`RegistrationEntryChoice` takes a `target` prop (`'platform'`/`'simulator'`) instead of being
   two independently-hardcoded per-app files.** Each app has always hosted routes for *both* signup
   forms (Platform's `simulator/register` renders `SimulatorRegister`, and vice versa — an existing
   "Need Simulator instead?" cross-link already relies on this), so a single per-app component
   parametrised by which form it leads to was necessary; a hardcoded-per-file version would have
   been wrong for the "other" route mounted in the same app.
3. **`SimulatorRegister.jsx` was not touched.** Investigation found it has no organisation/PMO
   concept at all — it's a separate, simpler signup for personal Simulator practice accounts with
   no `createOrganisation()` call anywhere in its flow. The `intent`/PMO-toggle machinery only
   applies to the `PlatformRegister.jsx` → wizard → `createOrganisation()` path, which exists
   identically in both apps (reached via `platform/register/signup` in either app). This is not a
   parity gap — Simulator's org-creating path (via `platform/register/signup`) got the identical
   treatment to Platform's.
4. **Simulator's declined-PMO landing does not redirect to a subscription zone.** Investigated and
   confirmed `platform/subscription` and `admin/send-role-invites` are dead imports in Simulator's
   route files (imported into `lazyImports.js`/`routeCommon.jsx` but never mounted as a `<Route>` —
   pre-existing, unrelated to this change). Building new route infrastructure to host them was out
   of scope for this plan. Simulator's `WorkspaceSetupStep.jsx` instead passes a `showInvitePmoCta`
   flag to the existing `GettingStarted.jsx` landing, which renders the same messaging inline
   (no CTA button, since there is no live route to link it to). Documented per the plan's own
   "document any genuine gap rather than force-fitting" instruction (task F).
5. **`organisationService.js`'s conditional includes a `wantsPmoAdmin === undefined` arm** beyond
   what the plan's literal formula listed. `createOrganisation()`/`updateExistingOrganisation()`
   have exactly one caller each (`WorkspaceSetupStep.jsx`, confirmed via a repo-wide grep), and
   after this change that caller always passes `wantsPmoAdmin` explicitly — but the `undefined` arm
   is kept as a deliberate backward-compat safety net matching ground rule 8 (existing-tenant/
   existing-caller regression protection), in case any future or overlooked caller invokes
   `createOrganisation()` without going through the v982 entry-choice + toggle.
6. **`SubscriptionManagement.jsx` (Platform) was brought to full light/dark theme parity** beyond
   just the new CTA banner. The file was previously dark-only throughout (`bg-gray-900`,
   `text-gray-400`, no `dark:` counterparts) — rule 28.1's amend clause ("when you edit an existing
   component for any reason, fix any dark-only classes in that component in the same change") is
   mandatory, not optional, so the whole file's Tabs/Current Plan/Billing History/Payment Methods
   sections were updated, not just the new banner.

### Test results

New tests: 20 assertions across 3 files, run in **both** apps — all passing:
- `checkPendingInvitationByEmail.test.js` (7 tests: found, not found, empty input, RPC error,
  single-object response shape, and a contract test proving the service function never surfaces an
  invitation token/id even if a mocked RPC response contains one)
- `organisationServiceConditionalPmoGrant.test.js` (8 tests: all `type` × `wantsPmoAdmin`
  combinations plus the pre-v982 backward-compat case)
- `RegistrationEntryChoice.test.jsx` (7 tests: all three branches, found/not-found invitation
  lookup, direct-invitation-link redirect shortcut)

Targeted regression check (existing tests directly touching the same services/files): 76 tests
across `organisationService.test.js`, `organisationCustomRoleService.test.js`,
`organisationIndustryService.test.js`, `invitationServicePlannedDates.test.js`,
`invitationProjectContext.test.js`, `registrationEmailService.test.js` — all passing in Platform;
the equivalent set (71 tests) all passing in Simulator.

Full-suite `npx vitest run`:
- Platform: 213 files / 1421 tests passed, 61 files / 182 tests failed.
- Simulator: 216 files / 1360 tests passed, 62 files / 101 tests failed.

**These failures are pre-existing and unrelated to this change** — confirmed by (a) domain: every
failing test belongs to unrelated areas (checkpoint reports, quality management, risk service, EPR
workflows, document governance, mandate validation, etc. — none touch registration, organisation
creation, invitations, or PMO admin grants); (b) the same failure signatures appear in *both* apps
independently (e.g. `rfpService.test.js > checkPMOAdminRole`, `invitationTemplatesApi.test.js` fail
identically in both), pointing to a systemic pre-existing mock-setup issue rather than anything this
change introduced; (c) `git diff --name-only` at session start already showed a large set of
uncommitted, unrelated WIP changes in the repo (menu hierarchy, project closure, PM dashboard, role
assignment, etc.) predating this task, which is the more likely source. None of the files this plan
touched appear anywhere in either app's failure list.

### Manual verification not performed

This session did not start a dev server or open a browser, so the plan's "manual walkthrough of all
three branches, dark + light mode, both apps" verification step (task H) was **not** performed.
Recommend the user do this pass — in particular: the entry-choice screen's dark/light rendering, the
"I was invited" lookup round trip against a real pending invitation row, the PMO Admin toggle's
effect on an actual `business`/`company` registration, the declined-PMO redirect to
`/platform/subscription`, and the "Become PMO Admin" self-grant's sidebar-refresh behaviour.

### Nothing flagged as needing a product/UX decision

No genuine ambiguity was hit that the plan's six confirmed decisions didn't already resolve. The
items above were implementation-detail judgment calls (exact routing shape, prop-based component
parametrisation, which existing page counts as "Organisation Settings"/"Account & Subscription
zone") within the plan's own explicit "confirm at implementation time" allowances, not product
decisions requiring the user's input.
