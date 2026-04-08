# Issue Register Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Services](#api-services)
4. [Business Logic](#business-logic)
5. [Validation](#validation)
6. [Workflows](#workflows)
7. [Integration Points](#integration-points)
8. [Testing](#testing)

## Architecture Overview

The Issue Register module follows a layered architecture:

```
┌─────────────────────────────────────┐
│         UI Components              │
│  (React Components & Pages)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Service Layer               │
│  (issueService, issueActionService) │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Validation & Utilities         │
│  (issueValidation, issueWorkflows)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Database Layer              │
│  (PostgreSQL + Supabase)            │
└─────────────────────────────────────┘
```

## Database Schema

### Core Tables

#### `issue_registers`
One register per project. Contains register metadata and configuration.

**Key Fields**:
- `id` (UUID, PK)
- `project_id` (UUID, FK, UNIQUE)
- `register_reference` (VARCHAR, UNIQUE) - Auto-generated (IR-YYYY-NNN)
- `version_number` (VARCHAR)
- `update_process` (TEXT)
- `priority_scale` (JSONB)
- `severity_scale` (JSONB)

#### `issues`
Individual issue entries. Enhanced from base `issues` table.

**Key Fields**:
- `id` (UUID, PK)
- `issue_register_id` (UUID, FK)
- `issue_identifier` (VARCHAR, UNIQUE) - Auto-generated (ISS-YYYY-NNN)
- `issue_number` (INTEGER) - Sequential within register
- `issue_type` (ENUM) - request_for_change, off_specification, problem_concern
- `issue_title` (VARCHAR)
- `issue_description` (TEXT)
- `status` (ENUM) - draft, raised, under_assessment, awaiting_decision, approved, rejected, deferred, in_progress, resolved, closed, cancelled
- `priority` (ENUM) - critical, high, medium, low
- `severity` (ENUM) - critical, major, moderate, minor
- `raised_by_id` (UUID, FK)
- `owner_id` (UUID, FK)
- `date_raised` (DATE)
- `status_date` (DATE)

**Indexes**:
- `idx_issues_register_id` on `issue_register_id`
- `idx_issues_type` on `issue_type`
- `idx_issues_status` on `status`
- `idx_issues_priority_severity` on `priority, severity`
- `idx_issues_owner_id` on `owner_id`
- `idx_issues_date_raised` on `date_raised`

#### `issue_actions`
Resolution actions for issues.

**Key Fields**:
- `id` (UUID, PK)
- `issue_id` (UUID, FK)
- `action_number` (INTEGER)
- `action_description` (TEXT)
- `action_type` (ENUM)
- `assigned_to_id` (UUID, FK)
- `target_date` (DATE)
- `status` (ENUM) - planned, in_progress, completed, cancelled, blocked

#### `issue_decisions`
Decisions made on issues.

**Key Fields**:
- `id` (UUID, PK)
- `issue_id` (UUID, FK)
- `decision_date` (DATE)
- `decision_type` (ENUM) - approve, reject, defer, escalate, accept_concession, request_more_info
- `decision_maker_id` (UUID, FK)
- `decision_rationale` (TEXT)
- `conditions` (TEXT)

#### `issue_status_history`
Status change audit trail.

**Key Fields**:
- `id` (UUID, PK)
- `issue_id` (UUID, FK)
- `previous_status` (VARCHAR)
- `new_status` (VARCHAR)
- `changed_date` (TIMESTAMPTZ)
- `changed_by` (UUID, FK)
- `change_reason` (TEXT)

#### Supporting Tables
- `issue_links` - Issue interdependencies
- `issue_watchers` - Stakeholders watching issues
- `issue_priority_scales` - Configurable priority scales (per organisation)
- `issue_severity_scales` - Configurable severity scales (per organisation)

### Database Functions

#### `generate_issue_register_reference()`
Generates unique register reference: `IR-YYYY-NNN`

#### `generate_issue_identifier(p_issue_register_id UUID)`
Generates unique issue identifier: `ISS-YYYY-NNN`

#### `create_issue_register_for_project(p_project_id UUID, p_user_id UUID)`
Creates issue register for a project.

#### `validate_issue_status_transition(p_current_status VARCHAR, p_new_status VARCHAR)`
Validates if status transition is allowed.

#### `calculate_issue_priority_score(p_priority VARCHAR, p_severity VARCHAR)`
Calculates combined priority/severity score.

#### `get_issue_warnings(p_issue_id UUID)`
Returns warnings for an issue based on quality criteria.

#### `calculate_issue_completion(p_issue_id UUID)`
Calculates completion percentage (0-100).

### Triggers

#### `trg_projects_auto_create_issue_register`
Automatically creates issue register when project is created.

#### `trg_issues_enforce_status_transition`
Enforces valid status transitions and updates `status_date`.

#### `trg_issues_status_history`
Records status changes in `issue_status_history` table.

## API Services

### issueService.js

**Core CRUD**:
- `createIssue(registerId, issueData)` - Create new issue
- `updateIssue(issueId, updates)` - Update issue
- `deleteIssue(issueId)` - Soft delete issue
- `getIssues(registerId, filters)` - Get filtered issues
- `getIssueById(issueId)` - Get single issue

**Filtering**:
- `getRFCs(registerId)` - Get Request for Change issues
- `getOffSpecifications(registerId)` - Get Off-specification issues
- `getProblemsAndConcerns(registerId)` - Get Problem/Concern issues
- `getIssuesByStatus(registerId, status)` - Filter by status
- `getIssuesByPriority(registerId, priority)` - Filter by priority
- `getIssuesBySeverity(registerId, severity)` - Filter by severity
- `getIssuesByOwner(registerId, ownerId)` - Filter by owner
- `getOpenIssues(registerId)` - Get open issues
- `getCriticalIssues(registerId)` - Get critical issues
- `searchIssues(registerId, searchTerm)` - Search issues

**Status Management**:
- `updateStatus(issueId, status, notes)` - Update status (with validation)
- `closeIssue(issueId, resolution, notes)` - Close issue
- `reopenIssue(issueId, reason)` - Reopen closed issue
- `getStatusHistory(issueId)` - Get status change history

### issueActionService.js

- `addAction(issueId, actionData)` - Add resolution action
- `updateAction(actionId, updates)` - Update action
- `deleteAction(actionId)` - Delete action
- `getActions(issueId)` - Get actions for issue
- `startAction(actionId)` - Start action
- `completeAction(actionId, notes)` - Complete action
- `cancelAction(actionId, reason)` - Cancel action
- `blockAction(actionId, blockingReason)` - Block action
- `getOverdueActions(projectId)` - Get overdue actions
- `getMyActions(userId)` - Get user's assigned actions

### issueDecisionService.js

- `recordDecision(issueId, decisionData)` - Record decision
- `updateDecision(decisionId, updates)` - Update decision
- `getDecisions(issueId)` - Get decisions for issue
- `getPendingDecisions(projectId)` - Get issues awaiting decisions
- `getDecisionsByMaker(projectId, userId)` - Get decisions by maker
- `getDecisionHistory(issueId)` - Get decision history

### issueTransferService.js

- `transferToRisk(issueId, riskData)` - Transfer issue to Risk Register
- `createFromRisk(riskId)` - Create issue from materialized risk
- `createChangeRequest(issueId)` - Create Change Request from RFC
- `linkToChangeRequest(issueId, changeRequestId)` - Link issue to Change Request
- `linkToRisk(issueId, riskId)` - Link issue to risk

### issueAnalyticsService.js

- `getIssueSummary(projectId)` - Get summary statistics
- `getIssuesByType(projectId)` - Get count by type
- `getIssuesByPriority(projectId)` - Get count by priority
- `getIssuesBySeverity(projectId)` - Get count by severity
- `getIssueTrends(projectId, dateRange)` - Get trends over time
- `getIssueAging(projectId)` - Get aging analysis
- `getResolutionMetrics(projectId)` - Get resolution metrics
- `getActionEffectiveness(projectId)` - Get action effectiveness

### issueScaleService.js

- `getPriorityScales(organisationId)` - Get priority scales
- `getSeverityScales(organisationId)` - Get severity scales
- `updatePriorityScales(organisationId, scales)` - Update priority scales
- `updateSeverityScales(organisationId, scales)` - Update severity scales
- `updateScales(organisationId, priorityScales, severityScales)` - Update both

## Business Logic

### Auto-Create Register

When a project is created, a trigger automatically creates an issue register:
- Trigger: `trg_projects_auto_create_issue_register`
- Function: `auto_create_issue_register_for_project()`
- Generates unique reference automatically

### Status Transitions

Status transitions are enforced at both database and application level:

**Database Level**:
- Trigger: `trg_issues_enforce_status_transition`
- Function: `validate_issue_status_transition()`
- Prevents invalid transitions

**Application Level**:
- `validateStatusTransition()` in `issueValidation.js`
- Called in `updateStatus()` service method

### Priority/Severity Assessment

**Combined Score Calculation**:
- Function: `calculate_issue_priority_score()`
- Returns: `very_high`, `high`, `medium`, `low`
- Based on priority × severity matrix

**Immediate Attention**:
- Function: `requires_immediate_attention()`
- Returns true for `very_high` and `high` scores
- Excludes closed/cancelled issues

### Workflow Helpers

**RFC Workflow**:
- `can_create_change_request()` - Check if RFC can create CR
- Requires: `status IN ('approved', 'in_progress')`

**Risk Transfer**:
- `can_transfer_to_risk()` - Check if issue can be transferred
- Requires: `status NOT IN ('closed', 'cancelled')` AND `transferred_to_risk_id IS NULL`

**Decision Required**:
- `requires_decision()` - Check if issue requires decision
- Returns true for RFCs/Off-specs in `awaiting_decision` without decisions

## Validation

### Field-Level Validation

**Title**:
- Required
- Minimum 10 characters

**Description**:
- Required
- Minimum 30 characters

**Impact Description**:
- Required
- Minimum 20 characters

**Issue Type**:
- Required
- Must be: `request_for_change`, `off_specification`, `problem_concern`

**Priority**:
- Required
- Must be: `critical`, `high`, `medium`, `low`

**Severity**:
- Required
- Must be: `critical`, `major`, `moderate`, `minor`

**Owner**:
- Required for `in_progress` status

**Type-Specific**:
- Off-specification: Must link to product
- RFC: Should specify cost or schedule impact

### Status Transition Validation

Valid transitions defined in `validateStatusTransition()`:
- Enforced at database level (trigger)
- Enforced at application level (service)

### Quality Checks

**Warnings Generated**:
- High priority/severity without actions
- Overdue actions
- Issues open 30+ days
- RFCs without decisions
- Off-specs without resolution plans

**Completion Indicators**:
- Status progression: 0-50 points
- Action completion: 0-30 points
- Resolution description: 0-20 points
- Total: 0-100%

## Workflows

### RFC Workflow

```
draft → raised → under_assessment → awaiting_decision → approved → in_progress → resolved → closed
                                                      ↓
                                                   rejected → closed
                                                   deferred → raised
```

### Off-Specification Workflow

```
draft → raised → under_assessment → awaiting_decision → approved → in_progress → resolved → closed
                                                      ↓
                                                   rejected → closed
                                                   deferred → raised
                                    ↓
                                 resolved → closed (concession)
```

### Problem/Concern Workflow

```
draft → raised → under_assessment → in_progress → resolved → closed
                                    ↓
                                 resolved → closed (quick resolution)
```

## Integration Points

### Project Integration

- Auto-create register on project creation (trigger)
- Issue summary on project dashboard
- Project health indicators

### Risk Register Integration

- Transfer issue to risk (`transfer_issue_to_risk()`)
- Create issue from materialized risk (`create_issue_from_risk()`)
- Two-way linkage via `transferred_to_risk_id` and `escalated_from_risk_id`

### Change Control Integration

- Create Change Request from RFC (`create_change_request_from_rfc()`)
- Link issues to change requests via `change_request_id`

### Products Integration

- Link issues to products via `related_product_id`
- Display product-related issues
- Track off-specs by product

## Testing

### Unit Tests

**Service Tests** (`src/services/__tests__/issueService.test.js`):
- `createIssue()` - Create issue successfully
- `updateIssue()` - Update issue
- `getIssues()` - Fetch issues
- `getIssueById()` - Fetch single issue
- `updateStatus()` - Status transition validation

**Validation Tests** (`src/utils/__tests__/issueValidation.test.js`):
- Field validation (title, description, impact)
- Type validation (issue type, priority, severity)
- Owner validation
- Status transition validation
- Form validation
- Priority score calculation

### Integration Tests

**Database Functions**:
- Test auto-create register trigger
- Test status transition enforcement
- Test reference generation
- Test warning generation

**Service Integration**:
- Test CRUD operations end-to-end
- Test workflow transitions
- Test transfer/escalation
- Test export functionality

### Component Tests

**UI Components** (to be implemented):
- `IssueForm` - Form validation and submission
- `IssueList` - Display and filtering
- `IssueDetailView` - Tab navigation and data display
- `IssueActionsPanel` - Action management
- `IssueDecisionsPanel` - Decision recording

## Deployment

### SQL Migrations

Execute in order:
1. `v174_issue_register_tables.sql` - Core tables and functions
2. `v175_issue_register_rls_policies.sql` - RLS policies
3. `v176_issue_register_business_logic.sql` - Business logic and triggers

### Dependencies

**Required NPM Packages**:
- `jspdf` - PDF generation
- `html2canvas` - HTML to canvas conversion

**Install**:
```bash
npm install jspdf html2canvas
```

### Configuration

**Priority/Severity Scales**:
- Configure via PMO Admin → Issue Scales
- Default scales provided if not configured
- Scales are per-organisation

## Performance Considerations

### Indexes

All key fields are indexed:
- `issue_register_id` - Fast filtering by register
- `issue_type` - Fast filtering by type
- `status` - Fast filtering by status
- `priority, severity` - Fast filtering by priority/severity
- `owner_id` - Fast filtering by owner
- `date_raised` - Fast date range queries

### Query Optimization

- Use `getIssues()` with filters rather than fetching all and filtering client-side
- Use type-specific functions (`getRFCs()`, etc.) for better performance
- Pagination recommended for large issue registers

## Security

### Row Level Security (RLS)

All tables have RLS enabled:
- Project team members can view issues for their projects
- Any team member can raise issues
- Only PM, Team Managers can change status
- Only designated decision makers can record decisions
- Issue owners can edit their owned issues
- PMO Admins can view and manage all issues in their organisation

### Access Control

- RLS policies enforce access at database level
- Service layer validates user permissions
- UI components check permissions before showing actions

## Troubleshooting

### Common Issues

**Issue Register Not Created**:
- Check trigger exists: `trg_projects_auto_create_issue_register`
- Check function exists: `auto_create_issue_register_for_project()`
- Verify project creation completed successfully

**Status Transition Fails**:
- Check transition is valid (see Status Transitions section)
- Check user has permission to change status
- Check trigger is enabled: `trg_issues_enforce_status_transition`

**Export Fails**:
- Verify `jspdf` and `html2canvas` are installed
- Check browser console for errors
- Ensure sufficient memory for large exports

## Future Enhancements

- Full Excel export with formatting (using `xlsx` library)
- Email notifications for watchers
- Bulk operations (bulk status change, bulk assign)
- Issue templates
- Custom fields per organisation
- Advanced analytics and reporting
- Integration with external issue tracking systems
