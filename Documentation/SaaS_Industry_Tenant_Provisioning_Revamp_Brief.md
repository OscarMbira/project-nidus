# Project Nidus — SaaS Industry-Aware Tenant Provisioning & Menu Architecture Revamp Brief

> **Recommended location:** `Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md`
>
> **Purpose:** This document is an execution brief for Claude/Cursor to **audit, sanitise, rationalise, and progressively revamp the existing Project Nidus codebase** so that the SaaS platform supports industry-aware registration, tenant provisioning, role-aware menus, configurable industry capability packs, and a simplified onboarding experience.
>
> **Important:** This document does **not** override `CLAUDE.md`, `ROADMAP.md`, or `REVIEW.md`.
> If any instruction in this brief conflicts with `CLAUDE.md`, follow `CLAUDE.md` and explicitly report the conflict before implementation.

---

# 1. Executive Objective

Project Nidus is being developed as a multi-tenant SaaS PMIS.

The target onboarding model is:

```text
Homepage
   ↓
Register / Sign Up
   ↓
User Account Details
   ↓
Organisation Details
   ↓
Industry Selection
   ↓
Primary Professional Role
   ↓
Email Verification
   ↓
Organisation/Tenant Provisioning
   ↓
Generic PM Capability Pack
   +
Industry Capability Pack
   +
Subscription / Feature Entitlements
   +
Role Permissions
   ↓
Resolved User Menu
   ↓
Guided First-Time Onboarding
   ↓
Project Nidus Workspace
```

The codebase must be reviewed and rationalised so that the above architecture is implemented **without duplicating applications, menus, services, permissions, or business logic by industry**.

The desired model is:

```text
ONE NIDUS PMIS PLATFORM
        +
GENERIC PM CORE
        +
INDUSTRY CAPABILITY PACKS
        +
ROLE-BASED ACCESS
        +
TENANT CONFIGURATION
        +
SUBSCRIPTION / FEATURE ENTITLEMENTS
```

Do **not** create separate Banking PMIS, Construction PMIS, Healthcare PMIS, etc.

---

# 2. Mandatory Starting Procedure

Before proposing code changes:

1. Read the repository root `CLAUDE.md`.
2. Read the repository root `ROADMAP.md`.
3. Read the repository root `REVIEW.md`.
4. Read `projectplan/App_Guide.md`.
5. Inspect the existing codebase and database before asking the user questions that can be answered from the repository.
6. Identify the currently active architecture and existing modules/services/tables involved.
7. Produce a codebase audit.
8. Identify conflicts, duplicates, obsolete patterns, and reusable components.
9. Create a formal PRD under `projectprd/`.
10. Conduct the decision interview required by `CLAUDE.md`.
11. Create the versioned implementation plan under `projectplan/`.
12. Obtain user approval of the implementation plan.
13. Only then begin implementation.

Do **not** use this brief as permission to bypass the existing PRD/plan/approval workflow.

---

# 3. Primary Design Principle

Industry must be treated primarily as an **Organisation/Tenant attribute**, not merely as a user preference.

The registration screen may collect the industry from the registering user, but the selected industry should be persisted against the organisation.

Target conceptual relationship:

```text
User
  ↓
Organisation Membership
  ↓
Organisation
  ├── Industry
  ├── Industry Segment
  ├── Country
  ├── Subscription
  └── Organisation Configuration
```

Avoid a design where every user independently owns a separate `industry_id` unless there is a clearly justified secondary user-preference use case.

---

# 4. Registration & Onboarding Target Flow

Review and rationalise the current registration flow toward the following model.

## Step 1 — User Account

Required minimum:

- First Name
- Last Name
- Business Email
- Password
- Country

## Step 2 — Organisation

Required minimum:

- Organisation Name
- Industry
- Organisation Country

Recommended optional fields:

- Industry Segment / Sub-industry
- Organisation Size
- Website

## Step 3 — Professional Role

Examples:

- Project Manager
- PMO Professional
- Programme Manager
- Portfolio Manager
- Project Administrator
- Team Member
- Other

### Critical Rule

The professional role selected during registration is **not automatically the same as a security/authorization role**.

Separate:

```text
Professional Role
```

from:

```text
Security Role / Permission Role
```

For the first user who creates a new organisation, the system may establish an organisation-owner/admin relationship according to the approved authorization design.

Invited users must receive system permissions through the invitation/membership/role process, not simply by selecting a professional role.

---

# 5. Organisation-First SaaS Model

Preserve and integrate the existing organisation-first architecture.

The desired lifecycle is:

```text
Register
   ↓
Create Organisation
   ↓
Select Industry
   ↓
Verify Organisation/User
   ↓
Provision Tenant Defaults
   ↓
Apply Subscription / Trial
   ↓
Resolve Capabilities
   ↓
Create First Project
```

Before implementing changes, inspect the existing:

- organisation registration flow
- organisation verification flow
- trial logic
- subscription logic
- Paynow integration
- protected routes
- role/membership model
- onboarding redirects

Do not replace stable working capabilities unnecessarily.

Refactor only when the current structure blocks the target architecture or creates duplication/security/maintenance problems.

---

# 6. Industry Master Data

Industry options must be database-driven.

Do not hard-code the live industry list in React/JavaScript.

Create or rationalise an Admin-managed industry master concept.

Target conceptual entity:

```text
industries
```

Recommended attributes:

```text
id
display_id
industry_code
industry_name
description
icon_key
display_order
is_active
created_at
created_by
updated_at
updated_by
```

Potential initial values may include:

- Banking & Financial Services
- Construction & Engineering
- Information Technology
- Healthcare
- Government & Public Sector
- Telecommunications
- Energy & Utilities
- Manufacturing
- Education
- NGO / Development
- Retail
- General Project Management
- Other

Do not seed uncontrolled dummy/sample data.

Any reference/configuration seeds must comply with the SQL, ID-generation, Admin-schema, and seed rules in `CLAUDE.md`.

---

# 7. Industry Segments / Sub-industries

Design the data model so sub-industries can be supported even if the initial UI makes the field optional.

Target conceptual entity:

```text
industry_segments
```

Relationship:

```text
industries
    1
    │
    N
industry_segments
```

Examples:

```text
Banking & Financial Services
 ├── Retail Banking
 ├── Corporate Banking
 ├── Investment Banking
 ├── Payments
 ├── Microfinance
 ├── Insurance
 └── FinTech
```

The design must not make sub-industries mandatory unless explicitly approved in the PRD.

---

# 8. Generic PM Core

Project Nidus must have a set of generic PM capabilities that are reusable across industries.

Examples include:

```text
Dashboard
Project Setup
Planning
Products / Deliverables
WBS
Schedule
Milestones
Dependencies
RAID
Stakeholders
Change Control
Resources
Cost
Quality
Testing
Governance
Decisions
Actions
Approvals
Reports
Documents
Notifications
```

These are not industry-specific applications.

Do not create duplicate copies of these capabilities per industry.

Where industry-specific behaviour is required, extend/configure the shared capability.

---

# 9. Industry Capability Packs

Introduce or rationalise a configuration concept for **Industry Capability Packs**.

Conceptual entities may include:

```text
industry_packs
industry_pack_features
industry_pack_menu_items
industry_pack_templates
industry_pack_reference_data
```

Exact table names must be based on the existing schema and naming conventions discovered during audit.

Do not create new tables before verifying whether equivalent structures already exist.

Examples:

```text
BANKING_CORE
CONSTRUCTION_CORE
TECHNOLOGY_CORE
HEALTHCARE_CORE
GENERAL_PM
```

Industry packs should represent configuration/entitlements, not cloned codebases.

---

# 10. Example: Banking Capability Pack

A Banking & Financial Services organisation may receive generic PM menus plus industry capabilities such as:

```text
Banking Transformation
 ├── Core Banking
 ├── Product Configuration
 ├── Parameterisation
 ├── Interfaces
 ├── Data Migration
 ├── Environments
 ├── Testing & Assurance
 ├── Operational Readiness
 ├── Cutover
 ├── Go-Live
 └── Hypercare
```

These should integrate with common PM controls such as risks, issues, dependencies, change, schedule, resources, testing, decisions, approvals, and reporting.

Do not create isolated banking-only versions of generic PM registers where configuration or relationships are sufficient.

---

# 11. Other Industry Examples

These examples exist to validate extensibility. They are **not automatic implementation scope**.

## Construction & Engineering

```text
Construction Management
 ├── Sites
 ├── Contractors
 ├── Subcontractors
 ├── Permits
 ├── Inspections
 ├── Materials
 ├── Health & Safety
 ├── Site Instructions
 ├── RFIs
 └── Progress Certificates
```

## Technology / IT

```text
Technology Delivery
 ├── Requirements
 ├── Architecture
 ├── Environments
 ├── Interfaces
 ├── Releases
 ├── Deployments
 ├── Defects
 ├── Technical Debt
 └── Production Readiness
```

Do not implement these modules unless explicitly approved in the relevant PRD.

---

# 12. Layered Menu Architecture

Rationalise the menu architecture toward layered resolution.

Target model:

```text
Effective User Menu
 =
Core SaaS Menu
+
Generic PM Menu
+
Industry Pack Menu
+
Enabled Feature Entitlements
+
Organisation Overrides
+
Role/Permission Grants
```

Then filter the result through authorization.

Conceptually:

```text
Visible Menu
=
(Core + PM + Industry + Enabled Features + Organisation Configuration)
∩
Role Permissions
```

The security model must not rely only on hidden menu items.

Backend/database authorization and RLS remain authoritative.

---

# 13. Menu Layers

## Layer 1 — SaaS Core

Potential examples:

- Home
- My Work
- Notifications
- Projects
- Reports
- Documents
- Help
- My Profile
- My Organisation

## Layer 2 — Generic PM

Potential examples:

- Project Setup
- Planning
- RAID
- Stakeholders
- Change
- Resources
- Cost
- Quality
- Testing
- Governance
- Reports

## Layer 3 — Industry Pack

Defined through configuration/feature assignments.

## Layer 4 — Organisation Configuration

Organisation PMO/Admin may enable/disable eligible features according to entitlement.

## Layer 5 — Role / Permission Filter

Final visibility/action rights determined from authoritative roles and permissions.

---

# 14. Menu Data Must Remain Configuration-Driven

Inspect the existing DB-driven menu architecture.

Reuse and deepen it.

Do not introduce:

- hard-coded sidebar trees
- hard-coded industry menus
- client-only menu overrides
- duplicated menu definitions per tenant
- duplicated menu definitions per application where a shared configuration is appropriate

The current Project Nidus rules require user-facing/configurable content to remain database-driven.

Any new menu architecture must comply with that rule.

---

# 15. Avoid Per-Tenant Menu Duplication

Do not copy a full menu hierarchy into every organisation unnecessarily.

Preferred model:

```text
Global Menu Definition
        │
        ├── Core Pack
        ├── Generic PM Pack
        ├── Industry Pack
        └── Optional Feature Packs
                 │
                 ▼
         Organisation Assignments
                 │
                 ▼
           Role Permissions
```

Tenant-specific records should generally capture only:

- assignment
- enabled/disabled status
- allowed override
- display order override where permitted
- custom label where permitted
- entitlement status

Do not duplicate hundreds of menu rows for every organisation unless a clear technical requirement justifies it.

---

# 16. Organisation Feature Configuration

Create or rationalise an organisation-level capability configuration model.

Target UX concept:

```text
Organisation Configuration
   ↓
Modules & Capabilities
```

Examples:

```text
☑ Risk Management
☑ Issue Management
☑ Change Control
☑ Testing
☑ Data Migration
☑ Cutover
☐ Procurement
☐ Benefits Management
```

This configuration should work within the organisation's:

- subscription
- industry pack
- role permissions
- system feature availability

An organisation must not be able to enable a feature it is not entitled to use unless the approved business model explicitly permits it.

---

# 17. Subscription & Commercial Readiness

Design the architecture so industry capability packs can eventually become commercial entitlements.

Do not force pricing/business-model changes now unless approved.

The architecture should be capable of supporting:

```text
Nidus Core PMIS
+
Industry Pack
+
Advanced Functional Packs
+
Subscription Tier
```

Potential future model:

```text
Professional
Business
Enterprise
+
Industry Packs
```

Ensure current design choices do not prevent this future model.

---

# 18. General Project Management Fallback

Provide an industry choice:

```text
General Project Management
```

This should provision the generic PM core without an industry-specialised pack.

Also consider:

```text
Other
```

with an optional user-provided industry description.

Do not automatically convert every `Other` entry into global master data.

New industry values should be governed through Admin.

---

# 19. Tenant Provisioning Service

Audit the existing post-registration process.

Rationalise toward a controlled tenant-provisioning workflow.

Conceptually:

```text
Organisation Created
      ↓
Assign Industry
      ↓
Assign Generic PM Pack
      ↓
Assign Industry Pack
      ↓
Assign Subscription / Trial Entitlements
      ↓
Assign Default Role(s)
      ↓
Assign Menu / Capability Access
      ↓
Assign Default Templates / Reference Data
      ↓
Create Audit Evidence
      ↓
Provisioning Complete
```

Prefer one authoritative provisioning service/process rather than scattered UI-side inserts.

Requirements:

- idempotent where practical
- auditable
- safe to retry
- transactionally consistent where practical
- does not create duplicate assignments
- fails visibly
- does not silently substitute fallback configuration

---

# 20. First-Time User Experience

Do not redirect newly registered users straight into an overwhelming PMIS workspace.

Create or rationalise a simplified onboarding destination such as:

```text
/app/getting-started
```

Conceptual experience:

```text
Welcome to Project Nidus

Organisation:
ABC Bank

Industry:
Banking & Financial Services

Role:
Project Manager

Your workspace includes:
✓ Core Project Management
✓ Banking Transformation
✓ RAID
✓ Testing
✓ Data Migration
✓ Cutover

[ Create My First Project ]
```

Exact text and route must follow existing patterns and approved PRD decisions.

---

# 21. Role Architecture

Audit and explicitly distinguish:

## Professional Role

Describes what the person does professionally.

Examples:

- Project Manager
- PMO Professional
- Programme Manager
- Portfolio Manager
- Project Administrator

## Security Role

Controls authorization.

Examples must be derived from the current codebase.

Do not assume the existing role names.

## Project Role

Where the current system supports project-specific membership roles, preserve the distinction between organisation-level authority and project-level authority.

A user must not gain elevated permissions merely by selecting a professional title during registration.

---

# 22. Admin Application Responsibilities

Audit the Admin application and determine which capabilities should be governed there.

Likely Admin-managed concepts:

- industry master
- industry segments
- capability packs
- pack-feature relationships
- pack-menu relationships
- feature flags
- reference/configuration data
- ID generation
- global templates
- commercial/entitlement metadata where appropriate

Respect all Admin/public/sim schema boundaries and narrow cross-schema exceptions defined in `CLAUDE.md`.

Do not introduce new broad Admin → Platform/Simulator direct access merely to simplify implementation.

---

# 23. Platform & Simulator Responsibilities

## Platform

Platform should consume the authorised, resolved configuration required for real projects.

Platform should not:

- own Admin master-data governance
- hard-code industries
- hard-code industry-specific sidebar trees
- bypass subscriptions/permissions
- directly depend on Admin application source code

## Simulator

Audit whether the new industry model applies to Simulator.

Potential use cases:

- industry-filtered scenarios
- industry-specific simulation packs
- training scenarios by sector
- industry-specific learning paths

Do not automatically clone every Platform feature into Simulator.

Apply Platform–Simulator parity only where the business capability is genuinely applicable and in accordance with `CLAUDE.md`.

Document justified differences.

---

# 24. Codebase Sanitisation Objectives

Before adding new functionality, audit the codebase for opportunities to rationalise:

- duplicate registration components
- duplicate organisation setup logic
- duplicate menu-resolution logic
- duplicate permission checks
- duplicate role constants
- duplicate feature-flag logic
- hard-coded industries
- hard-coded menus
- fallback/static configuration
- obsolete architecture-phase code
- legacy route patterns
- duplicated Platform/Simulator logic that should be shared
- duplicated shared-package utilities
- duplicated Admin patterns
- inconsistent database access
- unsafe client-only authorization
- obsolete tables/services
- ambiguous organisation/project context
- dead code
- unused components
- weak module boundaries

Do **not** delete or refactor simply because something looks old.

For every candidate rationalisation:

1. identify current consumers
2. identify replacement/canonical implementation
3. assess regression risk
4. identify migration path
5. propose the change in the implementation plan
6. preserve backward compatibility where required

---

# 25. Required Current-State Audit

Before creating the PRD, produce an audit containing at least:

## A. Registration

- current pages/components
- current services
- current tables/functions
- current verification flow
- current redirects
- current role capture
- current organisation creation

## B. Organisation / Tenant

- organisation schema/table
- membership model
- organisation settings
- trial/subscription linkage
- tenant identifiers
- RLS

## C. Menus

- menu master tables
- role-menu mapping
- feature-menu mapping
- menu services/hooks
- sidebar resolver
- Platform/Simulator/Admin differences
- hard-coded exceptions

## D. Roles & Permissions

- role tables
- permission tables
- user-role mapping
- project-role mapping
- organisation-role mapping
- RLS usage
- client-side checks

## E. Feature Entitlements

- subscription plans
- feature flags
- trial restrictions
- subscription checks
- plan-feature mappings

## F. Admin Configuration

- relevant Admin modules
- configuration tables
- publishing/synchronisation mechanisms

## G. Existing Industry Concepts

Search the entire repo/database for:

```text
industry
sector
vertical
business type
organisation type
industry_code
industry_id
sector_id
```

Report what already exists before proposing new structures.

---

# 26. Duplicate / Conflict Matrix

Produce a matrix like:

| Area | Current Implementations | Canonical Candidate | Duplicate/Conflict | Recommended Action | Risk |
|---|---|---|---|---|---|
| Menu resolution | ... | ... | ... | ... | ... |
| Registration | ... | ... | ... | ... | ... |
| Role assignment | ... | ... | ... | ... | ... |

Do not begin rationalisation until this matrix exists.

---

# 27. Target Data Model

Do not blindly create these tables.

First map them to existing entities.

The final logical model should support concepts equivalent to:

```text
organisations
industries
industry_segments

features
industry_packs
industry_pack_features

menu_items
industry_pack_menu_items

organisation_feature_assignments
organisation_menu_overrides

roles
permissions
role_permissions
user / membership roles

subscription_plans
plan_feature_entitlements
```

Exact physical schema must reuse existing Project Nidus tables wherever possible.

---

# 28. Target Resolution Logic

The effective capability calculation should conceptually be:

```text
Organisation Base Configuration
        +
Generic PM Pack
        +
Industry Pack
        +
Subscription / Trial Entitlements
        +
Organisation Overrides
        +
User / Membership / Project Role Permissions
        =
Effective Capabilities
```

The visible menu is a representation of effective capabilities, not the security control itself.

Authorization must remain enforced server-side/database-side.

---

# 29. Provisioning Idempotency & Status

Provisioning must not create duplicates if:

- registration callback retries
- browser refresh occurs
- verification callback is repeated
- Edge Function retries
- user returns to onboarding
- administrator re-runs provisioning

Where possible, use:

- unique constraints
- upserts
- deterministic assignment keys
- explicit provisioning status
- retry-safe functions

Consider an explicit status model such as:

```text
pending
in_progress
completed
failed
```

or reuse an existing equivalent.

A tenant must not appear successfully provisioned if critical assignments failed.

Provide a recoverable Admin/support path for failed provisioning.

Document the exact strategy in the PRD/plan.

---

# 30. Auditability

Audit material onboarding/provisioning actions.

Where supported by the existing audit model, capture:

- user
- organisation
- selected industry
- selected professional role
- assigned industry pack
- assigned subscription/trial
- assigned default roles
- configuration changes
- provisioning status
- timestamps
- source/action

Do not invent a parallel audit framework if an existing shared audit solution can be extended.

---

# 31. RLS & Security

This feature is security-sensitive.

Perform a DEEP review.

At minimum verify:

- organisation creation cannot hijack another tenant
- industry cannot be changed across tenants by unauthorized users
- organisation configuration cannot be changed by ordinary users
- professional-role selection cannot grant elevated authorization
- menu configuration cannot be used to bypass permission checks
- subscription entitlements cannot be client-forged
- industry pack assignment cannot be client-forged
- Admin master data is appropriately restricted
- Platform and Simulator cannot write unrestricted Admin configuration
- RLS protects all new tenant-owned assignment/configuration tables

Add explicit cross-tenant tests.

---

# 32. No Client-Trusted Entitlements

Never trust client-supplied values such as:

```text
industry_id
industry_pack_id
subscription_plan_id
is_admin
role_id
feature_ids
menu_ids
```

without server/database validation.

The browser may request an operation, but authoritative assignments must be validated against permitted values and current user authority.

---

# 33. No Menu-Only Security

A hidden menu item is not authorization.

Every protected action must remain guarded through the correct existing authorization/RLS layer.

Test direct URL/API/RPC access independently from sidebar visibility.

---

# 34. Migration Strategy for Existing Tenants

If existing organisations already exist without industry, do not force an unsafe migration.

The PRD/plan must define:

- default/backfill strategy
- nullable vs required transition
- treatment of existing tenants
- Admin migration UI if required
- General Project Management fallback if appropriate
- communication/first-login update flow if appropriate

Do not assign a specific industry to existing organisations based on guesswork.

Preserve existing users/projects while introducing the new model.

Audit regression impact on:

- registration
- login
- protected routes
- project creation
- subscriptions
- trial
- menus
- role grants
- dashboards
- Simulator
- Admin

---

# 35. Menu Resolution Performance

Menu resolution will occur frequently.

Avoid inefficient designs that:

- fetch hundreds of small records through repeated requests
- resolve permissions individually in the UI
- perform N+1 queries
- require repeated Admin cross-schema calls

Consider:

- database views/functions
- cached resolved configuration
- efficient joins
- client query caching

Do not sacrifice authorization correctness for performance.

---

# 36. Caching & Invalidation

If resolved capabilities/menu configuration are cached, define invalidation for:

- industry change
- subscription change
- role change
- organisation override
- Admin pack update
- feature-flag update
- invitation/membership change

Avoid stale privilege retention.

---

# 37. Business Decisions Claude Must Not Guess

The following are product decisions and must be resolved through the required PRD interview.

## Admin pack changes

When Admin modifies an existing industry pack, decide whether the change:

- affects all assigned organisations immediately
- affects only future organisations
- creates a versioned configuration
- requires organisation acceptance

## Industry changes after registration

Decide:

- who may change industry
- whether approval is required
- what happens to industry-specific configuration
- what happens to existing data from the previous industry pack
- whether historical industry is retained

## Multi-industry organisations

Evaluate:

### Option A — Single Primary Industry initially
**Recommended starting point.**

### Option B — Primary + Secondary Industries

### Option C — Industry by Business Unit / Project

## Project industry

Recommended initial model:

```text
Organisation = Primary Industry
Project = inherits Organisation Industry
```

Only add project-level override for a concrete approved requirement.

---

# 38. Onboarding Simplification

Because Project Nidus is SaaS with limited training, minimise friction.

Do not make the registration form excessively long.

Recommended mandatory minimum:

- First Name
- Last Name
- Email
- Password
- Organisation Name
- Organisation Country
- Industry
- Primary Professional Role

Collect optional profile/organisation setup information later where possible.

Use progressive disclosure through a simple multi-step onboarding UX such as:

```text
1. Your Account
2. Your Organisation
3. Your PM Role
4. Verify
5. Workspace Setup
```

Ensure:

- progress is clear
- users can recover from validation errors
- no duplicate organisation is accidentally created
- browser refresh/retry is safe
- accessibility/mobile behaviour works

---

# 39. Trial / Subscription Integration

Do not build industry provisioning separately from current trial/subscription logic.

Audit how:

- free trial project eligibility
- project locking
- feature limitations
- subscription plan
- Paynow payment
- upgrade

currently work.

The target effective capability engine should be compatible with both:

```text
Industry entitlement
```

and:

```text
Subscription entitlement
```

Example:

An industry pack may define that a feature is relevant, but the current subscription tier may still restrict it.

---

# 40. Effective Capability States

Consider whether features need states conceptually equivalent to:

```text
available
enabled
disabled
locked_by_plan
not_applicable
```

Do not implement this exact enum without reviewing existing feature-entitlement structures.

The UX should distinguish:

- feature not relevant
- feature relevant but disabled by organisation
- feature relevant but locked by subscription
- feature enabled but user lacks permission

This should be done without leaking unauthorized capabilities unnecessarily.

---

# 41. First Project Creation

After onboarding, the user should have an obvious next action.

Recommended:

```text
Create My First Project
```

The project-creation flow should inherit organisation context and permitted configuration automatically.

Do not ask users to re-select information already known from their tenant unless there is a legitimate project-level override.

---

# 42. Industry Templates & Reference Data

Design industry packs to optionally assign default templates and reference data.

Examples:

Banking might eventually provide templates for:

- data migration
- cutover
- UAT
- operational readiness

Construction might eventually provide:

- site inspection
- RFI
- HSE

Do not hard-code these into application code.

Use the existing/global template architecture if suitable.

Audit current template publishing/synchronisation before designing anything new.

Where reference data requires scope, consider existing patterns before introducing concepts equivalent to:

```text
global
industry
organisation
project
```

---

# 43. Reporting & Future Analytics

Future dashboards should be able to report/filter by industry at appropriate authorised scopes.

Potential examples:

- tenant counts by industry
- project portfolio by industry
- feature-pack adoption
- trial-to-paid conversion by industry
- industry-specific benchmark reporting

Do not expose cross-tenant data to tenant users.

Admin/SaaS operator reporting must remain separately authorised.

Do not add telemetry without explicit approval and appropriate privacy/security controls.

---

# 44. Recommended Implementation Strategy

Prefer incremental vertical slices.

Recommended sequence for the PRD/plan to evaluate:

## Slice 1 — Current-State Audit & Canonical Architecture

No user-visible changes.

## Slice 2 — Industry Master & Admin Governance

Admin + database + API/service + tests.

## Slice 3 — Registration Industry Capture

Registration + organisation persistence + validation + tests.

## Slice 4 — Industry Pack Model

Pack definitions + feature/menu assignments + Admin governance.

## Slice 5 — Tenant Provisioning

Provisioning service/function + audit + retry safety.

## Slice 6 — Menu Resolution

Core + generic PM + industry + entitlements + roles.

## Slice 7 — Organisation Capability Configuration

PMO/Admin controls within entitlement.

## Slice 8 — Guided Onboarding

Getting-started experience.

## Slice 9 — Existing Tenant Migration

Controlled migration/backfill/onboarding.

## Slice 10 — Simulator/Industry Extension

Only if approved and applicable.

Do not treat the above as mandatory issue numbering until codebase dependencies are understood.

---

# 45. Required PRD Questions

During the PRD interview, raise one decision at a time in accordance with `CLAUDE.md`.

At minimum resolve:

1. Can an organisation have one or multiple industries?
2. Is industry change allowed after registration?
3. Who may change industry?
4. Should an organisation have optional sub-industry?
5. What professional roles should appear during registration?
6. What system role should the first organisation registrant receive?
7. What happens to invited users?
8. What constitutes the Generic PM pack?
9. How are industry packs assigned?
10. Can organisations disable industry-provided capabilities?
11. Can organisations enable features outside their industry pack?
12. How do subscription plans interact with industry packs?
13. Are industry packs free initially or commercially licensed?
14. What happens when Admin modifies an existing pack?
15. How are existing organisations migrated?
16. Should projects inherit industry or support project-level override?
17. What onboarding route/page should new tenants see?
18. Which capabilities should be available during trial?
19. Which Admin roles may manage industries/packs?
20. Which Simulator behaviours should use industry configuration?

For each question:

- inspect existing code first where facts are involved
- present the relevant options
- give a recommended answer
- ask one decision question at a time

---

# 46. Required Test Strategy

The PRD/plan must define tests for:

## Registration

- valid industry selection
- inactive industry rejected/not listed
- industry belongs to correct organisation
- retry does not duplicate organisation/provisioning

## Authorization

- ordinary user cannot alter organisation industry
- forged role cannot elevate permissions
- forged pack cannot enable premium feature
- direct route/API cannot bypass menu restrictions

## Tenant Isolation

- Tenant A cannot see Tenant B configuration
- Tenant A cannot assign Tenant B pack
- Tenant A cannot change Tenant B industry
- Tenant A cannot read Tenant B organisation overrides

## Provisioning

- correct generic pack
- correct industry pack
- correct role grants
- correct trial/subscription
- duplicate-safe retries
- failure status/recovery

## Menu Resolution

- generic PM menu
- industry-specific menu
- role filtering
- subscription filtering
- organisation override
- inactive feature
- inactive menu
- permissions

## Existing Tenant Compatibility

- existing user login
- existing project access
- existing menus
- existing subscriptions
- existing protected routes

## UI

- dark/light mode
- PWA/mobile
- accessibility
- loading/error/success
- unsaved changes where applicable

---

# 47. Required RLS Tests

For every new tenant-owned table:

- Tenant A SELECT own data → PASS
- Tenant A SELECT Tenant B data → DENIED
- Tenant A INSERT with Tenant B organisation → DENIED
- Tenant A UPDATE Tenant B row → DENIED
- Tenant A DELETE Tenant B row → DENIED
- unauthorized role configuration → DENIED

Review SELECT/INSERT/UPDATE/DELETE policies separately.

Do not consider RLS complete because SELECT works correctly.

---

# 48. Required Review

After each vertical slice:

1. Run applicable tests.
2. Run the retest suite required by `CLAUDE.md`.
3. Apply `REVIEW.md`.
4. Record:
   - files changed
   - SQL changed
   - tests run
   - review findings
   - unresolved risks
   - cross-app impact
   - rollback/recovery implications
5. Update the implementation plan review section.
6. Update `ROADMAP.md` only if strategic status/dependencies/risks materially change.

---

# 49. Do Not Do

Do not:

- build separate applications per industry
- create industry-specific duplicates of generic PM modules
- hard-code industries
- hard-code live menu trees
- use client-only permissions
- trust role/industry/entitlement IDs from the browser
- bypass RLS
- create duplicate tables without searching existing schema
- create duplicate services/hooks/components
- replace working code without dependency analysis
- seed uncontrolled dummy data
- silently assign industries to existing tenants
- make professional role selection an automatic privilege escalation
- duplicate complete menu trees per tenant without justification
- add unapproved industry modules as scope creep
- make a massive one-shot refactor
- mix unrelated architecture cleanup into the same implementation step without explicit plan scope
- bypass the PRD/plan/user-approval process

---

# 50. Expected Audit Deliverables Before Coding

Claude should return:

## 1. Current Architecture Summary

Concise factual description of:

- registration
- organisation
- roles
- menus
- entitlements
- subscriptions
- Admin configuration
- Simulator impact

## 2. Existing Asset Map

List reusable:

- tables
- views
- functions
- services
- hooks
- components
- modules
- tests
- Admin configuration

## 3. Conflict / Duplication Matrix

Identify:

- duplicates
- hardcoding
- obsolete patterns
- security gaps
- inconsistent role/menu logic
- missing tenant boundaries

## 4. Target Architecture

Map current → target.

## 5. Migration/Rationalisation Strategy

Specify what should:

- remain
- be extended
- be consolidated
- be deprecated
- be migrated
- be removed later

## 6. Risk Register

At minimum include:

- tenant isolation
- authorization
- registration regression
- trial/subscription regression
- menu regression
- existing tenant migration
- Platform/Simulator/Admin drift

## 7. PRD

Create the formal versioned PRD under `projectprd/`.

## 8. Implementation Plan

After the required user interview/approval, create the versioned plan under `projectplan/`.

---

# 51. Recommended Target Architecture

The final architecture should conceptually converge toward:

```text
                           USER
                            │
                       Membership
                            │
                       Organisation
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
       Industry        Subscription      Organisation
          │             Entitlements      Overrides
          │                 │                  │
    Industry Pack           │                  │
          │                 │                  │
          └────────────┬────┴──────────────────┘
                       │
                 Capability Resolver
                       │
          ┌────────────┴────────────┐
          │                         │
     Generic PM Core          Industry Features
          │                         │
          └────────────┬────────────┘
                       │
                Role Permissions
                       │
                Effective Access
                       │
                 Resolved Menu
                       │
                    USER UI
```

Security must remain enforced beneath the UI.

---

# 52. Success Criteria

This initiative is successful when:

- [ ] Industry is captured during registration.
- [ ] Industry is stored against the organisation/tenant.
- [ ] Industry master data is Admin-governed and DB-driven.
- [ ] Generic PM capabilities are shared across industries.
- [ ] Industry-specific capabilities are configuration/pack-driven.
- [ ] Users do not receive authorization merely from a selected professional title.
- [ ] Menu resolution combines core, PM, industry, entitlement, organisation, and role inputs.
- [ ] Menu visibility is not treated as security.
- [ ] Provisioning is idempotent and auditable.
- [ ] Existing tenants remain functional.
- [ ] New tenants receive a simplified first-time onboarding experience.
- [ ] The architecture can support future commercial industry packs without redesign.
- [ ] Platform/Simulator/Admin boundaries remain compliant with `CLAUDE.md`.
- [ ] RLS tests prove tenant isolation.
- [ ] No unnecessary duplicate code/tables/menu structures are introduced.
- [ ] Existing duplicate/legacy structures identified by the audit are rationalised through controlled, approved steps.
- [ ] Final review passes `REVIEW.md`.

---

# 53. Claude Session Starter

Use the following instruction when beginning this initiative:

> Read `CLAUDE.md`, `ROADMAP.md`, `REVIEW.md`, `projectplan/App_Guide.md`, and this SaaS Industry-Aware Tenant Provisioning & Menu Architecture Revamp Brief.
>
> Do not start coding.
>
> First audit the current Project Nidus monorepo, Admin codebase where applicable, and relevant Supabase schema structures for registration, organisations, memberships, roles/permissions, menus, feature entitlements, subscriptions/trials, Admin configuration, and any existing industry/sector concepts.
>
> Identify reusable canonical implementations, duplication, hardcoding, obsolete patterns, architectural conflicts, security/RLS gaps, and migration risks.
>
> Produce the required current-state audit, existing asset map, conflict/duplication matrix, target architecture, rationalisation strategy, and risk register.
>
> Then create the versioned feature PRD under `projectprd/` and conduct the required one-question-at-a-time decision interview before creating the implementation plan.
>
> Do not enact the plan until explicit user approval.
>
> When implementation is approved, deliver the work as small vertical slices and review each slice against `REVIEW.md`.
>
> Preserve existing working behaviour wherever possible and prefer extension/consolidation over duplicate implementation.

---

# 54. Guiding Principle

> **Project Nidus should behave as one configurable SaaS PMIS platform, not a collection of separate industry applications.**

Industry should determine relevant capabilities and defaults.

Subscription should determine commercial entitlement.

Organisation configuration should determine permitted tenant choices.

Role/permissions should determine user authority.

The menu should reflect those decisions.

The database/security layer must enforce them.
