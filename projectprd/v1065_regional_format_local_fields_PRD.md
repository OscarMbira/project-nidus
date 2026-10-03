# v1065 — Local (custom) Regional & Format field settings

## a) Problem statement

Regional & Format Settings today only expose a fixed core pack (Country, Currency, locale, dates, numbers, etc.). Organisations and projects often need extra local preferences (e.g. “Invoice prefix”, “Reporting cut-off day”) that are not part of the core list. Users asked to add such fields on the same settings surface, without forcing dropdown/option-list infrastructure for every custom field.

## b) Solution

Extend Regional & Format Settings with **local field definitions** and **values**:

1. **Org-defined local fields** — PMO Admin / Account Owner create definitions at organisation level (label, type, optional default). Projects inherit and may **override** values per field (same Override UX as core).
2. **Project-only local fields** — Project Manager may add fields that exist only on that project (value-only; no org override concept).
3. **Value types (v1):** Text, Number, Yes/No, Date. **No dropdown/select** for local fields (core settings keep their existing dropdowns).
4. **Storage:** definition tables + `local_field_values` JSONB on existing org/project regional settings rows (keyed by definition id).
5. **UI:** same Card/Table list as core, with a **Local** badge and **Add local field**; soft-delete hides definitions but keeps historical JSONB values.
6. Platform + Simulator parity (public schema / platformDb, same as v1062).

## c) User stories

1. As a PMO Admin, I add a local Text/Number/Yes-No/Date field on organisation Regional & Format Settings with an optional default.
2. As a Project Manager, I see org local fields on the project page and can Override + set a project value.
3. As a Project Manager, I add a project-only local field for this project.
4. As a PMO or PM, I soft-delete a local field definition I own (org or project-only); it disappears from the list but old values remain in storage.
5. As a user, I do not get dropdown/option pickers for local fields (only free value controls by type).
6. As a developer, `resolveRegionalFormatSettings` (or a sibling resolver) returns core + resolved local values for consumers.

## d) Implementation decisions (settled)

| # | Decision |
|---|----------|
| Scope | Org-defined **and** project-only local fields |
| Types | Text, Number, Yes/No, Date |
| Dropdowns | Excluded for local fields |
| Storage | Definition tables + JSONB values on settings rows |
| UI | Same list as core + Local badge + Add local field |
| Delete | Soft-delete; hide UI; keep historical values |
| Who defines | Org: PMO/Account Owner · Project-only: Project Manager |
| Who sets values | Org defaults: PMO/Owner · Project overrides / project-only values: PM |

## e) Testing decisions

- Unit: merge org local defaults + project override map; project-only fields only appear for that project.
- RLS: org definitions writable by PMO/Owner; project-only definitions by PM for that project; members can read.
- Manual: add org field → see on project with Override; add project-only field; soft-delete hides row; light/dark; Simulator parity.

## f) Out of scope (v1065)

- Dropdown / lookup / searchable select for local fields.
- Promoting project-only fields to org definitions.
- Using local fields in export `valueType` tables (may follow later).
- Admin-app UI for these definitions (unless a thin parity note only).

## g) Further notes

- Definition needs a stable slug/key for display uniqueness within scope; values keyed by definition UUID in JSONB.
- Non-modal “Add/Edit local field” as a small routed panel or inline expand on the same page (prefer inline/section on the same page to avoid a large new route tree — confirm in plan).
- Versioned SQL after `v1062_regional_format_country_code.sql`.
