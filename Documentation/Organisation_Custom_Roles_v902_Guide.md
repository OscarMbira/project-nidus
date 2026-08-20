# Organisation Custom Roles (v902) — User Guide

## What this is

Every organisation on the platform previously had to use one of the fixed, built-in roles
(Project Manager, Team Manager, Change Authority, and so on). "Manage Roles" lets your
organisation define its **own** roles — for example "Regional Delivery Lead" or "Site
Coordinator" — by cloning an existing role's permissions and sidebar access, then tweaking
the name, description, and a few menu items.

A custom role you create is **organisation-wide**: once created, it's selectable when
inviting or assigning anyone to **any** project in your organisation, exactly like the
built-in roles. It is never visible to, or usable by, any other organisation.

## Who can create roles

Any of the following (system-wide, or on any project in your organisation) can create, edit,
deactivate, or delete your organisation's custom roles:

- PMO Admin
- Portfolio Manager
- Programme Manager
- Project Manager
- Team Manager

Anyone else can still see the list of roles (read-only) but won't see Create/Edit/Delete
controls.

## Where to find it

Sidebar → **People & Resources → Manage Roles** (right next to **Assign Roles**).

## Creating a role

1. Click **Create Role**.
2. Choose a **Clone from** role — pick the built-in or existing custom role that's closest to
   what you need. This copies its permission level and its full sidebar menu access as a
   starting point, so the new role is never accidentally "empty."
3. Give it a name and (optional) description.
4. Optionally check **Oversight-only** if this role should land on the read-only Governance
   Dashboard instead of the normal operational dashboard — the same treatment Board Member,
   Sponsor, and Portfolio Manager already get.
5. Review the menu access list copied from the clone source and uncheck anything this role
   shouldn't have.
6. Click **Create Role**.

The new role is now selectable anywhere in your organisation you'd normally pick a role —
project invitations, "Add Users," member management, and so on.

## Editing, deactivating, and deleting

- **Edit**: change the name, description, oversight flag, or remove some of its current menu
  items. (To add access beyond what was originally cloned, edit again — there's no way to
  browse and add arbitrary menu items from scratch in this version.)
- **Deactivate**: hides the role from future assignment. Anyone already holding it keeps their
  access — nothing changes for them.
- **Delete**: only possible while nobody currently holds the role. If it's in use, you'll be
  told how many members hold it — reassign or deactivate first.

Built-in roles can never be edited, deactivated, or deleted.

## What's not in this version

- No full custom permission/menu builder from a blank slate — every custom role starts from an
  existing one.
- No per-project custom roles (org-wide only, for now).
- A role's internal name (used behind the scenes) is fixed at creation — only the display name,
  description, and access can change afterward.

See `projectprd/v902_organisation_custom_roles_PRD.md` and
`projectplan/v902_organisation_custom_roles_plan.md` for the full design record.
