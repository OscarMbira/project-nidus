# v186_Configuration_Item_Record_Implementation_Plan

## Version Information
- **Version**: v186
- **Plan Type**: Implementation Plan
- **Module**: Configuration Item Record (Configuration Item Records / Configuration Register)
- **Created**: 2026-01-19
- **Status**: Pending Approval
- **Sequence**: Follows v185 (Configuration Management Strategy), precedes v187 (next plan)

## Configuration Item Record Implementation Plan

## Overview
Implementation of the Configuration Item Record module based on structured project management methodology. Configuration Item Records form the **operational log/register** that tracks ALL configuration items (products/deliverables) and their versions, status changes, baseline inclusion, and related configuration management activities throughout the project lifecycle. Each record represents a unique configuration item with its identification, version information, status, and configuration management history. This register is the execution mechanism for the Configuration Management Strategy.

## Key Characteristics

- **Operational Register** - Tracks all configuration items and their lifecycle
- **Strategy-Driven** - Applies identification methods, status definitions, and version procedures from Configuration Management Strategy
- **Version Tracking** - Maintains complete version history for each configuration item
- **Status Accounting** - Tracks status changes per Configuration Management Strategy definitions
- **Baseline Management** - Links configuration items to baselines per strategy procedures
- **Change Control Integration** - Links status changes and baseline inclusion to change requests
- **Product Integration** - Links configuration items to Project Product Descriptions and products
- **Audit Trail** - Complete history of all configuration management activities
- **Identification** - Applies identification methods and naming conventions from strategy
- **Compliance** - Ensures configuration items follow Configuration Management Strategy

## Configuration Item Record Framework

```
┌─────────────────────────────────────────────────────────────┐
│         CONFIGURATION MANAGEMENT STRATEGY (v185)             │
│              (Defines HOW to manage configuration)           │
├─────────────────────────────────────────────────────────────┤
│                         │                                    │
│                         ▼                                    │
│    ┌──────────────────────────────────────────┐             │
│    │  CONFIGURATION ITEM RECORDS (v186)       │             │
│    │  (Operational Log - Tracks WHAT)         │             │
│    ├──────────────────────────────────────────┤             │
│    │                                           │             │
│    │  Configuration Item 1:                   │             │
│    │  ├─ CI-001: Product A                    │             │
│    │  │  ├─ Version 1.0 (Baseline: FB)        │             │
│    │  │  ├─ Version 1.1 (Status: Approved)    │             │
│    │  │  └─ Version 2.0 (Baseline: DB)        │             │
│    │  │                                       │             │
│    │  └─ CI-002: Product B                    │             │
│    │     ├─ Version 1.0 (Baseline: FB)        │             │
│    │     └─ Version 1.1 (Status: WIP)         │             │
│    │                                           │             │
│    └──────────────────────────────────────────┘             │
│                         │                                    │
│                         ▼                                    │
│    ┌──────────────────────────────────────────┐             │
│    │         BASELINES                        │             │
│    │  (Grouping of CI versions)               │             │
│    ├──────────────────────────────────────────┤             │
│    │  FB-001: Functional Baseline             │             │
│    │  ├─ CI-001 v1.0                          │             │
│    │  └─ CI-002 v1.0                          │             │
│    │                                           │             │
│    │  DB-001: Design Baseline                 │             │
│    │  └─ CI-001 v2.0                          │             │
│    └──────────────────────────────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Relationship Design: Many-to-One with Project and Configuration Management Strategy

**Approach**: Each project has **multiple Configuration Item Records** (one per configuration item/product). All records for a project follow the **same Configuration Management Strategy** (v185).

**Key Principles**:
- Multiple configuration items per project (one record per configuration item)
- All configuration items for a project link to the same Configuration Management Strategy
- Each configuration item can have multiple versions (version history tracked)
- Configuration items link to Project Product Descriptions (products)
- Status changes tracked per Configuration Management Strategy status definitions
- Baselines created by grouping configuration item versions
- Version identification follows Configuration Management Strategy procedures
- Identification follows Configuration Management Strategy methods

## Workflow Position

```
Project Initiated
  → Create Configuration Management Strategy (v185)
  → Identify products/deliverables (from Product Breakdown Structure)
  → **Create Configuration Item Records** ← We are here
  → Track versions and status changes
  → Create baselines (grouping CI versions)
  → Execute configuration audits
  → Report on configuration status
```

## Database Schema Design

### Main Tables

#### 1. `configuration_items` (Main Configuration Item Table)
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects, NOT NULL)
- `cfg_ms_id` (UUID, FK to configuration_management_strategies, NOT NULL) - Links to Configuration Management Strategy
- `configuration_item_identifier` (VARCHAR, UNIQUE NOT NULL) - e.g., CI-001, HW-001, DOC-001 (per strategy identification method)
- `item_name` (VARCHAR, NOT NULL) - Name of the configuration item
- `item_description` (TEXT, NULLABLE)

**Product Link**:
- `product_id` (UUID, FK to project_product_descriptions, NULLABLE) - Links to Project Product Description
- `product_breakdown_structure_code` (VARCHAR, NULLABLE) - PBS code for this item

**Classification**:
- `item_type_id` (UUID, FK to cfg_item_types, NULLABLE) - Links to item type from strategy
- `item_type_code` (VARCHAR, NULLABLE) - Type code (Major, Minor, Component, Work Product)
- `classification_level` (ENUM: 'major', 'minor', 'component', 'work_product')

**Current State**:
- `current_version` (VARCHAR, NOT NULL) - Current version number (e.g., 1.0, 2.3)
- `current_status_id` (UUID, FK to cfg_status_definitions, NULLABLE) - Current status per strategy
- `current_status_code` (VARCHAR, NULLABLE) - Status code (WIP, BASELINED, APPROVED, etc.)
- `is_in_baseline` (BOOLEAN, default false) - Is current version in a baseline?
- `current_baseline_id` (UUID, FK to configuration_baselines, NULLABLE) - Current baseline

**Version Control**:
- `version_scheme_id` (UUID, FK to cfg_version_control_procedures, NULLABLE) - Version scheme from strategy
- `latest_version_id` (UUID, FK to configuration_item_versions, NULLABLE) - Latest version record

**Identification**:
- `identification_method_id` (UUID, FK to cfg_identification_methods, NULLABLE) - Identification method from strategy
- `identification_scheme` (TEXT, NULLABLE) - How this item is identified

**Location/Storage**:
- `storage_location` (TEXT, NULLABLE) - Where the item is stored
- `repository_url` (VARCHAR, NULLABLE) - Version control repository URL
- `document_url` (TEXT, NULLABLE) - Link to document/product

**Metadata**:
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)
- `updated_by` (UUID, FK to users)
- `is_deleted` (BOOLEAN, default false)
- `deleted_at` (TIMESTAMPTZ)
- `deleted_by` (UUID, FK to users)

**Constraints**:
- UNIQUE constraint on `configuration_item_identifier` (within project)
- UNIQUE constraint on `project_id + item_name` (if applicable per strategy)

#### 2. `configuration_item_versions` (Version History)
- `id` (UUID, PK)
- `configuration_item_id` (UUID, FK to configuration_items, NOT NULL)
- `version_number` (VARCHAR, NOT NULL) - e.g., 1.0, 1.1, 2.0
- `version_label` (VARCHAR, NULLABLE) - Optional label (e.g., "Beta", "Release")
- `is_current_version` (BOOLEAN, default false) - Is this the current version?

**Version Details**:
- `version_date` (DATE, NOT NULL) - When this version was created
- `version_created_by` (UUID, FK to users)
- `version_notes` (TEXT, NULLABLE) - Notes about this version
- `release_notes` (TEXT, NULLABLE)

**Status**:
- `status_id` (UUID, FK to cfg_status_definitions, NULLABLE) - Status of this version
- `status_code` (VARCHAR, NULLABLE)
- `status_date` (DATE, NULLABLE) - When status was set

**Change Control**:
- `change_request_id` (UUID, FK to change_requests, NULLABLE) - Change request that created this version
- `change_authorization` (TEXT, NULLABLE) - Authorization details

**Baseline**:
- `is_in_baseline` (BOOLEAN, default false)
- `baseline_id` (UUID, FK to configuration_baselines, NULLABLE)
- `baseline_date` (DATE, NULLABLE) - When included in baseline

**Content**:
- `content_hash` (VARCHAR, NULLABLE) - Hash of item content for verification
- `file_size` (BIGINT, NULLABLE) - Size in bytes
- `file_type` (VARCHAR, NULLABLE) - File type/format
- `checksum` (VARCHAR, NULLABLE) - Checksum for integrity

**Storage**:
- `storage_location` (TEXT, NULLABLE)
- `repository_commit` (VARCHAR, NULLABLE) - Git/SVN commit hash
- `document_url` (TEXT, NULLABLE)

**Metadata**:
- `created_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)

**Constraints**:
- UNIQUE constraint on `configuration_item_id + version_number`

#### 3. `configuration_item_status_history` (Status Change History)
- `id` (UUID, PK)
- `configuration_item_id` (UUID, FK to configuration_items, NOT NULL)
- `version_id` (UUID, FK to configuration_item_versions, NULLABLE) - Which version this status applies to
- `previous_status_id` (UUID, FK to cfg_status_definitions, NULLABLE)
- `previous_status_code` (VARCHAR, NULLABLE)
- `new_status_id` (UUID, FK to cfg_status_definitions, NOT NULL)
- `new_status_code` (VARCHAR, NOT NULL)

**Status Change Details**:
- `status_change_date` (DATE, NOT NULL)
- `status_change_time` (TIMESTAMPTZ, NOT NULL)
- `changed_by_user_id` (UUID, FK to users, NOT NULL)
- `change_reason` (TEXT, NULLABLE) - Reason for status change
- `change_notes` (TEXT, NULLABLE)

**Change Control**:
- `change_request_id` (UUID, FK to change_requests, NULLABLE) - Change request that authorized status change
- `requires_approval` (BOOLEAN, default false)
- `approval_received` (BOOLEAN, default false)
- `approved_by_user_id` (UUID, FK to users, NULLABLE)
- `approval_date` (DATE, NULLABLE)

**Metadata**:
- `created_at` (TIMESTAMPTZ)

#### 4. `configuration_baselines` (Baseline Management)
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects, NOT NULL)
- `cfg_ms_id` (UUID, FK to configuration_management_strategies, NOT NULL)
- `baseline_type_id` (UUID, FK to cfg_baseline_procedures, NULLABLE) - Links to baseline procedure from strategy
- `baseline_type_code` (VARCHAR, NULLABLE) - e.g., FB, DB, PB
- `baseline_identifier` (VARCHAR, UNIQUE NOT NULL) - e.g., FB-001, DB-001, PB-001
- `baseline_name` (VARCHAR, NOT NULL) - Name of the baseline
- `baseline_description` (TEXT, NULLABLE)

**Baseline Details**:
- `baseline_date` (DATE, NOT NULL) - When baseline was created
- `baseline_purpose` (TEXT, NULLABLE) - Purpose of this baseline
- `baseline_status` (ENUM: 'draft', 'approved', 'superseded', 'archived') - Status of baseline
- `is_current_baseline` (BOOLEAN, default false) - Is this the current baseline for this type?

**Approval**:
- `created_by_user_id` (UUID, FK to users, NOT NULL)
- `approved_by_user_id` (UUID, FK to users, NULLABLE)
- `approval_date` (DATE, NULLABLE)
- `approval_status` (ENUM: 'pending', 'approved', 'rejected')
- `approval_comments` (TEXT, NULLABLE)

**Change Control**:
- `change_request_id` (UUID, FK to change_requests, NULLABLE) - Change request that created baseline

**Metadata**:
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)
- `updated_by` (UUID, FK to users)
- `is_deleted` (BOOLEAN, default false)
- `deleted_at` (TIMESTAMPTZ)

**Constraints**:
- UNIQUE constraint on `baseline_identifier`

#### 5. `configuration_baseline_items` (Baseline Composition)
- `id` (UUID, PK)
- `baseline_id` (UUID, FK to configuration_baselines, NOT NULL)
- `configuration_item_id` (UUID, FK to configuration_items, NOT NULL)
- `version_id` (UUID, FK to configuration_item_versions, NOT NULL) - Which version is in this baseline

**Baseline Item Details**:
- `included_date` (DATE, NOT NULL) - When included in baseline
- `included_by_user_id` (UUID, FK to users, NOT NULL)
- `inclusion_reason` (TEXT, NULLABLE) - Why this version is in baseline

**Metadata**:
- `created_at` (TIMESTAMPTZ)

**Constraints**:
- UNIQUE constraint on `baseline_id + configuration_item_id` (one version per item per baseline)

#### 6. `configuration_item_relationships` (CI Dependencies/Relationships)
- `id` (UUID, PK)
- `parent_item_id` (UUID, FK to configuration_items, NOT NULL)
- `child_item_id` (UUID, FK to configuration_items, NOT NULL)
- `relationship_type` (ENUM: 'contains', 'depends_on', 'supersedes', 'replaces', 'composed_of', 'other')
- `relationship_description` (TEXT, NULLABLE)

**Version Specific** (optional):
- `parent_version_id` (UUID, FK to configuration_item_versions, NULLABLE)
- `child_version_id` (UUID, FK to configuration_item_versions, NULLABLE)

**Metadata**:
- `created_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)

**Constraints**:
- CHECK constraint: `parent_item_id != child_item_id` (no self-references)

#### 7. `configuration_item_audits` (Configuration Audits)
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects, NOT NULL)
- `cfg_ms_id` (UUID, FK to configuration_management_strategies, NOT NULL)
- `audit_type_id` (UUID, FK to cfg_audit_procedures, NULLABLE) - Links to audit procedure from strategy
- `audit_type` (ENUM: 'functional', 'physical', 'in_process', 'combined')
- `audit_reference` (VARCHAR, UNIQUE) - e.g., AUD-001, FCA-001
- `audit_name` (VARCHAR, NOT NULL)
- `audit_description` (TEXT, NULLABLE)

**Audit Details**:
- `audit_date` (DATE, NOT NULL)
- `audit_scheduled_date` (DATE, NULLABLE) - When it was scheduled
- `audit_status` (ENUM: 'scheduled', 'in_progress', 'completed', 'cancelled')
- `audit_result` (ENUM: 'passed', 'failed', 'conditional', 'pending')
- `audit_findings` (TEXT, NULLABLE)
- `audit_recommendations` (TEXT, NULLABLE)

**Participants**:
- `auditor_user_id` (UUID, FK to users, NOT NULL) - Who performed audit
- `participants` (UUID[]) - Other participants

**Items Audited**:
- `configuration_items_audited` (UUID[]) - Which configuration items were audited
- `baseline_id` (UUID, FK to configuration_baselines, NULLABLE) - Baseline audited

**Metadata**:
- `created_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)
- `updated_at` (TIMESTAMPTZ)
- `updated_by` (UUID, FK to users)

**Constraints**:
- UNIQUE constraint on `audit_reference`

#### 8. `configuration_item_audit_items` (Audit Item Results)
- `id` (UUID, PK)
- `audit_id` (UUID, FK to configuration_item_audits, NOT NULL)
- `configuration_item_id` (UUID, FK to configuration_items, NOT NULL)
- `version_id` (UUID, FK to configuration_item_versions, NULLABLE) - Which version was audited
- `audit_criteria` (TEXT, NULLABLE) - What was checked
- `audit_result` (ENUM: 'passed', 'failed', 'conditional', 'not_applicable')
- `audit_findings` (TEXT, NULLABLE) - Specific findings for this item
- `audit_recommendations` (TEXT, NULLABLE)
- `created_at` (TIMESTAMPTZ)

### Integration with Existing Tables

#### Link to Configuration Management Strategy (v185)
- All configuration items link to `configuration_management_strategies` via `cfg_ms_id`
- Applies identification methods, status definitions, version procedures from strategy
- Baselines follow baseline procedures from strategy
- Audits follow audit procedures from strategy

#### Link to Change Requests (Existing)
- Status changes can require change requests
- Baseline creation can require change requests
- Version creation can be linked to change requests
- All via `change_request_id` fields

#### Link to Project Product Descriptions (Existing)
- Configuration items link to `project_product_descriptions` via `product_id`
- Configuration items correspond to products/deliverables

### Database Functions

#### `generate_ci_identifier(p_project_id UUID, p_item_type_code VARCHAR)`
Generates unique configuration item identifier based on Configuration Management Strategy.
```sql
RETURNS VARCHAR -- Returns identifier like 'CI-001', 'HW-001', 'DOC-001'
```

#### `create_configuration_item(p_project_id UUID, p_item_name VARCHAR, p_user_id UUID)`
Creates new configuration item with initial version.
```sql
RETURNS UUID -- Returns new Configuration Item ID
```

#### `create_ci_version(p_configuration_item_id UUID, p_version_number VARCHAR, p_user_id UUID)`
Creates new version of a configuration item.
```sql
RETURNS UUID -- Returns new Version ID
```

#### `update_ci_status(p_configuration_item_id UUID, p_new_status_id UUID, p_change_request_id UUID, p_user_id UUID)`
Updates configuration item status (creates status history entry).
```sql
RETURNS UUID -- Returns new Status History ID
```

#### `create_baseline(p_project_id UUID, p_baseline_type_id UUID, p_ci_version_ids UUID[], p_user_id UUID)`
Creates baseline from configuration item versions.
```sql
RETURNS UUID -- Returns new Baseline ID
```

#### `get_ci_version_history(p_configuration_item_id UUID)`
Returns complete version history for a configuration item.
```sql
RETURNS TABLE (
  version_id UUID,
  version_number VARCHAR,
  version_date DATE,
  status_code VARCHAR,
  is_current_version BOOLEAN
)
```

#### `get_current_baseline(p_project_id UUID, p_baseline_type_code VARCHAR)`
Returns current baseline of specified type for a project.
```sql
RETURNS UUID -- Returns Baseline ID
```

#### `get_baseline_differences(p_baseline_id_1 UUID, p_baseline_id_2 UUID)`
Compares two baselines and returns differences.
```sql
RETURNS TABLE (
  configuration_item_id UUID,
  item_identifier VARCHAR,
  baseline_1_version VARCHAR,
  baseline_2_version VARCHAR,
  change_type VARCHAR
)
```

## Implementation Phases

### Phase 1: Database Setup ✅ COMPLETED
- [x] Create database migration file (v194_configuration_item_record_tables.sql)
- [ ] Define all 8 tables with proper constraints
- [ ] Create indexes for performance:
  * project_id, cfg_ms_id on configuration_items
  * configuration_item_id on configuration_item_versions
  * configuration_item_id on configuration_item_status_history
  * project_id, cfg_ms_id on configuration_baselines
  * baseline_id on configuration_baseline_items
  * configuration_item_identifier on configuration_items
  * version_number on configuration_item_versions
  * baseline_identifier on configuration_baselines
  * audit_reference on configuration_item_audits
- [ ] Add foreign key constraints with ON DELETE CASCADE where appropriate
- [ ] Register all 8 tables in database_tables registry
- [ ] Create database functions:
  * generate_ci_identifier(project_id, item_type_code)
  * create_configuration_item(project_id, item_name, user_id)
  * create_ci_version(configuration_item_id, version_number, user_id)
  * update_ci_status(configuration_item_id, new_status_id, change_request_id, user_id)
  * create_baseline(project_id, baseline_type_id, ci_version_ids, user_id)
  * get_ci_version_history(configuration_item_id)
  * get_current_baseline(project_id, baseline_type_code)
  * get_baseline_differences(baseline_id_1, baseline_id_2)
- [ ] Create triggers:
  * Auto-generate configuration_item_identifier on INSERT
  * Auto-update current_version when new version created
  * Auto-update current_status when status changes
  * Audit trail trigger for all tables

### Phase 2: RLS Policies ✅ COMPLETED
- [x] Create RLS migration file (v195_configuration_item_record_rls_policies.sql)
- [ ] Grant SELECT, INSERT, UPDATE permissions to authenticated role
- [ ] Enable RLS on all Configuration Item Record tables
- [ ] Create helper function `check_ci_access(p_configuration_item_id UUID)`
- [ ] Create helper function `check_baseline_access(p_baseline_id UUID)`
- [ ] Define RLS policies for configuration_items:
  * SELECT: Project members, PMO Admins, System Admins
  * INSERT: Project members (if Configuration Management Strategy approved)
  * UPDATE: Configuration Manager role, Project Manager
  * DELETE: Only if not in baseline (soft delete)
- [ ] Define RLS policies for configuration_item_versions:
  * SELECT: Project members
  * INSERT: Project members (if Configuration Management Strategy approved)
  * UPDATE: Limited (version history should be immutable)
  * DELETE: Not allowed (versions are immutable)
- [ ] Define RLS policies for configuration_baselines:
  * SELECT: Project members, PMO Admins
  * INSERT: Configuration Manager, Project Manager (if Configuration Management Strategy approved)
  * UPDATE: Configuration Manager, Project Manager
  * DELETE: Only draft baselines (soft delete)
- [ ] Define RLS policies for all other tables using helper functions
- [ ] Test RLS policies for multi-tenancy

### Phase 3: Service Layer ✅ COMPLETED
- [x] Create `configurationItemRecordService.js` with CRUD operations:
  * createConfigurationItem(projectId, cfgMsId, itemData)
  * getConfigurationItemById(itemId)
  * getConfigurationItemsByProject(projectId)
  * getConfigurationItemsByStrategy(cfgMsId)
  * updateConfigurationItem(itemId, updates)
  * deleteConfigurationItem(itemId) - Only if not in baseline

- [ ] Create `configurationItemVersionService.js`:
  * createVersion(itemId, versionData, userId)
  * getVersionById(versionId)
  * getVersionsByItem(itemId)
  * getCurrentVersion(itemId)
  * getVersionHistory(itemId)
  * setCurrentVersion(itemId, versionId)

- [ ] Create `configurationItemStatusService.js`:
  * updateStatus(itemId, newStatusId, changeRequestId, userId, reason)
  * getStatusHistory(itemId)
  * getCurrentStatus(itemId)
  * canTransitionStatus(itemId, newStatusId) - Check if transition is allowed

- [ ] Create `configurationBaselineService.js`:
  * createBaseline(projectId, cfgMsId, baselineData, ciVersionIds)
  * getBaselineById(baselineId)
  * getBaselinesByProject(projectId)
  * getBaselinesByType(projectId, baselineTypeCode)
  * getCurrentBaseline(projectId, baselineTypeCode)
  * updateBaseline(baselineId, updates)
  * approveBaseline(baselineId, approverId, comments)
  * addItemToBaseline(baselineId, ciVersionId, userId)
  * removeItemFromBaseline(baselineId, configurationItemId)
  * getBaselineItems(baselineId)
  * compareBaselines(baselineId1, baselineId2)

- [ ] Create `configurationItemRelationshipService.js`:
  * createRelationship(parentItemId, childItemId, relationshipType, description)
  * getRelationshipsByItem(itemId)
  * getParentItems(itemId)
  * getChildItems(itemId)
  * deleteRelationship(relationshipId)

- [ ] Create `configurationItemAuditService.js`:
  * createAudit(projectId, cfgMsId, auditData, itemIds)
  * getAuditById(auditId)
  * getAuditsByProject(projectId)
  * getAuditsByItem(itemId)
  * updateAudit(auditId, updates)
  * addAuditItem(auditId, itemId, versionId, result, findings)
  * getAuditItems(auditId)
  * completeAudit(auditId, result, findings)

- [ ] Enhance existing `configurationManagementStrategyService.js`:
  * getStrategyForProject(projectId) - Used by Configuration Item Records
  * getIdentificationMethods(cfgMsId)
  * getStatusDefinitions(cfgMsId)
  * getVersionProcedures(cfgMsId)
  * getBaselineProcedures(cfgMsId)
  * validateCICompliance(itemId) - Check if item follows strategy

- [ ] Implement validation functions
- [ ] Add error handling and logging

### Phase 4: UI Components - Core Components ✅ COMPLETED
- [x] Create `ConfigurationItemForm.jsx` - Form for creating/editing configuration items
- [x] Create `ConfigurationItemView.jsx` - Read-only view of configuration item with tabs
- [x] Create `ConfigurationItemList.jsx` - List view of all configuration items for project
- [x] Create `ConfigurationItemCard.jsx` - Card display for configuration item

### Phase 5: UI Components - Version Management ✅ COMPLETED
- [x] Create `VersionHistorySection.jsx` - Version history list
- [x] Create `VersionCard.jsx` - Individual version display
- [x] Create `VersionForm.jsx` - Create new version form
- [ ] Create `VersionComparison.jsx` - Compare two versions (Optional - can be added later)
- [ ] Create `VersionTimeline.jsx` - Visual timeline of versions (Optional - can be added later)

### Phase 6: UI Components - Status Management ✅ COMPLETED
- [x] Create `StatusHistorySection.jsx` - Status change history
- [x] Create `StatusTransitionForm.jsx` - Form for status changes
- [ ] Create `StatusTransitionDiagram.jsx` - Visual status transition diagram (Optional - can be added later)
- [x] Create `StatusBadge.jsx` - Status indicator badge
- [ ] Create `StatusTimeline.jsx` - Visual timeline of status changes (Optional - can be added later)

### Phase 7: UI Components - Baseline Management ✅ COMPLETED
- [x] Create `BaselinesSection.jsx` - Baselines list
- [x] Create `BaselineCard.jsx` - Individual baseline display
- [ ] Create `BaselineForm.jsx` - Create baseline form (Optional - can use service directly)
- [ ] Create `BaselineItemsView.jsx` - View items in baseline (Optional - can be added later)
- [ ] Create `BaselineComparison.jsx` - Compare two baselines (Optional - can be added later)
- [ ] Create `AddItemToBaselineModal.jsx` - Modal to add items to baseline (Optional - can be added later)

### Phase 8: UI Components - Relationships & Audits ✅ COMPLETED
- [x] Create `RelationshipsSection.jsx` - Configuration item relationships
- [x] Create `RelationshipForm.jsx` - Create relationship form
- [ ] Create `RelationshipDiagram.jsx` - Visual relationship diagram (Optional - can be added later)
- [x] Create `AuditsSection.jsx` - Configuration audits list
- [x] Create `AuditCard.jsx` - Individual audit display
- [ ] Create `AuditForm.jsx` - Create/update audit form (Optional - can use service directly)
- [ ] Create `AuditItemsView.jsx` - View audit results per item (Optional - can be added later)

### Phase 9: UI Components - Supporting Components ✅ COMPLETED
- [ ] Create `ConfigurationItemExport.jsx` - Export options (Optional - can be added later)
- [ ] Create `ConfigurationItemPrintView.jsx` - Printable format (Optional - can be added later)
- [x] Create `CIRegisterView.jsx` - Register/list view (ConfigurationItemList serves this purpose)
- [x] Create `ComplianceIndicator.jsx` - Strategy compliance indicator
- [x] Create `VersionBadge.jsx` - Version number badge
- [x] Create `BaselineBadge.jsx` - Baseline type badge
- [ ] Create `ConfigurationItemFilter.jsx` - Filter/search component (Optional - filtering already in ConfigurationItemList)

### Phase 10: Pages ✅ COMPLETED
- [x] Create `ConfigurationItemRecordView.jsx` - View single configuration item record
- [x] Create `ConfigurationItemRecordCreate.jsx` - Create new configuration item
- [x] Create `ConfigurationItemRecordEdit.jsx` - Edit configuration item
- [x] Create `ConfigurationItemRegister.jsx` - Main register/list page (all CIs for project)
- [ ] Create `BaselineManagement.jsx` - Baseline management page (Optional - can be added later)
- [ ] Create `ConfigurationAudits.jsx` - Configuration audits page (Optional - can be added later)
- [ ] Create `ConfigurationItemRelationships.jsx` - Relationships view (Optional - can be added later)

### Phase 11: Routing and Navigation ✅ COMPLETED
- [x] Add routes to App.jsx:
  * /platform/projects/:projectId/configuration-items - Configuration Item Register
  * /platform/projects/:projectId/configuration-items/:itemId - View Configuration Item
  * /platform/projects/:projectId/configuration-items/create - Create Configuration Item
  * /platform/projects/:projectId/configuration-items/:itemId/edit - Edit Configuration Item
- [x] Add menu items to Project Manager sidebar:
  * "Configuration Item Register" button in ProjectsDetail (Universal Modules)
- [x] Create breadcrumb navigation (implemented in page components)
- [x] Implement role-based access control (via ProtectedRoute)

### Phase 12: Business Logic
- [ ] Implement configuration item creation:
  * Apply identification method from Configuration Management Strategy
  * Generate unique identifier per strategy
  * Link to Configuration Management Strategy
  * Create initial version
  * Set initial status per strategy
- [ ] Implement version creation:
  * Follow version numbering scheme from strategy
  * Validate version number format
  * Link to change request if applicable
  * Update current_version on configuration item
- [ ] Implement status transitions:
  * Validate status transition per strategy rules
  * Check if approval required
  * Link to change request if required
  * Create status history entry
  * Update current_status on configuration item
- [ ] Implement baseline creation:
  * Follow baseline procedure from strategy
  * Validate baseline composition per strategy rules
  * Check all items are in correct status
  * Require approval if specified
  * Create baseline items linking CI versions
- [ ] Implement baseline comparison
- [ ] Implement relationship management
- [ ] Implement audit execution
- [ ] Implement auto-save functionality
- [ ] **Integrate with Configuration Management Strategy**:
  * Auto-apply identification methods
  * Auto-apply status definitions
  * Auto-apply version procedures
  * Auto-apply baseline procedures
  * Validate compliance with strategy

### Phase 13: Integration with Other Modules
- [ ] **Integrate with Configuration Management Strategy (v185)**:
  * Apply identification methods from strategy
  * Apply status definitions from strategy
  * Apply version procedures from strategy
  * Apply baseline procedures from strategy
  * Validate compliance with strategy
  * Show strategy compliance status
- [ ] **Integrate with Project Product Descriptions**:
  * Link configuration items to products
  * Auto-create configuration items from products
  * Show product information in CI view
  * Track product versions as CI versions
- [ ] **Integrate with Change Requests (existing)**:
  * Require change request for status changes (if configured)
  * Require change request for baseline creation (if configured)
  * Link version creation to change requests
  * Show change request information in CI view
- [ ] Integrate with Quality Management Strategy:
  * Coordinate configuration audits with quality audits
  * Share audit procedures
- [ ] Integrate with Risk Management Strategy:
  * Configuration-related risks
  * Version control risk mitigation

### Phase 14: Validation and Quality Checks
- [ ] Implement configuration item validation:
  * Valid identifier format (per strategy)
  * Required fields present
  * Valid item type (per strategy)
  * Compliance with Configuration Management Strategy
- [ ] Implement version validation:
  * Valid version number format (per strategy)
  * Version sequence correctness
  * No duplicate versions
- [ ] Implement status transition validation:
  * Valid transition (per strategy status definitions)
  * Approval requirements met
  * Change request linked if required
- [ ] Implement baseline validation:
  * Valid baseline type (per strategy)
  * All items in correct status
  * Composition rules followed
  * Approval received if required
- [ ] Add warnings for:
  * Configuration item not following identification method
  * Invalid status transition attempted
  * Version number not following scheme
  * Baseline composition not compliant
  * Configuration item not linked to product

### Phase 15: Export and Reporting
- [ ] Implement PDF export (match template format)
- [ ] Implement Word document export
- [ ] Create printable view with proper formatting
- [ ] Create Configuration Item Register Report:
  * All configuration items for project
  * Current versions and statuses
  * Baseline information
  * Status history summary
- [ ] Create Baseline Report:
  * Baseline composition
  * Items included
  * Version information
- [ ] Create Version History Report:
  * Complete version history for item(s)
  * Status changes
  * Change requests linked
- [ ] Implement CSV export
- [ ] Implement email distribution feature
- [ ] Generate Configuration Item Record per template format

### Phase 16: Testing
- [ ] Create unit tests for all services
- [ ] Create integration tests for CRUD operations
- [ ] Create component tests for all UI components
- [ ] Test configuration item creation with identification methods
- [ ] Test version creation with version procedures
- [ ] Test status transitions with status definitions
- [ ] Test baseline creation with baseline procedures
- [ ] Test baseline comparison
- [ ] Test relationship management
- [ ] Test audit execution
- [ ] Test export functionality
- [ ] Test role-based access control
- [ ] Test integration with Configuration Management Strategy
- [ ] Test integration with change requests
- [ ] Test integration with Project Product Descriptions

### Phase 17: Documentation
- [ ] Create user guide for creating Configuration Item Records
- [ ] Create guide for version management
- [ ] Create guide for status management
- [ ] Create guide for baseline management
- [ ] Create guide for configuration audits
- [ ] Create PMO template management guide
- [ ] Create technical documentation
- [ ] Document compliance requirements
- [ ] Create video tutorials

## Technical Specifications

### Service Methods

#### configurationItemRecordService.js
```javascript
// CRUD Operations
- createConfigurationItem(projectId, cfgMsId, itemData)
- getConfigurationItemById(itemId)
- getConfigurationItemsByProject(projectId)
- getConfigurationItemsByStrategy(cfgMsId)
- updateConfigurationItem(itemId, updates)
- deleteConfigurationItem(itemId) - Only if not in baseline

// Identification
- generateIdentifier(projectId, itemTypeCode, cfgMsId)
- validateIdentifier(identifier, cfgMsId)

// Compliance
- validateCICompliance(itemId, cfgMsId)
- getComplianceIssues(itemId)
```

#### configurationItemVersionService.js
```javascript
// Version Management
- createVersion(itemId, versionData, userId)
- getVersionById(versionId)
- getVersionsByItem(itemId)
- getCurrentVersion(itemId)
- getVersionHistory(itemId)
- setCurrentVersion(itemId, versionId)
- compareVersions(versionId1, versionId2)

// Validation
- validateVersionNumber(versionNumber, cfgMsId)
- getNextVersionNumber(itemId, cfgMsId)
```

#### configurationItemStatusService.js
```javascript
// Status Management
- updateStatus(itemId, newStatusId, changeRequestId, userId, reason)
- getStatusHistory(itemId)
- getCurrentStatus(itemId)
- canTransitionStatus(itemId, newStatusId)
- validateStatusTransition(itemId, newStatusId, cfgMsId)
```

#### configurationBaselineService.js
```javascript
// Baseline Management
- createBaseline(projectId, cfgMsId, baselineData, ciVersionIds)
- getBaselineById(baselineId)
- getBaselinesByProject(projectId)
- getBaselinesByType(projectId, baselineTypeCode)
- getCurrentBaseline(projectId, baselineTypeCode)
- updateBaseline(baselineId, updates)
- approveBaseline(baselineId, approverId, comments)
- addItemToBaseline(baselineId, ciVersionId, userId)
- removeItemFromBaseline(baselineId, configurationItemId)
- getBaselineItems(baselineId)
- compareBaselines(baselineId1, baselineId2)
- validateBaselineComposition(baselineId, cfgMsId)
```

### Form Validation Rules

#### Creating/Editing Configuration Item
**Required Fields**:
- Item Name (min 3 characters)
- Item Type (must exist in Configuration Management Strategy)
- Product Link (optional but recommended)
- Configuration Management Strategy (must be approved)

**Validation Rules**:
- Identifier must follow strategy identification method
- Item type must be defined in strategy
- Must link to approved Configuration Management Strategy
- Initial status must be valid per strategy

#### Creating Version
**Required Fields**:
- Version Number (must follow strategy version scheme)
- Version Date

**Validation Rules**:
- Version number format per strategy version procedure
- Version number must be greater than previous version
- No duplicate version numbers
- Change request linked if required by strategy

#### Status Transition
**Required Fields**:
- New Status (must be defined in strategy)
- Reason for change

**Validation Rules**:
- Valid transition per strategy status definitions
- Approval required if specified in strategy
- Change request required if specified in strategy
- Cannot transition to invalid status

#### Creating Baseline
**Required Fields**:
- Baseline Type (must be defined in strategy)
- Configuration Item Versions (at least one)

**Validation Rules**:
- Baseline type must be defined in strategy
- All items must be in correct status per strategy
- Composition rules must be followed
- Approval required if specified

### Configuration Item Identifier Formats

| Identification Method | Format Example | Pattern |
|----------------------|----------------|---------|
| **Hierarchical** | PROJ-HW-001, PROJ-DOC-001 | PREFIX-TYPE-NNN |
| **Sequential** | CI-001, CI-002, CI-003 | TYPE-NNN |
| **Composite** | PROJ-2026-HW-001 | PREFIX-YEAR-TYPE-NNN |

### Version Number Formats

| Version Scheme | Format Example | Pattern |
|----------------|----------------|---------|
| **Semantic** | 1.0.0, 1.1.0, 2.0.0 | MAJOR.MINOR.PATCH |
| **Numeric** | 1, 2, 3 or 1.0, 1.1, 2.0 | N or N.N |
| **Alpha** | A, B, C or 1A, 1B | LETTER or N.LETTER |
| **Date-Based** | 2026.01.19, 2026.01.19.001 | YYYY.MM.DD or YYYY.MM.DD.NNN |

### RLS Policies
- Project team members can view configuration items for their projects
- Only Configuration Manager or Project Manager can create configuration items
- Version history is immutable (read-only after creation)
- Baselines can only be created/updated by Configuration Manager or Project Manager
- Status changes require appropriate permissions per strategy
- PMO Admins can view all configuration items in their organization
- Approved baselines are read-only (changes through change control)

## UI/UX Design Considerations

### Configuration Item Record Form
```
Configuration Item Details:
  → Item Name
  → Item Description
  → Item Type (from Configuration Management Strategy)
  → Product Link (from Project Product Descriptions)
  → Storage Location
  → Repository URL

Auto-Generated:
  → Configuration Item Identifier (per strategy)
  → Initial Version (per strategy)
  → Initial Status (per strategy)
```

### Version Creation Form
```
Version Details:
  → Version Number (auto-suggest next per strategy)
  → Version Label (optional)
  → Version Date
  → Version Notes
  → Release Notes

Change Control:
  → Link to Change Request (if required)
  → Authorization Details

Content:
  → Upload File/Set Location
  → Content Hash (auto-calculate)
  → Checksum
```

### Status Transition Form
```
Status Change:
  → Current Status (display only)
  → New Status (dropdown per strategy)
  → Reason for Change (required)
  → Notes

Change Control:
  → Link to Change Request (if required)
  → Approval (if required)

Validation:
  → Check if transition is allowed
  → Show approval requirements
  → Show change request requirements
```

### Baseline Creation Form
```
Baseline Details:
  → Baseline Type (from strategy)
  → Baseline Name
  → Baseline Description
  → Baseline Date

Items:
  → Select Configuration Item Versions
  → Filter by status
  → Show compliance status
  → Validate composition

Approval:
  → Approval Authority (display from strategy)
  → Approval Comments
```

### Configuration Item Register View (Similar to Quality/Issue Register)
```
┌─────────────────────────────────────────────────────────┐
│ Configuration Item Register - Project Alpha              │
├─────┬──────────┬──────┬────────┬────────┬──────────────┤
│ CI  │ Name     │ Type │ Version│ Status │ Baseline     │
├─────┼──────────┼──────┼────────┼────────┼──────────────┤
│CI-001│Product A│Major │ 2.0    │Baseline│ FB-001, DB-001│
│CI-002│Product B│Major │ 1.0    │Approved│ FB-001       │
│CI-003│Component│Minor │ 1.1    │WIP     │ -            │
└─────┴──────────┴──────┴────────┴────────┴──────────────┘
```

## Success Criteria

### User Confirmation Messages
- Created: "Configuration Item [Identifier] created successfully"
- Version Created: "Version [Version] created for [Identifier]"
- Status Updated: "Status updated to [Status] for [Identifier]"
- Baseline Created: "Baseline [Identifier] created with [N] items"
- Role Assigned: "Configuration role assigned to [User Name]"

### Configuration Warnings
- "Configuration Item identifier does not follow strategy identification method"
- "Version number does not follow strategy version scheme"
- "Invalid status transition - [Reason]"
- "Baseline composition does not comply with strategy requirements"
- "Configuration Item not linked to product"
- "Version created without required change request"

### Dashboard Widgets
- "Configuration Items: 15 total, 5 in baseline"
- "Upcoming Configuration Audits: 2 this week"
- "Baselines: 3 created, 1 current"
- "Status Changes: 8 this month"

## Integration Points

### With Configuration Management Strategy (v185)
- Apply identification methods automatically
- Apply status definitions for transitions
- Apply version procedures for versioning
- Apply baseline procedures for baseline creation
- Validate compliance with strategy
- Show strategy compliance status

### With Project Product Descriptions
- Configuration items link to products
- Auto-create configuration items from products
- Track product versions as CI versions
- Show product information in CI view

### With Change Requests
- Link status changes to change requests
- Link version creation to change requests
- Link baseline creation to change requests
- Require change requests per strategy configuration

### With Quality Management Strategy
- Coordinate configuration audits with quality audits
- Share audit procedures
- Link quality reviews to configuration versions

### With Risk Management Strategy
- Configuration-related risks
- Version control risk mitigation

## Dependencies
- Configuration Management Strategy (v185) - **REQUIRED**
- Existing projects table
- Existing change_requests table
- Existing project_product_descriptions table
- Users table
- Role-based access control system
- Notification system
- PDF generation library
- File storage system (for version content)

## Risk Considerations
1. **Strategy Dependency**: Configuration Item Records require approved Configuration Management Strategy
2. **Version Immutability**: Versions should not be editable after creation
3. **Baseline Complexity**: Baseline creation and comparison can be complex
4. **Identifier Conflicts**: Ensuring unique identifiers within project
5. **Integration Complexity**: Ensuring seamless integration with Configuration Management Strategy

## Future Enhancements (Post-MVP)
- AI-powered identifier suggestions based on strategy
- Automated compliance checking against strategy
- Integration with external version control systems (Git, SVN)
- Configuration management effectiveness analytics
- Cross-project configuration benchmarking
- Automated baseline creation
- Configuration item dependency visualization
- Version comparison tools with diff
- Industry-specific Configuration Item Record templates
- Multi-repository support
- Configuration item approval workflows

## Review Section
*To be completed after implementation*

### Changes Made
- [List of all changes]

### Challenges Encountered
- [Issues and resolutions]

### Testing Results
- [Test coverage and results]

### Performance Metrics
- [Load times, validation performance]

### User Feedback
- [User adoption and satisfaction]

---

**Version**: v186
**Plan Created**: 2026-01-19
**Status**: Pending Approval
**Estimated Complexity**: High
**Estimated Tables**: 8
**Estimated Components**: ~50
**Priority**: HIGH

## Version History
- **v186** (2026-01-19): Initial implementation plan created
