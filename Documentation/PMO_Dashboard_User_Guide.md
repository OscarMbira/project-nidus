# PMO Dashboard User Guide

## Overview

The PMO Dashboard provides comprehensive oversight and governance capabilities for Project Management Office administrators. It offers real-time visibility into project health, capacity management, exceptions, stage gates, and programme roll-ups.

## Access Requirements

- **Role Required**: PMO Admin (`org.admin` permission)
- **Route**: `/platform/dashboard`
- **Visibility**: PMO-specific features are only visible to users with PMO Admin permissions

---

## PMO Control Strip

The PMO Control Strip is a high-visibility alert banner displayed at the top of the dashboard, showing five key intervention signals:

### 1. Projects Requiring Attention
- **What it shows**: Count of projects with RAG status other than Green (Red, Amber, Yellow)
- **When to act**: Review projects with non-green status and take corrective action
- **Action**: Click the tile to see a filtered list of projects requiring attention

### 2. Projects in Exception
- **What it shows**: Count of projects with active exceptions (Open, Escalated, Under Review)
- **When to act**: Immediately review and address exceptions
- **Action**: Click the tile to view all projects with exceptions and their details

### 3. Overdue Stage Gates
- **What it shows**: Count of stage/phase gates that are past their planned date and not approved/rejected
- **When to act**: Escalate overdue gates to ensure project governance
- **Action**: Click the tile to see all overdue gates and take action (flag, escalate, approve/reject)

### 4. PM Capacity Breaches
- **What it shows**: Count of Project Managers who have more than 2 active projects assigned
- **When to act**: Immediately reassign projects to balance PM workload
- **Action**: Click the tile to see PMs in breach and reassign projects

### 5. Orphan Projects
- **What it shows**: Count of projects that are not assigned to any programme or board
- **When to act**: Assign orphan projects to programmes or boards for proper governance
- **Action**: Click the tile to see orphan projects and assign them

### Using the Control Strip
- Each tile is clickable and opens a drill-down modal
- The modal shows filtered project/gate lists with details
- Click on any item in the modal to navigate to the detailed view
- Tiles with counts > 0 are highlighted with visual indicators

---

## Programme Management

### Viewing Programmes
- The Programme Overview section displays all programmes in a grid layout
- Each programme card shows:
  - Programme name and code
  - RAG status indicator (Green/Amber/Red dot)
  - Number of projects (total and active)
  - Budget information (if available)
  - Benefits realization (if available)
  - Programme status

### Creating a Programme
1. Click the **"Create Programme"** button
2. Fill in the form:
   - Programme Name (required)
   - Programme Code (optional)
   - Description
   - Programme Owner (select from dropdown)
   - Programme Manager (select from dropdown)
   - Start Date and End Date
   - Goals and Success Criteria
3. Click **"Create Programme"**
4. The programme will appear in the overview grid

### Programme Details
- Click on any programme card to open the detail modal
- The modal shows:
  - Programme information and status
  - Roll-up metrics (projects, budget, benefits, risks, exceptions)
  - List of assigned projects
  - Actions to assign/remove projects

### Assigning Projects to Programmes
1. Open the Programme Detail Modal
2. Click **"Assign Project"** button
3. Select a project from the dropdown
4. Click **"Assign"**
5. The project will be added to the programme

### Removing Projects from Programmes
1. Open the Programme Detail Modal
2. Find the project in the list
3. Click the trash icon next to the project
4. Confirm the removal

---

## PM Capacity Management

### Viewing PM Capacity
- The PM Capacity Widget displays a table of all Project Managers
- For each PM, you can see:
  - PM name and email
  - Number of active projects
  - Capacity status:
    - **FREE**: 0 active projects
    - **AVAILABLE**: 1 active project
    - **AT_CAPACITY**: 2 active projects
    - **BREACH**: More than 2 active projects
  - List of active projects

### Reassigning PMs
When a PM is in breach (more than 2 active projects):
1. Click the **"Reassign"** button next to the PM
2. Select the project to reassign from the dropdown
3. Select the new PM (the system will show capacity warnings)
4. Enter a reason for reassignment (optional)
5. Click **"Reassign PM"**
6. The system will:
   - Deactivate the old PM assignment
   - Create a new assignment with the new PM
   - Check capacity before allowing the assignment
   - Log the action in the audit trail

**Note**: The system enforces a hard limit of 2 active projects per PM. You cannot assign a PM to a third active project.

---

## Stage Gate Oversight

### Viewing Stage Gates
- The Stage Gate Oversight section shows all stage/phase gates
- Use the filter dropdown to view:
  - All Gates
  - Pending gates
  - Overdue gates
  - Approved gates
  - Rejected gates

### Gate Information Displayed
- Project name (clickable to navigate)
- Gate name and stage
- Planned date
- Current status
- Gate owner
- Overdue indicator (red highlight for overdue gates)

### Flagging Overdue Gates
1. Find an overdue gate in the list
2. Click the **Flag** icon (yellow flag)
3. The gate will be flagged in the system
4. Action is logged in the audit trail

### Escalating Gates
1. Find an overdue or pending gate
2. Click the **Escalate** icon (up arrow)
3. Enter escalation notes
4. Click OK
5. The gate will be escalated and logged

---

## Exception Management

### Viewing Exceptions
- The Exception Management section lists all project exceptions
- Each exception shows:
  - Exception title and reason
  - Exception level (Low, Medium, High, Critical)
  - Exception status (Open, Escalated, Under Review, Resolved, Closed)
  - Associated project (clickable)
  - Raised by and date
  - Visual indicators by level (color-coded)

### Raising an Exception
1. Click the **"Raise Exception"** button
2. Fill in the form:
   - Select Project (required)
   - Exception Title (required)
   - Exception Level (Low/Medium/High/Critical)
   - Category (Performance, Budget, Schedule, etc.)
   - Exception Reason (required)
   - Additional Details (optional)
3. Click **"Raise Exception"**
4. The exception will appear in the list and be logged

### Escalating Exceptions
1. Find an exception with status "Open" or "Under Review"
2. Click the **Escalate** icon (up arrow)
3. Enter escalation notes
4. Click OK
5. The exception status will change to "Escalated"

### Resolving Exceptions
1. Find an exception that needs resolution
2. Click the **Resolve** icon (checkmark)
3. Enter resolution notes
4. Click OK
5. The exception status will change to "Resolved"

### Filtering Exceptions
Use the filter dropdown to view:
- Active exceptions (Open, Escalated, Under Review)
- All exceptions
- Resolved exceptions
- Closed exceptions

---

## Benefits Roll-up

### Viewing Benefits
- The Benefits Roll-up section shows benefits at Programme and Project levels
- Use the level selector to switch between:
  - Project Level: Shows benefits by individual project
  - Programme Level: Shows aggregated benefits by programme

### Programme Level Benefits
For each programme, you can see:
- Programme name and code
- Planned benefits (target value)
- Forecast benefits (expected value)
- Realised benefits (actual value)
- Realization percentage
- At-risk indicator (if benefits are below 80% realized)

### Project Level Benefits
For each project, you can see:
- Project name and code
- Planned benefits
- Realised benefits
- Realization status

### Benefits at Risk
- Benefits are marked as "At Risk" if:
  - Realization rate is less than 80% of planned
  - Target date has passed and benefits are not fully realized
- At-risk benefits are highlighted with red borders

---

## Quick Actions

The Quick Actions section provides shortcuts to common PMO tasks:

### Standard Actions (All Users)
- Create Project
- Create Task
- View Notifications
- Generate Report
- Manage Teams
- Settings

### PMO-Specific Actions (PMO Admins Only)
- **Create Programme**: Start a new programme
- **Assign Executive**: Assign an executive sponsor to a project
- **Assign PM**: Assign a project manager to a project (with capacity check)
- **Raise Exception**: Raise an exception for a project
- **Suspend Project**: Suspend a project (changes status to Suspended/On Hold)

---

## Best Practices

### Daily PMO Activities
1. **Morning Review**: Check the PMO Control Strip for any new alerts
2. **Capacity Check**: Review PM Capacity Widget for any breaches
3. **Exception Review**: Check for new or escalated exceptions
4. **Gate Review**: Review overdue stage gates and take action

### Weekly PMO Activities
1. **Programme Review**: Review programme roll-ups and benefits realization
2. **Capacity Planning**: Plan PM reassignments if needed
3. **Exception Resolution**: Follow up on open exceptions
4. **Gate Approvals**: Review and approve pending gates

### Monthly PMO Activities
1. **Benefits Analysis**: Review benefits realization across all programmes
2. **Capacity Analysis**: Analyze PM workload trends
3. **Exception Trends**: Review exception patterns and root causes
4. **Governance Review**: Review stage gate compliance

---

## Troubleshooting

### Control Strip Not Showing
- Verify you have PMO Admin permissions (`org.admin`)
- Check that you're logged in and have an organization assigned
- Refresh the page

### Cannot Assign PM
- Check if PM already has 2 active projects (capacity limit)
- Verify the project is active
- Check that the PM user exists and is active

### Programme Not Appearing
- Verify the programme was created successfully
- Check that you have access to the organization
- Ensure the programme is not deleted

### Exception Not Showing
- Check the filter settings (may be filtered out)
- Verify exception status (only active exceptions show by default)
- Ensure you have PMO Admin permissions

---

## Support

For additional support or questions about the PMO Dashboard:
- Contact your system administrator
- Refer to the Technical Documentation
- Check the audit log for action history

---

**Last Updated**: 2026-01-08
**Version**: 1.0
