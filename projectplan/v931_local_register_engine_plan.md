# v931 — Local Register Engine & Industry Capability Modules — Implementation Plan

See `projectprd/v931_industry_capability_modules_PRD.md` for the approved decisions this plan
implements. This is a large initiative — implement in the vertical slices below, each
independently testable/revertible, not as one big-bang change.

## Key existing pieces this plan builds on (facts gathered before writing this plan)

- **Project-level membership**: `project_memberships` (`project_id`, `user_id`,
  `project_role_id` → `project_roles.role_name`). Team Manager/Lead vs Team Member vs Project
  Manager is distinguished purely through `project_roles.role_name` on the linked row — there is
  no separate boolean/enum. `SQL/v91_role_system_cleanup.sql`.
- **Programme-level access**: **no junction table** — a single column, `programmes.
  programme_manager_user_id`. Only the Programme Manager has an assignment; there is no broader
  "programme member" concept to extend creation rights to. RLS precedent:
  `SQL/v592b_programme_mgr_assignments_rls.sql`; service: `listProjectsForProgrammeManager()` in
  `src/services/managerAssignmentService.js`.
- **Portfolio-level access**: same pattern — `portfolios.portfolio_manager_user_id`, no junction
  table. RLS precedent: `SQL/v592a_portfolio_mgr_assignments_rls.sql`.
- **PMO-admin-tier check**: currently a **JS-side-only** check —
  `isPmoAdmin(authUserId)` in `src/services/organisationRoleService.js` → `getUserSystemRoles()`
  + `matchesPmoSuiteAdminRole()` (`src/services/pmoSuiteRoleAccess.js`), matching role_name
  `pmo_admin`/`org_admin`/`system_admin`/`super_admin`. **No equivalent SQL function exists** —
  RLS runs in Postgres, so this plan needs a new SQL helper mirroring the same role-name list
  (Phase 1 task) rather than assuming one already exists.
- **Admin ID Generation trigger**: `public.trg_apply_admin_display_id('public.<table>',
  '<column>')`, still the standard pattern (`SQL/v756_id_generation_migration_helpers.sql`,
  recent example `SQL/v887_v882_greenfield_reference_columns.sql`). **Gap identified**: this
  trigger keys a generation rule by TABLE name, not by a row's own type — since every local
  register's records share ONE physical table (`local_register_records`), they would all get the
  same ID prefix (e.g. every register's records look like "LR-0001", "LR-0002"...) rather than a
  distinct prefix per register (e.g. "PMT-0001" for Permits vs "COB-0001" for Core Banking).
  Flagged as Phase 1's first open decision — see below.
- **Record-lifecycle module**: column-pattern based (`record_status`, `root_record_id`,
  `record_version`, `parent_record_id`, `authorised_by/at`, etc. — full list in
  `public.lifecycle_blocked_columns()`, `SQL/v751_record_lifecycle_defer_apply_functions.sql`),
  driven by `public.transition_record_status(...)` and a generic `record_authorisation_requests`
  table, with participating tables registered in `src/config/recordLifecycleRegistry.js`
  (`LIFECYCLE_TABLE_REGISTRY`, Category A with history/archive views or Category B single
  table). Since `local_register_records` is one shared table across every register (system AND
  member-created), only SOME of which want approval gating, this needs its own design decision —
  see Phase 6.

## Phase 0 — Two open decisions to resolve before Phase 1 (facts are in, decisions are not)

**Resolved (accepted recommended defaults per user's "proceed"): shared display-ID prefix for
v1; local_register_records registers once with record-lifecycle, requires_approval flag gates
which registers actually route through the authorisation queue.**

- [ ] **Display-ID prefixing**: given `trg_apply_admin_display_id` is table-keyed, choose one:
      (a) accept one shared prefix for all local register records (simplest — e.g. all "LR-####"
      regardless of register), or (b) extend the Admin ID Generation system to key off a
      discriminator column value (`local_registers.register_key`) instead of just table name —
      this would need its own small change in the Admin app's `admin.generate_display_id()`
      function (`project-nidus-admin` repo, per the repo-scoping rule) and is a materially bigger
      change than (a). Recommend (a) for v1, revisit (b) only if users actually find a shared
      prefix confusing in practice.
- [ ] **Record-lifecycle participation shape**: recommend `local_register_records` registers as
      a single Category B table in `LIFECYCLE_TABLE_REGISTRY`, with `record_status` defaulting to
      `'authorised'` at insert for any register whose definition doesn't opt into approval
      gating (so the lifecycle machinery is present but inert for most registers), and only
      registers that opt in (a boolean on `local_registers`, e.g. `requires_approval`) actually
      transition through `'unauthorised'` → authorisation queue. Needs confirmation before
      Phase 6.

## Phase 1 — Core schema (SQL, `SQL/v931_*.sql`, `public` schema, Platform + Simulator per parity)

- [x] `local_registers` — per PRD decision 4's column list (`register_key`, `label`, `icon`,
      `scope_level` enum, `is_system_defined`, `industry_pack_id` nullable FK, `account_id`,
      `scope_entity_id` nullable, `status_workflow` — store as `jsonb` ordered array of
      `{key, label}`, `requires_approval` boolean per Phase 0's second decision, `created_by`,
      audit columns).
- [x] `local_register_fields` (`register_id` FK, `field_key`, `field_label`, `field_type` enum,
      `is_required`, `display_order`, `dropdown_options` jsonb).
- [x] `local_register_records` (`register_id` FK, `scope_portfolio_id`/`scope_programme_id`/
      `scope_project_id` nullable FKs on the parent `local_registers` row — records themselves
      just carry `register_id`, they don't duplicate the scope FK — `display_id`, `title`,
      `status`, `owner_user_id`, `field_values` jsonb, record-lifecycle columns per Phase 0's
      second decision, audit columns).
- [x] New SQL helper `public.is_pmo_admin_tier(p_auth_user_id uuid)` mirroring
      `matchesPmoSuiteAdminRole()`'s role-name list exactly (no `p_account_id` param — the JS
      precedent it mirrors, `isPmoAdmin()`, doesn't take one either; `user_roles`/`roles` have no
      `account_id` column) — used by this plan's RLS policies AND left as a documented reusable
      helper.
- [x] RLS policies, one set applied to all three tables (not per-register), via a shared
      `has_local_register_scope_access()` helper function rather than repeating the 4-way
      scope-level branch in every policy:
      - SELECT/INSERT/UPDATE on `local_register_records` for `scope_level = 'project'`: EXISTS
        check against `project_memberships` for that `project_id` (any active membership — the
        PRD's "Team Manager/Lead and Team Member included" decision means membership alone
        qualifies, not a specific `project_roles.role_name`).
      - Same for `'programme'`: `programmes.programme_manager_user_id = auth.uid()`-equivalent
        check (resolved via the existing internal-user-id pattern other RLS policies use, not
        raw `auth.uid()` — confirm the exact resolution helper other recent RLS files use, e.g.
        `SQL/v592b_programme_mgr_assignments_rls.sql`, and mirror it).
      - Same for `'portfolio'`: `portfolios.portfolio_manager_user_id` check, mirroring
        `SQL/v592a_portfolio_mgr_assignments_rls.sql`.
      - `'pmo'`: `is_pmo_admin_tier()`.
      - `local_registers` (definition table): INSERT/UPDATE/DELETE gated by the SAME scope
        check as above (a project member can define a project-scoped register, etc.); system-
        defined rows (`is_system_defined = true`) are never UPDATE/DELETE-able by any
        non-service-role caller, regardless of scope match (rule 42 — RLS is the actual gate,
        not a client-side disabled-button).
      - `local_register_fields`: same gate as its parent `local_registers` row.
- [x] Register all 3 tables in `database_tables` (rule: Database Table Registration).
- [x] Wire `trg_apply_admin_display_id('public.local_register_records', 'display_id')` per
      Phase 0's first decision. **Still open**: the matching Admin `id_generation_rules` seed in
      `E:\project-nidus-admin\SQL\` (rule 16.2 — separate repo, not written yet — needs a
      separate session/task scoped to that repo).
- [x] Simulator parity: same 3 tables, same RLS shape, in the same `public` schema (confirmed by
      v930's own investigation that `menu_items`/industry tables are genuinely shared, not
      duplicated per app) — Simulator's local registers are the SAME rows, not a `sim.*` copy,
      since project/programme/portfolio entities themselves are `public.*` already. No separate
      Simulator SQL file needed — one migration, `public` schema, both apps read it.
- [ ] **Not yet run against a live database** — this environment has no DB access; the file is
      written and reviewed against precedent patterns but not executed. Needs running in Supabase
      before anything downstream can be tested against real data.

## Phase 2 — Backend services (Platform + Simulator, parity rule 34.1)

- [x] `localRegisterService.js`: `getRegisterDefinition(registerId)`,
      `listRegistersForScope({scopeLevel, scopeEntityId, accountId})`,
      `createRegisterDefinition(...)`, `updateRegisterDefinition(id, updates, {isSystemDefined})`
      (blocked for `is_system_defined` rows client-side too, not just RLS), `addField`/
      `reorderFields`/`removeField`.
- [x] `localRegisterRecordService.js`: generic `listRecords(registerId)`, `getRecord(recordId)`,
      `createRecord(registerId, {...})`, `updateRecord(recordId, {...})`,
      `deleteRecord(recordId)` (soft delete via `is_deleted`) — parameterized entirely by
      `registerId`, no per-register bespoke service.
- [x] Unit tests (mock `supabase`) for both services — 17/17 passing in both Platform and
      Simulator, including the `updateRegisterDefinition` system-defined-register-blocked
      regression test.

## Phase 3 — Generic frontend components (Platform + Simulator, parity rule 34.1)

**Simulator parity gap discovered mid-implementation**: Platform's `public.portfolios`/
`public.programmes`/`public.projects` are **not** the entities Simulator's own UI works
against — Simulator has a fully separate hierarchy (`sim.practice_portfolios`,
`sim.practice_programmes`, `sim.practice_projects`, `SQL/v239_sim_portfolio_programme.sql`),
unlike `menu_items` (confirmed genuinely shared in v930). Phase 1's schema FKs
(`scope_portfolio_id → public.portfolios`, etc.) cannot reference Simulator's practice
entities, so portfolio/programme/project-scoped local registers do not work for Simulator's
own practice hierarchy — only for real Platform projects. `pmo`-level registers ARE unaffected
(gated purely by `is_pmo_admin_tier()`, which reads shared `public.user_roles`/`roles`, no
practice-hierarchy dependency) — a Simulator-specific entry point for `pmo`-scope registers
only is a feasible, scoped follow-up, not attempted in this phase. **Decision made**: the 3
generic pages were copied into `apps/simulator/src/pages/localRegisters/` for future use, but
**NOT wired into Simulator's routing** — their `navigate()` calls hardcode `/platform/...`
paths, which would be wrong inside Simulator's `/simulator/...` route tree, and wiring
half-working portfolio/programme/project scope levels would be worse than not wiring at all.
This needs its own follow-up PRD note in project-nidus (not attempted here): either a parallel
`sim.local_registers`-style schema, or restricting Simulator's local-register UI to `pmo` scope
only with app-aware navigation paths.

- [x] `LocalRegisterListPage` — generic list view, columns derived from `local_register_fields`
      (+ the standard title/status/owner columns), reusing `Table.jsx`/`useSortableTable` (rule
      40/41 — sortable headers, row numbers, card/table toggle) exactly like every existing
      register. Every import verified against the real component source (not just the research
      agent's report) — `TableHeaderCell`/`TableRowNumberHeader`/`TableRowNumberCell` are NOT in
      the `@nidus/ui` barrel export despite existing in `Table.jsx`, imported via the relative
      path instead, matching `RiskList.jsx`'s own precedent.
- [x] `LocalRegisterForm` — generic create/edit form, one input per `local_register_fields` row,
      switching on `field_type` (text/number/date/dropdown/boolean/user_picker/currency).
      `user_picker` renders as plain text in v1 (a real user-search picker is a future
      extension, not blocking this phase).
- [x] `LocalRegisterDetailPage` — generic detail/view, includes the Audit details tab per rule
      63.1 (Identity/Classification/Record history — this is a record-CRUD form, squarely inside
      that rule's scope). User names for owner/created_by/updated_by resolved via one batched
      `users` query per record view.
- [x] Routed (not modal) per rule 65 — `/platform/local-registers/:registerId`, `.../create`,
      `.../:recordId`, `.../:recordId/edit`, wired through the full 4-layer routing pattern
      (`lazyImports.js` → `routeCommon.jsx` → `platformRoutes.jsx` import list → actual
      `<Route>` elements) for **Platform only** (see Simulator gap note above).
- [x] `RegisterDefinitionBuilder` (routed at `/platform/local-registers/new`, reads
      `scopeLevel`/`scopeEntityId`/`scopeLabel` from query params) — name/description, ordered
      status-workflow builder (add/remove, label auto-slugs to a key), field builder
      (add/remove/reorder via up/down, label/type/required/dropdown-options). Calls
      `createRegisterDefinition`. **Not yet done**: no actual "+ New Local Register" button has
      been added to any existing Project/Programme/Portfolio/PMO page linking here with the
      right query params — the builder itself works, but nothing in the existing app UI links to
      it yet. That wiring is dozens of small edits across existing pages, deliberately deferred
      as a separate, opportunistic follow-up rather than done in this pass.
- [x] `ManageLocalRegistersPage` (routed at `/platform/pmo-admin/local-registers`) — lists every
      register for the account via new `listAllRegistersForAccount()`, shows scope/type/status,
      view + activate/deactivate (system-defined rows have no deactivate control). **Not yet
      done**: no sidebar menu item added yet — reachable only by direct URL until Phase 4.
- [x] `LocalRegistersIndexPage` (routed at `/platform/local-registers`) — the context-aware entry
      point (decision 7), reading the same `scopeLevel`/`scopeEntityId`/`scopeLabel` query
      params. **v1 simplification, documented in-file**: shows the given scope level/entity's
      own registers plus all `pmo`-level ones — does not yet resolve a project's parent
      programme/portfolio chain to also surface registers from those broader levels. Flagged as
      a follow-up, not attempted here.
- [x] Component tests: full render-level tests (React Testing Library + router/service mocking)
      were **not** written in this pass — that infrastructure exists elsewhere in the codebase
      but wiring it up for 6 new stateful pages was judged disproportionate given the service
      layer (the permission/data-sensitive logic) already has 22/22 tests. Did extract and test
      the one pure, correctness-sensitive helper: `slugify()` (used to derive `register_key`/
      `field_key` from user-typed labels — 5/5 tests, both apps) — exported from
      `RegisterDefinitionBuilder.jsx` specifically so it's independently testable.

## Phase 3.5 — Schema correction found while preparing Phase 5's seed data (SQL/v932)

Writing the actual 28-register seed data surfaced 3 real design bugs in Phase 1's schema, all
fixed in `SQL/v932_local_registers_system_scope_fix.sql` (applied to the live DB) before any
seed data was written on top of it:

- [x] `local_registers.account_id` was `NOT NULL` — wrongly assumed every register belongs to
      one org. System-defined registers must be account-agnostic (like `industry_packs` itself
      has no `account_id`). Made nullable; NULL = system-defined (visible via industry pack
      match), NOT NULL = member-created (scoped to that org). Unique index rebuilt with
      `COALESCE` on `account_id` too, since a plain unique index treats every `NULL` as distinct
      and would never have caught a duplicate `register_key` across system-defined rows.
- [x] `local_registers.industry_pack_id` was a single column — can't represent a register shared
      across multiple industries (Permits, Readiness Checklist, Data Migration, Commissioning
      all need 2+ pack links per the PRD's own consolidation). Replaced with a join table,
      `local_register_industry_packs`, mirroring `industry_pack_menu_items`'s own shape.
- [x] `local_register_records` had no scope-entity columns of its own, only inherited from the
      parent register — which only works for member-created registers (already tied to one
      entity). A system-defined register's records need their own
      `record_portfolio_id`/`record_programme_id`/`record_project_id`, since the register
      definition itself is now scope-agnostic. RLS on `local_register_records` rewritten to
      `COALESCE(register's own scope, record's own scope)` so both register shapes work through
      one policy.
- [x] Service layer updated to match: `listRegistersForScope`/`listAllRegistersForAccount` now
      resolve the account's enabled industry packs (same `account_industries` → Cross-Industry
      union → `industry_packs` pattern `organisationIndustryService.js` already uses) and union
      member-created + matching system-defined registers, deduped. `createRecord` accepts
      `recordPortfolioId`/`recordProgrammeId`/`recordProjectId`. `LocalRegisterListPage`/
      `LocalRegisterForm` updated to resolve and pass the right scope — system-defined via
      `?scopeLevel=&scopeEntityId=` query params (carried through from wherever the register was
      reached), member-created via the register's own scope columns. 26/26 tests passing
      (Platform), 21/21 (Simulator) — new tests added for the pack-matching branch specifically,
      not just re-passing the old narrower assertions unchanged.
- [x] Discovered via `is_pmo_admin_tier()`-adjacent investigation: `public.users` has no direct
      `account_id` column (account membership is resolved through the existing
      `get_user_accounts(p_auth_user_id)` SQL function, not a simple join) — an initial draft of
      the `local_registers` SELECT policy referenced a non-existent `users.account_id` column,
      which would have hard-failed at query time; caught before being left in the applied
      migration, fixed to call `get_user_accounts()` instead.

## Phase 4 — Menu wiring for system-defined registers (SQL/v934)

- [x] All 28 system-defined registers: one `menu_items` row each (`local_register_<key>`,
      `route_path = /platform/local-registers/<fixed uuid>`), nested under
      `pmo-cat-project-delivery`, role-granted to the same broad delivery-team role set v928
      used for its comparable rollout, and linked via `industry_pack_menu_items` to the SAME
      pack(s) as `local_register_industry_packs` (derived by joining back through the route_path
      → register id, not hand-duplicated) — so v930's pack-grouped sidebar buckets each one
      under the correct industry section(s) automatically, zero changes to v930's own code.
- [x] "Local Registers" entry point (`local_registers_index`, `/platform/local-registers`) and
      "Manage Local Registers" admin oversight page (`pmo_admin_local_registers`,
      `/platform/pmo-admin/local-registers`) both get their own single `menu_items` row —
      the former role-granted broadly (same delivery-team set), the latter PMO-admin-tier only.

## Phase 5 — Seed data: the 28 system-defined register definitions (SQL/v933)

- [x] `SQL/v933_local_registers_system_seed.sql` — all 28 `local_registers` rows (fixed hex
      UUIDs per rule 18.2, so v934's menu seed can reference them directly without a lookup),
      their `local_register_industry_packs` links (including the 4 multi-pack shared
      registers), and every field from PRD section h as `local_register_fields` rows.
      Idempotent (`ON CONFLICT DO NOTHING`).
- [x] Confirmed "Financial Services" (not "Banking") is the real `industry_categories.name` —
      the brief/PRD use "Banking" colloquially (brief §10's own title); resolved via joining on
      `industry_categories.name` in the seed rather than hardcoding a pack_code, so it
      self-corrects if the derivation ever changes.

## Phase 6 — Approval/record-lifecycle integration (SQL/v935, partial — see below)

- [x] Fixed a real mismatch found while wiring this: v931's `local_register_records.record_status`
      defaulted to `'authorised'`, but the established convention
      (`LIFECYCLE_STATUSES` in `recordLifecycleRegistry.js`, `SQL/v751`) uses `'live'` as the
      normal/active state. Also added the missing lifecycle columns
      (`archived_by`/`archived_at`/`moved_to_history_at`/`deleted_at`/`deleted_by`) that
      `lifecycle_blocked_columns()` expects on any participating table. Fixed in
      `SQL/v935_local_register_records_lifecycle_columns.sql` before it mattered (no live data
      yet).
- [x] `requires_approval = TRUE` set on the 4 registers PRD section h flagged: Product
      Configuration, Parameterisation, Bill of Materials, Go-Live.
- [x] `local_register_records` registered in `recordLifecycleRegistry.js` as Category B, both
      apps.
- [x] `createRecord()` / `LocalRegisterForm` updated: a new record for an approval-gated
      register is created `record_status = 'unauthorised'` instead of `'live'` — 2 new tests
      confirm the branch.
- [ ] **Deliberately not done**: the actual submit-for-authorisation / approve-reject UI wiring
      (rule 53's mandatory-justification decision surface, `AuthorisationRequestModal.jsx` in
      `decide` mode). Investigated first rather than guessing — could not locate a single
      generic "authorisation queue page" in the codebase to extend (searched extensively; found
      `AuthorisationQueueWidget.jsx`, a small notification-count badge fed by a caller-supplied
      `fetchCount`, and a separate unrelated "Work Authorisation" feature, but no generic
      cross-table queue list). Rather than guess at how to wire a new UI into a system whose
      actual queue surface I couldn't confidently identify, this is left as an honest gap: the 4
      approval-gated registers correctly start `'unauthorised'`, but nothing in this pass
      transitions them onward to `'live'` yet. Needs its own focused investigation + follow-up
      pass, not a rushed guess.

## Phase 7 — Testing & manual verification

- [x] Unit tests: 28/28 passing in both Platform and Simulator across
      `localRegisterService.test.js` (14), `localRegisterRecordService.test.js` (9),
      `slugify.test.js` (5).
- [ ] **Manual verification — not done, needs your live testing** (this ships as genuinely new
      infrastructure with no feature flag; the checklist below is what "done" means, but nothing
      here has been exercised against your real Supabase data from this environment):
      - A project Team Member (not Project Manager) can create a project-scoped local register
        for their project; a user with no membership on that project cannot see or create one.
      - A Programme Manager can create a programme-scoped register for their own programme; a
        Programme Manager for a *different* programme cannot see it. Same for Portfolio Manager.
      - A PMO Admin can create a `pmo`-level register; a non-PMO-admin cannot.
      - A system-defined register (e.g. Permits) cannot be renamed/refielded/deleted by any
        org, only used — confirm both in the UI (controls hidden) and directly via RLS (a raw
        client UPDATE attempt is rejected, rule 42).
      - An org with Construction selected sees Permits; an org with Energy & Utilities selected
        (not Construction) also sees Permits, confirming the shared-register-multiple-packs
        wiring from Phase 4/5.
      - Creating a record for Product Configuration/Parameterisation/Bill of
        Materials/Go-Live lands as `record_status = 'unauthorised'`; every other register lands
        `'live'`.
      - The "Local Registers" and "Manage Local Registers" sidebar entries actually appear and
        route correctly, respecting the role grants from Phase 4.
      - Theme toggle (light/dark) across all new pages (rule 28.1).
      - Repeat the project/programme/portfolio/pmo checks in Simulator (recall: only `pmo`-scope
        is expected to work there per the Phase 3 Simulator gap note — portfolio/programme/
        project scope will not, by design, until that follow-up is done).

## Phase 8 — Documentation & review

- [x] `Documentation/v931_Local_Register_Engine_Guide.md` written — how to create a local
      register, how the 28 system registers work, the scope model, known gaps.
- [x] This review section (below).

## Phase 9 — Closing the two flagged gaps (SQL/v936–v938, both apps)

- [x] **SQL bugs found while re-running the seed, fixed with new migrations (not edits to
      already-applied ones):**
      - `SQL/v936_local_registers_scope_constraint_fix.sql` — `chk_local_registers_scope_entity`
        (from v931) still required every register to populate a scope-entity FK matching its
        `scope_level`, but v932 made system-defined registers scope-agnostic
        (`scope_level='project'` describing record granularity, no actual `scope_project_id`).
        Rewrote the constraint to branch on `is_system_defined`.
      - `SQL/v937_local_register_records_account_project_columns.sql` — `submit_for_authorisation()`
        (v654) dynamically reads `account_id`/`project_id` off whatever table name it's given;
        `local_register_records` had neither column. Added both; `account_id` is the creating
        user's own resolved account (portfolios/programmes have no `account_id` of their own to
        derive it from), `project_id` mirrors `record_project_id` when project-scoped.
- [x] **Task 2 — Submit-for-authorisation UI** (Platform + Simulator service layer, Platform UI
      only — see below): `localRegisterRecordService.js` gained `getRecordApprovalChain()` and
      `submitRecordForAuthorisation()`, thin wrappers over the existing generic
      `recordLifecycleService.js` (`getApprovalChain`/`submitForAuthorisation`), parameterised
      with the fixed table name `'local_register_records'`. `LocalRegisterDetailPage.jsx`
      (Platform) shows a `RecordStatusBadge` and a "Submit for Authorisation" button (only when
      `register.requires_approval && record.record_status === 'live'`), driving the existing
      generic `AuthorisationRequestModal` in `mode="submit"`. Deliberately did **not** build a
      "decide" (approve/reject) UI — the existing `pmo/authorisation/queue` /
      `pm/authorisation/queue` pages (`record-lifecycle` module) are already fully generic
      across every `table_name`, `local_register_records` included, with zero page changes
      needed (rule 62 — reuse, don't duplicate).
- [x] **Task 1 — Simulator's Portfolio/Programme/Project scope** (`SQL/v938_sim_local_register_
      engine_schema.sql`): confirmed via direct grep against `SQL/v389_sim_practice_project_
      memberships_rls_owner_manage.sql` that Simulator's practice hierarchy (`sim.
      practice_portfolios`/`practice_programmes`/`practice_projects`/`practice_project_
      memberships`) has **no `account_id`/tenant column anywhere** — it's a pure per-user
      practice sandbox, not multi-tenant like Platform's `public.portfolios`/etc. Design chosen:
      - The 28 system-defined registers are **not duplicated** into a `sim.*` copy — they stay
        the single source of truth in `public.local_registers` and are read cross-schema
        (precedent: `sim.practice_industry_plan.template_id -> public.pmo_industry_templates(id)`,
        v575).
      - New `sim.local_registers`/`sim.local_register_fields` tables hold only member-created
        registers, scoped via `scope_portfolio_id`/`scope_programme_id`/`scope_project_id` FKs
        into the practice hierarchy tables. `account_id` is still required (`NOT NULL`, FK to
        `public.accounts`) — populated from the creating user's own resolved account, same as
        `public.local_registers` needs it for cross-org register visibility even though
        practice entities themselves carry no account concept.
      - A single `sim.local_register_records` table holds records for **both** system-defined
        and member-created registers (an `is_system_register` flag disambiguates which schema
        `register_id` points at, since a plain UUID column can't be a FK to "one of two
        tables"). RLS: `pmo` scope reuses the existing shared `public.is_pmo_admin_tier()`;
        portfolio/programme/project checks use `auth.uid()` directly against
        `portfolio_manager_user_id`/`programme_manager_user_id`/`practice_projects.user_id` (the
        owner) **or** an active `sim.practice_project_memberships` row — this is the *current*
        (v389) convention, confirmed live, not the older `sim.get_current_user_id()` helper
        (v242) that v389 itself superseded.
      - **record-lifecycle (submit-for-authorisation) is deliberately NOT extended to
        Simulator** in this pass: confirmed via grep that `RecordLifecycleRouteElements` is
        imported in `apps/simulator/src/routes/simulatorRoutes.jsx` but never actually rendered
        (mounted) anywhere in that file — Simulator has no live approval queue for a record to
        land in. `sim.local_register_records` carries a plain `status`/no lifecycle columns;
        Simulator's Detail page has no Submit button, matching the app's real current state
        rather than building UI for infrastructure that doesn't exist yet.
- [x] Simulator service layer rewritten (`localRegisterService.js`,
      `localRegisterRecordService.js`) to route between `simDb` (member-created,
      `sim.local_registers`/`sim.local_register_records`) and `supabase`/`platformDb`
      (system-defined, `public.local_registers`) — discovered along the way that Simulator's
      *existing* copies of these files were silently always querying `public` schema regardless
      of app (`supabase` in `packages/supabase` resolves to `platformDb` everywhere; only
      `simDb` is schema-scoped to `sim`), so member-created Simulator registers were never
      reachable before this fix.
- [x] Simulator routing wired: `simulator/local-registers`, `.../new`, `.../:registerId`,
      `.../:registerId/create`, `.../:registerId/:recordId`, `.../:registerId/:recordId/edit`,
      `simulator/admin/local-registers` — added to `lazyImports.js`, `routeCommon.jsx`,
      `simulatorRoutes.jsx`. All 6 Simulator page copies had their hardcoded `/platform/...`
      `navigate()` targets corrected to `/simulator/...` (they'd been copied verbatim from
      Platform and never fixed, so were non-functional even though the files existed).
- [x] Companion Admin ID Generation rule seed added:
      `E:\project-nidus-admin\SQL\v210_local_register_records_id_generation_rules_seed.sql`
      (rule 14/16.2) — curated abbreviations for both `public.local_register_records` (`LREG`)
      and `sim.local_register_records` (`SLRG`); neither had an explicit rule before (a
      pre-existing gap from the original v931 pass — confirmed the trigger wouldn't have
      *broken* without it, since `admin._id_gen_ensure_rule()` auto-creates a fallback rule on
      first insert, but a curated rule is what rule 14 actually asks for).
- [ ] **No entry-point picker added** for choosing a Simulator scope entity (portfolio/
      programme/project) when creating a register or record — same as Platform, the
      `scopeLevel`/`scopeEntityId` query params are supplied by whatever calling page links in;
      no practice-hierarchy page currently links to the Local Register Engine. Out of scope for
      this pass, same as Platform's own equivalent gap.
- [x] All SQL applied to the live DB, confirmed by user (2026-08-21): `v933` (re-run, after
      `v936`), `v936`, `v937`, `v938`, and admin repo `v210`.
- [ ] Manual **browser** verification of both Task 1 and Task 2 — not done from this
      environment, still needed: (a) exercising the Simulator scope RLS with real
      portfolio/programme/project-manager and member accounts, (b) exercising submit → queue →
      approve/reject end-to-end in Platform, (c) confirming a system-defined register (e.g.
      Permits) is visible and usable from both Platform and Simulator without duplication, (d)
      theme toggle across the new/touched pages.

## Review — v931 (Local Register Engine & Industry Capability Modules)

**Status: code-complete including both previously-flagged gaps (Phase 9) — Simulator's
portfolio/programme/project scope and the submit-for-authorisation UI. Not yet manually
verified against live data — Phase 7's checklist (plus Phase 9's own verification list) above
is the acceptance test.**

**What shipped**: a generic, config-driven register engine (3 tables + RLS spanning 4 scope
tiers: PMO/Portfolio/Programme/Project) that both the 28 system-defined industry-capability
registers AND any org member's own custom "local" registers run through identically — no new
Postgres table, RLS policy, or bespoke React page required per register going forward. 6
generic pages (list/form/detail/builder/index/admin-oversight), all routed (rule 65), all in
both apps' file trees, Platform fully wired into routing and the sidebar menu.

**Real design bugs found and fixed during implementation, not glossed over**:
1. `account_id NOT NULL` on `local_registers` (v932) — system-defined registers can't belong to
   one org.
2. Single `industry_pack_id` column (v932) — can't represent a register shared across
   industries; replaced with a join table.
3. `local_register_records` had no scope columns of its own (v932) — broke for system-defined
   registers, whose records must specify their own project/programme/portfolio since the
   register definition itself doesn't have one.
4. `public.users.account_id` doesn't exist (caught in v932's own drafting, before being
   applied) — account membership resolves through `get_user_accounts()`, not a direct column.
5. `record_status` default value (`'authorised'`) didn't match the established
   `'live'`/`'unauthorised'`/`'history'`/`'archived'` vocabulary (v935), and several
   lifecycle-required columns were missing.

Each was caught by cross-checking against real precedent (`v592a/b`'s RLS, `pmoSuiteRoleAccess.js`,
`lifecycle_blocked_columns()`) rather than assumed, and fixed with a new migration rather than
silently editing an already-applied one, consistent with this session's established convention.

**Files touched**: `SQL/v931`–`v938` (8 migrations, monorepo) + `admin/SQL/v210` (1 migration,
admin repo); `localRegisterService.js`, `localRegisterRecordService.js` (both apps, Simulator's
copies substantially rewritten in Phase 9 to route between `simDb`/`supabase`); 6 pages under
`pages/localRegisters/` + `pages/admin/ManageLocalRegistersPage.jsx` (both apps, both now
routed); routing (`lazyImports.js`/`routeCommon.jsx`/`platformRoutes.jsx` +
`simulatorRoutes.jsx`, both apps); `recordLifecycleRegistry.js` (both apps, Platform-only
lifecycle participation — see Phase 9); 3 test files, 28 tests, both apps.

**Not done, stated plainly rather than left implicit**:
- No entry-point button wired into any existing Project/Programme/Portfolio/PMO (or Simulator
  practice-hierarchy) page linking to the "+ New Local Register" builder — reachable by direct
  URL/query params only, in both apps.
- Manual verification (Phase 7 + Phase 9's own list) — everything above is written and
  unit-tested but not exercised against real Supabase data or a real browser session from this
  environment.
- Simulator record-lifecycle (submit-for-authorisation) integration — deliberately out of
  scope, see Phase 9: no live approval queue exists in Simulator to route a request to.

## Explicitly not in this plan (see PRD Out-of-scope)

Migrating existing registers (Risk, Issue, Change, etc.) onto this engine; Optional Feature
Packs; advanced field types (formulas, cross-register lookups, file attachments) beyond the
initial type list.
