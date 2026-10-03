# Regional Format Local Fields (v1065)

## Purpose

Organisations and projects can add **local** (custom) Regional & Format Settings fields beyond the core pack. Types in v1: Text, Number, Yes/No, Date. **No dropdowns** for local fields.

## Scope

| Kind | Who defines | Who sets values |
|------|-------------|-----------------|
| Organisation local | PMO Admin / Account Owner | Org defaults: PMO/Owner · Project override: PM |
| Project-only local | Project Manager | PM (that project only) |

## Storage

- Definitions: `public.regional_format_local_field_definitions` (`project_id` NULL = org-defined)
- Values: `organisation_regional_format_settings.local_field_values` JSONB
- Project values + override flags: `project_regional_format_settings.local_field_values` / `local_field_overrides`
- Soft-delete hides definitions; JSONB history is retained

SQL: `SQL/v1063_regional_format_local_fields.sql`

## UI

Same Card/Table list as core settings, with a **Local** badge (and **Project only** when applicable), plus **Add local field** inline panel.

## Developers

```js
import {
  listRegionalFormatLocalFields,
  createRegionalFormatLocalField,
} from '@nidus/shared/services/regionalFormatSettingsService.js'
import {
  resolveLocalFieldValues,
  buildLocalFieldProjectPayload,
} from '@nidus/shared/utils/resolveRegionalFormatSettings.js'
```

See also [Regional_and_Format_Settings_v1062_Guide.md](./Regional_and_Format_Settings_v1062_Guide.md).
