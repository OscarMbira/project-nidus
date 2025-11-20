# Seed Data Reference
**Project:** Project Nidus - Multi-Methodology Project Management System
**Version:** 1.0
**Date:** 2025-11-15
**Purpose:** Complete reference for all seed data in the Project Nidus database

---

## Table of Contents

1. [Overview](#overview)
2. [System Settings](#system-settings)
3. [Email Templates](#email-templates)
4. [Roles](#roles)
5. [Permissions](#permissions)
6. [Role-Permission Mappings](#role-permission-mappings)
7. [Methodologies](#methodologies)
8. [Workflows](#workflows)
9. [Menu Structure](#menu-structure)
10. [Project Statuses](#project-statuses)
11. [Project Types](#project-types)
12. [Customization Guide](#customization-guide)

---

## Overview

This document provides a complete reference of all seed data created during the initial database setup. Seed data includes:

- System configuration settings
- Email templates for notifications
- Roles and permissions (RBAC)
- Project methodologies and workflows
- Navigation menu structure
- Lookup tables (statuses, types)

**Total Seed Data Records:** 200+ records across 10 tables

---

## System Settings

**Source:** `v11_seed_data_system.sql`
**Table:** `system_settings`
**Total Settings:** 50+

### Settings by Category

#### Application Settings
| Key | Value | Description |
|-----|-------|-------------|
| app_name | "Project Nidus" | Application name |
| app_version | "1.0.0" | Current version |
| app_environment | "development" | Environment (development/staging/production) |
| app_tagline | "Multi-Methodology Project Management System" | Tagline |
| app_description | "Flexible project management platform..." | Description |

#### Date & Time Settings
| Key | Value | Description |
|-----|-------|-------------|
| default_timezone | "UTC" | Default timezone |
| default_date_format | "YYYY-MM-DD" | Date format |
| default_time_format | "HH:mm:ss" | Time format |
| default_datetime_format | "YYYY-MM-DD HH:mm:ss" | DateTime format |
| week_start_day | "monday" | First day of week |

#### Localization Settings
| Key | Value | Description |
|-----|-------|-------------|
| default_language | "en" | Language code |
| default_currency | "USD" | Currency code |
| decimal_separator | "." | Decimal separator |
| thousands_separator | "," | Thousands separator |
| currency_position | "before" | Currency symbol position |

#### Email Settings
| Key | Value | Description |
|-----|-------|-------------|
| smtp_enabled | false | Enable SMTP |
| smtp_host | "" | SMTP server |
| smtp_port | 587 | SMTP port |
| smtp_secure | true | Use TLS/SSL |
| smtp_from_email | "noreply@projectnidus.com" | FROM email |
| smtp_from_name | "Project Nidus" | FROM name |
| email_notifications_enabled | true | Enable email notifications |

#### Authentication Settings
| Key | Value | Description |
|-----|-------|-------------|
| password_min_length | 8 | Minimum password length |
| password_require_uppercase | true | Require uppercase letter |
| password_require_lowercase | true | Require lowercase letter |
| password_require_number | true | Require number |
| password_require_special | true | Require special character |
| session_timeout_minutes | 480 | Session timeout (8 hours) |
| max_login_attempts | 5 | Max failed login attempts |
| lockout_duration_minutes | 30 | Lockout duration |

#### Feature Flags
| Key | Value | Description |
|-----|-------|-------------|
| enable_project_templates | true | Project templates feature |
| enable_time_tracking | true | Time tracking feature |
| enable_resource_management | true | Resource management feature |
| enable_budget_tracking | true | Budget tracking feature |
| enable_document_management | true | Document management feature |
| enable_reporting | true | Reporting and analytics |
| enable_notifications | true | In-app notifications |
| enable_activity_feed | true | Activity feed |

#### UI Settings
| Key | Value | Description |
|-----|-------|-------------|
| default_theme | "light" | Default UI theme |
| items_per_page | 25 | Items per page in lists |
| enable_animations | true | UI animations |
| sidebar_default_state | "expanded" | Sidebar state |
| show_onboarding | true | Show onboarding tutorial |

#### Project Settings
| Key | Value | Description |
|-----|-------|-------------|
| auto_generate_project_code | true | Auto-generate project codes |
| project_code_prefix | "PRJ" | Project code prefix |
| project_code_length | 6 | Project code number length |
| default_project_privacy | "private" | Default project privacy |
| enable_project_approval | false | Require approval before creation |

#### Notification Settings
| Key | Value | Description |
|-----|-------|-------------|
| notification_retention_days | 90 | Days to retain notifications |
| batch_notifications | true | Batch similar notifications |
| notification_sound | true | Play sound for notifications |
| desktop_notifications | true | Enable desktop notifications |

#### File Upload Settings
| Key | Value | Description |
|-----|-------|-------------|
| max_file_size_mb | 50 | Maximum file size (MB) |
| allowed_file_types | ["pdf","doc","docx",...] | Allowed file types |
| enable_virus_scan | false | Enable virus scanning |

#### System Maintenance Settings
| Key | Value | Description |
|-----|-------|-------------|
| maintenance_mode | false | Maintenance mode |
| maintenance_message | "System is under maintenance..." | Maintenance message |
| backup_enabled | true | Enable automated backups |
| backup_frequency_hours | 24 | Backup frequency |
| log_retention_days | 90 | Log retention days |

---

## Email Templates

**Source:** `v11_seed_data_system.sql`
**Table:** `email_templates`
**Total Templates:** 6

### Template List

1. **welcome_user** - Welcome to Project Nidus
   - Subject: "Welcome to Project Nidus, {{user_name}}!"
   - Variables: user_name, user_email, created_date, app_url

2. **password_reset** - Password Reset Request
   - Subject: "Password Reset Request - Project Nidus"
   - Variables: user_name, reset_url, expiry_hours

3. **project_invitation** - Project Invitation
   - Subject: "You've been invited to join {{project_name}}"
   - Variables: user_name, invited_by, project_name, project_description, project_role, project_url

4. **task_assignment** - New Task Assignment
   - Subject: "You've been assigned to: {{task_name}}"
   - Variables: user_name, assigned_by, task_name, task_description, project_name, due_date, priority, task_url

5. **notification_digest** - Daily Notification Digest
   - Subject: "Your Project Nidus Daily Digest - {{notification_count}} notifications"
   - Variables: user_name, notification_count, notification_list_html, notification_list_text, notifications_url

6. **system_alert** - System Alert
   - Subject: "[{{alert_level}}] System Alert: {{alert_title}}"
   - Variables: alert_level, alert_title, alert_message, alert_time, alert_color

---

## Roles

**Source:** `v12_seed_data_rbac.sql`
**Table:** `roles`
**Total Roles:** 7

| Role Code | Role Name | Level | Description | Permissions |
|-----------|-----------|-------|-------------|-------------|
| system_admin | System Admin | 100 | Full system access | ALL (60+) |
| org_admin | Organization Admin | 80 | Organization-level administrator | Most except system-level |
| project_manager | Project Manager | 60 | Manages projects, teams, tasks | Projects, Tasks, Teams, Reports, Documents, Time |
| team_lead | Team Lead | 40 | Leads teams and manages tasks | Tasks (full), Teams (full), Projects (read), Reports (read), Time (full) |
| team_member | Team Member | 20 | Basic project participation | Tasks (basic), Projects (read), Teams (read), Documents (basic), Time (own) |
| stakeholder | Stakeholder | 10 | Read-only project access | Projects (read), Tasks (read), Teams (read), Reports (read), Documents (read) |
| viewer | Viewer | 5 | Minimal read-only access | Projects (read), Tasks (read), Reports (read) |

---

## Permissions

**Source:** `v12_seed_data_rbac.sql`
**Table:** `permissions`
**Total Permissions:** 60+

### Permissions by Module

#### Projects Module (10 permissions)
- project.create - Create Projects
- project.read - View Projects
- project.update - Edit Projects
- project.delete - Delete Projects
- project.archive - Archive Projects
- project.export - Export Projects
- project.manage_members - Manage Project Members
- project.manage_settings - Manage Project Settings
- project.view_budget - View Project Budget
- project.manage_budget - Manage Project Budget

#### Tasks Module (8 permissions)
- task.create - Create Tasks
- task.read - View Tasks
- task.update - Edit Tasks
- task.delete - Delete Tasks
- task.assign - Assign Tasks
- task.update_status - Update Task Status
- task.comment - Comment on Tasks
- task.view_all - View All Tasks

#### Teams Module (6 permissions)
- team.create - Create Teams
- team.read - View Teams
- team.update - Edit Teams
- team.delete - Delete Teams
- team.manage_members - Manage Team Members
- team.assign_roles - Assign Team Roles

#### Users Module (8 permissions)
- user.create - Create Users
- user.read - View Users
- user.update - Edit Users
- user.delete - Delete Users
- user.manage_roles - Manage User Roles
- user.manage_permissions - Manage User Permissions
- user.activate_deactivate - Activate/Deactivate Users
- user.reset_password - Reset User Password

#### Reports Module (7 permissions)
- report.create - Create Reports
- report.read - View Reports
- report.update - Edit Reports
- report.delete - Delete Reports
- report.export - Export Reports
- report.schedule - Schedule Reports
- report.view_analytics - View Analytics

#### System Module (6 permissions)
- system.settings - Manage System Settings
- system.audit - View Audit Logs
- system.backup - Manage Backups
- system.maintenance - System Maintenance
- system.monitor - System Monitoring
- system.manage_integrations - Manage Integrations

#### Settings Module (8 permissions)
- settings.read - View Settings
- settings.update - Edit Settings
- settings.manage_roles - Manage Roles
- settings.manage_permissions - Manage Permissions
- settings.manage_methodologies - Manage Methodologies
- settings.manage_workflows - Manage Workflows
- settings.manage_templates - Manage Templates
- settings.manage_menus - Manage Menus

#### Documents Module (5 permissions)
- document.create - Upload Documents
- document.read - View Documents
- document.update - Edit Documents
- document.delete - Delete Documents
- document.manage_versions - Manage Document Versions

#### Time Tracking Module (6 permissions)
- time.log - Log Time
- time.read - View Time Entries
- time.update - Edit Time Entries
- time.delete - Delete Time Entries
- time.approve - Approve Time Entries
- time.view_all - View All Time Entries

---

## Role-Permission Mappings

**Source:** `v12_seed_data_rbac.sql`
**Table:** `role_permissions`

### System Admin
- **Permissions:** ALL (60+)
- **Access Level:** Full system access

### Organization Admin
- **Permissions:** Most permissions except:
  - system.settings
  - system.backup
  - system.maintenance
  - settings.manage_permissions
- **Access Level:** Organization-wide management

### Project Manager
- **Modules:** Projects, Tasks, Teams, Reports, Documents, Time, Settings (read-only)
- **Access Level:** Full project management

### Team Lead
- **Modules:**
  - Tasks: Full access
  - Teams: Full access
  - Projects: Read only
  - Reports: Read only (projects, time)
  - Documents: Read and create
  - Time: Full access
- **Access Level:** Team and task management

### Team Member
- **Modules:**
  - Tasks: Create, read, update own, comment
  - Projects: Read only
  - Teams: Read only
  - Documents: Read and create
  - Time: Log and manage own
- **Access Level:** Basic participation

### Stakeholder
- **Modules:**
  - Projects: Read, view budget
  - Tasks: Read
  - Teams: Read
  - Reports: Read
  - Documents: Read
- **Access Level:** Read-only project oversight

### Viewer
- **Modules:**
  - Projects: Read
  - Tasks: Read
  - Reports: Read
- **Access Level:** Minimal read access

---

## Methodologies

**Source:** `v13_seed_data_methodologies.sql`
**Table:** `methodologies`
**Total Methodologies:** 5

### 1. Structured PM (Traditional/Waterfall)
- **Code:** structured_pm
- **Category:** Traditional
- **Color:** #1E3A8A (Blue)
- **Features:**
  - ✓ Supports Gantt Charts
  - ✓ Supports Stages/Phases
  - ✗ Sprints
  - ✗ Kanban
- **Default Phases:**
  1. Initiation
  2. Planning
  3. Execution
  4. Monitoring & Control
  5. Closure
- **Best For:** Projects with well-defined requirements, formal governance, sequential phases

### 2. Scrum (Agile)
- **Code:** scrum
- **Category:** Agile
- **Color:** #059669 (Green)
- **Default Methodology:** Yes
- **Features:**
  - ✓ Supports Sprints
  - ✗ Kanban
  - ✗ Gantt
  - ✗ Stages
- **Sprint Duration:** 2 weeks
- **Ceremonies:**
  - Sprint Planning (4 hours)
  - Daily Standup (15 minutes)
  - Sprint Review (2 hours)
  - Sprint Retrospective (1.5 hours)
- **Roles:** Product Owner, Scrum Master, Development Team
- **Artifacts:** Product Backlog, Sprint Backlog, Increment
- **Best For:** Software development, frequent inspection and adaptation

### 3. Kanban (Agile)
- **Code:** kanban
- **Category:** Agile
- **Color:** #EA580C (Orange)
- **Features:**
  - ✓ Supports Kanban Board
  - ✗ Sprints
  - ✗ Gantt
  - ✗ Stages
- **Default Columns:**
  1. Backlog (no WIP limit)
  2. To Do (WIP: 5)
  3. In Progress (WIP: 3)
  4. Review (WIP: 2)
  5. Done (no WIP limit)
- **Metrics:** Lead Time, Cycle Time, Throughput
- **Classes of Service:** Expedite, Standard, Fixed Date, Intangible
- **Best For:** Continuous delivery, support teams, operations

### 4. Agile Hybrid (Mixed Agile)
- **Code:** agile_hybrid
- **Category:** Hybrid
- **Color:** #7C3AED (Purple)
- **Features:**
  - ✓ Supports Sprints
  - ✓ Supports Kanban
  - ✗ Gantt
  - ✗ Stages
- **Sprint Duration:** 2 weeks (optional)
- **Flexibility:** High
- **Best For:** Teams needing flexibility between Scrum and Kanban

### 5. Hybrid PM (Traditional + Agile)
- **Code:** hybrid_pm
- **Category:** Hybrid
- **Color:** #DB2777 (Pink)
- **Features:**
  - ✓ Supports Sprints
  - ✓ Supports Kanban
  - ✓ Supports Gantt
  - ✓ Supports Stages
- **Phases:**
  1. Planning (Traditional)
  2. Design (Traditional)
  3. Execution (Agile)
  4. Closure (Traditional)
- **Best For:** Large enterprise projects, regulated industries, fixed budget/timeline with agile delivery

---

## Workflows

**Source:** `v13_seed_data_methodologies.sql`
**Table:** `workflows`
**Total Workflows:** 4

### 1. Standard Project Workflow
- **Code:** standard_project
- **Type:** project
- **Methodology:** Universal
- **Default:** Yes
- **Steps:**
  1. Draft → Planning
  2. Planning → Active or back to Draft
  3. Active → On Hold, Completed, or Cancelled
  4. On Hold → Active or Cancelled
  5. Completed → Closed
  6. Cancelled → Closed
  7. Closed (final)

### 2. Agile Sprint Workflow
- **Code:** agile_sprint
- **Type:** sprint
- **Methodology:** Scrum
- **Steps:**
  1. Planning → In Progress
  2. In Progress → Review or Cancelled
  3. Review → Retrospective
  4. Retrospective → Completed
  5. Cancelled (final)
  6. Completed (final)

### 3. Stage-Gate Workflow
- **Code:** stage_gate
- **Type:** project
- **Methodology:** Structured PM
- **Steps:**
  1. Ideation → Gate 1 → Scoping
  2. Scoping → Gate 2 → Business Case or Rejected
  3. Business Case → Gate 3 → Development or Rejected
  4. Development → Gate 4 → Testing
  5. Testing → Gate 5 → Launch or back to Development
  6. Launch (final)
  7. Rejected (final)

### 4. Approval Workflow
- **Code:** approval
- **Type:** approval
- **Methodology:** Universal
- **Steps:**
  1. Draft → Submitted
  2. Submitted → Under Review or Withdraw
  3. Under Review → Approved, Rejected, or Changes Requested
  4. Changes Requested → Draft or Resubmit
  5. Approved (final)
  6. Rejected (final)

---

## Menu Structure

**Source:** `v14_seed_data_menus.sql`
**Table:** `menu_items`
**Total Menu Items:** 35+

### Top-Level Menus

1. **Dashboard** (/)
   - Icon: layout-dashboard
   - Color: #3B82F6

2. **Projects** (/projects)
   - Icon: folder-kanban
   - Color: #10B981
   - Submenus:
     - All Projects
     - My Projects
     - New Project
     - Archived Projects
     - Project Templates

3. **Tasks** (/tasks)
   - Icon: list-checks
   - Color: #F59E0B
   - Submenus:
     - All Tasks
     - My Tasks
     - Task Board (Kanban)
     - Task Calendar
     - Gantt Chart

4. **Teams** (/teams)
   - Icon: users
   - Color: #8B5CF6
   - Submenus:
     - All Teams
     - My Teams
     - Team Directory
     - Workload View

5. **Reports** (/reports)
   - Icon: chart-bar
   - Color: #EC4899
   - Submenus:
     - Reports Dashboard
     - Project Reports
     - Resource Reports
     - Time Reports
     - Budget Reports
     - Custom Reports

6. **Administration** (/admin)
   - Icon: settings
   - Color: #6B7280
   - Submenus:
     - Users
     - Roles & Permissions
     - Methodologies
     - Workflows
     - System Settings
     - Audit Logs
     - Activity Logs
     - Integrations

### Role-Based Menu Visibility

| Menu | System Admin | Org Admin | PM | Team Lead | Member | Stakeholder | Viewer |
|------|--------------|-----------|----|-----------| -------|-------------|--------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Projects (all) | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Projects (my) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tasks | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Teams | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Reports | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Administration | ✓ | ✓ (partial) | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## Project Statuses

**Source:** `v15_seed_data_lookups.sql`
**Table:** `project_statuses`
**Total Statuses:** 9

| Code | Name | Category | Color | Icon | Description |
|------|------|----------|-------|------|-------------|
| draft | Draft | planning | #6B7280 | file-pen | Project is being drafted |
| planning | Planning | planning | #3B82F6 | clipboard-list | Project is in planning phase |
| active | Active | in_progress | #10B981 | play-circle | Project is active |
| on_hold | On Hold | paused | #F59E0B | pause-circle | Project is temporarily paused |
| at_risk | At Risk | in_progress | #EF4444 | alert-triangle | Project requires attention |
| under_review | Under Review | review | #8B5CF6 | magnifying-glass | Project is under review |
| completed | Completed | completed | #14B8A6 | check-circle | Project completed successfully |
| cancelled | Cancelled | cancelled | #DC2626 | x-circle | Project has been cancelled |
| closed | Closed | archived | #9CA3AF | archive | Project is closed and archived |

**Default Status:** Draft

---

## Project Types

**Source:** `v15_seed_data_lookups.sql`
**Table:** `project_types`
**Total Types:** 10

| Code | Name | Category | Color | Icon | Description |
|------|------|----------|-------|------|-------------|
| internal | Internal Project | internal | #3B82F6 | building | Internal company projects |
| client | Client Project | external | #10B981 | user-tie | Client-facing projects |
| research | Research & Development | innovation | #8B5CF6 | flask | R&D initiatives |
| maintenance | Maintenance | operations | #F59E0B | wrench | System maintenance projects |
| strategic | Strategic Initiative | strategic | #EF4444 | chess | Strategic company initiatives |
| product | Product Development | innovation | #EC4899 | box | New product development |
| infrastructure | Infrastructure | technical | #6366F1 | server | IT infrastructure projects |
| process | Process Improvement | operational | #14B8A6 | chart-line-up | Business process improvement |
| marketing | Marketing Campaign | business | #F97316 | megaphone | Marketing campaigns |
| training | Training & Development | development | #06B6D4 | graduation-cap | Training and development |

**Default Type:** Internal Project

---

## Customization Guide

### Adding New System Settings

```sql
INSERT INTO system_settings (
    setting_category,
    setting_key,
    setting_value,
    setting_type,
    setting_description,
    is_public,
    is_system
)
VALUES (
    'your_category',
    'your_setting_key',
    '"your_value"',
    'string',  -- or 'number', 'boolean', 'json'
    'Description of your setting',
    true,      -- visible to users
    false      -- not a system-critical setting
);
```

### Adding New Email Templates

```sql
INSERT INTO email_templates (
    template_code,
    template_name,
    template_category,
    subject_template,
    body_template_html,
    body_template_text,
    template_variables,
    is_active
)
VALUES (
    'your_template_code',
    'Your Template Name',
    'category',
    'Email Subject with {{variable}}',
    '<html>HTML body with {{variables}}</html>',
    'Text body with {{variables}}',
    '{"variable": "Description"}',
    true
);
```

### Adding New Permissions

```sql
INSERT INTO permissions (
    permission_code,
    permission_name,
    permission_description,
    permission_category,
    permission_module,
    permission_type,
    is_active
)
VALUES (
    'module.action',
    'Permission Name',
    'Description of what this permission allows',
    'category',
    'module',
    'create',  -- or 'read', 'update', 'delete', 'execute'
    true
);
```

### Adding New Project Statuses

```sql
INSERT INTO project_statuses (
    status_code,
    status_name,
    status_description,
    status_category,
    status_color,
    status_icon,
    sort_order,
    is_active
)
VALUES (
    'your_status',
    'Your Status',
    'Status description',
    'category',
    '#HEXCOLOR',
    'icon-name',
    10,
    true
);
```

### Adding New Menu Items

```sql
-- Top-level menu
INSERT INTO menu_items (
    menu_code,
    menu_label,
    menu_description,
    parent_menu_id,
    menu_level,
    sort_order,
    route_path,
    menu_icon,
    menu_color,
    is_visible,
    is_active
)
VALUES (
    'your_menu',
    'Your Menu',
    'Menu description',
    NULL,  -- top-level
    1,
    7,  -- after Administration
    '/your-route',
    'icon-name',
    '#HEXCOLOR',
    true,
    true
);
```

---

**End of Seed Data Reference**
