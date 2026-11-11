# Construction & Engineering — Quality Control & Progress Measurement Registers

Guide to the registers under **Construction & Engineering → Quality Control & Progress Measurement**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## ITPs

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **inspection and test plan (one work package)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Work Package, Discipline, Contractor |
| References | Specifications, Drawings, Standards |
| Activities | **Inspection and Test Activities** table (Activity, Check / Test, Acceptance Criteria, Point ▾) |
| Inspection Points | Hold Points, Witness Points, Surveillance Points, Review Points |
| Responsibilities & Records | Contractor Responsibilities, Client Responsibilities, Third-Party Inspection, Records Required |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Quality Inspections

One record per **quality inspection**. Statuses: Scheduled · Passed · Passed with Comments · Failed.

| Tab | Fields |
|---|---|
| Details | Inspection Reference, ITP Reference, Activity, Inspection Point, Zone, Location, Contractor, Inspector, Date |
| Checks | **Checks** table (Check, Result ▾) |
| Result | Defects Found, NCR Reference, Photo Reference |
| Notes | Notes |

## Test Certificates

One record per **test certificate**. Statuses: Pending · Issued · Rejected · Superseded.

| Tab | Fields |
|---|---|
| Details | Certificate Reference, Test, Element / System, Zone, Issued By, Standard / Specification |
| Dates & Result | Tested, Issued, Result, Linked Test Record |
| Filing | Received By, Handover File Section |
| Notes | Notes |

## NCRs

One record per **non-conformance report**. Statuses: Open · In Progress · Awaiting Verification · Closed.

| Tab | Fields |
|---|---|
| Details | NCR Reference, Raised By, Raised, Responsible Contractor, Zone, Location, Category, Severity, Non-Conformance, Requirement Not Met |
| Details | NCR Reference, Raised By, Raised, Responsible Contractor, Zone, Location, Category, Severity, Non-Conformance, Requirement Not Met |
| Disposition | Disposition, Root Cause, Corrective Action, Due |
| Close-Out | Cost to Fix, Verified By, Closed |
| Notes | Notes |

## Snag / Punch List

One record per **snag item**. Statuses: Open · In Progress · Ready to Inspect · Closed.

| Tab | Fields |
|---|---|
| Details | Snag Reference, Zone, Room / Location, Trade, Category, Priority |
| Close-Out | Raised By, Raised, Responsible, Due, Closed, Verified By, Photo Reference |
| Notes | Notes |

## Corrective Actions

One record per **quality corrective action**. Statuses: Open · In Progress · Overdue · Closed.

| Tab | Fields |
|---|---|
| Details | Action Reference, Source, Source Reference, Owner, Priority, Raised, Due |
| Action | Action, Prevents Recurrence (preventive), Closed |
| Verification | Verified By, Effective, **Evidence** table (Evidence, Reference) |
| Notes | Notes |

## Progress Measurement

One record per **package progress measurement for a period**. Statuses: Planned · Actual Recorded · Earned Value Calculated · Agreed.

| Tab | Fields |
|---|---|
| Details | Period, Period End, Package, Measured By |
| Physical Progress | Planned Progress (%), Actual Progress (%), **Key Quantities** table (Item, Unit, Planned to Date, Done to Date) |
| Earned Value | Budget at Completion, Planned Value, Earned Value, Actual Cost, Schedule Variance (EV − PV) *calculated*, Cost Variance (EV − AC) *calculated*, Schedule Performance (EV ÷ PV, %) *calculated*, Cost Performance (EV ÷ AC, %) *calculated* |
| Commentary | Commentary |
| Notes | Notes |

## Delays

One record per **delay event**. Statuses: Identified · Assessed · Being Mitigated · Resolved.

| Tab | Fields |
|---|---|
| Details | Delay Reference, Cause, Risk Owner Under the Contract, Zone |
| Impact | Start, End, Delay (working days), On the Critical Path, Affected Activities, Affected Milestones, Cost Impact |
| Response | What Happened, Mitigation |
| Contract | Contract Notice Given, Notice Date, Claim Reference |
| Notes | Notes |

## Recovery Plans

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **recovery plan**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Recovery Owner, Current Delay (days), Target Recovery Date |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Delay Analysis | Delay Description, Delay Categories, Root Causes, Critical Activities Affected |
| Recovery Strategy | Acceleration Options, **Recovery Measures** table (Measure, Owner, Days Recovered), **Revised Milestones** table (Milestone, Original Date, Revised Date) |
| Cost & Resources | Additional Cost, **Additional Resources** table (Resource, Quantity, Period), Funding Approval Required |
| Monitoring | Progress Indicators, Review Frequency, Early-Warning Triggers |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## SQL

1. `SQL/v1425_con_quality_progress_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1426_con_quality_progress_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Velocity Freight builds its Northern Distribution Hub at Kestrel Park (24,000 m² warehouse, 3-storey office block, 42-dock yard, access road, utilities), design and build by the fictional Harbourline Construction Ltd. Site start 2 March 2026, practical completion 27 August 2027. Dated around today (11 Nov 2026): steel frame complete, roof and cladding under way, slab and MEP starting. The final query counts records per register.
