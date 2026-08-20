# v910 — System Role Catalog Management PRD

## a) Problem statement

Built-in project roles (the original 10 plus the 38 industry roles from v906/v907) are shared
reference data — `project_roles`/`roles` rows with `account_id IS NULL`, visible and clonable by
every organisation on the platform. `ManageRoles.jsx` deliberately labels them "cannot be
modified," because any org-level admin editing one would silently change what every *other*
organisation sees too. That's correct for org-level admins, but it leaves no way to fix a typo, a
wrong industry tag, or a stale menu grant in the shared catalog without a manual SQL migration —
exactly the kind of one-off Nidus-team SQL change the original v902 custom-roles feature was built
to eliminate for org-scoped roles.

## b) Solution

A new, narrowly-gated **System Role Catalog** admin surface, visible only to `system_admin`/
`super_admin` (never `pmo_admin` or any org-scoped tier), living under System Administration —
separate from the org-scoped Manage Roles page, so a regular PMO Admin's experience is completely
unchanged. From there, a system admin can edit any built-in role's display name, description,
industry category, `role_level`, and governance-only flag, and add/remove its sidebar menu grants
— everything Custom Roles already support, except `role_name` (other code matches roles by that
internal slug, so it stays fixed). No deactivate/delete — built-in roles may already be assigned to
real users across many organisations, so removal stays out of scope; only reversible field edits.

## c) User stories

1. As a `system_admin`, I see "System Role Catalog" under System Administration in the sidebar —
   `pmo_admin` and org-scoped tiers never see this menu item.
2. As a `system_admin`, I see the same 48 built-in roles (searchable, sortable, industry-filterable
   — matching the existing Built-in Roles table pattern) with an Edit action per row.
3. As a `system_admin`, I can edit a built-in role's display name, description, industry category,
   level, and governance-only flag, and add/remove its menu grants — the same field set and menu-
   grant checklist UI Custom Roles already use.
4. As a `system_admin`, I cannot change a built-in role's internal `role_name`, deactivate it, or
   delete it from this page.
5. As a PMO Admin (or any other role) without `system_admin`/`super_admin`, navigating directly to
   a System Role Catalog URL is refused — Manage Roles' existing "cannot be modified" built-in
   table is completely unaffected by this change.
6. As a `system_admin` in the Simulator app, System Role Catalog behaves identically to Platform
   (shared `public.project_roles`/`roles` infrastructure).

## d) Implementation decisions

(Resolved via interview.)

1. **Who**: `system_admin`/`super_admin` only — not `pmo_admin`, not any of the 5 org-scoped
   creator tiers that manage their own org's custom roles.
2. **Editable fields**: everything Custom Roles support (display name, description, industry
   category, level, governance-only flag, menu grants) except `role_name`.
3. **No deactivate/delete** for built-ins from this surface — edit only.
4. **UI placement**: a separate System Administration page/route, not folded into the existing
   `ManageRoles.jsx`/`OrgRoleDetail.jsx` pair — regular PMO Admin's Manage Roles experience is
   untouched by this change.
5. **Platform–Simulator parity** applies (rule 34.1) — same feature, same routes shape, in both
   apps.

## e) Testing decisions

- Unit tests for the new RPC's authorization check (system_admin/super_admin passes, every other
  role — including pmo_admin — is rejected) via the JS service wrapper.
- Unit tests confirming the wrapper sends the right fields and omits `role_name`.

## f) Out-of-scope items

- Deactivate/delete for built-in roles.
- Editing `role_name`.
- Any change to the org-scoped Manage Roles page's existing "cannot be modified" built-in table.
- A field-level change history/audit log (same standing exclusion as rule 63.1).

## g) Further notes

- Next SQL version is **v910** (v909 already exists from the v906 project).
- Reuses the same field set and menu-grant checklist UX already built for Custom Roles — no new UI
  pattern to design, just a differently-gated surface pointed at `account_id IS NULL` rows.
