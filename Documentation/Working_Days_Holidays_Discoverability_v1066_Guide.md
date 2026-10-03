# Working Days & Holidays discoverability (v1066)

## Purpose

Help users find and understand project **weekends / working days** and **public holidays** without new calendar tables.

## Where to go

| Entry | Opens |
|-------|--------|
| Calendar → **Working Days** | Project working-day pattern |
| Calendar → **Public Holidays & Exceptions** | Holiday / exception dates |
| Project Setup → **Working Days & Holidays** | Same page as Working Days (second location) |
| Planning → **Calendars** | Same Working Days page (existing second location) |

Routes unchanged: `/platform/projects/:id/schedule/calendar` and `…/exceptions`.

## Data

Still `project_calendars` + `project_calendar_exceptions` (v963). Unticked weekdays = non-working; holidays are exception rows.

## SQL

`SQL/v1064_working_days_holidays_menu.sql` — renames + Project Setup leaf + grants. Simulator menu renames only (no sim Project Setup root today); Simulator pages get the same copy polish.

See PRD/plan: `projectprd/v1066_working_days_holidays_discoverability_PRD.md`.
