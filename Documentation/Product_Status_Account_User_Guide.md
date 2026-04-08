# Product Status Account User Guide

## Overview

The Product Status Account (PSA) module is an operational register that tracks the current status, progress, and history of products/deliverables throughout the project lifecycle. It provides a comprehensive "account" (summary) of where each product stands, including status transitions, progress indicators, planned vs. actual dates, quality status, acceptance status, and any issues or blockers.

## Accessing Product Status Accounts

### From Project Detail Page

1. Navigate to your project from the Projects list
2. Scroll to the "Universal Modules" section
3. Click on **"Product Status Accounts"** button
4. You will see a list of all Product Status Accounts for the project

### Direct Navigation

- URL: `/app/projects/{projectId}/product-status-accounts`
- You can also access the dashboard at: `/app/projects/{projectId}/product-status-accounts/dashboard`

## Creating a Product Status Account

### Method 1: Create from Product Deliverable

1. Navigate to **Managing Product Delivery** page
2. Find the product deliverable you want to track
3. Click the **Product Status Account** button (purple chart icon)
4. The PSA will be automatically created with data from the deliverable
5. You will be redirected to the PSA view page

### Method 2: Create from Product Description

1. Navigate to a Product Description view page
2. Click the **"Product Status Account"** link in the header
3. The PSA will be automatically created linked to the Product Description

### Method 3: Create Manually

1. Navigate to Product Status Accounts list page
2. Click **"Create Status Account"** button
3. Fill in the required fields:
   - **Product Name** (required)
   - **Report Date** (required)
   - Product Reference, Product Type, etc.
4. Optionally link to:
   - Product Deliverable
   - Product Description
   - Work Package
5. Click **"Create"** to save

## Viewing Product Status Accounts

### List View

The list view shows all Product Status Accounts for the selected report date. You can:

- **Filter by Status**: Use the status dropdown to filter by current status
- **Filter by Progress**: Use the progress indicator dropdown to filter by progress
- **Search**: Use the search box to find specific products by name or reference
- **Change Report Date**: Select a different report date to view historical status accounts
- **View Details**: Click on any PSA card to view full details

### Detail View

The detail view provides comprehensive information organized in tabs:

#### Overview Tab
- Current status and status date
- Progress percentage and indicator
- Schedule information (planned vs. actual dates)
- Status summary text

#### Progress Tab
- Progress tracking with visual indicator
- Progress history snapshots
- Milestones with planned and actual dates

#### Quality & Acceptance Tab
- Quality status and review information
- Acceptance status and acceptance details
- Handover status and handover information

#### Issues & Dependencies Tab
- Linked issues and blockers
- Product dependencies
- Impact assessments

#### History Tab
- Complete status change history
- Timeline of all status transitions

## Updating Product Status

### Update Status

1. Navigate to the Product Status Account detail page
2. Click **"Edit"** button
3. Change the **Status** field
4. Add **Status Notes** explaining the change
5. Click **"Save"**

**Note**: Status changes are automatically recorded in the status history.

### Update Progress

1. Navigate to the Product Status Account detail page
2. Click **"Edit"** button
3. Update **Progress Percentage** (0-100)
4. Select **Progress Indicator**:
   - On Track
   - At Risk
   - Delayed
   - Ahead of Schedule
5. Add **Progress Notes**
6. Click **"Save"**

### Update Schedule

1. Edit the Product Status Account
2. Update date fields:
   - Planned Start Date
   - Actual Start Date
   - Planned Completion Date
   - Forecast Completion Date
   - Actual Completion Date
3. The system will automatically calculate schedule variance

## Managing Milestones

### Add Milestone

1. Navigate to the PSA detail page
2. Go to **Progress** tab
3. Click **"Add Milestone"** (if available)
4. Fill in:
   - Milestone Name
   - Milestone Type
   - Planned Date
   - Description (optional)
5. Save the milestone

### Update Milestone Status

1. Find the milestone in the Progress tab
2. Click to edit
3. Update milestone status:
   - Upcoming
   - In Progress
   - Achieved
   - Missed
   - Cancelled
4. Add actual date when achieved
5. Save changes

## Linking Issues

### Link an Issue

1. Navigate to the PSA detail page
2. Go to **Issues & Dependencies** tab
3. Click **"Link Issue"** (if available)
4. Select the issue to link
5. Choose issue type:
   - Issue
   - Blocker
   - Risk
   - Change Request
6. Add impact description
7. Save the link

### Resolve Linked Issue

1. Find the linked issue in the Issues & Dependencies tab
2. Mark as resolved
3. The issue count will automatically update

## Managing Dependencies

### Add Dependency

1. Navigate to the PSA detail page
2. Go to **Issues & Dependencies** tab
3. Click **"Add Dependency"** (if available)
4. Select dependent product or deliverable
5. Choose dependency type:
   - Finish to Start
   - Start to Start
   - Finish to Finish
   - Start to Finish
6. Mark as critical if needed
7. Save the dependency

### Update Dependency Status

1. Find the dependency in the list
2. Update dependency status:
   - Satisfied
   - Pending
   - Blocked
3. Save changes

## Dashboard View

The Product Status Dashboard provides an overview of all products in the project:

### Summary Cards
- **Total Products**: Total number of Product Status Accounts
- **In Progress**: Products currently in progress
- **At Risk**: Products with at-risk progress indicator
- **Completed**: Products that are completed

### Products at Risk Section
Shows all products that are at risk or delayed, allowing quick identification of problems.

### Filtering
- Filter by report date
- Filter by status
- Filter by progress indicator

## Exporting Product Status Accounts

### Export Options

1. Navigate to a Product Status Account detail page
2. Click the **"Export"** button in the header
3. Choose export format:
   - **PDF**: Portable Document Format for printing
   - **Word**: Microsoft Word document
   - **CSV**: Comma-separated values for spreadsheet import
   - **Excel**: Excel-compatible format
   - **Print**: Open print dialog

### Export Summary

To export multiple PSAs:

1. Navigate to the Product Status Accounts list
2. Use filters to select the PSAs you want
3. Export functionality can be added to the list view (future enhancement)

## Status Values

### Current Status Options

- **Not Started**: Product not yet started
- **Planned**: Product planned but not started
- **In Progress**: Product being developed
- **Under Review**: Product under review
- **Quality Check**: Quality review in progress
- **Completed**: Product completed
- **Accepted**: Product accepted
- **Rejected**: Product rejected
- **Handed Over**: Product handed over
- **On Hold**: Product on hold
- **Cancelled**: Product cancelled

### Progress Indicators

- **On Track**: Progress matches plan, no schedule variance
- **At Risk**: Schedule variance < 10%, issues identified
- **Delayed**: Schedule variance >= 10%, behind schedule
- **Ahead of Schedule**: Progress ahead of plan, early completion forecast

## Best Practices

1. **Regular Updates**: Update Product Status Accounts regularly (weekly or bi-weekly)
2. **Status Notes**: Always provide notes when changing status to explain the reason
3. **Progress Tracking**: Update progress percentage and notes regularly
4. **Issue Linking**: Link all relevant issues and blockers to track impact
5. **Milestone Management**: Set realistic milestones and update them as work progresses
6. **Dependency Tracking**: Keep dependencies up to date to identify blockers early
7. **Report Date**: Use consistent report dates for historical comparison

## Troubleshooting

### PSA Not Created from Deliverable

- Check that the product deliverable exists and is not deleted
- Verify you have permission to create PSAs in the project
- Try creating manually and linking to the deliverable

### Status Not Updating

- Ensure you have edit permissions (Project Manager, Product Owner, or PMO Admin)
- Check that the status value is valid
- Verify the PSA is not deleted

### Export Not Working

- Check browser console for errors
- Ensure pop-up blocker is not blocking the download
- Try a different export format

## Support

For additional help or to report issues, contact your Project Manager or PMO Administrator.

---

**Last Updated**: 2026-01-20
**Version**: 1.0
