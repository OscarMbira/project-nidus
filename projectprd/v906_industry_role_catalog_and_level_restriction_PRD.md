# v906 — Industry Role Catalog, Searchable Built-in Roles, and Level-Based Assignment Restriction PRD

## a) Problem statement

"Manage Roles" (v902/v903/v904) ships with only **10 built-in template roles** (`public.project_roles`
rows with `account_id IS NULL`, seeded in `SQL/v91_role_system_cleanup.sql` and
`SQL/v355_scope_management_plans.sql`): Project Board Member, Project Sponsor/Executive,
Programme Manager, Portfolio Manager, Project Manager, Team Manager, Project Assurance, Quality
Assurance, Change Authority, Team Member. These are generic PM-methodology roles and don't cover
the industry-specific titles real organisations actually use (e.g. a construction firm's "Site
Superintendent," a software team's "Scrum Master," a healthcare org's "Clinical Trial Manager").
Today an org has to clone one of the 10 generic roles and rename it manually for every
industry-specific title it needs.

Separately, the **Built-in Roles** section of the Manage Roles page (`ManageRoles.jsx`) displays
these 10 roles as a plain flex-wrapped badge cloud with no search, sort, or filtering — workable
at 10 items, not at 30-50.

Finally, every role-picker surface in the app (Assign Roles, invitations, bulk invite, edit-member-role)
currently shows the **full** role catalog to every assigner regardless of the assigner's own
seniority — a Team Manager can technically assign someone as Portfolio Manager. There's no
level-based guardrail.

## b) Solution

1. **Expand the built-in role catalog** with a curated, industry-tagged set of ~30-50 additional
   `project_roles` template rows (`account_id IS NULL`, `is_template = TRUE`), spanning roles
   common across ~9 industries (Construction & Engineering, IT/Software, Healthcare & Life
   Sciences, Manufacturing & Operations, Government & Public Sector, Financial Services,
   Marketing & Creative, Energy & Utilities, Education) plus a small Cross-Industry/Agile group.
   Each new role is tagged with an **industry category** via a new lookup table + FK column, and
   assigned a `role_level` that buckets it into one of the 9 existing seniority tiers (4-12), so it
   inherits that tier's existing sidebar menu-grant set through the same "matching `roles` row +
   `role_menu_items`" pattern the 10 originals already use — no per-role grant authoring.

2. **Convert Built-in Roles to a full table**, mirroring the existing Custom Roles table exactly:
   search bar, sortable columns (Name, Level, Dashboard type, Industry), Card/Table view toggle,
   row numbers, View action per row (read-only, no Edit/Delete) — plus an Industry filter dropdown
   sourced from the new lookup table.

3. **Level-based assignment restriction**: in every role-picker surface where a user assigns a
   role *to someone else*, only roles whose `role_level <= ` the assigner's own highest
   `role_level` are shown. Applied uniformly (no special-case bypass needed — PMO Admin/System
   Admin/Account Owner already sit at/above the top project-role level, so they naturally see
   everything). Rolled out to all 6 existing role-picker surfaces in one pass:
   `AssignRolesToProjects.jsx`, `RoleAssignment.jsx`, `SendRoleInvites.jsx`, `InviteUserForm.jsx`,
   `BulkInviteForm.jsx`, `EditMemberRoleModal.jsx`.

4. **Simulator parity**: wire Simulator's existing-but-unrouted `ManageRoles.jsx` +
   `RoleAssignment.jsx` into its routes and sidebar (a pre-existing gap noted in v904's SQL
   comments, not introduced by this change) so the expanded catalog, searchable table, and
   level-based restriction land identically in both apps — the underlying `public.project_roles`/
   `public.roles` tables are already shared infrastructure, so no `sim.*` schema duplication is
   needed for the data itself, only the route/menu wiring.

## c) User stories

1. As any user opening Manage Roles, I see the Built-in Roles section as a searchable, sortable
   table (matching Custom Roles' UI) instead of a badge cloud, with an Industry filter dropdown.
2. As a PMO Admin creating a custom role, I can choose an industry-specific built-in role (e.g.
   "Site Superintendent") as my clone source, not just one of the original 10 generic roles.
3. As a user assigning a role to someone else (Assign Roles, invitations, bulk invite, edit member
   role), I only see roles at or below my own role_level in the picker — I cannot accidentally
   assign someone a role more senior than my own.
4. As a PMO Admin (or System Admin/Account Owner), the level restriction never limits me in
   practice, since my role sits at/above every project-role tier.
5. As a Simulator user, I can reach Manage Roles from the Simulator sidebar (currently impossible
   — the page exists in code but has no route), and see the same expanded catalog, table, and
   restriction behaviour as Platform.
6. As a user filtering the Built-in Roles table by industry, I see only roles tagged with that
   industry category, sourced from a real DB lookup table (not a hardcoded list per rule 25.1).

## d) Implementation decisions

(Resolved via interview — see conversation for full reasoning on each.)

1. **Catalog size**: curated master list, ~30-50 new built-in roles (not exhaustive 100+, not a
   minimal generic-only expansion).
2. **Industry tagging**: new `public.industry_categories` lookup table (id, name, is_active) +
   nullable FK column on `project_roles` (and mirrored on `roles`, since the two tables carry
   matching rows per the v902 pattern). Matches the existing `countries`-style lookup convention.
3. **Default permissions/menu grants**: no per-role hand-authored grants. Each new role is bucketed
   into the closest matching one of the 9 existing seniority tiers (levels 4-12) and its paired
   `roles` row is granted the **same `role_menu_items` set** as that tier's original role (copied
   at seed time, not a live reference — so an org can later customise one industry role's grants
   independently via the existing edit flow without affecting the others).
4. **Role-picker restriction rule**: a user may assign any role whose `role_level <= ` their own
   highest held `role_level`. No special-cased bypass for admin tiers — it falls out naturally
   since those tiers already sit at/above the top project-role level.
5. **Rollout scope for the restriction**: applied now to all 6 existing role-picker surfaces
   (`AssignRolesToProjects`, `RoleAssignment`, `SendRoleInvites`, `InviteUserForm`,
   `BulkInviteForm`, `EditMemberRoleModal`), not opportunistically deferred.
6. **Built-in Roles UI**: full table mirroring Custom Roles (search, sort, Card/Table toggle, row
   numbers, View-only action), plus an Industry filter dropdown — not a lighter search-only
   treatment of the existing badge layout.
7. **Simulator**: wire up Simulator's already-written-but-unrouted Manage Roles/Role Assignment
   pages as part of this project, rather than leaving that pre-existing gap for later.
8. **Scope boundary vs. ask #3's other readings**: the "role dropdowns should filter/fetch based
   on the user role" ask was clarified specifically as the level-based **assignment restriction**
   (decision 4) — not a request to also make dropdowns searchable/typeahead, nor a request to
   audit for hardcoded role lists. Those remain out of scope for this project (see below).

## e) Testing decisions

- Unit tests for the new `role_level`-based filtering helper (given an assigner's roles, returns
  the correctly-scoped role list) covering: single role, multiple roles (use the highest), no
  roles, and the admin-tier-sees-everything case.
- Unit tests confirming each of the 6 role-picker surfaces calls the shared filtering helper
  rather than fetching/rendering the unfiltered role list directly.
- Seed-data validation: every new `project_roles` row has a matching `roles` row under the same
  `role_name`, an `industry_categories` FK, and at least one `role_menu_items` grant copied from
  its tier's source role.
- Manual verification: Built-in Roles table search/sort/filter/view-toggle behaves identically to
  Custom Roles; Industry filter narrows correctly; Simulator Manage Roles page loads and matches
  Platform's list.

## f) Out-of-scope items

- Making role-picker dropdowns searchable/typeahead (a separate UI improvement, not requested as
  part of this project once clarified — see decision 8).
- Auditing/fixing any dropdowns that might hardcode a static role list in JS instead of querying
  the DB (separate follow-up, not requested as part of this project — see decision 8).
- Per-project custom roles (still org-wide only, per the existing v902 scope decision).
- Field-level change history/audit log for role edits (already explicitly out of scope per rule
  63.1 system-wide).
- Running the pre-existing, already-written `SQL/v905_manage_roles_menu_grants.sql` (a PM-layout
  sidebar fix unrelated to this project's scope) — flagged as separate pending cleanup.

## g) Further notes

- **Proposed role catalog** (subject to your review/edits before implementation) — grouped by
  industry, with a recommended tier mapping to the existing 9 role_level values:

  | Level | Existing tier (grant source) | New roles at this tier |
  |---|---|---|
  | 11 | Project Sponsor/Executive | Construction Project Director, Government Programme Director |
  | 10 | Portfolio/Programme Manager | IT Programme Manager, Healthcare Programme Director, Manufacturing Programme Manager, Financial Programme Manager, Energy Programme Manager, Education Programme Director |
  | 9 | Project Manager | Product Owner, Clinical Trial Manager, Public Sector Project Manager, Marketing Programme Manager, Release Train Engineer |
  | 8 | Team Manager | Site Superintendent, Scrum Master, DevOps Lead, Production Supervisor, Academic Project Coordinator, Field Operations Supervisor, Agile Coach, Creative Director, Technical Lead |
  | 7 | Project Assurance | Health & Safety Officer, Release Manager, Regulatory Affairs Specialist, Policy Compliance Officer, Risk & Compliance Manager, Brand Compliance Reviewer, HSE Officer |
  | 6 | Quality Assurance | Quantity Surveyor, QA/Test Lead, Clinical Research Coordinator, Process Engineer, Procurement Officer, Business Analyst, Campaign Coordinator, Asset Engineer, Curriculum Quality Reviewer |

  That's 36 new roles across 9 industries + 1 cross-industry group. I can add/remove/rename
  any of these before writing the seed SQL — this is a first draft, not final.

- `industry_categories` seed values (9): Construction & Engineering, IT & Software, Healthcare &
  Life Sciences, Manufacturing & Operations, Government & Public Sector, Financial Services,
  Marketing & Creative, Energy & Utilities, Education. A 10th "Cross-Industry" category covers
  Product Owner, Scrum Master, Release Train Engineer, Agile Coach, Business Analyst, Technical
  Lead (methodology-generic, not industry-specific).
- Next SQL version is **v906** (v905 already exists on disk, uncommitted, unrelated to this work).
