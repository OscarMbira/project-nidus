# v604 — Smart User Detection on Invitation Accept Page

## Problem
All invitees — regardless of whether they have an existing account — are shown the "Create your account" form when opening an invitation link while not logged in. Existing registered users (PMs, Programme Managers, Portfolio Managers, Team Leads, Team Members) must create a duplicate account or get a 409 crash.

## Target Behaviour

| Invitee state | Right-panel shown |
|---|---|
| Currently logged in (session active) | Simple "Accept / Decline" confirmation (existing behaviour — correct) |
| Registered user, not logged in | "Welcome back — sign in to accept" with pre-filled email + password field |
| Brand new user (no account) | "Create your account" with password + confirm fields (existing behaviour) |

## Decision Logic
```
auth.getUser() → has session?
  YES → state = 'authenticated'
  NO  → RPC check_email_has_auth_account(invited_email)
          true  → state = 'registered'   (sign-in form)
          false → state = 'new'          (create account form)
```

## Todo List
- [x] SQL v618 — `check_email_has_auth_account` SECURITY DEFINER RPC (already created)
- [x] Replace `isExistingUser` boolean with tri-state `userStatus` ('authenticated' | 'registered' | 'new')
- [x] Add `handleSignInAndAccept()` — sign in then accept as authenticated user (covers all appointment flows)
- [x] Build "Registered not logged-in" right panel (welcome back + password + sign-in-and-accept)
- [x] Update "Authenticated" panel (no change to logic, minor label cleanup)
- [x] Keep "New user" panel unchanged
- [x] Update unit tests in `InvitationAccept.test.jsx`

## Files Changed
| File | Change |
|---|---|
| `SQL/v618_check_email_has_auth_account.sql` | Already created — deploy to Supabase |
| `src/pages/auth/InvitationAccept.jsx` | Replace isExistingUser with userStatus tri-state; add handleSignInAndAccept; three UI panels |
| `src/pages/auth/__tests__/InvitationAccept.test.jsx` | Add tests for registered-not-logged-in path |

## New Handler: handleSignInAndAccept
```
signInWithPassword(email, password)
  → on error: show password-wrong message
  → on success:
      fetch users.id by auth_user_id
      if appointmentFlow === 'manager' → acceptManagerAppointment
      else if appointmentFlow === 'team' → acceptTeamMemberAppointment
      else → acceptInvitation(token, userId)
      fire-and-forget: update users.organization
      navigate to project
```

## Review

### Changes Made
- **`SQL/v618_check_email_has_auth_account.sql`** — SECURITY DEFINER function lets the anon (unauthenticated) invitation page call an RPC to check whether an email is tied to an existing auth account, bypassing RLS safely.
- **`src/pages/auth/InvitationAccept.jsx`** — Replaced the single `isExistingUser` boolean with a `userStatus` tri-state (`loading | authenticated | registered | new`). Added `handleSignInAndAccept()` which signs the user in then routes through the existing acceptance flows (manager appointment, team appointment, or standard). Added `RegisteredPanel` JSX with pre-filled email, password input, forgot-password link, and "Sign In & Accept" button. `loadInvitation()` now calls `auth.getUser()` first; if unauthenticated it calls the `check_email_has_auth_account` RPC to choose between `registered` and `new` states.
- **`src/pages/auth/__tests__/InvitationAccept.test.jsx`** — Full test suite rewrite: 16 tests across 5 describe blocks covering authenticated, registered-not-logged-in, new user, metadata, and layout states. All 16 tests pass.

### Deployment Note
`SQL/v618_check_email_has_auth_account.sql` must be run against the Supabase SQL editor before the frontend change goes live — the page falls back gracefully (shows "Create account" form) if the function is missing, but the smart detection will not work.
