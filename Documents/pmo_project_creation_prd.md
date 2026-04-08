# Product Requirements Document (PRD)

## Module Name
PMO Project Creation & Authorisation Module

## Document Purpose
This PRD defines the **PMO-owned Project Creation process**, which serves as the **formal entry and authorisation point** into the project management platform. This module is **governance-first**, ensuring that no project enters execution without proper authority, justification, controls, and compliance metadata.

This PRD is intentionally **separate from Project Manager and Executive dashboards**, which will be implemented later.

---

## 1. Product Vision

To provide a **controlled, auditable, and standardised project intake process** that enables the PMO to:
- Authorise projects before execution
- Establish governance and accountability
- Configure lifecycle controls upfront
- Prevent unmanaged or unjustified projects

The output of this module is a **Governed Project Record**, ready for assignment to a Project Manager.

---

## 2. Target User

### Primary User
- PMO Officer / PMO Analyst / PMO Manager

### Excluded Users (Explicit)
- Project Managers
- Executives / Sponsors
- Team Members

---

## 3. PMO Responsibilities Supported

This module must support the PMO to:
1. Create and authorise projects
2. Assign governance authority
3. Capture business justification
4. Configure lifecycle and controls
5. Capture document compliance status
6. Classify risk and complexity
7. Prepare projects for PM assignment

---

## 4. Project Creation Flow (High Level)

### Step 1: Draft Project Intake
- Capture core project details
- No execution allowed

### Step 2: Governance & Control Configuration
- Assign authority
- Configure lifecycle
- Define tolerances

### Step 3: Authorisation Readiness
- Validate mandatory fields
- Capture document status

### Step 4: Project Authorised
- Project becomes eligible for PM assignment

---

## 5. Functional Requirements by Section

---

### 5.1 Project Identity (Mandatory)

| Field | Type | Required |
|----|----|----|
| Project Name | Text | Yes |
| Project Code | Text | Optional |
| Project Description | Long Text | Yes |
| Project Type | Enum (Client/Internal/Regulatory) | Yes |
| Portfolio Category | Enum (Run/Change/Transform) | Yes |
| Programme | Reference (optional) | No |

---

### 5.2 Governance & Authority (Mandatory)

| Field | Required | Notes |
|----|----|----|
| Project Executive / Sponsor | Yes | Must be assigned |
| Project Board Required | Yes | Yes / No |
| Initial Board Members | Conditional | Required if Board = Yes |
| Funding Authority | Yes | Cost owner |
| Approving Authority | Yes | Stage gate authority |

**Rules**:
- Project cannot be authorised without Executive
- Board members mandatory if board enabled

---

### 5.3 Business Justification (Mandatory)

| Field | Required |
|----|----|
| Business Objective / Problem Statement | Yes |
| Strategic Alignment | Yes |
| Expected Benefits (High Level) | Yes |
| Benefit Owner | Yes |

---

### 5.4 Lifecycle & Control Configuration (Mandatory)

| Field | Required |
|----|----|
| Delivery Methodology | Yes (PRINCE2 / Agile / Hybrid) |
| Lifecycle Template | Yes |
| Stage Model | Yes (Fixed / Flexible) |
| Stage Gate Enforcement | Yes (Required / Advisory) |
| Time Tolerance | Yes |
| Cost Tolerance | Yes |
| Scope Tolerance | Yes |

---

### 5.5 Document Governance Status (Mandatory Metadata)

| Document | Status Required |
|----|----|
| Project Mandate | Yes |
| Business Case | Yes |
| RFP (if applicable) | Conditional |
| Funding Approval | Yes |
| Document Repository Link | Yes |

**Note**: Document content is external; only metadata is captured.

---

### 5.6 Financial Controls (Mandatory)

| Field | Required |
|----|----|
| Budget Amount | Yes |
| Currency | Yes |
| Budget Type | Yes (CapEx / OpEx / Mixed) |
| Funding Source | Yes |
| Budget Approval Status | Yes |

---

### 5.7 Risk & Complexity Pre-Assessment (Mandatory)

| Field | Required |
|----|----|
| Initial Risk Rating | Yes (Low/Medium/High) |
| Complexity Rating | Yes |
| Delivery Complexity | Yes (Single/Multi Vendor) |
| Regulatory Impact | Yes (Yes/No) |
| Data Sensitivity | Yes (Public/Internal/Confidential) |

---

### 5.8 Resource & Capacity Indicators (Advisory)

| Field | Required |
|----|----|
| Estimated Effort | Yes (Small/Medium/Large) |
| Key Skills Required | Optional |
| External Vendors Required | Optional |

---

## 6. Validation & Authorisation Rules

A project can be marked **Authorised** only if:
- Executive is assigned
- Business justification completed
- Lifecycle & tolerances defined
- Mandatory document statuses captured
- Budget approval status provided
- Risk & complexity classified

---

## 7. PMO Actions

PMO can:
- Save Draft Project
- Validate Authorisation Readiness
- Authorise Project
- Suspend or Reject Project

All actions must be audit logged.

---

## 8. Out of Scope

- Task creation
- PM assignment workflows
- Document authoring
- Executive approvals UI

---

## 9. Non-Functional Requirements

- Role-restricted (PMO only)
- Audit-ready
- Fast form validation
- Clear error messaging

---

## 10. Success Metrics

- Zero unauthorised projects entering execution
- 100% projects with assigned Executive
- Early risk classification achieved
- Improved governance audit outcomes

---

**End of Document**

