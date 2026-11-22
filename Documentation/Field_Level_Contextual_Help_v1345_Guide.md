# Field-level contextual help (v1345)

PRD: `projectprd/v1345_field_level_contextual_help_PRD.md` · Plan: `projectplan/v1345_field_level_contextual_help_plan.md` · Rule: `CLAUDE.md` rule 76

## What users see

- Labels look like ordinary labels. When the pointer is over a label **or its field**, when the field has focus, or when you tab to it, a small **ⓘ** appears. On phones and tablets the ⓘ stays faintly visible.
- Clicking ⓘ — or **double-clicking the label** (not on checkboxes or radio buttons) — opens a short popover:
  - **Purpose**: what the field means.
  - **Rules**: required or optional, length limit, allowed values. These are read from the field itself, so they are always current.
  - **Examples**.
  - **Format**: uses the organisation's own date format and currency.
  - **Notes**.
  - **Was this helpful? Yes / No**.
  - **Learn more**: opens a help article or guide in a new tab, so the form and any unsaved work stay open.
- Escape, the ✕ button or a click elsewhere closes it.
- The card opens below the ⓘ, or above it when there is no room below, and scrolls inside itself if it fits neither side, so it is never cut off.
- The card always has the same **help colours**: pale sky blue with a sky-blue left edge in light mode, dark slate in dark mode. Organisation branding does not change them (rule 72 repaints only blue / indigo / purple / violet backgrounds), so help looks the same for every customer.
- A field with no help written yet shows a normal label with no ⓘ.

## Where it is live (slice 1)

| App | Page | Fields |
|---|---|---|
| Platform | Stakeholder create / edit / view (`stakeholders/register/new`, `…/edit/:id`, `…/view/:id`, and the modal form) | All 33 fields across every tab |
| Simulator | Add Practice Stakeholder (`simulator/practice-stakeholders/create`) | All 7 fields (photo, name, organisation, type, status, project role, notes) |
| Both | Help article page `help/articles/:slug` (Platform `/platform/help/articles/:slug`, Simulator `/simulator/help/articles/:slug`) | Target of Learn more; no sidebar item |

The Simulator has no stakeholder view or edit page today. Clicking a row in the practice stakeholder register goes to an address that is not mounted, an existing gap recorded in the plan.

## Help on fields users create (slice 1b)

Every screen where users define their own field now asks for help, and Save stays disabled until **what the field is for** and **an example of a good value** are filled in (format is optional):

| Where users create fields | Help stored on |
|---|---|
| Local Data Extensions › Field Definitions (organisation custom fields) | `custom_field_definitions` (public + sim) |
| A register's **Add custom field** panel | the same `custom_field_definitions` row (via `local_register_add_custom_field`, SQL v1496) |
| Regional & Format Settings › **Add local field** (organisation and project) | `regional_format_local_field_definitions` |
| Form template builder (each field card) | the template's field list (`help_purpose`, `help_example`, `help_format`) |

- Existing fields keep working without help; editing one requires it. For form templates only fields that are new or changed need help; unchanged fields carried over are exempt.
- The database enforces the same rule for users' saves (SQL v1494, v1496), so imports and APIs cannot skip it.
- The help appears in the ⓘ popover wherever the field is shown: register forms and record views, custom-field inputs, Regional & Format settings, and filled-in forms.
- Report of fields still missing help: the query at the end of `SQL/v1494`.

## How it works

| Piece | Where |
|---|---|
| Help text | `public.field_help`. Key `public.<table>.<column>` (register fields later: `register:<register_key>:<field_key>`); `form_key` override optional |
| Simulator keys | `sim.<table>.<column>`, mapped to the Platform row by `public.field_help_aliases` |
| Usage | `public.field_help_events` (Platform / Planner), `sim.field_help_events` (Simulator): one "open" per field per session, one changeable vote per user per field |
| Label control | `FieldLabelWithHelp` (`@nidus/ui`) |
| Form scope | `FieldHelpScope` (`@nidus/shared/context/FieldHelpContext`): loads the form's help in one query and the regional settings |
| Data access | `fieldHelpService` (`@nidus/shared/services`): sessionStorage cache, refreshed when any help row changes |
| Helpers | `fieldHelp.js` (`@nidus/shared/utils`): tokens, plain-text parsing, derived rules, Learn more links |
| Article page | `HelpArticlePage` (`@nidus/ui`) + `helpArticleReaderService` |
| Coverage check | `node scripts/check-field-help.mjs [--module stakeholders] [--enforce] [--write-baseline]`; baseline `scripts/field-help-allowlist.json` |

## Adding help to a form (developers)

1. List the form's keys and wrap the form: `<FieldHelpScope helpKeys={KEYS}>…</FieldHelpScope>`.
2. Replace each label: `<FieldLabelWithHelp helpKey="public.risks.risk_title" htmlFor="risk-title" className="…">Title *</FieldLabelWithHelp>`, and give the field the matching `id`. For checkbox or radio text use `as="span" control="checkbox"`; for a section heading use `as="h3"`.
3. Seed the help in a versioned SQL file: `INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code) … ON CONFLICT (help_key, form_key, locale) DO UPDATE …`. Simulator fields: add `public.field_help_aliases` rows.
4. Do not write required / length / allowed values in the text; mark amount fields `isAmount`. Use `{date_format}`, `{example_date}`, `{currency}`, `{decimals}` for formats.
5. Run `node scripts/check-field-help.mjs --module <module>`.
6. A label that rule 76 excludes (search / filter box, view toggle, option list or option card, upload button,
   self-describing toggle, export field picker, generic building block whose caller owns the label) gets
   `data-help="exempt"`. The check skips it — every exclusion is explicit, so 100% is measurable.
7. Pages scoped by app-wide `FieldHelpScope` (each `App.jsx`) need no key list: a label asks the scope for its key.

## Coverage and enforcement (slice 5)

- **Monorepo:** `node scripts/check-field-help.mjs --enforce` (CI `shared.yml`) fails on any key used without help
  and on any raw label in a file beyond `scripts/field-help-allowlist.json`. The allow-list may only shrink; on
  2026-11-22 it holds 24 labels in 10 files that other work had open (DocumentGovernanceSection, ProjectsCreate,
  MyTeam / SimMyTeam, Simulator ProjectMandateEdit, planning ScheduleGantt / FilteredList / TaskForm). Coverage
  99.37%.
- **Usage:** `SQL/v1557_field_help_coverage_report_query.sql` (read-only) — help rows by module, most-opened help,
  least helpful help (≥ 5 votes) and the programme’s “Yes” share (target ≥ 80%).

## Admin (slice 6)

Admin has its own copy of everything (no cross-repo import, Admin rule 23):

- Store `admin.field_help` (Admin `SQL/v250`), keys `admin.<table>.<column>`; seeds `SQL/v251`–`v254` built by
  `scripts/field-help-content/build-sql.mjs` (Admin repo) from content modules.
- `AdminFieldLabelWithHelp` and `AdminFieldHelpScope` (`@nidus-admin/ui`); `AdminField` takes `helpKey` /
  `htmlFor` / `listOptions`. A label outside any scope loads its own key, so federated module pages work.
  Fixed formats (D MMM YYYY, 24-hour); no votes, usage events or Learn-more links in Admin v1.
- `node scripts/check-field-help.mjs` (Admin repo) counts raw labels **and** `AdminField` uses without `helpKey`.
  On 2026-11-22: 746 fields → 99.62% (2 labels left in MenuPlacementsPage, which other work had open).

## Writing help text

- Plain words, short sentences; say what the field is *for* in the business process.
- Examples must be realistic, made-up data, never real people, and **globally familiar**: use places users anywhere recognise at once (London, Cairo, Dubai, Singapore, New York), not locally specific ones.
- Never use anything that looks like a real person or organisation: role titles ("Head of Finance") and obviously fictional organisations ("Example Freight Ltd") only.
- For fields whose choices are other records or people (Reports To, owner, assignee), add `listOptions={false}` to the label so the popover never lists those names.
- Plain text only; start a line with `- ` for a bullet.

## SQL to run

1. `SQL/v1490_field_help_tables.sql`
2. `SQL/v1491_field_help_stakeholders_seed.sql`
3. Re-run `SQL/v1251_planner_table_wall.sql` (the Planner allow-list was regenerated)

Rollback: `SQL/v1490r_field_help_tables_rollback.sql`.

Later waves: monorepo `SQL/v1497`–`v1556` (all run by 2026-11-22); `SQL/v1557` is a read-only report.
Admin: `SQL/v250` (run), `v251`–`v254` (wave A1–A4 seeds).
