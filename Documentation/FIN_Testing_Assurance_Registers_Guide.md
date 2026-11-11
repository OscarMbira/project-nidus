# Banking & Financial Services — Testing & Assurance Registers

Guide to the Testing & Assurance registers of the Banking & Financial Services pack. The Testing
Strategy document is described in [Register Documents (v1318)](Register_Documents_v1318_Guide.md).

## SIT — System Integration Testing (v1368)

Each SIT record is one **SIT cycle** (Cycle 1, Cycle 2, Cycle 3 or Regression). Statuses follow the
cycle: Plan → Cases → Execution → Defects → Complete.

| Tab | Fields |
|---|---|
| Details | SIT reference, cycle, functional area (Data Scope product list), test lead, environment, build / release under test, planned and actual start and end |
| Scope & Interfaces | **Integration flows** table (flow, source system, target system, interface type ▾, priority ▾), in scope, out of scope, requirements covered |
| Entry & Readiness | Entry criteria, **readiness checks** table (check, owner, status ▾), environment ready, interfaces connected, test data ready |
| Test Cases | Total and automated test cases, **test sets** table (test set / scenario, cases, priority ▾, owner) |
| Execution | Executed, passed, failed, blocked, not run, pass rate %, **execution log** table (date, executed, passed, failed, blocked, comment) |
| Defects | Open critical / high / medium / low defects, **key defects** table (reference, summary, severity ▾, status ▾, owner) |
| Exit & Sign-Off | Exit criteria, exit criteria met, test summary report reference, signed off by, sign-off date, comments |
| Notes | **Risks and issues** table (risk / issue, impact, mitigation, owner), notes |

▾ = dropdown column. Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). All
fields are optional.

SQL: `SQL/v1368_fin_sit_fields.sql`, then the sample SIT cycles for SEED334-PRJ-08 `SQL/v1369_fin_sit_seed.sql` (10 records: a completed connectivity dry run, an early-start channels cycle in execution, Cycle 1 areas preparing cases, and planned Cycle 2, Cycle 3 and regression).

## Sanity Checks (v1370)

Each Sanity Checks record is one **sanity (smoke) check run** — on a new build, an environment or test
data refresh, a post-deployment change, or a phase entry gate. Statuses: Not Started → In Progress →
Complete → Rejected.

| Tab | Fields |
|---|---|
| Details | Check reference, check type, build / release, environment, functional area, run date, run by |
| Check Results | **Checks** table (check, area, expected result, result ▾ Pass / Fail / Blocked / Not run, comment), total / passed / failed / blocked |
| Environment & Data | Configuration / parameter version, test data snapshot, **interfaces checked** table (interface, status ▾, comment) |
| Outcome | Outcome (accepted / accepted with known issues / rejected / pending), **defects raised** table (reference, summary, severity ▾), decision by, decision date, next action |
| Notes | Notes |

SQL: `SQL/v1370_fin_sanity_checks_fields.sql`, then 10 sample runs for SEED334-PRJ-08
`SQL/v1371_fin_sanity_checks_seed.sql` (builds 1.0.12 rejected → 1.0.16 running, refreshes, SIT and UAT
entry gates).

## UAT, Regression, Performance, Security, DR and Operational Readiness Testing (v1372)

Each record is one test run or activity. All six share **Details** (reference, type, functional area,
environment, lead, planned / actual dates), **Defects** (table: ref, summary, severity ▾, status ▾,
owner), **Exit & Sign-Off** (exit criteria, met, report, signed off by / date) and **Notes** (risks and
issues table), plus:

| Register | Own tabs / fields | Statuses added |
|---|---|---|
| UAT | Round ▾, business unit; **Scenarios** (business scenarios table with result ▾, testers); **Execution** counts; acceptance decision and conditions | Accepted, Rejected |
| Regression Testing | Type ▾, build; **Execution** (pack size, automated, executed, passed, failed, pass rate, duration, results-by-area table) | Failed – Rerun |
| Performance Testing | Type ▾ (load, stress, endurance, spike, volume, batch); **Targets & Results** (workload model: target vs achieved, result ▾; peak users, TPS, CPU, batch duration); **Analysis** (bottlenecks, tuning actions table) | Targets Not Met |
| Security Testing | Type ▾, tested by ▾; **Scope**; **Findings** (findings table with severity ▾ and status ▾, counts by severity, remediation due, retest date) | Remediation |
| DR Testing | Type ▾ (failover, failback, backup and restore, component switch), DR runbook; **Recovery Objectives** (per system: RTO / RPO target vs achieved, result ▾; data loss, failback completed); **Execution** log | Objectives Not Met |
| Operational Readiness Testing | Operational area ▾, support team; **Scenarios** (scenario, SOP, team, result ▾); **Readiness** (SOPs verified, team trained, monitoring in place, handover accepted) | Not Ready |

**Dress Rehearsal Strategy** (document): Risks and Mitigations, Roles and Responsibilities, Timing
Targets and Participants are now tables, and a **Rehearsal Schedule** table (rehearsal, date, scope,
environment, status ▾) is added.

SQL: `SQL/v1372_fin_testing_registers_fields.sql`, then the samples for SEED334-PRJ-08
`SQL/v1373_fin_testing_registers_seed.sql` — 10 records per register (completed runs in Oct–Nov 2026
with results, current runs, planned runs up to go-live) and one complete Dress Rehearsal Strategy.
