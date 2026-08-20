# v894 — Profile Picture & Signature Management (Platform + Simulator)

PRD: `projectprd/v894_profile_avatar_and_signature_management_PRD.md`
Admin companion plan (separate repo): `E:\project-nidus-admin\projectplans\v207_profile_avatar_and_signature_management_plan.md`

**Status: Platform + Simulator implemented and tested. Admin portion tracked separately.**

## Design decisions locked in (from PRD interview)

- Admin gets full parity, in scope now (separate plan/repo).
- Avatar storage: private bucket, readable by any authenticated user within the same account (not fully public) — implemented via **signed URLs**, mirroring the existing `getSignatureSignedUrl` pattern already used for signature thumbnails (a plain public-URL bucket can't do account-scoped read; a private bucket can't be read by a bare `<img src>` without either a signed URL or a custom auth-aware fetch — this repo already has the signed-URL pattern proven, so it's reused rather than inventing a second mechanism).
- Signature management lives on the existing "My Profile" page, its own section, alongside a new "Profile Picture" section.
- Both new sections save instantly (upload/paste/remove), independent of the page's existing "Save Changes" button.
- `SystemHeader.jsx` and `Settings.jsx` stay separate per-app host files (existing convention); only the *new* avatar-badge and profile-section pieces are extracted into shared `packages/ui` components consumed by both.
- No changes to the record-lifecycle Approve/Reject modal, or to `SignatureCaptureControl`'s existing in-flow signing behaviour.
- File limits: 2MB, `image/png` `image/jpeg` `image/webp` `image/gif` for avatar (matches existing signature limits, minus SVG — a raster photo, not a drawn mark). No crop tool — CSS `object-fit: cover` in a circular frame.

## Todo

### SQL (public schema — `user_signature_images` precedent shows Platform/Simulator share one physical table, not a `sim.*` mirror; avatar follows the same shape since it's the same `public.users.avatar_url` column already)

- [x] `SQL/v894_user_avatar_storage.sql`:
  - Create `user-avatars` storage bucket (private, 2MB limit, `image/png|jpeg|webp|gif`), mirroring `SQL/v868b_process_template_signatories_storage_rls.sql`'s bucket setup for `user-signatures`.
  - Storage path convention: `${account_id}/${auth_user_id}/avatar.${ext}` (account segment enables an account-scoped SELECT policy without a cross-table join per request).
  - RLS on `storage.objects` for this bucket: INSERT/UPDATE/DELETE restricted to the owning `auth_user_id` (same pattern as the signature bucket's owner-only write policies); SELECT permitted to any authenticated user whose own `account_id` (via `public.users`) matches the path's account segment.
  - No `avatar_url` column migration needed — it already exists on `public.users` (`SQL/v03_user_access_tables.sql:55`). It will store the **storage path**, not a public URL (signed URLs are generated on demand, not persisted).

### `packages/shared` (single source of truth for Platform + Simulator)

- [x] New `packages/shared/src/services/userAvatarService.js`:
  - `getUserAvatar(db)` — reads the current user's `avatar_url` (storage path) from `public.users`. Mirrors `getSavedSignature`'s shape (`{ success, data }`).
  - `saveUserAvatar(db, file, accountId)` — validates file (reuse/extend `validateSignatureFile`-style logic, new `MAX_AVATAR_FILE_SIZE_BYTES` / `AVATAR_IMAGE_MIME_TYPES` constants), uploads to `user-avatars` at the account-scoped path, updates `public.users.avatar_url` with the storage path.
  - `removeUserAvatar(db)` — deletes the storage object and clears `avatar_url` to `null`.
  - `getAvatarSignedUrl(db, storagePath, expiresInSeconds = 86400)` — mirrors `getSignatureSignedUrl`; longer default expiry than the signature's 3600s since an avatar changes far less often than a per-document signature and is displayed continuously in the header for the whole session.
- [x] `packages/shared/src/services/processTemplateSignatoryService.js`: add `deleteSavedSignature(db)` — removes the `user-signatures` storage object and the `user_signature_images` row for the current `auth_user_id`. (Does not exist today — confirmed gap.)
- [x] New `packages/shared/src/utils/imageFileUtils.js`: extract the pure, reusable pieces already proven in `SignatureCaptureControl.jsx` (`normalizeSignatureFile`, `fileFromClipboardData`, `fileFromDataUrl`) into shared, generically-named equivalents. `SignatureCaptureControl.jsx` itself is left untouched (no behaviour risk to the existing signing flow) — only the new Profile-page components use these shared utils.

### `packages/ui` (new shared components)

- [x] `UserAvatarBadge.jsx` — props `{ avatarUrl /* storage path or null */, initials, sizeClassName }`. Internally fetches a signed URL when `avatarUrl` is set (same async pattern as the existing `SignatureThumbnail`); renders an `<img>` in a circular frame when resolved, falls back to the initials gradient circle otherwise (identical markup/classes to today's `SystemHeader.jsx:498-500`, so zero visual change for users without a picture).
- [x] `ProfilePictureSection.jsx` — preview (via `UserAvatarBadge`, larger size) + Upload/Paste/Remove controls, calling `saveUserAvatar`/`removeUserAvatar` directly (instant save), file-size/type validation errors shown inline. Theme-aware (dark/light), mobile-responsive.
- [x] `ProfileSignatureSection.jsx` — preview of the current saved signature (signed URL, same as `SignatureThumbnail`) + Upload/Paste/Remove controls, calling `saveSignatureImage`/`deleteSavedSignature` directly (instant save). Theme-aware, mobile-responsive.

### App wiring — Platform

- [x] `apps/platform/src/components/headers/SystemHeader.jsx`: `fetchUser` also selects `avatar_url` from `public.users` (currently only reads Supabase auth `user_metadata` — needs a `public.users` lookup by `auth_user_id`, same lookup shape already used in `userProfileService.js`). Replace the inline avatar `<div>` (lines 498-500) with `<UserAvatarBadge avatarUrl={avatarUrl} initials={userInitials} />`.
- [x] `apps/platform/src/pages/Settings.jsx`: insert `<ProfilePictureSection />` and `<ProfileSignatureSection />` between the profile-tab heading (line 281) and the existing field grid (line 282) — both sections visible only in/near the profile tab (already the only place these fields render, per `profileOnly`/`activeTab === 'profile'` gating).

### App wiring — Simulator (byte-identical duplicate files today — same edits)

- [x] `apps/simulator/src/components/headers/SystemHeader.jsx`: same change as Platform.
- [x] `apps/simulator/src/pages/Settings.jsx`: same change as Platform.

### Tests

- [x] `packages/shared/src/services/__tests__/userAvatarService.test.js` — new, following the existing `chainable()`-mock pattern in `processTemplateSignatoryService.test.js`.
- [x] `processTemplateSignatoryService.test.js` — add coverage for the new `deleteSavedSignature`.
- [x] `packages/ui` component tests: `UserAvatarBadge` (initials fallback vs image), `ProfilePictureSection` / `ProfileSignatureSection` (upload, paste, remove, oversize/wrong-type rejection).
- [x] No changes to existing `SignatureCaptureControl` tests.

### Explicitly not touched (per PRD out-of-scope)

- Record-lifecycle Approve/Reject modal (Risks/Issues/Changes/etc.).
- Any surface other than the header badge for showing avatars (team lists, assigned-to fields, etc.).
- No Audit-details tab on these sections — Profile is personal self-service settings, not a governed record (matches the existing Full Name/Phone/Bio fields on the same page, which also have none).

## Review

**Discovered during implementation:** `apps/platform/vite.config.js` and `apps/simulator/vite.config.js` each alias `@nidus/ui` and `@nidus/shared/utils` to their own app-local folders (`src/components/ui`, `src/utils`), not to `packages/ui`/`packages/shared/src/utils` — this is why `SignatoriesPanel.jsx` etc. already existed as per-app duplicates. So "extract a shared component" in this repo, for anything under those two specific import paths, concretely means: a canonical copy in `packages/ui`/`packages/shared/src/utils` (used if/when Module Federation is ever enabled) **plus** synced duplicate copies in both apps' local folders (used today, since federation is off by default). This was already the established pattern for `SignatoriesPanel.jsx`, `accountResolution.js`, etc. — followed here, not introduced. `@nidus/shared/services/*` is genuinely shared (no alias override), so `userAvatarService.js` and the `deleteSavedSignature` addition to `processTemplateSignatoryService.js` live in exactly one place each.

Files touched:
- New SQL: `SQL/v894_user_avatar_storage.sql`
- New (canonical): `packages/shared/src/services/userAvatarService.js`, `packages/shared/src/utils/imageFileUtils.js`, `packages/ui/src/{UserAvatarBadge,ProfilePictureSection,ProfileSignatureSection}.jsx`
- Duplicated per the alias reality above into `apps/platform/src/{components/ui,utils}/` and `apps/simulator/src/{components/ui,utils}/`, plus both apps' `components/ui/index.js` barrels
- Edited: `packages/shared/src/services/processTemplateSignatoryService.js` (added `deleteSavedSignature`, generalised `getSignatureSignedUrl` to accept an optional bucket param — backward compatible, existing 2-arg callers unaffected)
- Wired: both apps' `SystemHeader.jsx` (avatar fetch + badge swap) and `Settings.jsx` (new sections on the profile tab)
- Tests: `userAvatarService.test.js` (new), `processTemplateSignatoryService.test.js` (+`deleteSavedSignature` coverage), 3 new `packages/ui` component test files — 43 shared-service tests + 11 component tests, all passing. Full `packages/shared` suite (445 tests) and `packages/ui` suite (115 tests, 1 pre-existing unrelated failure in `ExportRecordMenu.test.jsx` from a broken `brandingService` import predating this work) both otherwise green.
- Simulator's dev server wasn't running to verify via curl like Platform's was, but its edits are byte-identical patches applied to byte-identical pre-edit source, and its own vitest suite (component tests) passed.
- A `ZoomableImage` component (click-to-enlarge preview) was added afterward to `UserAvatarBadge`/`ProfilePictureSection`/`ProfileSignatureSection` and synced into both apps' local copies — same triple-copy handling as everything else here.

**Not yet applied to the database.** `SQL/v894_user_avatar_storage.sql` is written and ready but has not been run — this sandbox can reach the Supabase REST API (HTTPS) but not raw Postgres (port 5432), so it needs the normal path: paste it into the Supabase SQL Editor (or your usual migration process) before this feature is live. Until then, `getUserAvatar`/`saveUserAvatar` will fail (no `user-avatars` bucket yet). The Admin companion migration (`E:\project-nidus-admin\SQL\v207_admin_profile_avatar_and_signature.sql`) needs the same step.

**Follow-up (same-session bug report — profile picture uploads silently not showing):** `saveUserAvatar()` had a real bug independent of the above: after uploading to storage, it wrote `avatar_url` to `public.users` without checking whether the UPDATE actually affected a row. A 0-row UPDATE (e.g. RLS silently filtering it, or — most likely given the note above — the `user-avatars` bucket/RLS from this migration never having been applied, so the upload itself may be failing in a way not yet confirmed) comes back from PostgREST as `data: null, error: null`, and the old code treated that as success, showing "Profile picture updated" regardless. Fixed to throw a real, visible error when `data` is null instead of silently reporting success (`packages/shared/src/services/userAvatarService.js`); added a regression test (`userAvatarService.test.js`, now 14 tests). **First thing to check**: confirm `SQL/v894_user_avatar_storage.sql` has actually been run in Supabase — if not, that alone likely explains the whole symptom, and the code fix above will at least now surface a clear error instead of a silent no-op.

**Update — SQL confirmed applied, symptom persists.** User ran `v894_user_avatar_storage.sql` (confirmed success) and the picture still doesn't render (initials only), while the signature does. Since the *write* path (`saveUserAvatar`) now throws visibly on failure, and the *read* path (`UserAvatarBadge`'s `getAvatarSignedUrl` call) had the identical silent-failure gap — `if (result.success) setSignedUrl(...)` with no `else`, so a failed signed-URL read was indistinguishable from "no picture uploaded" — added a `console.warn` on read failure there too (`packages/ui/src/UserAvatarBadge.jsx` + its two app-local duplicates in `apps/platform` and `apps/simulator`, per the same alias-duplication convention as the `@nidus/shared/utils` case above; `UserAvatarBadge.test.jsx` still passes, 4/4). **Next step**: retry the upload now that both fixes are live — if it still fails, the browser console will now show either a `saveUserAvatar` error toast (write-side) or a `[UserAvatarBadge] Failed to load profile picture: ...` console warning (read-side), which will pin down the exact cause instead of guessing further.

**Update — root cause found via Network tab response body: `DatabaseTimeout`, not RLS.**
```json
{ "statusCode": "544", "error": "DatabaseTimeout", "message": "The connection to the database has timed out", "code": "DatabaseTimeout" }
```
The picture itself was already working correctly on two other accounts by this
point (confirming the Chrome vs Firefox `__cf_bm`/third-party-cookie finding
was the real root cause of the *original* report) — this was a *new*, separate
symptom: the personal saved-signature request specifically timing out waiting
for a pooled DB connection. The Network panel showed the same identity-
resolution queries firing 2–4× each on one page load (`users?select=avatar_url`
×2, `user_signature_images` ×2, `project_memberships` ×3+, `notifications`
×4+) — consistent with React 18 StrictMode's dev-only double-invoke of mount
effects, compounded by several independent components (`SystemHeader`,
`CurrentProjectContext`, `Settings.jsx`, `ProfilePictureSection`,
`ProfileSignatureSection`) each re-resolving "current user" from scratch
instead of sharing one request.

**Fix — in-flight request de-duplication**, mirroring the proven pattern
already used by `userProfileService.js`'s `getAuthSessionUserId()` (module-
level in-flight promise/Map, cleared in `.finally()` — collapses concurrent
callers onto one shared request; deliberately *not* a persistent cache, so a
call moments later still runs fresh):
- `getCurrentUserInternalUserId()` (`accountResolution.js`, canonical +
  Platform + Simulator local copies — used by 125+ files).
- `getUserProjectRoles()` / `getUserSystemRoles()` (`roleService.js`, both
  apps — `SystemHeader` and `CurrentProjectContext` both call
  `getUserProjectRoles` independently on the same page load).
- `getUserAvatar()` (`userAvatarService.js`) and `getSavedSignature()`
  (`processTemplateSignatoryService.js`) — both canonical-only (not aliased).

Tests: 3 new cases added to `accountResolution.test.js` (Platform + Simulator)
covering the resolve, de-dupe, and not-a-persistent-cache behaviours. Full
`packages/shared` suite (58/505) and the directly-affected Platform suites all
green; `packages/ui` suite green aside from the pre-existing unrelated
`ExportRecordMenu.test.jsx` import failure noted above.

This reduces the query burst that made the timeout more likely, but a
`DatabaseTimeout` is fundamentally about Supabase's connection pool capacity
at that moment — if it recurs under real concurrent load, that's a Supabase
project-tier/connection-pooling question, not something further app-code
de-duplication can fully rule out.
