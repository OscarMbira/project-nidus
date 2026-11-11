# Information Technology — Testing, Technical Debt & Cybersecurity Registers

Guide to the registers under **Information Technology → Testing, Technical Debt & Cybersecurity**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Testing

One record per **test phase or cycle**. Statuses: Not Started · In Progress · Blocked · Passed · Passed with Conditions · Failed.

| Tab | Fields |
|---|---|
| Details | Test Reference, Test Type, Workstream, Test Lead, Environment |
| Schedule | Planned Start, Planned End, Actual Start, Actual End |
| Scope & Criteria | Scope, **Entry Criteria** table (Criterion, Met ▾), **Exit Criteria** table (Criterion, Met ▾) |
| Execution | Test Cases Planned, Executed, Passed, Failed, Blocked, Execution Rate (%) *calculated*, Pass Rate (%) *calculated* |
| Defects | Open Critical Defects, Open High Defects, Open Medium / Low Defects, **Key Defects** table (Defect, Severity ▾, Status ▾) |
| Sign-Off | Recommendation, Conditions, Signed Off By, Sign-Off Date |
| Notes | Notes |

## Technical Debt

One record per **technical debt item**. Statuses: Identified · Prioritised · In Remediation · Resolved · Accepted (Not Fixing).

| Tab | Fields |
|---|---|
| Details | Debt Reference, Category, Workstream, System / Component, Raised By, Owner, Date Identified |
| Cause & Impact | Cause, Impact if Not Fixed, Impact (1 = low, 5 = high), Urgency (1 = low, 5 = high), Priority Score *calculated* |
| Remediation | Remediation Plan, Effort to Fix (days), Target Release, Target Date, Resolved Date, **Linked Items** table (Reference, Item) |
| Notes | Notes |

## Security Requirements

One record per **security requirement**. Statuses: Draft · Approved · Implemented · Verified · Waived.

| Tab | Fields |
|---|---|
| Details | Requirement ID, Category, Source, Priority, Owner, Applies To |
| Control | Requirement, Control Reference, How It Is Met, Implemented In (release / item) |
| Verification | Verification Method, **Evidence** table (Evidence, Reference, Date), Result, Verified By, Verified Date |
| Waiver | Waiver Reason, Waiver Approved By, Waiver Expiry |
| Notes | Notes |

## Threat Assessment

One record per **threat assessment (one system or change)**. Statuses: Planned · In Progress · Complete – Actions Open · Complete.

| Tab | Fields |
|---|---|
| Details | Assessment Reference, System / Change in Scope, Method, Lead Assessor, Assessment Date, Next Review Date |
| Assets & Entry Points | **Assets** table (Asset, Classification ▾), Entry Points, Trust Boundaries |
| Threats | **Threats** table (Threat, Category ▾, Likelihood ▾, Impact ▾, Control) |
| Risk | Threats Identified, High Threats, Share of High Threats (%) *calculated*, Inherent Risk, Residual Risk |
| Actions | **Actions** table (Action, Owner, Due Date, Status ▾) |
| Notes | Notes |

## Vulnerabilities

One record per **vulnerability**. Statuses: Open · In Remediation · Closed · Risk Accepted · False Positive.

| Tab | Fields |
|---|---|
| Details | Vulnerability Reference, Found By, Affected Asset, Environment, Severity, Severity Score (0–10), Public Reference (CVE), Found Date, Owner |
| Remediation | Remediation, Fix Within (days), Due Date, Fixed Date, Retest Result |
| Risk Acceptance | Risk Accepted By, Reason, Acceptance Expiry |
| Notes | Notes |

## Penetration Testing

One record per **penetration test engagement**. Statuses: Planned · Scheduled · In Progress · Report Received · Retest · Complete.

| Tab | Fields |
|---|---|
| Details | Test Reference, Test Type, Approach, Testing Company / Team, Our Test Lead, Environment, Start Date, End Date |
| Scope & Authorisation | In Scope, Out of Scope, Rules of Engagement, Authorised By |
| Findings | Critical Findings, High Findings, Medium Findings, Low Findings, **Findings** table (Finding, Severity ▾, Vulnerability Ref, Status ▾) |
| Report & Retest | Report Reference, Report Date, Retest Date, Overall Result |
| Notes | Notes |

## SQL

1. `SQL/v1413_ict_testing_debt_cybersecurity_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1414_ict_testing_debt_cybersecurity_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Same scenario as the v1374 Architecture samples: the Northbridge Bank technology programme replacing two legacy cores, go-live 10–12 April 2027. Dated around today (11 Nov 2026): SIT cycle 1 is closing, the first external penetration test has reported and UAT, performance and DR tests are planned for 2027. The final query counts records per register.
