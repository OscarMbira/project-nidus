# Issue Report User Guide

**Version**: 1.0  
**Date**: 2026-01-16  
**Module**: Issue Management

## Overview

The Issue Report module enables project teams to create formal documentation for issues that require formal handling, such as escalation to the Project Board, tolerance breaches, or complex decisions requiring detailed analysis.

## When to Create an Issue Report

Create an Issue Report when:

- An issue requires **Project Board decision**
- An issue **affects stage or project tolerances**
- An issue requires **formal escalation**
- Multiple **options need formal analysis** before a decision
- **Detailed impact analysis** is required across the six project variables
- **Formal documentation** of the issue resolution process is needed

**Note**: Not all issues require an Issue Report. Most issues can be managed through the standard Issue Register workflow.

## Creating an Issue Report

### Step 1: Access the Issue

1. Navigate to your project
2. Go to **Issues** → **Issue Register**
3. Click on the issue that requires a formal report
4. On the Issue Detail page, click **"Create Issue Report"**

### Step 2: Complete the Report Sections

The Issue Report form is divided into 7 sections:

#### Section 1: Document Information
- **Report Reference**: Auto-generated (e.g., ISR-PROJ001-ISS-001)
- **Version Number**: Starts at 1.0
- **Report Date**: Defaults to today's date
- **Author**: Select from team members or enter external author name
- **Prepared By**: Optional - person who prepared the report

#### Section 2: Issue Summary
- **Auto-populated** from the linked issue
- Review and update if needed
- Click "Refresh from Issue" to update if the issue has changed

#### Section 3: Impact Analysis
Analyze the impact across **six PRINCE2 variables**:

1. **Time Impact**: Effect on schedule/timeline
2. **Cost Impact**: Effect on budget/financial
3. **Quality Impact**: Effect on quality standards
4. **Scope Impact**: Effect on project scope
5. **Benefits Impact**: Effect on expected benefits
6. **Risk Impact**: Effect on risk exposure

**Tolerance Impact**:
- Check boxes if the issue affects stage or project tolerances
- Document detailed tolerance impact if checked

#### Section 4: Options & Recommendations

**Add Options**:
1. Click "Add Option" for each potential solution
2. For each option, provide:
   - **Option Title**: Brief name
   - **Description**: Detailed explanation
   - **Advantages (Pros)**: Benefits of this option
   - **Disadvantages (Cons)**: Drawbacks
   - **Feasibility Assessment**: How achievable this option is
   - **Cost/Time/Risk Implications**: Specific impacts

**Set Recommendation**:
- Click the star icon on the recommended option
- Only one option can be recommended
- Document the **Recommendation** and **Recommendation Rationale**

#### Section 5: Decision

- Check **"Decision Required"** if Project Board decision is needed
- Specify **"Decision By"** (e.g., "Project Board Executive")
- If decision has been made:
  - Enter **Decision Date**
  - Document **Decision Made**
  - Select **Decision Maker**
  - Add any **Decision Conditions**

#### Section 6: Closure

Complete when closing the report:
- **Closure Date**: When the issue was resolved
- **Closure Outcome**: Summary of resolution
- **Closure Verified By**: Person who verified closure
- **Follow-up Required**: Check if follow-up actions needed
- **Lessons Learned**: Capture any lessons learned

#### Section 7: Distribution & Approval

**Add Approvers**:
1. Click "Add Approver" in the Approval Workflow section
2. Select approver from team members
3. Specify approver role (Executive, Senior User, etc.)

**Submit for Approval**:
1. Complete all required sections
2. Click "Submit Report"
3. Approvers will receive notifications

**Add Distribution Recipients**:
1. Click "Add Recipient" in Distribution List
2. Select team members or enter external recipients
3. Click "Send Report" when ready to distribute

### Step 3: Save and Complete

- Click **"Save Draft"** at any time to save progress
- The report auto-saves every 30 seconds
- Click **"Save & Complete"** when all sections are done
- Use **Completeness Indicator** to track which sections need completion

## Editing an Issue Report

1. Navigate to the issue
2. Click **"View Issue Report"** if a report exists
3. Click **"Edit"** button (only available if status is "Draft" or "Submitted")
4. Make your changes
5. Save your updates

**Note**: Reports with status "Approved" or "Distributed" are read-only unless you have PMO Admin override permissions.

## Approval Workflow

### Submitting for Approval

1. Complete all required sections
2. Add approvers to the approval workflow
3. Click **"Submit Report"**
4. Report status changes to "Submitted" or "Under Review"

### Approving a Report

1. Go to your pending approvals (notification or dashboard)
2. Review the report
3. Click **"Approve"**, **"Reject"**, or **"Defer"**
4. Add comments if needed
5. Submit your decision

**Approval Statuses**:
- **Pending**: Awaiting decision
- **Approved**: Approved by this approver
- **Rejected**: Rejected by this approver
- **Deferred**: Decision deferred

## Distribution

### Sending to Distribution

1. Add recipients to the distribution list
2. Click **"Send Report"**
3. Recipients receive email notification
4. Report status changes to "Distributed"

### Acknowledging Receipt

1. Recipients receive email notification
2. Click link to view report
3. System tracks read receipts and acknowledgments

## Viewing Issue Reports

### Report List View

1. Navigate to **Projects** → **Issues** → **Issue Reports**
2. View all reports for the project
3. Filter by status
4. Search by reference, title, or identifier

### Report Detail View

The detail view includes tabs:

- **Overview**: Summary, recommendation, decision
- **Impact Analysis**: All six variables
- **Options**: All options with details
- **Decision**: Decision information
- **Approval**: Approval workflow and history
- **Distribution**: Distribution list and status

## Exporting Reports

### Print

1. Click **"Print"** button
2. Browser print dialog opens
3. Print or save as PDF

### Export as PDF

1. Click **"Export"** → **"Export as PDF"**
2. New window opens with formatted report
3. Use browser print to save as PDF

### Export as Word

1. Click **"Export"** → **"Export as Word"**
2. Word document downloads automatically

### Copy to Clipboard

1. Click **"Export"** → **"Copy to Clipboard"**
2. Paste into any application

## Completeness Indicator

The completeness indicator shows:
- **Overall completion percentage**
- **Section-by-section status**
- **Missing required fields**
- **Submission readiness**

Complete all required sections before submitting for approval.

## Tips and Best Practices

1. **Auto-population**: Always review auto-populated data from the issue
2. **Options Analysis**: Include at least 2-3 viable options for comparison
3. **Impact Documentation**: Be specific about impacts - use numbers where possible
4. **Recommendation Rationale**: Clearly explain why the recommended option is best
5. **Version Control**: Version numbers increment automatically on significant changes
6. **Save Frequently**: Use "Save Draft" regularly, especially for long reports
7. **Review Before Submission**: Check completeness indicator before submitting

## Troubleshooting

### Cannot Create Report

- **Error**: "An Issue Report already exists for this issue"
- **Solution**: One report per issue. Edit the existing report instead.

### Cannot Submit Report

- **Error**: "Report is incomplete"
- **Solution**: Check completeness indicator and complete all required sections

### Cannot Edit Report

- **Error**: Report is read-only
- **Solution**: Only "Draft" or "Submitted" reports can be edited. Contact PMO Admin if override needed.

### Auto-save Not Working

- Check browser console for errors
- Ensure you're connected to the internet
- Try manual "Save Draft"

## Related Documentation

- [Issue Register User Guide](./Issue_Register_User_Guide.md)
- [Issue Management Overview](../Issue_Register_Technical_Documentation.md)
- [PRINCE2 Issue Report Template](https://www.prince2.com)

## Support

For technical support or questions:
1. Contact your Project Manager
2. Contact PMO Admin
3. Review project documentation
4. Check system help resources

---

**Last Updated**: 2026-01-16  
**Module Version**: 1.0
