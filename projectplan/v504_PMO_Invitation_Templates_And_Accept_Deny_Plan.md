# v504 – PMO Invitation Templates & Invitation Accept/Deny Flow

**Date:** 2026-05-10
**Feature:** PMO invitation template auto-fill + invitation accept/deny confirmation

**Status:** Implemented (100%)

---

## Context

The user referenced `Developer Images/PMO Member Invite v1.png` which shows the
"Add project member" form and wants two improvements:

1. **Template auto-fill** – When the PMO selects a role in the *Send Role Invitations*
   page, the message field should pre-populate from the existing template for that role
   (PM role template is the default). The InvitationTemplatesPage already exists and
   InviteUserForm already uses the template system — SendRoleInvites.jsx is the one
   missing this integration.

2. **Accept / Deny email flow** – The invited user should be able to accept **or deny**
   the invite. On acceptance the role becomes active; on denial the invitation is marked
   `declined` (role stays inactive). The `InvitationAccept.jsx` page already exists with
   Accept only — needs a Deny button. The route `/auth/invitation/:token` is also
   **unregistered** in App.jsx (critical fix).

---

## What already exists (do NOT recreate)

| Item | Location |
|------|----------|
| Invitation templates CRUD | `src/features/invitation-templates/api/invitationTemplatesApi.js` |
| `useInvitationTemplates` hook | `src/features/invitation-templates/hooks/useInvitationTemplates.js` |
| `resolveInvitationTemplatePlaceholders` | `src/features/invitation-templates/utils/resolveInvitationTemplatePlaceholders.js` |
| Default messages per role | `src/features/invitation-templates/constants/defaultInvitationMessages.js` |
| InvitationTemplatesPage (admin) | `src/features/invitation-templates/pages/InvitationTemplatesPage.jsx` |
| Template auto-fill UX (reference) | `src/components/app/InviteUserForm.jsx` |
| InvitationAccept page | `src/pages/auth/InvitationAccept.jsx` |
| `acceptInvitation(token, userId)` | `src/services/projectMembershipService.js` |
| `declineInvitation(invitationId)` (direct table update; PMO / RLS-dependent) | `src/services/projectMembershipService.js` |
| `declineInvitationByToken(token)` (RPC; works from email link without invitee UPDATE RLS) | `src/services/projectMembershipService.js` |
| `decline_project_invitation(p_token)` | `SQL/v533_decline_project_invitation_rpc.sql` |
| `getInvitationByToken(token)` | `src/services/invitationService.js` |

---

## Todo List

### Phase 1 – Critical route fix (Feature 2 prerequisite)
- [x] **1.1** Register `/auth/invitation/:token` route in `src/App.jsx` pointing to
  `InvitationAccept.jsx` (currently the page exists but is never reached)

### Phase 2 – Template auto-fill in SendRoleInvites.jsx (Feature 1)
- [x] **2.1** Load the current user's `account_id` in `SendRoleInvites.jsx`
  (via `platformDb` query on `projects` or `users`, same pattern as `InviteUserForm.jsx`)
- [x] **2.2** Wire `useInvitationTemplates({ accountId })` hook into `SendRoleInvites.jsx`
- [x] **2.3** Add `useRef` tracking for last auto-filled message (copy pattern from
  `InviteUserForm.jsx` `lastAutoFilledRef` / `prevRoleIdRef`)
- [x] **2.4** On role change, resolve template → call
  `resolveInvitationTemplatePlaceholders(body, ctx)` and auto-fill the message textarea
  (PM role template loads as default since PM is the first selectable role)
- [x] **2.5** Add "Using default template" indicator and "Reset to default" button
  below the message textarea (same styling as `InviteUserForm.jsx`)
- [x] **2.6** Allow the user to freely edit the message (custom message overrides the
  template but "Reset to default" restores it)

### Phase 3 – Deny button in InvitationAccept.jsx (Feature 2)
- [x] **3.1** Import `declineInvitationByToken` from `projectMembershipService` and
  `getInvitationByToken` from `invitationService` into `InvitationAccept.jsx` (token-based
  decline matches email-link UX; `declineInvitation(id)` retained for other callers)
- [x] **3.2** Fetch invitation by token using `getInvitationByToken` to obtain the
  invitation `id` (store as state alongside existing invitation details); falls back to
  `invitation_id` from `validateInvitationToken` when RLS blocks the extra fetch
- [x] **3.3** Add `declining` + `declined` state variables
- [x] **3.4** Add "Decline Invitation" button next to the existing "Accept Invitation"
  button; show a confirmation step before calling `declineInvitationByToken(token)`
- [x] **3.5** On successful decline: show a "Invitation Declined" success screen
  (no redirect required — user stays on page with a message and link to login/home)
- [x] **3.6** Update visual layout: Accept button = blue primary; Decline = red/outlined

### Phase 4 – Unit tests
- [x] **4.1** Add tests for Decline flow in `src/pages/auth/__tests__/InvitationAccept.test.jsx`
- [x] **4.2** Routing tests: no existing harness asserts `App.jsx` route tables; change
  verified via implementation and manual `/auth/invitation/:token` navigation.

---

## Files changed / added

| File | Change |
|------|--------|
| `src/App.jsx` | Add `/auth/invitation/:token` route + lazy `InvitationAccept` |
| `src/pages/admin/SendRoleInvites.jsx` | Template auto-fill (Phases 2.1–2.6) |
| `src/pages/auth/InvitationAccept.jsx` | Decline + confirmation + success screen (Phase 3) |
| `src/services/projectMembershipService.js` | `declineInvitationByToken` calling RPC |
| `SQL/v533_decline_project_invitation_rpc.sql` | `SECURITY DEFINER` decline by token (`anon` + `authenticated` execute) |
| `src/pages/auth/__tests__/InvitationAccept.test.jsx` | Decline interaction tests |

---

## Review

**Summary**

1. **Route** – `/auth/invitation/:token` is registered with `ThemeProvider` + lazy-loaded `InvitationAccept`, consistent with `auth/confirm-email`.

2. **Send Role Invitations** – After project selection, `platformDb` loads `account_id`, org display name, and project name; `useInvitationTemplates` supplies role templates; message auto-fill, “Using default template”, “Reset to default”, and “Role changed — restore default?” mirror `InviteUserForm`. Clearing the form or changing project resets template refs.

3. **Invitation accept / decline** – Decline uses an explicit confirmation step, then `declineInvitationByToken` → `decline_project_invitation` RPC so invitees clicking the email link can decline without authenticated `UPDATE` rights on `project_invitations`. Success UI shows decline confirmation with optional invitation UUID and links to login and home. Accept behaviour is unchanged.

4. **Backend** – Apply `SQL/v533_decline_project_invitation_rpc.sql` on Supabase before relying on decline-from-link in non-admin environments.

**Tests**

- `npx vitest run src/pages/auth/__tests__/InvitationAccept.test.jsx` (covers Decline + Confirm decline + token passed to service).
