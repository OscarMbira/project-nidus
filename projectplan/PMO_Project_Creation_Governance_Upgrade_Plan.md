# PMO Project Creation - Governance Upgrade Implementation Plan

## Document Information
- **Plan Name**: PMO Project Creation Governance Upgrade
- **Created**: 2026-01-12
- **Status**: Awaiting Approval
- **Approach**: Incremental, Phase-by-Phase Implementation

---

## Executive Summary

This plan upgrades the existing PMO "Create New Project" form from a governance-light implementation to a **governance-first, authorisation-driven project intake system** as defined in the PMO Project Creation PRD.

**Key Principles**:
- ✅ Incremental upgrades (small, clean patches per phase)
- ✅ No breaking changes to existing functionality
- ✅ Maintain current UI styling and components
- ✅ Enforce rules in both frontend validation AND Supabase backend
- ✅ PMO-only feature (no Project Manager or Executive dashboards)
- ✅ Metadata only - no document content editing/upload

---

## Current Implementation Analysis

### Files Identified
1. **Frontend Component**: `src/pages/ProjectsCreate.jsx` (737 lines)
   - Current fields: name, description, type, status, methodology, dates, budget, project code
   - Has role assignment feature (lazy loaded for PMO Admin)
   - Uses inline form submission logic

2. **Service Layer**: `src/services/projectService.js` (259 lines)
   - Provides CRUD operations for projects
   - Uses `platformDb` client (Supabase public schema)

3. **Database Schema**: `SQL/v04_project_core_tables.sql`
   - `projects` table exists with basic fields
   - Current fields: project_name, project_code, project_description, project_type_id, status_id, planned_start_date, planned_end_date, budget_amount, owner_user_id, sponsor_user_id, etc.

4. **Auth/Roles**: `SQL/v03_user_access_tables.sql`
   - `users` table exists
   - `roles` table exists
   - `user_roles` table exists (many-to-many with project_id support)

### Current Gaps vs PRD Requirements

| PRD Requirement | Current Status | Action Needed |
|-----------------|----------------|---------------|
| Draft → Authorised lifecycle | ❌ Missing | Add intake_status field + workflow |
| Executive/Sponsor assignment | ⚠️ Partial (sponsor_user_id exists) | Add executive_user_id + make mandatory |
| Board configuration | ❌ Missing | Add board_required + board members |
| Business justification | ❌ Missing | Add business_objective, strategic_alignment, benefits |
| Lifecycle & controls | ⚠️ Partial (methodology exists) | Add lifecycle_template, stage_model, tolerances |
| Document governance metadata | ❌ Missing | Add mandate_status, business_case_status, etc. |
| Financial controls | ⚠️ Partial (budget_amount exists) | Add currency, budget_type, funding_source, approval_status |
| Risk & complexity | ❌ Missing | Add risk_rating, complexity_rating, regulatory_impact |
| Authorisation readiness | ❌ Missing | Add validation logic + readiness tracking |
| Audit logging | ⚠️ Partial (audit_log table may exist) | Ensure comprehensive logging |

---

## Implementation Phases

### PHASE 0 - Pre-Implementation Setup ✅
**Duration**: Minimal (verification only)
**Files to Review**:
- ✅ `src/pages/ProjectsCreate.jsx` (read)
- ✅ `src/services/projectService.js` (read)
- ✅ `SQL/v04_project_core_tables.sql` (read)
- ✅ `SQL/v03_user_access_tables.sql` (read)

**Deliverables**:
- ✅ Current implementation documented
- ✅ Gap analysis completed
- ✅ Implementation plan approved by user

---

### PHASE 1 - Add Draft → Authorised Lifecycle (No Breaking Changes)

**Objective**: Introduce project intake lifecycle without disrupting existing functionality.

#### Database Changes (SQL Migration)
**File**: `SQL/v152_project_intake_lifecycle.sql`

```sql
-- Add lifecycle fields to projects table
ALTER TABLE projects
ADD COLUMN intake_status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN created_by_user_id UUID REFERENCES users(id),
ADD COLUMN authorised_by_user_id UUID REFERENCES users(id),
ADD COLUMN authorised_at TIMESTAMP,
ADD COLUMN rejection_reason TEXT,
ADD COLUMN suspended_reason TEXT;

-- Add constraint for intake_status values
ALTER TABLE projects
ADD CONSTRAINT chk_projects_intake_status
CHECK (intake_status IN ('draft', 'readiness_pending', 'authorised', 'rejected', 'suspended'));

-- Add indexes for performance
CREATE INDEX idx_projects_intake_status ON projects(intake_status) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_authorised_by ON projects(authorised_by_user_id);

-- Add comment
COMMENT ON COLUMN projects.intake_status IS 'Project intake lifecycle: draft, readiness_pending, authorised, rejected, suspended';

-- Register table update
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('projects', 'Main project records with intake lifecycle support', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();
```

#### Frontend Changes

**File**: `src/pages/ProjectsCreate.jsx`

Changes:
1. Update `formData` state to include `intake_status` (default: 'draft')
2. Update submit handler to set `intake_status: 'draft'` and `created_by_user_id: user.id`
3. Add "Save Draft" button alongside "Create Project" button
4. Both buttons submit the same form but with success message differentiation

**Minimal Patch**:
- Line ~250: Add `intake_status: 'draft'` to insert payload
- Line ~261: Add `created_by_user_id: user.id` to insert payload
- Line ~715-732: Duplicate submit button, change text to "Save Draft"

**File**: `src/services/projectService.js`

Changes:
1. Update `createProject()` function to accept `intake_status` and `created_by_user_id`

**Deliverables**:
- ✅ SQL migration file created and documented
- ✅ Frontend updated with dual button (Create Project / Save Draft)
- ✅ Backend service accepts new fields
- ✅ Existing functionality preserved (no breaking changes)
- ✅ Manual testing completed

---

### PHASE 2 - Add New Governance Fields (Capture Only)

**Objective**: Add all governance fields from PRD to support authorisation readiness. Fields are captured but not yet enforced.

#### Database Changes (SQL Migration)
**File**: `SQL/v153_project_governance_fields.sql`

```sql
-- ==============================================
-- SECTION A: Governance & Authority
-- ==============================================
ALTER TABLE projects
ADD COLUMN executive_user_id UUID REFERENCES users(id),
ADD COLUMN board_required BOOLEAN DEFAULT FALSE,
ADD COLUMN funding_authority_user_id UUID REFERENCES users(id),
ADD COLUMN approving_authority_user_id UUID REFERENCES users(id);

COMMENT ON COLUMN projects.executive_user_id IS 'Project Executive/Sponsor (mandatory for authorisation)';
COMMENT ON COLUMN projects.board_required IS 'Whether project board is required';

-- Board members (many-to-many)
CREATE TABLE IF NOT EXISTS project_board_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    board_role VARCHAR(100), -- 'Senior User', 'Senior Supplier', etc.
    appointed_at TIMESTAMP DEFAULT NOW(),
    appointed_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    CONSTRAINT uq_project_board_members UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_board_members_project_id ON project_board_members(project_id);
CREATE INDEX idx_project_board_members_user_id ON project_board_members(user_id);

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('project_board_members', 'Project board member assignments', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ==============================================
-- SECTION B: Business Justification
-- ==============================================
ALTER TABLE projects
ADD COLUMN business_objective TEXT,
ADD COLUMN strategic_alignment VARCHAR(100),
ADD COLUMN expected_benefits_summary TEXT,
ADD COLUMN benefit_owner_user_id UUID REFERENCES users(id);

COMMENT ON COLUMN projects.business_objective IS 'Business problem/objective statement';
COMMENT ON COLUMN projects.strategic_alignment IS 'How project aligns to strategy';

-- ==============================================
-- SECTION C: Lifecycle & Controls
-- ==============================================
ALTER TABLE projects
ADD COLUMN delivery_methodology VARCHAR(50), -- 'PRINCE2', 'Agile', 'Hybrid'
ADD COLUMN lifecycle_template VARCHAR(100),
ADD COLUMN stage_model VARCHAR(50), -- 'fixed', 'flexible'
ADD COLUMN stage_gate_enforcement VARCHAR(50) DEFAULT 'required', -- 'required', 'advisory'
ADD COLUMN tolerance_time_days INTEGER,
ADD COLUMN tolerance_cost_percentage DECIMAL(5,2),
ADD COLUMN tolerance_scope_description TEXT;

COMMENT ON COLUMN projects.delivery_methodology IS 'Delivery approach: PRINCE2, Agile, Hybrid';
COMMENT ON COLUMN projects.stage_gate_enforcement IS 'Stage gate enforcement: required or advisory';

-- ==============================================
-- SECTION D: Financial Controls
-- ==============================================
ALTER TABLE projects
ADD COLUMN budget_currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN budget_type VARCHAR(50), -- 'capex', 'opex', 'mixed'
ADD COLUMN funding_source VARCHAR(200),
ADD COLUMN budget_approval_status VARCHAR(50); -- 'pending', 'approved', 'rejected'

COMMENT ON COLUMN projects.budget_type IS 'Budget type: capex, opex, or mixed';
COMMENT ON COLUMN projects.budget_approval_status IS 'Budget approval status';

-- ==============================================
-- SECTION E: Risk & Complexity Pre-Assessment
-- ==============================================
ALTER TABLE projects
ADD COLUMN initial_risk_rating VARCHAR(50), -- 'low', 'medium', 'high'
ADD COLUMN complexity_rating VARCHAR(50), -- 'low', 'medium', 'high'
ADD COLUMN delivery_complexity VARCHAR(50), -- 'single_vendor', 'multi_vendor'
ADD COLUMN regulatory_impact BOOLEAN DEFAULT FALSE,
ADD COLUMN data_sensitivity VARCHAR(50); -- 'public', 'internal', 'confidential'

COMMENT ON COLUMN projects.initial_risk_rating IS 'Initial risk assessment: low, medium, high';
COMMENT ON COLUMN projects.complexity_rating IS 'Project complexity: low, medium, high';

-- ==============================================
-- SECTION F: Document Governance Metadata
-- ==============================================
ALTER TABLE projects
ADD COLUMN mandate_status VARCHAR(50), -- 'draft', 'approved', 'missing'
ADD COLUMN business_case_status VARCHAR(50), -- 'draft', 'approved', 'missing'
ADD COLUMN rfp_reference VARCHAR(200),
ADD COLUMN funding_approval_status VARCHAR(50), -- 'pending', 'approved', 'rejected'
ADD COLUMN document_repository_url TEXT;

COMMENT ON COLUMN projects.mandate_status IS 'Project mandate document status';
COMMENT ON COLUMN projects.business_case_status IS 'Business case document status';
COMMENT ON COLUMN projects.document_repository_url IS 'Link to external document repository';

-- ==============================================
-- SECTION G: Resource & Capacity (Advisory)
-- ==============================================
ALTER TABLE projects
ADD COLUMN estimated_effort VARCHAR(50), -- 'small', 'medium', 'large'
ADD COLUMN key_skills_required TEXT,
ADD COLUMN external_vendors_required BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN projects.estimated_effort IS 'Estimated effort: small, medium, large';

-- Add indexes
CREATE INDEX idx_projects_executive_user_id ON projects(executive_user_id);
CREATE INDEX idx_projects_benefit_owner_user_id ON projects(benefit_owner_user_id);
CREATE INDEX idx_projects_delivery_methodology ON projects(delivery_methodology);
CREATE INDEX idx_projects_initial_risk_rating ON projects(initial_risk_rating);
CREATE INDEX idx_projects_complexity_rating ON projects(complexity_rating);

-- Add check constraints
ALTER TABLE projects
ADD CONSTRAINT chk_projects_delivery_methodology
CHECK (delivery_methodology IN ('PRINCE2', 'Agile', 'Hybrid', 'Waterfall', 'Structured') OR delivery_methodology IS NULL);

ALTER TABLE projects
ADD CONSTRAINT chk_projects_initial_risk_rating
CHECK (initial_risk_rating IN ('low', 'medium', 'high') OR initial_risk_rating IS NULL);

ALTER TABLE projects
ADD CONSTRAINT chk_projects_complexity_rating
CHECK (complexity_rating IN ('low', 'medium', 'high') OR complexity_rating IS NULL);
```

#### Frontend Changes

**File**: `src/pages/ProjectsCreate.jsx`

Changes:
1. Expand `formData` state to include all new governance fields (initialized to empty/default values)
2. Add new form sections using accordion/collapsible components:
   - Section A: Governance & Authority
   - Section B: Business Justification
   - Section C: Lifecycle & Controls
   - Section D: Financial Controls
   - Section E: Risk & Complexity
   - Section F: Document Governance Metadata
   - Section G: Resource & Capacity (optional)
3. Add dropdowns for user selection (Executive, Benefit Owner, Funding Authority, Approving Authority)
4. Add multi-select for board members (conditional on board_required = true)
5. Update submit handler to include all new fields

**Component Structure** (new components to create):
- `src/components/project/GovernanceSection.jsx` - Governance & Authority fields
- `src/components/project/BusinessJustificationSection.jsx` - Business fields
- `src/components/project/LifecycleControlsSection.jsx` - Lifecycle fields
- `src/components/project/FinancialControlsSection.jsx` - Financial fields
- `src/components/project/RiskComplexitySection.jsx` - Risk & complexity fields
- `src/components/project/DocumentGovernanceSection.jsx` - Document metadata fields

**Deliverables**:
- ✅ SQL migration file created
- ✅ New form sections added with accordion/collapsible UI
- ✅ All fields captured in formData state
- ✅ Dropdown components for user selections
- ✅ Submit handler updated to include all fields
- ✅ Form remains functional (fields optional for now)
- ✅ Manual testing completed

---

### PHASE 3 - Authorisation Readiness Validation

**Objective**: Implement validation logic to check if a project is ready for authorisation.

#### Database Changes (SQL Migration)
**File**: `SQL/v154_project_readiness_validation.sql`

```sql
-- Add readiness tracking fields
ALTER TABLE projects
ADD COLUMN readiness_status VARCHAR(50), -- 'pass', 'fail', 'not_checked'
ADD COLUMN readiness_issues JSONB,
ADD COLUMN readiness_checked_at TIMESTAMP,
ADD COLUMN readiness_checked_by UUID REFERENCES users(id);

COMMENT ON COLUMN projects.readiness_status IS 'Authorisation readiness: pass, fail, not_checked';
COMMENT ON COLUMN projects.readiness_issues IS 'JSONB array of validation issues';

-- Create RPC function to validate project readiness
CREATE OR REPLACE FUNCTION validate_project_readiness(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
    v_issues JSONB := '[]'::JSONB;
    v_board_members_count INTEGER;
    v_readiness_status VARCHAR(50);
BEGIN
    -- Get project details
    SELECT * INTO v_project
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Validate mandatory fields
    IF v_project.executive_user_id IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'executive_user_id', 'message', 'Executive/Sponsor must be assigned');
    END IF;

    IF v_project.business_objective IS NULL OR trim(v_project.business_objective) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'business_objective', 'message', 'Business objective is required');
    END IF;

    IF v_project.strategic_alignment IS NULL OR trim(v_project.strategic_alignment) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'strategic_alignment', 'message', 'Strategic alignment is required');
    END IF;

    IF v_project.expected_benefits_summary IS NULL OR trim(v_project.expected_benefits_summary) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'expected_benefits_summary', 'message', 'Expected benefits summary is required');
    END IF;

    IF v_project.benefit_owner_user_id IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'benefit_owner_user_id', 'message', 'Benefit owner must be assigned');
    END IF;

    IF v_project.delivery_methodology IS NULL OR trim(v_project.delivery_methodology) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'delivery_methodology', 'message', 'Delivery methodology is required');
    END IF;

    IF v_project.lifecycle_template IS NULL OR trim(v_project.lifecycle_template) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'lifecycle_template', 'message', 'Lifecycle template is required');
    END IF;

    IF v_project.stage_model IS NULL OR trim(v_project.stage_model) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'stage_model', 'message', 'Stage model is required');
    END IF;

    IF v_project.tolerance_time_days IS NULL AND v_project.tolerance_cost_percentage IS NULL THEN
        v_issues := v_issues || jsonb_build_object('field', 'tolerances', 'message', 'At least one tolerance (time or cost) must be defined');
    END IF;

    IF v_project.budget_amount IS NULL OR v_project.budget_amount <= 0 THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_amount', 'message', 'Budget amount must be greater than zero');
    END IF;

    IF v_project.budget_type IS NULL OR trim(v_project.budget_type) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_type', 'message', 'Budget type (capex/opex/mixed) is required');
    END IF;

    IF v_project.funding_source IS NULL OR trim(v_project.funding_source) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'funding_source', 'message', 'Funding source is required');
    END IF;

    IF v_project.budget_approval_status IS NULL OR trim(v_project.budget_approval_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'budget_approval_status', 'message', 'Budget approval status is required');
    END IF;

    IF v_project.initial_risk_rating IS NULL OR trim(v_project.initial_risk_rating) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'initial_risk_rating', 'message', 'Initial risk rating is required');
    END IF;

    IF v_project.complexity_rating IS NULL OR trim(v_project.complexity_rating) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'complexity_rating', 'message', 'Complexity rating is required');
    END IF;

    IF v_project.mandate_status IS NULL OR trim(v_project.mandate_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'mandate_status', 'message', 'Mandate status is required');
    END IF;

    IF v_project.business_case_status IS NULL OR trim(v_project.business_case_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'business_case_status', 'message', 'Business case status is required');
    END IF;

    IF v_project.funding_approval_status IS NULL OR trim(v_project.funding_approval_status) = '' THEN
        v_issues := v_issues || jsonb_build_object('field', 'funding_approval_status', 'message', 'Funding approval status is required');
    END IF;

    -- Conditional validations
    IF v_project.board_required = TRUE THEN
        SELECT COUNT(*) INTO v_board_members_count
        FROM project_board_members
        WHERE project_id = p_project_id
        AND is_active = TRUE
        AND is_deleted = FALSE;

        IF v_board_members_count = 0 THEN
            v_issues := v_issues || jsonb_build_object('field', 'board_members', 'message', 'Board members are required when board is enabled');
        END IF;
    END IF;

    -- Date validations
    IF v_project.planned_start_date IS NOT NULL AND v_project.planned_end_date IS NOT NULL THEN
        IF v_project.planned_end_date < v_project.planned_start_date THEN
            v_issues := v_issues || jsonb_build_object('field', 'planned_end_date', 'message', 'End date must be after start date');
        END IF;
    END IF;

    -- Determine readiness status
    IF jsonb_array_length(v_issues) = 0 THEN
        v_readiness_status := 'pass';
    ELSE
        v_readiness_status := 'fail';
    END IF;

    -- Update project readiness fields
    UPDATE projects
    SET readiness_status = v_readiness_status,
        readiness_issues = v_issues,
        readiness_checked_at = NOW(),
        readiness_checked_by = auth.uid()
    WHERE id = p_project_id;

    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'readiness_status', v_readiness_status,
        'issues', v_issues,
        'issues_count', jsonb_array_length(v_issues)
    );
END;
$$;

COMMENT ON FUNCTION validate_project_readiness IS 'Validates if a project meets authorisation readiness criteria';
```

#### Frontend Changes

**File**: `src/pages/ProjectsCreate.jsx`

Changes:
1. Add "Validate Readiness" button (disabled if project not saved as draft)
2. Call RPC function `validate_project_readiness` on button click
3. Display readiness results in a panel:
   - Green checkmark if pass
   - Red X with list of issues if fail
4. Store readiness status in component state

**New Component**:
- `src/components/project/ReadinessPanel.jsx` - Display readiness validation results

**Deliverables**:
- ✅ SQL migration with RPC function created
- ✅ "Validate Readiness" button added
- ✅ Frontend calls RPC function
- ✅ Readiness results displayed to user
- ✅ Manual testing completed

---

### PHASE 4 - Enforce Authorisation Rules (Hard Gates)

**Objective**: Implement authorisation action with strict validation enforcement.

#### Database Changes (SQL Migration)
**File**: `SQL/v155_project_authorisation.sql`

```sql
-- Create RPC function to authorise project
CREATE OR REPLACE FUNCTION authorise_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
    v_readiness_result JSONB;
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = v_current_user_id)
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can authorise projects'
        );
    END IF;

    -- Get project
    SELECT * INTO v_project
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Check if already authorised
    IF v_project.intake_status = 'authorised' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project is already authorised'
        );
    END IF;

    -- Run readiness validation
    v_readiness_result := validate_project_readiness(p_project_id);

    IF (v_readiness_result->>'readiness_status') != 'pass' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project does not meet authorisation readiness criteria',
            'readiness_result', v_readiness_result
        );
    END IF;

    -- Authorise project
    UPDATE projects
    SET intake_status = 'authorised',
        authorised_by_user_id = v_current_user_id,
        authorised_at = NOW()
    WHERE id = p_project_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project authorised successfully'
    );
END;
$$;

COMMENT ON FUNCTION authorise_project IS 'Authorises a project after validating readiness (PMO Admin only)';

-- Create RPC function to reject project
CREATE OR REPLACE FUNCTION reject_project(p_project_id UUID, p_rejection_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = v_current_user_id)
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can reject projects'
        );
    END IF;

    -- Reject project
    UPDATE projects
    SET intake_status = 'rejected',
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project rejected'
    );
END;
$$;

COMMENT ON FUNCTION reject_project IS 'Rejects a project with reason (PMO Admin only)';

-- Create RPC function to suspend project
CREATE OR REPLACE FUNCTION suspend_project(p_project_id UUID, p_suspended_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = v_current_user_id)
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can suspend projects'
        );
    END IF;

    -- Suspend project
    UPDATE projects
    SET intake_status = 'suspended',
        suspended_reason = p_suspended_reason,
        updated_at = NOW()
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project suspended'
    );
END;
$$;

COMMENT ON FUNCTION suspend_project IS 'Suspends a project with reason (PMO Admin only)';

-- Add RLS policies for PMO Admin only
CREATE POLICY "PMO Admin can authorise projects"
ON projects
FOR UPDATE
USING (
    EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    )
);
```

#### Frontend Changes

**File**: `src/pages/ProjectsCreate.jsx`

Changes:
1. Add "Authorise Project" button (enabled only if readiness_status = 'pass')
2. Add "Reject Project" button with reason modal
3. Add "Suspend Project" button with reason modal
4. Call respective RPC functions on button click
5. Show success/error messages
6. Disable authorisation actions if user is not PMO Admin

**Deliverables**:
- ✅ SQL migration with authorisation RPC functions created
- ✅ RLS policies added for PMO Admin only
- ✅ Frontend buttons added with conditional enabling
- ✅ RPC function calls implemented
- ✅ Success/error handling implemented
- ✅ Manual testing completed (PMO Admin only can authorise)

---

### PHASE 5 - Audit Logging (PMO Actions)

**Objective**: Ensure all PMO actions are logged for audit trail.

#### Database Changes (SQL Migration)
**File**: `SQL/v156_project_audit_logging.sql`

```sql
-- Check if audit_log table exists, create if not
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'authorise', 'reject', 'suspend'
    action_details JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit_log(performed_at DESC);

-- Register table if not exists
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('audit_log', 'System-wide audit log for all table changes and actions', true, true, 'system')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- Create audit logging function for project lifecycle actions
CREATE OR REPLACE FUNCTION log_project_action(
    p_project_id UUID,
    p_action VARCHAR(50),
    p_action_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        record_id,
        action,
        action_details,
        performed_by,
        performed_at
    )
    VALUES (
        'projects',
        p_project_id,
        p_action,
        p_action_details,
        auth.uid(),
        NOW()
    );
END;
$$;

-- Update authorise_project to log action
CREATE OR REPLACE FUNCTION authorise_project(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
    v_readiness_result JSONB;
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = v_current_user_id)
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can authorise projects'
        );
    END IF;

    -- Get project
    SELECT * INTO v_project
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Check if already authorised
    IF v_project.intake_status = 'authorised' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project is already authorised'
        );
    END IF;

    -- Run readiness validation
    v_readiness_result := validate_project_readiness(p_project_id);

    IF (v_readiness_result->>'readiness_status') != 'pass' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project does not meet authorisation readiness criteria',
            'readiness_result', v_readiness_result
        );
    END IF;

    -- Authorise project
    UPDATE projects
    SET intake_status = 'authorised',
        authorised_by_user_id = v_current_user_id,
        authorised_at = NOW()
    WHERE id = p_project_id;

    -- Log action
    PERFORM log_project_action(
        p_project_id,
        'authorise',
        jsonb_build_object(
            'previous_status', v_project.intake_status,
            'new_status', 'authorised',
            'authorised_by', v_current_user_id,
            'authorised_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project authorised successfully'
    );
END;
$$;

-- Update reject_project to log action
CREATE OR REPLACE FUNCTION reject_project(p_project_id UUID, p_rejection_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
    v_previous_status VARCHAR(50);
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = v_current_user_id)
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can reject projects'
        );
    END IF;

    -- Get previous status
    SELECT intake_status INTO v_previous_status
    FROM projects
    WHERE id = p_project_id;

    -- Reject project
    UPDATE projects
    SET intake_status = 'rejected',
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Log action
    PERFORM log_project_action(
        p_project_id,
        'reject',
        jsonb_build_object(
            'previous_status', v_previous_status,
            'new_status', 'rejected',
            'rejection_reason', p_rejection_reason,
            'rejected_by', v_current_user_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project rejected'
    );
END;
$$;

-- Update suspend_project to log action
CREATE OR REPLACE FUNCTION suspend_project(p_project_id UUID, p_suspended_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_is_pmo_admin BOOLEAN;
    v_previous_status VARCHAR(50);
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();

    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user is PMO Admin
    SELECT EXISTS(
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = v_current_user_id)
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    ) INTO v_is_pmo_admin;

    IF NOT v_is_pmo_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Only PMO Admin can suspend projects'
        );
    END IF;

    -- Get previous status
    SELECT intake_status INTO v_previous_status
    FROM projects
    WHERE id = p_project_id;

    -- Suspend project
    UPDATE projects
    SET intake_status = 'suspended',
        suspended_reason = p_suspended_reason,
        updated_at = NOW()
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Project not found'
        );
    END IF;

    -- Log action
    PERFORM log_project_action(
        p_project_id,
        'suspend',
        jsonb_build_object(
            'previous_status', v_previous_status,
            'new_status', 'suspended',
            'suspended_reason', p_suspended_reason,
            'suspended_by', v_current_user_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Project suspended'
    );
END;
$$;

-- Create trigger to log draft saves
CREATE OR REPLACE FUNCTION trigger_log_project_draft_save()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.intake_status = 'draft' AND (OLD.intake_status IS NULL OR OLD.intake_status = 'draft') THEN
        PERFORM log_project_action(
            NEW.id,
            'save_draft',
            jsonb_build_object(
                'project_name', NEW.project_name,
                'created_at', NEW.created_at
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_after_insert_log_draft
AFTER INSERT ON projects
FOR EACH ROW
WHEN (NEW.intake_status = 'draft')
EXECUTE FUNCTION trigger_log_project_draft_save();
```

#### Frontend Changes

**File**: `src/pages/ProjectsCreate.jsx`

Changes:
1. Show toast notification after any action: "Action recorded in audit log"
2. No additional UI changes needed (logging is server-side)

**Deliverables**:
- ✅ Audit log table created/verified
- ✅ Audit logging function created
- ✅ All RPC functions updated to log actions
- ✅ Trigger added to log draft saves
- ✅ Frontend shows confirmation message
- ✅ Manual testing completed

---

### PHASE 6 - Polish and Integration Hooks (Optional)

**Objective**: Prepare for future integrations (stage gate checks, document register).

#### Database Changes (SQL Migration)
**File**: `SQL/v157_project_integration_hooks.sql`

```sql
-- Create stage_gate_checks table (placeholder for future integration)
CREATE TABLE IF NOT EXISTS stage_gate_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stage_name VARCHAR(200) NOT NULL,
    gate_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'passed', 'failed'
    checked_at TIMESTAMP,
    checked_by UUID REFERENCES users(id),
    gate_criteria JSONB,
    gate_results JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

CREATE INDEX idx_stage_gate_checks_project_id ON stage_gate_checks(project_id);
CREATE INDEX idx_stage_gate_checks_gate_status ON stage_gate_checks(gate_status);

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('stage_gate_checks', 'Stage gate check records for project lifecycle', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- Create function to initialise stage gates on authorisation (optional, behind feature flag)
CREATE OR REPLACE FUNCTION initialise_project_stage_gates(p_project_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_project RECORD;
BEGIN
    SELECT * INTO v_project
    FROM projects
    WHERE id = p_project_id
    AND is_deleted = FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Project not found');
    END IF;

    -- Insert pre-project stage gate check
    INSERT INTO stage_gate_checks (
        project_id,
        stage_name,
        gate_status,
        gate_criteria,
        created_by
    )
    VALUES (
        p_project_id,
        'Pre-Project (Authorisation)',
        'pending',
        jsonb_build_object(
            'executive_assigned', TRUE,
            'business_case_approved', TRUE,
            'funding_secured', TRUE
        ),
        auth.uid()
    );

    RETURN jsonb_build_object('success', true, 'message', 'Stage gates initialised');
END;
$$;

COMMENT ON FUNCTION initialise_project_stage_gates IS 'Initialises stage gate checks for a newly authorised project';
```

#### Frontend Changes

**File**: `src/pages/ProjectsCreate.jsx`

Changes:
1. After successful authorisation, optionally call `initialise_project_stage_gates()` (behind feature flag)
2. No UI changes needed for this phase

**Deliverables**:
- ✅ Stage gate checks table created (placeholder)
- ✅ Initialisation function created
- ✅ Feature flag support added
- ✅ Manual testing completed

---

## Out of Scope (Explicitly Excluded)

The following are **NOT** part of this implementation:

❌ Task creation or management
❌ PM execution workflow or assignment
❌ Executive dashboard approvals UI
❌ File uploads or document content editing
❌ Document authoring features
❌ Team member assignment (beyond board members)
❌ Resource allocation or scheduling
❌ Budget tracking or forecasting
❌ Risk register management
❌ Benefits realisation tracking

---

## Testing Strategy

### Manual Testing Per Phase

Each phase must be manually tested before proceeding:

1. **Phase 1**: Verify draft projects can be saved and created
2. **Phase 2**: Verify all new fields capture data correctly
3. **Phase 3**: Verify readiness validation identifies missing fields
4. **Phase 4**: Verify only PMO Admin can authorise projects
5. **Phase 5**: Verify audit log records all actions
6. **Phase 6**: Verify stage gates initialised (if feature enabled)

### Integration Testing

After all phases complete:
- Create a draft project with minimal fields → should save
- Fill all governance fields → should save
- Validate readiness with missing fields → should fail
- Fill missing fields → validate readiness → should pass
- Authorise project as PMO Admin → should succeed
- Verify audit log contains all actions

---

## Rollback Strategy

Each phase is independent and can be rolled back:

1. **Database**: Keep SQL migration files numbered sequentially (v152, v153, etc.)
2. **Frontend**: Use feature flags or conditional rendering for new sections
3. **Git**: Create separate commits per phase for easy rollback

---

## Success Criteria

✅ All governance fields from PRD captured in database
✅ All governance fields displayed in UI with clear sections
✅ Draft → Authorised lifecycle fully functional
✅ Readiness validation accurately identifies missing fields
✅ Only PMO Admin can authorise projects (enforced via RLS)
✅ All PMO actions logged in audit log
✅ Zero breaking changes to existing functionality
✅ Existing projects unaffected by schema changes (new columns nullable)
✅ Manual testing completed for all phases

---

## Todo List (Implementation Tracking)

### Phase 1 - Draft → Authorised Lifecycle
- [x] Create SQL migration v152_project_intake_lifecycle.sql
- [ ] Run SQL migration in Supabase (User action required)
- [x] Update ProjectsCreate.jsx to include intake_status field
- [x] Add "Save Draft" button
- [x] Update projectService.js to accept new fields
- [ ] Manual testing: Save draft project (User action required)
- [ ] Manual testing: Create project (both buttons work) (User action required)
- [ ] Commit changes with message "feat(phase1): add draft-authorised lifecycle" (User action required)

### Phase 2 - Add Governance Fields
- [x] Create SQL migration v153_project_governance_fields.sql
- [ ] Run SQL migration in Supabase (User action required)
- [x] Create GovernanceSection.jsx component
- [x] Create BusinessJustificationSection.jsx component
- [x] Create LifecycleControlsSection.jsx component
- [x] Create FinancialControlsSection.jsx component
- [x] Create RiskComplexitySection.jsx component
- [x] Create DocumentGovernanceSection.jsx component
- [x] Update ProjectsCreate.jsx to include all new sections
- [x] Update formData state with all new fields
- [x] Update submit handler to include all new fields
- [ ] Manual testing: All fields capture data (User action required)
- [ ] Commit changes with message "feat(phase2): add governance fields" (User action required)

### Phase 3 - Readiness Validation
- [x] Create SQL migration v154_project_readiness_validation.sql
- [ ] Run SQL migration in Supabase (User action required)
- [x] Create ReadinessPanel.jsx component
- [x] Add "Validate Readiness" button to ProjectsCreate.jsx
- [x] Implement RPC call to validate_project_readiness
- [x] Display readiness results in ReadinessPanel
- [x] Updated submit handler to support draft save/update workflow
- [x] Added state management for project ID and readiness data
- [ ] Manual testing: Validation with missing fields (should fail) (User action required)
- [ ] Manual testing: Validation with all fields (should pass) (User action required)
- [ ] Commit changes with message "feat(phase3): add readiness validation" (User action required)

### Phase 4 - Enforce Authorisation
- [x] Create SQL migration v155_project_authorisation.sql
- [ ] Run SQL migration in Supabase (User action required)
- [x] Created AuthorisationActions component with buttons and modals
- [x] Add "Authorise Project" button (conditional on readiness pass)
- [x] Add "Reject Project" button with reason modal
- [x] Add "Suspend Project" button with reason modal
- [x] Implement RPC calls for all authorisation actions (authorise, reject, suspend)
- [x] Add success/error handling with visual feedback
- [x] Enforce PMO Admin only access to authorisation actions
- [ ] Manual testing: Authorise as PMO Admin (should succeed) (User action required)
- [ ] Manual testing: Authorise as non-PMO Admin (should fail) (User action required)
- [ ] Commit changes with message "feat(phase4): add authorisation enforcement" (User action required)

### Phase 5 - Audit Logging
- [ ] Create SQL migration v156_project_audit_logging.sql
- [ ] Run SQL migration in Supabase
- [ ] Verify audit_log table exists
- [ ] Update all RPC functions to log actions
- [ ] Add trigger to log draft saves
- [ ] Add success message in UI
- [ ] Manual testing: Verify audit log records all actions
- [ ] Commit changes with message "feat(phase5): add audit logging"

### Phase 6 - Integration Hooks (Optional)
- [ ] Create SQL migration v157_project_integration_hooks.sql
- [ ] Run SQL migration in Supabase
- [ ] Add stage_gate_checks table
- [ ] Add initialisation function
- [ ] Add feature flag for stage gate initialisation
- [ ] Manual testing: Verify stage gates initialised (if enabled)
- [ ] Commit changes with message "feat(phase6): add integration hooks"

### Final Review
- [ ] Integration testing: Full end-to-end flow
- [ ] Code review: Check for code quality
- [ ] Documentation: Update user guides
- [ ] Create summary document in Documentation folder
- [ ] Final commit with message "docs: PMO project creation governance upgrade complete"

---

## Review Section

### Phase 1 & 2 Summary (Completed Previously)
- Added draft → authorised lifecycle fields
- Created governance section components
- Added all governance fields to database and UI

### Phase 3 Summary (Completed: 2026-01-12)

#### Changes Made
- Created readiness validation system that checks if a project meets all authorisation criteria
- Implemented draft save/update workflow - users can now save drafts and stay on the page to validate readiness
- Added ReadinessPanel component with visual feedback (green pass/red fail with detailed issue list)
- Integrated RPC function call to Supabase for server-side validation

#### Files Modified
1. **src/pages/ProjectsCreate.jsx**
   - Added readiness validation state (`createdProjectId`, `readinessData`, `isValidatingReadiness`)
   - Added `handleValidateReadiness()` function to call RPC validation
   - Updated `handleSubmit()` to support both insert and update operations
   - Modified "Save Draft" button to stay on page instead of navigating away
   - Added ReadinessPanel display when project is saved as draft
   - Button text changes dynamically: "Save Draft" → "Update Draft" after first save

#### Files Created
1. **SQL/v154_project_readiness_validation.sql**
   - Added readiness tracking fields to projects table
   - Created `validate_project_readiness()` RPC function
   - Function validates 18 mandatory fields and conditional requirements
   - Returns pass/fail status with detailed issue list

2. **src/components/project/ReadinessPanel.jsx**
   - Visual panel showing readiness status (pass/fail)
   - Displays validation issues in numbered list
   - Shows "Validate Readiness" button (or "Re-validate" after first check)
   - Handles loading states with spinner
   - Theme-aware (dark/light mode support)

#### Testing Results
- Pending user manual testing:
  1. Save project as draft with minimal fields
  2. Click "Validate Readiness" - should fail with issue list
  3. Fill in missing fields
  4. Click "Update Draft" to save changes
  5. Click "Re-validate" - should pass
  6. Verify readiness panel shows green checkmark

#### Known Issues
- None at this stage

### Phase 4 Summary (Completed: 2026-01-12)

#### Changes Made
- Created authorisation enforcement system with three PMO Admin actions: Authorise, Reject, and Suspend
- Implemented comprehensive validation checks before authorisation (must pass readiness)
- Added modal dialogs for Reject and Suspend actions requiring reason input
- Enforced PMO Admin role requirement at both database (RLS) and UI levels

#### Files Modified
1. **src/pages/ProjectsCreate.jsx**
   - Added authorisation state management (`intakeStatus`, `isProcessingAuthorisation`)
   - Added three action handlers: `handleAuthoriseProject()`, `handleRejectProject()`, `handleSuspendProject()`
   - Integrated AuthorisationActions component display
   - Added success/error message displays for authorisation actions

#### Files Created
1. **SQL/v155_project_authorisation.sql**
   - Created `authorise_project()` RPC function - validates readiness before authorisation
   - Created `reject_project()` RPC function - requires reason, prevents rejecting authorised projects
   - Created `suspend_project()` RPC function - requires reason, can suspend any status
   - Added RLS policy "PMO Admin can update project intake status" for security
   - All functions check PMO Admin role before allowing action

2. **src/components/project/AuthorisationActions.jsx**
   - Reusable component for displaying authorisation action buttons
   - Conditional button enabling based on readiness status
   - Modal dialogs for Reject and Suspend with validation
   - Status display panels for authorised/rejected/suspended projects
   - Only visible to PMO Admin users

#### Testing Results
- Pending user manual testing:
  1. As PMO Admin, save draft project and validate readiness (must pass)
  2. Click "Authorise Project" - should succeed and update intake_status
  3. Try to reject already authorised project - should fail with error message
  4. As PMO Admin, reject a draft project with reason - should succeed
  5. As non-PMO Admin user, authorisation buttons should not be visible
  6. Verify RLS prevents non-PMO Admin from calling RPC functions directly

#### Known Issues
- None at this stage

#### Future Enhancements
- Phase 5: Add comprehensive audit logging for all authorisation actions
- Phase 6: Add stage gate initialisation hooks

---

## Approval

**Status**: ⏳ Awaiting User Approval

Please review this plan and confirm approval before I proceed with implementation.

---

**End of Plan Document**
