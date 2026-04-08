# Quality Register User Guide

## Overview

The Quality Register tracks all quality activities performed on project products and deliverables. It provides a unified view of reviews, inspections, and other quality activities, following structured project management methodology standards.

## Key Features

- **Unified Quality Activities View**: See all reviews and inspections in one place
- **Activity Identifier Generation**: Automatic unique identifiers (QA-YYYY-NNNN format)
- **Reassessment Tracking**: Track reassessments for failed activities
- **Quality Records Management**: Link test plans, checklists, evidence, and reports
- **Action Item Tracking**: Manage corrective and preventive actions
- **Participant Management**: Track roles and responsibilities for each activity
- **QMS Integration**: Link activities to Quality Management Strategy methods
- **Export & Reporting**: Export activities to PDF, CSV, or print views

## Getting Started

### Accessing the Quality Register

1. Navigate to **Quality Management** from the main menu
2. Select a project from the project filter
3. Click on the **Quality Activities** tab to view all activities

### Creating a Quality Activity

#### Option 1: Create Review
1. Click **Add Quality Item** or navigate to Reviews section
2. Fill in the review details:
   - Review Title (required)
   - Review Type (peer-review, technical-review, etc.)
   - Planned Date
   - Forecast Date (optional)
   - Product/Deliverable link
   - Programme (optional)
   - QMS Method (optional - if QMS is set up)
3. Assign participants (Chair, Secretary, Reviewers)
4. Set sign-off dates
5. Save the review

#### Option 2: Create Inspection
1. Navigate to Inspections section
2. Click **Create Inspection**
3. Fill in inspection details similar to reviews
4. Assign inspector and participants
5. Save the inspection

#### Option 3: Bulk Import
1. Click **Bulk Import Quality Activities**
2. Download the CSV template
3. Fill in the template with your activities
4. Upload the CSV file
5. Review validation results
6. Click **Import Activities**

## Understanding Activity Identifiers

Each quality activity is automatically assigned a unique identifier:
- **Format**: `QA-YYYY-NNNN`
- **Example**: `QA-2026-0001`
- **Purpose**: Unique reference for tracking and reporting

Reassessments inherit a reference to the original activity and are clearly marked.

## Managing Quality Records

Quality records are documents related to the activity (test plans, checklists, evidence, reports).

### Adding Records

1. Open an activity detail view
2. Click on the **Records** tab
3. Click **Add Record**
4. Fill in:
   - Record Type (Test Plan, Checklist, Evidence, etc.)
   - Record Title (required)
   - Record Reference (optional)
   - Description
   - URL/Link (optional)
   - Mark as Mandatory if required
5. Save the record

### Record Types

- **Test Plan**: Testing documentation
- **Review Checklist**: Checklist used during review
- **Action List**: List of actions from the activity
- **Evidence**: Supporting evidence or proof
- **Report**: Quality report document
- **Meeting Minutes**: Minutes from quality meetings

## Managing Action Items

Action items are tasks resulting from quality activities (corrective, preventive, improvement).

### Creating Actions

1. Open an activity detail view
2. Click on the **Actions** tab
3. Click **Add Action**
4. Fill in:
   - Action Description (required)
   - Action Type (Corrective, Preventive, Improvement, Observation)
   - Priority (Critical, High, Medium, Low)
   - Assigned To (user)
   - Due Date
5. Save the action

### Action Workflow

1. **Open**: Action is created and pending
2. **In Progress**: Action is being worked on
3. **Completed**: Action is finished (can add completion notes)
4. **Verified**: Completion is verified (can add verification notes)
5. **Closed**: Action is fully closed

### My Actions

View all actions assigned to you:
- Navigate to **My Quality Actions** from the menu
- Filter by status (All, Open, Completed)
- Complete actions directly from this view

## Working with Participants

### Adding Participants

1. Open an activity detail view
2. Click on the **Participants** tab
3. Click **Add Participant**
4. Select user and role:
   - **For Reviews**: Chair, Presenter, Reviewer, Administrator
   - **For Inspections**: Inspector, Presenter, Auditor, Subject Matter Expert, Observer
5. Add responsibilities (optional)
6. Save participant

### Participant Roles

- **Chair**: Chairs the quality activity
- **Presenter**: Presents the product
- **Reviewer/Inspector**: Reviews or inspects the product
- **Administrator**: Manages logistics
- **Observer**: Observes (non-voting)

## Reassessments

When a quality activity fails, you can create a reassessment:

1. Open the failed activity
2. Look for **Create Reassessment** option
3. A new activity is created automatically with:
   - Link to the original activity
   - "Reassessment" indicator
   - Inherited settings from the original
4. Complete the reassessment following the same workflow

## Dates and Planning

### Date Fields

- **Planned Date**: When the activity is scheduled
- **Forecast Date**: Updated forecast if plans change
- **Actual Date**: When the activity actually occurred
- **Sign-Off Planned Date**: When sign-off is planned
- **Sign-Off Forecast Date**: Updated sign-off forecast
- **Sign-Off Actual Date**: When sign-off actually occurred

### Date Tracking

The system tracks three types of dates for both the activity and sign-off:
- **Planned**: Original schedule
- **Forecast**: Current expectation
- **Actual**: What actually happened

## Exporting Activities

### Export Options

1. **Single Activity PDF**: Export individual activity matching template format
2. **Print**: Print-friendly view
3. **CSV Export**: Export all activities to CSV
4. **Summary CSV**: Export summary report to CSV
5. **Summary PDF**: Export summary report to PDF

### Exporting an Activity

1. Open the activity detail view
2. Click **Activity PDF** or **Print** from the export menu
3. File downloads or print dialog opens

### Exporting Multiple Activities

1. From the Quality Activities tab
2. Apply filters as needed
3. Click **CSV**, **Summary CSV**, or **Summary PDF**
4. File downloads with current filter results

## QMS Integration

If your project has a Quality Management Strategy (QMS) set up:

### Linking to QMS Method

1. When creating/editing an activity
2. Select a **QMS Quality Method** from the dropdown
3. The activity is linked to the QMS method
4. You can inherit entry/exit criteria from the method

### Creating from Scheduled Activities

If activities are scheduled in the QMS:
1. Navigate to QMS Scheduled Activities
2. Select a scheduled activity
3. Choose "Create Quality Activity"
4. Activity is automatically created with QMS method linked

## Filters and Search

### Activity Filters

- **Activity Type**: Filter by Review or Inspection
- **Result**: Filter by Passed, Failed, Pending, etc.
- **Status**: Filter by activity status
- **Search**: Search by activity identifier or product name

### Best Practices

1. **Regular Updates**: Keep dates updated as activities progress
2. **Complete Records**: Link all relevant quality records
3. **Action Tracking**: Create actions for all required follow-ups
4. **Participant Assignment**: Assign participants early
5. **Documentation**: Add quality records and notes for audit trail

## Troubleshooting

### Activity Identifier Not Generated

- Check that the activity was created (not just saved as draft)
- Identifiers are auto-generated on insert

### Cannot Add Participants

- Ensure you have edit permissions on the project
- Check that users exist in the system

### Export Not Working

- Ensure jsPDF and html2canvas libraries are loaded
- Try refreshing the page
- Check browser console for errors

### Bulk Import Errors

- Download and use the template format exactly
- Check all required fields are filled
- Verify project codes and user emails exist
- Review validation errors before importing

## Support

For additional help:
- Check the Technical Documentation
- Review inline help tooltips
- Contact your system administrator

---

**Last Updated**: 2026-01-16
**Version**: 1.0
