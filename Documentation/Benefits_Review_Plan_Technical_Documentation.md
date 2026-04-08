# Benefits Review Plan Technical Documentation

## Overview

This document provides technical details for developers working with the Benefits Review Plan module in the Nidus PMO Platform.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Service Layer](#service-layer)
4. [API Reference](#api-reference)
5. [Component Structure](#component-structure)
6. [Integration Points](#integration-points)
7. [Testing](#testing)

---

## Architecture

### Module Structure

```
src/
├── services/
│   ├── benefitsReviewPlanService.js          # Main CRUD operations
│   ├── benefitsReviewPlanNotificationService.js  # Notifications
│   ├── benefitsReviewPlanBusinessCaseService.js  # Business Case integration
│   ├── benefitsReviewPlanValidationService.js    # Quality validation
│   └── disBenefitsService.js                 # Dis-benefits CRUD
├── components/
│   └── benefits/
│       ├── BenefitsReviewPlanForm.jsx        # Main form
│       ├── BenefitsReviewPlanView.jsx        # Main view
│       ├── BenefitsReviewPlanHistory.jsx     # Revision history
│       ├── BenefitsReviewPlanApprovals.jsx   # Approvals workflow
│       ├── BenefitsReviewPlanDistribution.jsx # Distribution
│       ├── BenefitsCoverageSection.jsx       # Benefits coverage
│       ├── BenefitsReviewResources.jsx       # Resources
│       ├── BenefitsReviewSchedule.jsx        # Review scheduling
│       └── DisBenefitsSection.jsx            # Dis-benefits
├── pages/
│   └── BenefitsReviewPlan.jsx                # Main page
└── utils/
    └── benefitsReviewPlanExport.js           # PDF/Print export
```

---

## Database Schema

### Tables

#### `benefits_review_plans`

Main document table.

**Key Fields:**
- `id`: UUID (Primary Key)
- `project_id`: UUID (Foreign Key → projects)
- `programme_id`: UUID (Foreign Key → programmes, nullable)
- `document_ref`: TEXT (Unique document reference)
- `plan_title`: TEXT
- `plan_date`: DATE
- `version_number`: TEXT (e.g., "1.0")
- `status`: TEXT (draft, pending_approval, approved, archived)
- `business_case_document_id`: UUID (Foreign Key → project_documents, nullable)

**Indexes:**
- `idx_benefits_review_plans_project` on `project_id`
- `idx_benefits_review_plans_document_ref` on `document_ref`

#### `benefits_review_plan_revisions`

Revision history.

**Key Fields:**
- `id`: UUID (Primary Key)
- `review_plan_id`: UUID (Foreign Key → benefits_review_plans)
- `revision_number`: TEXT
- `revision_date`: DATE
- `summary_of_changes`: TEXT
- `changes_marked`: BOOLEAN
- `revised_by_user_id`: UUID (Foreign Key → users)

#### `benefits_review_plan_approvals`

Approval workflow.

**Key Fields:**
- `id`: UUID (Primary Key)
- `review_plan_id`: UUID (Foreign Key → benefits_review_plans)
- `approver_user_id`: UUID (Foreign Key → users)
- `approval_status`: TEXT (pending, approved, rejected, requested_changes)
- `version_approved`: TEXT
- `approval_date`: DATE (nullable)
- `comments`: TEXT

#### `benefits_review_plan_distribution`

Distribution list.

**Key Fields:**
- `id`: UUID (Primary Key)
- `review_plan_id`: UUID (Foreign Key → benefits_review_plans)
- `recipient_user_id`: UUID (Foreign Key → users, nullable)
- `recipient_name`: TEXT
- `recipient_email`: TEXT
- `distribution_method`: TEXT (email, portal, print, meeting, other)
- `version_issued`: TEXT
- `acknowledged`: BOOLEAN
- `acknowledged_date`: TIMESTAMP (nullable)

#### `benefits_review_plan_benefits`

Benefits coverage (many-to-many).

**Key Fields:**
- `id`: UUID (Primary Key)
- `review_plan_id`: UUID (Foreign Key → benefits_review_plans)
- `benefit_id`: UUID (Foreign Key → benefits)
- `included_in_scope`: BOOLEAN
- `measurement_frequency`: TEXT
- `measurement_timing_reason`: TEXT
- `accountable_user_id`: UUID (Foreign Key → users, nullable)
- `next_review_date`: DATE (nullable)
- `priority`: TEXT (critical, high, medium, low)

#### `benefits_review_plan_resources`

Resource planning.

**Key Fields:**
- `id`: UUID (Primary Key)
- `review_plan_id`: UUID (Foreign Key → benefits_review_plans)
- `resource_type`: TEXT (person, skill, tool, system, budget, other)
- `resource_name`: TEXT
- `assigned_user_id`: UUID (Foreign Key → users, nullable)
- `estimated_effort_hours`: DECIMAL
- `estimated_cost`: DECIMAL
- `cost_currency`: TEXT
- `availability_confirmed`: BOOLEAN

#### `benefits_review_schedule`

Scheduled reviews.

**Key Fields:**
- `id`: UUID (Primary Key)
- `review_plan_id`: UUID (Foreign Key → benefits_review_plans)
- `benefit_id`: UUID (Foreign Key → benefits, nullable)
- `review_name`: TEXT
- `review_type`: TEXT (benefit_review, baseline_review, performance_review, final_review)
- `planned_date`: DATE
- `forecast_date`: DATE (nullable)
- `reviewer_user_id`: UUID (Foreign Key → users, nullable)
- `status`: TEXT (scheduled, in_progress, completed, cancelled, rescheduled)
- `is_virtual`: BOOLEAN
- `meeting_link`: TEXT (nullable)
- `review_location`: TEXT (nullable)

#### `dis_benefits`

Dis-benefits tracking.

**Key Fields:**
- `id`: UUID (Primary Key)
- `project_id`: UUID (Foreign Key → projects)
- `review_plan_id`: UUID (Foreign Key → benefits_review_plans, nullable)
- `dis_benefit_code`: TEXT
- `dis_benefit_name`: TEXT
- `impact_severity`: TEXT (critical, high, medium, low, minimal)
- `impact_probability`: DECIMAL (0-100)
- `mitigation_status`: TEXT (identified, planned, in_progress, mitigated, accepted)
- `status`: TEXT (active, realized, mitigated, closed)

---

## Service Layer

### `benefitsReviewPlanService.js`

Main service for CRUD operations.

**Key Functions:**

```javascript
// Get plans
getBenefitsReviewPlans(filters) → Promise<Array>
getBenefitsReviewPlan(planId) → Promise<Object>
getOrCreatePlanForProject(projectId) → Promise<Object>

// Save/Delete
saveBenefitsReviewPlan(planData, planId?) → Promise<Object>
deleteBenefitsReviewPlan(planId) → Promise<void>

// Revisions
getRevisionHistory(planId) → Promise<Array>
addRevision(planId, revisionData) → Promise<Object>

// Approvals
getApprovals(planId) → Promise<Array>
requestApproval(planId, approverIds) → Promise<Array>
recordApproval(approvalId, status, comments) → Promise<Object>
getMyPendingApprovals(userId) → Promise<Array>

// Distribution
getDistributionList(planId) → Promise<Array>
addRecipient(planId, recipientData) → Promise<Object>
removeRecipient(distributionId) → Promise<void>
recordAcknowledgement(distributionId) → Promise<Object>

// Benefits Coverage
getPlanBenefits(planId) → Promise<Array>
addBenefitToPlan(planId, benefitId, coverageData) → Promise<Object>
updateBenefitCoverage(coverageId, data) → Promise<Object>
removeBenefitFromPlan(coverageId) → Promise<void>
getUnmappedBenefits(projectId, planId) → Promise<Array>

// Resources
getPlanResources(planId) → Promise<Array>
addResource(planId, resourceData) → Promise<Object>
updateResource(resourceId, data) → Promise<Object>
removeResource(resourceId) → Promise<void>
calculateTotalResourceCost(planId) → Promise<Object>

// Review Schedule
getReviewSchedule(planId) → Promise<Array>
scheduleReview(planId, reviewData) → Promise<Object>
updateReview(reviewId, data) → Promise<Object>
completeReview(reviewId, completionData) → Promise<Object>
getUpcomingReviews(projectId, daysAhead) → Promise<Array>
getOverdueReviews(projectId) → Promise<Array>
```

### `benefitsReviewPlanNotificationService.js`

Handles notifications.

**Key Functions:**

```javascript
notifyApprovalRequested(planId, approverIds) → Promise<Object>
notifyApprovalDecision(planId, approvalId, decision, comments) → Promise<Object>
notifyDistribution(planId, distributionIds) → Promise<Object>
checkAndNotifyUpcomingReviews(projectId, daysAhead) → Promise<Object>
checkAndNotifyOverdueReviews(projectId) → Promise<Object>
notifyPendingApprovals(userId) → Promise<Object>
```

### `benefitsReviewPlanBusinessCaseService.js`

Business Case integration.

**Key Functions:**

```javascript
findBusinessCaseDocument(projectId) → Promise<Object|null>
linkBusinessCase(planId, businessCaseDocumentId) → Promise<Object>
getLinkedBusinessCase(planId) → Promise<Object|null>
syncBenefitsFromBusinessCase(planId, projectId) → Promise<Object>
autoLinkBusinessCase(planId, projectId) → Promise<Object>
```

### `benefitsReviewPlanValidationService.js`

Quality criteria validation.

**Key Functions:**

```javascript
validateBenefitsReviewPlan(planId) → Promise<Object>
generateValidationReport(planId) → Promise<Object>
```

**Validation Criteria:**
1. All Business Case benefits covered
2. Benefits are measurable (have measurement units and baseline values)
3. Timing specified with reasons
4. Resources identified
5. Cost vs benefit value realistic
6. Dis-benefits considered

### `disBenefitsService.js`

Dis-benefits CRUD.

**Key Functions:**

```javascript
getDisBenefitsForPlan(planId) → Promise<Array>
saveDisBenefit(disBenefitData, disBenefitId?) → Promise<Object>
deleteDisBenefit(disBenefitId) → Promise<void>
updateMitigationStatus(disBenefitId, status, notes) → Promise<Object>
```

---

## Component Structure

### Page Component: `BenefitsReviewPlan.jsx`

Main page with tabbed interface.

**Props:** None (uses route params)

**State:**
- `plan`: Current plan data
- `activeTab`: Current tab (overview, coverage, resources, schedule, disbenefits, history)
- Related data (coverage, resources, reviews, etc.)

**Features:**
- Auto-creates plan if doesn't exist
- Tabbed navigation
- Refresh functionality
- Export/Print buttons

### Form Component: `BenefitsReviewPlanForm.jsx`

Multi-tab form for editing plan.

**Props:**
- `plan`: Plan data (null for new)
- `projectId`: Project ID
- `onSave`: Callback after save
- `onCancel`: Callback on cancel

**Tabs:**
1. Header: Basic information
2. Scope: Scope description
3. Accountability: Accountability structure
4. Measurement: Measurement approach
5. Resources: Resources description
6. Baseline: Baseline measures
7. Performance: Performance review approach
8. Dis-benefits: Dis-benefits description

### View Component: `BenefitsReviewPlanView.jsx`

Read-only view of plan.

**Props:**
- `plan`: Plan data
- `onEdit`: Callback to edit
- `onExport`: Callback to export PDF
- `onPrint`: Callback to print
- `onApprove`: Callback to approve
- `onDistribute`: Callback to distribute

### Section Components

All section components follow similar patterns:

**Props:**
- `planId`: Plan ID
- `projectId`: Project ID (optional, for project-specific data)
- `onUpdate`: Callback to refresh parent data

**Features:**
- List/table view
- Add/Edit/Delete operations
- Form validation
- Error handling

---

## Integration Points

### Business Case Integration

- Auto-links Business Case document on plan creation
- Can manually link Business Case
- Sync benefits from Business Case to plan
- Shows linked Business Case in plan view

### Benefits Service Integration

- Uses `getBenefits()` to fetch project benefits
- Links to benefits via `benefit_id`
- Validates benefit coverage

### Document Governance Integration

- Links to Business Case via `business_case_document_id`
- Uses document governance for document references

### Notification Integration

- Uses `notificationIntegrationService` for event triggers
- Uses `emailIntegrationService` for email notifications
- Supports Slack, Teams, email, webhook channels

---

## Testing

### Unit Tests

Located in `src/services/__tests__/`:

- `benefitsReviewPlanService.test.js`
- `benefitsReviewPlanValidationService.test.js`

### Test Structure

```javascript
describe('Service Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Function Name', () => {
    it('should do something', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

### Running Tests

```bash
npm test
npm run test:coverage
```

---

## RLS Policies

All tables have Row-Level Security (RLS) policies:

- **SELECT**: Users can view plans for projects they're members of
- **INSERT**: Users can create plans for projects they're members of
- **UPDATE**: Users can update plans they created or own
- **DELETE**: Users can soft-delete plans they created or own

**Policy Pattern:**
- Uses `user_projects` table for membership check
- Uses `user_roles` for role-based access
- Supports project, programme, and organization-level access

---

## Export Functionality

### PDF Export

Uses `jspdf` and `html2canvas`:

```javascript
import { exportBenefitsReviewPlanToPDF } from '../utils/benefitsReviewPlanExport';

await exportBenefitsReviewPlanToPDF(
  plan,
  coverage,
  resources,
  reviews,
  disBenefits,
  revisions,
  approvals,
  distribution
);
```

**PDF Structure:**
- Matches template layout
- Includes all sections
- Preserves formatting
- Multi-page support

### Print Functionality

Uses browser print API:

```javascript
import { printBenefitsReviewPlan } from '../utils/benefitsReviewPlanExport';

printBenefitsReviewPlan(
  plan,
  coverage,
  resources,
  reviews,
  disBenefits,
  revisions,
  approvals,
  distribution
);
```

---

## API Patterns

### Error Handling

All service functions follow this pattern:

```javascript
try {
  // Operation
  const { data, error } = await platformDb.from('table').select();
  
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Error description:', error);
  throw error; // Re-throw for caller to handle
}
```

### User Authentication

Services get user from Supabase auth:

```javascript
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('User not authenticated');

const { data: userRecord } = await platformDb
  .from('users')
  .select('id')
  .eq('auth_user_id', user.id)
  .eq('is_deleted', false)
  .single();
```

### Soft Deletes

All tables use `is_deleted` flag:

```javascript
.eq('is_deleted', false)
```

---

## Future Enhancements

Potential future enhancements:

1. Calendar view for review schedule
2. Automated review reminders
3. Benefits measurement data entry
4. Dashboard widgets
5. Advanced reporting
6. Integration with benefits realization tracking
7. Approval workflow enhancements
8. Document templates customization

---

**Last Updated**: 2026-01-20  
**Version**: 1.0
