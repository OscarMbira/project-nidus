# Project Nidus – Role Menu Structures

**Version:** v671  
**Last Updated:** 2026-06-01  
**Legend:** `[S]` = Predictive - PRINCE2 · `[P]` = Predictive - PMBOK · `[A]` = Adaptive - Agile · *(no badge)* = Universal / Cross-Methodology

---

## PLATFORM ROLES

---

### PMO Layout Roles

---

#### 5.1.1 `pmo_admin` – PMO Administrator

```
══ EXECUTIVE OVERVIEW ══════════════════════════════════════════
  Dashboard (PMO KPIs, Governance Events, Portfolio Health)

══ PORTFOLIO & DELIVERY ════════════════════════════════════════
  Portfolio
    ├── Portfolio Overview
    ├── Portfolio Dependencies
    └── Portfolio Collisions
  Programme
    ├── Programme Management
    └── Benefits Management
  Planning Intelligence
    ├── Planning Hub
    ├── Intelligence Rules
    └── Governance Rules Configuration
  Project Execution
    Projects
      ├── Project Dashboard
      ├── My Projects
      ├── All Projects
      ├── Create Project / Quick Create
      ├── Archived Projects
      ├── On Hold / Drafts
      ├── Members & Roles
      ├── My Daily Log
      ├── Story Map
      └── Releases
    Project Oversight
      ├── Risk Register
      ├── Issue Register
      ├── Quality Register
      ├── Lessons Log
      ├── Delay Register
      ├── Scope Oversight
      ├── Schedule Oversight
      └── Change Register

══ [S] PREDICTIVE - PRINCE2 ════════════════════════════════
  Initiation Hub
    Project Mandates
      ├── All Mandates
      ├── Create Mandate
      └── Unlinked Mandates
    Project Briefs
      ├── All Briefs
      └── Create Brief
    Business Cases
      ├── Business Cases (list)
      └── Create Business Case
    Benefits Review Plans
    Pre-Project Templates
  Governance & Standards
    ├── Communication Strategy
    ├── Configuration Strategy
    ├── Quality Strategy
    ├── Risk Strategy
    ├── Project Initiation Documents (PIDs)
    ├── ITTO Templates / Drafts
    ├── Enterprise Environmental Factors (EEF)
    └── Organisational Process Assets (OPA)

══ [P] PREDICTIVE - PMBOK ═════════════════════════════════════
  Process Group Forms
    ├── Initiating
    ├── Planning
    ├── Executing
    ├── Monitoring & Controlling
    ├── Closing
    ├── Drafts
    └── Approvals

══ [A] ADAPTIVE - AGILE ════════════════════════════════════════════
  Agile & Lean Tools
    ├── Scrum of Scrums
    ├── Value Stream Map
    ├── Kaizen Board
    └── Agile Templates
  Agile Delivery
    ├── Story Maps (cross-project)
    └── Releases
  Agile Metrics
    ├── Sprint Metrics
    └── Lean Metrics

══ REPORTING & INTELLIGENCE ════════════════════════════════════
  Reporting & Assurance
    ├── Highlight Reports
    ├── Exception Reports
    ├── End Stage Reports
    ├── End Project Reports
    ├── Lessons Reports
    ├── Report Library
    ├── Analytics Dashboards
    ├── Dashboard Builder
    ├── Scheduled Reports
    └── Agile Metrics Hub
  Financial Management
    ├── Financial Reports
    ├── Portfolio EVM
    ├── Programme EVM
    ├── Project EVM
    ├── Expense Approvals
    └── Expense Thresholds

══ WORKFLOWS & GOVERNANCE ══════════════════════════════════════
  Workflows & Approvals
    ├── Mandate Approvals
    └── Project Brief Approvals
  Authorisation & Lifecycle
    ├── Authorisation Queue
    ├── Lifecycle Dashboard
    ├── Configure Rules
    ├── Approval Chains
    ├── Archive Retention
    └── Archive Vault
  Quality & Testing

══ KNOWLEDGE & OPERATIONS ══════════════════════════════════════
  Knowledge & Assets
    ├── Org Knowledge Hub
    ├── Add OPA / OPA Drafts / OPA Bulk Upload
  Template Library
    ├── Template Hub
    ├── Browse Templates
    ├── Manage Templates
    ├── New Template
    ├── Industry Templates
    └── Delay Templates
  Strategy & OKRs
    ├── OKR Dashboard
    ├── Objectives & Key Results
    ├── Alignment Map
    └── OKR Check-ins
  Procurement
    ├── RFP Register
    ├── Load RFP
    └── RFP Drafts
  Collaboration
    └── Whiteboard

══ PEOPLE & RESOURCES ══════════════════════════════════════════
  People & Resources
    ├── Manager Assignments
    ├── Appointment Tracker
    ├── Assignment Settings
    ├── Invitation Tracker
    ├── Send Invitations
    ├── Assign Roles
    ├── Add Users
    ├── Resource Directory
    └── Team Capacity
  Stakeholders (cross-project view)

══ EMAIL & NOTIFICATIONS ═══════════════════════════════════════
  Email & Notifications
    ├── Email Settings
    ├── Sender Profiles
    ├── Invitation Templates
    ├── Invitation Expiry
    ├── Messages
    ├── Direct Messages
    ├── Meetings
    └── Pending AI Reviews
  Notification Preferences

══ ADMINISTRATION ══════════════════════════════════════════════
  Administration
    Organisation & Access
      ├── Organisation Settings
      ├── User Management
      ├── Role Menu Access
      └── Branding & Identity
    Project Configuration
      ├── Project Types
      ├── Project Statuses
      ├── Funding Sources
      └── Budget Categories
    Extensions & Integrations
      ├── Local Data Extensions
      ├── Form Templates
      └── Integrations
```

*Standard `pmo_admin` (no billing privileges) — Administration only; no Subscription item.*

---

#### 5.1.1b `pmo_admin` + Account Owner Privileges (delegated billing)

*Same PMO Administration as §5.1.1, plus Account & Subscription (§5.1.3). Granted by account owner via billing delegation.*

---

#### 5.1.2 `system_admin` – System Administrator

*Inherits everything from `pmo_admin`, plus:*

```
══ SYSTEM ADMINISTRATION ═══════════════════════════════════════
  System Administration
    ├── Platform Settings
    ├── PWA Settings
    ├── Authentication Settings
    ├── Encryption & Security
    ├── GDPR Compliance
    ├── Roles & Permissions
    ├── Help Content Management
    ├── Feedback Analysis
    └── Monitoring Dashboard
```

---

#### 5.1.3 `account_owner` – Account Owner

*Founder/legal owner: `account_owner` + `pmo_admin`. Full PMO access plus Account & Subscription (billing automatic — no delegation record required).*

```
══ ACCOUNT & SUBSCRIPTION ══════════════════════════════════════
  Subscription & Billing
    ├── Current Plan
    ├── Upgrade / Downgrade
    ├── Billing History
    └── Payment Methods
  Organisation Settings (elevated)
    ├── Organisation Profile
    ├── Branding & Identity
    └── Domain Settings
```

---

### PM Layout Roles

---

#### 5.2.1 `project_manager` – Project Manager (Full Access)

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard
  AI Assistant
  Projects
    ├── My Projects
    ├── All Projects
    ├── Create Project
    ├── Templates
    ├── Archives / On Hold
    ├── Manage Members
    ├── My Daily Log
    └── Lessons Log
  Tasks
    ├── My Tasks
    ├── All Tasks
    ├── Task Board (Kanban)
    └── Task Calendar
  Teams
    ├── All Teams
    ├── My Team
    ├── Resource Directory
    ├── Skill Matrix
    ├── Capacity Planning
    └── Leave Calendar
  Calendar
  Controls & Registers
    ├── Risk Register / Drafts
    ├── Issue Log
    ├── Change Log
    ├── Delay Register / Drafts
    ├── Requirements Register
    └── EEF
  Stakeholders
    ├── Stakeholder Register
    ├── Stakeholder Analysis
    ├── Engagement Planning
    ├── Communication Plans
    ├── Power/Interest Matrix
    └── Assessment Matrix
  Quality & Testing
  Reporting & Analytics
    ├── Report Library
    ├── Report Builder
    ├── Analytics Dashboards
    └── Custom Metrics
  Financial
    ├── My Expenses
    ├── Expense Approvals
    └── Financial Reports
  Authorisation
    ├── Pending My Approval
    ├── My Submitted Records
    └── Approval Chains

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Pre-Project & Initiation
    ├── Project Mandate
    ├── Project Brief
    └── Business Case
  Project Controls
    ├── Project Initiation Document (PID)
    ├── Benefits Review Plan
    ├── Work Packages
    ├── Product Descriptions
    └── Project Product Description (PPD)
  Governance & Standards
    ├── Communication Management Strategy
    ├── Configuration Management Strategy
    ├── Quality Management Strategy
    ├── Risk Management Strategy
    └── Document Governance
  Delivery Reporting
    ├── Checkpoint Reports
    ├── Highlight Reports
    ├── Issue Reports
    ├── Exception Reports
    ├── End Stage Reports
    └── End Project Report

══ [P] PREDICTIVE - PMBOK ════════════════════════════════════════
  Process Group Forms
    ├── Initiating
    ├── Planning
    ├── Executing
    ├── Monitoring & Controlling
    ├── Closing
    ├── Drafts
    └── Approvals
  ITTO Framework
    ├── ITTO Templates
    ├── ITTO Project
    └── ITTO Drafts

══ [A] ADAPTIVE - AGILE ══════════════════════════════════════════════
  Agile Delivery
    ├── Story Map
    └── Releases / Sprints
  Agile Process Forms
  Lean Tools
    ├── Value Stream Map
    └── Kaizen Board
  Planning Tools
    ├── Planning Poker
    └── S-Curve & Baselines

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Process Templates
    ├── Hub / Pre-Project / Initiating / Planning
    ├── Executing / Monitoring / Closing
    └── [A] Agile Templates
  Knowledge & Resources
    ├── Industry Templates
    └── My Industry Plan
  Strategy & OKRs
    ├── OKR Dashboard
    ├── Objectives & Key Results
    ├── Alignment Map
    └── OKR Check-ins
  Resources Hub
    ├── Workload Heatmap
    ├── RACI Matrix
    ├── Timesheets
    └── Training Tracker
  Project Settings
    ├── Custom Fields
    ├── Public Intake Forms
    ├── Recurring Tasks
    └── Project Clone
  Procurement & Contracts
    ├── Vendor Register
    ├── Purchase Requests / Orders
    ├── Contracts
    └── Invoice Tracking
  Dashboards & Analytics
    ├── Dashboard Builder
    ├── Portfolio Map
    └── Scheduled Reports
  Collaboration
    └── Whiteboard
  Automation
    ├── Automation Rules
    ├── Template Library
    └── Execution Log
  Integrations
    └── Integration Marketplace / My Connections
  Notification Preferences
```

---

#### 5.2.2 `portfolio_manager` – Portfolio Manager

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (Portfolio-scoped)
  AI Assistant
  Portfolio
    ├── Portfolio Overview
    ├── Portfolio Dependencies
    ├── Portfolio Collisions
    ├── Portfolio Map
    ├── Strategic Alignment
    └── Benefits Pipeline
  Programme
    ├── Programme List
    ├── Programme Benefits
    └── Programme Dependencies
  Projects (read-only view)
    ├── All Projects
    ├── Project Health
    └── Project Exceptions / Escalations
  Financial Management
    ├── Portfolio EVM
    ├── Programme EVM
    ├── Project EVM
    ├── Financial Reports
    └── Budget / Forecast Overview
  Reporting & Analytics
    ├── Report Library
    ├── Analytics Dashboards
    ├── Dashboard Builder
    └── Scheduled Reports

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Business Justification (cross-project)
    ├── All Business Cases
    ├── All PIDs
    └── Benefits Review Plans
  Governance & Standards
    ├── Policies & Compliance
    └── Decision Log

══ [P] PREDICTIVE - PMBOK ════════════════════════════════════════
  Process Group Overview
    └── Aggregated Process Group Status

══ [A] ADAPTIVE - AGILE ══════════════════════════════════════════════
  Agile Metrics
    ├── Portfolio Agile Health
    ├── Sprint Metrics (aggregated)
    └── Value Stream Map (portfolio view)

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Strategy & OKRs
    ├── OKR Dashboard
    ├── Portfolio OKR Alignment
    └── OKR Check-ins
  Stakeholders (portfolio-level)
  Procurement & Contracts (oversight)
  Notification Preferences
```

---

#### 5.2.3 `programme_manager` – Programme Manager

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (Programme-scoped)
  AI Assistant
  Programme
    ├── My Programmes
    ├── Programme Projects
    ├── Programme Benefits
    ├── Programme Dependencies
    └── Benefits Management
  Projects (programme-scoped)
    ├── Programme Projects List
    ├── Manage Members
    └── Project Health
  Financial Management
    ├── Programme Budget
    ├── Programme EVM
    ├── Project EVM
    └── Financial Reports
  Reporting & Analytics
    ├── Highlight Reports (programme-level)
    ├── End Stage Reports
    ├── Report Library
    └── Analytics Dashboards

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Business Justification
    ├── Programme Business Case
    ├── Benefits Review Plans
    └── PIDs (programme-scoped)
  Governance & Standards
    ├── Governance Framework
    ├── Communication Strategy
    └── Risk Management Strategy

══ [P] PREDICTIVE - PMBOK ════════════════════════════════════════
  Process Group Forms (programme-scoped)
    ├── Planning
    ├── Executing
    ├── Monitoring & Controlling
    └── Closing

══ [A] ADAPTIVE - AGILE ══════════════════════════════════════════════
  Agile Delivery
    ├── Programme Story Map
    └── Releases (programme-level)
  Agile Metrics (programme-scoped)

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Controls & Registers
    ├── Risk Register (programme-level)
    ├── Issue Log
    ├── Change Log
    └── Delay Register
  Stakeholders (programme-level)
  Authorisation
    ├── Pending My Approval
    └── My Submitted Records
  Strategy & OKRs
  Notification Preferences
```

---

#### 5.2.4 `project_sponsor` – Project Sponsor

*Focused on oversight, business justification, and approvals. No delivery detail.*

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (Sponsor view – KPIs, health status)
  My Projects (read-only)
  Financial Overview (read-only)
    ├── Budget Status
    └── Financial Reports

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Business Justification (read + approve)
    ├── Business Cases (my projects)
    ├── Benefits Review Plans
    ├── Project Briefs
    └── PIDs

══ APPROVALS & GOVERNANCE ════════════════════════════════════════
  Authorisation
    ├── Pending My Approval
    ├── My Submitted Records
    └── Approval Chains
  Governance
    ├── Decision Log
    ├── Work Authorisations
    └── Stage Gate Reviews

══ REPORTING ════════════════════════════════════════════════════
  Reports
    ├── Highlight Reports (my projects)
    ├── Exception Reports
    ├── End Stage Reports
    └── End Project Reports
  Stakeholders (my projects)

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Notification Preferences
```

---

#### 5.2.5 `executive` – Executive

*Read-only strategic overview. No editing.*

```
══ EXECUTIVE OVERVIEW ════════════════════════════════════════════
  Dashboard (Executive KPIs, Portfolio Health, Alerts)
  Portfolio
    ├── Portfolio Overview
    ├── Portfolio Map
    ├── Strategic Alignment
    └── Benefits Pipeline
  Programme (summary view)
  Projects (summary / RAG status only)

══ REPORTING & INTELLIGENCE ══════════════════════════════════════
  Reports (read-only)
    ├── Portfolio-level Reports
    ├── Highlight Reports (summary)
    ├── Exception Reports
    └── End Project Reports
  Analytics Dashboards
  Financial Overview (read-only)
    ├── Portfolio EVM
    ├── Programme EVM
    ├── Project EVM
    └── Budget vs Actuals

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Business Justification (read-only)
    ├── Business Cases (approved)
    └── Benefits Review Plans (summary)

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Notification Preferences
```

---

#### 5.2.6 `project_board_member` – Project Board Member

*Governance and stage gates. Approve/reject authority.*

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (Board member view)
  My Projects (board membership view)

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Business Justification (review + approve)
    ├── Business Cases
    ├── Project Briefs
    └── PIDs
  Governance
    ├── Governance Framework
    ├── Decision Log
    ├── Work Authorisations
    └── Stage Gate Reviews

══ APPROVALS & REPORTING ════════════════════════════════════════
  Authorisation
    ├── Pending My Approval
    ├── My Submitted Records
    └── Approval Chains
  Reports (read-only)
    ├── Highlight Reports
    ├── Exception Reports
    ├── End Stage Reports
    └── Checkpoint Reports
  Project Oversight (read-only)
    ├── Risk Register
    ├── Issue Log
    └── Change Log

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Notification Preferences
```

---

#### 5.2.7 `project_assurance` – Project Assurance

*Compliance, audit, and assurance across projects.*

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (Assurance view)
  Projects (assurance scope – read-only)

══ QUALITY & ASSURANCE ══════════════════════════════════════════
  Quality & Testing
    ├── Quality Register
    ├── Quality Reviews
    ├── Quality Inspections
    ├── Quality Reports
    ├── Compliance Checks
    └── Audit Findings / CAPA
  Governance
    ├── Governance Framework
    ├── Policies & Compliance
    └── Document Governance

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Assurance Artefacts (read-only)
    ├── Business Cases
    ├── PIDs
    ├── Benefits Review Plans
    ├── Quality Management Strategy
    └── Configuration Management Strategy

══ REPORTING & CONTROLS ══════════════════════════════════════════
  Reports (read-only)
    ├── Exception Reports
    ├── End Stage Reports
    └── Lessons Reports
  Project Oversight (read-only)
    ├── Risk Register
    ├── Issue Log
    └── Delay Register
  Authorisation
    ├── Pending My Approval
    └── My Submitted Records

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Notification Preferences
```

---

#### 5.2.8 `quality_assurance` – Quality Assurance

*Narrower than Project Assurance – focused on quality activities.*

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (QA view)
  Projects (QA scope – read-only)

══ QUALITY & TESTING ════════════════════════════════════════════
  Quality & Testing
    ├── Quality Register
    ├── Quality Reviews
    ├── Quality Inspections
    ├── Quality Reports
    ├── Test Plans
    ├── Test Cases
    ├── Defect Register
    └── CAPA

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Quality Documents (read-only)
    └── Quality Management Strategy

══ REPORTING ════════════════════════════════════════════════════
  Reports (read-only)
    └── Quality / Assurance Reports
  Authorisation
    └── Pending My Approval

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Notification Preferences
```

---

#### 5.2.9 `stakeholder` – Stakeholder

*Very limited: read-only dashboard + stakeholder-specific content + communications.*

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (Stakeholder view – project status)
  My Projects (read-only)

══ COMMUNICATION & REPORTING ════════════════════════════════════
  Reports (read-only – shared with me)
    ├── Highlight Reports
    └── End Project Reports
  Communications
    ├── Messages
    └── Meetings

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Stakeholder Documents (read-only)
    ├── Benefits Review Plans (shared)
    └── Project Brief (summary view)

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Notification Preferences
```

---

#### 5.2.10 `viewer` – Viewer

*Read-only dashboard and shared reports only.*

```
══ UNIVERSAL ════════════════════════════════════════════════════
  Dashboard (read-only)
  Projects (read-only – assigned only)

══ REPORTING ════════════════════════════════════════════════════
  Reports (read-only – shared with me)
    └── Any reports explicitly shared

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Notification Preferences
```

---

### TM Layout Roles

---

#### 5.3.1 `team_member` – Team Member

```
══ PERSONAL WORKSPACE ════════════════════════════════════════════
  Dashboard (Personal – My Work, My Tasks, My Capacity)
  My Tasks
    ├── Task Board (Kanban)
    ├── Task List
    └── Task Calendar
  My Daily Log
  My Lesson Actions
  Timesheets (if enabled)
  Calendar

══ TEAM ══════════════════════════════════════════════════════════
  My Team
    ├── Team Members
    ├── Team Board
    └── Team Calendar
  Communications
    ├── Messages
    ├── Direct Messages
    └── Meetings

══ DELIVERY ARTEFACTS (READ) ════════════════════════════════════
  My Work Packages (assigned)
  My Product Descriptions (assigned)

══ [S] PREDICTIVE - PRINCE2 ══════════════════════════════════
  Assigned Structured Artefacts (read-only)
    └── Work Packages (assigned to me)

══ [A] ADAPTIVE - AGILE ══════════════════════════════════════════════
  Agile Delivery
    ├── My Sprint Tasks
    └── Story Map (read-only)

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  Authorisation
    ├── My Submitted Records
    └── Pending My Approval
  OKR & Goals
    └── My OKR Contributions
  Workload Heatmap (personal view)
  Notification Preferences
```

---

#### 5.3.2 `team_lead` – Team Lead

*Inherits `team_member` menu, plus:*

```
══ TEAM MANAGEMENT ══════════════════════════════════════════════
  Team (lead-level access)
    ├── All Team Members
    ├── Team Assignments
    ├── Workstream Plans
    ├── Team Charter (edit)
    ├── Timesheet Management
    └── Team Capacity

══ DELIVERY ════════════════════════════════════════════════════
  Work Packages (create/edit for team)
  Product Descriptions (create/edit for team)
  Daily Log (team-level)
  Controls & Registers (limited – Risk, Issue)

══ REPORTING ════════════════════════════════════════════════════
  Checkpoint Reports (create)
  Team Reports

══ CROSS-FRAMEWORK ═══════════════════════════════════════════════
  (Same as team_member)
```

---

## SIMULATOR ROLES

---

### Simulator PMO Layout Roles

---

#### 5.4.1 `sim_pmo_admin` – Simulator PMO Admin

*Mirrors `pmo_admin` Platform structure with "Practice" prefixes.*

```
══ LIVE SIMULATION ══════════════════════════════════════════════
  Start New Run
  Active Run Dashboard
  Event Inbox
  EVM Dashboard
  My Run History

══ EXECUTIVE OVERVIEW ════════════════════════════════════════════
  Practice Dashboard
  Practice Portfolio
    ├── Portfolio Dependencies
    └── Portfolio Collisions
  Practice Programme
    ├── Programme Management
    └── Benefits Management
  Planning Intelligence (practice)

══ PRACTICE PROJECT DELIVERY ════════════════════════════════════
  Practice Projects
  Practice Project Oversight
    ├── Risk Register
    ├── Issue Register
    ├── Quality Register
    ├── Lessons Log
    ├── Delay Register / Templates
    ├── Scope Oversight
    ├── Schedule Oversight
    └── Change Register

══ [S] PRACTICE – STRUCTURED ════════════════════════════════════
  Practice Initiation Hub
    ├── Practice Mandates
    ├── Practice Briefs
    ├── Practice Business Cases
    ├── Practice PIDs
    └── Practice Benefits Review Plans
  Practice Governance & Standards
    ├── Management Strategies (CMS/QMS/RMS/Comms)
    ├── ITTO Templates / Drafts
    └── EEF

══ [P] PRACTICE – PMBOK ═════════════════════════════════════════
  Practice Process Group Forms (all groups)

══ [A] PRACTICE – AGILE & LEAN ══════════════════════════════════
  Practice Agile & Lean Tools
    ├── Scrum of Scrums
    ├── Value Stream Map
    └── Kaizen Board
  Practice Agile Delivery
  Practice Agile Metrics

══ PRACTICE REPORTING & INTELLIGENCE ════════════════════════════
  Practice Reporting & Assurance
  Practice Financial Management

══ PRACTICE WORKFLOWS & GOVERNANCE ══════════════════════════════
  Practice Workflows & Approvals
  Practice Authorisation & Lifecycle
  Practice Quality & Testing

══ PRACTICE PROCESS TEMPLATES ════════════════════════════════════
  Practice Process Templates (Hub, all phases + Agile)

══ PRACTICE KNOWLEDGE & OPERATIONS ══════════════════════════════
  Practice Knowledge & Assets
  Practice Procurement
  Practice Email & Notifications
  Practice Administration
```

---

#### 5.4.2 `simulator_admin` – Simulator Admin

*Inherits everything from `sim_pmo_admin`, plus:*

```
══ SIMULATOR SYSTEM ADMINISTRATION ═══════════════════════════════
  Platform Settings
  PWA Settings
  Subscription & Billing
  Branding & Identity
  Scenario Management (admin)
    ├── All Scenarios
    ├── Publish / Unpublish
    └── Scenario Analytics
  User Management (simulator)
  Leaderboard Administration
  Certificate Administration
```

---

### Simulator PM Layout Roles

---

#### 5.5.1 `sim_project_manager` – Simulator Project Manager

*Mirrors `project_manager` Platform structure with "Practice" prefixes.*

```
══ LIVE SIMULATION ══════════════════════════════════════════════
  Start New Run
  Active Run Dashboard
  Event Inbox
  EVM Dashboard
  My Run History

══ UNIVERSAL PRACTICE ════════════════════════════════════════════
  Practice Dashboard
  AI Workspace
  Practice Projects
    ├── My Practice Projects
    ├── Create Practice Project
    ├── Manage Members
    └── Practice Tasks
  Practice Teams
    ├── Practice Teams
    └── My Practice Team
  Practice Calendar
  Practice Controls & Registers
    ├── Risk Register
    ├── Issue Register
    ├── Quality Register
    ├── Delay Register
    ├── Lessons Log
    └── Configuration Items (CMDB)
  Practice Stakeholders
  Practice Quality & Testing
  Practice Financial Management (if premium)

══ [S] PRACTICE – STRUCTURED ════════════════════════════════════
  Practice Pre-Project & Initiation
    ├── Practice Mandate
    ├── Practice Brief
    └── Practice Business Case
  Practice Project Controls
    ├── Practice PID
    ├── Practice Benefits Review Plan
    ├── Practice Work Packages
    ├── Practice Product Descriptions
    └── Practice PPD
  Practice Governance & Standards
    ├── Communication Management Strategy
    ├── Configuration Management Strategy
    ├── Quality Management Strategy
    └── Risk Management Strategy
  Practice Delivery Reporting
    ├── Checkpoint Reports
    ├── Highlight Reports
    ├── Exception Reports
    ├── End Stage Reports
    └── End Project Report

══ [P] PRACTICE – PMBOK ═════════════════════════════════════════
  Practice Process Group Forms
    ├── Initiating / Planning / Executing / M&C / Closing
    ├── Drafts
    └── Approvals

══ [A] PRACTICE – AGILE & LEAN ══════════════════════════════════
  Practice Agile Delivery
    ├── Story Map
    └── Releases / Sprints
  Practice Agile Process Forms
  Practice Lean Tools

══ PRACTICE CROSS-FRAMEWORK ══════════════════════════════════════
  Practice Process Templates
  Practice Strategies
  Practice Authorisation
    ├── Pending My Approval
    └── My Submitted Records
  Practice Lifecycle (6 process groups)
  Scenarios
    ├── Browse Scenarios
    └── My Progress
  Learning Path
  Leaderboard
  Certificates
  My Profile (Stats / Badges / Achievements)
  Settings
```

---

### Simulator TM Layout Roles

---

#### 5.6.1 `sim_team_member` – Simulator Team Member

```
══ LIVE SIMULATION ══════════════════════════════════════════════
  Active Run Dashboard
  Event Inbox
  My Run History

══ PERSONAL PRACTICE WORKSPACE ══════════════════════════════════
  Practice Dashboard
  My Practice Tasks
    ├── Task Board
    ├── Task List
    └── Task Calendar
  My Practice Daily Log
  Practice Team
    ├── My Practice Team
    └── Team Communications

══ [S] PRACTICE – STRUCTURED ════════════════════════════════════
  Assigned Practice Work Packages (read)

══ [A] PRACTICE – AGILE ══════════════════════════════════════════
  My Practice Sprint Tasks
  Practice Story Map (read-only)

══ PRACTICE CROSS-FRAMEWORK ══════════════════════════════════════
  Practice Authorisation
    ├── My Submitted Records
    └── Pending My Approval
  Scenarios (browse only)
  Learning Path
  Leaderboard
  Certificates
  My Profile
  Notification Preferences
```

---

### Simulator Learner Role

---

#### 5.7.1 `simulator_user` – Simulator User (General Learner)

*No assigned project. Focused on learning and practice scenarios.*

```
══ LEARNING HUB ══════════════════════════════════════════════════
  Dashboard (Learner)
  AI Workspace
  Learning Path
  Leaderboard
  Certificates
  My Profile
    ├── My Stats
    └── Badges & Achievements
  Settings

══ LIVE SIMULATION ══════════════════════════════════════════════
  Start New Run (scenario-based)
  Active Run Dashboard
  Event Inbox
  EVM Dashboard
  My Run History

══ SCENARIOS & PRACTICE ══════════════════════════════════════════
  Scenarios
    ├── Browse Scenarios (free + premium)
    ├── My Progress
    └── Custom Scenarios (premium only)
  Practice Projects (limited / scenario-scoped)

══ [S] PRACTICE – STRUCTURED ════════════════════════════════════
  Practice Initiation (scenario-scoped)
    ├── Practice Mandate
    ├── Practice Brief
    └── Practice Business Case

══ [P] PRACTICE – PMBOK ═════════════════════════════════════════
  Practice Process Groups (scenario-scoped)

══ [A] PRACTICE – AGILE ══════════════════════════════════════════
  Practice Agile Tools (scenario-scoped)

══ SUBSCRIPTION & UPGRADE ════════════════════════════════════════
  Upgrade to Premium (CTA for free-tier users)
  Scenario Marketplace
  Certification Exams (premium)
  Notification Preferences
```

---

## Role Access Summary Matrix

| Section / Track | sys_admin | acct_owner | pmo_admin | portfolio_mgr | programme_mgr | project_mgr | sponsor | executive | board_member | proj_assurance | qa | team_lead | team_member | stakeholder | viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Executive Overview | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | — | — | — | — | — | — | — |
| Portfolio | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — |
| Programme | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — |
| Projects (full) | ✓ | ✓ | ✓ | view | view | ✓ | view | view | view | view | — | — | — | — | — |
| Tasks | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | ✓ | ✓ | — | — |
| Teams | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | ✓ | ✓ | — | — |
| Controls & Registers | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | — | view | view | view | ✓ | — | — | — |
| **[S] Structured Track** | ✓ | ✓ | ✓ | view | ✓ | ✓ | ✓ | view | ✓ | view | view | view | view | view | — |
| **[P] PMBOK Track** | ✓ | ✓ | ✓ | view | ✓ | ✓ | — | — | — | view | — | — | — | — | — |
| **[A] Agile Track** | ✓ | ✓ | ✓ | view | — | ✓ | — | — | — | — | — | ✓ | ✓ | — | — |
| Reporting | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Financial | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | view | view | — | — | — | — | — | — | — |
| Workflows & Approvals | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Process Templates | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| Knowledge & Assets | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | — | — | — | — |
| People & Resources | ✓ | ✓ | ✓ | — | — | ✓ | — | — | — | — | — | ✓ | — | — | — |
| Email & Notifications | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | ✓ | ✓ | — |
| Administration | ✓ | ✓ | ✓ | — | — | — | — | — | — | — | — | — | — | — | — |
| Acct & Subscription | ✓ | ✓ | ✗ | — | — | — | — | — | — | — | — | — | — | — | — |
| System Administration | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Notification Preferences | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Simulator Roles Summary Matrix

| Section / Track | simulator_admin | sim_pmo_admin | sim_project_manager | sim_team_member | simulator_user |
|---|:---:|:---:|:---:|:---:|:---:|
| Live Simulation | ✓ | ✓ | ✓ | ✓ | ✓ |
| Practice Executive Overview | ✓ | ✓ | — | — | — |
| Practice Portfolio / Programme | ✓ | ✓ | — | — | — |
| Practice Projects (full) | ✓ | ✓ | ✓ | — | limited |
| Practice Tasks | ✓ | ✓ | ✓ | ✓ | — |
| Practice Controls & Registers | ✓ | ✓ | ✓ | — | — |
| **[S] Structured Practice** | ✓ | ✓ | ✓ | view | limited |
| **[P] PMBOK Practice** | ✓ | ✓ | ✓ | — | limited |
| **[A] Agile Practice** | ✓ | ✓ | ✓ | ✓ | limited |
| Practice Reporting | ✓ | ✓ | ✓ | — | — |
| Practice Administration | ✓ | ✓ | — | — | — |
| Scenarios | ✓ | ✓ | ✓ | browse | ✓ |
| Learning Path | ✓ | ✓ | ✓ | ✓ | ✓ |
| Leaderboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Certificates | ✓ | ✓ | ✓ | ✓ | ✓ |
| Simulator System Admin | ✓ | — | — | — | — |
| Subscription & Upgrade CTA | — | — | — | — | ✓ |
| Notification Preferences | ✓ | ✓ | ✓ | ✓ | ✓ |
