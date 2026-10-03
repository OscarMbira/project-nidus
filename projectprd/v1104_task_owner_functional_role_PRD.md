# v1104 — Create Task: task owner + functional role (skills read-only)

## a) Problem statement

Create Task already has **Assign To**, but it does not capture the delivery **role** the work needs, nor surface the **skills** defined in Team / Project Functional Roles setup. Showing a redundant **Project** picker/label when the current project is already in context adds noise.

## b) Solution

1. Treat **Assign To** as **Task owner** (same column: `assigned_to_user_id`) — rename label only.
2. Add optional **Role** from `project_functional_roles` for the current project.
3. Show **Skills** as read-only text derived from the selected role’s `required_skills` (no free-text skills on the task).
4. **Hide Project** on Create (and Edit when in project context): always use the resolved current project; no input.

## c) User stories

1. As a PM, I see **Task owner** (optional Unassigned) instead of “Assign To”.
2. As a PM, I can optionally pick a **Role** from this project’s functional roles catalog.
3. As a PM, when I pick a role, I see its **required skills** read-only (not editable on the task).
4. As a PM, clearing the role clears the skills display and nulls the FK.
5. As a PM, I do **not** see a Project field on Create when a current project is resolved; the task saves against that project.
6. As a PM, if no current project is resolved, Create shows a clear message and blocks save (no project dropdown).
7. As a PM, Edit / Detail can set or change the same owner + role + skills display (parity).
8. Platform and Simulator Create/Detail stay at parity for this behaviour.

## d) Implementation decisions (locked)

| Decision | Choice |
|----------|--------|
| Task owner | Existing `assigned_to_user_id`; UI label **Task owner** |
| Role | Optional FK `tasks.functional_role_id` → `project_functional_roles(id)` ON DELETE SET NULL |
| Skills | Display only from selected role’s `required_skills`; not stored on `tasks` |
| Role required? | **Optional** on create/save |
| Project UI | **Hidden** when current project resolved; no picker fallback |
| Filter owners by role | **Out of v1** (later enhancement) |
| Scope | `TasksCreate.jsx` + `TasksDetail.jsx` (Platform + Simulator) |
| Sim roles source | Same as Platform when page uses `public.tasks` / `public.project_functional_roles` |

## e) Testing

- Role select loads only active roles for current `project_id`.
- Skills panel updates when role changes; empty when no role.
- Insert/update payload includes `functional_role_id` (or null).
- Create with no project context blocks save with clear error.
- Manual: create with owner+role; create with role only; edit role; confirm skills match catalog.

## f) Out of scope

- Filtering Task owner list by people who hold the role on a team
- Free-text / override skills on the task
- Multi-assignee / RACI on create
- Changing `project_functional_roles` catalog from the task form

## g) Further notes

Builds on v1084 project functional roles and v1103 schedule essentials. User approved recommendation 2026-09-20.
