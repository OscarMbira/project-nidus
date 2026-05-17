# Cursor AI Prompt: PMIS Local Data Extensions / Custom Fields Framework

## 1. Objective

Build and implement a **Local Data Extensions** feature for a Project Management Information System (PMIS) using **React, Tailwind CSS, Supabase, PostgreSQL, Supabase Auth, Supabase Row Level Security, and Role-Based Access Control**.

The feature must allow authorised users to define local/custom fields that are not part of the standard PMIS modules, screens, features, or database tables.

The solution must support:

- Simple custom fields
- Multi-valued fields
- Repeating field groups
- Associated child fields
- Field validation rules
- Screen/module/entity mapping
- Role-based view/edit permissions
- Draft/approval/publish workflow
- Audit trail
- Reporting/export support

The purpose is to let each organisation, PMO, department, country office, donor-funded programme, or banking client extend the standard PMIS data capture without changing the core database schema.

---

## 2. Business Context

The PMIS already contains standard modules such as:

- Projects
- Programmes
- Portfolios
- Risks
- Issues
- Changes
- Requirements
- Stakeholders
- Procurement
- Quality
- Lessons Learned
- Reports
- Governance
- PMO Administration

However, different clients may need to capture extra local information that is not part of the standard system.

Example local fields for a core banking project:

- Core Banking Vendor
- Legacy System Name
- Regulatory Approval Code
- Data Migration Batch Number
- Branch Rollout Wave
- Impacted Countries
- Local Compliance Category
- Donor Reference Number
- Go-Live Waiver Reference
- Migration Defect Category

Some local information may be multi-valued or grouped.

Example repeating group:

**Branch Rollout Details**

- Branch Name
- Branch Code
- Province
- Migration Date
- Branch Manager
- Readiness Status
- Defects Outstanding
- Go-Live Approved?

The system must support this without requiring developers to add new physical columns to the standard project, risk, issue, or change request tables.

---

## 3. Core Design Principle

Do **not** dynamically alter standard business tables when users create local fields.

Use a **metadata-driven custom field architecture**:

1. Store custom field definitions as metadata.
2. Store where each field appears.
3. Store validation rules as metadata.
4. Store permissions as metadata.
5. Store actual entered values in generic value tables.
6. Render fields dynamically in React based on definitions.
7. Save field values separately from core PMIS fields.
8. Include custom field values in reports, exports, and dashboards where enabled.

Use a hybrid model:

- Fixed Supabase tables for standard PMIS fields.
- Custom field metadata and value tables for local extensions.

---

## 4. Feature Name and Sidebar Placement

Use the feature name:

**Local Data Extensions**

Recommended sidebar placement:

```text
Administration & Configuration
  - Local Data Extensions
  - Field Definitions
  - Field Groups
  - Screen Mapping
  - Validation Rules
  - Field Permissions
  - Audit History
```

---

## 5. Functional Requirements

### 5.1 Field Definition Management

Authorised users must be able to create, view, update, deactivate, and archive local/custom field definitions.

Each field definition must include:

- Field label
- Field key
- Description
- Help text
- Placeholder text
- Module
- Screen
- Entity type
- Field type
- Data type
- Maximum length
- Minimum value
- Maximum value
- Decimal places
- Default value
- Required flag
- Multi-value flag
- Searchable flag
- Reportable flag
- Filterable flag
- Exportable flag
- Dashboard eligible flag
- Sensitive data flag
- Active/inactive status
- Display order
- Approval status
- Created by
- Created date
- Updated by
- Updated date

Field keys must be system-safe and unique within tenant + entity type + screen.

Example field key format:

```text
core_banking_vendor
legacy_system_name
branch_rollout_wave
regulatory_approval_code
```

Field key regex:

```text
^[a-z][a-z0-9_]*$
```

---

### 5.2 Supported Field Types

Implement the following field types for MVP:

- Text
- Long text
- Number
- Decimal
- Currency
- Date
- Date time
- Checkbox
- Dropdown
- Multi-select
- Radio button
- Email
- Phone
- URL
- File upload
- User picker
- Department picker
- Lookup
- Repeating group

Formula/calculated fields can be deferred to a later version.

For the first implementation, prioritise:

- Text
- Long text
- Number
- Decimal
- Date
- Dropdown
- Multi-select
- Checkbox
- Repeating group

---

### 5.3 Multi-Valued Fields

The system must support fields where one field can hold more than one value.

Example:

```text
Impacted Countries:
- Zimbabwe
- Zambia
- Botswana
```

Recommended storage:

- Simple multi-select values can be stored in `value_json`.
- Complex repeating rows must use group instance tables.

---

### 5.4 Repeating Field Groups

The system must support repeating field groups.

Example:

```text
Branch Rollout Details
  Row 1:
    Branch Name: Harare Main
    Branch Code: 001
    Province: Harare
    Migration Date: 2026-06-15
    Readiness Status: Ready

  Row 2:
    Branch Name: Bulawayo Main
    Branch Code: 002
    Province: Bulawayo
    Migration Date: 2026-06-22
    Readiness Status: Pending
```

Repeating groups must support:

- Add row
- Remove row
- Expand row
- Collapse row
- Validate row
- Save row
- Reorder row, optional
- Minimum number of rows
- Maximum number of rows
- Required child fields
- Unique child field validation, such as unique branch code

---

### 5.5 Screen and Module Mapping

A custom field must be attachable to:

- Module
- Screen
- Entity type
- Specific project type
- Specific methodology
- Specific stage/phase
- Specific organisation unit
- Specific country or region
- Specific role, if needed

Examples:

```text
Module: Projects
Screen: Project Details
Entity Type: project

Module: Risks
Screen: Risk Details
Entity Type: risk

Module: Issues
Screen: Issue Details
Entity Type: issue

Module: Change Control
Screen: Change Request Form
Entity Type: change_request
```

---

### 5.6 Validation Rules

The system must support validation rules configured as metadata.

#### Text validation

```json
{
  "required": true,
  "minLength": 3,
  "maxLength": 50,
  "pattern": "^[A-Z0-9-]+$",
  "customMessage": "Only uppercase letters, numbers and hyphens are allowed."
}
```

#### Number validation

```json
{
  "required": true,
  "min": 0,
  "max": 100,
  "decimalPlaces": 2
}
```

#### Date validation

```json
{
  "required": true,
  "mustBeFutureDate": true
}
```

#### Repeating group validation

```json
{
  "minRows": 1,
  "maxRows": 50,
  "uniqueFields": ["branch_code"],
  "requiredFields": ["branch_name", "migration_status"]
}
```

Build a validation engine that reads these rules and applies them on the frontend before saving, and again on the backend where possible.

---

### 5.7 Role-Based Permissions

Implement permissions for:

- View field
- Edit field value
- Configure field
- Approve field
- Publish field
- Archive field
- Export field
- View sensitive field

Recommended roles:

- System Admin
- PMO Admin
- Portfolio Manager
- Programme Manager
- Project Manager
- Team Member
- Sponsor
- Auditor
- Viewer

Example permission behaviour:

| Role | Configure Fields | Approve/Publish | Capture Values | View Values |
|---|---:|---:|---:|---:|
| System Admin | Yes | Yes | Yes | Yes |
| PMO Admin | Yes | Yes | Yes | Yes |
| Project Manager | No | No | Yes, assigned projects only | Yes |
| Team Member | No | No | Limited | Limited |
| Sponsor | No | No | No | Yes |
| Auditor | No | No | No | Yes plus audit |
| Viewer | No | No | No | Read only |

---

### 5.8 Publishing Workflow

Do not allow all created fields to appear immediately on live screens.

Implement this workflow:

```text
Draft → Submitted for Approval → Approved → Published → Deprecated / Archived
```

Rules:

- Draft fields are visible only to creators, PMO Admins, and System Admins.
- Submitted fields are locked for general editing until reviewed.
- Approved fields can be published.
- Published fields appear on mapped screens.
- Deprecated fields remain readable for historical values but should not be used for new data capture.
- Archived fields are hidden by default but retained for audit purposes.

---

### 5.9 Audit Trail

Track all changes to:

- Field definitions
- Field options
- Field groups
- Field mappings
- Validation rules
- Permissions
- Field values
- Group values
- Publishing status

Audit log must capture:

- Action type
- Entity type
- Entity ID
- Field definition ID
- Old value
- New value
- Changed by
- Change reason
- Timestamp
- IP/device metadata if available

---

### 5.10 Reporting and Export

Custom fields should be optionally available for:

- Project reports
- Portfolio reports
- Programme reports
- Risk reports
- Issue reports
- Export to Excel/CSV
- Dashboard filters
- Search filters

Only include fields where one or more of the following flags is enabled:

```text
is_reportable = true
is_exportable = true
is_searchable = true
is_filterable = true
```

---

## 6. Supabase Database Schema

Create the following tables.

### 6.1 `system_modules`

```sql
create table if not exists public.system_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  module_name text not null,
  description text,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.2 `system_screens`

```sql
create table if not exists public.system_screens (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.system_modules(id) on delete cascade,
  module_key text not null,
  screen_key text not null,
  screen_name text not null,
  description text,
  route_path text,
  entity_type text not null,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(module_key, screen_key, entity_type)
);
```

### 6.3 `custom_field_definitions`

```sql
create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  module_key text not null,
  screen_key text not null,
  entity_type text not null,
  field_key text not null,
  field_label text not null,
  field_description text,
  help_text text,
  placeholder text,
  field_type text not null,
  data_type text not null,
  max_length integer,
  min_value numeric,
  max_value numeric,
  decimal_places integer,
  default_value text,
  validation_rules jsonb not null default '{}'::jsonb,
  is_required boolean not null default false,
  is_active boolean not null default true,
  is_searchable boolean not null default false,
  is_reportable boolean not null default false,
  is_filterable boolean not null default false,
  is_exportable boolean not null default false,
  is_dashboard_eligible boolean not null default false,
  is_sensitive boolean not null default false,
  is_multi_value boolean not null default false,
  is_system_locked boolean not null default false,
  display_order integer not null default 0,
  approval_status text not null default 'draft',
  created_by uuid,
  updated_by uuid,
  approved_by uuid,
  published_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, entity_type, screen_key, field_key),
  constraint custom_field_approval_status_check
    check (approval_status in ('draft', 'submitted', 'approved', 'published', 'deprecated', 'archived'))
);
```

### 6.4 `custom_field_options`

```sql
create table if not exists public.custom_field_options (
  id uuid primary key default gen_random_uuid(),
  field_definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  option_label text not null,
  option_value text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(field_definition_id, option_value)
);
```

### 6.5 `custom_field_values`

```sql
create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  field_definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  value_text text,
  value_number numeric,
  value_decimal numeric,
  value_boolean boolean,
  value_date date,
  value_datetime timestamptz,
  value_json jsonb,
  value_file_url text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, entity_type, entity_id, field_definition_id)
);
```

### 6.6 `custom_field_groups`

```sql
create table if not exists public.custom_field_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  module_key text not null,
  screen_key text not null,
  entity_type text not null,
  group_key text not null,
  group_label text not null,
  group_description text,
  help_text text,
  is_repeating boolean not null default true,
  min_rows integer not null default 0,
  max_rows integer,
  validation_rules jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  is_active boolean not null default true,
  approval_status text not null default 'draft',
  created_by uuid,
  updated_by uuid,
  approved_by uuid,
  published_by uuid,
  approved_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, entity_type, screen_key, group_key),
  constraint custom_field_group_approval_status_check
    check (approval_status in ('draft', 'submitted', 'approved', 'published', 'deprecated', 'archived'))
);
```

### 6.7 `custom_field_group_fields`

```sql
create table if not exists public.custom_field_group_fields (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.custom_field_groups(id) on delete cascade,
  field_definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  display_order integer not null default 0,
  is_required_in_group boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_id, field_definition_id)
);
```

### 6.8 `custom_field_group_instances`

```sql
create table if not exists public.custom_field_group_instances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  entity_type text not null,
  entity_id uuid not null,
  group_id uuid not null references public.custom_field_groups(id) on delete cascade,
  row_number integer not null default 1,
  row_label text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.9 `custom_field_group_values`

```sql
create table if not exists public.custom_field_group_values (
  id uuid primary key default gen_random_uuid(),
  group_instance_id uuid not null references public.custom_field_group_instances(id) on delete cascade,
  field_definition_id uuid not null references public.custom_field_definitions(id) on delete cascade,
  value_text text,
  value_number numeric,
  value_decimal numeric,
  value_boolean boolean,
  value_date date,
  value_datetime timestamptz,
  value_json jsonb,
  value_file_url text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(group_instance_id, field_definition_id)
);
```

### 6.10 `custom_field_permissions`

```sql
create table if not exists public.custom_field_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  field_definition_id uuid references public.custom_field_definitions(id) on delete cascade,
  group_id uuid references public.custom_field_groups(id) on delete cascade,
  role_key text not null,
  can_view boolean not null default true,
  can_edit_value boolean not null default false,
  can_configure boolean not null default false,
  can_approve boolean not null default false,
  can_publish boolean not null default false,
  can_archive boolean not null default false,
  can_export boolean not null default false,
  can_view_sensitive boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 6.11 `custom_field_audit_log`

```sql
create table if not exists public.custom_field_audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  action_type text not null,
  target_type text not null,
  target_id uuid,
  entity_type text,
  entity_id uuid,
  field_definition_id uuid,
  group_id uuid,
  old_value jsonb,
  new_value jsonb,
  change_reason text,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
```

---

## 7. Recommended Indexes

```sql
create index if not exists idx_custom_field_definitions_screen
on public.custom_field_definitions (tenant_id, entity_type, screen_key, approval_status, is_active);

create index if not exists idx_custom_field_values_entity
on public.custom_field_values (tenant_id, entity_type, entity_id);

create index if not exists idx_custom_field_values_field
on public.custom_field_values (field_definition_id);

create index if not exists idx_custom_field_groups_screen
on public.custom_field_groups (tenant_id, entity_type, screen_key, approval_status, is_active);

create index if not exists idx_custom_field_group_instances_entity
on public.custom_field_group_instances (tenant_id, entity_type, entity_id, group_id);

create index if not exists idx_custom_field_group_values_instance
on public.custom_field_group_values (group_instance_id);

create index if not exists idx_custom_field_audit_log_target
on public.custom_field_audit_log (tenant_id, target_type, target_id, changed_at desc);
```

---

## 8. Supabase Row Level Security

Enable RLS on all custom field tables.

```sql
alter table public.custom_field_definitions enable row level security;
alter table public.custom_field_options enable row level security;
alter table public.custom_field_values enable row level security;
alter table public.custom_field_groups enable row level security;
alter table public.custom_field_group_fields enable row level security;
alter table public.custom_field_group_instances enable row level security;
alter table public.custom_field_group_values enable row level security;
alter table public.custom_field_permissions enable row level security;
alter table public.custom_field_audit_log enable row level security;
```

Implement policies based on the existing PMIS user roles, tenant membership, and assigned project access.

Important rules:

- System Admin and PMO Admin can configure fields.
- Project Managers can edit field values only for assigned projects.
- Auditors can view field values and audit logs.
- Sensitive fields require `can_view_sensitive = true`.
- Frontend checks must not replace backend/RLS checks.

---

## 9. React Frontend Architecture

Create these folders:

```text
src/features/local-data-extensions/
  api/
    customFieldsApi.ts
    customFieldValuesApi.ts
    customFieldGroupsApi.ts
    customFieldPermissionsApi.ts
  components/
    CustomFieldRenderer.tsx
    CustomFieldInput.tsx
    CustomFieldGroupRenderer.tsx
    RepeatingFieldGroup.tsx
    CustomFieldAdminBuilder.tsx
    FieldOptionsEditor.tsx
    ValidationRuleBuilder.tsx
    FieldMappingSelector.tsx
    FieldPermissionMatrix.tsx
    FieldPreviewPanel.tsx
    FieldAuditHistory.tsx
  hooks/
    useCustomFields.ts
    useCustomFieldValues.ts
    useCustomFieldGroups.ts
    useCustomFieldPermissions.ts
  pages/
    LocalDataExtensionsPage.tsx
    FieldDefinitionsPage.tsx
    FieldGroupsPage.tsx
    ScreenMappingPage.tsx
    ValidationRulesPage.tsx
    FieldPermissionsPage.tsx
    AuditHistoryPage.tsx
  utils/
    validateCustomField.ts
    mapCustomFieldValue.ts
    fieldTypeRegistry.ts
    customFieldConstants.ts
  types/
    customFields.ts
```

---

## 10. React Types

Create `src/features/local-data-extensions/types/customFields.ts`.

```ts
export type CustomFieldType =
  | 'text'
  | 'long_text'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'dropdown'
  | 'multi_select'
  | 'radio'
  | 'email'
  | 'phone'
  | 'url'
  | 'file'
  | 'user_picker'
  | 'department_picker'
  | 'lookup'
  | 'formula'
  | 'repeating_group';

export type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'published'
  | 'deprecated'
  | 'archived';

export interface CustomFieldDefinition {
  id: string;
  tenant_id?: string | null;
  module_key: string;
  screen_key: string;
  entity_type: string;
  field_key: string;
  field_label: string;
  field_description?: string | null;
  help_text?: string | null;
  placeholder?: string | null;
  field_type: CustomFieldType;
  data_type: string;
  max_length?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  decimal_places?: number | null;
  default_value?: string | null;
  validation_rules: Record<string, unknown>;
  is_required: boolean;
  is_active: boolean;
  is_searchable: boolean;
  is_reportable: boolean;
  is_filterable: boolean;
  is_exportable: boolean;
  is_dashboard_eligible: boolean;
  is_sensitive: boolean;
  is_multi_value: boolean;
  display_order: number;
  approval_status: ApprovalStatus;
}

export interface CustomFieldOption {
  id: string;
  field_definition_id: string;
  option_label: string;
  option_value: string;
  display_order: number;
  is_active: boolean;
}

export interface CustomFieldValue {
  id?: string;
  tenant_id?: string | null;
  entity_type: string;
  entity_id: string;
  field_definition_id: string;
  value_text?: string | null;
  value_number?: number | null;
  value_decimal?: number | null;
  value_boolean?: boolean | null;
  value_date?: string | null;
  value_datetime?: string | null;
  value_json?: unknown;
  value_file_url?: string | null;
}

export interface CustomFieldGroup {
  id: string;
  tenant_id?: string | null;
  module_key: string;
  screen_key: string;
  entity_type: string;
  group_key: string;
  group_label: string;
  group_description?: string | null;
  help_text?: string | null;
  is_repeating: boolean;
  min_rows: number;
  max_rows?: number | null;
  validation_rules: Record<string, unknown>;
  display_order: number;
  is_active: boolean;
  approval_status: ApprovalStatus;
}
```

---

## 11. API Layer Requirements

Create API functions using the existing Supabase client.

### 11.1 Fetch published fields for a screen

```ts
export async function getPublishedCustomFieldsForScreen(params: {
  tenantId?: string;
  entityType: string;
  screenKey: string;
}) {
  // Query custom_field_definitions
  // Filter by tenant_id, entity_type, screen_key, approval_status = 'published', is_active = true
  // Order by display_order
  // Include options for dropdown, radio, multi-select
}
```

### 11.2 Fetch values for an entity

```ts
export async function getCustomFieldValuesForEntity(params: {
  tenantId?: string;
  entityType: string;
  entityId: string;
}) {
  // Query custom_field_values
  // Filter by tenant_id, entity_type, entity_id
}
```

### 11.3 Upsert values

```ts
export async function upsertCustomFieldValue(value: CustomFieldValue) {
  // Validate mapped value
  // Upsert by tenant_id, entity_type, entity_id, field_definition_id
  // Write audit log after successful update
}
```

### 11.4 Fetch groups for screen

```ts
export async function getPublishedCustomFieldGroupsForScreen(params: {
  tenantId?: string;
  entityType: string;
  screenKey: string;
}) {
  // Query custom_field_groups
  // Include group fields and field definitions
  // Filter by published and active
}
```

### 11.5 Save repeating group rows

```ts
export async function saveRepeatingGroupRows(params: {
  tenantId?: string;
  entityType: string;
  entityId: string;
  groupId: string;
  rows: Array<Record<string, unknown>>;
}) {
  // Upsert group instances
  // Upsert group values
  // Validate minRows, maxRows, requiredFields, uniqueFields
  // Write audit log
}
```

---

## 12. Dynamic Rendering Requirements

Create `CustomFieldRenderer.tsx`.

The component must accept:

```ts
interface CustomFieldRendererProps {
  entityType: string;
  entityId: string;
  screenKey: string;
  moduleKey: string;
  tenantId?: string;
  mode: 'view' | 'edit';
  userRole: string;
  onValuesChange?: (values: Record<string, unknown>) => void;
}
```

The component must:

1. Fetch all published fields for the screen.
2. Fetch existing values for the current entity.
3. Merge definitions and values.
4. Render the correct input component for each field type.
5. Apply field permissions.
6. Apply frontend validation.
7. Save values to Supabase.
8. Render repeating groups below simple fields.
9. Show help text and validation errors.
10. Support read-only mode.

---

## 13. Field Input Rendering

Create `CustomFieldInput.tsx`.

Map field types as follows:

```text
text -> input type text
long_text -> textarea
number -> input type number
decimal -> input type number step
currency -> input type number with currency prefix
date -> input type date
datetime -> input type datetime-local
checkbox -> checkbox
dropdown -> select
multi_select -> multi-select
radio -> radio group
email -> input type email
phone -> input type tel
url -> input type url
file -> file upload
```

Use Tailwind for styling.

Input design:

- Label above input
- Required indicator
- Help text below label or input
- Error message below input
- Disabled/read-only state
- Sensitive field masking where user lacks permission

---

## 14. Repeating Group Component

Create `RepeatingFieldGroup.tsx`.

Requirements:

- Display group label and description.
- Display “Add Row” button if user can edit.
- Display each row as an expandable card or table row.
- Validate each row independently.
- Allow row deletion if user can edit.
- Support min/max row rules.
- Support unique field rules.
- Support save draft and save final values.
- Show row-level error messages.

Example UI:

```text
Branch Rollout Details

[+ Add Branch]

Row 1: Harare Main | Ready | 2026-06-15 [Expand]
Row 2: Bulawayo Main | Pending | 2026-06-22 [Expand]
```

Expanded row fields:

```text
Branch Name
Branch Code
Province
Migration Date
Branch Manager
Readiness Status
Defects Outstanding
Go-Live Approved?
```

---

## 15. Admin Pages

Create a main admin page:

```text
/local-data-extensions
```

Tabs:

1. Field Definitions
2. Field Groups
3. Screen Mapping
4. Validation Rules
5. Field Permissions
6. Published Fields
7. Audit History

### 15.1 Field Definitions Page

Must support:

- Create field
- Edit field
- Clone field
- Deactivate field
- Submit for approval
- Approve field
- Publish field
- Deprecate field
- Archive field
- Search fields
- Filter by module, screen, entity type, status
- Display table of fields

Recommended admin table columns:

```text
Field Label
Field Key
Module
Screen
Entity Type
Field Type
Required
Reportable
Status
Last Updated
Actions
```

### 15.2 Field Builder Sections

The field builder must include:

#### Basic Information

- Field label
- Field key
- Description
- Help text
- Placeholder

#### Placement

- Module
- Screen
- Entity type

#### Field Behaviour

- Field type
- Data type
- Required
- Multi-value
- Default value
- Display order

#### Validation

- Max length
- Min value
- Max value
- Decimal places
- Regex pattern
- Custom validation message

#### Options

- Dropdown options
- Radio options
- Multi-select options

#### Reporting

- Searchable
- Filterable
- Reportable
- Exportable
- Dashboard eligible

#### Security

- Sensitive field
- Role permissions

#### Workflow

- Save draft
- Submit for approval
- Approve
- Publish

---

## 16. Validation Engine

Create `validateCustomField.ts`.

It must validate based on:

- Required
- Field type
- Max length
- Min/max value
- Decimal places
- Regex pattern
- Email format
- URL format
- Date rules
- Allowed dropdown values
- Multi-select values
- Sensitive field rules
- Repeating group min/max rows
- Required fields in repeating group
- Unique fields in repeating group

Return structure:

```ts
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

Function:

```ts
export function validateCustomFieldValue(
  field: CustomFieldDefinition,
  value: unknown
): ValidationResult {
  // implement validation
}
```

For repeating groups:

```ts
export function validateRepeatingGroupRows(
  group: CustomFieldGroup,
  rows: Array<Record<string, unknown>>,
  fields: CustomFieldDefinition[]
): ValidationResult {
  // implement group validation
}
```

---

## 17. Value Mapping Utility

Create `mapCustomFieldValue.ts`.

This utility must map frontend input values to the correct database columns.

Rules:

- text, long_text, email, phone, url -> `value_text`
- number -> `value_number`
- decimal, currency -> `value_decimal`
- checkbox -> `value_boolean`
- date -> `value_date`
- datetime -> `value_datetime`
- dropdown, radio -> `value_text`
- multi_select -> `value_json`
- file -> `value_file_url`
- lookup -> `value_json`
- formula -> `value_json`

Also create a reverse mapping function to render existing DB values in the UI.

---

## 18. Audit Logging

Every create/update/delete/publish/save action must insert a record into `custom_field_audit_log`.

Action types:

```text
field_created
field_updated
field_submitted
field_approved
field_published
field_deprecated
field_archived
field_value_created
field_value_updated
field_value_deleted
group_created
group_updated
group_published
group_value_created
group_value_updated
permission_updated
option_created
option_updated
option_deleted
```

Include old and new values as JSONB.

---

## 19. Example Seed Data: Core Banking Project

Create example custom fields for a core banking implementation.

### Field 1

```text
Field Label: Core Banking Vendor
Field Key: core_banking_vendor
Module: Projects
Screen: Project Details
Entity Type: project
Field Type: Dropdown
Required: Yes
Options:
- Temenos
- Oracle FLEXCUBE
- Finacle
- TCS BaNCS
- Mambu
- Other
```

### Field 2

```text
Field Label: Legacy System Name
Field Key: legacy_system_name
Module: Projects
Screen: Project Details
Entity Type: project
Field Type: Text
Required: Yes
Max Length: 100
```

### Field 3

```text
Field Label: Data Migration Batch Number
Field Key: data_migration_batch_number
Module: Projects
Screen: Project Details
Entity Type: project
Field Type: Text
Required: No
Max Length: 50
Validation Pattern: ^[A-Z0-9-]+$
```

### Field 4

```text
Field Label: Regulatory Approval Required
Field Key: regulatory_approval_required
Module: Projects
Screen: Project Details
Entity Type: project
Field Type: Checkbox
Required: No
Default: false
```

### Field 5

```text
Field Label: Impacted Countries
Field Key: impacted_countries
Module: Projects
Screen: Project Details
Entity Type: project
Field Type: Multi-select
Required: Yes
Options:
- Zimbabwe
- Zambia
- Botswana
- Tanzania
- Mozambique
- South Africa
```

### Repeating Group

```text
Group Label: Branch Rollout Details
Group Key: branch_rollout_details
Module: Projects
Screen: Project Details
Entity Type: project
Repeating: Yes
Min Rows: 1
Max Rows: 500
```

Child fields:

```text
Branch Name - text - required
Branch Code - text - required - unique
Province - dropdown - required
Migration Date - date - required
Branch Manager - text - optional
Readiness Status - dropdown - required
Defects Outstanding - number - optional
Go-Live Approved? - checkbox - optional
```

Readiness status options:

```text
Not Started
In Progress
Ready
Blocked
Completed
```

---

## 20. UI and UX Requirements

Use Tailwind CSS and match the PMIS style.

General UX requirements:

- Clean, professional enterprise layout
- Left sidebar compatible
- Responsive design
- Cards and tables
- Clear action buttons
- Required fields marked with a red asterisk
- Validation errors shown inline
- Success and error toasts
- Confirmation dialogs for archive/delete
- Loading skeletons
- Empty state messages
- Permission-aware buttons
- Search and filter panels

---

## 21. Integration Into Existing Screens

Add the dynamic field renderer to standard screens.

Example Project Details page:

```tsx
<CustomFieldRenderer
  moduleKey="projects"
  screenKey="project_details"
  entityType="project"
  entityId={project.id}
  tenantId={tenantId}
  mode={isEditing ? 'edit' : 'view'}
  userRole={currentUserRole}
/>
```

Example Risk Details page:

```tsx
<CustomFieldRenderer
  moduleKey="risks"
  screenKey="risk_details"
  entityType="risk"
  entityId={risk.id}
  tenantId={tenantId}
  mode={isEditing ? 'edit' : 'view'}
  userRole={currentUserRole}
/>
```

The renderer should be placed after core system fields under a section titled:

```text
Local Data Extensions
```

or:

```text
Additional Local Information
```

---

## 22. Error Handling

Handle:

- Missing field definition
- Unsupported field type
- Permission denied
- Validation failure
- Supabase insert/update failure
- Network failure
- Invalid option values
- Repeating group row limit exceeded
- Attempt to edit archived fields
- Attempt to save sensitive fields without permission

Display user-friendly messages.

---

## 23. Security Requirements

- Do not expose sensitive custom field values to users without permission.
- Apply RLS to all custom field tables.
- Validate permissions on both frontend and backend.
- Do not trust frontend-only permission checks.
- Store audit logs for all configuration and value changes.
- Prevent SQL injection by using Supabase query builder or RPC functions.
- Avoid dynamic SQL unless absolutely necessary.
- Validate field keys to allow only lowercase letters, numbers, and underscores.

---

## 24. Performance Requirements

- Load field definitions once per screen and cache using React Query or equivalent.
- Paginate admin field lists.
- Index screen/entity lookup columns.
- Avoid fetching all custom field values across all entities.
- Fetch only values for the current entity.
- Use batch upsert for saving multiple values.
- Avoid excessive re-rendering in repeating groups.
- Lazy-load audit history.

---

## 25. Acceptance Criteria

The feature is complete when:

1. PMO Admin can create a custom field.
2. PMO Admin can attach a custom field to a module, screen, and entity type.
3. PMO Admin can configure field type, required flag, length, validations, options, and reporting flags.
4. PMO Admin can create a repeating field group with child fields.
5. PMO Admin can publish a field after approval.
6. Published custom fields appear on the selected PMIS screen.
7. Project Manager can capture values against a real PMIS record.
8. Multi-select values can be saved and displayed.
9. Repeating group rows can be added, edited, deleted, and saved.
10. Validation rules are enforced before saving.
11. Role-based permissions control visibility and editability.
12. Audit log records configuration changes and value changes.
13. Custom fields can be included in reports/exports when reportable/exportable.
14. Archived fields are not available for new capture but historical values remain readable.
15. The solution works across at least project, risk, issue, and change request screens.

---

## 26. Build Order

Implement in this order:

1. Create Supabase tables and indexes.
2. Add RLS policies based on existing PMIS roles.
3. Seed system modules and screens.
4. Build custom field API layer.
5. Build validation utility.
6. Build value mapping utility.
7. Build field input renderer.
8. Build custom field renderer.
9. Build repeating group renderer.
10. Build admin configuration pages.
11. Build permissions matrix.
12. Build approval/publishing workflow.
13. Add audit logging.
14. Integrate renderer into project, risk, issue, and change screens.
15. Add reporting/export support.
16. Add core banking example seed data.
17. Test end-to-end.

---

## 27. Testing Requirements

Create tests for:

- Field creation
- Field update
- Field publishing
- Field rendering
- Required validation
- Max length validation
- Number validation
- Dropdown option validation
- Multi-select saving
- Repeating group saving
- Permission restrictions
- Sensitive field masking
- Audit log creation
- Reportable/exportable field extraction

Manual test scenario:

1. Login as PMO Admin.
2. Create field: Core Banking Vendor.
3. Add options: Temenos, Oracle FLEXCUBE, Finacle, Other.
4. Publish the field to Project Details screen.
5. Login as Project Manager.
6. Open a project.
7. See the field under Local Data Extensions.
8. Select Temenos.
9. Save.
10. Reload project.
11. Confirm value persists.
12. Check audit history.
13. Export project report and confirm field appears if exportable is enabled.

---

## 28. Final Instruction to Cursor AI

Implement this feature as a production-ready PMIS module.

Use the existing project patterns, naming conventions, Supabase client setup, authentication, routing, layout, and role management where available.

Do not break existing PMIS modules.

Do not modify standard project, risk, issue, or change request tables to add custom fields.

Use the metadata-driven custom field architecture defined in this prompt.

Where project-specific code already exists, integrate cleanly with the current application architecture.

Create clean, reusable components that can be reused across all PMIS screens.
