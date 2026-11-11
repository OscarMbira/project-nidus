# Information Technology — Build, Integration & Data Registers

Guide to the registers under **Information Technology → Build, Integration & Data**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Environments

One record per **environment (development, test, SIT, UAT, production, DR …)**. Statuses: Not Provisioned · Provisioned · Ready · In Use · Issue · Decommissioned.

| Tab | Fields |
|---|---|
| Details | Environment Code, Environment Type, Purpose, Environment Owner, Hosting, Data Centre / Region, Needed By, Ready Date |
| Configuration | Application Version / Release, **Components** table (Component, Version, Notes), Test Data, Last Data Refresh, Refresh Frequency |
| Access & Bookings | Access Approver, Named Users, **Bookings** table (Team, From, To, Purpose) |
| Health & Cost | Availability Target (%), Monthly Running Cost, **Issues** table (Issue, Severity ▾, Owner, Status ▾) |
| Notes | Notes |

## Development Items

One record per **development backlog item**. Statuses: Not Started · In Progress · Blocked · Code Review · Built · Complete.

| Tab | Fields |
|---|---|
| Details | Item Reference, Item Type, Workstream, Priority, Developer, Sprint |
| Requirements | **Requirements** table (Reference, Requirement), Acceptance Criteria |
| Effort & Dates | Story Points, Estimate (hours), Actual (hours), Effort Variance (hours) *calculated*, Start Date, Target Date, Completed Date |
| Build & Quality | Repository / Branch, Code Review, Unit Test Coverage (%), Defects Found |
| Dependencies | **Dependencies** table (Dependency, Type ▾, Status ▾) |
| Notes | Notes |

## Code Reviews

One record per **code review (one change set)**. Statuses: Open · Changes Requested · Approved · Merged · Abandoned.

| Tab | Fields |
|---|---|
| Details | Review Reference, Development Item, Pull / Merge Request, Repository, Author, Review Type, Opened, Closed |
| Reviewers | **Reviewers** table (Reviewer, Decision ▾, Date) |
| Size & Checks | Files Changed, Lines Added, Lines Removed, **Automated Checks** table (Check, Result ▾), Test Coverage of Change (%) |
| Findings | **Findings** table (Finding, Severity ▾, File / Area, Resolved ▾), Rework (hours) |
| Notes | Notes |

## Interface Register

One record per **system interface**. Statuses: Not Started · In Design · Built · Testing · Ready · Live · Retired.

| Tab | Fields |
|---|---|
| Details | Interface ID, Source System, Target System, Interface Type, Direction (from the core), Timing, Business Owner, Technical Owner |
| Specification | Data Exchanged, Message Format, Protocol / Transport, Specification Reference |
| Volumes & Service Levels | Daily Volume (messages / records), Peak per Hour, Maximum Latency (seconds), Availability Target (%) |
| Security | Authentication, Encrypted in Transit, Data Classification |
| Testing | **Test Results** table (Test Phase, Result ▾, Date) |
| Notes | Notes |

## Integration Dependencies

One record per **integration dependency**. Statuses: Open · At Risk · Blocked · Resolved.

| Tab | Fields |
|---|---|
| Details | Dependency Reference, Dependency Type, Depends On, Provider Team, Provider Contact, Our Owner, RAG |
| Dates & Impact | Needed By, Committed Date, Delivered Date, Affected Interfaces, Impact if Late |
| Actions | **Actions** table (Action, Owner, Due Date, Status ▾), Escalated To |
| Notes | Notes |

## Data Sources

One record per **source system or data set**. Statuses: Identified · Connected · Profiled · Approved for Migration · Retired.

| Tab | Fields |
|---|---|
| Details | Source Code, System / Data Set, Data Domain, Data Owner, Data Steward, Records, Volume (GB) |
| Access | Connection Method, Extract Frequency, Access Approved, Access Date |
| Quality | Completeness (%), Accuracy (%), Validity (%), Data Quality Score (%) *calculated*, **Quality Issues** table (Issue, Records Affected, Action) |
| Classification | Data Classification, Contains Personal Data, Retention Rule |
| Notes | Notes |

## Data Models

One record per **data model**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Model Reference, Model Type, Data Domain, Modeller, Model Version |
| Entities | **Entities** table (Entity, Description, Key Attributes), Number of Entities |
| Rules & Standards | Business Rules, Naming Standard, Reference Data Used |
| Lineage | Source Systems, Consumers, Data Classification |
| Approval | Reviewed By, Approved By, Approval Date |
| Notes | Notes |

## Data Migration

One record per **migration object (customers, accounts, loans …)**. Statuses: Scoping · Migrating · Quality Check · Reconciled · Signed Off.

| Tab | Fields |
|---|---|
| Details | Object Code, Source Systems, Target Module, Business Owner, Migration Lead, Approach, Load Order |
| Volumes | Source Records, Loaded Records, Rejected Records, Load Rate (%) *calculated*, Reject Rate (%) *calculated* |
| Reconciliation | Source Balance, Target Balance, Balance Difference *calculated*, **Reconciliation Checks** table (Check, Result ▾, Comment) |
| Mocks & Sign-Off | **Mock Results** table (Mock, Date, Loaded %, Result ▾), Business Sign-Off By, Sign-Off Date |
| Notes | Notes |

## SQL

1. `SQL/v1411_ict_build_integration_data_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1412_ict_build_integration_data_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Same scenario as the v1374 Architecture samples: the Northbridge Bank technology programme replacing two legacy cores, go-live 10–12 April 2027. Dated around today (11 Nov 2026): SIT is under way, Mock 2 is being prepared, UAT starts in January 2027. The final query counts records per register.
