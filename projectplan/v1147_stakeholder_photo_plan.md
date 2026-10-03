# v1147 — Stakeholder photo — Implementation Plan

**PRD:** `projectprd/v1147_stakeholder_photo_PRD.md`
**Status:** Implemented. Run `SQL/v1147_stakeholder_photo.sql` before pictures will persist. Signed-in click-through is still outstanding.

An optional picture lives on the stakeholder record and is the picture shown on the Stakeholders screens. A linked user’s profile picture is copied onto that record when it is uploaded, changed, or first shown. Removing the profile picture leaves the stakeholder copy in place.

---

## Phase 0 — SQL (`SQL/v1147_stakeholder_photo.sql`)

- [x] `public.stakeholders.photo_path TEXT` — private storage path, null when there is no picture.
- [x] `sim.practice_stakeholder_register.photo_path TEXT` — same meaning. Practice rows are not synced from `public.users.avatar_url`.
- [x] Private bucket `stakeholder-photos`. File size limit 2MB. MIME types PNG, JPEG, GIF, WEBP. Not public.
- [x] Path: `{account_id}/stakeholders/{stakeholder_id}/photo.{ext}` on Platform. `{user_id}/practice-stakeholders/{practice_stakeholder_id}/photo.{ext}` on Simulator.
- [x] Storage RLS: read follows who can read the stakeholder; write follows who can update the stakeholder. Do not open the bucket to the public.
- [x] No new table, no `database_tables` row, no Admin ID rule, no menu row, no sample image.

## Phase 1 — Shared picture service

- [x] `packages/shared` stakeholder photo service, beside `userAvatarService`: validate, upload, remove, signed URL, and copy-from-profile.
- [x] Reuse `validateAvatarFile` limits and `fileFromClipboardData` / `normalizeImageFile`. Do not invent a second paste parser.
- [x] `saveUserAvatar`: after the profile file is saved, copy it onto every non-deleted `public.stakeholders` row with that `user_id`, replace `photo_path`, and delete the previous stakeholder object. Do not update `sim.practice_stakeholder_register` from this path.
- [x] `removeUserAvatar`: do not clear stakeholder `photo_path` and do not delete stakeholder objects.
- [x] First display of a linked stakeholder with a null `photo_path` and an existing avatar copies that avatar once.
- [x] Deleting a stakeholder deletes the `stakeholder-photos` object when `photo_path` is set. It does not delete `user-avatars`.
- [x] Unit tests for the rules in the PRD testing section, written first.

## Phase 2 — Shared picture component

- [x] `StakeholderAvatar` in `packages/ui`, and in the Platform and Simulator `components/ui` copies that `@nidus/ui` actually loads (same placement as `UserAvatarBadge`).
- [x] Circle, `object-fit: cover`, initials when `photo_path` is null and there is no profile picture to copy. Theme-aware. No export prop.

## Phase 3 — Add and amend

- [x] `StakeholderForm` Basic Information, both apps: picture control beside the name. Label Photo or Logo from `stakeholder_category`.
- [x] Upload, Paste, and Remove match `ProfilePictureSection`, including the paste box. Hidden while the linked Platform user currently has a profile picture. Always shown on Simulator practice records.
- [x] Existing record: Upload, Paste, and Remove persist immediately and toast, as My Profile does.
- [x] New record: hold the file until Create Stakeholder or Save as Draft, then store it on the new id. Cancel uploads nothing.
- [x] View mode shows the picture and hides the controls.
- [x] Audit details do not gain a technical file-path field.

## Phase 4 — Show it on the Stakeholders screens

Use `StakeholderAvatar` beside the name. Do not add the picture to export columns.

- [x] Register table, cards, and the two dashboard lists (`StakeholderRegister` and `StakeholderRegisterPage`), both apps.
- [x] Stakeholder profile header (`StakeholderProfile`), both apps. Leave the existing Word, Excel, PowerPoint, and print export text-only.
- [x] Engagement planning (`EngagementTracker` and `StakeholderEngagementPage`).
- [x] Stakeholder analysis list and the power/interest matrix (`StakeholderAnalysisPage`, `PowerInterestMatrix`).
- [x] Assessment matrix (`StakeholderAssessmentMatrixPage`).
- [x] Communication plans: target audience and the communication log (`CommunicationPlan`, `CommunicationLog`).
- [x] Selects that load a stakeholder name for those screens include `photo_path`.

## Phase 5 — Check

- [x] Run the stakeholder photo unit tests.
- [ ] Compile the stakeholder form in both apps.
- [ ] After the SQL is run: paste a picture on a new Platform stakeholder, create it, see it on the register and the profile, save a change on an existing unlinked stakeholder without pressing Update, and download an export that contains the name and no image.
- [x] Guide: `Documentation/Stakeholder_Photo_v1147_Guide.md`.

## Review

Implemented the optional stakeholder picture from the approved PRD.

- `SQL/v1147_stakeholder_photo.sql` adds `photo_path` and the private `stakeholder-photos` bucket. It has not been run against Supabase from here.
- Profile picture upload copies the file onto linked `public.stakeholders` rows. Profile removal does not clear those copies. Practice rows are not updated from the profile picture.
- Basic Information has Upload, Paste, and Remove. Existing records save the picture immediately. New records store it on Create or Save as Draft.
- The picture is shown on the register, dashboard lists, profile, engagement, analysis, assessment matrix, and communication plans. Exports stay text only.
- Unit tests: `stakeholderPhotoService.test.js` and `userAvatarService.test.js` — 25 passed.
- Signed-in paste, register, and export check is still to do after the SQL is applied.
