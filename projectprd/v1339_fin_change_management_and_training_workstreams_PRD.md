# v1339 — Banking & Financial Services: Change Management and Training workstreams (PRD)

**Status:** Approved by the owner 2026-11-11. Decision interview complete (all decisions settled, see g). The implementation plan is
`projectplan/v1339_fin_change_management_and_training_workstreams_plan.md`.

**Area:** Banking & Financial Services industry pack (Local Register Engine). Platform (`public`), same as every
other Banking workstream.

---

## a) Problem statement

The Banking & Financial Services sidebar covers eight workstreams of a core banking transformation:

- Banking Transformation
- Core Banking
- Data Migration
- Testing & Assurance
- Cutover
- Operational Readiness
- Go-Live
- Hypercare

It has nothing for two workstreams that decide whether a core banking replacement succeeds in practice:

1. **Change Management (organisational / people change).** The bank needs to understand who is affected and how, prepare those people, run a change champion network, deal with resistance, and prove the change has been adopted. Today a project can only use the generic Core PM **Stakeholders** section (register, engagement assessment, communication plan). That section tracks *who* the stakeholders are, not *how the change affects them* or *whether they are ready*.
2. **Training.** A core banking go-live typically retrains every branch, operations and contact centre employee. Today there is a single **Operational Readiness → Training** register (one record per course, with sessions, attendance and materials). Nothing covers:
   - the training strategy;
   - the needs analysis by role;
   - the curriculum design;
   - the trainer pool and train-the-trainer;
   - the training environment;
   - learner assessments;
   - training effectiveness;
   - the formal training sign-off.

Without these sections, programme and PMO users of the Banking pack track change and training outside the system, in spreadsheets and slide decks. Go-live decisions (Go-Live → Go-Live Decision, Operational Readiness → Readiness Sign-Off) then rely on evidence the system does not hold.

## b) Solution

Add two new workstream sections to the Banking & Financial Services sidebar, built the same way as Data Migration, Testing & Assurance, Cutover and the other workstreams:

- **Change Management**: 8 registers.
- **Training**: 10 registers.

Each register is a Local Register Engine **system register**: best-practice fields in logical tabs, multi-part lists as tables (rule 67.1), calculated fields where useful, statuses, and 10 sample records.
- **Strategies** (the Change Management Strategy and the Training Strategy) are **document registers**: sign-off, versions, and Word / PDF export, with one complete sample document each.
- **Access:** sidebar menus and role access follow the existing pattern: the `delivery_team` role group plus named extra roles, as v1343 did for Data Migration.
- **Taxonomy:** the menu taxonomy is extended as an addition (rule 70).

No new app code is expected: the engine already supports tabs, tables, calculated fields, date-and-time, record links, document registers, templates and exports.

### Proposed registers

**Change Management** (`fin_cat_change_management`)

| # | Register | One record per | Main tabs |
|---|---|---|---|
| 1 | Change Management Strategy *(document)* | project | Introduction · Change Vision & Case for Change · Approach · Governance & Roles · Change Network · Communication & Engagement · Readiness & Adoption Measures · Risks · Document Control |
| 2 | Change Impact Assessment | impacted group × change | Details · Current vs Future State · Impact (people / process / technology / policy, level) · Actions · Notes |
| 3 | Change Readiness | readiness assessment (group, point in time) | Details · Readiness Dimensions (aware / understand / accept / able / sustain, calculated score) · Gaps & Actions · Notes |
| 4 | Change Network | change champion | Details · Coverage (units / branches) · Preparation · Activities (table) · Notes |
| 5 | Change Communications & Engagement | change communication or engagement event | Details · Audience & Channel · Content · Feedback · Notes |
| 6 | Resistance & Concerns | resistance item | Details · Root Cause · Response & Owner · Notes |
| 7 | Adoption Tracking | adoption measure | Details · Target vs Actual (calculated) · Readings (table) · Actions · Notes |
| 8 | Change Sign-Off | formal change readiness sign-off | Details · Approvers (table) · Evidence (table) · Decision · Notes |

**Training** (`fin_cat_training`)

| # | Register | One record per | Main tabs |
|---|---|---|---|
| 1 | Training Strategy *(document)* | project | Introduction · Audiences · Approach & Delivery Methods · Curriculum Overview · Trainers · Environment · Schedule · Assessment & Effectiveness · Risks · Document Control |
| 2 | Training Needs Analysis | role / job family | Details · Tasks Changing · Skills Gap · Required Courses (table) · Notes |
| 3 | Curriculum (Course Catalogue) | course | Details · Learning Objectives · Content Outline (table) · Prerequisites · Notes |
| 4 | Training Materials | material | Details · Version & Review · Approval · Notes |
| 5 | Trainers | trainer | Details · Courses Certified (table) · Train-the-Trainer · Availability · Notes |
| 6 | Training Sessions | scheduled session | Details · Schedule (date-time, duration calculated) · Enrolment (capacity, enrolled, fill rate calculated) · Notes |
| 7 | Attendance & Assessment | see decision D7 | Attendance · Assessment (pass rate calculated) · Follow-Up · Notes |
| 8 | Training Environment | environment / readiness item | Details · Data & Users · Readiness Checks (table) · Issues · Notes |
| 9 | Training Effectiveness | evaluation | Reaction · Learning · Behaviour on the Job · Results · Actions · Notes |
| 10 | Training Sign-Off | formal training sign-off | Details · Approvers · Evidence · Decision · Notes |

*Tab lists are indicative. The final field lists are settled in the plan, following the pattern of v1394, v1397, v1399 and v1401.*

## c) User stories

1. As a **banking programme manager**, I see **Change Management** and **Training** sections in the Banking & Financial Services sidebar, in a logical place among the other workstreams.
2. As a **change manager**, I create and maintain one **Change Management Strategy** document per project and take it through sign-off. Approved comes only from the Sign-off tab.
3. As a change manager, I record each **change impact** for an impacted group (current vs future state, impact level across people / process / technology / policy, and the actions to address it).
4. As a change manager, I see the impact level per group so I can focus effort where it is highest.
5. As a change manager, I run **change readiness assessments** per group and point in time, scoring the readiness dimensions, and the overall score is worked out on save.
6. As a change manager, I compare readiness over time, for example baseline, before dress rehearsal and before go-live.
7. As a change manager, I maintain the **change champion network**: who covers which units and branches, their preparation, and the activities they ran.
8. As a change manager, I log **change communications and engagement events** with audience, channel, key messages and feedback. These are separate from the Cutover weekend communications.
9. As a change manager, I log **resistance and concerns**, with root cause, response and owner, and track them to closure.
10. As a change manager, I track **adoption measures** after go-live: target vs actual, with readings over time and the variance worked out.
11. As a sponsor or business head, I sign off **change readiness** through a Change Sign-Off record with an approvers table and evidence.
12. As a **training lead**, I create and maintain one **Training Strategy** document per project and take it through sign-off.
13. As a training lead, I record a **training needs analysis** per role or job family: which tasks change, the skills gap, and the required courses.
14. As a training lead, I maintain the **course catalogue** with learning objectives, content outline, duration, delivery method and prerequisites.
15. As a training lead, I track every **training material** through draft, review, approval and publication.
16. As a training lead, I maintain the **trainer pool**: which courses each trainer is certified for, their train-the-trainer status and their availability.
17. As a training coordinator, I schedule **training sessions** with date, time, venue or virtual link, trainer and capacity. Enrolment fill rate and duration are worked out on save.
18. As a training coordinator, I record **attendance and assessment** results. The pass rate is worked out on save, and follow-ups are flagged for learners who missed or failed.
19. As a training lead, I track **training environment** readiness: data refresh, user IDs and readiness checks.
20. As a training lead, I record **training effectiveness** evaluations (reaction, learning, behaviour on the job, results) with actions.
21. As a business head, I sign off **training completion** for my area through a Training Sign-Off record.
22. As any register user, I get the standard engine features on every new register:
    - list and table views with search and sort;
    - exports (rule 38) and record export with tables (rule 38.1);
    - an audit tab (rule 63.1);
    - custom fields (v1311);
    - templates where switched on.
23. As a role holder named by these workstreams (for example a learning and development specialist, business heads, sponsors, assurance), I can open the relevant menus. Each menu shows only the pages; data access is still limited by project membership (RLS).
24. As a demo or prospective customer, I open SEED334-PRJ-08 and find realistic, vendor-neutral sample data: 10 records per register and one complete document per strategy, consistent with the existing Cutover, Operational Readiness, Go-Live and Hypercare samples.
25. As the owner, I can run the SQL in the Supabase SQL editor without the known traps: no "into" in seed text, no SELECT … INTO, no hand-made display IDs, and ID ranges checked free.

## d) Implementation decisions (settled unless listed as open in g)

- **Pattern:**
  - system registers in `public.local_registers` with fixed hex-only IDs continuing the 9001 block from `…044`;
  - fields in `public.local_register_fields`, with tabs, tables (rule 67.1) and calculated fields (v1375);
  - one SQL file for fields, statuses, menus and access, and a companion seed SQL file (rule 18.2);
  - numbers taken from the SQL folder immediately before each file is created (rule 18.0).
- **Menus:**
  - two category menu items (`fin_cat_change_management`, `fin_cat_training`) and one menu item per register (`fin_reg_<register_key>`), routed to `/local-registers/<register_key>`;
  - linked to the Banking & Financial Services pack (`local_register_industry_packs`, `industry_pack_menu_items`);
  - granted with `grant_menu_role_group('fin_cat_%' / 'fin_reg_%')`, plus named extra roles in the v1343 style.
- **Strategies:** the two strategy registers are **document registers** (v1318 / v1321): sign-off, versions and Word / PDF export. Their status workflow is Draft / In Review / Approved / Superseded, and they are seeded as Draft only.
- **Display IDs:** blank in seeds, assigned by Admin ID Generation (rules 16.2 and 18.2). The LREG rule now handles numbers past 999 (Admin v247).
- **Vendor-neutral content (rule 26):**
  - no product, vendor or trademarked method names;
  - readiness dimensions use plain words (aware / understand / accept / able / sustain);
  - effectiveness levels are described, not named after a branded model.
- **Taxonomy:** `Documentation/Core_PM_and_Industry_Menu_Taxonomy.md` gets additive lines for the two sections and their registers, each marked with the version (rule 70, additive-only).
- **Guides:** `Documentation/FIN_Change_Management_Registers_Guide.md` and `Documentation/FIN_Training_Registers_Guide.md`, generated from the same definitions as the SQL.

## e) Testing decisions

- **SQL:**
  - libpg-query parse check on every file;
  - a generator validates every sample value against its field definition (options, table columns, dates, date-times, numbers, booleans), refuses the word "into" and stray `;`, and checks ID ranges are free;
  - each file ends with a check query (fields / tabs per register, records per register, menus per role).
- **Menus and access:** a check query lists, for each new menu item, the roles granted. Owner check in the browser: both sections are visible to a delivery-team role and to a named extra role.
- **App:** no app code changes are expected. If any engine gap appears (for example a calculation type the readiness score needs), it is added in `packages/shared` with unit tests, and the existing register test suites (shared, ui, both apps) are re-run (rule 43).
- **"Done" means:**
  - both sections appear in the sidebar for the granted roles;
  - every register opens with its tabs;
  - each register has 10 sample records (1 per strategy document);
  - strategies can go through sign-off;
  - exports show tables;
  - the guides and taxonomy are updated.

## f) Out of scope

- A learning management system: e-learning hosting, SCORM content, certificates issued to learners.
- Per-learner records at full bank scale (thousands of staff); see D7.
- Automatic links from adoption or usage metrics to live system telemetry. Readings are entered manually.
- Simulator Banking menus. Like every other Banking workstream, the registers are public system registers and the Simulator has no Banking menu today (v1337 note). Parity follows the existing FIN registers and is not built separately.
- Admin app changes: none expected, because ID Generation already covers `public.local_register_records`.
- Reworking the generic Core PM **Stakeholders** section, which stays as it is and is referenced, not duplicated.

## g) Further notes — decisions (settled 2026-11-11)

**Outcome of the interview.**
- **As recommended:** D1–D7, D9 and D10.
  - D6: an "average" calculation type is added to the shared engine, with tests.
  - D10: extra roles project_sponsor, project_board_member, financial_programme_manager, pm_project_assurance, internal_auditor, risk_compliance_manager, pm_team_member and learning_development_specialist.
- **Changed by the owner:** **D8.** Both strategies also ship as **system templates**, which every account can start from with New → From template. This adds two template SQL files with a vendor-neutral content check, as for the CBS runbook template (v1378).

The original recommendations are kept below for the record.

| # | Decision | Recommendation (outcome above) |
|---|---|---|
| D1 | Where the two sections sit in the sidebar | After **Testing & Assurance** and before **Cutover**, in the order Change Management, then Training. Category sort orders 604–609 move up by two to make room. |
| D2 | The existing **Operational Readiness → Training** register (course-level, 10 samples) | Keep it in Operational Readiness, unchanged, as the per-course *readiness* view. The new Training section holds design and delivery. Its Curriculum and Sessions registers become the detailed source, and the guide explains the split. (Alternative: move it into Training as "Courses", which changes an existing taxonomy entry.) |
| D3 | Change communications vs Core PM **Stakeholders → Communications** and **Cutover → Communications** | A separate Change Communications & Engagement register for people-change messages and events. Stakeholder records are referenced by name, not duplicated. |
| D4 | A new **Change Manager** role, or existing roles only | Use existing roles: the delivery-team group plus financial_programme_manager, project_sponsor, project_board_member, pm_project_assurance, pm_team_member and learning_development_specialist (for Training). No new role. |
| D5 | Include **Adoption Tracking** (post go-live) in Change Management, or leave it to Hypercare | Include it in Change Management. Adoption continues after hypercare exit. |
| D6 | Readiness score method | Average of the five dimension scores (1–5) as a percentage, worked out on save. This may need a small engine calculation type ("average"), which would be added with tests. |
| D7 | Attendance granularity | One record per **session** (attended / absent / passed counts, follow-up list as a table), not one per learner. This keeps volumes manageable, and per-learner records stay out of scope. |
| D8 | System templates for the two strategies (like the CBS runbook template) | Not in this change. The two strategies get complete sample documents, and teams can use Save as template. |
| D9 | Sample data dating | Consistent with today (11 Nov 2026) and the April 2027 go-live: strategy work and impact assessments done, training design in progress, sessions January to March 2027. Adoption readings simulated after go-live, like Hypercare (owner's choice on 2026-11-09). |
| D10 | Extra role access for business heads to sign off | Covered by project_sponsor and project_board_member. Business heads usually sign off through those roles or as named approvers. |

Further notes:
- Register IDs from `00000000-0000-4000-9001-000000000044`. The seed ID prefixes and sort-order ranges are checked free immediately before the SQL is written.
- Built with the same generator approach used for v1394–v1402, so the SQL, sample data and guides share one definition.
- ROADMAP.md is not affected strategically. The plan's review section records the result.
