# v1062 — Regional & Format Settings (implementation plan)

## Goal

Ship organisation defaults + per-field project overrides for Regional & Format Settings, with menus under Project Setup, PMO Configuration, and Account/Organisation Settings; shared resolver for UI (and later export).

## Settled decisions

See [projectprd/v1062_regional_and_format_settings_PRD.md](../projectprd/v1062_regional_and_format_settings_PRD.md).

## Preference pack (columns)

| Key | Type / notes |
|-----|----------------|
| `currency_code` | ISO 4217 (from DB currencies / countries where available) |
| `date_format` | Enum e.g. `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, `D MMM YYYY` |
| `time_zone` | IANA |
| `decimal_places` | 0–6 integer |
| `number_grouping` | `comma` / `space` / `none` (or locale-driven + explicit override) |
| `first_day_of_week` | `monday` / `sunday` / `saturday` |
| `locale` | BCP-47 (e.g. `en-US`, `en-GB`) |
| `time_format` | `12h` / `24h` |
| `fiscal_year_start_month` | 1–12 |
| `negative_number_style` | `minus` / `parentheses` |
| `percent_decimals` | 0–4 integer |

Org table: `organisation_regional_format_settings` (1 row per organisation).  
Project table: `project_regional_format_settings` (1 row per project; nullable columns = inherit).

## Todos

- [x] SQL: create public tables, RLS, `database_tables` registry, grants
- [x] SQL: menu items — Project Setup leaf; PMO Configuration leaf; Account/Organisation Settings leaf
- [x] Role grants: PMO/Account Owner org write; PM project write; appropriate reads
- [x] Shared service + `resolveRegionalFormatSettings(orgId, projectId?)`
- [x] Format helpers wrapping/extending locale/amount formatters
- [x] Org settings page (shared component; two routes/menu entries)
- [x] Project Setup page with per-field override UI, Audit tab, success modal, unsaved guard
- [x] Platform + Simulator parity (pages/routes; Simulator sidebar deferred per v988)
- [x] Unit tests (resolver + formatters)
- [x] Documentation guide + taxonomy update + CLAUDE.md rule 68
- [x] Plan review section after implementation

## Review

### What shipped
- Tables `organisation_regional_format_settings` and `project_regional_format_settings` with RLS (v1060).
- Menu leaves for Project Setup, PMO Configuration, and Account section (v1061).
- Shared resolver/formatters/service under `@nidus/shared`.
- Org page (dual routes) + Project override page (Platform + Simulator).
- CLAUDE.md rule 68; taxonomy + guide.

### Validation
- Unit tests: `packages/shared/src/utils/__tests__/regionalFormatSettings.test.js`.
- Manual: apply SQL on Supabase, open org + project pages, save with success modal.

### Follow-up
- **v1063** — export `valueType` Item|Value tables using resolved settings.
- Apply `v1060`/`v1061` SQL on the target database before UI save will succeed.
