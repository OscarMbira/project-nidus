# Stakeholder save — session-based auth (hang fix)

## Symptom
On **Add/Edit Stakeholder**, the primary submit button could stay on **Saving...** and never navigate or show an error.

## Cause
1. **`auth.getUser()`** can wait on a **network validation** of the JWT. If that never completes, the save promise never settles and **`setSaving(false)`** never runs.
2. A **stuck Supabase HTTP request** (no response) can keep the insert/update promise pending forever.
3. **Background browser tabs** can throttle timers, delaying service-level timeouts.
4. **Foreign key `stakeholders_created_by_fkey`**: `created_by` / `updated_by` reference **`public.users(id)`**, not **`auth.users(id)`**. The app stores **`users.auth_user_id`** = Supabase Auth id; **`users.id`** is the primary key used by FKs. Saving with **`session.user.id`** (auth uid) when it does not match **`public.users.id`** causes **`violates foreign key constraint "stakeholders_created_by_fkey"`**.

## Fix (evolving)
- **`getPlatformUserId()`** loads **`public.users.id`** with **`eq('auth_user_id', session.user.id)`** (same pattern as `portfolioService`) and uses that for **`created_by` / `updated_by` / `deleted_by`** (and related stakeholder-module tables). If no row exists, audit fields are omitted where possible.
- **`getAuthSessionUserId()`** uses **`auth.getSession()`** with an **8s ceiling** (`withTimeout`) instead of `getUser()` for session reads.
- **`saveStakeholder`** wraps the table **insert/update** in **`withTimeout` (~45s)** and sends only **whitelisted columns** via **`pickStakeholderWritePayload`** (avoids stray keys from form/draft spreads).
- **`StakeholderForm`** wraps the whole save flow in **`Promise.race` (~55s)** so the **Saving…** state clears even if a client promise never settles; alerts use **`error?.message || String(error)`**.

## Operational note
If the session is missing or expired, the user may need to **sign in again**. If saves time out often, check **network/VPN**, keep the **tab focused** during save, and verify **Supabase** project reachability.
