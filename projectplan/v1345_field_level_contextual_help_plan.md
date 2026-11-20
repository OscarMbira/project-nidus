# v1345 — Field-level contextual help — Implementation plan

**PRD:** `projectprd/v1345_field_level_contextual_help_PRD.md` (D1–D10 + G-D1…G-D19; owner updates 2026-11-19)  
**Status:** Plan audit 2026-11-19 (§0) resolved — PD1–PD5 decided, P6–P19 folded. Awaiting owner approval before coding.  
**Apps:** Platform + Simulator (rule 34.1). Admin authoring UI later (out of v1).  
**SQL:** Before every new file, list `SQL/` and take **max + 1** (rule 18.0). At plan write time the highest file is **v1489** → first migration for this feature starts at **v1490** (re-check at implementation time).  
**PRD text:** D7 and §g are corrected in the PRD itself to match G-D15 / G-D3 (P12).

---

## 0. Plan audit (2026-11-19) and how it is resolved

Facts checked:
- The Simulator's `components/stakeholders/StakeholderForm.jsx` uses `platformDb` and is not mounted by any Simulator route (dead copy). The live Simulator form is `pages/simulator/PracticeStakeholderCreatePage.jsx` → `sim.practice_stakeholder_register`; Simulator has create + register list, no separate edit / view route.
- Platform: `StakeholderFormPage` at `stakeholders/register/new`, `…/view/:stakeholderId`, `…/edit/:stakeholderId`.
- No `help` route is mounted in any app; only public `/documentation/:platform/:guideId` exists. `help_articles` has an Admin editor, no in-app reader.
- Planner wall (v1251) is fail-closed: a public table not on the generated allow-list is unreadable for Planner sessions.
- `local_registers.register_key` exists (register help keys can use it).
- CI home for scripts: `.github/workflows/shared.yml`.

| # | Gap | Resolution | Status |
|---|---|---|---|
| P1 | Simulator target is a dead file | Live pages; dead copy deleted | Decided — PD2 |
| P2 | `schema.table.column` keys differ between Platform and Simulator | Platform keys + Simulator alias map | Decided — PD1 |
| P3 | "Not Planner-allowlisted" contradicts the fail-closed wall | Allow-listed | Decided — PD3 |
| P4 | Learn more → `/help/article/:slug` does not exist | Build the article page in slice 1 | Decided — PD4 |
| P5 | Simulator usage events written to `public` | `sim.field_help_events` | Decided — PD5 |
| P6 | Coverage misses unconverted forms (raw `<label>`) | Script also counts raw labels in form files as "not adopted" (exclusions applied) | Folded — §5 slice 1 |
| P7 | Expression uniqueness breaks seed `ON CONFLICT` | `form_key NOT NULL DEFAULT ''` + plain unique `(help_key, form_key, locale)` | Folded — §3.1 |
| P8 | Cache invalidation undecided | Version check: latest `updated_at` read once per session; cache cleared when it changes | Folded — §4 |
| P9 | Event volume / duplicate votes | One `open` per key per session; one changeable helpful vote per user per key; `user_id DEFAULT auth.uid()` | Folded — §3.2 |
| P10 | G-D10 deferred, but PRD keeps it in scope | Register custom fields in slice 2; organisation custom fields in slice 4 | Folded — §5 |
| P11 | No path for the regional pack to reach the popover | Shared `FieldHelpProvider` per app (org + project resolved pack); forms flag `isAmount` | Folded — §4 |
| P12 | Plan works around stale PRD text | Fix PRD D7, §g (and G-D1 if P2 accepted) | Folded — PRD edit |
| P13 | Owner sample gate has no checkbox | Exit checkbox per slice; result recorded in §11 | Folded — §5 |
| P14 | CI hook unnamed | Runs in `.github/workflows/shared.yml`; allow-list file `scripts/field-help-allowlist.json` (generated, may only shrink) | Folded — §5 |
| P15 | Coverage dashboard would be a new page (rules 70 / 75) | Script + SQL report in v1; a page only with menu catalogue + placement + taxonomy in the same change | Folded — §5 slice 5 |
| P16 | `CLAUDE.md` has another session's uncommitted edits | Coordinate / commit first; new rule number 76 | Folded — §6 |
| P17 | No Simulator test | Test for `PracticeStakeholderCreatePage` with help | Folded — §7 |
| P18 | New-table checklist incomplete | Rollback SQL; no Admin ID Generation (no reference column) | Folded — §3 |
| P19 | Touch: faint ⓘ must not show where no help exists | Test case added | Folded — §7 |

### Plan interview decisions

| # | Gap | Decision |
|---|---|---|
| PD1 | P2 keys | **Platform key + map.** Keys stay `public.table.column` (G-D1 unchanged). The Simulator uses its own `sim.table.column` keys, mapped to the Platform key through `public.field_help_aliases` (`alias_key` → `help_key`), so both apps share one help row. The loader resolves aliases in the same query; the coverage script counts a Simulator key as covered when its alias resolves to a help row. Aliases are seeded with the help (same file per module). |
| PD2 | P1 Simulator target | **Live pages + delete the dead copy.** Slice 1 adds help to `PracticeStakeholderCreatePage` and the register page's record view / edit. Delete the dead `apps/simulator/src/components/stakeholders/StakeholderForm.jsx` and its unused importers (`pages/platform-app/StakeholderFormPage.jsx`, `pages/StakeholderManagement.jsx`, the unused `StakeholderFormPage` import in `simulatorRoutes.jsx`) after confirming at build time that no mounted route reaches them. |
| PD3 | P3 Planner | **Planner users see help.** `field_help`, `field_help_aliases` (read) and the events table (insert own) go on the Planner allow-list: run `node scripts/generate-planner-table-allowlist.mjs --write` once Planner screens import the help service, then re-run `SQL/v1251_planner_table_wall.sql`. |
| PD4 | P4 Learn more | **Build an in-app article page.** A routed read-only page `help/articles/:slug` in both apps (Platform `/platform/help/articles/:slug`, Simulator `/simulator/help/articles/:slug`) shows a published `help_articles` entry, reusing `helpService.getHelpArticle` (Simulator gets an identical app-bound copy). Learn more supports `article` (→ that page) and `documentation` (→ `/documentation/:platform/:guideId#section`), both in a new tab. It is a secondary page reached only from Learn more: no sidebar menu item (so rules 70 / 75 are not triggered); rule-73 back control falls back to closing the tab / going to the dashboard when there is no history. `help_articles` goes on the Planner allow-list with the other help tables. Content stays plain text per G-D12 when rendered (existing article `content` is shown as text with line breaks; no HTML). |
| PD5 | P5 Simulator events | **Separate sim table.** `public.field_help_events` (Platform, Planner) and `sim.field_help_events` (Simulator), same columns and RLS; the phase-5 report combines both. Both registered in `database_tables`; only the public one goes on the Planner allow-list. |

All five plan-audit decisions made 2026-11-19 (PD1–PD5).

---

## 1. Goals (from PRD)

1. Shared `FieldLabelWithHelp` (name final in slice 1) in `@nidus/ui`: hover/focus ⓘ (faint always-on on coarse pointer), safe double-click shortcut, accessible popover, Learn more → new tab.  
2. `public.field_help` as the single system help table (Platform + Simulator read; no client writes).  
3. Slice 1 = **100% Stakeholder** create/edit + view, both apps.  
4. Rollout G-D16: Stakeholders → register engine → wizard / Project Setup → remaining core → coverage dashboard + **failing** CI.  
5. `CLAUDE.md` + `REVIEW.md` rule in slice 1; CI warn → fail by phase 5.  
6. Success: module 100% coverage at phase exit; programme ≥ 99.99%; helpful Yes ≥ 80% per module (G-D18).

---

## 2. Facts from the codebase (re-verified for this plan)

| Fact | Location / note |
|---|---|
| Stakeholder form (hand-built, multi-section) | `apps/platform/src/components/stakeholders/StakeholderForm.jsx` + Simulator twin; sections beyond Basic Information (contact, role, influence, status, photo, assign-to-projects, Audit) |
| Labels today | Mostly raw `<label>` text, not `@nidus/ui` `Label.jsx` |
| UI primitives | `@nidus/ui` `Label.jsx`, `Tooltip.jsx` — **no** field-help popover yet |
| Form-template help | `DynamicFormRenderer` already shows `field.help` (user-created; stays on field definition per G-D10) |
| Articles | `help_articles` / `help_categories` / `help_feedback` (`SQL/v58_help_system.sql`); `helpService.js`; Learn more must resolve slug/guide key only (G-D11) |
| Registers | `public.local_register_fields` + `sim.local_register_fields` — **no** help column (G-D3: do not add one) |
| Feedback table | `help_feedback` is article-scoped today → need field-help open counts + helpful votes (new table or extend carefully; prefer **`public.field_help_events`** to avoid overloading article feedback) |
| Highest SQL | v1489 at plan time |

---

## 3. Data model (slice 1 SQL)

### 3.1 `public.field_help`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `help_key` | text NOT NULL | Canonical key: `schema.table.column` **or** `register:<register_key>:<field_key>` |
| `form_key` | text NOT NULL DEFAULT `''` | Optional per-form override (G-D1); `''` = shared default (P7) |
| `locale` | text NOT NULL DEFAULT `'en'` | G-D19 |
| `title` | text NOT NULL | |
| `purpose` | text NOT NULL | Plain text + `- ` bullets (G-D12) |
| `examples` | text NOT NULL | |
| `format_notes` | text NULL | May include tokens `{date_format}`, `{example_date}`, `{currency}`, `{decimals}` (G-D6) |
| `extra_notes` | text NULL | Hand-written rules only when not derivable (G-D7) |
| `learn_more_key` | text NULL | `help_articles.slug` or documentation guide section key — **no free URLs** (G-D11) |
| `learn_more_kind` | text NULL | e.g. `article` \| `documentation` |
| `module_code` | text NOT NULL | Coverage grouping (`stakeholders`, `registers`, …) |
| `is_active` | boolean NOT NULL DEFAULT true | |
| `created_at` / `updated_at` | timestamptz | |

**Uniqueness:** plain unique constraint `(help_key, form_key, locale)` so seeds can use `ON CONFLICT (help_key, form_key, locale)` (P7).  
**RLS:** `SELECT` for `authenticated`; **no** INSERT/UPDATE/DELETE for clients. Service role / SQL seeds write.  
**Registry:** `database_tables` row; re-run Planner wall `v1251` after create (rule / G-D19).  
**Planner wall:** allow-listed via the generator + `v1251` re-run (PD3). **Rollback:** companion `v{N}r_*_rollback.sql`. **No Admin ID Generation** (no reference column) (P18).

### 3.1a `public.field_help_aliases` (PD1)

| Column | Notes |
|---|---|
| `alias_key` | text PK — e.g. `sim.practice_stakeholder_register.department` |
| `help_key` | text NOT NULL — e.g. `public.stakeholders.department` |
| `created_at` | timestamptz |

RLS: read for authenticated; no client writes. Seeded with each module's help. Registered in `database_tables`; same Planner-wall handling as `field_help`.

### 3.2 `public.field_help_events` + `sim.field_help_events` (usage — G-D13, PD5)

| Column | Notes |
|---|---|
| `id` | uuid |
| `help_key` | text |
| `event_type` | `open` \| `helpful_yes` \| `helpful_no` |
| `user_id` | uuid NOT NULL DEFAULT `auth.uid()` (sign-in id) |
| `session_id` | text NULL (client session, to keep one `open` per key per session) |
| `created_at` | timestamptz |

RLS: insert own events; select aggregated via SECURITY DEFINER report RPC later (phase 5). No PII from forms. One `open` per key per session (client de-dupe); helpful vote = one changeable row per user per key (upsert) (P9). Schema per P5 decision.

### 3.3 Seeds

- Companion seed SQL for Stakeholder keys (`module_code = 'stakeholders'`), idempotent `ON CONFLICT`.  
- Claude drafts; owner samples ~10 fields before module done (G-D5).  
- Do **not** store required/max/enum text that can be derived — forms pass live constraints into the popover (G-D7).

---

## 4. Shared packages

| Piece | Package | Responsibility |
|---|---|---|
| `FieldLabelWithHelp` | `@nidus/ui` | Label affordance, ⓘ reveal, popover UI, Escape, `aria-describedby`, double-click (skip checkbox/radio/toggle), coarse-pointer faint ⓘ |
| `fieldHelpText.jsx` helpers | `@nidus/ui` or `@nidus/shared` | Render plain text + `- ` bullets safely (escape HTML) |
| `resolveFieldHelpTokens` | `@nidus/shared` | Substitute regional tokens from resolved pack (G-D6); append amount shorthand note when `isAmount` |
| `fieldHelpService` | `@nidus/shared` | Batch load by keys (one query per form / register); sessionStorage cache; **version check**: latest `updated_at` read once per session clears the cache when it changes (P8) |
| `FieldHelpProvider` | app `lib/` (identical per app) + shared reader | Supplies the resolved regional pack (org + project, rule 68) and loaded help to every label; forms flag amount fields with `isAmount` (P11) |
| `buildLearnMoreHref` | `@nidus/shared` | Map `learn_more_kind` + key → `/help/article/:slug` or `/documentation/:platform/:guideId#…` |
| `recordFieldHelpEvent` | shared + RPC | Fire-and-forget open / helpful vote |

Export new UI from `packages/ui/src/index.js`.

---

## 5. Slices (tracer bullets)

### Slice 1 — Foundation + whole Stakeholder (Platform + Simulator) — **exit: Stakeholders 100%**

- [x] **SQL `v1490` (re-check number):** create `public.field_help` + RLS + `database_tables` + Planner wall re-run note / apply `v1251`.   *(Done: `SQL/v1490_field_help_tables.sql` holds all four tables + rollback `v1490r`.)*
- [x] **SQL `v1491`:** create `public.field_help_aliases` (PD1), `public.field_help_events` and `sim.field_help_events` (PD5) + RLS + `database_tables`; Planner allow-list regenerated and `v1251` re-run (PD3).   *(Done inside v1490; Planner allow-list regenerated — re-run `v1251`.)*
- [x] **SQL `v1492`:** seed Stakeholder help rows (all create/edit + view capture fields; keys like `public.stakeholders.stakeholder_name`). Owner samples ~10 before marking done.   *(Done as `SQL/v1491_field_help_stakeholders_seed.sql`: 33 help rows + 7 Simulator aliases.)*
- [x] **`@nidus/ui` `FieldLabelWithHelp`:** D1/D4/G-D8/G-D17/G-D19 behaviours; unit tests (open, no-help, double-click no-select, checkbox skip, Escape, aria).  
- [x] **`@nidus/shared`:** load/cache, token resolve, learn-more href, event recorder; tests for tokens + safe text.  
- [x] **Wire Platform `StakeholderForm.jsx` (create / edit / view via `StakeholderFormPage`) and Simulator `PracticeStakeholderCreatePage` + register page record view / edit** (PD2); delete the dead Simulator `StakeholderForm.jsx` chain after confirming nothing mounted reaches it: every capture label uses help keys; view/readOnly mode same keys; pass live `required` / maxLength / options into the popover rules block.  
- [x] **Learn more:** new tab + `noopener noreferrer`; omit link when no key.
- [x] **Article page (PD4):** routed `help/articles/:slug` in both apps, read-only, published articles only, plain-text rendering, theme-aware, back control with no-history fallback; route registered without a menu item; tests (renders article, unknown slug → not-found state).  
- [x] **Popover:** Purpose, derived Rules, Examples, Format (tokenised), Extra notes, Was this helpful?, Learn more.  
- [x] **`CLAUDE.md`:** new rule (field-level help mandatory for new/amended fields; exclusions; parity; CI pointer).  
- [x] **`REVIEW.md`:** checklist item for field-help on form PRs.  
- [x] **`scripts/check-field-help.mjs` v0:** warn mode — scan help keys vs seeds **and** count raw `<label>` / `label=` uses in form files as "not adopted" (PRD exclusions applied) (P6); baseline `scripts/field-help-allowlist.json` (generated, may only shrink). Runs in `.github/workflows/shared.yml` as **warn** from this slice (G-D16, P14).  
- [x] **Coverage script v0:** JSX help-key scan + missing `field_help` rows for `module_code = stakeholders` → must be empty to exit.  
- [x] Theme / PWA smoke on Stakeholder create/edit/view. *(Done: owner checked 2026-11-20.)*
- [x] **Owner sample gate:** owner reviewed ~10 Stakeholder help entries; result recorded in §11 (G-D5, P13). *(Done: owner approved 2026-11-20.)*

### Slice 1b — Mandatory help on user-created fields (PRD Amendment A, CF-D1…CF-D6)

- [x] **SQL (next free number):** `help_purpose`, `help_example`, `help_format` on `public.custom_field_definitions`, `sim.custom_field_definitions`, `public.regional_format_local_field_definitions`; copy `description` → `help_purpose` once where empty; trigger refusing INSERT, or an UPDATE that touches the definition, when purpose or example is blank (CF-D3/CF-D4: untouched old rows stay valid). Form templates: the same check on the template's field list when a template is saved (trigger on the template table, per field). Rollback file.
- [x] **Shared:** `FieldLabelWithHelp` accepts inline help (`help={{ title, purpose, examples, format_notes }}`) for user-defined fields, so they use the same popover without a `field_help` row; events keyed `custom:<definition id>`.
- [x] **Creators (Platform + Simulator):** (A) `CustomFieldAdminBuilder`, (B) `AddRegisterCustomFieldPanel` / `CustomFieldSettingsFields`, (C) organisation + project Regional & Format settings local-field forms, (D) `FormTemplateBuilder` — required "Help – purpose" and "Help – example" boxes, optional "Help – format"; Save disabled until filled; editing an old field without help shows the boxes as required.
- [x] **Display:** custom fields render their label through `FieldLabelWithHelp` with inline help in `CustomFieldRenderer` / `CustomFieldInput`, register custom fields (`RegisterFieldInput`), regional local fields, and `DynamicFormRenderer` (form templates).
- [x] **Services / API:** create / update services pass the help columns; bulk or API paths fail clearly when help is missing (database check).
- [x] **Report:** SQL query listing, per organisation, custom field / local field / form template fields still missing help.
- [x] **Docs:** rule 76 note (user-created fields require purpose + example), guide section, taxonomy unaffected (no menu change).
- [x] **Tests:** creators block save without help (each creator), database check (SQL self-check), inline help renders in the popover, old field edit requires help.
- [x] **Owner check:** create one field in each creator; confirm help shows on the record form. *(Done: owner checked 2026-11-20.)*

### Slice 2 — Register engine (largest field count)

**Facts (SQL parse, approximate — the database is authoritative):** about 4,000 register fields in 183 registers, 2,438 distinct field keys; the 105 keys used in five or more registers cover about 1,080 fields (notes 170, owner 32, business_unit 22, environment 20, due_date 19 …).

| # | Decision (owner, 2026-11-20) |
|---|---|
| S2-D1 | **Common help + overrides.** Each common field key gets one entry `register:*:<field_key>`, used by every register with that field unless the register has its own `register:<register_key>:<field_key>` entry. Lookup: specific → common → none (no ⓘ). |
| S2-D2 | **Wave order:** 1) the common keys (~105 entries, ~27% of register fields) → 2) Core registers → 3) FIN → 4) ICT → 5) CON → 6) NGO. Each wave: Claude drafts, owner reviews ~10 samples. |


- [x] Engine form/detail renderer: resolve help by `register:<register_key>:<field_key>`; one query per register (rule 66).   *(Done 2026-11-20: `registerFieldHelpKeys` / `registerFieldHelpKey`; register form + record view wrapped in `FieldHelpScope`; common fallback in `fieldHelpService` (S2-D1); form labels pass required + dropdown choices.)*
- [x] Seed help for active register fields in waves (S2-D2): **100% of register fields (4,530 of 4,530, SQL parse) once v1514 runs.**
  - [x] Wave 1 — 105 common keys, `SQL/v1497_field_help_register_common_fields.sql` (~1,081 of ~4,039 register fields, 26.8%). SQL run 2026-11-20; owner sample review pending.
  - [x] Wave 2 — Core registers: `SQL/v1498_field_help_core_registers.sql` — Environments (59 fields) and Policies & Compliance (26 fields) 100% covered (specific + common). SQL run 2026-11-20; owner sample review pending.
  - [x] Wave 3 — FIN (split in six sub-waves)
    - [x] 3a Data migration (13 registers, 330 fields): `SQL/v1499` (133 entries incl. 16 common migration keys) + `SQL/v1500` (165 entries), generated from `scripts/field-help-content/fin_migration_part1|2.mjs` by `build-sql.mjs`. SQL run 2026-11-20; owner samples pending.
    - [x] 3b Testing (9 registers, 131 fields): `SQL/v1501` (125 entries incl. 4 common testing keys) from `fin_testing.mjs`. SQL run 2026-11-20; owner samples pending.
    - [x] 3c Cutover, go-live, hypercare (18 registers, 268 fields): `SQL/v1502` (229 entries incl. 32 common keys) from `fin_cutover_golive.mjs`. SQL run 2026-11-20; owner samples pending.
    - [x] 3d Readiness, change, training (~360)
      - [x] Part 1 — change management + training (19 registers, 211 fields): `SQL/v1503` (178 entries) from `fin_change_training.mjs`. SQL run 2026-11-20.
      - [x] Part 2 — operational readiness (10 registers, 146 fields): `SQL/v1504` (132 entries incl. 16 common keys) from `fin_readiness.mjs`. SQL run 2026-11-20.
    - [x] 3e Core banking configuration and programme (13 registers, ~190 fields): `SQL/v1505` (124 entries + FIN Environments copies the 45 Core Environments texts) from `fin_config_programme.mjs`. SQL run 2026-11-20.
    - [x] 3f Plan-document registers (Cutover Strategy, Cutover Plan, Dress Rehearsal Strategy, Hypercare Plan, Rollback Plan — 90 fields, found once the parser learned the register_key pattern): `SQL/v1506` (83 entries) from `fin_plan_documents.mjs`. SQL run 2026-11-20.
    - FIN complete (all SQL run 2026-11-20).
  - [x] Wave 4 — ICT (28 registers, 561 fields). SQL run 2026-11-20.
    - [x] 4a Common + architecture and design (12 registers): `SQL/v1507` (184 entries incl. 41 new common keys such as `technology_stack`, `rag`, `success_criteria`, `approved_budget`) from `ict_architecture_design.mjs`.
    - [x] 4b Category registers `ict_cat_*` (9 registers): `SQL/v1508` (248 entries) from `ict_categories.mjs`. Calculated scores (architecture score, priority score) described as averages shown as a percentage, matching their calc rules.
    - [x] 4c Delivery overview, workstreams, milestones, roadmap, disaster recovery, runbooks, support model (7 registers): `SQL/v1509` (91 entries) from `ict_delivery_support.mjs`.
    - Check: every ICT register field now has its own or common help (dumppack: 0 left). Register coverage (SQL parse) 3,615 of 4,530 (79.8%).
  - [x] Wave 5 — CON (24 registers, 697 fields still without help after the common keys). SQL run 2026-11-20.
    - [x] 5a Common + commercial, contractors, progress certificates, progress measurement, subcontractors: `SQL/v1510` (212 entries incl. 62 new common keys such as `zones`, `hold_points`, `question` / `response`, `ncr_reference`, `control_measures`) from `con_commercial.mjs`.
    - [x] 5b Design & engineering, handover & commissioning, inspections, quality control, materials, RFIs, site instructions, permits: `SQL/v1511` (159 entries) from `con_design_quality.mjs`.
    - [x] 5c Health & safety, management, sites, plant & equipment: `SQL/v1512` (161 entries) from `con_site_safety.mjs`.
    - [x] 5d Plan documents (commissioning, HSE, inspection plan, ITPs, method statements, recovery plans, site logistics): `SQL/v1513` (112 entries) from `con_plans.mjs`.
    - "Worked out for you" is said only for the 14 CON fields with a calc rule in SQL (e.g. net valuation, amount due, SPI / CPI, attendance and defect closure rates); other ratios describe the formula only.
    - Check: dumppack 0 left for CON. Register coverage (SQL parse) 4,293 of 4,530 (94.8%).
  - [x] Wave 6 — NGO (8 registers, 245 fields) + final gaps: `SQL/v1514` (247 entries incl. 11 common NGO keys such as `recommendations`, `audit_findings`, `country`) from `ngo_registers.mjs`. The final coverage check also found 16 fields in registers written in another SQL style — FIN Dress Rehearsal Strategy `rehearsal_schedule`, ICT Use Cases (11 fields) and ICT Requirements Specification (4) — now covered in the same file. No NGO ratio has a calc rule, so none says "worked out for you". SQL run 2026-11-20.
- [x] Simulator register UI uses same keys (G-D3 / G-D19).   *(Done: same code in both apps; sim registers share `register_key`.)*
- [x] Coverage: register SQL rows ⊆ help keys.   *(Done: `check-field-help --registers` (SQL parse, approximate) + exact database check at the end of `v1497`; CI prints it.)*
- [x] Extend `check-field-help` to fail new register-field SQL without matching help seed (warn→tighten).   *(Done 2026-11-20: `--registers` now lists each register field without help and exits 1; CI (`shared.yml`, runs on `SQL/**`) already passes `--registers`. New test asserts the live SQL folder has no gaps.)*
- [ ] ~~Register custom fields help (G-D10, P10)~~ → moved to slice 1b (mandatory, CF-D6).
- [ ] **Owner sample gate** per pack wave (P13).

### Slice 3 — Project wizard + Project Setup documents

- [ ] Adopt `FieldLabelWithHelp` on wizard + Mandate / Brief / Business Case / PID / BRP / Project Details (and Simulator practice mirrors), in sub-waves:
  - [x] 3a Project wizard (Create / Edit / View share `ProjectWizardPanels`, so Project Details is covered too). 2026-11-20: 46 labels + 8 step headings (list steps, portfolio, programme) use `FieldLabelWithHelp` with `public.projects.<column>`; one `FieldHelpScope` inside `ProjectWizardPanels`; people pickers use `listOptions={false}`. Simulator: live page is `PracticeProjectCreate` (7 fields, `sim.practice_projects.*` aliased to Platform help); Simulator `ProjectsCreate` / `ProjectsEdit` / `ProjectWizardPanels` copies are unmounted dead code and were left alone. Seed `SQL/v1515` (60 entries + 7 aliases) from `project_wizard.mjs`; `build-sql.mjs` gained `ALIASES`. CI: `--module stakeholders,project_wizard`. SQL run 2026-11-20.
    - [ ] `DocumentGovernanceSection` (Documents step, 4 labels): help already seeded in v1515; wiring waits until the other session’s uncommitted changes to that file (SQL v1492 document status fields) are committed.
  - [x] 3b Mandate, 2026-11-20 — every surface, both apps: shared edit tabs (`MandateFieldTabs`, `MandateDeliverablesSection`, `MandateDependenciesSection`, `MandateAssumptionsRisksView` in `@nidus/ui`, new `helpSchema` prop: Platform `public`, Simulator `sim`; `mandateHelpKeys(schema)`), the two Create pages (separate forms) and the two View pages (help on section headings and the proposed-role / reference terms). Keys `public.project_mandates.*`, `public.mandate_deliverables.*`, `public.mandate_dependencies.*`; every Simulator `sim.*` key aliased. Seed `SQL/v1516` (31 entries + 31 aliases) from `mandate.mjs`. Rule 77: removed a real product name from the Platform create Scope placeholder. New `scripts/__tests__/field-help-dynamic-keys.test.mjs` (in CI) checks schema-built keys the static scan cannot see. SQL run 2026-11-20.
  - [x] 3c Project brief, 2026-11-20. Platform: 14 brief sections (`apps/platform/src/components/brief/*Section.jsx` + `BriefDistribution`) — 71 labels, keys `public.project_briefs.*` and the child tables `brief_tolerances`, `brief_product_descriptions`, `brief_role_descriptions`, `brief_references`, `brief_distribution`; one `FieldHelpScope` in `ProjectBriefForm` (used by Create, Edit and View) plus one round the View page’s distribution list. People pickers `listOptions={false}`. `LessonsReviewSection` is unused (not wired). Simulator: the live pages are `PracticeBriefCreate` / `PracticeBriefEdit` (`sim.practice_project_briefs`, 11 fields): 4 alias to Platform help, 7 have their own `sim.*` rows; Simulator `pages/brief/*` and `components/brief/*` are unmounted copies (left alone). Seed `SQL/v1517` (74 entries + 4 aliases) from `brief.mjs`. No brief tests exist. SQL run 2026-11-20.
  - [x] 3d Business case, 2026-11-20. Platform: 6 components in `apps/platform/src/components/businessCase` (`BusinessCaseForm`, `…Financials`, `…Options`, `…Benefits`, `…DisBenefits`, `…Distribution`) — 50 labels, keys `public.business_cases.*` and the child tables `business_case_options`, `_benefits`, `_dis_benefits`, `_distribution`. Each component wraps itself in its own `FieldHelpScope` (the Edit page renders four of them outside the form, and the page files carry another session’s uncommitted edits, so pages were left untouched). Amount labels `isAmount`; Benefit Owner `listOptions={false}`. Simulator: live pages `PracticeBusinessCaseCreate` / `PracticeBusinessCaseEdit` (`sim.practice_business_cases`, 17 keys): 11 alias to Platform help, 6 have their own `sim.*` rows; Simulator `pages/businessCase/*` are unmounted. Seed `SQL/v1518` (56 entries + 11 aliases) from `business_case.mjs`. Found, not fixed (rule 68, separate change): NPV and option cost labels hard-code `($)` instead of the resolved currency. SQL run 2026-11-20.
  - [x] 3e PID, 2026-11-20. Platform: `PIDForm` + the six section forms in `apps/platform/src/components/pid` (objectives, dependencies, reporting arrangements, team structure, interfaces, tolerances) — 67 labels, keys `public.project_initiation_documents.*` and the `pid_*` child tables; one `FieldHelpScope` in `PIDView` (the only routed PID page; Project Setup → PID wraps it too). Simulator: `PracticePIDCreate` / `PracticePIDEdit` (`sim.practice_project_initiation_documents`, 20 keys): 13 alias to Platform help, 7 have their own `sim.*` rows. `PracticePIDCreate` also got the missing light / dark text and border classes (rule 28.1). Seed `SQL/v1519` (74 entries + 13 aliases) from `pid.mjs`. No PID tests exist. SQL run 2026-11-20.
  - [x] 3f Benefits review plan, 2026-11-20. Platform: 7 components in `apps/platform/src/components/benefits` (`BenefitsReviewPlanForm`, `…Distribution`, `…History`, `BenefitsCoverageSection`, `BenefitsReviewResources`, `BenefitsReviewSchedule`, `DisBenefitsSection`) — 84 labels (83 keys) on `public.benefits_review_plans` and its six child tables; one `FieldHelpScope` in `pages/BenefitsReviewPlan.jsx` (the only page that renders them; both Initiation routes list plans and open it). `BenefitsReviewPlanApprovals` (approver picker) is excluded as an approval action. Simulator: `PracticeBenefitsReviewPlan` (create) and `PracticeBenefitsReviewPlanEditPage` (`sim.practice_benefits_review_plans`, 3 keys; 2 alias, 1 own row); the create page’s labels got their missing light / dark text classes. Seed `SQL/v1520` (85 entries + 2 aliases) from `benefits_review_plan.mjs`. SQL run 2026-11-20.
  - Slice 3 status: all six document families wired in both apps (3a–3f). Open: the wizard Documents step (`DocumentGovernanceSection`, help already seeded) waits for the other session’s uncommitted changes; owner sample gate.
- [ ] Seeds for those `help_key`s; module codes per document.  
- [ ] **Owner sample gate** per module (P13).

### Slice 4 — Remaining core modules (by usage)

- [ ] RAID, change, quality, resources, timesheets, etc. — adopt opportunistically by traffic / support pain, still aiming for programme coverage.  
- [ ] Seeds + samples per module exit at 100% for that module.
- [ ] ~~Organisation custom fields help (G-D10, P10)~~ → moved to slice 1b (mandatory, CF-D6).
- [ ] **Owner sample gate** per module (P13).

### Slice 5 — Coverage dashboard + failing CI + quality

- [ ] Coverage report as **script + SQL output** in v1 (coverage % by `module_code`; most-opened; least-helpful — G-D13/G-D18). A UI page only if added with its menu catalogue row, placement and taxonomy line in the same change (rules 70 / 75, P15).  
- [ ] Switch `check-field-help` to **fail** CI on gaps outside shrinking allow-list (G-D14).  
- [ ] Confirm programme ≥ 99.99% (exclusions); helpful Yes ≥ 80% where votes exist.  
- [ ] Documentation guide: `Documentation/Field_Level_Contextual_Help_v1345_Guide.md`.

### Optional later (out of v1 coding unless pulled forward)

- Admin SECURITY DEFINER RPCs to edit `field_help` + narrow write exception in rule 34.5.  
- List/table header help (explicitly out of scope).

---

## 6. CLAUDE.md rule (land in slice 1)

Draft intent (final wording in the PR edit):

> **Field-level contextual help (v1345).** Every **new** user-facing capture/view field must ship a `public.field_help` row (or register key entry) in the same change: `purpose`, `examples`, `format_notes` when relevant, optional `learn_more_key`. Derived rules (required / max / enums) come from the live field definition at render time — do not duplicate them as stale prose unless they cannot be derived. Amend paths must add/update help for **touched** fields. Exclusions: chrome, `#`/pagination, Audit UUIDs, transient filters, bulk-confirm dialogs. Platform–Simulator parity. CI: `node scripts/check-field-help.mjs` (warn → enforce). Do not hardcode help as the live source of truth in React (rule 25.1).

Number: **rule 76** (next free). `CLAUDE.md` currently holds another session's uncommitted edits — coordinate / commit those before adding the rule (P16).

Mirror a short pointer in Admin `CLAUDE.md` when Admin authoring lands.

---

## 7. Testing matrix (maps to PRD §e)

| Test | Slice |
|---|---|
| Unit: label open / missing / Escape / double-click / checkbox skip / coarse pointer | 1 |
| Unit: token substitution + amount shorthand | 1 |
| Unit: learn-more href builder (article vs documentation; no free URL) | 1 |
| Integration: batch load cache; miss returns null | 1 |
| Stakeholder form: all sections show help when seeded; save still works | 1 |
| Coverage script: stakeholders = 0 missing | 1 exit |
| Register engine: one register, many fields, one fetch | 2 |
| CI script warn then fail | 1 → 5 |
| Theme dark/light + narrow viewport | 1 |
| Simulator: live stakeholder form shows help and still saves (P17) | 1 |
| Touch (coarse pointer): faint ⓘ only where help exists; none where missing (P19, D10) | 1 |
| Coverage script counts unconverted raw labels (P6) | 1 |
| Cache cleared when the help version changes (P8) | 1 |

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Authoring volume | Module waves + Claude draft + owner 10-sample gate (G-D5) |
| Double-click selects text | preventDefault / clear selection; disable on checkbox/radio (G-D17) |
| Touch never sees ⓘ | coarse-pointer faint always-on (G-D8) |
| Help contradicts regional formats | live tokens (G-D6) |
| Stale rule prose | derive rules (G-D7) |
| XSS | plain text + bullets only (G-D12) |
| Performance | one query per form/register + sessionStorage (G-D19) |
| Sim writes to wrong schema | Simulator **reads** `public.field_help` only; practice data stays in `sim` |

---

## 9. Out of scope (do not implement in this plan)

Per PRD §f: replace Help Center; AI live help; Admin WYSIWYG in v1; full i18n content; rewrite all public guides; table header help; support-ticket KPI; changing validators.

---

## 10. Approval

- [ ] Owner approves this plan  
- [ ] Then implement **Slice 1** only until Stakeholder exit criteria are met  
- [ ] Re-check next SQL version immediately before creating `SQL/v{N}_*.sql`

---

## 11. Implementation review / result

### Slice 1 — DONE 2026-11-20: code, SQL v1490, v1491 + v1251 re-run, owner sample review and browser smoke all complete

**Built**
- SQL `v1490_field_help_tables.sql` (`public.field_help`, `public.field_help_aliases`, `public.field_help_events`, `sim.field_help_events`, RLS, registry, touch trigger) + rollback `v1490r`; `v1491_field_help_stakeholders_seed.sql` (33 Stakeholder help rows, 7 Simulator aliases). Planned v1490–v1492 became v1490–v1491 (all tables in one file).
- Shared: `utils/fieldHelp.js` (tokens, plain text, derived rules, Learn more links), `services/fieldHelpService.js` (one query per form, alias resolution, sessionStorage cache + version check, events), `context/FieldHelpContext.jsx` (`FieldHelpScope`, regional settings via `useRegionalFormatSettings`), `services/helpArticleReaderService.js`.
- UI: `FieldLabelWithHelp` (portal popover, hover / focus / keyboard reveal, faint ⓘ on touch, safe double-click, Escape / outside click, `aria-describedby`, votes, Learn more), `HelpArticlePage`; `StakeholderPhotoField` takes `helpKey`.
- Forms: Platform `StakeholderForm.jsx` (all 33 fields, page and modal variants; 13 native fields gained ids for focus reveal and live rules); Simulator `PracticeStakeholderCreatePage.jsx` (7 fields).
- Routes: `/platform/help/articles/:slug`, `/simulator/help/articles/:slug` (no menu item).
- PD2: deleted the dead Simulator `components/stakeholders/StakeholderForm.jsx`, `pages/platform-app/StakeholderFormPage.jsx`, `pages/StakeholderManagement.jsx` and their unused imports / prefetch.
- Governance: `CLAUDE.md` rule 76; `REVIEW.md` §8 item; `scripts/check-field-help.mjs` + `scripts/field-help-allowlist.json` baseline; step in `.github/workflows/shared.yml` (unit tests + `--module stakeholders`, which fails if a Stakeholder key loses its help).
- Planner allow-list regenerated (PD3): adds the three help tables **and 17 other tables the Planner code already reads** (menu placement, local registers, notifications …) — the list was stale before this change. Re-run `v1251`.
- Guide: `Documentation/Field_Level_Contextual_Help_v1345_Guide.md`.

**Deviations / decisions during build**
- G-D7 refined: rules are read from the labelled field itself when the popover opens (select options, `required`, `maxlength`, `min` / `max`); props override. Forms don't repeat option lists.
- PD2: the Simulator has no stakeholder view / edit route — register rows link to an unmounted `practice-stakeholders/:id` (existing bug, not fixed here). Simulator slice 1 = the create page.
- PD4: `help_articles` is not on the Planner allow-list — the Planner shows no article links (`buildLearnMoreHref` returns none for the Planner).
- No Stakeholder help has a Learn more link yet (no stakeholder article or guide exists; D10, no fake links).
- **Fix after first live test (2026-11-20):** no help showed. The loader filtered `form_key IN ('')`; supabase-js writes `''` inside `in` as `in.()` (an empty list), so no row ever matched, and the empty result was cached. The query no longer filters `form_key` (done in code), and the cache key moved to `v2` to drop the stale entries. Regression test added; the fake client in the unit tests had hidden it.
- **Owner UX changes after first live test (2026-11-20):** (1) help card placement is screen-aware — below, else above, else the roomier side with internal scroll (`computeHelpPopoverPlacement`); (2) the card uses a fixed help colour scheme (sky / slate, outside the rule-72 branding overrides); (3) **PRD D4 amended**: no dotted underline on labels; ⓘ also appears while the pointer is over the field itself.
- CI trigger: `shared.yml` runs on `packages/**`, `SQL/**` and the script files, not on app-only edits; phase 5 should move the check to a workflow that also watches `apps/**`.

**Tests (rule 43)**
- New: `fieldHelp` (7), `fieldHelpService` (4), `FieldLabelWithHelp` (8), `HelpArticlePage` (2), Platform `StakeholderForm.fieldHelp` (1), Simulator `PracticeStakeholderCreatePage.fieldHelp` (1), `check-field-help` script (4). All pass.
- Suites: `@nidus/ui` 301/301; Simulator page tests pass except the already-failing `SimulationSetup`; `@nidus/shared` 1242/1248 — the 6 failures are the known pre-existing ones (checkpointReportExport ×4, ianaTimezoneOptions, queryRouter).
- Coverage: `check-field-help --module stakeholders` → all 40 keys (33 Platform + 7 Simulator) have help. Programme-wide approximate coverage 0.54% (about 7,430 raw labels in 1,349 form files) — the baseline later slices shrink.
- Lint: new code clean; remaining errors in touched files are pre-existing (StakeholderForm 4 = HEAD 4; StakeholderPhotoField / StakeholderRegisterPage set-state-in-effect lines untouched; Node-script globals as in `check-shared-drift.mjs`).

**Open before slice 1 exits**
- ~~Owner sample review (~10 entries)~~ approved 2026-11-20.
- ~~Owner browser smoke: light / dark, narrow viewport, touch.~~ done 2026-11-20.
- ~~Owner runs SQL v1490, v1491, re-runs v1251.~~ Done 2026-11-20 (all succeeded).

### Slice 1b — DONE 2026-11-20: code, SQL v1494–v1496 and owner check complete

**Built**
- SQL `v1494_mandatory_help_on_user_created_fields.sql` (+ rollback `v1494r`): help columns on `custom_field_definitions` (public + sim) and `regional_format_local_field_definitions`; `description` copied once to `help_purpose`; database checks for users' saves (definitions: new or edited label / type / help; form template versions: fields new or changed since the previous version, effective purpose = `help_purpose` or the older `help`); report query of fields still missing help.
- SQL `v1495_field_help_global_examples.sql`: Stakeholder examples rewritten — globally familiar places, no real-looking people or organisations (owner rules, now CLAUDE.md rule 77).
- SQL `v1496_register_custom_field_help_required.sql`: `local_register_add_custom_field` (public + sim) takes and requires help; `lr_cf_field_json` returns it; old 8-argument functions dropped; rewritten without the editor-trap query forms.
- Shared: `isFieldHelpComplete`, `inlineHelpFromDefinition` (`fieldHelp.js`); `useFieldHelpScope`; `FieldLabelWithHelp` `help` prop (inline help for user-created fields) and `listOptions={false}` (record / people pickers never list names); `FieldHelpInputs` (purpose + example required, format optional, globally familiar placeholders).
- Creators (both apps): `CustomFieldAdminBuilder` (+ `customFieldsApi` passes the help columns), `AddRegisterCustomFieldPanel` (+ `localRegisterCustomFieldService`), Regional & Format "Add local field" (`RegionalFormatFields`, organisation + project pages, `regionalFormatSettingsService`), `FormTemplateBuilder` (help boxes on each field card; save asks for help on new or changed fields only).
- Display (both apps): register form + record view (custom fields), `CustomFieldInput`, Regional & Format local field cards, `DynamicFormRenderer` (filled-in forms; guidance text stays visible when it differs from the help).
- Rules: CLAUDE.md rule 76 (user-created fields, record pickers) and new **rule 77** (no real names, globally familiar examples, `.example` emails); REVIEW.md items for both.

**Tests**: `fieldHelp` (+2), `FieldHelpInputs` (2), `FieldLabelWithHelp` (+3: inline help, no help, record picker), `AddRegisterCustomFieldPanel` (+1, 5 updated for required help), register custom-field create test updated in both apps. `@nidus/ui` 313/313; Platform affected folders 55/55; Simulator affected folders pass except the already-failing `SimulationSetup`; `@nidus/shared` 1245/1251 (the 6 known pre-existing failures). Lint: no new errors (FormTemplateBuilder 4 = HEAD 4; CustomFieldAdminBuilder 1 = HEAD 1).

**Open**: ~~owner runs SQL v1494, v1495, v1496~~ done 2026-11-20 (all succeeded); ~~owner creates one field in each creator and checks the ⓘ help~~ done 2026-11-20.
