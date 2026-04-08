# PRD: Independent Sidebar Menus for PMO and Project Manager Dashboards
(With Controlled PM Tailoring of PMO Standards)

## 1. Purpose
Design and implement **two independent dashboards**, each with its own **static sidebar menu**, aligned to **PMO and PRINCE2 best practices**.

The system must:
- Separate **governance ownership** from **delivery accountability**
- Support **PMO-initiated and PM-refined documents**
- Allow **PM tailoring/customisation** of governance artefacts per project
- Preserve **organisational baselines** for audit and reuse
- Prevent document duplication and uncontrolled edits

---

## 2. Dashboard Architecture

| Dashboard | Primary User | Primary Objective |
|---|---|---|
| PMO Dashboard | PMO Officer | Governance, standards, assurance, oversight |
| PM Dashboard | Project Manager | Project delivery, execution, and control |

**Architecture Rules**
- Sidebars are **static per dashboard**
- No dynamic role switching inside a dashboard
- Same document record may be referenced by both dashboards
- Visibility ≠ edit permission

---

## 3. Governance, Authorship & Tailoring Model

### 3.1 PMO-Authored Organisational Standards (Tailorable)
These documents represent **enterprise baselines**.

- Authored and maintained by PMO
- **Editable only by PMO at organisational level**
- **Readable by PM in original form**
- **PM may create a *project-specific tailored copy***  
- Original baseline remains immutable

#### Documents
- Project Mandate Template  
- Communication Management Strategy  
- Configuration Management Strategy  
- Quality Management Strategy  
- Risk Management Strategy  

**Tailoring Rules**
- Tailored versions:
  - Are linked to the PMO baseline
  - Are editable by PM
  - Apply only to the specific project
- PMO may review tailored versions for compliance

---

### 3.2 PMO-Initiated → PM-Refined → PMO-Controlled Documents
These documents start at portfolio/initiation level and mature during delivery.

- **Initial Version (v0) created by PMO**
- **Refined, aligned, and maintained by PM**
- **PMO retains approval and governance authority**
- Single document instance shared across dashboards

#### Documents
- Business Case  
- Project Brief  
- Benefits Review Plan  

---

### 3.3 PM-Authored Project Delivery Documents
These are **project-specific delivery artefacts**.

- Authored and maintained by PM
- Editable in PM Dashboard
- Read-only visibility in PMO Dashboard

#### Documents
- Project Initiation Document (PID)
- Plan Documentation
- Work Packages
- Product Description
- Project Product Description
- Product Status Account
- Daily Log
- Configuration Item Records
- Checkpoint Reports
- Highlight Reports
- Issue Reports
- Exception Reports
- End Stage Report
- End Project Report
- Lessons Report
- Risk Register
- Issue Register
- Quality Register
- Lessons Log

---

## 4. PMO Dashboard – Sidebar Menu

### 4.1 PMO Governance (Baselines)
