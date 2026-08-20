# v914 — Menu Bundles PRD

## a) Problem statement

Creating a custom role today means checking sidebar menu items one at a time in
`OrgRoleDetail.jsx`'s picker — every time, from scratch, even when an org repeatedly creates
similar lower-tier roles that need the same handful of sections (e.g. a standard "field team"
access pattern reused across several Team Member-style roles). There's no way to save a chosen
set of menu items once and reuse it, so admins either re-click the same 10-15 checkboxes
repeatedly or accept role-to-role drift as different admins hand-pick slightly different sets
for what's meant to be the same access level. Menu items themselves stay entirely
system-defined (rule 25.1/26 — no user-created menu items), but *which existing items go
together* for a given tier is exactly the kind of reusable, organisation-specific grouping the
role-creation flow currently has no way to save.

## b) Solution

A new **Menu Bundle** entity: a named, organisation-scoped, reusable set of *existing* menu
item references (never new menu items — bundles only ever point at rows already in
`menu_items`). Bundles get their own full CRUD surface — **Manage Menu Bundles** — sibling of
Manage Roles under People & Resources in the sidebar (Platform + Simulator), built by the same
admin population that manages custom roles today. The Create/Edit Role form gains a "Start from
a bundle" quick-fill dropdown above the existing menu picker: picking a bundle checks all of its
items in the picker below, and the admin can still freely add or remove individual items
afterward — attaching a bundle is a shortcut into the same picker, not a separate locked mode.
A role's grants are a one-time copy of whatever was checked at save time; editing a bundle later
never changes roles already built from it. This directly reuses the picker + cascading-section +
revisitable-preview UI already built and hardened this session for `OrgRoleDetail.jsx` — Menu
Bundles introduce a new place to save/load a *selection*, not a new way to pick one.

## c) User stories

1. As an admin who can manage custom roles (pmo_admin + the 4 project-manager tiers, same
   population as Manage Roles), I see "Manage Menu Bundles" under People & Resources in the
   sidebar.
2. As that admin, I see a searchable, sortable list of my organisation's Menu Bundles (name,
   description, item count) with Create/View/Edit/Delete actions — same list conventions as
   every other register in this app (rules 40/41/44).
3. As that admin, I can create a new bundle: name, optional description, and the exact same
   menu-item picker (with section cascade and revisitable preview) used on Create Role.
4. As that admin, creating or saving a bundle shows the standard success confirmation modal with
   the bundle's name and operation performed (rule 16).
5. As that admin, I can view a bundle's full details (Details tab) and its Audit details tab
   (rule 63.1 — Identity/Classification/Record history cards).
6. As that admin, I can edit an existing bundle's name, description, and item selection
   (add/remove), or soft-delete it — deleting only removes it from future "Start from a bundle"
   pickers; it never touches roles already created by attaching it.
7. As that admin, on the Create Role form, I see a "Start from a bundle (optional)" dropdown
   above the "Sidebar menu access" picker. Selecting a bundle checks all of its items in the
   picker below; I can still check/uncheck anything else before saving. Not selecting a bundle
   changes nothing about today's flow.
8. As that admin, on the Edit Role form, I now have the same full picker (with the same
   "Start from a bundle" dropdown) that Create Role has — not just the current remove-only
   checklist — so I can add items (via a bundle or by hand) to an existing custom role, not only
   remove them.
9. As that admin, two different organisations can each have their own bundle named the same
   thing (e.g. two orgs both naming one "Site Team Access") without conflict — bundle names are
   unique per organisation, not global.
10. As that admin in the Simulator app, Manage Menu Bundles and the Create/Edit Role
    integration behave identically to Platform (rule 34.1 parity).

## d) Implementation decisions

(Resolved via interview.)

1. **Terminology**: "Menu Bundle" (avoids collision with the existing "template" vocabulary
   used by invitation/form templates elsewhere in the codebase).
2. **Snapshot, not live link**: attaching a bundle to a role copies its items into the role's
   grants at save time. Editing a bundle afterward never retroactively changes any role already
   created from it. No dependency tracking between roles and the bundles they were built from.
3. **Union, not exclusive**: "Start from a bundle" pre-fills the existing picker's selection;
   the admin can still hand-pick additional items or uncheck bundle items before saving. Bundle
   attach and individual picking are the same underlying selection, not two competing modes.
4. **Same admin population as Manage Roles**: reuses `user_can_manage_org_roles()` as-is for all
   bundle CRUD authorization — no new authorization function.
5. **Full CRUD surface**: `ManageMenuBundles.jsx` (list) + `MenuBundleDetail.jsx`
   (create/view/edit, non-modal per rule 65, friendly-URL by slug per rule 16.3) — mirrors
   `ManageRoles.jsx`/`OrgRoleDetail.jsx` exactly, including reusing the extracted picker/preview
   component.
6. **Soft delete, no retroactive effect**: `is_active`/`is_deleted` flags, consistent with every
   other table in this schema. Since bundle→role is a one-time copy (decision 2), deleting a
   bundle has no effect on any role already built from it — it only disappears from future
   "Start from a bundle" dropdowns.
7. **Reuse the exact picker/preview component**: the category-cascade-select +
   always-revisitable-preview UI just built and fixed in `OrgRoleDetail.jsx` gets extracted into
   a shared component (`MenuItemPicker` — exact name TBD at implementation time) used by both
   Create/Edit Role and Create/Edit Menu Bundle. No new picker logic; both surfaces inherit any
   future fix to it automatically.
8. **Name uniqueness is per-organisation**, not global — matches how custom role names
   (`project_roles`, account-scoped) already work. Two unrelated orgs can each have a bundle
   with the same name.
9. **Attach UI is a dropdown above the picker**, not a separate tab — "Start from a bundle
   (optional)" always sits above "Sidebar menu access" on both Create and Edit Role; there is no
   mode toggle to switch between "individual" and "bundle" views.
10. **Available on both Create and Edit Role** — not create-only. This extends the existing
    Edit Role menu-grants UI from remove-only (v902 PRD decision 3) to the same full add+remove
    picker Create Role uses, including the bundle-attach dropdown. This supersedes that specific
    part of the v902 decision; nothing else about v902's edit-mode scope changes.
11. **Edit mode becomes fully add+remove capable**, matching Create mode's menu section exactly
    — not a narrower "bundle-attach only" affordance. One shared menu-editing block serves both
    modes.

## e) Testing decisions

- Unit tests for the new `organisationMenuBundleService.js` (Platform + Simulator, byte-identical
  except no per-app path constants are expected here since this service has none — verify during
  implementation), covering: create/update/delete bundle wrappers, list/get wrappers, and the
  authorization check reuse.
- Unit tests for the extracted picker/preview component's selection logic (cascade-select,
  duplicate-category-row resolution, bundle pre-fill union behavior) — the existing
  `organisationCustomRoleService.test.js` coverage for `getGrantableMenuItems()` continues to
  apply unchanged since that function isn't moving.
- No live-DB verification available in this environment (no `SUPABASE_DB_URL`/service-role key)
  — SQL correctness is verified by careful review and the user running each file manually in the
  Supabase SQL editor, same as every other feature this session.

## f) Out-of-scope items

- Creating brand-new menu items through this feature — bundles only ever reference existing
  `menu_items` rows (rule 25.1/26).
- Live-linked bundles that retroactively update roles when edited (decision 2).
- Cross-organisation bundle sharing or a platform-wide bundle library.
- A field-level change history/audit log for bundles (same standing exclusion as rule 63.1).
- Any change to how the sidebar itself resolves a role's menu access at render time
  (`useMenu.js`) — bundles only affect what gets written into `role_menu_items` at role-save
  time, never how it's read.

## g) Further notes

- Next SQL version is **v914** (v913 already exists from the v906/v913 industry-role-catalog
  project). This feature's SQL is expected to span v914 (schema) through roughly v917
  (Platform menu + Simulator menu), matching the v902→v904 shape used for the original Manage
  Roles feature.
- Extracting the picker/preview component out of `OrgRoleDetail.jsx` touches a file that was
  heavily iterated on this session (cascade-select, duplicate-category-row fix,
  always-visible preview checkboxes) — the extraction must be a pure move with no behavior
  change, verified by re-running the existing `organisationCustomRoleService.test.js` suite
  (unaffected, since that file only tests the service layer) plus a manual smoke test of
  Create Role after the extraction.
