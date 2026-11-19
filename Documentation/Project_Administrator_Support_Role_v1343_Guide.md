# Project Administrator (Support menu) — v1343 guide

**Applies to:** Platform and Simulator practice projects. Admin › System › Menu Placements lists the new **Support** key.
**PRD / plan:** `projectprd/v1343_project_administrator_support_role_PRD.md`, `projectplan/v1343_project_administrator_support_role_plan.md`.
**SQL (run in order):** v1471 → v1472 → v1473 → v1474 → v1475 → v1476. Then re-run `SQL/v1251_planner_table_wall.sql`, then `SQL/v1452_consolidated_menu_audit_query.sql`.

## Three different "Project Administrator"s

| Layer | What it is | What it does |
|---|---|---|
| Professional role | The job title picked at sign-up (v919) | A label only. It grants nothing. |
| Functional role | A delivery role with skills in **Project Roles & Skills** | Add it to a project from **Add from Built-in Roles**. Default skills: meetings and minutes, actions, status reporting, timesheet follow-up, document control, schedule and RAID upkeep. |
| **Access role** | `project_administrator`, level 7 — chosen when inviting someone to a project | Gives the **Support** menu and the rights below. |

## What a Project Administrator can do

- Work in the PM-style sidebar on their project. With consolidated menus on, they get the **Support** menu (proposal §6.7a). With them off, they get the PM sidebar without the pages left out below.
- Maintain requirements, schedule, milestones, dependencies, delays, RAID, actions, meetings, lessons, stakeholders, communication plan, tasks, quality, testing, defects, readiness pages, project closure, reports and documents.
- **Invite and remove** project members up to level 7: Team Members, other Project Administrators and delivery roles. They **cannot** invite or remove Team Managers, Project Managers or governance roles (Project Assurance, Quality Assurance, Change Authority and governance-only roles). The database enforces this; it's not just hidden in the picker.
- **Timesheets** (Money & Resources › Team Timesheets):
  - read the team's entries;
  - **Send reminder** for a period: people with no time logged or with drafts get an in-app notification and an email, and each send is logged;
  - **Flag** an entry with reasons and a note. The approver sees a *Flagged* badge.
- **My Approvals**: their own timesheet flags and the documents waiting for their review or signature. **Meeting Follow-ups**: meeting action items assigned to them. **Approvals History**: the project's decisions, read-only.

## What a Project Administrator cannot do

- Approve or reject timesheets. Team Manager, Team Lead and Project Manager keep this; the database refuses others.
- Approve or reject governed changes or authorisations. Approval chains name the approvers.
- Create projects, change Approval Chains, Regional & Format, Risk Categories or role management, switch industry modules off, authorise work packages, approve expenses, or administer templates. These pages are not in their menu.

## Important: "view only" pages

Pages marked **(V)** in the Support menu show an eye icon ("View only") in the sidebar. **In v1343 this is a hint, not a lock.** Where a page lets any project member edit, a Project Administrator can still edit it:
- Project Details, Mandate / Brief / Business Case / PID
- Governance Setup
- Working Days & Holidays, Timesheet Settings, Document Signatory, Environments
- Scope Statement, Scenario Planning, Stage Gates
- Compliance, Benefits, Budget & Costs, Procurement

Page-level read-only per role is a separate piece of work (PRD amendment A1).

## Flags and reminders in detail

- **Flag reasons** are managed by PMO Admins in **Timesheet Review Reasons › Flag reasons**. The starting list is in SQL v1474.
- A flag is **advisory**. It never blocks Approve or Reject. Approving or rejecting the entry resolves it automatically; the person who raised it can withdraw it before then. Every flag is kept.
- A reminder lists only people with **no entry** or with **drafts** in the period. Everyone is ticked by default and can be unticked. People without an email address get the in-app notification only.

## Who else changed

- **Team Managers** now carry the `user.invite` permission, so they keep inviting after the security fix.
- **Security fix (A8):** invitations used to be possible for anyone with any role on the project. Now only these can invite:
  - organisation admins / PMO;
  - the project's named PM;
  - roles with the invite permission: PM, Team Manager, Project Administrator, and Programme Manager / Board Member / Sponsor as before.
  v1472 ends with a check listing recent invitations that would now be refused.
- **Every role with My Tasks** gets My Approvals and Meeting Follow-ups. **Every role with Governance Meetings or Stage Gates** gets Approvals History.

## Rollback

- **Menus:** set the v1471 / v1476 placements and the `project_administrator` grants to `is_active = FALSE`; set the new `menu_items` to `is_active = FALSE`.
- **Invite rules:** re-run `SQL/v597_invite_rpc_pm_permissions_and_names.sql`, which restores the old invite function. `remove_project_member` can stay unused once the app calls are reverted (git).
- **Timesheets:** re-run the `timesheet_entries_select` policy from `SQL/v1172`. The flag and reminder tables can stay; nothing else depends on them.
