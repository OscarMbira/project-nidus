# v576 — Invitation Email Project Context Plan

**Objective:** Enrich project invitation emails with project details (description, type, methodology, dates) and portfolio/programme hierarchy, using informative copy when not linked. Support template placeholders and auto-appended blocks on every send.

**Status:** Complete

---

## Design decisions

| Topic | Decision |
|---|---|
| Delivery | Auto-append HTML/plain **Project context** card on every invitation send (server-side in `dispatchProjectInvitationEmail`) |
| Empty description | Omit description row |
| Methodology | `projects.delivery_methodology` |
| Unlinked portfolio/programme | “This project is not currently assigned to a portfolio/programme.” |
| Template placeholders | Optional `{{project_*}}`, `{{portfolio_context_line}}`, `{{hierarchy_block}}`, `{{project_context_block}}`, etc. |
| Invitation URL | Project code in path (`/auth/invitation/{code}/{role}?token=…`) |
| SQL templates | No migration required — append is code-only |

---

## Implementation checklist

### Phase 1 — Data & blocks

- [x] `src/services/invitationProjectContextService.js` — `loadInvitationProjectContext`, `buildMockInvitationProjectContext`
- [x] `src/utils/invitationEmailBlocks.js` — `formatProjectContextBlockHtml` / `formatProjectContextBlockPlain`
- [x] Portfolio/programme via `getProjectPortfolio` / `getProjectProgramme`

### Phase 2 — Send path & placeholders

- [x] `resolveInvitationTemplatePlaceholders` — project context tokens
- [x] `dispatchProjectInvitationEmail` — load context, resolve message placeholders, append blocks
- [x] `sendInvitationReminder` — uses `dispatchProjectInvitationEmail` + friendly URLs
- [x] `src/utils/invitationUrlUtils.js` — project code paths, decline `?action=decline`

### Phase 3 — UI & preview

- [x] `InviteUserForm.jsx` — load `projectContext` on project change; pass to placeholder resolution and dispatch
- [x] `TemplatePreviewPanel.jsx` + `ProjectContextPreview.jsx`
- [x] `InvitationTemplatesPage.jsx` — sample preview includes mock context
- [x] `TemplateVariablesHelper.jsx` — document new variables

### Phase 4 — Organisation / decline (related fixes)

- [x] `normalizeInvitationMessageOrganisation` — sign-off uses real org name
- [x] Decline + Accept buttons in invitation HTML
- [x] `InvitationAccept.jsx` — `?action=decline`, token from path or query

### Phase 5 — Tests & verification

- [x] `src/services/__tests__/invitationProjectContext.test.js`
- [x] `src/features/invitation-templates/utils/resolveInvitationTemplatePlaceholders.test.js`
- [x] `src/utils/__tests__/invitationUrlUtils.test.js`

---

## Key files

| Area | Path |
|---|---|
| Context loader | `src/services/invitationProjectContextService.js` |
| Email blocks | `src/utils/invitationEmailBlocks.js` |
| Send | `src/services/invitationService.js` |
| Placeholders | `src/features/invitation-templates/utils/resolveInvitationTemplatePlaceholders.js` |
| Invite UI | `src/components/app/InviteUserForm.jsx` |
| Preview | `src/features/invitation-templates/components/TemplatePreviewPanel.jsx` |
