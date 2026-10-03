# v1147 — Stakeholder photo — PRD

**Applies to:** Platform (`public.stakeholders`) and Simulator (`sim.practice_stakeholder_register`)
**Origin:** Add Stakeholder (`/platform/stakeholders/register/new`), Basic Information. The register, profile, and the other Stakeholders screens show a generic icon beside the name.

## a) Problem statement

A stakeholder is recognised faster by face or logo than by name, but the record has nowhere to keep a picture. The coloured initial is the only mark on the register, the profile, engagement planning, analysis, the assessment matrix, and communication plans.

Many stakeholders are also system users who already have a profile picture. That picture and the stakeholder record can drift apart. If the profile picture is removed near the end of a project, the project still needs the face that was on the stakeholder record.

## b) Solution

Each stakeholder can have one optional picture, stored on the stakeholder row and shown wherever that stakeholder is identified inside the Stakeholders menu. An individual is labelled Photo. A group, organisation, or community is labelled Logo. The same control is used.

When the stakeholder is a system user and that user has a profile picture, the profile picture is the source. It is copied onto the stakeholder record and shown read-only. Uploading or changing the profile picture replaces that copy. Removing the profile picture does not remove the copy.

People who are not linked to a user, and linked users who have no profile picture, set the picture on the stakeholder form with Upload, Paste, and Remove, in the same way as My Profile.

## c) User stories

1. As an editor, I can add an optional picture on Basic Information, beside the name, while creating or amending a stakeholder. There is no new tab.
2. As an editor, the control is labelled Photo when Category is Individual, and Logo when Category is Group, Organization, or Community.
3. As an editor, I can upload a PNG, JPEG, GIF, or WEBP file up to 2MB, or paste an image the same way as My Profile: Paste opens a box, I click it, and I press Ctrl+V (or Cmd+V).
4. As an editor, I can remove the picture from an existing stakeholder. The picture disappears and initials show instead.
5. As an editor of an existing stakeholder, Upload, Paste, and Remove save the picture immediately. They do not wait for Update.
6. As an editor of a new stakeholder, the picture stays on the form until I click Create Stakeholder or Save as Draft. Cancel discards it and does not store a file.
7. As an editor, the other fields on the form still save with Create Stakeholder, Save as Draft, or Update.
8. As a reader, a stakeholder with no picture still shows coloured initials.
9. As a reader, I see that same picture on the register (table, cards, and the dashboard lists), the stakeholder profile, engagement planning, stakeholder analysis (list and power/interest matrix), the assessment matrix, and communication plans (including the target audience and the communication log).
10. As a reader, I do not see the picture in Excel, CSV, Word, PowerPoint, print, or any other export. Existing exports stay text only.
11. As a system user linked to a stakeholder, when I upload or change my profile picture, that new picture replaces the picture on every stakeholder record linked to me.
12. As that user, when I remove my profile picture, the stakeholder picture stays. The project keeps the last copy.
13. As an editor of a stakeholder who is linked to a user that already has a profile picture, I see that picture and I do not see Upload, Paste, or Remove. The picture is changed only from My Profile.
14. As an editor of a stakeholder who is not linked to a user, or whose linked user has no profile picture, I see Upload, Paste, and Remove.
15. As an editor, if a linked user already had a profile picture before this feature, that picture is copied onto the stakeholder the first time the record is shown, so a later removal of the profile picture cannot leave the stakeholder blank.
16. As an editor, deleting the stakeholder deletes the picture file that belongs to that record. It does not delete the user's profile picture.
17. As a Simulator user, I can do stories 1–10, 14, and 16 on a practice stakeholder. Practice records are not linked to a system user's profile picture, so stories 11–13 and 15 do not apply there.

## d) Implementation decisions

- **One column, `photo_path`, on the stakeholder row.** It stores the private storage path, not a public URL. Null means no picture. No second table. No new display ID.
- **The file is copied into a stakeholder bucket.** The stakeholder record does not point at `user-avatars`. Removing a profile picture deletes the profile file and must not delete the stakeholder file.
- **Profile picture wins on upload and change only.** `saveUserAvatar` copies the new image onto every `public.stakeholders` row whose `user_id` is that user, replacing the previous stakeholder file. `removeUserAvatar` does not clear `photo_path`.
- **First show copies an existing profile picture.** If `user_id` is set, the user has an avatar, and `photo_path` is null, the avatar is copied onto the stakeholder before display. That is what makes story 15 true for records that already exist.
- **The form hides Upload, Paste, and Remove only while the linked user currently has a profile picture.** After that picture is removed, the stakeholder copy remains and the form controls come back, so the project can still replace or remove its own copy.
- **Simulator `user_id` is the practice owner, not “this person is a system user”.** Do not copy the learner’s profile picture onto practice stakeholders. Practice pictures come only from the form.
- **Paste matches `ProfilePictureSection`.** Same clipboard helper, same dashed box, same file rules (PNG, JPEG, GIF, WEBP, 2MB). The picture action uses the same short success and error toasts as My Profile. Create, Save as Draft, and Update of the rest of the record keep the form’s existing confirmation.
- **Circle crop is display-only.** No crop tool. The image is shown with `object-fit: cover` in a circle. Initials stay the fallback.
- **On screen only.** Do not add the image to `ExportListMenu` or to the profile’s Word, Excel, PowerPoint, or print export.
- **Platform and Simulator forms and lists both change.** No new menu item. No sample pictures.

## e) Testing decisions

- Service tests, written first: a file over 2MB or of the wrong type is rejected; a profile-picture save replaces `photo_path` on every linked stakeholder and does not leave the old stakeholder file; a profile-picture removal leaves `photo_path` set; a stakeholder with a null path and a linked avatar is copied once; a practice stakeholder is never updated from the learner’s avatar; Remove clears `photo_path` and deletes only the stakeholder file.
- A pure check for the form: Upload, Paste, and Remove are hidden only when the linked user currently has a profile picture.
- Compile check of the stakeholder form in both apps.
- Signed-in check: paste a picture on a new stakeholder, create the record, see it on the register and the profile, amend an unlinked stakeholder and see the picture save before Update, and confirm an export file has no image.
- Done means stories 1–16 hold on Platform, and stories 1–10, 14, and 16 hold on a practice stakeholder.

## f) Out-of-scope

- Embedding the picture in any export.
- Showing the picture outside the Stakeholders menu (change requests, RACI, and other modules). Those screens use the same shared picture the next time they are changed.
- Salience and the monitoring dashboard. They are not in this version’s screen list.
- A picture column on the bulk-upload template. Bulk upload stays text.
- Editing the user’s profile picture from the stakeholder form.
- A crop, rotate, or filter tool.
- Sharing one picture across stakeholder rows that are the same person but are not linked by `user_id`.
- New sidebar items.

## g) Further notes

- SQL adds `photo_path` and the private `stakeholder-photos` bucket. Run it in Supabase before a picture will persist. `public.users.avatar_url` and the `user-avatars` bucket already exist and are not recreated.
- `get_stakeholders_list` returns the stakeholder row, so the new column is included without a new function.
- Deleting a stakeholder must delete the object at `photo_path` when that path is in `stakeholder-photos`.
