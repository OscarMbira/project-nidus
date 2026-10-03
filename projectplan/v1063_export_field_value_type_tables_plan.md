# v1063 — Export field valueType tables (implementation plan)

## Goal

After v1062, add `valueType`-driven Item|Value tables in record export/preview and annotate all known amount/list export sections.

## Depends on

[v1062 Regional & Format Settings](v1062_regional_and_format_settings_plan.md) (resolver must exist).

## Settled decisions

See [projectprd/v1063_export_field_value_type_tables_PRD.md](../projectprd/v1063_export_field_value_type_tables_PRD.md).

## Todos

- [ ] Extend `exportUtils` field rendering (PDF/Word/PPT/Excel) for valueType coalescing + regional formatting
- [ ] Pass resolved settings into export/preview callers (`ExportRecordMenu` / page builders)
- [ ] Annotate Business Case + every other known export section with amount/list fields
- [ ] Add Total Investment to Business Case export record
- [ ] Sync Platform/Simulator/shared copies; unit tests; docs; plan review

## Census approach for “all known” sections

Grep `EXPORT_SECTIONS` / `*_EXPORT_SECTIONS` / `sections={[` under `apps/platform`, `apps/simulator`, `packages`. For each field that is money, numeric KPI, or multi-item list, set `valueType` accordingly. Text stays default.

## Review

_TBD after implementation_
