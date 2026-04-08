
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

## 2. Dashboard Architecture

| Dashboard | Primary User | Primary Objective |
|---|---|---|
| PMO Dashboard | PMO Officer | Governance, standards, assurance, oversight |
| PM Dashboard | Project Manager | Project delivery, execution, and control |

**Architecture Rules**
- Sidebars are static per dashboard
- No dynamic role switching inside a dashboard
- Same document record may be referenced by both dashboards
- Visibility ≠ edit permission

## 3. Governance, Authorship & Tailoring Model

### 3.1 PMO-Authored Organisational Standards (Tailorable)
- Authored and maintained by PMO
- Editable only by PMO at organisational level
- PMs may create project-tailored copies
- Baselines remain immutable

Documents:
- Project Mandate Template
- Communication Management Strategy
- Configuration Management Strategy
- Quality Management Strategy
- Risk Management Strategy

### 3.2 PMO-Initiated → PM-Refined → PMO-Controlled Documents
- Business Case
- Project Brief
- Benefits Review Plan

### 3.3 PM-Authored Project Delivery Documents
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

## 4. PMO Dashboard – Sidebar Menu
PMO Governance, Initiation & Business Justification, Project Oversight, Reporting & Assurance


## 5. Project Manager Dashboard – Sidebar Menu
Governance Reference, Initiation & Business Justification, Delivery Management, Controls & Registers, Reporting, Closure

## 6. Tailoring & Versioning Rules
- PM cannot modify PMO baselines directly
- PM can clone and tailor per project
- Tailored versions store baseline reference and justification

## 7. Permissions Model
Strict backend enforcement using Supabase RLS.

## 8. Data Model
Includes baseline, tailoring, lifecycle, permissions, sidebar mapping.

## 9. Acceptance Criteria
- PM can tailor PMO standards
- PMO baselines remain immutable
- Clear read-only vs editable states

END OF PRD
