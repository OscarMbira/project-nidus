# Banking & Financial Services — Go-Live Registers

Guide to the registers under **Banking & Financial Services → Go-Live**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Production Deployment

One record per **deployment to production**. Statuses: Planned · Scheduled · In Progress · Complete · Failed · Backed Out.

| Tab | Fields |
|---|---|
| Details | Deployment Reference, Component, Deployment Type, Release / Version, Change Request Reference, Deployment Window, Environment, Owner |
| Schedule | Planned Start, Planned End, Planned Duration *calculated*, Actual Start, Actual End, Actual Duration *calculated* |
| Steps | Prerequisites, **Deployment Steps** table (Step, Action, Owner, Status ▾) |
| Verification | **Smoke Tests** table (Check, Result ▾, Checked By), Deployed By, Verified By |
| Backout | Backout Plan, Backout Tested, Backout Time (minutes) |
| Notes | Notes |

## Opening Balances

One record per **opening balance area**. Statuses: Pending · Loaded · Differences Found · Verified · Accepted with Explained Differences.

| Tab | Fields |
|---|---|
| Details | Balance Reference, Balance Area, General Ledger Range, Currency, Owner |
| Balances | Baseline Balance (latest mock), Baseline Source, Legacy Closing Balance, Loaded Opening Balance, Difference *calculated* |
| Accounts | Legacy Accounts, Loaded Accounts, Account Difference *calculated* |
| Reconciliation | Reconciliation Reference, **Differences** table (Item, Amount, Explanation, Status ▾) |
| Sign-Off | Verified By, Verification Date, Finance Approver, Approval Date |
| Notes | Notes |

## Day-1 Validation

One record per **Day-1 check**. Statuses: Pending · Passed · Passed with Issues · Failed.

| Tab | Fields |
|---|---|
| Details | Check Reference, Check Area, Check Type, Owner, Scheduled At, Frequency |
| Results | Expected Result, Actual Result, Sample Size, Exceptions, Exception Rate *calculated* |
| Evidence | Checked At, Checked By, Evidence Reference |
| Issues | **Issues** table (Issue, Severity ▾, Action, Owner, Status ▾) |
| Notes | Notes |

## Business Verification

One record per **business verification test set**. Statuses: Pending · In Progress · Verified · Issues Found.

| Tab | Fields |
|---|---|
| Details | Verification Reference, Business Unit, Verification Lead, Verification Window, Planned Start, Planned End |
| Results | Sample Records Selected, Records Checked, Records Matched, Match Rate *calculated*, **Checks** table (Check, Records, Result ▾, Comment) |
| Differences | **Differences Found** table (Record, Field, Legacy Value, New Value, Explanation), Differences Accepted |
| Sign-Off | Verified By, Verified At, Recommendation, Conditions |
| Notes | Notes |

## Technical Verification

One record per **technical verification area**. Statuses: Pending · In Progress · Verified · Issues Found.

| Tab | Fields |
|---|---|
| Details | Verification Reference, Component, Verification Type, Technical Lead, Planned Start |
| Checks | **Checks** table (Check, Expected, Result ▾, Evidence) |
| Results | Checks, Checks Passed, Pass Rate *calculated* |
| Issues | **Issues** table (Issue, Severity ▾, Action, Owner, Status ▾) |
| Sign-Off | Verified By, Verified At, Recommendation, Conditions |
| Notes | Notes |

## Go-Live Decision

One record per **formal go-live decision**. Statuses: Pending · Go · Go with Conditions · No-Go · Deferred.

| Tab | Fields |
|---|---|
| Details | Decision Reference, Decision Type, Decision Forum, Chair, Decision Due, Decision Date |
| Inputs | **Readiness Inputs** table (Input, Source, Status ▾, Comment), Open Critical Defects, Open High Defects, **Risks Accepted** table (Risk, Owner, Acceptance) |
| Decision | Rationale, **Conditions** table (Condition, Owner, Due Date, Status ▾), **Attendees and Votes** table (Name, Role, Vote ▾) |
| Communication | Communicated To, Communication Date, Minutes Reference |
| Notes | Notes |

## SQL

1. `SQL/v1399_fin_go_live_registers_fields.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1400_fin_go_live_registers_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Dated around today (9 Nov 2026): the production infrastructure build is complete, the go-live date and Release 1 scope decisions are recorded, and configuration loads are under way. Opening balances carry the latest mock baseline (Mock 2, 24 Oct 2026). Everything for the go-live weekend (9–12 April 2027) and Day 1 (Monday 12 April) is planned. The final query counts records per register.
