# Project Setup forms enrichment (v1344)

PRD: `projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md` · Plan: `projectplan/v1344_project_setup_forms_fields_audit_seed_plan.md`

This change makes the Project Setup documents complete and consistent, and gives every demo project (SEED334-PRJ-01…10) a full, realistic set of initiation documents. It applies to Platform and Simulator.

## 1. What changed, form by form

| Form | Where to view | Where to edit | What is new |
|---|---|---|---|
| **Project Details** | Project Setup → Project Details | **Edit** button → the project wizard (`/platform/projects/<code>/edit?tab=details` or `?tab=governance`) | Read-only summary in tabs: Overview, Objectives & Success, Classification & Delivery, Dates & People, Audit details. Shows priority, billing type, health (read-only), sponsor (= the project Executive), project manager. |
| **Project wizard** | — | Projects → Edit | New fields: Objectives, Priority, Billing Type, Project Manager. Priority, billing type and classification options come from the database (`project_attribute_options`). The wizard opens on a tab from the `?tab=` link. |
| **Project Mandate** | Mandate view | Mandate → Edit | Edit form in tabs (with Audit details). New fields: Assumptions, Outline risks. Deliverables and dependencies are edited on the form. Quality priority is a list matching the database (time, cost, quality, balanced). Simulator: the practice mandate edit page now exists (`/simulator/mandates/:id/edit`). Mandate export includes the new sections. |
| **Project Brief / Charter** | Brief view | Brief → Edit | New **Milestones** tab showing the project's Milestones register (read-only; milestones are maintained in the register). Simulator practice brief edit page in tabs (Definition, Scope, Approach, Dates & Milestones, Audit details); the view shows every field. |
| **Business Case** | Business Case view | Business Case → Edit | No form change (already complete). Samples added. |
| **PID** | PID view | PID → Edit | Form adds project, quality, risk and communication approach, monitoring and control, project plan summary and current stage plan summary. The view's Controls and Plans tabs show them (previously "Implementation in progress"). Simulator practice PID view shows every filled section. |
| **Benefits Review Plan** | Benefits Review Plan view | Benefits Review Plan → Edit | View now has **Details** and **Audit details** tabs (Platform and Simulator). Simulator view shows all plan sections. |

## 2. Who can change the project manager

Only PMO administrators and organisation administrators (Account Owner / org admin) can change a project's manager. The wizard shows the Project Manager picker to them and a read-only name to everyone else. The database enforces this too (`trg_projects_guard_project_manager`, `SQL/v1480`) and writes each change to the audit log.

## 3. Sample data

| Project | Industry tag (v1479) | Mandate | Brief | Business Case | PID | Benefits Review Plan |
|---|---|---|---|---|---|---|
| SEED334-PRJ-01…10 | Tagged by project name (e.g. PRJ-01 banking, PRJ-03 energy, PRJ-08 IT); already-tagged projects are left alone | Rich content, deliverables, dependencies | Enriched from the mandate, with milestones | Options and benefits | Objectives, interfaces, tolerances, reporting | Built from business case benefits, three-review schedule |

**Status mix** (realistic, not all approved): most documents are approved; a few are draft, submitted or pending approval (for example the benefits review plan on PRJ-06 is draft and on PRJ-10 pending approval).

**Safe re-runs:** the seeds only overwrite a document while it still holds the original generic v834 text. A document someone has worked on is left alone.

**Project Team top-up** (`SQL/v1487`): 10 contacts on PRJ-01, one team each on PRJ-01 and PRJ-03 (members come from existing project memberships; no new memberships or role changes), and one complete RACI matrix on PRJ-01 (6 rows).

**Delivery Overview:** no new page. Once PRJ-08 is tagged IT (`v1479`), its 10 ICT Delivery Overview rows show on that project.

**Simulator** (`SQL/v1488`): one practice project, "Demo practice project — initiation pack", owned by the Account Owner of the organisation that owns the SEED334 projects. It has a mandate (approved, with deliverables and dependencies), brief (approved, with milestones), business case (approved), PID (submitted) and benefits review plan (draft). The owner is looked up in SQL; no names or emails are stored in the file.

## 4. SQL run order

1. `SQL/v1479_seed334_demo_projects_industries.sql`
2. `SQL/v1480_project_options_and_pm_change_guard.sql`
3. `SQL/v1251_planner_table_wall.sql` (re-run: new table `project_attribute_options`)
4. `SQL/v1481_mandate_assumptions_and_outline_risks.sql`
5. `SQL/v1482_seed334_rich_mandates.sql`
6. `SQL/v1483_seed334_rich_briefs_and_milestones.sql`
7. `SQL/v1484_seed334_rich_business_cases.sql`
8. `SQL/v1485_seed334_rich_pids.sql`
9. `SQL/v1486_seed334_rich_benefits_review_plans.sql`
10. `SQL/v1487_seed334_project_team_topup.sql`
11. `SQL/v1488_sim_demo_practice_project_initiation_pack.sql`
12. `SQL/v1489_sim_practice_business_case_reference_column.sql` — restores the missing `case_reference` column on Simulator practice business cases (every Simulator business case save was failing without it); its check lists any other display-ID trigger pointing at a missing column (expected: none)

Each file ends with a check query.

## 5. Known limits

- The Simulator practice PID has a view page but no separate edit page in this change.
- Brief milestones are read-only on the brief; add or change them in the Milestones register.
- Health status is shown, never edited, on Project Details.
- The Benefits Review Plan form itself was already complete and is unchanged; only the view gained tabs.
