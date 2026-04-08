# End Project Report Technical Documentation

## Overview

This document provides technical documentation for the End Project Report (EPR) module, including database schema, service layer, API endpoints, and integration points.

## Database Schema

### Main Table: `end_project_reports`

Enhanced table with the following key columns:

```sql
- id (UUID, PK)
- project_id (UUID, FK to projects)
- document_ref (VARCHAR) - Auto-generated reference
- version_no (VARCHAR) - Document version
- report_title (VARCHAR)
- report_date (DATE)
- author_id (UUID, FK to users)
- owner_id (UUID, FK to users)
- client_id (UUID, FK to users)
- date_of_this_revision (DATE)
- project_managers_report (TEXT)
- abnormal_situations (TEXT)
- abnormal_situations_impact (TEXT)
- premature_closure_reason (TEXT)
- project_assurance_agreement (BOOLEAN)
- closure_type (ENUM)
- approval_status (ENUM)
- is_deleted (BOOLEAN)
- created_at, updated_at, deleted_at (TIMESTAMPTZ)
```

### Supporting Tables

1. **end_project_report_revision_history** - Tracks document revisions
2. **end_project_report_approvals** - Approval workflow
3. **end_project_report_distribution** - Distribution list
4. **end_project_report_business_case_review** - Business case benefits review
5. **end_project_report_objectives_review** - Objectives performance review
6. **end_project_report_team_performance** - Team recognition
7. **end_project_report_quality_records** - Quality activity records
8. **end_project_report_approval_records** - Product approval records
9. **end_project_report_off_specifications** - Off-specification products
10. **end_project_report_lessons** - Lessons learned
11. **end_project_report_follow_on_actions** - Follow-on actions
12. **end_project_report_quality_checks** - Quality criteria validation

## Service Layer

### Main Service: `endProjectReportService.js`

**Key Functions:**
- `createEndProjectReport(projectId, reportData)` - Create new EPR
- `getEndProjectReportById(reportId)` - Get EPR by ID
- `getEndProjectReportByProject(projectId)` - Get EPR for project
- `updateEndProjectReport(reportId, updates)` - Update EPR
- `deleteEndProjectReport(reportId)` - Soft delete EPR
- `generateDocumentRef(projectId)` - Generate document reference
- `calculateBenefitsVariance(reportId)` - Calculate benefits variance
- `getBusinessCaseForReview(projectId)` - Get business case data
- `runQualityChecks(reportId)` - Run quality criteria checks
- `getQualityCheckStatus(reportId)` - Get quality status
- `canCloseProject(reportId)` - Check if project can be closed
- `getOpenIssuesForFollowOn(projectId)` - Get open issues
- `getOpenRisksForFollowOn(projectId)` - Get open risks

### Specialized Services

1. **eprRevisionService.js** - Version management
2. **eprApprovalService.js** - Approval workflow
3. **eprBusinessCaseReviewService.js** - Business case review
4. **eprObjectivesReviewService.js** - Objectives review
5. **eprTeamPerformanceService.js** - Team performance
6. **eprProductsReviewService.js** - Products review
7. **eprLessonsService.js** - Lessons management
8. **eprFollowOnService.js** - Follow-on actions
9. **eprQualityCheckService.js** - Quality validation

## Database Functions

### `generate_end_project_report_ref(p_project_id UUID)`
Generates unique document reference (e.g., "EPR-PROJ001-001")

### `get_business_case_for_review(p_project_id UUID)`
Returns business case data for benefits comparison

### `calculate_benefits_variance(p_end_project_report_id UUID)`
Calculates variance between expected and realized benefits

### `get_open_issues_for_follow_on(p_project_id UUID)`
Returns open issues that need follow-on actions

### `get_open_risks_for_follow_on(p_project_id UUID)`
Returns open risks that need follow-on actions

### `initialize_epr_quality_checks(p_end_project_report_id UUID)`
Creates 4 quality check records for a new EPR

### `run_epr_quality_checks(p_end_project_report_id UUID)`
Executes automated quality validations

### `get_epr_quality_summary(p_end_project_report_id UUID)`
Returns quality check summary and completion status

### `escalate_lesson_to_corporate(p_lesson_id UUID, p_user_id UUID)`
Escalates a lesson to the corporate lessons library

## API Endpoints

### EPR CRUD Operations

```
POST   /api/projects/:projectId/end-project-reports
GET    /api/end-project-reports/:reportId
GET    /api/projects/:projectId/end-project-reports
PUT    /api/end-project-reports/:reportId
DELETE /api/end-project-reports/:reportId
```

### Business Case Review

```
POST   /api/end-project-reports/:reportId/business-case-reviews
GET    /api/end-project-reports/:reportId/business-case-reviews
PUT    /api/business-case-reviews/:reviewId
DELETE /api/business-case-reviews/:reviewId
GET    /api/end-project-reports/:reportId/benefits-comparison
GET    /api/end-project-reports/:reportId/benefits-variance
```

### Objectives Review

```
POST   /api/end-project-reports/:reportId/objectives-reviews
GET    /api/end-project-reports/:reportId/objectives-reviews
PUT    /api/objectives-reviews/:reviewId
DELETE /api/objectives-reviews/:reviewId
GET    /api/end-project-reports/:reportId/tolerance-performance
```

### Team Performance

```
POST   /api/end-project-reports/:reportId/team-performance
GET    /api/end-project-reports/:reportId/team-performance
PUT    /api/team-performance/:performanceId
DELETE /api/team-performance/:performanceId
```

### Products Review

```
POST   /api/end-project-reports/:reportId/quality-records
GET    /api/end-project-reports/:reportId/quality-records
PUT    /api/quality-records/:recordId
DELETE /api/quality-records/:recordId

POST   /api/end-project-reports/:reportId/approval-records
GET    /api/end-project-reports/:reportId/approval-records
PUT    /api/approval-records/:recordId

POST   /api/end-project-reports/:reportId/off-specifications
GET    /api/end-project-reports/:reportId/off-specifications
PUT    /api/off-specifications/:offSpecId
POST   /api/off-specifications/:offSpecId/grant-concession
```

### Lessons

```
POST   /api/end-project-reports/:reportId/lessons
GET    /api/end-project-reports/:reportId/lessons
PUT    /api/lessons/:lessonId
DELETE /api/lessons/:lessonId
POST   /api/lessons/:lessonId/escalate-to-corporate
GET    /api/end-project-reports/:reportId/lessons-summary
```

### Follow-On Actions

```
POST   /api/end-project-reports/:reportId/follow-on-actions
GET    /api/end-project-reports/:reportId/follow-on-actions
PUT    /api/follow-on-actions/:actionId
DELETE /api/follow-on-actions/:actionId
GET    /api/projects/:projectId/open-items-for-follow-on
POST   /api/follow-on-actions/:actionId/request-board-advice
```

### Quality Checks

```
POST   /api/end-project-reports/:reportId/quality-checks/run
GET    /api/end-project-reports/:reportId/quality-checks
GET    /api/end-project-reports/:reportId/quality-check-status
PUT    /api/quality-checks/:checkId
POST   /api/quality-checks/:checkId/override
GET    /api/end-project-reports/:reportId/can-close-project
```

### Approvals

```
POST   /api/end-project-reports/:reportId/submit-for-approval
POST   /api/approvals/:approvalId/approve
POST   /api/approvals/:approvalId/reject
GET    /api/end-project-reports/:reportId/approval-status
GET    /api/end-project-reports/:reportId/pending-approvals
```

### Revisions

```
POST   /api/end-project-reports/:reportId/create-version
GET    /api/end-project-reports/:reportId/version-history
GET    /api/end-project-reports/:reportId/versions/:version1/compare/:version2
```

## Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- **Project Managers**: Can create/edit reports for their projects (draft/rejected only)
- **PMO Admins**: Can view all reports across organization
- **Project Board Members**: Can approve reports
- **Project Assurance Roles**: Can review and agree with reports
- **Read-Only**: Approved reports are read-only for all users except PMO Admins

## Quality Criteria Validation

### Criterion 1: Abnormal Situations Described
- **Automated**: Yes
- **Blocking**: Yes (if abnormal closure type)
- **Validation**: 
  - If `closure_type` != 'normal', check `abnormal_situations` is populated
  - Check `abnormal_situations_impact` is populated
  - Minimum 50 characters for each field

### Criterion 2: All Issues Closed or Have Follow-On Action
- **Automated**: Yes
- **Blocking**: Yes
- **Validation**:
  - Query all issues for project
  - Each issue must have status 'closed' OR be linked in `end_project_report_follow_on_actions`
  - Count open issues without follow-on actions = 0

### Criterion 3: Documentation Accompanies Follow-On Actions
- **Automated**: Yes
- **Blocking**: No (warning only)
- **Validation**:
  - For each `end_project_report_follow_on_actions` entry
  - Check `documentation_attached` = true OR `documentation_urls` not empty
  - At least 80% of follow-on actions have documentation

### Criterion 4: Project Assurance Roles Agree
- **Automated**: Partial (requires manual confirmation)
- **Blocking**: Yes
- **Validation**:
  - Check `project_assurance_agreement` = true
  - Check `project_assurance_notes` is populated if agreement = false

## Integration Points

### Business Case Module
- Links to `business_cases` table
- Compares benefits against Business Case
- Calculates variance

### Issue Register
- Links open issues to follow-on actions
- Uses `get_open_issues_for_follow_on()` function

### Risk Register
- Links open risks to follow-on actions
- Uses `get_open_risks_for_follow_on()` function

### Lessons Learned
- Escalates lessons to corporate `lessons_learned` table
- Uses `escalate_lesson_to_corporate()` function

### Follow-On Actions
- Links to existing `follow_on_actions` table
- Tracks documentation and board advice requests

### Project Handover
- Links to `project_handover` table
- EPR completion may trigger handover process

### Document Governance
- EPRs are registered in document governance system
- Version control and approval tracking

## Component Architecture

### Main Components

1. **EndProjectReportFormEnhanced.jsx** - Main multi-step form
2. **EndProjectReportView.jsx** - Read-only comprehensive view
3. **EndProjectReportWizard.jsx** - Creation/editing wizard page
4. **EPRComparisonView.jsx** - Business case comparison view

### Form Section Components

1. **EPRDocumentHeader.jsx** - Document metadata
2. **EPRProjectManagerReport.jsx** - PM report section
3. **EPRBusinessCaseReview.jsx** - Business case review
4. **EPRObjectivesReview.jsx** - Objectives review
5. **EPRTeamPerformance.jsx** - Team performance
6. **EPRProductsReview.jsx** - Products review
7. **EPRLessonsReport.jsx** - Lessons report
8. **EPRFollowOnActions.jsx** - Follow-on actions
9. **EPRQualityCriteria.jsx** - Quality criteria

### Supporting Components

1. **EPRStatusBadge.jsx** - Status indicator
2. **EPRQualityProgress.jsx** - Quality progress indicator
3. **EPRRevisionHistory.jsx** - Revision history
4. **EPRApprovals.jsx** - Approval status
5. **EPRDistribution.jsx** - Distribution list
6. **EPRPrintView.jsx** - Print/export view
7. **BenefitReviewCard.jsx** - Benefit review card

## Export Functionality

### PDF Export
- Uses browser print functionality
- Generates print-ready HTML
- Includes all sections

### Word Export
- Generates HTML format Word document
- Includes all sections
- Preserves formatting

### Print View
- Print-optimized layout
- Hides navigation elements
- Includes all report sections

## Testing

### Unit Tests
- Service layer tests in `src/services/__tests__/`
- Tests for all major service functions
- Mock Supabase client

### Integration Tests
- Workflow tests in `src/test/integration/`
- End-to-end EPR creation and approval
- Quality criteria validation tests

## Performance Considerations

- Lazy loading of related data
- Pagination for large lists
- Indexed database queries
- Caching of business case data

## Security

- Row Level Security (RLS) on all tables
- Authentication required for all operations
- Role-based access control
- Audit trail for all changes

## Future Enhancements

- AI-generated executive summary
- Automated benefits tracking integration
- Integration with financial systems
- Comparison with similar projects
- Templates based on project type
- Mobile app for final reviews
- Video/audio attachments for lessons
