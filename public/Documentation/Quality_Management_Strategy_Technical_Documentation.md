# Quality Management Strategy - Technical Documentation

## Overview

This document provides technical details for developers working with the Quality Management Strategy (QMS) module.

## Architecture

### Database Schema

#### Main Table: `quality_management_strategies`

```sql
CREATE TABLE quality_management_strategies (
    id UUID PRIMARY KEY,
    project_id UUID UNIQUE NOT NULL,  -- One QMS per project
    qms_reference VARCHAR(50) UNIQUE NOT NULL,  -- Auto-generated: QMS-YYYY-NNN
    version_number VARCHAR(20) DEFAULT '1.0',
    
    -- Introduction
    purpose TEXT NOT NULL,
    objectives TEXT NOT NULL,
    scope TEXT NOT NULL,
    strategy_responsibility TEXT,
    
    -- Procedures
    quality_planning_approach TEXT,
    quality_control_approach TEXT NOT NULL,
    quality_assurance_approach TEXT NOT NULL,
    variance_from_corporate TEXT,
    variance_justification TEXT,
    
    -- References
    customer_qms_reference TEXT,
    supplier_qms_reference TEXT,
    corporate_quality_policy_reference TEXT,
    programme_quality_policy_reference TEXT,
    
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

1. **qms_quality_standards** - Quality standards to apply
2. **qms_quality_methods** - Quality control methods
3. **qms_quality_metrics** - Quality metrics to track
4. **qms_templates_forms** - Templates and forms
5. **qms_tools_techniques** - Tools and techniques
6. **qms_records** - Quality records definition
7. **qms_reports** - Quality reports definition
8. **qms_scheduled_activities** - Timing of quality activities
9. **qms_roles_responsibilities** - Quality roles
10. **qms_revision_history** - Version history
11. **qms_approvals** - Approval records
12. **qms_distribution** - Distribution list

### Organization Templates

#### Template Tables

1. **qms_organization_templates** - Organization-level templates
2. **qms_template_standards** - Standards in templates
3. **qms_template_methods** - Methods in templates
4. **qms_template_metrics** - Metrics in templates
5. **qms_template_roles** - Roles in templates

### Database Functions

#### `generate_qms_reference()`
Generates unique QMS reference (QMS-YYYY-NNN).

#### `create_qms_for_project(p_project_id UUID, p_user_id UUID)`
Creates QMS with default structure, including Quality Register record.

#### `create_qms_from_template(p_project_id UUID, p_template_id UUID, p_user_id UUID)`
Creates QMS from organization template, copying all standards, methods, metrics, and roles.

#### `validate_qms_completeness(p_qms_id UUID)`
Returns table with:
- section_name: Name of section
- is_complete: Boolean
- missing_items: Array of missing items
- recommendations: Recommendations text

#### `check_qms_conformance(p_qms_id UUID)`
Returns table with:
- standard_name: Name of standard
- conformance_status: Conforms/Referenced/Defined/Variance/Not Referenced
- gaps: Array of gaps
- recommendations: Recommendations text

#### `get_scheduled_quality_activities(p_project_id UUID, p_date_from DATE, p_date_to DATE)`
Returns upcoming quality activities for a project.

### RLS Policies

#### Main Table Policies

- **SELECT**: Users can view QMS for projects they're members of, or PMO Admins can view all
- **INSERT**: Project Managers (owner/admin) can create QMS for their projects, or PMO Admins can create any
- **UPDATE**: Project Managers can update draft/under_review QMS, or PMO Admins can update any

#### Child Table Policies

All child tables use `check_qms_access(p_qms_id)` helper function to verify access.

### Service Layer

#### Main Service: `qualityManagementStrategyService.js`

```javascript
// CRUD Operations
createQMS(projectId, qmsData)
createQMSForProject(projectId)
createQMSFromTemplate(projectId, templateId)
getQMSById(qmsId)
getQMSByProject(projectId)
updateQMS(qmsId, updates)
deleteQMS(qmsId)  // Only drafts

// Approval
submitForApproval(qmsId, approverIds)
approveQMS(approvalId, approverId, comments)

// Validation
validateCompleteness(qmsId)
checkConformance(qmsId)
getValidationStatus(qmsId)

// History
getRevisionHistory(qmsId)
```

#### Supporting Services

- `qmsQualityStandardsService.js` - Standards management
- `qmsQualityMethodsService.js` - Methods management
- `qmsQualityMetricsService.js` - Metrics management
- `qmsQualityRolesService.js` - Roles management
- `qmsScheduledActivitiesService.js` - Activities management
- `qmsQualityToolsService.js` - Tools management
- `qmsQualityRecordsService.js` - Records management
- `qmsQualityReportsService.js` - Reports management
- `qmsTemplateService.js` - Template management

### UI Components

#### Pages

- `QMSView.jsx` - Main QMS view with 11 tabs
- `QMSList.jsx` - PMO Admin list view
- `QMSTemplates.jsx` - Template management page

#### Components

- `QMSForm.jsx` - 5-step wizard for creating/editing QMS
- `QMSTemplateForm.jsx` - Template creation/editing form
- `QMSExportMenu.jsx` - Export options menu

### Routes

- `/app/projects/:projectId/qms` - View QMS for project
- `/app/qms/list` - PMO Admin list of all QMS
- `/app/qms/templates` - Template management (future)

### Validation Rules

#### Form Validation

**Step 1: Introduction**
- Purpose: Minimum 50 characters
- Objectives: Minimum 30 characters
- Scope: Minimum 30 characters

**Step 2: Quality Procedures**
- Quality Control Approach: Minimum 50 characters (required)
- Quality Assurance Approach: Minimum 50 characters (required)
- Variance Justification: Minimum 20 characters (required if variance specified)

#### Completeness Validation

The system checks:
1. Introduction section complete
2. Quality Procedures section complete
3. At least one quality standard
4. At least one quality method
5. At least one quality role (with independent level)
6. Quality Register included in records

#### Conformance Validation

The system checks:
1. Corporate policy conformance
2. Customer QMS alignment (if referenced)
3. Supplier QMS alignment (if referenced)
4. Mandatory standards implementation

### Integration Points

#### With Project

- One QMS per project (enforced with UNIQUE constraint)
- QMS status can be displayed on project dashboard
- QMS approval may be required for PID approval

#### With Project Product Description

- Link quality expectations from PPD
- Align acceptance criteria methods with QMS methods
- Quality methods support PPD acceptance testing

#### With Quality Register

- QMS defines Quality Register format via records table
- Quality methods linked to Quality Register entries
- Quality metrics tracked in Quality Register

#### With Stage Gates

- Quality activities scheduled at stage gates
- QMS compliance checked at gate reviews
- Gate approvals may require QMS approval

### Export Functionality

#### CSV Export

- Exports QMS data, standards, methods, metrics, roles, activities
- Formatted with sections and headers
- Suitable for analysis in Excel/Sheets

#### PDF Export

- Uses jsPDF and html2canvas (dynamically imported)
- Creates formatted PDF with all sections
- Multi-page support
- Suitable for sharing and documentation

#### Print

- Generates printable HTML
- Opens print dialog
- Optimized for printing

### Testing

#### Unit Tests

- `qualityManagementStrategyService.test.js` - Main service tests
- `qmsQualityStandardsService.test.js` - Standards service tests
- Additional service tests as needed

#### Test Coverage

- CRUD operations
- Validation functions
- Conformance checking
- Template creation
- Approval workflow

### Performance Considerations

#### Database Indexes

- `project_id` on `quality_management_strategies`
- `qms_id` on all child tables
- `status` on `quality_management_strategies`
- `account_id` on `qms_organization_templates`

#### Query Optimization

- Use `getOrCreateQMS()` to avoid unnecessary queries
- Batch fetch related data (standards, methods, etc.)
- Cache validation results when appropriate

### Security

#### RLS Policies

- Project team members can view QMS for their projects
- Only Project Managers can create/edit draft QMS
- PMO Admins have full access
- Approved QMS is read-only (changes through change control)

#### Data Access

- All access controlled through RLS policies
- `check_qms_access()` helper ensures consistent access checks
- Template access controlled by organization membership

### Migration Files

- `v180_quality_management_strategy_tables.sql` - Core tables and functions
- `v181_quality_management_strategy_rls_policies.sql` - RLS policies
- `v182_pmo_admin_quality_management_strategies_menu.sql` - Menu integration
- `v183_qms_organization_templates.sql` - Organization templates

### Future Enhancements

1. **Activity Calendar View**
   - Visual calendar of scheduled quality activities
   - Integration with project calendar

2. **Approval Panel Component**
   - Interactive approval workflow UI
   - Approval notifications

3. **Revision History Display**
   - Visual version history
   - Diff view of changes

4. **Distribution Management UI**
   - Manage distribution list
   - Email notifications

5. **Word Export**
   - Export to Word document format
   - Custom templates

6. **Integration with Change Control**
   - Link QMS changes to change requests
   - Version control integration

## Conclusion

The QMS module is fully integrated with the project management system, providing comprehensive quality management capabilities with proper security, validation, and export functionality.
