# Quality Register Technical Documentation

## Architecture Overview

The Quality Register Activity Enhancement extends the existing quality management system to provide comprehensive activity tracking aligned with structured project management methodology standards.

## Database Schema

### Enhanced Tables

#### `quality_reviews`
Extended with PDF template fields:
- `activity_identifier` (VARCHAR(50), UNIQUE) - Auto-generated QA-YYYY-NNNN
- `programme_id` (UUID) - Optional programme context
- `forecast_date` (DATE) - Forecast activity date
- `sign_off_planned_date` (DATE) - Planned sign-off date
- `sign_off_forecast_date` (DATE) - Forecast sign-off date
- `quality_records_refs` (JSONB) - References to quality records
- `parent_review_id` (UUID) - For reassessment tracking
- `is_reassessment` (BOOLEAN) - Reassessment flag
- `reassessment_count` (INTEGER) - Count of reassessments
- `qms_id` (UUID) - Link to Quality Management Strategy
- `qms_method_id` (UUID) - Link to QMS quality method
- `qms_scheduled_activity_id` (UUID) - Link to scheduled activity

#### `quality_inspections`
Same enhancements as `quality_reviews` with:
- `sign_off_actual_date` (DATE) - Actual sign-off date
- `parent_inspection_id` (UUID) - For reassessment tracking

### New Tables

#### `quality_activity_records`
Stores quality records (test plans, checklists, evidence) linked to activities.

**Key Fields:**
- `activity_type` (VARCHAR(50)) - 'review', 'inspection', 'audit', 'test'
- `activity_id` (UUID) - Polymorphic link to activity
- `record_type` (VARCHAR(100)) - Type of record
- `record_title` (VARCHAR(300)) - Record title
- `record_reference` (VARCHAR(200)) - Optional reference
- `record_url` (VARCHAR(500)) - Link to document
- `is_mandatory` (BOOLEAN) - Mandatory flag

#### `quality_activity_actions`
Stores action items from quality activities.

**Key Fields:**
- `activity_type` (VARCHAR(50)) - Polymorphic activity link
- `activity_id` (UUID)
- `action_type` (VARCHAR(50)) - 'corrective', 'preventive', 'improvement', 'observation'
- `priority` (VARCHAR(20)) - 'critical', 'high', 'medium', 'low'
- `assigned_to_id` (UUID) - Assigned user
- `status` (VARCHAR(50)) - Action status workflow
- `due_date` (DATE) - Due date for tracking
- `completion_date` (DATE) - When completed
- `verified_by_id` (UUID) - Who verified completion

#### `quality_inspection_participants`
Extends participant tracking to inspections (reviews already had `quality_review_participants`).

**Key Fields:**
- `inspection_id` (UUID) - FK to quality_inspections
- `user_id` (UUID) - Participant user
- `participant_role` (VARCHAR(100)) - Role in inspection
- `responsibilities` (TEXT) - Role responsibilities
- `attendance_status` (VARCHAR(50)) - Invited, confirmed, attended, absent

### Views

#### `quality_activities_view`
Unified view combining reviews and inspections for register display.

**Columns:**
- `activity_type` - 'review' or 'inspection'
- `activity_id` - Activity ID
- `activity_identifier` - Unique identifier
- `product_title`, `product_identifier` - Product information
- `quality_method` - Method used
- `result` - Activity result
- All date fields (planned, forecast, actual)
- Reassessment tracking fields

## Database Functions

### `generate_quality_activity_identifier()`
Generates unique identifiers in format `QA-YYYY-NNNN`.

**Logic:**
1. Get current year
2. Find max sequence number for current year from both reviews and inspections
3. Increment and pad to 4 digits
4. Return formatted identifier

### `create_quality_reassessment(p_activity_type, p_activity_id, p_user_id)`
Creates a new reassessment activity based on a failed activity.

**Process:**
1. Fetch original activity details
2. Create new activity with:
   - Same project, product, QMS links
   - "(Reassessment)" appended to title
   - `parent_review_id` or `parent_inspection_id` set
   - `is_reassessment` = true
3. Increment `reassessment_count` on parent

## Service Layer

### `qualityManagementService.js`

#### New Functions:
- `getQualityActivities(projectId, filters)` - Unified activities query
- `getActivityByIdentifier(identifier)` - Lookup by identifier
- `createReassessment(activityType, activityId)` - Create reassessment
- `linkToQMSMethod(activityType, activityId, qmsMethodId)` - Link to QMS
- `createActivityFromScheduled(scheduledActivityId, activityType)` - Create from QMS schedule
- `updateScheduledActivityStatus(activityType, activityId, status)` - Update QMS schedule

### `qualityActivityRecordsService.js`

**Functions:**
- `getRecords(activityType, activityId)` - Fetch records
- `addRecord(activityType, activityId, recordData)` - Add record
- `updateRecord(recordId, updates)` - Update record
- `deleteRecord(recordId)` - Soft delete
- `reorderRecords(activityType, activityId, orders)` - Reorder records

### `qualityActivityActionsService.js`

**Functions:**
- `getActions(activityType, activityId, filters)` - Fetch actions with filtering
- `addAction(activityType, activityId, actionData)` - Create action
- `updateAction(actionId, updates)` - Update action
- `completeAction(actionId, notes)` - Mark as completed
- `verifyAction(actionId, notes)` - Verify completion
- `deleteAction(actionId)` - Soft delete
- `getOverdueActions(projectId)` - Find overdue actions
- `getMyActions(userId)` - Get user's assigned actions

### `qualityActivityBulkImportService.js`

**Functions:**
- `parseQualityActivityCSV(csvContent)` - Parse CSV file
- `validateActivityData(activityData, rowNumber)` - Validate row data
- `bulkImportActivities(activitiesData, options)` - Bulk import
- `generateBulkImportTemplate()` - Generate CSV template
- `downloadBulkImportTemplate()` - Download template

## UI Components

### Component Hierarchy

```
QualityManagement (Page)
├── QualityRegister (Component)
│   ├── QualityRegister Tab
│   └── QualityActivities Tab
│       ├── Activity Filters
│       ├── Activities Table
│       └── QualityActivityExportMenu
├── QualityRegisterForm (Modal)
└── QualityActivityBulkImport (Component)

QualityActivityView (Page)
└── QualityActivityDetail (Component)
    ├── QualityActivityEntry (Overview)
    ├── QualityActivityParticipants
    ├── QualityActivityRecords
    ├── QualityActivityActions
    └── QualityActivityExportMenu
```

### Component Details

#### `QualityActivityEntry.jsx`
Displays activity card matching PDF template structure.

**Props:**
- `activity` - Activity data object
- `onView` - Callback for navigation (optional)

**Features:**
- PDF template layout
- Date table (Planned/Forecast/Actual)
- Result display with icons
- Reassessment indicators

#### `QualityActivityParticipants.jsx`
Manages participant assignment and roles.

**Props:**
- `activityType` - 'review' or 'inspection'
- `activityId` - Activity UUID
- `participants` - Array of participant objects
- `onUpdate` - Refresh callback

**Features:**
- Add/remove participants
- Role assignment
- Attendance tracking
- Responsibilities field

#### `QualityActivityRecords.jsx`
Manages quality records.

**Props:**
- `activityType` - Activity type
- `activityId` - Activity UUID
- `onUpdate` - Refresh callback

**Features:**
- Record type selection
- Document URL linking
- Mandatory flag
- Reordering support

#### `QualityActivityActions.jsx`
Manages action items with workflow.

**Props:**
- `activityType` - Activity type
- `activityId` - Activity UUID
- `onUpdate` - Refresh callback

**Features:**
- Action creation
- Priority assignment
- Due date tracking
- Completion/verification workflow
- Overdue indicators

#### `QualityActivityDetail.jsx`
Tabbed detail view integrating all sub-components.

**Tabs:**
1. **Overview** - ActivityEntry component
2. **Participants** - Participants management
3. **Records** - Records management
4. **Actions** - Actions management
5. **History** - Revision history (placeholder)

#### `QualityActivityExportMenu.jsx`
Export functionality menu.

**Export Options:**
- Activity PDF (single activity)
- Print (single activity)
- CSV (all activities)
- Summary CSV (summary report)
- Summary PDF (summary report)

#### `QualityActivityBulkImport.jsx`
CSV bulk import interface.

**Features:**
- Template download
- File upload
- Validation display
- Import progress
- Error reporting

## Export Functionality

### PDF Export (`qualityActivityExport.js`)

**Functions:**
- `exportActivityToPDF(activity, participants, records, actions, filename)`
  - Uses jsPDF and html2canvas
  - Matches PDF template structure exactly
  - Multi-page support

- `exportActivitiesSummaryToPDF(activities, project, filters, filename)`
  - Summary report with statistics
  - Activity list table

### CSV Export

**Functions:**
- `exportActivitiesToCSV(activities, filename)`
  - Standard CSV format
  - All activity fields

- `exportActivitySummaryToCSV(activities, project, filename)`
  - Summary statistics
  - Detailed activity list

### Print Support

- `printActivity(activity, participants, records, actions)`
  - Browser print dialog
  - Print-optimized HTML

## RLS Policies

### Access Control Pattern

All new tables follow the project's RLS pattern:
1. Users can access activities in projects they're members of (via `user_projects`)
2. Users assigned to actions can access those actions
3. PMO Admins have full access
4. Project Managers have edit access
5. Team Members have read access

### Policy Structure

Each table has policies for:
- `SELECT` - Read access
- `INSERT` - Create access
- `UPDATE` - Edit access
- `DELETE` - Soft delete access

Policies use:
- `user_projects` table for project membership
- `user_roles` for PMO Admin checks
- Polymorphic relationship handling for activity_type + activity_id

## API Endpoints (Supabase)

### Quality Activities View
```
SELECT * FROM quality_activities_view
WHERE project_id = $projectId
```

### Activity by Identifier
```
SELECT * FROM quality_reviews WHERE activity_identifier = $identifier
UNION
SELECT * FROM quality_inspections WHERE activity_identifier = $identifier
```

### Create Reassessment
```
SELECT create_quality_reassessment($activityType, $activityId, $userId)
```

## Data Flow

### Activity Creation Flow

1. User creates review/inspection via form
2. Trigger auto-generates `activity_identifier`
3. Activity saved to `quality_reviews` or `quality_inspections`
4. If linked to QMS scheduled activity, status updated
5. Activity appears in unified `quality_activities_view`

### Reassessment Flow

1. Activity marked as failed (result = 'failed')
2. User clicks "Create Reassessment"
3. `create_quality_reassessment()` function called
4. New activity created with parent link
5. Parent's `reassessment_count` incremented
6. Reassessment appears in view with indicator

### Action Workflow

1. Activity completed with issues found
2. Actions created from activity
3. Actions assigned to users
4. Users work on actions
5. Actions marked as completed
6. Actions verified (optional)
7. Actions closed

## Performance Considerations

### Indexes

All tables have indexes on:
- `activity_type` + `activity_id` (polymorphic lookups)
- `activity_identifier` (identifier lookups)
- `assigned_to_id` (user assignment lookups)
- `status` (filtering)
- `due_date` (overdue queries)
- `is_deleted` (soft delete filtering)

### Query Optimization

- Unified view uses UNION ALL for performance
- Polymorphic relationships indexed appropriately
- RLS policies optimized to avoid recursion

## Error Handling

### Service Layer

All service functions return:
```javascript
{
  success: boolean,
  data?: any,
  error?: string
}
```

### Component Error Handling

- Try-catch blocks around async operations
- User-friendly error messages
- Console logging for debugging

## Security

### Authentication

All service functions check authentication:
```javascript
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('User not authenticated')
```

### Authorization

- RLS policies enforce project-level access
- Service layer validates user permissions
- UI components respect user roles

## Testing

### Unit Tests

- Service functions tested in isolation
- Mock Supabase client
- Test validation logic
- Test error handling

### Integration Tests

- Complete workflows
- Database operations
- RLS policy verification

### Component Tests

- React component rendering
- User interactions
- Props handling
- State management

## Deployment

### SQL Migration Order

1. Run `v184_quality_register_enhancements.sql`
2. Run `v185_quality_register_rls_policies.sql`
3. Verify table creation and RLS enabled
4. Test data access patterns

### Deployment Checklist

- [ ] SQL migrations run successfully
- [ ] RLS policies verified
- [ ] Service functions tested
- [ ] UI components render correctly
- [ ] Export functionality works
- [ ] Bulk import tested
- [ ] Routes configured
- [ ] Menu items added (if applicable)

## Known Limitations

1. **Excel Export**: Currently exports as CSV with .xlsx extension. Full Excel support would require xlsx library.
2. **History Tab**: Revision history display is placeholder - full audit trail integration pending.
3. **Menu Integration**: Menu items for new pages may need configuration in menu system.
4. **Print Styling**: Print views use basic styling - can be enhanced for better formatting.

## Future Enhancements

1. Full Excel export with formatting
2. Email notifications for action assignments
3. Automated reassessment creation on failure
4. Advanced reporting and analytics
5. Calendar integration for activity scheduling
6. Mobile app support
7. API endpoints for external integrations

---

**Last Updated**: 2026-01-16
**Version**: 1.0
**Author**: Development Team
