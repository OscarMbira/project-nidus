# Phase 13 — Role-Based Invitation Message Templates Implementation Plan

**Version:** v13.1  
**Date:** 2026-05-02  
**Feature:** Role-Based Default Invitation Messages  
**Target Audience:** PMO Admin, Programme Manager, Project Manager  

---

## 1. Overview

This plan implements a **role-based default invitation message template** system.  
When a PMO Admin or Project Manager invites a member, selecting a role from the dropdown  
**automatically pre-fills** the message textarea with the pre-configured default for that role.  
The inviter can still edit the pre-filled text before sending.

Templates are **account-scoped** — configured once by a PMO Admin, they apply to all  
invitations sent across all projects in that organisation. Project Managers can view  
and use the templates but cannot modify the master defaults.

### Key Capabilities
- One default message template per role (9 roles supported)
- Template variables resolved at fill-time: `{{project_name}}`, `{{role_name}}`, `{{inviter_name}}`
- Editable after auto-fill — templates are suggestions, not locked text
- "Reset to default" button to restore the pre-fill if the inviter has changed it
- Subject line field (reserved for future email service integration)
- Active/inactive toggle per template
- Metadata columns `created_by` / `updated_by` / timestamps on template rows (no separate audit log table)
- Dark theme aware, PWA/mobile responsive

---

## 2. Codebase Analysis — No Duplications Found

| Area | Finding |
|---|---|
| Invitation templates | **None exists** — `invitation_message` is ad-hoc free text per invitation |
| Invitation form | `src/components/app/InviteUserForm.jsx` — has message textarea, no default logic |
| Roles | 9 templates in `project_roles` (role_name: project_board_member → team_member) |
| SQL versioning | Phase 12 uses **v524–v528**; Phase 13 migrations are **`v529`–`v532`** |

---

## 3. Sidebar Placement

"Members & roles (invite / assign)" lives inside the **Projects** section in both
`pmoMenuConfig.js` and the DB `menu_items` table. **Invitation Templates** must sit
directly beneath it in that same section so users can configure templates without
leaving the members management area.

```
Projects
  ├── Project dashboard
  ├── My Projects
  ├── Project list (browse & edit)
  ├── Create project
  ├── Quick create (new wizard)
  ├── Archived projects
  ├── On hold / drafts
  ├── Members & roles (invite / assign)    /app/project-members      ← existing
  ├── Invitation Templates                  /app/settings/invitation-templates  ← NEW (order 9)
  └── Templates
```

Access rules:
- **PMO Admin / System Admin** — full CRUD (create, edit, activate/deactivate templates)
- **Programme Manager / Project Manager** — read-only (view templates, no editing)
- Form integration applies to all roles who can send invitations

---

## 4. Simulator Parity Note

The Simulator's member management (`SimProjectMembers.jsx`) uses **direct add only** —  
there is no invitation flow (no tokens, no emails, no `invitation_message` field).  
**This feature is Platform-only.** No Simulator DB or UI changes are required.  
If a future Simulator invitation flow is added, templates should be extended at that time.

---

## 5. Database Design

### New Table: `invitation_message_templates`

```sql
CREATE TABLE invitation_message_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID        NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role_name       TEXT        NOT NULL,   -- matches project_roles.role_name
  template_label  TEXT,                   -- friendly name e.g. "Project Manager Invite"
  subject_line    TEXT,                   -- reserved: future email subject
  message_body    TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      UUID        REFERENCES auth.users(id),
  updated_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_id, role_name)
);
```

### Template Variables (resolved client-side at fill-time)

| Variable | Resolved to |
|---|---|
| `{{project_name}}` | Selected project's display name |
| `{{role_name}}` | Human-readable role label (e.g. "Project Manager") |
| `{{inviter_name}}` | Logged-in user's full name |
| `{{organisation_name}}` | Organisation/account display name |

### RLS Policies

| Policy | Rule |
|---|---|
| SELECT | `user_has_access_to_account(account_id)` |
| INSERT | `is_pmo_admin_user()` AND `user_has_access_to_account(account_id)` |
| UPDATE | Same as INSERT |
| DELETE | Same as INSERT |

### SQL Files

| File | Purpose |
|---|---|
| `v529_invitation_message_templates_tables.sql` | Table DDL + unique constraint + RLS enable + `database_tables` registry |
| `v530_invitation_message_templates_rls.sql` | RLS policies |
| `v531_invitation_message_templates_seed.sql` | Seed 9 default messages for **all** existing accounts (`ON CONFLICT DO NOTHING`) |
| `v532_invitation_message_templates_sidebar.sql` | Insert `menu_items` row + `role_menu_items` grants |

---

## 6. Default Seed Messages (per role)

| Role | Seed Default Message |
|---|---|
| `project_board_member` | "You have been invited to join **{{project_name}}** as a **{{role_name}}**. In this capacity, you will provide strategic direction and governance oversight for the project. We look forward to your valuable contribution." |
| `project_sponsor` | "You have been invited to join **{{project_name}}** as **{{role_name}}**. Your sponsorship and executive support will be critical to the success of this project. Thank you for championing this initiative." |
| `programme_manager` | "You have been invited to join **{{project_name}}** as **{{role_name}}**. You will be responsible for coordinating delivery across the programme and ensuring benefits realisation. We look forward to working with you." |
| `project_manager` | "You have been invited to join **{{project_name}}** as **{{role_name}}**. You will lead day-to-day project delivery, manage the project team, and report progress to the project board. Welcome to the team." |
| `team_manager` | "You have been invited to join **{{project_name}}** as **{{role_name}}**. You will coordinate and lead your team's work packages and contribute to successful project delivery. Looking forward to collaborating with you." |
| `project_assurance` | "You have been invited to join **{{project_name}}** as **{{role_name}}**. Your independent assurance role will help ensure the project remains on track and aligned with organisational standards. Thank you for your involvement." |
| `quality_assurance` | "You have been invited to join **{{project_name}}** as **{{role_name}}**. You will oversee quality standards and ensure project deliverables meet the agreed quality criteria. Welcome aboard." |
| `change_authority` | "You have been invited to join **{{project_name}}** as **{{role_name}}**. You will review and approve changes to project scope, schedule, and budget within defined tolerances. We appreciate your participation." |
| `team_member` | "You have been invited to join **{{project_name}}** as a **{{role_name}}**. Your contributions will be an important part of delivering this project successfully. Welcome to the team!" |

---

## 7. Frontend Architecture

```
src/features/invitation-templates/
  api/
    invitationTemplatesApi.js        # CRUD for invitation_message_templates
  hooks/
    useInvitationTemplates.js        # Fetch + session-cache templates for current account
  components/
    RoleTemplateCard.jsx             # Single role editor card (label, subject, message, active toggle)
    TemplateVariablesHelper.jsx      # Info panel listing available {{variables}}
    TemplatePreviewPanel.jsx         # Live preview with sample variable resolution
  pages/
    InvitationTemplatesPage.jsx      # Main admin page (card grid of all 9 role templates)
```

### Updated Files

| File | Change |
|---|---|
| `src/components/app/InviteUserForm.jsx` | On role change → resolve template → pre-fill message; add "Reset to default" link |
| `src/App.jsx` | Register route `/app/settings/invitation-templates` |
| `src/config/pmoMenuConfig.js` | Add "Invitation Templates" menu entry |
| `src/config/pmMenuConfig.js` | Add "Invitation Templates" menu entry (read-only view) |

---

## 8. Todo List

### Phase 13-A: Database Layer
- [x] **A1** — Create `v529_invitation_message_templates_tables.sql`:  
  Table DDL (`invitation_message_templates`), unique on `(account_id, role_name)`, `ALTER TABLE ENABLE ROW LEVEL SECURITY`, register in `database_tables`
- [x] **A2** — Create `v530_invitation_message_templates_rls.sql`:  
  RLS policies — SELECT by `user_has_access_to_account`; INSERT/UPDATE/DELETE `is_pmo_admin_user()` + account access
- [x] **A3** — Create `v531_invitation_message_templates_seed.sql`:  
  Seed 9 default messages per existing account (`ON CONFLICT DO NOTHING`)
- [x] **A4** — Create `v532_invitation_message_templates_sidebar.sql`:  
  Insert `menu_items` row under `projects` parent, route `/app/settings/invitation-templates`, icon `mail`; `role_menu_items` for pmo_admin, system_admin, super_admin, org_admin, programme_manager, project_manager

### Phase 13-B: API Layer
- [x] **B1** — `src/features/invitation-templates/api/invitationTemplatesApi.js`:
  - `getTemplatesForAccount(accountId)`
  - `upsertTemplate(accountId, roleName, fields, authUserId)` — upsert `ON CONFLICT (account_id, role_name)`
  - `toggleTemplateActive(id, isActive, authUserId)`
  - `resetTemplateToDefault(accountId, roleName, authUserId)` / `resetAllTemplatesToDefaults`
  - `ensureTemplatesForAccount(accountId, authUserId)` — insert missing roles from shared constants

### Phase 13-C: React Hook
- [x] **C1** — `src/features/invitation-templates/hooks/useInvitationTemplates.js`:
  - Session cache (5 min TTL), `prefetchEnsure` for PMO admin page to run `ensureTemplatesForAccount` before fetch
  - Expose: `{ templates, loading, error, getTemplateForRole, refetch }`

### Phase 13-D: Components
- [x] **D1** — `RoleTemplateCard.jsx` — save, reset, active toggle, preview panel, read-only for non-PMO
- [x] **D2** — `TemplateVariablesHelper.jsx` — collapsible + copy buttons
- [x] **D3** — `TemplatePreviewPanel.jsx` — `react-markdown` preview toggle

### Phase 13-E: Admin Page
- [x] **E1** — `InvitationTemplatesPage.jsx` — grid + table view (`useViewMode` + `useSortableTable`), search, export JSON/CSV, reset all (PMO), `isPmoAdmin` for edit vs read-only

### Phase 13-F: InviteUserForm Integration
- [x] **F1** — `InviteUserForm.jsx` — `useInvitationTemplates`, project + account + inviter context, role-change logic, restore prompt, default/custom tag, reset link

### Phase 13-G: Routing & Sidebar Config
- [x] **G1** — `App.jsx` route `app/settings/invitation-templates`
- [x] **G2** — `pmoMenuConfig.js` — entry order 9; Templates → 10; My daily log → 11; `permission: 'pmo.admin'`
- [x] **G3** — `pmMenuConfig.js` — read-only entry with `permission: 'project.view'`

### Phase 13-H: Unit Tests
- [x] **H1** — `invitationTemplatesApi.test.js`
- [x] **H2** — `useInvitationTemplates.test.js`
- [x] **H3** — `InviteUserForm.test.jsx` + `resolveInvitationTemplatePlaceholders.test.js`

---

## 9. File Count Summary

| Layer | New / Updated Files |
|---|---|
| SQL | 4 new (v529–v532) |
| API | 1 new |
| Hook | 1 new |
| Utils + constants | 2 new |
| Components | 3 new |
| Pages | 1 new |
| Route / Config updates | 3 updated |
| Existing form update | 1 updated (`InviteUserForm.jsx`) |
| Unit tests | 4 new |
| **Total** | **16** |

---

## 10. Build Order (sequenced)

```
A (DB) → B (API) → C (Hook) → D (Components) → E (Page) → F (Form Integration) → G (Routing) → H (Tests)
```

---

## 11. Acceptance Criteria

- [x] PMO Admin can open "Invitation Templates" from the sidebar and see a card for each of the 9 roles
- [x] PMO Admin can edit the message body, subject line, and label for any role and save successfully
- [x] A success confirmation is shown after saving with role name and timestamp
- [x] PMO Admin can toggle a template inactive; inactive templates are not used for pre-filling
- [x] "Reset to default" on a card restores the seed default message with confirmation
- [x] When inviting a member and selecting a role, the message textarea auto-fills with the active template for that role
- [x] Template variables (`{{project_name}}` etc.) are resolved to real values before pre-filling
- [x] If the inviter has typed a custom message and then changes the role, the system shows "Restore default?" instead of silently overwriting
- [x] "Reset to default" link below the message textarea restores the current role's template
- [x] Project Manager sees templates page in read-only mode (no save buttons)
- [x] All pages are dark-theme aware and mobile/PWA responsive
- [x] Table view has sortable column headers
- [x] Card/Table toggle view is remembered per user in localStorage (`useViewMode`)

---

## 12. Review Section

**2026-05-02 — Implementation complete (v13.1)**

- **Database:** `SQL/v529`–`v532` — table `public.invitation_message_templates`, RLS using `user_has_access_to_account` + `is_pmo_admin_user()`, seed for all accounts, sidebar `menu_items` + `role_menu_items`.
- **Application:** Feature folder `src/features/invitation-templates/` (API, hook, constants, utils, three components, admin page). Route **`/app/settings/invitation-templates`** in `App.jsx` (before `app/*` redirect). **`InviteUserForm`** loads project + organisation + inviter, uses templates by `account_id`, role-change / restore-default UX, and default vs custom indicator.
- **Navigation:** `pmoMenuConfig` (PMO admin permission) and `pmMenuConfig` (project.view) updated.
- **Tests:** API, hook, placeholder resolver, and `InviteUserForm` behaviour (Vitest + Testing Library).
- **Note:** Programme / project managers reach the page via the Platform menu; PMO-only items in `pmoMenuConfig` remain gated by `pmo.admin`. New accounts created after migrations should receive rows when a PMO admin opens the templates page (`ensureTemplatesForAccount`) or by re-running / extending **v531** for new accounts.

---
