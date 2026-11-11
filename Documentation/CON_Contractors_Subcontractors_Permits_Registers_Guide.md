# Construction & Engineering — Contractors, Subcontractors & Permits Registers

Guide to the registers under **Construction & Engineering → Contractors, Subcontractors & Permits**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

## Contractor Register

One record per **contractor or consultant**. Statuses: Prospective · Prequalified · Appointed · Not Selected · Demobilised.

| Tab | Fields |
|---|---|
| Details | Contractor Code, Role, Company Registration Number, Address, Contact Person, Contact Email, Contact Phone |
| Insurance & Compliance | **Insurances** table (Cover, Amount, Expiry), Tax Clearance Expiry, Safety Accreditation, Quality Certification, Approved Until |
| Commercial | Contract Value, Payment Terms, Retention (%), Performance Bond |
| Notes | Notes |

## Prequalification

One record per **prequalification assessment**. Statuses: Invited · In Progress · Passed · Passed with Conditions · Failed.

| Tab | Fields |
|---|---|
| Details | PQ Reference, Company, Package Applied For, Assessor, Submitted, Assessed |
| Documents | **Documents** table (Document, Received ▾) |
| Scores | Financial Standing (1 = poor, 5 = excellent), Technical Capability (1 = poor, 5 = excellent), Health, Safety & Environment (1 = poor, 5 = excellent), Quality Management (1 = poor, 5 = excellent), Similar Experience (1 = poor, 5 = excellent), Overall Score *calculated*, Pass Mark (%) |
| Outcome | References Checked, Conditions, Feedback to the Company |
| Notes | Notes |

## Appointments

One record per **appointment or contract**. Statuses: Draft · Issued for Signature · Executed · Terminated.

| Tab | Fields |
|---|---|
| Details | Appointment Reference, Appointee, Service / Scope, Form of Contract, Contract Value, Start Date, End Date |
| Key Terms | Retention (%), Defects Period (months), Delay Damages per Day, Payment Terms, Other Key Terms |
| Documents & Signing | **Contract Documents** table (Document, Reference), Signed for the Client By, Signed for the Appointee By, Signed Date |
| Notes | Notes |

## Contractor Work Packages

One record per **work package assigned to a contractor**. Statuses: Assigned · In Progress · On Hold · Complete.

| Tab | Fields |
|---|---|
| Details | Work Package Reference, Contractor, Construction Package, Zones, Contractor Lead |
| Scope | Scope, **Deliverables** table (Deliverable, Due, Status ▾), Interfaces |
| Dates & Value | Planned Start, Planned Finish, Forecast Finish, Value, Earned to Date, Complete (%) *calculated* |
| Notes | Notes |

## Contractor Performance

One record per **monthly contractor performance review**. Statuses: Excellent · Satisfactory · Needs Improvement · Unsatisfactory.

| Tab | Fields |
|---|---|
| Details | Review Period, Contractor, Reviewer, Review Date |
| Scores | Programme (1 = poor, 5 = excellent), Quality (1 = poor, 5 = excellent), Health & Safety (1 = poor, 5 = excellent), Commercial (1 = poor, 5 = excellent), Collaboration (1 = poor, 5 = excellent), Overall Score *calculated* |
| KPIs | **KPIs** table (KPI, Target, Actual, Met ▾) |
| Feedback | Strengths, Improvements Needed, **Actions** table (Action, Owner, Due Date, Status ▾) |
| Notes | Notes |

## Contractor Claims

One record per **claim**. Statuses: Submitted · Under Review · Settled · Rejected · Withdrawn.

| Tab | Fields |
|---|---|
| Details | Claim Reference, Contractor, Claim Type, Contract Clause, Event Date, Notice Date, Submitted |
| Claimed & Agreed | Time Claimed (days), Time Agreed (days), Amount Claimed, Amount Agreed, Agreed (% of amount claimed) *calculated* |
| Assessment | Basis of Claim, Assessor, Assessment Summary, **Supporting Documents** table (Document, Reference) |
| Decision | Decided By, Decision Date |
| Notes | Notes |

## Contractor Closeout

One record per **contractor closeout item**. Statuses: Open · In Progress · Closed.

| Tab | Fields |
|---|---|
| Details | Closeout Reference, Contractor, Item, Responsible, Due Date, Completed, Value (where money is involved) |
| Checks & Evidence | **Checks** table (Check, Done ▾), **Evidence** table (Evidence, Reference), Signed Off By |
| Notes | Notes |

## Subcontractor Register

One record per **subcontractor**. Statuses: Registered · Approved · Mobilised · Active · Demobilised.

| Tab | Fields |
|---|---|
| Details | Subcontractor Code, Trade, Package, Employed By, Contact Person, Contact Phone |
| Approval & Compliance | Subcontract Value, Approved by the Client, Insurance Expiry, Safety Accreditation |
| Mobilisation | Peak Workforce, Mobilised, Demobilised |
| Notes | Notes |

## Subcontractor Scope

One record per **subcontract scope of work**. Statuses: Draft · Under Review · Agreed · Varied.

| Tab | Fields |
|---|---|
| Details | Scope Reference, Subcontractor, Trade, Package |
| Scope | Scope Description, Inclusions, Exclusions |
| Interfaces | Attendances by the Main Contractor, Drawings and Specifications |
| Deliverables & Value | **Deliverables** table (Deliverable, Due), Subcontract Value, Agreed Date |
| Notes | Notes |

## Subcontractor Performance

One record per **monthly subcontractor performance review**. Statuses: Excellent · Satisfactory · Needs Improvement · Unsatisfactory.

| Tab | Fields |
|---|---|
| Details | Review Period, Subcontractor, Reviewer, Review Date |
| Scores | Programme (1 = poor, 5 = excellent), Quality (1 = poor, 5 = excellent), Safety (1 = poor, 5 = excellent), Housekeeping (1 = poor, 5 = excellent), Overall Score *calculated* |
| Feedback | Issues, **Actions** table (Action, Owner, Due Date, Status ▾) |
| Notes | Notes |

## Permit Compliance

One record per **permit, licence or consent**. Statuses: Pending · Compliant · Non-Compliant · Expired / Closed.

| Tab | Fields |
|---|---|
| Details | Permit Reference, Permit Type, Issuing Authority, Permit Holder |
| Dates | Applied, Issued, Expires, Renewal Needed |
| Conditions | **Conditions** table (Condition, Status ▾) |
| Inspections | **Inspections** table (Inspection, Date, Result ▾), Fees |
| Notes | Notes |

## SQL

1. `SQL/v1419_con_contractors_permits_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1420_con_contractors_permits_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Fictional scenario for SEED334-PRJ-08: Velocity Freight builds its Northern Distribution Hub at Kestrel Park (24,000 m² warehouse, 3-storey office block, 42-dock yard, access road, utilities), design and build by the fictional Harbourline Construction Ltd. Site start 2 March 2026, practical completion 27 August 2027. Dated around today (11 Nov 2026): steel frame complete, roof and cladding under way, slab and MEP starting. The final query counts records per register.
