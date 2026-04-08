# Risk Management Strategy - User Guide

## Overview

The Risk Management Strategy (RMS) module allows you to define how risks will be managed in your project. It includes standards, methods, scales, matrices, strategies, tools, templates, records, reports, roles, and activities for comprehensive risk management.

## Getting Started

### Accessing RMS

1. Navigate to a project from the Projects page
2. Click on the **"Risk Management Strategy"** button in the Universal Modules section
3. If no RMS exists, one will be automatically created (from your organization's default template if available)

### Creating an RMS

If an RMS doesn't exist yet:
1. Click the **"Create Risk Management Strategy"** button
2. Fill out the multi-step form:
   - **Step 1**: Purpose, Objectives, Scope
   - **Step 2**: Strategy Responsibility
   - **Step 3**: Risk Procedures (Identification, Assessment, Response, Monitoring)
   - **Step 4**: References (Customer, Supplier, Corporate, Programme)
   - **Step 5**: Ownership and Approval
3. Click **"Save"** to create the RMS

## RMS Sections

### Overview Tab

The overview tab displays:
- RMS reference and version
- Current status (Draft, Under Review, Approved, Superseded)
- Completeness indicator (percentage and missing sections)
- Approval workflow status
- Basic information (purpose, objectives, scope)

### Standards Tab

Define risk standards that apply to your project:
- **Add Standard**: Click "Add Standard" button
- **Edit Standard**: Click the edit icon on a standard card
- **Delete Standard**: Click the delete icon (only for draft RMS)
- **Standard Information**:
  - Code (e.g., ISO 31000)
  - Name
  - Type (International, National, Industry, Corporate, Customer, Supplier, Other)
  - Compliance Level (Mandatory, Recommended, Optional)
  - Description and Applicability

### Procedures Tab

View and manage the risk procedures defined in the RMS:
- Risk Identification Approach
- Risk Assessment Approach
- Risk Response Approach
- Risk Monitoring Approach

These can be edited using the "Edit Strategy" button (when RMS is not approved).

### Methods Tab

Define risk identification methods:
- **Add Method**: Click "Add Method" button
- **Method Types**: Workshop, Interview, Checklist, Brainstorming, SWOT Analysis, Other
- **Method Information**:
  - Name and Description
  - When to Use
  - Participants Required
  - Frequency
  - Documentation Required
  - Whether Mandatory

### Scales Tab

View assessment scales for probability and impact:
- Probability Scales (e.g., Very Low, Low, Medium, High, Very High)
- Impact Scales (e.g., Negligible, Minor, Moderate, Major, Severe)
- Proximity Scales (for timing assessment)

Note: Full add/edit forms for scales are planned for future releases.

### Matrix Tab

View the risk assessment matrix:
- Probability vs Impact matrix
- Risk level definitions (Low, Medium, High, Very High)
- Visual representation of risk levels

Note: Full add/edit forms for matrix are planned for future releases.

### Strategies Tab

View risk response strategies:
- **Strategy Types**: Avoid, Mitigate, Transfer, Accept, Exploit, Enhance, Share, Reject
- Each strategy includes:
  - Description
  - Applicable To (risk levels)
  - When to Use
  - Implementation Guidance
  - Examples

Note: Full add/edit forms for strategies are planned for future releases.

### Tools Tab

View risk management tools and techniques:
- Software tools
- Methodologies
- Checklists
- Frameworks
- Templates

Note: Full add/edit forms for tools are planned for future releases.

### Templates Tab

View templates and forms used in risk management:
- Risk Register Templates
- Risk Assessment Forms
- Risk Review Forms
- Other templates

Note: Full add/edit forms for templates are planned for future releases.

### Records Tab

View risk records that will be maintained:
- Record types
- Retention periods
- Storage locations
- Access controls

Note: Full add/edit forms for records are planned for future releases.

### Reports Tab

View risk reports that will be generated:
- Report types
- Frequency
- Recipients
- Distribution lists

Note: Full add/edit forms for reports are planned for future releases.

### Roles Tab

View risk management roles and responsibilities:
- Role names and descriptions
- Independence levels (Project Team, Independent Review, External Audit)
- Responsibilities
- Required Qualifications

Note: Full add/edit forms for roles are planned for future releases.

### Activities Tab

View scheduled risk management activities:
- Activity names
- Activity types (Risk Identification, Assessment, Review, Reporting, Training)
- Frequency (Daily, Weekly, Monthly, Quarterly, Annually, As Needed)
- Responsible Roles
- Due Dates

Note: Full add/edit forms for activities are planned for future releases.

### Conformance Tab

Check conformance against standards:
- **Check Conformance**: Click to run conformance check
- View results:
  - Conformant standards
  - Variances identified
  - Gaps and recommendations
- Refresh check after making changes

### Revision History Tab

View version history:
- All versions of the RMS
- Revision reasons
- Changes summary
- Who made changes and when
- Current version indicator

## Approval Workflow

### Submitting for Approval

1. Ensure RMS is complete (check completeness indicator)
2. Click **"Submit for Approval"** in the Approval Workflow section
3. Select approvers from the project team
4. Click **"Submit for Approval"**
5. RMS status changes to "Under Review"

### Approving an RMS

If you're selected as an approver:
1. Open the RMS
2. Review the Approval Workflow section
3. Add approval comments (optional)
4. Click **"Approve"**
5. Once all approvers approve, RMS status changes to "Approved"

### Approved RMS

- Approved RMS becomes read-only (except for PMO Admins)
- Scales and matrix can be applied to Risk Register
- Use "Apply to Risk Register" button to sync configuration

## Completeness Validation

The completeness indicator shows:
- Overall completion percentage
- Status (Complete, Mostly Complete, Incomplete)
- Missing sections and items
- Recommendations for completion

Work on incomplete sections to increase the completion percentage.

## Integration with Risk Register

Once RMS is approved:
1. Navigate to the RMS
2. Click **"Apply to Risk Register"** button
3. Scales and matrix configuration will be copied to the Risk Register
4. This ensures consistency between RMS and actual risk management

## Export Options

### PDF Export

1. Click the **"Export"** button
2. Select **"Export as PDF"**
3. PDF will be downloaded with all RMS sections included

### Word Export

1. Click the **"Export"** button
2. Select **"Export as Word"**
3. Word document (.doc) will be downloaded

### Print

1. Click the **"Export"** button
2. Select **"Print"**
3. Print dialog will open, or use browser print (Ctrl+P / Cmd+P)

### Print View

1. Click **"Print"** from export menu
2. A print-optimized view will be displayed
3. Use browser print to print the formatted document

## PMO Admin Features

### View All RMS

1. Navigate to **PMO Admin > Risk Management Strategies > All Risk Strategies**
2. View all RMS across all projects
3. Filter and sort by project, status, date, etc.

### Create RMS for Any Project

1. Select a project from the dropdown
2. Click **"Create RMS"** button
3. Fill out the form as usual

### Manage Organization Templates

Organization templates allow you to:
- Create reusable RMS templates
- Set a default template for automatic creation
- Include pre-populated standards, methods, scales, strategies, and roles

Note: Template management UI is planned for future releases. Currently, templates can be managed via database or will be available in a future update.

## Best Practices

### Completeness

- Ensure all required sections are filled out
- Add at least one risk standard
- Define identification methods
- Specify assessment scales and matrix
- Define response strategies
- Assign roles and responsibilities

### Standards

- Reference relevant standards (ISO 31000, PMI, etc.)
- Include customer-specific standards if applicable
- Document corporate risk policy references

### Methods

- Include multiple identification methods for comprehensive coverage
- Define frequency for each method
- Specify participants required
- Mark mandatory methods clearly

### Roles

- Ensure independent review roles are defined
- Specify independence levels appropriately
- Document responsibilities clearly

### Approval

- Review completeness before submission
- Select appropriate approvers
- Provide clear revision reasons when updating

## Troubleshooting

### RMS Not Found

If you see "RMS not found" error:
- Ensure you're accessing from the correct project
- Contact PMO Admin if you believe an RMS should exist
- Try refreshing the page

### Cannot Edit RMS

If you cannot edit an RMS:
- Check RMS status (only draft/under_review can be edited by project managers)
- Ensure you have the correct role (Project Manager or PMO Admin)
- Approved RMS are read-only

### Export Not Working

If export fails:
- Check browser console for errors
- Ensure jsPDF and html2canvas libraries are loaded
- Try refreshing the page
- Contact support if issue persists

### Completeness Not Updating

If completeness indicator doesn't update:
- Save your changes first
- Refresh the page
- Check that you've filled required fields

## Support

For additional help:
- Check the Technical Documentation for developers
- Contact your PMO Admin
- Review project documentation
- Submit a support ticket
