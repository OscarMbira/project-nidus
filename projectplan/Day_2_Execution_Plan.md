# Phase 1 - Day 2: Database Architecture Design
**Date:** 2025-11-15
**Status:** In Progress
**Estimated Time:** 6-8 hours

---

## 📋 Overview

Design the complete database architecture for Project Nidus, establishing naming conventions, audit systems, and core table structures that will support all methodologies (Structured PM, Scrum, Kanban, Agile, and Hybrid).

---

## 🎯 Day 2 Objectives

1. Design core database architecture that supports multi-methodology approach
2. Establish PostgreSQL/Supabase-specific naming conventions
3. Define standard audit fields for all tables
4. Create ER diagrams for core system tables
5. Design database table registry system
6. Document all design principles and decisions
7. Prepare for Day 3 SQL script creation

---

## 📝 Tasks Breakdown

### Task 1: Design Core Database Architecture
**Priority:** Critical
**Estimated Time:** 90 minutes

**Objectives:**
- Define overall database structure
- Establish separation between core and methodology-specific tables
- Design for scalability and multi-tenancy (if needed)
- Plan for audit trail and soft deletes

**Deliverables:**
- High-level architecture diagram
- Table category definitions
- Relationship overview

---

### Task 2: Define Table Naming Conventions
**Priority:** Critical
**Estimated Time:** 30 minutes

**Objectives:**
- PostgreSQL-compatible naming standards
- Copyright-safe naming (no trademarks)
- Consistent, readable, maintainable names
- Clear distinction between core and methodology tables

**Standards to Define:**
- Table names (snake_case, plural)
- Column names (snake_case, descriptive)
- Index names
- Constraint names
- Function names
- Trigger names

**Deliverables:**
- Comprehensive naming convention document
- Examples for each category

---

### Task 3: Define Standard Audit Fields
**Priority:** Critical
**Estimated Time:** 30 minutes

**Objectives:**
- Define audit fields required on ALL tables
- Establish soft delete pattern
- Track creation, updates, and deletions
- Support compliance and audit requirements

**Standard Fields:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
created_at TIMESTAMP DEFAULT NOW()
created_by UUID REFERENCES users(id)
updated_at TIMESTAMP DEFAULT NOW()
updated_by UUID REFERENCES users(id)
is_deleted BOOLEAN DEFAULT FALSE
deleted_at TIMESTAMP
deleted_by UUID REFERENCES users(id)
```

**Deliverables:**
- Audit field standard documentation
- Trigger strategy for auto-updating fields

---

### Task 4: Create ER Diagram for Core Tables
**Priority:** High
**Estimated Time:** 120 minutes

**Core Tables to Design:**

#### System Tables
- `database_tables` - Table registry
- `audit_trails` - Audit log
- `session_logs` - Session tracking
- `system_settings` - System configuration

#### User & Access Tables
- `users` - User accounts
- `roles` - System roles
- `permissions` - Available permissions
- `user_roles` - User-role assignments (many-to-many)
- `role_permissions` - Role-permission assignments (many-to-many)

#### Project Core Tables
- `projects` - Main project records
- `project_methodologies` - Methodology selection
- `project_configurations` - Project-specific settings
- `project_statuses` - Project status tracking
- `project_types` - Project categorization
- `project_phases` - Phases/Stages/Sprints

#### Team Tables
- `teams` - Team definitions
- `team_members` - Team membership
- `user_projects` - User-project assignments

#### Configuration Tables
- `methodologies` - Available methodologies
- `workflows` - Workflow definitions
- `menu_items` - Menu system
- `role_menu_items` - Role-based menu access

**Deliverables:**
- ER diagram (textual/mermaid format)
- Table definitions with columns
- Relationship documentation

---

### Task 5: Design Database Table Registry System
**Priority:** High
**Estimated Time:** 45 minutes

**Objectives:**
- Create `database_tables` table to track all tables in system
- Support ID generation rules system
- Enable dynamic table management
- Facilitate documentation and maintenance

**Registry Table Schema:**
```sql
CREATE TABLE database_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) UNIQUE NOT NULL,
    table_description TEXT NOT NULL,
    is_system_table BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);
```

**Deliverables:**
- Complete registry table design
- Registration template for new tables
- Documentation on usage

---

### Task 6: Document Database Design Principles
**Priority:** High
**Estimated Time:** 60 minutes

**Principles to Document:**
1. **Normalization:** 3rd Normal Form minimum
2. **Indexes:** Primary keys, foreign keys, frequently queried columns
3. **Constraints:** Foreign keys, check constraints, unique constraints
4. **Data Types:** Appropriate PostgreSQL types
5. **Defaults:** Sensible default values
6. **Nullability:** Explicit NULL vs NOT NULL
7. **Audit Trail:** All tables have audit fields
8. **Soft Deletes:** Use is_deleted flag
9. **UUID Primary Keys:** For security and distribution
10. **Timestamps:** Always use TIMESTAMP (not DATE for tracking)

**Deliverables:**
- Database design principles document
- Best practices guide
- Common patterns reference

---

### Task 7: Review PostgreSQL/Supabase Considerations
**Priority:** Medium
**Estimated Time:** 45 minutes

**PostgreSQL-Specific:**
- UUID generation (`uuid_generate_v4()`)
- JSONB for flexible data
- Array types where appropriate
- Full-text search capabilities
- Partitioning strategies
- Index types (B-tree, GiST, GIN)

**Supabase-Specific:**
- Row Level Security (RLS) requirements
- Realtime capabilities
- Storage integration
- Auth integration
- Edge Functions considerations
- API auto-generation

**Deliverables:**
- PostgreSQL best practices document
- Supabase integration notes
- Performance optimization guidelines

---

## 📊 Table Categories Overview

### Category 1: System Core (8 tables)
- `database_tables` - Table registry
- `audit_trails` - System-wide audit log
- `session_logs` - User session tracking
- `system_settings` - System configuration
- `email_templates` - Email templates
- `notifications` - Notification system
- `activity_logs` - Activity feed
- `error_logs` - Error tracking

### Category 2: User & Access Management (7 tables)
- `users` - User accounts
- `roles` - System roles
- `permissions` - Available permissions
- `user_roles` - User-role assignments
- `role_permissions` - Role-permission matrix
- `user_preferences` - User settings
- `user_projects` - User-project assignments

### Category 3: Project Core (8 tables)
- `projects` - Main project records
- `project_methodologies` - Methodology selection
- `project_configurations` - Project settings
- `project_statuses` - Status tracking
- `project_types` - Categorization
- `project_phases` - Phases/Stages/Sprints
- `teams` - Team definitions
- `team_members` - Team membership

### Category 4: Configuration & Menu (5 tables)
- `methodologies` - Available methodologies
- `workflows` - Workflow definitions
- `menu_items` - Navigation menu items
- `role_menu_items` - Role-menu access
- `user_menu_preferences` - User menu customization

### Category 5: Methodology-Specific (Future Days)
- Structured PM tables (~50 tables)
- Agile Scrum tables (~25 tables)
- Kanban tables (~15 tables)
- Cross-cutting tables (~40 tables)

**Total Core Tables (Day 2):** ~28 tables

---

## 🎯 Success Criteria

By end of Day 2:

- [x] Core database architecture designed
- [x] Naming conventions documented
- [x] Standard audit fields defined
- [x] ER diagram created for core tables (~28 tables)
- [x] Database table registry designed
- [x] Database design principles documented
- [x] PostgreSQL/Supabase considerations documented

---

## 📁 Deliverables

### Documentation Files
1. `Documentation/Database_Architecture.md` - Overall architecture
2. `Documentation/Database_Naming_Conventions.md` - Naming standards
3. `Documentation/Database_Design_Principles.md` - Design guidelines
4. `Documentation/Core_Tables_ER_Diagram.md` - ER diagrams and schemas

### Planning Files
1. `projectplan/Day_2_Execution_Plan.md` - This file
2. `projectplan/Day_2_Completion_Summary.md` - End of day summary

---

## ⚠️ Important Considerations

### Copyright-Safe Naming
- Table names MUST follow copyright-safe strategy
- NO `prince2_` prefixes
- Use generic terms: `project_initiation_documents` NOT `prince2_pids`
- See: `projectplan/Copyright_Safe_Naming_Strategy.md`

### Supabase Limitations
- Row Level Security (RLS) must be planned from start
- Realtime requires specific triggers
- Storage has separate permissions
- Auth tables are managed by Supabase

### Scalability
- Design for 100,000+ projects
- Design for 10,000,000+ tasks
- Plan for efficient indexing
- Consider partitioning for large tables

### Multi-Methodology Support
- Core tables must be methodology-agnostic
- Methodology-specific tables link to core via foreign keys
- Projects can switch methodologies (data preservation)

---

## 🔄 Execution Flow

1. **Start:** Create Day 2 execution plan ✅
2. **Task 1:** Design core architecture (90 min)
3. **Task 2:** Define naming conventions (30 min)
4. **Task 3:** Define audit fields (30 min)
5. **Task 4:** Create ER diagrams (120 min)
6. **Task 5:** Design table registry (45 min)
7. **Task 6:** Document design principles (60 min)
8. **Task 7:** Review PostgreSQL/Supabase (45 min)
9. **End:** Create completion summary, commit to Git

**Total Estimated Time:** 6-8 hours

---

## 📋 Checklist

### Before Starting
- [x] Day 1 completed
- [x] Documentation folder exists
- [x] Ready to create new documentation

### During Execution
- [ ] Follow copyright-safe naming
- [ ] Document all decisions
- [ ] Create clear, visual ER diagrams
- [ ] Keep scalability in mind

### Before Completion
- [ ] All documentation created
- [ ] All diagrams complete
- [ ] Review for consistency
- [ ] Commit to Git

---

## 🚀 Ready to Execute

**Status:** ⏳ Awaiting execution start

**Next Action:** Begin Task 1 - Design Core Database Architecture

---

**Time Started:** [To be filled]
**Time Completed:** [To be filled]
**Actual Time Taken:** [To be filled]

---
