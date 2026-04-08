# End Project Report User Guide

## Overview

The End Project Report (EPR) is a comprehensive document that summarizes the project's performance, reviews the business case, documents lessons learned, and provides follow-on action recommendations. This guide will help you create, manage, and complete End Project Reports.

## Accessing End Project Reports

1. Navigate to your project
2. Go to the **Closing Project** section
3. Click on the **End Report** tab
4. You can either:
   - View an existing report
   - Create a new report
   - Edit a draft or rejected report

## Creating an End Project Report

### Step 1: Document Header
- **Report Title**: Enter a descriptive title for the report
- **Report Date**: Select the date of the report
- **Author**: Select the report author (defaults to current user)
- **Owner**: Select the report owner
- **Client**: Select the client if applicable
- **Closure Type**: Select the type of closure (Normal, Early Termination, Premature, Cancelled)
- **Date of This Revision**: Enter the revision date

The system will automatically generate:
- **Document Reference**: Unique reference number (e.g., EPR-PROJ001-001)
- **Version Number**: Starting at 1.0

### Step 2: Project Manager's Report
- **Executive Summary**: Provide a high-level summary of the project
- **Project Manager's Report**: Comprehensive report covering:
  - Project performance
  - Key achievements
  - Challenges faced
  - Overall project assessment

If the closure type is not "normal", you'll also need to provide:
- **Abnormal Situations**: Description of any abnormal situations
- **Abnormal Situations Impact**: Impact of these situations
- **Premature Closure Reason**: If applicable

### Step 3: Business Case Review
Compare actual benefits against the original Business Case:

- **Add Benefit Review**: Click "Add Benefit Review"
- **Benefit Description**: Describe the benefit
- **Benefit Type**: Select from:
  - Achieved
  - Residual (post-project)
  - Expected Net
  - Not Achieved
- **Target Value**: Original target from Business Case
- **Actual Value**: Actual value achieved
- **Variance**: Automatically calculated
- **Realization Date**: When the benefit was/will be realized

The system automatically calculates variance and variance percentage.

### Step 4: Objectives Review
Review performance against project objectives:

- **Objective Area**: Select from:
  - Time
  - Cost
  - Quality
  - Scope
  - Benefits
  - Risk
- **Original Target**: Original target value
- **Actual Value**: Actual value achieved
- **Tolerance**: Upper and lower tolerance limits
- **Within Tolerance**: Automatically calculated
- **Performance Rating**: Select from:
  - Exceeded
  - Met
  - Partially Met
  - Not Met
- **Strategy Effectiveness**: How effective was the strategy
- **Controls Effectiveness**: How effective were the controls

### Step 5: Team Performance
Recognize team members and their contributions:

- **Add Team Recognition**: Click "Add Team Recognition"
- **Team Member/Team Name**: Select individual or team
- **Role**: Role during the project
- **Performance Type**: Select from:
  - Recognition
  - Achievement
  - Improvement
  - Observation
- **Performance Description**: Describe the performance
- **Achievements**: List specific achievements
- **Recognition Category**: Select appropriate category

### Step 6: Products Review
Review project products in three categories:

#### Quality Records
- **Activity Name**: Name of the quality activity
- **Activity Type**: Review, Inspection, Test, Audit, etc.
- **Product**: Link to product (if applicable)
- **Planned Date**: When it was planned
- **Actual Date**: When it was completed
- **Status**: Planned, Completed, Cancelled, Not Required
- **Result**: Passed, Failed, Passed with Conditions, etc.

#### Approval Records
- **Product Name**: Name of the product
- **Approval Status**: Approved, Conditionally Approved, Rejected, Pending, Deferred
- **Approver**: Who approved it
- **Approval Date**: When it was approved
- **Conditions**: Any conditions if conditionally approved

#### Off-Specifications
- **Type**: Missing Product, Non-Conforming, Partial Delivery, Quality Deviation
- **Product**: Link to product (if applicable)
- **Original Requirement**: What was required
- **Actual Delivery**: What was actually delivered
- **Deviation Description**: Describe the deviation
- **Impact Assessment**: Assess the impact
- **Concession Granted**: Whether a concession was granted
- **Concession Details**: If concession granted, provide details

### Step 7: Lessons Report
Document lessons learned:

- **Add Lesson**: Click "Add Lesson"
- **Lesson Type**: Select from:
  - What Went Well
  - What Went Badly
  - Recommendation
- **Category**: Process, People, Technology, Planning, Execution, Risk, Quality, Stakeholder, Other
- **Title**: Brief title for the lesson
- **Description**: Detailed description
- **Impact**: Low, Medium, High, Critical
- **Root Cause**: For "What Went Badly" lessons
- **Recommendation**: Recommended actions
- **Target Audience**: Project, Programme, Corporate, Industry
- **Escalate to Corporate**: Check to escalate to corporate lessons library

### Step 8: Follow-On Actions
Link follow-on actions to open issues and risks:

- **Open Issues**: View all open issues that need follow-on actions
- **Open Risks**: View all open risks that need follow-on actions
- **Link Follow-On Action**: Link existing follow-on actions
- **Source Type**: Open Issue, Open Risk, Unfinished Work, Recommendation, Other
- **Source Reference**: Reference to the source (Issue/Risk ID)
- **Documentation Attached**: Whether documentation is attached
- **Documentation URLs**: Links to documentation
- **Project Board Advice Requested**: Whether board advice is needed
- **Recommended Recipient**: Who should receive this action

### Step 9: Review & Submit
Quality Criteria Validation:

The system automatically checks 4 quality criteria:

1. **Abnormal Situations Described**: If closure type is not "normal", abnormal situations and their impact must be described
2. **All Issues Closed or Have Follow-On Action**: All open issues must be closed or linked to follow-on actions
3. **Documentation Accompanies Follow-On Actions**: At least 80% of follow-on actions should have documentation
4. **Project Assurance Roles Agree**: Project assurance must agree with the report

For each criterion:
- **Status**: Not Checked, Passed, Failed, Needs Review, Manual Override
- **Blocking**: Whether this blocks project closure
- **Override**: If needed, you can manually override with a reason

**Can Close Project**: The system will indicate whether the project can be closed based on all quality criteria.

## Editing an End Project Report

1. Navigate to the End Project Report view
2. Click **Edit** (only available for draft or rejected reports)
3. Make your changes
4. Save the report

## Viewing an End Project Report

The End Project Report view provides comprehensive tabs:

- **Overview**: Document information, executive summary, PM report, abnormal situations, quality status
- **Business Case**: Benefits comparison
- **Objectives**: Objectives performance review
- **Team Performance**: Team recognition and achievements
- **Products**: Quality records, approval records, off-specifications
- **Lessons**: Lessons learned
- **Follow-On Actions**: Linked follow-on actions
- **Quality Checks**: Quality criteria validation status
- **Approvals**: Approval workflow and status
- **History**: Revision history
- **Print/Export**: Print view and export options

## Approval Workflow

1. **Draft**: Initial creation
2. **Submitted**: Submitted for approval
3. **Under Review**: Being reviewed
4. **Approved**: Approved by approvers
5. **Rejected**: Rejected (can be edited and resubmitted)
6. **Final**: Final approved version

### Submitting for Approval

1. Complete all required sections
2. Ensure quality criteria pass
3. Click **Submit for Approval**
4. Select approvers
5. The report status changes to "Submitted"

### Approving/Rejecting

1. Approvers receive notifications
2. Review the report
3. Click **Approve** or **Reject**
4. Add comments if needed
5. The report status updates accordingly

## Exporting Reports

### Print View
1. Navigate to the **Print/Export** tab
2. Click **Print** to print the report
3. The print view includes all sections formatted for printing

### PDF Export
1. Navigate to the **Print/Export** tab
2. Click **Export PDF**
3. The PDF will be generated and downloaded

### Word Export
1. Navigate to the **Print/Export** tab
2. Click **Export Word**
3. The Word document will be generated and downloaded

## Business Case Comparison

To compare the End Project Report with the Business Case:

1. Navigate to the End Project Report view
2. Click **Compare with Business Case** (or navigate to the comparison view)
3. View:
   - Overall benefits variance
   - Individual benefit comparisons
   - Variance calculations
   - Post-project benefits

## Best Practices

1. **Complete All Sections**: Ensure all sections are filled out for a comprehensive report
2. **Be Honest**: Document both successes and failures
3. **Link Follow-On Actions**: Ensure all open issues/risks are addressed
4. **Document Lessons**: Capture valuable lessons for future projects
5. **Review Quality Criteria**: Ensure all quality criteria pass before submission
6. **Get Approvals**: Submit for approval early to allow time for review
7. **Export for Records**: Export final reports for archival

## Troubleshooting

### Cannot Edit Report
- Only draft or rejected reports can be edited
- Approved reports are read-only
- Check the report status

### Quality Criteria Failing
- Review each criterion
- Address blocking issues
- Add missing information
- Use manual override if justified (with reason)

### Cannot Close Project
- Ensure all quality criteria pass
- Check for blocking issues
- Review the quality status summary

## Support

For additional support or questions, please contact your project administrator or refer to the technical documentation.
