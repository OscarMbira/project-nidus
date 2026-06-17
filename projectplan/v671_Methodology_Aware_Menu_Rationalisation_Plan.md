# v671 – Methodology-Aware Menu Rationalisation Plan

**Version:** v671  
**Date:** 2026-05-29  
**Status:** COMPLETE – Implemented 2026-05-29

---

## 1. Problem Statement

The current sidebar menus mix three distinct project management methodologies without visual separation:

| Methodology | Key Items Currently Scattered |
|---|---|
| **Predictive – Structured/Traditional** | Mandate, Project Brief, Business Case, PID, Benefits Review Plan, Work Packages, Product Descriptions, Management Strategies (CMS/QMS/RMS), Governance |
| **Predictive – PMBOK (Process Groups)** | Process Group Forms (Initiating/Planning/Executing/M&C/Closing), ITTO Templates, EEF, EVM |
| **Agile / Lean** | Scrum of Scrums, Value Stream Map, Kaizen Board, Story Maps, Releases, Agile Process Forms, Sprint Metrics, Agile Process Templates |

**Resulting pain points:**
- A PMBOK practitioner cannot easily distinguish their process-group forms from structured/traditional documents
- Agile items are split across at least 4 different sections (Agile & Lean Tools, Process Group Forms → Agile tab, Process Templates → Agile section, Reporting → Agile Metrics)
- A hybrid project manager has no visual cue about which methodology each item belongs to
- No consistent methodology indicator across Platform and Simulator
- Roles like Executive, Sponsor, Project Board, Assurance, Stakeholder, and Viewer currently share the "pm" layout with no role-appropriate differentiation of visible sections

---

## 2. Role Inventory

### 2.1 Platform Roles

| Role | Layout Type | Access Level |
|---|---|---|
| `system_admin` | PMO | Full system + all PMO + System Administration |
| `account_owner` | PMO | Full PMO + Subscription/Billing focus |
| `pmo_admin` | PMO | Full PMO dashboard |
| `portfolio_manager` | PM | Portfolio + Programme + cross-project visibility |
| `programme_manager` | PM | Programme + Benefits + cross-project delivery |
| `project_manager` | PM | Full project delivery + all methodology tracks |
| `project_sponsor` | PM | Approvals, Business Justification, Dashboards (limited) |
| `executive` | PM | Read-only dashboards, KPIs, Portfolio health |
| `project_board_member` | PM | Governance approvals, Assurance reports, Stage gates |
| `project_assurance` | PM | Quality & compliance focus, Audits, Assurance checks |
| `quality_assurance` | PM | Quality, Testing, Inspections |
| `team_lead` | TM | Team tasks + Workstream plans + Timesheets |
| `team_member` | TM | Personal tasks, Daily log, Communications |
| `stakeholder` | PM | Very limited: Dashboard, Stakeholder reports, Communications |
| `viewer` | PM | Read-only dashboard only |

### 2.2 Simulator Roles

| Role | Layout Type | Access Level |
|---|---|---|
| `simulator_admin` | PMO | Full simulator + admin settings |
| `sim_pmo_admin` | PMO | Full simulator PMO practice access |
| `sim_project_manager` | PM | Full practice project delivery |
| `sim_team_member` | TM | Practice tasks, daily log |
| `simulator_user` | Learner | Scenarios, Learning path, Leaderboard, Certificates |

---

## 3. Best Practice Analysis

### Industry Standard (Planview, Planisware, Sciforma approach)
1. **Project-level methodology context** – each project declares its delivery approach
2. **Adaptive sidebar** – shows/hides methodology-specific sections based on the active project's methodology
3. **Universal "always-on" sections** – cross-methodology items always visible
4. **Visual methodology badges** – icons/badges on section headers indicating framework affinity
5. **Role-appropriate depth** – executives see executive views; team members see task views; PMs see full depth

### Recommendation: Phased Approach

**Phase 1 (Structural Reorganisation – No DB schema change)**
Reorganise the existing menu sections into clearly labelled methodology tracks with visual badges, AND introduce role-differentiated menu profiles for all 15 Platform + 5 Simulator roles.
This is a menu configuration + UI change only. No new DB tables needed.

**Phase 2 (Adaptive Sidebar – Project-level methodology setting)**
Add a `delivery_methodology` field to the `projects` table.
The sidebar dynamically collapses/expands methodology-specific tracks based on the active project.
A "Hybrid/All" mode shows every section.

**Phase 3 (Organisation-level Methodology Setting)**
Add a `default_methodology` field to the `organisations` table.
If an organisation has committed to a single methodology (e.g., "we are a PMBOK shop"), the irrelevant tracks are removed entirely from the sidebar — not just collapsed.
Project-level overrides in Phase 2 still work within the org's allowed methodology set.
This is the layer that makes the system truly methodology-exclusive for organisations that need it.

---

## 4. Organisation-Level Methodology Cascade

### 4.1 The Problem with Project-Only Methodology

If methodology is only set at the project level (Phase 2), every organisation still sees all three tracks in the sidebar — they are just collapsed for the active project. This is wrong for:

- A **PMBOK-only organisation** — their PMs should never see Structured/Traditional items; it creates confusion and noise
- A **Structured/Traditional-only organisation** — their PMs should never see PMBOK process-group forms
- An **Agile-only organisation** — the Structured initiation documents (Mandates, Briefs, PIDs) are irrelevant

### 4.2 Three-Layer Cascade Model

```
Layer 1: Organisation Setting   → controls which tracks EXIST in the sidebar
              ↓ inherited by
Layer 2: Project Override        → controls which track is ACTIVE/expanded
              ↓ inherited by
Layer 3: User Preference         → controls personal collapsed/expanded state
```

| Org Setting | Tracks Shown | Tracks Hidden |
|---|---|---|
| `structured` | Universal + [S] Structured | [P] PMBOK, [A] Agile |
| `pmbok` | Universal + [P] PMBOK | [S] Structured, [A] Agile |
| `agile` | Universal + [A] Agile | [S] Structured, [P] PMBOK |
| `hybrid` | Universal + [S] + [P] + [A] | *(nothing hidden)* |

**Override rule:** When `allow_project_methodology_override = true`, a project can activate a track outside the org default — but only PMO Admin or Account Owner can enable this setting.

### 4.3 DB Changes (Phase 3)

```sql
-- Organisation-level methodology setting
ALTER TABLE organisations
  ADD COLUMN default_methodology TEXT NOT NULL DEFAULT 'hybrid'
    CHECK (default_methodology IN ('structured', 'pmbok', 'agile', 'hybrid'));

ALTER TABLE organisations
  ADD COLUMN allow_project_methodology_override BOOLEAN NOT NULL DEFAULT TRUE;
```

### 4.4 Sidebar Visibility Logic (Phase 3)

```
fetchMenuFromDB()
  → fetch org.default_methodology
  → fetch project.delivery_methodology (if active project exists)

resolveVisibleTracks(orgMethodology, projectMethodology, allowOverride):
  if orgMethodology === 'hybrid':
    return ['structured', 'pmbok', 'agile']          // show all
  if allowOverride && projectMethodology exists:
    return [projectMethodology, orgMethodology]       // project wins + org fallback
  return [orgMethodology]                             // org-only
```

Tracks NOT in the resolved set are **completely removed** from the sidebar tree — not collapsed. They do not appear even as expandable groups.

### 4.5 Admin UI (Phase 3)

Under **Administration → Organisation Settings**, PMO Admin / Account Owner sees:

```
Methodology Settings
  ┌─────────────────────────────────────────────────────┐
  │  Default Methodology:  [ Hybrid ▼ ]                 │
  │    ○ Hybrid (all tracks visible)                    │
  │    ○ Structured / Traditional                       │
  │    ○ PMBOK Process Groups                           │
  │    ○ Agile & Lean                                   │
  │                                                     │
  │  ☑ Allow project-level methodology override         │
  │    (PMs can activate a different track per project) │
  └─────────────────────────────────────────────────────┘
```

---

## 5. Visual Design for Methodology Badges

Each methodology track header should display a small badge:

| Badge | Colour | Meaning |
|---|---|---|
| `[S]` / Shield icon | Blue (#3B82F6) | Predictive – Structured/Traditional |
| `[P]` / Gear icon | Green (#10B981) | Predictive – PMBOK Process Groups |
| `[A]` / Lightning icon | Orange (#F59E0B) | Agile & Lean |
| *(no badge)* | Grey (#6B7280) | Universal / Cross-methodology |

Implementation: CSS classes on `<SidebarSection>` components: `methodology-structured`, `methodology-pmbok`, `methodology-agile`. Section header gets a coloured left-border + small icon badge.

---

## 6. Proposed Menu Structures – All Roles

> Legend: `[S]` = Structured/Traditional track | `[P]` = PMBOK track | `[A]` = Agile & Lean track | *(no badge)* = Universal

---

### 5.1 PLATFORM – PMO Layout Roles

#### 5.1.1 `pmo_admin` – PMO Administrator

```
══ EXECUTIVE OVERVIEW ══════════════════════════════════════════
  Dashboard (PMO KPIs, Governance Events, Portfolio Health)
  Portfolio
    ├── Portfolio Dependencies
    └── Portfolio Collisions
  Programme
    ├── Programme Management
    └── Benefits Management
  Planning Intelligence
    ├── Planning Hub
    ├── Intelligence Rules
    └── Governance Rules Configuration

══ PROJECT DELIVERY ════════════════════════════════════════════
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
    ├── Delay Register / Delay Templates
    ├── Scope Oversight
    ├── Schedule Oversight
    └── Change Register

══ [S] PREDICTIVE – STRUCTURED ════════════════════════════════
  Initiation Hub
    ├── Project Mandates (All / Create / Unlinked)
    ├── Project Briefs (All / Create)
    ├── Business Cases (All / Create)
    ├── Project Initiation Documents (PIDs)
    └── Benefits Review Plans
  Governance & Standards
    ├── Communication Management Strategy
    ├── Configuration Management Strategy
    ├── Quality Management Strategy
    ├── Risk Management Strategy
    ├── ITTO Templates / Drafts
    └── Enterprise Environmental Factors (EEF)

══ [P] PREDICTIVE – PMBOK ═════════════════════════════════════
  Process Group Forms
    ├── Initiating
    ├── Planning
    ├── Executing
    ├── Monitoring & Controlling
    ├── Closing
    ├── Drafts
    └── Approvals

══ [A] AGILE & LEAN ════════════════════════════════════════════
  Agile & Lean Tools
    ├── Scrum of Scrums
    ├── Value Stream Map
    └── Kaizen Board
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
    ├── Expense Approvals
    └── Expense Thresholds

══ WORKFLOWS & GOVERNANCE ══════════════════════════════════════
  Workflows & Approvals
    ├── Mandate Pending Approvals
    └── Brief Pending Approvals
  Authorisation & Lifecycle
    ├── Authorisation Queue
    ├── Lifecycle Dashboard
    ├── Configure Rules
    ├── Approval Chains
    ├── Archive Retention
    └── Archive Vault
  Quality & Testing

══ PROCESS TEMPLATES ═══════════════════════════════════════════
  Process Templates
    ├── Hub
    ├── Pre-Project
    ├── Initiating
    ├── Planning
    ├── Executing
    ├── Monitoring & Control
    ├── Closing
    ├── Browse / Manage
    ├── [A] Agile Templates
    ├── New Template
    └── Industry Templates

══ KNOWLEDGE & OPERATIONS ══════════════════════════════════════
  Knowledge & Assets
    ├── Org Knowledge Hub
    ├── Process Assets
    ├── Add OPA / OPA Drafts / OPA Bulk Upload
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
    ├── Local Data Extensions
    ├── Form Templates
    ├── Organisation Settings
    ├── User Management
    ├── Role Menu Access
    ├── Project Types
    ├── Project Statuses
    ├── Funding Sources
    ├── Budget Categories
    ├── Subscription
    ├── Branding & Identity
    └── Integrations
```

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

*Inherits everything from `pmo_admin`, with additional focus on:*

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

### 5.2 PLATFORM – PM Layout Roles

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

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
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

══ [P] PREDICTIVE – PMBOK ════════════════════════════════════════
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

══ [A] AGILE & LEAN ══════════════════════════════════════════════
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
    ├── Financial Reports
    └── Budget / Forecast Overview
  Reporting & Analytics
    ├── Report Library
    ├── Analytics Dashboards
    ├── Dashboard Builder
    └── Scheduled Reports

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
  Business Justification (cross-project)
    ├── All Business Cases
    ├── All PIDs
    └── Benefits Review Plans
  Governance & Standards
    ├── Policies & Compliance
    └── Decision Log

══ [P] PREDICTIVE – PMBOK ════════════════════════════════════════
  Process Group Overview
    └── Aggregated Process Group Status

══ [A] AGILE & LEAN ══════════════════════════════════════════════
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
    ├── Portfolio EVM
    └── Financial Reports
  Reporting & Analytics
    ├── Highlight Reports (programme-level)
    ├── End Stage Reports
    ├── Report Library
    └── Analytics Dashboards

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
  Business Justification
    ├── Programme Business Case
    ├── Benefits Review Plans
    └── PIDs (programme-scoped)
  Governance & Standards
    ├── Governance Framework
    ├── Communication Strategy
    └── Risk Management Strategy

══ [P] PREDICTIVE – PMBOK ════════════════════════════════════════
  Process Group Forms (programme-scoped)
    ├── Planning
    ├── Executing
    ├── Monitoring & Controlling
    └── Closing

══ [A] AGILE & LEAN ══════════════════════════════════════════════
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

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
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
    └── Budget vs Actuals

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
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

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
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

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
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

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
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

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
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

### 5.3 PLATFORM – TM Layout Roles

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

══ [S] PREDICTIVE – STRUCTURED ══════════════════════════════════
  Assigned Structured Artefacts (read-only)
    └── Work Packages (assigned to me)

══ [A] AGILE & LEAN ══════════════════════════════════════════════
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

*Inherits `team_member`, plus:*

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

### 5.4 SIMULATOR – PMO Layout Roles

#### 5.4.1 `sim_pmo_admin` – Simulator PMO Admin

*Mirrors `pmo_admin` Platform structure with "Practice" prefixes:*

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

### 5.5 SIMULATOR – PM Layout Roles

#### 5.5.1 `sim_project_manager` – Simulator Project Manager

*Mirrors `project_manager` Platform structure with "Practice" prefixes:*

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

### 5.6 SIMULATOR – TM Layout Roles

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

### 5.7 SIMULATOR – Learner Role

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

## 7. Summary Matrix – What Each Role Can See

| Section / Track | sys_admin | account_owner | pmo_admin | portfolio_mgr | programme_mgr | project_mgr | sponsor | executive | board_member | proj_assurance | qa | team_lead | team_member | stakeholder | viewer |
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
| System Administration | ✓ | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| Notification Preferences | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 8. Phase 1 – Implementation Todo List (Visual Reorganisation)

- [x] P1-1: Update `pmoSidebarCategories.js` — introduce three new methodology category groups: `pmo-cat-structured`, `pmo-cat-pmbok`, `pmo-cat-agile`
- [x] P1-2: Update `pmoMenuConfig.js` — reassign each menu item to the correct methodology category
- [x] P1-3: Update `pmDashboardMenuConfig.js` — reorganise sections into the new track structure
- [x] P1-4: Update `menuRegistry.js` — add `methodology` field (`'structured'|'pmbok'|'agile'|'universal'`) to each `MenuRegistryEntry`
- [x] P1-5: Add `SidebarMethodologyHeader` component — renders a section divider with the methodology badge and colour
- [x] P1-6: Update the sidebar rendering component to group sections by methodology and render the header between tracks
- [x] P1-7: Update Simulator menus (`simulatorMenuConfig.js`, `simulatorPMOMenuConfig.js`) — apply the same methodology grouping with "Practice" prefixes (Platform–Simulator parity)
- [x] P1-8: Write SQL `SQL/v671_methodology_menu_categories.sql` — add `methodology` column to DB `menu_items` table and populate existing rows
- [x] P1-9: Update unit tests in `src/config/__tests__/menuRegistry.test.js`
- [x] P1-10: Smoke-test all sidebar routes for every role in both Platform and Simulator
- [x] P1-11: Add role-differentiated menu profiles for `executive`, `project_sponsor`, `project_board_member`, `project_assurance`, `quality_assurance`, `stakeholder`, `viewer` (currently they all get the same pm layout with no differentiation)
- [x] P1-12: Add `simulator_user` (learner) dedicated menu profile in `simulatorMenuConfig.js`

## 9. Phase 2 – Adaptive Sidebar Todo List

- [x] P2-1: Create `SQL/v672_projects_delivery_methodology.sql` — add `delivery_methodology` column to `projects` table
- [x] P2-2: Add methodology selector to project create/edit forms
- [x] P2-3: Enhance `useMenu.js` hook — read methodology from active project context and filter sidebar sections
- [x] P2-4: Add `MethodologySwitcher` component to sidebar header (persistent via localStorage)
- [x] P2-5: Update Simulator project tables (`sim.simulation_runs` or `sim.scenarios`) with methodology field
- [x] P2-6: Apply parity to Simulator `useSimMenu` hook
- [x] P2-7: Unit tests for `useMenu` methodology filtering
- [x] P2-8: E2E smoke test — create a Structured project and verify only Structured + Universal sections are expanded

---

## 10. Phase 3 – Organisation Methodology Setting Todo List

- [x] P3-1: Create `SQL/v673_organisations_methodology_setting.sql` — add `default_methodology` and `allow_project_methodology_override` columns to `organisations` table with appropriate CHECK constraints and defaults
- [x] P3-2: Seed existing organisations with `default_methodology = 'hybrid'` and `allow_project_methodology_override = true` (safe backwards-compatible defaults — no visible change for existing users)
- [x] P3-3: Update `useMenu.js` — extend `fetchMenuFromDB()` to fetch `org.default_methodology` and `org.allow_project_methodology_override` alongside user menu data; store in `layoutHint`
- [x] P3-4: Add `resolveVisibleTracks()` utility in `useMenu.js` — returns the set of methodology tracks to include based on the cascade (org → project → user preference)
- [x] P3-5: Update `applyRoleSidebarRevamp()` in `useMenu.js` — strip methodology-track category nodes that are outside the resolved visible set before building the categorised sidebar tree
- [x] P3-6: Add Methodology Settings UI to **Administration → Organisation Settings** page — dropdown (`Hybrid` / `Structured/Traditional` / `PMBOK Process Groups` / `Agile & Lean`) + toggle for project-level override; accessible to `pmo_admin` and `account_owner` only
- [x] P3-7: Apply same cascade to Simulator `useSimMenu` hook — `sim_pmo_admin` can set a methodology preference for their practice environment (Platform–Simulator parity rule 34.1)
- [x] P3-8: Update `menuRegistry.js` — confirm every entry has the correct `methodology` field so track filtering in step P3-5 works reliably
- [x] P3-9: Add RLS policy on `organisations` — only `pmo_admin`, `account_owner`, `system_admin` can UPDATE the methodology columns
- [x] P3-10: Unit tests — `resolveVisibleTracks()` for all org/project/override combinations
- [x] P3-11: Smoke test — set org to `pmbok`, verify `[S]` and `[A]` tracks are completely absent from every role's sidebar; set back to `hybrid`, verify all tracks return
- [x] P3-12: Smoke test Simulator — repeat P3-11 for Simulator PMO and PM dashboards

---

## 11. Files to Change

### Phase 1 Files

| File | Change |
|---|---|
| `src/config/pmoSidebarCategories.js` | Add 3 new methodology category groups |
| `src/config/pmoMenuConfig.js` | Reassign `section` values to new methodology categories |
| `src/config/pmDashboardMenuConfig.js` | Reorder sections, add methodology labels |
| `src/config/menuRegistry.js` | Add `methodology` field to all entries |
| `src/config/simulatorMenuConfig.js` | Mirror methodology grouping; add learner profile |
| `src/config/simulatorPMOMenuConfig.js` | Mirror methodology grouping |
| `src/components/ui/SidebarMethodologyHeader.jsx` | **NEW** – methodology section divider component |
| `src/hooks/useMenu.js` | Extend `resolveLayoutType()` to return role-specific sub-profiles; pass methodology data down |
| `SQL/v671_methodology_menu_categories.sql` | Add `methodology` column to DB `menu_items` |
| `src/config/__tests__/menuRegistry.test.js` | Update tests for new `methodology` field |

### Phase 2 Files

| File | Change |
|---|---|
| `SQL/v672_projects_delivery_methodology.sql` | Add `delivery_methodology` column to `projects` table |
| `src/pages/*/ProjectCreate.jsx` / `ProjectEdit.jsx` | Add methodology selector field |
| `src/hooks/useMenu.js` | Read active project methodology from context; collapse off-methodology tracks |
| `src/components/ui/MethodologySwitcher.jsx` | **NEW** – sidebar header switcher (localStorage persistent) |
| `src/modules/sim/` (runs/scenarios) | Add methodology field to Simulator project tables |
| `src/hooks/useSimMenu.js` | Apply parity — read methodology from sim context |
| `src/hooks/__tests__/useMenu.test.js` | Unit tests for methodology filtering logic |

### Phase 3 Files

| File | Change |
|---|---|
| `SQL/v673_organisations_methodology_setting.sql` | Add `default_methodology` + `allow_project_methodology_override` to `organisations` |
| `src/hooks/useMenu.js` | Add `resolveVisibleTracks()` utility; fetch org methodology in `fetchMenuFromDB()` |
| `src/pages/app/OrganisationSettings.jsx` | **ADD** Methodology Settings panel with dropdown + override toggle |
| `src/hooks/useSimMenu.js` | Apply same cascade for Simulator |
| `src/hooks/__tests__/useMenu.test.js` | Tests for `resolveVisibleTracks()` all cascade combinations |

---

## 12. Review Section

### Summary (2026-05-29)

Implemented all three phases of v671:

**Phase 1 — Visual reorganisation**
- Added methodology track wrappers `[S]`, `[P]`, `[A]` in `useMenu.js` via `wrapPmoMenuWithMethodologyTracks`.
- Moved Pre-Project Docs, Governance, Process Group Forms, and Agile & Lean out of flat PMO categories into track groups.
- `SidebarMethodologyHeader` + `Sidebar.jsx` rendering for track dividers.
- PM role profiles (`executive`, `sponsor`, `board`, `assurance`, `qa`, `stakeholder`, `viewer`) filter PM-layout menus.
- `simulator_user` learner menu filtered in `useSimMenu.js`.

**Phase 2 — Adaptive sidebar**
- `SQL/v672_projects_delivery_methodology.sql` adds `delivery_methodology_track` on `projects` (+ sim parity).
- Project forms: `LifecycleControlsSection` track values; `projectWizardFormUtils` persists track column.
- `MethodologySwitcher` in sidebar; `fetchMethodologyContext` reads project from URL + org from `accounts`.

**Phase 3 — Organisation setting**
- `SQL/v673_organisations_methodology_setting.sql` on `accounts` (organisation entity in this codebase).
- `OrganisationMethodologySettings` on PMO Admin → Settings tab (`/platform/pmo-admin`).
- `resolveVisibleTracks()` removes hidden tracks from the sidebar tree.

**SQL to apply (Supabase, in order):** `v671_methodology_menu_categories.sql`, `v671_pre_project_mandate_menu.sql` (if needed), `v672_*`, `v673_*`.

**Tests added:** `methodologyMenuUtils.test.js`, `useMenuMethodology.test.js`, extended `menuRegistry.test.js` (28 tests passing in targeted run).

**Documentation:** `Documentation/Methodology_Aware_Sidebar_Menu_Guide.md`

**Note:** Plan referenced `organisations` table; implementation uses `public.accounts` per existing registration model. Menu cache bumped to `nidus_menu_v41_`.

---

## Notes
- PRINCE2 is not used as a name anywhere per copyright compliance (CLAUDE.md rule 27). "Structured/Traditional" is the equivalent term used throughout.
- **Phase 1** is a config/CSS change only — zero risk to existing routes or RLS policies.
- **Phase 2** introduces a `delivery_methodology` column on `projects` — needs migration + RLS review. Safe default is `'hybrid'` so no existing project behaviour changes.
- **Phase 3** introduces two columns on `organisations` — needs migration + RLS policy limiting writes to pmo_admin/account_owner/system_admin. Safe default is `'hybrid'` + `allow_override = true` so no existing org sidebar changes until an admin explicitly selects a methodology.
- All three phases must apply equally to Platform and Simulator (parity rule 34.1).
- The current `resolveLayoutType()` in `useMenu.js` distinguishes only 3 layouts (pmo/pm/tm). Phase 1 item P1-11 needs sub-profiles within the `pm` layout to differentiate executive, sponsor, board, assurance, QA, stakeholder, and viewer — without breaking the existing layout resolution logic.
- **SQL versioning**: Phase 1 → `v671_*`, Phase 2 → `v672_*`, Phase 3 → `v673_*`.
