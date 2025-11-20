# Frequently Asked Questions (FAQ)

## General Questions

### What is Project Nidus?

Project Nidus is a multi-methodology project management system that supports Structured/Traditional PM, Scrum, Kanban, and hybrid approaches. It provides a unified platform for managing projects regardless of the chosen methodology.

### Which methodologies are supported?

- **Structured/Traditional PM**: Stage-based project management with gates and controls
- **Scrum**: Agile framework with sprints, product backlog, and Scrum events
- **Kanban**: Visual workflow management with flow metrics
- **Hybrid**: Custom combinations of methodologies

### How do I get started?

1. Log in to the system
2. Create a new project or select an existing one
3. Choose your project methodology
4. Start using the methodology-specific features

### Can I change the methodology after creating a project?

Yes, you can change the methodology, but some data may need to be migrated. Contact your administrator for assistance.

## Project Management

### How do I create a new project?

1. Navigate to **Projects** page
2. Click **+ Create Project** button
3. Fill in project details (name, description, methodology, dates)
4. Click **Save**

### How do I add team members to a project?

1. Open project details
2. Go to **Team** section
3. Click **+ Add Team Member**
4. Select user and role
5. Click **Add**

### Can I archive a project?

Yes, you can archive completed or inactive projects. Archived projects are hidden from the main list but can be accessed if needed.

### How do I delete a project?

Only administrators can permanently delete projects. Regular users can archive projects instead.

## Gantt Chart

### How do I create tasks in the Gantt Chart?

1. Click **+ Add Task** button
2. Fill in task details (name, dates, duration, assignee)
3. Click **Save**

### How do I add dependencies between tasks?

1. Click on a task
2. Go to **Dependencies** tab
3. Click **Add Dependency**
4. Select predecessor task and dependency type
5. Click **Save**

### Can I export the Gantt Chart?

Yes, you can export to PDF, PNG, CSV, or Microsoft Project format using the **Export** button.

### Why isn't my task showing on the Gantt Chart?

- Check if task has a valid start date
- Verify task is not filtered out
- Ensure task is assigned to the current project

## Kanban

### How do I create a Kanban board?

1. Navigate to **Kanban** in your project
2. Click **+ Create Board**
3. Enter board name and description
4. Configure columns
5. Click **Create**

### What are WIP limits?

WIP (Work In Progress) limits restrict the number of cards allowed in a column. This helps prevent overloading and improves flow.

### How do I move cards between columns?

Drag and drop cards to move them, or click on a card and use the status dropdown.

### What are flow metrics?

Flow metrics measure how work moves through your system:
- **Cycle Time**: Time from start to completion
- **Lead Time**: Time from creation to completion
- **Throughput**: Number of items completed per period
- **WIP Age**: Average age of work in progress

## Scrum

### How do I create a sprint?

1. Go to **Scrum** > **Sprint Planning**
2. Click **+ New Sprint**
3. Fill in sprint details (name, dates, goal)
4. Add user stories from product backlog
5. Click **Start Sprint**

### What is a burndown chart?

A burndown chart shows remaining work over time. It helps track if the sprint is on track to complete all work.

### How do I conduct a Daily Scrum?

1. Go to **Scrum** > **Daily Scrum**
2. Select current sprint
3. Answer the three questions
4. Add any blockers
5. Save your standup

### What happens at the end of a sprint?

- Sprint Review: Demo completed work
- Sprint Retrospective: Team reflection and improvement
- Sprint Report: Summary of sprint performance
- Next Sprint Planning: Plan next sprint

## Structured PM

### What is a stage gate?

A stage gate is a decision point where the Project Board reviews stage progress and decides whether to continue to the next stage.

### How do I create a work package?

1. Go to **Controlling a Stage**
2. Click **+ Create Work Package**
3. Fill in work package details
4. Assign to team member
5. Click **Save**

### What is a checkpoint report?

A checkpoint report provides regular updates on stage progress to the Stage Manager, typically produced weekly or bi-weekly.

### How do I submit a highlight report?

1. Create highlight report in **Controlling a Stage**
2. Complete all sections
3. Click **Submit to Project Board**
4. Report available to board members

## Issue Management

### How do I create an issue?

1. Go to **Issue Management**
2. Click **+ Create Issue**
3. Fill in issue details (title, description, type, priority)
4. Assign to team member
5. Click **Save**

### What's the difference between priority and severity?

- **Priority**: Urgency of resolution (when to fix)
- **Severity**: Impact if not resolved (how bad it is)

### How do I link an issue to a task?

1. Open issue details
2. Go to **Links** section
3. Click **Link to Task**
4. Select task from dropdown
5. Save link

### How do I resolve an issue?

1. Work on issue to resolution
2. Update status to **Resolved**
3. Add resolution details
4. Save changes
5. Verify and close when confirmed

## Risk Management

### How do I create a risk?

1. Go to **Risk Management**
2. Click **+ Create Risk**
3. Fill in risk details (title, description, probability, impact)
4. Assign risk owner
5. Click **Save**

### How is risk score calculated?

Risk Score = Probability × Impact
- Range: 1-25
- Higher score = higher priority

### What is a risk heat map?

A risk heat map visualizes risks on a probability vs. impact grid, helping identify critical risks that need immediate attention.

### How do I create a mitigation plan?

1. Open risk details
2. Go to **Mitigation Plans** tab
3. Click **+ Add Mitigation**
4. Fill in mitigation action details
5. Assign owner and dates
6. Click **Save**

## RAID Log

### What is a RAID Log?

RAID Log tracks Risks, Assumptions, Issues, and Dependencies in one unified view.

### How do I create an assumption?

1. Go to **RAID Log**
2. Click **+ Create Assumption**
3. Fill in assumption details
4. Assign owner for validation
5. Click **Save**

### How do I create a dependency?

1. Go to **RAID Log**
2. Click **+ Create Dependency**
3. Fill in dependency details
4. Specify dependent and dependency items
5. Click **Save**

### Can I filter the RAID Log?

Yes, you can filter by type (Risks, Assumptions, Issues, Dependencies), status, priority, owner, and date range.

## User Interface

### How do I switch between light and dark mode?

Click the theme toggle button in the top navigation bar to switch between light and dark themes.

### Can I customize the dashboard?

Dashboard customization depends on your role and permissions. Contact your administrator for customization options.

### How do I search for items?

Use the search box in the top navigation or on specific pages to search for projects, tasks, issues, risks, etc.

## Permissions and Access

### What permissions do I have?

Your permissions depend on your role:
- **Project Manager**: Full project access
- **Team Member**: Assigned work access
- **Stakeholder**: Read-only access
- **Administrator**: System-wide access

### How do I request additional permissions?

Contact your project administrator or system administrator to request additional permissions.

### Can I share projects with external users?

External user access depends on your organization's policies. Contact your administrator for external sharing options.

## Technical Questions

### What browsers are supported?

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

### Do I need to install any software?

No, Project Nidus is a web-based application. You only need a modern web browser.

### Is there a mobile app?

Currently, Project Nidus is optimized for web browsers. Mobile browser access is supported with responsive design.

### How do I report a bug?

1. Create an issue in the system
2. Mark it as type "Bug"
3. Provide detailed description and steps to reproduce
4. Add screenshots if applicable
5. Submit the issue

## Data and Export

### Can I export my project data?

Yes, various export options are available:
- Gantt Chart: PDF, PNG, CSV, MS Project
- Reports: PDF, Excel, CSV
- Data: CSV export for analysis

### How do I backup my data?

Data is automatically backed up by the system. Contact your administrator for backup and restore options.

### Can I import data from other tools?

Import capabilities depend on the tool and format. Contact your administrator for import options.

## Support

### Where can I get help?

- Check user guides in Documentation
- Review this FAQ
- Contact your project administrator
- Submit a support ticket

### How do I contact support?

Use the support ticket system or contact your project administrator for assistance.

### Are there training resources available?

Yes, comprehensive user guides are available in the Documentation section. Check with your administrator for additional training resources.

---

*Last updated: January 2025*

