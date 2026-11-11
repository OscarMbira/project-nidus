# Banking & Financial Services — Change Management Registers

Guide to the registers under **Banking & Financial Services → Change Management**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

PRD / plan: `projectprd/v1339_fin_change_management_and_training_workstreams_PRD.md` · `projectplan/v1339_fin_change_management_and_training_workstreams_plan.md`.

- **Change Management Strategy is a document register:**
  - sign-off on its Sign-off tab;
  - Word / PDF document;
  - one per project, with a content version history;
  - Approved is set only by sign-off.
- **System template:** start a new one from **New → From template → Change Management Strategy (core banking replacement)**.
- **Scores:** readiness and impact scores are the **average** of the dimension scores (1–5), shown as a percentage. For example, 3.8 of 5 shows as 76%.
- **How it relates to other sections:**
  - **Core PM → Stakeholders** holds who the stakeholders are.
  - This section holds how the change affects people and whether they are ready.
  - **Cutover → Cutover Communications** holds go-live weekend notices.
  - **Change Communications & Engagement** holds the months of people-change engagement.

## Change Management Strategy

One record per **project (the change management strategy document)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Change Management Lead, Executive Sponsor, Scale of Change |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Case for Change | Change Vision, Case for Change, **What Changes** table (Area, Today, In Future), What Stays the Same |
| Approach | Change Approach, **Change Phases** table (Phase, Timing, Focus), **Impacted Groups** table (Group, People, Impact Level ▾) |
| Governance & Roles | Governance, **Roles and Responsibilities** table (Role, Responsibility, Name) |
| Change Network | Change Network Model, Champion Ratio, Champion Time Commitment |
| Communication & Engagement | Engagement Principles, Key Messages, **Engagement Calendar** table (When, Activity, Audience, Owner) |
| Readiness & Adoption | **Readiness Measures** table (Measure, Target, When), **Adoption Measures** table (Measure, Target, Measured By), Sustaining the Change |
| Risks | **Risks and Mitigations** table (Risk, Impact, Mitigation, Owner) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), **Related Documents** table (Document, Reference) |

## Change Impact Assessment

One record per **change × impacted group**. Statuses: Identified · Assessed · Actions Planned · Addressed.

| Tab | Fields |
|---|---|
| Details | Impact Reference, What Changes, Impacted Group, Business Unit, People Affected, Type of Impact, Impact Level, Owner |
| Today vs Future | Today, In Future, Key Differences |
| Impact Scores | People Impact (1 = low, 5 = high), Process Impact (1 = low, 5 = high), Technology Impact (1 = low, 5 = high), Overall Impact *calculated* |
| Actions | **Actions** table (Action, Type ▾, Owner, Due Date, Status ▾), Training Required, Linked Courses |
| Notes | Notes |

## Change Readiness

One record per **readiness assessment (group and point in time)**. Statuses: Planned · In Progress · Complete.

| Tab | Fields |
|---|---|
| Details | Assessment Reference, Group Assessed, Business Unit, Assessment Point, Assessment Date, Method, Respondents, Owner |
| Readiness Scores | Aware of the Change (1 = low, 5 = high), Understand What It Means for Them (1 = low, 5 = high), Accept and Support It (1 = low, 5 = high), Able to Work the New Way (1 = low, 5 = high), Likely to Sustain It (1 = low, 5 = high), Readiness Score *calculated*, Readiness RAG |
| Gaps & Actions | Key Findings, **Gaps and Actions** table (Gap, Action, Owner, Due Date) |
| Notes | Notes |

## Change Network

One record per **change champion**. Statuses: Nominated · Active · Inactive.

| Tab | Fields |
|---|---|
| Details | Champion Reference, Job Title, Business Unit, Location, Line Manager, Appointed On, Time Commitment |
| Coverage | Teams / Branches Covered, Staff Covered |
| Preparation | Champion Briefings Attended, Champion Training Complete, Champion Toolkit Issued |
| Activities | **Activities** table (Date, Activity, Audience, Attendees), Feedback Raised |
| Notes | Notes |

## Change Communications & Engagement

One record per **change message or engagement event**. Statuses: Planned · Approved · Delivered · Cancelled.

| Tab | Fields |
|---|---|
| Details | Reference, Type, Audiences, Channels, Change Phase, Owner, Planned Date, Actual Date |
| Content | Key Messages, Message / Agenda, Linked Impacts |
| Reach & Feedback | Audience Size, Reached / Attended, Reach Rate *calculated*, Sentiment, Feedback and Questions |
| Notes | Notes |

## Resistance & Concerns

One record per **resistance item or concern**. Statuses: Open · In Progress · Resolved · Closed.

| Tab | Fields |
|---|---|
| Details | Reference, Raised By (group), Business Unit, Raised On, Raised Through, Type of Concern, Severity, People Affected |
| Root Cause | Root Cause |
| Response | Response, Owner, Target Date, **Actions Taken** table (Date, Action, By), Resolution, Closed On |
| Notes | Notes |

## Adoption Tracking

One record per **adoption measure**. Statuses: Not Started · On Track · At Risk · Off Track · Achieved.

| Tab | Fields |
|---|---|
| Details | Measure Reference, Measure, Business Unit, Measure Type, Unit, Owner |
| Latest Reading | Target, Baseline (before go-live), Latest Value, Latest Reading On, Gap to Target *calculated* |
| Readings | **Readings** table (Date, Value, Note) |
| Actions | Actions Taken |
| Notes | Notes |

## Change Sign-Off

One record per **formal change sign-off**. Statuses: Pending · Signed Off · Signed Off with Conditions · Rejected.

| Tab | Fields |
|---|---|
| Details | Sign-Off Reference, Sign-Off Type, Business Unit, Sign-Off Coordinator, Requested Date, Due Date |
| Approvers | **Approvers** table (Department, Name, Role, Decision ▾, Date) |
| Evidence | **Evidence Reviewed** table (Evidence, Reference), Readiness Score at Sign-Off (%), Conditions / Caveats |
| Decision | Decision, Decision Date, Decision Comments |
| Notes | Notes |

## SQL

1. `SQL/v1403_fin_change_management_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1404_fin_change_management_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Dated around today (11 Nov 2026): the strategy is drafted, impacts are assessed for the main groups, the baseline readiness survey is done, champions are appointed and engagement events are running. Adoption Tracking readings are simulated after the April 2027 go-live (owner decision D9), like Hypercare. The final query counts records per register.
3. `SQL/v1407_fin_sidebar_order_change_training.sql` — puts Change Management and Training after Testing & Assurance (later sections move down two places).
4. `SQL/v1408_fin_change_training_strategy_system_templates.sql` — the two strategy system templates.
