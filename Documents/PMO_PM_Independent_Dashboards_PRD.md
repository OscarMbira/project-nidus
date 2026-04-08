
# PRD: Independent Sidebar Menus for PMO and Project Manager Dashboards
## Including PMO Initiation, PM Refinement, and Controlled Tailoring (PRINCE2-Aligned)

---

## 1. Purpose

This Product Requirements Document (PRD) defines the requirements for implementing **two independent dashboards** in a Project Management System:

- **PMO Dashboard**
- **Project Manager (PM) Dashboard**

Each dashboard must have its **own static sidebar menu**, aligned to **enterprise PMO governance** and **PRINCE2 best practices**, while supporting **controlled tailoring of documents at project level**.

The solution must:
- Separate **governance ownership** from **delivery accountability**
- Support **PMO-initiated and PM-refined document lifecycles**
- Allow **PM tailoring/customisation** of PMO standards per project
- Preserve **organisational baselines** for audit and reuse
- Prevent document duplication and uncontrolled edits

---

## 2. Dashboard Architecture

| Dashboard | Primary User | Primary Objective |
|---|---|---|
| PMO Dashboard | PMO Officer | Governance, standards, assurance, oversight |
| PM Dashboard | Project Manager | Project delivery, execution, and control |

### Architecture Rules
- Each dashboard has its **own routing namespace**
- Each dashboard has its **own sidebar component**
- Sidebar menus are **static** (not role-dynamic)
- The **same document record** may appear in both dashboards
- **Visibility does not imply edit permission**

---

## 3. Governance, Authorship & Tailoring Model

### 3.1 PMO-Authored Organisational Standards (Tailorable)

These documents represent **enterprise-level baselines**.

**Rules**
- Authored and maintained by PMO
- Editable **only** by PMO at organisational level
- Visible as **read-only** in the PM Dashboard
- PM may create **project-specific tailored copies**
- Original baseline must never be modified

**Documents**
- Project Mandate Template  
- Communication Management Strategy  
- Configuration Management Strategy  
- Quality Management Strategy  
- Risk Management Strategy  

**Tailoring Controls**
- Tailored versions:
  - Reference the baseline document
  - Apply to a single project
  - Are editable by PM
  - Are reviewable by PMO
  - Retain audit traceability

---

### 3.2 PMO-Initiated → PM-Refined → PMO-Controlled Documents

These documents originate during **portfolio / initiation** and mature during delivery.

**Rules**
- PMO creates **Version 0 (Outline)**
- PM refines and maintains content
- PMO retains approval and governance authority
- Single document instance shared across dashboards

**Documents**
- Business Case  
- Project Brief  
- Benefits Review Plan  

---

### 3.3 PM-Authored Project Delivery Documents

These documents support **day-to-day project execution**.

**Rules**
- Authored and maintained by PM
- Editable in PM Dashboard
- Read-only visibility in PMO Dashboard

**Documents**
- Project Initiation Document (PID)
- Plan Documentation
- Work Packages
- Product Description
- Project Product Description
- Product Status Account
- Daily Log
- Configuration Item Records
- Risk Register
- Issue Register
- Quality Register
- Lessons Log
- Checkpoint Reports
- Highlight Reports
- Issue Reports
- Exception Reports
- End Stage Report
- End Project Report
- Lessons Report

---

## 4. PMO Dashboard – Sidebar Menu

### 4.1 PMO Governance (Baselines)

```
PMO Governance
├─ Project Mandate Template
├─ Communication Management Strategy
├─ Configuration Management Strategy
├─ Quality Management Strategy
└─ Risk Management Strategy
```

---

### 4.2 Initiation & Business Justification

```
Initiation & Business Justification
├─ Business Case
├─ Project Brief
└─ Benefits Review Plan
```

**Capabilities**
- Create Version 0
- Review PM refinements
- Approve or reject updates

---

### 4.3 Project Oversight (Read-Only)

```
Project Oversight
├─ Risk Register
├─ Issue Register
├─ Quality Register
└─ Lessons Log
```

---

### 4.4 Reporting & Assurance

```
Reporting & Assurance
├─ Highlight Reports
├─ Exception Reports
├─ End Stage Reports
└─ End Project Reports
```

---

## 5. Project Manager Dashboard – Sidebar Menu

### 5.1 Governance Reference & Tailoring

```
Governance Reference
├─ Project Mandate Template
├─ Communication Management Strategy
├─ Configuration Management Strategy
├─ Quality Management Strategy
└─ Risk Management Strategy
```

**Capabilities**
- View organisational baselines
- Clone and tailor per project
- Submit tailored versions for PMO review

---

### 5.2 Initiation & Business Justification

```
Initiation & Business Justification
├─ Business Case
├─ Project Brief
├─ Project Initiation Document (PID)
└─ Benefits Review Plan
```

---

### 5.3 Delivery Management

```
Delivery Management
├─ Work Packages
├─ Product Description
├─ Project Product Description
├─ Product Status Account
└─ Daily Log
```

---

### 5.4 Controls & Registers

```
Controls & Registers
├─ Risk Register
├─ Issue Register
├─ Quality Register
├─ Configuration Item Records
└─ Lessons Log
```

---

### 5.5 Reporting

```
Reporting
├─ Checkpoint Reports
├─ Highlight Reports
├─ Issue Reports
├─ Exception Reports
└─ End Stage Report
```

---

### 5.6 Closure

```
Project Closure
├─ Lessons Report
└─ End Project Report
```

---

## 6. Navigation & UI Behaviour

- Documents must open the **same record** across dashboards
- UI must clearly display state indicators:
  - Baseline
  - Tailored for Project
  - Read-Only
  - Editable
  - Under PMO Review
- PM cannot edit PMO baselines
- PMO cannot edit PM delivery artefacts

---

## 7. Permissions Model (Backend-Enforced)

| Document Category | PM | PMO |
|---|---|---|
| PMO baseline standards | Read / Tailor | Create / Edit |
| PMO-initiated documents | Refine | Create v0 / Approve |
| PM delivery documents | Create / Edit | Read |
| Registers | Create / Update | Read |
| Reports | Create | Read |
| Closure documents | Create | Validate |

All permissions must be enforced via **Supabase Row Level Security (RLS)**.

---

## 8. Data Model Requirements

```sql
document
- id
- project_id
- document_type
- initiated_by_role        -- PMO | PM
- primary_author_role      -- PMO | PM
- governance_owner         -- PMO | PM
- is_baseline              -- boolean
- baseline_document_id     -- nullable reference
- is_tailored              -- boolean
- lifecycle_stage          -- draft | refined | approved | archived
- pm_permission            -- read | write
- pmo_permission           -- read | approve | write
- created_at
- updated_at
```

```sql
sidebar_config
- dashboard_type           -- PMO | PM
- section_name
- document_type
- display_order
- route_path
```

---

## 9. Acceptance Criteria

- Two independent dashboards load correctly
- Sidebar menus match this PRD exactly
- PM can tailor PMO standards without overwriting baselines
- PMO can approve Business Case refinements
- Read-only rules enforced consistently
- No duplicate document records exist

---

## 10. Out of Scope

- Workflow automation
- Notifications
- Analytics dashboards
- Document templates
- Reporting visualisations

---

## 11. Success Metrics

- Faster project initiation
- Reduced governance violations
- Clear ownership and accountability
- Audit-ready document history
- Improved PMO–PM collaboration

---

END OF PRD
