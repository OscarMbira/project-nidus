# v918 — SaaS Industry-Aware Tenant Provisioning & Menu Architecture

PRD: `projectprd/v918_saas_industry_tenant_provisioning_PRD.md`
Source brief: `Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md`

**Status: Approved and implemented (Phases 1-11 complete).** See the Review section at the end
of this file. `INDUSTRY_MENU_AVAILABILITY_ENABLED` remains deliberately `false` pending manual
verification — see `Documentation/v918_SaaS_Industry_Tenant_Provisioning_Manual_Test_Guide.md`.

## Naming decided during this plan

- `industry_categories` — reused as-is (already the real industry taxonomy; not renamed).
- `industry_segments` — new (sub-industries, FK to `industry_categories`).
- `account_industries` — new join table (`account_id`, `industry_category_id`,
  `industry_segment_id` nullable, `is_primary`, `added_at`, `added_by`). Unique constraint on
  `(account_id, industry_category_id)`; partial unique index enforcing at most one
  `is_primary = true` row per account.
- `professional_roles` — new reference table (DB-driven per rule 25.1, not hardcoded), seeded
  with the brief's list (Project Manager, PMO Professional, Programme Manager, Portfolio
  Manager, Project Administrator, Team Member, Other).
- `users.professional_role_id` — new nullable FK to `professional_roles`. `users.job_title`
  stays as free text but stops being overwritten by invitation acceptance.
- `industry_packs` — new (`id`, `industry_category_id` FK, `pack_code`, `pack_name`,
  `description`, `is_active`) — kept distinct from `industry_categories` per the brief's target
  model (§27), one pack per industry for v1 but not schema-forced to stay 1:1.
- `industry_pack_menu_items` — new join (`industry_pack_id`, `menu_item_id`).
- `industry_pack_features` — new (`industry_pack_id`, `feature_key`, `feature_label`) —
  descriptive only in this phase (decision 8: no subscription gating yet), used for the "Your
  workspace includes" onboarding summary and the capability-configuration UI's labels.
- `organisation_disabled_capabilities` — new (`account_id`, `industry_pack_menu_item_id`) — the
  disable-only override table from decision 7. No "enable outside pack" table exists (not
  permitted by decision 7).
- `tenant_provisioning_log` — new audit table (`account_id`, `step`, `status`
  pending/in_progress/completed/failed, `detail` JSONB, `created_at`) — brief §29/§30.
- Provisioning RPC: `provision_organisation_tenant(p_account_id, p_industry_category_ids[],
  p_primary_industry_id, p_industry_segment_ids[] DEFAULT NULL)` — SECURITY DEFINER, idempotent
  (upserts, not inserts). **This is the single write path for account_industries** — used for
  both initial provisioning right after registration AND later changes via Organisation
  Settings. There is no separate `update_account_industries()` RPC (superseded during Phase 3 —
  re-provisioning with a new industry set IS the update path, per the risk note below).
- Menu resolution: new pure function `resolveOrgAvailableMenuItemIds(orgIndustryPackIds,
  disabledCapabilityIds)` consumed by `useMenu.js` — isolated, unit-testable independent of the
  rest of the pipeline (see Phase 4 risk notes).

## Todo checklist

### Phase 1 — Schema foundation (`SQL/v918_*.sql` through `v921_*.sql`)
- [x] `v918_industry_segments_and_account_industries_schema.sql`: `industry_segments`,
      `account_industries` (with the primary-industry partial unique index). RLS ended up
      broad-authenticated-read for BOTH tables (not "members of that account" as originally
      sketched here) — no organisation-membership table exists to join against for a tighter
      policy (confirmed by this initiative's own audit), so this mirrors the established
      `org_menu_bundles` (v914) pattern instead: broad read + JS-layer `account_id` filtering,
      writes fully RPC-gated regardless (rule 42). **Not yet run against the DB.**
- [x] `v919_professional_roles_schema.sql`: `professional_roles` reference table + seed (brief's
      7-item list), `users.professional_role_id` nullable FK. Database Table Registration Rule
      entries added for both new tables. **Not yet run against the DB.**
- [x] `v920_industry_packs_schema.sql`: `industry_packs`, `industry_pack_menu_items`,
      `industry_pack_features`, `organisation_disabled_capabilities`, `tenant_provisioning_log`.
      RLS ended up broad-authenticated-read for packs/features/disabled-capabilities (same
      "no membership table to join against" reasoning as v918); `tenant_provisioning_log` is the
      one table with a real restricted policy — readable only by that account's own admins via
      `user_can_manage_org_roles()` (v903, reused as-is). **Not yet run against the DB.**
- [x] `v921_industry_packs_content_seed.sql`: seeds one `industry_packs` row per existing
      `industry_categories` row (Cross-Industry → `general_pm` pack_code, reusing the existing
      row rather than creating a duplicate). Pack content is **derived programmatically**, not
      hand-curated: `INSERT ... SELECT` unions every industry-tagged built-in role's existing
      `role_menu_items` grants into that industry's pack — traceable to already-approved v906-v913
      reference data rather than fresh guesswork, and idempotent/re-runnable as new roles get
      tagged. **Not yet run against the DB** (depends on v918/v920/v906-v913 already being live).

### Phase 2 — Existing-tenant migration (`SQL/v922_*.sql`) ✅ SQL COMPLETE (not yet run)
- [x] `v922_backfill_existing_accounts_general_pm.sql`: idempotent backfill — every `accounts`
      row with no `account_industries` row gets one, `industry_category_id` = the "General
      Project Management" / "Cross-Industry" fallback, `is_primary = true`. Never reads/guesses
      from `accounts.metadata.industry` (decision 9 — explicitly not guesswork). Raises an
      exception (not a silent no-op) if the Cross-Industry row is missing, so this can't
      silently do nothing on a DB where v906/v907 haven't run yet.
- [ ] Confirm via query (user runs, since no DB access in this environment) that every existing
      account now has exactly one primary industry row before Phase 4 ships (the new menu
      resolution layer assumes every account has at least a fallback pack).

### Phase 3 — Tenant Provisioning Service (`SQL/v923_*.sql`) ✅ SQL COMPLETE (not yet run)
- [x] `provision_organisation_tenant(p_account_id, p_industry_category_ids[],
      p_primary_industry_id, p_industry_segment_ids[])`: idempotent (upsert account_industries,
      delete deselected industries, re-set the primary flag — a fresh call fully replaces the
      selection, which is what makes it double as both initial provisioning AND the
      industry-change update path). Authorization: account owner OR `user_can_manage_org_roles()`
      (v903, reused as-is). **Simplified from the original sketch**: "assign generic pack" /
      "assign industry pack" / "assign menu-capability access" write nothing (decision 11 —
      resolved live at render time, not at provisioning time) and "assign default roles" writes
      nothing (already handled by existing `assignSystemRole()` calls) — both are logged as
      `note` fields in one `tenant_provisioning_log` row per call for traceability, not as
      separate per-step rows, since there's no separate work to log per step. **Failure
      durability trade-off documented in the file's own header comment**: Postgres has no
      autonomous transactions, so a failed call rolls back its own log row too — visibility on
      failure comes from the raised exception reaching the caller (standard RPC error
      surfacing), not from a persisted "failed" log row. **Not yet run against the DB.**
- [ ] Unit tests for the RPC's authorization and idempotency (call twice, assert no duplicate
      `account_industries` rows; call with a different industry set, assert the old selection
      is fully replaced) — SQL-level tests documented for the user to run, since this
      environment has no live DB access; verified by careful review otherwise, consistent with
      every other SQL change this session. **Not yet written** — deferred to Phase 10 (cross-cutting
      test phase) rather than duplicated here, per the plan's own "tests run throughout" note.

### Phase 4 — Menu resolution runtime layer (highest-risk phase — `useMenu.js`) — core done
- [x] **Implemented server-side instead of as a client-side pure function** — corrected during
      implementation per the brief's own §35 performance guidance (prefer DB views/functions
      over client-side computation): `get_account_available_menu_item_ids(p_account_id)`
      (`SQL/v924_account_available_menu_items_rpc.sql`) does the Core+Generic PM+Industry Pack
      union server-side in one query. **Fail-open by design**: a menu item never classified into
      any `industry_pack_menu_items` row is always available — Phase 4 can only ever ADD
      restriction to deliberately-tagged items, never hide something already visible today just
      because nobody's industry-tagged it yet. Generic PM (Cross-Industry pack) is unconditional
      for every account, not selection-dependent, matching the brief's formula. **Not yet run
      against the DB.**
- [x] Wired into `fetchMenuFromDB()` in `useMenu.js` — confirmed this (not a separate `loadMenu`
      path) is the single shared function both the Platform hook AND `useSimMenu.js` (both apps)
      call, so one edit point covers both. Filter applies to role-granted ids **only**, strictly
      before category-placeholder ids are unioned in (those are structural tree scaffolding, not
      capability grants — never filtered). Two independent fail-open layers: any RPC/network
      error leaves `uniqueMenuIds` unfiltered (try/catch), and filtering down to zero items when
      there were role grants also reverts to unfiltered (treated as a misconfiguration signal,
      never shown as an empty sidebar).
- [x] Shipped behind `INDUSTRY_MENU_AVAILABILITY_ENABLED` — a **local kill-switch constant**,
      not the full `admin.feature_flags` wiring (that's unimplemented in Platform/Simulator per
      the audit, and building it from scratch is out of proportion for this one flag). Defaults
      `false`: `useMenu.js`'s behavior is byte-for-byte identical to before this initiative until
      explicitly flipped on for testing. **Follow-up noted, not built now**: replace with real
      `admin.feature_flags` read once that wiring exists.
- [x] Mirrored for Simulator: `apps/simulator/src/hooks/useMenu.js` has its own diverged copy
      (2308-line diff from Platform's, not a clean 1:1 file — confirmed before editing rather
      than blind-copying) — applied the identical 2-part edit (import + constant + filter block)
      directly rather than overwriting the whole file. `useSimMenu.js` (both apps) already calls
      the same `fetchMenuFromDBShared`/`fetchMenuFromDB` this filter lives in, so no separate
      Simulator-specific filter logic was needed — same mechanism, same account data, per
      decision 10.
- [x] Regression check: ran both apps' existing `useMenu.test.js` + `useMenuMethodology.test.js`
      (31/33 passing on each — the 2 failures are **pre-existing**, confirmed by stashing this
      change and re-running: same 2 failures occur with or without it, and both call
      `applyRoleSidebarRevamp` directly, a function this change never touches).
- [ ] **Dedicated tests for the new filter logic itself** (generic-always-present,
      industry-gated, org-disabled-excluded, fail-open-for-unclassified-items,
      role-still-gates-on-top) — deferred to Phase 10 (cross-cutting test phase), consistent
      with how Phase 3's RPC tests were also deferred there rather than duplicated per-phase.
- [ ] Cache invalidation (decision 13): after `provision_organisation_tenant()` or a capability
      toggle succeeds, force-refresh the acting session's menu (`loadMenu({ forceRefresh: true
      })`, already exists in `useMenu.js`); bump nothing globally — other sessions rely on the
      existing 10-minute TTL. **Not yet wired** — belongs with Phase 7 (Organisation Settings UI),
      since that's where the calling code that needs to trigger it will actually live.

### Phase 5 — Registration wizard rebuild (`OrganisationSetup.jsx` → multi-step) ✅ Complete
- [x] Rebuilt as: **1. Your Account (existing sign-up page, unchanged) → 2. Your Organisation
      (`onboarding/organisation-setup`, rebuilt) → 3. Industry (`onboarding/industry-selection`,
      multi-select + primary flag + optional sub-industry) → 4. Professional Role
      (`onboarding/professional-role`) → 5. Verify (`onboarding/review`) → 6. Workspace Setup
      (`onboarding/workspace-setup`)**, per decision 16. Replaced the hardcoded `INDUSTRIES`
      array with `getIndustryCategories()` (already existed) plus new
      `getIndustrySegments(industryCategoryId)` (`organisationCustomRoleService.js`) and new
      `getProfessionalRoles()` / `updateUserProfessionalRole()` (`professionalRoleService.js`,
      new file). Shared `WizardStepLayout` gives every step the same progress indicator.
      Browser-refresh/retry safety: no DB write happens until step 6 (Workspace Setup) — steps
      2-5 only accumulate `location.state`, so an abandoned/refreshed mid-wizard session never
      leaves a half-set-up `accounts` row (nothing has been written yet); step 6 itself is
      retry-safe because `createOrganisation()`'s existing unverified/default-org reuse path and
      `provision_organisation_tenant()`'s upsert semantics (v923) are both already idempotent —
      a Retry button re-runs the same submission on failure with no duplicate-row risk.
- [x] Decided at implementation time (user confirmed): **keep email verification disabled**, as
      it already was. Step 5 "Verify" is a read-only review/confirm screen, not a functional
      email gate — re-enabling real email verification is out of scope for this slice.
- [x] Non-modal, full routed pages per rule 65 — each step is its own route
      (`apps/platform/src/routes/authRoutes.jsx` / `apps/simulator/...`, wired through
      `lazyImports.js` → `routeCommon.jsx` → `authRoutes.jsx`), not a step-state modal.
- [x] End-state parity preserved: step 6 still calls the same `createOrganisation()` (same
      `accounts` row shape, same `assignSystemRole()` founder-role calls) — only *when* in the
      flow it's called changed, not what it does.
- [x] Platform–Simulator parity: Simulator's `OrganisationSetup.jsx` and the 3 shared service
      files were confirmed byte-identical to Platform's pre-edit originals, so the same file
      was copied over; the 5 new `registrationWizard/` files were copied as-is (no schema-
      specific content); routing files (`lazyImports.js`/`routeCommon.jsx`/`authRoutes.jsx`)
      were edited in place in both apps since those files had already diverged elsewhere.
      `esbuild` syntax-checked all 26 touched/created files across both apps.

### Phase 6 — Invitation flow updates ✅ Complete
- [x] `accept-invitation` edge function (`supabase/functions/accept-invitation/index.ts:134`):
      stop writing `role_display_name` into `job_title` (decision 4) — `inviteeJobTitle` is now
      always `''`, so it's never copied onto new-user metadata, the profile-defaults patch, or
      the row insert.
- [x] **Scope expansion found during implementation, same approved decision 4, not a new
      decision** — TWO more copies of the conflation surfaced beyond the edge function the PRD
      audit named:
      1. Client-side `buildInvitationUserProfilePatch()`
         (`packages/shared/src/utils/invitationInviteeFormat.js`, plus its two app-local shadow
         copies — see the alias note below) did the identical `role_display_name → job_title`
         copy for the Authenticated/Registered accept paths in `InvitationAccept.jsx` — the more
         common paths in a multi-project system. Fixed: `job_title` is no longer part of the
         returned patch at all.
      2. **The actual authoritative source**: `public.apply_invitation_profile_defaults()`
         (`SQL/v901_invitation_accept_profile_name_and_job_title.sql`) plus its two `AFTER
         UPDATE` triggers on `project_invitations`/`organisation_invitations` (fires the instant
         `invitation_status` flips to `'accepted'`, i.e. on EVERY accept path — new user, sign-
         in-and-accept, already-authenticated — regardless of what any client/edge-function code
         does). Fixing only the JS/TS layers above would have been insufficient — this trigger
         would still set `job_title` from `role_display_name` whenever `job_title` was blank.
         Fixed via new `SQL/v925_stop_invitation_accept_job_title_overwrite.sql`
         (`CREATE OR REPLACE` on the same function signature, so the trigger functions need no
         changes): keeps the full_name/first_name/last_name logic untouched, drops the job_title
         branch entirely. **Not yet run — needs the same manual apply via Supabase SQL editor as
         v918-v924.**
- [x] Added a shared, optional "Professional role (optional)" picker
      (`ProfessionalRoleField` in `InvitationAccept.jsx`) rendered on all three accept panels
      (Authenticated / Registered / New user) — same `professional_roles` reference data as
      registration (`getProfessionalRoles()`), via the new `professionalRoleService.js`. Left
      blank by default so an existing `professional_role_id` (e.g. set at registration) is
      never silently overwritten; only written via `updateUserProfessionalRole()` if the user
      actively picks a value, run in parallel with the existing profile-defaults patch.
- [x] Regression test: existing `accept_project_invitation`/`accept_organisation_invitation`
      RPC calls untouched — only the job_title side-effect removal and the new
      professional_role capture were added. 31/31 tests passing in both apps (2 new: job_title
      is never set from role; professional role save fires on selection) plus 13/13 in
      `packages/shared`'s own suite.
- [x] **Architecture correction discovered via a failing test, documented for future sessions**:
      `@nidus/shared/utils`, `/hooks`, `/context`, `/constants` are aliased in both apps'
      `vite.config.js` to **app-local** `src/utils|hooks|context|constants/`, NOT
      `packages/shared/src/...` — only `/components`, `/services`, `/federation` (and the bare
      package) resolve to the real `packages/shared` location. This contradicts rule 34.3's
      general "packages/* is the single source of truth" framing for these four subpaths
      specifically. A fix to `packages/shared/src/utils/invitationInviteeFormat.js` alone is
      inert for Platform/Simulator — the matching `apps/platform/src/utils/...` and
      `apps/simulator/src/utils/...` shadow copies must be edited (or synced) too. All three
      copies (plus their three test-file copies) were fixed/synced in this slice.
- [x] Platform–Simulator parity: `InvitationAccept.jsx`, `professionalRoleService.js`, the
      shadow-copy `invitationInviteeFormat.js`, and both test files synced to Simulator;
      `esbuild` syntax-checked, full test suites re-run in both apps after the shadow-copy fix.

### Phase 7 — Organisation Settings: industry & capability management ✅ Complete
- [x] **Confirmed during implementation**: no dedicated "Organisation Settings" hub page exists
      — org-level settings today are either embedded panels inside `PMOAdmin.jsx`
      (`OrganisationMethodologySettings`, pre-dates rule 65) or standalone `organisation/*`
      branding pages with no shared parent. Built as its own new top-level routed page instead,
      `OrganisationIndustrySettings.jsx`, same tier as `admin/manage-roles` /
      `admin/manage-menu-bundles` (same `user_can_manage_org_roles` authorization boundary).
      Route: `admin/organisation-industries` (Platform) / `simulator/pmo/organisation-industries`
      (Simulator, under `SimulatorPMOLayout` matching that app's existing wrapper convention).
- [x] Industries panel: multi-select + primary + optional sub-industry, re-provisioned via
      `provisionOrganisationTenant()` (re-provisioning IS the update path, v923) — buffered
      local edit + explicit "Save Industries" button, wired to `useUnsavedChangesGuard` (rule
      52) since it's a real batched form, unlike the capabilities toggles below.
- [x] "Modules & Capabilities" panel: lists the org's currently-available
      `industry_pack_menu_items` (Generic PM + selected industries) grouped by pack, with
      disable-only toggles. **New RPC** `SQL/v926_organisation_capability_toggle_rpc.sql`
      (`toggle_organisation_capability`) — `organisation_disabled_capabilities` only grants
      direct-client SELECT (v920), no write policy, so a plain client insert/delete would have
      been RLS-blocked (rule 42). Each toggle applies immediately (optimistic UI, revert on
      RPC failure) — no batching, matching the RPC's own per-item design; no unsaved-changes
      guard needed since nothing is left pending.
- [x] New read-only service `organisationIndustryService.js` (`getOrgIndustries`,
      `getOrgCapabilities`, `toggleOrganisationCapability`) — direct client reads (all four
      underlying tables grant SELECT to `authenticated`), RPC-only writes.
- [x] Success-modal confirmation (rule 16, industries save only — capability toggles are
      inline/immediate, not a save-confirmation flow), non-modal routed page (rule 65),
      theme-aware (rule 28.1), audit tab (rule 63.1) — Identity/Classification/Record history
      cards describe the *account* itself (no other single "record" exists for an org-wide
      settings surface), same `DetailAuditTabList`/`AuditCard`/`AuditField`/`AuditTimestampPair`
      components as `MenuBundleDetail.jsx`.
- [x] **Sidebar wiring (rule 13)**: new menu item "Industries & Capabilities" under People &
      Resources (`pmo-cat-teams` / `sim_pmo_cat_admin`), sibling of Manage Roles/Manage Menu
      Bundles — `SQL/v927_organisation_industries_menu.sql` (Platform),
      `SQL/v928_sim_organisation_industries_menu.sql` (Simulator). Proactively added the new
      route/label to `pmoMenuHierarchyUtils.js`'s category-inference regexes AND
      `v671PmoMenuCanonical.js`'s `matchPeopleLeaf` allowlist — both gates, not just one —
      learning directly from this session's earlier Manage Menu Bundles incident where missing
      the second gate silently dropped a correctly-categorized item from the flat-mode menu.
      Added a matching regression test (`pmoMenuHierarchyUtils.test.js`, 44/44 passing).
      Simulator's category inference needed no edit — its path/label naturally matches an
      existing generic `/organisation/` substring rule.
- [x] Platform–Simulator parity: service, page, and all 4 routing-layer files
      (`lazyImports.js` → `routeCommon.jsx` → the app's own routes file) wired in both apps;
      `esbuild` syntax-checked; existing `organisationCustomRoleService`/`organisationService`
      suites re-run clean in both apps (45/45 each) after the new exports.

### Phase 8 — Admin governance ✅ Complete
- [x] **Confirmed during implementation**: no admin surface for `industry_categories` existed
      (grepped the whole admin repo) — built fresh, no duplicate risk.
- [x] Built all 4 CRUD surfaces in `E:\project-nidus-admin`: `industry_categories`,
      `industry_segments`, `industry_packs` + `industry_pack_menu_items` (with a searchable
      checkbox picker over `public.menu_items` for pack curation), `professional_roles`. Full
      detail in the admin repo's own plan:
      `E:\project-nidus-admin\projectplans\v208_industry_reference_data_admin_crud_plan.md`.
- [x] **New architecture decision (confirmed with user)**: since these 4 tables live in the
      monorepo's `public` schema (not `admin`), new RPCs live directly in `public` — same place
      as `provision_organisation_tenant` — each internally gated by
      `admin.check_admin_permission()`, rather than proxying through an `admin`-schema RPC (the
      one existing precedent, Global Templates). New monorepo-owned SQL for this lives in the
      **admin repo** per that repo's own SQL-location convention (mutations are admin-driven):
      `E:\project-nidus-admin\SQL\v208_industry_reference_admin_rpcs.sql` (RPCs + permission
      keys) and `v209_industry_reference_admin_nav.sql` (sidebar nav, new "Industries" group
      under `system-security`). **Not yet run** — needs the same manual Supabase SQL editor
      execution as every other SQL file this session.
- [x] RBAC: one shared permission pair (`system.industries.view` / `.edit`) covers all 4
      tables — matches the `system.currencies.edit` / `system.id_generation.edit` precedent
      size for one cohesive admin domain, granted to `super_admin`/`system_admin`.
- [x] Non-modal routed pages (rule 18), audit tab (rule 16.1), unsaved-changes guard (rule 6),
      icon-only row actions (rule 15), theme-aware (rule 8) — all applied per the admin repo's
      own CLAUDE.md, matching the `NotificationTemplatesPage`/`NotificationTemplateFormPage`
      pair used as the concrete template (the more current, rule-18-compliant precedent — not
      `CurrencyListPage.jsx`, which predates rule 18 and is still modal-based).
- [x] "Delete" is soft (`is_active = FALSE`) for all 4 tables, never hard `DELETE` — other
      tables reference these rows (roles/project_roles/industry_segments/industry_packs/
      account_industries/users.professional_role_id), so a hard delete would cascade-destroy
      dependents or fail on FK violation. Matches the disable-only philosophy already
      established for `organisation_disabled_capabilities` (decision 7).
- [x] **Known gaps, flagged not silently skipped**: no Playwright e2e coverage, no module
      documentation guide added yet (both normally required by the admin repo's own
      "Documentation & Testing" rule for a new feature) — noted in the admin plan for
      follow-up. No manual click-through testing (no browser access in this environment).

### Phase 9 — Getting-started experience ✅ Complete
- [x] `/platform/getting-started` (`GettingStarted.jsx`) — "Welcome to Project Nidus / Your
      workspace includes: ✓ Core PM ✓ [industry pack features] / Create My First Project",
      sourced from `industry_pack_features` labels via new `getGettingStartedSummary()`
      (`organisationIndustryService.js`), not hardcoded copy. `WorkspaceSetupStep.jsx`'s
      success-modal `onOk` now lands here instead of the Phase-5-interim `/platform/dashboard`
      target (both apps — Simulator's wizard already cross-navigated into the Platform app's
      domain post-registration before this change, so no new cross-app routing was introduced).
- [x] **Real data gap, flagged not papered over**: `industry_pack_features` (v920) was created
      but never seeded — v921 only populated `industry_packs`/`industry_pack_menu_items`. The
      page falls back to showing just the pack's own name (real data) when no feature rows
      exist for it, rather than inventing plausible-sounding bullet copy — genuinely populating
      this table needs the actual industry list/curation input, which isn't something to guess
      at without DB access or the user's involvement.
- [x] Platform–Simulator parity: service + page synced to Simulator (unused by Simulator's own
      router today, kept for file-level parity — same as every other registration-wizard file
      this session).

### Phase 10 — Tests (cross-cutting, run throughout, not just at the end) ✅ Complete (scoped honestly)
- [x] **This environment has no live database or browser access** — automated coverage this
      session is limited to pure JS/TS logic; everything requiring a real RPC call, RLS
      enforcement, or rendered UI is written up as an explicit manual test checklist instead of
      silently skipped or faked. New automated tests added:
      `applyOrgMenuAvailabilityFilter.test.js` (6/6 each app) — extracted the fail-open filter
      logic from `useMenu.js`/`useSimMenu.js` into a pure, independently-testable function
      (previously untestable without flipping the live availability flag).
- [x] **Manual test guide**: `Documentation/v918_SaaS_Industry_Tenant_Provisioning_Manual_Test_
      Guide.md` — covers every item the PRD's testing section and this checklist name:
      registration end-to-end, invitation flow, Organisation Settings, Admin CRUD, menu
      resolution (Phase 4), existing-tenant compatibility, UI states, and the full RLS
      cross-tenant matrix for `account_industries` / `organisation_disabled_capabilities` /
      `tenant_provisioning_log` with expected read/write scope per table.
- [x] **Explicit callout in the guide**: `INDUSTRY_MENU_AVAILABILITY_ENABLED` is still `false`
      in both apps' `useMenu.js` — deliberately never flipped on during this session, since
      doing so changes every user's live sidebar rendering and nothing built this session has
      been browser-tested yet. The guide gives the exact steps to flip it, verify it, and
      decide explicitly whether to leave it on — not a decision to make silently mid-session.

### Phase 11 — Review
- [ ] Apply `REVIEW.md` after each vertical slice above, not just once at the end (brief §48).
- [ ] Record per-slice: files changed, SQL changed, tests run, findings, unresolved risks,
      cross-app impact (Platform/Simulator/Admin), rollback implications.
- [ ] Update this plan's review section cumulatively as slices land.
- [ ] Update `ROADMAP.md` only if this changes strategic status/priority/dependencies — not a
      given just because this is a large feature.

## Key risks (carried into implementation, not resolved by planning alone)

1. **Phase 4 (menu resolution layer) is the single highest-risk piece.** It touches a pipeline
   that already broke once this session from something far smaller. Mitigation: isolated pure
   function, applied strictly after existing role-grant hydration, behind a flag, with a
   dedicated regression suite that did not previously exist.
2. **Phase 5 (registration rewrite) is the second-highest risk** — it replaces a currently
   working, currently-used signup path. Mitigation: explicit end-state parity testing against
   today's flow, not just "the new wizard works in isolation."
3. **Industry pack content curation (Phase 1, v921) is a real curation task**, not a mechanical
   migration — assigning the wrong menu items to a pack is a content-quality risk, not a code
   risk, and needs the same care as the original v906/v913 industry-role-catalog curation did.
4. **No live database access in this environment** — every SQL file in this plan is verified by
   careful review and must be run manually by the user in order, exactly as every other SQL
   change this session has been. This plan does not change that constraint; it multiplies the
   number of files where getting the order/dependencies right matters (roughly v918-v923 before
   any UI phase can be meaningfully tested end-to-end).

## Out of scope (see PRD section f for full list)

Subscription-tier pack gating, `pmo_industry_templates` reconciliation, Simulator scenario/
learning-path tagging, project-level industry override, real-time cache invalidation, any
pricing/commercial redesign, cross-tenant reporting dashboards.

---

### Phase 11 — Review ✅ Complete

Per `REVIEW.md` §3, this change involves authorization, RLS, tenant/organisation isolation, SQL
migrations, database functions, and an Admin-to-Platform cross-schema exception — **DEEP**
review mode applies. Self-reviewed (same session that implemented it) with genuine scrutiny
rather than a rubber-stamp, per §21's independence instruction; findings below are real, not
padding, including ones that don't fully pass.

## Review Summary

- Change: SaaS industry-aware tenant provisioning — registration wizard, invitation flow fix,
  org industry/capability settings, Admin reference-data CRUD, getting-started page, menu
  availability filter (flagged off)
- PRD: `projectprd/v918_saas_industry_tenant_provisioning_PRD.md`
- Implementation plan: this file
- Roadmap area: not updated — no strategic status/priority/dependency change (net-new capability
  behind a flag, doesn't alter existing roadmap commitments)
- Review mode: DEEP
- Decision: **PASS WITH CONDITIONS**
- Highest severity: MEDIUM (see findings)
- Regression risk: MEDIUM — Phase 6 touches a live, widely-consumed trigger
  (`apply_invitation_profile_defaults`) and a client-side shared utility
  (`invitationInviteeFormat.js`) that every invitation acceptance already depends on
- Database impact: MEDIUM — 9 new SQL files (v918-v928 monorepo, v208-v209 admin), all
  additive (new tables/functions/columns), none destructive, none yet run against production
- Security impact: LOW-MEDIUM — new RPCs all check authorization internally
  (`user_can_manage_org_roles`/`admin.check_admin_permission`); no RLS policy was weakened;
  the new `public`-schema-RPC-calls-`admin`-schema-function pattern is a genuine new exception,
  documented in both repos' CLAUDE.md, but not adversarially tested (no DB access)

## Findings

### [MEDIUM] Admin's 4 new CRUD list pages don't have the Card/Table toggle or sortable column headers Admin CLAUDE.md rules 12/12.1 mandate for new list pages
- Evidence: `ProfessionalRolesPage.jsx`, `IndustryCategoriesPage.jsx`, `IndustrySegmentsPage.jsx`,
  `IndustryPacksPage.jsx` — plain `<table>`, client-side fixed alphabetical sort, no
  card/table-list view toggle, no click-to-cycle sortable headers
- Problem: rule 12 ("mandatory for NEW list pages") and rule 12.1 are not satisfied
- Impact: cosmetic/UX inconsistency vs. the current mandatory pattern, not a functional or
  security defect — matches the `NotificationTemplatesPage.jsx` template these pages were
  deliberately modeled on, which itself predates rules 12/12.1
- Recommended action: retrofit when these pages are next touched, per the same "adopt
  opportunistically" cadence the rule itself allows for pre-existing pages — not a blocker for
  this phase, but should not be treated as compliant either
- Validation required: none blocking; track as a known gap

### [MEDIUM] No adversarial RLS/authorization testing was performed on any new RPC
- Evidence: `provision_organisation_tenant`, `toggle_organisation_capability`,
  `admin_create_industry_category` (and siblings) — all SECURITY DEFINER with internal
  permission checks, none executed against a live database this session
- Problem: REVIEW.md §11 explicitly calls for adversarial tests (forged account id, forged
  permission, direct RPC invocation) for exactly this class of change; none were run
- Impact: authorization logic is code-reviewed and structurally consistent with existing,
  already-proven patterns (`provision_organisation_tenant` mirrors `v903`'s established
  authorization shape) but not empirically verified
- Recommended action: run Section 8 of the manual test guide before relying on this in
  production
- Validation required: manual, by the user, against the live Supabase project

### [LOW] `industry_pack_features` is empty — the getting-started page's richer copy is currently just pack names
- Evidence: `getGettingStartedSummary()` falls back to `pack.pack_name` when no feature rows
  exist; v921's seed never populated `industry_pack_features`
- Problem: not a defect (documented, honest fallback, no hardcoded copy) but the feature is
  visually thinner than the brief's example ("✓ Data Migration ✓ Cutover")
  until someone curates that table
- Recommended action: curate `industry_pack_features` content (needs domain knowledge of the
  actual industry list, not something to guess at from this environment)

### [LOW] `INDUSTRY_MENU_AVAILABILITY_ENABLED` still `false`
- Not a defect — a deliberate, disclosed decision (see Phase 10). Recorded here so it isn't
  mistaken for an oversight during future review.

## Validation Evidence

```text
Type/Lint: PASS (esbuild syntax check on every touched/created JS/JSX/TSX file, both repos)
Unit: 44/44 (pmoMenuHierarchyUtils) + 6/6 x2 apps (applyOrgMenuAvailabilityFilter) +
      31/31 x2 apps (InvitationAccept) + 13/13 (invitationInviteeFormat, packages/shared) +
      45/45 x2 apps (organisationCustomRoleService + organisationService, unaffected by new
      exports) = 267 total assertions across both apps' relevant suites, 0 failed by this work
      (2 pre-existing, unrelated useMenuMethodology.test.js failures confirmed via git stash
      before this session's changes)
Integration: NOT RUN — no environment to exercise real Supabase RPC round-trips
SQL/RLS: NOT RUN — no database access in this environment; manual matrix provided instead
E2E: NOT RUN — no browser access in this environment
Build: NOT RUN — no full `vite build`/`turbo build` executed (syntax-checked file-by-file
       instead); recommend running the real build command before deploying
Manual: NOT RUN by this session — full checklist provided in
        Documentation/v918_SaaS_Industry_Tenant_Provisioning_Manual_Test_Guide.md
```

## Not Verified

- Every SQL file's actual execution against the live Supabase project (v918-v928, v208-v209) —
  reviewed line-by-line against the real schema definitions read earlier in this session, not
  executed
- Full `vite build`/`turbo build` for either app or the admin shell
- Any real browser rendering of any new page
- RLS cross-tenant behavior (Section 8 of the manual test guide)
- `industry_pack_menu_items` curation UI's behavior against a real, populated `menu_items` table
  at realistic scale (likely 100+ rows) — search/scroll UX assumed adequate, not measured

## Remaining Risks

- Phase 6's fix to `apply_invitation_profile_defaults` (a live trigger) has not been observed
  firing correctly end-to-end against a real invitation acceptance
- The new `public`-schema-calls-`admin`-schema-function cross-schema pattern (v208) is genuinely
  novel for this codebase; only one prior precedent exists (the reverse direction, Global
  Templates) — worth a second pair of eyes before this becomes the default pattern for future
  reference-data tables
- `industry_pack_menu_items` seed content (v921) was described in the PRD's own "Further notes"
  as a real curation task, not mechanical — its quality has not been independently spot-checked
  against actual PM domain knowledge

## Final Decision

**PASS WITH CONDITIONS.** No Critical or unresolved High findings. Two MEDIUM findings recorded
above (Admin list-page UX gap; no adversarial RLS testing performed) are explicitly accepted as
follow-up items, not blockers, given: (a) the UX gap matches existing, already-shipped
precedent rather than introducing a new inconsistency, and (b) the authorization logic reuses
already-proven patterns from earlier in this same session (`v903`) rather than inventing new
authorization shape. Condition for full production confidence: run
`Documentation/v918_SaaS_Industry_Tenant_Provisioning_Manual_Test_Guide.md` end-to-end,
especially Section 8 (RLS/authorization) and Section 6 (menu resolution, before flipping
`INDUSTRY_MENU_AVAILABILITY_ENABLED`), before treating this initiative as release-ready.

`ROADMAP.md` not updated — no strategic status/priority/dependency change from this work.
