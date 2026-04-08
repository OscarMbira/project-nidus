# Business Case CRUD Implementation Plan

## Overview
Implementation of full CRUD operations for Project Business Case functionality based on structured project management methodology template. This feature will allow users to create, read, update, and delete comprehensive business case documents for their projects.

## Relationship Design: Option 3 (Hybrid) - One-to-One with Supersession Tracking

**Chosen Approach**: Each project has **exactly ONE active business case** at any given time, but can have multiple historical business cases linked through supersession tracking.

**Key Principles**:
- UNIQUE constraint on (`project_id` + `is_active = true`) ensures only one active business case per project
- When major project re-justification is needed, create a new business case that supersedes the current one
- Old business case is archived (status changed to 'superseded')
- Lineage tracking via `supersedes_id` and `superseded_by_id` fields
- Complete audit trail of all business case evolutions

**Use Cases**:
1. **Initial Business Case**: Created at project initiation
2. **Major Scope Change**: New business case supersedes original, links preserved
3. **Re-justification**: New business case for project continuation after significant changes
4. **Historical Reference**: All superseded business cases remain accessible for audit and comparison

## Database Schema Design

### Main Tables

#### 1. `project_business_cases` (Main Business Case Table)
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects table)
- `version_no` (VARCHAR) - Document version number
- `document_ref` (VARCHAR) - Unique document reference
- `author_id` (UUID, FK to users)
- `owner_id` (UUID, FK to users)
- `client_id` (UUID, FK to users/clients)
- `executive_summary` (TEXT)
- `reasons` (TEXT) - Why undertaking the project
- `timescale_summary` (TEXT) - Project duration and benefit realization period
- `investment_appraisal_summary` (TEXT) - Benefits vs costs comparison
- `status` (ENUM: 'draft', 'pending_approval', 'approved', 'rejected', 'superseded', 'archived')
- `is_active` (BOOLEAN) - Current active business case (only one per project)
- `supersedes_id` (UUID, FK to project_business_cases, NULLABLE) - References the business case this one replaces
- `superseded_by_id` (UUID, FK to project_business_cases, NULLABLE) - References the business case that replaced this one
- `superseded_date` (TIMESTAMPTZ, NULLABLE) - When this business case was superseded
- `supersession_reason` (TEXT, NULLABLE) - Explanation for why new business case was needed
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `created_by` (UUID)
- `updated_by` (UUID)

**Constraints**:
- UNIQUE constraint on (`project_id`, `is_active`) WHERE `is_active = true` - Ensures only one active business case per project
- CHECK constraint: `superseded_by_id IS NOT NULL` implies `status = 'superseded'`

#### 2. `business_case_revision_history`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `revision_date` (DATE)
- `previous_revision_date` (DATE)
- `summary_of_changes` (TEXT)
- `changes_marked` (TEXT)
- `revised_by` (UUID, FK to users)
- `created_at` (TIMESTAMPTZ)

#### 3. `business_case_approvals`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `approver_id` (UUID, FK to users)
- `approver_name` (VARCHAR)
- `approver_title` (VARCHAR)
- `signature_data` (TEXT) - Digital signature or approval token
- `approval_date` (DATE)
- `approval_status` (ENUM: 'pending', 'approved', 'rejected')
- `comments` (TEXT)
- `version_approved` (VARCHAR)
- `created_at` (TIMESTAMPTZ)

#### 4. `business_case_distribution`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `recipient_id` (UUID, FK to users)
- `recipient_name` (VARCHAR)
- `recipient_title` (VARCHAR)
- `date_of_issue` (DATE)
- `version_distributed` (VARCHAR)
- `distribution_status` (ENUM: 'sent', 'read', 'acknowledged')
- `created_at` (TIMESTAMPTZ)

#### 5. `business_case_options`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `option_type` (ENUM: 'do_nothing', 'do_minimal', 'do_something', 'custom')
- `option_title` (VARCHAR)
- `option_description` (TEXT)
- `analysis` (TEXT)
- `recommendation` (TEXT)
- `is_recommended` (BOOLEAN)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 6. `business_case_benefits`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `benefit_type` (ENUM: 'financial', 'non_financial', 'strategic', 'operational')
- `benefit_description` (TEXT)
- `measurable_target` (TEXT)
- `baseline_value` (DECIMAL)
- `target_value` (DECIMAL)
- `measurement_unit` (VARCHAR)
- `realization_date` (DATE)
- `owner_id` (UUID, FK to users)
- `is_quantifiable` (BOOLEAN)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 7. `business_case_disbenefits`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `disbenefit_description` (TEXT)
- `affected_stakeholder` (VARCHAR)
- `impact_level` (ENUM: 'low', 'medium', 'high', 'critical')
- `mitigation_strategy` (TEXT)
- `is_quantifiable` (BOOLEAN)
- `estimated_cost` (DECIMAL)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 8. `business_case_costs`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `cost_category` (ENUM: 'capital', 'operational', 'maintenance', 'project', 'resource', 'other')
- `cost_description` (TEXT)
- `estimated_amount` (DECIMAL)
- `actual_amount` (DECIMAL)
- `currency` (VARCHAR, default 'USD')
- `funding_source` (VARCHAR)
- `payment_schedule` (TEXT)
- `is_recurring` (BOOLEAN)
- `recurrence_period` (VARCHAR) - monthly, yearly, etc.
- `start_date` (DATE)
- `end_date` (DATE)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 9. `business_case_risks`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `risk_title` (VARCHAR)
- `risk_description` (TEXT)
- `probability` (ENUM: 'very_low', 'low', 'medium', 'high', 'very_high')
- `impact` (ENUM: 'very_low', 'low', 'medium', 'high', 'very_high')
- `risk_score` (INTEGER) - Calculated: probability x impact
- `response_strategy` (TEXT)
- `contingency_plan` (TEXT)
- `owner_id` (UUID, FK to users)
- `status` (ENUM: 'identified', 'mitigating', 'closed', 'occurred')
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 10. `business_case_timescales`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `milestone_name` (VARCHAR)
- `milestone_description` (TEXT)
- `planned_start_date` (DATE)
- `planned_end_date` (DATE)
- `actual_start_date` (DATE)
- `actual_end_date` (DATE)
- `duration_days` (INTEGER)
- `is_critical_path` (BOOLEAN)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### 11. `business_case_quality_checks`
- `id` (UUID, PK)
- `business_case_id` (UUID, FK to project_business_cases)
- `criterion_number` (INTEGER) - 1 to 12
- `criterion_name` (VARCHAR) - Display name of criterion
- `criterion_description` (TEXT) - Full description from template
- `is_automated` (BOOLEAN) - Can be validated automatically
- `validation_status` (ENUM: 'not_checked', 'passed', 'failed', 'needs_review', 'manual_override')
- `automated_check_result` (JSONB) - Details from automated validation
- `manual_check_comment` (TEXT) - PMO Admin/Reviewer comments
- `override_reason` (TEXT) - Required when status = 'manual_override'
- `is_blocking` (BOOLEAN) - Prevents approval if failed
- `checked_by` (UUID, FK to users)
- `checked_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Note**: When a new business case is created, automatically insert 12 rows (one for each criterion) with status 'not_checked'

### Database Functions (To be created in Phase 1)

#### `get_active_business_case(p_project_id UUID)`
Returns the currently active business case for a project.
```sql
RETURNS TABLE (business_case_id UUID, document_ref VARCHAR, status VARCHAR, ...)
```

#### `get_business_case_lineage(p_business_case_id UUID)`
Returns the complete lineage chain (all predecessors and successors) for a business case.
```sql
RETURNS TABLE (
  business_case_id UUID,
  generation INTEGER, -- 1 = original, 2 = first superseding, etc.
  status VARCHAR,
  superseded_date TIMESTAMPTZ,
  supersession_reason TEXT,
  ...
)
```

#### `supersede_business_case(p_project_id UUID, p_new_business_case_data JSONB, p_supersession_reason TEXT, p_user_id UUID)`
Atomic function to supersede the current active business case with a new one.
```sql
RETURNS UUID -- Returns the new business case ID
```
This function:
1. Validates current business case exists and is approved
2. Updates current business case: sets status='superseded', is_active=false, superseded_date=NOW()
3. Creates new business case with supersedes_id set to current business case
4. Links both business cases bidirectionally
5. Returns new business case ID

#### `can_edit_business_case(p_business_case_id UUID, p_user_id UUID)`
Checks if a business case can be edited by a user.
```sql
RETURNS BOOLEAN
```
Returns false if:
- Business case is superseded
- Business case is approved (and not in special edit mode)
- User doesn't have permission

#### `validate_single_active_business_case()`
Trigger function to ensure only one active business case per project.
```sql
RETURNS TRIGGER
```
Called before INSERT/UPDATE on project_business_cases.

#### `initialize_quality_checks(p_business_case_id UUID)`
Creates 12 quality check records for a new business case.
```sql
RETURNS VOID
```
Inserts 12 rows into business_case_quality_checks with status 'not_checked'.
Called automatically via trigger after business case creation.

#### `run_automated_quality_checks(p_business_case_id UUID)`
Executes all automated quality validations.
```sql
RETURNS TABLE (
  criterion_number INTEGER,
  criterion_name VARCHAR,
  validation_status VARCHAR,
  check_details JSONB
)
```
Performs automated checks for all 12 criteria and updates the quality_checks table.

#### `get_quality_check_summary(p_business_case_id UUID)`
Returns quality check summary and completion percentage.
```sql
RETURNS TABLE (
  total_criteria INTEGER,
  passed INTEGER,
  failed INTEGER,
  needs_review INTEGER,
  not_checked INTEGER,
  completion_percentage DECIMAL,
  can_submit_for_approval BOOLEAN,
  blocking_issues TEXT[]
)
```

## Implementation Phases

### Phase 1: Database Setup
- [ ] Create database migration file (v159_business_case_tables.sql)
- [ ] Define all 11 tables with proper RLS policies:
  * project_business_cases (main table)
  * business_case_revision_history
  * business_case_approvals
  * business_case_distribution
  * business_case_options
  * business_case_benefits
  * business_case_disbenefits
  * business_case_costs
  * business_case_risks
  * business_case_timescales
  * business_case_quality_checks (NEW - for quality criteria tracking)
- [ ] Create UNIQUE partial index: `CREATE UNIQUE INDEX idx_active_business_case_per_project ON project_business_cases(project_id) WHERE is_active = true`
- [ ] Create indexes for performance optimization:
  * project_id, status, supersedes_id, superseded_by_id on project_business_cases
  * business_case_id on all child tables
  * criterion_number on business_case_quality_checks
- [ ] Add foreign key constraints with ON DELETE CASCADE for child tables
- [ ] Add self-referential foreign keys for supersession tracking
- [ ] Register all 11 tables in database_tables registry
- [ ] Create database functions:
  * get_active_business_case(project_id)
  * get_business_case_lineage(business_case_id)
  * supersede_business_case(project_id, new_data, reason, user_id)
  * can_edit_business_case(business_case_id, user_id)
  * initialize_quality_checks(business_case_id) - NEW
  * run_automated_quality_checks(business_case_id) - NEW
  * get_quality_check_summary(business_case_id) - NEW
- [ ] Create triggers:
  * Audit trail trigger for all tables
  * Supersession validation trigger
  * Prevent editing superseded business cases trigger
  * Auto-initialize quality checks on business case creation - NEW
- [ ] Seed business_case_quality_checks with 12 criterion definitions

### Phase 2: Service Layer
- [ ] Create `businessCaseService.js` with CRUD operations
- [ ] Create `businessCaseVersioningService.js` for revision management
- [ ] Create `businessCaseApprovalService.js` for approval workflows
- [ ] Implement validation functions
- [ ] Add error handling and logging
- [ ] Create helper functions for calculations (ROI, risk scores, etc.)

### Phase 3: UI Components - Form Sections
- [ ] Create `BusinessCaseForm.jsx` - Main form container with tabs
- [ ] Create `ExecutiveSummarySection.jsx` - Section 3
- [ ] Create `ReasonsSection.jsx` - Section 4
- [ ] Create `BusinessOptionsSection.jsx` - Section 5 with option management
- [ ] Create `BenefitsSection.jsx` - Section 6 with benefit items
- [ ] Create `DisbenefitsSection.jsx` - Section 7 with disbenefit items
- [ ] Create `TimescalesSection.jsx` - Section 8 with timeline visualization
- [ ] Create `CostsSection.jsx` - Section 9 with cost breakdown
- [ ] Create `InvestmentAppraisalSection.jsx` - Section 10 with ROI calculations
- [ ] Create `RisksSection.jsx` - Section 11 with risk matrix

### Phase 4: UI Components - Supporting Components
- [ ] Create `BusinessCaseHeader.jsx` - Document metadata (author, owner, client, etc.)
- [ ] Create `BusinessCaseHistory.jsx` - Revision history display
- [ ] Create `BusinessCaseLineageViewer.jsx` - Display supersession chain with timeline visualization
- [ ] Create `BusinessCaseSupersessionDialog.jsx` - Modal for creating superseding business case
- [ ] Create `BusinessCaseApprovals.jsx` - Approval workflow component
- [ ] Create `BusinessCaseDistribution.jsx` - Distribution list management
- [ ] Create `BusinessCaseVersionComparison.jsx` - Compare versions side-by-side
- [ ] Create `BusinessCaseComparison.jsx` - Compare two different business cases (e.g., original vs superseding)
- [ ] Create `BusinessCasePrintView.jsx` - Print/export formatted view
- [ ] Create `BusinessCaseStatusBadge.jsx` - Status indicator (including 'superseded' status)
- [ ] Create `ROICalculator.jsx` - Real-time ROI calculation widget
- [ ] Create `SupersessionWarning.jsx` - Warning banner when viewing superseded business case
- [ ] Create `QualityCriteriaChecklist.jsx` - Full 12-point quality criteria checklist with status
- [ ] Create `QualityCriteriaProgress.jsx` - Circular progress indicator for quality completion
- [ ] Create `QualityCriterionCard.jsx` - Individual criterion card with expand/collapse
- [ ] Create `QualityCheckValidationModal.jsx` - Show validation details and manual override option
- [ ] Create `QualityCheckHistory.jsx` - Historical quality check results

### Phase 5: Pages
- [ ] Create `BusinessCaseList.jsx` - List all business cases for a project
- [ ] Create `BusinessCaseCreate.jsx` - Create new business case
- [ ] Create `BusinessCaseEdit.jsx` - Edit existing business case
- [ ] Create `BusinessCaseView.jsx` - Read-only view with export options
- [ ] Create `BusinessCaseApprovalDashboard.jsx` - Approval workflow dashboard

### Phase 6: Routing and Navigation
- [ ] Add routes to App.jsx for business case pages
- [ ] Create breadcrumb navigation
- [ ] Add menu items to PMO Admin sidebar
- [ ] Add menu items to Project Manager sidebar
- [ ] Implement role-based access control for routes

### Phase 7: Business Logic
- [ ] Implement automatic ROI calculation
- [ ] Implement risk score calculation (probability x impact)
- [ ] Implement version control and comparison
- [ ] Implement supersession workflow:
  * Validate current business case is active and approved
  * Archive current business case with supersession metadata
  * Create new business case linked to predecessor
  * Send notifications to stakeholders
  * Update project references to new business case
- [ ] Implement lineage tracking and visualization
- [ ] Implement approval workflow state machine
- [ ] Implement notification system for approvals
- [ ] Implement document locking during approval process
- [ ] Implement auto-save functionality
- [ ] Implement read-only enforcement for superseded business cases
- [ ] Implement business case comparison logic (financial, benefits, risks)

### Phase 8: Validation and Quality Checks
- [ ] Create `business_case_quality_checks` table migration
- [ ] Implement automated validation for all 12 quality criteria:
  * [ ] Criterion 1: Corporate strategy alignment check
  * [ ] Criterion 2: Project plan alignment validation
  * [ ] Criterion 3: Benefits identification check (min 1 benefit)
  * [ ] Criterion 4: Benefits realization validation (dates, owners, targets)
  * [ ] Criterion 5: Success criteria definition check
  * [ ] Criterion 6: Preferred business option validation (exactly 1 recommended)
  * [ ] Criterion 7: Procurement sourcing check (conditional)
  * [ ] Criterion 8: Funding sources validation (all costs funded)
  * [ ] Criterion 9: Non-financial criteria check (mixed benefit types)
  * [ ] Criterion 10: O&M costs validation (recurring costs exist)
  * [ ] Criterion 11: Accounting standards compliance check (ROI, cash flow)
  * [ ] Criterion 12: Major risks validation (min 3, high-impact risks addressed)
- [ ] Create quality check service methods
- [ ] Implement auto-initialization of 12 quality check records on business case creation
- [ ] Create validation checklist UI component with expand/collapse
- [ ] Implement progressive validation (real-time as user completes sections)
- [ ] Add quality check status to business case form header
- [ ] Create manual override workflow for PMO Admins
- [ ] Implement submission blocking if critical criteria fail
- [ ] Add quality report to approval workflow
- [ ] Add warnings for incomplete sections
- [ ] Implement business rules enforcement
- [ ] Add field-level validation for all inputs
- [ ] Create quality criteria help/guidance tooltips

### Phase 9: Export and Reporting
- [ ] Implement PDF export functionality
- [ ] Implement Word document export
- [ ] Create printable view with proper formatting
- [ ] Implement email distribution feature
- [ ] Create executive summary report

### Phase 10: Testing
- [ ] Create unit tests for all services
- [ ] Create integration tests for CRUD operations
- [ ] Create component tests for all UI components
- [ ] Test approval workflow end-to-end
- [ ] Test version control and rollback
- [ ] Test supersession workflow:
  * Create initial business case → approve → supersede → verify old is archived
  * Test lineage tracking with 3+ business cases in chain
  * Test that only one active business case exists per project (constraint validation)
  * Test that superseded business cases are read-only
  * Test notifications sent during supersession
  * Test comparison between original and superseding business case
- [ ] Test quality criteria validation:
  * Test automatic validation for all 12 criteria
  * Test progressive validation (updates as user types)
  * Test submission blocking when critical criteria fail
  * Test manual override workflow (PMO Admin only)
  * Test quality check initialization on business case creation
  * Test quality check status display and progress indicators
  * Test quality report inclusion in approval workflow
  * Test each individual criterion validation logic
- [ ] Test edge cases:
  * Attempt to supersede non-approved business case (should fail)
  * Attempt to edit superseded business case (should fail)
  * Attempt to create multiple active business cases (should fail - constraint violation)
  * Delete project with business case lineage (cascade behavior)
  * Submit for approval with failing quality checks (should block)
  * Manual override without proper role (should fail)
- [ ] Test export functionality
- [ ] Test role-based access control

### Phase 11: Documentation
- [ ] Create user guide for business case creation
- [ ] Create technical documentation for developers
- [ ] Document API endpoints
- [ ] Create video tutorials/screenshots for user guide
- [ ] Document best practices for business case writing

### Phase 12: Integration
- [ ] Integrate with existing project creation flow
- [ ] Link business case to project dashboard
- [ ] Add business case metrics to PMO dashboard
- [ ] Integrate with document governance system
- [ ] Add audit logging for all changes

## Technical Specifications

### Service Methods

#### businessCaseService.js
```javascript
// CRUD Operations
- createBusinessCase(projectId, businessCaseData)
- getBusinessCaseById(businessCaseId)
- getActiveBusinessCase(projectId) - Get the current active business case for a project
- getBusinessCasesByProject(projectId) - Get all business cases (active + superseded)
- updateBusinessCase(businessCaseId, updates)
- deleteBusinessCase(businessCaseId) - Soft delete only

// Supersession Management
- supersedeBusinessCase(projectId, newBusinessCaseData, supersessionReason)
  * Marks current active business case as 'superseded'
  * Creates new business case linked via supersedes_id
  * Sets new business case as active
  * Records supersession reason and date
- getBusinessCaseLineage(businessCaseId) - Get full chain (predecessors and successors)
- getSupersededBusinessCases(projectId) - Get all historical business cases
- canSupersede(businessCaseId) - Check if business case can be superseded

// Sections Management
- addBusinessOption(businessCaseId, optionData)
- updateBusinessOption(optionId, updates)
- deleteBusinessOption(optionId)

- addBenefit(businessCaseId, benefitData)
- updateBenefit(benefitId, updates)
- deleteBenefit(benefitId)

- addDisbenefit(businessCaseId, disbenefitData)
- updateDisbenefit(disbenefitId, updates)
- deleteDisbenefit(disbenefitId)

- addCost(businessCaseId, costData)
- updateCost(costId, updates)
- deleteCost(costId)

- addRisk(businessCaseId, riskData)
- updateRisk(riskId, updates)
- deleteRisk(riskId)

- addTimescale(businessCaseId, timescaleData)
- updateTimescale(timescaleId, updates)
- deleteTimescale(timescaleId)

// Calculations
- calculateROI(businessCaseId)
- calculateTotalCosts(businessCaseId)
- calculateTotalBenefits(businessCaseId)
- calculateBreakEvenPoint(businessCaseId)
- calculateRiskExposure(businessCaseId)
- compareFinancials(businessCaseId1, businessCaseId2) - Compare two business cases

// Validation
- validateBusinessCase(businessCaseId)
- checkQualityCriteria(businessCaseId) - Run all 12 automated quality checks
- updateQualityCheck(businessCaseId, criterionNumber, status, comments)
- manualOverrideQualityCheck(businessCaseId, criterionNumber, overrideReason, userId)
- getQualityCheckStatus(businessCaseId) - Get current status of all criteria
- canSubmitForApproval(businessCaseId) - Check if all blocking criteria passed
- isEditable(businessCaseId) - Check if business case can be edited (not superseded/approved)
- initializeQualityChecks(businessCaseId) - Create 12 quality check records for new business case
```

#### businessCaseVersioningService.js
```javascript
- createNewVersion(businessCaseId, changesSummary)
- getVersionHistory(businessCaseId)
- compareVersions(versionId1, versionId2)
- rollbackToVersion(businessCaseId, versionId)
- getLatestVersion(projectId)
```

#### businessCaseApprovalService.js
```javascript
- submitForApproval(businessCaseId, approverIds)
- approveBusinessCase(approvalId, approverId, comments)
- rejectBusinessCase(approvalId, approverId, comments)
- getApprovalStatus(businessCaseId)
- sendApprovalNotifications(businessCaseId)
- getPendingApprovals(userId)
```

### Component Props Structure

#### BusinessCaseForm.jsx
```javascript
props: {
  projectId: UUID,
  businessCaseId: UUID (optional, for edit mode),
  mode: 'create' | 'edit' | 'view',
  onSave: Function,
  onCancel: Function
}
```

### Form Validation Rules
1. Executive Summary: Required, max 1000 characters
2. Reasons: Required, must align with project objectives
3. Business Options: At least one option required, one must be marked as recommended
4. Benefits: At least one benefit required, must have measurable targets
5. Costs: Project costs required, must have funding source
6. Investment Appraisal: Auto-calculated based on benefits and costs
7. Risks: At least one major risk required
8. Timescales: Must align with project plan dates
9. Supersession: When superseding, supersession reason is required (min 50 characters)
10. Edit Protection: Cannot edit business case if status is 'superseded' or 'approved'

### RLS Policies
- Users can view business cases (active and superseded) for projects they're members of
- Users can view full lineage chain for business cases they have access to
- Only Project Managers and PMO Admins can create business cases
- Only authors and owners can edit business cases in 'draft' status
- Only authors, owners, and PMO Admins can supersede business cases
- Business cases with status 'approved' or 'superseded' are read-only
- Superseding requires the current business case to be in 'approved' status
- PMO Admins can view all business cases (active and historical) in their organization
- Audit trail of supersession changes is immutable

### Supersession Workflow

#### When to Supersede a Business Case
A new business case should supersede the current one when:
1. **Major Scope Change**: Project scope significantly expands or contracts
2. **Strategic Realignment**: Corporate strategy changes affecting project justification
3. **Financial Rebaseline**: Significant cost or benefit changes require re-approval
4. **Risk Material Change**: New major risks fundamentally alter the business case
5. **Regulatory Changes**: New compliance requirements change the project approach
6. **Technology Pivot**: Major technology changes requiring re-justification

#### Supersession Process
1. **Initiate**: Project Manager/PMO Admin clicks "Supersede Business Case" on active business case
2. **Confirm**: System shows confirmation dialog with supersession reason field (required)
3. **Archive**: System sets current business case:
   - `status` → 'superseded'
   - `is_active` → false
   - `superseded_by_id` → [new business case ID]
   - `superseded_date` → current timestamp
4. **Create**: System creates new business case:
   - `supersedes_id` → [old business case ID]
   - `is_active` → true
   - `status` → 'draft'
   - Optionally copy sections from previous business case
5. **Notify**: System sends notifications to:
   - Project stakeholders
   - Previous approvers
   - Distribution list recipients
6. **Edit**: User completes new business case with updated information
7. **Approve**: New business case goes through approval workflow
8. **Activate**: Once approved, new business case becomes the project's authoritative business case

#### Lineage Visualization
Display business case lineage as a timeline:
```
[BC-001] Initial Business Case (Approved) → Superseded 2025-01-15
    ↓ Reason: Major scope expansion to include mobile app
[BC-002] Revised Business Case (Approved) → Superseded 2025-06-20
    ↓ Reason: Technology pivot to cloud-native architecture
[BC-003] Current Business Case (Active) ← You are here
```

## UI/UX Design Considerations

### Multi-step Form Flow
1. **Step 1**: Document Information (Author, Owner, Client, Version)
2. **Step 2**: Executive Summary and Reasons
3. **Step 3**: Business Options Analysis
4. **Step 4**: Benefits and Dis-benefits
5. **Step 5**: Timescales and Costs
6. **Step 6**: Investment Appraisal (Auto-calculated)
7. **Step 7**: Major Risks
8. **Step 8**: Review and Submit

### Theme Support
- All components must support dark/light mode toggle
- Use theme-aware colors from ThemeContext
- Ensure proper contrast for readability
- Support print-friendly styling

### Mobile Responsiveness (PWA)
- Responsive grid layout for all sections
- Touch-friendly form controls
- Collapsible sections for mobile view
- Save progress functionality
- Offline support for drafts

## Success Criteria

### User Confirmation Messages
After each CRUD operation, display confirmation with:
- Operation type (Created/Updated/Deleted)
- Business Case ID
- Business Case Document Reference
- Version Number
- Timestamp
- Next action suggestions

### Quality Criteria Checklist

Implement automated checks for all quality criteria from the template. Each criterion should have automated validation, manual override capability, and visual progress indicators.

#### Database Table: `business_case_quality_checks`
```sql
- id (UUID, PK)
- business_case_id (UUID, FK to project_business_cases)
- criterion_number (INTEGER) - 1 to 12
- criterion_name (VARCHAR)
- is_automated (BOOLEAN) - Can be validated automatically
- validation_status (ENUM: 'not_checked', 'passed', 'failed', 'needs_review', 'manual_override')
- automated_check_result (JSONB) - Details from automated validation
- manual_check_comment (TEXT) - PMO Admin/Reviewer comments
- checked_by (UUID, FK to users)
- checked_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### Quality Criteria with Validation Rules

**1. Reasons consistent with corporate strategy**
- **Validation**: Check if `reasons` field is populated (min 100 characters)
- **Manual Check**: Reviewer must confirm alignment with corporate strategy
- **UI Indicator**: Link to corporate strategy document for reference
- **Required**: Yes

**2. Project Plan and Business Case aligned**
- **Validation**:
  - Check if `timescale_summary` matches project dates
  - Verify project costs match business case costs (±10% tolerance)
  - Compare project milestones with business case timescales
- **Automated**: Partial (date comparison)
- **Manual Check**: PMO Admin confirms overall alignment
- **Required**: Yes

**3. Benefits clearly identified and justified**
- **Validation**:
  - At least 1 benefit exists in `business_case_benefits`
  - All benefits have `benefit_description` (min 50 characters)
  - All benefits have justification in description
- **Automated**: Yes (field presence check)
- **Required**: Yes

**4. Benefits realization plan clear**
- **Validation**:
  - All benefits have `realization_date` populated
  - All benefits have `owner_id` assigned
  - All benefits have measurable targets (`target_value` and `measurement_unit`)
- **Automated**: Yes
- **Required**: Yes

**5. Success criteria defined**
- **Validation**:
  - `executive_summary` contains success definition (keyword check: "success", "outcome", "criteria")
  - At least 1 benefit marked as critical success factor
  - Minimum 3 measurable KPIs defined
- **Automated**: Partial (keyword detection)
- **Manual Check**: Confirm success criteria are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- **Required**: Yes

**6. Preferred business option identified**
- **Validation**:
  - At least 2 business options exist in `business_case_options`
  - Exactly 1 option has `is_recommended = true`
  - Recommended option has `recommendation` text (min 100 characters)
- **Automated**: Yes
- **Required**: Yes

**7. Procurement sourcing option identified (if applicable)**
- **Validation**:
  - If any cost has `cost_category = 'external_procurement'`, check for sourcing option
  - Look for procurement keywords in business options or costs
- **Automated**: Conditional (only if procurement detected)
- **Manual Check**: PMO Admin confirms procurement approach
- **Required**: Conditional

**8. Funding sources identified**
- **Validation**:
  - All costs in `business_case_costs` have `funding_source` populated
  - Total costs ≤ total funding available
  - Funding sources are valid (from lookup table or free text)
- **Automated**: Yes
- **Required**: Yes

**9. Non-financial criteria included**
- **Validation**:
  - At least 1 benefit with `benefit_type = 'non_financial'` OR `benefit_type = 'strategic'`
  - Benefits mix includes both financial and non-financial
  - Investment appraisal considers non-financial impacts
- **Automated**: Yes
- **Required**: Yes

**10. Operations and maintenance costs included**
- **Validation**:
  - At least 1 cost with `cost_category = 'operational'` OR `cost_category = 'maintenance'`
  - O&M costs have `is_recurring = true` and future dates
  - O&M cost period extends beyond project completion
- **Automated**: Yes
- **Required**: Yes

**11. Accounting standards compliance**
- **Validation**:
  - ROI calculation includes break-even analysis
  - Cash flow projections included (check for costs with `payment_schedule`)
  - NPV or IRR calculated (if financial benefits exist)
  - All monetary values have currency specified
- **Automated**: Partial (calculation presence)
- **Manual Check**: Finance team confirms accounting standards
- **Required**: Yes

**12. Major risks explicitly stated with responses**
- **Validation**:
  - At least 3 risks exist in `business_case_risks`
  - At least 1 risk with `impact = 'high'` OR `impact = 'very_high'`
  - All high/very_high risks have `response_strategy` (min 50 characters)
  - All major risks have `contingency_plan` populated
- **Automated**: Yes
- **Required**: Yes

#### Quality Check UI Components

**Component: `QualityCriteriaChecklist.jsx`**
- Display all 12 criteria with status indicators (✓, ✗, ⚠)
- Color coding: Green (passed), Red (failed), Yellow (needs review), Gray (not checked)
- Expandable sections showing validation details
- Manual override button for PMO Admin (with comment requirement)
- Overall completion percentage (e.g., "10/12 criteria passed - 83%")
- Block submission if critical criteria fail

**Component: `QualityCriteriaProgress.jsx`**
- Circular progress indicator showing % completion
- Mini checklist for quick status overview
- Click to expand full checklist

**Service Method: `checkQualityCriteria(businessCaseId)`**
```javascript
Returns {
  overallStatus: 'passed' | 'failed' | 'needs_review',
  completionPercentage: 83,
  criteria: [
    {
      number: 1,
      name: "Reasons consistent with corporate strategy",
      status: "passed",
      automated: false,
      details: { ... },
      checkedBy: "user-id",
      checkedAt: "2026-01-16T10:30:00Z"
    },
    // ... 11 more
  ],
  canSubmitForApproval: true | false,
  blockingIssues: ["Criterion 6: No recommended option selected"]
}
```

#### Submission Workflow Integration

**Before Approval**:
1. User clicks "Submit for Approval"
2. System runs automated quality checks
3. If any criteria fail:
   - Show validation errors
   - Block submission
   - Highlight failed sections
4. If all pass or manual overrides exist:
   - Allow submission
   - Include quality check report with approval request

**Approval Dashboard**:
- Approvers see quality criteria status
- Can review automated check results
- Can perform manual verification
- Quality report included in approval package

#### Best Practice Features

1. **Progressive Validation**: Check criteria as user completes each section
2. **Real-time Feedback**: Show criteria status updating as data is entered
3. **Helpful Hints**: Provide guidance on how to satisfy each criterion
4. **Historical Tracking**: Store quality check results for each business case version
5. **Audit Trail**: Log all manual overrides with justification
6. **Templates**: Pre-populate sections with quality-compliant templates
7. **Smart Suggestions**: AI-powered suggestions to improve quality scores

## Dependencies
- Existing projects table
- Users table
- Role-based access control system (for PMO Admin manual overrides)
- Document governance system
- Notification system (for quality check failures and approvals)
- Email service integration
- PDF generation library (e.g., jsPDF or react-pdf)
- Corporate strategy documents (for quality criterion #1 validation)
- Project plan data (for quality criterion #2 alignment validation)
- Lookup tables for cost categories, benefit types, risk levels

## Risk Considerations
1. **Data Migration**: If projects already exist, need migration strategy for creating initial business cases
2. **Performance**: Large business cases with many benefits/risks may impact performance
3. **Concurrent Editing**: Multiple users editing same business case
4. **Version Control**: Complex version comparison for large documents
5. **Export Quality**: PDF/Word export formatting consistency
6. **Supersession Confusion**: Users may be confused about which business case is current - mitigate with clear UI indicators
7. **Lineage Complexity**: Long lineage chains (5+ business cases) may be difficult to visualize
8. **Orphaned Data**: Child records (benefits, costs, etc.) from superseded business cases must be preserved
9. **Constraint Violations**: Unique constraint on active business case must be properly handled in all code paths

## Future Enhancements (Post-MVP)
- AI-powered business case suggestions
- Template library for different project types
- Collaborative editing with real-time updates
- Integration with financial systems for cost tracking
- Advanced analytics and dashboards
- Comparison with industry benchmarks
- Automated benefit realization tracking
- Integration with risk management module

## Review Section
*To be completed after implementation*

### Changes Made
- [List of all changes]

### Challenges Encountered
- [Any issues and how they were resolved]

### Testing Results
- [Summary of test coverage and results]

### Performance Metrics
- [Load times, query performance, etc.]

### User Feedback
- [Any user feedback received during testing]

---

**Plan Created**: 2026-01-16
**Status**: Pending Approval
**Estimated Complexity**: High (Multi-phase feature with extensive database schema)
