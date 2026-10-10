# Project Nidus — Core PM & Industry Menu Taxonomy

> **Recommended location:** `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md`
>
> **Purpose:** Functional menu taxonomy for Project Nidus SaaS covering the Generic/Core PM menu and all configured industry packs.
>
> This document does **not** authorise hard-coded sidebar trees. Claude/Cursor must first inspect the current database-driven menu system, routes, modules, permissions, feature entitlements, `CLAUDE.md`, `ROADMAP.md`, `REVIEW.md`, and the approved SaaS industry-provisioning brief.

---

## 1. Architecture Principle

```text
Visible Menu
=
(Core SaaS + Generic PM + Industry Pack + Enabled Features + Organisation Configuration)
∩
Role Permissions
```

Menu visibility is not security. RLS/authorization remains authoritative.

Do not build a separate application per industry. Prefer shared PM capabilities + industry configuration + genuinely industry-specific extensions.

---

## 2. Industry Master List

| Code | Industry |
|---|---|
| FIN | Banking & Financial Services |
| CON | Construction & Engineering |
| ICT | Information Technology |
| HLT | Healthcare |
| GOV | Government & Public Sector |
| TEL | Telecommunications |
| ENR | Energy & Utilities |
| MFG | Manufacturing |
| EDU | Education |
| NGO | NGO / Development |
| RET | Retail |
| GEN | General Project Management |

---

# 3. Generic / Core Project Management Menu

```text
PROJECT MANAGEMENT
│
├── Dashboard
│   ├── Project Health
│   ├── Executive Summary
│   ├── Milestone Summary
│   ├── Schedule Summary
│   ├── Cost Summary
│   ├── RAID Summary
│   ├── Change Summary
│   ├── Quality Summary
│   ├── Testing Summary
│   ├── Resource Summary
│   └── Upcoming Actions
│
├── Project Setup
│   ├── Project Details
│   │   ├── Overview
│   │   ├── Objectives
│   │   ├── Success Criteria
│   │   ├── Classification
│   │   ├── Methodology
│   │   └── Metadata
│   ├── Business Case
│   │   ├── Strategic Rationale
│   │   ├── Expected Benefits
│   │   ├── Options Analysis
│   │   ├── Cost / Benefit
│   │   ├── Assumptions
│   │   └── Approval
│   ├── Project Charter
│   │   ├── (same document as Project Brief — interchangeable name by methodology)
│   │   ├── Purpose
│   │   ├── Scope
│   │   ├── Objectives
│   │   ├── High-Level Milestones
│   │   ├── Constraints
│   │   ├── Assumptions
│   │   └── Approval
│   ├── Project Team (v1088: org-wide Roles & Responsibilities leaf retired — PMO Configuration only)
│   │   ├── Team Members
│   │   │   └── Team change history (v1082 — link from Members tab; not a sidebar leaf)
│   │   ├── Project Roles & Skills (v1084; Team edit Roles tab removed — use this catalog; list + Create page v1085)
│   │   ├── RACI
│   │   ├── Team Structure (v1091; was Organisation Structure)
│   │   └── Contact Directory
│   │       └── Bulk upload (v1093 — Excel/CSV/JSON; Level-4 action, not a sidebar leaf)
│   ├── Governance
│       ├── Governance Structure
│       │   ├── Bodies / Reporting lines / Decision flow lists (v1095 — Structure tab)
│       │   ├── Reporting lines table From/To/Cadence (v1096)
│       │   ├── Decision flow table Decision/Decided by/Method (v1097)
│       │   ├── Governance charts gallery upload/paste (v1098 — Overview)
│       │   ├── PMO Oversight arrangements list (v1095 — tab; MultiLineList)
│       │   └── Escalation steps table Level/Whom/Timeframe (v1096 — Whom from bodies/members/roles)
│       ├── Steering Committee
│       │   └── Bulk member upload (v1099 — multi-line email/phone; end_date v1100)
│       ├── Project Board
│       │   └── Bulk member upload (v1099; end_date v1100)
│       ├── PMO Oversight
│       ├── Escalation Path
│       └── Governance Framework (Delegated Authorities under Setup retired v1102 — use PMO Configuration → Authorities; principles MultiLineList + escalation steps table v1103)
│   ├── Document Signatory (v1067)
│   │   ├── Project-scope requirements (Project Manager, editable)
│   │   ├── Team-scope requirements (per team led, editable by that team's lead)
│   │   └── Project-scope summary (read-only, shown to a team lead who isn't also the PM)
│   ├── Regional & Format Settings
│   ├── Working Days & Holidays
│   └── Environments (v1192 — target environments for test suites)
│
├── Scope & Deliverables
│   ├── Scope Statement
│   │   ├── In Scope
│   │   ├── Out of Scope
│   │   ├── Boundaries
│   │   └── Constraints
│   ├── Product Breakdown Structure
│   │   ├── Products
│   │   ├── Deliverables
│   │   ├── Product Descriptions
│   │   └── Acceptance Criteria
│   ├── Work Breakdown Structure
│   │   ├── WBS Hierarchy
│   │   ├── Work Packages
│   │   ├── Control Accounts
│   │   └── WBS Dictionary
│   └── Deliverable Register
│       ├── Planned
│       ├── Submitted
│       ├── Accepted
│       └── Rework / Rejected
│
├── Planning
│   ├── Schedule
│   │   ├── Activity Register
│   │   ├── Gantt
│   │   ├── Network / Dependencies
│   │   ├── Critical Path
│   │   ├── Look-Ahead Plan
│   │   └── Schedule Variance
│   ├── Milestones
│   │   ├── Milestone Register
│   │   ├── Key Dates
│   │   ├── Forecast
│   │   └── Slippage
│   ├── Dependencies
│   │   ├── Internal
│   │   ├── External
│   │   ├── Owners
│   │   ├── Dates
│   │   └── Escalations
│   ├── Calendars
│   │   ├── Working Days
│   │   └── Public Holidays & Exceptions
│   ├── Baselines
│   │   ├── Scope Baseline
│   │   ├── Schedule Baseline
│   │   ├── Cost Baseline
│   │   ├── Baseline History
│   │   └── Baseline Approval
│   ├── Planning Assumptions
│   └── Scenario Planning
│       ├── Current Plan
│       ├── What-If Scenarios
│       ├── Comparison
│       └── Recommendation
│
├── RAID
│   ├── Risks
│   │   ├── Risk Register
│   │   ├── Risk Categories (v1107 — organisation catalogue; same page as PMO Configuration → Risk Categories)
│   │   ├── Identification
│   │   ├── Assessment
│   │   ├── Response Plans
│   │   ├── Owners
│   │   ├── Residual Risk
│   │   ├── Escalated Risks
│   │   └── Closed Risks
│   ├── Assumptions
│   │   ├── Assumption Register
│   │   ├── Validation
│   │   ├── Owners
│   │   └── Converted Risks / Issues
│   ├── Constraints (v1100)
│   │   ├── Constraints Register
│   │   ├── Categories (Budget / Schedule / Resource / Regulatory / Technical / Other)
│   │   ├── Owners
│   │   └── Due Dates
│   ├── Issues
│   │   ├── Issue Register
│   │   ├── Assessment
│   │   ├── Resolution Plan
│   │   ├── Owners
│   │   ├── Escalations
│   │   └── Closed Issues
│   └── Dependencies
│       ├── Dependency Register
│       ├── Dependency Parties (v1126)
│       ├── Incoming
│       ├── Outgoing
│       ├── Critical
│       └── Escalated
│
├── Stakeholders
│   ├── Stakeholder Register
│   │   ├── Internal
│   │   ├── External
│   │   ├── Roles
│   │   └── Contact Details
│   ├── Engagement Assessment
│   │   ├── Influence
│   │   ├── Interest
│   │   ├── Current Engagement
│   │   ├── Desired Engagement
│   │   └── Engagement Strategy
│   └── Communications
│       ├── Communication Plan
│       ├── Communication formats (v1155 — format and level-of-detail lookup; same page as PMO Configuration → Communication formats)
│       ├── Audience
│       ├── Channels
│       ├── Frequency
│       ├── Calendar
│       └── History
│
├── Change Control
│   ├── Change Requests
│   │   ├── New
│   │   ├── Open
│   │   ├── Approved
│   │   ├── Rejected
│   │   └── Implemented
│   ├── Change Assessment
│   │   ├── Scope Impact
│   │   ├── Schedule Impact
│   │   ├── Cost Impact
│   │   ├── Resource Impact
│   │   ├── Risk Impact
│   │   ├── Quality Impact
│   │   └── Benefits Impact
│   ├── Change Decisions
│   │   ├── Pending
│   │   ├── Approved
│   │   ├── Rejected
│   │   └── Deferred
│   └── Change Implementation
│       ├── Actions
│       ├── Baseline Updates
│       ├── Communication
│       └── Verification
│
├── Resources
│   ├── Resource Plan
│   │   ├── Demand
│   │   ├── Supply
│   │   ├── Skills Requirements
│   │   └── Forecast
│   ├── Assignments
│   │   ├── Project Assignments
│   │   ├── Work Package Assignments
│   │   ├── Role Assignments
│   │   └── Assignment History
│   ├── Capacity
│   │   ├── Availability
│   │   ├── Allocation
│   │   ├── Over-allocation
│   │   └── Forecast
│   └── Timesheets
│       ├── Time Entry & Work Plan (relabelled from "Time Entry", v1187)
│       │   └── Work Plan tab (v1180) — Standard/Overtime/Work Plan tabs on My Timesheets;
│       │       self-service weekly/monthly planned work items, draft/submitted/approved/
│       │       rejected lifecycle, with a Planned-vs-Actual summary when the project is
│       │       flagged Time & Material
│       ├── Approvals
│       │   └── Team Work Plan tab (v1180) — on Team Timesheets, PM/PMO/Team Lead/Team
│       │       Manager review and approve/reject team members' Work Plans
│       ├── Exceptions
│       └── Utilisation
│
├── Cost Management
│   ├── Budget
│   │   ├── Budget Structure
│   │   ├── Budget Lines
│   │   ├── Approved Budget
│   │   └── Revisions
│   ├── Actuals
│   │   ├── Actual Costs
│   │   ├── Commitments
│   │   ├── Accruals
│   │   └── Transactions
│   ├── Forecast
│   │   ├── Estimate to Complete
│   │   ├── Estimate at Completion
│   │   ├── Variance
│   │   └── History
│   └── Cost Performance
│       ├── Planned vs Actual
│       ├── Variance
│       ├── Trend
│       └── Indicators
│
├── Quality
│   ├── Quality Plan
│   │   ├── Objectives
│   │   ├── Standards
│   │   ├── Criteria
│   │   └── Responsibilities
│   ├── Quality Reviews
│   │   ├── Planned Reviews
│   │   ├── Findings
│   │   ├── Corrective Actions
│   │   └── Closure
│   ├── Acceptance
│   │   ├── Acceptance Criteria
│   │   ├── Acceptance Reviews
│   │   ├── Accepted
│   │   └── Rejected / Rework
│   └── Non-Conformance
│       ├── Register
│       ├── Corrective Action
│       ├── Preventive Action
│       └── Closure
│   ├── Configuration Item Register
│   └── Configuration Item Types (v1218)
│
├── Testing
│   ├── Test Planning
│   │   ├── Test Strategy
│   │   ├── Test Plan
│   │   ├── Test Scope
│   │   ├── Test Cycles
│   │   └── Entry / Exit Criteria
│   ├── Test Cases
│   │   ├── Repository
│   │   ├── Suites
│   │   ├── Preconditions
│   │   ├── Steps
│   │   └── Expected Results
│   ├── Test Execution
│   │   ├── Runs
│   │   ├── Pass
│   │   ├── Fail
│   │   ├── Blocked
│   │   └── Retest
│   ├── Defects
│   │   ├── Defect Register
│   │   ├── Severity / Priority
│   │   ├── Assignment
│   │   ├── Resolution
│   │   ├── Retest
│   │   └── Closure
│   └── Evidence
│       ├── Test Evidence
│       ├── Screenshots
│       ├── Attachments
│       └── History
│
├── Governance
│   ├── Decisions
│   │   ├── Decision Register
│   │   ├── Pending Decisions
│   │   ├── Owners
│   │   └── History
│   ├── Actions
│   │   ├── Action Register
│   │   ├── Open
│   │   ├── Overdue
│   │   └── Closed
│   ├── Approvals
│   │   ├── Pending
│   │   ├── Approved
│   │   ├── Rejected
│   │   └── History
│   ├── Stage Gates
│   │   ├── Gate Definition
│   │   ├── Readiness
│   │   ├── Review
│   │   └── Decision
│   └── Meetings
│       ├── Calendar
│       ├── Agendas
│       ├── Minutes
│       ├── Actions
│       └── Decisions
│
├── Procurement
│   ├── Procurement Plan
│   ├── Vendors
│   ├── Vendor Categories (v1208)
│   ├── Contracts
│   ├── Purchase Requests
│   ├── Deliverables
│   ├── Vendor Performance
│   └── Contract Closure
│
├── Benefits
│   ├── Benefits Register
│   ├── Benefit Owners
│   ├── Measures
│   ├── Target Dates
│   ├── Realisation Tracking
│   └── Post-Implementation Review
│
├── Documents
│   ├── Document Register
│   ├── Project Documents
│   ├── Templates
│   ├── Version History
│   ├── Reviews
│   └── Approvals
│
├── Reports
│   ├── Project Status Report
│   ├── Executive Report
│   ├── Schedule Report
│   ├── Cost Report
│   ├── RAID Report
│   ├── Change Report
│   ├── Resource Report
│   ├── Quality Report
│   ├── Testing Report
│   ├── Work Plan Variance (v1180) — Planned (Work Plan Estimated Hours) vs actual (Timesheet
│   │   hours) per team member, for Time & Material projects
│   └── Custom Reports
│
└── Project Closure
    ├── Closure Checklist
    ├── Final Acceptance
    ├── Outstanding Items
    ├── Handover
    ├── Lessons Learned
    ├── Benefits Transition
    ├── Archive
    └── Closure Report
```

---

# 4. FIN — Banking & Financial Services

```text
BANKING & FINANCIAL SERVICES
│
├── Banking Transformation
│   ├── Transformation Overview
│   ├── Transformation Roadmap
│   ├── Business Units
│   ├── Workstreams
│   ├── Regulatory Milestones
│   └── Transformation Readiness
│
├── Core Banking
│   ├── Product Configuration
│   │   ├── Deposits
│   │   ├── Lending
│   │   ├── Payments
│   │   ├── Customer
│   │   └── Fees / Charges
│   ├── Parameterisation
│   │   ├── Global Parameters
│   │   ├── Product Parameters
│   │   ├── Branch Parameters
│   │   └── Accounting Parameters
│   ├── Interfaces
│   │   ├── Interface Register
│   │   ├── Upstream Systems
│   │   ├── Downstream Systems
│   │   ├── File Interfaces
│   │   ├── APIs
│   │   └── Interface Testing
│   ├── Environments
│   │   ├── Development
│   │   ├── SIT
│   │   ├── UAT
│   │   ├── Pre-Production
│   │   ├── Production
│   │   └── DR
│   └── Customisation
│       ├── Register
│       ├── Business Justification
│       ├── Design
│       ├── Build
│       ├── Testing
│       └── Deployment
│
├── Data Migration
│   ├── Migration Strategy
│   ├── Data Scope
│   ├── Source Systems
│   ├── Data Mapping
│   ├── Data Cleansing
│   ├── Data Transformation
│   ├── Migration Rules
│   ├── Mock Migrations
│   │   ├── Mock 1
│   │   ├── Mock 2
│   │   ├── Dress Rehearsal
│   │   └── Final Migration
│   ├── Reconciliations
│   │   ├── Record Counts
│   │   ├── Financial
│   │   ├── Customer
│   │   ├── Account
│   │   └── Exceptions
│   ├── Migration Defects
│   └── Migration Sign-Off
│
├── Testing & Assurance
│   ├── SIT
│   │   ├── Plan
│   │   ├── Cases
│   │   ├── Execution
│   │   └── Defects
│   ├── UAT
│   │   ├── Plan
│   │   ├── Business Testers
│   │   ├── Cases
│   │   ├── Execution
│   │   └── Sign-Off
│   ├── Regression
│   ├── Performance Testing
│   ├── Security Testing
│   ├── DR Testing
│   └── Operational Readiness Testing
│
├── Regulatory & Compliance
│   ├── Regulatory Requirements
│   ├── Central Bank Requirements
│   ├── AML / CFT
│   ├── KYC
│   ├── Sanctions
│   ├── Data Privacy
│   ├── Audit Requirements
│   ├── Compliance Evidence
│   └── Regulatory Sign-Off
│
├── Payments & Channels
│   ├── Payments
│   │   ├── Domestic
│   │   ├── International
│   │   ├── Clearing
│   │   └── Settlement
│   ├── Digital Channels
│   │   ├── Internet Banking
│   │   ├── Mobile Banking
│   │   ├── USSD
│   │   └── APIs
│   ├── Cards
│   ├── ATMs
│   ├── Agency Banking
│   └── Channel Readiness
│
├── Cutover
│   ├── Cutover Strategy
│   ├── Cutover Plan
│   ├── Cutover Activities
│   ├── Cutover Dependencies
│   ├── Command Centre
│   ├── Go / No-Go
│   ├── Rollback Plan
│   ├── Communications
│   ├── Business Readiness
│   ├── Technology Readiness
│   └── Cutover Sign-Off
│
├── Operational Readiness
│   ├── SOPs
│   ├── Process Readiness
│   ├── Training
│   ├── Branch Readiness
│   ├── Contact Centre Readiness
│   ├── Support Model
│   ├── Monitoring
│   ├── Incident Management
│   └── Readiness Sign-Off
│
├── Go-Live
│   ├── Production Deployment
│   ├── Opening Balances
│   ├── Day-1 Validation
│   ├── Business Verification
│   ├── Technical Verification
│   └── Go-Live Decision
│
└── Hypercare
    ├── Hypercare Plan
    ├── Daily Command Centre
    ├── Incidents
    ├── Defects
    ├── Performance Monitoring
    ├── User Support
    ├── Stabilisation
    └── Exit Criteria
```

---

# 5. CON — Construction & Engineering

```text
CONSTRUCTION & ENGINEERING
│
├── Construction Management
│   ├── Construction Overview
│   ├── Project Sites
│   ├── Construction Packages
│   ├── Workfronts
│   └── Construction Milestones
├── Sites
│   ├── Site Register
│   ├── Site Setup
│   ├── Site Access
│   ├── Site Logistics
│   ├── Site Facilities
│   ├── Site Diary
│   ├── Daily Progress
│   └── Site Closeout
├── Contractors
│   ├── Contractor Register
│   ├── Prequalification
│   ├── Appointments
│   ├── Work Packages
│   ├── Performance
│   ├── Claims
│   └── Closeout
├── Subcontractors
│   ├── Register
│   ├── Approval
│   ├── Scope
│   ├── Mobilisation
│   ├── Performance
│   └── Demobilisation
├── Permits
│   ├── Permit Register
│   ├── Planning Permits
│   ├── Environmental Permits
│   ├── Work Permits
│   ├── Expiry Tracking
│   └── Permit Compliance
├── Design & Engineering
│   ├── Design Packages
│   ├── Drawings
│   ├── Specifications
│   ├── Design Reviews
│   ├── Design Changes
│   ├── Technical Queries
│   └── Approved for Construction
├── RFIs
│   ├── RFI Register
│   ├── New
│   ├── Open
│   ├── Responses
│   ├── Overdue
│   └── Closed
├── Site Instructions
│   ├── Register
│   ├── New Instructions
│   ├── Contractor Response
│   ├── Cost Impact
│   ├── Schedule Impact
│   └── Closure
├── Inspections
│   ├── Inspection Plan
│   ├── Inspection Requests
│   ├── Site Inspections
│   ├── Witness Points
│   ├── Hold Points
│   ├── Results
│   └── Closeout
├── Materials
│   ├── Material Register
│   ├── Submittals
│   ├── Approvals
│   ├── Procurement Status
│   ├── Delivery Tracking
│   ├── Storage
│   ├── Testing
│   └── Usage
├── Plant & Equipment
│   ├── Equipment Register
│   ├── Mobilisation
│   ├── Allocation
│   ├── Availability
│   ├── Maintenance
│   └── Demobilisation
├── Health & Safety
│   ├── HSE Plan
│   ├── Risk Assessments
│   ├── Method Statements
│   ├── Toolbox Talks
│   ├── Safety Inspections
│   ├── Incidents
│   ├── Near Misses
│   ├── Corrective Actions
│   └── HSE Statistics
├── Quality Control
│   ├── ITPs
│   ├── Inspections
│   ├── Test Certificates
│   ├── NCRs
│   ├── Snag / Punch List
│   ├── Corrective Actions
│   └── Quality Closeout
├── Progress Measurement
│   ├── Planned Progress
│   ├── Actual Progress
│   ├── Quantity Measurement
│   ├── Earned Progress
│   ├── Productivity
│   ├── Delays
│   └── Recovery Plans
├── Commercial
│   ├── Bills of Quantities
│   ├── Valuations
│   ├── Variations
│   ├── Claims
│   ├── Payment Certificates
│   ├── Retention
│   └── Final Account
├── Progress Certificates
│   ├── Register
│   ├── Contractor Submission
│   ├── Measurement
│   ├── Certification
│   ├── Approval
│   └── Payment Status
└── Handover & Commissioning
    ├── Commissioning Plan
    ├── Pre-Commissioning
    ├── Testing & Commissioning
    ├── Snag Closure
    ├── As-Built Drawings
    ├── O&M Manuals
    ├── Training
    ├── Handover Certificates
    └── Defects Liability
```

---

# 6. ICT — Information Technology

```text
INFORMATION TECHNOLOGY
│
├── Technology Delivery
│   ├── Delivery Overview
│   ├── Technology Roadmap
│   ├── Workstreams
│   ├── Releases
│   └── Technology Milestones
├── Requirements
│   ├── Business Requirements
│   ├── Functional Requirements
│   ├── Non-Functional Requirements
│   ├── User Stories
│   ├── Acceptance Criteria
│   ├── Traceability
│   └── Requirement Changes
├── Architecture
│   ├── Enterprise Architecture
│   ├── Solution Architecture
│   ├── Application Architecture
│   ├── Data Architecture
│   ├── Integration Architecture
│   ├── Security Architecture
│   ├── Architecture Decisions
│   └── Architecture Reviews
├── Design
│   ├── Functional Design
│   ├── Technical Design
│   ├── UX / UI Design
│   ├── Data Design
│   ├── Integration Design
│   └── Design Approval
├── Environments
│   ├── Development
│   ├── Test
│   ├── SIT
│   ├── UAT
│   ├── Staging
│   ├── Production
│   ├── DR
│   └── Environment Readiness
├── Development
│   ├── Features
│   ├── Components
│   ├── Services
│   ├── APIs
│   ├── Configuration
│   ├── Code Reviews
│   └── Build Status
├── Interfaces
│   ├── Interface Register
│   ├── APIs
│   ├── Events / Messaging
│   ├── Batch / Files
│   ├── Integration Dependencies
│   ├── Interface Testing
│   └── Interface Readiness
├── Data
│   ├── Data Sources
│   ├── Data Models
│   ├── Migration
│   ├── Data Quality
│   ├── Reconciliation
│   └── Data Sign-Off
├── Testing
│   ├── Unit Testing
│   ├── Integration Testing
│   ├── SIT
│   ├── UAT
│   ├── Regression
│   ├── Performance
│   ├── Security
│   └── DR Testing
├── Defects
│   ├── Defect Register
│   ├── Severity
│   ├── Assignment
│   ├── Root Cause
│   ├── Fix
│   ├── Retest
│   └── Closure
├── Releases
│   ├── Release Plan
│   ├── Scope
│   ├── Release Candidates
│   ├── Release Notes
│   ├── Approval
│   ├── Deployment Window
│   └── Closure
├── Deployments
│   ├── Deployment Plan
│   ├── Pre-Deployment Checks
│   ├── Deployment Tasks
│   ├── Smoke Testing
│   ├── Rollback
│   └── Verification
├── Technical Debt
│   ├── Debt Register
│   ├── Architecture Debt
│   ├── Code Debt
│   ├── Infrastructure Debt
│   ├── Security Debt
│   ├── Priority
│   └── Remediation
├── Cybersecurity
│   ├── Security Requirements
│   ├── Threat Assessment
│   ├── Vulnerabilities
│   ├── Penetration Testing
│   ├── Security Exceptions
│   └── Security Sign-Off
└── Production Readiness
    ├── Operational Readiness
    ├── Monitoring
    ├── Logging
    ├── Alerting
    ├── Support Model
    ├── Runbooks
    ├── Disaster Recovery
    ├── Go-Live
    └── Hypercare
```

---

# 7. HLT — Healthcare

```text
HEALTHCARE
│
├── Healthcare Projects
│   ├── Project Overview
│   ├── Clinical Workstreams
│   ├── Operational Workstreams
│   ├── Technology Workstreams
│   └── Healthcare Milestones
├── Clinical Readiness
│   ├── Clinical Requirements
│   ├── Clinical Workflows
│   ├── Clinical Stakeholders
│   ├── Clinical Validation
│   ├── Clinical Training
│   └── Clinical Sign-Off
├── Regulatory Compliance
│   ├── Regulatory Requirements
│   ├── Licensing
│   ├── Accreditation Requirements
│   ├── Compliance Evidence
│   ├── Regulatory Audits
│   └── Regulatory Approval
├── Patient Safety
│   ├── Safety Requirements
│   ├── Patient Safety Risks
│   ├── Clinical Incidents
│   ├── Safety Actions
│   ├── Safety Reviews
│   └── Safety Sign-Off
├── Clinical Systems
│   ├── EHR / EMR
│   ├── Laboratory Systems
│   ├── Pharmacy Systems
│   ├── Radiology Systems
│   ├── Patient Administration
│   ├── Interfaces
│   └── Clinical System Readiness
├── Data Privacy
│   ├── Patient Data Inventory
│   ├── Privacy Requirements
│   ├── Consent
│   ├── Access Controls
│   ├── Data Sharing
│   ├── Retention
│   └── Privacy Assessment
├── Accreditation
│   ├── Accreditation Standards
│   ├── Gap Assessment
│   ├── Evidence
│   ├── Corrective Actions
│   ├── Mock Assessment
│   └── Outcome
├── Facilities & Equipment
│   ├── Facility Readiness
│   ├── Medical Equipment
│   ├── Installation
│   ├── Calibration
│   ├── Validation
│   └── Handover
├── Workforce Readiness
│   ├── Staffing Requirements
│   ├── Recruitment
│   ├── Credentialing
│   ├── Training
│   ├── Competency
│   └── Roster Readiness
├── Quality & Clinical Governance
│   ├── Quality Standards
│   ├── Clinical Audit
│   ├── Quality Indicators
│   ├── Non-Conformance
│   ├── Corrective Action
│   └── Governance Review
└── Operational Readiness
    ├── SOPs
    ├── Patient Journey
    ├── Business Continuity
    ├── Emergency Readiness
    ├── Support Model
    ├── Go-Live Readiness
    └── Post-Go-Live Monitoring
```

---

# 8. GOV — Government & Public Sector

```text
GOVERNMENT & PUBLIC SECTOR
│
├── Public Sector Programme
│   ├── Programme Overview
│   ├── Government Priorities
│   ├── Policy Alignment
│   ├── Ministries / Agencies
│   └── Public Sector Milestones
├── Policy & Mandate
│   ├── Policy Objectives
│   ├── Legal Mandate
│   ├── Strategic Alignment
│   ├── Policy Dependencies
│   └── Policy Approval
├── Public Investment
│   ├── Investment Proposal
│   ├── Appraisal
│   ├── Funding Approval
│   ├── Capital Allocation
│   ├── Expenditure Tracking
│   └── Investment Review
├── Budget & Appropriation
│   ├── Budget Request
│   ├── Approved Budget
│   ├── Appropriation
│   ├── Commitments
│   ├── Actual Expenditure
│   └── Variance
├── Procurement & Tendering
│   ├── Procurement Plan
│   ├── Tender Register
│   ├── Bid Evaluation
│   ├── Awards
│   ├── Contracts
│   ├── Supplier Performance
│   └── Procurement Audit
├── Regulatory & Legal
│   ├── Laws / Regulations
│   ├── Compliance Obligations
│   ├── Legal Reviews
│   ├── Regulatory Approvals
│   └── Compliance Evidence
├── Citizen & Stakeholder Engagement
│   ├── Stakeholder Groups
│   ├── Public Consultation
│   ├── Community Engagement
│   ├── Feedback
│   ├── Complaints
│   └── Communication
├── Inter-Agency Coordination
│   ├── Agencies
│   ├── Dependencies
│   ├── Shared Deliverables
│   ├── Joint Decisions
│   └── Escalations
├── Service Delivery
│   ├── Services
│   ├── Service Standards
│   ├── Coverage
│   ├── Service Readiness
│   ├── Service Performance
│   └── Citizen Outcomes
├── Transparency & Accountability
│   ├── Public Reporting
│   ├── Audit
│   ├── Oversight Reporting
│   ├── Disclosure
│   └── Corrective Actions
└── Benefits & Outcomes
    ├── Public Benefits
    ├── Outcome Indicators
    ├── Target Population
    ├── Baselines
    ├── Results
    └── Impact Evaluation
```

---

# 9. TEL — Telecommunications

```text
TELECOMMUNICATIONS
│
├── Telecom Programme
│   ├── Programme Overview
│   ├── Network Roadmap
│   ├── Service Roadmap
│   ├── Regions
│   └── Rollout Milestones
├── Network Planning
│   ├── Coverage Plan
│   ├── Capacity Plan
│   ├── Spectrum Requirements
│   ├── Technology Selection
│   ├── Site Plan
│   └── Network Design
├── Sites & Towers
│   ├── Site Register
│   ├── Site Acquisition
│   ├── Permits
│   ├── Civil Works
│   ├── Tower Installation
│   ├── Power
│   └── Site Acceptance
├── Radio Access Network
│   ├── RAN Design
│   ├── Equipment
│   ├── Installation
│   ├── Integration
│   ├── Optimisation
│   └── Acceptance
├── Core Network
│   ├── Core Design
│   ├── Hardware / Software
│   ├── Configuration
│   ├── Integration
│   ├── Testing
│   └── Cutover
├── Transmission
│   ├── Fibre
│   ├── Microwave
│   ├── Backhaul
│   ├── Capacity
│   ├── Installation
│   └── Testing
├── OSS / BSS
│   ├── CRM
│   ├── Billing
│   ├── Provisioning
│   ├── Mediation
│   ├── Network Management
│   ├── Interfaces
│   └── Testing
├── Services
│   ├── Voice
│   ├── Data
│   ├── Messaging
│   ├── Enterprise Services
│   ├── Digital Services
│   └── Service Readiness
├── Regulatory
│   ├── Licences
│   ├── Spectrum
│   ├── Coverage Obligations
│   ├── Quality of Service
│   ├── Regulatory Reporting
│   └── Compliance
├── Network Testing
│   ├── Coverage Testing
│   ├── Capacity Testing
│   ├── Drive Testing
│   ├── Performance Testing
│   ├── Failover Testing
│   └── Acceptance
└── Launch & Operations
    ├── Launch Plan
    ├── Commercial Readiness
    ├── Customer Readiness
    ├── Network Operations
    ├── Monitoring
    ├── Incident Management
    └── Optimisation
```

---

# 10. ENR — Energy & Utilities

```text
ENERGY & UTILITIES
│
├── Energy / Utility Programme
│   ├── Programme Overview
│   ├── Assets
│   ├── Service Areas
│   ├── Regulatory Milestones
│   └── Delivery Workstreams
├── Generation / Production
│   ├── Generation Assets
│   ├── Capacity
│   ├── Plant Design
│   ├── Construction
│   ├── Commissioning
│   └── Operational Readiness
├── Transmission
│   ├── Assets
│   ├── Routes
│   ├── Substations
│   ├── Lines
│   ├── Capacity
│   ├── Testing
│   └── Energisation
├── Distribution
│   ├── Distribution Network
│   ├── Feeders
│   ├── Transformers
│   ├── Connections
│   ├── Reliability
│   └── Network Expansion
├── Utility Assets
│   ├── Asset Register
│   ├── Installation
│   ├── Inspection
│   ├── Maintenance
│   ├── Replacement
│   └── Handover
├── Metering
│   ├── Metering Strategy
│   ├── Meter Register
│   ├── Smart Metering
│   ├── Installation
│   ├── Testing
│   └── Meter Data
├── Grid / Network Integration
│   ├── Connection Applications
│   ├── Studies
│   ├── Protection
│   ├── SCADA
│   ├── Integration Testing
│   └── Grid Approval
├── Regulatory & Environmental
│   ├── Licences
│   ├── Environmental Assessment
│   ├── Land / Wayleaves
│   ├── Regulatory Approvals
│   ├── Compliance Monitoring
│   └── Reporting
├── Health, Safety & Environment
│   ├── HSE Plan
│   ├── Permit to Work
│   ├── Safety Risks
│   ├── Incidents
│   ├── Environmental Monitoring
│   └── Corrective Actions
├── Outages & Cutovers
│   ├── Outage Plan
│   ├── Customer Impact
│   ├── Switching Plan
│   ├── Isolation
│   ├── Restoration
│   └── Post-Outage Review
└── Operations Readiness
    ├── Control Centre
    ├── Maintenance
    ├── Spares
    ├── Training
    ├── Emergency Response
    ├── Business Continuity
    └── Handover
```

---

# 11. MFG — Manufacturing

```text
MANUFACTURING
│
├── Manufacturing Programme
│   ├── Programme Overview
│   ├── Plants
│   ├── Production Lines
│   ├── Product Families
│   └── Industrialisation Milestones
├── Product Industrialisation
│   ├── Product Definition
│   ├── BOM
│   ├── Process Design
│   ├── Routing
│   ├── Work Instructions
│   └── Production Readiness
├── Plant & Facility
│   ├── Plant Layout
│   ├── Utilities
│   ├── Facility Modifications
│   ├── Safety
│   ├── Commissioning
│   └── Handover
├── Production Lines
│   ├── Line Design
│   ├── Equipment
│   ├── Installation
│   ├── Line Balancing
│   ├── Trial Runs
│   └── Ramp-Up
├── Equipment & Tooling
│   ├── Equipment Register
│   ├── Procurement
│   ├── FAT
│   ├── Installation
│   ├── SAT
│   ├── Calibration
│   └── Maintenance Readiness
├── Supply Chain
│   ├── Suppliers
│   ├── Materials
│   ├── Lead Times
│   ├── Logistics
│   ├── Inventory
│   └── Supply Risk
├── Quality
│   ├── Quality Plan
│   ├── Control Plan
│   ├── Inspections
│   ├── First Article
│   ├── NCR
│   ├── CAPA
│   └── Quality Release
├── Process Validation
│   ├── Process Qualification
│   ├── Trial Production
│   ├── Capability Studies
│   ├── Validation Results
│   └── Approval
├── Production Readiness
│   ├── Materials
│   ├── Labour
│   ├── Equipment
│   ├── Quality
│   ├── Maintenance
│   ├── Safety
│   └── Readiness Gate
├── Ramp-Up
│   ├── Ramp-Up Plan
│   ├── Volume Targets
│   ├── Yield
│   ├── Scrap
│   ├── Productivity
│   └── Stabilisation
└── Continuous Improvement
    ├── Improvement Register
    ├── Lean Initiatives
    ├── Waste Reduction
    ├── Process Improvement
    ├── Benefits
    └── Lessons Learned
```

---

# 12. EDU — Education

```text
EDUCATION
│
├── Education Programme
│   ├── Programme Overview
│   ├── Institutions
│   ├── Faculties / Departments
│   ├── Academic Calendar
│   └── Education Milestones
├── Curriculum
│   ├── Curriculum Design
│   ├── Programmes
│   ├── Courses
│   ├── Learning Outcomes
│   ├── Reviews
│   └── Approval
├── Academic Programmes
│   ├── Programme Register
│   ├── Requirements
│   ├── Delivery Plan
│   ├── Assessment Strategy
│   └── Programme Review
├── Student Services
│   ├── Admissions
│   ├── Registration
│   ├── Student Support
│   ├── Financial Aid
│   ├── Records
│   └── Graduation
├── Teaching & Learning
│   ├── Teaching Plan
│   ├── Learning Materials
│   ├── Timetables
│   ├── Delivery
│   ├── Assessment
│   └── Feedback
├── Digital Learning
│   ├── LMS
│   ├── Digital Content
│   ├── Online Courses
│   ├── Virtual Classrooms
│   ├── User Readiness
│   └── Support
├── Accreditation & Quality
│   ├── Accreditation Standards
│   ├── Programme Accreditation
│   ├── Institutional Accreditation
│   ├── Evidence
│   ├── Quality Reviews
│   └── Improvement Actions
├── Facilities
│   ├── Classrooms
│   ├── Laboratories
│   ├── Libraries
│   ├── Accommodation
│   ├── ICT Facilities
│   └── Readiness
├── Research
│   ├── Research Projects
│   ├── Grants
│   ├── Ethics Approval
│   ├── Publications
│   └── Research Outcomes
└── Education Outcomes
    ├── Enrolment
    ├── Retention
    ├── Completion
    ├── Achievement
    ├── Graduate Outcomes
    └── Impact
```

---

# 13. NGO — NGO / Development

```text
NGO / DEVELOPMENT
│
├── Development Programme
│   ├── Programme Overview
│   ├── Countries / Regions
│   ├── Communities
│   ├── Thematic Areas
│   └── Programme Milestones
├── Donor Management
│   ├── Donor Register
│   ├── Funding Agreements
│   ├── Grant Conditions
│   ├── Reporting Calendar
│   ├── Donor Communications
│   └── Donor Compliance
├── Grants
│   ├── Grant Register
│   ├── Applications
│   ├── Awards
│   ├── Budget
│   ├── Conditions
│   ├── Disbursements
│   └── Grant Closeout
├── Beneficiaries
│   ├── Beneficiary Groups
│   ├── Eligibility
│   ├── Registration
│   ├── Services / Assistance
│   ├── Safeguarding
│   └── Feedback
├── Field Operations
│   ├── Field Offices
│   ├── Field Teams
│   ├── Activity Plans
│   ├── Missions
│   ├── Logistics
│   └── Field Reports
├── Monitoring & Evaluation
│   ├── Results Framework
│   ├── Indicators
│   ├── Baselines
│   ├── Targets
│   ├── Data Collection
│   ├── Results
│   └── Evaluation
├── Logical Framework
│   ├── Impact
│   ├── Outcomes
│   ├── Outputs
│   ├── Activities
│   ├── Indicators
│   ├── Means of Verification
│   └── Assumptions
├── Safeguarding
│   ├── Safeguarding Plan
│   ├── Risks
│   ├── Incidents
│   ├── Referrals
│   ├── Investigations
│   └── Corrective Actions
├── Compliance
│   ├── Donor Compliance
│   ├── Regulatory Compliance
│   ├── Anti-Fraud
│   ├── Procurement Compliance
│   ├── Audit
│   └── Corrective Actions
├── Partners
│   ├── Partner Register
│   ├── Due Diligence
│   ├── Agreements
│   ├── Capacity Assessment
│   ├── Performance
│   └── Closeout
└── Impact & Learning
    ├── Outcome Tracking
    ├── Impact Assessment
    ├── Lessons Learned
    ├── Case Studies
    ├── Knowledge Products
    └── Programme Closeout
```

---

# 14. RET — Retail

```text
RETAIL
│
├── Retail Programme
│   ├── Programme Overview
│   ├── Regions
│   ├── Stores
│   ├── Channels
│   └── Retail Milestones
├── Store Development
│   ├── Site Selection
│   ├── Lease
│   ├── Store Design
│   ├── Fit-Out
│   ├── Merchandising Setup
│   ├── Readiness
│   └── Store Opening
├── Store Portfolio
│   ├── Store Register
│   ├── New Stores
│   ├── Refurbishments
│   ├── Relocations
│   ├── Closures
│   └── Store Performance
├── Merchandising
│   ├── Categories
│   ├── Product Range
│   ├── Planograms
│   ├── Promotions
│   ├── Pricing
│   └── Launch Readiness
├── Supply Chain
│   ├── Suppliers
│   ├── Purchase Orders
│   ├── Warehousing
│   ├── Distribution
│   ├── Replenishment
│   ├── Inventory
│   └── Supply Risks
├── Point of Sale
│   ├── POS Requirements
│   ├── Hardware
│   ├── Software
│   ├── Payments
│   ├── Integration
│   ├── Testing
│   └── Deployment
├── E-Commerce
│   ├── Website
│   ├── Mobile
│   ├── Product Catalogue
│   ├── Orders
│   ├── Payments
│   ├── Fulfilment
│   └── Customer Service
├── Customer Experience
│   ├── Customer Journey
│   ├── Loyalty
│   ├── Service Standards
│   ├── Complaints
│   ├── Feedback
│   └── Experience Metrics
├── Retail Operations
│   ├── SOPs
│   ├── Staffing
│   ├── Training
│   ├── Inventory
│   ├── Cash Management
│   └── Opening Readiness
├── Loss Prevention
│   ├── Loss Risks
│   ├── Fraud
│   ├── Shrinkage
│   ├── Security Controls
│   ├── Incidents
│   └── Corrective Actions
└── Launch & Stabilisation
    ├── Launch Plan
    ├── Store Readiness
    ├── Customer Communications
    ├── Hypercare
    ├── Performance Monitoring
    └── Stabilisation
```

---

# 15. GEN — General Project Management

```text
GENERAL PROJECT MANAGEMENT
│
├── Project Management
│   └── Use the complete Generic/Core PM menu in Section 3
├── Optional Capability Packs
│   ├── Advanced Planning
│   ├── Advanced Testing
│   ├── PMO
│   ├── Programme Management
│   ├── Portfolio Management
│   ├── Benefits Management
│   └── Advanced Reporting
└── Organisation Configuration
    ├── Enabled Modules
    ├── Menu Preferences
    ├── Templates
    ├── Reference Data
    └── Feature Entitlements
```

---

# 16. Reuse and Rationalisation Rules

Before creating any menu item/page/module, classify it as:

```text
A. Existing Generic PM Capability
B. Existing Shared Capability + Industry Configuration
C. Industry-Specific Extension
D. Genuine New Industry Capability
E. Filtered / Reporting View of Existing Data
F. Template / Workflow / Reference Data Only
```

Examples:

- `FIN > Testing & Assurance > UAT` should normally reuse the shared Testing engine.
- `CON > Health & Safety > Risks` should normally reuse the shared Risk engine with HSE classification/configuration.
- `ICT > Defects` should normally reuse the shared defect/testing capability.
- Industry-specific terminology, templates, workflows and dashboards should not automatically result in duplicate modules.

Preferred pattern:

```text
Generic Capability
   ├── Generic configuration
   ├── Industry configuration
   ├── Industry templates
   ├── Industry terminology
   └── Industry reporting
```

Avoid:

```text
Generic Risk Module
Banking Risk Module
Construction Risk Module
Healthcare Risk Module
...
```

unless the domain model is genuinely materially different.

---

# 17. Menu Depth / UX Rule

This taxonomy is intentionally deep for functional decomposition. Do **not** necessarily render every level directly in the left sidebar.

Recommended UX mapping:

```text
Level 1 = Sidebar section / domain
Level 2 = Expandable menu
Level 3 = Route/page
Level 4+ = Tabs, sub-navigation, filters, workflow steps, or page sections
```

The SaaS interface should remain simple and understandable.

---

# 18. Registration and Provisioning Behaviour

```text
Registration
    ↓
Industry Selected
    ↓
Organisation Created
    ↓
Generic/Core PM Pack Assigned
    ↓
Industry Pack Assigned
    ↓
Subscription Entitlements Applied
    ↓
Organisation Overrides Applied
    ↓
Role Permissions Applied
    ↓
Resolved Menu
```

Industry determines the default capability pack. It should not hard-code the final sidebar.

---

# 19. Required Claude Mapping Before Implementation

Claude must first map this taxonomy to the current codebase/database.

Produce a table such as:

| Industry | Taxonomy Path | Existing Capability | Action | Route | Feature | Permission | Notes |
|---|---|---|---|---|---|---|---|
| FIN | Core Banking > Interfaces | Existing integration capability | Reuse / Configure | ... | ... | ... | ... |
| CON | Inspections > Site Inspections | None | New candidate | TBD | ... | ... | PRD decision |
| ICT | Testing > UAT | Shared Testing | Reuse | ... | ... | ... | Industry template/filter |
| HLT | Data Privacy | Existing compliance capability | Extend | ... | ... | ... | ... |

Do not proceed directly from taxonomy text to creating empty pages.

---

# 20. Admin Governance

The Admin system should govern DB-driven configuration for concepts equivalent to:

```text
Industry Management
├── Industries
├── Industry Segments
├── Industry Packs
├── Pack Features
├── Pack Menus
├── Pack Templates
├── Pack Reference Data
├── Industry Activation
└── Change / Version History
```

Exact tables/modules must reuse existing Admin architecture wherever possible.

---

# 21. Recommended Initial Rollout

1. Audit current menus/routes/features.
2. Rationalise the industry master.
3. Rationalise the Generic/Core PM menu pack.
4. Define industry pack structures.
5. Attach only taxonomy items already backed by working capabilities.
6. Classify unbuilt branches as roadmap/backlog rather than creating empty pages.
7. Apply role/permission and subscription resolution.
8. Apply organisation-level industry provisioning.
9. Add Admin governance.
10. Expand industry capabilities incrementally through approved PRDs/plans.

---

# 22. Final Principle

> **Project Nidus should provide one configurable SaaS PMIS, with a strong generic PM core and industry-aware capability packs—not separate PMIS implementations per industry.**

