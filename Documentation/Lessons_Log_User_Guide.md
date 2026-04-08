# Lessons Log User Guide

**Version**: 1.0  
**Date**: 2026-01-16  
**Module**: Lessons Management

## Overview

The Lessons Log module enables project teams to capture and manage lessons learned throughout the project lifecycle. Lessons document what went well, what went wrong, and what should be done differently in future projects. The system supports both project-specific lessons and corporate lessons that can be shared across the organization.

## When to Log a Lesson

Log lessons when:

- **Something goes wrong** - Document the problem, cause, and how to avoid it
- **Something goes well** - Capture successful practices for reuse
- **At stage gates** - Review and capture lessons at each stage boundary
- **During reviews** - After milestone reviews or retrospectives
- **At project closure** - Final lessons learned review
- **After significant events** - Important decisions, changes, or incidents

**Remember**: Lessons should be logged continuously throughout the project, not just at the end.

## Creating a Lesson

### Step 1: Access the Lessons Log

1. Navigate to your project
2. Go to **Projects** → **[Your Project]** → **Lessons Log**
3. Or access from the project dashboard widget

### Step 2: Add a New Lesson

1. Click **"Add Lesson"** button
2. Complete the lesson form with the following sections:

#### Basic Information
- **Title** (Required, min 10 characters): Brief summary of the lesson
- **Lesson Scope** (Required): 
  - Project Only - Applies to this project only
  - Corporate - Share across organization
  - Programme - Share within programme
  - Both Project & Corporate - Both scopes
  - Both Project & Programme - Both scopes
- **Category** (Required): Process, Technical, Resource, Communication, Stakeholder, Quality, Schedule, Cost, Risk, Procurement, Other
- **Priority**: Low, Medium, High, Critical
- **Effect Type**: Positive, Negative, Neutral

#### Lesson Details

**What Happened (Event)** (Required, min 50 characters):
- Describe the event or situation
- What actually occurred?
- When did it happen?

**What was the Effect** (Required, min 30 characters):
- Impact on the project
- Positive or negative consequences
- Financial, schedule, quality, or other impacts

**What Caused This (Root Cause)** (Optional but recommended for negative lessons):
- Why did this happen?
- Underlying causes
- Contributing factors

**Early Warning Indicators** (Optional):
- Were there signs beforehand?
- What could have alerted us earlier?
- Indicators to watch for in future

**Recommendations** (Required, min 50 characters):
- What should we do differently?
- Actionable recommendations
- Best practices to follow

#### Context & Linkage

**Risk Linkage**:
- Was this previously identified as a risk?
- Link to the originating risk (if applicable)
- Mark as Threat or Opportunity

**Product Linkage**:
- Which product does this lesson relate to?
- Select from project products or enter external product name

**Project Phase/Stage**:
- When in the project did this occur?
- Stage gate or phase reference

**Tags**:
- Add relevant tags for searchability
- Examples: stakeholders, requirements, planning, testing

**Lesson Date**:
- When the lesson was learned (defaults to today)

### Step 3: Save the Lesson

- Click **"Save"** to create the lesson
- The lesson will be assigned a unique reference number (e.g., L-2026-001)
- Status will be set to "Logged" by default

## Viewing Lessons

### Lessons Log View

The main Lessons Log page shows:
- **Summary Statistics**: Total, positive, negative, corporate lessons, actions pending
- **Relevant Corporate Lessons**: Lessons from other projects that may apply
- **Filtered List**: All lessons with filtering options

### Filtering Lessons

Use the filters to find specific lessons:
- **Search**: Full-text search across titles, descriptions, recommendations
- **Category**: Filter by lesson category
- **Effect Type**: Positive, Negative, Neutral
- **Status**: Logged, Under Review, Action Required, Action Taken, Closed, Rejected
- **Scope**: Project, Corporate, Programme
- **Priority**: Low, Medium, High, Critical

### Lesson Detail View

Click on any lesson to view full details:
- Complete event, effect, and cause descriptions
- Recommendations
- Linked risks and products
- Actions created from recommendations
- Comments and discussions
- Attachments
- Completeness indicator

## Editing a Lesson

1. Go to the lesson detail view
2. Click **"Edit"** button
3. Make your changes
4. Click **"Save"**

**Note**: Only lesson creators, Project Managers, or PMO Admins can edit lessons.

## Lesson Status Management

Lesson statuses track the lifecycle:

- **Logged**: Initial entry
- **Under Review**: Being reviewed for validity
- **Action Required**: Actions need to be taken
- **Action Taken**: Actions have been completed
- **Closed**: Lesson is closed and archived
- **Rejected**: Lesson rejected as invalid

To change status:
1. Edit the lesson
2. Update the status field
3. Add status change notes if needed
4. Save

## Actions from Lessons

### Creating Actions

1. Go to lesson detail view
2. Scroll to **"Actions"** section
3. Click **"Add Action"**
4. Enter action details:
   - Action description (from recommendations)
   - Assign to team member
   - Set target date
   - Priority
5. Click **"Create Action"**

### Managing Actions

- View all actions in **"My Lesson Actions"** page
- Track action status (Pending, In Progress, Completed, Cancelled)
- Update action progress
- Mark actions as complete with notes

## Corporate Lessons

### Promoting to Corporate

1. Edit the lesson
2. Set scope to include "Corporate"
3. Or use **"Promote to Corporate"** button on lesson detail page
4. Add applicability notes:
   - When does this lesson apply?
   - Which project types benefit?
   - Which industries apply?
5. Add project type and industry tags

### Accessing Corporate Lessons

1. Navigate to **Lessons** → **Corporate Lessons Library**
2. Browse lessons from all projects in your organization
3. Filter by category, project type, industry
4. Sort by rating, views, or date
5. View lesson details and apply to your project

### Rating Corporate Lessons

1. View a corporate lesson
2. Scroll to ratings section
3. Select rating (1-5 stars)
4. Mark if it was helpful
5. Add feedback comments
6. Submit rating

**Note**: Ratings help other teams identify the most useful lessons.

## Integration with Risks

### Linking to Existing Risk

1. On lesson detail page, scroll to **"Link to Risk"** section
2. Select a risk from the Risk Register
3. Click **"Link to Risk"**
4. The lesson will show its connection to the risk

### Creating Risk from Lesson

If a lesson's recommendation identifies a potential future risk:

1. On lesson detail page, scroll to **"Create Risk from Recommendation"**
2. Click **"Create Risk from Recommendation"**
3. A new risk will be created with pre-filled data from the lesson
4. Complete the risk details and save

## Export and Reporting

### Generate Lessons Report

1. Go to Lessons Log page
2. Click **"Generate Report"**
3. View comprehensive report with:
   - Summary statistics
   - Lessons by category
   - Key recommendations
   - Actions summary
   - All lessons

### Export Options

**PDF Export**:
1. Click **"Export"** → **"Export as PDF"**
2. Browser print dialog opens
3. Print or save as PDF

**CSV Export**:
1. Click **"Export"** → **"Export as CSV"**
2. File downloads automatically
3. Open in Excel or other spreadsheet application

**Excel Export**:
1. Click **"Export"** → **"Export as Excel"**
2. CSV format file downloads (opens in Excel)

## Best Practices

### Writing Effective Lessons

1. **Be Specific**: Include concrete details, not vague generalizations
2. **Explain Impact**: Quantify effects where possible (time saved, costs avoided, etc.)
3. **Identify Root Cause**: Don't just describe symptoms - explain why it happened
4. **Actionable Recommendations**: Provide clear, implementable actions
5. **Add Context**: Link to products, phases, or risks for traceability
6. **Use Tags**: Add relevant tags for better searchability

### When to Promote to Corporate

Promote lessons to corporate when:
- The lesson applies to multiple project types
- It has broad organizational value
- It can prevent recurring problems
- It documents a best practice worth sharing
- It's relevant across different industries or contexts

### Completeness Guidelines

A complete lesson should include:
- ✅ Clear title (10+ characters)
- ✅ Detailed event description (50+ characters)
- ✅ Effect description (30+ characters)
- ✅ Root cause analysis (especially for negative lessons)
- ✅ Actionable recommendations (50+ characters)
- ✅ Appropriate category and priority
- ✅ Product or risk linkage where applicable

## Tips and Tricks

1. **Review Corporate Lessons First**: Before starting a project, review relevant corporate lessons
2. **Log Regularly**: Don't wait until project end - log lessons as they occur
3. **Link to Risks**: Connect lessons to risks for better traceability
4. **Create Actions**: Turn recommendations into actionable tasks
5. **Tag Appropriately**: Use consistent tagging for better search results
6. **Rate Corporate Lessons**: Help others by rating lessons you've used

## Troubleshooting

### Cannot Create Lesson

- **Error**: "Lessons log not found"
- **Solution**: Lessons log should be created automatically. Contact Project Manager if missing.

### Cannot Edit Lesson

- **Error**: "Permission denied"
- **Solution**: Only creators, Project Managers, or PMO Admins can edit. Contact your Project Manager.

### Corporate Lessons Not Showing

- **Error**: No corporate lessons in library
- **Solution**: Ensure lessons are promoted to corporate scope. Check organization settings.

### Export Not Working

- **Error**: Download fails
- **Solution**: Check browser pop-up settings. Ensure you have proper permissions.

## Related Documentation

- [Lessons Log Technical Documentation](./Lessons_Log_Technical_Documentation.md)
- [Project Brief User Guide](./Project_Brief_User_Guide.md)
- [Risk Register User Guide](./Risk_Register_User_Guide.md)

## Support

For technical support or questions:
1. Contact your Project Manager
2. Contact PMO Admin
3. Review project documentation
4. Check system help resources

---

**Last Updated**: 2026-01-16  
**Module Version**: 1.0
