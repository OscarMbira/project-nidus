# Product Requirements Document (PRD)

## Product Name
PMO Dashboard – Project & Programme Governance Platform

## Document Purpose
This PRD defines the **PMO Dashboard** as the **entry point and governance layer** of the project management platform. The PMO Dashboard is **strictly separated** from Executive and Project Manager dashboards, which will be developed later.

This document is designed for **vibe‑coding / AI‑assisted development**, providing clear scope, features, rules, and acceptance criteria.

---

## 1. Product Vision

To provide a **centralised Project Management Office (PMO) control platform** that enables governance, prioritisation, assurance, and oversight of projects and programmes across the organisation.

The PMO Dashboard exists to:
- Govern projects and programmes
- Assign authority and accountability
- Enforce standards, capacity rules, and stage controls
- Monitor delivery health and intervene early

---

## 2. Target User

### Primary User
**PMO Representative / PMO Analyst / PMO Manager**

### Explicitly Excluded Users (Future Dashboards)
- Project Executives
- Project Sponsors
- Project Managers
- Team Members

> NOTE: These users will have **separate dashboards** and **must not see PMO‑only controls**.

---

## 3. PMO Responsibilities Supported

The PMO Dashboard must support the following responsibilities:

1. Create and govern projects
2. Assign project authority (Executive, PM, Board)
3. Create and manage programmes
4. Assign projects to programmes
5. Enforce PM capacity limits
6. Monitor delivery health across portfolio
7. Identify risks, exceptions, and breaches
8. Escalate issues to governance bodies
9. Track benefits and strategic alignment
10. Maintain audit‑ready governance data

---

## 4. In-Scope Features (PMO Only)

### 4.1 PMO Dashboard Home (Entry Point)

#### Executive Summary Cards
- Total Projects
- Active / Completed / On Hold / Planned
- Total Programmes
- Total Project Managers

Each card must:
- Be clickable
- Drill into filtered views

---

### 4.2 PMO Control Strip (Mandatory)

A high‑visibility control strip at the top of the dashboard displaying:

- Projects Requiring Attention (RAG ≠ Green)
- Projects in Exception
- Overdue Stage / Phase Gates
- PM Capacity Breaches
- Orphan Projects (no programme / no board)

Purpose:
> Immediate PMO intervention signals

---

### 4.3 Project Creation & Governance

PMO can:
- Create new projects
- Define project metadata
- Assign:
  - Executive
  - Project Manager
  - Project Board members
- Define project type (Standalone / Programme)
- Define lifecycle framework (e.g. PRINCE2)

Rules:
- Project **cannot start** without assigned Executive and PM
- Project Board membership is mandatory for governance projects

---

### 4.4 Programme Management

PMO can:
- Create programmes
- Assign programme owner
- Assign projects to programmes
- View aggregated programme health

Programme dashboard must show:
- Programme RAG status
- Number of projects
- Cross‑project dependencies
- Benefits roll‑up
- Budget roll‑up

---

### 4.5 Project Manager Capacity Control

System must enforce:
- A Project Manager can manage **maximum 2 active projects**

Dashboard must display:
- PM name
- Active project count
- Capacity status (OK / Breach)
- Risk load indicator

PMO actions:
- Reassign PM
- Suspend project

---

### 4.6 Stage / Phase Gate Oversight

PMO must see across all projects:
- Current stage
- Next stage gate date
- Approval status
- Gate owner
- Overdue gates

PMO can:
- Flag overdue gates
- Escalate to Project Board

---

### 4.7 Risk & Exception Monitoring

#### Risk Heat Map
- Aggregated risk exposure
- Top risks by impact × probability
- Risk owner
- Days open

#### Exception Management
- Projects flagged as exception
- Reason for exception
- Escalation level

PMO actions:
- Escalate to Board
- Suspend project

---

### 4.8 Benefits Realisation Tracking

PMO must track:
- Planned benefits
- Forecast benefits
- Realised benefits
- Benefits at risk

Benefits must roll up:
- Project → Programme → Portfolio

---

### 4.9 KPIs & Portfolio Health

Mandatory KPIs:
- Project Health (RAG)
- On‑Time Delivery
- Budget Variance
- Resource Utilisation
- Governance Compliance

KPIs must show:
- Current value
- Trend (Improving / Stable / Deteriorating)

---

### 4.10 PMO‑Only Quick Actions

Quick Actions must include:
- Create Project
- Create Programme
- Assign Executive / PM
- Raise Exception
- Suspend Project
- Reassign PM
- Approve / Reject Stage Gate

These actions must NOT appear on PM or Executive dashboards.

---

## 5. Navigation Structure (PMO)

Left‑hand navigation must include:

- Dashboard
- Projects
- Programmes
- Governance
- Portfolio
- Dependencies
- Benefits
- Strategy
- Quality
- Stakeholders
- PMO Admin

Navigation must reflect **governance-first hierarchy**.

---

## 6. Permissions & Security

- PMO users have full governance access
- PMO actions are logged (audit trail)
- Role separation is enforced system‑wide

---

## 7. Non‑Functional Requirements

- Enterprise‑grade UI
- Dark theme support
- Responsive layout
- Fast dashboard load (<2s)
- Click‑to‑drill analytics

---

## 8. Out of Scope (Explicit)

- Task execution
- Work package management
- Daily PM reporting
- Team assignments
- Executive approvals (future dashboard)

---

## 9. Success Metrics

- PM capacity breaches detected early
- Reduction in late stage gates
- Clear audit trail for governance
- PMO intervention before project failure

---

## 10. Future Extensions (Not in Scope)

- Executive Dashboard
- Project Manager Dashboard
- Team Member Workspace
- AI‑driven risk prediction

---

## 11. Acceptance Criteria (High Level)

- PMO can create and govern projects end‑to‑end
- PM capacity limits enforced
- Programme roll‑ups visible
- Risks and exceptions clearly flagged
- No PMO controls visible to non‑PMO users

---

**End of Document**

