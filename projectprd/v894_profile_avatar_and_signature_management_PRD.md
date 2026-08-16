# v894 — Profile Picture & Signature Management PRD

## a) Problem statement

Every account already has two places identity images matter, and neither is user-controllable today:

1. **Profile picture.** The header badge (top-right, all three apps) shows only initials in a gradient circle. `public.users.avatar_url` already exists as a column but nothing reads or writes it anywhere in the codebase — no bucket, no upload UI. A user has no way to make themselves recognisable at a glance in the header, team lists, or anywhere else an avatar might render.

2. **Signature image.** The opposite problem: the machinery is fully built (v868) — `user_signature_images` table, the `user-signatures` storage bucket, `getSavedSignature`/`saveSignatureImage`, and a working upload/paste/reuse control (`SignatureCaptureControl`) — but it is **only reachable from inside the act of signing a document**. A user can't view what their saved signature looks like, replace it, or remove it without going and signing something first. There's no home for it on the user's own profile.

Admin has neither: no profile page exists at all, and `admin.admin_users` has no avatar column.

## b) Solution

Add a **Profile Picture** section and a **Signature** section to the existing "My Profile" page (`/platform/profile`, `/simulator/profile`, and a new `/profile` page in Admin). Each section supports upload-from-file and paste-from-clipboard, previews the current image, and lets the user replace or remove it — saving immediately on each action, independent of the page's existing "Save Changes" button (which continues to handle Full Name/Phone/Job Title/Bio only).

Once set, the profile picture replaces the initials badge in the top-right header dropdown trigger across all three apps (falling back to initials whenever no picture is set). The signature continues to auto-apply wherever the existing v868 document-signing chain already consumes it — this PRD adds *management* of that saved signature, not a new place it gets used.

Platform and Simulator share one implementation via new `packages/ui` / `packages/shared` components (this monorepo's existing pattern for cross-app code). Admin is a separate, isolated codebase (own schema, own auth, no cross-repo imports permitted) and gets its own local implementation of the same UI/behaviour, per the project's three-app parity convention.

## c) User stories

1. As any signed-in user (Platform/Simulator/Admin), I can open my Profile page and see a "Profile Picture" section showing my current picture, or a placeholder/initials if none is set.
2. I can upload a profile picture from a file, or paste one from my clipboard.
3. My profile picture saves immediately on upload/paste — I don't need to click a separate "Save" button for it.
4. I can remove my profile picture, reverting the header badge back to initials.
5. Once I have a profile picture, it appears in place of my initials in the top-right header dropdown trigger, in all three apps.
6. If I have no profile picture, the header continues to show my initials exactly as it does today — no regression for existing users.
7. As any signed-in user, I can open my Profile page and see a "Signature" section showing my currently saved signature image, or an empty/placeholder state if none is saved yet.
8. I can upload a signature from a file, or paste one from my clipboard, from the Profile page — without needing to go sign a document first.
9. My signature saves immediately on upload/paste.
10. I can remove my saved signature from the Profile page (a capability that doesn't exist anywhere today, even inline).
11. Whatever signature I save from the Profile page is the same one offered as "Sign with my saved signature" the next time I sign a process-template document (Platform and Simulator) — no behaviour change to the existing signing flow itself, just a new place to manage what it uses.
12. Uploading an oversized file (>2MB) or an unsupported format is rejected with a clear inline message, for both the picture and the signature, before any upload attempt — matching the existing signature-capture validation.
13. As an Admin user, I have a Profile page (new — none exists today) reachable from the AdminHeader's account dropdown (which currently has no "Profile" link), where I can manage my own picture and signature the same way.
14. Cross-app isolation is preserved: an Admin user's picture/signature is entirely separate from any Platform/Simulator picture/signature for "the same person" logging into both — consistent with `admin.admin_users` being a wholly separate table/auth flow from `public.users` (existing project rule).
15. My saved signature is never surfaced automatically in the record-lifecycle Approve/Reject modal (Risks/Issues/Changes/etc.) — that flow keeps its existing typed-justification-only pattern, unchanged by this feature.

## d) Implementation decisions

- **Admin parity: full, in this same PRD.** Admin gets its own new Profile page, its own `avatar_url` column on `admin.admin_users`, and its own signature storage/table — not deferred to a follow-up. (No existing Admin approval flow consumes an image signature yet; this ships the management capability so it's ready when/if one does.)
- **Avatar visibility: authenticated, account-scoped read.** The new avatar bucket is private but readable by any authenticated user within the same account — not a fully public bucket. Matches how the rest of the app scopes visibility, while still being simple (no signed-URL juggling needed if the bucket policy allows read for any authenticated user in the account, same shape as other account-scoped storage in this repo).
- **Signature location: same "My Profile" page, its own section** — not a separate Settings tab. Both identity items (picture + signature) live together where the user already manages their name/contact info.
- **Dedupe Platform/Simulator: extract shared components now.** `SystemHeader.jsx` and `Settings.jsx` are currently byte-identical duplicates between `apps/platform` and `apps/simulator` (not shared). Since this feature touches both anyway, extract the *new* avatar-badge and profile-picture/signature-section pieces into shared `packages/ui` components imported by both host files, rather than duplicating the new code a third time. This does **not** mean merging the entirety of `SystemHeader.jsx`/`Settings.jsx` into one file — those stay as separate host files; only the new, self-contained pieces are shared.
- **Admin gets a local, non-shared implementation** of the same components/behaviour — Admin cannot import from `packages/*` (cross-repo import ban) and replicates the pattern locally per existing project convention, in its own codebase.
- **Approval-flow scope: unchanged.** The record-lifecycle Approve/Reject modal (Risks/Issues/Changes/etc., text-justification based) is explicitly **not** touched by this feature. Only the existing v868 document-signing chain consumes the saved signature, exactly as it does today.
- **Save behaviour: instant, not staged.** Picture and signature actions (upload/paste/remove) save immediately, each independent of the page's "Save Changes" button — matching the existing `SignatureCaptureControl` pattern already in the app, and avoiding a "picked a new photo, navigated away, lost it" trap.
- **File limits: reuse the existing signature precedent.** 2MB max, `image/png` / `image/jpeg` / `image/webp` / `image/gif` (raster formats only for a photo — signature keeps its existing `image/svg+xml` allowance since it already supports it and a drawn/vector signature is a reasonable input).
- **No cropping tool.** The picture is accepted as-is and displayed via CSS `object-fit: cover` inside a circular frame — no in-app crop/resize UI. Keeps the surface simple (matches this project's UX-simplicity convention); a user can crop before upload if they want a specific framing.
- **New shared avatar service** (`packages/shared`) mirrors the existing `processTemplateSignatoryService.js` shape: `getUserAvatar`, `saveUserAvatar`, `removeUserAvatar`. A new `deleteSavedSignature` function is added alongside the existing `getSavedSignature`/`saveSignatureImage` in `processTemplateSignatoryService.js` — this function does not exist today.
- **`SignatureCaptureControl` is not reused as-is.** It's built around "sign this slot now" (its `onSign` contract expects a `File` or `null` meaning "use my saved one", with no preview state or delete branch). Its pure helper functions (file normalisation, clipboard-paste handling) are reused; a new, lighter component is built for the Profile page's "view/replace/remove my saved signature" use case, and a matching new "view/replace/remove my picture" component is built for avatars — both live in `packages/ui`.

## e) Testing decisions

- Unit tests for the new shared service functions (`packages/shared/src/services/__tests__/`): `getUserAvatar`/`saveUserAvatar`/`removeUserAvatar`, and the new `deleteSavedSignature`, following the existing `chainable()`-mock pattern already used in `processTemplateSignatoryService.test.js`.
- Component tests for the new shared Profile-page sections (upload, paste, remove, oversize/wrong-type rejection) in `packages/ui`, and for the header avatar-badge fallback behaviour (renders initials when no `avatar_url`, image when present).
- Admin gets its own parallel test coverage in its own repo, per its existing test conventions.
- No test changes needed to `SignatureCaptureControl`'s existing behaviour or its existing tests — this PRD adds a new consumer of the same underlying save function, not a change to the signing flow.

## f) Out-of-scope items

- Showing avatars anywhere other than the header badge (team member lists, assigned-to fields, comments, notifications, etc.) — the ask was specifically the header; broader avatar surfacing is a separate, larger effort if wanted later.
- Image cropping/resizing UI.
- Injecting the signature image into the record-lifecycle Approve/Reject modal (Risks/Issues/Changes/etc.) — explicitly deferred per the decision above.
- Any change to how `SignatureCaptureControl` behaves during actual document signing.
- Bulk/admin-managed avatars (e.g. a PMO admin setting avatars on behalf of other users) — this is self-service only, each user manages their own.

## g) Further notes

- `public.users.avatar_url` already exists and is unused — no Platform/Simulator schema migration needed for the column itself, only the new storage bucket + its RLS policy.
- Admin's `admin.admin_users` needs a new `avatar_url TEXT` column plus its own signature table/bucket in the `admin` schema (Admin cannot read/write `public.*`, per existing repo isolation rules) — this is genuinely new schema work in the Admin repo, not just wiring.
- Neither `user_signature_images` nor the new avatar table carries a human-readable display ID (matches the existing `user_signature_images` precedent, which has none either) — Admin ID Generation registration does not apply to these tables.
- See the companion implementation plans: `projectplan/v894_profile_avatar_and_signature_management_plan.md` (Platform + Simulator) and `E:\project-nidus-admin\projectplans\v207_profile_avatar_and_signature_management_plan.md` (Admin) — cross-linked, kept in their respective repos per this project's SQL/plans placement rule.
