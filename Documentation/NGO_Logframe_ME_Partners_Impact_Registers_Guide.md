# NGO / Development — Logframe, M&E, Partners, Impact & Learning Registers

Guide to the registers under **NGO / Development → Logframe, M&E, Partners, Impact & Learning**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Logical Framework

One record per **logframe result (goal, outcome or output)**. Statuses: Draft · In Review · Approved · Revised.

| Tab | Fields |
|---|---|
| Details | Result Code, Level, Contributes To, Programme, Responsible |
| Result | Result Statement |
| Indicators | **Indicators** table (Indicator, Baseline, Target, Means of Verification) |
| Assumptions & Risks | Assumptions, Risks |
| Revisions | Logframe Version, Approved By, Approved, **Change Log** table (Version, Date, Change) |
| Notes | Notes |

## Results Framework

One record per **indicator**. Statuses: Draft · Approved · On Track · Off Track · Achieved · Dropped.

| Tab | Fields |
|---|---|
| Details | Indicator Code, Result Level, Linked Result, Unit, Disaggregated By |
| Targets & Progress | Baseline, Baseline Year, End Target, Current Value, Achieved (% of target) *calculated*, Last Updated |
| Data Collection | Data Source, Collection Method, Frequency, Responsible |
| Data Quality | Last Data Quality Check, Data Quality Rating |
| Notes | Notes |

## M&E Tracking

One record per **M&E activity (survey, review, evaluation)**. Statuses: Baseline · Targets Set · Data Collection · Results · Evaluated.

| Tab | Fields |
|---|---|
| Details | M&E Reference, Activity Type, Programme, Countries, Lead, External Evaluator |
| Plan | Planned Start, Planned End, Actual End, Method, Indicators Covered, Budget |
| Data Collection | Planned Sample, Achieved Sample, Achieved (% of sample) *calculated*, Consent and Ethics Approval |
| Findings | Key Findings, **Recommendations** table (Action, Owner, Due Date, Status ▾), Report Reference |
| Notes | Notes |

## Partner Register

One record per **implementing partner**. Statuses: Due Diligence · Agreement · Active · Closeout · Not Selected.

| Tab | Fields |
|---|---|
| Details | Partner Code, Partner Type, Country, Director, Contact Email, Registration Number |
| Capacity | Governance (1 = weak, 5 = strong), Financial Management (1 = weak, 5 = strong), Programme Quality (1 = weak, 5 = strong), Safeguarding (1 = weak, 5 = strong), Monitoring and Evaluation (1 = weak, 5 = strong), Capacity Score *calculated*, Partner Risk Rating, Capacity Strengthening Plan |
| Agreement | Sub-Grant Agreement, Programme, Sub-Grant Value, Disbursed, Disbursed (%) *calculated*, Start, End |
| Audit & Compliance | Due Diligence Completed, Last Audit, Audit Opinion, **Audit Findings** table (Finding, Rating ▾, Status ▾), Safeguarding Policy in Place, Anti-Fraud Policy in Place |
| Notes | Notes |

## Impact Assessment

One record per **impact assessment or evaluation study**. Statuses: Planned · In Progress · Complete.

| Tab | Fields |
|---|---|
| Details | Assessment Reference, Type, Programme, Evaluator, Start, End |
| Design | Design, Evaluation Questions, Sample Size |
| Findings | **Impact Measures** table (Measure, Baseline, Endline / Latest, Change), Key Findings, Cost per Beneficiary |
| Use of Findings | **Recommendations** table (Action, Owner, Due Date, Status ▾), Management Response, Shared With, Report Reference |
| Notes | Notes |

## Programme Closeout

One record per **closeout task**. Statuses: Open · In Progress · Closed.

| Tab | Fields |
|---|---|
| Details | Closeout Reference, Programme, Task, Responsible, Due, Completed |
| Audit & Finance | Final Audit Required, Final Audit Opinion, Unspent Funds, Refund Due to the Donor |
| Checks & Evidence | **Checks** table (Check, Done ▾), **Evidence** table (Evidence, Reference), Signed Off By |
| Notes | Notes |

## SQL

1. `SQL/v1431_ngo_logframe_me_partners_impact_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1432_ngo_logframe_me_partners_impact_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Riverside Aid International runs the Safe Water and Resilient Livelihoods (SWRL) programme in Kenya, Uganda and Tanzania, April 2025 – March 2028, plus nine smaller programmes in East Africa. Donors and partners are fictional. Dated around today (11 Nov 2026): year 2, mid-term review planned for January 2027. The final query counts records per register.
