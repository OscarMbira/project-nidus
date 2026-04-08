# v229 Stakeholder save button stuck on "Saving..."

## Objective
Fix the stakeholder create/update flow where the submit button could remain on **Saving...** indefinitely instead of completing or showing an error.

## Root cause
- **`getUser()`** could stall on server JWT validation; **`getSession()`** alone could still stall in edge cases.
- **Supabase insert/update** could hang with no response.
- **Form `finally`** only runs when the inner `await` chain settles — a never-resolving promise left **Saving…** forever.
- **FK error `stakeholders_created_by_fkey`**: audit columns reference **`public.users(id)`**, not **`auth.users`**. Code was using **auth uid** for **`created_by`**, which fails when **`users.id` ≠ auth uid**.

## Fix
- **`getPlatformUserId()`**: resolve **`public.users.id`** via **`auth_user_id`** (cached); use for **`created_by` / `updated_by` / `deleted_by`** across stakeholder service writes.
- **`getAuthSessionUserId()`**: `getSession()` wrapped in **`withTimeout` (8s)**.
- **`saveStakeholder`**: **`pickStakeholderWritePayload`** whitelist; insert/update wrapped in **`withTimeout` (45s)**.
- **`StakeholderForm`**: entire save IIFE **`Promise.race`** with **55s** UI timeout + **`clearTimeout`** in `finally`; safer **`alert` message**.
- Tests mock **`users`** lookup + **`getSession`**.

## Todo
- [x] Implement `getAuthUserId()` and replace `getUser()` in stakeholder service writes
- [x] Update `stakeholderService.test.js` mock
- [x] Document change

## Review
- **Files:** `src/services/stakeholderService.js`, `src/services/__tests__/stakeholderService.test.js`, `src/components/stakeholders/StakeholderForm.jsx`, `Documentation/Stakeholder_Save_Session_Fix.md`
- **Behaviour:** Saves complete, show an error, or hit a timeout — **Saving…** should not stick indefinitely.
- **Note:** If timeouts persist, investigate Supabase/network/RLS; keep tab focused while saving.
