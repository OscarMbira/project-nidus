# v1311 — Organisation custom fields on Local Registers (PRD)

**Status:** Approved 2026-10-21 · Implemented 2026-10-22
**Date:** 2026-10-21
**Apps:** Platform, Simulator, Admin (limit setting)
**Related:** Local Register Engine (v931/v938), Local Data Extensions (v515–v520, v846), register field groups/tabs (v1297), multi-value fields (v1299, v1304), Admin settings RPC pattern (Admin v227, v236)

## a) Problem statement

Local registers (e.g. Banking Transformation, Core Banking, and every other industry-pack or organisation-created register) ship with a fixed set of fields. Organisations regularly need to capture something extra — a vendor ticket number, an internal cost code, a second approver — and today they cannot without a code or SQL change. Their only workaround is free text in Notes, which cannot be searched, filtered or exported as its own column.

The codebase already has **Local Data Extensions (LDE)**: organisation-scoped custom field definitions with types, options, validation, governance pages and an audit trail. But (1) only PMO admins can create organisation-wide fields there, (2) fields go through a draft → approved → published workflow, (3) LDE values are stored per *project*, while register records can belong to a portfolio, programme or PMO with no project, and (4) LDE is not wired into the register forms at all.

## b) Solution

Let any user who can edit a register add a **custom field** for their organisation directly from the register form, reusing LDE for the field *definitions*:

- A new **Custom Fields** tab on every register form and record view (before Audit details), listing the organisation's custom fields attached to that register, with a **+ Add custom field** button.
- **Add custom field** first shows the organisation's existing custom-field library (searchable), so the user can **attach an existing field** instead of creating a duplicate. Creating a new one checks for exact duplicates (blocked) and similar names ("Did you mean…?").
- New fields are **live immediately** for everyone in that organisation — and only that organisation.
- Custom values are stored on the register record itself (`field_values`), so they save with the record's normal Save, follow the record's own security, and appear in list columns, search and exports.
- PMO admins rename, change, retire or detach fields through the existing LDE admin pages.
- A **maximum number of custom fields per register per organisation** (default 30) is configurable in **System Admin**: a global default plus optional per-organisation overrides.
- Same behaviour in the Simulator (its own LDE tables).

## c) User stories

1. As a register user, I see a **Custom Fields** tab on every register's create, edit and view pages.
2. As a register user, I can click **+ Add custom field** on the Custom Fields tab while creating or editing a record.
3. As a register user, before creating a field I see my organisation's existing custom fields (name, type, which registers use it) and can search them.
4. As a register user, I can attach an existing organisation field to the current register in one click, instead of creating a new one.
5. As a register user, I can create a new field by giving a name and choosing a type: Text, Notes, Number, Date, Yes/No, Link, Dropdown, Multi-select dropdown, or Multi-value list.
6. As a register user, for Dropdown and Multi-select fields I enter the options when creating the field.
7. As a register user, I can tick **Required** when creating a field.
8. As a register user, I am blocked from creating a field whose name matches an existing organisation field (ignoring case, spacing and punctuation), and offered to attach that field instead.
9. As a register user, I am warned ("Did you mean …?") when my new field name is similar to an existing one, and can still continue.
10. As a register user, a field I create or attach is immediately visible to every user in my organisation on that register — and to nobody outside my organisation.
11. As a register user, I fill in custom field values on the Custom Fields tab, and they save with the record when I press Save (create or edit).
12. As a register user, required custom fields appear in the "Required to save" list with "(Custom Fields)", and block Save until filled.
13. As a register user, I see custom field values on the record view page's Custom Fields tab, formatted by type (lists as bullets, options as labels).
14. As a register user, the register list shows custom fields as extra columns (after the built-in ones, before Status/Actions), and the search box matches custom values.
15. As a register user, exports (Excel, CSV, JSON, XML, Word, PowerPoint, Print) include custom fields as columns.
16. As a register user, I see a clear message when my organisation has reached the custom-field limit for that register, and cannot add more.
17. As a register user, I cannot rename, change or remove existing custom fields (PMO admins only).
18. As a PMO admin, I can rename a field, edit its dropdown options, change Required, retire it, or detach it from a register using the existing Local Data Extensions pages.
19. As a PMO admin, retiring or detaching a field hides it from forms, lists and exports, but never deletes values already saved on records.
20. As a PMO admin, I can see who created each custom field and when (LDE audit history).
21. As a System Admin, I can set the default maximum number of custom fields per register per organisation (default 30).
22. As a System Admin, I can set, change or remove a per-organisation override of that limit.
23. As a System Admin, every change to the limit is recorded in the Admin audit log with a reason.
24. As a Simulator user, I get the same Custom Fields behaviour on Simulator registers, stored in Simulator tables only.
25. As any user, the Custom Fields tab and dialog work in light and dark mode and on mobile widths.

## d) Implementation decisions (settled in the 2026-10-21 interview)

| # | Decision |
|---|---|
| D1 | **Foundation: reuse LDE** for field definitions (`custom_field_definitions`, `custom_field_options`, `custom_field_screen_map`, `system_screens`), extended for this use — no parallel field system. |
| D2 | **Who creates:** anyone in the organisation who can edit that register (has access to it and can create/edit its records). |
| D3 | **No approval:** user-created fields are `published` immediately. |
| D4 | **Scope:** all local registers (built once in the shared register engine), not just the Banking ones. |
| D5 | **Field types offered:** Text, Notes (long text), Number, Date, Yes/No, Link (URL), Dropdown, Multi-select dropdown, Multi-value list. Multi-value list is new to LDE (`multi_line` type added). |
| D6 | **Limit:** max custom fields per register per organisation, **global default 30 + optional per-organisation override**, set in System Admin. |
| D7 | **Placement:** a dedicated **Custom Fields** tab on form and view, before Audit details. |
| D8 | **Edit/retire rights: PMO admins only** (via existing LDE pages). Creators cannot rename or remove after creation. |
| D9 | **Required:** the creator may mark a field Required when creating it. |
| D10 | **List/export:** custom fields appear as list columns, are searchable, and are included in all exports. |
| D11 | **Simulator:** full parity using the Simulator's own LDE definition tables. |
| D12 | **Duplicate prevention** (owner accepted advice): one shared library per organisation; attach-existing first; exact-name duplicates blocked by a unique normalised name per organisation; similar names warned. |
| D13 | **Value storage:** custom values live in the register record's `field_values` under a reserved key per definition (`cf__<definition uuid>`), not in LDE's project-scoped `custom_field_values` table — because register records may have no project. Saves with the record, inherits record RLS, and works for every scope. |
| D14 | **Creation path:** one SECURITY DEFINER RPC per schema (create-or-attach) that checks organisation membership, register access, duplicate name and limit. LDE's PMO-admin-only RLS is **not** widened (rule 42). |
| D15 | **Admin limit storage:** public settings table (single row) + per-account override table, written by Admin only via audited `public.admin_*` RPCs gated by a new Admin permission — a new narrow exception to be listed in both `CLAUDE.md` files, following v227/v236. |

## e) Testing decisions

- **Shared pure utilities (unit):** field-name normalisation and similarity ("Did you mean"), custom-key helpers (`cf__<id>`), value formatting for list/export, merge of custom fields into list columns and export rows.
- **RPC tests (SQL test file):** create succeeds for a register user; exact duplicate is rejected and the existing field is returned for attaching; attaching an existing field works; limit reached is rejected; per-organisation override beats the default; a user from another organisation cannot see or attach the field; a non-member cannot create.
- **Component tests (Vitest + RTL):** Custom Fields tab renders attached fields by type; Add dialog shows the library, blocks exact duplicates, warns on similar names, handles dropdown options; values save with the record payload; required custom field blocks Save and shows "(Custom Fields)"; list shows custom columns and search matches custom values; delete/edit flows unaffected.
- **Admin:** RPC permission gate and audit row; page test for set default / set override / remove override.
- **Done** = all of the above green, existing local-register tests green, manual check on Product Configuration (Platform) and one Simulator register in light and dark mode.

## f) Out of scope

- Custom fields on non-register screens (Risks, Issues etc. keep using LDE's existing renderer).
- Letting creators (non-PMO) rename/edit/remove fields.
- Placing custom fields on built-in tabs.
- Field-level permissions per role, conditional (show-if) logic, calculated fields, repeating groups.
- Migrating existing LDE project-scoped values into registers.
- Bulk upload of custom field values (can follow later with rule 71 legends).

## g) Further notes

- **Why values are not in LDE's value table:** `custom_field_values.project_id` (and `sim.custom_field_values.practice_project_id`) is NOT NULL and drives its RLS; register records can be portfolio/programme/PMO scoped. Storing in `field_values` avoids loosening that table.
- **Register ↔ screen mapping:** each register gets an LDE `system_screens` row (`screen_code = 'local_register:<register id>'`, entity type `local_register_record`) under a new `local_registers` system module, created on first use by the RPC — so no seeding of ~500 rows.
- **Wide lists:** with many custom fields the table scrolls horizontally; the Actions column is already sticky.
- **Planner wall:** any new `public` tables must be added to the Planner database wall (`SQL/v1251_planner_table_wall.sql`, CLAUDE.md DB rule 6).
- Admin plan lives in `E:\project-nidus-admin\projectplans\v216_local_register_custom_field_limit_admin_plan.md`.
