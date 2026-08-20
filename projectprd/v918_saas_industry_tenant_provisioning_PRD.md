# v918 — SaaS Industry-Aware Tenant Provisioning & Menu Architecture PRD

Source brief: `Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md`

## a) Problem statement

Project Nidus is meant to be a single, configurable multi-tenant SaaS PMIS — one platform where
an organisation's industry shapes which capabilities and menus are relevant to it, without
forking the codebase or the menu tree per industry. Today that intent exists only in fragments,
and several of the fragments actively work against each other:

- **Industry is collected at registration but goes nowhere.** `OrganisationSetup.jsx` has a
  required "Industry" field, but it's a hardcoded 11-item list ("Technology", "Software
  Development", "Retail"…) with zero relationship to `industry_categories` (10 rows: Financial
  Services, Construction & Engineering, Education, Cross-Industry, etc.) — the *real* industry
  taxonomy that already tags 100 built-in roles (`roles.industry_category_id` /
  `project_roles.industry_category_id`, v906). The registration value is stashed inside
  `accounts.metadata` (a JSONB blob), not a real column, and nothing downstream reads it.
- **"Professional role" and "security role" are the same field today — the brief's central
  warning is already true in production.** There is no professional-role concept at all.
  `users.job_title` (free text) is *overwritten* with the security role's display name whenever
  an invitation is accepted (`accept-invitation` edge function, line ~134: `inviteeJobTitle =
  inv.role_display_name`). Selecting "Team Member" during an invite IS the authorization grant —
  there's no separation to preserve.
- **A large industry-template system already exists, disconnected from organisations.**
  `pmo_industry_templates` (+ phases/activities/deliverables/risks/milestones/roles), seeded for
  40+ industries, is a *project-template* catalog (`industryTemplateService.js`,
  `IndustryTemplateBrowser.jsx`) with no link to `accounts` at all — an org's industry, even if
  captured correctly, wouldn't currently steer a user toward it.
- **Menu placement isn't purely DB-driven today.** `menu_items.parent_menu_id` defines the real
  hierarchy, but the sidebar-rendering pipeline (`useMenu.js` → `applyRoleSidebarRevamp` →
  `packages/config/src/pmoMenuHierarchyUtils.js`) re-derives category placement through large
  regex pattern-matching functions across four separate layouts (`pmo`/`pm`/`sim_pmo`/`sim_pm`).
  Any new industry-menu layer has to reckon with this existing fragility, not build on top of it
  blindly (confirmed by an incident earlier this session: a brand-new menu item was silently
  misclassified because the regex didn't recognize its route).
- **No feature-entitlement gating exists beyond member/project counts.** `subscription_plans`
  carries free-text marketing bullets, not a real feature-gating structure.
  `admin.feature_flags` exists but has zero references anywhere in Platform/Simulator source
  despite CLAUDE.md documenting the read-only exception for it.

## b) Solution (high-level shape — mechanics resolved via the interview below)

Treat industry as an **organisation/tenant attribute**, resolved once at registration and
persisted against the account (not scattered per-user). Reconcile, not duplicate, the existing
`industry_categories` taxonomy — it already does the "which built-in roles/menus are relevant"
job for roles; extend that same taxonomy to gate registration and (via the roles it already
tags) the menus a newly provisioned organisation sees. Introduce a real, audited tenant
**provisioning step** after registration that assigns the org's industry, its generic PM
baseline, its default role(s), and (new) an explicit **Professional Role** field that is
captured for information/onboarding purposes only and never itself grants authorization —
closing the conflation gap found in the audit. Menu visibility becomes a layered resolution
(core + generic PM + industry + entitlements + org overrides + role permissions) built from
data the system already has wherever possible (role→menu grants, industry→role tags), rather
than a new parallel hard-coded structure. RLS and server-side validation remain the sole source
of authorization truth throughout — menu visibility is never treated as security.

## c) Current-state audit summary (see full agent findings in conversation; condensed here)

**Registration & tenant (Platform)**
- Primary path: `OrganisationSetup.jsx` → `createOrganisation()` (`organisationService.js`) →
  `INSERT INTO accounts`. Hardcoded `INDUSTRIES` list, unrelated to `industry_categories`.
- Founder gets **two** roles automatically: `assignSystemRole(user, 'account_owner')` then
  `assignSystemRole(user, 'pmo_admin')` — both hardcoded string role_names, both inserted into
  `user_roles`.
- Invited users pick a role (`project_roles`/`roles`) during the invite
  (`InviteUserForm.jsx`); `accept-invitation` edge function resolves it via
  `accept_project_invitation` → falls back to `accept_organisation_invitation`, and — the
  conflation point — copies that role's `role_display_name` into `users.job_title`.
- Email verification is **already effectively disabled**: `createOrganisation()` calls a
  second update immediately after insert forcing `organisation_verified: true` (comment marks
  it "TEMPORARILY DISABLED"). `OrganisationVerificationNotice.jsx`/`VerifyOrganisation.jsx`
  still exist as dead-in-practice code paths.
- Several other onboarding-adjacent pages coexist without a fully traced single flow
  (`PlatformAccountSetup.jsx`, `RoleSelection.jsx`, `ProjectTypeSelection.jsx`,
  `TrialProjectSetup.jsx`/`PaidProjectSetup.jsx`, `PlatformChoice.jsx`) — audit-only finding,
  not yet resolved into a canonical single path.
- `accounts` (`v84_accounts_and_extensions.sql` + `v109`) has no industry/sector/vertical
  column — only `metadata` JSONB. No organisation-membership table; a single `owner_user_id`
  per account is the only org-level link. `account_type` (individual/company/enterprise/
  educational/non_profit) is a distinct, separate concept from industry.

**Roles & permissions**
- `roles` + `permissions` + `user_roles` + `role_permissions` (+ `permission_categories`,
  `role_permission_sets`) is the org/system-level RBAC system. `project_roles` +
  `project_memberships` is the project-scoped equivalent (role_level 4-12 scale — a different
  scale from `roles.role_level`'s 5-100, a fact discovered earlier this session). `role_menu_items`
  is the sole determinant of sidebar access, keyed to `roles.id`.
- Two other, unrelated "role" concepts exist and must not be confused with security roles:
  `team_functional_roles` (RACI-style labels) and `stakeholder_roles` (stakeholder-register
  taxonomy) — neither is wired to `role_menu_items` or permissions.
- No `professional_role` concept exists anywhere in the schema today.

**Feature entitlements**
- `subscription_plans.features` is free-text marketing copy, synced from `member_limit`/
  `project_limit` — not a gating mechanism. `admin.feature_flags` (Admin schema) exists but is
  unreferenced in Platform/Simulator source. No `industry_pack`/`capability`/`entitlement` table
  exists in either the monorepo or the Admin app today.

**Reusable assets directly relevant to this feature**
- `industry_categories` (10 rows) + `roles.industry_category_id`/`project_roles.
  industry_category_id` (v906) — the closest existing thing to an "industry pack": 100 built-in
  roles are already industry-tagged, each with its own curated `role_menu_items` grants.
- `org_menu_bundles`/`org_menu_bundle_items` (v914, this session) — a named, reusable set of
  existing menu items, currently org-scoped. Conceptually close to what the brief calls an
  "Industry Capability Pack" (§9) — worth evaluating as a reuse candidate before inventing a
  parallel `industry_packs`/`industry_pack_menu_items` structure.
- `pmo_industry_templates` (+ phases/activities/deliverables/risks/milestones/roles, 40+
  industries seeded) — an existing, disconnected industry-template catalog that section 42's
  "Industry Templates & Reference Data" concept may be able to reuse rather than duplicate.
- `getIndustryCategories()` (`organisationCustomRoleService.js`) — already-built service
  function for fetching the real industry list; the registration form should call this instead
  of its own hardcoded array.

**Preliminary conflict/duplication flags** (to be finalized once implementation decisions are
made, not acted on yet):
| Area | Current state | Conflict | Risk |
|---|---|---|---|
| Industry taxonomy | Two disconnected lists (registration's 11-item array vs `industry_categories`' 10 rows) | Direct duplication, different values | Low to fix — swap the form's data source |
| Professional vs security role | Conflated (job_title overwritten by role display name) | Violates brief's core rule; already live in prod | Medium — touches invitation acceptance, a working path |
| Industry templates vs industry packs | `pmo_industry_templates` (project scope) vs proposed `industry_packs` (org/menu scope) | Not yet a conflict — different scopes — but must be deliberately reconciled, not left to drift | Low if scoped correctly in the plan |
| Menu category placement | Regex-based re-inference, not pure `parent_menu_id` trust | Existing fragility, not caused by this feature, but this feature adds more menu items that must survive it | Medium — proven to bite (this session's Menu Bundles incident) |
| Menu Bundles vs Industry Packs | v914 bundles are org-scoped only | Potential reuse vs duplication depending on interview outcome | To be resolved in interview |

## d) Implementation decisions

(Resolved via interview — 15 questions, one at a time.)

1. **Multi-industry accounts**: an organisation can select multiple industries, not just one.
   Requires a join table (`account_industries` or equivalent), not a single FK column.
2. **One primary + N secondary industries**: one industry is flagged primary (drives onboarding
   copy, default project template suggestion via inheritance — decision 12). All selected
   industries (primary + secondary) union together for role suggestions and menu/capability
   availability — secondary industries are not second-class for access purposes.
3. **Industry changes**: PMO Admin/account owner can add/remove secondary industries and change
   the primary at any time via Organisation Settings, no approval workflow. Removing an industry
   never destructively cleans up already-assigned roles/data — it only stops appearing in future
   suggestions.
4. **Professional Role / Security Role separation (closes an already-live conflation)**: add a
   `professional_role` field (Project Manager, PMO Professional, Programme Manager, Portfolio
   Manager, Project Administrator, Team Member, Other), purely informational, never checked by
   any authorization/RLS logic. Stop the `accept-invitation` edge function from overwriting
   `users.job_title` with the security role's `role_display_name` — job_title becomes genuinely
   free-text profile info. **Invited users are also asked for professional_role** during
   invitation acceptance, not just the founder — same field, same options, for every user
   regardless of how they joined.
5. **Sub-industries (`industry_segments`) are in scope now**, not deferred — optional field,
   Admin-governed, per-industry sub-lists (e.g. Banking → Retail Banking/Corporate Banking/
   FinTech).
6. **Industry Pack assignment is automatic and immediate** — selecting/adding an industry
   provisions its pack right away, no separate Admin approval/activation step.
7. **Organisation capability toggling**: a PMO Admin can DISABLE a capability their industry
   pack provides (self-service, no risk). They CANNOT enable a capability outside their
   assigned industries' packs from this screen — that requires adding the industry itself
   (already free per decision 3) or a future paid add-on. No standalone "enable anything"
   toggle surface.
8. **Industry packs are free for this phase** — available to any organisation on any
   subscription tier, including trial. The schema keeps pack assignment as its own table
   (separate from `subscription_plans`) so a future "this pack requires Business tier" rule can
   be layered on without a redesign — no pricing/tier logic is built now.
9. **Existing-tenant migration**: every organisation that exists before this ships gets
   `industry_category_id` (well, its `account_industries` row) backfilled to a "General Project
   Management" fallback category automatically — never guessing a real industry from the old
   disconnected `metadata.industry` value. A gentle, dismissible one-time prompt on next login
   invites them to pick a real industry via Organisation Settings; nothing is forced.
10. **Simulator scope**: Simulator's own sidebar (`sim_pmo`/`sim_pm` layouts) resolves
    industry-relevant menus through the same mechanism as Platform (shared `accounts` data, no
    separate Simulator registration/industry UI needed — Platform and Simulator already share
    the same `public.accounts` table). No industry-filtered scenario library, no
    industry-specific simulation packs, and no learning-path changes in this phase.
11. **Menu resolution mechanism — the central technical decision**: implement the brief's
    formula literally as a **new runtime layer in `useMenu.js`**: resolve the org's available
    menu-item set (core + generic PM + industry pack(s) + org overrides) and intersect it with
    the existing role-grant check (`role_menu_items`) on every load — not a provisioning-time
    grant into `role_menu_items` (the lower-risk alternative that was offered and explicitly
    declined). This is explicitly acknowledged as the higher-risk path: the audit found the
    existing pipeline (`applyRoleSidebarRevamp` → `pmoMenuHierarchyUtils.js`) already fragile
    (regex-based category placement across 4 layouts, a real incident this session). The
    implementation plan must phase this carefully — behind a flag, with strong regression test
    coverage, and a clear rollback path — precisely because of that fragility, not despite it.
12. **Admin pack-update propagation**: when a Nidus Admin edits an existing industry pack's menu
    items, the change applies immediately to every organisation already on that industry —
    consistent with decision 11's live-resolution model (no snapshot/versioning concept needed).
13. **Cache invalidation**: the acting admin's own session gets a forced refresh after an
    industry/pack/capability change so they see the result immediately. Other org members catch
    up within the existing 10-minute stale-while-revalidate TTL (`menuCacheUtils.js`) — the same
    eventual-consistency trade-off the app already accepts today for ordinary `role_menu_items`
    edits. No new real-time infrastructure (Supabase Realtime) introduced for this.
14. **Project industry inheritance**: a new project inherits the org's PRIMARY industry only
    (not the full set) — keeps a project conceptually single-industry, matching how project
    templates/menus are already structured. No project-level industry override in this phase.
15. **`pmo_industry_templates` reconciliation is explicitly deferred** to a separate later pass
    — this initiative does not add an `industry_category_id` FK to it or build the ~40-code
    mapping. First-project creation continues to work exactly as it does today; nothing
    regresses. (Documented here so it isn't lost, per rule 21's separate-guide-per-topic
    convention, once that follow-up is scoped.)
16. **Registration UX**: rebuild `OrganisationSetup.jsx`'s single-page form as the brief's
    multi-step wizard (Account → Organisation → Industry (+sub-industry, primary flag) →
    Professional Role → Verify → Workspace Setup) — the fuller rebuild, not an incremental
    extension of the existing single page. Given the scale already accumulated in decisions
    1-15, this is the largest additional risk surface in the plan and gets its own careful
    vertical slice with explicit regression coverage of the existing registration path.

## e) Testing decisions

Per brief §46/§47, at minimum:
- **Registration**: valid multi-industry selection incl. primary flag persists correctly;
  inactive industries never listed; sub-industry optional and correctly scoped to its parent
  industry; retry/browser-refresh does not duplicate the organisation or its provisioning rows.
- **Authorization**: an ordinary (non-admin) org member cannot change the org's industries or
  capability configuration; a forged `professional_role` value cannot elevate authorization
  (it's never read by any authorization check — test that directly); a forged industry/pack id
  cannot enable a premium/ungranted feature; direct RPC/route access is independently tested
  from sidebar visibility (a hidden menu item is never the only guard).
- **Tenant isolation (RLS, every new tenant-owned table)**: Tenant A cannot SELECT/INSERT/
  UPDATE/DELETE Tenant B's `account_industries`, capability-configuration, or pack-assignment
  rows. Explicit cross-tenant test matrix per new table, not just "SELECT works."
- **Provisioning idempotency**: registration retry, verification-callback repeat, and
  browser-refresh-mid-provisioning must not create duplicate `account_industries` or
  role-grant rows — unique constraints/upserts, not client-side dedup.
- **Menu resolution (the new runtime layer, decision 11)**: generic PM items always present;
  industry-pack items present only when the org has that industry; org-disabled items excluded
  even though the pack provides them; role permissions still gate visibility on top of org
  availability (an org having a capability doesn't mean every role sees it); inactive/deleted
  menu items never appear regardless of pack membership.
- **Existing-tenant compatibility**: pre-existing organisations log in, see their existing
  projects, existing menus, and existing subscription state unchanged after the backfill
  (decision 9) — this is a regression suite, not new-feature testing.
- **UI**: dark/light mode, PWA/mobile, unsaved-changes guard on the new wizard steps, loading/
  error/success states throughout.

## f) Out-of-scope items

- Separate applications or codebases per industry (explicitly forbidden by the brief).
- Industry-specific duplicates of generic PM modules — industry behaviour extends/configures
  the shared capability, never forks it.
- Subscription-tier gating of industry packs (decision 8 — free for this phase; architecture
  allows it later without redesign).
- `pmo_industry_templates` ↔ `industry_categories` reconciliation (decision 15 — separate pass).
- Simulator scenario/learning-path industry tagging (decision 10 — sidebar resolution only).
- Project-level industry override (decision 14 — org primary industry only, for now).
- Real-time (Supabase Realtime) cache invalidation (decision 13 — existing TTL model instead).
- Any pricing/commercial-tier redesign.
- Cross-tenant/SaaS-operator reporting dashboards (brief §43 — future, not this initiative).

## g) Further notes

- This PRD follows `Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md`'s mandated
  sequence: audit (done, summarized above) → PRD (this file) → one-question-at-a-time interview
  (done — 16 questions, section d) → versioned implementation plan → user approval →
  incremental vertical-slice implementation.
- The brief lists 20 required interview questions (§45). Several were tightly coupled (e.g.
  "can an org have multiple industries" gated "does industry change need approval" gated "what
  happens to industry-specific data on change") — the interview grouped them by dependency
  rather than asking all 20 verbatim in brief order. A handful of the 20 (which professional
  roles appear at registration; what the first registrant's system role is; which Admin roles
  manage industries/packs; the exact onboarding route path) were resolved directly from the
  brief's own stated defaults or existing codebase patterns rather than asked, per rule 59
  ("if a fact can be found by exploring the codebase, look it up rather than asking").
- **User consistently chose the fuller/higher-scope option** at every either/or branch in this
  interview (multiple industries over one, sub-industries now over deferred, the live
  runtime-resolution layer over provisioning-time grants, the full wizard rebuild over an
  incremental form extension). The plan below sizes vertical slices accordingly and puts extra
  weight on regression coverage for decision 11 and decision 16 specifically, since those two
  are the highest-risk pieces (an already-fragile live pipeline, and a rewrite of a working
  registration path) rather than assuming "more thorough" also means "lower risk."
- Next SQL version is **v918** (v917 already exists from the Menu Bundles feature). PRD/plan
  anchor version is **v918**.
