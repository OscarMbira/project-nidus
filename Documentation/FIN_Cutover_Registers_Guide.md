# Banking & Financial Services — Cutover Registers

Guide to the eleven registers under **Banking & Financial Services → Cutover**. The three document
registers (Cutover Strategy, Cutover Plan, Rollback Plan) are also described in
[Register Documents (v1318)](Register_Documents_v1318_Guide.md). The migration run itself is tracked in
the [Data Migration Runbook (v1337)](FIN_Data_Migration_Runbook_v1337_Guide.md).

The registers share two option lists:
- **Cutover Phase:** Preparation, Freeze, Final migration, Technical cutover, Business validation, Go/No-Go, Go-live, Hypercare. These are the same values as the Strategy and Plan "Cutover Phases" field.
- **Cutover Event:** Mock migration, Dress rehearsal 1–3, Go-live weekend.

Fields marked *calculated* are worked out when the record is saved and can't be typed. ▾ marks a dropdown column. Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). All fields are optional.

## Document registers (v1322, tables v1394)

One current document per project; versions are kept in the Version History table.

| Register | Tabs | Tables |
|---|---|---|
| Cutover Strategy | Details · Introduction · Cutover Approach · Freeze & Continuity · Go/No-Go & Governance · Rollback · Risks & Roles · Glossary & Appendices · Document Control | Key milestones (milestone, target date, owner), services and channels impacted (service / channel, impact, downtime window), decision points (when, decision point, decision owner), escalation path (escalate to, when / threshold), risks and mitigations, roles and responsibilities, glossary, appendices, version history, related documents (document, reference) |
| Cutover Plan | Details · Introduction · Timeline · Prerequisites · Communications · Validation & Go-Live · Contingency · Risks & Roles · Glossary & Appendices · Document Control | Activity runsheet (seq, activity, owner, start, duration), checkpoints (checkpoint, time, decision owner; also holds the go/no-go checkpoints), communication schedule, contact list, risks, roles, glossary, appendices, version history, related documents |
| Rollback Plan | Details · Introduction · Triggers & Decision · Procedure · Data & Transactions · Validation & Communication · Testing · Risks & Roles · Glossary & Appendices · Document Control | Rollback steps (seq, step, owner, duration), systems to restore (system, restore order, owner), backups required (backup, taken at, verified ▾), post-rollback checks (check, owner, result ▾), communication plan (audience, message, when, owner), risks, roles, glossary, appendices, version history, related documents |

## Cutover Activities

One record per **cutover activity**, the detailed version of a line in the Cutover Plan runsheet. Statuses: Not Started → In Progress → Complete, plus Blocked and Skipped.

| Tab | Fields |
|---|---|
| Details | Activity reference, cutover event, phase, run order, activity type, owner, team, on critical path, can run in parallel |
| Schedule | Planned start and end, actual start and end (date and time); planned duration, actual duration and over / under plan *calculated* |
| Dependencies | Predecessors, successors, systems involved |
| Execution | Instructions, completion evidence, verified by, **issues raised** table (issue, impact, action, owner) |
| Notes | Notes |

## Cutover Dependencies

One record per **dependency** the cutover relies on, or that relies on the cutover. Statuses: Open → At Risk → Resolved, plus Closed – Not Needed.

| Tab | Fields |
|---|---|
| Details | Dependency reference, type (internal technical / business, third party, regulatory, infrastructure), direction, provided by, needed by (team), phase, owner, criticality, needed-by date, committed date |
| Impact | Impact if missed, affected activities, workaround |
| Tracking | RAG status, confirmation received, confirmation reference, **progress updates** table (date, update, by) |
| Notes | Notes |

## Command Centre

One record per **command-centre log entry** (issue, incident, decision, status update, escalation, risk or action) during a mock, rehearsal or the go-live weekend. Statuses: Open → Monitoring → Escalated → Closed.

| Tab | Fields |
|---|---|
| Details | Log reference, entry type, cutover event, phase, workstream, severity, logged at, logged by |
| Response | Assigned to, **actions taken** table (time, action, by), resolution, resolved at; time to resolve *calculated* |
| Escalation | Escalated, escalated to, decision required, decision |
| Impact | Impact on timeline (minutes), affected activities, runbook / activity reference |
| Notes | Notes |

## Go / No-Go

One record per **decision checkpoint**. Statuses: Pending → Go / Go with Conditions / No-Go, plus Deferred.

| Tab | Fields |
|---|---|
| Details | Checkpoint reference, cutover event, phase, checkpoint order, scheduled at, decision forum, chair |
| Criteria | **Criteria** table (criterion, owner, status ▾ Met / Met with conditions / Not met / Not assessed, evidence) |
| Readiness | Open critical and high defects, reconciliation status, schedule variance (minutes), readiness summary |
| Decision | Decision time, rationale, conditions, **attendees and votes** table (name, role, vote ▾), rollback invoked, next checkpoint |
| Notes | Notes |

## Cutover Communications

One record per **message** to customers, staff, the regulator, partners or executives. Statuses: Planned → Approved → Sent, plus Cancelled.

| Tab | Fields |
|---|---|
| Details | Communication reference, type, audiences (multi-select), channels (multi-select), phase, sender, approver |
| Schedule | Scheduled send, actual send, trigger / condition, approval date |
| Content | Key messages, message, call to action, contact point for questions |
| Tracking | Recipients, delivered; delivery rate *calculated*; feedback and queries |
| Notes | Notes |

## Business Readiness

One record per **business unit** assessed for the go-live. Statuses: Not Ready → At Risk → Ready with Conditions → Ready.

| Tab | Fields |
|---|---|
| Details | Readiness reference, business unit, readiness owner, assessed for (event), assessment date, overall RAG |
| People | Staff impacted, staff trained; training completion *calculated*; super users assigned, cutover roster confirmed |
| Process | Procedures updated, manual workarounds ready, freeze-period procedures, business continuity confirmed |
| Checklist | **Readiness checks** table (check, owner, status ▾, due date) |
| Gaps & Sign-Off | **Gaps and actions** table (gap, action, owner, due date), confirmed by, confirmation date |
| Notes | Notes |

## Technology Readiness

One record per **system or component** assessed for the go-live. Statuses: Not Ready → At Risk → Ready with Conditions → Ready.

| Tab | Fields |
|---|---|
| Details | Readiness reference, component type, system / component, environment (production, DR, both), technical owner, assessed for, assessment date, overall RAG |
| Build & Deploy | Build / version, configuration baselined, deployed to production, deployment date |
| Operations | Monitoring in place, backups verified, DR failover tested, batch schedule ready, production access provisioned, performance verified, security cleared |
| Checklist | **Readiness checks** table (check, owner, status ▾, due date) |
| Issues & Sign-Off | **Open issues** table (issue, severity ▾, action, owner), confirmed by, confirmation date |
| Notes | Notes |

## Cutover Sign-Off

One record per **formal sign-off**: strategy or plan baseline, rehearsal exit, business or technical readiness, final reconciliation, business verification, go-live approval, and cutover closure. Statuses: Pending → Signed Off / Signed Off with Conditions / Rejected. Mirrors Migration Sign-Off.

| Tab | Fields |
|---|---|
| Details | Sign-off reference, type, cutover event, sign-off coordinator, requested date, due date |
| Approvers | **Approvers** table (department, name, role, decision ▾, date) |
| Evidence | **Evidence reviewed** table (evidence, reference), open defects at sign-off, reconciliation reference, conditions / caveats |
| Decision | Decision, decision date, decision comments |
| Notes | Notes |

## SQL

1. `SQL/v1394_fin_cutover_registers_fields.sql` — the fields, tabs and status workflows for the eight registers, and the table conversions for the three documents. Needs v1375 (date-and-time and calculated fields).
2. `SQL/v1395_fin_cutover_registers_seed.sql` — sample data for SEED334-PRJ-08:
   - 10 records each for the eight registers;
   - one complete document each for Cutover Strategy (approved), Cutover Plan (draft) and Rollback Plan (draft).

   The samples follow the go-live weekend of 9–12 April 2027:
   - the mock migrations in Sep–Oct 2026 have real command-centre entries, go/no-go decisions and sign-offs;
   - preparation work is in progress;
   - the dress rehearsals and the go-live weekend are planned.

   The final query counts records per register.
3. `SQL/v1396_fin_cutover_list_fields_to_tables.sql` — the field audit (2026-11-09) turned list fields whose lines have several parts into tables:
   - Strategy: Decision Points, Escalation Path, Services and Channels Impacted, Related Documents.
   - Plan: Related Documents. Go/No-Go Checkpoints is merged into Checkpoints.
   - Rollback Plan: Systems to Restore, Backups Required, Post-Rollback Checks, Communication Plan, Related Documents.
   - Sign-Off: Evidence Reviewed.

   Saved lines are converted to rows. Every other list field holds one statement per line, so it stays a list.
