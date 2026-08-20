# Project Nidus — ROADMAP.md

> **Location:** Repository root
>
> **Role:** Strategic product and delivery roadmap.
>
> This document intentionally does **not** repeat engineering rules from `CLAUDE.md`, feature requirements from PRDs, or implementation steps from `projectplan/`.
>
> If this document conflicts with `CLAUDE.md`, `CLAUDE.md` wins.

---

## 1. Purpose

`ROADMAP.md` answers five questions:

1. What is Project Nidus becoming?
2. What major capabilities are being delivered?
3. What is the current priority?
4. What dependencies or strategic risks may affect delivery?
5. What roadmap outcomes are complete, active, blocked, deferred, or not started?

It is **not**:

- a replacement for a feature PRD
- a replacement for an implementation plan
- a coding standards document
- a database standards document
- a detailed review checklist

Those responsibilities remain with `CLAUDE.md`, `projectprd/`, `projectplan/`, and `REVIEW.md`.

---

## 2. Product Vision

Project Nidus is an enterprise-grade PMIS intended to provide a governed, integrated environment for managing projects, programmes, portfolios, simulations, and supporting administrative configuration.

The platform should progressively support:

- Predictive / structured delivery
- Agile delivery
- Hybrid delivery
- Product and deliverable planning
- Work breakdown and scheduling
- Risks, issues, assumptions, dependencies, decisions, actions, and changes
- Governance and approvals
- Resource and cost management
- Quality and testing
- Requirements and traceability
- Dashboards and reporting
- Project, programme, portfolio, and PMO views
- Simulation and learning capabilities
- Enterprise configuration through the Admin application
- AI-assisted planning, diagnostics, and decision support where appropriate

The strategic objective is a PMIS in which project information is **trusted, traceable, configurable, auditable, and usable without excessive training**.

---

## 3. Application Landscape

Project Nidus currently consists of three application contexts.

### Platform

Purpose:

- real project, programme, portfolio, PMO, governance, planning, execution, and control processes

Primary database schema:

- `public`

### Simulator

Purpose:

- project-management simulations, scenarios, learning runs, scoring, AI events, progress, and related training capabilities

Primary database schema:

- `sim`

### Admin

Purpose:

- enterprise/system configuration and administration that should not be hard-coded into operational applications

Primary database schema:

- `admin`

Detailed codebase separation, shared-package rules, routing, Module Federation, schema usage, parity requirements, and cross-codebase restrictions are defined only in `CLAUDE.md`.

---

## 4. Roadmap Status Values

Use only:

- `NOT STARTED`
- `IN PROGRESS`
- `BLOCKED`
- `IN REVIEW`
- `DONE`
- `DEFERRED`

A roadmap item should not be marked `DONE` merely because a page exists. It should be materially usable and its applicable review gates should have been completed.

---

## 5. Strategic Priority Model

Unless the user explicitly changes priorities, use the following ordering when roadmap decisions compete:

1. Security, tenant isolation, authorization, and data protection
2. Data integrity and auditability
3. Broken core workflows and regressions
4. Architecture issues that materially block safe delivery
5. Completion of active end-to-end capabilities
6. Cross-application consistency where applicable
7. Usability and simplification
8. Reporting and decision support
9. Performance and operational hardening
10. New enhancements and cosmetic improvements

This ordering is strategic only. Detailed implementation rules remain in `CLAUDE.md`.

---

## 6. Delivery Roadmap

### R0 — Architecture & Repository Foundation

**Status:** IN PROGRESS

**Outcome:** Establish a modular, AI-navigable, testable architecture that supports independent application/module evolution without losing consistency.

Strategic areas:

- Turborepo foundation
- Module Federation
- shared package strategy
- independent deployability
- Platform / Simulator / Admin separation
- codebase navigability
- architecture simplification
- deepening shallow modules where valuable
- consolidation of obsolete or duplicated architecture

Completion indicators:

- [ ] Current architecture is accurately documented
- [ ] All active modules follow the chosen architecture
- [ ] Shared capabilities have a clear source of truth
- [ ] Cross-domain boundaries are consistently enforced
- [ ] Major architectural debt is recorded and prioritised
- [ ] Critical build/deployment paths are stable

---

### R1 — Identity, Organisation, Access & SaaS Foundation

**Status:** IN PROGRESS

**Outcome:** Provide a secure SaaS foundation for organisations and authorised users.

Strategic areas:

- organisation-first onboarding
- organisation verification
- project access
- role-based access
- tenant isolation
- trial lifecycle
- subscription lifecycle
- Paynow integration
- entitlements / feature access

Completion indicators:

- [ ] Organisation lifecycle is complete
- [ ] Access and role model is consistently enforced
- [ ] Trial lifecycle is complete
- [ ] Subscription/payment lifecycle is complete
- [ ] Critical flows have strong automated coverage
- [ ] Cross-tenant access controls are verified

---

### R2 — Project Core & Governance Foundation

**Status:** IN PROGRESS

**Outcome:** Provide the common project foundation upon which planning, governance, execution, control, reporting, and closure modules operate.

Strategic areas:

- projects
- lifecycle/methodology
- project members
- governance structures
- statuses and classifications
- approvals
- record lifecycle
- audit metadata
- user-friendly record references

Completion indicators:

- [ ] Core project records are stable
- [ ] Record governance/approval patterns are reusable
- [ ] Project context is consistently resolved
- [ ] Audit metadata is consistently surfaced
- [ ] Human-readable references are used where applicable

---

### R3 — Planning & Scheduling

**Status:** IN PROGRESS

**Outcome:** Provide a robust planning engine for scope, products, work, milestones, dependencies, resources, calendars, baselines, and schedule visualisation.

Strategic areas:

- Product Breakdown Structure
- Work Breakdown Structure
- work packages
- milestones
- dependencies
- calendars
- Gantt
- Kanban
- baselines
- schedule diagnostics
- scenario analysis
- schedule quality

Completion indicators:

- [ ] Planning entities have clear canonical ownership
- [ ] Dependencies and date rules behave consistently
- [ ] Baselines are controlled
- [ ] Platform and Simulator coverage is aligned where applicable
- [ ] Planning views reconcile to authoritative data
- [ ] Schedule diagnostics are understandable and testable

---

### R4 — RAID, Decisions, Actions & Change Control

**Status:** IN PROGRESS

**Outcome:** Provide integrated project-control registers and governance workflows.

Strategic areas:

- risks
- assumptions
- issues
- dependencies
- decisions
- actions
- change requests
- approvals
- escalation
- dashboard rollups

Completion indicators:

- [ ] Each register supports its complete lifecycle
- [ ] Relationships between control records are traceable
- [ ] Summary metrics reconcile with registers
- [ ] Approval/governance actions are auditable
- [ ] Overdue/high-priority items are visible and actionable

---

### R5 — Quality, Requirements, Testing & Traceability

**Status:** IN PROGRESS

**Outcome:** Provide an integrated assurance model from requirement through delivery, testing, defects, evidence, acceptance, and change.

Strategic areas:

- requirements
- acceptance criteria
- quality planning
- test cases
- test suites
- test runs
- environments
- evidence
- defects
- requirement-to-test traceability
- lifecycle traceability
- diagnostics

Target traceability direction:

`Requirement → Product/Deliverable → Work → Build/Configuration → Test → Defect → Acceptance → Change`

Completion indicators:

- [ ] Traceability links are queryable
- [ ] Testing history is preserved
- [ ] Evidence is governed
- [ ] Defects link to affected requirements/work/tests
- [ ] Test status is reportable
- [ ] Diagnostic outputs are explainable

---

### R6 — Cost, Resource & Performance Management

**Status:** NOT STARTED

**Outcome:** Provide integrated control over budget, forecast, actuals, resources, capacity, and project performance.

Strategic areas:

- budgets
- actuals
- forecasts
- cost categories
- resource demand
- resource assignments
- capacity
- variance
- performance indicators

Completion indicators:

- [ ] Financial data has consistent definitions
- [ ] Forecast and baseline are distinguishable
- [ ] Resource conflicts can be detected
- [ ] Rollups reconcile
- [ ] Sensitive data access is appropriately controlled

---

### R7 — PMO, Programme & Portfolio Management

**Status:** IN PROGRESS

**Outcome:** Extend project-level control into cross-project governance and decision support.

Strategic areas:

- PMO dashboards
- programme management
- portfolio management
- cross-project milestones
- aggregate RAID/change views
- resource/cost rollups
- governance views
- prioritisation
- executive reporting

Completion indicators:

- [ ] Aggregations reconcile to project-level sources
- [ ] Drill-through from summaries to source records works where appropriate
- [ ] Cross-project filtering is consistent
- [ ] Programme/portfolio relationships are explicit
- [ ] Decision-support metrics have documented definitions

---

### R8 — Simulator & Learning Experience

**Status:** IN PROGRESS

**Outcome:** Provide a robust simulation environment that mirrors applicable project-management concepts without contaminating real Platform data.

Strategic areas:

- scenario library
- simulation runs
- module scores
- learner progress
- AI events
- certificates
- leaderboards
- custom scenarios
- commercial packaging

Completion indicators:

- [ ] Simulation data remains isolated
- [ ] Applicable Platform concepts have intentional Simulator equivalents
- [ ] Scoring/progress logic is testable
- [ ] Scenario lifecycle is complete
- [ ] Simulator dashboards and reports are coherent

---

### R9 — Admin Configuration & System Governance

**Status:** IN PROGRESS

**Outcome:** Move configurable system behaviour out of code and into governed Admin-managed data wherever appropriate.

Strategic areas:

- ID generation
- lookup/reference data
- global templates
- feature flags
- menu/configuration data
- system administration
- publishing/synchronisation
- audit and configuration governance

Completion indicators:

- [ ] Configurable values are DB-driven where intended
- [ ] Admin publishing flows are controlled
- [ ] Platform/Simulator consume authorised configuration correctly
- [ ] Cross-schema exceptions remain explicit and narrow
- [ ] Admin auditability is sufficient

---

### R10 — Reporting, Export & Executive Decision Support

**Status:** IN PROGRESS

**Outcome:** Provide consistent reporting, dashboards, drill-through, and export capabilities across the PMIS.

Strategic areas:

- operational dashboards
- executive dashboards
- clickable summary metrics where meaningful
- trend reporting
- exports
- print outputs
- filtered reporting
- reconciliation

Completion indicators:

- [ ] Dashboard metrics reconcile to source records
- [ ] Filters are consistent
- [ ] Drill-through works where the metric represents identifiable records
- [ ] Export capabilities are reusable
- [ ] Reporting does not depend on duplicated business logic

---

### R11 — Integrations, Notifications & Automation

**Status:** IN PROGRESS

**Outcome:** Connect Project Nidus safely to relevant external channels and automate repeatable system processes.

Strategic areas:

- email
- notifications
- webhooks
- scheduled jobs
- imports
- bulk uploads
- external APIs
- controlled automation

Completion indicators:

- [ ] Integration failures are observable
- [ ] Side effects are auditable
- [ ] Retries/idempotency are handled where applicable
- [ ] Imports preserve validation and governance
- [ ] External integrations respect access controls

---

### R12 — Enterprise Hardening & Release Readiness

**Status:** NOT STARTED

**Outcome:** Prepare Project Nidus for dependable production-scale operation.

Strategic areas:

- security assurance
- performance
- accessibility
- resilience
- observability
- backup/recovery
- deployment controls
- operational support
- data retention
- release governance

Completion indicators:

- [ ] Critical security risks resolved
- [ ] Performance baseline established
- [ ] Accessibility review completed
- [ ] Recovery procedures validated
- [ ] Production monitoring sufficient
- [ ] Release/rollback process validated

---

## 7. Cross-Roadmap Dependencies

| ID | Dependency | Affected Areas | Status | Notes |
|---|---|---|---|---|
| RD-001 | Stable identity/organisation/access model | Most roadmap areas | IN PROGRESS | Foundational for SaaS and tenant-aware features |
| RD-002 | Shared UI/shared utilities architecture | Platform, Simulator, Admin patterns | IN PROGRESS | Reduces duplicated behaviour |
| RD-003 | ID generation and record identity conventions | CRUD-heavy modules | IN PROGRESS | Supports user-friendly references and links |
| RD-004 | Audit metadata pattern | Governance, CRUD, reporting | IN PROGRESS | Required for trustworthy record history |
| RD-005 | Canonical project context resolution | Project-scoped modules | IN PROGRESS | Avoids inconsistent project scoping |
| RD-006 | Traceability model | Requirements, planning, testing, change | NOT STARTED | Must become a common relationship model |

---

## 8. Strategic Technical Debt

Only roadmap-level debt belongs here. File-level/code-level debt should be captured in the relevant feature plan or issue/RFC.

| ID | Area | Strategic Debt | Impact | Status |
|---|---|---|---|---|
| RTD-001 | Architecture | Historical patterns from earlier architecture phases may still coexist with active Module Federation patterns | Navigation, duplication, maintenance | IN PROGRESS |
| RTD-002 | Shared behaviour | Some equivalent behaviour may still be separately implemented across applications | Consistency and regression risk | IN PROGRESS |
| RTD-003 | Data model | Large PMIS domain surface increases risk of overlapping tables/semantics | Reporting and maintainability | IN PROGRESS |
| RTD-004 | Traceability | Cross-domain traceability is not yet a single mature system-wide capability | Assurance and reporting | NOT STARTED |
| RTD-005 | Testing | Automated regression coverage must scale with module growth | Release confidence | IN PROGRESS |

---

## 9. Strategic Risk Register

| ID | Risk | Potential Impact | Roadmap Response |
|---|---|---|---|
| RR-001 | Cross-tenant/security defect | Critical SaaS exposure | Treat security/access as highest priority |
| RR-002 | Feature growth faster than architecture consolidation | Increasing maintenance cost | Prefer reusable deep modules and shared capabilities |
| RR-003 | Platform/Simulator/Admin drift | Inconsistent user/system behaviour | Maintain intentional parity and document legitimate differences |
| RR-004 | Duplicate business logic in dashboards/exports/forms | Reconciliation defects | Centralise authoritative rules where practical |
| RR-005 | Weak traceability across PM lifecycle | Governance/assurance gaps | Deliver common traceability capability |
| RR-006 | Excessive UX complexity | Training/adoption burden | Keep workflows simple and discoverable |
| RR-007 | AI-assisted coding creates duplicate patterns | Technical debt/regressions | Repository inspection before creation; review gates |

---

## 10. Roadmap Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-08-18 | Established dedicated root-level roadmap separated from `CLAUDE.md` and feature plans | Reduce instruction duplication and make strategic state explicit |

---

## 11. How Claude/Cursor Should Use This File

Before a substantial task:

1. Read `CLAUDE.md`.
2. Use this roadmap to identify the affected strategic area and current priority.
3. Follow the PRD/plan workflow required by `CLAUDE.md`.
4. Do not treat roadmap bullets as implementation acceptance criteria unless the relevant PRD says so.
5. After delivery, update this file only if strategic status, dependency, risk, milestone, or roadmap priority materially changed.

---

## 12. Roadmap Principle

> **The roadmap defines direction and delivery state; it does not duplicate engineering instructions.**

Project Nidus should evolve toward a PMIS that is secure, governed, traceable, configurable, simple to use, and capable of supporting complex enterprise delivery without sacrificing maintainability.
