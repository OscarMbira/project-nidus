# v1342 — One Environments form (merged core, Banking and IT environments) — PRD

**Status:** Draft — decisions D1–D4 confirmed 2026-11-14; D5–D10 proposed, awaiting confirmation
**Apps:** Platform + Simulator (rule 34.1). Admin: no change.
**Related:** v1341 consolidated role menus (D23 slots; SQL v1464–v1466), v1191/v1192 test environments, v1307/v1346 Banking Environments register, v1411 IT Environments register, rule 74 (register engine vs hand-built).

## a) Problem statement

A project tagged Banking & Financial Services and Information Technology has three different "Environments" forms:

| Form | Where it lives | Fields |
|---|---|---|
| Core Environments (Testing & QA) | hand-built page, `public.test_environments` / `sim.practice_test_environments` | 3 — Name, Description, Active. Test suites pick their target environments from it (`test_suites.environment_ids`). |
| Banking Environments | Local Register `fin_core_banking_environments` | 49 in 10 tabs. Hosting model switches cloud / non-cloud tabs (v1346). |
| IT Environments | Local Register `ict_environments` | 20 — bookings, test data, issues, availability target and more. |

v1466 put the three behind one sidebar entry with a tab strip, but users still see three forms, three record lists and two different ideas of what an environment is. SaaS users with little training cannot tell which one to use. The full fields (IP address, cloud setup) are also missing on projects without Banking, though nothing in them is banking-specific.

## b) Solution

One **Environments** register in the Local Register engine, used by every project:
- A common form with every generic field from the Banking and IT forms, de-duplicated and worded neutrally. Cloud and non-cloud tabs follow Hosting Model, as in v1346.
- Industry-only tabs that show only when the open project has that industry. Today the only one is **Banking**, holding Banking Component.
- Existing core, Banking and IT environment records move to it. Test suite links are remapped.
- The old core page and the Banking and IT environment registers are switched off and leave the menus. Nothing is deleted.
- One sidebar entry: Project Setup › Project Settings › Environments, with no tab strip.

## c) User stories

1. As a PM on any project, I open Project Settings › Environments and see one list and one form.
2. As a PM, I record an environment's type, owner, purpose, hosting model, dates and status on the Details tab.
3. As a PM, choosing Hosting Model = Cloud shows Cloud Setup and Cloud Compliance. Non-cloud shows Infrastructure. Hybrid shows both. The tabs I don't need stay hidden.
4. As a PM, I record host name, IP address, ports and URL (Connection), and database host, port, name, engine and managed service (Database).
5. As a PM, I record requested, provisioned, available-from/to, needed-by and ready dates, refresh frequency, last refresh and the deployed build (Availability & Refresh).
6. As a PM, I record who has access, the access approver, named users and bookings (Access & Bookings).
7. As a PM, I record test data type, availability target, monthly cost and open issues (Health & Issues).
8. As a PM on a Banking project, I also see a **Banking** tab with Banking Component. On a non-Banking project, that tab does not appear.
8a. As a PM on a project of any other industry (e.g. Construction & Engineering, NGO / Development, Healthcare, Energy) or with no industry, I get the same full common form (every tab in stories 2–7). Nothing in it is tied to Banking or IT, and the wording is industry-neutral.
9. As a PM on a composite project, I see each of the project's industry tabs once.
10. As a tester creating a test suite, the Target Environment picker lists this project's environments from the merged register. Decommissioned ones are left out.
11. As a tester, my existing test suites still show the environments they pointed at, after the move.
12. As a PM, every record that was in the old core, Banking or IT lists is in the merged list, with its values, status, created / updated dates and people.
13. As a PM, records moved from the Banking or IT registers keep their display ID. Moved core records get a new display ID from Admin ID Generation (rule 16.2).
14. As a user, the old Banking and IT environment pages and the old core Environments page no longer appear in any menu. Their old addresses open the merged register.
15. As a user, the merged register has the engine's standard features: Table-List default, search, sort, row numbers, export, Audit tab, hold/draft, custom fields and record documents.
16. As a Simulator learner on a practice project, I get the same single Environments form and the same test suite picker behaviour.
17. As an operator, I can reverse the move: the old tables and registers still hold their rows, switched off, not deleted.

## d) Implementation decisions

| # | Decision | Outcome |
|---|---|---|
| D1 | Shape | One core form plus industry-only tabs. Old Banking / IT environment pages leave the menu. **Confirmed.** |
| D2 | Storage | Local Register engine — Environments becomes one core (non-industry) system register (rule 74). New engine condition: a field / tab shown only when the open project has a given industry. Test suite picker reads the register; suite links remapped. **Confirmed.** |
| D3 | Field split | Every generic field from Banking (49) and IT (20) in the common form, de-duplicated, neutral wording ("Connectivity to the organisation", "Organisation-managed keys", "Organisation hardware security module"). Banking tab: Banking Component only. IT: no tab. **Confirmed.** |
| D4 | Existing data | Move all core, Banking and IT environment records. Keep values, statuses, audit columns and display IDs where possible. Remap `test_suites.environment_ids`. Switch the old pages / registers off, delete nothing. Same-name records stay separate. **Confirmed.** |
| D5 | Name / type | Built-in Title is the environment name (core Name → Title). One **Environment Type** dropdown: the union of the Banking and IT options (Development, System Test, SIT, UAT, Performance, Migration Rehearsal, Training, Pre-Production, Production, Disaster Recovery). Core Description → Purpose. *Proposed.* |
| D6 | Status | IT's workflow, the superset: Not Provisioned · Provisioned · Ready · In Use · Issue · Decommissioned. Core Active = true → Ready (or the moved record's own status); Active = false → Decommissioned. The picker hides Decommissioned. *Proposed.* |
| D7 | Menu | One entry at Project Setup › Project Settings › Environments, all roles that have it today. The `environments` slot is switched off again. Taxonomy and placement updated (rules 70, 75). *Proposed.* |
| D8 | Old addresses | `/platform/testing/environments…` and the two register keys redirect to the merged register, keeping bookmarks working. *Proposed.* |
| D9 | Industry condition | Field-level `visible_when: { project_industry: ['<industry_category name or pack code>'] }`, evaluated against the open project's industries (`project_industries`, else `projects.industry_category_id`; Simulator: `practice_project_industries`). A tab whose fields are all hidden disappears (existing v1346 behaviour). Values on hidden fields are kept. *Proposed.* |
| D10 | Required fields | Title only, as the core page today. *Proposed.* |

## e) Testing decisions

- **Unit:**
  - `registerFieldGroups` covers project-industry conditions: hidden without the industry, shown with it, composite, AND with the hosting-model condition.
  - The test suite environment loader reads the register in both apps.
  - Remap helper: old id → new record id.
- **SQL:** a migration self-check query. Row counts per project, before and after (core + Banking + IT = merged). Every `environment_ids` entry resolves. No orphan links.
- **Manual smoke:**
  - Untagged project.
  - A non-Banking, non-IT project (e.g. Construction): full common form, no Banking tab.
  - Banking project (Banking tab shows).
  - Banking + IT project.
  - Create a test suite and pick an environment.
  - Open an old address.
  - Simulator practice project.
  - Light / dark, mobile.
- **Done:** one Environments entry and form everywhere; counts match; test suites keep their environments; old pages gone from menus.

## f) Out of scope

- Merging same-name records (D4).
- Other same-concept pages across industries (e.g. Interfaces, Data Migration). The v1465 audit found no other same-name core / industry pair; any later merge is its own PRD.
- Changing other Banking Core Banking registers (Products, Parameterisation, Interfaces, Customisation).
- Admin app changes.

## g) Further notes

- The IT industry keeps its Environments category in the catalogue, switched off. Its industry Delivery Overview etc. are untouched.
- Display IDs: needs an Admin `id_generation_rules` row for the new register's records, if register records use per-register prefixes. Check the existing pattern (rule 16.2) in the plan.
- Supabase editor rule: no "into" in comments or seed text, no SELECT INTO.
