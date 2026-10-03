# v1065 — Local Regional & Format fields (implementation plan)

## Goal

Let PMO/Owner define organisation local fields and PMs add project-only local fields (Text / Number / Yes-No / Date), stored as definitions + JSONB values, shown in the same Regional & Format Settings list with a Local badge. No dropdowns for local fields.

## Settled decisions

See [projectprd/v1065_regional_format_local_fields_PRD.md](../projectprd/v1065_regional_format_local_fields_PRD.md).

## Data model (sketch)

### Definitions

`public.regional_format_local_field_definitions`

| Column | Notes |
|--------|--------|
| `id` | UUID PK |
| `account_id` | Org scope (required for org-defined; also set for project-only for tenancy) |
| `project_id` | NULL = org-defined; set = project-only |
| `field_key` | Slug unique per (account_id, project_id, field_key) among active |
| `label` | Display name |
| `value_type` | `text` \| `number` \| `boolean` \| `date` |
| `default_value` | Text storage of default (typed in app) |
| `sort_order` | Integer |
| `is_deleted` | Soft delete |
| audit | created_by/updated_by/at |

### Values

On existing tables:

- `organisation_regional_format_settings.local_field_values JSONB NOT NULL DEFAULT '{}'`
- `project_regional_format_settings.local_field_values JSONB NOT NULL DEFAULT '{}'`

Shape: `{ "<definition_uuid>": <string|number|boolean|null> }`  
Project row: missing key or explicit null + no override flag → inherit org value for org-defined fields.  
Override flags for local org fields: store alongside as `local_field_overrides JSONB` (`{ "<id>": true }`) **or** treat presence of key in project JSON as override (prefer explicit `local_field_overrides` for parity with core Override checkboxes).

**Recommended:** `local_field_overrides JSONB DEFAULT '{}'` on project settings row.

## UI

- Core rows first (existing), then local rows with **Local** badge (and “Project only” chip when `project_id` set).
- **Add local field** opens an inline panel on the same page (not a modal record form): Label, Key (auto from label), Type, Default (org or project-only), Save → success modal.
- Org page: manage org definitions + org values.
- Project page: Override + value for org locals; full CRUD for project-only definitions; values in JSONB.
- Soft-delete: confirm; hide from list.

## Todos

- [x] SQL: definition table + RLS; JSONB columns on org/project settings; `database_tables` registry
- [x] Shared service: list/create/update/soft-delete definitions; read/write JSONB values + overrides; resolve helper
- [x] Unit tests (resolve merge + override payload)
- [x] UI: RegionalFormatFields / pages — Local rows, Add panel, type inputs, badge
- [x] Platform + Simulator sync
- [x] Documentation guide + light CLAUDE/rule or guide cross-link from v1062 guide
- [x] Plan review after implementation

## Tracer bullets

1. SQL + service read/write for one org text field end-to-end.
2. Project override for that field.
3. Project-only field.
4. Soft-delete + remaining types (number/boolean/date).
5. Docs + Simulator parity polish.

## Review

Implemented v1065 local Regional & Format fields:

- **SQL** `v1063_regional_format_local_fields.sql` — definitions table + RLS; `local_field_values` / `local_field_overrides` JSONB.
- **Shared** `resolveLocalFieldValues`, `buildLocalFieldProjectPayload`, definition CRUD on `regionalFormatSettingsService`.
- **UI** Platform + Simulator org/project pages + `RegionalFormatFields` (Local badge, Add panel, soft-delete).
- **Tests** unit coverage for local resolve/payload helpers.
- **Docs** `Documentation/Regional_Format_Local_Fields_v1065_Guide.md`; CLAUDE rule 68 extended.

**Apply SQL** `SQL/v1063_regional_format_local_fields.sql` in Supabase before using Add local field in the UI.
