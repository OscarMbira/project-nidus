# Lessons Log Technical Documentation

**Version**: 1.0  
**Date**: 2026-01-16  
**Module**: Lessons Management

## Overview

The Lessons Log module provides comprehensive lesson management functionality based on structured project management methodology. This document provides technical details for developers working with the Lessons Log system.

## Architecture

### Database Schema

#### Main Tables

1. **`lessons_logs`** - Header table (one per project)
   - UNIQUE constraint on `project_id`
   - Auto-created when project is initiated
   - References: projects, users (author, owner, client)

2. **`lessons_learned`** (Enhanced existing table) - Individual lesson entries
   - Enhanced with new fields: scope, status, priority, tags, risk linkage
   - References: lessons_logs, projects, users, risks, products

3. **Supporting Tables**:
   - `lessons_log_revision_history` - Version control
   - `lessons_log_approvals` - Approval records
   - `lessons_log_distribution` - Distribution list
   - `corporate_lessons_repository` - Organization-wide lessons
   - `lesson_comments` - Discussion threads
   - `lesson_attachments` - File attachments
   - `lesson_actions` - Actions from recommendations
   - `lesson_ratings` - Usefulness ratings

### Service Layer

#### `lessonsLogService.js`
Log management:

```javascript
createLessonsLog(projectId)
getLessonsLogByProject(projectId)
getLessonsLogById(logId)
updateLessonsLog(logId, updates)
getRevisionHistory(logId)
addRevision(logId, changes)
getApprovals(logId)
addApproval(logId, approvalData)
getDistributions(logId)
addDistribution(logId, distributionData)
```

#### `lessonService.js`
Lesson CRUD operations:

```javascript
createLesson(lessonData)
updateLesson(lessonId, updates)
deleteLesson(lessonId)
getLessonsByProject(projectId, filters)
getLessonById(lessonId)
getLessonsSummary(projectId)
updateStatus(lessonId, status)
markActionTaken(lessonId, notes)
```

#### `lessonActionService.js`
Action management:

```javascript
createAction(actionData)
updateAction(actionId, updates)
deleteAction(actionId)
getActionsByLesson(lessonId)
getActionsByUser(userId, filters)
getOverdueActions(projectId)
completeAction(actionId, notes)
```

#### `corporateLessonsService.js`
Corporate repository:

```javascript
promoteToCorporate(lessonId, promotionData)
getRelevantCorporateLessons(projectId)
searchCorporateLessons(organisationId, searchTerm)
rateCorporateLesson(lessonId, rating, wasHelpful, feedback)
incrementViewCount(corporateLessonId)
```

#### `lessonsReportService.js`
Reporting:

```javascript
generateLessonsReport(projectId, options)
exportLessonsToCSV(projectId, options)
exportLessonsToPDF(projectId, options)
```

### Component Structure

#### Main Pages
- `LessonsLogView.jsx` - Main lessons log page
- `LessonDetailView.jsx` - Full lesson detail
- `CorporateLessonsLibrary.jsx` - Corporate lessons browser
- `MyLessonActions.jsx` - User's assigned actions
- `LessonsReport.jsx` - Lessons report page

#### Form Components
- `LessonForm.jsx` - Add/edit lesson form
- `LessonScopeSelector.jsx` - Scope selector
- `LessonCategorySelector.jsx` - Category picker
- `LessonPrioritySelector.jsx` - Priority picker

#### Display Components
- `LessonCard.jsx` - Lesson card display
- `LessonsList.jsx` - Lessons list
- `LessonsFilters.jsx` - Filtering UI
- `LessonTypeBadge.jsx` - Scope badge
- `LessonStatusBadge.jsx` - Status indicator
- `EffectTypeIndicator.jsx` - Effect type indicator

#### Supporting Components
- `LessonActionsPanel.jsx` - Actions management
- `LessonCommentsSection.jsx` - Comments thread
- `LessonAttachments.jsx` - File attachments
- `LessonCompletenessIndicator.jsx` - Completeness tracking
- `LessonsSummaryWidget.jsx` - Dashboard widget
- `LinkToRiskWidget.jsx` - Risk linking
- `CreateRiskFromLessonWidget.jsx` - Risk creation from lesson

## Database Functions

### Reference Generation
```sql
generate_lessons_log_reference() RETURNS VARCHAR
generate_lesson_reference() RETURNS VARCHAR
```

### Log Management
```sql
create_lessons_log_for_project(p_project_id UUID, p_user_id UUID) RETURNS UUID
```

### Corporate Promotion
```sql
promote_to_corporate(p_lesson_id UUID, p_user_id UUID) RETURNS UUID
get_relevant_corporate_lessons(p_project_id UUID) RETURNS TABLE
```

### Reporting
```sql
get_lessons_by_category(p_lessons_log_id UUID) RETURNS TABLE
get_lessons_summary(p_project_id UUID) RETURNS TABLE
search_lessons(p_organisation_id UUID, p_search_term TEXT, p_filters JSONB) RETURNS TABLE
```

## Validation Rules

### Required Fields
- Title: Minimum 10 characters
- Event description: Minimum 50 characters
- Effect description: Minimum 30 characters
- Recommendations: Minimum 50 characters
- Scope: Must be selected
- Category: Must be selected
- Priority: Must be selected

### Validation Warnings
- Negative lessons without root cause analysis
- High priority lessons without detailed recommendations
- Corporate scope without applicability context
- Lessons without product reference (where applicable)

### Quality Criteria
- Status indicates whether action has been taken
- Lessons are uniquely identified
- Product reference included where applicable
- Update process defined in log settings
- Access control documented

## RLS Policies

- Project team members can view lessons for their projects
- Only Project Managers and Team Managers can add lessons
- Only lesson creator or PM can edit lessons
- Corporate lessons are readable by all organisation members
- PMO Admins can view and manage all lessons in their organization
- Only PMO Admins can promote lessons to corporate

## Integration Points

### With Project
- Auto-create log on project initiation (database trigger)
- Summary widget on project dashboard
- Quick link in project navigation

### With Project Brief
- Lessons review section in brief form
- "Lessons Reviewed" checkbox
- Link to specific reviewed lessons

### With Risk Register
- Link lesson to originating risk
- Create risk from lesson recommendation
- Risk → Lesson traceability

### With Products
- Link lesson to specific product
- Show product-related lessons

### With Stage Gates
- Prompt for lessons at each gate
- Include lessons in gate review

### With Project Closure
- Generate Lessons Report
- Ensure all lessons reviewed
- Promote key lessons to corporate

## Utility Functions

### Validation
`src/utils/lessonValidation.js`
- Field-level validation
- Complete lesson validation
- Quality criteria validation
- Warning generation
- Completeness scoring

### Export
`src/utils/lessonExport.js`
- PDF export (printable HTML)
- CSV export
- Excel export
- Report generation

## API Endpoints

### Routes

```
/app/projects/:projectId/lessons
/app/projects/:projectId/lessons/:lessonId
/app/projects/:projectId/lessons/report
/app/lessons/corporate
/app/lessons/my-actions
```

## Performance Considerations

1. **Corporate Lessons**: Large organizations may have many corporate lessons - use relevance scoring
2. **Search**: Full-text search on titles, descriptions, recommendations
3. **Indexes**: All foreign keys, status, category, scope indexed
4. **Filtering**: Client-side filtering for better performance

## Error Handling

- Service methods throw errors with descriptive messages
- UI components display user-friendly error messages
- Validation errors displayed inline per field
- Network errors handled with retry prompts

## Testing Recommendations

### Unit Tests
- Service methods with mocked Supabase
- Validation functions
- Export utilities

### Integration Tests
- CRUD operations
- Corporate promotion workflow
- Action creation and tracking
- Search functionality

### Component Tests
- Form rendering and validation
- Filtering and search
- Corporate lessons display
- Action management UI

### E2E Tests
- Complete lesson creation flow
- Corporate promotion process
- Action workflow
- Export functionality

## Code Examples

### Creating a Lesson

```javascript
import { createLesson } from '../services/lessonService';

const lessonData = {
  lesson_title: 'Early stakeholder engagement reduces requirement changes',
  lesson_scope: 'both_project_corporate',
  lesson_category: 'stakeholder',
  effect_type: 'positive',
  priority: 'high',
  what_happened: 'Held stakeholder workshops in week 1...',
  impact_description: '20% reduction in requirement changes...',
  recommendations: 'Schedule stakeholder workshops in week 1 of all future projects',
  project_id: projectId
};

const result = await createLesson(lessonData);
```

### Promoting to Corporate

```javascript
import { promoteToCorporate } from '../services/corporateLessonsService';

const promotionData = {
  applicability_notes: 'Applies to all IT implementation projects',
  project_type_tags: ['IT Implementation', 'Software Development'],
  industry_tags: ['Technology', 'Finance']
};

await promoteToCorporate(lessonId, promotionData);
```

### Creating Action from Lesson

```javascript
import { createAction } from '../services/lessonActionService';

const actionData = {
  lesson_id: lessonId,
  action_description: 'Schedule stakeholder workshops in week 1',
  assigned_to_id: userId,
  target_date: '2026-02-01',
  status: 'pending'
};

await createAction(actionData);
```

## Related Documentation

- [Database Schema](./SQL/v169_lessons_log_enhancement.sql)
- [RLS Policies](./SQL/v170_lessons_log_rls_policies.sql)
- [Storage Setup](./SQL/v171_lessons_log_storage_setup.sql)
- [User Guide](./Lessons_Log_User_Guide.md)
- [Implementation Plan](../projectplan/Lessons_Log_Implementation_Plan.md)

---

**Last Updated**: 2026-01-16  
**Technical Version**: 1.0
