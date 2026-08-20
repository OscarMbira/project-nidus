# v918 SaaS Industry-Aware Tenant Provisioning — Manual Test Guide

Phase 10 of `projectplan/v918_saas_industry_tenant_provisioning_plan.md`. This environment has
no live database or browser access, so the automated coverage this session could add is limited
to pure JS/TS unit logic (listed below) — everything else here is a manual checklist for you to
run once the SQL has been applied. Do not skip this file as "just docs" — it's the actual test
plan for the phases that can't be automated from here.

## 0. Automated coverage already in place (this session)

- `packages/config/src/__tests__/pmoMenuHierarchyUtils.test.js` — 44/44, including the new
  "Manage Menu Bundles" (v914) and "Industries & Capabilities" (v918/Phase 7) category-mapping
  regression tests.
- `apps/{platform,simulator}/src/hooks/__tests__/applyOrgMenuAvailabilityFilter.test.js` — 6/6
  each, pure fail-open filter logic extracted from `useMenu.js`/`useSimMenu.js`.
- `apps/{platform,simulator}/src/pages/auth/__tests__/InvitationAccept.test.jsx` — 31/31 each,
  including 2 new v918 tests (job_title never set from role; professional role save fires).
- `packages/shared/src/utils/__tests__/invitationInviteeFormat.test.js` — 13/13, including the
  new "never sets job_title from role_display_name" regression test.
- `apps/{platform,simulator}/src/services/__tests__/organisationCustomRoleService.test.js` +
  `organisationService.test.js` — 45/45 each, unaffected by the new exports added this session.

None of this substitutes for the manual checks below — it only covers pure functions and
already-mocked component behavior, not real RPC/RLS/auth behavior against a live database.

## 1. Prerequisite SQL (run in this order, Supabase SQL editor)

| # | File | Repo |
|---|---|---|
| 1 | `v925_stop_invitation_accept_job_title_overwrite.sql` | project-nidus |
| 2 | `v926_organisation_capability_toggle_rpc.sql` | project-nidus |
| 3 | `v927_organisation_industries_menu.sql` | project-nidus |
| 4 | `v928_sim_organisation_industries_menu.sql` | project-nidus |
| 5 | `v208_industry_reference_admin_rpcs.sql` | project-nidus-admin |
| 6 | `v209_industry_reference_admin_nav.sql` | project-nidus-admin |

(`v918`–`v924` were already confirmed run before Phase 5 began.)

## 2. Registration flow (Phase 5)

1. Sign up a brand-new account (Platform). Confirm you land on **Your Organisation**
   (`onboarding/organisation-setup`) with no `industry` field (old hardcoded list is gone).
2. Submit → **Industry** step. Select 2+ industries, mark one primary, confirm the optional
   sub-industry dropdown appears only for industries that actually have segments.
3. Submit → **Professional Role** step. Confirm the list is DB-driven (matches
   `professional_roles` rows, not a hardcoded array).
4. Submit → **Verify** step. Confirm the summary matches everything entered; industry names
   resolve correctly (not raw UUIDs).
5. Confirm → **Workspace Setup**. Confirm a spinner appears, then the success modal, then
   redirect to `/platform/getting-started`.
6. In Supabase, confirm: one `accounts` row (not two), `account_industries` rows matching your
   selection with exactly one `is_primary = true`, `users.professional_role_id` set,
   `tenant_provisioning_log` has one `'complete'`/`'completed'` row for this account.
7. **Retry safety**: on the Workspace Setup screen, if you can force a failure (e.g. disconnect
   network mid-request), confirm clicking Retry does not create a second `accounts` row.
8. Repeat steps 1-6 for Simulator's registration entry point — same shared `public` schema
   flow, same end state expected.

## 3. Invitation flow (Phase 6)

1. Invite a new user to a project/org. Accept as a brand-new user (password + optional
   Professional Role picker visible).
2. Confirm `users.job_title` is **NOT** set to the invited role's display name (was the bug;
   should now be `NULL` unless the user had one already).
3. If you selected a professional role on the accept screen, confirm
   `users.professional_role_id` is set; if you left it blank, confirm nothing was written.
4. Repeat as an **already-registered** user accepting a second invitation (Authenticated and
   Registered-but-signed-out panels) — same job_title-untouched behavior, same optional role
   picker.
5. Confirm the invited user still lands in the correct project/org with the correct security
   role — this part of the flow was NOT touched and should be unchanged.

## 4. Organisation Settings — Industries & Capabilities (Phase 7)

1. As an org admin, open **Industries & Capabilities**
   (`admin/organisation-industries` / `simulator/pmo/organisation-industries`).
2. Confirm your org's current industries/primary/segments are pre-loaded correctly.
3. Change the selection, click **Save Industries** — confirm the success modal, and that
   `account_industries` reflects the new selection (old ones removed, new ones added, primary
   flag correct).
4. In **Modules & Capabilities**, toggle a menu item off — confirm an
   `organisation_disabled_capabilities` row appears immediately (no separate save step). Toggle
   it back on — confirm the row is removed.
5. As a **non-admin** org member, confirm the page still loads (read-only) but Save/toggle
   controls are disabled or the amber "view only" banner shows.

## 5. Admin CRUD (Phase 8)

For each of Professional Roles, Industry Categories, Industry Segments, Industry Packs:

1. List page loads, search filters correctly, sort is alphabetical by default.
2. Create a new row — confirm it appears in `public.<table>` with correct values and
   `created_by`/`created_at` populated (where the table has those columns).
3. Edit — confirm only changed fields update, `updated_at`/`updated_by` refresh.
4. Deactivate (the "Delete" icon) — confirm `is_active` flips to `false`, the row is **not**
   removed from the table, and it still shows (as inactive) in the list.
5. Confirm the audit tab shows correct Identity/Classification/Record history for a saved row,
   and the "appears after this record is saved" placeholder for a new unsaved one.
6. As a user **without** `system.industries.edit` (but with `.view`), confirm Create/Edit/
   Deactivate controls are hidden/disabled but the list and detail pages still load.
7. **Industry Pack menu-item picker specifically**: create a pack, save it, then open Edit —
   confirm the picker is now available, search filters `public.menu_items` correctly, saving
   selections writes the exact diff to `industry_pack_menu_items` (add the ones you newly
   checked, remove the ones you unchecked, leave the rest alone).

## 6. Menu resolution (Phase 4 + Phase 10) — requires flipping a flag first

**`INDUSTRY_MENU_AVAILABILITY_ENABLED` is still `false`** in both
`apps/platform/src/hooks/useMenu.js` and `apps/simulator/src/hooks/useMenu.js` — this was a
deliberate safety gate from Phase 4 and was never flipped on during this session (a decision
affecting every user's sidebar rendering shouldn't happen without an explicit go-ahead once
you've verified everything above works). To test this phase:

1. Set the flag to `true` in **both** files.
2. As an org with industry X selected, confirm the sidebar still shows every item it showed
   before (Generic PM + industry X's pack + anything never classified into any pack — fail-open).
3. In Organisation Settings, disable a specific capability that's actually in industry X's pack
   and currently visible. Reload the sidebar — confirm that specific item disappears.
4. Re-enable it — confirm it reappears.
5. Confirm an item that was **never** classified into any `industry_pack_menu_items` row (most
   of the menu tree, per the seed's own scope) is **always** visible regardless of industry
   selection or capability toggles — this is the fail-open guarantee and the single most
   important property of `get_account_available_menu_item_ids` (v924).
6. Confirm a role that doesn't grant a given item still doesn't see it, even if the org's
   industry pack includes it — role grants and org availability are independent AND-ed filters,
   this layer only narrows, never expands, what the role already grants.
7. Simulate an RPC failure (e.g. temporarily revoke EXECUTE, or block the network call) and
   confirm the sidebar falls back to showing the unfiltered role-granted set rather than
   erroring or going blank.
8. Once satisfied, decide explicitly whether to leave the flag `true` (feature live) or set it
   back to `false` — don't leave it in whatever state a test session happens to end in.

## 7. Existing-tenant compatibility

1. Pick an account created **before** v918 (or any account that only has the v922 backfill
   Cross-Industry row, no explicit industry selection).
2. Confirm its sidebar is unaffected — with the flag off, byte-identical to before this
   initiative; with the flag on, it should still see everything it saw before (Cross-Industry's
   Generic PM pack is unconditional, and most items are unclassified/fail-open).

## 8. Tenant isolation / RLS cross-tenant matrix

For each of `account_industries`, `organisation_disabled_capabilities`,
`tenant_provisioning_log`, using two different organisations' logged-in sessions (or the
Supabase SQL editor impersonating two different `auth.uid()` values):

| Table | Expected read scope | Expected write path |
|---|---|---|
| `account_industries` | Broad authenticated read today (no membership table to scope tighter — documented in v918's own RLS notes) — confirm this is still the accepted trade-off, not a surprise | Only via `provision_organisation_tenant()`; confirm a direct client `INSERT`/`UPDATE`/`DELETE` is rejected by RLS |
| `organisation_disabled_capabilities` | SELECT only, broad authenticated | Only via `toggle_organisation_capability()`; confirm direct client writes are rejected |
| `tenant_provisioning_log` | Gated by `user_can_manage_org_roles()` — confirm a user from Org B **cannot** see Org A's log rows | Written only by `provision_organisation_tenant()` itself |

Also confirm directly: calling `provision_organisation_tenant()` or
`toggle_organisation_capability()` with someone **else's** `p_account_id` (an account you're not
the owner of and don't have `user_can_manage_org_roles` on) raises the permission-denied
exception — this is the authorization test the PRD's testing section calls out explicitly
("a forged `professional_role` value cannot elevate authorization... direct RPC/route access is
independently tested").

## 9. UI states

For each new page (registration wizard steps, Organisation Settings, all 8 Admin CRUD pages):
loading state, empty state (no rows / no industries selected yet), error state (simulate an RPC
failure), and the theme toggle (light/dark) — confirm no dark-only or light-only surfaces.
