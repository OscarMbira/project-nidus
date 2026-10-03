# Regional & Format Settings (v1062)

## Purpose

Organisation defaults and optional per-project overrides for:

- Country (ISO code from `countries`; UI shows code + name)
- Currency, date format, time zone, time format (12h/24h)
- Amount decimals, number grouping, negative number style, percent decimals
- Display locale, first day of week, fiscal year start month

## Where to find it

| Scope | Menu | Route |
|-------|------|-------|
| Organisation defaults | PMO Configuration → Regional & Format Settings | `/platform/pmo-admin/regional-format-settings` |
| Organisation defaults (same page) | Account → Regional & Format Settings | `/platform/organisation/regional-format-settings` |
| Project overrides | Project Setup → Regional & Format Settings | `/platform/project-setup/regional-format-settings?projectId=…` |

Simulator parity routes: `/simulator/pmo/regional-format-settings`, `/simulator/project-setup/regional-format-settings`.

## Who can edit

- **Organisation:** PMO Admin or Account Owner
- **Project overrides:** Project Manager (per-field Override checkboxes)

## Developers

```js
import { loadResolvedRegionalFormatSettings } from '@nidus/shared/services/regionalFormatSettingsService.js'
import { formatRegionalCurrency, formatRegionalDate, formatRegionalNumber } from '@nidus/shared/utils/formatRegionalSettings.js'

const { settings } = await loadResolvedRegionalFormatSettings(accountId, projectId)
formatRegionalCurrency(420000, settings)
```

SQL: `SQL/v1060_regional_format_settings_schema.sql`, `SQL/v1061_regional_format_settings_menu.sql`, `SQL/v1062_regional_format_country_code.sql`.

Local (custom) fields: [Regional_Format_Local_Fields_v1065_Guide.md](./Regional_Format_Local_Fields_v1065_Guide.md) · SQL `v1063_regional_format_local_fields.sql`.

CLAUDE.md rule **68**.
