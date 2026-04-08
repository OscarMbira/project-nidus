# Product Status Account Technical Documentation

## Overview

The Product Status Account (PSA) module provides comprehensive tracking of product status, progress, and history throughout the project lifecycle. This document describes the technical implementation, database schema, API services, and component architecture.

## Database Schema

### Main Tables

#### `product_status_accounts`
Main table storing Product Status Account records.

**Key Fields:**
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects)
- `psa_reference` (VARCHAR, UNIQUE) - Auto-generated reference (e.g., PSA-2026-001)
- `report_date` (DATE) - Date of this status account
- `product_deliverable_id` (UUID, FK) - Links to product_deliverables
- `product_description_id` (UUID, FK) - Links to product_descriptions
- `current_status` (ENUM) - Current product status
- `progress_percentage` (DECIMAL) - Progress 0-100
- `progress_indicator` (ENUM) - on_track, at_risk, delayed, ahead_of_schedule
- `schedule_variance_days` (INTEGER) - Calculated variance

**Constraints:**
- UNIQUE on `psa_reference`
- UNIQUE on `product_deliverable_id + report_date` (if deliverable linked)

#### `psa_status_history`
Tracks all status changes for audit trail.

**Key Fields:**
- `id` (UUID, PK)
- `product_status_account_id` (UUID, FK)
- `previous_status` (VARCHAR)
- `new_status` (VARCHAR)
- `status_change_date` (DATE)
- `status_changed_by` (UUID, FK to users)
- `status_change_reason` (TEXT)

#### `psa_progress_snapshots`
Historical progress snapshots for trend analysis.

**Key Fields:**
- `id` (UUID, PK)
- `product_status_account_id` (UUID, FK)
- `snapshot_date` (DATE)
- `progress_percentage` (DECIMAL)
- `progress_indicator` (VARCHAR)
- `schedule_variance_days` (INTEGER)

#### `psa_linked_issues`
Links issues, blockers, risks, and change requests to products.

**Key Fields:**
- `id` (UUID, PK)
- `product_status_account_id` (UUID, FK)
- `issue_id` (UUID, FK to issues)
- `issue_type` (ENUM) - issue, blocker, risk, change_request
- `is_resolved` (BOOLEAN)

#### `psa_milestones`
Product milestones tracking.

**Key Fields:**
- `id` (UUID, PK)
- `product_status_account_id` (UUID, FK)
- `milestone_name` (VARCHAR)
- `milestone_type` (ENUM)
- `planned_date` (DATE)
- `actual_date` (DATE)
- `milestone_status` (ENUM)

#### `psa_dependencies`
Product dependencies tracking.

**Key Fields:**
- `id` (UUID, PK)
- `product_status_account_id` (UUID, FK)
- `dependent_product_status_account_id` (UUID, FK)
- `dependent_product_deliverable_id` (UUID, FK)
- `dependency_type` (ENUM)
- `dependency_status` (ENUM)

#### `psa_quality_checks`
Quality check history.

**Key Fields:**
- `id` (UUID, PK)
- `product_status_account_id` (UUID, FK)
- `quality_check_date` (DATE)
- `quality_check_type` (ENUM)
- `quality_status` (VARCHAR)
- `passed` (BOOLEAN)

#### `psa_acceptance_checks`
Acceptance check history.

**Key Fields:**
- `id` (UUID, PK)
- `product_status_account_id` (UUID, FK)
- `acceptance_check_date` (DATE)
- `acceptance_criterion_id` (UUID, FK)
- `acceptance_status` (VARCHAR)
- `passed` (BOOLEAN)

### Database Functions

#### `generate_psa_reference()`
Generates unique PSA reference number (PSA-YYYY-NNN).

#### `create_psa_for_product_deliverable(product_deliverable_id, report_date, user_id)`
Creates PSA from product deliverable, copying relevant data.

#### `create_psa_for_product_description(product_description_id, user_id, report_date)`
Creates PSA from product description.

#### `update_psa_from_product_deliverable(product_deliverable_id, report_date)`
Updates existing PSA or creates new one from deliverable status changes.

#### `get_psa_by_product_deliverable(product_deliverable_id, report_date)`
Retrieves PSA for a specific deliverable and report date.

#### `get_psa_status_summary(project_id, report_date)`
Returns aggregated status summary for all products in project.

#### `get_psa_trend(product_status_account_id, start_date, end_date)`
Returns progress trend data for trend analysis.

### Database Triggers

#### `trg_product_status_accounts_before_insert`
Auto-generates `psa_reference` on INSERT.

#### `trg_product_status_accounts_status_change`
Records status changes in `psa_status_history` when status changes.

#### `trg_product_deliverable_status_change` (on product_deliverables table)
Automatically updates or creates PSA when product deliverable status changes.

## Service Layer

### `productStatusAccountService.js`

Main service for Product Status Account CRUD operations.

**Key Functions:**
- `createProductStatusAccount(projectId, psaData)` - Create new PSA
- `createPSAForProductDeliverable(deliverableId, reportDate, userId)` - Create from deliverable
- `createPSAForProductDescription(descriptionId, reportDate, userId)` - Create from description
- `getProductStatusAccountById(psaId)` - Get single PSA
- `getProductStatusAccountByProject(projectId, reportDate)` - Get all PSAs for project
- `updateProductStatusAccount(psaId, updates)` - Update PSA
- `updateStatus(psaId, newStatus, reason, userId)` - Update status
- `updateProgress(psaId, percentage, notes, userId)` - Update progress
- `syncFromProductDeliverable(deliverableId, reportDate)` - Sync from deliverable
- `getStatusSummary(projectId, reportDate)` - Get project summary

### Supporting Services

- `psaStatusHistoryService.js` - Status history management
- `psaProgressSnapshotsService.js` - Progress snapshots
- `psaLinkedIssuesService.js` - Issue linking
- `psaQualityChecksService.js` - Quality checks
- `psaAcceptanceChecksService.js` - Acceptance checks
- `psaMilestonesService.js` - Milestones
- `psaDependenciesService.js` - Dependencies

## Component Architecture

### Core Components

#### `ProductStatusAccountCard.jsx`
Displays PSA summary in card format with:
- Product name and reference
- Current status badge
- Progress indicator
- Progress bar
- Issue/blocker counts
- Schedule information

#### `ProductStatusAccountList.jsx`
List view component with:
- Search functionality
- Status and progress filters
- Report date selector
- Grid layout of PSA cards

#### `ProductStatusAccountView.jsx`
Main detail view with tabbed interface:
- Overview tab
- Progress tab
- Quality & Acceptance tab
- Issues & Dependencies tab
- History tab

#### `ProductStatusAccountForm.jsx`
Form for creating/editing PSAs with:
- Basic information
- Status management
- Progress tracking
- Schedule dates
- Status summary fields

#### `ProductStatusAccountDashboard.jsx`
Dashboard view with:
- Summary cards (total, in progress, at risk, completed)
- Products at risk section
- Filtering options
- All products grid

### Supporting Components

#### `PSAStatusIndicator.jsx`
Reusable status badge component with icons and colors.

#### `PSAProgressIndicator.jsx`
Progress bar component with percentage and indicator.

#### `ProductStatusAccountExportMenu.jsx`
Export menu with options for PDF, Word, CSV, Excel, and Print.

#### `ProductStatusAccountPrintView.jsx`
Printable view component.

## Pages

### `ProductStatusAccountList.jsx`
List page wrapper component.

### `ProductStatusAccountViewPage.jsx`
Detail view page wrapper.

### `ProductStatusAccountCreate.jsx`
Create page wrapper.

### `ProductStatusAccountEdit.jsx`
Edit page wrapper.

### `ProductStatusAccountDashboard.jsx`
Dashboard page wrapper.

## Routing

Routes defined in `App.jsx`:

- `/app/projects/:projectId/product-status-accounts` - List
- `/app/projects/:projectId/product-status-accounts/dashboard` - Dashboard
- `/app/projects/:projectId/product-status-accounts/create` - Create
- `/app/projects/:projectId/product-status-accounts/:psaId` - View
- `/app/projects/:projectId/product-status-accounts/:psaId/edit` - Edit

## Row Level Security (RLS)

### Policies

**SELECT Policy:**
- Project members can view PSAs for their projects
- PMO Admins and System Admins can view all PSAs

**INSERT Policy:**
- Project members can create PSAs

**UPDATE Policy:**
- Product Owner, Project Manager, or assigned user can update
- PMO Admins and System Admins can update

**DELETE Policy:**
- Only soft delete (is_deleted flag)
- Project Manager, Product Owner, PMO Admins, System Admins

### Helper Function

`check_psa_access(p_psa_id UUID)` - Checks if user has access to PSA.

## Integration Points

### Product Deliverables

- Auto-create PSA when deliverable created (optional trigger)
- Auto-update PSA when deliverable status changes (trigger)
- Button in ManagingProductDelivery to create/view PSA
- Service layer auto-sync functionality

### Product Descriptions

- Link to create PSA from Product Description
- Link displayed in ProductDescriptionView header
- Service function to create PSA from PD

### Work Packages

- Link PSA to work package
- Display work package information in PSA view

### Configuration Items

- Link PSA to configuration items
- Track version status

## Export Functionality

### Export Utilities (`productStatusAccountExport.js`)

- `exportPSAToPDF()` - PDF export via print dialog
- `exportPSAToWord()` - Word document export
- `exportPSASummaryToCSV()` - CSV export
- `exportPSAToExcel()` - Excel export (CSV format)
- `generatePSAPrintView()` - Printable HTML

### Export Formats

**PDF:**
- Opens print dialog
- Formatted HTML with styling
- Includes all sections and data

**Word:**
- Downloads as .doc file
- HTML format compatible with Word
- Same content as PDF

**CSV:**
- Summary data only
- Suitable for spreadsheet import
- Includes key fields

**Excel:**
- Currently exports as CSV
- Can be enhanced with xlsx library

## Automation

### Triggers

**Auto-Reference Generation:**
- Trigger on INSERT generates `psa_reference`

**Status Change History:**
- Trigger on UPDATE records status changes

**Product Deliverable Sync:**
- Trigger on product_deliverables.status UPDATE
- Automatically updates or creates PSA

### Functions

**Daily Progress Snapshots:**
- `create_daily_progress_snapshots()` - Can be called by cron job
- Creates snapshots for all active PSAs

## Testing

### Service Tests

Test files created:
- `src/services/__tests__/productStatusAccountService.test.js`

### Component Tests

Test files created:
- `src/components/productStatusAccount/__tests__/ProductStatusAccountCard.test.jsx`

### Test Coverage

- Unit tests for service functions
- Component rendering tests
- Integration tests can be added

## Performance Considerations

### Indexes

Indexes created on:
- `project_id`
- `product_deliverable_id`
- `product_description_id`
- `current_status`
- `report_date`
- `progress_indicator`
- `product_status_account_id` on all child tables

### Query Optimization

- Use `get_psa_status_summary()` for dashboard instead of multiple queries
- Use `get_psa_trend()` for trend analysis
- Filter by report_date for historical queries

## Future Enhancements

1. **Reporting Integration:**
   - Integrate with Highlight Reports
   - Integrate with Checkpoint Reports
   - Integrate with Stage Reports

2. **Advanced Analytics:**
   - Progress trend charts
   - Status comparison across dates
   - Predictive analytics

3. **Notifications:**
   - Status change notifications
   - Milestone achievement notifications
   - Blocker identification notifications

4. **Export Enhancements:**
   - True Excel export with charts
   - PDF with charts and graphs
   - Batch export

5. **Mobile Support:**
   - Mobile-optimized views
   - Mobile app integration

## Migration Files

- `SQL/v211_product_status_account_tables.sql` - Database schema
- `SQL/v212_product_status_account_rls_policies.sql` - RLS policies
- `SQL/v213_product_status_account_automation.sql` - Automation triggers

## Dependencies

- React Router for navigation
- Supabase for database operations
- Lucide React for icons
- Vitest for testing (test files)

---

**Last Updated**: 2026-01-20
**Version**: 1.0
