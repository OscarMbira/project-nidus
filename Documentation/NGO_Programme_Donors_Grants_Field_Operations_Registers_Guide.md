# NGO / Development — Programme, Donors, Grants & Field Operations Registers

Guide to the registers under **NGO / Development → Programme, Donors, Grants & Field Operations**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Programme Overview

One record per **programme**. Statuses: Draft · In Review · Published.

| Tab | Fields |
|---|---|
| Details | Programme Code, Programme Manager, Lead Donor, Countries, Sectors, Start, End, Overall RAG |
| Goal & Scope | Goal, Outcomes, Target Groups |
| Budget | Total Budget, Funds Secured, Funding Gap *calculated*, Spent to Date, Spent (% of budget) *calculated* |
| Reach | Target Beneficiaries, Beneficiaries Reached, Reached (% of target) *calculated*, Women and Girls (%) |
| Status & Risks | Key Achievements, **Key Risks** table (Risk, Rating ▾, Mitigation), Next Steps |
| Audit & Compliance | Last Audit, Audit Opinion, Open Audit Findings, Safeguarding Reports This Year |
| Notes | Notes |

## Countries / Regions

One record per **country or region of operation**. Statuses: Planned · Active · Suspended · Complete / Exited.

| Tab | Fields |
|---|---|
| Details | Country, Regions / Counties, Country Office, Country Director, Operating Since, Planned Exit |
| Context & Security | Operating Context, Security Level, **Context Risks** table (Risk, Rating ▾, Mitigation) |
| Government | NGO Registration, Registration Expiry, **Government Counterparts** table (Ministry / Office, Contact, Role), MoU Reference, MoU Expiry |
| Reach | Target Beneficiaries, Beneficiaries Reached, Reached (%) *calculated*, Local Partners |
| Audit & Compliance | Last Audit, Audit Opinion, Open Audit Findings, Last Compliance Review |
| Notes | Notes |

## Communities

One record per **community**. Statuses: Identified · Engaged · Active · Exited.

| Tab | Fields |
|---|---|
| Details | Community Code, Country, District / County, Village / Location, Population, Households, Vulnerability, Main Language |
| Engagement | Entry Date, Community Consent Obtained, Community Committee Formed, Committee Chair, Women on the Committee (%), Feedback Channel |
| Services | Interventions, Water Points, Beneficiaries Reached |
| Accountability | Complaints Received, Complaints Resolved, Resolved (%) *calculated* |
| Exit | Planned Exit, Exit Strategy |
| Notes | Notes |

## Thematic Areas

One record per **thematic area**. Statuses: Planned · Active · Complete.

| Tab | Fields |
|---|---|
| Details | Theme Code, Sector, Thematic Lead, Sustainable Development Goals |
| Strategy | Theory of Change, Key Approaches, Cross-Cutting Issues |
| Indicators | **Headline Indicators** table (Indicator, Baseline, Target, Actual) |
| Budget | Budget, Spent, Spent (%) *calculated* |
| Learning | Lessons Learned |
| Notes | Notes |

## Programme Milestones

One record per **milestone**. Statuses: Upcoming · At Risk · Met · Missed.

| Tab | Fields |
|---|---|
| Details | Milestone Code, Type, Programme, Owner |
| Dates | Baseline Date, Forecast Date, Actual Date |
| Funding | Linked to Donor Payment, Tranche Value |
| Criteria & Evidence | **Completion Criteria** table (Check, Done ▾), **Evidence** table (Evidence, Reference) |
| Notes | Notes |

## Donor Register

One record per **donor**. Statuses: Prospect · Engaged · Active · Lapsed.

| Tab | Fields |
|---|---|
| Details | Donor Code, Donor Type, Headquarters, Relationship Manager, Donor Contact, Contact Email, Relationship Health |
| Funding | Total Committed, Received to Date, Received (%) *calculated*, Active Grants, Funding Priorities |
| Compliance & Audit | Due Diligence Completed, Reporting Requirements, Audit Requirement, Next Audit |
| Notes | Notes |

## Funding Agreements

One record per **funding agreement**. Statuses: Negotiation · Active · Final Reporting · Closed.

| Tab | Fields |
|---|---|
| Details | Agreement Reference, Donor, Programme, Agreement Type, Agreement Amount, Start, End, Signed, Our Signatory |
| Terms | Cost Share (%), Indirect Cost Rate (%), Special Conditions |
| Payments | **Payment Tranches** table (Tranche, Due, Amount, Status ▾), Received to Date, Received (%) *calculated* |
| Reporting | **Reporting Schedule** table (Report, Due, Status ▾) |
| Audit & Compliance | Audit Required, Audit Due, Audit Opinion, Compliance Issues |
| Notes | Notes |

## Grant Register

One record per **grant (from application to closeout)**. Statuses: Application · Not Funded · Awarded · Disbursement · Closeout · Closed.

| Tab | Fields |
|---|---|
| Details | Grant Reference, Donor, Call / Opportunity, Grant Manager, Sector, Applied, Decision, Start, End |
| Amounts | Amount Requested, Amount Awarded, Awarded (% of request) *calculated*, Received from Donor, Spent, Spent (% of award) *calculated* |
| Budget | **Budget Lines** table (Budget Line, Budget, Spent) |
| Reporting | Next Report Due, Reports Submitted, Reports Overdue |
| Audit | Audit Required, Auditor, Audit Period, Audit Opinion, **Audit Findings** table (Finding, Rating ▾, Status ▾), Questioned Costs |
| Notes | Notes |

## Field Offices

One record per **field office**. Statuses: Opening · Active · Suspended · Closed.

| Tab | Fields |
|---|---|
| Details | Office Code, Country, Location, Office Type, Office Manager, Opened, Staff, Vehicles |
| Security | Security Level, Last Security Assessment, Evacuation Plan in Place |
| Operations | Monthly Running Cost, Lease Expiry, Connectivity |
| Audit | Last Internal Audit, Audit Rating, Open Audit Actions |
| Notes | Notes |

## Field Teams

One record per **field team**. Statuses: Forming · Deployed · Stood Down.

| Tab | Fields |
|---|---|
| Details | Team Code, Team Type, Field Office, Team Leader, Team Size, Women in the Team, Women (%) *calculated* |
| Deployment | Deployed, Planned Stand-Down, Areas Covered, Vehicle, **Roles** table (Role, Number) |
| Safety & Conduct | Training Completed, Last Security Check-In, Incidents This Year |
| Notes | Notes |

## Activity Plans

One record per **quarterly activity plan (one office and output)**. Statuses: Draft · Approved · In Progress · Complete.

| Tab | Fields |
|---|---|
| Details | Plan Reference, Quarter, Field Office, Programme, Output, Owner |
| Activities | **Activities** table (Activity, Location, Start, End, Responsible) |
| Targets & Budget | Target Participants, Actual Participants, Achieved (%) *calculated*, Budget, Spent, Spent (%) *calculated* |
| Approval & Deviations | Approved By, Approved, Deviations from the Plan |
| Notes | Notes |

## Missions

One record per **field mission**. Statuses: Planned · In Progress · Complete · Cancelled.

| Tab | Fields |
|---|---|
| Details | Mission Reference, Mission Type, Destination, Team Lead, Members, Start, End |
| Plan & Logistics | Purpose, Transport, Security Clearance Given, Budget, Actual Cost |
| Findings | Findings, **Recommendations** table (Action, Owner, Due Date, Status ▾), Report Reference, Report Date |
| Notes | Notes |

## SQL

1. `SQL/v1429_ngo_programme_donors_grants_field_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1430_ngo_programme_donors_grants_field_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Riverside Aid International runs the Safe Water and Resilient Livelihoods (SWRL) programme in Kenya, Uganda and Tanzania, April 2025 – March 2028, plus nine smaller programmes in East Africa. Donors and partners are fictional. Dated around today (11 Nov 2026): year 2, mid-term review planned for January 2027. The final query counts records per register.
