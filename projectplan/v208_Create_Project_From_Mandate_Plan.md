# v208 – Create Project From Mandate: Implementation Plan

## Problem Statement

The **"Create Project"** button on the Mandate View page (`/pmo/mandates/{id}/view`) is non-functional. When clicked:

1. It calls `createProjectFromMandate(mandate.id)` which invokes the `create_project_from_mandate` PostgreSQL RPC.
2. The RPC either fails silently or creates a **minimal, incomplete project** (only name, description, executive, manager).
3. After creation, it tries to navigate to `/projects/${projectId}` — but the actual registered route is `/app/projects/:id`, causing a broken redirect.
4. Even if the navigation succeeded, the user would land on a skeletal project record missing required fields (project type, methodology, budget, dates, etc.).

---

## Root Cause

| Issue | Detail |
|---|---|
| Wrong navigation route | `navigate('/projects/${id}')` instead of `navigate('/app/projects/${id}')` |
| Incomplete project record | DB function only inserts 6 fields; `projects` table needs ~30 fields |
| Poor UX | One-click creation with a browser `confirm()` dialog — no form, no pre-population |
| Mandate not properly linked | RPC links mandate but subsequent navigation fails so user never sees result |

---

## Recommended Approach

**Reuse the existing `ProjectsCreate` form** (rather than creating a new modal or fixing the DB function). This gives us:
- All existing validation, draft queue, tab navigation, and role assignment
- No duplicate form code
- A complete, properly-filled project record

### Flow

```
User clicks "Create Project" on Mandate View
        ↓
Navigate to /app/projects/create with mandate data in location.state
        ↓
ProjectsCreate page detects fromMandate state → shows banner + pre-fills fields
        ↓
User reviews pre-filled data, fills in remaining fields (type, methodology, dates)
        ↓
User submits form → project created normally via existing flow
        ↓
Post-creation: linkMandateToProject(mandateId, projectId) called automatically
        ↓
Navigate to /app/projects/{newProjectId}  (success)
```

---

## Files to Change

| # | File | Change Type | Description |
|---|---|---|---|
| 1 | `src/pages/mandate/ProjectMandateView.jsx` | Modify | Replace one-click handler with navigate to ProjectsCreate with mandate state |
| 2 | `src/pages/ProjectsCreate.jsx` | Modify | Read `location.state.fromMandate`, pre-populate form, show banner, link mandate after save |
| 3 | `src/services/projectMandateService.js` | Modify | Add `linkMandateToProject(mandateId, projectId)` function |

**No SQL changes required.** The mandate link is done via a simple `UPDATE` on `project_mandates` at the service layer.

---

## Detailed Todo List

### Phase 1 – Service Layer

- [ ] **1.1** Add `linkMandateToProject(mandateId, projectId)` to `projectMandateService.js`
  - Updates `project_mandates SET project_id = projectId, project_created_date = NOW()` where `id = mandateId`
  - Returns success/error

### Phase 2 – Update Mandate View

- [ ] **2.1** In `ProjectMandateView.jsx`, replace `handleCreateProject` body:
  - Remove `createProjectFromMandate` call and the browser `confirm()`
  - Navigate to `/app/projects/create` with `location.state`:
    ```js
    navigate('/app/projects/create', {
      state: {
        fromMandate: {
          mandateId: mandate.id,
          mandateReference: mandate.mandate_reference,
          mandateTitle: mandate.mandate_title,
          // Pre-population fields:
          project_name: mandate.mandate_title,
          project_description: mandate.background,
          executive_user_id: mandate.proposed_executive_id || '',
          business_objective: mandate.outline_business_case || '',
          mandate_status: 'approved'
        }
      }
    })
  ```
- [ ] **2.2** Remove import of `createProjectFromMandate` from `projectMandateService` (no longer needed at view level)

### Phase 3 – Update ProjectsCreate Form

- [ ] **3.1** Read `fromMandate` state at top of `ProjectsCreate.jsx`:
  ```js
  const fromMandate = location.state?.fromMandate
  ```

- [ ] **3.2** Pre-populate `formData` initial state with mandate values:
  - `project_name` ← `fromMandate.project_name`
  - `project_description` ← `fromMandate.project_description`
  - `executive_user_id` ← `fromMandate.executive_user_id`
  - `business_objective` ← `fromMandate.business_objective`
  - `mandate_status` ← `'approved'` (from mandate)

- [ ] **3.3** Add a "Creating from Mandate" info banner at the top of the form (only when `fromMandate` is set):
  - Shows: *"Creating project from Mandate: [MAN-2026-001] — key fields have been pre-filled from the mandate."*
  - Dismissable / informational only
  - Green info styling

- [ ] **3.4** After successful project creation in `handleSubmit`, if `fromMandate` state exists:
  - Call `linkMandateToProject(fromMandate.mandateId, project.id)`
  - Show success toast: *"Project created and linked to Mandate [ref] successfully."*

- [ ] **3.5** Fix post-creation navigation to use correct absolute path `/app/projects/${project.id}` (currently `/projects/${project.id}` — missing `/app` prefix). This is a general bug fix that benefits all project creations.

### Phase 4 – Verification

- [ ] **4.1** Test button on approved mandate → confirm navigation to ProjectsCreate with pre-populated fields
- [ ] **4.2** Test form submission → confirm project created + mandate linked (check `project_mandates.project_id` is set)
- [ ] **4.3** Test navigation post-creation → confirm user lands on correct project detail page
- [ ] **4.4** Test that "Create Project" button disappears from mandate view after project is created (already handled by `canCreate` check which verifies `mandate.project_id !== null`)
- [ ] **4.5** Confirm `mandate_status` field is set to `approved` in the new project's Document Governance section

---

## Data Pre-population Mapping

| Mandate Field | Project Field | Notes |
|---|---|---|
| `mandate_title` | `project_name` | Direct |
| `background` | `project_description` | Direct |
| `proposed_executive_id` | `executive_user_id` | Direct (UUID) |
| `outline_business_case` | `business_objective` | Direct |
| `'approved'` | `mandate_status` | Hardcoded since mandate is approved |
| mandate reference | shown in banner | Informational only |

Fields the user still needs to fill in:
- `project_type_id` (required)
- `methodology_id` (required)
- `start_date` / `end_date` (optional but important)
- `budget` / `budget_currency`
- Any other governance/lifecycle fields

---

## What Does NOT Change

- The `canCreateProject` logic (approved + no project_id already)
- The "Create Project" button visibility condition
- The `ProjectsCreate` multi-tab form structure
- The draft queue functionality
- Role assignment functionality
- All existing form validation

---

## Review Section

### Changes Made

| File | Change |
|---|---|
| `src/services/projectMandateService.js` | Added `linkMandateToProject(mandateId, projectId)` — simple `UPDATE project_mandates SET project_id, project_created_date` call |
| `src/pages/mandate/ProjectMandateView.jsx` | Removed `createProjectFromMandate` import + `creatingProject` state; replaced `handleCreateProject` to navigate to `/app/projects/create` with mandate data in `location.state`; simplified button JSX |
| `src/pages/ProjectsCreate.jsx` | Added `linkMandateToProject` import; read `fromMandate` from location.state; pre-populated `project_name`, `project_description`, `executive_user_id`, `business_objective`, `mandate_status`; added green mandate banner; after project creation calls `linkMandateToProject`; fixed navigation from `/projects/` → `/app/projects/` (two places) |

### Bugs Fixed
- Navigation route bug: `/projects/${id}` → `/app/projects/${id}` (in both `handleSubmit` and `handleAuthoriseProject`)
- "Hanging" button: replaced broken RPC one-click flow with proper full-form flow

### Behaviour After Implementation
1. User clicks "Create Project" on an approved mandate
2. Navigated to `/app/projects/create` with mandate data pre-filled
3. Green banner shows: "Creating project from Mandate: MAN-2026-001 — key fields have been pre-filled..."
4. Project Name, Description, Executive, Business Objective, Mandate Status are pre-filled
5. User completes remaining required fields (type, methodology, dates, budget)
6. On submit: project created → mandate linked → navigate to `/app/projects/{id}`
7. Mandate's "Create Project" button will no longer appear (existing `canCreate` check detects `project_id !== null`)
