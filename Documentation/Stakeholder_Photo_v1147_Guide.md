# Stakeholder photo (v1147)

An optional picture can be stored on a stakeholder and is the picture shown on the Stakeholders screens.

## Where to set it

On **Add Stakeholder** or **Edit Stakeholder**, open **Basic Information**. The control sits beside the name.

- **Photo** when Category is Individual.
- **Logo** when Category is Group, Organization, or Community.

Upload a PNG, JPEG, GIF, or WEBP file up to 2MB, or choose **Paste**, click the box, and press Ctrl+V. **Remove** clears it. Initials show when there is no picture.

On an existing stakeholder, Upload, Paste, and Remove save immediately. On a new stakeholder, the picture is stored when you click **Create Stakeholder** or **Save as Draft**. Cancel does not store it.

## Profile picture

If the stakeholder is linked to a system user who already has a profile picture, the form shows that picture and hides Upload, Paste, and Remove. Change it on **My Profile**. Uploading or changing the profile picture copies it onto every stakeholder record linked to that user and replaces the previous stakeholder picture.

Removing the profile picture does not remove the stakeholder picture. The project keeps the last copy.

Practice stakeholders are not linked to the learner’s profile picture. Their picture is set only on the practice stakeholder form.

## Where it appears

The same picture shows on the register (table, cards, and dashboard lists), the stakeholder profile, engagement planning, stakeholder analysis, the assessment matrix, and communication plans (target audience and communication log). It is not included in Excel, CSV, Word, PowerPoint, or print exports.

## Database

Run `SQL/v1147_stakeholder_photo.sql` in Supabase before a picture can be saved. It adds `photo_path` on `public.stakeholders` and `sim.practice_stakeholder_register`, and creates the private `stakeholder-photos` bucket. If an upload stays on Saving, times out, or the console shows HTTP 400 for `photo.png`, run `SQL/v1149_stakeholder_photo_storage_access.sql` with nothing selected. "Success. No rows returned" is the expected result. That file replaces the storage rule in one step.
