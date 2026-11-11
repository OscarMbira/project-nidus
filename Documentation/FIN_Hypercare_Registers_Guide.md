# Banking & Financial Services — Hypercare Registers

Guide to the registers under **Banking & Financial Services → Hypercare**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Hypercare Plan

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **project (the hypercare plan document)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Hypercare Lead, Hypercare Start, Hypercare End |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Support Model | Support Scope, Support Hours, **Support Tiers** table (Tier, Team, Handles), **On-Call Rota** table (Period, Role, Name, Contact), Contact Channels |
| Monitoring & KPIs | **KPIs** table (KPI, Target, Measured By), Monitoring Activities, **Daily Checks** table (Check, Time, Owner) |
| Incidents & Defects | **Severity Definitions** table (Severity, Definition, Example), **Response & Resolution Targets** table (Severity, Response, Resolution, Update Frequency), **Escalation Path** table (Level, Escalate To, When), Triage Meeting Cadence |
| Exit & Handover | **Exit Criteria** table (Criterion, Target, Evidence), Handover to Business-as-Usual, **Knowledge Transfer** table (Topic, From, To, Date), Lessons Learned |
| Risks & Roles | **Risks and Mitigations** table (Risk, Impact, Mitigation, Owner), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), **Related Documents** table (Document, Reference) |

## Daily Command Centre

One record per **hypercare day (daily stand-up and status)**. Statuses: Open · Closed.

| Tab | Fields |
|---|---|
| Details | Log Reference, Date, Hypercare Day, Chair, Overall RAG |
| Service Status | **Service Status** table (Service, Status ▾, Comment), **KPI Snapshot** table (KPI, Target, Actual, RAG ▾) |
| Issues | New Incidents, Open Incidents, New Defects, Open Defects, Support Requests Received, **Top Issues** table (Issue, Owner, Action) |
| Decisions & Actions | Decisions, **Actions** table (Action, Owner, Due Date, Status ▾) |
| Communication | Daily Summary, Summary Sent To |
| Notes | Notes |

## Incidents

One record per **production incident**. Statuses: Open · In Progress · Resolved · Closed.

| Tab | Fields |
|---|---|
| Details | Incident Reference, Priority, Category, Affected Service, Business Unit, Reported At, Reported By, Assigned Team, Assignee |
| Impact | Customers Affected, Branches Affected, Impact, Workaround |
| Resolution | Responded At, Resolved At, Time to Respond *calculated*, Time to Resolve *calculated*, Root Cause, Resolution, Linked Defect |
| Timeline | **Timeline** table (Time, Update, By) |
| Notes | Notes |

## Defects

One record per **defect found in hypercare**. Statuses: Open · In Progress · Resolved · Deferred · Closed.

| Tab | Fields |
|---|---|
| Details | Defect Reference, Severity, Defect Type, Component, Found Date, Raised By, Owner, Linked Incident |
| Analysis | Steps to Reproduce, Root Cause, Records Affected, Data Fix Required |
| Fix & Retest | Fix, Fix Release, Target Date, Fixed Date, Retest Result, Deployed to Production |
| Notes | Notes |

## Performance Monitoring

One record per **performance metric, with its readings**. Statuses: Nominal · Degraded · Critical.

| Tab | Fields |
|---|---|
| Details | Metric Reference, Metric, Component, Unit, Owner |
| Thresholds | Target, Warning Threshold, Critical Threshold |
| Latest Reading | Legacy Baseline, Latest Value, Variance against Baseline *calculated*, Latest Reading At |
| Readings | **Readings** table (Date, Period, Value, Status ▾) |
| Actions | Actions Taken, Linked Incident |
| Notes | Notes |

## User Support

One record per **staff support request**. Statuses: Open · In Progress · Resolved · Closed.

| Tab | Fields |
|---|---|
| Details | Ticket Reference, Request Type, Business Unit, Branch / Location, Raised By, Raised At, Channel, Priority, Assigned To |
| Resolution | Resolved At, Time to Resolve *calculated*, Resolved By, Resolution, Knowledge Article, Satisfaction (1–5) |
| Follow-Up | Training Gap Found, Follow-Up |
| Notes | Notes |

## Exit Criteria

One record per **hypercare exit criterion**. Statuses: Not Met · Met with Conditions · Met · Waived.

| Tab | Fields |
|---|---|
| Details | Criterion Reference, Category, Owner |
| Measurement | Measure, Target, Actual, Measured On, Trend |
| Evidence | **Evidence** table (Evidence, Reference) |
| Acceptance | Accepted By, Accepted Date, Conditions |
| Notes | Notes |

## SQL

1. `SQL/v1401_fin_hypercare_registers_fields.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1402_fin_hypercare_registers_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. The owner chose simulated hypercare samples (2026-11-09): the logs are dated in the hypercare period (Monday 12 April to Friday 7 May 2027) as if go-live has happened, so every screen shows realistic figures. They sit after today (9 Nov 2026), while the Go-Live registers still show the decisions as pending. The Hypercare Plan is one complete Draft document (one per project). The final query counts records per register.
