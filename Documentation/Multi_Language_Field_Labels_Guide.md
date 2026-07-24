# Multi-Language Field Labels Guide

**Version:** v762 · **Applies to:** Platform and Simulator (parity per rule 34.1)
**Companion plan:** `projectplan/v762_multi_language_field_labels_plan.md`

## What this feature does

- Every user can pick a **display language** from the header (globe icon next to the theme
  toggle). The choice is remembered per user and applied immediately.
- **Field labels and select-option labels** on PMO form templates (Activity List, Risk Register,
  etc.) render in the chosen language when a translation exists, falling back to the template's
  default (English) label when it doesn't.
- **Dates, plain numbers, and money amounts** show a locale-formatted preview underneath the
  input (e.g. thousands separators appropriate to the chosen language) — the underlying stored
  value and how you type it are unaffected.
- **PMO Admins** add translations via a bulk Excel export → fill in → re-upload workflow in the
  Form Template Builder, the same way RFP line items are bulk-imported.

## What this feature does *not* do (by design)

This is intentionally scoped to labels + display formatting, not full app localization:

- **The rest of the app's UI** (menus, buttons, page titles, exports, notifications) is **not**
  translated. That's a much larger, separate initiative (see the plan doc's Tier 2 discussion).
- **User-entered field values** (what a PM actually types into a text field) are **not**
  translated. Only the catalog labels/options around them are. This matches how comparable
  systems (Salesforce, Jira, ServiceNow) handle it — translated data would go stale the moment
  the source is edited, with nobody clearly responsible for re-syncing it.
- **Right-to-left (RTL) languages** are not supported yet — no RTL languages are seeded, and no
  layout work has been done for RTL.
- **Per-organisation language restriction** isn't built — every active language is available to
  every user, the same way the field catalog itself is shared across all organisations today.

## For end users: switching your display language

1. Click the globe icon in the header (next to the dark/light mode toggle).
2. Pick a language from the list. The page updates immediately.
3. Your choice is saved to your profile and remembered next time you sign in, on any device.
4. If a field hasn't been translated into your language yet, you'll see its default English
   label — this is expected, not a bug.

## For PMO Admins: adding translations

1. Open **Form Templates → [your template] → Edit**.
2. Scroll to the **Translations** section.
3. Choose a **target language** from the dropdown.
4. Click **Download Template** — this generates an Excel sheet with one row per field (and one
   row per select option), pre-filled with any translations that already exist for that
   language.
5. Fill in the **Translated Text** column for whichever rows you want to translate. Leave a row
   blank to skip it — it won't overwrite anything.
6. Drag the filled-in file back onto the upload area (or click to browse), then confirm on the
   validation screen.
7. Each field in the **Field catalog** section shows a coverage badge (e.g. "2/6 languages") so
   you can see translation progress at a glance.

### Translation sheet format

| Section Key | Field Key | Row Type | Option Value | English Text | Translated Text |
|---|---|---|---|---|---|
| general | activity_type | field | | Activity Type | Type d'activité |
| general | activity_type | option | task | Task | Tâche |
| general | activity_type | option | milestone | Milestone | Jalon |

- **Row Type** is `field` for the field's own label, or `option` for one of its select options.
- Don't add or remove rows, or change Section Key / Field Key / Row Type / Option Value —
  those are used to match each row back to the field it belongs to. Only edit **Translated Text**.

## For developers: how it fits together

- **Data model** (`SQL/v762_multi_language_tables.sql`, `SQL/v763_multi_language_seed.sql`):
  `languages` (mirrors the `countries` reference-table pattern) and `form_field_translations`
  (mirrors `form_template_field_overrides`'s RLS shape — PMO-admin write, any-authenticated-user
  read), both in `public` and `sim` schemas.
- **`users.language_code`** (already existed, `SQL/v03_user_access_tables.sql`) stores each
  user's chosen display language — shared across Platform and Simulator since it's one person's
  preference regardless of which app they're using.
- **`packages/shared/src/utils/`**: `localeFormat.js` (date/number display formatting via
  `Intl`), `formTranslations.js` (label/option lookup-with-fallback + coverage calculation),
  `userLanguage.js` / `languages.js` (read/write helpers). Currency formatting reuses the
  existing `amountShorthand.js` rather than duplicating it.
- **`packages/shared/src/context/LanguageContext.jsx`**: the "what language is the viewer using
  right now" state, mounted once per app in `App.jsx` (same pattern as `UnsavedChangesProvider`).
- ⚠️ **Both apps also keep local shadow copies** of these files under
  `apps/platform/src/{utils,context}/` and `apps/simulator/src/{utils,context}/` — each app's
  `vite.config.js` aliases `@nidus/shared/utils`/`@nidus/shared/context` to its own local folder
  rather than the real `packages/shared` package (a pre-existing pattern in this codebase, also
  used for `amountShorthand.js`, `accountResolution.js`, `UnsavedChangesContext.jsx`, etc.).
  **When editing any of these five files, edit all three copies** (`packages/shared`,
  `apps/platform`, `apps/simulator`) or the change silently won't take effect in the running app.
- **Rendering**: `DynamicFormRenderer.jsx` resolves each field's label via
  `resolveFieldLabel()`; `FormFieldRenderer.jsx` resolves each select option's label via the
  `resolveOptionLabel` callback passed down, and shows a locale-formatted preview for
  `number`/`money` fields.
- **Bulk import**: `formTranslationBulkImportService.js` (parse/validate/map, mirrors
  `rfpBulkImportService.js`) + `FormTranslationBulkImport.jsx` (2-stage upload UI, mirrors
  `RFPBulkImport.jsx`).
