# v1318 — Register Documents: Complete Document Export, In-App Sign-Off, Annexures and Full Forms

**Status:** Approved 2026-10-24 — implemented (see plan Review).
**Requested by:** Oscar Mbira, 2026-10-24.
**Related:** v931 (Local Register Engine), v1297/v1299/v1304/v1316 (field groups, list, multi-select, long_text),
v1316/v1317 (Migration Strategy + Data Scope), v867 (document attachments), v868/v873/v880/v898/v1067/v1075
(document signatories), rules 16, 16.2, 34, 38, 61, 63.1, 65, 67, 68, 69.

---

## a) Problem statement

Strategy and plan documents (e.g. a bank's Data Migration Strategy) are captured as Local Register records.
Today their export is a field list (Word/PDF/PowerPoint/Excel…): there is no cover page, no table of contents,
no numbered sections, and the glossary and appendices print as ordinary fields. Formal documents of this kind
must be signed by several people (name, project role, signature, date), but register records have **no sign-off
at all** — the in-app sign-off feature (v868) only covers governance documents (Project Charter, Business Case…).
Supporting material (diagrams, spreadsheets, prior reports) cannot be attached to a register record either.

Finally, 29 of the 30 document-style registers in the Banking, Construction and Information Technology packs are
empty shells (Title, Description, Status only), so even a perfect document export would be nearly blank.

## b) Solution

1. **Document registers.** A per-register switch (`is_document`) marks a register as a formal document. Switched on
   for 30 registers (Banking 7, Construction 7, IT 16 — section d.2). Their statuses are standardised to
   **Draft → In Review → Approved → Superseded**.
2. **In-app sign-off for document registers**, reusing the v868 model:
   - Required role slots (e.g. Project Manager — mandatory, Sponsor — mandatory, Head of IT — optional) are
     configured per register on the existing **Document Signatory** page, with the existing
     organisation → portfolio → programme → project → team inheritance.
   - On each record the preparer picks the team member for each slot and starts sign-off.
   - Signatories sign in order with their saved (or freshly uploaded) signature image; the date is recorded.
   - Starting sign-off locks the record and sets **In Review**; when every mandatory slot is signed the status
     becomes **Approved** and the record stays locked. **Restart sign-off** clears signatures into history,
     unlocks the record and returns it to Draft.
3. **Attachments → Annexures.** An Attachments tab on document records (same rules as v867: 10 MB/file, 10 files,
   versions, drag-drop/paste/camera) with a title per file; each becomes **Annexure A, B, …** in the export.
4. **Complete document export (Word + PDF)** for document registers:
   Cover page → Document Control (version history + sign-off table: Name | Project Role | Signature | Date) →
   Table of Contents → numbered sections (one per tab; Glossary as section 2) → Appendices → Annexures.
5. **Full best-practice forms** for the 29 empty registers (section d.3), delivered in three batches.

## c) User stories

1. As a PMO Admin, I can see each document register (e.g. "Migration Strategy") as a document type on the
   Document Signatory page and define its ordered signatory role slots, mandatory or optional.
2. As a Project Manager / Team Lead, I can override those slots for my project / team (existing scope rules).
3. As a preparer, on a document record I see a **Sign-off** tab listing the effective slots, and I can pick a
   project team member for each slot.
4. As a preparer, I can **Start sign-off** only when every mandatory slot has a person; the record then becomes
   read-only and its status becomes In Review.
5. As the next signatory in order, I am notified and can sign using my saved signature or by uploading one; my
   name, project role, signature image and the date/time are recorded.
6. As a signatory, I can decline with a reason; the preparer sees the reason.
7. As a preparer, once all mandatory slots are signed, the record's status becomes Approved automatically and it
   stays read-only; remaining optional slots can be locked (v898 behaviour).
8. As a preparer, I can **Restart sign-off** (with a reason) to make changes; earlier signatures stay in the
   signing history, the record unlocks and returns to Draft.
9. As any user with access, I can see the signing history (rounds, who signed/declined, when).
10. As a preparer, while the record is not locked I can attach up to 10 files (10 MB each) on an **Attachments**
    tab, give each an annexure title, replace a file (new version, old kept), restore a version, or delete.
11. As a user, attachments are read-only while the record is locked.
12. As a user, on a document record's view page the Export menu offers **Document (Word)** and **Document (PDF)**;
    the existing field-list formats remain available.
13. As a reader of the exported document, I see a cover page with organisation logo/name, document title,
    reference, version, owner, status, date and project.
14. … then a Document Control page with the version history and a sign-off table (Name | Project Role |
    Signature image | Date); unsigned slots show "Pending", declined slots "Declined — reason".
15. … then a Table of Contents with page numbers (Word: a real, clickable TOC that updates when opened; PDF: with
    page numbers).
16. … then numbered sections, one per form tab, with numbered sub-headings per field; lists are bullets, long text
    keeps paragraphs, Yes/No and amounts are readable and use Regional & Format settings (rule 68).
17. … the Glossary of Terms appears as section 2 as a two-column table (Term | Definition) when entries use
    "Term – Definition".
18. … then Appendices (Appendix A, B, … from the Appendices list) and Annexures (Annexure A, B, … from attached
    files: images embedded, other files listed by name).
19. … empty fields are omitted from the document (not printed as "—"); a section with no content is omitted.
20. As a user of the Migration Strategy, I capture approvals as a "Sign-Off" table (Name | Role | Date) on its own Sign-Off tab,
    alongside the document's built-in sign-off (changed 2026-10-24, v1327 — was: the field is removed).
21. As a user of each of the 29 registers, I get a complete, tabbed form with lists, (searchable) dropdowns,
    multi-selects, Yes/No, dates, amounts and Notes appropriate to that document (section d.3).
22. As a Simulator user, the same engine features (document switch, sign-off, attachments, document export) work
    for Simulator local registers (rule 34); the industry registers themselves exist in Platform only.

## d) Implementation decisions

### d.1 Owner decisions (interview 2026-10-24)
| # | Decision |
|---|---|
| 1 | Signatures via **in-app sign-off** (reuse v868), not preparer-uploaded images or blank blocks |
| 2 | Applies to strategy/plan/design document registers in **Banking, Construction, Information Technology** (Product Development skipped — no such pack) |
| 3 | Signatory slots **configured on the Document Signatory page**; preparer picks people per record |
| 4 | **Lock + automatic status**: start → In Review (locked); all mandatory signed → Approved (locked); restart → Draft |
| 5 | Layout: **Cover → Document Control → TOC → numbered sections (Glossary = §2) → Appendices → Annexures** |
| 6 | Formats: **Word + PDF** get the document layout; other formats unchanged |
| 7 | **Attachments now**, mirroring v867 + annexure title per file |
| 8 | Migration Strategy: **keep Appendices list**; ~~drop Approvals~~ → **keep Approvals as a Name \| Role \| Date table labelled "Sign-Off"** on its own Sign-Off tab (owner change 2026-10-24, v1327; v1321 no longer deletes it) |
| 9 | Construction & IT document registers: the recommended list **plus Runbooks and Architecture Decisions** |
| 10 | **Standardise statuses** of all 30 to Draft / In Review / Approved / Superseded (existing values mapped) |
| 11 | **Full best-practice forms for all 29** empty registers |
| 12 | Delivery: **engine first (proven on Migration Strategy), then forms in 3 batches**; field designs approved once, here |

### d.2 Document registers (30)
- **Banking (7):** Migration Strategy, Cutover Strategy, Cutover Plan, Dress Rehearsal Strategy, Testing Strategy,
  Hypercare Plan, Rollback Plan.
- **Construction (7):** Commissioning Plan, HSE Plan, Inspection Plan, Recovery Plans, Site Logistics, Method
  Statements, ITPs.
- **Information Technology (16):** Enterprise, Solution, Application, Data, Integration and Security Architecture;
  Functional, Technical, Integration, Data and UX/UI Design; Disaster Recovery; Support Model; Technology Roadmap;
  Runbooks; Architecture Decisions.

Status mapping when standardising: `review`→`in_review`, `proposed`→`draft`, `accepted`→`approved`,
`not_ready`→`draft`, `ready`→`approved`. Only one existing record (Functional Design) is affected.

### d.3 Form designs for the 29 registers

**Type key:** T text · LT Notes (long text) · L multi-value list · N number · C amount (currency, rule 36/68) ·
D date · DD dropdown (searchable when ≥ 12 options) · MS multi-select · YN Yes/No · P person. `*` = required.
Lists that hold several parts per line show the pattern in the label, e.g. "Activity – Owner – Date".
All names are vendor-neutral (rule 26).

**Standard frame (every register):**
- **Details tab:** Document Reference T · Document Version T · Document Owner P* · Next Review Date D, plus the
  register-specific Details fields below.
- **Introduction tab** (strategy, plan, architecture and design documents — not Method Statements, ITPs,
  Runbooks, Architecture Decisions): Purpose LT · Objectives L · Scope L · Out of Scope L · Assumptions L ·
  Constraints L.
- **Risks & Roles tab:** Risks – Mitigations L · Roles & Responsibilities (Role – Responsibility – Name) L.
- **Glossary & Appendices tab:** Glossary of Terms (Term – Definition) L · Appendices (Title – Reference / Link) L.
- **Document Control tab:** Version History (Version – Date – Author – Change) L · Related Documents L.

Sign-off and Attachments are their own tabs (engine), not fields.

#### Banking
1. **Cutover Strategy** — Details: Cutover Approach DD (Big bang / Phased / Parallel run / Pilot then rollout) ·
   Target Go-Live D · Cutover Window Start D · End D.
   *Cutover Approach:* Approach Description LT · Cutover Phases MS (Preparation, Freeze, Final migration, Technical
   cutover, Business validation, Go/No-Go, Go-live, Hypercare) · Key Milestones L · Dependencies L.
   *Freeze & Continuity:* Code Freeze D · Data Freeze D · Business Freeze Rules L · Planned Downtime (hours) N ·
   Services & Channels Impacted L · Fallback / Manual Procedures L · Customer Communication Required YN.
   *Go/No-Go & Governance:* Go/No-Go Criteria L · Decision Points L · Command Centre Arrangements LT ·
   Escalation Path L.
   *Rollback:* Rollback Triggers L · Point of No Return LT · Rollback Approach LT.
2. **Cutover Plan** — Details: Cutover Manager P · Cutover Start D · Cutover End D · Planned Go-Live D.
   *Timeline:* Cutover Phases MS (as above) · Activity Runsheet (Seq – Activity – Owner – Start – Duration) L ·
   Critical Path L · Checkpoints L.
   *Prerequisites:* Entry Criteria L · Technical Prerequisites L · Business Prerequisites L.
   *Communications:* Communication Schedule L · Stakeholders to Notify L · Contact List (Name – Role – Phone) L.
   *Validation & Go-Live:* Validation Checks L · Go/No-Go Checkpoints L · Exit Criteria L.
   *Contingency:* Rollback Triggers L · Rollback Steps L · Point of No Return T.
3. **Dress Rehearsal Strategy** — Details: Number of Rehearsals N · First Rehearsal D · Final Rehearsal D.
   *Approach:* Rehearsal Types MS (Technical, Full dress rehearsal, Timed cutover, Rollback, Business validation) ·
   Approach LT.
   *Environment & Data:* Environment T · Data Set Used LT · Production Data Volume (%) N ·
   Environment Prerequisites L.
   *Execution:* Runsheet Reference T · Timing Targets L · Participants L · Command Centre Used YN.
   *Measurement & Exit:* Success Criteria L · Metrics Captured MS (Duration vs plan, Reconciliation results,
   Defects found, Rollback time, Data quality) · Exit Criteria L · Lessons Learned Process LT.
4. **Testing Strategy** — Details: Test Manager P · Testing Start D · Testing End D.
   *Test Approach:* Approach LT · Test Levels MS (Unit, System, Integration/SIT, UAT, Regression, Performance,
   Security, Operational acceptance, Disaster recovery, Migration, Interface, Accessibility — searchable) ·
   Risk-Based Testing YN · Test Techniques L.
   *Environments & Data:* Test Environments MS (Development, Test, SIT, UAT, Pre-production, DR) ·
   Test Data Approach LT · Data Masking Required YN.
   *Entry & Exit:* Entry Criteria L · Exit Criteria L · Suspension Criteria L · Resumption Criteria L.
   *Defect Management:* Severity Definitions L · Defect Workflow LT · Acceptable Open Defects at Exit L.
   *Tools & Reporting:* Test Management Tool T · Automation Approach LT · Reporting Cadence DD (Daily / Weekly /
   Per phase) · Metrics Reported L · Test Deliverables L.
5. **Hypercare Plan** — Details: Hypercare Lead P · Hypercare Start D · Hypercare End D.
   *Support Model:* Support Scope L · Support Hours DD (Business hours / Extended / 24×7) · Support Tiers L ·
   On-Call Rota L · Contact Channels L.
   *Monitoring & KPIs:* KPIs (KPI – Target) L · Monitoring Activities L · Daily Checks L.
   *Incidents & Defects:* Severity Definitions L · Response & Resolution Targets L · Escalation Path L ·
   Triage Meeting Cadence DD (Daily / Twice daily / Weekly).
   *Exit & Handover:* Exit Criteria L · Handover to Business-as-Usual LT · Knowledge Transfer L ·
   Lessons Learned LT.
6. **Rollback Plan** — Details: Rollback Decision Owner P · Point of No Return T.
   *Triggers & Decision:* Rollback Triggers L · Decision Criteria L · Decision Authority L · Decision Deadline T.
   *Procedure:* Rollback Steps (Seq – Step – Owner – Duration) L · Estimated Rollback Duration (hours) N ·
   Systems to Restore L · Data Restore Approach LT.
   *Data & Transactions:* Transactions During Cutover LT · Reprocessing Approach LT · Backups Required L.
   *Validation & Communication:* Post-Rollback Checks L · Communication Plan L · Customer Impact LT.
   *Testing:* Rollback Tested YN · Rollback Test Date D · Test Results LT.

#### Construction
7. **Commissioning Plan** — Details: Commissioning Manager P · Facility / System T · Planned Start D ·
   Planned Completion D.
   *Systems & Stages:* Systems to Commission L · Commissioning Stages MS (Pre-commissioning, Cold commissioning,
   Hot commissioning, Performance testing, Reliability run, Handover) · Commissioning Sequence L ·
   Interfaces & Dependencies L.
   *Testing & Acceptance:* Test Procedures L · Acceptance Criteria L · Witness & Hold Points L ·
   Performance Guarantees L.
   *Safety & Permits:* Safety Requirements L · Permit to Work Required YN · Isolation Procedures L ·
   Energisation Procedures L.
   *Handover:* Commissioning Records L · O&M Training L · Handover Documents L · Punch List Approach LT.
8. **HSE Plan** — Details: HSE Manager P · Site Location T · Peak Workforce N.
   *Policy & Objectives:* HSE Policy Statement LT · HSE Objectives L · Legal Requirements L · Standards Applied L.
   *Hazards & Controls:* High-Risk Activities MS (Work at height, Lifting, Excavation, Confined space, Hot work,
   Electrical, Demolition, Traffic management, Hazardous substances) · Major Hazards L ·
   Risk Assessment Approach LT · Control Measures L.
   *Safe Systems of Work:* Permit to Work System LT · Method Statements Required YN · PPE Requirements L ·
   Site Rules L.
   *Training & Competence:* Induction Requirements L · Training Matrix L · Toolbox Talk Frequency DD (Daily /
   Weekly / Fortnightly).
   *Emergency Preparedness:* Emergency Procedures L · First Aid Arrangements L · Emergency Contacts L ·
   Evacuation Drill Frequency DD (Monthly / Quarterly / Half-yearly).
   *Environment:* Environmental Aspects L · Waste Management LT · Pollution Prevention L.
   *Monitoring & Reporting:* Inspections & Audits L · HSE KPIs L · Incident Reporting Procedure LT ·
   Near-Miss Reporting in Place YN.
9. **Inspection Plan** — Details: Inspection Lead P · Work Package T.
   *Scope & Standards:* Inspection Scope L · Specifications & Standards L · Acceptance Criteria L.
   *Activities:* Inspection Types MS (Visual, Dimensional, Material test, Non-destructive test, Pressure test,
   Electrical test, Functional test) · Inspection Activities (Activity – Method – Frequency – Responsible) L ·
   Sampling Frequency T.
   *Hold & Witness Points:* Hold Points L · Witness Points L · Notification Period (hours) N.
   *Records & Nonconformance:* Records Required L · Nonconformance Procedure LT · Inspector Competence L ·
   Equipment Calibration L.
10. **Recovery Plans** — Details: Recovery Owner P · Current Delay (days) N · Target Recovery Date D.
    *Delay Analysis:* Delay Description LT · Delay Categories MS (Design, Procurement, Labour, Plant, Weather,
    Client change, Subcontractor, Permits, Ground conditions) · Root Causes L · Critical Activities Affected L.
    *Recovery Strategy:* Acceleration Options MS (Additional resources, Extended hours, Shift work, Resequencing,
    Prefabrication, Scope change) · Recovery Measures L · Revised Milestones L.
    *Cost & Resources:* Additional Cost C · Additional Resources L · Funding Approval Required YN.
    *Monitoring:* Progress Indicators L · Review Frequency DD (Daily / Weekly / Fortnightly) ·
    Early-Warning Triggers L.
11. **Site Logistics** — Details: Logistics Manager P · Site Location T.
    *Site Layout:* Layout Description LT · Access Points L · Laydown Areas L · Welfare Facilities L.
    *Traffic & Deliveries:* Traffic Management Plan LT · Delivery Rules L · Vehicle Routes L · Delivery Hours T.
    *Storage & Handling:* Storage Arrangements L · Material Handling L · Cranes & Hoists L.
    *Security & Neighbours:* Site Security L · Neighbour Considerations L · Noise & Dust Controls L.
    *Waste & Utilities:* Waste Management LT · Temporary Utilities L.
12. **Method Statements** — Details: Activity T* · Work Location T · Supervisor P · Planned Start D.
    *Scope of Work:* Scope Description LT · Sequence of Works L.
    *Resources:* Labour L · Plant & Equipment L · Materials L · Competence Requirements L.
    *Hazards & Controls:* Hazards L · Control Measures L · PPE Required MS (Hard hat, Safety boots, High-visibility,
    Gloves, Eye protection, Hearing protection, Harness, Respirator) · Permits Required MS (Hot work, Confined
    space, Excavation, Electrical isolation, Work at height, Lifting).
    *Quality & Emergency:* Quality Checks L · Hold Points L · Emergency Arrangements L · Environmental Controls L.
    *Briefing:* Briefing Record (Name – Date) L.
13. **ITPs** — Details: Work Package T* · Discipline DD (Civil, Structural, Mechanical, Electrical,
    Instrumentation, Piping, Architectural, HVAC) · Contractor T.
    *References:* Specifications L · Drawings L · Standards L.
    *Activities:* Inspection & Test Activities (Seq – Activity – Acceptance Criteria – Verifying Document –
    Inspection Type) L.
    *Inspection Points:* Hold Points L · Witness Points L · Surveillance Points L · Review Points L.
    *Responsibilities & Records:* Contractor Responsibilities L · Client Responsibilities L ·
    Third-Party Inspection YN · Records Required L.

#### Information Technology
14. **Enterprise Architecture** — Details: Architecture Owner P.
    *Business Context:* Business Drivers L · Strategic Goals L · Stakeholder Concerns L · Architecture Principles L.
    *Current State:* Baseline Architecture LT · Pain Points L.
    *Target State:* Target Architecture LT · Capability Map L.
    *Gaps & Roadmap:* Gaps L · Transition Architectures L · Roadmap Items L.
    *Standards & Governance:* Technology Standards L · Governance Process LT · Compliance Requirements L.
15. **Solution Architecture** — Details: Solution Architect P · Solution Name T · Deployment Model DD (On-premises /
    Cloud / Hybrid / Software-as-a-service).
    *Context:* Business Requirements L · Stakeholders L.
    *Overview:* Architecture Overview LT · Components L · Technology Stack L.
    *Non-Functional:* Non-Functional Requirements (Category – Requirement – Target) L · Availability Target (%) N ·
    Recovery Point Objective (hours) N · Recovery Time Objective (hours) N.
    *Integration & Security:* Interfaces L · Data Flows L · Security Controls L.
    *Decisions:* Architecture Decisions L · Technical Debt L.
16. **Application Architecture** — Details: Application Architect P · Architecture Style DD (Monolith, Modular
    monolith, Microservices, Event-driven, Serverless, Layered).
    *Landscape:* Applications in Scope L · Application Components L.
    *Design:* Design Patterns L · Technology Stack L · APIs L · Dependencies L.
    *Deployment:* Deployment Model DD (as above) · Hosting Environments MS (Development, Test, SIT, UAT,
    Pre-production, Production, DR) · Scalability Approach LT.
    *Quality Attributes:* Non-Functional Requirements L.
17. **Data Architecture** — Details: Data Architect P.
    *Landscape:* Data Domains L · Data Sources L · Data Stores L.
    *Models:* Conceptual Model LT · Logical Model Reference T · Master Data Entities L.
    *Flows & Integration:* Data Flows L · Integration Patterns MS (Batch, Real-time API, Event streaming, ETL/ELT,
    Replication, File transfer).
    *Governance & Quality:* Data Owners L · Data Quality Rules L · Retention Rules L · Classification Levels MS
    (Public, Internal, Confidential, Restricted).
    *Privacy & Security:* Personal Data Processed YN · Privacy Controls L · Encryption Requirements L.
18. **Integration Architecture** — Details: Integration Architect P · Middleware / Integration Platform T.
    *Landscape:* Systems Integrated L · Integration Patterns MS (as above).
    *Interfaces:* Interfaces (Name – Source – Target – Pattern – Frequency) L.
    *Standards:* Message Formats MS (JSON, XML, CSV, Fixed-width, ISO 20022, EDI, Other) · API Standards L ·
    Error Handling LT.
    *Non-Functional & Security:* Throughput Targets L · Availability Target (%) N · Monitoring Approach LT ·
    Authentication Methods MS (OAuth 2.0, Mutual TLS, API keys, SAML, Certificates, Basic) · Security Controls L.
19. **Security Architecture** — Details: Security Architect P · Overall Security Risk DD (Low / Medium / High /
    Critical).
    *Requirements:* Security Requirements L · Regulatory Frameworks L · Data Classification L.
    *Threats:* Threat Model Summary LT · Key Threats L.
    *Controls:* Identity & Access Controls L · Network Controls L · Data Protection Controls L ·
    Application Controls L · Logging & Monitoring L.
    *Assurance:* Security Testing MS (Static analysis, Dynamic analysis, Penetration test, Vulnerability scan,
    Code review, Configuration review) · Compliance Checks L · Residual Risks L.
20. **Functional Design** — Details: Functional Lead P · Module / Area T.
    *Business Context:* Business Requirements L · Process Flows L · User Roles L.
    *Requirements:* Functional Requirements (ID – Requirement – Priority) L · Business Rules L · Validations L.
    *User Interface:* Screens L · Reports L · Notifications L.
    *Data:* Data Entities L · Inputs & Outputs L.
    *Acceptance:* Acceptance Criteria L · Traceability Reference T · Open Questions L.
21. **Technical Design** — Details: Technical Lead P · Component / Service T.
    *Overview:* Design Overview LT · Components L · Technology Stack L.
    *Detailed Design:* Component Design L · Logic & Algorithms LT · Configuration L.
    *Data & Interfaces:* Data Structures L · Database Changes L · APIs L · Integration Points L.
    *Operations:* Performance Considerations L · Security Considerations L · Logging & Monitoring L ·
    Deployment Steps L.
    *Testing:* Unit Test Approach LT · Test Scenarios L.
22. **Integration Design** — Details: Interface Name T* · Source System T · Target System T · Integration Pattern
    DD (Batch, Real-time API, Event streaming, ETL/ELT, Replication, File transfer) · Frequency DD (Real-time,
    Near real-time, Hourly, Daily, On demand, Event-triggered).
    *Message & Mapping:* Message Format DD (as above) · Field Mappings (Source – Target – Rule) L ·
    Transformations L.
    *Error Handling:* Error Scenarios L · Retry Policy LT · Alerting L.
    *Security:* Authentication Method DD (as above) · Encryption in Transit YN · Data Sensitivity DD (Public /
    Internal / Confidential / Restricted).
    *Testing:* Test Cases L · Volumes & Performance L.
23. **Data Design** — Details: Data Designer P · Database Platform T.
    *Entities:* Entities (Entity – Description – Owner) L · Relationships L.
    *Attributes & Rules:* Key Attributes L · Validation Rules L · Reference Data L.
    *Storage:* Indexing & Partitioning L · Retention & Archiving L.
    *Quality & Privacy:* Data Quality Rules L · Personal Data Fields L · Masking Requirements L.
    *Migration Impact:* Migration Considerations LT.
24. **UX / UI Design** — Details: UX Lead P · Prototype Link T · Design System Reference T.
    *Users:* Personas L · User Goals L · User Journeys L.
    *Design:* Information Architecture LT · Key Screens L.
    *Accessibility & Devices:* Accessibility Standard DD (WCAG 2.1 AA / WCAG 2.2 AA / WCAG 2.1 AAA / Other) ·
    Accessibility Requirements L · Devices Supported MS (Desktop, Tablet, Mobile, Kiosk) · Browsers Supported L.
    *Usability Testing:* Usability Tests L · Findings L · Design Changes L.
25. **Disaster Recovery** — Details: DR Owner P · Last DR Test D · Next DR Test D.
    *Objectives:* Systems in Scope L · Recovery Time Objective (hours) N · Recovery Point Objective (hours) N ·
    Recovery Tier DD (Tier 1 critical / Tier 2 essential / Tier 3 important / Tier 4 non-critical).
    *DR Strategy:* DR Strategy DD (Active-active / Hot standby / Warm standby / Cold standby / Backup & restore) ·
    DR Site T · Replication Approach LT.
    *Backup:* Backup Schedule L · Backup Retention L · Off-site Copy YN.
    *Procedures:* Invocation Criteria L · Recovery Steps L · Failback Steps L.
    *Testing & Contacts:* DR Test Types MS (Tabletop, Component failover, Full failover, Backup restore) ·
    Test Results LT · Readiness Issues L · DR Team L · Supplier Contacts L.
26. **Support Model** — Details: Service Owner P · Support Start D · Service Hours DD (Business hours / Extended /
    24×7).
    *Services & Tiers:* Services Supported L · Tier Structure L · Support Teams L · Supplier Support L.
    *Service Levels:* Priority Definitions L · Service Levels (Priority – Response – Resolution) L.
    *Processes:* Incident Process LT · Problem Process LT · Change Process LT · Request Process LT.
    *Tools & Transition:* Service Desk Tool T · Knowledge Base T · Monitoring Tools L · Handover Criteria L ·
    Training Plan L.
27. **Technology Roadmap** — Details: Roadmap Owner P · Horizon DD (1 / 2 / 3 / 5 years) · Roadmap Start D.
    *Vision & Drivers:* Vision LT · Business Drivers L · Principles L.
    *Current State:* Current Technologies L · Constraints & Issues L.
    *Roadmap:* Initiatives (Initiative – Timeframe – Outcome) L · Milestones L · Dependencies L.
    *Investment & Governance:* Estimated Investment C · Funding Sources L · Review Cadence DD (Monthly /
    Quarterly / Half-yearly / Annually) · KPIs L.
28. **Runbooks** — Details: Service / System T* · Runbook Owner P · Runbook Type DD (Operational, Incident
    response, Deployment, Maintenance, Recovery, Scheduled job).
    *Overview:* Purpose LT · Trigger Conditions L · Prerequisites L · Access Required L.
    *Procedure:* Steps (Seq – Step – Expected Result) L · Estimated Duration (minutes) N.
    *Verification & Escalation:* Verification Checks L · Rollback Steps L · Escalation Contacts L · Known Issues L.
    *Maintenance:* Last Tested D · Review Frequency DD (Monthly / Quarterly / Half-yearly / Annually).
29. **Architecture Decisions** — Details: Decision Owner P · Decision Date D · Decision Area DD (Application, Data,
    Integration, Infrastructure, Security, Platform, Process).
    *Context:* Context LT · Problem Statement LT · Decision Drivers L · Constraints L.
    *Options:* Options Considered (Option – Pros – Cons) L.
    *Decision:* Decision LT · Rationale LT.
    *Consequences:* Positive Consequences L · Negative Consequences L · Follow-up Actions L.
    *Related:* Related Decisions L · Supersedes T.

### d.4 Engine design
- **Register switch:** `local_registers.is_document BOOLEAN NOT NULL DEFAULT false` (public + sim).
- **Signatory configuration:** document type key `local_register:<register_key>` in the existing
  `process_template_signatory_requirements` / `…_scope_policies` tables (public + sim). Their `document_table` CHECK
  constraints are widened to also accept `local_register:%`. The Document Signatory page lists the account's
  document registers in a "Registers" group beside the existing document types.
- **Per-record signing:** new `local_register_record_signatories` (public + sim), mirroring
  `process_template_document_signatories` (slot snapshot, round, status pending/signed/declined, signature storage
  path, display ID) keyed by `record_id`. Private Storage bucket `local-register-signatures`.
- **State changes in the database:** SECURITY DEFINER RPCs start / sign / decline / lock-optional / restart
  (turn order, mandatory checks, status changes In Review → Approved / Draft). `local_register_records.signoff_state`
  (`none` | `in_progress` | `complete`). A trigger rejects edits to title, description, status and field values while
  `signoff_state <> 'none'` unless the change comes from those RPCs.
- **Notifications:** reuse the v868 notification path (next signatory, declined, completed).
- **Attachments:** new `local_register_record_attachments` (public + sim) mirroring `process_template_attachments`
  plus `annexure_title`; private bucket `local-register-attachments`; writes blocked while locked.
- **Display IDs:** both new tables registered in `database_tables`, Admin ID Generation rules seeded in the Admin
  repo, `trg_apply_admin_display_id` wired (rule 16.2); Planner wall re-run (v1251).
- **Document export:** a shared, pure builder turns register + record + signatories + attachments + regional
  settings into a document model; renderers for Word (`docx` with heading numbering and a TOC field) and PDF (two-pass
  page numbering). Glossary / Appendices / Version History are recognised by field key (`glossary`, `appendices`,
  `version_history`). Export menu gains "Document (Word)" / "Document (PDF)" on document registers only.
- **Parity (rule 34):** engine, services and pages in Platform and Simulator; the 30 industry registers and their
  forms exist in Platform only (as today).

## e) Testing decisions
- **Unit (Vitest):** document model builder (section order, numbering, glossary table split, empty-field omission,
  appendix/annexure lettering, signatory rows for signed / pending / declined); sign-off pure helpers; Sign-off and
  Attachments tabs (locked vs unlocked, start disabled until mandatory slots are assigned); export menu shows the
  document options only for document registers.
- **SQL tests:** RPC turn order, mandatory completion → Approved, restart → Draft, edit blocked while locked,
  attachment write blocked while locked, RLS (non-member cannot read signatures/attachments).
- **Manual:** export a filled Migration Strategy to Word and PDF; check cover, control table with signature images,
  TOC page numbers, numbering, glossary, appendices, annexures; light/dark UI; mobile width.
- **Done** = all of the above green; every register in d.2 shows the document features; 29 forms in place.

## f) Out of scope
- Legally binding / cryptographic e-signatures (internal sign-off tracking only, as v868).
- Document layout for PowerPoint, Excel, CSV, XML, JSON and Print (unchanged).
- A "link to another record" field type (Data Scope keeps a text reference).
- Product Development, Marketing and other industry packs (can be switched on later with one SQL update).
- Seeding industry registers into the Simulator schema.
- Field-level change history (rule 63.1 note).

## g) Further notes
- The Approvals field on Migration Strategy is kept as a table (Name | Role | Date) labelled "Sign-Off" on its own
  Sign-Off tab (v1327, owner change 2026-10-24). It sits alongside the in-app sign-off, which remains the signed
  record; on the record view page the two tabs ("Sign-Off" table, "Sign-off" signing panel) appear side by side.
- The Data Scope register is not a document register (it holds per-product records).
- Forms batch order after the engine: Banking (6) → Construction (7) → IT (16); each batch its own SQL file.
