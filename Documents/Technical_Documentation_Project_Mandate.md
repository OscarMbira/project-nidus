# Project Mandate - Technical Documentation

## Architecture Overview

Project Mandate functionality is implemented across two domains:

### Platform Domain (`public` schema)
- **Database**: `public.project_mandates` and related tables
- **Client**: `platformDb` (Supabase client with `public` schema)
- **Service**: `src/services/projectMandateService.js`
- **Workflow**: `src/services/mandateWorkflowService.js`
- **Purpose**: Creates real projects for organizations

### Simulator Domain (`sim` schema)
- **Database**: `sim.project_mandates` and related tables
- **Client**: `simDb` (Supabase client with `sim` schema)
- **Service**: `src/services/simulatorMandateService.js`
- **Purpose**: Practice/learning - creates practice projects

## Database Schema

### Main Tables

#### `project_mandates` (Platform)
```sql
CREATE TABLE project_mandates (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) NULLABLE, -- Key design: NULL initially
    mandate_reference VARCHAR(50) UNIQUE,
    mandate_title VARCHAR(255),
    document_status ENUM('draft', 'submitted', 'approved', 'rejected', 'archived'),
    -- ... 20+ fields for all 12 sections
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

**Key Design Decision**: `project_id` is **NULLABLE** - mandates can exist pre-project.

#### `sim.project_mandates` (Simulator)
Similar structure but:
- Links to `sim.simulation_runs` instead of real projects
- Includes `practice_score` and `feedback` for learning
- `is_practice_mode` always `true`

### Child Tables

1. **mandate_deliverables** - In-scope and out-of-scope deliverables
2. **mandate_dependencies** - Project dependencies
3. **mandate_customers_users** - Stakeholders (customers, users, interested parties)
4. **mandate_reviewers** - Review workflow records
5. **mandate_approvals** - Approval workflow records
6. **mandate_document_history** - Version history
7. **mandate_associated_documents** - Links to related documents

### Database Functions

#### `create_project_from_mandate(p_mandate_id, p_user_id)`
**Critical Function**: Creates a project from an approved mandate.

**Process:**
1. Validates mandate is `approved` and `project_id IS NULL`
2. Creates project record with data from mandate
3. Links mandate to project (`project_id` = new project ID)
4. Sets `project_created_date`
5. Copies deliverables to project scope (commented, can be implemented)
6. Copies stakeholders to project team (commented, can be implemented)
7. Returns new project ID

**Transaction Safety**: All operations in a single transaction with rollback on error.

#### `can_edit_mandate(p_mandate_id, p_user_id)`
Returns `BOOLEAN` indicating if mandate can be edited.

**Rules:**
- Status must be `draft` or `rejected`
- `project_id` must be `NULL` (not linked to project)
- User must be creator OR PMO Admin

#### `get_unlinked_mandates(p_organisation_id)`
Returns approved mandates without projects (ready for project creation).

### Constraints and Indexes

**Unique Constraints:**
- `mandate_reference` - Unique across all mandates
- `project_id` (WHERE `project_id IS NOT NULL`) - One mandate per project

**Indexes:**
- `mandate_reference` - Fast lookup by reference
- `project_id` - Fast lookup by project
- `document_status` - Filtering by status
- `created_by` - User's mandates

## Service Layer Architecture

### Platform Services

#### `projectMandateService.js`
**CRUD Operations:**
- `createMandate(mandateData)` - Creates new mandate (no `project_id` required)
- `getMandateById(mandateId)` - Fetches mandate with related data
- `getMandateByProject(projectId)` - Gets mandate for a project
- `getUnlinkedMandates(organisationId)` - Approved mandates ready for project creation
- `updateMandate(mandateId, updates)` - Updates mandate (if editable)
- `deleteMandate(mandateId)` - Soft delete (draft only)
- `archiveMandate(mandateId)` - Archive mandate

**Project Creation:**
- `createProjectFromMandate(mandateId)` - Creates project and links mandate
- `canCreateProject(mandateId)` - Checks eligibility

**Section Management:**
- Deliverables: `addDeliverable()`, `updateDeliverable()`, `deleteDeliverable()`, `getDeliverables()`
- Dependencies: `addDependency()`, `updateDependency()`, `deleteDependency()`, `getDependencies()`
- Stakeholders: `addStakeholder()`, `updateStakeholder()`, `deleteStakeholder()`, `getStakeholders()`
- Documents: `addAssociatedDocument()`, `updateAssociatedDocument()`, `deleteAssociatedDocument()`, `getAssociatedDocuments()`

**Validation:**
- `isEditable(mandateId)` - Checks if mandate can be edited
- `isLinkedToProject(mandateId)` - Checks if mandate has project

#### `mandateWorkflowService.js`
**Review Workflow:**
- `submitForReview(mandateId, reviewerIds)` - Submit mandate for review
- `reviewMandate(reviewId, reviewerId, status, comments)` - Record review decision
- `getReviewStatus(mandateId)` - Get all reviews for mandate
- `getPendingReviews(userId)` - Get user's pending reviews

**Approval Workflow:**
- `submitForApproval(mandateId, approverId)` - Submit for approval
- `approveMandate(approvalId, approverId, comments)` - Approve mandate
- `rejectMandate(approvalId, approverId, comments)` - Reject mandate
- `getApprovalStatus(mandateId)` - Get approval records
- `getPendingApprovals(userId)` - Get user's pending approvals

#### `mandateValidationService.js`
**Validation Functions:**
- `validateDraft(mandateData)` - Validates minimum fields for draft save
- `validateForSubmission(mandateData, childData)` - Validates for submission
- `validateForApproval(mandateData, childData)` - Validates for approval
- `calculateCompletionProgress(mandateData, childData)` - Calculates 12-section progress
- `canSubmitForReview(mandateData, childData)` - Quick check for submission
- `canApprove(mandateData, childData)` - Quick check for approval
- `getValidationSummary(mandateData, childData)` - Complete validation report

### Simulator Services

#### `simulatorMandateService.js`
Similar functions but:
- Uses `simDb` instead of `platformDb`
- Works with `sim.project_mandates` table
- Includes learning-specific functions:
  - `validateSimMandate(mandateId)` - Returns practice score and feedback
  - `getSimMandateProgress(mandateId)` - Learning progress calculation
  - `createPracticeProjectFromMandate(mandateId)` - Creates practice project
  - `canCreatePracticeProject(mandateId)` - Checks eligibility

## Component Architecture

### Shared Components (Both Platforms)

**Location**: `src/components/mandate/`

- `MandateStatusBadge.jsx` - Status indicator with practice mode support
- `MandateCompletionProgress.jsx` - 12-section progress tracker
- `MandateHeader.jsx` - Document metadata display
- `DeliverablesList.jsx` - Manage deliverables (in/out of scope)
- `StakeholdersList.jsx` - Manage stakeholders
- `PurposeAuthoritySection.jsx` - Form section for Sections 1 & 2
- `BackgroundSection.jsx` - Form section for Section 3
- `ObjectivesSection.jsx` - Form section for Section 4
- `OutlineBusinessCaseSection.jsx` - Form section for Section 9
- `MandatePrintView.jsx` - Print/export view

### Platform-Only Components

- `MandateReviewers.jsx` - Review workflow component
- `MandateApprovals.jsx` - Approval workflow component
- `MandateExecutiveSummary.jsx` - Executive summary report

### Pages

**Platform Pages** (`src/pages/mandate/`):
- `ProjectMandateCreate.jsx` - Create mandate form
- `ProjectMandateView.jsx` - View mandate (read-only)
- `ProjectMandateEdit.jsx` - Edit mandate form
- `MandateList.jsx` - List all mandates with filters
- `UnlinkedMandatesList.jsx` - Approved mandates ready for project creation
- `ProjectCreationWizard.jsx` - 3-step wizard for project creation
- `MandateApprovalDashboard.jsx` - Executive approval dashboard

**Simulator Pages** (`src/pages/simulator/`):
- `SimMandateCreate.jsx` - Create practice mandate
- `SimMandateView.jsx` - View practice mandate (with practice project creation)
- `SimMandateEdit.jsx` - Edit practice mandate
- `SimMandateList.jsx` - List practice mandates

## Routing

### Platform Routes (`/platform/mandates/*`)

```
/platform/mandates/create              → Create mandate
/platform/mandates/list                → List all mandates
/platform/mandates/unlinked            → Unlinked approved mandates
/platform/mandates/:id/view            → View mandate
/platform/mandates/:id/edit            → Edit mandate
/platform/mandates/:id/create-project  → Create project from mandate
/platform/mandates/approvals           → Approval dashboard
/platform/projects/:id/mandate/view    → View project's mandate
```

### Simulator Routes (`/simulator/mandates/*`)

```
/simulator/mandates/create   → Create practice mandate
/simulator/mandates/list     → List practice mandates
/simulator/mandates/:id/view → View practice mandate
/simulator/mandates/:id/edit → Edit practice mandate
```

## Validation Rules

### Draft Stage
**Required:**
- `mandate_title` (non-empty)
- `purpose` (min 20 characters)

**Optional:**
- All other fields

### Submission Stage
**Required:**
- All draft requirements
- `background` (min 100 characters)
- `project_objectives` (min 100 characters)
- `outline_business_case` (min 100 characters)
- At least 1 deliverable (in-scope)
- At least 1 stakeholder (customer or user type)

**Recommended:**
- `authority_responsible`
- `constraints`
- `quality_priority`
- `proposed_executive_name` OR `proposed_pm_name`

### Approval Stage
**Required:**
- All submission requirements
- At least one of: `proposed_executive_id`, `proposed_executive_name`, `proposed_pm_id`, `proposed_pm_name`
- `quality_priority` (recommended)
- `interfaces` (if `is_standalone = false` - required)

## Workflow State Machine

### Mandate Status Flow

```
[draft] → [submitted] → [approved] → [archived]
   ↓         ↓
[rejected]  (can return to draft)
```

### Edit Permissions

| Status | Can Edit? | Conditions |
|--------|-----------|------------|
| `draft` | ✅ Yes | Always |
| `submitted` | ❌ No | Under review |
| `approved` | ❌ No | Locked |
| `rejected` | ✅ Yes | Can revise |
| `archived` | ❌ No | Historical |

### Project Link Rules

| Status | `project_id` | Can Create Project? | Can Edit? |
|--------|--------------|---------------------|-----------|
| `draft` | NULL | ❌ No | ✅ Yes |
| `submitted` | NULL | ❌ No | ❌ No |
| `approved` | NULL | ✅ Yes | ❌ No |
| `approved` | POPULATED | ❌ No (already created) | ❌ No |

## API Reference

### Service Methods

#### `createMandate(mandateData)`
```javascript
const mandate = await createMandate({
  mandate_title: 'New Portal Development',
  purpose: 'Develop customer self-service portal...',
  background: 'Current portal lacks modern features...',
  project_objectives: 'Launch by Q3 2026, achieve 80% self-service...',
  outline_business_case: 'Improve satisfaction and reduce costs...',
  document_status: 'draft'
})
```

#### `getMandateById(mandateId)`
```javascript
const mandate = await getMandateById('mandate-uuid')
// Returns mandate with related data (deliverables, stakeholders, etc.)
```

#### `createProjectFromMandate(mandateId)`
```javascript
const projectId = await createProjectFromMandate('mandate-uuid')
// Returns new project ID
// Updates mandate: project_id, project_created_date
```

#### `validateForSubmission(mandateData, childData)`
```javascript
const validation = validateForSubmission(mandateData, {
  deliverables: [...],
  stakeholders: [...]
})
// Returns: { isValid, errors, warnings }
```

## Testing Strategy

### Unit Tests

**Services:**
- `projectMandateService.test.js` - CRUD operations
- `mandateValidationService.test.js` - Validation logic
- `mandateWorkflowService.test.js` - Workflow state machine

**Components:**
- `MandateStatusBadge.test.jsx` - Status display
- Component tests for form sections

### Integration Tests

**CRUD Flow:**
1. Create mandate
2. Add deliverables and stakeholders
3. Submit for review
4. Approve mandate
5. Create project from mandate
6. Verify mandate is linked

**Workflow Tests:**
1. Draft → Submit → Review → Approve
2. Draft → Submit → Reject → Edit → Re-submit
3. Approved → Create Project → Verify lock

### Edge Cases

1. Create multiple mandates for same project (should fail)
2. Edit approved mandate (should fail)
3. Delete mandate with project (should fail, suggest archive)
4. Submit incomplete mandate (should show validation errors)
5. Create project from draft mandate (should fail)

## Performance Considerations

### Database Queries

- Use indexes on `mandate_reference`, `project_id`, `document_status`
- Use partial indexes (WHERE clauses) for performance
- Batch fetch related data (deliverables, stakeholders) in single query

### Frontend Optimization

- Lazy load mandate lists (pagination)
- Cache mandate data in view components
- Use React.memo for list items
- Progressive loading for large mandates

### Caching Strategy

- Cache mandate metadata (reference, title, status)
- Invalidate cache on updates
- Use optimistic updates for better UX

## Security

### Row-Level Security (RLS)

**Policies:**
- All authenticated users can read mandates
- Creators can manage their own mandates (if editable)
- PMO Admins have full access
- Project members can view project's mandate

### Validation

- Server-side validation in database functions
- Client-side validation for better UX
- Never trust client-side validation alone

### Audit Trail

- All tables include `created_by`, `updated_by`, `created_at`, `updated_at`
- `mandate_document_history` tracks version changes
- Soft deletes preserve audit trail

## Integration Points

### With Project Creation

**Flow:**
1. Mandate approved
2. User clicks "Create Project"
3. `create_project_from_mandate()` function called
4. Project created with mandate data
5. Mandate linked (`project_id` populated)
6. Mandate becomes read-only reference

### With Business Case

**Flow:**
1. Project created from mandate
2. Business Case can reference mandate
3. `transferToBusinessCase()` copies relevant data
4. Both mandate and Business Case linked to project

### With Programme Management

**Flow:**
1. If `is_standalone = false`, link to programme
2. Programme constraints flow to mandate
3. Interfaces required for programme-linked projects

## Error Handling

### Common Errors

**"User not authenticated"**
- Check authentication state
- Verify user session is valid

**"Mandate not found"**
- Verify mandate ID is correct
- Check if mandate is soft-deleted

**"Cannot edit approved mandate"**
- Check mandate status
- Verify `project_id` is NULL
- Check user permissions

**"Only approved mandates can create projects"**
- Verify mandate status is `approved`
- Check if mandate already has `project_id`

## Migration Guide

### Adding New Fields

1. Add column to `project_mandates` table
2. Update service methods to handle new field
3. Update form components
4. Update validation rules if required
5. Update export/print views

### Schema Changes

All schema changes should:
- Be backwards compatible when possible
- Include migration scripts with version numbers
- Update `database_tables` registry
- Test with existing data

## Future Enhancements

### Planned Features

1. **Email Notifications**: Alert reviewers/approvers
2. **Auto-Save**: Save drafts automatically
3. **Versioning**: Track changes between versions
4. **Templates**: Pre-filled mandate templates
5. **AI Assistance**: Suggest objectives based on background
6. **Bulk Operations**: Create multiple projects from mandates
7. **Advanced Export**: PDF with custom formatting
8. **Integration**: Link with portfolio management

### Technical Debt

1. Copy deliverables/stakeholders to project tables (currently commented)
2. Implement notification system
3. Add document history UI component
4. Create dependencies list component
5. Add associated documents management UI

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-28  
**Maintainer**: Development Team
