# Project Nidus — SaaS User Journey, Account Governance, PMO Configuration, Delivery Authority & Menu Architecture

> **Recommended location:** `Documentation/SaaS_User_Journey_Account_PMO_Delivery_Architecture.md`
>
> **Purpose:** This is a Claude/Cursor execution and design brief for rationalising the current Project Nidus SaaS flow from public landing page through registration, subscription, tenant provisioning, PMO configuration, portfolio/programme/project setup, assignments, roles, authority, and resolved menus.
>
> This document also embeds the current `Core_PM_and_Industry_Menu_Taxonomy.md` so Claude can use one source when redesigning the flow.
>
> **Important:** `CLAUDE.md`, `ROADMAP.md`, and `REVIEW.md` remain authoritative. Do not bypass the existing PRD / implementation-plan / approval workflow.

---

# 1. Executive Design Principle

Project Nidus should separate six concepts that are often wrongly mixed together:

```text
1. Identity
2. Commercial / Subscription Ownership
3. Organisation / Tenant Membership
4. Organisation / PMO Configuration
5. Delivery Assignment / Scope
6. Authority / Permission
```

The core rule is:

> **Subscription determines what the organisation has bought. Industry determines what is relevant. PMO configuration determines how the organisation works. Role determines what the user may do. Scope determines where they may do it. Assignment determines what work they are responsible for.**

Do not model all of these as one `user_role`.

---

# 2. Primary User Personas

The system should support these main personas without building separate applications.

| Persona | Primary Purpose | Typical Authority |
|---|---|---|
| Account Owner | Commercial/account administration | Subscription, billing, seats, organisation ownership |
| PMO / Organisation Admin | Configure Project Nidus to match organisational standards | Methodologies, templates, workflows, authorities, menus, governance |
| Delivery Professional | Execute/manage delivery | Portfolio, Programme, Project and workstream roles |
| Individual / Freelancer | Personal/consulting PMIS use | Usually account owner + workspace admin + delivery roles |

A large corporation may look like:

```text
ABC BANK
│
├── Account Owner
│   └── Commercial / SaaS administration
│
├── PMO Administrators
│   └── Organisation PMIS configuration
│
├── Portfolio Managers
├── Programme Managers
├── Project Managers
└── Project Team Members
```

A freelancer may look like:

```text
PERSONAL / CONSULTING WORKSPACE
│
└── User
    ├── Account Owner
    ├── Workspace Administrator
    └── Project / Programme / Portfolio Manager
```

Same platform. Same architecture. Different combinations of grants.

---

# 3. Do Not Permanently Classify a User as “Freelancer”, “Corporate”, or “PMO”

A human can participate in multiple organisations and hold different roles in each.

Target conceptual model:

```text
USER IDENTITY
│
└── MEMBERSHIPS
    │
    ├── Organisation A
    │   └── PMO Admin
    │
    ├── Organisation B
    │   └── Project Manager
    │
    └── Personal Workspace
        └── Account Owner / Workspace Admin
```

One user account should therefore be able to belong to multiple Nidus workspaces.

Do not require separate identities for each client or employer.

---

# 4. Public Landing Page

Recommended public navigation:

```text
PROJECT NIDUS

Product
Solutions
Industries
Pricing
Resources

[ Sign In ]
[ Start Free ]
```

Recommended hero positioning:

```text
ONE PMIS. CONFIGURED FOR HOW YOUR ORGANISATION DELIVERS PROJECTS.

Plan, govern and control projects, programmes and portfolios
using your methodology, your industry and your organisational standards.

[ Start Free ]
[ Explore Industries ]
```

Suggested landing-page audience section:

```text
WHO IS NIDUS FOR?

Independent Professionals
Project Managers
PMOs
Programme Teams
Portfolio Teams
Enterprise Organisations
Consultancies
```

Industry pages should represent capability packs, not separate products.

---

# 5. Registration Entry Choice

After clicking `Start Free`, ask first:

```text
HOW WILL YOU USE PROJECT NIDUS?

○ For myself
  Manage my own projects, programmes or portfolio

○ For my organisation
  Set up Nidus for a company, PMO, department or team

○ I was invited to an existing organisation
  Join an existing Nidus workspace
```

This should drive the onboarding journey.

Do not use the registration choice itself as an authorization role.

---

# 6. Path A — Individual / Freelancer

Recommended flow:

```text
Homepage
   ↓
Start Free
   ↓
For Myself
   ↓
Create Account
   ↓
Professional Profile
   ↓
Primary Industry
   ↓
Subscription / Trial
   ↓
Create Personal Workspace
   ↓
Provision Generic PM Core
   ↓
Provision Industry Pack
   ↓
Getting Started
   ↓
Create First Project
```

Recommended minimum data:

```text
YOUR ACCOUNT
- First Name
- Last Name
- Email
- Password
- Country

YOUR WORK
- Primary Professional Role
- Primary Industry

YOUR WORKSPACE
- Workspace Name
- Primary Delivery Approach
```

Professional-role examples:

```text
Project Manager
Programme Manager
Portfolio Manager
PMO Consultant
Project Administrator
Other
```

A personal workspace can initially grant the same person separate internal authorities such as:

```text
Account Owner
Workspace Administrator
Delivery Manager
```

Do not collapse these into one unrestricted `SUPERUSER` role.

---

# 7. Path B — Organisation / Corporate Registration

Recommended flow:

```text
Homepage
   ↓
Start Free
   ↓
For My Organisation
   ↓
Account Owner Registration
   ↓
Organisation Details
   ↓
Industry Selection
   ↓
Organisation Size
   ↓
Subscription / Trial
   ↓
Email / Organisation Verification
   ↓
Tenant Provisioning
   ↓
PMO Configuration Wizard
   ↓
Invite PMO Administrators
   ↓
Configure Delivery Standards
   ↓
Create Portfolio / Programme / Project
   ↓
Assign Delivery Managers
```

The first person creating the organisation becomes the Account Owner.

Do **not** assume the Account Owner is automatically the PMO Admin.

Ask:

```text
Would you also like to administer your organisation's PMIS configuration?

○ Yes, give me Organisation / PMO Admin access
○ No, I will invite a PMO Administrator
```

This supports cases where the purchaser is Finance, IT, Procurement, CIO office, etc.

---

# 8. Path C — Invited User

Invited users should skip organisation creation, industry selection and subscription setup.

Recommended flow:

```text
Invitation Link
   ↓
Sign In / Create Identity
   ↓
Accept Organisation Invitation
   ↓
Accept Assigned Role / Scope
   ↓
Workspace
```

The invitation should contain authoritative context such as:

```text
Organisation
Membership Role
Optional Portfolio / Programme / Project Scope
```

Examples:

```text
Join ABC Bank as Programme Manager
```

or:

```text
Join Digital Transformation Programme
as Project Manager for Project Phoenix
```

---

# 9. Account Owner Zone

Create a distinct account/commercial area.

Recommended taxonomy:

```text
ACCOUNT MANAGEMENT
│
├── Account Overview
│
├── Subscription
│   ├── Current Plan
│   ├── Plan Features
│   ├── Upgrade / Downgrade
│   ├── Renewal
│   └── Subscription History
│
├── Billing
│   ├── Billing Profile
│   ├── Payment Method
│   ├── Invoices
│   ├── Payments
│   └── Billing History
│
├── Licences / Seats
│   ├── Purchased Seats
│   ├── Assigned Seats
│   ├── Available Seats
│   └── Seat History
│
├── Industry Packs
│   ├── Active Packs
│   ├── Available Packs
│   └── Pack Entitlements
│
├── Organisation
│   ├── Organisation Profile
│   ├── Business Details
│   ├── Industry
│   └── Verification
│
├── Account Owners
│
└── Account Audit
```

An Account Owner should not automatically see project-delivery menus unless also assigned delivery roles.

---

# 10. PMO / Organisation Admin Zone

The PMO Admin should configure the organisation's project-management operating model.

Recommended taxonomy:

```text
ORGANISATION CONFIGURATION
│
├── PMO Setup
│   ├── Organisation PM Framework
│   ├── Delivery Methodologies
│   ├── Governance Model
│   ├── Project Classifications
│   └── Project Complexity Levels
│
├── Lifecycle Configuration
│   ├── Predictive Lifecycle
│   ├── Agile Lifecycle
│   ├── Hybrid Lifecycle
│   ├── Stage Gates
│   └── Approval Gates
│
├── Project Standards
│   ├── Project Charter Standard
│   ├── Business Case Standard
│   ├── Planning Standard
│   ├── RAID Standard
│   ├── Change Standard
│   ├── Quality Standard
│   └── Closure Standard
│
├── Templates
│   ├── Project Templates
│   ├── Programme Templates
│   ├── Portfolio Templates
│   ├── Document Templates
│   ├── Register Templates
│   └── Report Templates
│
├── Workflows
│   ├── Project Approval
│   ├── Change Approval
│   ├── Risk Escalation
│   ├── Deliverable Approval
│   ├── Stage Gate Approval
│   └── Closure Approval
│
├── Authorities
│   ├── Delegated Authorities
│   ├── Approval Thresholds
│   ├── Escalation Levels
│   └── Approval Matrix
│
├── Roles & Responsibilities
│   ├── Organisation Roles
│   ├── Portfolio Roles
│   ├── Programme Roles
│   ├── Project Roles
│   ├── PMO Roles
│   └── Default RACI
│
├── Menus & Capabilities
│   ├── Generic PM Modules
│   ├── Industry Modules
│   ├── Optional Modules
│   └── Organisation Overrides
│
├── Reference Data
├── Reporting Standards
├── Naming / ID Rules
└── Configuration Audit
```

The PMO Admin configures policy and standards; individual project managers should inherit that configuration where appropriate.

---

# 11. Treat the Core PM & Industry Menu Taxonomy as a Capability Catalogue

The embedded taxonomy in this document should not be interpreted as “show all of these nodes in the sidebar.”

Instead:

```text
NIDUS CAPABILITY CATALOGUE
         │
         ├── Generic PM Core
         ├── Industry Pack
         ├── Optional Capability Packs
         └── Reporting / Configuration Extensions
```

Resolution should conceptually be:

```text
Core SaaS
+
Subscription Entitlements
+
Generic PM Capability Pack
+
Industry Capability Pack
+
Optional Capability Packs
+
Organisation Configuration
+
Membership Role
+
Scope Role
+
Authority / Permission
=
Effective User Capabilities
```

Then use those capabilities to build the user's menu and dashboard.

Menu visibility is not the security boundary.

---

# 12. Capability Profiles

To simplify onboarding and PMO configuration, support predefined profiles such as:

```text
Essential
Standard
Advanced
Enterprise
Custom
```

Possible conceptual defaults:

## Essential

```text
Projects
Planning
Risks
Issues
Stakeholders
Actions
Reports
```

## Standard

Adds:

```text
Change
Resources
Cost
Quality
Governance
Documents
```

## Advanced

Adds:

```text
Testing
Stage Gates
Benefits
Procurement
Advanced Reporting
Scenario Planning
```

## Enterprise

Adds:

```text
PMO
Programme Management
Portfolio Management
Enterprise Governance
Enterprise Resource Management
Enterprise Reporting
```

The exact composition should be configurable and Admin-governed, not hard-coded.

Industry capabilities are layered on top.

---

# 13. Two-Stage Corporate Provisioning

Corporate onboarding should be divided into:

## Stage 1 — SaaS Provisioning

Automatically establish:

```text
Organisation
Industry
Subscription / Trial
Account Owner
Core SaaS Access
Generic PM Pack Entitlement
Industry Pack Entitlement
Provisioning Audit
```

## Stage 2 — PMO Configuration

The PMO Admin establishes:

```text
Methodology
Lifecycle
Templates
Stage Gates
Approval Structures
Roles
Authorities
Enabled Modules
Terminology
Reporting Standards
Reference Data
Organisation Standards
```

Do not attempt to fully configure a corporation during the public registration form.

---

# 14. Delivery Hierarchy

Support:

```text
ORGANISATION
│
├── Portfolios
│   ├── Portfolio A
│   │   ├── Programmes
│   │   │   ├── Programme A
│   │   │   │   ├── Project 1
│   │   │   │   └── Project 2
│   │   │   └── Programme B
│   │   └── Standalone Projects
│   └── Portfolio B
│
└── Standalone Projects
```

A project must not be required to belong to a programme or portfolio.

Valid hierarchy examples:

```text
Organisation → Project
Organisation → Programme → Project
Organisation → Portfolio → Project
Organisation → Portfolio → Programme → Project
```

---

# 15. Separate Assignment from Authority

A user may be assigned to a delivery entity but have limited authority.

Example:

```text
User: Jane

Organisation Role:
PMO Analyst

Portfolio A:
Viewer

Programme X:
PMO Analyst

Project Y:
Project Manager

Project Z:
Risk Owner
```

Therefore, do not infer authority solely from membership or assignment.

---

# 16. Permission Scopes

Design for these scopes:

```text
SAAS / GLOBAL
   ↓
ORGANISATION
   ↓
PORTFOLIO
   ↓
PROGRAMME
   ↓
PROJECT
   ↓
RECORD / OBJECT (where required)
```

Example grants:

| User | Scope | Role |
|---|---|---|
| Alice | Organisation | PMO Admin |
| Bob | Portfolio A | Portfolio Manager |
| Carol | Programme X | Programme Manager |
| David | Project 101 | Project Manager |
| Eve | Project 101 | Team Member |

Visibility at a parent scope does not automatically mean write/approve authority on all child objects.

---

# 17. Authority Model

Conceptually:

```text
ROLE
+
SCOPE
+
PERMISSION / AUTHORITY
```

Example:

```text
Portfolio Manager
Scope = Portfolio A
Permissions:
- Read all Portfolio A programme/project health
- Approve portfolio-level decisions
- View project schedules
- No automatic right to amend individual project schedules
```

This model should be implemented through the existing authorization/RLS architecture rather than only menu filtering.

---

# 18. Recommended Role Families

## SaaS / Commercial

```text
Account Owner
Billing Administrator
```

## Organisation Configuration

```text
Organisation Admin
PMO Admin
Configuration Admin
```

## Delivery Governance

```text
PMO Director
PMO Manager
PMO Analyst
Portfolio Manager
Programme Manager
Project Manager
Project Administrator
```

## Delivery Contributors

```text
Team Member
Workstream Lead
Risk Owner
Issue Owner
Change Owner
Action Owner
Approver
Reviewer
Viewer
```

One person can hold multiple roles.

---

# 19. Workspace Switching

A single identity should be able to participate in multiple organisations.

Example:

```text
oscar@example.com
│
├── Oscar Consulting
│   └── Owner
│
├── ABC Bank
│   └── Programme Manager
│
└── XYZ Telecom
    └── Project Manager
```

Recommended workspace selector:

```text
ABC Bank ▼

Switch workspace
───────────────
✓ ABC Bank
  Oscar Consulting
  XYZ Telecom

+ Create workspace
```

Changing workspace must cause membership, entitlement, role, scope and menu resolution to recalculate.

---

# 20. Role-Aware Home Pages

Do not force every persona onto one identical dashboard.

Use a shared configurable dashboard framework.

## Account Owner Home

```text
Subscription Status
Seats Used
Invoices
Organisation Status
Industry Packs
Recent Account Activity

[ Manage Subscription ]
[ Invite Administrator ]
[ Open Workspace ]
```

## PMO Admin Home

```text
Configuration Completion
Active Projects
Governance Status
Templates
Users & Roles
Open Configuration Actions

[ Configure PMIS ]
[ Manage Users ]
[ Create Portfolio ]
```

## Portfolio Manager Home

```text
Portfolio Health
Programmes
Projects
Investment / Cost
Risks
Milestones
Benefits
```

## Programme Manager Home

```text
Programme Health
Projects
Dependencies
Milestones
Risks
Benefits
Decisions
```

## Project Manager Home

```text
Project Health
Schedule
Milestones
RAID
Actions
Changes
Cost
Quality
Testing
```

## Freelancer Home

```text
My Projects
My Programmes
My Portfolio
Upcoming Actions
Recent Activity

[ Create Project ]
```

Do not implement six separate dashboard engines. Use one dashboard framework with role/context-aware widgets.

---

# 21. Main Application Zones

A simplified top-level application experience should be organised into:

```text
NIDUS
│
├── MY WORK
│   └── Personal assignments and actions
│
├── DELIVERY
│   ├── Portfolios
│   ├── Programmes
│   └── Projects
│
├── ORGANISATION
│   ├── People
│   ├── PMO Configuration
│   ├── Templates
│   └── Governance
│
└── ACCOUNT
    ├── Subscription
    ├── Billing
    ├── Seats
    └── Industry Packs
```

Possible global items:

```text
Home
My Work
Delivery
Organisation
Account
Reports
Notifications
Help
```

Do not show all zones to all users.

---

# 22. Project-Level Navigation

When a project is opened, then expose relevant Generic PM and Industry capabilities.

Example:

```text
PROJECT PHOENIX
│
├── Dashboard
├── Project Setup
├── Scope & Deliverables
├── Planning
├── RAID
├── Stakeholders
├── Change
├── Resources
├── Cost
├── Quality
├── Testing
├── Governance
├── Documents
├── Reports
│
└── Banking Transformation
    ├── Core Banking
    ├── Data Migration
    ├── Testing & Assurance
    ├── Cutover
    ├── Operational Readiness
    └── Hypercare
```

Deep taxonomy levels should become tabs/sub-navigation rather than an enormous sidebar.

---

# 23. Project Templates as Governance Engines

Project templates should eventually be able to define:

```text
Project Template
│
├── Methodology
├── Lifecycle
├── Required Modules
├── Required Documents
├── WBS Template
├── Standard Milestones
├── RAID Configuration
├── Governance Structure
├── Approval Gates
├── Reporting Frequency
├── Required Roles
├── Industry Workstreams
└── Closure Requirements
```

Example:

```text
Core Banking Transformation
```

could be an organisational template based on the `FIN` industry capability pack while still using shared Generic PM capabilities.

---

# 24. Organisational Policy Enforcement

The PMO Admin should configure standards once, not manually repeat rules per project.

Example:

```text
Project Classification: Major Transformation

Required:
- Business Case
- Project Charter
- Full RAID
- Monthly Steering Committee
- Stage Gate 1
- Stage Gate 2
- UAT Sign-Off
- Closure Report

Authority:
- Changes above defined threshold require Sponsor approval
```

When a Project Manager creates a project using that classification/template, Project Nidus should provision the relevant governance automatically.

---

# 25. Menu Resolution Formula

Use this as the target conceptual model:

```text
Effective Capability Set
=
Core SaaS
+
Generic PM Pack
+
Industry Pack
+
Optional Packs
+
Subscription / Trial Entitlements
+
Organisation Configuration
+
Organisation Membership Role
+
Portfolio / Programme / Project Scope Roles
+
Explicit Permissions
```

Then:

```text
Resolved User Menu
=
Effective Capability Set
∩
Accessible Routes / Features
```

And:

```text
Authorization
=
Server / Database / RLS enforcement
```

A hidden menu is not authorization.

---

# 26. Tenant / Registration Provisioning Flow

Target organisation flow:

```text
Registration
    ↓
Organisation Created
    ↓
Industry Assigned
    ↓
Subscription / Trial Assigned
    ↓
Generic/Core PM Pack Assigned
    ↓
Industry Pack Assigned
    ↓
Optional Entitlements Assigned
    ↓
Account Owner Role Assigned
    ↓
Provisioning Audit Created
    ↓
Workspace Ready
    ↓
PMO Configuration
    ↓
Delivery Structure Created
    ↓
Managers Assigned
```

Provisioning should be idempotent, auditable and safe to retry.

---

# 27. Security Principles

Claude/Cursor must ensure:

- Account ownership is not the same as project authority.
- Professional title is not the same as permission.
- Menu visibility is not security.
- Scope is enforced authoritatively.
- Users cannot forge organisation, subscription, role, industry-pack or scope IDs.
- Tenant isolation remains enforced through RLS/authorization.
- Cross-workspace access is denied unless a user has an explicit membership.
- Account/Billing permissions are separated from Delivery permissions.
- PMO configuration permissions are separated from ordinary Project Manager permissions.
- Sensitive organisation settings cannot be changed by ordinary delivery users.

---

# 28. Current Codebase Rationalisation Requirement

Before implementing this architecture, Claude should inspect the current application and produce a mapping for:

```text
Identity
Registration
Organisation creation
Memberships
Account ownership
Subscription
Billing
Trial
Industry
Feature entitlements
Menu resolution
Organisation configuration
Roles
Permissions
Portfolio assignments
Programme assignments
Project assignments
Dashboard routing
Workspace switching
RLS
```

Produce a matrix:

| Area | Current Implementation | Target Model | Reuse | Extend | Replace/Deprecate | Risk |
|---|---|---|---|---|---|---|

Do not create duplicate services/tables if an existing canonical implementation can be extended.

---

# 29. Implementation Sequence Recommendation

Recommended high-level vertical slices:

```text
1. Current-State Audit
2. Identity / Membership Rationalisation
3. Workspace Model
4. Account Owner / Commercial Zone
5. Registration Journey Split
6. Subscription + Tenant Provisioning
7. Organisation / PMO Configuration Zone
8. Role + Scope + Authority Model
9. Portfolio / Programme / Project Assignment Model
10. Capability / Menu Resolver
11. Role-Aware Home / Dashboard
12. Workspace Switcher
13. Existing Tenant Migration
14. Security / RLS Deep Review
15. Release / Regression Validation
```

Use the existing PRD and implementation-plan workflow before coding.

---

# 30. Success Criteria

This redesign is successful when:

- [ ] One identity can belong to multiple workspaces.
- [ ] Personal/freelance and corporate users use the same platform architecture.
- [ ] Account ownership is distinct from PMO administration.
- [ ] PMO administration is distinct from delivery management.
- [ ] Subscription and billing are separated from project delivery authority.
- [ ] Industry is an organisation/tenant property and capability input.
- [ ] Corporate tenants can configure methodologies, governance, templates, authorities and menus.
- [ ] Portfolios, programmes and projects support scoped assignments.
- [ ] A user can hold different roles at different scopes.
- [ ] Authority is not inferred solely from job title.
- [ ] The menu is resolved from capabilities, entitlement, configuration, role and scope.
- [ ] RLS/backend authorization remains authoritative.
- [ ] Invited users skip tenant/subscription setup.
- [ ] Existing tenants remain functional through migration.
- [ ] The Generic/Core PM and Industry taxonomy remains a capability catalogue, not a giant literal sidebar.
- [ ] The system can serve freelancers, consultancies, PMOs and large enterprises without separate products.

---

# 31. Claude Session Starter

> Read `CLAUDE.md`, `ROADMAP.md`, `REVIEW.md`, `projectplan/App_Guide.md`, and this document.
>
> Do not start coding.
>
> First audit the current Project Nidus registration, login, organisation membership, account ownership, subscription, trial, industry, menus, feature entitlements, PMO configuration, role/permission model, portfolio/programme/project assignment model, dashboards, workspace context and RLS.
>
> Map the current system to the target architecture in this document.
>
> Reuse and rationalise existing canonical components/services/tables before proposing new ones.
>
> Treat the embedded Core PM & Industry taxonomy as the functional capability catalogue, not as an instruction to create duplicate modules or render every taxonomy node in the sidebar.
>
> Create the versioned PRD and complete the required one-question-at-a-time decision interview before creating the implementation plan.
>
> Do not enact the implementation plan until explicit approval.
>
> After implementation, validate against `REVIEW.md`, including cross-tenant access, role/scope/authority behaviour, subscription entitlement, direct-route authorization, and regression coverage.

---

# 32. Embedded Core PM & Industry Menu Taxonomy

The complete current taxonomy follows below and should be treated as part of this architecture brief.

---

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
│   │   ├── Purpose
│   │   ├── Scope
│   │   ├── Objectives
│   │   ├── High-Level Milestones
│   │   ├── Constraints
│   │   ├── Assumptions
│   │   └── Approval
│   ├── Project Team
│   │   ├── Team Members
│   │   ├── Roles & Responsibilities
│   │   ├── RACI
│   │   ├── Team Structure
│   │   └── Contact Directory
│   └── Governance
│       ├── Governance Structure
│       ├── Steering Committee
│       ├── Project Board
│       ├── PMO Oversight
│       ├── Meeting Calendar
│       ├── Escalation Path
│       ├── Delegated Authorities
│       └── Governance Decisions
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
│   │   ├── Project Calendar
│   │   ├── Working Days
│   │   ├── Holidays
│   │   └── Exceptions
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
│   ├── Issues
│   │   ├── Issue Register
│   │   ├── Assessment
│   │   ├── Resolution Plan
│   │   ├── Owners
│   │   ├── Escalations
│   │   └── Closed Issues
│   └── Dependencies
│       ├── Dependency Register
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
│       ├── Time Entry
│       ├── Approvals
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

