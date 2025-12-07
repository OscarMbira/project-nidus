# Kanban Board User Guide

## Overview

Kanban boards provide a visual workflow management system that helps teams visualize work, limit work-in-progress (WIP), and maximize flow efficiency. This guide covers how to use Kanban boards, manage cards, configure workflows, and analyze flow metrics.

## Accessing Kanban Boards

1. Navigate to your project from the **Projects** page
2. Click on **Kanban** in the project navigation menu
3. Select a board or create a new one

## Understanding Kanban Boards

### Board Structure

- **Columns**: Represent workflow stages (e.g., To Do, In Progress, Done)
- **Cards**: Represent individual work items
- **WIP Limits**: Maximum number of cards allowed in a column
- **Swimlanes**: Optional horizontal divisions for categorization

### Default Columns

Most boards start with these columns:
- **Backlog**: Work not yet started
- **To Do**: Work ready to start
- **In Progress**: Work currently being done
- **Review**: Work awaiting review
- **Done**: Completed work

## Working with Cards

### Creating Cards

1. Click **+ Add Card** button in any column
2. Fill in card details:
   - **Title** (required): Brief description of the work
   - **Description**: Detailed information
   - **Priority**: Low, Medium, High, Critical
   - **Assigned To**: Team member responsible
   - **Due Date**: Target completion date
   - **Labels/Tags**: For categorization
   - **Estimated Effort**: Story points or hours
3. Click **Save** to create the card

### Editing Cards

1. **Click** on a card to open detail view
2. Click **Edit** button
3. Modify any card information
4. Click **Save** to update

### Moving Cards

**Drag and Drop**:
1. Click and hold a card
2. Drag it to the target column
3. Release to drop

**Quick Move**:
1. Click on a card
2. Use the **Move** dropdown
3. Select target column
4. Card moves automatically

### Card States

- **Not Started**: Card in Backlog or To Do
- **In Progress**: Card moved to active work column
- **Blocked**: Card marked as blocked (red indicator)
- **Completed**: Card in Done column

## Column Management

### Customizing Columns

1. Click **Board Settings**
2. Go to **Columns** tab
3. **Add Column**:
   - Click **+ Add Column**
   - Enter column name
   - Set position
   - Configure WIP limit
   - Click **Save**

4. **Edit Column**:
   - Click column header menu (⋮)
   - Select **Edit Column**
   - Modify name, position, or WIP limit

5. **Delete Column**:
   - Click column header menu
   - Select **Delete Column**
   - Confirm deletion (cards will be moved)

### WIP Limits

**Setting WIP Limits**:
1. Click column header menu
2. Select **Set WIP Limit**
3. Enter maximum number of cards
4. Click **Save**

**WIP Limit Indicators**:
- **Green**: Below limit (room available)
- **Yellow**: Approaching limit (warning)
- **Red**: At or over limit (action needed)

**Benefits of WIP Limits**:
- Prevents overloading team members
- Identifies bottlenecks
- Encourages completion over starting new work
- Improves flow efficiency

## Card Details and Features

### Card Information

Each card displays:
- **Title**: Card name
- **Assignee**: Assigned team member (avatar)
- **Priority**: Color-coded indicator
- **Due Date**: If set
- **Labels**: Color tags
- **Comments Count**: Number of comments
- **Attachments**: File count

### Card Actions

1. **View Details**: Click card to open full view
2. **Add Comment**: Click comment icon
3. **Add Attachment**: Click attachment icon
4. **Link to Task/Issue**: Link to related items
5. **Archive**: Move to archive
6. **Delete**: Permanently remove

### Card Aging

- **Aging Indicator**: Cards show age in days
- **Stale Cards**: Highlighted if in same column too long
- **Aging Threshold**: Configurable warning threshold

## Flow Metrics

### Accessing Metrics

1. Click **Metrics** tab in Kanban view
2. View dashboard with key metrics

### Key Metrics

**Cycle Time**:
- Time from when work starts to completion
- Average cycle time shown
- Percentiles (p50, p85, p95) displayed

**Lead Time**:
- Time from card creation to completion
- Total time in system
- Includes wait time

**Throughput**:
- Number of cards completed per time period
- Weekly throughput shown
- Trend analysis available

**WIP Age**:
- Average age of work-in-progress items
- Helps identify stale work
- Encourages completion

### Cumulative Flow Diagram (CFD)

1. Navigate to **Metrics Dashboard**
2. View **Cumulative Flow Diagram**:
   - Shows work in each state over time
   - Identifies bottlenecks
   - Visualizes flow efficiency

### Control Chart

1. View **Control Chart** in metrics:
   - Cycle time distribution
   - Percentile lines (p50, p85, p95)
   - Outliers highlighted
   - Trend analysis

## Board Configuration

### Board Settings

Access via **Board Settings** button:

**General**:
- Board name
- Description
- Default assignee
- Card numbering

**Workflow**:
- Column configuration
- WIP limits
- Column order
- Entry/exit criteria

**Automation**:
- Auto-move rules
- Status updates
- Notifications
- Integration settings

### Swimlanes

**Creating Swimlanes**:
1. Go to **Board Settings**
2. Click **Swimlanes** tab
3. Click **+ Add Swimlane**
4. Configure:
   - Name
   - Filter criteria (assignee, label, etc.)
   - Position

**Swimlane Types**:
- **By Assignee**: Group by team member
- **By Priority**: Group by priority level
- **By Label**: Group by tags/labels
- **Custom**: Based on custom fields

## Filtering and Views

### Filtering Cards

1. Click **Filter** button
2. Select criteria:
   - **Assignee**: Filter by team member
   - **Priority**: Filter by priority
   - **Label**: Filter by tags
   - **Due Date**: Filter by date range
   - **Status**: Filter by card state
3. Click **Apply**

### Saved Views

1. Configure filters
2. Click **Save View**
3. Name the view
4. Access later from **Views** dropdown

## Best Practices

### Card Management

1. **Keep Cards Small**: Break large work into smaller cards
2. **Clear Titles**: Use descriptive, action-oriented titles
3. **Update Regularly**: Keep card status current
4. **Use Labels**: Categorize with consistent labels
5. **Set Due Dates**: For time-sensitive work

### Workflow Optimization

1. **Respect WIP Limits**: Don't exceed column limits
2. **Complete Before Starting**: Finish work before pulling new cards
3. **Identify Blockers**: Mark and address blocked cards quickly
4. **Regular Reviews**: Review board weekly for optimization
5. **Continuous Improvement**: Adjust workflow based on metrics

### Team Collaboration

1. **Daily Standups**: Review board together
2. **Visual Management**: Keep board visible to team
3. **Clear Policies**: Define column entry/exit criteria
4. **Regular Retrospectives**: Improve process based on data
5. **Celebrate Completion**: Acknowledge finished work

## Troubleshooting

### Common Issues

**Card not moving**:
- Check WIP limit on target column
- Verify you have permission to move cards
- Refresh page and try again

**WIP limit not working**:
- Verify limit is set correctly
- Check if limit applies to your role
- Contact board administrator

**Metrics not updating**:
- Ensure cards have proper dates (started_at, completed_at)
- Check date ranges in metrics view
- Refresh metrics dashboard

**Performance issues**:
- Reduce number of visible cards with filters
- Archive old completed cards
- Consider splitting large boards

## Keyboard Shortcuts

- **C**: Create new card
- **F**: Open filters
- **S**: Open board settings
- **M**: Open metrics
- **Arrow Keys**: Navigate between cards
- **Enter**: Open selected card
- **Esc**: Close card/modal

## Advanced Features

### Card Templates

1. Create a card with standard fields
2. Click **Save as Template**
3. Use template when creating new cards
4. Saves time on repetitive work

### Card Dependencies

1. Link cards to show relationships
2. View dependency graph
3. Get notified when dependencies change
4. Block cards until dependencies complete

### Automation Rules

1. Go to **Board Settings** > **Automation**
2. Create rules:
   - Auto-move based on criteria
   - Auto-assign based on rules
   - Auto-update fields
   - Send notifications

## Support

For additional help:
- Check the FAQ section
- Review flow metrics documentation
- Contact your project administrator
- Submit a support ticket

---

*Last updated: January 2025*

