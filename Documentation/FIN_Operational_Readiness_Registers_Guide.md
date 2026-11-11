# Banking & Financial Services — Operational Readiness Registers

Guide to the nine registers under **Banking & Financial Services → Operational Readiness**. They
sit next to the go-live view in [Cutover → Business Readiness and Technology Readiness](FIN_Cutover_Registers_Guide.md).
The Operational Readiness registers hold the detail: each procedure, course, branch, contact centre
area, support service, monitor and incident process. The Cutover registers summarise readiness for
each business unit.

▾ marks a dropdown column. Lists whose lines have several parts are tables (CLAUDE.md rule 67.1).
Fields marked *calculated* are worked out on save. All fields are optional.

## SOPs

One record per **standard operating procedure**. Statuses: Draft · In Review · Approved · Published · Retired.

| Tab | Fields |
|---|---|
| Details | SOP Reference, Business Unit, Process Area, SOP Owner, SOP Type, Version, Criticality, Effective Date, Next Review Date |
| Procedure | Purpose, **Procedure Steps** table (Step, Action, Role, System / Screen), Systems Used |
| Controls | **Controls** table (Control, Type ▾, Performed By) |
| Change Impact | Legacy Procedure Replaced, Key Changes for Staff, Training Required, Training Course |
| Approval | Reviewed By, Approved By, Approval Date, Published Location |
| Notes | Notes |

## Process Readiness

One record per **business process**. Statuses: Not Ready · At Risk · Ready with Conditions · Ready.

| Tab | Fields |
|---|---|
| Details | Readiness Reference, Business Process, Business Unit, Process Owner, Process Type, Criticality, Assessment Date, Overall RAG |
| Change Impact | What Changes, Impact Level, SOPs Updated, SOP References |
| Testing | Tested in UAT, Tested in Dress Rehearsal, Test Evidence |
| Controls & KPIs | Controls Updated, Manual Workaround, **KPIs** table (KPI, Target, Measured By) |
| Gaps & Sign-Off | **Gaps and Actions** table (Gap, Action, Owner, Due Date), Confirmed By, Confirmation Date |
| Notes | Notes |

## Training

One record per **training course**. Statuses: Planned · Scheduled · In Progress · Delivered · Cancelled.

| Tab | Fields |
|---|---|
| Details | Training Reference, Business Unit, Target Roles, Delivery Method, Training Lead, Duration (hours), Training Environment |
| Schedule | Planned Start, Planned End, **Sessions** table (Session, Date, Location, Trainer, Capacity) |
| Attendance | Staff Targeted, Staff Trained, Completion *calculated*, Assessment Pass Rate (%) |
| Materials | **Materials** table (Material, Format ▾, Status ▾) |
| Feedback | Average Rating (out of 5), Feedback, Follow-Up Actions |
| Notes | Notes |

## Branch Readiness

One record per **branch**. Statuses: Not Ready · At Risk · Ready with Conditions · Ready.

| Tab | Fields |
|---|---|
| Details | Branch Code, Region, Branch Type, Branch Manager, Assessment Date, Overall RAG |
| People | Staff, Staff Trained, Training Completion *calculated*, Branch Super User, Cutover Weekend Roster Confirmed |
| Equipment | Workstations, Workstations Ready, Workstation Readiness *calculated*, Printers and Passbook Printers Configured, Network Tested, ATMs |
| Cash & Access | Teller IDs Created, Cash and Teller Limits Loaded, Vault Balances Confirmed, Access Rights Tested |
| Checklist | **Readiness Checks** table (Check, Owner, Status ▾, Due Date) |
| Gaps & Sign-Off | **Gaps and Actions** table (Gap, Action, Owner, Due Date), Confirmed By, Confirmation Date |
| Notes | Notes |

## Contact Centre Readiness

One record per **contact centre area or channel**. Statuses: Not Ready · At Risk · Ready with Conditions · Ready.

| Tab | Fields |
|---|---|
| Details | Readiness Reference, Area / Channel, Team Lead, Assessment Date, Overall RAG |
| People | Agents Required, Agents Trained, Training Completion *calculated*, Extra Agents for Go-Live Week, Go-Live Roster Confirmed |
| Scripts & Knowledge | **Scripts** table (Script, Topic, Status ▾), Knowledge Base Updated, Customer FAQ Published |
| Systems | IVR Menus and Messages Updated, Agent Desktop Tested with the New Platform, Agent Screen Access Tested |
| Volumes & Service Levels | Forecast Daily Contacts (go-live week), Expected Uplift (%), Service Level Target |
| Gaps & Sign-Off | **Gaps and Actions** table (Gap, Action, Owner, Due Date), Confirmed By, Confirmation Date |
| Notes | Notes |

## Support Model

One record per **support service or team**. Statuses: Draft · Approved · Operational.

| Tab | Fields |
|---|---|
| Details | Service Reference, Support Tier, Support Team, Team Lead, Coverage Hours, Hypercare Coverage, Effective From |
| Scope | Systems Supported, Services in Scope, Out of Scope |
| Service Levels | **Service Level Targets** table (Priority ▾, Response, Resolution, Update Frequency) |
| Escalation & Contacts | **Escalation Path** table (Level, Contact, When), Contact Channels |
| Handover | Knowledge Transfer Complete, Runbooks Handed Over, Handover Date, Accepted By |
| Notes | Notes |

## Monitoring

One record per **monitored item (metric and alert)**. Statuses: Not Started · In Progress · Ready · Live.

| Tab | Fields |
|---|---|
| Details | Monitor Reference, Component, Monitor Type, Owner, Environment |
| Thresholds | Metric, Warning Threshold, Critical Threshold, Check Frequency |
| Alerting | Alert Channels, Alert Recipients, Escalate After (minutes), Response Runbook |
| Testing | Alert Tested, Test Date, Dashboard Ready |
| Notes | Notes |

## Incident Management

One record per **incident management element**. Statuses: Not Started · In Progress · Ready · Live.

| Tab | Fields |
|---|---|
| Details | Item Reference, Element, Owner, Due Date, Completion Date, Overall RAG |
| Priorities & SLAs | **Priority Matrix** table (Priority ▾, Definition, Response, Resolution) |
| Roles & Rota | **Roles** table (Role, Name, Contact), On-Call Rota Published, Rota Period |
| Process | Process Steps, Tooling Configured, Templates |
| Testing | Tested in Dress Rehearsal, Test Date, Test Findings |
| Notes | Notes |

## Readiness Sign-Off

One record per **formal readiness sign-off**. Statuses: Pending · Signed Off · Signed Off with Conditions · Rejected.

| Tab | Fields |
|---|---|
| Details | Sign-Off Reference, Sign-Off Area, Business Unit, Sign-Off Coordinator, Requested Date, Due Date |
| Approvers | **Approvers** table (Department, Name, Role, Decision ▾, Date) |
| Evidence | **Evidence Reviewed** table (Evidence, Reference), Open Issues at Sign-Off, Conditions / Caveats |
| Decision | Decision, Decision Date, Decision Comments |
| Notes | Notes |

## SQL

1. `SQL/v1397_fin_operational_readiness_registers_fields.sql` adds the fields, tabs and status workflows. It needs v1375, for the calculated fields.
2. `SQL/v1398_fin_operational_readiness_registers_seed.sql` adds 10 sample records per register for SEED334-PRJ-08:
   - a few SOPs are approved, and super-user training and the all-staff awareness module are under way;
   - early monitoring and incident items are set up, and two sign-offs are done;
   - the branches, contact centre and processes are being prepared for training (January–March 2027) and the dress rehearsals.

   The final query counts records per register.
