# Product Requirements Document (PRD)

## Module Name
PMO Document Governance & Compliance Module

## Document Purpose
This PRD defines the **Document Governance module** owned and controlled by the **Project Management Office (PMO)**. The module ensures that **mandatory and optional governance documents** are captured, tracked, approved, and enforced at each **project stage/phase**, without making the PMO responsible for authoring document content.

This document is designed for **vibe‑coding with React + Supabase** and integrates directly with:
- PMO Dashboard
- Stage / Phase Gate Controls
- Exception Management
- Audit & Compliance Reporting

---

## 1. Product Vision

To provide a **single source of truth for project governance documentation**, enabling the PMO to:
- Enforce stage gate compliance
- Ensure audit readiness
- Detect missing or overdue documents early
- Support programme and portfolio‑level governance

The system must focus on **document metadata, status, and compliance**, not document editing.

---

## 2. Ownership & Responsibility Model

| Activity | Responsibility |
|--------|---------------|
| Document authoring | Executive / Sponsor / Project Manager |
| Document approval | Project Board / Executive |
| Document metadata capture | PMO |
| Compliance enforcement | PMO |
| Audit & assurance | PMO |

---

## 3. Supported Project Stages / Phases

The module must support configurable stages. Default stages:

1. Pre‑Project / Concept
2. Initiation
3. Planning
4. Delivery / Execution
5. Stage Boundary (Recurring)
6. Closure
7. Post‑Project / Benefits Realisation

---

## 4. Document Types by Stage

### 4.1 Pre‑Project / Concept Stage

**Mandatory Documents**
- Request for Proposal (RFP)
- Project Mandate
- Business Case
- Funding / Investment Approval

**Optional Documents**
- Feasibility Study
- Market Assessment
- Options Analysis

---

### 4.2 Initiation Stage

**Mandatory Documents**
- Project Initiation Document (PID)
- Benefits Management Approach
- Risk Management Strategy
- Stakeholder Register

**Optional Documents**
- Communication Management Strategy
- Quality Management Strategy

---

### 4.3 Planning Stage

**Mandatory Documents**
- Stage Plan
- Integrated Project Plan
- Resource Plan
- Cost / Budget Plan

**Optional Documents**
- Procurement Plan
- Dependency Map

---

### 4.4 Delivery / Execution Stage

**Mandatory Documents**
- Highlight Reports (recurring)
- Risk Register
- Issue Register

**Optional Documents**
- Change Requests
- Quality Review Records
- Work Package Definitions

---

### 4.5 Stage Boundary (End of Each Stage)

**Mandatory Documents**
- End Stage Report
- Updated Business Case
- Updated Risk Register

**Optional Documents**
- Lessons Learned (interim)

---

### 4.6 Closure Stage

**Mandatory Documents**
- End Project Report
- Lessons Learned Report
- Product Acceptance Records
- Benefits Review Plan

**Optional Documents**
- Closure Approval Memo

---

### 4.7 Post‑Project / Benefits Realisation

**Mandatory Documents**
- Benefits Realisation Evidence
- Benefits Review Reports

**Optional Documents**
- Post‑Implementation Review

---

## 5. Functional Requirements

### 5.1 Document Register (PMO‑Owned)

For each project and programme, the system must maintain a **Document Register** with:
- Document Type
- Stage / Phase
- Mandatory Flag (Yes/No)
- Status (Not Started / Draft / Submitted / Approved / Rejected)
- Owner (User)
- Approver (User / Board)
- Approval Date
- Last Updated Date
- External Link (URL)
- Comments

PMO can:
- View all documents
- Flag non‑compliance
- Block stage gate progression
- Escalate missing or rejected documents

---

### 5.2 Stage Gate Enforcement

Rules:
- A stage gate **cannot be approved** if mandatory documents for that stage are:
  - Missing
  - Not approved
- Gate violations automatically raise a **compliance exception**

---

### 5.3 Programme‑Level Roll‑Up

The PMO must be able to view:
- Document compliance by programme
- Cross‑project missing documents
- Programme audit readiness

---

### 5.4 Audit & Compliance

All actions must be logged:
- Document status changes
- Approvals and rejections
- Stage gate blocks
- Escalations

---

## 6. Supabase Data Model (Proposed)

### 6.1 document_types
```sql
document_types (
  id uuid primary key,
  name text,
  stage text,
  is_mandatory boolean,
  description text,
  active boolean,
  created_at timestamp
)
```

---

### 6.2 project_documents
```sql
project_documents (
  id uuid primary key,
  project_id uuid references projects(id),
  document_type_id uuid references document_types(id),
  status text, -- draft, submitted, approved, rejected
  owner_user_id uuid references auth.users(id),
  approver_user_id uuid references auth.users(id),
  approval_date timestamp,
  document_url text,
  comments text,
  created_at timestamp,
  updated_at timestamp
)
```

---

### 6.3 programme_documents (optional extension)
```sql
programme_documents (
  id uuid primary key,
  programme_id uuid references programmes(id),
  document_type_id uuid references document_types(id),
  status text,
  owner_user_id uuid,
  approver_user_id uuid,
  approval_date timestamp,
  document_url text,
  created_at timestamp
)
```

---

### 6.4 stage_gate_checks
```sql
stage_gate_checks (
  id uuid primary key,
  project_id uuid,
  stage text,
  gate_status text, -- pending, blocked, approved
  blocked_reason text,
  checked_at timestamp
)
```

---

### 6.5 audit_log (shared PMO table)
```sql
audit_log (
  id uuid primary key,
  actor_user_id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  payload jsonb,
  created_at timestamp
)
```

---

## 7. Security & RLS Principles

- Only PMO role can:
  - Override compliance
  - Block or unblock stage gates
- PMs can submit document links
- Executives can approve documents
- RLS enforced for all document tables

---

## 8. Non‑Functional Requirements

- Metadata‑only (no file storage mandatory)
- External document repository friendly
- Fast compliance queries (<2s)
- Audit‑ready

---

## 9. Success Metrics

- 100% mandatory documents tracked
- Zero stage approvals without compliance
- Reduced audit findings
- Clear PMO visibility across portfolio

---

## 10. Out of Scope

- Document content editing
- Version control of document files
- Real‑time collaboration

---

**End of Document**

