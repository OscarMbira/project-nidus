# v1066 — Working Days & Holidays discoverability

## a) Problem statement

Projects already have working-day flags and holiday/exception dates (`project_calendars` / `project_calendar_exceptions`, v963). Users looking under Project Setup for “weekends and public holidays” may not find **Calendar → Project Calendar / Calendar Exceptions**, and the page copy does not spell out weekends vs holidays clearly.

## b) Solution

1. Keep Calendar as the primary home (existing routes and data).
2. Add Project Setup leaf **Working Days & Holidays** pointing at the same Project Calendar route (dual-location, like Planning → Calendars).
3. Light UX polish on the calendar settings page (labels/helper text + stronger link to exceptions as public holidays).
4. Rename existing menu labels: Project Calendar → **Working Days**; Calendar Exceptions → **Public Holidays & Exceptions**.
5. Platform + Simulator parity.

No new tables; no country holiday packs.

## c) User stories

1. As a PM, I open Project Setup → Working Days & Holidays and land on the project working-days calendar.
2. As a PM, I understand unticked weekdays are non-working (weekends/rest days).
3. As a PM, I follow a clear control to Public Holidays & Exceptions to add holiday dates.
4. As a PM, I still reach the same pages from Calendar (and Planning → Calendars).
5. As a Simulator user, I see the same labels and Project Setup leaf.

## d) Implementation decisions (settled)

| # | Decision |
|---|----------|
| Primary home | Existing Calendar group |
| Project Setup | Single leaf: Working Days & Holidays → existing calendar route |
| Route | Reuse `/platform/projects/:id/schedule/calendar` (no new page URL) |
| UX polish | Labels/copy + exceptions link wording only |
| Menu renames | Working Days; Public Holidays & Exceptions |
| Data | Existing v963 tables only |
| Parity | Platform + Simulator |

## e) Testing decisions

- Menu SQL idempotent; grants copied from `pm_project_calendar` (or equivalent) for the new Project Setup leaf.
- Manual: open leaf with a selected project; save working days; open exceptions via polished link.
- Simulator: same label checks.

## f) Out of scope

- Org-wide / national holiday catalogs or import packs
- Recurring holiday rules
- Merging exceptions into the working-days form as a full CRUD embed
- Regional & Format Settings changes
- Wiring Gantt duration to exceptions (separate if needed later)

## g) Further notes

- SQL version after `v1063_regional_format_local_fields.sql` → `v1064_*` for menu renames + Project Setup leaf.
- Update taxonomy doc § Project Setup / Calendar labels where listed.
