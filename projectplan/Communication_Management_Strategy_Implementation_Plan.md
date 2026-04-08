# v184_Communication_Management_Strategy_Implementation_Plan

## Version Information
- **Version**: v184
- **Plan Type**: Implementation Plan
- **Module**: Communication Management Strategy
- **Created**: 2026-01-19
- **Status**: Pending Approval

## Communication Management Strategy Implementation Plan

## Overview
Implementation of the Communication Management Strategy module based on structured project management methodology. The Communication Management Strategy defines HOW communication will be managed in the project. It establishes the communication management procedures, channels, methods, roles, responsibilities, and timing for all communication activities. This document ensures effective stakeholder engagement through planned communication control and assurance activities.

## Key Characteristics

- **Strategic Document** - Defines the overall approach to communication management
- **Three Pillars** - Covers Communication Planning, Communication Control, and Communication Assurance
- **Stakeholder-Focused** - Ensures right stakeholders receive right information at right time
- **Channel Optimization** - Defines appropriate channels for different communication types
- **Procedure Definition** - Establishes communication management procedures
- **Tools & Techniques** - Specifies communication systems, tools, and preferred techniques
- **Records Management** - Defines communication records including Communication Register
- **Reporting Framework** - Specifies communication reports, timing, and recipients
- **Activity Scheduling** - Plans timing of formal communication activities (meetings, reports, presentations)

## Communication Management Framework

```
┌─────────────────────────────────────────────────────────────┐
│           COMMUNICATION MANAGEMENT STRATEGY                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │COMMUNICATION│  │COMMUNICATION│  │COMMUNICATION│         │
│  │   PLANNING  │  │   CONTROL   │  │  ASSURANCE  │         │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤         │
│  │• Objectives │  │• Execution  │  │• Audits     │         │
│  │• Audiences  │  │• Tracking   │  │• Compliance │         │
│  │• Messages   │  │• Delivery   │  │• Board Role │         │
│  │• Channels   │  │• Feedback   │  │• External   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                         │                                    │
│                         ▼                                    │
│              ┌─────────────────────┐                        │
│              │COMMUNICATION REGISTER│                       │
│              │ (Communication Records)│                     │
│              └─────────────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Communication Criteria for This Strategy

| Criterion | Description |
|-----------|-------------|
| **Clear Definition** | Strategy clearly defines ways stakeholder communication expectations will be met |
| **Sufficiency** | Defined ways are sufficient to achieve required stakeholder engagement |
| **Accessibility** | Communication responsibilities defined up to appropriate organizational level |
| **Customer Conformance** | Strategy conforms to customer's communication requirements |
| **Stakeholder Conformance** | Strategy conforms to stakeholder communication preferences |
| **Corporate Conformance** | Strategy conforms to corporate/programme communication policy |
| **Appropriate Channels** | Communication channels appropriate for message types and audiences |

## Relationship Design: One-to-One with Project

**Approach**: Each project has **exactly ONE Communication Management Strategy** that defines the communication management approach for the entire project lifecycle.

**Key Principles**:
- One strategy per project (UNIQUE constraint on project_id)
- Created during project initiation (part of PID)
- Derived from corporate communication policy and stakeholder expectations
- Links to Stakeholder Engagement Strategy (communication expectations)
- Must be approved before project proceeds
- Updated through change control if approach changes
- Guides all communication activities throughout project
- **Enhanced Integration**: Links to existing `communication_plans` (execution) and `stakeholder_communications` (log/records)

## Workflow Position

```
Project Initiated
  → Review corporate/programme communication policy
  → Capture stakeholder communication expectations
  → **Create Communication Management Strategy** ← We are here
  → Include in Project Initiation Documentation
  → Approve as part of PID
  → Execute communication activities per strategy
  → Maintain Communication Register (via stakeholder_communications)
  → Report on communication as defined
```

## Database Schema Design

### Main Tables

#### 1. `communication_management_strategies` (Main Table)
- `id` (UUID, PK)
- `project_id` (UUID, FK to projects, UNIQUE) - One strategy per project
- `cms_reference` (VARCHAR, UNIQUE) - e.g., CMS-2026-001
- `document_ref` (VARCHAR, NULLABLE) - External document reference
- `version_number` (VARCHAR, default '1.0')
- `release` (VARCHAR, NULLABLE) - Release identifier

**Ownership**:
- `author_id` (UUID, FK to users)
- `author_name` (VARCHAR, NULLABLE)
- `owner_id` (UUID, FK to users)
- `owner_name` (VARCHAR, NULLABLE)
- `client_id` (UUID, FK to users, NULLABLE)
- `client_name` (VARCHAR, NULLABLE)

**Introduction Section**:
- `purpose` (TEXT) - Purpose of the strategy
- `objectives` (TEXT) - Communication objectives for the project
- `scope` (TEXT) - Scope of communication management
- `strategy_responsibility` (TEXT) - Who is responsible for the strategy

**Communication Management Procedure**:
- `communication_planning_approach` (TEXT) - Approach to communication planning
- `communication_control_approach` (TEXT) - Approach to communication control
- `communication_assurance_approach` (TEXT) - Approach to communication assurance
- `variance_from_corporate` (TEXT, NULLABLE) - Any variance from corporate standards
- `variance_justification` (TEXT, NULLABLE) - Justification for variance

**References**:
- `customer_communication_requirements` (TEXT, NULLABLE) - Customer's communication elements to use
- `stakeholder_communication_preferences` (TEXT, NULLABLE) - Stakeholder communication preferences
- `corporate_communication_policy_reference` (TEXT, NULLABLE) - Corporate policy reference
- `programme_communication_policy_reference` (TEXT, NULLABLE) - Programme policy reference

**Status**:
- `status` (ENUM: 'draft', 'under_review', 'approved', 'superseded')
- `approved_date` (DATE, NULLABLE)
- `approved_by` (UUID, FK to users, NULLABLE)

**Metadata**:
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `created_by` (UUID, FK to users)
- `updated_by` (UUID, FK to users)
- `is_deleted` (BOOLEAN, default false)
- `deleted_at` (TIMESTAMPTZ)
- `deleted_by` (UUID, FK to users)

**Constraints**:
- UNIQUE constraint on `project_id`
- UNIQUE constraint on `cms_reference`

#### 2. `cms_communication_channels` (Communication Channels)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `channel_name` (VARCHAR) - e.g., Email, Meeting, Report, Presentation
- `channel_type` (ENUM: 'email', 'meeting', 'face_to_face', 'video_call', 'phone', 'report', 'presentation', 'portal', 'intranet', 'newsletter', 'other')
- `channel_description` (TEXT)
- `applicability` (TEXT) - When/where to use this channel
- `effectiveness_rating` (INTEGER, 1-5) - Effectiveness for different audiences
- `accessibility_requirements` (TEXT, NULLABLE) - Accessibility considerations
- `cost_estimate` (DECIMAL, NULLABLE)
- `is_preferred` (BOOLEAN, default false)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 3. `cms_communication_methods` (Communication Methods)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `method_name` (VARCHAR) - e.g., Status Report, Team Meeting, Board Briefing
- `method_type` (ENUM: 'inform', 'consult', 'involve', 'collaborate', 'empower')
- `method_description` (TEXT)
- `when_to_use` (TEXT) - When this method should be applied
- `entry_criteria` (TEXT, NULLABLE) - Criteria to start
- `exit_criteria` (TEXT, NULLABLE) - Criteria to complete
- `required_participants` (TEXT, NULLABLE) - Who must participate
- `documentation_required` (TEXT, NULLABLE) - What to document
- `is_mandatory` (BOOLEAN, default false)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 4. `cms_audience_groups` (Target Audience Groups)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `group_name` (VARCHAR) - e.g., Project Board, Team Members, Customers
- `group_type` (ENUM: 'project_board', 'project_team', 'stakeholders', 'customers', 'suppliers', 'regulators', 'public', 'other')
- `group_description` (TEXT)
- `stakeholder_category` (TEXT, NULLABLE) - Links to stakeholder categories
- `communication_needs` (TEXT) - What information they need
- `frequency_preference` (ENUM: 'continuous', 'daily', 'weekly', 'bi_weekly', 'monthly', 'stage_end', 'on_demand')
- `channel_preferences` (TEXT[]) - Preferred channels for this group
- `key_messages` (TEXT[]) - Key messages for this audience
- `confidentiality_level` (ENUM: 'public', 'internal', 'confidential', 'restricted')
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 5. `cms_communication_standards` (Communication Standards)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `standard_name` (VARCHAR) - e.g., Brand Guidelines, Tone of Voice, Format Standards
- `standard_type` (ENUM: 'branding', 'tone', 'format', 'language', 'accessibility', 'compliance', 'other')
- `standard_description` (TEXT)
- `applicability` (TEXT) - Where it applies
- `compliance_level` (ENUM: 'mandatory', 'recommended', 'optional')
- `template_reference` (VARCHAR, NULLABLE) - Link to template
- `external_link` (VARCHAR, NULLABLE)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 6. `cms_tools_technologies` (Communication Tools and Technologies)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `tool_name` (VARCHAR)
- `tool_type` (ENUM: 'software', 'platform', 'hardware', 'template', 'framework', 'other')
- `tool_description` (TEXT)
- `tool_purpose` (TEXT) - What it's used for
- `applicable_to` (TEXT, NULLABLE) - Which communication steps it applies to
- `proficiency_required` (ENUM: 'none', 'basic', 'intermediate', 'advanced')
- `license_required` (BOOLEAN, default false)
- `license_info` (TEXT, NULLABLE)
- `cost` (DECIMAL, NULLABLE)
- `external_link` (VARCHAR, NULLABLE)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 7. `cms_communication_records` (Communication Records Definition)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `record_name` (VARCHAR)
- `record_type` (ENUM: 'communication_register', 'meeting_minutes', 'presentation_slides', 'reports', 'emails', 'feedback', 'other')
- `record_description` (TEXT)
- `record_purpose` (TEXT)
- `storage_location` (TEXT) - Where records will be stored
- `retention_period` (VARCHAR, NULLABLE) - How long to keep
- `access_control` (TEXT, NULLABLE) - Who can access
- `format_requirements` (TEXT, NULLABLE)
- `is_mandatory` (BOOLEAN, default true)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

**Note**: This links to existing `stakeholder_communications` table (communication execution log)

#### 8. `cms_reports` (Communication Reports Definition)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `report_name` (VARCHAR)
- `report_type` (ENUM: 'status_report', 'progress_report', 'exception_report', 'highlight_report', 'dashboard', 'summary', 'other')
- `report_description` (TEXT)
- `report_purpose` (TEXT)
- `report_content` (TEXT, NULLABLE) - What to include
- `frequency` (ENUM: 'daily', 'weekly', 'bi_weekly', 'monthly', 'stage_end', 'on_demand', 'triggered')
- `trigger_conditions` (TEXT, NULLABLE) - If triggered, what triggers it
- `recipients` (TEXT) - Who receives the report
- `responsible_role` (VARCHAR) - Who produces it
- `template_reference` (VARCHAR, NULLABLE)
- `distribution_method` (ENUM: 'email', 'portal', 'meeting', 'document', 'automated')
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 9. `cms_scheduled_activities` (Timing of Communication Activities)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `activity_name` (VARCHAR)
- `activity_type` (ENUM: 'meeting', 'report', 'presentation', 'briefing', 'review', 'workshop', 'other')
- `activity_description` (TEXT)
- `activity_purpose` (TEXT)
- `timing` (ENUM: 'project_start', 'stage_start', 'stage_end', 'milestone', 'periodic', 'on_demand', 'project_end')
- `frequency` (VARCHAR, NULLABLE) - If periodic, how often
- `specific_timing` (TEXT, NULLABLE) - Specific timing details
- `duration_estimate` (VARCHAR, NULLABLE)
- `participants` (TEXT, NULLABLE)
- `outputs` (TEXT, NULLABLE) - What it produces
- `linked_to_communication_register` (BOOLEAN, default true)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 10. `cms_roles_responsibilities` (Communication Roles)
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `role_name` (VARCHAR) - e.g., Communication Manager, Report Author
- `role_type` (ENUM: 'project_board', 'project_manager', 'communication_manager', 'team_leader', 'report_author', 'presenter', 'external_communicator', 'other')
- `role_description` (TEXT)
- `responsibilities` (TEXT) - Specific communication responsibilities
- `authority_level` (TEXT, NULLABLE) - Decision-making authority
- `assigned_to_id` (UUID, FK to users, NULLABLE)
- `assigned_to_name` (VARCHAR, NULLABLE)
- `is_mandatory` (BOOLEAN, default false)
- `display_order` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### 11. `cms_revision_history`
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `revision_date` (DATE)
- `previous_revision_date` (DATE, NULLABLE)
- `summary_of_changes` (TEXT)
- `changes_marked` (TEXT, NULLABLE)
- `revised_by` (UUID, FK to users)
- `change_request_id` (UUID, FK to change_requests, NULLABLE)
- `created_at` (TIMESTAMPTZ)

#### 12. `cms_approvals`
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `approver_id` (UUID, FK to users)
- `approver_name` (VARCHAR)
- `approver_title` (VARCHAR)
- `signature_data` (TEXT, NULLABLE)
- `approval_date` (DATE)
- `approval_status` (ENUM: 'pending', 'approved', 'rejected')
- `comments` (TEXT, NULLABLE)
- `version_approved` (VARCHAR)
- `created_at` (TIMESTAMPTZ)

#### 13. `cms_distribution`
- `id` (UUID, PK)
- `cms_id` (UUID, FK to communication_management_strategies)
- `recipient_id` (UUID, FK to users)
- `recipient_name` (VARCHAR)
- `recipient_title` (VARCHAR)
- `date_of_issue` (DATE)
- `version_distributed` (VARCHAR)
- `created_at` (TIMESTAMPTZ)

### Integration with Existing Tables

#### Enhanced Link to `communication_plans`
- Add `cms_id` (UUID, FK to communication_management_strategies, NULLABLE) to `communication_plans`
- Allows linking execution plans to strategy
- Migration: `ALTER TABLE communication_plans ADD COLUMN cms_id UUID REFERENCES communication_management_strategies(id) ON DELETE SET NULL`

#### Enhanced Link to `stakeholder_communications`
- Add `cms_id` (UUID, FK to communication_management_strategies, NULLABLE) to `stakeholder_communications`
- Links communication log entries to strategy
- Migration: `ALTER TABLE stakeholder_communications ADD COLUMN cms_id UUID REFERENCES communication_management_strategies(id) ON DELETE SET NULL`

#### Link to `stakeholders`
- Reference existing stakeholder categories in `cms_audience_groups`
- Use `stakeholder_id` in audience group definitions

### Database Functions

#### `generate_cms_reference()`
Generates unique CMS reference number.
```sql
RETURNS VARCHAR -- Returns reference like 'CMS-2026-001'
```

#### `create_cms_for_project(p_project_id UUID, p_user_id UUID)`
Creates CMS with default structure from corporate template.
```sql
RETURNS UUID -- Returns new CMS ID
```

#### `create_cms_from_template(p_project_id UUID, p_template_id UUID, p_user_id UUID)`
Creates CMS from an organization template.
```sql
RETURNS UUID -- Returns new CMS ID
```

#### `validate_cms_completeness(p_cms_id UUID)`
Validates that CMS has all required sections.
```sql
RETURNS TABLE (
  section_name VARCHAR,
  is_complete BOOLEAN,
  missing_items TEXT[],
  recommendations TEXT
)
```

#### `check_cms_conformance(p_cms_id UUID)`
Checks conformance to corporate/stakeholder requirements.
```sql
RETURNS TABLE (
  requirement_name VARCHAR,
  conformance_status VARCHAR,
  gaps TEXT[],
  recommendations TEXT
)
```

#### `get_scheduled_communication_activities(p_project_id UUID, p_date_from DATE, p_date_to DATE)`
Returns upcoming communication activities for a project.
```sql
RETURNS TABLE (
  activity_id UUID,
  activity_name VARCHAR,
  activity_type VARCHAR,
  scheduled_date DATE,
  participants TEXT
)
```

## Implementation Phases

### Phase 1: Database Setup ✅ COMPLETED
- [x] Create database migration file (v190_communication_management_strategy_tables.sql)
- [x] Define all 13 tables with proper constraints
- [x] Create UNIQUE constraint on project_id for communication_management_strategies
- [x] Create UNIQUE constraint on cms_reference
- [x] Create indexes for performance:
  * project_id on communication_management_strategies
  * cms_id on all child tables
  * status on communication_management_strategies
  * activity_type, timing on cms_scheduled_activities
  * channel_type on cms_communication_channels
  * audience group_type on cms_audience_groups
- [x] Add foreign key constraints with ON DELETE CASCADE for child tables
- [x] Register all 13 tables in database_tables registry
- [x] Add cms_id columns to existing `communication_plans` and `stakeholder_communications` tables
- [x] Create database functions:
  * generate_cms_reference()
  * create_cms_for_project(project_id, user_id)
  * validate_cms_completeness(cms_id)
  * check_cms_conformance(cms_id)
  * get_scheduled_communication_activities(project_id, date_from, date_to)
- [x] Create triggers:
  * Auto-generate cms_reference on INSERT
  * updated_at trigger for main table

### Phase 2: RLS Policies ✅ COMPLETED
- [x] Create RLS migration file (v191_communication_management_strategy_rls_policies.sql)
- [x] Grant SELECT, INSERT, UPDATE permissions to authenticated role
- [x] Enable RLS on all CMS tables
- [x] Create helper function `check_cms_access(p_cms_id UUID)`
- [x] Define RLS policies for communication_management_strategies:
  * SELECT: Project members, PMO Admins, System Admins
  * INSERT: Project Manager for their projects, PMO Admins
  * UPDATE: Project Manager for draft/under_review, PMO Admins
  * DELETE: Only drafts (soft delete)
- [x] Define RLS policies for all child tables using check_cms_access
- [ ] Test RLS policies for multi-tenancy

### Phase 3: Service Layer ✅ COMPLETED
- [x] Create `communicationManagementStrategyService.js` with CRUD operations:
  * createCMS(projectId, cmsData)
  * createCMSForProject(projectId)
  * getCMSById(cmsId)
  * getCMSByProject(projectId)
  * updateCMS(cmsId, updates)
  * deleteCMS(cmsId) - Only drafts
  * submitForApproval(cmsId)
  * approveCMS(cmsId, approverId, comments)
  * rejectCMS(cmsId, approverId, reason)
  * validateCompleteness(cmsId)
  * checkConformance(cmsId)
  * getScheduledActivities(projectId, dateFrom, dateTo)
  * getRevisionHistory(cmsId)
  * addRevision(cmsId, revisionData)
  * getApprovals(cmsId)
  * getDistribution(cmsId)
  * linkCommunicationPlan(cmsId, planId)
  * linkStakeholderCommunication(cmsId, communicationId)

- [x] Create `cmsCommunicationChannelsService.js`:
  * addChannel(cmsId, channelData)
  * updateChannel(channelId, updates)
  * deleteChannel(channelId)
  * getChannels(cmsId)
  * getPreferredChannels(cmsId)

- [x] Create `cmsCommunicationMethodsService.js`:
  * addMethod(cmsId, methodData)
  * updateMethod(methodId, updates)
  * deleteMethod(methodId)
  * getMethods(cmsId)
  * getMandatoryMethods(cmsId)

- [x] Create `cmsAudienceGroupsService.js`:
  * addAudienceGroup(cmsId, groupData)
  * updateAudienceGroup(groupId, updates)
  * deleteAudienceGroup(groupId)
  * getAudienceGroups(cmsId)
  * getGroupsByType(cmsId, groupType)

- [x] Create `cmsCommunicationStandardsService.js`:
  * addStandard(cmsId, standardData)
  * updateStandard(standardId, updates)
  * deleteStandard(standardId)
  * getStandards(cmsId)

- [x] Create `cmsToolsTechnologiesService.js`:
  * addTool(cmsId, toolData)
  * updateTool(toolId, updates)
  * deleteTool(toolId)
  * getTools(cmsId)

- [x] Create `cmsCommunicationRecordsService.js`:
  * addRecord(cmsId, recordData)
  * updateRecord(recordId, updates)
  * deleteRecord(recordId)
  * getRecords(cmsId)
  * getMandatoryRecords(cmsId)

- [x] Create `cmsReportsService.js`:
  * addReport(cmsId, reportData)
  * updateReport(reportId, updates)
  * deleteReport(reportId)
  * getReports(cmsId)
  * getReportsByFrequency(cmsId, frequency)

- [x] Create `cmsScheduledActivitiesService.js`:
  * addActivity(cmsId, activityData)
  * updateActivity(activityId, updates)
  * deleteActivity(activityId)
  * getActivities(cmsId)
  * getUpcomingActivities(projectId)

- [x] Create `cmsRolesResponsibilitiesService.js`:
  * addRole(cmsId, roleData)
  * updateRole(roleId, updates)
  * deleteRole(roleId)
  * getRoles(cmsId)
  * assignRole(roleId, userId)

- [ ] Enhance existing `stakeholderService.js`:
  * Link `getCommunicationPlans()` to CMS
  * Link `getStakeholderCommunications()` to CMS
  * Add functions to filter by CMS

- [x] Implement validation functions
- [x] Add error handling and logging

### Phase 4: UI Components - Core Components ✅ COMPLETED
- [x] Create `CMSForm.jsx` - Main form for creating/editing CMS (wizard format)
- [x] Create `CMSView.jsx` - Read-only view with tabs (all sections)
- [x] Create `CMSList.jsx` - PMO Admin list view

### Phase 5: UI Components - Content Sections ✅ COMPLETED
- [x] Create `IntroductionSection.jsx` - Purpose, objectives, scope
- [x] Create `CommunicationProcedureSection.jsx` - Planning, Control, Assurance
- [x] Create `ChannelsSection.jsx` - Communication channels list
- [x] Create `ChannelCard.jsx` - Individual channel display
- [x] Create `ChannelForm.jsx` - Add/edit channel
- [x] Create `MethodsSection.jsx` - Communication methods list
- [x] Create `MethodCard.jsx` - Individual method display
- [x] Create `MethodForm.jsx` - Add/edit method
- [x] Create `AudienceGroupsSection.jsx` - Audience groups list
- [x] Create `AudienceGroupCard.jsx` - Individual group display
- [x] Create `AudienceGroupForm.jsx` - Add/edit audience group

### Phase 6: UI Components - Standards, Tools & Records ✅ COMPLETED
- [x] Create `StandardsSection.jsx` - Communication standards list
- [x] Create `StandardCard.jsx` - Individual standard display
- [x] Create `StandardForm.jsx` - Add/edit standard
- [x] Create `ToolsSection.jsx` - Tools and technologies list
- [x] Create `ToolCard.jsx` - Individual tool display
- [x] Create `ToolForm.jsx` - Add/edit tool
- [x] Create `RecordsSection.jsx` - Communication records list
- [x] Create `RecordCard.jsx` - Individual record display
- [x] Create `RecordForm.jsx` - Add/edit record

### Phase 7: UI Components - Reporting, Timing & Roles ✅ COMPLETED
- [x] Create `ReportsSection.jsx` - Communication reports list
- [x] Create `ReportCard.jsx` - Individual report display
- [x] Create `ReportForm.jsx` - Add/edit report
- [x] Create `ActivitiesSection.jsx` - Scheduled activities list
- [x] Create `ActivityCard.jsx` - Individual activity display
- [x] Create `ActivityForm.jsx` - Add/edit activity
- [x] Create `ActivitiesCalendar.jsx` - Calendar view of activities
- [x] Create `RolesSection.jsx` - Communication roles list
- [x] Create `RoleCard.jsx` - Individual role display
- [x] Create `RoleForm.jsx` - Add/edit role
- [x] Create `RoleAssignment.jsx` - Assign users to roles

### Phase 8: UI Components - Supporting Components ✅ COMPLETED
- [x] Create `CMSRevisionHistory.jsx` - Version history
- [x] Create `CMSDistribution.jsx` - Distribution list
- [x] Create `CMSExport.jsx` - Export options
- [x] Create `CMSPrintView.jsx` - Printable format
- [x] Create `ConformanceChecker.jsx` - Check requirement conformance
- [x] Create `CompletenessIndicator.jsx` - Section completion status
- [x] Create `ChannelEffectivenessBadge.jsx` - Channel effectiveness indicator
- [x] Create `FrequencyBadge.jsx` - Activity/Report frequency
- [x] Create `CMSTemplateSelector.jsx` - Select from org templates
- [x] Create `CorporatePolicyLink.jsx` - Link to corporate policy

### Phase 9: Pages ✅ COMPLETED
- [x] Create `CMSView.jsx` - View communication management strategy
- [x] Create `CMSCreate.jsx` - Create new CMS (wizard format)
- [x] Create `CMSEdit.jsx` - Edit existing CMS
- [x] Create `CMSTemplates.jsx` - Manage CMS templates (PMO Admin)
- [x] Create `CommunicationActivitiesCalendar.jsx` - Calendar of communication activities
- [x] Create `CMSList.jsx` - List all CMS (PMO Admin)

### Phase 10: Routing and Navigation ✅ COMPLETED
- [x] Add routes to App.jsx:
  * /platform/projects/:projectId/cms - View CMS
  * /platform/cms/list - All CMS (PMO Admin)
  * /platform/projects/:projectId/cms/create - Create CMS
  * /platform/projects/:projectId/cms/edit - Edit CMS
  * /platform/projects/:projectId/cms/activities - Communication activities calendar
  * /platform/pmo-admin/cms-templates - Manage CMS templates
- [x] Add menu items to Project Manager sidebar:
  * "Communication Management Strategy" button in ProjectsDetail
- [x] Add menu items to PMO Admin sidebar:
  * CMS routes accessible via direct navigation
  * CMS templates route in PMO Admin section
- [x] Create breadcrumb navigation (implemented in page components)
- [x] Implement role-based access control (via ProtectedRoute)

### Phase 11: Business Logic
- [ ] Implement CMS creation:
  * Create from scratch
  * Create from corporate template
  * Generate unique reference
  * Apply organization defaults
- [ ] Implement completeness validation:
  * Check all required sections
  * Verify minimum content
  * Generate recommendations
- [ ] Implement conformance checking:
  * Compare against corporate standards
  * Compare against stakeholder requirements
  * Identify gaps
- [ ] Implement activity scheduling:
  * Schedule communication activities
  * Send reminders
  * Track completion
- [ ] Implement role assignment:
  * Assign users to communication roles
  * Notify assigned users
- [ ] Implement approval workflow
- [ ] Implement version control
- [ ] Implement auto-save functionality
- [ ] **Enhance existing CommunicationPlan component**:
  * Link to CMS strategy
  * Auto-populate from CMS
  * Validate against CMS

### Phase 12: Organization Templates
- [ ] Create `cmsTemplateService.js`:
  * createTemplate(organisationId, templateData)
  * updateTemplate(templateId, updates)
  * deleteTemplate(templateId)
  * getTemplates(organisationId)
  * getDefaultTemplate(organisationId)
  * setAsDefault(templateId)
- [ ] Create organization-level CMS templates
- [ ] Allow PMO Admin to manage templates
- [ ] Populate templates with channels, methods, audience groups

### Phase 13: Validation and Quality Checks
- [ ] Implement communication criteria validation:
  * Strategy clearly defines ways to meet communication expectations
  * Defined ways are sufficient (coverage check)
  * Communication responsibilities defined appropriately
  * Conforms to customer communication requirements (if specified)
  * Conforms to stakeholder preferences (if specified)
  * Conforms to corporate communication policy
  * Channels appropriate for message types
- [ ] Create completion indicators
- [ ] Implement field-level validation
- [ ] Add warnings for:
  * Missing communication channels
  * No mandatory methods defined
  * No audience groups specified
  * No scheduled activities
  * Inappropriate channel selection

### Phase 14: Integration with Other Modules
- [ ] Integrate with Project:
  * One CMS per project
  * Show CMS status on project dashboard
  * CMS approval required for PID approval
- [ ] **Integrate with existing Communication Plans**:
  * Link communication_plans to CMS
  * Auto-populate plans from CMS
  * Validate plans against CMS
- [ ] **Integrate with existing Stakeholder Communications**:
  * Link stakeholder_communications to CMS
  * Filter communications by CMS methods/channels
  * Track communication execution against strategy
- [ ] Integrate with Stakeholder Engagement Strategy:
  * Link communication expectations
  * Align audience groups with stakeholder categories
- [ ] Integrate with Quality Management Strategy:
  * Share communication roles
  * Coordinate reporting requirements
- [ ] Integrate with Risk Management Strategy:
  * Risk communication requirements
  * Escalation communication procedures

### Phase 15: Export and Reporting
- [ ] Implement PDF export (match template format)
- [ ] Implement Word document export
- [ ] Create printable view with proper formatting
- [ ] Create CMS Summary Report:
  * Channels overview
  * Methods summary
  * Audience groups and roles
  * Activity schedule
- [ ] Implement CSV export
- [ ] Implement email distribution feature
- [ ] Generate Communication Register from strategy

### Phase 16: Testing
- [ ] Create unit tests for all services
- [ ] Create integration tests for CRUD operations
- [ ] Create component tests for all UI components
- [ ] Test CMS creation from template
- [ ] Test completeness validation
- [ ] Test conformance checking
- [ ] Test activity scheduling
- [ ] Test role assignment
- [ ] Test export functionality
- [ ] Test role-based access control
- [ ] Test integration with existing communication_plans
- [ ] Test integration with existing stakeholder_communications

### Phase 17: Documentation
- [ ] Create user guide for creating CMS
- [ ] Create guide for communication planning
- [ ] Create guide for defining communication methods
- [ ] Create guide for audience group management
- [ ] Create PMO template management guide
- [ ] Create technical documentation
- [ ] Document conformance requirements
- [ ] Create video tutorials

## Technical Specifications

### Service Methods

#### communicationManagementStrategyService.js
```javascript
// CRUD Operations
- createCMS(projectId, cmsData)
- createCMSFromTemplate(projectId, templateId)
- getCMSById(cmsId)
- getCMSByProject(projectId)
- updateCMS(cmsId, updates)
- deleteCMS(cmsId) - Only drafts

// Approval
- submitForApproval(cmsId, approverIds)
- approveCMS(approvalId, approverId, comments)
- rejectCMS(approvalId, approverId, reason)

// Validation
- validateCompleteness(cmsId)
- checkConformance(cmsId)
- getValidationStatus(cmsId)

// History
- getRevisionHistory(cmsId)
- addRevision(cmsId, changes, changeRequestId)

// Integration
- linkCommunicationPlan(cmsId, planId)
- linkStakeholderCommunication(cmsId, communicationId)
```

### Form Validation Rules

#### Creating/Editing CMS
**Required Fields**:
- Purpose (min 50 characters)
- Objectives (min 30 characters)
- Scope (min 30 characters)
- Communication control approach (min 50 characters)
- Communication assurance approach (min 50 characters)
- At least one communication channel
- At least one communication method
- At least one audience group
- At least one communication role

**Validation Rules**:
- Must have at least one preferred communication channel
- Must reference corporate policy if exists
- Variance from corporate must have justification
- At least one mandatory communication method
- Communication Register must be in records
- Audience groups must cover all stakeholder categories

### Communication Channel Types

| Channel Type | Description | Best For |
|--------------|-------------|----------|
| **Email** | Electronic mail | Formal communications, documentation |
| **Meeting** | Face-to-face or virtual meetings | Interactive discussions, decisions |
| **Report** | Written reports | Status updates, formal documentation |
| **Presentation** | Live or recorded presentations | Briefings, demos |
| **Portal** | Online portal/intranet | Self-service information access |
| **Phone** | Voice calls | Quick updates, clarifications |
| **Video Call** | Video conferencing | Remote meetings, visual demos |

### Communication Method Types (IAP2 Spectrum)

| Method Type | Description | Engagement Level |
|-------------|-------------|------------------|
| **Inform** | One-way communication | Low |
| **Consult** | Seek feedback | Low-Medium |
| **Involve** | Work together | Medium |
| **Collaborate** | Partner in decisions | Medium-High |
| **Empower** | Final decision-making authority | High |

### RLS Policies
- Project team members can view CMS for their projects
- Only Project Manager can create/edit CMS in draft
- Approved CMS is read-only (changes through change control)
- PMO Admins can view all CMS in their organization
- PMO Admins can manage CMS templates
- Project Board members can approve CMS
- Communication Manager role has enhanced permissions

## UI/UX Design Considerations

### CMS Form - Wizard Mode
```
Step 1: Introduction
  → Purpose
  → Objectives
  → Scope
  → Responsibility

Step 2: Communication Channels
  → Select/define communication channels
  → Set effectiveness ratings
  → Mark preferred channels

Step 3: Communication Methods
  → Define communication methods
  → Set mandatory/optional
  → Entry/exit criteria

Step 4: Audience Groups
  → Define target audience groups
  → Link to stakeholder categories
  → Set communication needs and preferences

Step 5: Communication Procedures
  → Communication Planning approach
  → Communication Control approach
  → Communication Assurance approach
  → Variance documentation (if any)

Step 6: Standards & Tools
  → Specify communication standards
  → Specify tools and technologies

Step 7: Records & Reports
  → Define communication records
  → Define communication reports
  → Set frequency and recipients

Step 8: Activity Schedule
  → Schedule communication activities
  → Set timing and participants

Step 9: Roles & Responsibilities
  → Define communication roles
  → Assign to users

Step 10: Review & Submit
  → Completeness check
  → Conformance check
  → Submit for approval
```

### Integration with Existing Components

#### Enhanced CommunicationPlan Component
- Add "Link to CMS Strategy" selector
- Auto-populate channel, method, audience from CMS
- Validate plan against CMS requirements
- Show CMS compliance status

#### Enhanced Stakeholder Communications View
- Filter by CMS method/channel
- Show which CMS strategy section applies
- Track execution against strategy
- Generate compliance report

## Success Criteria

### User Confirmation Messages
- Created: "Communication Management Strategy [Reference] created successfully"
- Updated: "Communication Management Strategy [Reference] updated successfully"
- Approved: "Communication Management Strategy [Reference] approved"
- Role Assigned: "Communication role assigned to [User Name]"

### Communication Warnings
- "No preferred communication channel defined"
- "No mandatory communication methods specified"
- "Not all stakeholder categories have audience groups"
- "Variance from corporate standard not justified"
- "Communication Register not included in records"
- "Inappropriate channel selected for sensitive information"

### Dashboard Widgets
- "CMS Status: Approved"
- "Upcoming Communication Activities: 5 this week"
- "Communication Roles: 3 assigned, 0 pending"
- "Communication Plan Compliance: 85%"

## Integration Points

### With Project
- One CMS per project
- CMS status on dashboard
- CMS approval gates PID

### With Existing Communication Plans
- CMS defines strategy, plans execute strategy
- Link plans to CMS
- Auto-populate from CMS
- Validate against CMS

### With Existing Stakeholder Communications
- Communications log execution of strategy
- Link communications to CMS
- Track compliance
- Generate execution reports

### With Stakeholder Engagement Strategy
- Link communication expectations
- Methods support stakeholder engagement
- Audience groups align with stakeholder categories

### With Quality Management Strategy
- Share communication roles
- Coordinate reporting requirements
- Quality communication standards

### With Risk Management Strategy
- Risk communication requirements
- Escalation communication procedures
- Crisis communication protocols

### With Corporate Standards
- Import corporate communication standards
- Inherit templates
- Check conformance

## Dependencies
- Existing projects table
- Existing communication_plans table (enhanced)
- Existing stakeholder_communications table (enhanced)
- Existing stakeholders table
- Users table
- Corporate communication policies (if defined)
- Quality Management Strategy (related module)
- Risk Management Strategy (related module)
- Change requests table
- Role-based access control system
- Notification system
- PDF generation library
- Calendar/scheduling library

## Risk Considerations
1. **Over-Engineering**: Too much process for small projects
2. **Under-Specification**: Insufficient detail for complex projects
3. **Channel Overload**: Too many channels confusing users
4. **Template Rigidity**: Templates may not fit all projects
5. **Integration Complexity**: Ensuring seamless integration with existing communication components

## Future Enhancements (Post-MVP)
- AI-powered channel recommendations based on audience
- Automated conformance checking against standards
- Integration with external communication tools (Slack, Teams, email systems)
- Communication effectiveness analytics
- Cross-project communication benchmarking
- Communication risk prediction
- Automated communication metrics collection
- Industry-specific CMS templates
- Multi-language communication support
- Communication dashboard with real-time metrics

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

**Version**: v184
**Plan Created**: 2026-01-19
**Status**: Pending Approval
**Estimated Complexity**: High
**Estimated Tables**: 13 (+ 2 existing tables enhanced)
**Estimated Components**: ~55
**Priority**: HIGH

## Version History
- **v184** (2026-01-19): Initial implementation plan created
