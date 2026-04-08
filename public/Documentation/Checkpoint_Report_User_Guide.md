# Checkpoint Report User Guide

**Version**: 1.0  
**Date**: 2026-01-20  
**Module**: Structured Project Management - Controlling a Stage

## Overview

Checkpoint Reports are periodic status reports created by Team Managers to provide updates to Project Managers during stage execution. They track progress, products, quality activities, lessons learned, and tolerance status for Work Packages.

## Accessing Checkpoint Reports

### From Work Package
1. Navigate to a Work Package
2. Click the "Checkpoint Reports" icon in the work package list
3. Or navigate to: `/app/projects/{projectId}/work-packages/{workPackageId}/checkpoint-reports`

### From Controlling Stage Page
1. Navigate to Controlling a Stage for your project
2. Click on the "Reports" tab
3. View recent checkpoint reports or click "Create Checkpoint Report"

## Creating a Checkpoint Report

1. **Navigate to Checkpoint Reports List**
   - From Work Package view, click "Checkpoint Reports"
   - Or use the direct URL

2. **Click "Create Report"**
   - The system will automatically:
     - Generate a document reference (e.g., CPR-PROJ001-WP01-001)
     - Set version to 1.0
     - Carry forward open items from the previous report (if any)

3. **Complete the Multi-Step Form**

### Step 1: Header
- **Checkpoint Date**: Date of the checkpoint (required)
- **Report Title**: Optional title for the report
- **Report Summary**: Executive summary (minimum 50 characters, required)
- **Progress Summary**: Summary of progress made (required)
- **Author, Owner, Client**: Assign document roles

### Step 2: Reporting Period
- **Period Start Date**: Start of reporting period (required)
- **Period End Date**: End of reporting period (required)
- **Date of Next Revision**: When next report is due

### Step 3: Follow-Ups
- Review items carried forward from previous report
- Add new follow-up items
- Mark items as complete with resolution

### Step 4: Products
- Add products being developed or completed
- Set product status (in development, completed, quality check, approved)
- Track quality status for each product
- Products from Work Package can be auto-added

### Step 5: Quality Activities
- Add quality management activities performed
- Track activity type (review, inspection, test, audit)
- Record outcomes and status

### Step 6: Lessons
- Record lessons learned during the period
- Categorize by type (positive, negative, suggestion)
- Escalate important lessons to Lessons Log

### Step 7: Next Period Planning
- Plan products for development in next period
- Plan products for completion
- Plan quality activities

### Step 8: Tolerance Status
- View time, cost, and scope tolerance status
- See actual vs. forecast values
- Status automatically calculated (within, approaching, exceeded)

### Step 9: Issues & Risks
- Summarize issues encountered
- Summarize risks identified or materialized
- Document changes requested/approved
- Update quality status and concerns
- Update budget, schedule, and variance analysis

### Step 10: Review & Submit
- Review quality criteria validation
- All 5 quality criteria must pass (or be manually overridden)
- Submit for approval when ready

## Quality Criteria Validation

The system automatically validates 5 quality criteria:

1. **Prepared at required frequency** - Automated check
2. **Level/frequency appropriate** - Manual review recommended
3. **Information timely & accurate** - Partial automation + manual review
4. **Every product covered** - Automated product comparison
5. **Previous issues addressed** - Automated follow-up check

**Blocking Issues**: If any blocking criteria fail, the report cannot be submitted until resolved or manually overridden.

## Editing a Report

- Only draft or rejected reports can be edited
- Navigate to the report view page
- Click "Edit Report"
- Make changes and save

## Viewing a Report

The report view page includes tabs for:
- **Overview**: Summary and quality check status
- **Products**: All products tracked
- **Quality**: Quality activities
- **Follow-Ups**: Follow-up items
- **Lessons**: Lessons identified
- **Tolerance**: Tolerance status details
- **History**: Version history
- **Approvals**: Approval workflow
- **Distribution**: Distribution list
- **Print/Export**: Print and export options

## Approval Workflow

1. **Submit for Approval**
   - Click "Submit for Approval" on review step
   - Select approver (usually Project Manager)

2. **Approval Process**
   - Approver receives notification
   - Approver can approve or reject
   - Comments can be added

3. **Status Changes**
   - Draft → Submitted → Reviewed → Approved
   - Or: Draft → Submitted → Rejected (can be edited and resubmitted)

## Exporting Reports

1. Navigate to report view page
2. Click "Print/Export" tab
3. Choose export option:
   - **Print**: Opens browser print dialog
   - **Export PDF**: Downloads as PDF
   - **Export Word**: Downloads as Word document (.doc)

## Best Practices

1. **Regular Reporting**: Create reports at the frequency defined in the Work Package
2. **Complete Information**: Fill all required sections with meaningful content
3. **Address Follow-Ups**: Always address items from previous reports
4. **Track Products**: Ensure all Work Package products are covered
5. **Quality Activities**: Document all quality management activities
6. **Lessons Learned**: Capture lessons as they occur
7. **Tolerance Monitoring**: Regularly check tolerance status
8. **Timely Submission**: Submit reports promptly after the reporting period

## Troubleshooting

### Cannot Submit Report
- Check quality criteria validation
- Ensure all blocking criteria pass
- Review error messages in quality check section

### Products Not Showing
- Verify products are added to the report
- Check that products match Work Package products
- Ensure products are set to "current" period type

### Follow-Ups Not Carrying Forward
- Previous report must exist
- Items must be in "open" or "in_progress" status
- System automatically carries forward on report creation

### Tolerance Status Not Updating
- Ensure Work Package has tolerance data
- Check stage_tolerances table has current values
- Tolerance is calculated from work package actuals

## Support

For technical issues or questions, contact your Project Manager or PMO Administrator.
