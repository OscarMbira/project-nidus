# Banking & Financial Services — Training Registers

Guide to the registers under **Banking & Financial Services → Training**. ▾ marks a dropdown column.
Lists whose lines have several parts are tables (CLAUDE.md rule 67.1). Fields marked *calculated* are
worked out on save. All fields are optional.

PRD / plan: `projectprd/v1339_fin_change_management_and_training_workstreams_PRD.md` · `projectplan/v1339_fin_change_management_and_training_workstreams_plan.md`.

- **Training Strategy is a document register:**
  - sign-off on its Sign-off tab;
  - Word / PDF document;
  - one per project, with a content version history;
  - Approved is set only by sign-off.
- **System template:** start a new one from **New → From template → Training Strategy (core banking replacement)**. It's a generic version with [placeholders], blank names and blank dates.
- **Split with Operational Readiness → Training.** That register stays the per-course readiness view. This section holds the design and delivery detail: needs analysis, curriculum, materials, trainers, sessions, attendance, environment and effectiveness.
- **Attendance** is recorded per session (counts and a follow-up table), not per learner.

## Training Strategy

One record per **project (the training strategy document)**. Statuses: Draft · In Review · Approved · Superseded.

| Tab | Fields |
|---|---|
| Details | Document Reference, Document Version, Document Owner, Next Review Date, Training Lead, Training Start, Training End |
| Introduction | Purpose, Objectives, Scope, Out of Scope, Assumptions, Constraints |
| Audiences | **Audiences** table (Audience, People, Priority ▾, Approach) |
| Approach & Methods | Delivery Approach, **Delivery Methods** table (Method, Used For), Train-the-Trainer Approach |
| Curriculum | **Curriculum Overview** table (Course, Audience, Duration, Method) |
| Trainers | Trainer Model |
| Environment | Training Environment |
| Schedule | **Schedule** table (Phase, From, To, Focus) |
| Assessment & Effectiveness | Assessment Approach, **Effectiveness Measures** table (Level, Measure, Target), Completion Criteria |
| Risks & Roles | **Roles and Responsibilities** table (Role, Responsibility, Name), **Risks and Mitigations** table (Risk, Impact, Mitigation, Owner) |
| Glossary & Appendices | **Glossary of Terms** table (Term, Definition), **Appendices** table (Title, Reference / Link) |
| Document Control | **Version History** table (Version, Date, Author, Change), **Related Documents** table (Document, Reference) |

## Training Needs Analysis

One record per **role or job family**. Statuses: Draft · Validated with the Business · Approved.

| Tab | Fields |
|---|---|
| Details | Reference, Role / Job Family, Business Unit, People in Role, Impact Level, Owner |
| Tasks Changing | **Tasks Changing** table (Task, Today, New Way, Frequency ▾) |
| Skills Gap | **Skills Gap** table (Skill, Current Level (1–5), Required Level (1–5)) |
| Courses | **Required Courses** table (Course, Mandatory ▾, When), Training Hours per Person |
| Notes | Notes |

## Curriculum

One record per **course**. Statuses: Draft · In Design · Approved · Retired.

| Tab | Fields |
|---|---|
| Details | Course Code, Main Audience, Delivery Method, Duration (hours), Course Owner, Mandatory, Maximum Class Size |
| Learning Objectives | Learning Objectives |
| Content | **Content Outline** table (Module, Topics, Minutes) |
| Prerequisites | Prerequisites, Assessment, Pass Mark (%) |
| Notes | Notes |

## Training Materials

One record per **training material**. Statuses: Not Started · Drafting · In Review · Approved · Published.

| Tab | Fields |
|---|---|
| Details | Reference, Course, Type, Author |
| Version & Review | Version, Due Date, **Reviewers** table (Reviewer, Area, Result ▾, Date) |
| Approval | Approved By, Approval Date, Published Location |
| Notes | Notes |

## Trainers

One record per **trainer**. Statuses: Nominated · In Training · Certified · Inactive.

| Tab | Fields |
|---|---|
| Details | Reference, Trainer Type, Business Unit, Base Location |
| Certification | **Courses Certified** table (Course, Certified On, Status ▾), Train-the-Trainer Complete, Train-the-Trainer Date |
| Availability | Available From, Available To, Training Days per Week |
| Notes | Notes |

## Training Sessions

One record per **scheduled session**. Statuses: Planned · Scheduled · Delivered · Cancelled.

| Tab | Fields |
|---|---|
| Details | Session Reference, Course, Audience, Delivery Method, Trainer, Venue / Link |
| Schedule | Start, End, Elapsed Time *calculated* |
| Enrolment | Capacity, Enrolled, Fill Rate *calculated*, Waiting List |
| Notes | Notes |

## Attendance & Assessment

One record per **delivered session (attendance and results)**. Statuses: Open · Recorded · Follow-Up Needed · Closed.

| Tab | Fields |
|---|---|
| Details | Session, Course, Session Date, Trainer |
| Attendance | Enrolled, Attended, Attendance Rate *calculated* |
| Assessment | Assessed, Passed, Pass Rate *calculated*, Average Score (%) |
| Follow-Up | **Follow-Up** table (Learner / Group, Reason ▾, Action, Due Date) |
| Notes | Notes |

## Training Environment

One record per **training environment readiness item**. Statuses: Not Ready · In Progress · Ready · Issue.

| Tab | Fields |
|---|---|
| Details | Reference, Environment, Item, Owner, Needed By, Ready Date |
| Data & Users | Training User IDs, Training Data Set, Refresh Frequency |
| Checks | **Readiness Checks** table (Check, Owner, Status ▾, Due Date) |
| Issues | **Issues** table (Issue, Severity ▾, Action, Owner) |
| Notes | Notes |

## Training Effectiveness

One record per **evaluation (course and point in time)**. Statuses: Planned · In Progress · Complete.

| Tab | Fields |
|---|---|
| Details | Reference, Course, Audience, When, Evaluation Date, Respondents |
| Scores | Reaction – Was the Training Useful? (1 = low, 5 = high), Learning – Did They Learn It? (1 = low, 5 = high), Behaviour – Do They Use It on the Job? (1 = low, 5 = high), Results – Better Business Outcomes? (1 = low, 5 = high), Effectiveness Score *calculated* |
| Findings & Actions | Findings, **Actions** table (Action, Owner, Due Date, Status ▾) |
| Notes | Notes |

## Training Sign-Off

One record per **formal training sign-off**. Statuses: Pending · Signed Off · Signed Off with Conditions · Rejected.

| Tab | Fields |
|---|---|
| Details | Sign-Off Reference, Sign-Off Type, Business Unit, Sign-Off Coordinator, Requested Date, Due Date |
| Approvers | **Approvers** table (Department, Name, Role, Decision ▾, Date) |
| Evidence | **Evidence Reviewed** table (Evidence, Reference), Staff Targeted, Staff Trained, Completion *calculated*, Conditions / Caveats |
| Decision | Decision, Decision Date, Decision Comments |
| Notes | Notes |

## SQL

1. `SQL/v1405_fin_training_registers.sql` adds the fields, tabs and status workflows. It needs v1375 for the date-and-time and calculated fields.
2. `SQL/v1406_fin_training_seed.sql` adds 10 sample records per register for SEED334-PRJ-08. Dated around today (11 Nov 2026): needs analysis and the curriculum are done, materials are being written, super-user (train-the-trainer) sessions are under way and end-user sessions run January to March 2027. Post-go-live effectiveness evaluations are simulated after the April 2027 go-live (owner decision D9). The final query counts records per register.
3. `SQL/v1407_fin_sidebar_order_change_training.sql` — puts Change Management and Training after Testing & Assurance (later sections move down two places).
4. `SQL/v1408_fin_change_training_strategy_system_templates.sql` — the two strategy system templates.
