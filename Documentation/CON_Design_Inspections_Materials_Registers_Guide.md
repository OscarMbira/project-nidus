# Construction & Engineering — Design, RFIs, Instructions, Inspections & Materials Registers

Guide to the registers under **Construction & Engineering → Design, RFIs, Instructions, Inspections & Materials**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Design Packages

One record per **design package**. Statuses: Not Started · In Progress · In Review · Issued · Superseded.

| Tab | Fields |
|---|---|
| Details | Package Reference, Discipline, Design Stage, Designer, Design Lead, Zones |
| Dates | Planned Issue, Forecast Issue, Actual Issue, Needed on Site |
| Content | **Deliverables** table (Deliverable, Reference, Status ▾), Drawings Planned, Drawings Issued, Issued (%) *calculated* |
| Review | Reviewer, Open Review Comments |
| Notes | Notes |

## Drawings

One record per **drawing (current revision)**. Statuses: Draft · Issued for Review · Approved for Construction · As Built · Superseded.

| Tab | Fields |
|---|---|
| Details | Drawing Number, Current Revision, Discipline, Drawing Type, Scale, Zone, Design Package, Originator |
| Issue | Suitability, Issue Date, Checked By, Approved By |
| Revision History | **Revision History** table (Revision, Date, Description) |
| Notes | Notes |

## Specifications

One record per **specification section**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Specification Reference, Discipline, Revision, Author |
| Content | Standards Referenced, Materials Covered, Performance Requirements, Testing Requirements |
| Submittals | **Submittals Required** table (Submittal, When) |
| Approval | Approved By, Approval Date |
| Notes | Notes |

## Design Reviews

One record per **design review meeting**. Statuses: Scheduled · Held – Actions Open · Complete.

| Tab | Fields |
|---|---|
| Details | Review Reference, Design Package, Design Stage, Review Type, Chair, Review Date |
| Participants | **Participants** table (Name, Organisation) |
| Comments | **Comments** table (Comment, Severity ▾, Owner, Status ▾), Comments Raised, Comments Closed, Closed (%) *calculated* |
| Outcome | Outcome, Next Review |
| Notes | Notes |

## Design Changes

One record per **design change**. Statuses: Proposed · Approved · Implemented · Rejected · Withdrawn.

| Tab | Fields |
|---|---|
| Details | Change Reference, Raised By, Raised, Reason, Affected Packages |
| Change | Change Description, Affected Drawings |
| Impact | Cost Impact, Time Impact (days), Other Impacts (safety, quality, operations) |
| Decision | Decided By, Decision Date, Variation Reference, Implemented |
| Notes | Notes |

## Technical Queries

One record per **technical query**. Statuses: Open · Overdue · Answered · Closed.

| Tab | Fields |
|---|---|
| Details | TQ Reference, Raised By, Raised, Addressed To, Discipline, Zone, Response Needed By |
| Query | Question, Proposed Solution, Drawings and Specifications Referenced |
| Response | Response, Responded By, Response Date, Impact |
| Notes | Notes |

## RFI Register

One record per **request for information**. Statuses: New · Open · Responded · Overdue · Closed.

| Tab | Fields |
|---|---|
| Details | RFI Reference, From, To, Discipline, Priority, Raised, Response Needed By |
| Request | Question, Drawings Referenced |
| Response | Response, Responded By, Response Date, Impact, Linked Site Instruction / Change |
| Notes | Notes |

## Site Instructions

One record per **site instruction**. Statuses: New · Under Review · Actioned · Closed.

| Tab | Fields |
|---|---|
| Details | Instruction Reference, Issued By, Issued To, Issued, Instruction Type, Zone |
| Instruction | Instruction, Reason |
| Implications | Cost Implication, Estimated Cost, Time Implication (days) |
| Close-Out | Confirmed in Writing, Actioned, Variation Reference, Closed By |
| Notes | Notes |

## Inspection Plan

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **inspection plan (one per work package)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Inspection Lead, Work Package |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Scope & Standards | Inspection Scope, Specifications & Standards, Acceptance Criteria |
| Activities | Inspection Types, **Inspection Activities** table (Activity, Method, Frequency), Sampling Frequency |
| Hold & Witness Points | **Hold Points** table (Hold Point, Released By), **Witness Points** table (Witness Point, Witnessed By), Notification Period (hours) |
| Records & Nonconformance | Records Required, Nonconformance Procedure, Inspector Competence, **Equipment Calibration** table (Equipment, Calibration Due) |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Site Inspections

One record per **inspection**. Statuses: Requested · Scheduled · Completed · Failed – Re-Inspect · Closed.

| Tab | Fields |
|---|---|
| Details | Inspection Reference, Inspection Type, ITP Reference, Zone, Location / Element, Requested By, Requested For, Inspector, Inspected On |
| Checklist | **Checklist** table (Check, Result ▾) |
| Result | Result, Defects Found, NCR Reference, Re-Inspection Date |
| Notes | Notes |

## Material Submittals

One record per **material submittal**. Statuses: Submitted · Under Review · Approved · Approved as Noted · Revise and Resubmit · Rejected.

| Tab | Fields |
|---|---|
| Details | Submittal Reference, Material / Product, Manufacturer / Supplier, Specification Section, Package, Submitted By, Submitted, Approval Needed By |
| Documents | **Documents Submitted** table (Document, Reference) |
| Review | Reviewer, Reviewed, Review Comments |
| Supply | Lead Time (weeks), Planned Delivery |
| Notes | Notes |

## Material Testing

One record per **material test**. Statuses: Scheduled · Passed · Failed · Retest.

| Tab | Fields |
|---|---|
| Details | Test Reference, Material, Test Type, Element / Location, Zone, Laboratory / Tester |
| Results | Sampled, Tested, Unit, Specified Value (minimum), Result, Result vs Specified (%) *calculated* |
| Follow-Up | Certificate Reference, NCR Reference |
| Notes | Notes |

## SQL

1. `SQL/v1421_con_design_inspections_materials_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1422_con_design_inspections_materials_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Velocity Freight builds its Northern Distribution Hub at Kestrel Park (24,000 m² warehouse, 3-storey office block, 42-dock yard, access road, utilities), design and build by the fictional Harbourline Construction Ltd. Site start 2 March 2026, practical completion 27 August 2027. Dated around today (11 Nov 2026): steel frame complete, roof and cladding under way, slab and MEP starting. The final query counts records per register.
