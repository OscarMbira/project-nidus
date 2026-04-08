# Comprehensive Sidebar Menu Implementation Plan
## Organization Admin Platform Features

**Created:** 2025-12-17
**Status:** ✅ Core Implementation Complete
**Target:** Complete implementation of all 14 primary menu modules with full CRUD functionality

---

## Executive Summary

This plan implements all features shown in the Organization Admin sidebar menu (image: `Developer Images\Org_Admin Sidebar Menu v1.png`). The implementation follows a modular approach, ensuring each feature is self-contained, database-backed, permission-controlled, and fully integrated with the existing Platform application.

### Scope: 14 Primary Modules

1. ✅ **Dashboard** - ✅ Complete (all components and services implemented)
2. ✅ **Projects** - ✅ Enhanced with service, filtering, and platform-app integration
3. ✅ **Tasks** - ✅ Enhanced with service, filtering, and platform-app integration
4. ✅ **Teams** - ✅ Core implementation complete (list, directory, service)
5. ✅ **Reports & Analytics** - ✅ Service updated, page created, routes configured
6. ✅ **Governance** - ✅ Basic implementation with audit log, routes configured
7. ✅ **Portfolio** - ✅ Enhanced with service integration, routes configured
8. ✅ **Programme** - ✅ Enhanced with service integration, routes configured
9. ✅ **Dependencies** - ✅ Enhanced with service integration, routes configured
10. ✅ **Benefits** - ✅ Enhanced with service integration, routes configured
11. ✅ **Strategy** - ✅ Enhanced with service integration, routes configured
12. ✅ **Quality** - ✅ Basic implementation complete, routes configured
13. ✅ **Stakeholders** - ✅ Basic implementation complete, routes configured
14. ✅ **Organization Admin** - ✅ Enhanced with account management, routes configured

---

## Implementation Strategy

### Phase-Based Approach

**Phase 1: Foundation & Quick Wins (Modules 1-5)**
- Dashboard enhancement
- Projects completion
- Tasks integration
- Teams module (new)
- Reports & Analytics

**Phase 2: Advanced PM Modules (Modules 6-10)**
- Governance (new)
- Portfolio
- Programme
- Dependencies
- Benefits

**Phase 3: Strategic & Quality Modules (Modules 11-13)**
- Strategy
- Quality
- Stakeholders

**Phase 4: Administrative Module (Module 14)**
- Organization Admin

---

## Architecture Principles

### 1. Database Schema Convention
- All tables in `public` schema (Platform domain)
- Table naming: `{module_name}_{entity}` (e.g., `portfolio_items`, `governance_policies`)
- All tables registered in `database_tables` registry
- RLS policies for multi-tenant security
- Audit columns: `created_at`, `updated_at`, `created_by`, `updated_by`

### 2. Folder Structure
```
src/
  pages/
    platform-app/           # Main Platform application pages
      dashboard/
      projects/
      tasks/
      teams/
      reports/
      governance/
      portfolio/
      programme/
      dependencies/
      benefits/
      strategy/
      quality/
      stakeholders/
      organization-admin/

  components/
    app/                    # Platform-specific components
      dashboard/
      projects/
      tasks/
      teams/
      reports/
      governance/
      portfolio/
      programme/
      dependencies/
      benefits/
      strategy/
      quality/
      stakeholders/
      org-admin/

  services/
    dashboardService.js
    projectService.js
    taskService.js
    teamService.js
    reportService.js
    governanceService.js
    portfolioService.js
    programmeService.js
    dependencyService.js
    benefitsService.js
    strategyService.js
    qualityService.js
    stakeholderService.js
    orgAdminService.js

SQL/
  v138_module_name_tables.sql
  v139_module_name_permissions.sql
  v140_module_name_rls_policies.sql
  ...

Documentation/
  Module_Name_User_Guide.md
  Module_Name_Implementation.md
```

### 3. Component Patterns
- All components theme-aware (dark mode default)
- Progressive Web App (PWA) optimized
- Responsive design for mobile
- Consistent form validation
- Success/error notifications with record details
- Multi-step flows where applicable
- Loading states and error boundaries

### 4. Permission System
- Each module has view/create/edit/delete permissions
- Permissions checked at: Menu level, Route level, Component level
- Organization-level permissions for admin features
- Project-level permissions for project-specific features
- Role-based access control (RBAC)

### 5. Menu Integration
- Update `pmMenuConfig.js` with all menu items
- Add icons from lucide-react
- Define permission requirements
- Create submenu structures
- Implement dynamic menu filtering

---

## Detailed Module Breakdown

## MODULE 1: Dashboard ✅ (Complete)

### Current State
- ✅ Dashboard fully implemented at `/platform/dashboard`
- ✅ All components created: ExecutiveSummary, QuickActions, ActivityFeed, KPICards, ProjectHealthChart, BudgetBurnRate, RiskHeatMap, ResourceAllocationChart
- ✅ Service methods implemented in dashboardService.js
- ✅ All features working: Executive Summary, KPIs, Charts, Recent Activity

### Enhancement Requirements

#### Database Tables
```sql
-- No new tables needed, aggregate existing data
-- Create materialized views for performance
```

#### Features to Add
1. **Executive Summary Section**
   - Total projects (active, completed, on-hold)
   - Total tasks (by status)
   - Resource utilization summary
   - Budget vs. actual spend
   - Risk exposure summary

2. **Quick Actions Panel**
   - Create new project
   - Create new task
   - View notifications
   - Access reports

3. **Recent Activity Feed**
   - Project updates
   - Task completions
   - Risk escalations
   - Team member activities

4. **Key Performance Indicators (KPIs)**
   - Project health scores
   - On-time delivery rate
   - Budget variance
   - Resource efficiency
   - Benefits realization %

5. **Charts & Visualizations**
   - Project status distribution (pie chart)
   - Timeline view of milestones
   - Budget burn rate (line chart)
   - Risk heat map
   - Resource allocation (bar chart)

#### Components to Create
- `src/components/app/dashboard/ExecutiveSummary.jsx`
- `src/components/app/dashboard/QuickActions.jsx`
- `src/components/app/dashboard/ActivityFeed.jsx`
- `src/components/app/dashboard/KPICards.jsx`
- `src/components/app/dashboard/ProjectHealthChart.jsx`
- `src/components/app/dashboard/BudgetBurnRate.jsx`
- `src/components/app/dashboard/RiskHeatMap.jsx`
- `src/components/app/dashboard/ResourceAllocationChart.jsx`

#### Service Methods
- `dashboardService.getExecutiveSummary(organizationId)`
- `dashboardService.getRecentActivity(organizationId, limit)`
- `dashboardService.getKPIs(organizationId)`
- `dashboardService.getProjectHealthData(organizationId)`
- `dashboardService.getBudgetBurnRate(organizationId, projectId?)`
- `dashboardService.getRiskHeatMapData(organizationId)`
- `dashboardService.getResourceAllocationData(organizationId)`

#### SQL Files
- `v138_dashboard_materialized_views.sql` - Performance optimization views

#### Routes
- `/platform/dashboard` - Enhanced main dashboard

---

## MODULE 2: Projects ✅ (Completion)

### Current State
- Projects module partially implemented
- Create/view/edit functionality exists
- Needs completion and enhancement

### Completion Requirements

#### Database Tables
```sql
-- Existing tables
projects
project_memberships
project_roles
project_invitations

-- Tables to create
project_milestones
project_budgets
project_baselines
project_logs
project_archives
```

#### Features to Add
1. **My Projects View**
   - List of user's assigned projects
   - Filter by status, priority, date
   - Search functionality
   - Card and table view toggle

2. **All Projects View**
   - Organization-wide project list (permission-based)
   - Advanced filtering
   - Bulk actions
   - Export to CSV/PDF

3. **Project Detail View**
   - Overview tab (summary, status, key dates)
   - Team tab (members, roles, allocation)
   - Tasks tab (integrated task list)
   - Budget tab (planned vs. actual)
   - Documents tab (file management)
   - Timeline tab (Gantt chart)
   - Risks tab (risk register)
   - Issues tab (issue tracker)

4. **Project Creation Wizard**
   - Step 1: Basic information
   - Step 2: Schedule & budget
   - Step 3: Team setup
   - Step 4: Methodology selection
   - Step 5: Templates & configuration

5. **Project Templates**
   - Save project as template
   - Create from template
   - Template library
   - Industry-specific templates

6. **Project Archiving**
   - Archive completed projects
   - Restore archived projects
   - Archive search & filter

#### Components to Create
- `src/components/app/projects/ProjectCard.jsx`
- `src/components/app/projects/ProjectList.jsx`
- `src/components/app/projects/ProjectFilters.jsx`
- `src/components/app/projects/ProjectDetailTabs.jsx`
- `src/components/app/projects/ProjectOverview.jsx`
- `src/components/app/projects/ProjectTeam.jsx`
- `src/components/app/projects/ProjectBudget.jsx`
- `src/components/app/projects/ProjectTimeline.jsx`
- `src/components/app/projects/ProjectCreationWizard.jsx`
- `src/components/app/projects/ProjectTemplateSelector.jsx`
- `src/components/app/projects/ProjectArchiveManager.jsx`

#### Service Methods
- `projectService.getMyProjects(userId, filters)`
- `projectService.getAllProjects(organizationId, filters)`
- `projectService.getProjectDetail(projectId)`
- `projectService.createProject(data)`
- `projectService.updateProject(projectId, data)`
- `projectService.deleteProject(projectId)`
- `projectService.archiveProject(projectId)`
- `projectService.restoreProject(projectId)`
- `projectService.saveAsTemplate(projectId, templateName)`
- `projectService.createFromTemplate(templateId, projectName)`
- `projectService.exportProjects(filters, format)`

#### SQL Files
- `v139_projects_enhancements.sql` - Additional project tables
- `v140_project_templates.sql` - Template system
- `v141_project_archives.sql` - Archiving functionality

#### Routes
- `/platform/projects` - My Projects
- `/platform/projects/all` - All Projects
- `/platform/projects/create` - Create New Project
- `/platform/projects/:id` - Project Detail
- `/platform/projects/:id/edit` - Edit Project
- `/platform/projects/templates` - Template Library
- `/platform/projects/archives` - Archived Projects

---

## MODULE 3: Tasks 🔨

### Current State
- Task components exist
- Needs full integration with projects
- Needs enhancement

### Implementation Requirements

#### Database Tables
```sql
-- Existing tables
tasks
task_assignments
task_dependencies

-- Tables to create
task_templates
task_checklists
task_comments
task_attachments
task_time_logs
task_subtasks
```

#### Features to Implement
1. **Task List View**
   - My Tasks (assigned to me)
   - All Tasks (organization-wide)
   - Filter by project, status, priority, assignee
   - Sort by date, priority, status
   - Bulk actions (assign, update status, delete)

2. **Task Board (Kanban)**
   - Drag-and-drop interface
   - Customizable columns (status-based)
   - Swimlanes (by project, assignee, priority)
   - Quick edit on cards

3. **Task Calendar**
   - Month/week/day views
   - Tasks by due date
   - Color-coded by project/priority
   - Drag to reschedule

4. **Task Detail View**
   - Overview (title, description, status)
   - Assignments (who's working on it)
   - Dependencies (predecessor/successor tasks)
   - Subtasks (checklist items)
   - Comments & activity log
   - Attachments
   - Time tracking

5. **Task Creation**
   - Quick add (inline)
   - Full form (detailed)
   - From template
   - Bulk import (CSV)

6. **Task Templates**
   - Save task as template
   - Template library
   - Apply template to projects

#### Components to Create
- `src/pages/platform-app/tasks/TaskList.jsx`
- `src/pages/platform-app/tasks/TaskBoard.jsx`
- `src/pages/platform-app/tasks/TaskCalendar.jsx`
- `src/pages/platform-app/tasks/TaskDetail.jsx`
- `src/components/app/tasks/TaskCard.jsx`
- `src/components/app/tasks/TaskFilters.jsx`
- `src/components/app/tasks/TaskForm.jsx`
- `src/components/app/tasks/TaskComments.jsx`
- `src/components/app/tasks/TaskSubtasks.jsx`
- `src/components/app/tasks/TaskTimeLog.jsx`
- `src/components/app/tasks/TaskDependencies.jsx`
- `src/components/app/tasks/TaskTemplateSelector.jsx`

#### Service Methods
- `taskService.getMyTasks(userId, filters)`
- `taskService.getAllTasks(organizationId, filters)`
- `taskService.getTasksByProject(projectId, filters)`
- `taskService.getTaskDetail(taskId)`
- `taskService.createTask(data)`
- `taskService.updateTask(taskId, data)`
- `taskService.deleteTask(taskId)`
- `taskService.assignTask(taskId, userId)`
- `taskService.addComment(taskId, comment)`
- `taskService.logTime(taskId, timeEntry)`
- `taskService.addSubtask(taskId, subtaskData)`
- `taskService.setDependency(taskId, dependsOnTaskId)`
- `taskService.bulkImport(csvData)`

#### SQL Files
- `v142_tasks_enhancements.sql` - Additional task tables
- `v143_task_templates.sql` - Template system
- `v144_task_time_tracking.sql` - Time logging

#### Routes
- `/platform/tasks` - My Tasks (list view)
- `/platform/tasks/all` - All Tasks
- `/platform/tasks/board` - Kanban Board
- `/platform/tasks/calendar` - Calendar View
- `/platform/tasks/:id` - Task Detail
- `/platform/tasks/create` - Create New Task
- `/platform/tasks/templates` - Template Library

---

## MODULE 4: Teams 🔨 (New Module)

### Implementation Requirements

#### Database Tables
```sql
teams
team_members
team_roles
team_skills
skill_matrix
resource_allocations
capacity_planning
leave_calendar
```

#### Features to Implement
1. **Team Management**
   - Create/edit/delete teams
   - Team hierarchy (parent/child teams)
   - Team members list
   - Role assignments

2. **Resource Directory**
   - Organization-wide resource list
   - Profile pages (skills, experience, certifications)
   - Availability calendar
   - Contact information

3. **Skill Matrix**
   - Define organizational skills
   - Rate team members on skills (1-5 scale)
   - Skill gap analysis
   - Training recommendations

4. **Capacity Planning**
   - Resource allocation across projects
   - Availability tracking
   - Workload visualization
   - Conflict detection

5. **Leave Management**
   - Annual leave calendar
   - Public holidays
   - Team availability view
   - Integration with resource planning

6. **Performance Tracking**
   - Task completion metrics
   - Time utilization
   - Project contribution
   - Skill development

#### Components to Create
- `src/pages/platform-app/teams/TeamList.jsx`
- `src/pages/platform-app/teams/TeamDetail.jsx`
- `src/pages/platform-app/teams/ResourceDirectory.jsx`
- `src/pages/platform-app/teams/SkillMatrix.jsx`
- `src/pages/platform-app/teams/CapacityPlanner.jsx`
- `src/pages/platform-app/teams/LeaveCalendar.jsx`
- `src/components/app/teams/TeamCard.jsx`
- `src/components/app/teams/TeamForm.jsx`
- `src/components/app/teams/MemberProfile.jsx`
- `src/components/app/teams/SkillRatingWidget.jsx`
- `src/components/app/teams/CapacityGauge.jsx`
- `src/components/app/teams/AllocationChart.jsx`

#### Service Methods
- `teamService.getAllTeams(organizationId)`
- `teamService.getTeamDetail(teamId)`
- `teamService.createTeam(data)`
- `teamService.updateTeam(teamId, data)`
- `teamService.deleteTeam(teamId)`
- `teamService.addMember(teamId, userId, role)`
- `teamService.removeMember(teamId, userId)`
- `teamService.getResourceDirectory(organizationId, filters)`
- `teamService.updateSkillRating(userId, skillId, rating)`
- `teamService.getSkillMatrix(organizationId)`
- `teamService.getCapacityData(teamId, dateRange)`
- `teamService.recordLeave(userId, startDate, endDate, type)`

#### SQL Files
- `v145_teams_module.sql` - Teams tables
- `v146_skill_matrix.sql` - Skills and ratings
- `v147_capacity_planning.sql` - Resource allocation
- `v148_leave_management.sql` - Leave calendar

#### Routes
- `/platform/teams` - Team List
- `/platform/teams/:id` - Team Detail
- `/platform/teams/create` - Create Team
- `/platform/teams/directory` - Resource Directory
- `/platform/teams/skills` - Skill Matrix
- `/platform/teams/capacity` - Capacity Planning
- `/platform/teams/leaves` - Leave Calendar

---

## MODULE 5: Reports & Analytics 🔨

### Current State
- Basic reports exist
- Needs comprehensive reporting module

### Implementation Requirements

#### Database Tables
```sql
report_templates
saved_reports
report_schedules
report_exports
analytics_dashboards
custom_metrics
```

#### Features to Implement
1. **Report Builder**
   - Drag-and-drop interface
   - Data source selection
   - Field selection
   - Filters and parameters
   - Grouping and aggregation
   - Sorting options

2. **Pre-built Report Templates**
   - Project Status Report
   - Resource Utilization Report
   - Budget Performance Report
   - Risk Register Report
   - Task Completion Report
   - Time Tracking Report
   - Benefits Realization Report
   - Portfolio Health Report

3. **Analytics Dashboards**
   - Executive Dashboard
   - Project Manager Dashboard
   - Resource Manager Dashboard
   - Financial Dashboard
   - Risk Dashboard

4. **Custom Metrics**
   - Define KPIs
   - Set targets and thresholds
   - Automated calculations
   - Trend analysis

5. **Report Scheduling**
   - Schedule automated reports
   - Email distribution
   - PDF/Excel export
   - Dashboard snapshots

6. **Data Visualization**
   - Charts (bar, line, pie, area)
   - Tables (sortable, filterable)
   - Gauges and meters
   - Heat maps
   - Timeline charts

#### Components to Create
- `src/pages/platform-app/reports/ReportBuilder.jsx`
- `src/pages/platform-app/reports/ReportLibrary.jsx`
- `src/pages/platform-app/reports/ReportViewer.jsx`
- `src/pages/platform-app/reports/AnalyticsDashboards.jsx`
- `src/pages/platform-app/reports/CustomMetrics.jsx`
- `src/components/app/reports/ReportCanvas.jsx`
- `src/components/app/reports/DataSourceSelector.jsx`
- `src/components/app/reports/FieldSelector.jsx`
- `src/components/app/reports/FilterBuilder.jsx`
- `src/components/app/reports/ChartBuilder.jsx`
- `src/components/app/reports/ReportScheduler.jsx`
- `src/components/app/reports/MetricCard.jsx`

#### Service Methods
- `reportService.getTemplates(organizationId)`
- `reportService.createReport(data)`
- `reportService.updateReport(reportId, data)`
- `reportService.deleteReport(reportId)`
- `reportService.runReport(reportId, parameters)`
- `reportService.exportReport(reportId, format)`
- `reportService.scheduleReport(reportId, schedule)`
- `reportService.getAnalyticsDashboard(dashboardId)`
- `reportService.createCustomMetric(data)`
- `reportService.getMetricData(metricId, dateRange)`

#### SQL Files
- `v149_reports_module.sql` - Reports tables
- `v150_analytics_dashboards.sql` - Dashboard configuration
- `v151_custom_metrics.sql` - Metrics definitions

#### Routes
- `/platform/reports` - Report Library
- `/platform/reports/builder` - Report Builder
- `/platform/reports/:id` - View Report
- `/platform/reports/analytics` - Analytics Dashboards
- `/platform/reports/metrics` - Custom Metrics

---

## MODULE 6: Governance 🔨 (New Module)

### Implementation Requirements

#### Database Tables
```sql
governance_frameworks
governance_policies
compliance_requirements
audit_logs
decision_logs
governance_reviews
policy_violations
```

#### Features to Implement
1. **Governance Framework**
   - Define governance model
   - Roles and responsibilities
   - Decision-making authority levels
   - Escalation procedures

2. **Policy Management**
   - Create/edit policies
   - Policy versioning
   - Approval workflows
   - Policy distribution
   - Acknowledgement tracking

3. **Compliance Tracking**
   - Regulatory requirements
   - Compliance checklists
   - Evidence collection
   - Audit preparation

4. **Decision Log**
   - Record key decisions
   - Decision rationale
   - Approvers and stakeholders
   - Impact assessment
   - Implementation tracking

5. **Audit Trail**
   - System-wide activity logging
   - User action tracking
   - Data change history
   - Access logs
   - Security events

6. **Governance Reviews**
   - Schedule reviews
   - Review templates
   - Findings and actions
   - Remediation tracking

#### Components to Create
- `src/pages/platform-app/governance/GovernanceFramework.jsx`
- `src/pages/platform-app/governance/PolicyManagement.jsx`
- `src/pages/platform-app/governance/ComplianceTracker.jsx`
- `src/pages/platform-app/governance/DecisionLog.jsx`
- `src/pages/platform-app/governance/AuditTrail.jsx`
- `src/pages/platform-app/governance/GovernanceReviews.jsx`
- `src/components/app/governance/PolicyForm.jsx`
- `src/components/app/governance/ComplianceChecklist.jsx`
- `src/components/app/governance/DecisionForm.jsx`
- `src/components/app/governance/AuditLogViewer.jsx`
- `src/components/app/governance/ReviewScheduler.jsx`

#### Service Methods
- `governanceService.getFramework(organizationId)`
- `governanceService.updateFramework(data)`
- `governanceService.createPolicy(data)`
- `governanceService.getPolicies(organizationId, filters)`
- `governanceService.getComplianceStatus(organizationId)`
- `governanceService.recordDecision(data)`
- `governanceService.getDecisions(filters)`
- `governanceService.getAuditLog(filters)`
- `governanceService.scheduleReview(data)`

#### SQL Files
- `v152_governance_framework.sql`
- `v153_policy_management.sql`
- `v154_compliance_tracking.sql`
- `v155_decision_log.sql`
- `v156_enhanced_audit_trail.sql`

#### Routes
- `/platform/governance` - Governance Dashboard
- `/platform/governance/framework` - Framework Setup
- `/platform/governance/policies` - Policy Management
- `/platform/governance/compliance` - Compliance Tracker
- `/platform/governance/decisions` - Decision Log
- `/platform/governance/audit` - Audit Trail
- `/platform/governance/reviews` - Governance Reviews

---

## MODULE 7: Portfolio 🔨

### Current State
- Portfolio components exist in codebase
- Needs integration and completion

### Implementation Requirements

#### Database Tables
```sql
portfolios
portfolio_projects
portfolio_programs
portfolio_metrics
portfolio_risks
portfolio_budgets
strategic_alignment
```

#### Features to Implement
1. **Portfolio Management**
   - Create/edit portfolios
   - Portfolio hierarchy
   - Strategic objectives linkage
   - Portfolio categorization

2. **Portfolio Dashboard**
   - Overall health score
   - Project distribution
   - Budget rollup
   - Resource summary
   - Risk exposure

3. **Project Selection & Prioritization**
   - Scoring model
   - Multi-criteria analysis
   - What-if scenarios
   - Portfolio optimization

4. **Portfolio Planning**
   - Capacity vs. demand
   - Resource forecasting
   - Budget allocation
   - Timeline planning

5. **Portfolio Reporting**
   - Executive summary
   - Performance trends
   - Benefits tracking
   - Risk dashboard

#### Components to Create
- `src/pages/platform-app/portfolio/PortfolioList.jsx`
- `src/pages/platform-app/portfolio/PortfolioDashboard.jsx`
- `src/pages/platform-app/portfolio/ProjectPrioritization.jsx`
- `src/pages/platform-app/portfolio/PortfolioPlanning.jsx`
- `src/pages/platform-app/portfolio/PortfolioReports.jsx`
- `src/components/app/portfolio/PortfolioCard.jsx`
- `src/components/app/portfolio/HealthScoreGauge.jsx`
- `src/components/app/portfolio/PrioritizationMatrix.jsx`
- `src/components/app/portfolio/CapacityChart.jsx`
- `src/components/app/portfolio/BudgetRollup.jsx`

#### Service Methods
- `portfolioService.getAllPortfolios(organizationId)`
- `portfolioService.getPortfolioDetail(portfolioId)`
- `portfolioService.createPortfolio(data)`
- `portfolioService.updatePortfolio(portfolioId, data)`
- `portfolioService.addProject(portfolioId, projectId)`
- `portfolioService.removeProject(portfolioId, projectId)`
- `portfolioService.getDashboardData(portfolioId)`
- `portfolioService.runPrioritization(portfolioId, criteria)`
- `portfolioService.getCapacityAnalysis(portfolioId)`

#### SQL Files
- `v157_portfolio_module.sql`
- `v158_portfolio_metrics.sql`
- `v159_portfolio_planning.sql`

#### Routes
- `/platform/portfolio` - Portfolio List
- `/platform/portfolio/:id` - Portfolio Dashboard
- `/platform/portfolio/:id/projects` - Projects in Portfolio
- `/platform/portfolio/:id/prioritization` - Project Prioritization
- `/platform/portfolio/:id/planning` - Portfolio Planning
- `/platform/portfolio/:id/reports` - Portfolio Reports

---

## MODULE 8: Programme 🔨

### Current State
- Programme components exist
- Needs integration and completion

### Implementation Requirements

#### Database Tables
```sql
programmes
programme_projects
programme_dependencies
programme_milestones
programme_benefits
programme_governance
tranches
```

#### Features to Implement
1. **Programme Management**
   - Create/edit programmes
   - Programme structure
   - Project grouping
   - Tranche management

2. **Programme Dashboard**
   - Programme status
   - Project rollup
   - Milestone tracking
   - Benefits realization
   - Issue escalations

3. **Dependency Management**
   - Inter-project dependencies
   - Critical path analysis
   - Impact assessment
   - Dependency visualization

4. **Benefits Management**
   - Benefit identification
   - Benefit mapping to projects
   - Benefits tracking
   - Realization measurement

5. **Programme Governance**
   - Board meetings
   - Decision points
   - Approval gates
   - Programme reviews

#### Components to Create
- `src/pages/platform-app/programme/ProgrammeList.jsx`
- `src/pages/platform-app/programme/ProgrammeDashboard.jsx`
- `src/pages/platform-app/programme/ProgrammeProjects.jsx`
- `src/pages/platform-app/programme/ProgrammeDependencies.jsx`
- `src/pages/platform-app/programme/ProgrammeBenefits.jsx`
- `src/components/app/programme/ProgrammeCard.jsx`
- `src/components/app/programme/TrancheTimeline.jsx`
- `src/components/app/programme/DependencyGraph.jsx`
- `src/components/app/programme/BenefitsMap.jsx`
- `src/components/app/programme/GovernanceBoard.jsx`

#### Service Methods
- `programmeService.getAllProgrammes(organizationId)`
- `programmeService.getProgrammeDetail(programmeId)`
- `programmeService.createProgramme(data)`
- `programmeService.updateProgramme(programmeId, data)`
- `programmeService.addProject(programmeId, projectId)`
- `programmeService.createTranche(programmeId, data)`
- `programmeService.getDependencies(programmeId)`
- `programmeService.getBenefits(programmeId)`

#### SQL Files
- `v160_programme_module.sql`
- `v161_programme_dependencies.sql`
- `v162_programme_benefits.sql`

#### Routes
- `/platform/programme` - Programme List
- `/platform/programme/:id` - Programme Dashboard
- `/platform/programme/:id/projects` - Projects in Programme
- `/platform/programme/:id/dependencies` - Dependencies
- `/platform/programme/:id/benefits` - Benefits Tracking
- `/platform/programme/:id/governance` - Governance Board

---

## MODULE 9: Dependencies 🔨

### Current State
- Basic dependency components exist
- Needs comprehensive implementation

### Implementation Requirements

#### Database Tables
```sql
dependencies
dependency_types
dependency_impacts
dependency_links
critical_paths
```

#### Features to Implement
1. **Dependency Register**
   - Create/edit dependencies
   - Dependency types (FS, FF, SS, SF)
   - Lag/lead time
   - Criticality rating

2. **Dependency Visualization**
   - Network diagram
   - Gantt chart with dependencies
   - Critical path highlighting
   - Timeline impact view

3. **Impact Analysis**
   - What-if scenarios
   - Delay propagation
   - Risk assessment
   - Mitigation options

4. **Cross-Project Dependencies**
   - Inter-project links
   - Programme-level view
   - Portfolio-level view
   - Organization-wide tracking

5. **Dependency Monitoring**
   - Status tracking
   - Alerts and notifications
   - Blocker identification
   - Resolution tracking

#### Components to Create
- `src/pages/platform-app/dependencies/DependencyRegister.jsx`
- `src/pages/platform-app/dependencies/DependencyNetwork.jsx`
- `src/pages/platform-app/dependencies/ImpactAnalysis.jsx`
- `src/pages/platform-app/dependencies/CriticalPath.jsx`
- `src/components/app/dependencies/DependencyForm.jsx`
- `src/components/app/dependencies/NetworkDiagram.jsx`
- `src/components/app/dependencies/GanttWithDependencies.jsx`
- `src/components/app/dependencies/ImpactCalculator.jsx`

#### Service Methods
- `dependencyService.getAllDependencies(projectId)`
- `dependencyService.createDependency(data)`
- `dependencyService.updateDependency(dependencyId, data)`
- `dependencyService.deleteDependency(dependencyId)`
- `dependencyService.getCriticalPath(projectId)`
- `dependencyService.analyzeImpact(dependencyId, delay)`
- `dependencyService.getCrossProjectDependencies(organizationId)`

#### SQL Files
- `v163_dependencies_enhancement.sql`
- `v164_critical_path.sql`
- `v165_dependency_impact_tracking.sql`

#### Routes
- `/platform/dependencies` - Dependency Register
- `/platform/dependencies/network` - Network Diagram
- `/platform/dependencies/critical-path` - Critical Path
- `/platform/dependencies/impact` - Impact Analysis
- `/platform/dependencies/cross-project` - Cross-Project View

---

## MODULE 10: Benefits 🔨

### Current State
- Benefits components exist
- Needs integration and completion

### Implementation Requirements

#### Database Tables
```sql
benefits
benefit_types
benefit_measurements
benefit_owners
benefit_realizations
dis_benefits
```

#### Features to Implement
1. **Benefits Register**
   - Create/edit benefits
   - Benefit categorization
   - Target values
   - Measurement approach
   - Ownership assignment

2. **Benefits Mapping**
   - Link to strategic objectives
   - Link to projects
   - Link to capabilities
   - Dependency tracking

3. **Benefits Realization**
   - Planned vs. actual tracking
   - Timeline tracking
   - Measurement recording
   - Variance analysis

4. **Benefits Dashboard**
   - Overall realization %
   - By category
   - By project
   - Trends and forecasts

5. **Dis-benefits Tracking**
   - Negative impacts
   - Mitigation strategies
   - Cost tracking

#### Components to Create
- `src/pages/platform-app/benefits/BenefitsRegister.jsx`
- `src/pages/platform-app/benefits/BenefitsMapping.jsx`
- `src/pages/platform-app/benefits/BenefitsRealization.jsx`
- `src/pages/platform-app/benefits/BenefitsDashboard.jsx`
- `src/components/app/benefits/BenefitForm.jsx`
- `src/components/app/benefits/BenefitCard.jsx`
- `src/components/app/benefits/RealizationChart.jsx`
- `src/components/app/benefits/MappingDiagram.jsx`

#### Service Methods
- `benefitsService.getAllBenefits(organizationId)`
- `benefitsService.getBenefitDetail(benefitId)`
- `benefitsService.createBenefit(data)`
- `benefitsService.updateBenefit(benefitId, data)`
- `benefitsService.recordMeasurement(benefitId, data)`
- `benefitsService.getRealizationStatus(organizationId)`
- `benefitsService.getBenefitsByProject(projectId)`

#### SQL Files
- `v166_benefits_enhancement.sql`
- `v167_benefit_measurements.sql`
- `v168_dis_benefits.sql`

#### Routes
- `/platform/benefits` - Benefits Register
- `/platform/benefits/:id` - Benefit Detail
- `/platform/benefits/mapping` - Benefits Mapping
- `/platform/benefits/realization` - Realization Dashboard
- `/platform/benefits/measurements` - Record Measurements

---

## MODULE 11: Strategy 🔨

### Current State
- Strategy components exist
- Needs integration and completion

### Implementation Requirements

#### Database Tables
```sql
strategic_objectives
strategic_themes
key_results
okrs
strategic_initiatives
strategy_reviews
```

#### Features to Implement
1. **Strategic Objectives**
   - Create/edit objectives
   - Objective hierarchy
   - Theme categorization
   - Owner assignment

2. **OKR Management**
   - Define Objectives and Key Results
   - Link to projects
   - Progress tracking
   - Quarterly reviews

3. **Strategic Alignment**
   - Project-to-strategy mapping
   - Alignment scoring
   - Gap analysis
   - Portfolio optimization

4. **Strategy Dashboard**
   - Objective progress
   - Initiative status
   - Resource allocation to strategy
   - Benefits alignment

5. **Strategic Reviews**
   - Review scheduling
   - Performance assessment
   - Strategy adjustments
   - Communication

#### Components to Create
- `src/pages/platform-app/strategy/StrategicObjectives.jsx`
- `src/pages/platform-app/strategy/OKRManagement.jsx`
- `src/pages/platform-app/strategy/StrategicAlignment.jsx`
- `src/pages/platform-app/strategy/StrategyDashboard.jsx`
- `src/components/app/strategy/ObjectiveForm.jsx`
- `src/components/app/strategy/OKRCard.jsx`
- `src/components/app/strategy/AlignmentMatrix.jsx`
- `src/components/app/strategy/StrategyMap.jsx`

#### Service Methods
- `strategyService.getObjectives(organizationId)`
- `strategyService.createObjective(data)`
- `strategyService.updateObjective(objectiveId, data)`
- `strategyService.getOKRs(organizationId, quarter)`
- `strategyService.updateKeyResult(keyResultId, progress)`
- `strategyService.getAlignmentScore(projectId)`
- `strategyService.getDashboardData(organizationId)`

#### SQL Files
- `v169_strategy_module.sql`
- `v170_okr_management.sql`
- `v171_strategic_alignment.sql`

#### Routes
- `/platform/strategy` - Strategy Dashboard
- `/platform/strategy/objectives` - Strategic Objectives
- `/platform/strategy/okrs` - OKR Management
- `/platform/strategy/alignment` - Strategic Alignment
- `/platform/strategy/reviews` - Strategy Reviews

---

## MODULE 12: Quality 🔨

### Current State
- Quality components exist
- Needs integration and completion

### Implementation Requirements

#### Database Tables
```sql
quality_standards
quality_criteria
quality_reviews
quality_inspections
quality_metrics
quality_issues
quality_reports
```

#### Features to Implement
1. **Quality Standards**
   - Define standards
   - Standard templates
   - Compliance tracking
   - Version control

2. **Quality Criteria**
   - Product quality criteria
   - Acceptance criteria
   - Testing requirements
   - Quality gates

3. **Quality Reviews**
   - Schedule reviews
   - Review checklists
   - Findings log
   - Action tracking

4. **Quality Inspections**
   - Inspection planning
   - Inspection execution
   - Defect logging
   - Corrective actions

5. **Quality Metrics**
   - Defect density
   - Test coverage
   - Review effectiveness
   - Quality trends

6. **Quality Dashboard**
   - Overall quality score
   - By project
   - Trend analysis
   - Compliance status

#### Components to Create
- `src/pages/platform-app/quality/QualityStandards.jsx`
- `src/pages/platform-app/quality/QualityCriteria.jsx`
- `src/pages/platform-app/quality/QualityReviews.jsx`
- `src/pages/platform-app/quality/QualityInspections.jsx`
- `src/pages/platform-app/quality/QualityMetrics.jsx`
- `src/pages/platform-app/quality/QualityDashboard.jsx`
- `src/components/app/quality/StandardForm.jsx`
- `src/components/app/quality/ReviewChecklist.jsx`
- `src/components/app/quality/InspectionForm.jsx`
- `src/components/app/quality/MetricsChart.jsx`

#### Service Methods
- `qualityService.getStandards(organizationId)`
- `qualityService.createStandard(data)`
- `qualityService.getCriteria(projectId)`
- `qualityService.scheduleReview(data)`
- `qualityService.recordInspection(data)`
- `qualityService.getMetrics(projectId, dateRange)`
- `qualityService.getDashboardData(organizationId)`

#### SQL Files
- `v172_quality_standards.sql`
- `v173_quality_reviews_inspections.sql`
- `v174_quality_metrics.sql`

#### Routes
- `/platform/quality` - Quality Dashboard
- `/platform/quality/standards` - Quality Standards
- `/platform/quality/criteria` - Quality Criteria
- `/platform/quality/reviews` - Quality Reviews
- `/platform/quality/inspections` - Quality Inspections
- `/platform/quality/metrics` - Quality Metrics

---

## MODULE 13: Stakeholders 🔨

### Current State
- Stakeholder components exist
- Needs integration and completion

### Implementation Requirements

#### Database Tables
```sql
stakeholders
stakeholder_groups
stakeholder_interests
stakeholder_engagement
communication_plans
stakeholder_analysis
```

#### Features to Implement
1. **Stakeholder Register**
   - Create/edit stakeholders
   - Contact information
   - Organization and role
   - Interest and influence
   - Attitude tracking

2. **Stakeholder Analysis**
   - Power-Interest grid
   - Influence-Impact matrix
   - Engagement strategy
   - Risk assessment

3. **Engagement Planning**
   - Engagement tactics
   - Communication preferences
   - Frequency planning
   - Responsibility assignment

4. **Communication Management**
   - Communication plan
   - Message templates
   - Distribution tracking
   - Feedback collection

5. **Stakeholder Dashboard**
   - Engagement status
   - Communication log
   - Sentiment tracking
   - Action items

#### Components to Create
- `src/pages/platform-app/stakeholders/StakeholderRegister.jsx`
- `src/pages/platform-app/stakeholders/StakeholderAnalysis.jsx`
- `src/pages/platform-app/stakeholders/EngagementPlanning.jsx`
- `src/pages/platform-app/stakeholders/CommunicationPlan.jsx`
- `src/pages/platform-app/stakeholders/StakeholderDashboard.jsx`
- `src/components/app/stakeholders/StakeholderForm.jsx`
- `src/components/app/stakeholders/PowerInterestGrid.jsx`
- `src/components/app/stakeholders/EngagementTracker.jsx`
- `src/components/app/stakeholders/CommunicationLog.jsx`

#### Service Methods
- `stakeholderService.getAllStakeholders(projectId)`
- `stakeholderService.createStakeholder(data)`
- `stakeholderService.updateStakeholder(stakeholderId, data)`
- `stakeholderService.getAnalysis(projectId)`
- `stakeholderService.createEngagementPlan(stakeholderId, data)`
- `stakeholderService.recordCommunication(stakeholderId, data)`
- `stakeholderService.getDashboardData(projectId)`

#### SQL Files
- `v175_stakeholders_module.sql`
- `v176_stakeholder_analysis.sql`
- `v177_communication_planning.sql`

#### Routes
- `/platform/stakeholders` - Stakeholder Register
- `/platform/stakeholders/:id` - Stakeholder Detail
- `/platform/stakeholders/analysis` - Stakeholder Analysis
- `/platform/stakeholders/engagement` - Engagement Planning
- `/platform/stakeholders/communications` - Communication Plan
- `/platform/stakeholders/dashboard` - Stakeholder Dashboard

---

## MODULE 14: Organization Admin 🔨 (New Module)

### Implementation Requirements

#### Database Tables
```sql
organization_settings
organization_branding
organization_integrations
organization_billing
subscription_history
usage_analytics
```

#### Features to Implement
1. **Organization Settings**
   - Organization profile
   - Business details
   - Timezone and locale
   - Feature toggles

2. **User Management**
   - User directory
   - Role assignments
   - Access control
   - Invitation management

3. **Subscription Management**
   - Plan details
   - Billing information
   - Payment history
   - Usage tracking
   - Upgrade/downgrade

4. **Branding & Customization**
   - Logo upload
   - Color scheme
   - Email templates
   - Custom domains

5. **Integration Management**
   - Connected apps
   - API keys
   - Webhook configuration
   - OAuth connections

6. **Security Settings**
   - Authentication methods
   - Password policies
   - Session management
   - Audit configuration

7. **Analytics & Usage**
   - User activity
   - Feature adoption
   - Storage usage
   - API usage

#### Components to Create
- `src/pages/platform-app/organization-admin/OrgSettings.jsx`
- `src/pages/platform-app/organization-admin/UserManagement.jsx`
- `src/pages/platform-app/organization-admin/Subscription.jsx`
- `src/pages/platform-app/organization-admin/Branding.jsx`
- `src/pages/platform-app/organization-admin/Integrations.jsx`
- `src/pages/platform-app/organization-admin/Security.jsx`
- `src/pages/platform-app/organization-admin/Analytics.jsx`
- `src/components/app/org-admin/OrgProfileForm.jsx`
- `src/components/app/org-admin/UserInviteForm.jsx`
- `src/components/app/org-admin/BrandingEditor.jsx`
- `src/components/app/org-admin/IntegrationCard.jsx`
- `src/components/app/org-admin/UsageChart.jsx`

#### Service Methods
- `orgAdminService.getSettings(organizationId)`
- `orgAdminService.updateSettings(organizationId, data)`
- `orgAdminService.getAllUsers(organizationId)`
- `orgAdminService.inviteUser(organizationId, email, role)`
- `orgAdminService.removeUser(organizationId, userId)`
- `orgAdminService.getSubscription(organizationId)`
- `orgAdminService.updateBranding(organizationId, data)`
- `orgAdminService.getIntegrations(organizationId)`
- `orgAdminService.getUsageAnalytics(organizationId, dateRange)`

#### SQL Files
- `v178_organization_admin.sql`
- `v179_org_branding.sql`
- `v180_org_integrations.sql`
- `v181_usage_analytics.sql`

#### Routes
- `/platform/organization-admin` - Admin Dashboard
- `/platform/organization-admin/settings` - Organization Settings
- `/platform/organization-admin/users` - User Management
- `/platform/organization-admin/subscription` - Subscription Management
- `/platform/organization-admin/branding` - Branding & Customization
- `/platform/organization-admin/integrations` - Integration Management
- `/platform/organization-admin/security` - Security Settings
- `/platform/organization-admin/analytics` - Analytics & Usage

---

## Menu Configuration Implementation

### Update `src/config/pmMenuConfig.js`

```javascript
export const pmMenuConfig = [
  // 1. Dashboard
  {
    id: 'platform-dashboard',
    label: 'Dashboard',
    path: '/platform/dashboard',
    icon: 'layout-dashboard',
    permission: null,
  },

  // 2. Projects
  {
    id: 'platform-projects',
    label: 'Projects',
    path: '/platform/projects',
    icon: 'folder-kanban',
    permission: 'project.view',
    children: [
      {
        id: 'platform-projects-my',
        label: 'My Projects',
        path: '/platform/projects',
        permission: 'project.view',
      },
      {
        id: 'platform-projects-all',
        label: 'All Projects',
        path: '/platform/projects/all',
        permission: 'project.view_all',
      },
      {
        id: 'platform-projects-create',
        label: 'Create Project',
        path: '/platform/projects/create',
        permission: 'project.create',
      },
      {
        id: 'platform-projects-templates',
        label: 'Templates',
        path: '/platform/projects/templates',
        permission: 'project.view',
      },
      {
        id: 'platform-projects-archives',
        label: 'Archived',
        path: '/platform/projects/archives',
        permission: 'project.view',
      },
    ],
  },

  // 3. Tasks
  {
    id: 'platform-tasks',
    label: 'Tasks',
    path: '/platform/tasks',
    icon: 'list-checks',
    permission: 'task.view',
    children: [
      {
        id: 'platform-tasks-my',
        label: 'My Tasks',
        path: '/platform/tasks',
        permission: 'task.view',
      },
      {
        id: 'platform-tasks-all',
        label: 'All Tasks',
        path: '/platform/tasks/all',
        permission: 'task.view_all',
      },
      {
        id: 'platform-tasks-board',
        label: 'Board View',
        path: '/platform/tasks/board',
        permission: 'task.view',
      },
      {
        id: 'platform-tasks-calendar',
        label: 'Calendar',
        path: '/platform/tasks/calendar',
        permission: 'task.view',
      },
    ],
  },

  // 4. Teams
  {
    id: 'platform-teams',
    label: 'Teams',
    path: '/platform/teams',
    icon: 'users',
    permission: 'team.view',
    children: [
      {
        id: 'platform-teams-list',
        label: 'All Teams',
        path: '/platform/teams',
        permission: 'team.view',
      },
      {
        id: 'platform-teams-directory',
        label: 'Resource Directory',
        path: '/platform/teams/directory',
        permission: 'team.view',
      },
      {
        id: 'platform-teams-skills',
        label: 'Skill Matrix',
        path: '/platform/teams/skills',
        permission: 'team.view',
      },
      {
        id: 'platform-teams-capacity',
        label: 'Capacity Planning',
        path: '/platform/teams/capacity',
        permission: 'team.manage',
      },
      {
        id: 'platform-teams-leaves',
        label: 'Leave Calendar',
        path: '/platform/teams/leaves',
        permission: 'team.view',
      },
    ],
  },

  // 5. Reports & Analytics
  {
    id: 'platform-reports',
    label: 'Reports & Analytics',
    path: '/platform/reports',
    icon: 'chart-bar',
    permission: 'report.view',
    children: [
      {
        id: 'platform-reports-library',
        label: 'Report Library',
        path: '/platform/reports',
        permission: 'report.view',
      },
      {
        id: 'platform-reports-builder',
        label: 'Report Builder',
        path: '/platform/reports/builder',
        permission: 'report.create',
      },
      {
        id: 'platform-reports-analytics',
        label: 'Analytics Dashboards',
        path: '/platform/reports/analytics',
        permission: 'report.view',
      },
      {
        id: 'platform-reports-metrics',
        label: 'Custom Metrics',
        path: '/platform/reports/metrics',
        permission: 'report.manage',
      },
    ],
  },

  // 6. Governance
  {
    id: 'platform-governance',
    label: 'Governance',
    path: '/platform/governance',
    icon: 'shield-check',
    permission: 'governance.view',
    children: [
      {
        id: 'platform-governance-framework',
        label: 'Framework',
        path: '/platform/governance/framework',
        permission: 'governance.manage',
      },
      {
        id: 'platform-governance-policies',
        label: 'Policies',
        path: '/platform/governance/policies',
        permission: 'governance.view',
      },
      {
        id: 'platform-governance-compliance',
        label: 'Compliance',
        path: '/platform/governance/compliance',
        permission: 'governance.view',
      },
      {
        id: 'platform-governance-decisions',
        label: 'Decision Log',
        path: '/platform/governance/decisions',
        permission: 'governance.view',
      },
      {
        id: 'platform-governance-audit',
        label: 'Audit Trail',
        path: '/platform/governance/audit',
        permission: 'governance.audit',
      },
    ],
  },

  // 7. Portfolio
  {
    id: 'platform-portfolio',
    label: 'Portfolio',
    path: '/platform/portfolio',
    icon: 'briefcase',
    permission: 'portfolio.view',
    children: [
      {
        id: 'platform-portfolio-list',
        label: 'All Portfolios',
        path: '/platform/portfolio',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-dashboard',
        label: 'Portfolio Dashboard',
        path: '/platform/portfolio/dashboard',
        permission: 'portfolio.view',
      },
      {
        id: 'platform-portfolio-prioritization',
        label: 'Project Prioritization',
        path: '/platform/portfolio/prioritization',
        permission: 'portfolio.manage',
      },
      {
        id: 'platform-portfolio-planning',
        label: 'Portfolio Planning',
        path: '/platform/portfolio/planning',
        permission: 'portfolio.manage',
      },
    ],
  },

  // 8. Programme
  {
    id: 'platform-programme',
    label: 'Programme',
    path: '/platform/programme',
    icon: 'layers',
    permission: 'programme.view',
    children: [
      {
        id: 'platform-programme-list',
        label: 'All Programmes',
        path: '/platform/programme',
        permission: 'programme.view',
      },
      {
        id: 'platform-programme-projects',
        label: 'Programme Projects',
        path: '/platform/programme/projects',
        permission: 'programme.view',
      },
      {
        id: 'platform-programme-dependencies',
        label: 'Dependencies',
        path: '/platform/programme/dependencies',
        permission: 'programme.view',
      },
      {
        id: 'platform-programme-benefits',
        label: 'Benefits',
        path: '/platform/programme/benefits',
        permission: 'programme.view',
      },
    ],
  },

  // 9. Dependencies
  {
    id: 'platform-dependencies',
    label: 'Dependencies',
    path: '/platform/dependencies',
    icon: 'git-branch',
    permission: 'dependency.view',
    children: [
      {
        id: 'platform-dependencies-register',
        label: 'Dependency Register',
        path: '/platform/dependencies',
        permission: 'dependency.view',
      },
      {
        id: 'platform-dependencies-network',
        label: 'Network Diagram',
        path: '/platform/dependencies/network',
        permission: 'dependency.view',
      },
      {
        id: 'platform-dependencies-critical',
        label: 'Critical Path',
        path: '/platform/dependencies/critical-path',
        permission: 'dependency.view',
      },
      {
        id: 'platform-dependencies-impact',
        label: 'Impact Analysis',
        path: '/platform/dependencies/impact',
        permission: 'dependency.view',
      },
    ],
  },

  // 10. Benefits
  {
    id: 'platform-benefits',
    label: 'Benefits',
    path: '/platform/benefits',
    icon: 'target',
    permission: 'benefit.view',
    children: [
      {
        id: 'platform-benefits-register',
        label: 'Benefits Register',
        path: '/platform/benefits',
        permission: 'benefit.view',
      },
      {
        id: 'platform-benefits-mapping',
        label: 'Benefits Mapping',
        path: '/platform/benefits/mapping',
        permission: 'benefit.view',
      },
      {
        id: 'platform-benefits-realization',
        label: 'Realization',
        path: '/platform/benefits/realization',
        permission: 'benefit.view',
      },
      {
        id: 'platform-benefits-measurements',
        label: 'Measurements',
        path: '/platform/benefits/measurements',
        permission: 'benefit.manage',
      },
    ],
  },

  // 11. Strategy
  {
    id: 'platform-strategy',
    label: 'Strategy',
    path: '/platform/strategy',
    icon: 'compass',
    permission: 'strategy.view',
    children: [
      {
        id: 'platform-strategy-dashboard',
        label: 'Strategy Dashboard',
        path: '/platform/strategy',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-objectives',
        label: 'Strategic Objectives',
        path: '/platform/strategy/objectives',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-okrs',
        label: 'OKR Management',
        path: '/platform/strategy/okrs',
        permission: 'strategy.view',
      },
      {
        id: 'platform-strategy-alignment',
        label: 'Strategic Alignment',
        path: '/platform/strategy/alignment',
        permission: 'strategy.view',
      },
    ],
  },

  // 12. Quality
  {
    id: 'platform-quality',
    label: 'Quality',
    path: '/platform/quality',
    icon: 'award',
    permission: 'quality.view',
    children: [
      {
        id: 'platform-quality-dashboard',
        label: 'Quality Dashboard',
        path: '/platform/quality',
        permission: 'quality.view',
      },
      {
        id: 'platform-quality-standards',
        label: 'Quality Standards',
        path: '/platform/quality/standards',
        permission: 'quality.view',
      },
      {
        id: 'platform-quality-reviews',
        label: 'Quality Reviews',
        path: '/platform/quality/reviews',
        permission: 'quality.view',
      },
      {
        id: 'platform-quality-inspections',
        label: 'Inspections',
        path: '/platform/quality/inspections',
        permission: 'quality.view',
      },
      {
        id: 'platform-quality-metrics',
        label: 'Quality Metrics',
        path: '/platform/quality/metrics',
        permission: 'quality.view',
      },
    ],
  },

  // 13. Stakeholders
  {
    id: 'platform-stakeholders',
    label: 'Stakeholders',
    path: '/platform/stakeholders',
    icon: 'users-2',
    permission: 'stakeholder.view',
    children: [
      {
        id: 'platform-stakeholders-register',
        label: 'Stakeholder Register',
        path: '/platform/stakeholders',
        permission: 'stakeholder.view',
      },
      {
        id: 'platform-stakeholders-analysis',
        label: 'Stakeholder Analysis',
        path: '/platform/stakeholders/analysis',
        permission: 'stakeholder.view',
      },
      {
        id: 'platform-stakeholders-engagement',
        label: 'Engagement Planning',
        path: '/platform/stakeholders/engagement',
        permission: 'stakeholder.manage',
      },
      {
        id: 'platform-stakeholders-communications',
        label: 'Communications',
        path: '/platform/stakeholders/communications',
        permission: 'stakeholder.view',
      },
    ],
  },

  // 14. Organization Admin
  {
    id: 'platform-org-admin',
    label: 'Organization Admin',
    path: '/platform/organization-admin',
    icon: 'settings',
    permission: 'org.admin',
    children: [
      {
        id: 'platform-org-admin-settings',
        label: 'Organization Settings',
        path: '/platform/organization-admin/settings',
        permission: 'org.admin',
      },
      {
        id: 'platform-org-admin-users',
        label: 'User Management',
        path: '/platform/organization-admin/users',
        permission: 'org.admin',
      },
      {
        id: 'platform-org-admin-subscription',
        label: 'Subscription',
        path: '/platform/organization-admin/subscription',
        permission: 'org.admin',
      },
      {
        id: 'platform-org-admin-branding',
        label: 'Branding',
        path: '/platform/organization-admin/branding',
        permission: 'org.admin',
      },
      {
        id: 'platform-org-admin-integrations',
        label: 'Integrations',
        path: '/platform/organization-admin/integrations',
        permission: 'org.admin',
      },
      {
        id: 'platform-org-admin-security',
        label: 'Security',
        path: '/platform/organization-admin/security',
        permission: 'org.admin',
      },
      {
        id: 'platform-org-admin-analytics',
        label: 'Analytics',
        path: '/platform/organization-admin/analytics',
        permission: 'org.admin',
      },
    ],
  },
]
```

---

## Permissions System

### Permission Categories

Create comprehensive permission definitions in database:

```sql
-- v182_comprehensive_permissions.sql

INSERT INTO permissions (code, name, description, category) VALUES
  -- Dashboard
  ('dashboard.view', 'View Dashboard', 'Access to organization dashboard', 'dashboard'),

  -- Projects
  ('project.view', 'View Projects', 'View projects assigned to user', 'project'),
  ('project.view_all', 'View All Projects', 'View all organization projects', 'project'),
  ('project.create', 'Create Project', 'Create new projects', 'project'),
  ('project.edit', 'Edit Project', 'Edit project details', 'project'),
  ('project.delete', 'Delete Project', 'Delete projects', 'project'),
  ('project.archive', 'Archive Project', 'Archive completed projects', 'project'),

  -- Tasks
  ('task.view', 'View Tasks', 'View tasks assigned to user', 'task'),
  ('task.view_all', 'View All Tasks', 'View all organization tasks', 'task'),
  ('task.create', 'Create Task', 'Create new tasks', 'task'),
  ('task.edit', 'Edit Task', 'Edit task details', 'task'),
  ('task.delete', 'Delete Task', 'Delete tasks', 'task'),
  ('task.assign', 'Assign Task', 'Assign tasks to users', 'task'),

  -- Teams
  ('team.view', 'View Teams', 'View team information', 'team'),
  ('team.create', 'Create Team', 'Create new teams', 'team'),
  ('team.edit', 'Edit Team', 'Edit team details', 'team'),
  ('team.delete', 'Delete Team', 'Delete teams', 'team'),
  ('team.manage', 'Manage Teams', 'Full team management access', 'team'),

  -- Reports
  ('report.view', 'View Reports', 'View reports and analytics', 'report'),
  ('report.create', 'Create Report', 'Create custom reports', 'report'),
  ('report.edit', 'Edit Report', 'Edit existing reports', 'report'),
  ('report.delete', 'Delete Report', 'Delete reports', 'report'),
  ('report.manage', 'Manage Reports', 'Full report management including metrics', 'report'),

  -- Governance
  ('governance.view', 'View Governance', 'View governance information', 'governance'),
  ('governance.manage', 'Manage Governance', 'Manage governance framework and policies', 'governance'),
  ('governance.audit', 'Access Audit Trail', 'Access system audit trail', 'governance'),

  -- Portfolio
  ('portfolio.view', 'View Portfolio', 'View portfolio information', 'portfolio'),
  ('portfolio.create', 'Create Portfolio', 'Create new portfolios', 'portfolio'),
  ('portfolio.edit', 'Edit Portfolio', 'Edit portfolio details', 'portfolio'),
  ('portfolio.delete', 'Delete Portfolio', 'Delete portfolios', 'portfolio'),
  ('portfolio.manage', 'Manage Portfolio', 'Full portfolio management', 'portfolio'),

  -- Programme
  ('programme.view', 'View Programme', 'View programme information', 'programme'),
  ('programme.create', 'Create Programme', 'Create new programmes', 'programme'),
  ('programme.edit', 'Edit Programme', 'Edit programme details', 'programme'),
  ('programme.delete', 'Delete Programme', 'Delete programmes', 'programme'),
  ('programme.manage', 'Manage Programme', 'Full programme management', 'programme'),

  -- Dependencies
  ('dependency.view', 'View Dependencies', 'View dependency information', 'dependency'),
  ('dependency.create', 'Create Dependency', 'Create new dependencies', 'dependency'),
  ('dependency.edit', 'Edit Dependency', 'Edit dependency details', 'dependency'),
  ('dependency.delete', 'Delete Dependency', 'Delete dependencies', 'dependency'),

  -- Benefits
  ('benefit.view', 'View Benefits', 'View benefits information', 'benefit'),
  ('benefit.create', 'Create Benefit', 'Create new benefits', 'benefit'),
  ('benefit.edit', 'Edit Benefit', 'Edit benefit details', 'benefit'),
  ('benefit.delete', 'Delete Benefit', 'Delete benefits', 'benefit'),
  ('benefit.manage', 'Manage Benefits', 'Full benefits management including measurements', 'benefit'),

  -- Strategy
  ('strategy.view', 'View Strategy', 'View strategic information', 'strategy'),
  ('strategy.create', 'Create Strategy', 'Create strategic objectives', 'strategy'),
  ('strategy.edit', 'Edit Strategy', 'Edit strategic details', 'strategy'),
  ('strategy.delete', 'Delete Strategy', 'Delete strategic items', 'strategy'),
  ('strategy.manage', 'Manage Strategy', 'Full strategy management', 'strategy'),

  -- Quality
  ('quality.view', 'View Quality', 'View quality information', 'quality'),
  ('quality.create', 'Create Quality Items', 'Create quality standards/reviews', 'quality'),
  ('quality.edit', 'Edit Quality Items', 'Edit quality details', 'quality'),
  ('quality.delete', 'Delete Quality Items', 'Delete quality items', 'quality'),
  ('quality.manage', 'Manage Quality', 'Full quality management', 'quality'),

  -- Stakeholders
  ('stakeholder.view', 'View Stakeholders', 'View stakeholder information', 'stakeholder'),
  ('stakeholder.create', 'Create Stakeholder', 'Create new stakeholders', 'stakeholder'),
  ('stakeholder.edit', 'Edit Stakeholder', 'Edit stakeholder details', 'stakeholder'),
  ('stakeholder.delete', 'Delete Stakeholder', 'Delete stakeholders', 'stakeholder'),
  ('stakeholder.manage', 'Manage Stakeholders', 'Full stakeholder management', 'stakeholder'),

  -- Organization Admin
  ('org.admin', 'Organization Admin', 'Full organization administration access', 'organization'),
  ('org.view_settings', 'View Org Settings', 'View organization settings', 'organization'),
  ('org.manage_users', 'Manage Users', 'Manage organization users', 'organization'),
  ('org.manage_billing', 'Manage Billing', 'Manage subscription and billing', 'organization');
```

---

## Implementation Phases & Timeline

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Quick wins and essential functionality

**Week 1:**
- [x] Dashboard enhancement ✅ Complete
- [x] Projects completion ✅ Complete
- [x] Update menu configuration ✅ Complete
- [x] Create base service structure ✅ Complete

**Week 2:**
- [x] Tasks module integration ✅ Complete
- [x] Teams module (basic) ✅ Complete
- [x] Reports & Analytics (basic) ✅ Complete

**Deliverables:**
- Enhanced dashboard with KPIs
- Complete project CRUD with templates
- Task management with board/calendar views
- Basic team management
- Report library with templates

### Phase 2: Advanced PM (Weeks 3-4)
**Goal:** Professional PM capabilities

**Week 3:**
- [x] Governance module ✅ Complete
- [x] Portfolio module ✅ Complete
- [x] Programme module ✅ Complete

**Week 4:**
- [x] Dependencies module ✅ Complete
- [x] Benefits module ✅ Complete

**Deliverables:**
- Governance framework and compliance tracking
- Portfolio management with prioritization
- Programme management with tranches
- Dependency tracking with critical path
- Benefits realization tracking

### Phase 3: Strategic & Quality (Weeks 5-6)
**Goal:** Strategic alignment and quality assurance

**Week 5:**
- [x] Strategy module ✅ Complete
- [x] Quality module ✅ Complete

**Week 6:**
- [x] Stakeholders module ✅ Complete
- [x] Cross-module integration ✅ Complete (all modules use platformDb and account_id filtering)

**Deliverables:**
- Strategic objectives and OKR management
- Quality standards and reviews
- Stakeholder analysis and engagement
- Integrated workflows across modules

### Phase 4: Administration (Week 7)
**Goal:** Organization management

**Week 7:**
- [x] Organization Admin module ✅ Complete
- [x] User management enhancement ✅ Complete (integrated with account management)
- [ ] Subscription management 🔨 Future enhancement
- [ ] Analytics and usage tracking 🔨 Future enhancement

**Deliverables:**
- Complete org admin functionality
- User invitation and role management
- Subscription and billing management
- Usage analytics and reporting

### Phase 5: Polish & Testing (Week 8)
**Goal:** Production readiness

**Week 8:**
- [ ] Comprehensive testing (unit + integration)
- [ ] Performance optimization
- [ ] Documentation completion
- [ ] User acceptance testing
- [ ] Bug fixes and refinements

**Deliverables:**
- 70%+ test coverage
- All documentation complete
- Performance benchmarks met
- Production deployment ready

---

## Testing Strategy

### Unit Testing
- All services must have unit tests
- Target 70% overall coverage
- Critical paths: 100% coverage
- Use Vitest + React Testing Library

### Integration Testing
- Complete user flows
- Multi-module interactions
- Database operations
- API endpoint testing

### E2E Testing (Optional)
- Critical user journeys
- Registration to project creation
- Task assignment and completion
- Report generation

### Performance Testing
- Page load times < 2 seconds
- API response times < 500ms
- Database query optimization
- Large dataset handling

---

## Documentation Requirements

### User Documentation
For each module create:
1. **User Guide** (`Documentation/{Module}_User_Guide.md`)
   - Feature overview
   - Step-by-step instructions
   - Screenshots and examples
   - Common workflows
   - Tips and best practices

2. **Implementation Summary** (`Documentation/{Module}_Implementation.md`)
   - Technical architecture
   - Database schema
   - API endpoints
   - Component structure
   - Integration points

### Developer Documentation
1. **API Documentation**
   - Service method signatures
   - Parameters and return types
   - Error handling
   - Usage examples

2. **Database Documentation**
   - Table schemas
   - Relationships
   - Indexes
   - RLS policies
   - Triggers and functions

---

## Success Criteria

### Functional Requirements
✅ All 14 modules fully implemented
✅ Complete CRUD operations for all entities
✅ Permission-based access control
✅ Multi-tenant data isolation
✅ Mobile-responsive design
✅ Dark mode support

### Technical Requirements
✅ All database tables created with RLS
✅ All tables registered in database_tables
✅ All routes configured in App.jsx
✅ All menu items in pmMenuConfig.js
✅ All services follow naming conventions
✅ All components in correct folder structure

### Quality Requirements
✅ 70%+ test coverage
✅ All critical paths tested
✅ Performance targets met
✅ Security audit passed
✅ Accessibility compliance

### Documentation Requirements
✅ User guides for all modules
✅ Implementation summaries
✅ API documentation
✅ Database documentation
✅ Deployment guide

---

## Risk Management

### Technical Risks
1. **Database Performance**
   - **Risk:** Slow queries with large datasets
   - **Mitigation:** Materialized views, indexes, query optimization

2. **Permission Complexity**
   - **Risk:** Complex permission logic causing bugs
   - **Mitigation:** Comprehensive testing, clear documentation

3. **Module Integration**
   - **Risk:** Breaking existing functionality
   - **Mitigation:** Feature flags, gradual rollout, thorough testing

### Schedule Risks
1. **Scope Creep**
   - **Risk:** Adding features beyond plan
   - **Mitigation:** Strict scope control, phase-based approach

2. **Technical Debt**
   - **Risk:** Rushing implementation
   - **Mitigation:** Code reviews, refactoring sprints

---

## Next Steps

1. ✅ **User Approval** - Review and approve this plan
2. 🔨 **Phase 1 Kickoff** - Begin dashboard enhancement
3. 🔨 **Weekly Reviews** - Progress check and adjustments
4. 🔨 **Continuous Deployment** - Deploy completed modules incrementally

---

## Appendix

### Technology Stack
- **Frontend:** React 18, React Router v6
- **UI Library:** Tailwind CSS, shadcn/ui components
- **State Management:** React Context + Hooks
- **Data Fetching:** Supabase Client
- **Charts:** Recharts / Chart.js
- **Forms:** React Hook Form
- **Validation:** Zod
- **Testing:** Vitest, React Testing Library
- **Backend:** Supabase (PostgreSQL + RLS + Edge Functions)

### File Naming Conventions
- **Pages:** PascalCase (e.g., `TaskList.jsx`)
- **Components:** PascalCase (e.g., `TaskCard.jsx`)
- **Services:** camelCase (e.g., `taskService.js`)
- **SQL Files:** snake_case with version (e.g., `v142_tasks_enhancements.sql`)
- **Documentation:** Snake_Case (e.g., `Task_Management_Guide.md`)

### Glossary
- **CRUD:** Create, Read, Update, Delete
- **RLS:** Row Level Security
- **OKR:** Objectives and Key Results
- **KPI:** Key Performance Indicator
- **RBAC:** Role-Based Access Control
- **PWA:** Progressive Web App

---

**End of Plan**
