# v762 — Multi-Language Field Labels + Locale-Aware Formatting (Labels + Tier 1)

## Goal

Let each user (Platform + Simulator) view form field labels and select-option labels in their
chosen display language, with PMO Admins able to supply translations via bulk Excel upload —
plus locale-aware date/number/currency *display* formatting driven by the same language choice.

**Explicitly out of scope for this plan** (see prior discussion in-thread):
- Tier 2 — translating the app's static UI chrome (menus, buttons, page titles, export
  templates, notifications). Sized separately as a multi-month initiative; not started here.
- Tier 3 — translating user-entered field *values* (freeform text typed into a form). Industry
  precedent (Salesforce, Zendesk, Jira) treats this as on-demand/not-persisted or simply
  unsupported — not building it.
- Tier 4 — RTL language layout support. No RTL languages seeded in this phase.
- Per-organisation "enabled languages" restriction (mirroring `form_template_field_overrides`).
  Noted as a clean Phase 2 extension point but not built now — v1 makes every active language
  available to every user, same as the template catalog itself is shared across all orgs today.

## Grounding (confirmed in codebase before writing this plan)

- `users` table (`SQL/v03_user_access_tables.sql`) **already has** `language_code varchar(10)
  default 'en'` and `timezone varchar(100) default 'UTC'` — no column migration needed for the
  per-user language preference, just a service + UI to read/write it (currently unused by any
  app code).
- `form_template_field_overrides` (`SQL/v758_form_template_field_overrides.sql`, public + sim)
  is the existing per-org override pattern — same shape reused for translation RLS conventions.
- `DynamicFormRenderer.jsx` renders `field.label` directly; `FormFieldRenderer.jsx` renders
  `opt.label` per select option. These are the two hook points for label translation lookup.
- No centralized date/number formatter exists yet — only `packages/shared/src/utils/
  amountShorthand.js` (currency/shorthand parsing). Date/number formatting is done ad hoc via
  `toLocaleDateString`/`Intl.NumberFormat` across ~22 files. Tier 1 adds a new centralized
  utility; retrofitting all 22 call sites is a phased follow-up, not required for this plan —
  MVP wires it into form field display only.
- `SystemHeader.jsx` exists separately per app (`apps/platform/...`, `apps/simulator/...`) —
  not a shared package component, so the language switcher must be added twice (established
  pattern already followed for `FormTemplateBuilder.jsx`).
- The legacy root `src/components/headers/SystemHeader.jsx` (pre-monorepo) is out of scope —
  current active phase is Module Federation (v731) per CLAUDE.md; only `apps/platform` and
  `apps/simulator` are canonical.

## Data model (SQL — public + sim schema, per repo-scoped SQL rule)

### `SQL/v762_multi_language_tables.sql`

- `public.languages` (mirrored `sim.languages`): `code text primary key` (BCP-47 tag, e.g.
  `en-US`, `fr-FR`, `es-ES`), `name text`, `native_name text`, `is_active boolean default true`,
  standard audit columns (`created_at/by`, `updated_at/by`, `is_deleted`, `deleted_at/by`).
  RLS mirrors `countries`: authenticated + anon SELECT active/non-deleted rows; write restricted
  to System Admin/Superuser roles.
- `public.form_field_translations` (mirrored `sim.form_field_translations`): `id uuid pk`,
  `template_id uuid references form_templates(id) on delete cascade`, `section_key text`,
  `field_key text`, `language_code text references languages(code)`, `label text`,
  `option_labels jsonb default '{}'::jsonb` (map of option `value` → translated label),
  audit columns, `unique(template_id, section_key, field_key, language_code)`. RLS mirrors
  `form_template_field_overrides`: SELECT via template access; write restricted to
  `is_user_pmo_admin()`.
- Register both new tables in `database_tables` per the Database Table Registration Rule.

### `SQL/v763_multi_language_seed.sql` (companion seed, rule 18.2)

- Seed `languages` (public + sim) with a starter LTR set: `en-US` (default, `is_active`),
  `en-GB`, `fr-FR`, `es-ES`, `de-DE`, `pt-BR`, `it-IT` — idempotent (`ON CONFLICT DO NOTHING`).
  No RTL languages seeded (Tier 4 out of scope). This is reference data, not sample/demo data,
  so it's appropriate under rule 18.2's exception.

## Shared utilities (`packages/shared/src/utils/`)

- `localeFormat.js` (new): `formatLocaleDate(value, languageCode)`, `formatLocaleNumber(value,
  languageCode)`, `formatLocaleCurrency(value, currencyCode, languageCode)` — thin wrappers over
  `Intl.DateTimeFormat`/`Intl.NumberFormat`, falling back to `en-US` when `languageCode` is
  missing/unsupported.
- `formTranslations.js` (new): `resolveFieldLabel(field, translations, languageCode)` and
  `resolveOptionLabel(option, translations, languageCode)` — pure lookup-with-fallback functions
  (translations map → schema default label), used identically by both apps' renderers and
  builders.

## Runtime rendering (both apps — Platform + Simulator, per parity rule 34.1)

- Template load (wherever `getFormTemplate`/`getFormInstance` results feed `DynamicFormRenderer`)
  also fetches `form_field_translations` rows for that `template_id` + the viewer's
  `language_code`, building a lookup map passed down as a prop.
- `DynamicFormRenderer.jsx`: swap the direct `field.label` render for
  `resolveFieldLabel(field, translations, languageCode)`.
- `FormFieldRenderer.jsx`: swap `opt.label` for `resolveOptionLabel(...)`; for `date`/`number`/
  `money` field types, route *display* values through `localeFormat.js` (input parsing/storage
  stays untouched — only rendering changes).

## Language switcher (both apps' `SystemHeader.jsx`)

- New dropdown item next to the existing `ThemeToggle`, listing active `languages` rows.
- On change: update local state instantly (so the UI re-renders without a full reload) +
  persist to `users.language_code` via a new `updateUserLanguage(userId, languageCode)` service
  function + mirror to `localStorage` for pre-auth/instant-load use.

## Bulk Excel translation import/export (PMO Admin)

Mirrors the existing `rfpBulkImportService.js` / `RFPBulkImport.jsx` pattern exactly (reuse, per
rule 38.7 — don't duplicate export infra):

- `formTranslationBulkImportService.js` (both apps): `generateTranslationTemplate(templateCode,
  languageCode)` — exports an Excel sheet (`section_key | field_key | English label | <language>
  label | option: <value> (English) | option: <value> (<language>) ...` columns per option) for
  a chosen template + target language; `parseTranslationExcel(file)`; `validateTranslationRows`;
  `bulkImportTranslations(templateId, languageCode, rows)` — upserts into
  `form_field_translations`.
- `FormTranslationBulkImport.jsx` (both apps) — small wizard (choose template → choose language →
  download template / upload filled sheet → validate → confirm), same shape as `RFPBulkImport`.
  Accessible from the Form Template Builder page (new "Translations" action) and from the Form
  Templates admin list.
- Access gated the same way as the rest of the builder (`is_user_pmo_admin()`), consistent with
  the green-circle deletion-gating work already done in this template.

## Form Template Builder — lightweight translation coverage (both apps)

- Small addition to `FormTemplateBuilder.jsx`/simulator twin: a read-only "Translations" summary
  per field/section (e.g. "3/6 languages" badge) linking to the bulk-import wizard. **No inline
  per-language text-editing UI in v1** — translations are authored via the Excel workflow only,
  keeping this phase's scope bounded. Inline editing can be added later if the Excel round-trip
  proves too slow for small edits.

## Tests (rule 23)

- `packages/shared/src/utils/__tests__/localeFormat.test.js` — date/number/currency formatting
  across a few locales + fallback behaviour.
- `packages/shared/src/utils/__tests__/formTranslations.test.js` — label/option resolution +
  fallback-to-default.
- `formTranslationBulkImportService.test.js` (both apps) — parsing/validation/mapping, mirroring
  existing `rfpBulkImportService` test coverage style.

## Documentation (rule 19)

- `Documentation/Multi_Language_Field_Labels_Guide.md` — how PMO Admins add a language, export/
  fill/import the translation sheet, and how end users switch display language. Explicitly notes
  the Tier 2/3/4 scope boundary so support doesn't get asked "why isn't the whole app translated."

## Todo checklist

- [x] `SQL/v762_multi_language_tables.sql` — `languages` + `form_field_translations` (public +
      sim), RLS, `database_tables` registration
- [x] `SQL/v763_multi_language_seed.sql` — seed 7 starter languages (public + sim)
- [x] `packages/shared/src/utils/localeFormat.js` + tests
- [x] `packages/shared/src/utils/formTranslations.js` + tests
- [x] Service: fetch translations alongside template/instance load (both apps)
- [x] Service: `updateUserLanguage()` (both apps)
- [x] `DynamicFormRenderer.jsx` + `FormFieldRenderer.jsx` — label/option/value locale wiring
      (both apps)
- [x] `SystemHeader.jsx` — language switcher dropdown (both apps)
- [x] `formTranslationBulkImportService.js` + `FormTranslationBulkImport.jsx` (both apps) + tests
- [x] `FormTemplateBuilder.jsx` — translation coverage badge + link to bulk-import wizard (both
      apps)
- [x] `Documentation/Multi_Language_Field_Labels_Guide.md`
- [ ] Manual QA: switch language, confirm labels/options/dates update; confirm fallback to
      English when a language has no translations yet; confirm Excel round-trip end to end
      (**not done — needs a real Supabase environment with the v762/v763 SQL applied**)

## Effort recap

~1.5–2 weeks, one developer, covering both Platform and Simulator (Simulator work is largely
mechanical duplication of Platform's, per the established per-app-file pattern in this repo).

## Review

**Implemented.** All code-level checklist items above are complete. Key deviations/discoveries
during implementation, worth knowing for future work in this area:

- **Critical discovery**: `apps/platform/vite.config.js` and `apps/simulator/vite.config.js`
  alias `@nidus/shared/utils`, `@nidus/shared/hooks`, `@nidus/shared/context`, and
  `@nidus/shared/constants` to **local per-app folders** (`apps/<app>/src/{utils,hooks,context,
  constants}`), not the real `packages/shared` workspace package. This is a pre-existing pattern
  (already true for `amountShorthand.js`, `accountResolution.js`, `UnsavedChangesContext.jsx`,
  etc.) that isn't documented in CLAUDE.md's rule 34.3/49 (which describe `packages/shared` as
  the resolved source). Every new shared file in this plan was therefore duplicated three times:
  `packages/shared/src/...` (the nominal source of truth), `apps/platform/src/...`, and
  `apps/simulator/src/...`. Anyone touching `localeFormat.js`, `formTranslations.js`,
  `userLanguage.js`, `languages.js`, or `LanguageContext.jsx` going forward must edit all three
  copies or the change won't take effect in the running app. Worth a follow-up cleanup ticket to
  either remove the local shadow folders and fix the alias, or formally document the pattern.
- Currency formatting reused the existing `amountShorthand.js` (`formatWithSeparators`, already
  locale-aware) instead of duplicating it in `localeFormat.js`, which only adds date/plain-number
  formatting — matches rule 38.7 (reuse existing exporting/formatting functionality).
- Tier 1 formatting for `money`/`number` fields was implemented as a small read-only "preview"
  line under the input, not a rewrite of the live editable value — this avoids any risk to the
  existing shorthand-amount editing UX (rule 36) and keeps the change additive/low-risk. Native
  `<input type="date">` already locale-formats via the browser, so no code changes were needed
  there.
- `apps/platform` and `apps/simulator` have no working Vitest `environment: 'jsdom'` config of
  their own, so any test that transitively imports the Supabase client (e.g.
  `formTranslationBulkImportService.test.js`, mirroring the pre-existing
  `rfpBulkImportService.test.js`) fails with `window is not defined` when run directly — this is
  a **pre-existing gap**, not a regression introduced here. The pure-logic tests
  (`localeFormat.test.js`, `formTranslations.test.js`) run and pass cleanly via
  `packages/shared`'s own Vitest config (added to its `include` allowlist).
- Manual QA against a live Supabase environment (applying v762/v763 SQL, verifying the switcher,
  translated labels, and the Excel round-trip end to end) has not been done and should happen
  before this ships.

## Review

*(to be completed after implementation)*
