# Lessons Report Technical Documentation

**Version**: 1.0  
**Date**: 2026-01-16  
**Module**: Lessons Report Management

## Overview

The Lessons Report module provides comprehensive formal report generation functionality based on PRINCE2/Structured PM methodology. This document provides technical details for developers working with the Lessons Report system.

## Architecture

### Database Schema

#### Main Table

**`lessons_reports`** - Main Lessons Report table
- One-to-many relationship with projects (multiple reports per project)
- Links to lessons_logs (source of lessons data)
- Optional link to stage_boundaries (for stage reports)
- All standard audit fields

#### Child Tables

1. **`lessons_report_lessons`** - Lessons included in reports
2. **`lessons_report_recommendations`** - Structured recommendations
3. **`lessons_report_revision_history`** - Version control
4. **`lessons_report_approvals`** - Approval workflow
5. **`lessons_report_distribution`** - Distribution list
6. **`lessons_report_appendices`** - Supporting materials

### Service Layer

#### `lessonsReportService.js` (Enhanced)
Main report CRUD operations:
```javascript
createLessonsReport(projectId, reportData)
getLessonsReportById(reportId)
getLessonsReportsByProject(projectId)
getLessonsReportsByStage(stageBoundaryId)
updateLessonsReport(reportId, updates)
deleteLessonsReport(reportId)
generateReportReference(projectId, stageBoundaryId, reportType)
validateReportCompleteness(reportId)
autoPopulateFromLog(reportId, lessonsLogId, stageBoundaryId, startDate, endDate)
submitReport(reportId, submittedToId)
closeReport(reportId)
getReportStatistics(projectId)
```

#### `lessonsReportLessonService.js` (New)
Lesson inclusion management:
```javascript
addLessonToReport(reportId, lessonId, inclusionData)
removeLessonFromReport(reportLessonId)
getLessonsInReport(reportId)
updateLessonInclusion(reportLessonId, updates)
syncLessonsFromLog(reportId, filters)
reorderLessons(reportId, lessonOrders)
```

#### `lessonsReportRecommendationService.js` (New)
Recommendations management:
```javascript
addRecommendation(reportId, recommendationData)
updateRecommendation(recommendationId, updates)
deleteRecommendation(recommendationId)
getRecommendations(reportId)
syncRecommendationsFromLessons(reportId)
updateImplementationStatus(recommendationId, status, notes)
getRecommendationsByResponsible(responsiblePartyId)
```

#### `lessonsReportApprovalService.js` (New)
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

#### `lessonsReportDistributionService.js` (New)
Distribution management:
```javascript
addDistributionRecipient(reportId, recipientData)
removeDistributionRecipient(distributionId)
getDistributionList(reportId)
sendReportToDistribution(reportId)
trackDistributionStatus(distributionId, status)
acknowledgeReceipt(distributionId, userId)
```

#### `lessonsReportAppendixService.js` (New)
Appendices management:
```javascript
addAppendix(reportId, appendixData)
updateAppendix(appendixId, updates)
deleteAppendix(appendixId)
getAppendices(reportId)
reorderAppendices(reportId, appendixOrders)
```

### Component Structure

#### Main Form
- `LessonsReportForm.jsx` - Multi-step form wizard

#### Form Sections
- `LessonsReportDocumentInfoSection.jsx` - Document control
- `LessonsReportOverviewSection.jsx` - Overview & context
- `LessonsReportOverallReviewSection.jsx` - Overall review
- `LessonsReportMeasuresSection.jsx` - Six variables review
- `LessonsReportLessonsSection.jsx` - Lesson selection/inclusion
- `LessonsReportRecommendationsSection.jsx` - Recommendations management
- `LessonsReportAppendicesSection.jsx` - Appendices management
- `LessonsReportDistributionSection.jsx` - Approval & distribution

#### Supporting Components
- `LessonsReportHeader.jsx` - Report header with metadata
- `LessonsReportCompletenessIndicator.jsx` - Completeness tracking
- `LessonsReportStatusBadge.jsx` - Status indicator
- `LessonsReportsWidget.jsx` - Reports list widget
- `CreateLessonsReportButton.jsx` - Quick action button
- `LessonsLogToReportSyncWidget.jsx` - Sync widget

#### Pages
- `LessonsReportCreate.jsx` - Create page
- `LessonsReportEdit.jsx` - Edit page
- `LessonsReportView.jsx` - View page
- `LessonsReportsList.jsx` - List page

### Database Functions

#### Reference Generation
```sql
generate_lessons_report_reference(p_project_id UUID, p_stage_boundary_id UUID, p_report_type VARCHAR) RETURNS VARCHAR
```

#### Auto-Population
```sql
auto_populate_lessons_report_from_log(p_report_id UUID, p_lessons_log_id UUID, p_stage_boundary_id UUID, p_start_date DATE, p_end_date DATE) RETURNS VOID
```

#### Validation
```sql
can_create_lessons_report(p_project_id UUID, p_stage_boundary_id UUID, p_report_type VARCHAR) RETURNS BOOLEAN
validate_lessons_report_completeness(p_report_id UUID) RETURNS TABLE
```

#### Statistics
```sql
get_lessons_report_statistics(p_project_id UUID) RETURNS TABLE
```

## Validation Rules

### Required Fields
- Report Date: Required
- Purpose: Minimum 50 characters
- Executive Summary: Minimum 100 characters
- Overall Review: At least one section (what went well/what didn't) must have content
- Review of Measures: At least 3 variables should have review content
- Significant Lessons: At least one lesson should be included
- Recommendations: At least one recommendation required if lessons included

### Completeness Criteria
- Overview & Context: Purpose and Executive Summary required
- Overall Review: At least one section required
- Review of Measures: At least 3 variables required
- Significant Lessons: At least one lesson required
- Recommendations: At least one recommendation required

## RLS Policies

- Users can view lessons reports for projects they're members of
- Only Project Managers and PMO Admins can create lessons reports
- Only authors and PMO Admins can edit reports in 'draft' or 'submitted' status
- Approved/distributed reports are read-only (except PMO Admins)
- Distribution recipients can view reports distributed to them
- Audit trail is immutable

## Approval Workflow

### Workflow States
1. Draft → Submitted → Under Review → Approved → Distributed → Closed

### Approval Process
1. Create report (status: draft)
2. Complete all sections
3. Submit for approval (status: submitted)
4. Approvers review (status: under_review)
5. All approvals complete (status: approved)
6. Distribute to recipients (status: distributed)
7. Close report (status: closed)

## Integration Points

### With Lessons Log
- Auto-population from log with filters
- Sync lessons from log
- Sync recommendations from lessons
- Link report to lessons_log_id

### With Projects
- Reports belong to projects
- Summary widget on project dashboard (can be added)
- Quick access from project navigation

### With Stage Boundaries
- Stage reports link to stage_boundaries
- Reporting period filters lessons by date range

## API Endpoints

### Routes

```
/app/projects/:projectId/lessons/reports - List reports
/app/projects/:projectId/lessons/reports/create - Create report
/app/projects/:projectId/lessons/reports/:reportId - View report
/app/projects/:projectId/lessons/reports/:reportId/edit - Edit report
```

## Export Functionality

### PDF Export
- Uses browser print functionality
- Generates printable HTML with proper formatting
- Includes all sections and supporting data

### Word Export
- Converts HTML to Word document format
- Downloads as .doc file
- Maintains formatting and structure

## Auto-Save

- Auto-saves every 30 seconds for existing reports
- Visual indicator shows save status
- Draft recovery on page reload (future enhancement)

## Code Examples

### Creating a Report

```javascript
import { createLessonsReport } from '../services/lessonsReportService';

const reportData = {
  report_type: 'project',
  report_date: new Date().toISOString().split('T')[0],
  purpose: 'Compile final project lessons for organizational learning',
  executive_summary: 'This report summarizes key lessons learned...',
  auto_populate: true
};

const result = await createLessonsReport(projectId, reportData);
```

### Syncing Lessons from Log

```javascript
import { syncLessonsFromLog } from '../services/lessonsReportLessonService';

const filters = {
  effect_type: 'positive',
  priority: 'high'
};

const result = await syncLessonsFromLog(reportId, filters);
// Returns: { added: 5, skipped: 2, lessons: [...] }
```

### Submitting for Approval

```javascript
import { submitReport } from '../services/lessonsReportService';

// Validates completeness automatically
const result = await submitReport(reportId, approverUserId);
```

## Related Documentation

- [Database Schema](./SQL/v203_lessons_report_tables.sql)
- [RLS Policies](./SQL/v204_lessons_report_rls_policies.sql)
- [User Guide](./Lessons_Report_User_Guide.md)
- [Implementation Plan](../projectplan/v196_Lessons_Report_CRUD_Implementation_Plan.md)

---

**Last Updated**: 2026-01-16  
**Technical Version**: 1.0
