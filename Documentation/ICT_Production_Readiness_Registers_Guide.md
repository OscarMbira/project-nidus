# Information Technology — Production Readiness Registers

Guide to the registers under **Information Technology → Production Readiness**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Operational Readiness

One record per **readiness item for a service**. Statuses: Not Ready · In Progress · At Risk · Ready · Accepted by Operations.

| Tab | Fields |
|---|---|
| Details | Readiness Reference, Readiness Area, Service, Owner, RAG, Due Date, Completed Date |
| Criteria & Evidence | **Acceptance Criteria** table (Criterion, Met ▾), **Evidence** table (Evidence, Reference) |
| Handover | Receiving Team, Handover Date, Accepted By, Acceptance Date |
| Issues | **Issues** table (Issue, Severity ▾, Action, Owner) |
| Notes | Notes |

## Monitoring

One record per **monitor (one service and type)**. Statuses: Not Started · In Progress · Tested · Ready · Live.

| Tab | Fields |
|---|---|
| Details | Monitor Reference, Service, Monitor Type, Monitoring Tool, Owner, Environment |
| Thresholds | **Metrics and Thresholds** table (Metric, Warning, Critical, Unit), Check Every (minutes) |
| Alerting | Alert Goes To, Notify By, Alerts Out of Hours, Runbook |
| Dashboard | Dashboard, Dashboard Audience |
| Testing | Tested On, Test Result |
| Notes | Notes |

## Logging & Alerting

One record per **log source**. Statuses: Not Started · In Progress · Tested · Ready · Live.

| Tab | Fields |
|---|---|
| Details | Log Source Reference, System, Log Type, Owner, Environment |
| Collection & Retention | Collection Method, Sent To, Daily Volume (GB), Kept For (days), Retention Reason, Contains Personal Data, Masking Applied |
| Alert Rules | **Alert Rules** table (Rule, Priority ▾, Route To) |
| Testing | Tested On, Test Result |
| Notes | Notes |

## Support Model

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **support model document (one service)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Service Owner, Support Start, Service Hours |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Services & Tiers | Services Supported, **Tier Structure** table (Tier, Team, Handles), **Support Teams** table (Team, Hours, Contact), **Supplier Support** table (Supplier, Service, Cover) |
| Service Levels | **Priority Definitions** table (Priority, Definition, Example), **Service Levels** table (Priority, Response, Resolution) |
| Processes | Incident Process, Problem Process, Change Process, Request Process |
| Tools & Transition | Service Desk Tool, Knowledge Base, Monitoring Tools, Handover Criteria, Training Plan |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Runbooks

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **runbook**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Service / System, Runbook Owner, Runbook Type |
| Overview | Purpose, Trigger Conditions, Prerequisites, Access Required |
| Procedure | **Steps** table (Seq, Step, Expected Result), Estimated Duration (minutes) |
| Verification & Escalation | Verification Checks, Rollback Steps, **Escalation Contacts** table (Level, Contact, When), Known Issues |
| Maintenance | Last Tested, Review Frequency |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Disaster Recovery

Document register (sign-off, versions, Word / PDF export). In Review and Approved are set only by the Sign-off tab. One record per **disaster recovery plan (one service)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, DR Owner, Last DR Test, Next DR Test |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Objectives | Systems in Scope, Recovery Time Objective (hours), Recovery Point Objective (hours), Recovery Tier |
| DR Strategy | DR Strategy, DR Site, Replication Approach |
| Backup | **Backup Schedule** table (Data / System, Backup Type, Frequency), **Backup Retention** table (Backup, Kept For), Off-site Copy |
| Procedures | Invocation Criteria, Recovery Steps, Failback Steps |
| Testing & Contacts | DR Test Types, Test Results, Readiness Issues, **DR Team** table (Role, Name, Contact), **Supplier Contacts** table (Supplier, Service, Contact) |
| Risks & Roles | **Risks and Mitigations** table (Risk, Mitigation), **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), Related Documents |

## Go-Live & Hypercare

One record per **go-live (one release or service)**. Statuses: Pending · No-Go / Deferred · Go-Live · Hypercare · Stabilised.

| Tab | Fields |
|---|---|
| Details | Release Reference, Systems Going Live, Go-Live Date, Go-Live Window, Release Manager, Decision Owner |
| Go / No-Go | **Go / No-Go Criteria** table (Criterion, Status ▾), Decision, Decision Date, Conditions |
| Rollback | Point of No Return, Rollback Plan, Rollback Used |
| Hypercare | Hypercare Start, Hypercare End, P1 Incidents, P2 Incidents, All Incidents, **Hypercare Exit Criteria** table (Criterion, Met ▾), Handed Over To, Stabilised On |
| Notes | Notes |

## SQL

1. `SQL/v1415_ict_production_readiness_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1416_ict_production_readiness_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Same scenario as the v1374 Architecture samples: the Northbridge Bank technology programme replacing two legacy cores, go-live 10–12 April 2027. Dated around today (11 Nov 2026): monitoring, logging and support are being built, earlier small go-lives are stabilised and Release 1 is pending. Documents are Draft. The final query counts records per register.
