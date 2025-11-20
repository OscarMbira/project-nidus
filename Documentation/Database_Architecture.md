# Database Architecture
**Project:** Project Nidus
**Date:** 2025-11-15
**Version:** 1.0
**Database:** PostgreSQL (via Supabase)

---

## 📋 Overview

This document outlines the complete database architecture for Project Nidus, a multi-methodology project management system supporting Structured/Traditional PM, Scrum, Kanban, Agile, and hybrid approaches.

---

## 🎯 Architecture Principles

### 1. Multi-Methodology Support
- **Core tables** are methodology-agnostic
- **Methodology-specific tables** extend core functionality
- Projects can **switch methodologies** without data loss
- **Unified reporting** across all methodologies

### 2. Scalability
- Designed for **100,000+ projects**
- Support for **10,000,000+ tasks**
- **10,000+ concurrent users**
- Efficient indexing and query optimization

### 3. Security & Compliance
- **Row Level Security (RLS)** on all tables
- **Audit trails** for all operations
- **Soft deletes** preserve data
- **GDPR compliance** ready

### 4. Data Integrity
- **Foreign key constraints** enforce relationships
- **Check constraints** validate data
- **Unique constraints** prevent duplicates
- **NOT NULL** constraints where appropriate

### 5. Performance
- **UUID primary keys** for security and distribution
- **Proper indexing** on foreign keys and query columns
- **JSONB** for flexible data
- **Partitioning** strategy for large tables

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                         │
│            (React + Vite + Supabase Client)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    SUPABASE API LAYER                        │
│         (REST API + Realtime + Auth + Storage)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  ROW LEVEL SECURITY (RLS)                    │
│              (Permission enforcement layer)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   DATABASE LAYER                             │
│                   PostgreSQL 15+                             │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │ System Core  │  │ User & Access │  │  Project Core   │ │
│  │  (8 tables)  │  │  (7 tables)   │  │  (8 tables)     │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │Configuration │  │  Structured   │  │  Agile Scrum    │ │
│  │  (5 tables)  │  │    PM (~50)   │  │    (~25)        │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │   Kanban     │  │Cross-Cutting  │  │   Resources     │ │
│  │   (~15)      │  │    (~40)      │  │    (~10)        │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Table Categories

### Category 1: System Core (8 tables)
**Purpose:** System-level functionality and tracking

| Table Name | Purpose |
|------------|---------|
| `database_tables` | Registry of all database tables |
| `audit_trails` | System-wide audit log for all changes |
| `session_logs` | User session tracking and management |
| `system_settings` | System-wide configuration |
| `email_templates` | Email notification templates |
| `notifications` | User notification queue |
| `activity_logs` | Activity feed for users |
| `error_logs` | Application error tracking |

**Characteristics:**
- Critical for system operation
- Heavily indexed
- Partition `audit_trails` and `activity_logs` by date
- High write volume on audit tables

---

### Category 2: User & Access Management (7 tables)
**Purpose:** Authentication, authorization, and user management

| Table Name | Purpose |
|------------|---------|
| `users` | User account information |
| `roles` | System roles (Admin, PM, Team Member, etc.) |
| `permissions` | Available permissions in system |
| `user_roles` | User-to-role assignments (many-to-many) |
| `role_permissions` | Role-to-permission assignments (many-to-many) |
| `user_preferences` | User-specific settings |
| `user_projects` | User-to-project assignments |

**Characteristics:**
- Heavily queried
- RLS critical
- Integration with Supabase Auth
- Cache frequently accessed role/permission data

---

### Category 3: Project Core (8 tables)
**Purpose:** Core project management functionality

| Table Name | Purpose |
|------------|---------|
| `projects` | Main project records |
| `project_methodologies` | Selected methodology per project |
| `project_configurations` | Project-specific settings |
| `project_statuses` | Project status tracking |
| `project_types` | Project categorization |
| `project_phases` | Phases/Stages/Sprints/Iterations |
| `teams` | Team definitions |
| `team_members` | Team membership |

**Characteristics:**
- Core business entities
- Methodology-agnostic design
- Support for methodology switching
- Many foreign key relationships

---

### Category 4: Configuration & Menu (5 tables)
**Purpose:** System configuration and UI customization

| Table Name | Purpose |
|------------|---------|
| `methodologies` | Available methodologies (Structured, Scrum, Kanban) |
| `workflows` | Workflow definitions |
| `menu_items` | Navigation menu structure |
| `role_menu_items` | Role-based menu access |
| `user_menu_preferences` | User menu customization |

**Characteristics:**
- Reference data
- Infrequently updated
- Cached aggressively
- Critical for UI rendering

---

### Category 5: Structured PM Tables (~50 tables)
**Purpose:** Structured/Traditional project management

**Sub-categories:**
- **Initiation:** mandates, project_briefs, initiation_documents, business_cases
- **Planning:** project_plans, work_packages, product_deliverables
- **Governance:** board_decisions, stage_boundaries, exception_reports
- **Control:** progress_reports, checkpoint_reports, stage_reports
- **Quality:** quality_registers, quality_reviews, quality_criteria
- **Closure:** closure_reports, lessons_learned, benefits_reviews

**Characteristics:**
- Document-heavy
- Approval workflows
- Comprehensive audit requirements
- Integration with core projects table

---

### Category 6: Agile Scrum Tables (~25 tables)
**Purpose:** Scrum framework implementation

**Sub-categories:**
- **Backlog:** product_backlogs, sprint_backlogs, user_stories, epics
- **Sprints:** sprints, sprint_goals, sprint_commitments
- **Events:** daily_scrums, sprint_reviews, sprint_retrospectives
- **Metrics:** velocity_metrics, burndown_data, cumulative_flow

**Characteristics:**
- Iteration-focused
- High velocity data
- Metrics and analytics heavy
- Real-time updates needed

---

### Category 7: Kanban Tables (~15 tables)
**Purpose:** Kanban method implementation

**Sub-categories:**
- **Boards:** kanban_boards, kanban_columns, kanban_swimlanes
- **Cards:** kanban_cards, card_assignments, card_dependencies
- **Metrics:** flow_metrics, cycle_time_data, throughput_data, wip_limits

**Characteristics:**
- Visual workflow focus
- Real-time board updates
- Flow metrics calculation
- WIP limit enforcement

---

### Category 8: Cross-Cutting Tables (~40 tables)
**Purpose:** Features used across all methodologies

**Sub-categories:**
- **Issues:** issues, issue_resolutions, issue_escalations
- **Risks:** risks, risk_assessments, risk_responses, risk_mitigations
- **Changes:** change_requests, change_impacts, change_approvals
- **Quality:** quality_plans, defects, non_conformances
- **Communication:** stakeholders, meetings, communications
- **Documents:** documents, document_versions, attachments

**Characteristics:**
- Universal functionality
- Used by all methodologies
- Integration with methodology tables
- Document management heavy

---

### Category 9: Resource Management (~10 tables)
**Purpose:** Resource allocation and tracking

| Table Name | Purpose |
|------------|---------|
| `resources` | Resource pool |
| `resource_allocations` | Resource assignments |
| `resource_skills` | Skills matrix |
| `resource_availability` | Availability tracking |
| `resource_utilization` | Utilization metrics |
| `tasks` | Universal tasks |
| `task_assignments` | Task-resource assignments |
| `task_dependencies` | Task relationships |
| `time_entries` | Time tracking |
| `expenses` | Expense tracking |

---

### Category 10: Financial Management (~8 tables)
**Purpose:** Budget and cost tracking

| Table Name | Purpose |
|------------|---------|
| `budgets` | Budget definitions |
| `cost_estimates` | Cost estimation |
| `cost_records` | Actual costs |
| `financial_forecasts` | Financial projections |
| `invoices` | Invoice management |
| `financial_reports` | Financial reporting |
| `earned_value_metrics` | EVM calculations |
| `budget_allocations` | Budget distribution |

---

## 🔗 Core Relationships

### Primary Relationships

```
users (1) ──────< (M) user_roles (M) >────── (1) roles
                                                   │
roles (1) ──────< (M) role_permissions (M) >──── (1) permissions

users (1) ──────< (M) user_projects (M) >────── (1) projects
                                                     │
projects (1) ───< (1) project_methodologies          │
                                                     │
projects (1) ───< (M) project_phases                 │
                                                     │
projects (1) ───< (M) teams                          │
                                                     │
teams (1) ──────< (M) team_members (M) >────── (1) users

projects (1) ───< (M) tasks
                      │
tasks (1) ──────< (M) task_assignments (M) >────── (1) resources
                      │
tasks (1) ──────< (M) task_dependencies ──────> (1) tasks
```

### Methodology-Specific Relationships

```
# Structured PM
projects (1) ───< (M) project_initiation_documents
projects (1) ───< (M) business_cases
projects (1) ───< (M) stage_boundaries
projects (1) ───< (M) work_packages

# Scrum
projects (1) ───< (M) sprints
sprints (1) ────< (M) sprint_backlogs
sprints (1) ────< (M) sprint_retrospectives
projects (1) ───< (1) product_backlogs

# Kanban
projects (1) ───< (M) kanban_boards
kanban_boards (1) ───< (M) kanban_columns
kanban_boards (1) ───< (M) kanban_cards
```

---

## 🔐 Security Architecture

### Row Level Security (RLS)

**All tables will have RLS policies based on:**

1. **User Project Access:**
   ```sql
   -- Example policy
   CREATE POLICY project_access ON projects
   FOR ALL
   USING (
     id IN (
       SELECT project_id FROM user_projects
       WHERE user_id = auth.uid()
     )
   );
   ```

2. **Role-Based Access:**
   ```sql
   -- Example policy
   CREATE POLICY admin_full_access ON projects
   FOR ALL
   USING (
     EXISTS (
       SELECT 1 FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = auth.uid()
       AND r.name = 'System Admin'
     )
   );
   ```

3. **Data Ownership:**
   ```sql
   -- Example policy
   CREATE POLICY own_data ON user_preferences
   FOR ALL
   USING (user_id = auth.uid());
   ```

---

## 📊 Data Flow Architecture

### Create Operation
```
1. Application → Supabase API
2. RLS Check (can user create?)
3. Insert into table
4. Trigger: Set created_at, created_by
5. Trigger: Insert audit trail
6. Return success
7. Realtime update to subscribed clients
```

### Update Operation
```
1. Application → Supabase API
2. RLS Check (can user update?)
3. Update table row
4. Trigger: Set updated_at, updated_by
5. Trigger: Insert audit trail (old vs new)
6. Return success
7. Realtime update to subscribed clients
```

### Delete Operation (Soft Delete)
```
1. Application → Supabase API
2. RLS Check (can user delete?)
3. Update: Set is_deleted = TRUE, deleted_at, deleted_by
4. Trigger: Insert audit trail
5. Return success
6. Realtime update to subscribed clients
```

---

## 🚀 Performance Optimization

### Indexing Strategy

**All tables include:**
- Primary key index (UUID)
- Foreign key indexes
- Frequently queried column indexes

**Composite indexes for:**
- Common query combinations
- Sorting operations
- Filtering operations

**Example:**
```sql
-- Projects table indexes
CREATE INDEX idx_projects_status ON projects(status_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_methodology ON projects(methodology_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_name_search ON projects USING gin(to_tsvector('english', name));
```

### Partitioning Strategy

**Partition large tables by date:**
- `audit_trails` - Monthly partitions
- `activity_logs` - Monthly partitions
- `session_logs` - Weekly partitions
- `notifications` - Weekly partitions

**Example:**
```sql
CREATE TABLE audit_trails (
  -- columns
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_trails_2025_11 PARTITION OF audit_trails
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

---

## 📈 Scalability Considerations

### Horizontal Scaling
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Caching layer (Redis) for frequently accessed data

### Vertical Scaling
- Appropriate instance sizing
- SSD storage
- Sufficient RAM for working set

### Data Archival
- Archive old audit trails (>1 year)
- Archive completed projects (>2 years)
- Maintain audit trail integrity

---

## 🔄 Data Migration Strategy

### Version Control
- All schema changes in versioned SQL files
- Migration scripts for data transformations
- Rollback scripts for each migration

### Deployment Process
```
1. Review migration script
2. Test on dev database
3. Backup production database
4. Apply migration to staging
5. Verify staging
6. Apply to production (maintenance window)
7. Verify production
8. Monitor performance
```

---

## 📊 Total Table Count

| Category | Tables |
|----------|--------|
| System Core | 8 |
| User & Access | 7 |
| Project Core | 8 |
| Configuration & Menu | 5 |
| **Core Subtotal** | **28** |
| Structured PM | ~50 |
| Agile Scrum | ~25 |
| Kanban | ~15 |
| Cross-Cutting | ~40 |
| Resource Management | ~10 |
| Financial Management | ~8 |
| **Total Estimated** | **~180 tables** |

---

## 🎯 Design Goals Achieved

✅ **Multi-Methodology Support** - Methodology-agnostic core with specific extensions
✅ **Scalability** - Designed for 100K+ projects, 10M+ tasks
✅ **Security** - RLS on all tables, comprehensive audit trail
✅ **Performance** - Proper indexing, partitioning strategy
✅ **Maintainability** - Clear structure, good naming, documentation
✅ **Compliance** - GDPR-ready, audit trails, soft deletes
✅ **Flexibility** - JSONB for extensibility, methodology switching
✅ **Copyright Safety** - No trademarked names in schema

---

## 📚 Related Documentation

- **Naming Conventions:** `Database_Naming_Conventions.md`
- **Design Principles:** `Database_Design_Principles.md`
- **Core Tables ER Diagram:** `Core_Tables_ER_Diagram.md`
- **Supabase Setup:** `Supabase_Setup_Guide.md`

---

## 🔄 Next Steps

1. ✅ Architecture designed
2. ⏳ Define naming conventions (Task 2)
3. ⏳ Define audit fields (Task 3)
4. ⏳ Create ER diagrams (Task 4)
5. ⏳ Design table registry (Task 5)
6. ⏳ Create SQL scripts (Day 3)

---

**Version:** 1.0
**Last Updated:** 2025-11-15
**Maintained By:** Development Team
