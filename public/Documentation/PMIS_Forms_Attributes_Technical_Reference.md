# PMIS Forms & Attributes Coverage - Technical Reference

## Scope

Technical reference for the dynamic form engine and process guide form coverage implementation.

Delivered components include:

- SQL schema and seed migrations (`v502` to `v507`)
- Form engine service layer
- Dynamic renderer components
- Form pages and route bindings
- Sidebar/menu integrations with role controls
- Unit tests for core logic

## Database Design

### Core Form Engine Tables (Platform `public`)

- `form_templates`
- `form_template_versions`
- `form_instances`
- `form_instance_values`
- `form_instance_rows`
- `form_comments`
- `form_attachments`
- `form_approvals`
- `form_audit_log`
- `form_version_history`
- `record_links`

### Simulator Mirrors (`sim`)

Equivalent mirror tables are created for simulator-domain operation.

### Supporting Registers

Missing normalized register tables were added and mirrored for simulator parity.

## Service Layer

Primary service: `src/services/formEngineService.js`

Key functions include:

- template retrieval
- instance creation and retrieval
- value and row updates
- submit/approve/reject/archive transitions
- version creation
- project-level listing and summary
- attachments/comments
- record linking

Supporting utilities:

- `src/services/formCalculations.js`
- `src/services/formValidation.js`

## UI Architecture

### Components

`src/components/forms/` provides reusable renderer and workflow components:

- `DynamicFormRenderer`
- `FormFieldRenderer`
- `DynamicTableSection`
- `FormTemplateGallery`
- `ApprovalWorkflowPanel`
- `AttachmentUploader`
- `FormVersionHistory`
- `RelatedRecordsPanel`
- `FormAuditTimeline`
- `ExportMenu`
- `FormAutosaveIndicator`
- `DraftFormQueue`

Dashboard widgets are in `src/components/forms/dashboard/`.

### Pages

`src/pages/forms/` includes:

- `FormsGallery`
- `FormNew`
- `FormEdit`
- `FormView`
- `FormTemplateAdmin`

## Route Contracts

- Platform:
  - `/platform/projects/:projectId/forms`
  - `/platform/projects/:projectId/forms/:templateCode/new`
  - `/platform/projects/:projectId/forms/:formInstanceId/edit`
  - `/platform/projects/:projectId/forms/:formInstanceId/view`
  - `/platform/admin/form-templates`

- Simulator PM:
  - `/simulator/pm/projects/:projectId/forms`
  - `/simulator/pm/projects/:projectId/forms/:templateCode/new`
  - `/simulator/pm/projects/:projectId/forms/:formInstanceId/edit`
  - `/simulator/pm/projects/:projectId/forms/:formInstanceId/view`

## Permissions

Permission seed migration: `SQL/v507_form_permissions.sql`

Key permission codes:

- `form.view`
- `form.create`
- `form.edit`
- `form.approve`
- `form.view_all`
- `form_template.manage`
- `form_template.create`
- `form_template.approve`
- `form.quality`
- `form.procurement`
- `form.cost`

## Menu Integration

Updated config files:

- `src/config/pmMenuConfig.js`
- `src/config/pmoMenuConfig.js`
- `src/config/simulatorPMMenuConfig.js`
- `src/config/simulatorPMOMenuConfig.js`
- `src/config/simulatorMenuConfig.js`

Domain-isolation fix applied in `src/components/Sidebar.jsx` to prevent cross-context menu leakage.

## Test Coverage

Added test files:

- `src/services/__tests__/formEngineService.test.js`
- `src/services/__tests__/formCalculations.test.js`
- `src/services/__tests__/formValidation.test.js`

Verified execution:

- 3 test files passed
- 8 tests passed
- 0 failed

## Implementation Notes

- Form catalog follows process group organization and includes Agile forms.
- Template schemas are seeded as JSONB and can be versioned.
- Approved forms are intended to be immutable in standard edit flow.
- Platform and Simulator feature parity is preserved for shared form capabilities.
