# Project Brief Technical Documentation

## Overview

This document provides technical documentation for the Project Brief module, including architecture, database schema, API endpoints, and integration points.

## Table of Contents

1. [Architecture](#architecture)
2. [Database Schema](#database-schema)
3. [Service Layer](#service-layer)
4. [Components](#components)
5. [API Reference](#api-reference)
6. [Integration Points](#integration-points)
7. [Workflow](#workflow)

---

## Architecture

### Technology Stack

- **Frontend**: React 18.3.1
- **Backend**: Supabase (PostgreSQL)
- **Routing**: React Router DOM 6.30.2
- **State Management**: React Hooks
- **Styling**: Tailwind CSS

### Module Structure

```
src/
├── components/brief/          # Brief UI components
├── pages/brief/               # Brief page components
├── services/                  # Service layer
│   ├── projectBriefService.js
│   ├── briefObjectivesService.js
│   ├── briefProductService.js
│   ├── briefRolesService.js
│   ├── briefValidationService.js
│   ├── briefApprovalService.js
│   ├── briefTolerancesService.js
│   ├── briefReferencesService.js
│   ├── briefWordExportService.js
│   └── briefNotificationService.js
└── SQL/                       # Database migrations
    ├── v163_project_brief_tables.sql
    ├── v164_project_briefs_rls_policies.sql
    └── v165_pmo_admin_project_briefs_menu.sql
```

---

## Database Schema

### Core Tables

#### `project_briefs` (Main Table)

```sql
CREATE TABLE project_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  mandate_id UUID REFERENCES project_mandates(id),
  brief_reference VARCHAR(50) UNIQUE NOT NULL,
  version_number VARCHAR(20) DEFAULT '1.0',
  document_status VARCHAR(20) DEFAULT 'draft',
  -- Project Definition
  background TEXT,
  project_objectives TEXT,
  desired_outcomes TEXT,
  -- Scope
  project_scope TEXT,
  scope_exclusions TEXT,
  constraints TEXT,
  assumptions TEXT,
  -- Business Case
  outline_business_case_summary TEXT,
  business_option_selected VARCHAR(50),
  -- Products
  product_description TEXT,
  customer_quality_expectations TEXT,
  -- Approach
  project_approach_description TEXT,
  solution_type VARCHAR(50),
  delivery_approach VARCHAR(50),
  development_approach VARCHAR(50),
  -- Team
  team_structure_description TEXT,
  team_structure_url VARCHAR(500),
  -- Metadata
  created_date DATE DEFAULT CURRENT_DATE,
  approved_date DATE,
  author_id UUID REFERENCES users(id),
  owner_id UUID REFERENCES users(id),
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);
```

#### Related Tables

- `brief_objectives` - SMART objectives
- `brief_product_descriptions` - Product details
- `brief_role_descriptions` - Role definitions
- `brief_tolerances` - Time, cost, quality tolerances
- `brief_references` - Document references
- `brief_approvals` - Approval workflow
- `brief_revision_history` - Version history
- `brief_distribution` - Distribution list

### Database Functions

#### `generate_brief_reference()`

Generates unique brief reference in format: `PB-YYYY-NNNN`

```sql
CREATE OR REPLACE FUNCTION generate_brief_reference()
RETURNS VARCHAR(50) AS $$
-- Implementation
$$ LANGUAGE plpgsql;
```

#### `create_brief_from_mandate(mandate_id UUID, project_id UUID)`

Creates a brief auto-populated from mandate data.

#### `validate_smart_objectives(brief_id UUID)`

Validates all objectives against SMART criteria.

#### `check_brief_quality_criteria(brief_id UUID)`

Checks brief against quality criteria.

---

## Service Layer

### projectBriefService.js

Main CRUD operations for briefs.

```javascript
// Create brief
createBrief(projectId, briefData)

// Create from mandate
createBriefFromMandate(mandateId, projectId)

// Get brief
getBriefById(briefId)
getBriefByProject(projectId)

// Update brief
updateBrief(briefId, updates)

// Delete brief (soft)
deleteBrief(briefId)

// Check edit permissions
canEdit(briefId)
```

### briefValidationService.js

Validation and quality checks.

```javascript
// Validate SMART objectives
validateSMART(objective)
validateAllSMART(briefId)

// Check completeness
validateCompleteness(briefId)

// Quality criteria
validateQualityCriteria(briefId)

// Mandate alignment
checkMandateAlignment(briefId, mandateId)
```

### briefApprovalService.js

Approval workflow management.

```javascript
// Submit for approval
submitForApproval(briefId, approverIds, notes)

// Approve brief
approveBrief(briefId, approverId, comments)

// Reject brief
rejectBrief(briefId, approverId, reason)

// Request changes
requestChanges(briefId, approverId, changeRequest)

// Get approval status
getApprovalStatus(briefId)
getPendingApprovals()
```

---

## Components

### Page Components

#### ProjectBriefView.jsx

Read-only view of a brief.

**Props:**
- `briefId` (from route params)

**Features:**
- Display all brief sections
- Quality criteria checklist
- Mandate comparison view
- Approval status
- Revision history
- Distribution list
- Print/export options

#### ProjectBriefCreate.jsx

Create new brief.

**Props:**
- `projectId` (from route params)
- `mandateId` (optional, from location state)

**Features:**
- Form with all sections
- Create from mandate option
- Completion progress
- Quality criteria validation
- Draft saving

#### ProjectBriefEdit.jsx

Edit existing brief.

**Props:**
- `projectId` (from route params)

**Features:**
- Edit all sections
- Auto-save (3-second debounce)
- Completion progress
- Quality criteria checklist
- Permission checking

### Form Components

#### ProjectBriefForm.jsx

Main form container with tabs.

**Tabs:**
1. Metadata
2. Project Definition
3. Scope
4. Tolerances
5. Stakeholders
6. Interfaces
7. Business Case
8. Products
9. Quality
10. Approach
11. Team Structure
12. Role Descriptions
13. Lessons Learned
14. References

### Supporting Components

- `BriefHeader.jsx` - Document header
- `BriefStatusBadge.jsx` - Status indicator
- `BriefApprovals.jsx` - Approval workflow
- `BriefCompletionProgress.jsx` - Progress indicator
- `BriefRevisionHistory.jsx` - Version history
- `BriefDistribution.jsx` - Distribution list
- `BriefPrintView.jsx` - Print/export view
- `TeamStructureChart.jsx` - Org chart visualization
- `BriefWizard.jsx` - Step-by-step wizard
- `SMARTObjectiveChecker.jsx` - SMART validation
- `QualityCriteriaChecklist.jsx` - Quality checklist
- `MandateComparisonView.jsx` - Mandate alignment

---

## API Reference

### Routes

```
/platform/projects/:projectId/brief/create
/platform/projects/:projectId/brief/view
/platform/projects/:projectId/brief/edit
/platform/briefs/list
/platform/briefs/approvals
```

### Database Queries

All queries use Supabase client:

```javascript
import { supabase } from './supabaseClient'

// Example: Get brief
const { data, error } = await supabase
  .from('project_briefs')
  .select('*, project:projects(*), mandate:project_mandates(*)')
  .eq('id', briefId)
  .single()
```

---

## Integration Points

### Project Mandate Integration

- **Auto-population**: `createBriefFromMandate()` function
- **Linkage**: `mandate_id` foreign key
- **Comparison**: `checkMandateAlignment()` function
- **References**: Auto-creates mandate reference

### Lessons Learned Integration

- **Review Section**: `LessonsReviewSection` component
- **Marking Reviewed**: `lessons_learned_reviewed` checkbox
- **Summary**: `lessons_review_summary` field

### Project Approach Integration

- **Approach Selection**: `approach_selection_id` foreign key
- **Display**: Shows selected approach details
- **Validation**: Checks approach completeness

### Business Case Integration

- **Pre-requisite**: Brief must be approved
- **Linkage**: `business_cases.project_brief_id` foreign key
- **Auto-population**: Can populate business case from brief

---

## Workflow

### Brief Creation Workflow

```
1. User navigates to project
2. Clicks "Create Brief"
3. Option A: Create from Mandate
   - Auto-populates from mandate
   - User completes remaining sections
4. Option B: Create from Scratch
   - User fills all sections
5. User saves draft (auto-save enabled)
6. User reviews completion progress
7. User checks quality criteria
8. User submits for approval
9. Brief status: draft → under_review
```

### Approval Workflow

```
1. Brief submitted (status: under_review)
2. Notification sent to approvers
3. Approver reviews brief
4. Option A: Approve
   - Status: under_review → approved
   - Notification sent to author
   - Brief becomes read-only
5. Option B: Reject
   - Status: under_review → rejected
   - Notification sent with reason
   - Author can edit and resubmit
6. Option C: Request Changes
   - Status: under_review → draft
   - Notification sent with change request
   - Author edits and resubmits
```

### Version Control

- Each submission creates a new version
- Version history maintained in `brief_revision_history`
- Previous versions remain accessible
- Version number increments automatically

---

## Security

### Row Level Security (RLS)

All tables have RLS policies:

- **Select**: Users can view briefs for projects they're members of
- **Insert**: Project members can create briefs
- **Update**: Authors/owners can edit drafts; PMO Admins can update any
- **Delete**: Soft delete only; PMO Admins can delete

### Permissions

- **Project Members**: Can create/edit briefs for their projects
- **PMO Admins**: Full access to all briefs
- **Approvers**: Can approve/reject briefs
- **Viewers**: Read-only access

---

## Performance Considerations

### Optimization

- Lazy loading of components
- Pagination for lists
- Debounced auto-save (3 seconds)
- Cached role/product data
- Efficient database queries with proper indexes

### Indexes

```sql
CREATE INDEX idx_briefs_project_id ON project_briefs(project_id);
CREATE INDEX idx_briefs_mandate_id ON project_briefs(mandate_id);
CREATE INDEX idx_briefs_status ON project_briefs(document_status);
CREATE INDEX idx_briefs_reference ON project_briefs(brief_reference);
```

---

## Testing

### Unit Tests

- Service layer functions
- Validation logic
- Utility functions

### Integration Tests

- CRUD operations
- Approval workflow
- Mandate integration
- Export functionality

### Component Tests

- Form validation
- User interactions
- State management

---

## Future Enhancements

- AI-powered SMART objective generator
- Template library
- Collaborative editing
- Real-time notifications
- Advanced export formats
- Version comparison (diff view)

---

**Last Updated**: 2026-01-16
**Version**: 1.0
