# v1343 — Project Administrator (Support menu pack) — PRD

**Status:** Approved 2026-11-14 — amended after the audit (see “Amendments (audit 2026-11-14)” below, which override D7, D8, D11 and D13)  
**Apps:** Platform + Simulator practice (rule 34.1). Simulator **learning** path keeps the existing “Project Coordinator” label. Admin: Menu Placements must accept the new placement key if exposed there.  
**Related:** `professional_roles.project_administrator` (v919, informational only); consolidated role menus (v1341 / rules 70 & 75); `project_functional_roles` (v1084); Simulator `project_coordinator` learning role (v734); assignable roles RPC (v908).

## a) Problem statement

Real project implementations almost always need a **Project Administrator** — the person who assists the Project Manager with meetings, reports, timesheets chase, action logs, schedule/RAID hygiene, documents and day-to-day coordination.

Today the product only has “Project Administrator” as an informational **professional role** (`SQL/v919_professional_roles_schema.sql`). It does **not**:

- Appear as an invite / project-membership choice  
- Own a consolidated **Support** sidebar layout  
- Carry menu grants distinct from Team Member or Project Manager  
- Appear in Project Roles & Skills as a default functional role  

Operators therefore either over-privilege someone as Project Manager, or under-privilege them as Team Member, and lose a clear “PM assistant” seat on every project.

## b) Solution

Ship a **system-default Project Administrator** on every project:

1. A thin built-in access / membership role (`role_name = project_administrator`) used for invites, `role_menu_items`, and membership — **not** conflated with “full PM security”.  
2. A dedicated consolidated **placement key** `support` (Support menu pack): same nine work-based sections as other roles, **curated pages** for the PA job — **not** a tenth sidebar section named “Support”.  
3. Invite picker label **Project Administrator** → that role + Support layout.  
4. Default **functional** Project Administrator + skills in the Project Roles & Skills catalog.  
5. Keep existing `professional_roles.project_administrator` as the registration/job-label picklist (aligned naming).  
6. Simulator **practice** projects mirror Platform; Simulator **learning** retains “Project Coordinator” as the certificate / learning-path label for now.

## c) User stories

1. As a PM or Team Manager, I can invite a user as **Project Administrator** from the standard project invite / assignable-roles picker.  
2. As a PMO / org admin, I can assign Project Administrator on any project without creating a custom org role first.  
3. As a Project Administrator, after accept I see the **Support** consolidated sidebar (placement `support`), not the full PM menu and not the Team Member “mine-only” menu.  
4. As a Project Administrator, I can **edit/maintain** Requirements, Schedule, RAID, Actions, Meetings, Reports, Documents, Timesheets (entry/update/chase), Stakeholders, Communication Plan, Tasks, Testing/Defects logistics, and the other **(E)** surfaces in the Support tree below.  
5. As a Project Administrator, I **cannot** formally **Approve** timesheets (Team Manager / Project Manager retain Approve).  
6. As a Project Administrator, I **cannot** Approve/Reject governed change / authorisation decisions.  
7. As a Project Administrator, I **cannot** redesign Governance Setup, edit Regional & Format / Custom Fields admin / industry module switch-off, or exercise budget / procurement sign-off.  
8. As a Project Administrator, I **can invite and remove** project members for roles at **project-tier level ≤ 7** (including other PAs and Team Members); I **cannot** invite/remove Team Manager or Project Manager.  
9. As a Team Member, I **cannot** assign Project Administrator (level 7 above my cap).  
10. As a PM, I see Project Administrator in Project Roles & Skills with default skills (meetings, actions, reporting, timesheet admin, document control, schedule/RAID maintenance).  
11. As a new registrant, I can still pick **Project Administrator** as my professional role (v919) without that alone granting Support menus.  
12. As a Simulator learner on a **practice** project, membership as Project Administrator yields the same Support menu behaviour as Platform.  
13. As a Simulator Free-tier learner on the **learning** path, I still see **Project Coordinator** naming for courses/certificates until a later rename PRD.  
14. As an operator, light/dark and mobile layouts remain readable on the Support sidebar (rule 28.1 / 29).

### Support menu structure (confirmed)

Markers: **(V)** view · **(E)** maintain/update · **(A)** check/flag only where noted — formal Approve excluded for timesheets.

```text
PROJECT ADMINISTRATOR  (Support layout — system default)
│
├── 1. Home
│   ├── My Dashboard            tabs: Health · Milestones · Schedule · RAID · Changes ·
│   │                                 Quality · Testing · Resources · Upcoming Actions · Meetings
│   ├── My Work                 tabs: Tasks · Actions · Meeting follow-ups
│   ├── My Approvals            tabs: Timesheet checks/flags · Document reviews assigned to me
│   │                           (no formal timesheet Approve)
│   ├── Messages                tabs: Comms Hub · Channels · Direct · Meeting Summaries
│   └── Ask Nidus
│
├── 2. Project Setup
│   ├── Project Details (V)
│   ├── ◆ Delivery Overview (V)
│   ├── Mandate / Brief / Business Case / PID / BRP (V)
│   ├── Project Team (E)        tabs: Members (V+invite/remove per D8) · Roles & Skills (V) ·
│   │                                 RACI (E) · Team Structure (V) · Contact Directory (E)
│   ├── Governance Setup (V)
│   └── Project Settings        tabs: Working Days & Holidays (V) · Timesheet Settings (V) ·
│                                     Document Signatory (V) · Environments (V)
│       — excluded: Regional & Format edit, Custom Fields admin, Industry Modules switch-off
│
├── 3. Scope & Requirements
│   ├── Scope Statement (V)
│   ├── Requirements (E)
│   ├── Products & Deliverables (E)
│   ├── WBS & Work Packages (V / light E)
│   └── ◆ Design / Interfaces (V)
│
├── 4. Plan & Schedule
│   ├── Schedule (E)
│   ├── Milestones (E)
│   ├── Dependencies (E)
│   ├── Baselines (V)
│   ├── Delays (E)
│   ├── Scenario Planning (V)
│   └── Planning Assumptions (E)
│
├── 5. Deliver & Test
│   ├── Tasks & Board (E)
│   ├── ◆ industry delivery pages (E) where PA is coordinating
│   ├── Quality (E)
│   ├── Testing (E)
│   └── Defects (E)
│
├── 6. Risks, Changes & Governance
│   ├── RAID Log (E)
│   ├── Risks / Issues / Assumptions & Constraints (E)
│   ├── Change Requests         raise + track (E); Decisions (V) — no Approve/Reject
│   ├── Decisions (V / minute)
│   ├── Actions (E)
│   ├── Governance              tabs: Stage Gates (V) · Meetings (E) · Approvals History (V)
│   ├── Compliance (V / evidence chase)
│   └── Lessons (E)
│
├── 7. Stakeholders & Adoption
│   ├── Stakeholders (E)
│   ├── Communication Plan (E)
│   ├── ◆ Business Change (V / E support)
│   └── ◆ Training (E)
│
├── 8. Readiness, Benefits & Close
│   ├── ◆ Operational Readiness / Cutover / Go-Live (E)
│   ├── Benefits & Results (V / measure chase)
│   └── Project Closure (E)     checklist logistics; Closure Report (V until PM owns)
│
├── 9. Money & Resources
│   ├── Budget & Costs (V)
│   ├── Resources (E)
│   ├── Timesheets (E)          enter, update, chase, flag — no formal Approve
│   └── Procurement (V)
│
└── Footer
    ├── Reports (E)
    └── Documents (E)
```

## d) Implementation decisions

| # | Decision | Outcome |
|---|---|---|
| D1 | Nature | PM-assistant **job** + Support **menu pack**. Not a tenth “Support” section. Not “full PM” RBAC. **Confirmed.** |
| D2 | Availability | **System default** on every project (built-in role + placements + grants). Not org-custom-only. **Confirmed.** |
| D3 | Invite label | Picker shows **Project Administrator** → thin access role + Support layout. **Confirmed.** |
| D4 | Codes | `roles` / `project_roles.role_name` = `project_administrator`; placement key = **`support`**. **Confirmed.** |
| D5 | Level | `project_roles.role_level` = **7** (below Team Manager 8 / PM 9; above Team Member 4). Org-tier `roles.role_level` chosen consistently in the plan (between team and PM bands). **Confirmed.** |
| D6 | Menu breadth | Support tree above; Requirements / Schedule / RAID and other **(E)** markers stay editable. **Confirmed.** |
| D7 | Timesheets | Enter / update / chase / flag only; **formal Approve** remains Team Manager / Project Manager. **Confirmed.** |
| D8 | Invite/remove | **Allowed**, capped at assignable **level ≤ 7** (standard `get_assignable_project_roles` behaviour). Cannot assign Team Manager or Project Manager. **Confirmed.** |
| D9 | Authority exclusions | No governed Approve/Reject; no budget/procurement authority; no Governance Setup redesign; no Regional & Format / custom-field admin / industry switch-off. **Confirmed.** |
| D10 | Professional role | Keep v919 `professional_roles.project_administrator`; do not treat it as authorization. **Confirmed.** |
| D11 | Functional catalog | Seed Project Administrator + default skills (meetings, actions, reporting, timesheet admin, document control, schedule/RAID maintenance). Platform + Simulator. **Confirmed.** |
| D12 | Simulator | Practice memberships/menus mirror Platform. Learning path / certificates keep **Project Coordinator** label for now. **Confirmed.** |
| D13 | Docs | Update `Consolidated_Role_Menus_Proposal.md` §5 catalogue + new §6.x Support menu; placement tables; taxonomy only if new menu items are added (none expected — grants/placements of existing items). Rules 70 / 75. **Confirmed.** |
| D14 | Delivery team grants | Include `project_administrator` in menu grant helpers where the Support pack should receive the same industry/local-register pages as delivery support (plan specifies whether `delivery_team` group or a dedicated `support` grant group). *Plan detail.* |

## e) Testing decisions

- **Unit:** `ROLE_PLACEMENT_KEYS` / `resolvePlacementKey` map `project_administrator` → `support`; `menuLayoutUtils` treats Support chrome correctly; assignable-level tests (Team Member, level 4, cannot assign PA; PM can; PA can assign ≤ 7 except governance roles).  
- **SQL:** idempotent seed of `roles` + `project_roles` + `role_menu_items` + `menu_item_placements` for `support`; audit query (v1452-style) shows no unplaced Support grants.  
- **Manual smoke:** invite as Project Administrator; sidebar matches Support tree; timesheet Approve disabled/hidden; invite Team Member succeeds; invite Project Manager fails; light/dark; Simulator practice project.  
- **Done:** every new project can assign PA out of the box; Support layout is distinct from PM and Team Member; exclusions in D7–D9 hold.

### Amendments (audit 2026-11-14)

The PRD audit (`projectplan/v1343_project_administrator_support_role_plan.md` §1, gaps G1–G16) led to these owner decisions. Where they differ from D1–D14, they win.

| # | Amendment |
|---|---|
| A1 (G-D1) | **(V) means "view-only intent" in the menu** (sidebar eye icon). Pages are not made read-only per role in v1343. Server-side enforcement covers the D7 / D9 authority exclusions that are role-based: timesheet Approve, governed approvals (approval chains), Industry Modules switch-off. The guide lists the pages a PA can still edit. Page-level read-only is a separate PRD. |
| A2 (G-D2, replaces D7) | **Timesheets:** the PA can **read** the project team's timesheets (Team Timesheets, no Approve / Reject). **Send reminder:** PA / Team Manager / PM pick a period; members with missing or draft entries get an in-app notification and an email; every send is logged; manual only. **Flag:** the PA flags an entry with one or more reasons from a managed catalogue plus a note. Approvers see a badge. The flag is **advisory** (never blocks the decision), resolves when the entry is decided or is withdrawn by the PA, and keeps full history. |
| A3 (G-D3, refines D8) | A PA may invite **and remove** roles at level ≤ 7 **except** governance-only roles and Project Assurance, Quality Assurance and Change Authority. Enforced in the database (invite RPC, assignable-roles RPC, new remove RPC), not only in the picker. |
| A4 (G-D4, replaces D13's "no new menu items") | New pages, project-scoped, Platform + Simulator, for every role with the matching area: **Home › My Approvals** (tabs: Timesheet flags · Document reviews), **My Work › Meeting follow-ups**, **Governance › Approvals History** (read-only). Tabs on My Dashboard / My Work / Messages / Governance use the v1341 slot tab strip over existing pages. Taxonomy and placements per rules 70 / 75. |
| A5 (G-D5) | Placement order pm → team → support: when someone is both Team Manager and PA, the Team Manager menu wins. The Support menu is **compact**: it shows only pages placed for it. |
| A6 (G-D6) | `Documentation/Consolidated_Role_Menus_Proposal.md` is updated for this PRD (§5 Support, new §6.x Support menu, placement rows). |
| A7 (G-D7, replaces D11's seed) | The functional Project Administrator comes from the built-in role's `role_skills`, added from **Add from Built-in Roles**. No rows are written to existing projects. |
| A8 (G-D8) | **Security fix:** invitations are allowed only for org admins / PMO, the project's PM, or a project role with the `user.invite` permission (closes "any role on the project can invite"). |
| A9 (G2) | A PA gets the **PM-style shell** (`PM_LAYOUT_ROLES`) whether consolidated menus are on or off. With them off, the sidebar is the PM layout trimmed by the PA's grants. |
| A10 (G15) | Level 7 on both role scales (`roles` and `project_roles`). |

## f) Out of scope

- Renaming Simulator learning “Project Coordinator” → “Project Administrator” (follow-up PRD).  
- Making professional_roles drive RLS or menus.  
- Full Project Manager grants under a PA label.  
- A new top-level sidebar section named Support.  
- Changing Team Member or Team Manager menus except where shared grant helpers must list the new role.  
- Admin-schema role definitions (Admin only needs placement-key awareness if Menu Placements UI lists keys).

## g) Further notes

- Distinguish three layers in all docs and UI copy: **professional** (v919) · **functional** (Project Roles & Skills) · **access** (`project_administrator` + `support` layout).  
- Permissions JSON on `project_roles` must include whatever the product already uses for membership invite/remove at this tier (align with Team Manager patterns where safe, without PM-only flags such as `budget.manage`). Exact permission list is a plan item.  
- Wire invitation templates / `defaultInvitationMessages` for Project Administrator.  
- Update `ROLE_PLACEMENT_KEYS`, custom-role `menu_layout_key` CHECK (if Support should be selectable for custom roles later — default **yes, Support appears as a layout option**), and Admin Menu Placements if applicable.  
- Next step after PRD approval: versioned implementation plan under `projectplan/` (rule 18.1), then owner approval before coding.
