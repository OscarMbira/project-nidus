# Risk Management Strategy - Technical Documentation

## Overview

This document provides technical details for developers working with the Risk Management Strategy (RMS) module.

## Architecture

### Database Schema

#### Main Table: `risk_management_strategies`

```sql
CREATE TABLE risk_management_strategies (
    id UUID PRIMARY KEY,
    project_id UUID UNIQUE NOT NULL,  -- One RMS per project
    rms_reference VARCHAR(50) UNIQUE NOT NULL,  -- Auto-generated: RMS-YYYY-NNN
    version_number VARCHAR(20) DEFAULT '1.0',
    
    -- Introduction
    purpose TEXT NOT NULL,
    objectives TEXT NOT NULL,
    scope TEXT NOT NULL,
    strategy_responsibility TEXT,
    
    -- Risk Procedures
    risk_identification_approach TEXT NOT NULL,
    risk_assessment_approach TEXT NOT NULL,
    risk_response_approach TEXT NOT NULL,
    risk_monitoring_approach TEXT NOT NULL,
    
    -- References
    customer_risk_standards_reference TEXT,
    supplier_risk_standards_reference TEXT,
    corporate_risk_policy_reference TEXT,
    programme_risk_policy_reference TEXT,
    variance_from_corporate TEXT,
    variance_justification TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    approved_date DATE,
    approved_by UUID,
    
    -- Audit
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false
);
```

#### Child Tables

1. **rms_risk_standards** - Risk standards to apply
2. **rms_identification_methods** - Risk identification methods
3. **rms_assessment_scales** - Probability and impact scales
4. **rms_risk_matrix** - Risk assessment matrix
5. **rms_response_strategies** - Risk response strategies
6. **rms_tools_techniques** - Risk management tools
7. **rms_templates_forms** - Templates and forms
8. **rms_records** - Risk records definition
9. **rms_reports** - Risk reports definition
10. **rms_scheduled_activities** - Timing of risk activities
11. **rms_roles_responsibilities** - Risk roles
12. **rms_revision_history** - Version history
13. **rms_approvals** - Approval records
14. **rms_distribution** - Distribution list

### Organization Templates

#### Template Tables

1. **rms_organization_templates** - Organization-level templates
2. **rms_template_standards** - Standards in templates
3. **rms_template_methods** - Methods in templates
4. **rms_template_scales** - Scales in templates
5. **rms_template_matrix** - Matrix in templates
6. **rms_template_strategies** - Strategies in templates
7. **rms_template_roles** - Roles in templates

### Database Functions

#### `generate_rms_reference()`
Generates unique RMS reference (RMS-YYYY-NNN).

#### `create_rms_for_project(p_project_id UUID, p_user_id UUID)`
Creates RMS with default structure.

#### `create_rms_from_template(p_project_id UUID, p_template_id UUID, p_user_id UUID)`
Creates RMS from organization template, copying all standards, methods, scales, matrix, strategies, and roles.

#### `validate_rms_completeness(p_rms_id UUID)`
Returns table with:
- section_name: Name of section
- is_complete: Boolean
- missing_items: Array of missing items
- recommendations: Recommendations text

#### `check_rms_conformance(p_rms_id UUID)`
Returns table with:
- standard_name: Name of standard
- conformance_status: Conforms/Referenced/Defined/Variance/Not Referenced
- gaps: Array of gaps
- recommendations: Recommendations text

#### `apply_rms_to_risk_register(p_rms_id UUID, p_risk_register_id UUID)`
Applies RMS scales and matrix configuration to Risk Register.

### RLS Policies

#### Main Table Policies

- **SELECT**: Users can view RMS for projects they're members of, or PMO Admins can view all
- **INSERT**: Project Managers (owner/admin) can create RMS for their projects, or PMO Admins can create any
- **UPDATE**: Project Managers can update draft/under_review RMS, or PMO Admins can update any
- **DELETE**: Only PMO Admins can delete RMS (soft delete)

#### Child Table Policies

All child tables use `check_rms_access(p_rms_id)` helper function to verify access.

### Service Layer

#### Main Service: `riskManagementStrategyService.js`

```javascript
// CRUD Operations
createRMS(projectId, rmsData)
createRMSForProject(projectId)
createRMSFromTemplate(projectId, templateId)
getRMSById(rmsId)
getRMSByProject(projectId)
updateRMS(rmsId, updates)
deleteRMS(rmsId)

// Approval Workflow
submitForApproval(rmsId, approverIds)
approveRMS(approvalId, approverId, comments)

// Validation & Conformance
validateCompleteness(rmsId)
checkConformance(rmsId)

// Integration
applyToRiskRegister(rmsId, riskRegisterId)

// History
getRevisionHistory(rmsId)
```

#### Template Service: `rmsTemplateService.js`

```javascript
getTemplates(accountId)
getDefaultTemplate(accountId)
getTemplateById(templateId)
createTemplate(accountId, templateData)
updateTemplate(templateId, updates)
deleteTemplate(templateId)
setAsDefault(templateId)
createRMSFromTemplate(projectId, templateId)
```

#### Child Entity Services

Each child entity has its own service file:
- `rmsRiskStandardsService.js`
- `rmsIdentificationMethodsService.js`
- `rmsAssessmentScalesService.js`
- `rmsRiskMatrixService.js`
- `rmsResponseStrategiesService.js`
- `rmsToolsTechniquesService.js`
- `rmsTemplatesFormsService.js`
- `rmsRecordsService.js`
- `rmsReportsService.js`
- `rmsScheduledActivitiesService.js`
- `rmsRolesResponsibilitiesService.js`

### UI Components

#### Pages

- `RMSView.jsx` - Main RMS view with tabbed interface (14 tabs)
- `RMSList.jsx` - PMO Admin list of all RMS across projects

#### Forms

- `RMSForm.jsx` - Multi-step wizard for creating/editing RMS
- `StandardForm.jsx` - Add/edit risk standard
- `MethodForm.jsx` - Add/edit identification method

#### Display Components

- `StandardCard.jsx` - Display single standard
- `MethodCard.jsx` - Display single method
- `StandardsSection.jsx` - Manage standards list
- `MethodsSection.jsx` - Manage methods list
- `ScalesSection.jsx` - Display scales
- `MatrixSection.jsx` - Display matrix
- `StrategiesSection.jsx` - Display strategies
- `ToolsSection.jsx` - Display tools
- `TemplatesSection.jsx` - Display templates
- `RecordsSection.jsx` - Display records
- `ReportsSection.jsx` - Display reports
- `RolesSection.jsx` - Display roles
- `ActivitiesSection.jsx` - Display activities

#### Business Logic Components

- `CompletenessIndicator.jsx` - Visual completeness status
- `ConformanceChecker.jsx` - Standard conformance checking
- `RMSApprovalWorkflow.jsx` - Approval workflow UI
- `RMSRevisionHistory.jsx` - Version history display
- `RMSExportMenu.jsx` - Export options menu
- `RMSPrintView.jsx` - Printable format view

### Export Functionality

#### PDF Export (`utils/rmsExport.js`)

Uses `jsPDF` and `html2canvas` to generate PDF documents:
- Includes all RMS sections
- Formatted tables for standards, methods, roles, activities
- Proper page breaks
- Header/footer with reference and date

#### Word Export (`utils/rmsExport.js`)

Uses HTML format with Word-specific styling:
- Generates `.doc` file (MS Word compatible)
- Includes all RMS sections
- Formatted for printing/editing

#### Print View (`components/rms/RMSPrintView.jsx`)

Printable HTML view with print-specific CSS:
- Hidden print controls
- Optimized for standard paper sizes
- Clean formatting

### Integration Points

#### Risk Register Integration

- **Apply RMS to Register**: Button in RMSView when RMS is approved
- **Database Function**: `apply_rms_to_risk_register()` copies scales and matrix
- **Service Method**: `applyToRiskRegister(rmsId, riskRegisterId)`

#### Project Integration

- **One RMS per Project**: Enforced by database constraint
- **Project Detail Page**: Button with RMS status badge
- **Auto-creation**: From default organization template if available

#### Organization Templates

- **Default Template**: Automatically used when creating new RMS
- **Template Management**: PMO Admins can manage organization templates
- **Template Copying**: All child entities copied when using template

### Routing

```javascript
// Project-specific RMS
/app/projects/:projectId/rms

// PMO Admin - All RMS
/app/rms/list
```

### Menu Integration

PMO Admin sidebar menu items:
- `pmo_admin_rms_section` - Parent section (collapsible)
  - `pmo_admin_rms_all` - All Risk Strategies (`/app/rms/list`)

### Testing

#### Unit Tests

- `services/__tests__/riskManagementStrategyService.test.js` - Service CRUD and business logic
- `services/__tests__/rmsTemplateService.test.js` - Template management

#### Test Coverage

- CRUD operations
- Validation functions
- Conformance checking
- Template creation
- Approval workflow

### Version History

All changes to RMS are tracked in `rms_revision_history`:
- Version number increment
- Revision reason
- Changes summary
- Revised by user
- Timestamp

### Export/Import

- **Export**: PDF, Word, Print
- **Import**: Not currently supported (future enhancement)

### Performance Considerations

- Lazy loading of child entities
- Efficient queries with proper indexing
- Pagination for large lists (RMSList)
- Memoization in React components where needed

### Security

- Row Level Security (RLS) policies on all tables
- User authentication required for all operations
- Role-based access control (PMO Admin, Project Manager, etc.)
- Soft deletes (is_deleted flag)

### Error Handling

- Service functions return `{ success: boolean, data?, error? }` format
- UI components display error messages to users
- Console logging for debugging
- Graceful degradation for missing data

### Future Enhancements

- Full CRUD forms for all child entities (currently display-only for some)
- Calendar view for scheduled activities
- Activity scheduling reminders
- Role assignment notifications
- CSV export option
- Bulk operations
- RMS templates marketplace (public templates)

## File Structure

```
src/
├── components/
│   └── rms/
│       ├── RMSForm.jsx
│       ├── StandardCard.jsx
│       ├── StandardForm.jsx
│       ├── StandardsSection.jsx
│       ├── MethodCard.jsx
│       ├── MethodForm.jsx
│       ├── MethodsSection.jsx
│       ├── ScalesSection.jsx
│       ├── MatrixSection.jsx
│       ├── StrategiesSection.jsx
│       ├── ToolsSection.jsx
│       ├── TemplatesSection.jsx
│       ├── RecordsSection.jsx
│       ├── ReportsSection.jsx
│       ├── RolesSection.jsx
│       ├── ActivitiesSection.jsx
│       ├── CompletenessIndicator.jsx
│       ├── ConformanceChecker.jsx
│       ├── RMSApprovalWorkflow.jsx
│       ├── RMSRevisionHistory.jsx
│       ├── RMSExportMenu.jsx
│       └── RMSPrintView.jsx
├── pages/
│   ├── RMSView.jsx
│   └── RMSList.jsx
├── services/
│   ├── riskManagementStrategyService.js
│   ├── rmsTemplateService.js
│   ├── rmsRiskStandardsService.js
│   ├── rmsIdentificationMethodsService.js
│   ├── rmsAssessmentScalesService.js
│   ├── rmsRiskMatrixService.js
│   ├── rmsResponseStrategiesService.js
│   ├── rmsToolsTechniquesService.js
│   ├── rmsTemplatesFormsService.js
│   ├── rmsRecordsService.js
│   ├── rmsReportsService.js
│   ├── rmsScheduledActivitiesService.js
│   └── rmsRolesResponsibilitiesService.js
├── utils/
│   └── rmsExport.js
└── services/__tests__/
    ├── riskManagementStrategyService.test.js
    └── rmsTemplateService.test.js

SQL/
├── v197_risk_management_strategy_tables.sql
├── v198_risk_management_strategy_rls_policies.sql
├── v199_pmo_admin_risk_management_strategies_menu.sql
└── v200_rms_organization_templates.sql
```
