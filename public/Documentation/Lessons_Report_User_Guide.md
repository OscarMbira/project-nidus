# Lessons Report User Guide

**Version**: 1.0  
**Date**: 2026-01-16  
**Module**: Lessons Report Management

## Overview

The Lessons Report module enables project teams to create formal, structured Lessons Reports summarizing lessons learned from projects or project stages. These reports provide structured analysis of what went well, what could be improved, and actionable recommendations for future projects, following PRINCE2/Structured PM methodology.

## When to Create a Lessons Report

Create a Lessons Report when:

- **At Stage End**: Capture lessons learned from a completed stage
- **At Project End**: Create final project lessons report for organizational learning
- **Interim Reporting**: Create interim reports for organizational learning during project execution
- **Formal Documentation**: Need formal documentation of lessons for stakeholders
- **Organizational Learning**: Share lessons across projects and teams

## Creating a Lessons Report

### Step 1: Access Lessons Reports

1. Navigate to your project
2. Go to **Projects** → **[Your Project]** → **Lessons Log**
3. Click **"Create Report"** or **"View Reports"**
4. Or navigate directly to: `/app/projects/{projectId}/lessons/reports`

### Step 2: Select Report Type

Choose the type of report:
- **Project Report**: Final project lessons report
- **Stage Report**: Lessons from a specific stage
- **Interim Report**: Interim lessons report

### Step 3: Complete the Report

The report form has 8 steps:

#### Step 1: Document Information
- **Report Reference**: Auto-generated (e.g., LSR-PROJ001-PROJECT-001)
- **Version Number**: Document version (default: 1.0)
- **Report Date**: Date report was created
- **Report Type**: Project/Stage/Interim
- **Reporting Period**: Start and end dates (for stage reports)
- **Author**: Who created/wrote the report
- **Prepared By**: Who prepared the report

#### Step 2: Overview & Context
- **Purpose** (Required, min 50 characters): Purpose of this report
- **Context**: Context about the stage/project/domain
- **Scope**: Scope of lessons covered
- **Executive Summary** (Required, min 100 characters): High-level findings and key recommendations

#### Step 3: Overall Review
- **What Went Well**: Summary of positive outcomes
- **What Did Not Go Well**: Summary of problems and challenges
- **Surprises / Unexpected Events**: Unexpected events, risks that materialized
- **Planned vs Actual Analysis**: Comparison of planned vs actual outcomes

#### Step 4: Review of Measures (Six Variables)
Review performance across six project management variables:
- **Time / Schedule Performance**: Schedule performance review
- **Cost / Budget Performance**: Budget performance review
- **Quality Performance**: Quality performance review
- **Scope Performance**: Scope management review
- **Risk Management Performance**: Risk management effectiveness
- **Benefits Realization Performance**: Benefits realization review
- **Baseline vs Actual Analysis**: Overall baseline vs actual comparison
- **Variance Analysis**: Analysis of variances and lessons in estimation

#### Step 5: Significant Lessons
- **Sync from Log**: Automatically sync lessons from the Lessons Log
  - Filter by effect type (positive/negative/neutral)
  - Filter by priority (low/medium/high/critical)
  - Filter by category
- **Manual Selection**: Add lessons individually
- For each lesson:
  - **Significance Level**: Critical, High, Medium, Low
  - **Section Assignment**: Which section this lesson appears in (What Went Well / What Didn't / Other)
  - **Inclusion Reason**: Why this lesson is included

#### Step 6: Recommendations
- **Sync from Lessons**: Automatically extract recommendations from lessons
- **Manual Entry**: Add recommendations manually
- For each recommendation:
  - **Title** (Required): Brief title
  - **Description** (Required): Detailed description
  - **Type**: Process, Documentation, Role, Organizational, Other
  - **Priority**: High, Medium, Low
  - **Responsible Party**: Assign to team member or external party
  - **Target Implementation Date**: When to implement
  - **Status**: Pending, In Progress, Completed, Deferred, Cancelled

#### Step 7: Appendices
Add supporting materials:
- **Appendix Title** (Required)
- **Appendix Type**: Evidence, Detailed Lessons, Charts, References, Other
- **Content**: Text content
- **Document URL**: Link to external document
- **References**: References to registers, logs, reports

#### Step 8: Distribution & Approval
- **Approval Workflow**: Add approvers and manage approval process
  - Add approvers (Executive, Senior User, Senior Supplier, Project Manager, PMO Admin)
  - Approve/Reject/Defer decisions
- **Distribution List**: Manage distribution recipients
  - Add recipients (internal users or external parties)
  - Set distribution method (System, Email, Print, Meeting)
  - Send report to distribution

### Step 4: Save and Submit

- **Save Draft**: Save progress at any time (auto-saves every 30 seconds)
- **Submit for Approval**: Submit when complete (validates completeness first)
- **Edit**: Edit draft or submitted reports
- **View**: View any report (read-only for approved/distributed/closed reports)

## Viewing Reports

### Reports List

1. Navigate to **Projects** → **[Your Project]** → **Lessons** → **View Reports**
2. See all reports for the project with:
   - Report reference and status
   - Report type and date
   - Version number
   - Quick actions (View, Edit)

### Filtering and Search

- **Search**: Search by reference or executive summary
- **Filter by Type**: Project, Stage, or Interim reports
- **Filter by Status**: Draft, Submitted, Under Review, Approved, Distributed, Closed

### Report Detail View

View full report with:
- All sections and content
- Included lessons
- Recommendations
- Approval history
- Distribution list
- Appendices
- Export options (PDF, Word)

## Editing Reports

### When Can You Edit?

- **Draft Reports**: Full edit access
- **Submitted Reports**: Full edit access (can make changes before approval)
- **Approved/Distributed/Closed Reports**: Read-only (PMO Admins may have override)

### How to Edit

1. Go to report list or report detail view
2. Click **"Edit"** button
3. Make changes to any section
4. Save changes (auto-saved every 30 seconds)

## Approval Workflow

### Workflow States

1. **Draft**: Report being prepared
2. **Submitted**: Submitted for review/approval
3. **Under Review**: Under review by approvers
4. **Approved**: Approved, can be distributed
5. **Distributed**: Sent to distribution list
6. **Closed**: Report closed (read-only)

### Approval Process

1. **Add Approvers**: Add approvers to the report
2. **Submit**: Submit report for approval (validates completeness)
3. **Review**: Approvers review the report
4. **Decision**: Approve, Reject, or Defer
5. **Complete**: All approvals complete → Report becomes "Approved"
6. **Distribute**: Send to distribution list
7. **Close**: Close report when complete

### Approval Roles

- **Executive**: Final approval authority
- **Senior User**: User perspective approval
- **Senior Supplier**: Supplier perspective approval
- **Project Manager**: Can create and submit
- **PMO Admin**: Organizational learning perspective approval

## Distribution

### Adding Recipients

1. Go to **Distribution & Approval** section
2. Click **"Add Recipient"**
3. Select user or enter external party name
4. Set distribution method (System, Email, Print, Meeting)

### Sending Report

1. Ensure report is **Approved**
2. Click **"Send Report"** button
3. Report is distributed to all recipients
4. Recipients can acknowledge receipt

## Completeness Indicator

The completeness indicator shows:
- **Overall Completion**: Percentage of required sections completed
- **Section Status**: Individual section completion
- **Missing Fields**: List of required fields that need completion
- **Submission Readiness**: Whether report can be submitted

**Note**: Reports must be 100% complete before submission.

## Exporting Reports

### Export Options

1. **PDF Export**: 
   - Click **"Export"** → **"Export as PDF"**
   - Opens browser print dialog
   - Print or save as PDF

2. **Word Export**:
   - Click **"Export"** → **"Export as Word"**
   - Downloads as .doc file

3. **Print**:
   - Click **"Print"** button
   - Uses browser print functionality

## Tips and Best Practices

### Writing Effective Reports

1. **Be Comprehensive**: Cover all six variables in Review of Measures
2. **Be Specific**: Include concrete examples and data
3. **Actionable Recommendations**: Ensure recommendations are implementable
4. **Significant Lessons**: Focus on lessons with organizational value
5. **Complete All Sections**: Ensure completeness for formal documentation

### When to Promote to Corporate

Lessons included in reports can be:
- Promoted to corporate repository from individual lessons
- Referenced in reports for organizational learning

### Stage Reports vs Project Reports

- **Stage Reports**: Focus on lessons from specific stage, use reporting period dates
- **Project Reports**: Comprehensive lessons from entire project
- **Interim Reports**: Capture lessons during project execution

## Troubleshooting

### Cannot Create Report

- **Error**: "Lessons log not found"
- **Solution**: Lessons log should exist. Create one if missing.

### Cannot Edit Report

- **Error**: "Report cannot be edited"
- **Solution**: Only draft and submitted reports can be edited. Contact PMO Admin for approved reports.

### Submission Blocked

- **Error**: "Report is not complete"
- **Solution**: Complete all required sections. Check completeness indicator for missing fields.

### Auto-save Not Working

- **Issue**: Changes not auto-saving
- **Solution**: Ensure report is saved at least once. Auto-save works for existing reports.

## Related Documentation

- [Lessons Log User Guide](./Lessons_Log_User_Guide.md)
- [Lessons Report Technical Documentation](./Lessons_Report_Technical_Documentation.md)

## Support

For technical support or questions:
1. Contact your Project Manager
2. Contact PMO Admin
3. Review project documentation
4. Check system help resources

---

**Last Updated**: 2026-01-16  
**Module Version**: 1.0
