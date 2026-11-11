# Construction & Engineering — Construction Management & Sites Registers

Guide to the registers under **Construction & Engineering → Construction Management & Sites**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Construction Overview

One record per **monthly construction status report**. Statuses: Draft · In Review · Published.

| Tab | Fields |
|---|---|
| Details | Report Period, Period End, Prepared By, Overall RAG, Schedule RAG, Cost RAG, Safety RAG |
| Progress | Planned Progress (%), Actual Progress (%), Progress Variance (points) *calculated*, Contract Completion Date, Forecast Completion Date |
| Cost | Contract Sum, Approved Variations, Certified to Date, Forecast Final Cost, Forecast vs Contract Sum *calculated* |
| Safety & Workforce | Average Workforce on Site, Hours Worked in Period, Lost-Time Injuries, Near Misses Reported |
| Highlights | Achievements This Period, Planned Next Period, **Key Issues** table (Issue, Impact ▾, Action, Owner), Decisions Needed from the Client |
| Notes | Notes |

## Project Sites

One record per **site or work area**. Statuses: Planned · Active · Demobilising · Complete.

| Tab | Fields |
|---|---|
| Details | Site Code, Site Type, Address / Location, Area (m²), Site Manager, Start Date, End Date |
| Ownership & Constraints | Land Owner, Access Agreement Reference, Constraints, Neighbours |
| Utilities | **Utilities** table (Utility, Status ▾) |
| Environment | Ground Conditions, Contamination Found, Ecology Notes |
| Notes | Notes |

## Construction Packages

One record per **construction package**. Statuses: Planned · Tendering · Awarded · In Progress · Complete.

| Tab | Fields |
|---|---|
| Details | Package Code, Discipline, Zones, Contractor / Subcontractor, Package Manager, Contract Type |
| Scope | Scope, Interfaces with Other Packages |
| Value | Budget, Awarded Value, Award vs Budget *calculated*, Certified to Date, Certified (%) *calculated* |
| Dates | Tender Issued, Award Date, Planned Start, Planned Finish, Forecast Finish |
| Notes | Notes |

## Workfronts

One record per **active workfront**. Statuses: Planned · Open · Suspended · Closed.

| Tab | Fields |
|---|---|
| Details | Workfront Code, Zone, Location / Grid Lines, Package, Current Activity, Supervisor, Crew Size |
| Dates | Opened, Planned Close, Actual Close |
| Constraints | Permits in Force, Access Route, **Constraints** table (Constraint, Status ▾) |
| Progress | Unit, Planned Quantity, Completed Quantity, Complete (%) *calculated* |
| Notes | Notes |

## Construction Milestones

One record per **milestone**. Statuses: Upcoming · At Risk · Met · Missed.

| Tab | Fields |
|---|---|
| Details | Milestone Code, Milestone Type, Package, Owner |
| Dates | Baseline Date, Forecast Date, Actual Date, Forecast Variance (days, + = late) |
| Criteria | **Completion Criteria** table (Criterion, Met ▾) |
| Commercial | Payment Linked, Payment Value, Delay Damages per Day |
| Notes | Notes |

## Site Setup

One record per **site setup item**. Statuses: Not Started · In Progress · Blocked · Complete.

| Tab | Fields |
|---|---|
| Details | Item Code, Category, Location, Responsible, Supplier |
| Dates & Cost | Planned Start, Planned Finish, Actual Finish, Cost |
| Checks | **Checks Before Use** table (Check, Done ▾), Permits or Consents Needed |
| Notes | Notes |

## Site Access

One record per **access point or access rule**. Statuses: Pending · Granted · Suspended · Revoked.

| Tab | Fields |
|---|---|
| Details | Access Reference, Access Type, Location, Hours, Responsible |
| Controls | Control Method, Site Induction Required, PPE Required, Conditions of Access |
| Usage | Average Movements per Day, **Issues** table (Issue, Date, Action) |
| Notes | Notes |

## Site Logistics

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **site logistics plan (one per construction phase)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Logistics Manager, Site Location |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Site Layout | Layout Description, **Access Points** table (Gate, Use, Hours), **Laydown Areas** table (Area, Use, Size (m²)), Welfare Facilities |
| Traffic & Deliveries | Traffic Management Plan, Delivery Rules, Vehicle Routes, Delivery Hours |
| Storage & Handling | Storage Arrangements, Material Handling, **Cranes and Hoists** table (Equipment, Location, Period) |
| Security & Neighbours | Site Security, Neighbour Considerations, Noise & Dust Controls |
| Waste & Utilities | Waste Management, **Temporary Utilities** table (Utility, Source, Capacity) |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Site Facilities

One record per **welfare or site facility**. Statuses: Planned · Ordered · Installed · Removed.

| Tab | Fields |
|---|---|
| Details | Facility Code, Facility Type, Location, Capacity (people / units), Supplier |
| Cost & Dates | Hired or Owned, Weekly Cost, Installed, Planned Removal |
| Inspection | Cleaning Frequency, Last Inspection, Inspection Result |
| Notes | Notes |

## Site Diary

One record per **day on site**. Statuses: Open · Closed.

| Tab | Fields |
|---|---|
| Details | Date, Written By, Weather, Temperature (°C), Working Hours, Work Stopped by Weather |
| Workforce & Plant | **Workforce** table (Trade / Company, Number), Total Workforce, Plant on Site |
| Activities | Work Done, **Deliveries** table (Delivery, Supplier, Time), **Visitors** table (Visitor, Organisation, Purpose) |
| Issues & Instructions | Delays and Issues, Instructions Received, Safety Observations |
| Notes | Notes |

## Daily Progress

One record per **activity per day**. Statuses: Recorded · Verified · Queried.

| Tab | Fields |
|---|---|
| Details | Date, Zone, Package, Activity, Foreman, Crew Size |
| Quantities | Unit, Planned Today, Achieved Today, Daily Achievement (%) *calculated* |
| Cumulative | Cumulative Planned, Cumulative Achieved, Cumulative Achievement (%) *calculated* |
| Verification | Constraints, Verified By, Verified On |
| Notes | Notes |

## Site Closeout

One record per **closeout item**. Statuses: Open · In Progress · Closed.

| Tab | Fields |
|---|---|
| Details | Item Code, Category, Location, Responsible, Due Date, Completed |
| Checks & Evidence | **Checks** table (Check, Done ▾), **Evidence** table (Evidence, Reference), Signed Off By |
| Notes | Notes |

## SQL

1. `SQL/v1417_con_construction_management_sites_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1418_con_construction_management_sites_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Velocity Freight builds its Northern Distribution Hub at Kestrel Park (24,000 m² warehouse, 3-storey office block, 42-dock yard, access road, utilities), design and build by the fictional Harbourline Construction Ltd. Site start 2 March 2026, practical completion 27 August 2027. Dated around today (11 Nov 2026): steel frame complete, roof and cladding under way, slab and MEP starting. The final query counts records per register.
