# Project Nidus — Consolidated Role Menus (Proposal)

> **Status:** Draft for owner analysis. Nothing here is implemented, and there is no PRD yet.
>
> **Purpose:** Replace the separate "Core Project Management" and "Industry" blocks in the sidebar with **one menu per role**. Industry features sit inside the same sections as the core features, so users never need to know which pack a page came from.
>
> **Relationship to other documents:** `Core_PM_and_Industry_Menu_Taxonomy.md` stays the functional catalogue (what exists). This document is the **presentation layer** (where each page appears, for each role). Routes and pages do not change, only where they appear in the sidebar.
>
> **Revision 2 (owner feedback):** **Project Setup is kept as one section** (Section 2) so the first-time setup journey stays in one place. Delivery-time governance (Stage Gates, Meetings, Compliance) moved to Section 6. Benefits tracking moved to Section 8. The footer no longer holds Project Settings.
>
> **Revision 3 (owner feedback):** Added **composite projects**, meaning one project tagged with several industries (e.g. a Core Banking System replacement = Banking + IT). See §6.3a for the worked example, §8.1 for the rules, and decisions D15–D17.

---

## 0. How to read this document

| Marker | Meaning |
|---|---|
| ◆ | Industry slot. Filled only when the **current project's** industry provides it, and hidden otherwise. The real sidebar shows no marker. |
| `[FIN, ICT …]` | Industry packs that fill a slot |
| (T) | Team-scoped: the user sees and edits only their team's records |
| (V) | View only |
| (A) | Approve / decide |
| `tabs:` | Level 4: tabs or filters inside the page, not sidebar items (taxonomy §17) |

Sidebar depth rule: **Level 1 = section, Level 2 = page, Level 3 = (rare) sub-page**. Anything deeper becomes tabs.

---

## 1. Design principles

1. **One menu per role.** Users see one sidebar, with no "Core" block and no "Industry" block.
2. **Organised by the work, not by where the feature came from.** Every role uses the same 9 sections in the same order. Junior roles see fewer items, but never a different layout.
3. **Setup stays together.** Everything done once when a project starts (details, initiation documents, team, governance set-up, project settings) lives in **Project Setup**. Pages used throughout delivery live in the delivery sections.
4. **The project's industry decides what shows.** Industry items appear only when the project being worked on has that industry (`project_industries`), not for every industry the organisation picked. An organisation with 4 industries never gets a longer sidebar on a given project.
5. **Outside a project** (portfolio, PMO and organisation views), only core items show.
6. **One page, one home.** When an industry feature reuses a core capability (testing, quality, risks, procurement, benefits), it becomes a **tab or filter on the core page**, not a second menu item (taxonomy §16).
7. **Shared slots.** Industry features that mean the same thing across packs (Interfaces, Environments, Data & Migration, Operational Readiness, Cutover, Go-Live & Hypercare, Compliance, Health & Safety) share one menu item. Two industries on one project still give one entry.
8. **Composite projects get one menu.** A project with several industries shows core plus every tagged pack, merged: shared items appear once, and pack-only items are added in their sections. The project's **primary industry** leads naming and tab order, and the PM can switch off industry items the project does not need (§8.1).
9. **Size limits.** At most 9 sections and about 12 pages per section. Empty sections are hidden. Search and pinned favourites cover the long tail.
10. **Data, not code (rule 25.1).** Placements are stored in the database (a placement row per menu item and role layout), so the sidebar regroups items without hard-coded trees.

---

## 2. The shared section skeleton (all roles)

| # | Section | What lives here | Core taxonomy groups feeding it |
|---|---|---|---|
| 1 | **Home** | My dashboard, my work, approvals, messages, Ask Nidus | Dashboard, Communications (v1289), Ask Nidus (v1272), Governance → Approvals (my queue) |
| 2 | **Project Setup** | Everything set up once at the start: why the project exists, who is on it, how it is governed, how it is configured | Project Setup (details, initiation documents, team, governance setup, settings), Benefits Review Plan |
| 3 | **Scope & Requirements** | What will be delivered | Scope & Deliverables, Requirements |
| 4 | **Plan & Schedule** | When it will be delivered | Planning |
| 5 | **Deliver & Test** | Doing, building and proving the work | Tasks, Quality, Testing |
| 6 | **Risks, Changes & Governance** | What could go wrong or change, what was decided, and how the project is controlled during delivery | RAID, Change Control, Governance (Decisions, Actions, Stage Gates, Meetings, Approvals), Policies & Compliance, Lessons |
| 7 | **Stakeholders & Adoption** | Who is affected and how they are engaged, prepared and trained | Stakeholders, Communication plan (+ industry business change and training) |
| 8 | **Readiness, Benefits & Close** | Getting into operation, measuring benefits, closing down | Benefits, Project Closure (+ industry readiness, cutover, go-live) |
| 9 | **Money & Resources** | Cost, people capacity, time and suppliers | Cost Management, Resources, Timesheets, Procurement |
| — | Footer: **Reports · Documents** | Always at the bottom, less prominent | Reports, Documents |

---

## 3. Core PM placement map (taxonomy §3 → sections)

| Core taxonomy group | Section | Notes |
|---|---|---|
| Dashboard (all summaries) | 1 Home → My Dashboard | Summaries become dashboard tabs |
| Project Setup → Project Details | 2 Project Setup | |
| Mandate, Brief / Charter, Business Case, PID | 2 Project Setup | Charter is the same record as the Brief |
| Benefits Review Plan | 2 Project Setup | The plan is set up at initiation; measurement is in Section 8 |
| Project Team (Members, Roles & Skills, RACI, Team Structure, Contact Directory) | 2 Project Setup → Project Team | One page, tabs |
| Governance Setup (Structure, Project Board, Steering Committee, PMO Oversight, Escalation Path, Framework) | 2 Project Setup → Governance Setup | One page, tabs |
| Regional & Format, Working Days & Holidays, Timesheet Settings, Document Signatory, Environments, Custom Fields | 2 Project Setup → Project Settings | One page, tabs |
| Scope & Deliverables (Scope Statement, PBS, WBS, Deliverable Register) | 3 Scope & Requirements | |
| Requirements register (v1338, core table) | 3 Scope & Requirements → Requirements | Category filters as tabs |
| Planning (Schedule, Milestones, Dependencies, Baselines, Assumptions, Scenarios) | 4 Plan & Schedule | Calendar *settings* are in Project Settings |
| RAID → Dependencies | 4 Plan & Schedule → Dependencies | One home; the RAID Log shows them as a tab |
| Quality (plan, reviews, acceptance, non-conformance, configuration items) | 5 Deliver & Test → Quality | |
| Testing (planning, cases, execution, evidence) and Defects | 5 Deliver & Test → Testing / Defects | |
| RAID → Risks, Issues, Assumptions, Constraints | 6 Risks, Changes & Governance | |
| Change Control (requests, assessment, decisions, implementation) | 6 → Change Requests | Assessment / decisions / implementation as tabs |
| Governance → Decisions, Actions | 6 → Decisions, Actions | |
| Governance → Stage Gates, Meetings, Approvals history | 6 → Governance | One page, tabs (set-up of bodies stays in Project Setup) |
| Policies & Compliance (v1445) | 6 → Compliance | Industry regulatory items merge here as tabs |
| Lessons Log | 6 → Lessons | |
| Stakeholders (register, engagement), Communication Plan | 7 Stakeholders & Adoption | Comms Hub conversations stay in Home → Messages |
| Benefits (register, owners, measures, realisation, PIR) | 8 Readiness, Benefits & Close → Benefits & Results | |
| Project Closure | 8 Readiness, Benefits & Close | |
| Cost Management | 9 Money & Resources → Budget & Costs | |
| Resources, Timesheets | 9 Money & Resources | |
| Procurement | 9 Money & Resources → Procurement | |
| Reports | Footer → Reports | |
| Documents | Footer → Documents | |

---

## 4. Industry placement map (taxonomy §4–§14 → sections)

**Shared slots** (one menu item, filled by any pack that provides it):

| Shared slot | Section | Filled by |
|---|---|---|
| ◆ Delivery Overview | 2 Project Setup | Every pack's "… Programme / Overview" group (FIN Banking Transformation, CON Construction Management, ICT Technology Delivery, HLT Healthcare Projects, GOV Public Sector Programme, TEL Telecom Programme, ENR Energy / Utility Programme, MFG Manufacturing Programme, EDU Education Programme, NGO Development Programme, RET Retail Programme) |
| ◆ Environments (merge) | 2 → Project Settings → Environments | FIN Core Banking → Environments, ICT Environments |
| ◆ Design & Architecture | 3 | ICT Architecture + Design, CON Design & Engineering, TEL Network Planning, MFG Product Industrialisation, EDU Curriculum & Academic Programmes |
| ◆ Interfaces | 3 | FIN Core Banking → Interfaces, ICT Interfaces, HLT Clinical Systems → Interfaces, TEL OSS / BSS → Interfaces |
| ◆ Data & Migration | 5 | FIN Data Migration, ICT Data |
| ◆ Facilities & Equipment | 5 | HLT Facilities & Equipment, EDU Facilities, MFG Plant & Facility / Lines / Equipment & Tooling |
| ◆ Compliance tabs | 6 → Compliance | FIN Regulatory & Compliance, HLT Regulatory Compliance + Data Privacy + Accreditation, GOV Regulatory & Legal, TEL Regulatory, ENR Regulatory & Environmental, EDU Accreditation & Quality, NGO Compliance, CON Permits |
| ◆ Health, Safety & Environment | 6 | CON Health & Safety, ENR Health, Safety & Environment |
| ◆ Business Change | 7 | FIN Change Management (v1339) |
| ◆ Training | 7 | FIN Training (v1339) |
| ◆ Operational Readiness | 8 | FIN Operational Readiness, ICT Production Readiness, HLT Operational Readiness, ENR Operations Readiness, MFG Production Readiness, RET Retail Operations |
| ◆ Cutover | 8 | FIN Cutover, ENR Outages & Cutovers |
| ◆ Go-Live & Hypercare | 8 | FIN Go-Live + Hypercare, ICT Production Readiness → Go-Live / Hypercare, TEL Launch & Operations, RET Launch & Stabilisation |

**Merges into core pages** (tabs or filters, not new menu items):

| Industry item | Core page it joins |
|---|---|
| GOV Policy & Mandate | 2 → Mandate (tabs: Policy Objectives, Legal Mandate, Policy Alignment) |
| GOV Public Investment → Appraisal | 2 → Business Case (tab: Investment Appraisal) |
| ICT Requirements (v1338), HLT Clinical Requirements | 3 → Requirements |
| CON Progress Measurement → Delays | 4 → Delays (core) |
| FIN Testing & Assurance, ICT Testing, TEL Network Testing | 5 → Testing (filters: SIT, UAT, Regression, Performance, Security, DR, Network …) |
| ICT Defects | 5 → Defects |
| CON Inspections + Quality Control, HLT Quality & Clinical Governance, MFG Quality | 5 → Quality (tabs: Inspections, ITPs, NCRs, CAPA, Snag List …) |
| GOV Transparency & Accountability | 6 → Governance (tab: Audit) + Footer → Reports (Public Reporting) |
| GOV Citizen & Stakeholder Engagement | 7 → Stakeholders (tabs: Consultation, Feedback, Complaints) |
| GOV Benefits & Outcomes, EDU Education Outcomes, NGO Monitoring & Evaluation + Logical Framework | 8 → Benefits & Results (tabs: Results Framework, Logframe, Indicators, Outcomes) |
| GOV Procurement & Tendering, MFG Supply Chain, RET Supply Chain, CON Materials | 9 → Procurement (tabs: Tenders, Suppliers, Materials, Lead Times …) |
| GOV Budget & Appropriation, GOV Public Investment → Funding / Expenditure | 9 → Budget & Costs (tabs: Appropriation, Commitments) |
| CON Plant & Equipment | 9 → Resources (tab: Equipment) |

**Industry-only pages** (their own menu item, in the section shown):

| Industry | Section 3 Scope | Section 4 Plan | Section 5 Deliver & Test | Section 6 Risks, Changes & Governance | Section 7 Stakeholders & Adoption | Section 8 Readiness, Benefits & Close | Section 9 Money |
|---|---|---|---|---|---|---|---|
| **FIN** | Core Banking Configuration (Products, Parameters, Customisation) | — | Payments & Channels | — | (shared slots) | (shared slots) | — |
| **CON** | — | Progress Measurement | Sites | RFIs & Site Instructions | — | Handover & Commissioning | Contractors & Subcontractors, Commercial (BoQ, Valuations, Variations, Claims, Progress Certificates, Retention, Final Account) |
| **ICT** | — | — | Development, Releases & Deployments, Cybersecurity | Technical Debt | — | — | — |
| **HLT** | — | — | Clinical Systems | Patient Safety | Workforce Readiness | Clinical Readiness | — |
| **GOV** | — | — | — | — | Inter-Agency Coordination | Service Readiness & Delivery | — |
| **TEL** | — | — | Sites & Towers, Network Build (RAN, Core, Transmission), OSS / BSS | — | — | Service Readiness | — |
| **ENR** | — | — | Network & Asset Build (Generation, Transmission, Distribution, Utility Assets), Metering, Grid Integration | — | — | — | — |
| **MFG** | — | — | Process Validation | Continuous Improvement | — | Ramp-Up & Stabilisation | — |
| **EDU** | — | — | Teaching & Learning (incl. Digital Learning), Student Services, Research | — | — | — | — |
| **NGO** | — | — | Field Operations | Safeguarding | Beneficiaries | Impact & Learning | Donors & Grants, Partners |
| **RET** | — | — | Stores (Development, Portfolio), Merchandising, Point of Sale & E-Commerce | Loss Prevention | Customer Experience | — | — |
| **GEN** | Core only. GEN projects show no ◆ slots. | | | | | | |

---

## 5. Role catalogue

| Role (system role names) | Current layout | Menu in this document |
|---|---|---|
| Project Manager (`project_manager`, `pm_project_manager`) | pm | §6.1 – §6.3a |
| Programme Manager (`programme_manager`) | pm | §6.4 |
| Portfolio Manager (`portfolio_manager`) | pm | §6.5 |
| Team Manager (`team_manager`), Team Lead (`team_lead`) | pm / tm | §6.6 (one team-scoped menu; see decision D7) |
| Team Member (`team_member`) | tm | §6.7 |
| PMO Admin, Account Owner, Org Admin (`pmo_admin`, `account_owner`, `org_admin`) | pmo | §6.8 |
| Executive, Sponsor, Board Member, Project Assurance, Quality Assurance, Change Authority, Stakeholder, Viewer | pm + profile | §6.9 |

---

## 6. Role menus

### 6.1 Project Manager — any industry (template with slots)

```text
PROJECT MANAGER
│
├── 1. Home
│   ├── My Dashboard            tabs: Health · Executive Summary · Milestones · Schedule · Cost · RAID ·
│   │                                 Changes · Quality · Testing · Resources · Upcoming Actions
│   ├── My Work                 tabs: Tasks · Actions · Reviews assigned to me
│   ├── My Approvals            tabs: Pending · History
│   ├── Messages                tabs: Comms Hub · Channels · Direct · Meeting Summaries · Pending AI Reviews
│   └── Ask Nidus
│
├── 2. Project Setup
│   ├── Project Details
│   ├── ◆ Delivery Overview     [every industry pack's overview group]
│   ├── Mandate                 (◆ Policy & Mandate tabs [GOV])
│   ├── Brief / Charter
│   ├── Business Case           (◆ Investment Appraisal tab [GOV])
│   ├── PID
│   ├── Benefits Review Plan
│   ├── Project Team            tabs: Members · Roles & Skills · RACI · Team Structure · Contact Directory
│   ├── Governance Setup        tabs: Structure · Project Board · Steering Committee · PMO Oversight ·
│   │                                 Escalation Path · Framework
│   └── Project Settings        tabs: Regional & Format · Working Days & Holidays · Timesheet Settings ·
│                                     Document Signatory · Environments (◆ FIN / ICT) · Custom Fields
│
├── 3. Scope & Requirements
│   ├── Scope Statement
│   ├── Requirements            tabs: All · Business · Functional · Non-Functional · Use Cases ·
│   │                                 Traceability · Specification · Requirement Changes
│   ├── Products & Deliverables tabs: Product Breakdown · Product Descriptions · Deliverable Register ·
│   │                                 Acceptance Criteria
│   ├── WBS & Work Packages     tabs: WBS · Work Packages · Control Accounts · WBS Dictionary
│   ├── ◆ Design & Architecture [ICT, CON, TEL, MFG, EDU]
│   ├── ◆ Interfaces            [FIN, ICT, HLT, TEL]
│   └── ◆ <industry-only scope page>   e.g. FIN Core Banking Configuration
│
├── 4. Plan & Schedule
│   ├── Schedule                tabs: Plan Sheet · Activity Register · Board · Network · Critical Path ·
│   │                                 Look-Ahead · Variance · Workload
│   ├── Milestones
│   ├── Dependencies            tabs: Register · Parties · Incoming · Outgoing · Escalated
│   ├── Baselines
│   ├── Delays
│   ├── Scenario Planning
│   ├── Planning Assumptions
│   └── ◆ Progress Measurement  [CON]
│
├── 5. Deliver & Test
│   ├── Tasks & Board
│   ├── ◆ <industry delivery pages>    see §4 (e.g. Data & Migration, Sites, Development, Clinical Systems)
│   ├── Quality                 tabs: Quality Plan · Reviews · Acceptance · Non-Conformance ·
│   │                                 Configuration Items · ◆ Inspections · ITPs · NCRs · CAPA
│   ├── Testing                 tabs: Planning · Cases · Execution · Evidence · ◆ SIT · UAT · Regression ·
│   │                                 Performance · Security · DR
│   └── Defects
│
├── 6. Risks, Changes & Governance
│   ├── RAID Log                (single view of all RAID items)
│   ├── Risks
│   ├── Issues
│   ├── Assumptions & Constraints
│   ├── Change Requests         tabs: Requests · Assessment · Decisions · Implementation
│   ├── Decisions
│   ├── Actions
│   ├── Governance              tabs: Stage Gates · Meetings · Approvals History · ◆ Audit [GOV]
│   ├── Compliance              tabs: Policies & Compliance · ◆ Regulatory Requirements · Evidence · Sign-Off
│   │                                 [FIN, HLT, GOV, TEL, ENR, EDU, NGO, CON permits]
│   ├── Lessons
│   └── ◆ <industry risk pages> e.g. Health, Safety & Environment, Patient Safety, Technical Debt
│
├── 7. Stakeholders & Adoption
│   ├── Stakeholders            tabs: Register · Engagement · ◆ Consultation · Complaints [GOV]
│   ├── Communication Plan
│   ├── ◆ Business Change       [FIN]
│   ├── ◆ Training              [FIN]
│   └── ◆ <industry people pages>   e.g. Workforce Readiness, Beneficiaries, Customer Experience
│
├── 8. Readiness, Benefits & Close
│   ├── ◆ Operational Readiness [FIN, ICT, HLT, ENR, MFG, RET]
│   ├── ◆ Cutover               [FIN, ENR]
│   ├── ◆ Go-Live & Hypercare   [FIN, ICT, TEL, RET]
│   ├── ◆ <industry readiness pages>  e.g. Handover & Commissioning, Clinical Readiness, Ramp-Up
│   ├── Benefits & Results      tabs: Register · Owners · Measures · Realisation · PIR ·
│   │                                 ◆ Results Framework · Logframe · Outcomes [GOV, EDU, NGO]
│   └── Project Closure         tabs: Checklist · Final Acceptance · Outstanding Items · Handover ·
│                                     Lessons · Benefits Transition · Archive · Closure Report
│
├── 9. Money & Resources
│   ├── Budget & Costs          tabs: Budget · Actuals · Forecast · Cost Performance · ◆ Appropriation [GOV]
│   ├── Resources               tabs: Resource Plan · Assignments · Capacity · ◆ Equipment [CON]
│   ├── Timesheets              tabs: Time Entry & Work Plan · Approvals · Exceptions · Utilisation
│   ├── Procurement             tabs: Plan · Vendors · Contracts · Purchase Requests · Vendor Performance ·
│   │                                 Closure · ◆ Tenders · Suppliers · Materials
│   └── ◆ <industry money pages>  e.g. Commercial, Contractors & Subcontractors, Donors & Grants
│
└── Footer
    ├── Reports                 tabs: Status · Executive · Schedule · Cost · RAID · Change · Resource ·
    │                                 Quality · Testing · Work Plan Variance · Custom · Report Builder
    └── Documents               tabs: Register · Templates · Version History · Reviews
```

**Project Setup compared with today's sidebar:**

| Today (Project Setup) | Proposal (2. Project Setup) |
|---|---|
| Project Details | Project Details |
| Project Mandate | Mandate |
| Project Brief, Project Charter | Brief / Charter (one item; label follows the methodology) |
| Business Case | Business Case |
| Project Initiation Documents (PIDs) | PID |
| Benefits Review Plans | Benefits Review Plan |
| Project Team (sub-menu) | Project Team (tabs) |
| Governance Setup (sub-menu) | Governance Setup (tabs) |
| Regional & Format Settings, Working Days & Holidays, Timesheet Settings, Document Signatory | Project Settings (tabs) |
| — | ◆ Delivery Overview (only for industry projects) |

Thirteen items plus two sub-menus today become 10 items with no sub-menus.

### 6.2 Project Manager — worked example: Banking project (FIN)

*Core banking replacement. Project industry: Banking & Financial Services.*

```text
PROJECT MANAGER — Core Banking Replacement
│
├── 1. Home
│   ├── My Dashboard
│   ├── My Work
│   ├── My Approvals
│   ├── Messages
│   └── Ask Nidus
│
├── 2. Project Setup
│   ├── Project Details
│   ├── Transformation Overview      ◆ tabs: Roadmap · Business Units · Workstreams ·
│   │                                       Regulatory Milestones · Transformation Readiness
│   ├── Mandate
│   ├── Brief / Charter
│   ├── Business Case
│   ├── PID
│   ├── Benefits Review Plan
│   ├── Project Team
│   ├── Governance Setup
│   └── Project Settings             (core + ◆ Environments: SIT · UAT · Pre-Prod · Production · DR)
│
├── 3. Scope & Requirements
│   ├── Scope Statement
│   ├── Requirements
│   ├── Products & Deliverables
│   ├── WBS & Work Packages
│   ├── Core Banking Configuration   ◆ tabs: Products (Deposits · Lending · Payments · Customer · Fees) ·
│   │                                       Parameters · Customisation
│   └── Interfaces                   ◆ tabs: Register · Upstream · Downstream · Files · APIs · Testing
│
├── 4. Plan & Schedule
│   ├── Schedule
│   ├── Milestones
│   ├── Dependencies
│   ├── Baselines
│   ├── Delays
│   ├── Scenario Planning
│   └── Planning Assumptions
│
├── 5. Deliver & Test
│   ├── Tasks & Board
│   ├── Data & Migration             ◆ tabs: Strategy · Scope · Sources · Mapping · Cleansing ·
│   │                                       Transformation · Rules · Mock Runs · Runbook ·
│   │                                       Reconciliations · Migration Defects · Sign-Off
│   ├── Payments & Channels          ◆ tabs: Payments · Digital Channels · Cards · ATMs · Agency ·
│   │                                       Channel Readiness
│   ├── Quality
│   ├── Testing                      (core + ◆ SIT · UAT · Regression · Performance · Security · DR ·
│   │                                 Operational Readiness Testing)
│   └── Defects
│
├── 6. Risks, Changes & Governance
│   ├── RAID Log
│   ├── Risks
│   ├── Issues
│   ├── Assumptions & Constraints
│   ├── Change Requests
│   ├── Decisions
│   ├── Actions
│   ├── Governance                   (Stage Gates · Meetings · Approvals History)
│   ├── Compliance                   tabs: Policies & Compliance · ◆ Regulatory Requirements ·
│   │                                      Central Bank · AML / CFT · KYC · Sanctions · Data Privacy ·
│   │                                      Audit Requirements · Evidence · Regulatory Sign-Off
│   └── Lessons
│
├── 7. Stakeholders & Adoption
│   ├── Stakeholders
│   ├── Communication Plan
│   ├── Business Change              ◆ tabs: Strategy · Impact · Readiness · Change Network ·
│   │                                       Communications & Engagement · Resistance · Adoption · Sign-Off
│   └── Training                     ◆ tabs: Strategy · Needs Analysis · Curriculum · Materials ·
│                                           Trainers · Sessions · Attendance · Environment ·
│                                           Effectiveness · Sign-Off
│
├── 8. Readiness, Benefits & Close
│   ├── Operational Readiness        ◆ tabs: SOPs · Process · Branch · Contact Centre · Support Model ·
│   │                                       Monitoring · Incident Management · Sign-Off
│   ├── Cutover                      ◆ tabs: Strategy · Plan · Activities · Dependencies ·
│   │                                       Command Centre · Go / No-Go · Rollback · Business &
│   │                                       Technology Readiness · Sign-Off
│   ├── Go-Live & Hypercare          ◆ tabs: Deployment · Opening Balances · Day-1 Validation ·
│   │                                       Verification · Go-Live Decision · Hypercare Plan ·
│   │                                       Incidents · Stabilisation · Exit Criteria
│   ├── Benefits & Results
│   └── Project Closure
│
├── 9. Money & Resources
│   ├── Budget & Costs
│   ├── Resources
│   ├── Timesheets
│   └── Procurement
│
└── Footer: Reports · Documents
```

Count: 9 sections and 57 pages, of which 10 come from the Banking pack. Banking Testing, Environments and Regulatory are merged as tabs, not counted as pages. Today the same project shows the full Core PM tree plus a separate 12-group Banking tree.

### 6.3 Project Manager — worked example: two industries in one organisation

*Organisation "Northbridge Group" selected **Banking (FIN)** and **Construction (CON)**.*

| Where the PM is | What the sidebar shows |
|---|---|
| Project A — Core Banking Replacement (industry FIN) | §6.2 exactly. No construction items. |
| Project B — New Head Office Building (industry CON) | The tree below. No banking items. |
| No project selected (portfolio / organisation pages) | Core items only (Home, Reports, cross-project views) |
| A project tagged with two industries (e.g. FIN + ICT Core Banking System replacement) | A composite project: one merged menu. See §6.3a. |

```text
PROJECT MANAGER — New Head Office Building (CON)
│
├── 1. Home                          (same as §6.1)
│
├── 2. Project Setup
│   ├── Project Details
│   ├── Construction Overview        ◆ tabs: Project Sites · Construction Packages · Workfronts ·
│   │                                       Construction Milestones
│   ├── Mandate · Brief / Charter · Business Case · PID · Benefits Review Plan
│   ├── Project Team
│   ├── Governance Setup
│   └── Project Settings
│
├── 3. Scope & Requirements
│   ├── Scope Statement · Requirements · Products & Deliverables · WBS & Work Packages
│   └── Design & Engineering         ◆ tabs: Design Packages · Drawings · Specifications · Reviews ·
│                                           Design Changes · Technical Queries · Approved for Construction
│
├── 4. Plan & Schedule
│   ├── Schedule · Milestones · Dependencies · Baselines · Delays · Scenario Planning · Assumptions
│   └── Progress Measurement         ◆ tabs: Planned · Actual · Quantities · Earned · Productivity ·
│                                           Recovery Plans
│
├── 5. Deliver & Test
│   ├── Tasks & Board
│   ├── Sites                        ◆ tabs: Register · Setup · Access · Logistics · Facilities ·
│   │                                       Site Diary · Daily Progress · Closeout
│   ├── Quality                      (core + ◆ Inspections · Witness / Hold Points · ITPs · Test
│   │                                 Certificates · NCRs · Snag / Punch List)
│   ├── Testing
│   └── Defects
│
├── 6. Risks, Changes & Governance
│   ├── RAID Log · Risks · Issues · Assumptions & Constraints · Change Requests · Decisions ·
│   │   Actions · Governance · Lessons
│   ├── Compliance                   tabs: Policies & Compliance · ◆ Permits (Planning · Environmental ·
│   │                                      Work · Expiry Tracking · Permit Compliance)
│   ├── RFIs & Site Instructions     ◆ tabs: RFIs · Responses · Overdue · Site Instructions ·
│   │                                       Contractor Response · Cost / Schedule Impact
│   └── Health, Safety & Environment ◆ tabs: HSE Plan · Risk Assessments · Method Statements ·
│                                           Toolbox Talks · Inspections · Incidents · Near Misses ·
│                                           Corrective Actions · Statistics
│
├── 7. Stakeholders & Adoption       (core only)
│
├── 8. Readiness, Benefits & Close
│   ├── Handover & Commissioning     ◆ tabs: Commissioning Plan · Pre-Commissioning · Testing &
│   │                                       Commissioning · Snag Closure · As-Built · O&M Manuals ·
│   │                                       Training · Certificates · Defects Liability
│   ├── Benefits & Results
│   └── Project Closure
│
├── 9. Money & Resources
│   ├── Budget & Costs
│   ├── Resources                    (core + ◆ Equipment tab)
│   ├── Timesheets
│   ├── Procurement                  (core + ◆ Materials tab)
│   ├── Contractors & Subcontractors ◆ tabs: Register · Prequalification · Appointments · Scope ·
│   │                                       Mobilisation · Performance · Claims · Closeout
│   └── Commercial                   ◆ tabs: Bills of Quantities · Valuations · Variations · Claims ·
│                                           Progress Certificates · Retention · Final Account
│
└── Footer: Reports · Documents
```

Section 6 holds 12 pages here (9 core + Compliance + 2 Construction), which is at the limit. If a project had two industries both adding risk pages, the industry pages would move under one "◆ Industry Risks" page with tabs (decision D14).

### 6.3a Project Manager — worked example: composite project (Banking + IT)

*Core Banking System (CBS) replacement. The project is tagged with two industries in `project_industries`: **Banking & Financial Services (FIN) — primary** and **Information Technology (ICT) — secondary**.*

**How the two packs combine:**

| What happens | Banking (FIN) | IT (ICT) | Result in the menu |
|---|---|---|---|
| **Merged: one item, tabs from both** | Banking Transformation | Technology Delivery | One **Delivery Overview**: FIN tabs first (primary), then ICT tabs |
| | Core Banking → Environments | Environments | One **Environments** tab in Project Settings |
| | Core Banking → Interfaces | Interfaces | One **Interfaces** page |
| | Data Migration | Data | One **Data & Migration** page |
| | Testing & Assurance | Testing | One **Testing** page (filters: Unit, Integration, SIT, UAT, Regression, Performance, Security, DR, Operational Readiness) |
| | — | Defects | Core **Defects** page |
| | Operational Readiness | Production Readiness → Operational Readiness, Monitoring, Runbooks | One **Operational Readiness** page |
| | Go-Live, Hypercare | Production Readiness → Go-Live, Hypercare | One **Go-Live & Hypercare** page |
| | — | Requirements | Core **Requirements** register (already shared, v1338) |
| | Regulatory & Compliance | Cybersecurity → Security Sign-Off | **Compliance** tabs (Security Sign-Off stays on the Cybersecurity page) |
| **Banking only** | Core Banking Configuration, Payments & Channels, Business Change, Training, Cutover | | Added in their sections |
| **IT only** | | Architecture & Design, Development, Releases & Deployments, Cybersecurity, Technical Debt | Added in their sections |

Without merging, the PM would see two Testing areas, two Environments, two Interfaces, two Data areas and two readiness areas. Merged, each appears once.

```text
PROJECT MANAGER — Core Banking System Replacement   (Industries: Banking ★ primary + IT)
│
├── 1. Home                          My Dashboard · My Work · My Approvals · Messages · Ask Nidus
│
├── 2. Project Setup
│   ├── Project Details              (Industries: Banking ★, IT)
│   ├── Delivery Overview            [FIN + ICT] tabs: Roadmap · Business Units · Workstreams ·
│   │                                      Regulatory Milestones · Readiness [FIN] ·
│   │                                      Technology Roadmap · Releases · Technology Milestones [ICT]
│   ├── Mandate
│   ├── Brief / Charter
│   ├── Business Case
│   ├── PID
│   ├── Benefits Review Plan
│   ├── Project Team
│   ├── Governance Setup
│   └── Project Settings             tabs: … · Environments [FIN + ICT] (Dev · Test · SIT · UAT · Staging ·
│                                          Pre-Prod · Production · DR · Readiness) · Industry Modules (§8.1)
│
├── 3. Scope & Requirements
│   ├── Scope Statement
│   ├── Requirements                 (core register; ICT category tabs: Business · Functional ·
│   │                                 Non-Functional · Use Cases · Traceability · Specification)
│   ├── Products & Deliverables
│   ├── WBS & Work Packages
│   ├── Core Banking Configuration   [FIN] tabs: Products · Parameters · Customisation
│   ├── Architecture & Design        [ICT] tabs: Solution · Application · Data · Integration · Security ·
│   │                                      Decisions · Reviews · Functional Design · Technical Design · UX
│   └── Interfaces                   [FIN + ICT] tabs: Register · Upstream · Downstream · APIs ·
│                                          Events / Messaging · Batch / Files · Interface Testing · Readiness
│
├── 4. Plan & Schedule
│   ├── Schedule · Milestones · Dependencies · Baselines · Delays · Scenario Planning ·
│   │   Planning Assumptions
│
├── 5. Deliver & Test
│   ├── Tasks & Board
│   ├── Data & Migration             [FIN + ICT] tabs: Strategy · Sources · Data Models · Mapping ·
│   │                                      Cleansing · Data Quality · Mock Runs · Runbook ·
│   │                                      Reconciliations · Migration Defects · Sign-Off
│   ├── Payments & Channels          [FIN]
│   ├── Development                  [ICT] tabs: Features · Components · Services · APIs · Configuration ·
│   │                                      Code Reviews · Build Status
│   ├── Releases & Deployments       [ICT] tabs: Release Plan · Candidates · Release Notes · Deployment Plan ·
│   │                                      Pre-Deployment Checks · Smoke Testing · Rollback
│   ├── Cybersecurity                [ICT] tabs: Security Requirements · Threats · Vulnerabilities ·
│   │                                      Penetration Testing · Exceptions · Security Sign-Off
│   ├── Quality
│   ├── Testing                      [core + FIN + ICT]
│   └── Defects                      [core + ICT root cause]
│
├── 6. Risks, Changes & Governance
│   ├── RAID Log
│   ├── Risks
│   ├── Issues
│   ├── Assumptions & Constraints
│   ├── Change Requests
│   ├── Decisions
│   ├── Actions
│   ├── Governance
│   ├── Compliance                   tabs: Policies & Compliance · Regulatory Requirements · Central Bank ·
│   │                                      AML / CFT · KYC · Sanctions · Data Privacy · Evidence ·
│   │                                      Regulatory Sign-Off [FIN]
│   ├── Lessons
│   └── Technical Debt               [ICT]
│
├── 7. Stakeholders & Adoption
│   ├── Stakeholders
│   ├── Communication Plan
│   ├── Business Change              [FIN]
│   └── Training                     [FIN]
│
├── 8. Readiness, Benefits & Close
│   ├── Operational Readiness        [FIN + ICT] tabs: SOPs · Branch · Contact Centre · Support Model ·
│   │                                      Monitoring · Logging · Alerting · Runbooks · DR · Sign-Off
│   ├── Cutover                      [FIN]
│   ├── Go-Live & Hypercare          [FIN + ICT]
│   ├── Benefits & Results
│   └── Project Closure
│
├── 9. Money & Resources
│   ├── Budget & Costs · Resources · Timesheets · Procurement
│
└── Footer: Reports · Documents
```

**Count:** 9 sections and 62 pages. FIN adds 5 pages, ICT adds 5, and 5 pages are shared by both. The largest section is 6 Risks, Changes & Governance with 11 pages, within the limit. The same project today would show the full Core PM tree, a 12-group Banking tree and a 15-group IT tree.

**The same project for other roles:**
- **Team Lead (integration team):** sees Interfaces (T), Data & Migration (T), Development (T), Testing (T) and Defects (T). Payments & Channels, Business Change and Cutover appear only if the team has assigned work there.
- **Team Member (developer):** sees My Tasks, My Tests, My Defects and "My Development Work". Which pack an item came from is never visible.
- **Change Authority / Board:** unchanged. Composite industries add nothing to governance menus.

**When the PM switches an industry module off** (Project Settings → Industry Modules): for example, if Payments & Channels is out of scope for this CBS project, the PM turns it off and it disappears from every role's menu on this project. Data already captured is kept, not deleted, and the item comes back when switched on again.

### 6.4 Programme Manager

*Works across the projects in a programme. Pages show programme roll-ups. ◆ slots come from the industries of the programme's projects and show **roll-up views only** (status across projects), not project-level registers.*

```text
PROGRAMME MANAGER
│
├── 1. Home
│   ├── Programme Dashboard     tabs: Health · Tranches · Milestones · Benefits · Finance · RAID
│   ├── My Work
│   ├── My Approvals
│   ├── Messages
│   └── Ask Nidus
│
├── 2. Programme Setup
│   ├── Programme Details       tabs: Vision · Blueprint · Objectives
│   ├── Programme Business Case
│   ├── Benefits Map & Profiles
│   ├── Programme Team
│   ├── Programme Governance Setup  tabs: Programme Board · Structure · Framework
│   └── Programme Settings
│
├── 3. Scope & Requirements
│   ├── Projects & Tranches     (projects in the programme, grouped by tranche)
│   └── Capabilities            (what the programme will deliver)
│
├── 4. Plan & Schedule
│   ├── Programme Roadmap
│   ├── Key Milestones          (across projects)
│   └── Inter-Project Dependencies
│
├── 5. Deliver & Test
│   ├── Delivery Status         (project health roll-up)
│   └── Quality & Assurance     (roll-up)
│
├── 6. Risks, Changes & Governance
│   ├── Programme RAID          (programme items + escalated project items)
│   ├── Programme Changes
│   ├── Decisions & Actions
│   ├── Governance              tabs: Stage Gates · Meetings · Approvals History
│   └── Compliance              (roll-up across projects)
│
├── 7. Stakeholders & Adoption
│   ├── Stakeholders & Engagement
│   ├── Communication Plan
│   └── ◆ Business Change & Training   (roll-up) [FIN]
│
├── 8. Readiness, Benefits & Close
│   ├── Transition & Business Readiness
│   ├── ◆ Go-Live Calendar      (cutover and go-live dates across projects)
│   └── Benefits Realisation    tabs: Realisation · ◆ Outcomes
│
├── 9. Money & Resources
│   ├── Programme Budget & Funding
│   └── Resource Capacity       (across projects)
│
└── Footer: Reports · Documents
```

### 6.5 Portfolio Manager

*Works across programmes and projects. Core only, with no ◆ slots apart from an optional industry filter on dashboards.*

```text
PORTFOLIO MANAGER
│
├── 1. Home
│   ├── Portfolio Dashboard     tabs: Health · Strategic Alignment · Finance · Capacity · Benefits
│   ├── My Approvals
│   ├── Messages
│   └── Ask Nidus
│
├── 2. Portfolio Setup
│   ├── Strategic Objectives
│   └── Portfolio Governance Setup
│
├── 3. Scope & Requirements
│   ├── Intake & Pipeline       tabs: Ideas · Proposals · Mandates
│   └── Prioritisation & Selection
│
├── 4. Plan & Schedule
│   └── Portfolio Roadmap
│
├── 5. Deliver & Test
│   └── Delivery Health         (programmes and projects)
│
├── 6. Risks, Changes & Governance
│   ├── Portfolio Risks & Issues   (escalated)
│   ├── Decisions
│   └── Portfolio Governance    (boards, reviews)
│
├── 7. Stakeholders & Adoption
│   └── Stakeholders
│
├── 8. Readiness, Benefits & Close
│   └── Portfolio Benefits
│
├── 9. Money & Resources
│   ├── Portfolio Financials
│   └── Capacity & Demand
│
└── Footer: Reports · Documents
```

### 6.6 Team Manager / Team Lead (team-scoped)

*Same sections as the PM, limited to the user's team. Industry slots show only the pages where the team has assigned work.*

```text
TEAM MANAGER / TEAM LEAD
│
├── 1. Home
│   ├── Team Dashboard          tabs: Team Tasks · Team Milestones · Team RAID · Team Testing ·
│   │                                 Team Timesheets
│   ├── My Work
│   ├── My Approvals            tabs: Team Timesheets · Team Work Plans · Sign-offs
│   ├── Messages
│   └── Ask Nidus
│
├── 2. Project Setup
│   ├── Project Details (V)
│   ├── Brief / Charter (V) · PID (V)
│   ├── Project Team (T)        tabs: Members · RACI (V) · Contact Directory (V)
│   └── Project Settings (T)    tab: Document Signatory (team scope)
│
├── 3. Scope & Requirements
│   ├── Requirements (T)
│   ├── Products & Deliverables (T)
│   └── Work Packages (T)
│
├── 4. Plan & Schedule
│   ├── Team Schedule (T)
│   ├── Milestones (V)
│   └── Dependencies (T)
│
├── 5. Deliver & Test
│   ├── Team Tasks & Board (T)
│   ├── ◆ <industry delivery pages with team work> (T)   e.g. Data & Migration runbook steps
│   ├── Quality Reviews (T)
│   ├── Testing (T)
│   └── Defects (T)
│
├── 6. Risks, Changes & Governance
│   ├── RAID Log (T)            raise and update team items
│   ├── Change Requests         raise; view team-related
│   ├── Actions (T)
│   ├── Governance → Meetings
│   └── Lessons                 add
│
├── 7. Stakeholders & Adoption
│   └── ◆ Training (T)          team attendance [FIN]
│
├── 8. Readiness, Benefits & Close
│   └── ◆ Cutover / Readiness tasks (T)   assigned activities only
│
├── 9. Money & Resources
│   ├── Team Timesheets & Work Plans (A)
│   └── Team Capacity (T)
│
└── Footer: Reports (team) · Documents
```

### 6.7 Team Member

*Five sections at most. Built around "my work".*

```text
TEAM MEMBER
│
├── 1. Home
│   ├── My Dashboard
│   ├── My Tasks                tabs: List · Board · Calendar
│   ├── My Timesheets & Work Plan
│   ├── My Approvals            (only when the member is a signatory)
│   ├── Messages
│   └── Ask Nidus
│
├── 2. Project Setup
│   └── Team Directory (V)      (Project Team → Members and Contact Directory)
│
├── 5. Deliver & Test
│   ├── My Tests                (assigned test runs)
│   ├── My Defects
│   └── ◆ My <industry> Work    e.g. Migration runbook steps, Cutover activities, Site Diary entries
│
├── 6. Risks, Changes & Governance
│   ├── Raise a Risk or Issue   (RAID Log, own items)
│   ├── Raise a Change Request
│   └── My Actions
│
└── Footer: Documents · Reports (mine)
```

### 6.8 PMO Admin / Account Owner / Org Admin

*Two zones, as today: **Oversight** (across all projects) and **Organisation** (setup). The methodology track headers ([S] / [P] / [A]) leave the sidebar; methodology stays in the switcher (decision D9).*

```text
PMO ADMIN / ACCOUNT OWNER
│
├── OVERSIGHT ZONE
│   ├── 1. Home
│   │   ├── PMO Dashboard        tabs: Portfolio Health · Compliance · Approvals · Escalations
│   │   ├── Approval Queue
│   │   ├── Messages
│   │   └── Ask Nidus
│   ├── 2. Project Setup
│   │   └── Projects             (all projects; open one to get the PM menu for that project)
│   ├── 6. Risks, Changes & Governance
│   │   ├── Escalated Risks & Issues
│   │   ├── Change Oversight
│   │   ├── Governance Oversight (stage gates, boards, meetings across projects)
│   │   ├── Compliance           (policies + evidence across projects)
│   │   └── Lessons Library
│   ├── 8. Readiness, Benefits & Close
│   │   └── Benefits Oversight
│   ├── 9. Money & Resources
│   │   ├── Financial Oversight
│   │   └── Resource Capacity    (organisation-wide)
│   └── Footer: Reports · Documents
│
└── ORGANISATION ZONE  (landing page: PMO Configuration)
    ├── PMO Configuration        (guided areas — page content, not menu items)
    ├── Delivery Methodology
    ├── Industries & Capabilities
    ├── Templates & Forms        tabs: Document Templates · Form Templates · Report Layouts
    ├── Registers & Custom Fields
    ├── Users, Roles & Menus     tabs: Users · Invitations · Manage Roles · Menu Bundles
    ├── Authorities & Signatories   tabs: Delegated Authorities · Document Signatory Rules
    ├── Reference Data           tabs: Risk Categories · Communication Formats · Vendor Categories ·
    │                                  Configuration Item Types · Constraint Categories
    ├── Regional & Format Settings
    ├── Working Days & Holidays
    ├── AI Settings
    └── Account                  tabs: Organisation · Branding · Subscription & Billing (Account Owner)
```

The organisation-level Regional & Format and Working Days pages set the defaults. Each project's Project Settings overrides them.

### 6.9 Governance profiles (compact menus)

*These roles see only what they decide or watch. Sections with no items are hidden.*

```text
EXECUTIVE
├── 1. Home                     Executive Dashboard · My Approvals · Messages · Ask Nidus
├── 2. Project Setup            Mandate · Brief / Charter · Business Case
├── 6. Risks, Changes & Governance   Governance · Exceptions & Escalations (V) · Decisions (A)
├── 8. Readiness, Benefits & Close   Benefits & Results (V)
├── 9. Money & Resources        Financial Summary (V)
└── Footer                      Reports (Highlight · Exception · Executive)

SPONSOR
├── 1. Home                     Sponsor Dashboard · My Approvals · Messages
├── 2. Project Setup            Business Case (A) · Mandate · Brief / Charter
├── 7. Stakeholders & Adoption  Stakeholders (V)
├── 8. Readiness, Benefits & Close   Benefits & Results
├── 9. Money & Resources        Financial Summary (V)
└── Footer                      Reports

PROJECT BOARD MEMBER
├── 1. Home                     Board Dashboard · My Approvals & Authorisations · Messages
├── 2. Project Setup            Mandate (V) · Governance Setup (V)
├── 6. Risks, Changes & Governance   Governance (Stage Gates (A) · Meetings) · Exceptions (V) · Decisions (A)
└── Footer                      Reports (Assurance · Exception · Highlight)

PROJECT ASSURANCE
├── 1. Home                     Assurance Dashboard · Messages
├── 5. Deliver & Test           Quality (V)
├── 6. Risks, Changes & Governance   Governance (V) · Compliance · RAID Log (V) · Audit
└── Footer                      Reports

QUALITY ASSURANCE
├── 1. Home                     QA Dashboard · My Work · Messages
├── 5. Deliver & Test           Quality · Testing · Defects · ◆ Inspections
├── 6. Risks, Changes & Governance   Issues & Risks (V)
└── Footer                      Reports (Quality · Testing)

CHANGE AUTHORITY
├── 1. Home                     Change Dashboard · My Approvals · Messages
├── 6. Risks, Changes & Governance   Change Requests (A) · Decisions · RAID Log (V)
└── Footer                      Reports (Change)

STAKEHOLDER
├── 1. Home                     Dashboard (V) · Messages
├── 7. Stakeholders & Adoption  Stakeholder Information · Communication Plan (V)
└── Footer                      Reports

VIEWER
├── 1. Home                     Dashboard (V)
└── Footer                      Reports
```

---

## 7. Role × section matrix

F = full, T = team-scoped, A = approve / decide, V = view, R = roll-up, — = hidden

| Role | 1 Home | 2 Project Setup | 3 Scope & Req. | 4 Plan | 5 Deliver & Test | 6 Risks, Changes & Gov. | 7 Stakeholders & Adoption | 8 Readiness, Benefits & Close | 9 Money | Reports |
|---|---|---|---|---|---|---|---|---|---|---|
| Project Manager | F | F | F | F | F | F | F | F | F | F |
| Programme Manager | F | F (programme) | R | R | R | F (programme) | F | F (benefits) / R | F (programme) | F |
| Portfolio Manager | F | F (portfolio) | F (intake) | R | R | R | V | F (benefits) | F (portfolio) | F |
| Team Manager / Lead | F | V / T | T | T | T | T | T | T | T / A | T |
| Team Member | F (mine) | V (directory) | — | — | Mine | Raise / mine | — | Assigned | Mine (timesheets) | Mine |
| PMO Admin / Account Owner | F | F (projects list) | — | — | — | R | — | R | R | F |
| Executive | F | V | — | — | — | V / A | — | V | V | V |
| Sponsor | F | A | — | — | — | — | V | V | V | V |
| Board Member | F | V | — | — | — | V / A | — | — | — | V |
| Project Assurance | F | — | — | — | V | V | — | — | — | V |
| Quality Assurance | F | — | — | — | F (quality, testing) | V | — | — | — | V |
| Change Authority | F | — | — | — | — | A (changes) | — | — | — | V |
| Stakeholder | V | — | — | — | — | — | V | — | — | V |
| Viewer | V | — | — | — | — | — | — | — | — | V |

PMO Admin and Account Owner also have the Organisation zone (§6.8), which is not part of this matrix.

---

## 8. Multi-industry rules (summary)

1. Organisation industries decide which packs are **available** (unchanged: `industry_pack_menu_items` plus the organisation availability filter).
2. Project industries decide which packs are **shown** on that project.
3. A pack item appears only in its placed section, never in a separate industry block.
4. Shared slots appear once, however many packs fill them. Their tabs come from every contributing pack.
5. Pages outside a project show core items only. PMO and Portfolio dashboards may offer an **Industry** filter instead of menu items.
6. Adding an industry to the organisation never lengthens the sidebar for projects that do not use it.

### 8.1 Composite projects (one project, several industries)

A composite project is one project tagged with more than one industry in `project_industries`, for example a Core Banking System replacement tagged Banking (primary) and IT. The menu is built like this:

1. **Union, then merge.** Start from core plus every pack the project is tagged with, keeping only packs that are also available to the organisation.
2. **Shared slots appear once.** When two packs fill the same shared slot (§4), the slot shows once, and its tabs are the combined tabs of both packs, with duplicate tabs (e.g. SIT and UAT in both FIN and ICT) shown once.
3. **Merges into core pages stay merges.** Industry testing, defects, quality and requirements items become tabs or filters on the core page, whichever packs supply them.
4. **Pack-only items are added** in the section placed for them (§4 industry-only table).
5. **The primary industry leads.** The primary industry (`project_industries.is_primary`, at most one per project; already in the schema in Platform and Simulator) decides:
   - the label of merged pages where packs use different names (e.g. FIN's "Transformation Overview" vs ICT's "Technology Delivery" → shown as **Delivery Overview**, opening on the primary's tabs);
   - the order of tabs on merged pages (primary pack's tabs first);
   - which pack's item wins if two pack-only items would have the same label in the same section (the secondary item gets its pack name appended, e.g. "Sites (Telecom)").
   If no primary is set, the first industry added is treated as primary.
6. **Section limit.** If merging pushes a section past about 12 pages, that section's industry-only pages group under one tabbed "◆ Industry …" page (D14). Core pages never move.
7. **Per-project switch-off.** Project Settings → **Industry Modules** lists the industry items available to the project, with a switch for each. The PM (or PMO) can turn off items the project does not need, and they disappear from every role's menu on that project. Switching off only hides the item: the data stays, and permissions and RLS are unchanged.
8. **Changing a project's industries.** Adding or removing an industry on the project changes the menu at the next page load. Removing an industry never deletes records captured under it; those records stay reachable through search and reports, and return to the menu if the industry is added back.
9. **Roles see the merged menu filtered as usual.** Team-scoped roles still see only items where their team has work. Governance profiles are unaffected.
10. **Portfolio, Programme and PMO views.** Roll-ups treat a composite project as belonging to all its industries, so it appears under each industry when a dashboard is filtered by industry.

---

## 9. Decisions needed before a PRD (recommendations in **bold**)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Section skeleton | Keep today's Core PM groups / adopt the 9 work-based sections | **Adopt the 9 sections in §2** |
| D2 | Which industries show on a project | All organisation industries / the project's industries | **The project's industries** |
| D3 | Pages outside a project | Show all industry items / core only | **Core only, plus an industry filter on PMO and Portfolio dashboards** |
| D4 | Overlapping features across packs | Separate items per pack / shared slots | **Shared slots (§4)** |
| D5 | Compliance | Separate Regulatory menus / one Compliance page | **One Compliance page in Section 6: organisation policies + project regulatory tabs** |
| D6 | Mark industry items visually | Badge / no marker | **No marker. Industry name shown only in search results.** |
| D7 | Team Manager menu | Keep PM layout / use the team-scoped menu | **Team-scoped menu (same as Team Lead)** |
| D8 | Governance profiles | Keep keyword-based profile filtering / explicit placements per profile | **Explicit placement rows per profile** (predictable, editable in Admin) |
| D9 | PMO methodology track headers ([S] / [P] / [A]) | Keep in sidebar / switcher only | **Switcher only, as PM layout already does** |
| D10 | Placement storage | Re-parent `menu_items` / separate placement table | **Placement table (menu item × role layout → section + order), maintained in Admin** |
| D11 | Rollout | All roles at once / one role at a time behind a switch | **One at a time: Project Manager → Team Lead / Manager → Team Member → governance profiles → PMO** |
| D12 | Simulator parity | Separate design / same skeleton | **Same skeleton for the Practice menus (rule 34.1)** |
| D13 | Project Setup | Split setup pages across sections / keep one Project Setup section | **Keep one Project Setup section (Section 2).** Sub-menus (Project Team, Governance Setup) become pages with tabs, and the four settings pages become one Project Settings page with tabs. |
| D14 | A section exceeds 12 pages because of industry pages | Allow it / group industry pages | **Group that section's industry pages under one "◆ Industry …" page with tabs, only when the limit is exceeded** |
| D15 | Composite projects: which pack leads naming and tab order on merged pages | Fixed priority list of industries / the project's primary industry | **The project's primary industry** (`project_industries.is_primary`, already in the schema). If none is set, the first industry added. |
| D16 | Per-project switch-off of industry items | Not allowed / PM and PMO can switch items off per project | **Allowed: Project Settings → Industry Modules. Hides the item only; data and permissions are unchanged.** |
| D17 | Maximum industries per project | Unlimited / cap | **Up to 3 per project** (one primary + two secondary), to keep composite menus within the section limits. Allowing more is a later decision. |

---

## 10. Fit with the current implementation (for the PRD)

- **What already exists:** a database-driven menu (`menu_items`, `role_menu_items`), role layouts (`pm`, `tm`, `pmo`) resolved in `menuLayoutUtils.resolveLayoutType`, PM sub-profiles (`PM_PROFILE_BY_ROLE`), an organisation industry availability filter (`industry_pack_menu_items`, `applyOrgMenuAvailabilityFilter`), and the sidebar transform `applyRoleSidebarRevamp` in `apps/*/src/lib/useMenu.js`.
- **What would be added:**
  1. A placement table: section and order per menu item per role layout or profile, including shared-slot keys.
  2. A project-industry filter after the organisation filter, using the current project's `project_industries`.
  3. A regroup step in the sidebar transform that builds the 9 sections from placements and hides empty sections.
  4. Admin screens to maintain placements.
  5. Tab containers for Project Team, Governance Setup and Project Settings, where those pages are separate routes today. Each tab links to the existing route, so no page is rebuilt.
  6. Composite projects: the project-industry filter reads every row in `project_industries` (not only the primary). The regroup step merges shared slots and orders tabs by `is_primary`.
  7. A per-project "Industry Modules" setting: a small table of switched-off menu items per project, read by the sidebar after the project-industry filter. Platform and Simulator (`sim.practice_project_industries` already mirrors `is_primary`).
- **What does not change:** routes, pages, permissions and RLS (menu visibility is not security), and the functional taxonomy document.
- **Rule 70:** when the change ships, the taxonomy gains a "Sidebar placement" note per item, or links to this document.
