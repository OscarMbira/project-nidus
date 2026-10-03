# v1066 — Working Days & Holidays discoverability (plan)

## Goal

Make weekends and public holidays easy to find: Project Setup shortcut + clearer page copy + renamed Calendar menu labels — without new calendar tables.

## Settled decisions

See [projectprd/v1066_working_days_holidays_discoverability_PRD.md](../projectprd/v1066_working_days_holidays_discoverability_PRD.md).

## Work items

### 1. SQL menu

`SQL/v1064_working_days_holidays_menu.sql` (idempotent):

- Rename `pm_project_calendar` label → **Working Days** (description: working days / weekends for the project).
- Rename `pm_project_calendar_exceptions` label → **Public Holidays & Exceptions**.
- Insert Project Setup leaf `plat_pm_s_working_days_holidays` under `plat_pm_project_setup`, label **Working Days & Holidays**, `route_path` copied from `pm_project_calendar`.
- Copy `role_menu_items` grants from `pm_project_calendar` to the new leaf (same pattern as `v966ad` / `v1061`).
- Simulator: rename `sim_pp_project_calendar` / `sim_pp_project_calendar_exceptions`; add Simulator Project Setup equivalent leaf if that parent exists (else document Platform-only menu + Simulator page polish still applied).

### 2. UI polish (Platform + Simulator)

`ProjectCalendarSettings.jsx` (and Simulator twin):

- Title/subtitle: Working Days & Holidays framing.
- Working-days section helper: unticked days = non-working (weekend/rest).
- Link to exceptions: **Public holidays & exceptions** (route unchanged).

Optional light polish on exceptions list page title if it still says only “Calendar Exceptions”.

### 3. Docs

- Short note in `Documentation/` or extend calendar guide; update `Core_PM_and_Industry_Menu_Taxonomy.md` labels for Project Setup + Calendar leaves.
- Plan review section after implementation.

## Todos

- [x] SQL menu rename + Project Setup leaf + grants (+ sim renames)
- [x] Platform calendar page copy polish
- [x] Simulator calendar page copy polish
- [x] Taxonomy / guide update
- [x] Plan review

## Review

Implemented v1066 discoverability:

- **SQL** `v1064_working_days_holidays_menu.sql` — labels Working Days / Public Holidays & Exceptions; Project Setup leaf `plat_pm_s_working_days_holidays`; grants copied from `pm_project_calendar`; Simulator menu renames.
- **UI** Platform + Simulator settings/list/detail copy polished (titles, helper text, Public holidays & exceptions link).
- **Docs** taxonomy §3 + `Documentation/Working_Days_Holidays_Discoverability_v1066_Guide.md`.

**Apply** `SQL/v1064_working_days_holidays_menu.sql` in Supabase to refresh sidebar labels.
