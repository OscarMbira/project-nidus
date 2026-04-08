# Issue Report Technical Documentation

**Version**: 1.0  
**Date**: 2026-01-16  
**Module**: Issue Management

## Overview

The Issue Report module provides comprehensive CRUD operations for formal issue reports based on PRINCE2 methodology. This document provides technical details for developers working with the Issue Report system.

## Architecture

### Database Schema

#### Main Table: `issue_reports`
- **Relationship**: Optional one-to-one with `issues` table (UNIQUE constraint on `issue_id`)
- **Key Fields**: `report_reference`, `version_no`, `report_status`, comprehensive impact analysis fields
- **Workflow Fields**: Approval, distribution, decision tracking
- **Audit Fields**: Standard created_at, updated_at, created_by, etc.

#### Child Tables
1. **`issue_report_options`**: Options analysis with pros/cons, implications
2. **`issue_report_revision_history`**: Version control and change tracking
3. **`issue_report_approvals`**: Multi-approver workflow
4. **`issue_report_distribution`**: Distribution list with read receipts

### Service Layer

#### `issueReportService.js`
Main service for Issue Report CRUD operations:

```javascript
// CRUD Operations
createIssueReport(issueId, reportData)
getIssueReportById(reportId)
getIssueReportByIssueId(issueId)
updateIssueReport(reportId, updates)
deleteIssueReport(reportId)
getIssueReportsByProject(projectId, filters)
getIssueReportsRequiringDecision(projectId)

// Helper Methods
generateReportReference(issueId)
validateReportCompleteness(reportId)
autoPopulateFromIssue(reportId, issueId)
canCreateReport(issueId)

// Workflow Methods
submitReport(reportId, submittedToId)
closeReport(reportId, closureData)
linkToDecision(reportId, decisionId)
```

#### `issueReportOptionService.js`
Options management:

```javascript
addOption(reportId, optionData)
updateOption(optionId, updates)
deleteOption(optionId)
getOptions(reportId)
setRecommendedOption(reportId, optionId)
reorderOptions(reportId, optionOrders)
```

#### `issueReportApprovalService.js`
Approval workflow:

```javascript
addApprover(reportId, approverData)
removeApprover(approvalId)
approveReport(approvalId, approverId, comments, conditions)
rejectReport(approvalId, approverId, comments)
deferReport(approvalId, approverId, comments)
getApprovals(reportId)
getPendingApprovals(userId)
```

#### `issueReportDistributionService.js`
Distribution management:

```javascript
addDistributionRecipient(reportId, recipientData)
removeDistributionRecipient(distributionId)
getDistributionList(reportId)
sendReportToDistribution(reportId)
trackDistributionStatus(distributionId, status)
acknowledgeReceipt(distributionId, userId)
```

#### `issueReportNotificationService.js`
Notification handling:

```javascript
notifyReportSubmitted(reportId, submittedToId)
notifyApprovalDecision(reportId, approvalId, decision, comments)
notifyDistribution(reportId)
notifyDecisionRequired(reportId)
```

### Component Structure

#### Main Form Component
`IssueReportForm.jsx` - Multi-step wizard with 7 sections

#### Section Components
- `IssueReportDocumentInfoSection.jsx`
- `IssueReportIssueSummarySection.jsx`
- `IssueReportImpactAnalysisSection.jsx`
- `IssueReportOptionsSection.jsx`
- `IssueReportDecisionSection.jsx`
- `IssueReportClosureSection.jsx`
- `IssueReportDistributionSection.jsx`

#### Supporting Components
- `IssueReportCompletenessIndicator.jsx`
- `IssueReportApprovalWorkflow.jsx`
- `IssueReportQuickView.jsx`
- `CreateIssueReportButton.jsx`

### Page Components

- `IssueReportCreate.jsx` - Create new report
- `IssueReportEdit.jsx` - Edit existing report
- `IssueReportView.jsx` - Read-only view with tabs
- `IssueReportsList.jsx` - List all reports with search/filter

## Database Functions

### Reference Generation
```sql
generate_issue_report_reference(p_issue_id UUID) RETURNS VARCHAR
```
Generates unique report reference: ISR-{PROJECT_REF}-{ISSUE_IDENTIFIER}

### Auto-population
```sql
auto_populate_issue_report_from_issue(p_report_id UUID, p_issue_id UUID) RETURNS VOID
```
Populates report fields from linked issue (creates snapshot)

### Validation
```sql
validate_issue_report_completeness(p_report_id UUID) RETURNS TABLE
```
Returns section-by-section validation results

### Decision Tracking
```sql
get_issue_reports_requiring_decision(p_project_id UUID) RETURNS TABLE
```
Returns reports awaiting Project Board decisions

## Validation Rules

### Document Information
- Report reference: Required, auto-generated
- Version number: Required, format X.Y
- Report date: Required, not in future
- Author: Required (ID or name)

### Issue Summary
- Issue title: Required
- Issue description: Required

### Impact Analysis
- If affecting tolerances: At least one impact variable required
- Tolerance impact details: Required if affecting tolerances

### Options
- If decision required: At least one option required
- Recommendation: Required if decision required
- One option must be marked recommended

### Decision
- Decision by: Required if decision required
- Decision made: Required if closing report with decision required
- Decision date: Required if decision made

### Closure
- Closure date: Required if status is closed
- Closure outcome: Required if status is closed

## RLS Policies

### View Access
- Project members can view reports for their projects
- Distribution recipients can view reports distributed to them
- PMO Admins can view all reports

### Create Access
- Project Managers and PMO Admins only

### Edit Access
- Authors can edit reports in 'draft' or 'submitted' status
- PMO Admins can always edit (override)

### Approval Access
- Approvers can update their own approvals
- Report authors cannot approve their own reports

## Workflow States

1. **draft**: Report being prepared
2. **submitted**: Submitted for review/approval
3. **under_review**: Under review by approvers
4. **approved**: Approved, can be distributed
5. **distributed**: Sent to distribution list
6. **closed**: Issue resolved, report closed

## State Transitions

- `draft` → `submitted` (on submit)
- `submitted` → `under_review` (when approvers assigned)
- `under_review` → `approved` (when all approvals received)
- `approved` → `distributed` (on distribution)
- `*` → `closed` (when issue resolved)

## Integration Points

### With Issue Register
- One-to-one relationship via `issue_id`
- Auto-population on creation
- Decision linking to `issue_decisions` table

### With Notification System
- Event: `issue_report.submitted`
- Event: `issue_report.approval_decided`
- Event: `issue_report.distributed`
- Event: `issue_report.decision_required`

### With Email Service
- Approval request emails
- Approval decision notifications
- Distribution emails

### With Document Governance
- Reports can be linked to document governance system
- Version control and revision history
- Approval workflow integration

## API Endpoints

### Routes

```
/projects/:projectId/issues/:issueId/reports/create
/projects/:projectId/issues/:issueId/reports/:reportId
/projects/:projectId/issues/:issueId/reports/:reportId/edit
/projects/:projectId/issues/reports
```

## Utility Functions

### Validation
`src/utils/issueReportValidation.js`
- Section-by-section validation
- Submission readiness checks
- Format validation

### Export
`src/utils/issueReportExport.js`
- PDF export (browser print)
- Word export (HTML format)
- Clipboard copy

### Auto-save
`src/utils/issueReportAutoSave.js`
- LocalStorage for new reports
- Server auto-save for existing reports
- Draft recovery

## Performance Considerations

1. **Options Loading**: Options are loaded separately to optimize form rendering
2. **Lazy Loading**: Related data (approvals, distribution) loaded on-demand
3. **Auto-save Throttling**: 30-second interval prevents excessive server calls
4. **Indexes**: All foreign keys and search fields are indexed

## Error Handling

- Service methods throw errors with descriptive messages
- UI components display user-friendly error messages
- Validation errors displayed inline per field
- Network errors handled with retry prompts

## Testing Recommendations

### Unit Tests
- Service methods with mocked Supabase
- Validation functions
- Utility functions

### Integration Tests
- CRUD operations
- Workflow state transitions
- Approval process
- Distribution process

### Component Tests
- Form rendering and validation
- Wizard navigation
- Options management
- Approval workflow UI

### E2E Tests
- Complete report creation flow
- Approval workflow
- Distribution process
- Export functionality

## Future Enhancements

1. **Version Comparison**: Compare different versions of reports
2. **Template Library**: Pre-defined templates for common issue types
3. **Collaborative Editing**: Real-time multi-user editing
4. **Advanced Analytics**: Report analytics and dashboards
5. **AI Suggestions**: AI-powered option analysis suggestions
6. **Mobile App**: Mobile app for quick report creation
7. **Voice Input**: Voice-to-text for report creation

## Migration Notes

### SQL Migration Order
1. Run `v201_issue_report_tables.sql`
2. Run `v202_issue_report_rls_policies.sql`

### Prerequisites
- v174_issue_register_tables.sql
- v01 through v07 (core tables and functions)
- projects, users, accounts tables

## Troubleshooting

### Common Issues

**Issue**: Cannot create report - constraint violation
- **Cause**: Report already exists for issue
- **Solution**: Check with `canCreateReport()` before creation

**Issue**: Auto-population fails
- **Cause**: Issue data missing or invalid
- **Solution**: Check issue exists and has required fields

**Issue**: RLS policy violation
- **Cause**: User lacks project membership or permissions
- **Solution**: Check user's project access and role

**Issue**: Validation fails on submission
- **Cause**: Missing required fields
- **Solution**: Check completeness indicator, complete all required sections

## Code Examples

### Creating a Report

```javascript
import { createIssueReport } from '../services/issueReportService';

const reportData = {
  report_date: new Date().toISOString().split('T')[0],
  author_id: currentUserId,
  report_status: 'draft'
};

const report = await createIssueReport(issueId, reportData);
```

### Adding Options

```javascript
import { addOption } from '../services/issueReportOptionService';

const option = {
  option_number: 1,
  option_title: 'Option 1 Title',
  option_description: 'Description',
  pros: 'Advantages',
  cons: 'Disadvantages',
  is_recommended: false
};

await addOption(reportId, option);
```

### Submitting for Approval

```javascript
import { submitReport } from '../services/issueReportService';

// Validates completeness automatically
await submitReport(reportId, submittedToId);
```

## Related Documentation

- [Database Schema](./SQL/v201_issue_report_tables.sql)
- [RLS Policies](./SQL/v202_issue_report_rls_policies.sql)
- [User Guide](./Issue_Report_User_Guide.md)
- [Implementation Plan](../projectplan/v195_Issue_Report_CRUD_Implementation_Plan.md)

---

**Last Updated**: 2026-01-16  
**Technical Version**: 1.0
