# Construction & Engineering — Commercial, Certificates, Handover & Commissioning Registers

Guide to the registers under **Construction & Engineering → Commercial, Certificates, Handover & Commissioning**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Bills of Quantities

One record per **bill (one section of the bills of quantities)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Bill Reference, Section, Package, Measured By, Measurement Rules, Revision |
| Items | **Main Items** table (Item, Description, Unit, Quantity, Rate) |
| Totals | Bill Total, Provisional Sums Included, Contingency Included |
| Approval | Approved By, Approved |
| Notes | Notes |

## Valuations

One record per **interim valuation**. Statuses: Submitted · Under Review · Certified · Disputed.

| Tab | Fields |
|---|---|
| Details | Valuation Number, Contractor, Valuation Date, Work Up To, Prepared By |
| Valuation | Work Done to Date, Materials on Site, Variations to Date, Gross Valuation, Retention, Net Valuation *calculated*, Previously Certified, Amount Due This Valuation *calculated* |
| Certification | Amount Certified, Certified vs Amount Due *calculated*, Certified By, Certified, Adjustments Made |
| Notes | Notes |

## Variations

One record per **variation**. Statuses: Proposed · Approved (Instructed) · Valued · Agreed · Rejected.

| Tab | Fields |
|---|---|
| Details | Variation Reference, Origin, Instruction / Change Reference, Package, Zone, Instructed |
| Scope | Scope of the Variation |
| Value & Time | Valuation Method, Quoted Value, Assessed Value, Agreed Value, Agreed vs Quoted *calculated*, Time Impact (days) |
| Agreement | Agreed By, Agreed |
| Notes | Notes |

## Commercial Claims

One record per **claim made by the client**. Statuses: Submitted · Under Review · Settled · Rejected.

| Tab | Fields |
|---|---|
| Details | Claim Reference, Claimant, Claim Against, Claim Type, Event Date, Notified |
| Claim | Basis of Claim, **Evidence** table (Evidence, Reference) |
| Amounts | Amount Claimed, Amount Recovered, Recovered (%) *calculated* |
| Settlement | Settled By, Settled |
| Notes | Notes |

## Progress Certificates

One record per **interim payment certificate**. Statuses: Submitted · Measured · Certified · Approved · Paid.

| Tab | Fields |
|---|---|
| Details | Certificate Number, Valuation, Contractor, Certificate Date, Final Date for Payment |
| Amounts | Gross Value Certified to Date, Less Retention, Net Value *calculated*, Less Previous Certificates, Amount Certified This Certificate *calculated* |
| Payment | Amount Paid, Outstanding *calculated*, Paid On, Payment Reference |
| Approvals | Certified By, Approved for Payment By |
| Notes | Notes |

## Commissioning Plan

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **commissioning plan (one system)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Commissioning Manager, Facility / System, Planned Start, Planned Completion |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Systems & Stages | **Systems to Commission** table (System, Contractor, Witnessed By), Commissioning Stages, Commissioning Sequence, Interfaces & Dependencies |
| Testing & Acceptance | **Test Procedures** table (Procedure, Reference), Acceptance Criteria, **Witness and Hold Points** table (Point, Witness), **Performance Guarantees** table (Guarantee, Value) |
| Safety & Permits | Safety Requirements, Permit to Work Required, Isolation Procedures, Energisation Procedures |
| Handover | Commissioning Records, **O&M Training** table (Topic, Audience, Duration), Handover Documents, Punch List Approach |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Pre-Commissioning

One record per **pre-commissioning checklist**. Statuses: Open · In Progress · Blocked · Complete.

| Tab | Fields |
|---|---|
| Details | Checklist Reference, System, Equipment / Area, Contractor, Check Type, Planned, Completed |
| Checks | **Checks** table (Check, Result ▾), Open Items, Signed Off By |
| Notes | Notes |

## Testing & Commissioning

One record per **commissioning test**. Statuses: Scheduled · In Progress · Passed · Failed · Retest.

| Tab | Fields |
|---|---|
| Details | Test Reference, System, Test Type, Procedure, Contractor, Planned, Tested, Witnessed By |
| Results | **Results** table (Parameter, Required, Measured, Result ▾), Certificate Reference, Retest Date |
| Notes | Notes |

## As-Built Drawings

One record per **as-built drawing**. Statuses: Pending · Submitted · Returned with Comments · Approved.

| Tab | Fields |
|---|---|
| Details | Drawing Number, Discipline, Contractor, Construction Drawing It Replaces, As-Built Revision, Format |
| Review | Due, Submitted, Reviewed By, Reviewed, Comments |
| Notes | Notes |

## O&M Manuals

One record per **O&M manual**. Statuses: Pending · Submitted · Returned with Comments · Approved.

| Tab | Fields |
|---|---|
| Details | Manual Reference, System, Contractor, Format |
| Contents | **Sections** table (Section, Included ▾), Warranty (months), Spare Parts List Included |
| Review | Due, Submitted, Reviewer, Reviewed, Comments |
| Notes | Notes |

## Training

One record per **handover training session**. Statuses: Planned · Delivered · Cancelled.

| Tab | Fields |
|---|---|
| Details | Session Reference, System, Trainer, Trainer Company, Audience |
| Session | Planned, Delivered, Duration (hours), Topics |
| Attendance | Attendees Planned, Attendees, Attendance (%) *calculated*, Training Materials Provided, Recording Reference |
| Notes | Notes |

## Handover Certificates

One record per **handover certificate**. Statuses: Pending · Issued · Withheld.

| Tab | Fields |
|---|---|
| Details | Certificate Reference, Certificate Type, Section / Zone, Issued By, Linked Milestone |
| Issue | Planned, Issued, Conditions, Outstanding Items at Issue |
| Notes | Notes |

## Defects Liability

One record per **defects liability period (one contract or package)**. Statuses: Not Started · Open · Defects Being Fixed · Closed.

| Tab | Fields |
|---|---|
| Details | DLP Reference, Contract / Package, Contractor |
| Period & Retention | DLP Start, DLP End, Retention Held |
| Defects | Defects Reported, Defects Closed, Closed (%) *calculated*, **Defects** table (Defect, Reported, Status ▾) |
| Close-Out | End-of-Period Inspection, Making Good Certificate, **Close-Out Checks** table (Check, Done ▾) |
| Notes | Notes |

## SQL

1. `SQL/v1427_con_commercial_handover_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1428_con_commercial_handover_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Velocity Freight builds its Northern Distribution Hub at Kestrel Park (24,000 m² warehouse, 3-storey office block, 42-dock yard, access road, utilities), design and build by the fictional Harbourline Construction Ltd. Site start 2 March 2026, practical completion 27 August 2027. Dated around today (11 Nov 2026): steel frame complete, roof and cladding under way, slab and MEP starting. The final query counts records per register.
