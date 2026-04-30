# Cursor AI Prompt: Best-Practice PMO Sidebar Menu for PMIS

## Context
I am building a **Project Management Information System (PMIS)** for a PMO user. The system will use:

- **Frontend:** React
- **Styling:** Tailwind CSS
- **Backend/Database/Auth:** Supabase

I need a **best-practice PMO sidebar menu** with **10–15 main menu categories**. The sidebar should be designed for PMO users who need executive visibility, portfolio/programme oversight, project governance, controls, reporting, workflows, and administration.

The sidebar must be scalable, configurable, role-based, and suitable for a professional PMO environment.

---

# Objective
Build a fully functional, configurable PMO sidebar menu for the PMIS.

The sidebar must include:

- 13 main PMO menu categories
- Nested submenu items under each category
- Collapsible menu groups
- Active route highlighting
- Role-based menu visibility using Supabase
- Admin-configurable menu structure
- Desktop expanded sidebar view
- Mobile collapsible drawer view
- Clean Tailwind UI styling
- Future scalability for additional PMIS modules

---

# Recommended PMO Sidebar Categories

## 1. Executive Overview
**Purpose:** Provide PMO leaders with a command-center view of the full portfolio, key alerts, and executive-level KPIs.

### Submenus
- PMO Dashboard
- Portfolio Health Summary
- Executive Alerts
- Strategic KPI Overview
- Critical Decisions Required
- Upcoming Governance Events

---

## 2. Portfolio & Programme Management
**Purpose:** Manage portfolios, programmes, strategic alignment, investment prioritisation, and benefits delivery.

### Submenus
- Portfolio Register
- Programme Register
- Strategic Alignment
- Benefits Pipeline
- Investment Prioritisation
- Portfolio Roadmap

---

## 3. Project Oversight
**Purpose:** Monitor active projects, project status, escalations, exceptions, and projects requiring PMO intervention.

### Submenus
- Active Projects
- Project Health Reviews
- Project Status Overview
- Escalation Dashboard
- Intervention Queue
- Project Exceptions

---

## 4. Delivery Controls
**Purpose:** Manage project delivery controls including scope, schedule, milestones, dependencies, baselines, and delivery performance.

### Submenus
- Scope Control
- Schedule Control
- Milestone Tracking
- Dependency Management
- Baseline Governance
- Delivery Performance

---

## 5. Financial & Commercial Management
**Purpose:** Track project and portfolio financials, budgets, forecasts, procurement, vendors, and commercial exposure.

### Submenus
- Budget Overview
- Cost Performance
- Forecasts
- Procurement Register
- Vendor Management
- Commercial Risks

---

## 6. Risk, Issues & Quality
**Purpose:** Manage risks, issues, quality assurance, audit findings, corrective actions, and preventive actions.

### Submenus
- Risk Register
- Enterprise Risks
- Issue Register
- Quality Assurance
- Audit Findings
- Corrective & Preventive Actions

---

## 7. Governance & Standards
**Purpose:** Maintain the PMO framework, policies, templates, methodology standards, gates, and checkpoints.

### Submenus
- PMO Framework
- Methodology Standards
- Governance Gates
- Policy Library
- Project Lifecycle Standards
- Compliance Checks

---

## 8. Reporting & Intelligence
**Purpose:** Provide standard reports, executive packs, portfolio analytics, project intelligence, and performance reporting.

### Submenus
- Standard Reports
- Executive Reports
- Portfolio Analytics
- Programme Reports
- Project Performance Reports
- Report Builder

---

## 9. Workflows & Approvals
**Purpose:** Manage workflow tasks, pending approvals, decision logs, change approvals, and governance approvals.

### Submenus
- Pending Approvals
- Workflow Tasks
- Decision Log
- Change Approvals
- Stage Gate Approvals
- Draft Submissions

---

## 10. People & Stakeholders
**Purpose:** Manage resource oversight, stakeholder registers, accountability views, communication oversight, and team capacity.

### Submenus
- Resource Overview
- Stakeholder Register
- Role & Accountability Matrix
- Communications Overview
- Team Capacity
- Stakeholder Engagement

---

## 11. Knowledge & Assets
**Purpose:** Manage PMO knowledge, templates, playbooks, reusable artifacts, lessons learned, and organizational learning.

### Submenus
- Template Library
- Lessons Learned
- Playbooks
- Reusable Artifacts
- Best Practice Library
- PMO Knowledge Base

---

## 12. Audit Trail & Compliance
**Purpose:** Provide traceability, accountability, compliance evidence, access logs, change history, and approval history.

### Submenus
- Activity Logs
- Change History
- Approval History
- Document Version History
- Compliance Evidence
- User Access Logs

---

## 13. PMO Administration
**Purpose:** Allow PMO administrators to configure the PMIS, manage master data, menu access, role-based permissions, and organizational settings.

### Submenus
- Organisation Settings
- Role-Based Access
- Master Data
- PMO Configuration
- Menu Configuration
- Approval Rules

---

# Recommended Final Sidebar Order
Use the sidebar in the following order:

1. Executive Overview
2. Portfolio & Programme Management
3. Project Oversight
4. Delivery Controls
5. Financial & Commercial Management
6. Risk, Issues & Quality
7. Governance & Standards
8. Reporting & Intelligence
9. Workflows & Approvals
10. People & Stakeholders
11. Knowledge & Assets
12. Audit Trail & Compliance
13. PMO Administration

This order follows a logical PMO operating model:

**Executive visibility → Portfolio/programme oversight → Project control → Financials → Risk/quality → Governance → Reporting → Workflows → People → Knowledge → Compliance → Administration**

---

# Functional Requirements

## 1. Sidebar UI Requirements
Create a professional PMO sidebar component using React and Tailwind CSS.

The sidebar must:

- Display main categories with icons
- Display nested submenu items
- Support expandable/collapsible categories
- Highlight the active route
- Support collapsed icon-only mode on desktop
- Support drawer-style navigation on mobile
- Allow smooth transitions and animations
- Show tooltips when collapsed
- Support light and dark mode styling
- Be responsive across desktop, tablet, and mobile

---

## 2. Role-Based Visibility Requirements
The sidebar must show or hide menu categories and menu items based on the logged-in user’s role and permissions from Supabase.

Examples of roles:

- PMO Admin
- PMO Director
- Portfolio Manager
- Programme Manager
- Project Manager
- Executive Viewer
- Governance Officer
- Finance Controller
- Risk Manager
- Auditor

Each menu item must support permission-based visibility such as:

- view_dashboard
- view_portfolio
- manage_portfolio
- view_projects
- manage_projects
- view_financials
- manage_financials
- view_risks
- manage_risks
- view_governance
- manage_governance
- view_reports
- manage_reports
- view_admin
- manage_admin

---

## 3. Supabase Database Requirements
Create Supabase tables to make the sidebar configurable.

### Table: pmo_sidebar_categories
Fields:

- id UUID primary key default gen_random_uuid()
- name TEXT not null
- description TEXT
- icon TEXT
- display_order INTEGER not null
- is_active BOOLEAN default true
- required_permission TEXT nullable
- created_at TIMESTAMPTZ default now()
- updated_at TIMESTAMPTZ default now()

### Table: pmo_sidebar_items
Fields:

- id UUID primary key default gen_random_uuid()
- category_id UUID references pmo_sidebar_categories(id) on delete cascade
- name TEXT not null
- route_path TEXT not null
- description TEXT
- display_order INTEGER not null
- is_active BOOLEAN default true
- required_permission TEXT nullable
- created_at TIMESTAMPTZ default now()
- updated_at TIMESTAMPTZ default now()

### Table: pmo_roles
Fields:

- id UUID primary key default gen_random_uuid()
- name TEXT not null unique
- description TEXT
- is_active BOOLEAN default true
- created_at TIMESTAMPTZ default now()
- updated_at TIMESTAMPTZ default now()

### Table: pmo_permissions
Fields:

- id UUID primary key default gen_random_uuid()
- permission_key TEXT not null unique
- name TEXT not null
- description TEXT
- created_at TIMESTAMPTZ default now()
- updated_at TIMESTAMPTZ default now()

### Table: pmo_role_permissions
Fields:

- id UUID primary key default gen_random_uuid()
- role_id UUID references pmo_roles(id) on delete cascade
- permission_id UUID references pmo_permissions(id) on delete cascade
- created_at TIMESTAMPTZ default now()

### Table: pmo_user_roles
Fields:

- id UUID primary key default gen_random_uuid()
- user_id UUID references auth.users(id) on delete cascade
- role_id UUID references pmo_roles(id) on delete cascade
- created_at TIMESTAMPTZ default now()

---

# Recommended Routes

Use these route paths for the menu items.

## Executive Overview
- /pmo/dashboard
- /pmo/portfolio-health
- /pmo/executive-alerts
- /pmo/strategic-kpis
- /pmo/critical-decisions
- /pmo/governance-events

## Portfolio & Programme Management
- /pmo/portfolios
- /pmo/programmes
- /pmo/strategic-alignment
- /pmo/benefits-pipeline
- /pmo/investment-prioritisation
- /pmo/portfolio-roadmap

## Project Oversight
- /pmo/projects
- /pmo/project-health-reviews
- /pmo/project-status
- /pmo/escalations
- /pmo/intervention-queue
- /pmo/project-exceptions

## Delivery Controls
- /pmo/scope-control
- /pmo/schedule-control
- /pmo/milestones
- /pmo/dependencies
- /pmo/baselines
- /pmo/delivery-performance

## Financial & Commercial Management
- /pmo/budgets
- /pmo/cost-performance
- /pmo/forecasts
- /pmo/procurement
- /pmo/vendors
- /pmo/commercial-risks

## Risk, Issues & Quality
- /pmo/risks
- /pmo/enterprise-risks
- /pmo/issues
- /pmo/quality-assurance
- /pmo/audit-findings
- /pmo/capa

## Governance & Standards
- /pmo/framework
- /pmo/methodology-standards
- /pmo/governance-gates
- /pmo/policies
- /pmo/lifecycle-standards
- /pmo/compliance-checks

## Reporting & Intelligence
- /pmo/reports
- /pmo/executive-reports
- /pmo/portfolio-analytics
- /pmo/programme-reports
- /pmo/project-performance-reports
- /pmo/report-builder

## Workflows & Approvals
- /pmo/pending-approvals
- /pmo/workflow-tasks
- /pmo/decision-log
- /pmo/change-approvals
- /pmo/stage-gate-approvals
- /pmo/draft-submissions

## People & Stakeholders
- /pmo/resources
- /pmo/stakeholders
- /pmo/role-accountability
- /pmo/communications
- /pmo/team-capacity
- /pmo/stakeholder-engagement

## Knowledge & Assets
- /pmo/templates
- /pmo/lessons-learned
- /pmo/playbooks
- /pmo/reusable-artifacts
- /pmo/best-practice-library
- /pmo/knowledge-base

## Audit Trail & Compliance
- /pmo/activity-logs
- /pmo/change-history
- /pmo/approval-history
- /pmo/document-version-history
- /pmo/compliance-evidence
- /pmo/user-access-logs

## PMO Administration
- /pmo/organisation-settings
- /pmo/role-access
- /pmo/master-data
- /pmo/configuration
- /pmo/menu-configuration
- /pmo/approval-rules

---

# React Component Requirements

Create the following components:

## Components

- `PMOSidebar.tsx`
- `SidebarCategory.tsx`
- `SidebarItem.tsx`
- `SidebarTooltip.tsx`
- `MobileSidebarDrawer.tsx`
- `SidebarToggleButton.tsx`
- `usePMOSidebar.ts`
- `useUserPermissions.ts`

---

# Suggested TypeScript Interfaces

```ts
export interface PMOSidebarCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  required_permission?: string | null;
  items?: PMOSidebarItem[];
}

export interface PMOSidebarItem {
  id: string;
  category_id: string;
  name: string;
  route_path: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  required_permission?: string | null;
}

export interface UserPermission {
  permission_key: string;
}
```

---

# Supabase Query Requirements

The sidebar must fetch active categories and items from Supabase.

Requirements:

- Fetch only active categories where `is_active = true`
- Fetch only active items where `is_active = true`
- Sort categories by `display_order`
- Sort submenu items by `display_order`
- Filter categories and items based on user permissions
- Cache sidebar data where appropriate
- Handle loading and error states

---

# Example Supabase Query Logic

```ts
const { data, error } = await supabase
  .from('pmo_sidebar_categories')
  .select(`
    id,
    name,
    description,
    icon,
    display_order,
    is_active,
    required_permission,
    pmo_sidebar_items (
      id,
      category_id,
      name,
      route_path,
      description,
      display_order,
      is_active,
      required_permission
    )
  `)
  .eq('is_active', true)
  .order('display_order', { ascending: true });
```

After fetching, filter items where:

- `is_active === true`
- required_permission is null, or
- user has the required permission

---

# Tailwind Styling Requirements

The sidebar should have:

- Professional PMO-style layout
- Clean spacing
- Clear hierarchy
- Rounded active states
- Hover states
- Smooth expand/collapse transitions
- Sticky left navigation on desktop
- Mobile drawer overlay
- Icons beside main categories
- Smaller nested submenu text
- Active submenu highlight
- Optional badge support for alerts and approvals

Suggested visual style:

- Dark sidebar option: `bg-slate-950 text-slate-100`
- Light content area compatibility
- Active item: `bg-blue-600 text-white`
- Hover item: `hover:bg-slate-800`
- Submenu text: `text-slate-300`
- Section label: `text-xs uppercase tracking-wide text-slate-400`

---

# Icon Recommendations

Use `lucide-react` icons.

Recommended icon mapping:

- Executive Overview: LayoutDashboard
- Portfolio & Programme Management: BriefcaseBusiness
- Project Oversight: ClipboardList
- Delivery Controls: SlidersHorizontal
- Financial & Commercial Management: CircleDollarSign
- Risk, Issues & Quality: ShieldAlert
- Governance & Standards: Landmark
- Reporting & Intelligence: BarChart3
- Workflows & Approvals: GitPullRequestArrow
- People & Stakeholders: Users
- Knowledge & Assets: Library
- Audit Trail & Compliance: FileSearch
- PMO Administration: Settings

---

# Menu Configuration Admin Requirements

Build a PMO admin configuration screen that allows authorised PMO admins to:

- View all sidebar categories
- Create new menu categories
- Edit category name, description, icon, display order, and active status
- View all submenu items under a category
- Create new submenu items
- Edit submenu name, route path, description, display order, permission, and active status
- Enable/disable categories
- Enable/disable submenu items
- Reorder categories and submenu items
- Assign required permissions to menu items

Only users with `manage_admin` or `manage_menu_configuration` permission should access this screen.

---

# Seed Data Requirement

Create seed data for the 13 categories and all submenu items listed above.

The seed data should populate:

- `pmo_sidebar_categories`
- `pmo_sidebar_items`
- `pmo_permissions`
- `pmo_roles`
- `pmo_role_permissions`

Create a default `PMO Admin` role with full access to all sidebar items.

---

# Security Requirements

Implement Supabase Row Level Security policies.

Requirements:

- Only authenticated users can view sidebar categories and items
- Only users with PMO admin permissions can create, update, or deactivate menu categories and items
- Users must only see menu items they are authorised to access
- Do not expose admin-only routes to unauthorised users
- Redirect unauthorised users to an access denied page

---

# UX Requirements

The sidebar should support:

- Search/filter menu items
- Collapsed mode
- Expanded mode
- Mobile drawer mode
- Tooltips when collapsed
- Active parent category expansion when a child route is active
- Badge count support for alerts, approvals, risks, issues, and pending decisions

Example badges:

- Executive Alerts: number of critical alerts
- Pending Approvals: number of items awaiting approval
- Risks: number of high risks
- Issues: number of open critical issues
- Intervention Queue: number of projects requiring PMO intervention

---

# Deliverables Expected from Cursor AI

Generate the following:

1. Supabase SQL migration script for all sidebar-related tables
2. Supabase RLS policies
3. Seed data for the 13 PMO sidebar categories and submenu items
4. React sidebar components
5. Tailwind styling
6. TypeScript interfaces
7. Hooks for fetching sidebar data and user permissions
8. Role-based menu filtering logic
9. Mobile sidebar drawer
10. Menu configuration admin page
11. Access denied page
12. Example route setup
13. Basic test cases for sidebar behaviour

---

# Acceptance Criteria

The implementation is complete when:

- PMO users can see a professional sidebar menu with 13 main categories
- Menu items are grouped under the correct PMO categories
- Categories can expand and collapse
- Active route is visually highlighted
- Sidebar works on desktop and mobile
- Sidebar data is stored in Supabase
- PMO admins can configure the menu
- Menu visibility is controlled by role and permissions
- Unauthorised users cannot view restricted menu items
- The UI is clean, scalable, and suitable for a PMO-level PMIS

---

# Important Design Principle

The sidebar must not simply be a list of project management forms. It must represent a **PMO operating model** that supports:

- Executive decision-making
- Portfolio and programme governance
- Project oversight
- Delivery assurance
- Financial control
- Risk, issue, and quality management
- Governance standards
- Reporting intelligence
- Workflow approvals
- Stakeholder and resource oversight
- Knowledge management
- Compliance and auditability
- PMO system administration

