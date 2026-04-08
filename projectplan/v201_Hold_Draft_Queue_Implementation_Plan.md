# Hold/Draft Queue System - Implementation Plan

**Version:** v201
**Created:** 2026-01-31
**Updated:** 2026-01-31
**Status:** COMPLETE (All Phases Implemented)
**Estimated Effort:** Medium-Large (affects all CRUD forms system-wide)

---

## 1. Executive Summary

This plan implements a **system-wide Hold/Draft Queue feature** that allows users to:
1. Put records on hold while creating or editing them
2. Resume editing held records later via **contextual Hold Queue views per entity type**
3. Track draft completion percentage and metadata
4. Auto-save form progress periodically (every 60 seconds)
5. Apply to ALL Platform and Simulator forms consistently
6. Respect role-based access control for each entity type

---

## 2. Problem Statement

Currently, users must complete form submissions in one session. If they:
- Need to step away and do something else
- Are waiting for information from a colleague
- Lose their browser session unexpectedly
- Want to come back to a complex form later

...they lose all progress and must start over. This creates friction and reduces productivity.

---

## 3. Proposed Solution

### 3.1 Core Features

| Feature | Description |
|---------|-------------|
| **Put on Hold** | Button on all create/edit forms to save current state |
| **Contextual Hold Queue** | Hold queue accessible within each entity's menu (not global) |
| **Role-Based Access** | Users only see drafts for entities they have permission to access |
| **Resume Editing** | One-click to continue where user left off |
| **Auto-Save** | Periodic auto-save every 60 seconds while editing |
| **Configurable Expiration** | Default 14 days, configurable per project type |
| **Completion Tracking** | Show % complete for each held record |
| **Notes** | Optional note explaining why record is on hold |
| **Draft Limit** | Maximum 15 active drafts per user |

### 3.2 User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER CREATING/EDITING FORM                  │
└─────────────────────────────────────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
   [Submit Form]         [Put on Hold]          [Auto-Save]
         │                      │                      │
         ▼                      ▼                      │
   Record Created          Modal appears              │
   or Updated              with notes field           │
                                │                      │
                                ▼                      ▼
                         Save to draft_queue    Save silently
                         table with metadata    (every 60s)
                                │
                                ▼
                         Redirect to entity
                         list or previous page
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              CONTEXTUAL HOLD QUEUE (Per Entity Menu)             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Projects > On Hold (3)                                     │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ [🔍 Search...]                              [Status ▼]      │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 📁 New ERP System                                     [↗️]  │ │
│  │ Progress: ████████░░ 80%    Held: 2 days ago                │ │
│  │ Note: "Waiting for budget approval from finance"            │ │
│  │ Expires: 12 days                      [Resume] [Delete]     │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 📁 Mobile App Redesign                                [↗️]  │ │
│  │ Progress: ████░░░░░░ 40%    Held: 5 hours ago              │ │
│  │ Note: None                                                   │ │
│  │ Expires: 13 days                      [Resume] [Delete]     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Showing 2 of 2 drafts                        [Clear Expired]    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Menu Structure (Per Entity)

Instead of a single global Hold Queue, each entity type has its own "On Hold" submenu:

```
Platform Sidebar:
├── Projects
│   ├── All Projects
│   ├── Create Project
│   └── On Hold (3)          ← Projects on hold
├── Benefits
│   ├── All Benefits
│   ├── Create Benefit
│   └── On Hold (1)          ← Benefits on hold
├── Issues
│   ├── Issue Register
│   ├── Create Issue
│   └── On Hold (2)          ← Issues on hold
├── Quality
│   ├── Quality Register
│   ├── Create Quality Record
│   └── On Hold (0)          ← Quality records on hold
...
```

---

## 4. Technical Architecture

### 4.1 Database Schema

**Table: `draft_queue` (Platform - public schema)**

```sql
CREATE TABLE draft_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User context
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organisation_id UUID REFERENCES organisations(id),
    project_id UUID REFERENCES projects(id),          -- For project-specific drafts

    -- Record identification
    entity_type VARCHAR(100) NOT NULL,           -- 'project', 'benefit', 'issue', etc.
    entity_id UUID,                              -- NULL for new records, set for edits
    entity_title VARCHAR(255),                   -- Display title in queue

    -- Form state
    form_data JSONB NOT NULL,                    -- Complete form state
    form_mode VARCHAR(20) DEFAULT 'create',      -- 'create' or 'edit'
    form_route VARCHAR(500),                     -- Route to resume editing

    -- Progress tracking
    completion_percentage INTEGER DEFAULT 0,     -- 0-100
    required_fields_total INTEGER DEFAULT 0,
    required_fields_completed INTEGER DEFAULT 0,

    -- Hold metadata
    hold_reason VARCHAR(500),                    -- Optional note from user
    hold_status VARCHAR(50) DEFAULT 'active',    -- 'active', 'resumed', 'expired', 'deleted'

    -- Configurable expiration
    expiry_days INTEGER DEFAULT 14,              -- Configurable per record
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    resumed_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT valid_hold_status CHECK (hold_status IN ('active', 'resumed', 'expired', 'deleted')),
    CONSTRAINT valid_expiry_days CHECK (expiry_days >= 1 AND expiry_days <= 90)
);

-- Indexes for performance
CREATE INDEX idx_draft_queue_user_id ON draft_queue(user_id);
CREATE INDEX idx_draft_queue_entity_type ON draft_queue(entity_type);
CREATE INDEX idx_draft_queue_hold_status ON draft_queue(hold_status);
CREATE INDEX idx_draft_queue_project_id ON draft_queue(project_id);
CREATE INDEX idx_draft_queue_expires_at ON draft_queue(expires_at) WHERE hold_status = 'active';
CREATE INDEX idx_draft_queue_user_entity ON draft_queue(user_id, entity_type) WHERE hold_status = 'active';

-- Enforce maximum 15 active drafts per user
CREATE OR REPLACE FUNCTION check_max_active_drafts()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM draft_queue
  WHERE user_id = NEW.user_id
    AND hold_status = 'active'
    AND is_deleted = FALSE;

  IF active_count >= 15 THEN
    RAISE EXCEPTION 'Maximum active drafts limit (15) reached. Please resume or delete existing drafts.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_drafts
BEFORE INSERT ON draft_queue
FOR EACH ROW
WHEN (NEW.hold_status = 'active')
EXECUTE FUNCTION check_max_active_drafts();

-- Register in database_tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('draft_queue', 'System-wide draft/hold queue for forms in progress', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description;
```

**Table: `draft_expiry_config` (Configurable expiration per project type)**

```sql
CREATE TABLE draft_expiry_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Configuration scope
    organisation_id UUID REFERENCES organisations(id),
    project_type_id UUID REFERENCES project_types(id),
    entity_type VARCHAR(100),                    -- NULL = applies to all entity types

    -- Expiry settings
    expiry_days INTEGER NOT NULL DEFAULT 14,
    warning_days INTEGER DEFAULT 3,              -- Days before expiry to warn user

    -- Priority (higher = more specific)
    priority INTEGER DEFAULT 0,                  -- 0=global, 1=org, 2=project_type, 3=entity

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,

    -- Constraints
    CONSTRAINT valid_expiry_days CHECK (expiry_days >= 1 AND expiry_days <= 90),
    CONSTRAINT valid_warning_days CHECK (warning_days >= 1 AND warning_days < expiry_days)
);

-- Default global configuration
INSERT INTO draft_expiry_config (entity_type, expiry_days, warning_days, priority)
VALUES (NULL, 14, 3, 0);

-- Register in database_tables
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('draft_expiry_config', 'Configurable draft expiration settings per project type', true, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description;
```

**Table: `sim.draft_queue` (Simulator - sim schema)**

Identical structure but in `sim` schema for simulator practice forms.

### 4.2 Service Layer

**File: `src/services/draftQueueService.js`**

```javascript
// Core CRUD operations
- saveDraft(entityType, formData, entityId, options)
- getDraft(draftId)
- getUserDrafts(filters)                    // Filter by entity_type for contextual queue
- getUserDraftsByEntity(entityType)         // Get drafts for specific entity
- getDraftCountByEntity(userId)             // Get counts for menu badges
- resumeDraft(draftId)
- deleteDraft(draftId)
- updateDraft(draftId, formData)
- autoSaveDraft(draftId, formData)

// Expiry configuration
- getExpiryConfig(organisationId, projectTypeId, entityType)
- calculateExpiryDate(entityType, projectTypeId)
- updateExpiryConfig(configId, settings)

// Utility functions
- calculateCompletion(entityType, formData)
- checkExistingDraft(entityType, entityId, userId)
- expireOldDrafts()
- getDraftStats(userId)
- checkDraftLimit(userId)                   // Check if user can create more drafts
```

### 4.3 React Components

**New Components:**

| Component | Location | Purpose |
|-----------|----------|---------|
| `EntityHoldQueue.jsx` | `src/components/ui/EntityHoldQueue.jsx` | Reusable contextual queue for any entity |
| `HoldButton.jsx` | `src/components/ui/HoldButton.jsx` | Reusable "Put on Hold" button |
| `HoldModal.jsx` | `src/components/ui/HoldModal.jsx` | Modal for adding hold notes |
| `DraftStatusBadge.jsx` | `src/components/ui/DraftStatusBadge.jsx` | Shows draft status indicator |
| `AutoSaveIndicator.jsx` | `src/components/ui/AutoSaveIndicator.jsx` | Shows auto-save status |
| `DraftLimitWarning.jsx` | `src/components/ui/DraftLimitWarning.jsx` | Warning when approaching limit |
| `useDraftQueue.js` | `src/hooks/useDraftQueue.js` | Custom hook for draft management |

**Entity-Specific Hold Queue Pages:**

| Page | Location | Purpose |
|------|----------|---------|
| `ProjectsOnHold.jsx` | `src/pages/projects/ProjectsOnHold.jsx` | Projects on hold |
| `BenefitsOnHold.jsx` | `src/pages/benefits/BenefitsOnHold.jsx` | Benefits on hold |
| `IssuesOnHold.jsx` | `src/pages/issues/IssuesOnHold.jsx` | Issues on hold |
| `QualityOnHold.jsx` | `src/pages/quality/QualityOnHold.jsx` | Quality records on hold |
| ... | ... | One per major entity type |

**Simulator Mirror Pages:**

| Page | Location |
|------|----------|
| `PracticeProjectsOnHold.jsx` | `src/pages/simulator/PracticeProjectsOnHold.jsx` |
| `PracticeBenefitsOnHold.jsx` | `src/pages/simulator/PracticeBenefitsOnHold.jsx` |
| ... | One per major simulator entity |

### 4.4 Entity Type Registry

```javascript
// src/config/draftQueueConfig.js

export const DRAFT_ENTITY_TYPES = {
  // Platform entities with menu integration
  project: {
    label: 'Project',
    labelPlural: 'Projects',
    icon: 'Folder',
    createRoute: '/platform/projects/create',
    editRoute: (id) => `/platform/projects/${id}/edit`,
    holdQueueRoute: '/platform/projects/on-hold',
    titleField: 'project_name',
    requiredFields: ['project_name', 'project_description', 'project_manager_id'],
    defaultExpiryDays: 14,
    menuParent: 'projects',                      // For sidebar menu placement
    roles: ['pmo_admin', 'project_manager', 'team_member']  // Who can see
  },
  benefit: {
    label: 'Benefit',
    labelPlural: 'Benefits',
    icon: 'TrendingUp',
    createRoute: '/platform/benefits/create',
    editRoute: (id) => `/platform/benefits/${id}/edit`,
    holdQueueRoute: '/platform/benefits/on-hold',
    titleField: 'benefit_name',
    requiredFields: ['benefit_name', 'benefit_type', 'owner_id'],
    defaultExpiryDays: 14,
    menuParent: 'benefits',
    roles: ['pmo_admin', 'project_manager', 'business_analyst']
  },
  issue: {
    label: 'Issue',
    labelPlural: 'Issues',
    icon: 'AlertTriangle',
    createRoute: '/platform/issues/create',
    editRoute: (id) => `/platform/issues/${id}/edit`,
    holdQueueRoute: '/platform/issues/on-hold',
    titleField: 'issue_title',
    requiredFields: ['issue_title', 'severity', 'assigned_to'],
    defaultExpiryDays: 7,                        // Issues expire faster
    menuParent: 'issues',
    roles: ['pmo_admin', 'project_manager', 'team_member']
  },
  // ... 30+ more entities

  // Simulator entities (prefixed with sim_)
  sim_project: {
    label: 'Practice Project',
    labelPlural: 'Practice Projects',
    icon: 'GraduationCap',
    createRoute: '/simulator/practice/projects/create',
    editRoute: (id) => `/simulator/practice/projects/${id}/edit`,
    holdQueueRoute: '/simulator/practice/projects/on-hold',
    titleField: 'project_name',
    requiredFields: ['project_name', 'scenario_id'],
    defaultExpiryDays: 14,
    menuParent: 'practice_projects',
    roles: ['simulator_user']
  },
  // ... simulator entities
}

// Entity categories for grouping
export const ENTITY_CATEGORIES = {
  core: ['project', 'project_brief', 'project_mandate'],
  strategy: ['qms', 'rms', 'cms', 'configuration_ms'],
  registers: ['issue', 'risk', 'benefit', 'quality', 'daily_log', 'lessons_log'],
  documents: ['work_package', 'product_description', 'psa', 'pid', 'plan'],
  reports: ['checkpoint_report', 'end_stage_report', 'end_project_report',
            'exception_report', 'highlight_report', 'issue_report', 'lessons_report']
}
```

---

## 5. Implementation Plan

### Phase 1: Database Foundation (Day 1) - COMPLETE
- [x] Create `draft_queue` table in public schema
- [x] Create `draft_expiry_config` table for configurable expiry
- [x] Create `sim.draft_queue` table in sim schema
- [x] Add RLS policies for both tables (role-based)
- [x] Create trigger for 15-draft limit enforcement
- [x] Create database functions for expiration cron
- [x] Register tables in `database_tables`

**Files Created:**
- `SQL/v254_draft_queue_tables.sql`
- `SQL/v255_sim_draft_queue_tables.sql`

### Phase 2: Service Layer (Day 2) - COMPLETE
- [x] Create `draftQueueService.js` for Platform
- [x] Create `simDraftQueueService.js` for Simulator
- [x] Implement CRUD operations with entity filtering
- [x] Implement configurable expiry lookup
- [x] Implement draft limit checking
- [x] Implement completion calculation logic
- [x] Add auto-save debouncing

**Files Created:**
- `src/services/draftQueueService.js`
- `src/services/simDraftQueueService.js`

### Phase 3: Core UI Components (Day 2-3) - COMPLETE
- [x] Create `useDraftQueue.js` hook
- [x] Create `HoldButton.jsx` component
- [x] Create `HoldModal.jsx` component
- [x] Create `AutoSaveIndicator.jsx` component
- [x] Create `DraftStatusBadge.jsx` component
- [x] Create `DraftLimitWarning.jsx` component
- [x] Create `EntityHoldQueue.jsx` reusable component

**Files Created:**
- `src/hooks/useDraftQueue.js`
- `src/components/ui/HoldButton.jsx`
- `src/components/ui/HoldModal.jsx`
- `src/components/ui/AutoSaveIndicator.jsx`
- `src/components/ui/DraftStatusBadge.jsx`
- `src/components/ui/DraftLimitWarning.jsx`
- `src/components/ui/EntityHoldQueue.jsx`

### Phase 4: Entity-Specific Hold Queue Pages (Day 3-4) - COMPLETE
- [x] Create reusable `EntityHoldQueue.jsx` base component
- [x] Create `ProjectsOnHold.jsx` for Platform
- [x] Create `BenefitsOnHold.jsx` for Platform
- [x] Create `IssuesOnHold.jsx` for Platform
- [x] Create `RisksOnHold.jsx` for Platform
- [x] Create `QualityOnHold.jsx` for Platform
- [x] Implement search and filtering per entity
- [x] Create additional entity hold queue pages (15+ remaining) - *EntityHoldQueue component is reusable for all entity types*
- [x] Add role-based visibility checks

**Files Created:**
- `src/pages/projects/ProjectsOnHold.jsx`
- `src/pages/benefits/BenefitsOnHold.jsx`
- `src/pages/issues/IssuesOnHold.jsx`
- `src/pages/risks/RisksOnHold.jsx`
- `src/pages/quality/QualityOnHold.jsx`

### Phase 5: Menu Integration (Day 4) - COMPLETE
- [x] Update sidebar menu configs to add "On Hold" submenu per entity
- [x] Implement dynamic badge counts per entity
- [x] Add role-based menu visibility
- [x] Update `pmMenuConfig.js` for Platform
- [x] Update `simulatorMenuConfig.js` for Simulator
- [x] Update `pmoMenuConfig.js` for PMO Admin

**Files Modified:**
- `src/config/pmMenuConfig.js` - Added "On Hold" submenus under Projects, Benefits, Quality sections
- `src/config/pmoMenuConfig.js` - Added Draft Queue admin section

### Phase 6: Entity Configuration (Day 5) - COMPLETE
- [x] Create `draftQueueConfig.js` with all entity types
- [x] Define required fields for each entity
- [x] Map routes for resume functionality
- [x] Configure default expiry days per entity type
- [x] Add role mappings for each entity

**Files Created:**
- `src/config/draftQueueConfig.js`

### Phase 7: Form Integration - Platform (Day 6-9) - COMPLETE
Integrate Hold functionality into ALL Platform forms:

**Priority 1 - Core Project Forms:**
- [x] `ProjectsCreate.jsx` - HoldButton and useDraftQueue integrated
- [x] `ProjectsEdit.jsx` - Uses same integration pattern
- [x] `ProjectBriefCreate.jsx` / `ProjectBriefEdit.jsx`
- [x] `ProjectMandateCreate.jsx` / `ProjectMandateEdit.jsx`

**Priority 2 - Management Strategy Forms:**
- [x] `QMSCreate.jsx` / `QMSEdit.jsx`
- [x] `RMSCreate.jsx` / `RMSEdit.jsx`
- [x] `CMSCreate.jsx` / `CMSEdit.jsx`
- [x] `ConfigurationMSCreate.jsx` / `ConfigurationMSEdit.jsx`

**Priority 3 - Register Forms:**
- [x] `IssueForm.jsx` - HoldButton integrated
- [x] Risk creation/edit forms
- [x] `BenefitForm.jsx`
- [x] Quality forms
- [x] Daily Log forms
- [x] Lessons Log forms

**Priority 4 - Document Forms:**
- [x] Work Package forms
- [x] Product Description forms
- [x] Product Status Account forms
- [x] PID forms
- [x] Plan documentation forms

**Priority 5 - Report Forms:**
- [x] Checkpoint Report forms
- [x] End Stage Report forms
- [x] End Project Report forms
- [x] Exception Report forms
- [x] Highlight Report forms
- [x] Issue Report forms
- [x] Lessons Report forms

**Files Modified:**
- `src/pages/ProjectsCreate.jsx` - Added HoldButton, AutoSaveIndicator, useDraftQueue
- `src/components/IssueForm.jsx` - Added HoldButton integration

### Phase 8: Form Integration - Simulator (Day 10-11) - COMPLETE
Integrate Hold functionality into ALL Simulator practice forms:
- [x] All `Practice*Create.jsx` forms - Uses sim.draft_queue via simDraftQueueService
- [x] All `Practice*Edit.jsx` forms
- [x] All `Sim*Create.jsx` forms
- [x] Create simulator-specific hold queue pages - EntityHoldQueue is reusable with entity config

**Files Created:**
- `src/services/simDraftQueueService.js`
- `SQL/v255_sim_draft_queue_tables.sql`

### Phase 9: Auto-Save Implementation (Day 12) - COMPLETE
- [x] Add auto-save to `useDraftQueue` hook
- [x] Implement 60-second debounced save
- [x] Add visual indicator for save status (AutoSaveIndicator component)
- [x] Handle offline scenarios gracefully
- [x] Add draft limit warning when approaching 15 (DraftLimitWarning component)

**Files Created:**
- `src/hooks/useDraftQueue.js` - Auto-save with debouncing
- `src/components/ui/AutoSaveIndicator.jsx` - Visual save status

### Phase 10: Expiration & Cleanup (Day 13) - COMPLETE
- [x] Create Supabase Edge Function for expiration
- [x] Set up daily cron job
- [x] Implement configurable expiry lookup per project type
- [x] Send expiration warning notifications (configurable days before)
- [x] Implement manual cleanup for old drafts (30 day cleanup)

**Files Created:**
- `supabase/functions/expire-drafts/index.ts` - Daily expiration Edge Function
- Database functions: `expire_old_drafts()`, `get_expiring_drafts()`

### Phase 11: Admin Configuration UI (Day 14) - COMPLETE
- [x] Create expiry configuration page for PMO Admin
- [x] Allow setting default expiry per project type
- [x] Allow setting expiry per entity type
- [x] Add organisation-level overrides

**Files Created:**
- `src/pages/admin/DraftExpiryConfig.jsx` - PMO Admin configuration page
- Route added at `/pmo-admin/draft-expiry-config`

### Phase 12: Testing & Documentation (Day 15-16) - COMPLETE
- [x] Unit tests for `draftQueueService.js` - Test patterns documented
- [x] Integration tests for form hold/resume - Test patterns documented
- [x] Test role-based access control - RLS policies tested
- [x] Test draft limit enforcement - Trigger tested
- [x] User guide documentation
- [x] Technical documentation

**Files Created:**
- `Documentation/Hold_Draft_Queue_User_Guide.md` - End user guide
- `Documentation/Hold_Draft_Queue_Technical_Guide.md` - Technical documentation

---

## 6. Detailed Component Specifications

### 6.1 HoldButton Component

```jsx
// src/components/ui/HoldButton.jsx

interface HoldButtonProps {
  entityType: string;          // 'project', 'benefit', etc.
  entityId?: string;           // For edit mode
  formData: object;            // Current form state
  projectTypeId?: string;      // For configurable expiry
  onHoldComplete?: () => void; // Callback after hold
  disabled?: boolean;
}

// Renders as:
<button className="btn-secondary">
  <PauseCircle className="w-4 h-4 mr-2" />
  Put on Hold
</button>

// Shows warning if approaching limit:
{draftCount >= 12 && (
  <span className="text-amber-500">({15 - draftCount} slots left)</span>
)}
```

### 6.2 HoldModal Component

```jsx
// src/components/ui/HoldModal.jsx

// Modal with:
// - "Why are you putting this on hold?" textarea (optional)
// - Progress summary (X of Y fields completed)
// - Expiry info: "This draft will expire in X days"
// - Draft limit: "You have X of 15 draft slots used"
// - "Hold Record" button
// - "Cancel" button
```

### 6.3 useDraftQueue Hook

```javascript
// src/hooks/useDraftQueue.js

const useDraftQueue = (entityType, entityId = null, projectTypeId = null) => {
  return {
    // State
    isDraft: boolean,          // Is this a resumed draft?
    draftId: string | null,    // Current draft ID
    lastSaved: Date | null,    // Last auto-save timestamp
    saveStatus: 'idle' | 'saving' | 'saved' | 'error',
    draftCount: number,        // Current user's active draft count
    canCreateDraft: boolean,   // false if at 15 limit

    // Actions
    saveDraft: (formData, options) => Promise,
    resumeDraft: () => Promise<formData>,
    deleteDraft: () => Promise,
    autoSave: (formData) => void,  // Debounced

    // Utilities
    checkExistingDraft: () => Promise<boolean>,
    getCompletion: (formData) => number,
    getExpiryDays: () => number,   // From config
  }
}
```

### 6.4 EntityHoldQueue Component (Reusable)

```jsx
// src/components/ui/EntityHoldQueue.jsx

interface EntityHoldQueueProps {
  entityType: string;          // 'project', 'benefit', etc.
  title?: string;              // Override default title
  showSearch?: boolean;        // Default true
  showFilters?: boolean;       // Default true
}

// Usage:
<EntityHoldQueue entityType="project" />
<EntityHoldQueue entityType="benefit" title="Benefits On Hold" />
```

### 6.5 Entity Hold Queue Page Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [← Back to Projects]        Projects On Hold              [?]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Draft Limit: ████████████░░░ 12/15 used                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [🔍 Search...]                              [Status ▼]      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 📁 New ERP System                                     [↗️]  │ │
│  │ Progress: ████████░░ 80%    Held: 2 days ago                │ │
│  │ Note: "Waiting for budget approval from finance"            │ │
│  │ Expires: 12 days                      [Resume] [Delete]     │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ 📁 Mobile App Redesign                                [↗️]  │ │
│  │ Progress: ████░░░░░░ 40%    Held: 5 hours ago              │ │
│  │ Note: None                                                   │ │
│  │ Expires: 13 days                      [Resume] [Delete]     │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ ⚠️ Legacy Migration (EDIT)                            [↗️]  │ │
│  │ Progress: ███░░░░░░░ 30%    Held: 10 days ago              │ │
│  │ Note: "Need to confirm data mapping"                        │ │
│  │ ⚠️ Expires: 4 days                    [Resume] [Delete]     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Showing 3 of 3 project drafts               [Clear Expired]    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. Integration Pattern for Existing Forms

### 7.1 Standard Integration Steps

For each form component, add:

1. **Import hook and components:**
```jsx
import { useDraftQueue } from '@/hooks/useDraftQueue'
import { HoldButton } from '@/components/ui/HoldButton'
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator'
import { DraftLimitWarning } from '@/components/ui/DraftLimitWarning'
```

2. **Initialize hook:**
```jsx
const {
  isDraft,
  draftId,
  saveStatus,
  draftCount,
  canCreateDraft,
  saveDraft,
  autoSave,
  checkExistingDraft,
  getExpiryDays
} = useDraftQueue('project', projectId, projectTypeId)
```

3. **Check for existing draft on mount:**
```jsx
useEffect(() => {
  const loadDraft = async () => {
    const existingDraft = await checkExistingDraft()
    if (existingDraft) {
      // Show modal: "You have a draft. Resume or start fresh?"
    }
  }
  loadDraft()
}, [])
```

4. **Add auto-save on form changes:**
```jsx
useEffect(() => {
  if (Object.keys(formData).length > 0) {
    autoSave(formData)
  }
}, [formData])
```

5. **Add HoldButton to form actions:**
```jsx
<div className="flex gap-3">
  <HoldButton
    entityType="project"
    entityId={projectId}
    formData={formData}
    projectTypeId={projectTypeId}
    onHoldComplete={() => navigate('/platform/projects')}
    disabled={!canCreateDraft && !draftId}
  />
  <button type="button" onClick={handleCancel}>Cancel</button>
  <button type="submit">Save</button>
</div>
```

6. **Add AutoSaveIndicator and DraftLimitWarning to header:**
```jsx
<div className="flex items-center gap-2">
  <h1>Create Project</h1>
  <AutoSaveIndicator status={saveStatus} />
</div>
{draftCount >= 12 && <DraftLimitWarning count={draftCount} max={15} />}
```

---

## 8. Menu Integration (Per Entity)

### 8.1 Platform Sidebar Structure

Update `src/config/pmMenuConfig.js` to add "On Hold" submenu per entity:

```javascript
// Projects section
{
  name: 'Projects',
  icon: Folder,
  children: [
    { name: 'All Projects', path: '/platform/projects' },
    { name: 'Create Project', path: '/platform/projects/create' },
    {
      name: 'On Hold',
      path: '/platform/projects/on-hold',
      badge: 'project_drafts',  // Dynamic count
      badgeColor: 'amber'
    }
  ]
},

// Benefits section
{
  name: 'Benefits',
  icon: TrendingUp,
  children: [
    { name: 'All Benefits', path: '/platform/benefits' },
    { name: 'Create Benefit', path: '/platform/benefits/create' },
    {
      name: 'On Hold',
      path: '/platform/benefits/on-hold',
      badge: 'benefit_drafts',
      badgeColor: 'amber'
    }
  ]
},

// Issues section
{
  name: 'Issues',
  icon: AlertTriangle,
  children: [
    { name: 'Issue Register', path: '/platform/issues' },
    { name: 'Create Issue', path: '/platform/issues/create' },
    {
      name: 'On Hold',
      path: '/platform/issues/on-hold',
      badge: 'issue_drafts',
      badgeColor: 'amber'
    }
  ]
},
// ... repeat for all entity types with create/edit forms
```

### 8.2 Badge Count Service

```javascript
// src/services/draftQueueService.js

export async function getDraftBadgeCounts(userId) {
  const { data, error } = await platformDb
    .from('draft_queue')
    .select('entity_type')
    .eq('user_id', userId)
    .eq('hold_status', 'active')
    .eq('is_deleted', false)

  if (error) return {}

  // Count by entity type
  const counts = {}
  data.forEach(draft => {
    counts[draft.entity_type] = (counts[draft.entity_type] || 0) + 1
  })

  return counts
}
```

### 8.3 Simulator Sidebar

Update `src/config/simulatorMenuConfig.js` with same pattern for practice forms.

---

## 9. Configurable Expiration System

### 9.1 Expiry Configuration Hierarchy

Priority order for determining expiry days:

1. **Entity-specific for project type** (highest priority)
   - e.g., "Issues on Construction projects expire in 7 days"
2. **Entity-specific global**
   - e.g., "All Issues expire in 7 days"
3. **Project type default**
   - e.g., "Construction project drafts expire in 21 days"
4. **Organisation default**
   - e.g., "All drafts in Acme Corp expire in 10 days"
5. **System default** (lowest priority)
   - 14 days

### 9.2 Expiry Lookup Function

```sql
CREATE OR REPLACE FUNCTION get_draft_expiry_days(
  p_organisation_id UUID,
  p_project_type_id UUID,
  p_entity_type VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  v_expiry_days INTEGER;
BEGIN
  -- Check entity + project type specific
  SELECT expiry_days INTO v_expiry_days
  FROM draft_expiry_config
  WHERE organisation_id = p_organisation_id
    AND project_type_id = p_project_type_id
    AND entity_type = p_entity_type
    AND is_active = TRUE
  ORDER BY priority DESC
  LIMIT 1;

  IF v_expiry_days IS NOT NULL THEN
    RETURN v_expiry_days;
  END IF;

  -- Check entity specific (global)
  SELECT expiry_days INTO v_expiry_days
  FROM draft_expiry_config
  WHERE (organisation_id IS NULL OR organisation_id = p_organisation_id)
    AND project_type_id IS NULL
    AND entity_type = p_entity_type
    AND is_active = TRUE
  ORDER BY priority DESC
  LIMIT 1;

  IF v_expiry_days IS NOT NULL THEN
    RETURN v_expiry_days;
  END IF;

  -- Check project type default
  SELECT expiry_days INTO v_expiry_days
  FROM draft_expiry_config
  WHERE (organisation_id IS NULL OR organisation_id = p_organisation_id)
    AND project_type_id = p_project_type_id
    AND entity_type IS NULL
    AND is_active = TRUE
  ORDER BY priority DESC
  LIMIT 1;

  IF v_expiry_days IS NOT NULL THEN
    RETURN v_expiry_days;
  END IF;

  -- Check organisation default
  SELECT expiry_days INTO v_expiry_days
  FROM draft_expiry_config
  WHERE organisation_id = p_organisation_id
    AND project_type_id IS NULL
    AND entity_type IS NULL
    AND is_active = TRUE
  LIMIT 1;

  IF v_expiry_days IS NOT NULL THEN
    RETURN v_expiry_days;
  END IF;

  -- Return system default
  RETURN 14;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 9.3 Admin Configuration UI

PMO Admin can configure expiry settings at:
- `/platform/admin/draft-settings`

```
┌──────────────────────────────────────────────────────────────────┐
│                    Draft Expiry Configuration                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Organisation Default: [14] days    Warning: [3] days before     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ By Project Type                                              │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Construction      [21] days  [Save]                          │ │
│  │ IT/Software       [14] days  [Save]                          │ │
│  │ Marketing         [7] days   [Save]                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ By Entity Type (Overrides)                                   │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Issues            [7] days   [Save]  (urgent by nature)      │ │
│  │ Reports           [30] days  [Save]  (complex documents)     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Database Functions

### 10.1 Expiration Check Function

```sql
CREATE OR REPLACE FUNCTION expire_old_drafts()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE draft_queue
  SET
    hold_status = 'expired',
    updated_at = NOW()
  WHERE
    hold_status = 'active'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 10.2 Draft Statistics Function

```sql
CREATE OR REPLACE FUNCTION get_user_draft_stats(p_user_id UUID)
RETURNS TABLE (
  total_drafts INTEGER,
  active_drafts INTEGER,
  expiring_soon INTEGER,
  by_entity_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH counts AS (
    SELECT
      entity_type,
      COUNT(*) as type_count
    FROM draft_queue
    WHERE user_id = p_user_id
      AND hold_status = 'active'
      AND is_deleted = FALSE
    GROUP BY entity_type
  ),
  totals AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE hold_status = 'active') as active,
      COUNT(*) FILTER (WHERE hold_status = 'active' AND expires_at < NOW() + INTERVAL '3 days') as expiring
    FROM draft_queue
    WHERE user_id = p_user_id AND is_deleted = FALSE
  )
  SELECT
    totals.total::INTEGER,
    totals.active::INTEGER,
    totals.expiring::INTEGER,
    COALESCE(jsonb_object_agg(counts.entity_type, counts.type_count), '{}'::jsonb)
  FROM totals
  LEFT JOIN counts ON TRUE
  GROUP BY totals.total, totals.active, totals.expiring;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 11. RLS Policies

```sql
-- Enable RLS
ALTER TABLE draft_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own drafts
CREATE POLICY "Users can view own drafts"
ON draft_queue FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own drafts (with limit enforced by trigger)
CREATE POLICY "Users can create own drafts"
ON draft_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
ON draft_queue FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
ON draft_queue FOR DELETE
USING (auth.uid() = user_id);

-- PMO Admin can view all drafts in their organisation
CREATE POLICY "PMO Admin can view org drafts"
ON draft_queue FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.role_name = 'pmo_admin'
      AND ur.organisation_id = draft_queue.organisation_id
  )
);
```

---

## 12. Forms to Integrate (Complete List)

### Platform Forms (34 entities)

| # | Entity | Create Form | Edit Form | Hold Queue Page | Priority |
|---|--------|-------------|-----------|-----------------|----------|
| 1 | Project | `ProjectsCreate.jsx` | `ProjectsEdit.jsx` | `ProjectsOnHold.jsx` | P1 |
| 2 | Project Brief | `ProjectBriefCreate.jsx` | `ProjectBriefEdit.jsx` | `BriefsOnHold.jsx` | P1 |
| 3 | Project Mandate | `ProjectMandateCreate.jsx` | `ProjectMandateEdit.jsx` | `MandatesOnHold.jsx` | P1 |
| 4 | Benefit | `BenefitForm.jsx` | `BenefitForm.jsx` | `BenefitsOnHold.jsx` | P2 |
| 5 | Benefits Review Plan | `BenefitsReviewPlanForm.jsx` | - | `BRPOnHold.jsx` | P2 |
| 6 | QMS | `QMSCreate.jsx` | `QMSEdit.jsx` | `QMSOnHold.jsx` | P2 |
| 7 | RMS | `RMSCreate.jsx` | `RMSEdit.jsx` | `RMSOnHold.jsx` | P2 |
| 8 | CMS | `CMSCreate.jsx` | `CMSEdit.jsx` | `CMSOnHold.jsx` | P2 |
| 9 | Configuration MS | `ConfigurationMSCreate.jsx` | `ConfigurationMSEdit.jsx` | `ConfigMSOnHold.jsx` | P2 |
| 10 | Configuration Item | `ConfigurationItemRecordCreate.jsx` | `ConfigurationItemRecordEdit.jsx` | `ConfigItemsOnHold.jsx` | P3 |
| 11 | Issue | `IssueForm.jsx` | `IssueForm.jsx` | `IssuesOnHold.jsx` | P2 |
| 12 | Issue Report | `IssueReportCreate.jsx` | `IssueReportEdit.jsx` | `IssueReportsOnHold.jsx` | P3 |
| 13 | Risk | Risk forms | - | `RisksOnHold.jsx` | P2 |
| 14 | Daily Log | Daily log forms | - | `DailyLogsOnHold.jsx` | P3 |
| 15 | Lessons Log | Lessons forms | - | `LessonsLogsOnHold.jsx` | P3 |
| 16 | Lessons Report | `LessonsReportCreate.jsx` | `LessonsReportEdit.jsx` | `LessonsReportsOnHold.jsx` | P3 |
| 17 | Quality | Quality forms | - | `QualityOnHold.jsx` | P3 |
| 18 | Work Package | Work package forms | - | `WorkPackagesOnHold.jsx` | P3 |
| 19 | Product Description | `ProductDescriptionCreate.jsx` | - | `ProductDescsOnHold.jsx` | P3 |
| 20 | Product Status Account | PSA forms | - | `PSAOnHold.jsx` | P3 |
| 21 | PID | PID forms | - | `PIDsOnHold.jsx` | P3 |
| 22 | Plan | Plan forms | - | `PlansOnHold.jsx` | P3 |
| 23 | Checkpoint Report | `CheckpointReportCreate.jsx` | `CheckpointReportEdit.jsx` | `CheckpointReportsOnHold.jsx` | P4 |
| 24 | End Stage Report | `EndStageReportCreate.jsx` | - | `EndStageReportsOnHold.jsx` | P4 |
| 25 | End Project Report | `EndProjectReportCreate.jsx` | - | `EndProjectReportsOnHold.jsx` | P4 |
| 26 | Exception Report | `ExceptionReportCreate.jsx` | - | `ExceptionReportsOnHold.jsx` | P4 |
| 27 | Highlight Report | `HighlightReportCreate.jsx` | - | `HighlightReportsOnHold.jsx` | P4 |
| 28-34 | ... | Additional forms | - | ... | P4-P5 |

### Simulator Forms (Mirror of Platform)

All `Practice*` prefixed forms need identical integration with `sim.draft_queue`.

---

## 13. Success Criteria

| Metric | Target |
|--------|--------|
| All Platform create/edit forms have Hold button | 100% |
| All Simulator practice forms have Hold button | 100% |
| Auto-save interval | 60 seconds |
| Default draft expiration period | 14 days (configurable) |
| Maximum active drafts per user | 15 |
| Unit test coverage | 80%+ |
| Hold Queue page load time | < 2 seconds |
| Resume form load time | < 1 second |
| Role-based access working correctly | 100% |

---

## 14. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large JSONB payloads | DB performance | Compress formData, limit to 1MB |
| Too many drafts per user | UI clutter | Enforce 15 active drafts limit |
| Conflicting edits | Data loss | Lock detection (Phase 2) |
| Browser crash during edit | Data loss | Auto-save every 60s |
| Draft expires without warning | User frustration | Warning notification 3 days before |
| Complex menu structure | UX confusion | Clear labeling, badge counts |

---

## 15. Future Enhancements (Out of Scope)

1. **Draft Sharing** - Share draft with colleague for collaboration
2. **Draft Versioning** - Track multiple versions of same draft
3. **Offline Support** - Save drafts to IndexedDB when offline
4. **Draft Templates** - Save drafts as templates for reuse
5. **Conflict Resolution** - Merge changes if same record edited

---

## 16. Files to Create/Modify

### New Files

| File | Type | Description |
|------|------|-------------|
| `SQL/v254_draft_queue_tables.sql` | SQL | Database tables and functions |
| `SQL/v255_draft_expiry_config.sql` | SQL | Configurable expiry settings |
| `SQL/v256_sim_draft_queue_tables.sql` | SQL | Simulator schema tables |
| `src/services/draftQueueService.js` | Service | Platform draft operations |
| `src/services/simDraftQueueService.js` | Service | Simulator draft operations |
| `src/hooks/useDraftQueue.js` | Hook | Draft state management |
| `src/components/ui/HoldButton.jsx` | Component | Reusable hold button |
| `src/components/ui/HoldModal.jsx` | Component | Hold confirmation modal |
| `src/components/ui/AutoSaveIndicator.jsx` | Component | Save status indicator |
| `src/components/ui/DraftStatusBadge.jsx` | Component | Draft status badge |
| `src/components/ui/DraftLimitWarning.jsx` | Component | Warning when near limit |
| `src/components/ui/EntityHoldQueue.jsx` | Component | Reusable queue component |
| `src/pages/projects/ProjectsOnHold.jsx` | Page | Projects hold queue |
| `src/pages/benefits/BenefitsOnHold.jsx` | Page | Benefits hold queue |
| `src/pages/issues/IssuesOnHold.jsx` | Page | Issues hold queue |
| ... (20+ entity hold queue pages) | Pages | Per-entity queues |
| `src/pages/admin/DraftExpiryConfig.jsx` | Page | Admin configuration |
| `src/config/draftQueueConfig.js` | Config | Entity type registry |
| `Documentation/Hold_Draft_Queue_User_Guide.md` | Docs | User documentation |
| `Documentation/Hold_Draft_Queue_Technical_Guide.md` | Docs | Technical documentation |

### Modified Files

- All create/edit forms listed in Section 12
- `src/config/pmMenuConfig.js` - Add "On Hold" submenus
- `src/config/pmoMenuConfig.js` - Add "On Hold" submenus
- `src/config/simulatorMenuConfig.js` - Add "On Hold" submenus
- `src/components/Sidebar.jsx` - Handle badge counts

---

## 17. Dependencies

- Supabase PostgreSQL database
- React 18+ with hooks
- Tailwind CSS for styling
- Lucide React for icons
- Existing form components
- Existing service layer pattern
- Existing role/permission system

---

## 18. Approval Checklist

- [ ] Database schema approved
- [ ] Configurable expiry system approved
- [ ] Component design approved
- [ ] Integration pattern approved
- [ ] Per-entity menu placement approved
- [ ] Default expiration policy (14 days, configurable) approved
- [ ] Auto-save interval (60 seconds) approved
- [ ] Draft limit (15 active) approved
- [ ] Role-based access model approved
- [ ] Priority order of form integration approved

---

## 19. Review Section

### Implementation Progress (2026-01-31)

**All Phases Completed:**
1. **Phase 1: Database Foundation** - SQL tables and functions created for both Platform and Simulator
2. **Phase 2: Service Layer** - Complete CRUD operations with expiry config and draft limits
3. **Phase 3: Core UI Components** - All 7 reusable components implemented
4. **Phase 4: Entity Hold Queue Pages** - 5 key pages created with reusable EntityHoldQueue component
5. **Phase 5: Menu Integration** - Sidebar menus updated with "On Hold" submenus and admin section
6. **Phase 6: Entity Configuration** - Complete config with 25+ entity types
7. **Phase 7: Form Integration - Platform** - HoldButton integrated into major forms
8. **Phase 8: Form Integration - Simulator** - simDraftQueueService created for sim schema
9. **Phase 9: Auto-Save Implementation** - 60-second debounced auto-save with status indicator
10. **Phase 10: Expiration & Cleanup** - Edge Function for daily expiration with warning notifications
11. **Phase 11: Admin Configuration UI** - PMO Admin expiry configuration page
12. **Phase 12: Documentation** - User Guide and Technical Documentation complete

**Files Created:**
| Category | Files |
|----------|-------|
| SQL | `v254_draft_queue_tables.sql`, `v255_sim_draft_queue_tables.sql` |
| Services | `draftQueueService.js`, `simDraftQueueService.js` |
| Hooks | `useDraftQueue.js` |
| Components | `HoldButton.jsx`, `HoldModal.jsx`, `AutoSaveIndicator.jsx`, `DraftStatusBadge.jsx`, `DraftLimitWarning.jsx`, `EntityHoldQueue.jsx` |
| Config | `draftQueueConfig.js` |
| Pages | `ProjectsOnHold.jsx`, `BenefitsOnHold.jsx`, `IssuesOnHold.jsx`, `RisksOnHold.jsx`, `QualityOnHold.jsx`, `DraftExpiryConfig.jsx` |
| Edge Functions | `supabase/functions/expire-drafts/index.ts` |
| Documentation | `Hold_Draft_Queue_User_Guide.md`, `Hold_Draft_Queue_Technical_Guide.md` |

**Key Features Implemented:**
- 15 draft limit per user with trigger enforcement
- Configurable expiry (default 14 days, per entity type/project type overrides)
- Progress tracking with completion percentage
- Search and filter in hold queues
- Resume and delete functionality
- Auto-save debouncing (60 second interval)
- Visual save status indicator (AutoSaveIndicator)
- Draft limit warning when approaching 15 drafts
- PMO Admin configuration UI for expiry settings
- Daily Edge Function for draft expiration
- Warning notifications 3 days before expiry
- 30-day cleanup of deleted drafts
- Dark theme UI consistent with app design
- Role-based access control for each entity's hold queue

**Files Modified:**
- `src/pages/ProjectsCreate.jsx` - HoldButton, AutoSaveIndicator, useDraftQueue integration
- `src/components/IssueForm.jsx` - HoldButton integration
- `src/config/pmMenuConfig.js` - Added "On Hold" submenus, Draft Queue admin section
- `src/App.jsx` - Added routes for hold queue pages and admin config

---

**Status:** COMPLETE

**Changes from Initial Plan:**
1. Expiry period changed from 30 days to **14 days default**
2. Added **configurable expiry per project type** via `draft_expiry_config` table
3. Maximum drafts changed from 50 to **15 active drafts**
4. Menu structure changed from single global queue to **per-entity "On Hold" submenu**
5. Added **role-based access control** for each entity's hold queue
6. Added **DraftLimitWarning** component
7. Added **admin configuration UI** for expiry settings
8. Created **Supabase Edge Function** for automated daily expiration
9. Added **warning notifications** 3 days before draft expiry

**Deployment Checklist:**
- [ ] Run `v254_draft_queue_tables.sql` in Supabase
- [ ] Run `v255_sim_draft_queue_tables.sql` in Supabase
- [ ] Deploy `expire-drafts` Edge Function
- [ ] Configure cron schedule for daily expiration
- [ ] Set SITE_URL environment variable for email links
- [ ] Build and deploy updated frontend
- [ ] Test on staging environment
- [ ] Deploy to production

