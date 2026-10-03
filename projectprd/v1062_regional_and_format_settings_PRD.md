# v1062 — Regional & Format Settings (org defaults + project override)

## a) Problem statement

Projects and organisations lack a governed place for PMO/PM to set Currency, Date format, Time zone, decimals, and related display standards. Export and UI formatting therefore guess (e.g. hard `$`) or stay inconsistent. Users asked for this under Project Setup as its own menu section, with organisation defaults editable by PMO and optional per-project overrides by Project Managers.

## b) Solution

Introduce **Regional & Format Settings**:

1. **Organisation defaults** — one settings row per organisation/account; editable by PMO / Account Admin; reachable from **both** PMO Configuration and Account/Organisation Settings (same page, two menu leaves).
2. **Project overrides** — under **Project Setup → Regional & Format Settings**; Project Manager may override **per field**; unresolved fields inherit org defaults.
3. **Resolved settings API** — shared resolver used by UI and (later) export (`v1063`).
4. Platform + Simulator parity; DB-driven menu wiring; theme-aware CRUD page with Audit tab.

## c) User stories

1. As a PMO Admin, I open Regional & Format Settings from PMO Configuration and set organisation defaults.
2. As an Account Admin, I open the same org settings from Account/Organisation Settings.
3. As a Project Manager, I open Project Setup → Regional & Format Settings and override only the fields I need (e.g. currency).
4. As a PM, I see each field’s organisation default when not overridden.
5. As a reader without edit rights, I can view resolved settings but cannot change them.
6. As the platform, exports and UI can call `resolveRegionalFormatSettings(orgId, projectId?)` and get a complete resolved pack.
7. As an operator, menu labels come from `menu_items` (no hardcoded nav).

## d) Implementation decisions (settled)

| # | Decision |
|---|----------|
| Currency in exports | Use resolved currency when present, else `$` (feeds v1063) |
| Scope | Org defaults + optional project override |
| Who edits | Org: PMO / Account Admin · Project: Project Manager |
| Preference pack (v1) | Full: Currency, Date format, Time zone, Amount decimals, Number grouping, First day of week, Display locale (BCP-47), Time format (12h/24h), Fiscal year start month, Negative number style, Percent decimals |
| Project menu | Project Setup → **Regional & Format Settings** |
| Org menu | **Both** PMO Configuration and Account/Organisation Settings |
| Override UX | **Per-field** override |
| Delivery | **This feature first**; export `valueType` tables in **v1063** wired to resolver |

## e) Testing decisions

- Unit: resolver merge (org only; org + partial project override; blank override = inherit).
- Unit: format helpers honour decimals, grouping, currency, negative style, percent decimals.
- RLS: PMO/Account Admin write org row; PM write project overrides for their project; members read resolved.
- Manual: both org menu entries open same screen; project page per-field override + save success modal; Simulator parity.

## f) Out of scope (v1062)

- Annotating export sections / PDF tables (v1063).
- Translating all UI chrome strings (locale is for format/display helpers first).
- User-personal locale overriding project/org (future).
- Changing existing `projects.budget_currency` column semantics beyond reading as a soft fallback when settings unset (document behaviour).

## g) Further notes

- Prefer lookup from existing `countries` / currency reference tables where present (rule 15 for countries).
- IANA time zones via `Intl.supportedValuesOf('timeZone')` where available (existing stakeholder pattern).
- Seed companion SQL for demos (blank display IDs if any); register tables in `database_tables`.
- Admin ID Generation only if human-readable reference columns are introduced (likely unnecessary for singleton org/project settings rows).
