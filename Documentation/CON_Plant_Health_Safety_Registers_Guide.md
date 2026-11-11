# Construction & Engineering — Plant, Equipment, Health & Safety Registers

Guide to the registers under **Construction & Engineering → Plant, Equipment, Health & Safety**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Equipment Register

One record per **item of plant or equipment**. Statuses: Mobilised · Allocated · Available · Under Repair · Demobilised.

| Tab | Fields |
|---|---|
| Details | Plant ID, Equipment Type, Size / Capacity, Owner / Hire Company, Hired or Owned, Operator, Zone |
| Hire | On Hire, Planned Off Hire, Weekly Rate |
| Compliance | Thorough Examination Due, Last Service, Certificate Reference, Operator Card Checked |
| Utilisation | Hours Available This Month, Hours Used This Month, Utilisation (%) *calculated* |
| Notes | Notes |

## Equipment Maintenance

One record per **maintenance job or examination**. Statuses: Scheduled · Overdue · In Progress · Complete.

| Tab | Fields |
|---|---|
| Details | Maintenance Reference, Plant ID, Equipment, Type, Scheduled, Completed, Done By, Hour Meter Reading |
| Work Done | **Checks** table (Check, Result ▾), Parts Replaced |
| Cost & Next | Downtime (hours), Cost, Next Due |
| Notes | Notes |

## HSE Plan

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **HSE plan (main contractor and each subcontractor)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, HSE Manager, Site Location, Peak Workforce |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Policy & Objectives | HSE Policy Statement, HSE Objectives, Legal Requirements, Standards Applied |
| Hazards & Controls | High-Risk Activities, Major Hazards, Risk Assessment Approach, Control Measures |
| Safe Systems of Work | Permit to Work System, Method Statements Required, PPE Requirements, Site Rules |
| Training & Competence | Induction Requirements, **Training Matrix** table (Role, Training, Refresh), Toolbox Talk Frequency |
| Emergency Preparedness | Emergency Procedures, First Aid Arrangements, **Emergency Contacts** table (Service, Contact), Evacuation Drill Frequency |
| Environment | Environmental Aspects, Waste Management, Pollution Prevention |
| Monitoring & Reporting | **Inspections and Audits** table (Inspection, Frequency, By), **HSE KPIs** table (KPI, Target), Incident Reporting Procedure, Near-Miss Reporting in Place |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Risk Assessments

One record per **risk assessment (one activity)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Risk Assessment Reference, Activity, Zone, Company, Assessor, Assessed, Review By, Method Statement |
| Hazards & Controls | **Hazards and Controls** table (Hazard, Who Is at Risk, Risk Before ▾, Control, Risk After ▾), Overall Risk Before Controls, Overall Risk After Controls |
| Approval & Briefing | Approved By, Approved, Workers Briefed |
| Notes | Notes |

## Method Statements

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **method statement (one activity)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Activity, Work Location, Supervisor, Planned Start |
| Scope of Work | Scope Description, **Sequence of Works** table (Step, Activity, Responsible) |
| Resources | **Labour** table (Role, Number), **Plant and Equipment** table (Plant, Number), Materials, Competence Requirements |
| Hazards & Controls | Hazards, Control Measures, PPE Required, Permits Required |
| Quality & Emergency | Quality Checks, Hold Points, Emergency Arrangements, Environmental Controls |
| Briefing | **Briefing Record** table (Name, Company, Date) |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Toolbox Talks

One record per **toolbox talk**. Statuses: Planned · Delivered · Cancelled.

| Tab | Fields |
|---|---|
| Details | Talk Reference, Topic, Date, Delivered By, Company, Zone, Duration (minutes), Language |
| Content | Key Points, Related Incident or Near Miss |
| Attendance | Attendees, Attendance Sheet Reference, Questions Raised |
| Notes | Notes |

## Safety Inspections

One record per **safety inspection**. Statuses: Scheduled · Complete – Actions Open · Complete.

| Tab | Fields |
|---|---|
| Details | Inspection Reference, Inspection Type, Zone, Inspector, Date |
| Score | Items Checked, Items Compliant, Compliance (%) *calculated* |
| Findings | **Findings** table (Finding, Severity ▾, Action Owner, Due), Good Practice Seen |
| Notes | Notes |

## Incidents

One record per **incident**. Statuses: Open · Under Investigation · Actions Open · Closed.

| Tab | Fields |
|---|---|
| Details | Incident Reference, Incident Type, Severity, Date, Time, Zone, Location, Company, People Involved, What Happened, Immediate Action |
| Details | Incident Reference, Incident Type, Severity, Date, Time, Zone, Location, Company, People Involved, What Happened, Immediate Action |
| Reporting | Reportable to the Authority, Reported to the Authority, Days Lost |
| Investigation | Investigator, Root Cause Category, Root Cause, **Corrective Actions** table (Action, Owner, Due Date, Status ▾), Closed |
| Notes | Notes |

## Near Misses

One record per **near miss**. Statuses: Reported · Reviewed · Action Raised · Closed.

| Tab | Fields |
|---|---|
| Details | Near Miss Reference, Date, Reported By, Company, Zone, Location, Category, Could Have Caused, What Happened, Immediate Action |
| Details | Near Miss Reference, Date, Reported By, Company, Zone, Location, Category, Could Have Caused, What Happened, Immediate Action |
| Review | Reviewed By, Reviewed, Lessons Learned, Corrective Action |
| Notes | Notes |

## Corrective Actions

One record per **corrective action**. Statuses: Open · In Progress · Overdue · Closed.

| Tab | Fields |
|---|---|
| Details | Action Reference, Source, Source Reference, Owner, Priority, Raised, Due |
| Action | Action, Closed |
| Verification | Verified By, Verified, Effective, **Evidence** table (Evidence, Reference) |
| Notes | Notes |

## SQL

1. `SQL/v1423_con_plant_health_safety_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1424_con_plant_health_safety_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Velocity Freight builds its Northern Distribution Hub at Kestrel Park (24,000 m² warehouse, 3-storey office block, 42-dock yard, access road, utilities), design and build by the fictional Harbourline Construction Ltd. Site start 2 March 2026, practical completion 27 August 2027. Dated around today (11 Nov 2026): steel frame complete, roof and cladding under way, slab and MEP starting. The final query counts records per register.
