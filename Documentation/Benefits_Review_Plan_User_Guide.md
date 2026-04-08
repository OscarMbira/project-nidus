# Benefits Review Plan User Guide

## Overview

The Benefits Review Plan is a comprehensive document that defines how benefits will be measured, reviewed, and managed throughout a project's lifecycle. This guide provides step-by-step instructions for creating, managing, and using Benefits Review Plans in the Nidus PMO Platform.

## Table of Contents

1. [Introduction](#introduction)
2. [Creating a Benefits Review Plan](#creating-a-benefits-review-plan)
3. [Managing Document Sections](#managing-document-sections)
4. [Benefits Coverage](#benefits-coverage)
5. [Resources Planning](#resources-planning)
6. [Review Scheduling](#review-scheduling)
7. [Dis-benefits Management](#dis-benefits-management)
8. [Document Workflow](#document-workflow)
9. [Export and Printing](#export-and-printing)

---

## Introduction

### What is a Benefits Review Plan?

A Benefits Review Plan documents:
- **Scope**: Which benefits are included in the review process
- **Accountability**: Who is responsible for measuring and reviewing each benefit
- **Measurement Approach**: How benefits will be measured
- **Review Schedule**: When reviews will take place
- **Resources**: What resources are needed to conduct reviews
- **Dis-benefits**: Negative impacts that need to be tracked and mitigated

### When to Create a Benefits Review Plan

Create a Benefits Review Plan:
- After the Business Case is approved
- Before benefits realization activities begin
- As part of project initiation documentation
- When benefits measurement approach needs to be formalized

---

## Creating a Benefits Review Plan

### Step 1: Navigate to Your Project

1. Go to **Projects** in the main navigation
2. Select your project
3. Navigate to **Benefits** → **Benefits Review Plan**

The system will automatically create a new plan if one doesn't exist for your project.

### Step 2: Complete the Header Information

Fill in the basic document information:

- **Document Ref**: Unique reference number (e.g., BRP-2026-001)
- **Plan Title**: Descriptive title for the plan
- **Plan Date**: Date the plan is created
- **Version Number**: Starting version (typically 1.0)
- **Author**: Person creating the plan
- **Owner**: Person responsible for the plan
- **Client**: Client organization name
- **Release**: Project release (if applicable)

### Step 3: Define Scope

In the **Scope** section:

1. **Scope Description**: Describe what the review plan covers
   - Which benefits are included
   - Any benefits excluded and why
   - Scope boundaries and assumptions

2. **Benefits Coverage Notes**: Additional notes about benefit coverage

### Step 4: Define Accountability

In the **Accountability** section:

1. **Accountability Description**: Describe the accountability structure
   - Roles and responsibilities
   - Accountable persons for each benefit category
   - Escalation procedures

### Step 5: Define Measurement Approach

In the **Benefits Measurement** section:

1. **Measurement Approach**: Describe how benefits will be measured
   - Measurement methods and techniques
   - Data collection procedures
   - Measurement tools and systems

2. **Timing Rationale**: Explain why the chosen timing is appropriate

---

## Managing Document Sections

### Accessing Sections

The Benefits Review Plan uses a tabbed interface:

- **Overview**: Main document information and all sections
- **Benefits Coverage**: Which benefits are covered and how
- **Resources**: Required resources for reviews
- **Review Schedule**: Scheduled reviews
- **Dis-benefits**: Negative impacts tracking
- **Document History**: Revision history, approvals, and distribution

### Editing Sections

1. Click the **Edit** button on any section
2. Make your changes
3. Click **Save**

The document will automatically save your changes.

---

## Benefits Coverage

### Adding Benefits to Scope

1. Go to the **Benefits Coverage** tab
2. Click **Add Benefit**
3. Select a benefit from the dropdown (shows unmapped benefits)
4. Configure coverage details:
   - **Measurement Frequency**: How often the benefit will be measured
   - **Accountable Person**: Who is responsible
   - **Next Review Date**: When the next review is scheduled
   - **Priority**: Critical, High, Medium, or Low
   - **Measurement Timing Reason**: Why this timing

5. Click **Add Benefit**

### Editing Benefit Coverage

1. Find the benefit in the coverage list
2. Click the **Edit** icon
3. Update the details
4. Click **Save Changes**

### Removing Benefits from Scope

1. Find the benefit in the coverage list
2. Click the **Remove** icon
3. Confirm the removal

---

## Resources Planning

### Adding Resources

1. Go to the **Resources** tab
2. Click **Add Resource**
3. Select resource type:
   - **Person**: Named individual
   - **Skill**: Required skill/competency
   - **Tool**: Tool or system
   - **System**: IT system access
   - **Budget**: Financial resource
   - **Other**: Other resource type

4. Fill in resource details:
   - **Resource Name**: Name or description
   - **Assigned User**: If type is Person
   - **Skill Required**: If type is Person or Skill
   - **Skill Level**: Basic, Intermediate, Advanced, or Expert
   - **Estimated Effort**: Hours required
   - **Estimated Cost**: Cost amount
   - **Currency**: USD, EUR, GBP, AUD, or CAD
   - **Required From/To Dates**: Date range
   - **Availability Confirmed**: Check if availability is confirmed

5. Click **Add Resource**

### Resource Summary

The Resources tab shows:
- **Total Resources**: Number of resources
- **Total Effort**: Combined hours
- **Total Cost**: Combined cost in USD

---

## Review Scheduling

### Scheduling a Review

1. Go to the **Review Schedule** tab
2. Click **Schedule Review**
3. Fill in review details:
   - **Review Name**: Descriptive name
   - **Review Type**: Benefit Review, Baseline Review, Performance Review, or Final Review
   - **Benefit**: Select specific benefit (or leave blank for all benefits)
   - **Planned Date**: When the review will occur
   - **Forecast Date**: Forecasted date if different
   - **Duration**: Hours required
   - **Reviewer**: Person conducting the review
   - **Virtual/Remote**: Check if virtual
   - **Meeting Link**: If virtual, provide link
   - **Location**: If in-person, provide location

4. Click **Schedule Review**

### Completing a Review

1. Find the scheduled review in the list
2. Click **Complete**
3. Fill in completion details:
   - **Outcome Summary**: What was determined
   - **Findings**: Key findings
   - **Recommendations**: Recommended actions
   - **Action Items**: Specific actions to take
   - **Review Report URL**: Link to report document

4. Click **Complete Review**

### Overdue Reviews

The system will alert you if reviews are overdue:
- **Red Alert**: Shows number of overdue reviews
- Review overdue reviews and either complete them or reschedule

### Upcoming Reviews

The system shows upcoming reviews:
- **Blue Alert**: Shows reviews scheduled in next 30 days
- Helps with planning and preparation

---

## Dis-benefits Management

### Adding Dis-benefits

1. Go to the **Dis-benefits** tab
2. Click **Add Dis-benefit**
3. Fill in dis-benefit details:
   - **Dis-benefit Code**: Unique code (e.g., DB-001)
   - **Dis-benefit Name**: Descriptive name
   - **Category**: Financial, Operational, Reputation, Compliance, Customer, Employee, or Other
   - **Impact Severity**: Critical, High, Medium, Low, or Minimal
   - **Impact Probability**: Percentage (0-100%)
   - **Impact Description**: Describe the negative impact
   - **Status**: Active, Realized, Mitigated, or Closed
   - **Mitigation Owner**: Person responsible for mitigation
   - **Mitigation Status**: Identified, Planned, In Progress, Mitigated, or Accepted
   - **Mitigation Approach**: How it will be mitigated

4. If measurable:
   - **Measurement Unit**: Unit of measurement
   - **Baseline Value**: Initial value

5. Click **Add Dis-benefit**

### Tracking Mitigation

Update mitigation status as work progresses:
1. Edit the dis-benefit
2. Update **Mitigation Status**
3. Add notes about mitigation progress
4. Save changes

---

## Document Workflow

### Document Status

Documents progress through statuses:

- **Draft**: Initial creation, being edited
- **Pending Approval**: Submitted for approval
- **Approved**: Approved and active
- **Archived**: Historical version

### Requesting Approval

1. Complete all required sections
2. Review the plan
3. Go to **Document History** tab → **Approvals** section
4. Click **Request Approval**
5. Select approvers from the user list
6. Click **Request Approval**

Approvers will receive email notifications.

### Recording Approvals

**As an Approver:**

1. Review the plan
2. In the **Approvals** section, find your pending approval
3. Click **Approve** or **Reject**
4. Add comments (optional for approval, required for rejection)
5. Confirm your decision

### Revision History

1. Go to **Document History** tab → **History** section
2. Click **Add Revision** when making significant changes
3. Fill in:
   - **Revision Date**: Date of revision
   - **Revision Number**: Version number (e.g., 1.1, 2.0)
   - **Summary of Changes**: What changed
   - **Changes Marked**: Check if changes are marked in document

4. Click **Add Revision**

### Distribution

1. Go to **Document History** tab → **Distribution** section
2. Click **Add Recipient**
3. Fill in recipient details:
   - **Select User**: Choose from user list (optional)
   - **Name**: Recipient name
   - **Title**: Job title
   - **Email**: Email address
   - **Distribution Method**: Email, Portal, Print, Meeting, or Other

4. Click **Add Recipient**

Recipients will receive email notifications.

### Acknowledgement

**As a Recipient:**

1. Review the distributed plan
2. In the **Distribution** section, click **Acknowledge**
3. You can acknowledge receipt of the document

---

## Export and Printing

### Exporting to PDF

1. In the **Overview** tab, click **Export PDF**
2. The system generates a PDF matching the template structure
3. The PDF includes all sections:
   - Document metadata
   - Revision history
   - Approvals
   - Distribution list
   - All sections (Scope, Accountability, Measurement, etc.)
   - Benefits coverage summary
   - Resources summary
   - Dis-benefits summary

### Printing

1. Click **Print** button
2. A print preview opens
3. Use your browser's print dialog to print

The print layout matches the PDF template structure.

---

## Quality Criteria Validation

The system validates your plan against quality criteria:

### Criteria Checked

1. **All Business Case benefits covered**: All benefits should be in scope
2. **Benefits are measurable**: Benefits should have measurement units and baseline values
3. **Timing specified with reasons**: Measurement frequency and rationale should be provided
4. **Resources identified**: Skills or individuals should be identified
5. **Cost vs benefit value realistic**: Review cost should be reasonable vs benefit value
6. **Dis-benefits considered**: Dis-benefits should be included if relevant

### Validation Warnings

The system will show warnings if:
- Benefits are missing from scope
- Benefits lack measurement details
- Resources are not identified
- Cost seems high relative to benefit value

### Validation Errors

The plan cannot be submitted if:
- Scope description is missing
- Measurement approach is not defined

---

## Tips and Best Practices

### Best Practices

1. **Complete scope early**: Define scope clearly before adding benefits
2. **Link to Business Case**: The system can auto-link to Business Case documents
3. **Sync benefits**: Use "Sync from Business Case" to quickly add all benefits
4. **Schedule reviews realistically**: Set achievable review dates
5. **Track dis-benefits**: Don't ignore negative impacts
6. **Update regularly**: Keep the plan current as project progresses
7. **Use validation**: Check validation warnings before submitting

### Common Mistakes to Avoid

- Forgetting to include all benefits in scope
- Not setting measurement frequency
- Missing accountable persons
- Scheduling reviews too close together
- Not tracking dis-benefits
- Skipping revision history updates

---

## Support

For additional help:
- Check the Technical Documentation for advanced features
- Contact your PMO administrator
- Review project documentation standards

---

**Last Updated**: 2026-01-20  
**Version**: 1.0
