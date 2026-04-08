# Checkpoint Report Technical Documentation

**Version**: 1.0  
**Date**: 2026-01-20  
**Module**: Structured Project Management - Controlling a Stage

## Architecture Overview

The Checkpoint Report module provides comprehensive CRUD operations for periodic checkpoint reports based on Structured PM methodology. The implementation follows a layered architecture:

- **Database Layer**: PostgreSQL with Supabase
- **Service Layer**: JavaScript services for business logic
- **UI Layer**: React components with multi-step forms
- **Routing**: React Router integration

## Database Schema

### Main Table: `checkpoint_reports`
Enhanced from v23 with 24 new columns:
- Document metadata (version_no, document_ref, author_id, owner_id, client_id)
- Reporting period fields
- Tolerance status fields
- Actual and forecast values

### Supporting Tables (8 tables)
1. `checkpoint_report_revision_history` - Version control
2. `checkpoint_report_approvals` - Approval workflow
3. `checkpoint_report_distribution` - Distribution tracking
4. `checkpoint_report_products` - Products tracking
5. `checkpoint_report_quality_activities` - Quality activities
6. `checkpoint_report_follow_ups` - Follow-up items
7. `checkpoint_report_lessons` - Lessons identified
8. `checkpoint_report_quality_checks` - Quality criteria validation

### Database Functions

#### `generate_checkpoint_report_ref(p_project_id, p_work_package_id)`
Generates unique document reference: `CPR-{PROJECT_CODE}-{WP_CODE}-{SEQUENCE}`

#### `get_previous_checkpoint_report(p_project_id, p_work_package_id, p_current_report_id)`
Returns the most recent previous report for carry-forward logic.

#### `carry_forward_open_items(p_source_report_id, p_target_report_id)`
Copies open follow-up items from previous report to new report.

#### `initialize_checkpoint_quality_checks(p_checkpoint_report_id)`
Creates 5 quality check records with predefined criteria.

#### `run_checkpoint_quality_checks(p_checkpoint_report_id)`
Executes automated validation for all quality criteria.

#### `get_checkpoint_quality_summary(p_checkpoint_report_id)`
Returns quality check summary with blocking issues.

#### `get_work_package_tolerance_status(p_work_package_id)`
Calculates tolerance status from stage_tolerances table.

## Service Layer

### Main Service: `checkpointReportService.js`

**CRUD Operations:**
- `createCheckpointReport(projectId, workPackageId, reportData)`
- `getCheckpointReportById(reportId)`
- `getCheckpointReportsByProject(projectId, filters)`
- `getCheckpointReportsByWorkPackage(workPackageId, filters)`
- `updateCheckpointReport(reportId, updates)`
- `deleteCheckpointReport(reportId)` - Soft delete
- `getLatestCheckpointReport(workPackageId)`

**Helper Methods:**
- `getPreviousCheckpointReport(projectId, workPackageId, currentReportId)`
- `carryForwardFromPrevious(targetReportId, sourceReportId)`
- `calculateNextReportDate(workPackageId)`
- `getReportingFrequency(workPackageId)`
- `getToleranceStatus(workPackageId)`
- `calculateVariance(reportId)`
- `runQualityChecks(reportId)`
- `getQualityCheckStatus(reportId)`
- `canSubmitForApproval(reportId)`

### Specialized Services

1. **checkpointReportVersionService.js**
   - Version control and revision history
   - `createNewVersion(reportId, summaryOfChanges, changesMarked)`
   - `getVersionHistory(reportId)`
   - `compareVersions(reportId, version1, version2)`

2. **checkpointReportApprovalService.js**
   - Approval workflow management
   - `submitForApproval(reportId, submittedToId)`
   - `approveReport(reportId, approvalId, comments)`
   - `rejectReport(reportId, approvalId, comments)`
   - `getApprovalStatus(reportId)`
   - `getPendingApprovals(userId)`

3. **checkpointReportProductsService.js**
   - Product/deliverable tracking
   - `addProduct(reportId, productData)`
   - `updateProduct(productId, updates)`
   - `deleteProduct(productId)`
   - `getProductsByReport(reportId, periodType)`
   - `getProductsInDevelopment(reportId)`
   - `getProductsCompleted(reportId)`
   - `reorderProducts(reportId, productOrders)`

4. **checkpointReportQualityService.js**
   - Quality activities and checks
   - `addQualityActivity(reportId, activityData)`
   - `updateQualityActivity(activityId, updates)`
   - `deleteQualityActivity(activityId)`
   - `getQualityActivities(reportId, periodType)`
   - `getQualityChecks(reportId)`
   - `updateQualityCheck(checkId, updates)`
   - `runQualityChecks(reportId)`
   - `getQualityCheckStatus(reportId)`

5. **checkpointReportFollowUpService.js**
   - Follow-up item management
   - `addFollowUp(reportId, followUpData)`
   - `updateFollowUp(followUpId, updates)`
   - `markFollowUpComplete(followUpId, resolution)`
   - `getFollowUps(reportId, status)`
   - `getOpenFollowUps(reportId)`
   - `carryForwardItems(targetReportId, sourceReportId)`

6. **checkpointReportLessonsService.js**
   - Lessons identified tracking
   - `addLesson(reportId, lessonData)`
   - `updateLesson(lessonId, updates)`
   - `escalateToLessonsLog(lessonId, lessonsLogId)`
   - `getLessons(reportId)`

## UI Components

### Main Form Component
**CheckpointReportForm.jsx**
- 10-step wizard interface
- Form validation per step
- Auto-save capability (can be added)
- Quality check integration
- Mode support: create, edit, view

### Section Components (10 components)
1. `CheckpointReportHeader.jsx` - Document metadata
2. `ReportingPeriodSection.jsx` - Period dates
3. `FollowUpsSection.jsx` - Follow-up items with carry-forward
4. `CurrentPeriodProductsSection.jsx` - Products tracking
5. `CurrentPeriodQualitySection.jsx` - Quality activities
6. `CurrentPeriodLessonsSection.jsx` - Lessons with escalation
7. `NextPeriodSection.jsx` - Next period planning
8. `ToleranceStatusSection.jsx` - Tolerance dashboard
9. `IssuesRisksSection.jsx` - Issues and risks summary
10. `CheckpointQualityCriteria.jsx` - Quality validation UI

### Supporting Components (11 components)
1. `CheckpointReportStatusBadge.jsx` - Status indicator
2. `CheckpointQualityProgress.jsx` - Quality progress bar
3. `ProductCard.jsx` - Product display card
4. `FollowUpCard.jsx` - Follow-up item card
5. `LessonCard.jsx` - Lesson display card
6. `ToleranceGauge.jsx` - Visual tolerance indicator
7. `CheckpointReportRevisionHistory.jsx` - Version history
8. `CheckpointReportApprovals.jsx` - Approval workflow UI
9. `CheckpointReportDistribution.jsx` - Distribution management
10. `CheckpointReportPrintView.jsx` - Print/export view
11. Additional utility components

### Page Components (4 pages)
1. `CheckpointReportList.jsx` - List all reports with filters
2. `CheckpointReportCreate.jsx` - Create new report
3. `CheckpointReportEdit.jsx` - Edit existing report
4. `CheckpointReportView.jsx` - Read-only view with tabs

## Routing

Routes added to `App.jsx`:
- `/app/projects/:projectId/work-packages/:workPackageId/checkpoint-reports` - List
- `/app/projects/:projectId/work-packages/:workPackageId/checkpoint-reports/create` - Create
- `/app/projects/:projectId/work-packages/:workPackageId/checkpoint-reports/:reportId` - View
- `/app/projects/:projectId/work-packages/:workPackageId/checkpoint-reports/:reportId/edit` - Edit

## Business Logic

### Auto Carry-Forward
- Automatically copies open follow-up items from previous report
- Triggered on report creation
- Items marked as "carried_forward" status

### Tolerance Calculation
- Reads from `stage_tolerances` table
- Calculates variance (actual vs. baseline)
- Determines status: within, approaching, exceeded
- Updates report tolerance fields

### Version Control
- Auto-increments version on save (minor version)
- Creates revision history entry
- Tracks changes and revision dates

### Quality Criteria Validation
- 5 automated checks run on review step
- Blocking criteria prevent submission
- Manual override available with reason
- Quality summary shows completion percentage

### Approval Workflow
- State machine: draft → submitted → reviewed → approved
- Or: draft → submitted → rejected (can edit and resubmit)
- Approval records track approver, date, comments
- Version tracking for approvals

### Lessons Escalation
- Lessons can be escalated to project Lessons Log
- Creates lesson entry in lessons table
- Links checkpoint report lesson to lessons log entry
- Maintains reference for traceability

## Integration Points

### Work Packages
- Reports linked to work packages
- Products auto-populated from work package
- Tolerance calculated from work package data
- Reporting frequency from work package settings

### Stage Tolerances
- Tolerance status calculated from stage_tolerances
- Time, cost, scope tolerances tracked
- Variance calculation and status determination

### Lessons Log
- Lessons can be escalated to lessons_logs
- Creates formal lesson entry
- Maintains bidirectional link

### Issue/Risk Registers
- Summary fields link to issue/risk registers
- Can reference specific issues/risks
- Integration for comprehensive reporting

### Controlling Stage Page
- Integrated into Controlling Stage dashboard
- Shows recent checkpoint reports
- Quick access to create/view reports

## Security (RLS Policies)

### Access Control
- Team Managers: Create/edit reports for their work packages
- Project Managers: View all reports, approve/reject
- PMO Admins: View all reports across organization
- Only draft/rejected reports can be edited
- Approved reports are read-only

### RLS Policies
- Project membership checks
- Work package assignment checks
- Role-based access control
- Comprehensive policies for all 9 tables

## Export Functionality

### Print View
- Print-optimized HTML layout
- Browser print dialog
- Print stylesheet for formatting

### PDF Export
- Uses browser print functionality
- Opens print dialog
- User can save as PDF

### Word Export
- HTML format compatible with Word
- Downloads as .doc file
- Preserves formatting

## Performance Considerations

### Indexing
- Indexes on all foreign keys
- Indexes on frequently queried fields
- Composite indexes for common queries

### Query Optimization
- Efficient joins using Supabase select syntax
- Pagination for large lists
- Lazy loading of related data

### Caching
- Consider caching tolerance calculations
- Cache quality check results
- Cache work package products

## Error Handling

- Comprehensive try-catch blocks
- User-friendly error messages
- Console logging for debugging
- Graceful degradation

## Future Enhancements

1. Auto-save functionality
2. Document locking during approval
3. Notification system integration
4. Advanced PDF generation (jsPDF)
5. Email distribution
6. Dashboard metrics
7. Report templates
8. Batch operations
9. Mobile optimization
10. Offline support

## API Reference

See individual service files for detailed method signatures and parameters.

## Testing

### Unit Tests
- Service method tests
- Validation logic tests
- Business rule tests

### Integration Tests
- CRUD operation tests
- Workflow tests
- Integration with other modules

### Component Tests
- Form validation tests
- User interaction tests
- State management tests

## Deployment Notes

1. Run SQL migrations in order:
   - `v191_checkpoint_report_enhancement.sql`
   - `v192_checkpoint_report_rls_policies.sql`

2. Verify all tables created
3. Verify RLS policies enabled
4. Test service layer connectivity
5. Test UI components
6. Verify routing works
7. Test approval workflow
8. Test export functionality

## Maintenance

### Regular Tasks
- Monitor quality check performance
- Review approval workflow efficiency
- Check tolerance calculation accuracy
- Verify carry-forward logic

### Troubleshooting
- Check database function execution
- Verify RLS policy permissions
- Review service error logs
- Check component state management
