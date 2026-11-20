# v1345 — Field-level contextual help (form attribute documentation) — PRD

**Status:** Interview decisions D1–D10 confirmed 2026-11-19 (owner). Audit 2026-11-19 found 22 gaps (§0); all resolved in a second interview (G-D1…G-D19, 2026-11-19). Awaiting owner approval of this PRD before implementation plan.  
**Apps:** Platform + Simulator (rule 34.1). Admin: optional later authoring UI; content may be seeded/managed via SQL first.  
**Related:** Public docs (`/documentation/...`); in-app Help button (new-tab behaviour); DynamicFormRenderer `field.help`; rules 25.1 / 26 (no hardcoding); rule 62 (SaaS simplicity / low training); theme 28.1; PWA 29.

## 0) Audit findings (2026-11-19) and how they are resolved

Facts checked in the codebase:
- No field inventory exists, so "99.99% of fields" has no denominator today.
- `local_register_fields` (v931 + `field_group`, `visible_when`, `calculation`) has **no help column**; register fields (FIN / ICT / CON / NGO / Core) are the largest share of all fields. Simulator has its own `sim.local_register_fields` (v938).
- An article system already exists: `help_articles`, `help_categories`, `help_feedback` (v58), `helpService.js`, Admin-side `HelpManagement.jsx`, and public guides at `/documentation/:platform/:guideId`.
- Form templates already carry per-field help: `DynamicFormRenderer` renders `field.help`.
- `@nidus/ui` has `Tooltip.jsx` and `Label.jsx` (no popover help control yet).
- Platform's `StakeholderForm.jsx` has several sections beyond Basic Information. (Plan audit: the Simulator's copy is dead code; the live Simulator form is `PracticeStakeholderCreatePage.jsx`.)

| # | Gap | Recommendation | Status |
|---|---|---|---|
| G1 | No field inventory → 99.99% cannot be measured; user story 13 unbuildable | Field-help registry (one row per field key) plus a coverage script over the shared label component | Decided — G-D4 |
| G2 | Help key undecided (per column vs per form) | Key by `schema.table.column`, optional per-form override; register fields keyed by register + `field_key` | Decided — G-D1 |
| G3 | Storage location / schema access (rule 34.5: Platform/Sim never read `admin`) | One `public.field_help` table, read by any signed-in user, written by SQL / Admin RPC only; Simulator reads it too; new narrow Admin write exception stated | Decided — G-D2 |
| G4 | Register engine has no help field | Help columns on `local_register_fields` (public + sim), rendered automatically by the engine | Decided — G-D3 |
| G5 | Content authoring at scale unplanned (thousands of fields × 5 blocks) | Bulk-authored per module, owner samples, per-module done criteria | Decided — G-D5 |
| G6 | Help text can contradict regional format (rule 68) and amount shorthand (rule 36) | Tokens such as `{date_format}`, `{currency}` filled from the resolved pack; amount fields auto-append the shorthand note | Decided — G-D6 |
| G7 | Double-click on a label selects text and toggles checkboxes | Keep shortcut, prevent selection, skip checkbox/radio labels; explicit test | Decided — G-D17 |
| G8 | WCAG 1.4.13 (hover/focus content) not specified | Escape dismisses, hoverable, persistent, `aria-describedby`; ⓘ keyboard-reachable while visually hidden at rest | Decided — G-D19 |
| G9 | Touch devices have no hover, so ⓘ may never appear | Show ⓘ on field focus on touch, or a faint always-on ⓘ on coarse pointers | Decided — G-D8 |
| G10 | "Accepts or displays" is ambiguous (view pages, table headers) | Capture fields count; view pages optional, later | Decided — G-D9 |
| G11 | User-defined fields (org custom fields, register custom fields, form templates) | Field creator writes help (template builder already has `help`); counted only once authored | Decided — G-D10 |
| G12 | Hand-written rules drift from validators | Derive required / max length / enums from schema or validators; hand-write purpose, examples, notes | Decided — G-D7 |
| G13 | Existing article system ignored | Learn more points at a `help_articles` slug or documentation anchor key, not a free URL | Decided — G-D11 |
| G14 | XSS / unsafe links in help content | Plain text or limited Markdown; Learn more restricted to app documentation addresses | Decided — G-D12 |
| G15 | Performance (rule 66) | One query per form, sessionStorage cache, invalidated when help is edited | Decided — G-D19 |
| G16 | No signal on which fields confuse users | Optional open counts + "Was this helpful?" via `help_feedback` | Decided — G-D13 |
| G17 | i18n out of scope but schema should be ready | `locale` column now (default `en`) | Decided — G-D19 |
| G18 | New-table checklist missing (registry, Planner wall v1251, RLS) | Listed in the plan | Decided — G-D19 (plan) |
| G19 | CLAUDE.md rule not enforceable | CI check like `check-shared-drift`: new labels without help keys; register SQL without help | Decided — G-D14 |
| G20 | Simulator parity under-specified | Same help table (no help columns on register tables — G-D3); Simulator Stakeholder form adopts in the same slice | Decided — G-D19 |
| G21 | Rollout order after Stakeholder missing | Phases: control + table + Stakeholder → register engine → wizard / Project Setup → remaining core → coverage report + CI | Decided — G-D16 |
| G22 | No measurable success metric | Coverage % per module (+ optional opens / helpful rate); drop support-ticket claim unless a ticket source exists | Decided — G-D18 |
| — | User story 8 says "Basic Information first"; the Stakeholder form has more sections | Decide whether the whole form is slice 1 | Decided — G-D15 |

Decisions from this interview are recorded below as **G-D1…G-D19** (all gaps decided 2026-11-19) and summarised in §d.

### Second interview decisions

| # | Gap | Decision |
|---|---|---|
| G-D1 | G2 key | **Per column + optional per-form override.** Primary key `schema.table.column` (e.g. `public.stakeholders.department`), shared by every form showing that column; a form may override with `form_key` + field. Register fields keyed by register + `field_key`. Simulator columns (`sim.*`) map to the Platform key through an alias table, so both apps share one help row (plan PD1). |
| G-D2 | G3 storage | **One shared `public.field_help` table**, read by Platform and Simulator (reference content, not practice data). RLS: read for authenticated users; no client writes. Written by SQL seeds now; Admin later through SECURITY DEFINER RPCs under a new narrow write exception (to be added to rule 34.5 when built). |
| G-D3 | G4 registers | **Register field help in the same `public.field_help` table**, keyed by the register's key + `field_key` (key, not row id, so Platform and Simulator registers share one entry). The engine loads one register's help in one query and shows the same popover. No help columns on `local_register_fields`. |
| G-D4 | G1 inventory | **Scan + registry.** Denominator = help keys used by the shared help label in JSX (found by a script) + every `local_register_fields` row (SQL). A coverage report per module lists keys with no help row. |
| G-D5 | G5 authoring | **Claude drafts, owner samples.** Help is drafted in seed SQL module by module from the schema, validators and existing docs; the owner reviews about 10 sample fields per module before that module counts as done; tone/term fixes apply across the module. |
| G-D6 | G6 formats | **Placeholders filled live.** Help text uses tokens (`{date_format}`, `{example_date}`, `{currency}`, `{decimals}` …) filled from the user's resolved regional settings (rule 68) when the popover opens. Amount fields automatically add the rule-36 shorthand note. |
| G-D7 | G12 rules text | **Generate where possible.** Required, max length and allowed values come live from the database / register field definition / dropdown options (passed by the form or read from the column); `field_help` holds only purpose, examples, format notes and extra notes. A hand-written rule is allowed only where it can't be derived. |
| G-D8 | G9 touch | **Faint ⓘ always shown on touch devices** (coarse pointer); tap opens the popover. Mouse users keep the hover/focus reveal (D1/D4). |
| G-D9 | G10 scope | **Capture fields and read-only view pages** both count towards the target, using the same help keys (a view page reuses the field's help). Table/list column headers do not count (later, optional). Bulk-upload templates keep their rule-71 legend. |
| G-D10 | G11 user-created fields | ~~**Creator writes it (optional).**~~ **Superseded by Amendment A (CF-D1…CF-D6): help is mandatory.** Field-creation screens for organisation custom fields and register custom fields gain optional help boxes (purpose, example), stored on the field's own definition (as form templates already do with `help`), so `public.field_help` stays system-only (G-D2). These fields are reported per organisation, separately from system coverage, and count only once help exists. |
| G-D11 | G13 Learn more | **Article / guide key only.** `learn_more_key` names a `help_articles` slug or a documentation guide section; the app builds the link (new tab, `rel="noopener noreferrer"`). No free URLs. No key → no Learn more link. |
| G-D12 | G14 text format | **Plain text + simple lists.** Line breaks kept; lines starting with `- ` render as bullets. No HTML (rendered as text), no links inside the text. |
| G-D13 | G16 usage data | **Opens + helpful vote.** Each popover open is counted per help key (no form data captured), and the popover shows "Was this helpful? Yes / No". A report ranks most-opened and least-helpful fields for content fixes. |
| G-D14 | G19 enforcement | **CI check that fails.** A script (pattern of `check-shared-drift`) fails CI when a form uses a help key with no help seed, or new register-field SQL has no matching help. Existing gaps sit on a baseline allow-list that may only shrink. REVIEW.md gets a matching checklist item. |
| G-D15 | Slice 1 scope | **Whole Stakeholder form.** Slice 1 = `public.field_help` + RLS + seeds, the shared help label in `@nidus/ui`, every field of the Stakeholder create/edit form and its view page in both apps, and coverage script v0. Exit: Stakeholders 100%. (Supersedes "Basic Information first" in user story 8.) |
| G-D16 | G21 rollout | **Registers next.** 1) Stakeholders + shared control → 2) register engine (all registers, largest field count) → 3) project wizard + Project Setup documents → 4) remaining core modules by usage (RAID, change, quality, resources …) → 5) coverage dashboard. The CI check warns from slice 1 and switches to failing (G-D14) in phase 5. |
| G-D17 | G7 double-click | **Keep, but safe.** Double-click on a label opens help and suppresses text selection; switched off on checkbox / radio / toggle labels (ⓘ still works there). Tested explicitly. |
| G-D18 | G22 success | **Coverage + helpful rate.** Phase exit: adopted module at 100% coverage; programme: ≥ 99.99% overall at phase 5 (exclusions apply); quality: helpful "Yes" ≥ 80% per module. Support-ticket reduction is not claimed until a ticket source exists. |
| G-D19 | G8, G15, G17, G18, G20 | **Accepted as standard practice.** (1) WCAG 1.4.13: Escape closes, popover hoverable and persistent, `aria-describedby`, ⓘ keyboard-reachable while hidden at rest. (2) Performance (rule 66): one query per form / register, sessionStorage cache cleared when help changes. (3) `locale` column now (default `en`). (4) Simulator parity: same table and control; Simulator Stakeholder form and registers adopt in the same slices. (5) New-table checklist in the plan: `database_tables` registry, RLS, Planner wall re-run (`v1251`). |

### Amendment A — mandatory help on user-created fields (owner, 2026-11-20)

Supersedes the "optional" part of **G-D10**. Facts: organisation custom fields and register custom fields share `custom_field_definitions` (public + sim, v515 / v519, v1311) with an optional `description`; Regional & Format local fields use `regional_format_local_field_definitions` (v1063); form template fields carry an optional `help` in the template's field list (`FormTemplateBuilder`, rendered by `DynamicFormRenderer`).

| # | Decision |
|---|---|
| CF-D1 | **All four field creators require help:** (A) organisation custom fields (`CustomFieldAdminBuilder`), (B) register custom fields (`AddRegisterCustomFieldPanel` / `CustomFieldSettingsFields`), (C) Regional & Format local fields (organisation + project settings pages), (D) form template fields (`FormTemplateBuilder`). Platform + Simulator. |
| CF-D2 | **Purpose + example required**; format notes optional. Rules (required, allowed values, limits) stay generated from the field's own settings (G-D7). |
| CF-D3 | **Existing fields: required on next edit.** Fields without help keep working (no ⓘ until help exists); editing one requires the help boxes; a per-organisation report lists fields still missing help. |
| CF-D4 | **Enforced in the form and in the database.** Saving a new or edited definition without purpose and example is refused by the database too; untouched old rows stay valid until edited. |
| CF-D5 | **New help columns** `help_purpose`, `help_example`, `help_format` (optional) on `custom_field_definitions` (public + sim) and `regional_format_local_field_definitions`; form template fields get the same keys in their field definition. The existing `description` / `help` text is copied once into `help_purpose` as a starting point. Help stays on the field's own definition (organisation-owned), not in `public.field_help` (system-only, G-D2). |
| CF-D6 | **Built now as slice 1b**, before the register engine slice. Custom fields show their help with the same ⓘ popover wherever they are rendered. |


## a) Problem statement

Project Nidus is a SaaS product where operators get little classroom training. Forms such as **Edit Stakeholder** expose many attributes (Reference, Name, Title, Organisation, Department, Identification source/date, Stakeholder Type, …). Today:

| Gap | Effect |
|---|---|
| Labels are static text with no discoverable path to “what is this field?” | Users guess, leave blanks, or raise support tickets |
| Occasional inline hints exist, but coverage is uneven and not standardised | Same product feels inconsistent |
| Full documentation lives on separate pages and is not keyed to the field the user is staring at | Context switch; help is hard to find mid-task |
| New tables/features can ship forms without field help | Coverage erodes over time; training debt grows |

Independence goal: a user should be able to understand **almost every** capture field without asking another person or opening a general help search.

## b) Solution

A **system-wide field-level contextual help** capability:

1. **Near-universal coverage (target ≥ 99.99% of user-facing capture fields)** — every form attribute that accepts or displays business data has help content, except a short exclusion list (below).  
2. **Non-crowding UX** — no permanent wall of ⓘ icons. Labels with help look like ordinary labels (no underline — D4 amended 2026-11-20). ⓘ appears when the **label or its field is hovered** or the **field has focus**; **double-click on the label** is a power-user shortcut.
3. **Popover first** — short, structured help beside the field (purpose, characters/rules, example values, format). **Learn more** opens the full field article in a **new tab** so the form session is preserved.  
4. **Database-sourced content** (rule 25.1) — help text is not hardcoded in React as the live source of truth.  
5. **Mandatory engineering rule** — amend `CLAUDE.md` so every **new or amended** table/feature/form must create or update field-level help in the same change (same adoption cadence as other opportunistic rules for existing backlog; **mandatory from day one for new fields**).  
6. **Shared UI** in `@nidus/ui` (or shared package) so Platform and Simulator stay at parity.

### Exclusions (do not count against the 99.99% target)

- Pure chrome: Cancel, Close, tab labels as navigation only, Card/Table view toggles, export menu items.  
- Row `#` / pagination controls.  
- Raw technical UUID displays on Audit-only surfaces (user-facing friendly IDs still get help).  
- Transient search/filter boxes that are not persisted entity attributes (optional help allowed, not required).  
- Bulk-action confirmation dialogs with no field capture.

### Content shape (per field)

| Block | Required? | Intent |
|---|---|---|
| Title | Yes | Field display name |
| Purpose | Yes | What the field means in the business process |
| Rules / characters | Yes when constrained | Required/optional, max length, allowed characters, uniqueness, enums |
| Example values | Yes | Realistic sample(s) of good data |
| Format | Yes when relevant | Date, code pattern, amount shorthand, phone/email, etc. |
| Learn more URL / article key | Optional | Deeper guide in documentation |

## c) User stories

1. As a form user, when I hover or focus a field that has help, I see an ⓘ control beside the label without the form looking icon-crowded at rest.  
2. As a form user, I can open field help by clicking ⓘ **or** by double-clicking the field label.  
3. As a form user, the popover explains purpose, rules/characters, example values, and format in plain language.  
4. As a form user, **Learn more** opens fuller documentation in a **new tab** and leaves my form (and unsaved edits) intact.  
5. As a form user, if a field has no help yet, I see no false affordance (no ⓘ, no double-click help).  
6. As a keyboard user, I can reach ⓘ and dismiss the popover without a mouse (accessible name, focus trap or standard dialog pattern as implemented).  
7. As a touch user on PWA/mobile, I can open help with a single tap on ⓘ (double-tap label is optional/secondary; ⓘ remains primary).  
8. As a Stakeholder editor, every capture field on the Stakeholder create/edit form (all sections) and its view page has help meeting the content shape above (G-D15).  
9. As a PM on any later-adopted form, the same label/help behaviour appears (Platform and Simulator).  
10. As an implementer creating a **new** table or form field, I must ship field-help rows (or register-field help) in the same change — enforced by `CLAUDE.md` + review checklist.  
11. As an implementer **amending** an existing form, I must add or update help for touched fields in that change (opportunistic for untouched fields on that page).  
12. As a content owner, help content can be updated via seed/SQL (and later Admin UI if approved) without a React deploy for copy-only changes.  
13. As a demo/support user, coverage reporting can list fields missing help so gaps can be closed toward the 99.99% target.  
14. As a user in light or dark theme, popover and label affordances remain readable (rule 28.1).

## d) Implementation decisions (confirmed)

| # | Decision | Choice |
|---|---|---|
| D1 | Open trigger | **Hover/focus-revealed ⓘ** + **double-click label** shortcut (not always-on icons) |
| D2 | Presentation | **Popover** with structured short help + **Learn more** → full article in **new tab** |
| D3 | Coverage target | **≥ 99.99%** of user-facing capture fields (exclusions listed above) |
| D4 | Crowding control | ~~Resting = subtle label affordance only; ⓘ on hover/focus~~ **Amended 2026-11-20 (owner):** resting = ordinary label, no underline; ⓘ appears on label hover, **field hover**, field focus or keyboard focus (faint always-on ⓘ on touch, G-D8, unchanged). Reason: with near-universal coverage an underline on every label stops signalling anything and makes forms look non-standard. |
| D5 | Source of truth | **Database** (and/or register field metadata), not hardcoded React strings as live truth |
| D6 | Engineering governance | **New `CLAUDE.md` rule** (and Admin mirror if needed): new/amended tables & form fields must create/update field-level help in the same change |
| D7 | First vertical slice | **Stakeholder** create/edit form and view page, all sections (amended by G-D15), then shared control + adopt other forms |
| D8 | Parity | Platform + Simulator in the same programme |
| D9 | Marketing docs nav | Unchanged (same-tab); in-app Learn more uses new tab |
| D10 | Missing help | No fake placeholder help; omit affordance until content exists — backlog/seed closes gaps to meet coverage target |
| G-D1…G-D19 | Audit decisions | See §0 — key per column + override; shared `public.field_help` (system help, incl. registers by register key); coverage = JSX scan + register fields; Claude drafts / owner samples; regional tokens; generated rules; faint ⓘ on touch; capture + view pages count; user-created fields carry their own help; Learn more by article key; plain text + bullets; opens + helpful vote; failing CI check from phase 5; slice 1 = whole Stakeholder form; rollout registers next; success = coverage + helpful ≥ 80%; WCAG / cache / locale / parity / new-table checklist |

## e) Testing decisions

| Seam | Done looks like |
|---|---|
| Unit | Shared label/help component: opens on ⓘ click and label double-click; hidden when no help key; keyboard accessible |
| Unit/integration | Loader resolves help by stable field key (form + field id); falls back cleanly when missing |
| Component | Popover shows required content blocks; Learn more uses `target=_blank` + `rel=noopener noreferrer` |
| Regression | Stakeholder save/validation still works; unsaved-changes guard unaffected |
| Coverage | Script (JSX help keys) + SQL (register fields) lists fields without help; Stakeholder slice = 100% before exit (G-D4, G-D15) |
| Formats | Tokens render from the resolved regional pack; amount fields show the shorthand note (G-D6) |
| Rules | Required / max length / allowed values come from the live definition, not stored text (G-D7) |
| Double-click | Opens help on text-field labels without selecting text; does nothing special on checkbox / radio / toggle labels (G-D17) |
| Accessibility | Escape closes; popover hoverable; `aria-describedby`; keyboard reaches ⓘ (G-D19) |
| Safety | HTML in help text renders as text; Learn more only to app documentation (G-D11, G-D12) |
| CI | `check-field-help` reports missing help (warn), then fails on gaps outside the shrinking allow-list (G-D14, G-D16) |
| Theme/PWA | Light/dark + narrow viewport: popover usable, no permanent icon clutter |

## f) Out of scope

- Replacing the floating Help Center / FAQ product with this feature.  
- AI-generated live help (may be considered later under AI agents).  
- Mandatory Admin WYSIWYG editor in v1 (SQL/seed + optional thin Admin later).  
- Translating help into multiple languages in v1 (structure may allow locale later).  
- Rewriting all public markdown guides in one pass (Learn more may deep-link progressively).
- Help on table / list column headers (later, optional — G-D9).
- Support-ticket metrics (no ticket source yet — G-D18).  
- Changing validation rules themselves (help describes rules; does not replace validators).

## g) Further notes

- **Why not double-click only:** Discoverability and touch/accessibility fail SaaS independence goals; double-click remains a shortcut only.  
- **Why 99.99% not “selective help”:** Owner priority is reducing support queries; crowding is solved by hover/focus ⓘ, not by omitting content.  
- **Register engine:** register field help lives in `public.field_help`, keyed by register key + `field_key` (G-D3), so engine-built forms get the same UX without hand-wiring each page.  
- **Hand-built forms:** Adopt via shared `FieldLabelWithHelp` (name TBD) when creating or next amending the form.  
- **CLAUDE.md rule draft (to land in implementation, not before plan approval):** roughly — “Every new or amended user-facing form field must ship field-level contextual help (purpose, rules/characters when constrained, example values, format when relevant) in the same change; omit only listed exclusions; Platform–Simulator parity applies.”  
- **REVIEW.md:** Add a review checklist item for field-help coverage on form PRs once the rule lands.  
- Sample UX reference (illustrative): hover ⓘ + popover with Purpose / Rules / Example / Format / Learn more.

## Approval

- [ ] Owner approves this PRD  
- [ ] Then: implementation plan under `projectplan/v1345_*_plan.md` (per `App_Guide.md`)  
- [ ] Then: implement in the G-D16 order (Stakeholders + shared control + table → register engine → wizard / Project Setup → remaining core → coverage dashboard + failing CI), with the `CLAUDE.md` rule and REVIEW.md item landing in slice 1
